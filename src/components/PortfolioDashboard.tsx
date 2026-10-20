import type { RiskEvaluation, ShieldPosition } from "../types/risk";
import { formatCurrency, formatPct, formatSignedCurrency } from "../engine/format";

interface Props {
  equity: number;
  evaluation: RiskEvaluation;
  positions: ShieldPosition[];
  armed: boolean;
  onArm: () => void;
  onDisarm: () => void;
  onForceFlatten: () => void;
}

export function PortfolioDashboard({
  equity,
  evaluation,
  positions,
  armed,
  onArm,
  onDisarm,
  onForceFlatten,
}: Props) {
  const { metrics, severity, action, violations } = evaluation;
  const levClass =
    metrics.portfolioLeverage > 8 ? "bad" : metrics.portfolioLeverage > 5 ? "warn" : "good";
  const ddClass =
    metrics.drawdownPct > 0.1 ? "bad" : metrics.drawdownPct > 0.05 ? "warn" : "good";
  const pnlClass = metrics.dailyPnl >= 0 ? "good" : "bad";

  return (
    <div>
      <div className={`status-banner ${severity}`}>
        <div>
          Shield {armed ? "ARMED" : "STANDBY"} · {severity.toUpperCase()}
          {action !== "none" ? ` · action ${action}` : ""}
        </div>
        <div style={{ display: "flex", gap: "0.5rem" }}>
          {armed ? (
            <button className="btn btn-ghost" onClick={onDisarm}>
              Disarm
            </button>
          ) : (
            <button className="btn btn-primary" onClick={onArm}>
              Arm shield
            </button>
          )}
          <button className="btn btn-danger" onClick={onForceFlatten}>
            Flatten now
          </button>
        </div>
      </div>

      <div className="grid-3" style={{ marginBottom: "1rem" }}>
        <div className="metric">
          <label>Equity</label>
          <strong>{formatCurrency(equity)}</strong>
        </div>
        <div className={`metric ${pnlClass}`}>
          <label>Daily PnL</label>
          <strong>{formatSignedCurrency(metrics.dailyPnl)}</strong>
        </div>
        <div className={`metric ${ddClass}`}>
          <label>Drawdown</label>
          <strong>{formatPct(metrics.drawdownPct)}</strong>
        </div>
        <div className={`metric ${levClass}`}>
          <label>Portfolio leverage</label>
          <strong>{metrics.portfolioLeverage.toFixed(2)}x</strong>
        </div>
        <div
          className={`metric ${
            metrics.worstLiqDistancePct < 0.08
              ? "bad"
              : metrics.worstLiqDistancePct < 0.12
                ? "warn"
                : "good"
          }`}
        >
          <label>Worst liq distance</label>
          <strong>{formatPct(metrics.worstLiqDistancePct)}</strong>
        </div>
        <div className="metric">
          <label>Size multiplier</label>
          <strong>{(evaluation.sizeMultiplier * 100).toFixed(0)}%</strong>
        </div>
      </div>

      <div className="panel" style={{ marginBottom: "1rem" }}>
        <div className="section-head">
          <div>
            <h2 style={{ fontSize: "1.1rem" }}>Open copy positions</h2>
            <p>Attributed risk watched by CopyShield</p>
          </div>
        </div>
        <table className="table">
          <thead>
            <tr>
              <th>Lead</th>
              <th>Market</th>
              <th>Side</th>
              <th>Size</th>
              <th>uPnL</th>
              <th>Liq dist</th>
              <th>Funding</th>
            </tr>
          </thead>
          <tbody>
            {positions.length === 0 && (
              <tr>
                <td colSpan={7} style={{ color: "var(--muted)" }}>
                  No open positions — arm a demo or connect live leads.
                </td>
              </tr>
            )}
            {positions.map((p) => {
              const dist =
                Math.abs(p.markPrice - p.liquidationPrice) / Math.max(1e-9, p.markPrice);
              return (
                <tr key={p.id}>
                  <td>{p.leadName}</td>
                  <td>{p.symbol}</td>
                  <td>{p.side}</td>
                  <td>{p.size}</td>
                  <td className={p.unrealizedPnl >= 0 ? "pos" : "neg"}>
                    {formatSignedCurrency(p.unrealizedPnl)}
                  </td>
                  <td>{formatPct(dist)}</td>
                  <td>{(p.fundingRate * 100).toFixed(3)}%</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="panel">
        <div className="section-head">
          <div>
            <h2 style={{ fontSize: "1.1rem" }}>Net exposures</h2>
            <p>Correlation buckets across leads</p>
          </div>
        </div>
        <div className="tags" style={{ marginBottom: "0.75rem" }}>
          {Object.keys(metrics.netExposures).length === 0 && (
            <span className="tag">No exposure</span>
          )}
          {Object.entries(metrics.netExposures).map(([k, v]) => (
            <span className={`tag ${Math.abs(v) > 4000 ? "bad" : ""}`} key={k}>
              {k} {formatSignedCurrency(v)}
            </span>
          ))}
        </div>
        <div className="feed">
          {violations.length === 0 && (
            <div className="feed-item">All clear — rules holding.</div>
          )}
          {violations.map((v) => (
            <div className={`feed-item ${v.severity}`} key={v.id}>
              [{v.severity}] {v.message}
              {v.detail ? ` — ${v.detail}` : ""}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
