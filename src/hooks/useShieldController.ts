import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  clearApiWalletKeys,
  generateApiWalletKeys,
  storeApiWalletKeys,
} from "../api/auth";
import { requestSignature, verifySignature } from "../api/builderConnect";
import { BUILDER_CODE, BUILDER_FEE_BPS } from "../api/config";
import {
  discoverTraders,
  listSubscriptions,
  stopSubscription,
  subscribeToLead,
} from "../api/copy";
import { getAccount, placeReduceOnlyMarket } from "../api/account";
import {
  DEMO_LEADS,
  createDemoPositions,
  recklessAlphaFills,
  tickDemoMarks,
} from "../engine/demoData";
import { evaluateRisk } from "../engine/riskEngine";
import { replayLeadFills } from "../engine/replay";
import { num } from "../engine/format";
import type { DiscoveryTrader } from "../types/copy";
import {
  DEFAULT_RISK_RULES,
  type PortfolioSnapshot,
  type ReplayResult,
  type RiskEvaluation,
  type RiskRules,
  type RiskViolation,
  type ShieldPosition,
} from "../types/risk";

export type AppMode = "idle" | "demo" | "live";

function emptyEval(rulesIgnored?: RiskRules): RiskEvaluation {
  void rulesIgnored;
  return {
    ok: true,
    severity: "info",
    action: "none",
    violations: [],
    metrics: {
      dailyPnl: 0,
      drawdownPct: 0,
      portfolioLeverage: 0,
      worstLiqDistancePct: 1,
      netExposures: {},
      fundingAlerts: [],
    },
    sizeMultiplier: 1,
  };
}

export function useShieldController() {
  const [mode, setMode] = useState<AppMode>("idle");
  const [rules, setRules] = useState<RiskRules>(DEFAULT_RISK_RULES);
  const [traders, setTraders] = useState<DiscoveryTrader[]>(DEMO_LEADS);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [positions, setPositions] = useState<ShieldPosition[]>([]);
  const [armed, setArmed] = useState(false);
  const [equity, setEquity] = useState(5000);
  const [peakEquity, setPeakEquity] = useState(5000);
  const [dayStartEquity, setDayStartEquity] = useState(5000);
  const [realizedToday, setRealizedToday] = useState(0);
  const [evaluation, setEvaluation] = useState<RiskEvaluation>(emptyEval());
  const [eventLog, setEventLog] = useState<RiskViolation[]>([]);
  const [replay, setReplay] = useState<ReplayResult | null>(null);
  const [replaying, setReplaying] = useState(false);
  const [loadingLeads, setLoadingLeads] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [accountId, setAccountId] = useState<string | undefined>();
  const [subscriptionMap, setSubscriptionMap] = useState<Record<string, string>>({});
  const demoStep = useRef(0);
  const lastActionRef = useRef<string>("none");

  const snapshot: PortfolioSnapshot = useMemo(
    () => ({
      equity,
      startingEquity: dayStartEquity,
      peakEquity,
      dayStartEquity,
      realizedPnlToday: realizedToday,
      unrealizedPnl: positions.reduce((s, p) => s + p.unrealizedPnl, 0),
      positions,
      activeLeadIds: selectedIds,
      timestampMs: Date.now(),
    }),
    [equity, dayStartEquity, peakEquity, realizedToday, positions, selectedIds]
  );

  // Recompute risk whenever portfolio or rules change
  useEffect(() => {
    const ev = evaluateRisk(snapshot, rules);
    setEvaluation(ev);
    if (ev.violations.length) {
      setEventLog((prev) => {
        const merged = [...ev.violations, ...prev];
        return merged.slice(0, 40);
      });
    }
  }, [snapshot, rules]);

  // Demo stress loop
  useEffect(() => {
    if (mode !== "demo" || !armed) return;
    const id = window.setInterval(() => {
      demoStep.current += 1;
      setPositions((prev) => {
        if (!prev.length) return createDemoPositions(equity);
        return tickDemoMarks(prev, demoStep.current);
      });
    }, 1200);
    return () => window.clearInterval(id);
  }, [mode, armed, equity]);

  // Keep equity in sync with cash + uPnL (demo approximates cash as dayStart + realized)
  useEffect(() => {
    const u = positions.reduce((s, p) => s + p.unrealizedPnl, 0);
    const next = dayStartEquity + realizedToday + u;
    setEquity(next);
    setPeakEquity((p) => Math.max(p, next));
  }, [positions, dayStartEquity, realizedToday]);

  // Execute shield actions when armed
  useEffect(() => {
    if (!armed) return;
    if (evaluation.action === "none") {
      lastActionRef.current = "none";
      return;
    }
    if (lastActionRef.current === evaluation.action) return;
    lastActionRef.current = evaluation.action;

    const run = async () => {
      if (
        evaluation.action === "close_all" ||
        evaluation.action === "stop_subscription"
      ) {
        // Flatten local/demo positions
        const closedPnL = positions.reduce((s, p) => s + p.unrealizedPnl, 0);
        setRealizedToday((r) => r + closedPnL);
        setPositions([]);

        if (mode === "live") {
          // Stop native copy subscriptions
          for (const subId of Object.values(subscriptionMap)) {
            try {
              await stopSubscription(subId);
            } catch (e) {
              console.error(e);
            }
          }
          // Best-effort reduce-only closes for leftover positions
          for (const p of positions) {
            try {
              await placeReduceOnlyMarket({
                symbol: p.symbol,
                side: p.side === "long" ? "sell" : "buy",
                size: String(p.size),
                builderFeeBps: BUILDER_FEE_BPS,
              });
            } catch (e) {
              console.error(e);
            }
          }
        }

        setArmed(false);
        setEventLog((prev) => [
          {
            id: `exec-${Date.now()}`,
            rule: "maxDailyLossUsd",
            severity: "critical",
            action: evaluation.action,
            message: `Executed ${evaluation.action} — shield disarmed after flatten`,
            atMs: Date.now(),
          },
          ...prev,
        ]);
      }
    };
    void run();
  }, [armed, evaluation.action, mode, positions, subscriptionMap]);

  const refreshLeads = useCallback(async () => {
    setLoadingLeads(true);
    try {
      const res = await discoverTraders({
        platform: "all",
        sort: "copy_score",
        limit: 12,
      });
      if (res.items?.length) setTraders(res.items);
      else setTraders(DEMO_LEADS);
    } catch {
      setTraders(DEMO_LEADS);
    } finally {
      setLoadingLeads(false);
    }
  }, []);

  const enterDemo = useCallback(() => {
    demoStep.current = 0;
    setMode("demo");
    setTraders(DEMO_LEADS);
    setSelectedIds([DEMO_LEADS[0].address, DEMO_LEADS[2].address]);
    setPositions(createDemoPositions(5000));
    setEquity(5000);
    setPeakEquity(5000);
    setDayStartEquity(5000);
    setRealizedToday(0);
    setArmed(true);
    setEventLog([]);
    lastActionRef.current = "none";
  }, []);

  const reset = useCallback(() => {
    clearApiWalletKeys();
    setMode("idle");
    setArmed(false);
    setPositions([]);
    setSelectedIds([]);
    setAccountId(undefined);
    setSubscriptionMap({});
    setEquity(5000);
    setPeakEquity(5000);
    setDayStartEquity(5000);
    setRealizedToday(0);
    setEventLog([]);
    setReplay(null);
    lastActionRef.current = "none";
  }, []);

  const toggleLead = useCallback(
    async (trader: DiscoveryTrader) => {
      const id = trader.address;
      const exists = selectedIds.includes(id);
      if (exists) {
        setSelectedIds((ids) => ids.filter((x) => x !== id));
        setPositions((ps) => ps.filter((p) => p.leadId !== id));
        const subId = subscriptionMap[id];
        if (mode === "live" && subId) {
          try {
            await stopSubscription(subId);
          } catch (e) {
            console.error(e);
          }
          setSubscriptionMap((m) => {
            const next = { ...m };
            delete next[id];
            return next;
          });
        }
        return;
      }
      if (selectedIds.length >= rules.maxLeads) {
        setEventLog((prev) => [
          {
            id: `maxlead-${Date.now()}`,
            rule: "maxLeads",
            severity: "warn",
            action: "pause_entries",
            message: `Max leads is ${rules.maxLeads}. Raise the cap or remove a lead.`,
            atMs: Date.now(),
          },
          ...prev,
        ]);
        return;
      }
      setSelectedIds((ids) => [...ids, id]);

      if (mode === "live" && accountId) {
        try {
          const sub = await subscribeToLead({
            lead_account_id: id,
            platform: trader.platform ?? "hyperliquid",
            copy_mode: "fixed_amount",
            margin_per_entry_order: "50",
            stop_loss_amount: String(rules.maxDailyLossUsd),
            max_leverage: Math.min(20, rules.maxPortfolioLeverage),
          });
          if (sub.subscription_id) {
            setSubscriptionMap((m) => ({ ...m, [id]: sub.subscription_id }));
          }
        } catch (e) {
          console.error(e);
          setEventLog((prev) => [
            {
              id: `suberr-${Date.now()}`,
              rule: "maxLeads",
              severity: "warn",
              action: "none",
              message: e instanceof Error ? e.message : "Subscribe failed",
              atMs: Date.now(),
            },
            ...prev,
          ]);
        }
      }
    },
    [selectedIds, rules, mode, accountId, subscriptionMap]
  );

  const runReplay = useCallback(() => {
    setReplaying(true);
    window.setTimeout(() => {
      const result = replayLeadFills({
        leadId: DEMO_LEADS[0].address,
        leadName: "RecklessAlpha",
        fills: recklessAlphaFills(),
        rules,
        startingEquity: 5000,
        leverage: 10,
      });
      setReplay(result);
      setReplaying(false);
    }, 350);
  }, [rules]);

  const forceFlatten = useCallback(() => {
    const closedPnL = positions.reduce((s, p) => s + p.unrealizedPnl, 0);
    setRealizedToday((r) => r + closedPnL);
    setPositions([]);
    setArmed(false);
    setEventLog((prev) => [
      {
        id: `flat-${Date.now()}`,
        rule: "maxDailyLossUsd",
        severity: "critical",
        action: "close_all",
        message: "Manual flatten executed",
        atMs: Date.now(),
      },
      ...prev,
    ]);
  }, [positions]);

  const connectLive = useCallback(async () => {
    setConnecting(true);
    try {
      const keys = generateApiWalletKeys();
      storeApiWalletKeys(keys);

      // Prefer injected EVM wallet; fall back to Cardano CIP-30 if present.
      const eth = (window as unknown as { ethereum?: any }).ethereum;
      const cardano = (window as unknown as { cardano?: any }).cardano;

      let address = "";
      let chain: "ethereum" | "solana" | "cardano" = "ethereum";
      let walletSignature = "";

      if (eth?.request) {
        const accounts: string[] = await eth.request({ method: "eth_requestAccounts" });
        address = accounts[0];
        chain = "ethereum";
        const challenge = await requestSignature({
          address,
          chain,
          publicKey: keys.publicKey,
          builderCode: BUILDER_CODE,
          feeShareBps: BUILDER_FEE_BPS,
        });
        walletSignature = await eth.request({
          method: "personal_sign",
          params: [challenge.message_to_sign, address],
        });
        const verified = await verifySignature({
          nonce: challenge.nonce,
          walletSignature,
        });
        setAccountId(verified.account_id);
        setMode("live");
        await refreshLeads();
        try {
          const acct = await getAccount();
          const bal = num(acct.available_balance, 5000);
          setEquity(bal);
          setPeakEquity(bal);
          setDayStartEquity(bal);
        } catch {
          /* optional */
        }
        try {
          const subs = await listSubscriptions();
          const map: Record<string, string> = {};
          for (const s of subs.subscriptions ?? []) {
            map[s.lead_account_id] = s.subscription_id;
          }
          setSubscriptionMap(map);
          setSelectedIds(Object.keys(map));
        } catch {
          /* optional */
        }
      } else if (cardano) {
        const walletName = Object.keys(cardano)[0];
        const api = await cardano[walletName].enable();
        const used = await api.getUsedAddresses();
        address = used[0] || (await api.getChangeAddress());
        chain = "cardano";
        const challenge = await requestSignature({
          address,
          chain,
          publicKey: keys.publicKey,
          builderCode: BUILDER_CODE,
          feeShareBps: BUILDER_FEE_BPS,
        });
        // CIP-30 signData expects hex of message
        const msgHex = [...new TextEncoder().encode(challenge.message_to_sign)]
          .map((b) => b.toString(16).padStart(2, "0"))
          .join("");
        const signed = await api.signData(address, msgHex);
        walletSignature =
          typeof signed === "string"
            ? signed
            : `${signed.signature}:${signed.key}`;
        const verified = await verifySignature({
          nonce: challenge.nonce,
          walletSignature,
        });
        setAccountId(verified.account_id);
        setMode("live");
        await refreshLeads();
      } else {
        clearApiWalletKeys();
        throw new Error(
          "No browser wallet found. Use demo mode, or install Rabby/MetaMask/Nami."
        );
      }
    } catch (e) {
      clearApiWalletKeys();
      setEventLog((prev) => [
        {
          id: `conn-${Date.now()}`,
          rule: "maxLeads",
          severity: "warn",
          action: "none",
          message: e instanceof Error ? e.message : "Connect failed",
          atMs: Date.now(),
        },
        ...prev,
      ]);
    } finally {
      setConnecting(false);
    }
  }, [refreshLeads]);

  return {
    mode,
    rules,
    setRules,
    traders,
    selectedIds,
    positions,
    armed,
    setArmed,
    equity,
    evaluation,
    eventLog,
    replay,
    replaying,
    loadingLeads,
    connecting,
    accountId,
    enterDemo,
    reset,
    refreshLeads,
    toggleLead,
    runReplay,
    forceFlatten,
    connectLive,
  };
}
