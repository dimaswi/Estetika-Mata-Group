import axios from 'axios';

export const UNIT_OPTIONS = [
  { value: 'pcs', label: 'Pcs (Buah)' },
  { value: 'box', label: 'Box' },
  { value: 'pack', label: 'Pack' },
  { value: 'strip', label: 'Strip' },
  { value: 'botol', label: 'Botol' },
  { value: 'vial', label: 'Vial' },
  { value: 'ampul', label: 'Ampul' },
  { value: 'tube', label: 'Tube' },
  { value: 'sachet', label: 'Sachet' },
  { value: 'set', label: 'Set' },
  { value: 'unit', label: 'Unit' },
  { value: 'roll', label: 'Roll' },
] as const;

export function formatIDR(amount: number | undefined | null): string {
  const val = Number(amount || 0);
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(val);
}

export function formatThousand(value: string | number | undefined | null, allowDecimal = true): string {
  if (value === undefined || value === null || value === '') return '';
  const str = String(value);
  if (!allowDecimal) {
    const digits = str.replace(/\D/g, '');
    if (!digits) return '';
    const normalized = digits.replace(/^0+(?=\d)/, '');
    return normalized.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  }
  const clean = str.replace(/[^0-9.]/g, '');
  if (!clean) return '';
  const dotIdx = clean.indexOf('.');
  const rawInt = (dotIdx >= 0 ? clean.slice(0, dotIdx) : clean).replace(/^0+(?=\d)/, '');
  const formattedInt = (rawInt || (dotIdx >= 0 ? '0' : '')).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  if (dotIdx >= 0) {
    const dec = clean.slice(dotIdx + 1).replace(/\./g, '');
    return `${formattedInt},${dec}`;
  }
  return formattedInt;
}

export function parseThousand(formatted: string | number | undefined | null): number {
  if (formatted === undefined || formatted === null || formatted === '') return 0;
  if (typeof formatted === 'number') return Number.isFinite(formatted) ? formatted : 0;
  const normalized = formatted.replace(/\./g, '').replace(',', '.').replace(/[^0-9.]/g, '');
  const num = Number(normalized);
  return Number.isFinite(num) ? num : 0;
}

export function formatDateID(dateStr: string | undefined | null): string {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export function formatDateInput(dateStr?: string | null): string {
  if (!dateStr) return new Date().toISOString().slice(0, 10);
  return dateStr.slice(0, 10);
}

export function generateAutoCode(prefix: string): string {
  const rand = Math.floor(100 + Math.random() * 900);
  const ts = Date.now().toString().slice(-3);
  return `${prefix.toUpperCase()}-${ts}${rand}`;
}

export function generateBatchCode(): string {
  const d = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const rand = Math.floor(100 + Math.random() * 900);
  return `LOT-${d}-${rand}`;
}

export function getApiErrorMessage(err: unknown, fallback = 'Terjadi kesalahan'): string {
  if (axios.isAxiosError(err)) {
    const msg = err.response?.data?.error || err.response?.data?.message;
    if (typeof msg === 'string' && msg.trim()) return msg;
  }
  if (err instanceof Error && err.message) return err.message;
  return fallback;
}

export function isStandaloneVariant(v?: {
  is_default?: boolean;
  product?: { has_variants?: boolean };
} | null): boolean {
  if (!v) return false;
  return Boolean(v.is_default || v.product?.has_variants === false);
}

export function formatVariantDisplayName(v?: {
  variant_name?: string;
  is_default?: boolean;
  product?: { name?: string; has_variants?: boolean };
} | null): string {
  if (!v) return '—';
  const prodName = v.product?.name || '';
  if (isStandaloneVariant(v)) {
    return prodName || v.variant_name || '—';
  }
  return prodName ? `${prodName} — ${v.variant_name || ''}` : (v.variant_name || '—');
}

export function getEDBadgeInfo(status?: string, days?: number) {
  switch (status) {
    case 'expired':
      return {
        label: `Expired (${Math.abs(days || 0)} hr lalu)`,
        className: 'bg-red-100 text-red-700 border-red-200 dark:bg-red-950/60 dark:text-red-300 dark:border-red-900',
      };
    case 'critical_30':
      return {
        label: `Kritis (${days ?? 0} hr)`,
        className: 'bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-950/60 dark:text-orange-300 dark:border-orange-900',
      };
    case 'warning_90':
      return {
        label: `Mendekati ED (${days ?? 0} hr)`,
        className: 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-900',
      };
    case 'safe':
      return {
        label: `Aman (${days ?? 0} hr)`,
        className: 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-900',
      };
    default:
      return {
        label: 'Belum Ada Stok',
        className: 'bg-neutral-100 text-neutral-600 border-neutral-200 dark:bg-neutral-800 dark:text-neutral-400 dark:border-neutral-700',
      };
  }
}
