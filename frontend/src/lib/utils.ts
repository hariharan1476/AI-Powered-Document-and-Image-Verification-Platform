import { ApiResponse } from "../types";

export function formatFileSize(bytes?: number): string {
  if (!bytes) return "0 B";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export function safeScore(v: unknown): number {
  const n = parseFloat(String(v ?? "0"));
  return isNaN(n) ? 0 : Math.min(100, Math.max(0, n));
}

export function scoreText(v: unknown): string {
  const n = safeScore(v);
  return n > 0 ? `${n.toFixed(2)}%` : "N/A";
}

export function scoreClass(v: unknown): "good" | "medium" | "poor" {
  const n = safeScore(v);
  if (n >= 70) return "good";
  if (n >= 40) return "medium";
  return "poor";
}

export function prettyLabel(key: string): string {
  return key
    .replace(/_/g, " ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export function valueToString(val: unknown): string {
  if (val === null || val === undefined) return "N/A";
  if (typeof val === "object") return JSON.stringify(val, null, 2);
  return String(val);
}

export function resolveStatus(data: ApiResponse): string {
  return (
    data?.result?.verification?.status ||
    data?.document?.status ||
    data?.verification?.status ||
    ""
  ).toUpperCase();
}

export function statusClass(status: string): "verified" | "review" | "rejected" {
  if (status.includes("VERIFIED")) return "verified";
  if (status.includes("REVIEW") || status.includes("DETECTED")) return "review";
  return "rejected";
}

export function statusEmoji(cls: "verified" | "review" | "rejected"): string {
  if (cls === "verified") return "✓";
  if (cls === "review") return "⚠";
  return "✕";
}

export function statusLabel(cls: "verified" | "review" | "rejected", raw: string): string {
  if (raw) return raw;
  if (cls === "verified") return "VERIFIED";
  if (cls === "review") return "REVIEW REQUIRED";
  return "REJECTED";
}
