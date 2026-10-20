import { netExposures } from "./correlation";
import type {
  PortfolioSnapshot,
  RiskAction,
  RiskEvaluation,
  RiskRules,
  RiskSeverity,
  RiskViolation,
  ShieldPosition,
} from "../types/risk";

function liqDistancePct(pos: ShieldPosition): number {
  if (!pos.liquidationPrice || !pos.markPrice) return 1;
  return Math.abs(pos.markPrice - pos.liquidationPrice) / pos.markPrice;
}

function worstSeverity(a: RiskSeverity, b: RiskSeverity): RiskSeverity {
  const rank = { info: 0, warn: 1, critical: 2 };
  return rank[a] >= rank[b] ? a : b;
}

function strongerAction(a: RiskAction, b: RiskAction): RiskAction {
  const rank: Record<RiskAction, number> = {
    none: 0,
    scale_down: 1,
    pause_entries: 2,
    close_all: 3,
    stop_subscription: 4,
  };
  return rank[a] >= rank[b] ? a : b;
}

/**
 * Evaluate portfolio state against CopyShield rules.
 * Pure function — safe to call on every tick / fill.
 */
export function evaluateRisk(
  snapshot: PortfolioSnapshot,
  rules: RiskRules,
  nowMs: number = Date.now()
): RiskEvaluation {
  const violations: RiskViolation[] = [];
  const positions = snapshot.positions;

  const unrealized = positions.reduce((s, p) => s + p.unrealizedPnl, 0);
  const dailyPnl = snapshot.realizedPnlToday + unrealized;
  const drawdownPct =
    snapshot.peakEquity > 0
      ? Math.max(0, (snapshot.peakEquity - snapshot.equity) / snapshot.peakEquity)
      : 0;

  const totalNotional = positions.reduce(
    (s, p) => s + Math.abs(p.size) * p.markPrice,
    0
  );
  const portfolioLeverage =
    snapshot.equity > 0 ? totalNotional / snapshot.equity : totalNotional > 0 ? Infinity : 0;

  let worstLiq = 1;
  for (const p of positions) {
    worstLiq = Math.min(worstLiq, liqDistancePct(p));
  }

  const exposures = netExposures(positions);
  const fundingAlerts: string[] = [];

  // ── Daily loss ──
  if (dailyPnl <= -Math.abs(rules.maxDailyLossUsd)) {
    violations.push({
      id: `daily-${nowMs}`,
      rule: "maxDailyLossUsd",
      severity: "critical",
      action: rules.autoStopOnCritical ? "stop_subscription" : "close_all",
      message: `Daily loss ${dailyPnl.toFixed(2)} USD breached −$${rules.maxDailyLossUsd}`,
      detail: "Kill switch: halt new copies and flatten attributed risk.",
      atMs: nowMs,
    });
  } else if (dailyPnl <= -Math.abs(rules.maxDailyLossUsd) * 0.7) {
    violations.push({
      id: `daily-warn-${nowMs}`,
      rule: "maxDailyLossUsd",
      severity: "warn",
      action: "pause_entries",
      message: `Daily loss approaching limit (${dailyPnl.toFixed(2)} / −$${rules.maxDailyLossUsd})`,
      atMs: nowMs,
    });
  }

  // ── Drawdown ──
  if (drawdownPct >= rules.maxDrawdownPct) {
    violations.push({
      id: `dd-${nowMs}`,
      rule: "maxDrawdownPct",
      severity: "critical",
      action: rules.autoStopOnCritical ? "stop_subscription" : "close_all",
      message: `Drawdown ${(drawdownPct * 100).toFixed(1)}% ≥ ${(rules.maxDrawdownPct * 100).toFixed(0)}% cap`,
      atMs: nowMs,
    });
  } else if (drawdownPct >= rules.maxDrawdownPct * 0.75) {
    violations.push({
      id: `dd-warn-${nowMs}`,
      rule: "maxDrawdownPct",
      severity: "warn",
      action: "scale_down",
      message: `Drawdown ${(drawdownPct * 100).toFixed(1)}% nearing cap`,
      atMs: nowMs,
    });
  }

  // ── Portfolio leverage ──
  if (portfolioLeverage > rules.maxPortfolioLeverage) {
    violations.push({
      id: `lev-${nowMs}`,
      rule: "maxPortfolioLeverage",
      severity: "critical",
      action: "scale_down",
      message: `Portfolio leverage ${portfolioLeverage.toFixed(1)}x > ${rules.maxPortfolioLeverage}x`,
      atMs: nowMs,
    });
  }

  // ── Liquidation distance ──
  for (const p of positions) {
    const dist = liqDistancePct(p);
    if (dist < rules.minLiqDistancePct) {
      violations.push({
        id: `liq-${p.id}-${nowMs}`,
        rule: "minLiqDistancePct",
        severity: dist < rules.minLiqDistancePct * 0.5 ? "critical" : "warn",
        action: dist < rules.minLiqDistancePct * 0.5 ? "close_all" : "scale_down",
        message: `${p.symbol} liq distance ${(dist * 100).toFixed(1)}% below ${(rules.minLiqDistancePct * 100).toFixed(0)}% floor`,
        detail: `${p.leadName} · mark $${p.markPrice.toFixed(2)} · liq $${p.liquidationPrice.toFixed(2)}`,
        atMs: nowMs,
      });
    }
  }

  // ── Net correlated exposure ──
  for (const [group, net] of Object.entries(exposures)) {
    if (Math.abs(net) > rules.maxNetExposureUsd) {
      violations.push({
        id: `exp-${group}-${nowMs}`,
        rule: "correlation",
        severity: "warn",
        action: "pause_entries",
        message: `${group} net exposure $${Math.abs(net).toFixed(0)} exceeds $${rules.maxNetExposureUsd}`,
        detail: "Stacked longs/shorts across leads in correlated markets.",
        atMs: nowMs,
      });
    }
  }

  // ── Lead count ──
  if (snapshot.activeLeadIds.length > rules.maxLeads) {
    violations.push({
      id: `leads-${nowMs}`,
      rule: "maxLeads",
      severity: "warn",
      action: "pause_entries",
      message: `${snapshot.activeLeadIds.length} active leads > max ${rules.maxLeads}`,
      atMs: nowMs,
    });
  }

  // ── Funding flip ──
  for (const p of positions) {
    const fr = p.fundingRate;
    const paying =
      (p.side === "long" && fr > rules.fundingFlipThreshold) ||
      (p.side === "short" && fr < -rules.fundingFlipThreshold);
    if (paying) {
      fundingAlerts.push(`${p.symbol} ${p.side} funding ${(fr * 100).toFixed(3)}%`);
      violations.push({
        id: `fund-${p.id}-${nowMs}`,
        rule: "funding",
        severity: "warn",
        action: "pause_entries",
        message: `Funding stress on ${p.symbol} — pausing risk-increasing copies`,
        detail: `Rate ${(fr * 100).toFixed(4)}% / 8h`,
        atMs: nowMs,
      });
    }
  }

  let severity: RiskSeverity = "info";
  let action: RiskAction = "none";
  for (const v of violations) {
    severity = worstSeverity(severity, v.severity);
    action = strongerAction(action, v.action);
  }

  let sizeMultiplier = 1;
  if (action === "scale_down" && rules.softScaleOnWarn) sizeMultiplier = 0.25;
  if (action === "pause_entries" || action === "close_all" || action === "stop_subscription") {
    sizeMultiplier = 0;
  }

  return {
    ok: violations.filter((v) => v.severity !== "info").length === 0,
    severity,
    action,
    violations,
    metrics: {
      dailyPnl,
      drawdownPct,
      portfolioLeverage,
      worstLiqDistancePct: worstLiq === 1 && positions.length === 0 ? 1 : worstLiq,
      netExposures: exposures,
      fundingAlerts,
    },
    sizeMultiplier,
  };
}

/** Estimate isolated liquidation price for demo / replay. */
export function estimateLiqPrice(
  entry: number,
  side: "long" | "short",
  leverage: number,
  mmr = 0.005
): number {
  const imr = 1 / leverage;
  if (side === "long") {
    return entry * (1 - imr + mmr);
  }
  return entry * (1 + imr - mmr);
}

export function positionUPnL(
  side: "long" | "short",
  size: number,
  entry: number,
  mark: number
): number {
  const signed = side === "long" ? size : -size;
  return (mark - entry) * signed;
}
