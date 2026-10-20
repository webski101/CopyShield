import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { ConnectBar } from "./components/ConnectBar";
import { LeadPicker } from "./components/LeadPicker";
import { PortfolioDashboard } from "./components/PortfolioDashboard";
import { ReplayPanel } from "./components/ReplayPanel";
import { RiskRulesPanel } from "./components/RiskRulesPanel";
import { useShieldController } from "./hooks/useShieldController";

export default function App() {
  const s = useShieldController();

  return (
    <div className="app">
      <header className="hero">
        <p className="mode-pill">
          <i />
          Strike Finance hackathon · builder codes
        </p>
        <h1 className="brand">
          Copy<span>Shield</span>
        </h1>
        <p className="hero-copy">
          Portfolio risk for Strike copy trading. Kill switches, multi-lead exposure
          caps, liquidation distance guards, and a survival replay — before the lead
          liquidates you.
        </p>
        <div className="hero-actions">
          <button className="btn btn-primary" onClick={s.enterDemo}>
            Start 90s demo
          </button>
          <a className="btn btn-ghost" href="#shield">
            Configure rules
          </a>
        </div>
      </header>

      <section className="section" id="session">
        <ConnectBar
          mode={s.mode === "live" ? "live" : "demo"}
          connected={s.mode === "live" && Boolean(s.accountId)}
          accountId={s.accountId}
          onEnterDemo={s.enterDemo}
          onConnectLive={s.connectLive}
          onDisconnect={s.reset}
          connecting={s.connecting}
        />
      </section>

      <section className="section" id="shield">
        <div className="section-head">
          <div>
            <h2>Shield desk</h2>
            <p>One composition for rules, leads, and live risk.</p>
          </div>
        </div>
        <div className="grid-2">
          <div>
            <PortfolioDashboard
              equity={s.equity}
              evaluation={s.evaluation}
              positions={s.positions}
              armed={s.armed}
              onArm={() => s.setArmed(true)}
              onDisarm={() => s.setArmed(false)}
              onForceFlatten={s.forceFlatten}
            />
          </div>
          <div style={{ display: "grid", gap: "1rem" }}>
            <RiskRulesPanel rules={s.rules} onChange={s.setRules} />
            <div className="panel">
              <div className="section-head">
                <div>
                  <h2 style={{ fontSize: "1.1rem" }}>Event feed</h2>
                  <p>Trips, pauses, and executions</p>
                </div>
              </div>
              <div className="feed">
                {s.eventLog.length === 0 && (
                  <div className="feed-item">Waiting for risk events…</div>
                )}
                {s.eventLog.map((e) => (
                  <div className={`feed-item ${e.severity}`} key={e.id}>
                    {new Date(e.atMs).toLocaleTimeString()} · {e.message}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="section">
        <LeadPicker
          traders={s.traders}
          selectedIds={s.selectedIds}
          loading={s.loadingLeads}
          onToggle={s.toggleLead}
          onRefresh={s.refreshLeads}
        />
      </section>

      <section className="section">
        <ReplayPanel result={s.replay} running={s.replaying} onRun={s.runReplay} />
      </section>

      <footer className="footer-note">
        CopyShield · Strike builder integration · Demo uses simulated fills; live mode
        uses <code>/v2/copy/*</code>, API wallet auth, and builder fees on protective
        orders. Not financial advice.
      </footer>

      <ToastContainer theme="dark" position="bottom-right" />
    </div>
  );
}
