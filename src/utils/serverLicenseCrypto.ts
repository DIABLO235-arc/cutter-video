import crypto from 'node:crypto';
import {
  getPlanFromTierCode,
  isValidVoucherFormat,
  normalizeLicenseCode,
  type OfflinePlanOption,
} from './proLicense.ts';

const DEFAULT_OWNER_MASTER_CODE = 'VIBECLIP-OWNER-2026';
const DEFAULT_SIGNING_SECRET = 'clipscutter-vibeclip11-offline-hmac-2026-v1';

const ALPHANUM = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export function getOwnerMasterCode(): string {
  const envCode = process.env.OWNER_PRO_CODE?.trim();
  if (envCode && envCode !== 'MY_OWNER_PRO_CODE') {
    return normalizeLicenseCode(envCode);
  }
  return DEFAULT_OWNER_MASTER_CODE;
}

function getSigningSecret(): string {
  const envSecret = process.env.OFFLINE_LICENSE_SECRET?.trim();
  if (envSecret && envSecret !== 'MY_OFFLINE_LICENSE_SECRET') {
    return envSecret;
  }
  return DEFAULT_SIGNING_SECRET;
}

export function computeVoucherSignature(tierCode: string, nonce: string): string {
  const hmac = crypto
    .createHmac('sha256', getSigningSecret())
    .update(`CCPRO:${tierCode.toUpperCase()}:${nonce.toUpperCase()}`)
    .digest();

  let sig = '';
  for (let i = 0; i < 4; i++) {
    sig += ALPHANUM[hmac[i] % ALPHANUM.length];
  }
  return sig;
}

export function generateRandomNonce(): string {
  const bytes = crypto.randomBytes(4);
  let out = '';
  for (let i = 0; i < 4; i++) {
    out += ALPHANUM[bytes[i] % ALPHANUM.length];
  }
  return out;
}

export function mintSignedOfflineVoucher(
  tierCode: OfflinePlanOption['tierCode'],
  customNonce?: string
): {
  code: string;
  plan: OfflinePlanOption;
} {
  const plan = getPlanFromTierCode(tierCode);
  if (!plan) {
    throw new Error(`Unsupported tier code: ${tierCode}`);
  }
  const nonce = (customNonce || generateRandomNonce()).toUpperCase();
  const sig = computeVoucherSignature(plan.tierCode, nonce);
  const code = `CCPRO-${plan.tierCode}-${nonce}-${sig}`;
  return { code, plan };
}

export type CodeVerificationOutcome =
  | {
      valid: true;
      role: 'owner';
      code: string;
      planLabel: string;
      durationDays: null;
      expiresAt: null;
    }
  | {
      valid: true;
      role: 'buyer';
      code: string;
      planLabel: string;
      durationDays: number;
      expiresAt: string | null;
    }
  | {
      valid: false;
      reason: string;
    };

export function verifyLicenseCodeCryptographically(
  rawInput: string,
  revokedCodes: Set<string> = new Set()
): CodeVerificationOutcome {
  const normalized = normalizeLicenseCode(rawInput);
  if (!normalized) {
    return { valid: false, reason: 'Masukkan kode aktivasi Pro terlebih dahulu.' };
  }

  // 1. Check Owner Master Code
  if (normalized === getOwnerMasterCode()) {
    return {
      valid: true,
      role: 'owner',
      code: normalized,
      planLabel: 'Owner Master Pro (Khusus Pemilik)',
      durationDays: null,
      expiresAt: null,
    };
  }

  // 2. Check Offline Buyer Code format + HMAC signature
  if (!isValidVoucherFormat(normalized)) {
    return {
      valid: false,
      reason: 'Format kode tidak valid. Gunakan kode resmi dari pemilik (contoh: CCPRO-30D-XXXX-XXXX).',
    };
  }

  if (revokedCodes.has(normalized)) {
    return {
      valid: false,
      reason: 'Kode lisensi ini telah dinonaktifkan / dicabut oleh pemilik.',
    };
  }

  const parts = normalized.split('-');
  // ['CCPRO', tierCode, nonce, providedSig]
  const [, tierCode, nonce, providedSig] = parts;
  const expectedSig = computeVoucherSignature(tierCode, nonce);

  const sigBufA = Buffer.from(providedSig, 'utf8');
  const sigBufB = Buffer.from(expectedSig, 'utf8');
  if (sigBufA.length !== sigBufB.length || !crypto.timingSafeEqual(sigBufA, sigBufB)) {
    return {
      valid: false,
      reason: 'Kode aktivasi Pro tidak terdaftar atau tanda tangan lisensi tidak sah.',
    };
  }

  const plan = getPlanFromTierCode(tierCode);
  if (!plan) {
    return { valid: false, reason: 'Paket durasi pada kode tidak dikenali.' };
  }

  const isLifetime = plan.tierCode === 'LIFE';
  const expiresAt = isLifetime
    ? null
    : new Date(Date.now() + plan.durationDays * 24 * 60 * 60 * 1000).toISOString();

  return {
    valid: true,
    role: 'buyer',
    code: normalized,
    planLabel: plan.label,
    durationDays: plan.durationDays,
    expiresAt,
  };
}
