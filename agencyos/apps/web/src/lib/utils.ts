import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
export function cn(...inputs: ClassValue[]) { return twMerge(clsx(inputs)); }
export function formatDate(value?: string | Date | null) { if (!value) return '—'; return new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }); }
export function formatMoney(value: number | string | null | undefined, currency = 'USD') { if (value === null || value === undefined) return '—'; const n = Number(value);
  // Whole amounts read as $21,600, not $21,600.00 — the cents are noise in a summary figure.
  const fractionDigits = Number.isInteger(n) ? 0 : 2;
  return new Intl.NumberFormat('en-US', { style: 'currency', currency, minimumFractionDigits: fractionDigits, maximumFractionDigits: 2 }).format(n); }
export function initials(name: string) { return name.split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase(); }
export function titleCase(value: string) { return value.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase()); }
export function daysUntil(value?: string | Date | null) { if (!value) return null; return Math.ceil((new Date(value).getTime() - Date.now()) / 86400000); }

/** Returns an http(s) URL safe to use as a link target, or null (blocks `javascript:` and friends). */
export function safeExternalUrl(value: string | null | undefined): string | null {
  if (!value) return null;
  try {
    const url = new URL(/^[a-z][a-z0-9+.-]*:/i.test(value) ? value : `https://${value}`);
    return url.protocol === 'http:' || url.protocol === 'https:' ? url.href : null;
  } catch { return null; }
}
