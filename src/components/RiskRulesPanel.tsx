import type { RiskRules } from "../types/risk";

interface Props {
  rules: RiskRules;
  onChange: (next: RiskRules) => void;
}

export function RiskRulesPanel({ rules, onChange }: Props) {
  const set = <K extends keyof RiskRules>(key: K, value: RiskRules[K]) =>
    onChange({ ...rules, [key]: value });

  return (
    <div className="panel">
      <div className="field">
        <label>Max daily loss (USD)</label>
        <input
          type="number"
          min={10}
          value={rules.maxDailyLossUsd}
          onChange={(e) => set("maxDailyLossUsd", Number(e.target.value))}
        />
      </div>
      <div className="field">
        <label>Max drawdown (%)</label>
        <input
          type="number"
          min={1}
          max={80}
          step={1}
          value={Math.round(rules.maxDrawdownPct * 100)}
          onChange={(e) => set("maxDrawdownPct", Number(e.target.value) / 100)}
        />
      </div>
      <div className="field">
        <label>Max portfolio leverage</label>
        <input
          type="number"
          min={1}
          max={50}
          value={rules.maxPortfolioLeverage}
          onChange={(e) => set("maxPortfolioLeverage", Number(e.target.value))}
        />
      </div>
      <div className="field">
        <label>Min liquidation distance (%)</label>
        <input
          type="number"
          min={1}
          max={40}
          step={1}
          value={Math.round(rules.minLiqDistancePct * 100)}
          onChange={(e) => set("minLiqDistancePct", Number(e.target.value) / 100)}
        />
      </div>
      <div className="field">
        <label>Max net correlated exposure (USD)</label>
        <input
          type="number"
          min={100}
          value={rules.maxNetExposureUsd}
          onChange={(e) => set("maxNetExposureUsd", Number(e.target.value))}
        />
      </div>
      <div className="field">
        <label>Max active leads</label>
        <input
          type="number"
          min={1}
          max={10}
          value={rules.maxLeads}
          onChange={(e) => set("maxLeads", Number(e.target.value))}
        />
      </div>
      <div className="field">
        <label>Funding flip threshold (% / 8h)</label>
        <input
          type="number"
          min={0.01}
          step={0.01}
          value={+(rules.fundingFlipThreshold * 100).toFixed(3)}
          onChange={(e) => set("fundingFlipThreshold", Number(e.target.value) / 100)}
        />
      </div>
      <div className="toggle-row">
        <span className="hint">Soft-scale to 25% on warn</span>
        <input
          type="checkbox"
          checked={rules.softScaleOnWarn}
          onChange={(e) => set("softScaleOnWarn", e.target.checked)}
        />
      </div>
      <div className="toggle-row">
        <span className="hint">Auto-stop subscriptions on critical</span>
        <input
          type="checkbox"
          checked={rules.autoStopOnCritical}
          onChange={(e) => set("autoStopOnCritical", e.target.checked)}
        />
      </div>
    </div>
  );
}
