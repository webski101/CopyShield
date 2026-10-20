import { BUILDER_CODE, BUILDER_FEE_BPS, API_BASE_URL } from "../api/config";

interface Props {
  mode: "demo" | "live";
  connected: boolean;
  accountId?: string;
  onEnterDemo: () => void;
  onConnectLive: () => void;
  onDisconnect: () => void;
  connecting?: boolean;
}

export function ConnectBar({
  mode,
  connected,
  accountId,
  onEnterDemo,
  onConnectLive,
  onDisconnect,
  connecting,
}: Props) {
  return (
    <div className="panel connect-box">
      <div className="section-head" style={{ marginBottom: 0 }}>
        <div>
          <h2 style={{ fontSize: "1.15rem" }}>Session</h2>
          <p>
            Builder <code>{BUILDER_CODE}</code> · fee {BUILDER_FEE_BPS} bps ·{" "}
            {API_BASE_URL.replace("https://", "")}
          </p>
        </div>
        <span className="mode-pill">
          <i />
          {mode === "demo" ? "Demo sim" : connected ? "Live API wallet" : "Live ready"}
        </span>
      </div>

      <div className="hero-actions">
        <button className="btn btn-primary" onClick={onEnterDemo}>
          Launch demo stress test
        </button>
        <button
          className="btn btn-ghost"
          onClick={onConnectLive}
          disabled={connecting}
        >
          {connecting ? "Connecting…" : "Connect Strike wallet (live)"}
        </button>
        {(mode === "demo" || connected) && (
          <button className="btn btn-ghost" onClick={onDisconnect}>
            Reset
          </button>
        )}
      </div>

      {connected && accountId && (
        <p className="hint">Connected account {accountId}</p>
      )}
      <p className="hint">
        Live mode uses Strike builder connect (Ed25519 API wallet). Demo mode needs no
        keys and is what you pitch in 90 seconds.
      </p>
    </div>
  );
}
