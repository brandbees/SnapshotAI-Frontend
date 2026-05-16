import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { SCORE_THRESHOLDS } from "./constants";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function scoreColor(score: number): string {
  if (score >= SCORE_THRESHOLDS.good) return "var(--score-good)";
  if (score >= SCORE_THRESHOLDS.warn) return "var(--score-warn)";
  return "var(--score-bad)";
}

export function scoreHex(score: number): string {
  if (score >= SCORE_THRESHOLDS.good) return "#16a34a";
  if (score >= SCORE_THRESHOLDS.warn) return "#d97706";
  return "#dc2626";
}

export function scoreTailwind(score: number): string {
  if (score >= SCORE_THRESHOLDS.good) return "text-score-good";
  if (score >= SCORE_THRESHOLDS.warn) return "text-score-warn";
  return "text-score-bad";
}

export function scoreBgTailwind(score: number): string {
  if (score >= SCORE_THRESHOLDS.good)
    return "bg-green-50 text-score-good border-green-200";
  if (score >= SCORE_THRESHOLDS.warn)
    return "bg-amber-50 text-score-warn border-amber-200";
  return "bg-red-50 text-score-bad border-red-200";
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function timeAgo(iso: string): string {
  const seconds = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function truncateUrl(url: string, max = 30): string {
  const clean = url.replace(/^https?:\/\//, "");
  return clean.length > max ? clean.slice(0, max) + "…" : clean;
}
