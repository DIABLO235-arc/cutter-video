import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  isValidVoucherFormat,
  normalizeLicenseCode,
  isLicenseSessionValid,
  OWNER_EMAIL,
} from './src/utils/proLicense';

// Deterministic evaluator mirroring firestore.rules exact boolean gates for the Dirty Dozen TDD suite
interface MockAuth {
  uid: string;
  email?: string;
  email_verified?: boolean;
}

interface VoucherDoc {
  code: string;
  planLabel: string;
  durationDays: number;
  status: string;
  creatorUid: string;
  redeemedByUid: string;
  createdAt: number;
  updatedAt: number;
  [extraKey: string]: unknown;
}

interface BuyerDoc {
  voucherCode: string;
  buyerName: string;
  buyerContact: string;
  paymentNote: string;
  ownerUid: string;
  createdAt: number;
  updatedAt: number;
  [extraKey: string]: unknown;
}

const REQUEST_TIME = 1761900000000;
const VOUCHER_ID_RE = /^CCPRO-[A-Z0-9]{3,5}-[A-Z0-9]{4}-[A-Z0-9]{4}$/;
const UID_RE = /^[a-zA-Z0-9_\-]+$/;

function isValidVoucherId(id: unknown): id is string {
  return typeof id === 'string' && id.length >= 14 && id.length <= 32 && VOUCHER_ID_RE.test(id);
}

function isValidUid(id: unknown): id is string {
  return typeof id === 'string' && id.length >= 1 && id.length <= 128 && UID_RE.test(id);
}

function isVerifiedUser(auth: MockAuth | null): boolean {
  return auth !== null && auth.email_verified === true;
}

function isOwnerAdmin(auth: MockAuth | null): boolean {
  return (
    isVerifiedUser(auth) &&
    typeof auth!.email === 'string' &&
    auth!.email.length <= 128 &&
    auth!.email === OWNER_EMAIL
  );
}

function hasExactKeys(obj: Record<string, unknown>, expected: string[]): boolean {
  const keys = Object.keys(obj);
  return keys.length === expected.length && expected.every((k) => Object.prototype.hasOwnProperty.call(obj, k));
}

function affectedKeysOnly(incoming: Record<string, unknown>, existing: Record<string, unknown>, allowed: string[]): boolean {
  const allKeys = new Set([...Object.keys(incoming), ...Object.keys(existing)]);
  for (const k of allKeys) {
    if (incoming[k] !== existing[k] && !allowed.includes(k)) {
      return false;
    }
  }
  return true;
}

function isValidLicenseVoucher(data: Record<string, unknown>): boolean {
  const req = ['code', 'planLabel', 'durationDays', 'status', 'creatorUid', 'redeemedByUid', 'createdAt', 'updatedAt'];
  if (!hasExactKeys(data, req)) return false;
  if (!isValidVoucherId(data.code)) return false;
  if (typeof data.planLabel !== 'string' || data.planLabel.length < 3 || data.planLabel.length > 40) return false;
  if (!Number.isInteger(data.durationDays) || (data.durationDays as number) < 1 || (data.durationDays as number) > 36500) return false;
  if (typeof data.status !== 'string' || !['active', 'redeemed', 'revoked'].includes(data.status)) return false;
  if (!isValidUid(data.creatorUid)) return false;
  if (typeof data.redeemedByUid !== 'string' || data.redeemedByUid.length > 128) return false;
  if (data.redeemedByUid !== '' && !isValidUid(data.redeemedByUid)) return false;
  if (typeof data.createdAt !== 'number' || typeof data.updatedAt !== 'number') return false;
  return true;
}

function isValidAdminBuyerRecord(data: Record<string, unknown>): boolean {
  const req = ['voucherCode', 'buyerName', 'buyerContact', 'paymentNote', 'ownerUid', 'createdAt', 'updatedAt'];
  if (!hasExactKeys(data, req)) return false;
  if (!isValidVoucherId(data.voucherCode)) return false;
  if (typeof data.buyerName !== 'string' || data.buyerName.length < 1 || data.buyerName.length > 80) return false;
  if (typeof data.buyerContact !== 'string' || data.buyerContact.length > 80) return false;
  if (typeof data.paymentNote !== 'string' || data.paymentNote.length > 160) return false;
  if (!isValidUid(data.ownerUid)) return false;
  if (typeof data.createdAt !== 'number' || typeof data.updatedAt !== 'number') return false;
  return true;
}

function canCreateVoucher(auth: MockAuth | null, voucherId: string, incoming: VoucherDoc): boolean {
  return (
    isOwnerAdmin(auth) &&
    isValidVoucherId(voucherId) &&
    isValidLicenseVoucher(incoming) &&
    incoming.code === voucherId &&
    incoming.creatorUid === auth!.uid &&
    incoming.status === 'active' &&
    incoming.redeemedByUid === '' &&
    incoming.createdAt === REQUEST_TIME &&
    incoming.updatedAt === REQUEST_TIME
  );
}

function canUpdateVoucher(
  auth: MockAuth | null,
  voucherId: string,
  existing: VoucherDoc,
  incoming: VoucherDoc
): boolean {
  if (
    !isVerifiedUser(auth) ||
    !isValidVoucherId(voucherId) ||
    !isValidLicenseVoucher(incoming) ||
    incoming.code !== existing.code ||
    incoming.creatorUid !== existing.creatorUid ||
    incoming.planLabel !== existing.planLabel ||
    incoming.durationDays !== existing.durationDays ||
    incoming.createdAt !== existing.createdAt ||
    incoming.updatedAt !== REQUEST_TIME
  ) {
    return false;
  }

  const buyerRedeem =
    existing.status === 'active' &&
    incoming.status === 'redeemed' &&
    incoming.redeemedByUid === auth!.uid &&
    affectedKeysOnly(incoming, existing, ['status', 'redeemedByUid', 'updatedAt']);

  const adminManage =
    isOwnerAdmin(auth) &&
    existing.creatorUid === auth!.uid &&
    affectedKeysOnly(incoming, existing, ['status', 'redeemedByUid', 'updatedAt']);

  return buyerRedeem || adminManage;
}

function canListVouchers(auth: MockAuth | null, existing: VoucherDoc): boolean {
  return isOwnerAdmin(auth) && existing.creatorUid === auth!.uid;
}

function canGetBuyerRecord(auth: MockAuth | null, voucherId: string, existing: BuyerDoc): boolean {
  return isOwnerAdmin(auth) && isValidVoucherId(voucherId) && existing.ownerUid === auth!.uid;
}

function canCreateBuyerRecord(
  auth: MockAuth | null,
  voucherId: string,
  incoming: BuyerDoc,
  voucherExistsAfter: boolean
): boolean {
  return (
    isOwnerAdmin(auth) &&
    isValidVoucherId(voucherId) &&
    isValidAdminBuyerRecord(incoming) &&
    incoming.voucherCode === voucherId &&
    incoming.ownerUid === auth!.uid &&
    incoming.createdAt === REQUEST_TIME &&
    incoming.updatedAt === REQUEST_TIME &&
    voucherExistsAfter
  );
}

const ownerAuth: MockAuth = { uid: 'owner_uid_1', email: 'vibeclip11@gmail.com', email_verified: true };
const buyerAuth: MockAuth = { uid: 'buyer_uid_1', email: 'pembeli@gmail.com', email_verified: true };

const baseValidVoucher: VoucherDoc = {
  code: 'CCPRO-30D-A1B2-C3D4',
  planLabel: 'Paket 30 Hari (1 Bulan)',
  durationDays: 30,
  status: 'active',
  creatorUid: 'owner_uid_1',
  redeemedByUid: '',
  createdAt: REQUEST_TIME,
  updatedAt: REQUEST_TIME,
};

test('firestore.rules file contains all required security gates and patterns', () => {
  const rulesText = fs.readFileSync('firestore.rules', 'utf8');
  assert.ok(rulesText.includes("rules_version = '2';"));
  assert.ok(rulesText.includes('allow read, write: if false;'));
  assert.ok(rulesText.includes("request.auth.token.email == 'vibeclip11@gmail.com'"));
  assert.ok(rulesText.includes('request.auth.token.email_verified == true'));
  assert.ok(rulesText.includes('existsAfter(/databases/$(database)/documents/licenseVouchers/$(voucherId))'));
});

test('Dirty Dozen 1-12 payloads all return PERMISSION_DENIED (false)', () => {
  // 1. Unverified Admin Email Spoof
  const spoofAuth: MockAuth = { uid: 'attacker1', email: 'vibeclip11@gmail.com', email_verified: false };
  assert.equal(canCreateVoucher(spoofAuth, baseValidVoucher.code, { ...baseValidVoucher, creatorUid: 'attacker1' }), false);

  // 2. Non-Admin Voucher Minting
  assert.equal(canCreateVoucher(buyerAuth, baseValidVoucher.code, { ...baseValidVoucher, creatorUid: buyerAuth.uid }), false);

  // 3. Shadow Field Injection on Create
  assert.equal(
    canCreateVoucher(ownerAuth, baseValidVoucher.code, { ...baseValidVoucher, isSuperFree: true }),
    false
  );

  // 4. Shadow Field / Immutable Mutation on Buyer Redeem Update
  assert.equal(
    canUpdateVoucher(buyerAuth, baseValidVoucher.code, baseValidVoucher, {
      ...baseValidVoucher,
      status: 'redeemed',
      redeemedByUid: buyerAuth.uid,
      durationDays: 99999,
    }),
    false
  );

  // 5. Identity Spoofing (creatorUid mismatch)
  assert.equal(
    canCreateVoucher(ownerAuth, baseValidVoucher.code, { ...baseValidVoucher, creatorUid: 'other_uid' }),
    false
  );

  // 6. Redeem Identity Spoofing (setting redeemedByUid to someone else)
  assert.equal(
    canUpdateVoucher(buyerAuth, baseValidVoucher.code, baseValidVoucher, {
      ...baseValidVoucher,
      status: 'redeemed',
      redeemedByUid: 'victim_uid',
    }),
    false
  );

  // 7. Double-Redeem / Terminal State Bypass
  const alreadyRedeemed: VoucherDoc = { ...baseValidVoucher, status: 'redeemed', redeemedByUid: 'first_buyer' };
  assert.equal(
    canUpdateVoucher(buyerAuth, baseValidVoucher.code, alreadyRedeemed, {
      ...alreadyRedeemed,
      redeemedByUid: buyerAuth.uid,
    }),
    false
  );

  // 8. Blanket Voucher Enumeration (list attack by non-admin)
  assert.equal(canListVouchers(buyerAuth, baseValidVoucher), false);

  // 9. PII Leak Attack (non-admin reading adminBuyerRecords)
  const sampleBuyerPii: BuyerDoc = {
    voucherCode: baseValidVoucher.code,
    buyerName: 'Budi Santoso',
    buyerContact: '08123456789',
    paymentNote: 'Transfer BCA Rp 39.000',
    ownerUid: ownerAuth.uid,
    createdAt: REQUEST_TIME,
    updatedAt: REQUEST_TIME,
  };
  assert.equal(canGetBuyerRecord(buyerAuth, baseValidVoucher.code, sampleBuyerPii), false);

  // 10. Orphaned Buyer PII Write (voucherExistsAfter = false)
  assert.equal(canCreateBuyerRecord(ownerAuth, baseValidVoucher.code, sampleBuyerPii, false), false);

  // 11. Resource / ID Poisoning Attack
  assert.equal(
    canCreateVoucher(ownerAuth, 'CCPRO-BAD$ID!!', { ...baseValidVoucher, code: 'CCPRO-BAD$ID!!' }),
    false
  );

  // 12. Client Timestamp Forgery
  assert.equal(
    canCreateVoucher(ownerAuth, baseValidVoucher.code, { ...baseValidVoucher, createdAt: REQUEST_TIME - 5000 }),
    false
  );
});

test('Authorized Owner creation, Buyer redemption, and Pro session helpers succeed cleanly', () => {
  assert.equal(canCreateVoucher(ownerAuth, baseValidVoucher.code, baseValidVoucher), true);
  assert.equal(
    canUpdateVoucher(buyerAuth, baseValidVoucher.code, baseValidVoucher, {
      ...baseValidVoucher,
      status: 'redeemed',
      redeemedByUid: buyerAuth.uid,
    }),
    true
  );

  assert.equal(isValidVoucherFormat('ccpro-30d-a1b2-c3d4'), true);
  assert.equal(normalizeLicenseCode(' ccpro-30d-a1b2-c3d4 '), 'CCPRO-30D-A1B2-C3D4');

  assert.equal(
    isLicenseSessionValid({
      active: true,
      role: 'owner',
      code: 'VIBECLIP-OWNER-2026',
      planLabel: 'Owner Unlimited Pro',
      activatedAt: new Date().toISOString(),
      expiresAt: null,
    }),
    true
  );
});
