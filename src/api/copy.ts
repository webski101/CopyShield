import { API_BASE_URL } from "./config";
import { authenticatedFetch, throwApiError } from "./auth";
import type {
  CopySubscription,
  DiscoverTradersResponse,
  SubscribeRequest,
  SubscribeResponse,
} from "../types/copy";

export async function discoverTraders(params: {
  platform?: "hyperliquid" | "strike" | "all";
  sort?: string;
  limit?: number;
  min_copy_score?: string;
  search?: string;
}): Promise<DiscoverTradersResponse> {
  const q = new URLSearchParams();
  q.set("platform", params.platform ?? "all");
  q.set("sort", params.sort ?? "copy_score");
  q.set("order", "desc");
  q.set("limit", String(params.limit ?? 20));
  q.set("enriched_only", "true");
  if (params.min_copy_score) q.set("min_copy_score", params.min_copy_score);
  if (params.search) q.set("search", params.search);

  const res = await fetch(`${API_BASE_URL}/v2/copy/discover?${q}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error || `Discover failed: ${res.status}`);
  }
  return res.json();
}

export async function subscribeToLead(
  body: SubscribeRequest
): Promise<SubscribeResponse> {
  const res = await authenticatedFetch(`${API_BASE_URL}/v2/copy/subscribe`, "POST", body);
  if (!res.ok) return throwApiError(res, "Subscribe failed");
  return res.json();
}

export async function stopSubscription(id: string): Promise<void> {
  const res = await authenticatedFetch(
    `${API_BASE_URL}/v2/copy/subscribe/${id}`,
    "DELETE",
    {}
  );
  if (!res.ok) return throwApiError(res, "Stop subscription failed");
}

export async function updateSubscription(
  id: string,
  body: Record<string, unknown>
): Promise<CopySubscription> {
  const res = await authenticatedFetch(
    `${API_BASE_URL}/v2/copy/subscribe/${id}`,
    "PATCH",
    body
  );
  if (!res.ok) return throwApiError(res, "Update subscription failed");
  return res.json();
}

export async function listSubscriptions(): Promise<{ subscriptions: CopySubscription[] }> {
  const res = await authenticatedFetch(`${API_BASE_URL}/v2/copy/subscriptions`, "GET");
  if (!res.ok) return throwApiError(res, "List subscriptions failed");
  return res.json();
}

export async function listCopyPositions(): Promise<{ positions: unknown[] }> {
  const res = await authenticatedFetch(`${API_BASE_URL}/v2/copy/positions`, "GET");
  if (!res.ok) return throwApiError(res, "List copy positions failed");
  return res.json();
}
