import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amountCents: number, currency = "usd"): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(amountCents / 100);
}

export function formatDate(date: Date | string | null, opts?: Intl.DateTimeFormatOptions): string {
  if (!date) return "—";
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    ...opts,
  }).format(new Date(date));
}

export function planDurationLabel(duration: string): string {
  const map: Record<string, string> = {
    ONE_MONTH: "1 Month",
    THREE_MONTHS: "3 Months",
    SIX_MONTHS: "6 Months",
    ONE_YEAR: "1 Year",
    "1m": "1 Month",
    "3m": "3 Months",
    "6m": "6 Months",
    "1yr": "1 Year",
  };
  return map[duration] ?? duration;
}
