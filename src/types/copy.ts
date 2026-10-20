export type CopyPlatform = "hyperliquid" | "strike";
export type CopyMode = "fixed_ratio" | "fixed_amount";

export interface DiscoveryWindows {
  "1d"?: string;
  "7d"?: string;
  "30d"?: string;
  all?: string;
}

export interface DiscoveryTrader {
  address: string;
  platform?: CopyPlatform;
  display_name?: string;
  ada_handle?: string;
  blockchain_address?: string;
  avatar_url?: string;
  account_value?: string;
  pnl?: DiscoveryWindows;
  roi?: DiscoveryWindows;
  volume?: DiscoveryWindows;
  enrichment_state?: string;
  equity_curve_30d?: Array<[number, number]>;
  pnl_curve_30d?: Array<[number, number]>;
  top_assets?: Array<{ asset?: string; symbol?: string }>;
  style?: string;
  bias?: string;
  copy_score?: string;
  copy_scores?: Record<string, string>;
  recommended_direction?: "copy" | "counter" | "none";
  last_traded_at_ms?: number;
}

export interface DiscoverTradersResponse {
  items: DiscoveryTrader[];
  next_cursor?: string;
  total: number;
  data_as_of_ms: number;
}

export interface SubscribeRequest {
  lead_account_id: string;
  platform?: CopyPlatform;
  copy_mode: CopyMode;
  copy_amount?: string;
  margin_per_entry_order?: string;
  max_margin_per_symbol?: string;
  asset_filter?: string[];
  copy_existing_positions?: boolean;
  stop_loss_amount?: string;
  max_leverage?: number;
  sub_account_id?: string;
  auto_create_sub_account?: boolean;
  request_id?: string;
  source_account_id?: string;
  funding_amount?: string;
}

export interface CopySubscription {
  subscription_id: string;
  lead_account_id: string;
  platform?: CopyPlatform;
  lead_nickname?: string;
  lead_avatar_url?: string;
  lead_address?: string;
  status: string;
  copy_mode: CopyMode;
  copy_amount?: string;
  margin_per_entry_order?: string;
  realized_pnl?: string;
  unrealized_pnl?: string;
  total_margin?: string;
  created_at_ms?: number;
}

export interface SubscribeResponse {
  subscription_id: string;
  status: string;
  subscription?: CopySubscription;
}

export interface ShieldLeadSelection {
  id: string;
  platform: CopyPlatform;
  name: string;
  equity: number;
  pnl30d: number;
  roi30d: number;
  copyScore: number;
  style: string;
  bias: string;
  topAssets: string[];
  allocationUsd: number;
  subscriptionId?: string;
  active: boolean;
}
