# Security Specification — ClipsCutter AI Offline Pro Licensing

## 1. Data Invariants

1. **Default-Deny Catch-All**: Every unlisted Firestore path is unconditionally denied (`allow read, write: if false;`).
2. **Verified Bootstrapped Owner Admin**: Only `vibeclip11@gmail.com` with `request.auth != null && request.auth.token.email_verified == true` holds `isOwnerAdmin()` privileges. Unverified email tokens are rejected.
3. **Strict PII Split-Collection Isolation**: Offline buyer names, WhatsApp numbers, and payment notes live exclusively in `/adminBuyerRecords/{voucherId}` and can never be read or listed by non-owner users. `/licenseVouchers/{voucherId}` contains zero PII.
4. **Atomic Creation Invariant**: An `/adminBuyerRecords/{voucherId}` document cannot be created unless `/licenseVouchers/{voucherId}` exists after the batch (`existsAfter`), preventing orphaned buyer records.
5. **No Blanket List Scraping**: Non-admins cannot `list` `/licenseVouchers`. Even the owner's `list` query must match `resource.data.creatorUid == request.auth.uid` (and `resource.data.ownerUid == request.auth.uid` on `/adminBuyerRecords`).
6. **Terminal State Locking**: Once a voucher reaches `'redeemed'` or `'revoked'`, non-admin users cannot update or re-redeem it. Only `isOwnerAdmin()` can revoke or reset status.
7. **Immutable Identity & Temporal Integrity**: `code`, `creatorUid`, `planLabel`, `durationDays`, and `createdAt` cannot be mutated after creation, and `createdAt`/`updatedAt` must equal server `request.time`.

## 2. The "Dirty Dozen" Attack Payloads

1. **Unverified Admin Email Spoof**: `{ auth: { uid: 'attacker1', email: 'vibeclip11@gmail.com', email_verified: false } }` attempting `create` on `/licenseVouchers/CCPRO-30D-AAAA-BBBB` -> `PERMISSION_DENIED`.
2. **Non-Admin Voucher Minting**: `{ auth: { uid: 'buyer1', email: 'buyer@gmail.com', email_verified: true } }` attempting `create` on `/licenseVouchers/CCPRO-30D-AAAA-BBBB` -> `PERMISSION_DENIED`.
3. **Shadow Field Injection on Create**: Admin sending `{ ..., isSuperFree: true }` extra ghost key to `/licenseVouchers/CCPRO-30D-AAAA-BBBB` -> `PERMISSION_DENIED` (`hasOnly` check).
4. **Shadow Field Injection on Buyer Redeem Update**: Buyer updating `/licenseVouchers/CCPRO-30D-AAAA-BBBB` with `{ status: 'redeemed', redeemedByUid: 'buyer1', durationDays: 99999, updatedAt: request.time }` -> `PERMISSION_DENIED` (`affectedKeys().hasOnly` + immutable `durationDays`).
5. **Identity Spoofing (`creatorUid` mismatch)**: Admin creating `/licenseVouchers/CCPRO-30D-AAAA-BBBB` with `creatorUid: 'someone_else'` -> `PERMISSION_DENIED`.
6. **Redeem Identity Spoofing**: Authenticated user `buyer1` redeeming voucher while setting `redeemedByUid: 'victim2'` -> `PERMISSION_DENIED`.
7. **Double-Redeem / Terminal State Bypass**: User `buyer2` attempting to update an already `'redeemed'` or `'revoked'` voucher -> `PERMISSION_DENIED`.
8. **Blanket Voucher Enumeration (`list` attack)**: Authenticated non-admin executing `list` query on `/licenseVouchers` to scrape valid codes -> `PERMISSION_DENIED`.
9. **PII Leak Attack (`get` on `/adminBuyerRecords`)**: Authenticated non-admin executing `get` on `/adminBuyerRecords/CCPRO-30D-AAAA-BBBB` -> `PERMISSION_DENIED`.
10. **Orphaned Buyer PII Write**: Admin creating `/adminBuyerRecords/CCPRO-30D-ORPH-0001` without corresponding `/licenseVouchers/CCPRO-30D-ORPH-0001` -> `PERMISSION_DENIED` (`existsAfter` check).
11. **Resource / ID Poisoning Attack**: Oversized 200-char or special-character path ID `CCPRO-30D-AAAA-BBBB$bad` or `buyerName` > 80 chars -> `PERMISSION_DENIED`.
12. **Client Timestamp Forgery**: Creating or updating a voucher with backdated `createdAt` or `updatedAt != request.time` -> `PERMISSION_DENIED`.
