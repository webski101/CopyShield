import {
  estimateLiqPrice,
  evaluateRisk,
  positionUPnL,
} from "./riskEngine";
import type {
  PortfolioSnapshot,
  ReplayFill,
  ReplayResult,
  RiskRules,
  ShieldPosition,
} from "../types/risk";

interface SimState {
  equity: number;
  cash: number;
  peak: number;
  dayStart: number;
  realizedToday: number;
  positions: Map<string, ShieldPosition>;
  liquidated: boolean;
  trips: number;
  events: string[];
  curve: Array<[number, number]>;
}

function markToMarket(state: SimState, marks: Record<string, number>, t: number) {
  let uPnL = 0;
  for (const pos of state.positions.values()) {
    const mark = marks[pos.symbol] ?? pos.markPrice;
    pos.markPrice = mark;
    pos.unrealizedPnl = positionUPnL(pos.side, pos.size, pos.entryPrice, mark);
    uPnL += pos.unrealizedPnl;
  }
  state.equity = state.cash + uPnL;
  state.peak = Math.max(state.peak, state.equity);
  state.curve.push([t, state.equity]);
}

function snapshotFrom(
  state: SimState,
  leadIds: string[],
  startingEquity: number,
  t: number
): PortfolioSnapshot {
  const positions = [...state.positions.values()];
  const unrealized = positions.reduce((s, p) => s + p.unrealizedPnl, 0);
  return {
    equity: state.equity,
    startingEquity,
    peakEquity: state.peak,
    dayStartEquity: state.dayStart,
    realizedPnlToday: state.realizedToday,
    unrealizedPnl: unrealized,
    positions,
    activeLeadIds: leadIds,
    timestampMs: t,
  };
}

function applyFill(
  state: SimState,
  fill: ReplayFill,
  leadId: string,
  leadName: string,
  leverage: number,
  sizeMult: number
) {
  if (sizeMult <= 0 && !fill.reduceOnly) return;

  const key = `${leadId}:${fill.symbol}`;
  const existing = state.positions.get(key);
  const isBuy = fill.side === "buy";
  const size = Math.abs(fill.size) * (fill.reduceOnly ? 1 : sizeMult);

  if (fill.reduceOnly || existing) {
    if (!existing) return;
    const closingLong = existing.side === "long" && !isBuy;
    const closingShort = existing.side === "short" && isBuy;
    if (closingLong || closingShort) {
      const closeSize = Math.min(existing.size, size);
      const pnl = positionUPnL(existing.side, closeSize, existing.entryPrice, fill.price);
      state.realizedToday += pnl;
      state.cash += pnl;
      existing.size -= closeSize;
      if (existing.size <= 1e-8) state.positions.delete(key);
      return;
    }
    // add to position
    const newSize = existing.size + size;
    existing.entryPrice =
      (existing.entryPrice * existing.size + fill.price * size) / newSize;
    existing.size = newSize;
    existing.markPrice = fill.price;
    existing.liquidationPrice = estimateLiqPrice(
      existing.entryPrice,
      existing.side,
      leverage
    );
    existing.margin = (existing.size * existing.entryPrice) / leverage;
    return;
  }

  const side = isBuy ? "long" : "short";
  const pos: ShieldPosition = {
    id: key,
    leadId,
    leadName,
    symbol: fill.symbol,
    side,
    size,
    entryPrice: fill.price,
    markPrice: fill.price,
    leverage,
    liquidationPrice: estimateLiqPrice(fill.price, side, leverage),
    unrealizedPnl: 0,
    margin: (size * fill.price) / leverage,
    fundingRate: 0,
  };
  state.positions.set(key, pos);
}

function checkLiq(state: SimState, t: number) {
  for (const [key, pos] of [...state.positions.entries()]) {
    const hit =
      (pos.side === "long" && pos.markPrice <= pos.liquidationPrice) ||
      (pos.side === "short" && pos.markPrice >= pos.liquidationPrice);
    if (hit) {
      const loss = -pos.margin;
      state.realizedToday += loss;
      state.cash += loss;
      state.positions.delete(key);
      state.liquidated = true;
      state.events.push(`t+${t}m liquidated ${pos.symbol}`);
    }
  }
}

/**
 * Replay a lead's fills with and without CopyShield rules.
 * Demonstrates survival difference for the hackathon pitch.
 */
export function replayLeadFills(opts: {
  leadId: string;
  leadName: string;
  fills: ReplayFill[];
  rules: RiskRules;
  startingEquity?: number;
  leverage?: number;
}): ReplayResult {
  const startingEquity = opts.startingEquity ?? 5000;
  const leverage = opts.leverage ?? 10;
  const leadIds = [opts.leadId];

  const run = (useShield: boolean) => {
    const state: SimState = {
      equity: startingEquity,
      cash: startingEquity,
      peak: startingEquity,
      dayStart: startingEquity,
      realizedToday: 0,
      positions: new Map(),
      liquidated: false,
      trips: 0,
      events: [],
      curve: [[0, startingEquity]],
    };

    const marks: Record<string, number> = {};
    let paused = false;
    let sizeMult = 1;

    for (const fill of opts.fills) {
      marks[fill.symbol] = fill.price;
      markToMarket(state, marks, fill.t);

      if (useShield) {
        const snap = snapshotFrom(state, leadIds, startingEquity, fill.t);
        const ev = evaluateRisk(snap, opts.rules, fill.t);
        sizeMult = ev.sizeMultiplier;
        if (!ev.ok) {
          state.trips += 1;
          const top = ev.violations[0];
          if (top) {
            state.events.push(`t+${fill.t}m ${top.action}: ${top.message}`);
          }
          if (
            ev.action === "close_all" ||
            ev.action === "stop_subscription"
          ) {
            // flatten
            for (const pos of [...state.positions.values()]) {
              const pnl = positionUPnL(
                pos.side,
                pos.size,
                pos.entryPrice,
                pos.markPrice
              );
              state.realizedToday += pnl;
              state.cash += pnl;
            }
            state.positions.clear();
            paused = true;
            markToMarket(state, marks, fill.t);
            break;
          }
          if (ev.action === "pause_entries") paused = true;
        } else {
          paused = false;
          sizeMult = 1;
        }
      }

      const mult = useShield ? (paused && !fill.reduceOnly ? 0 : sizeMult) : 1;
      applyFill(state, fill, opts.leadId, opts.leadName, leverage, mult);
      markToMarket(state, marks, fill.t);
      checkLiq(state, fill.t);
      markToMarket(state, marks, fill.t);
    }

    const maxDd =
      state.curve.reduce(
        (acc, [, eq]) => {
          acc.peak = Math.max(acc.peak, eq);
          acc.max = Math.max(acc.max, (acc.peak - eq) / acc.peak);
          return acc;
        },
        { peak: startingEquity, max: 0 }
      ).max;

    return {
      finalEquity: state.equity,
      maxDrawdownPct: maxDd,
      liquidated: state.liquidated,
      equityCurve: state.curve,
      trips: state.trips,
      events: state.events,
    };
  };

  const without = run(false);
  const withS = run(true);

  return {
    leadId: opts.leadId,
    leadName: opts.leadName,
    withoutShield: {
      finalEquity: without.finalEquity,
      maxDrawdownPct: without.maxDrawdownPct,
      liquidated: without.liquidated,
      equityCurve: without.equityCurve,
    },
    withShield: {
      finalEquity: withS.finalEquity,
      maxDrawdownPct: withS.maxDrawdownPct,
      liquidated: withS.liquidated,
      trips: withS.trips,
      equityCurve: withS.equityCurve,
      events: withS.events,
    },
  };
}
