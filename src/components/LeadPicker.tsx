import type { DiscoveryTrader } from "../types/copy";
import { formatCurrency, formatPct, num, shortAddr } from "../engine/format";

interface Props {
  traders: DiscoveryTrader[];
  selectedIds: string[];
  loading?: boolean;
  onToggle: (trader: DiscoveryTrader) => void;
  onRefresh: () => void;
}

export function LeadPicker({
  traders,
  selectedIds,
  loading,
  onToggle,
  onRefresh,
}: Props) {
  return (
    <div className="panel">
      <div className="section-head" style={{ marginBottom: "0.75rem" }}>
        <div>
          <h2 style={{ fontSize: "1.15rem" }}>Leads</h2>
          <p>Pick up to your max-leads cap. CopyShield sizes risk across all of them.</p>
        </div>
        <button className="btn btn-ghost" onClick={onRefresh} disabled={loading}>
          {loading ? "Loading…" : "Refresh"}
        </button>
      </div>
      <div className="lead-list">
        {traders.map((t) => {
          const id = t.address;
          const active = selectedIds.includes(id);
          const score = num(t.copy_score);
          return (
            <div key={id} className={`lead ${active ? "active" : ""}`}>
              <div>
                <h3>{t.display_name || shortAddr(id)}</h3>
                <div className="meta">
                  {(t.platform ?? "hyperliquid").toUpperCase()} ·{" "}
                  {shortAddr(t.blockchain_address || id)} · equity{" "}
                  {formatCurrency(num(t.account_value))}
                </div>
                <div className="tags">
                  <span className={`tag ${score >= 70 ? "good" : score < 45 ? "bad" : ""}`}>
                    score {score || "—"}
                  </span>
                  <span className="tag">{t.style || "unknown"}</span>
                  <span className="tag">{t.bias || "neutral"}</span>
                  <span className="tag">
                    30d {formatPct(num(t.roi?.["30d"]))}
                  </span>
                  {(t.top_assets ?? []).slice(0, 3).map((a) => (
                    <span className="tag" key={a.asset || a.symbol}>
                      {a.asset || a.symbol}
                    </span>
                  ))}
                </div>
              </div>
              <button
                className={`btn ${active ? "btn-danger" : "btn-primary"}`}
                onClick={() => onToggle(t)}
              >
                {active ? "Remove" : "Shield"}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
