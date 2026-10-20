import type { ReplayResult } from "../types/risk";
import { formatCurrency, formatPct, formatSignedCurrency } from "../engine/format";
import { Sparkline } from "./Sparkline";

interface Props {
  result: ReplayResult | null;
  running: boolean;
  onRun: () => void;
}

export function ReplayPanel({ result, running, onRun }: Props) {
  return (
    <div className="panel">
      <div className="section-head">
        <div>
          <h2 style={{ fontSize: "1.15rem" }}>Would this have survived?</h2>
          <p>
            Replay RecklessAlpha&apos;s stacked-long dump under your rules before you
            subscribe.
          </p>
        </div>
        <button className="btn btn-primary" onClick={onRun} disabled={running}>
          {running ? "Replaying…" : "Run survival replay"}
        </button>
      </div>

      {!result && (
        <p className="hint">
          Pitch moment: without CopyShield the account liquidates; with it, the kill
          switch flattens early and equity survives.
        </p>
      )}

      {result && (
        <>
          <div className="replay-compare">
            <div className="metric bad">
              <h4>Without shield</h4>
              <label>Final equity</label>
              <strong>{formatCurrency(result.withoutShield.finalEquity)}</strong>
              <div className="hint" style={{ marginTop: "0.45rem" }}>
                Max DD {formatPct(result.withoutShield.maxDrawdownPct)} ·{" "}
                {result.withoutShield.liquidated ? "LIQUIDATED" : "survived"}
              </div>
              <Sparkline
                series={result.withoutShield.equityCurve}
                stroke="#ff5a3c"
                fill="rgba(255,90,60,0.12)"
              />
            </div>
            <div className="metric good">
              <h4>With CopyShield</h4>
              <label>Final equity</label>
              <strong>{formatCurrency(result.withShield.finalEquity)}</strong>
              <div className="hint" style={{ marginTop: "0.45rem" }}>
                Max DD {formatPct(result.withShield.maxDrawdownPct)} · trips{" "}
                {result.withShield.trips} ·{" "}
                {result.withShield.liquidated ? "LIQUIDATED" : "survived"}
              </div>
              <Sparkline series={result.withShield.equityCurve} />
            </div>
          </div>
          <div className="hint" style={{ marginTop: "0.85rem" }}>
            Delta{" "}
            <span className="pos">
              {formatSignedCurrency(
                result.withShield.finalEquity - result.withoutShield.finalEquity
              )}
            </span>{" "}
            protected vs naked copy.
          </div>
          <div className="feed" style={{ marginTop: "0.75rem" }}>
            {result.withShield.events.map((e, i) => (
              <div className="feed-item warn" key={`${e}-${i}`}>
                {e}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
