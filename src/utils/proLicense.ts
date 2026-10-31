export const OWNER_EMAIL = 'vibeclip11@gmail.com';

export interface OfflinePlanOption {
  tierCode: '7D' | '30D' | '90D' | '365D' | 'LIFE';
  label: string;
  durationDays: number;
  suggestedPriceIdr: string;
}

export const OFFLINE_PRO_PLANS: OfflinePlanOption[] = [
  { tierCode: '7D', label: 'Paket 7 Hari', durationDays: 7, suggestedPriceIdr: 'Rp 15.000' },
  { tierCode: '30D', label: 'Paket 30 Hari (1 Bulan)', durationDays: 30, suggestedPriceIdr: 'Rp 39.000' },
  { tierCode: '90D', label: 'Paket 90 Hari (3 Bulan)', durationDays: 90, suggestedPriceIdr: 'Rp 99.000' },
  { tierCode: '365D', label: 'Paket 1 Tahun', durationDays: 365, suggestedPriceIdr: 'Rp 299.000' },
  { tierCode: 'LIFE', label: 'Paket Lifetime (Selamanya)', durationDays: 36500, suggestedPriceIdr: 'Rp 499.000' },
];

export const VOUCHER_REGEX = /^CCPRO-(7D|30D|90D|365D|LIFE)-[A-Z0-9]{4}-[A-Z0-9]{4}$/;

export function normalizeLicenseCode(raw: string): string {
  return raw.trim().toUpperCase().replace(/\s+/g, '');
}

export function isValidVoucherFormat(code: string): boolean {
  const normalized = normalizeLicenseCode(code);
  return (
    normalized.length >= 14 &&
    normalized.length <= 32 &&
    VOUCHER_REGEX.test(normalized)
  );
}

export function getPlanFromTierCode(tierCode: string): OfflinePlanOption | null {
  return OFFLINE_PRO_PLANS.find((p) => p.tierCode === tierCode) ?? null;
}

export interface ProLicenseSession {
  active: boolean;
  role: 'owner' | 'buyer';
  code: string;
  planLabel: string;
  activatedAt: string;
  expiresAt: string | null; // null = unlimited owner / lifetime
}

export function isLicenseSessionValid(session: ProLicenseSession | null, nowMs = Date.now()): boolean {
  if (!session || !session.active) return false;
  if (!session.expiresAt) return true;
  const exp = Date.parse(session.expiresAt);
  if (Number.isNaN(exp)) return false;
  return exp > nowMs;
}
