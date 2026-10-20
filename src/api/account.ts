import { API_BASE_URL } from "./config";
import { authenticatedFetch, throwApiError } from "./auth";
import type { Account } from "../types/account";

export async function getAccount(): Promise<Account> {
  const res = await authenticatedFetch(`${API_BASE_URL}/v2/account`, "GET");
  if (!res.ok) return throwApiError(res, "Get account failed");
  return res.json();
}

export async function getPositions(): Promise<{ positions: unknown[] }> {
  const res = await authenticatedFetch(`${API_BASE_URL}/v2/positions`, "GET");
  if (!res.ok) return throwApiError(res, "Get positions failed");
  return res.json();
}

export async function placeReduceOnlyMarket(params: {
  symbol: string;
  side: "buy" | "sell";
  size: string;
  builderFeeBps?: number;
}): Promise<unknown> {
  const headers =
    params.builderFeeBps && params.builderFeeBps > 0
      ? { "X-Builder-Fee-Bps": String(params.builderFeeBps) }
      : undefined;

  const res = await authenticatedFetch(
    `${API_BASE_URL}/v2/order`,
    "POST",
    {
      symbol: params.symbol,
      side: params.side,
      type: "market",
      size: params.size,
      reduce_only: true,
      time_in_force: "IOC",
    },
    headers
  );
  if (!res.ok) return throwApiError(res, "Reduce-only order failed");
  return res.json();
}
