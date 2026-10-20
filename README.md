# CopyShield

**Portfolio risk layer for [Strike Finance](https://strikefinance.org) copy trading.**

Native Strike copy mirrors fills. It does not stop stacked BTC longs across three leads, funding flips, or a drawdown spiral. CopyShield does.

Built for the Strike Hackathon (48h / $3,000): uses Strike **builder codes**, **API wallets**, and **`/v2/copy/*`**.

## What it does

1. **Kill switches** — max daily loss, max drawdown  
2. **Multi-lead portfolio caps** — max leads, net correlated exposure (BTC/ETH/MEME/…)  
3. **Liquidation distance floor** — scale down / flatten before liq  
4. **Funding stress pause** — stop risk-increasing copies when funding flips against you  
5. **Survival replay** — “Would this lead have survived under my rules?” before you subscribe  
6. **Builder fees** — protective reduce-only orders can carry `X-Builder-Fee-Bps`

## Quick start

```bash
cd copyshield
npm install
cp .env.example .env   # set VITE_BUILDER_CODE after registering as a builder
npm run dev
```

Open http://localhost:5173

### Demo mode (pitch in 90s)

1. Click **Start 90s demo**  
2. Watch RecklessAlpha + SnekKing stack risk while marks stress  
3. Shield trips → flatten / disarm  
4. Run **Survival replay** — naked copy liquidates; CopyShield survives  

### Live mode

1. Register a builder code on Strike  
2. Set `VITE_BUILDER_CODE` and optional `VITE_BUILDER_FEE_BPS`  
3. Click **Connect Strike wallet** (MetaMask/Rabby or CIP-30 Cardano)  
4. Refresh leads from `GET /v2/copy/discover`  
5. Shield a lead → `POST /v2/copy/subscribe` with `stop_loss_amount` + your portfolio rules  
6. On critical trip → `DELETE /v2/copy/subscribe/{id}` + reduce-only IOC closes  

## Pitch script (90 seconds)

> “Copilot helps you pick who to copy. CopyShield keeps you alive while you copy.  
> Here’s RecklessAlpha stacking BTC and ETH into a dump — without a shield, liquidated.  
> Same fills, our rules: daily loss + liq distance + correlated exposure — we flatten early and keep equity.  
> We earn builder fees on every protective order. That’s the product.”

## Stack

- Vite + React + TypeScript  
- `@noble/ed25519` API wallet signing (from Strike builder reference)  
- Strike testnet by default (`api-v2-testnet.strikefinance.org`)

## Project layout

```
src/
  api/          auth, builder connect, copy trading, account
  engine/       riskEngine, replay, correlation, demoData
  hooks/        useShieldController
  components/   desk UI
```

## Notes

- Demo needs no keys and is the reliable hackathon path.  
- Live subscribe/stop requires a registered builder code and a funded Strike account.  
- Not financial advice; hackathon software.
