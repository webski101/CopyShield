/** Map Strike symbols into correlated exposure buckets. */
const GROUP_MAP: Record<string, string> = {
  "BTC-USD": "BTC",
  "ETH-USD": "ETH",
  "SOL-USD": "SOL",
  "ADA-USD": "ADA",
  "DOGE-USD": "MEME",
  "PEPE-USD": "MEME",
  "WIF-USD": "MEME",
  "SUI-USD": "L1",
  "AVAX-USD": "L1",
  "LINK-USD": "DEFI",
  "AAVE-USD": "DEFI",
  "NVDA-USD": "EQUITY",
  "TSLA-USD": "EQUITY",
  "AAPL-USD": "EQUITY",
};

export function exposureGroup(symbol: string): string {
  return GROUP_MAP[symbol] ?? symbol.split("-")[0] ?? symbol;
}

/**
 * Signed net notional by correlation group.
 * Long = +, Short = −
 */
export function netExposures(
  positions: Array<{ symbol: string; side: "long" | "short"; size: number; markPrice: number }>
): Record<string, number> {
  const out: Record<string, number> = {};
  for (const p of positions) {
    const group = exposureGroup(p.symbol);
    const notional = Math.abs(p.size) * p.markPrice;
    const signed = p.side === "long" ? notional : -notional;
    out[group] = (out[group] ?? 0) + signed;
  }
  return out;
}
