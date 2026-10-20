export function formatCurrency(value: number): string {
  if (!Number.isFinite(value)) return "--";
  const floored = Math.floor(value * 100) / 100;
  return (
    "$" +
    floored.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
  );
}

export function formatSignedCurrency(value: number): string {
  if (!Number.isFinite(value)) return "--";
  const abs = Math.abs(value);
  const floored = Math.floor(abs * 100) / 100;
  const formatted = floored.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return (value >= 0 ? "+" : "−") + "$" + formatted;
}

export function formatPct(value: number, digits = 1): string {
  if (!Number.isFinite(value)) return "--";
  return `${(value * 100).toFixed(digits)}%`;
}

export function shortAddr(addr: string): string {
  if (!addr) return "";
  if (addr.length < 12) return addr;
  if (addr.startsWith("0x")) return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
  return `${addr.slice(0, 8)}…`;
}

export function num(v: string | number | undefined | null, fallback = 0): number {
  if (v === undefined || v === null || v === "") return fallback;
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : fallback;
}
