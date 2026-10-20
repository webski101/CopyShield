export const API_BASE_URL =
  import.meta.env.VITE_API_URL ?? "https://api-v2-testnet.strikefinance.org";

export const PRICE_API_URL =
  import.meta.env.VITE_PRICE_URL ?? "https://api-v2-testnet.strikefinance.org/price";

export const PRICE_WS_URL =
  import.meta.env.VITE_PRICE_WS_URL ?? "wss://api-v2-testnet.strikefinance.org/ws/price";

export const USER_WS_URL =
  import.meta.env.VITE_USER_WS_URL ?? "wss://api-v2-testnet.strikefinance.org/ws/user-api";

export const STATS_API_URL =
  import.meta.env.VITE_STATS_URL ?? "https://api-v2-testnet.strikefinance.org/stat";

export const BUILDER_CODE = import.meta.env.VITE_BUILDER_CODE ?? "copyshield";

export const BUILDER_FEE_BPS = Number(import.meta.env.VITE_BUILDER_FEE_BPS ?? "10");
