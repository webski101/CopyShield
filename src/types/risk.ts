export type RiskSeverity = "info" | "warn" | "critical";

export type RiskAction =
  | "none"
  | "scale_down"
  | "pause_entries"
  | "close_all"
  | "stop_subscription";

export interface RiskRules {
  /** Max realized+unrealized loss for the UTC day, in USD. */
  maxDailyLossUsd: number;
  /** Max peak-to-trough drawdown from session high equity, as fraction 0–1. */
  maxDrawdownPct: number;
  /** Cap portfolio leverage = total notional / equity. */
  maxPortfolioLeverage: number;
  /** Minimum distance from mark to liquidation as fraction of mark (e.g. 0.08 = 8%). */
  minLiqDistancePct: number;
  /** Max absolute net notional per correlated group (e.g. BTC family). */
  maxNetExposureUsd: number;
  /** Max number of active leads. */
  maxLeads: number;
  /** Pause new risk-increasing copies when |funding| exceeds this (e.g. 0.001 = 0.1%/8h). */
  fundingFlipThreshold: number;
  /** When true, scale size to 25% instead of pausing on warn. */
  softScaleOnWarn: boolean;
  /** Auto-stop native copy subscriptions when critical trip fires. */
  autoStopOnCritical: boolean;
}

export const DEFAULT_RISK_RULES: RiskRules = {
  maxDailyLossUsd: 250,
  maxDrawdownPct: 0.12,
  maxPortfolioLeverage: 8,
  minLiqDistancePct: 0.08,
  maxNetExposureUsd: 5000,
  maxLeads: 3,
  fundingFlipThreshold: 0.0008,
  softScaleOnWarn: true,
  autoStopOnCritical: true,
};

export interface ShieldPosition {
  id: string;
  leadId: string;
  leadName: string;
  symbol: string;
  side: "long" | "short";
  size: number;
  entryPrice: number;
  markPrice: number;
  leverage: number;
  liquidationPrice: number;
  unrealizedPnl: number;
  margin: number;
  fundingRate: number;
}

export interface PortfolioSnapshot {
  equity: number;
  startingEquity: number;
  peakEquity: number;
  dayStartEquity: number;
  realizedPnlToday: number;
  unrealizedPnl: number;
  positions: ShieldPosition[];
  activeLeadIds: string[];
  timestampMs: number;
}

export interface RiskViolation {
  id: string;
  rule: keyof RiskRules | "correlation" | "funding";
  severity: RiskSeverity;
  action: RiskAction;
  message: string;
  detail?: string;
  atMs: number;
}

export interface RiskEvaluation {
  ok: boolean;
  severity: RiskSeverity;
  action: RiskAction;
  violations: RiskViolation[];
  metrics: {
    dailyPnl: number;
    drawdownPct: number;
    portfolioLeverage: number;
    worstLiqDistancePct: number;
    netExposures: Record<string, number>;
    fundingAlerts: string[];
  };
  sizeMultiplier: number;
}

export interface ReplayFill {
  t: number;
  symbol: string;
  side: "buy" | "sell";
  size: number;
  price: number;
  reduceOnly?: boolean;
}

export interface ReplayResult {
  leadId: string;
  leadName: string;
  withoutShield: {
    finalEquity: number;
    maxDrawdownPct: number;
    liquidated: boolean;
    equityCurve: Array<[number, number]>;
  };
  withShield: {
    finalEquity: number;
    maxDrawdownPct: number;
    liquidated: boolean;
    trips: number;
    equityCurve: Array<[number, number]>;
    events: string[];
  };
}
