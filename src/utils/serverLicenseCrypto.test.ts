import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getOwnerMasterCode,
  mintSignedOfflineVoucher,
  verifyLicenseCodeCryptographically,
} from './serverLicenseCrypto';

test('Owner Master Code activates owner role with unlimited expiry', () => {
  const ownerCode = getOwnerMasterCode();
  const res = verifyLicenseCodeCryptographically(ownerCode.toLowerCase());
  assert.equal(res.valid, true);
  if (res.valid) {
    assert.equal(res.role, 'owner');
    assert.equal(res.expiresAt, null);
  }
});

test('Minted offline buyer voucher passes HMAC verification and calculates expiry', () => {
  const { code, plan } = mintSignedOfflineVoucher('30D', 'AB23');
  assert.match(code, /^CCPRO-30D-AB23-[A-Z0-9]{4}$/);
  assert.equal(plan.durationDays, 30);

  const verified = verifyLicenseCodeCryptographically(code);
  assert.equal(verified.valid, true);
  if (verified.valid && verified.role === 'buyer') {
    assert.equal(verified.durationDays, 30);
    assert.ok(verified.expiresAt !== null);
  }
});

test('Tampered or forged buyer code is rejected by HMAC timingSafeEqual', () => {
  const { code } = mintSignedOfflineVoucher('90D', 'XY89');
  const forged = code.slice(0, -1) + (code.endsWith('A') ? 'B' : 'A');
  const verified = verifyLicenseCodeCryptographically(forged);
  assert.equal(verified.valid, false);
});

test('Revoked buyer code is rejected immediately', () => {
  const { code } = mintSignedOfflineVoucher('7D', 'KL45');
  const revokedSet = new Set([code]);
  const verified = verifyLicenseCodeCryptographically(code, revokedSet);
  assert.equal(verified.valid, false);
});
