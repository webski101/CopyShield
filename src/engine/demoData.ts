import type { DiscoveryTrader } from "../types/copy";
import type { ReplayFill, ShieldPosition } from "../types/risk";
import { estimateLiqPrice, positionUPnL } from "./riskEngine";

export const DEMO_LEADS: DiscoveryTrader[] = [
  {
    address: "0xrecklessalpha000000000000000000000001",
    platform: "hyperliquid",
    display_name: "RecklessAlpha",
    account_value: "182400",
    pnl: { "30d": "41200", "7d": "9800" },
    roi: { "30d": "0.48", "7d": "0.11" },
    volume: { "30d": "9200000" },
    enrichment_state: "ready",
    style: "scalper",
    bias: "long",
    copy_score: "38",
    recommended_direction: "none",
    top_assets: [{ asset: "BTC" }, { asset: "ETH" }, { asset: "SOL" }],
    pnl_curve_30d: sparkline(30, 0, 41200, 0.55),
  },
  {
    address: "0xsteadycompound00000000000000000000002",
    platform: "hyperliquid",
    display_name: "SteadyCompound",
    account_value: "94000",
    pnl: { "30d": "8600", "7d": "2100" },
    roi: { "30d": "0.12", "7d": "0.03" },
    volume: { "30d": "2100000" },
    enrichment_state: "ready",
    style: "swing",
    bias: "neutral",
    copy_score: "81",
    recommended_direction: "copy",
    top_assets: [{ asset: "BTC" }, { asset: "ETH" }],
    pnl_curve_30d: sparkline(30, 0, 8600, 0.18),
  },
  {
    address: "a1b2c3d4-e5f6-7890-strike-lead-snekking",
    platform: "strike",
    display_name: "SnekKing",
    ada_handle: "$snekking",
    account_value: "22100",
    pnl: { "30d": "5400", "7d": "900" },
    roi: { "30d": "0.31", "7d": "0.05" },
    volume: { "30d": "880000" },
    enrichment_state: "ready",
    style: "day",
    bias: "long",
    copy_score: "72",
    recommended_direction: "copy",
    top_assets: [{ asset: "ADA" }, { asset: "BTC" }],
    pnl_curve_30d: sparkline(30, 0, 5400, 0.28),
  },
  {
    address: "0xfundingfarmer000000000000000000000003",
    platform: "hyperliquid",
    display_name: "FundingFarmer",
    account_value: "310000",
    pnl: { "30d": "12400", "7d": "2800" },
    roi: { "30d": "0.09", "7d": "0.02" },
    volume: { "30d": "15000000" },
    enrichment_state: "ready",
    style: "algo",
    bias: "short",
    copy_score: "66",
    recommended_direction: "copy",
    top_assets: [{ asset: "BTC" }, { asset: "ETH" }, { asset: "SOL" }],
    pnl_curve_30d: sparkline(30, 0, 12400, 0.12),
  },
];

function sparkline(
  days: number,
  start: number,
  end: number,
  noise: number
): Array<[number, number]> {
  const out: Array<[number, number]> = [];
  const now = Date.now();
  let v = start;
  for (let i = 0; i < days; i++) {
    const target = start + ((end - start) * (i + 1)) / days;
    v = v * (1 - 0.35) + target * 0.35;
    v += (Math.sin(i * 1.7) + Math.cos(i * 0.4)) * Math.abs(end) * noise * 0.04;
    out.push([now - (days - i) * 86400000, Math.round(v)]);
  }
  return out;
}

/** Synthetic toxic lead path: stacks BTC longs into a dump → liquidation without shield. */
export function recklessAlphaFills(): ReplayFill[] {
  const fills: ReplayFill[] = [];
  let t = 0;
  // Grind up while adding size
  fills.push({ t: (t += 5), symbol: "BTC-USD", side: "buy", size: 0.08, price: 64200 });
  fills.push({ t: (t += 12), symbol: "ETH-USD", side: "buy", size: 1.2, price: 3420 });
  fills.push({ t: (t += 18), symbol: "BTC-USD", side: "buy", size: 0.12, price: 65100 });
  fills.push({ t: (t += 10), symbol: "SOL-USD", side: "buy", size: 40, price: 148 });
  fills.push({ t: (t += 15), symbol: "BTC-USD", side: "buy", size: 0.15, price: 65850 });
  // Dump begins
  fills.push({ t: (t += 8), symbol: "BTC-USD", side: "buy", size: 0.2, price: 64100 });
  fills.push({ t: (t += 6), symbol: "BTC-USD", side: "buy", size: 0.25, price: 62200 });
  fills.push({ t: (t += 5), symbol: "ETH-USD", side: "buy", size: 2.0, price: 3180 });
  fills.push({ t: (t += 4), symbol: "BTC-USD", side: "buy", size: 0.3, price: 59800 });
  fills.push({ t: (t += 3), symbol: "BTC-USD", side: "buy", size: 0.35, price: 57100 });
  // Partial panic close too late
  fills.push({
    t: (t += 4),
    symbol: "BTC-USD",
    side: "sell",
    size: 0.4,
    price: 55200,
    reduceOnly: true,
  });
  fills.push({ t: (t += 3), symbol: "BTC-USD", side: "buy", size: 0.2, price: 53800 });
  return fills;
}

export function steadyCompoundFills(): ReplayFill[] {
  const fills: ReplayFill[] = [];
  let t = 0;
  fills.push({ t: (t += 10), symbol: "BTC-USD", side: "buy", size: 0.04, price: 64000 });
  fills.push({
    t: (t += 40),
    symbol: "BTC-USD",
    side: "sell",
    size: 0.04,
    price: 65200,
    reduceOnly: true,
  });
  fills.push({ t: (t += 20), symbol: "ETH-USD", side: "sell", size: 0.8, price: 3450 });
  fills.push({
    t: (t += 55),
    symbol: "ETH-USD",
    side: "buy",
    size: 0.8,
    price: 3380,
    reduceOnly: true,
  });
  fills.push({ t: (t += 25), symbol: "BTC-USD", side: "buy", size: 0.05, price: 64800 });
  fills.push({
    t: (t += 60),
    symbol: "BTC-USD",
    side: "sell",
    size: 0.05,
    price: 66100,
    reduceOnly: true,
  });
  return fills;
}

export function createDemoPositions(equity = 5000): ShieldPosition[] {
  const btcMark = 64120;
  const ethMark = 3395;
  const btcEntry = 62800;
  const ethEntry = 3510;
  const lev = 8;

  const btc: ShieldPosition = {
    id: "demo-btc",
    leadId: DEMO_LEADS[0].address,
    leadName: "RecklessAlpha",
    symbol: "BTC-USD",
    side: "long",
    size: 0.12,
    entryPrice: btcEntry,
    markPrice: btcMark,
    leverage: lev,
    liquidationPrice: estimateLiqPrice(btcEntry, "long", lev),
    unrealizedPnl: positionUPnL("long", 0.12, btcEntry, btcMark),
    margin: (0.12 * btcEntry) / lev,
    fundingRate: 0.00035,
  };

  const eth: ShieldPosition = {
    id: "demo-eth",
    leadId: DEMO_LEADS[2].address,
    leadName: "SnekKing",
    symbol: "ETH-USD",
    side: "long",
    size: 1.4,
    entryPrice: ethEntry,
    markPrice: ethMark,
    leverage: lev,
    liquidationPrice: estimateLiqPrice(ethEntry, "long", lev),
    unrealizedPnl: positionUPnL("long", 1.4, ethEntry, ethMark),
    margin: (1.4 * ethEntry) / lev,
    fundingRate: 0.0009,
  };

  void equity;
  return [btc, eth];
}

/** Live demo sim: slowly stress portfolio so shields trip during the pitch. */
export function tickDemoMarks(
  positions: ShieldPosition[],
  step: number
): ShieldPosition[] {
  const shock = Math.min(1, step / 40);
  return positions.map((p) => {
    const drift =
      p.symbol === "BTC-USD"
        ? 1 - 0.012 * shock - 0.002 * Math.sin(step / 3)
        : 1 - 0.018 * shock - 0.003 * Math.cos(step / 4);
    const mark = p.entryPrice * drift * (p.side === "long" ? 1 : 1);
    // Actually move mark down from current mark toward stress
    const nextMark = p.markPrice * (1 - 0.0045 * (0.6 + shock));
    const fundingBump = p.fundingRate + (step % 7 === 0 ? 0.00015 : 0);
    return {
      ...p,
      markPrice: Math.max(nextMark, p.liquidationPrice * 0.92),
      unrealizedPnl: positionUPnL(p.side, p.size, p.entryPrice, nextMark),
      fundingRate: Math.min(0.0025, fundingBump),
    };
  });
}
