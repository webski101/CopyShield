# CopyShield — hackathon demo

## 90-second live demo

1. `npm run dev` → open the app  
2. Click **Start 90s demo**  
3. Point at the status banner: Shield ARMED, positions from RecklessAlpha + SnekKing  
4. Let the stress sim run ~20–40s until **WARN/CRITICAL**  
5. Show flatten / disarm auto-execution  
6. Scroll to **Would this have survived?** → **Run survival replay**  
7. Contrast red (liquidated) vs green (survived) equity curves  
8. Mention builder code fee on protective orders for live path  

## Talking points

- Problem: Strike copy is fill-accurate but portfolio-blind  
- Copilot = who to copy; CopyShield = how not to blow up  
- Novel: multi-lead correlation + liq distance + funding pause + pre-subscribe replay  
- Monetization: `X-Builder-Fee-Bps` on every order the shield sends  
- Ask: builder partnership / investment to ship managed copy sub-accounts with Shield defaults  

## Judges checklist

- [ ] Working UI without API keys (demo)  
- [ ] Real Strike API integration code paths (discover / subscribe / stop / reduce-only)  
- [ ] Clear before/after survival proof  
- [ ] Builder code wired in config  
