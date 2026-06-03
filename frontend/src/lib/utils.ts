import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(iso: string | Date | null | undefined): string {
  if (!iso) return '—';
  const d = typeof iso === 'string' ? new Date(iso) : iso;
  return d.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatRelative(iso: string | null | undefined): string {
  if (!iso) return '—';
  const date = new Date(iso);
  const diff = Date.now() - date.getTime();
  const m = Math.floor(diff / 60_000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  return date.toLocaleDateString();
}

export function initials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase() ?? '')
    .join('');
}

const RECIPIENT_PALETTE = [
  { bg: 'bg-rose-100', fg: 'text-rose-900', ring: 'ring-rose-300' },
  { bg: 'bg-amber-100', fg: 'text-amber-900', ring: 'ring-amber-300' },
  { bg: 'bg-emerald-100', fg: 'text-emerald-900', ring: 'ring-emerald-300' },
  { bg: 'bg-sky-100', fg: 'text-sky-900', ring: 'ring-sky-300' },
  { bg: 'bg-violet-100', fg: 'text-violet-900', ring: 'ring-violet-300' },
  { bg: 'bg-stone-200', fg: 'text-stone-900', ring: 'ring-stone-400' },
];

export function recipientColor(index: number) {
  return RECIPIENT_PALETTE[index % RECIPIENT_PALETTE.length];
}
