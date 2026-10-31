import { initializeApp } from 'firebase/app';
import {
  GoogleAuthProvider,
  getAuth,
  onAuthStateChanged,
  signInWithPopup,
  signOut,
  type User,
} from 'firebase/auth';
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocFromServer,
  getFirestore,
  onSnapshot,
  query,
  serverTimestamp,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Validate connection to Firestore on boot per firebase-integration-rpc guidelines
async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error('Please check your Firebase configuration.');
    }
  }
}
testConnection();

export interface CloudVoucherItem {
  code: string;
  planLabel: string;
  durationDays: number;
  status: 'active' | 'redeemed' | 'revoked';
  creatorUid: string;
  redeemedByUid: string;
  buyerName?: string;
  buyerContact?: string;
  paymentNote?: string;
}

export async function signInWithGooglePopup(): Promise<User> {
  const cred = await signInWithPopup(auth, googleProvider);
  return cred.user;
}

export async function signOutFirebase(): Promise<void> {
  await signOut(auth);
}

export { onAuthStateChanged, type User };

/**
 * Atomically writes both the public-redeemable LicenseVoucher (zero PII)
 * and the isolated AdminBuyerRecord (PII restricted to owner) in a single batch.
 */
export async function saveOfflineVoucherToFirestore(params: {
  code: string;
  planLabel: string;
  durationDays: number;
  buyerName: string;
  buyerContact: string;
  paymentNote: string;
}): Promise<void> {
  const currentUser = auth.currentUser;
  if (!currentUser) return;

  const cleanCode = params.code.trim().toUpperCase().slice(0, 32);
  const cleanPlan = params.planLabel.trim().slice(0, 40);
  const cleanBuyerName = (params.buyerName.trim() || 'Pembeli Offline').slice(0, 80);
  const cleanContact = params.buyerContact.trim().slice(0, 80);
  const cleanNote = params.paymentNote.trim().slice(0, 160);
  const safeDays = Math.max(1, Math.min(36500, Math.floor(params.durationDays)));

  const voucherPath = `licenseVouchers/${cleanCode}`;
  const buyerPath = `adminBuyerRecords/${cleanCode}`;

  try {
    const batch = writeBatch(db);
    batch.set(doc(db, 'licenseVouchers', cleanCode), {
      code: cleanCode,
      planLabel: cleanPlan,
      durationDays: safeDays,
      status: 'active',
      creatorUid: currentUser.uid,
      redeemedByUid: '',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    batch.set(doc(db, 'adminBuyerRecords', cleanCode), {
      voucherCode: cleanCode,
      buyerName: cleanBuyerName,
      buyerContact: cleanContact,
      paymentNote: cleanNote,
      ownerUid: currentUser.uid,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `${voucherPath} & ${buyerPath}`);
  }
}

export async function updateVoucherStatusInFirestore(
  code: string,
  nextStatus: 'active' | 'redeemed' | 'revoked'
): Promise<void> {
  if (!auth.currentUser) return;
  const cleanCode = code.trim().toUpperCase();
  const path = `licenseVouchers/${cleanCode}`;
  try {
    await updateDoc(doc(db, 'licenseVouchers', cleanCode), {
      status: nextStatus,
      redeemedByUid: nextStatus === 'redeemed' ? auth.currentUser.uid : '',
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function deleteOfflineVoucherFromFirestore(code: string): Promise<void> {
  if (!auth.currentUser) return;
  const cleanCode = code.trim().toUpperCase();
  try {
    await deleteDoc(doc(db, 'adminBuyerRecords', cleanCode));
    await deleteDoc(doc(db, 'licenseVouchers', cleanCode));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `licenseVouchers/${cleanCode}`);
  }
}

/**
 * Checks & redeems a voucher in Firestore when an authenticated user activates it.
 */
export async function checkAndRedeemCloudVoucher(
  code: string
): Promise<{ allowed: boolean; reason?: string }> {
  const user = auth.currentUser;
  if (!user || !user.emailVerified) {
    return { allowed: true };
  }

  const cleanCode = code.trim().toUpperCase();
  const path = `licenseVouchers/${cleanCode}`;
  try {
    const snap = await getDoc(doc(db, 'licenseVouchers', cleanCode));
    if (!snap.exists()) {
      // Voucher may have been generated via Owner Master Code without cloud login
      return { allowed: true };
    }
    const data = snap.data();
    if (data.status === 'revoked') {
      return { allowed: false, reason: 'Kode lisensi ini telah dicabut oleh pemilik.' };
    }
    if (data.status === 'redeemed' && data.redeemedByUid && data.redeemedByUid !== user.uid) {
      return {
        allowed: false,
        reason: 'Kode lisensi ini sudah diklaim oleh akun pembeli lain.',
      };
    }
    if (data.status === 'active') {
      await updateDoc(doc(db, 'licenseVouchers', cleanCode), {
        status: 'redeemed',
        redeemedByUid: user.uid,
        updatedAt: serverTimestamp(),
      });
    }
    return { allowed: true };
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
  }
}

/**
 * Subscribes to owner's vouchers + private buyer records in Firestore when signed in as owner.
 */
export function subscribeOwnerVouchers(
  ownerUid: string,
  onData: (items: CloudVoucherItem[]) => void
): () => void {
  const vouchersQuery = query(
    collection(db, 'licenseVouchers'),
    where('creatorUid', '==', ownerUid)
  );
  const buyersQuery = query(
    collection(db, 'adminBuyerRecords'),
    where('ownerUid', '==', ownerUid)
  );

  let vouchersMap = new Map<string, CloudVoucherItem>();
  let buyersMap = new Map<
    string,
    { buyerName: string; buyerContact: string; paymentNote: string }
  >();

  const emitMerged = () => {
    const merged: CloudVoucherItem[] = [];
    for (const [code, v] of vouchersMap.entries()) {
      const b = buyersMap.get(code);
      merged.push({
        ...v,
        buyerName: b?.buyerName,
        buyerContact: b?.buyerContact,
        paymentNote: b?.paymentNote,
      });
    }
    onData(merged);
  };

  const unsubVouchers = onSnapshot(
    vouchersQuery,
    (snap) => {
      const next = new Map<string, CloudVoucherItem>();
      snap.forEach((d) => {
        const raw = d.data();
        next.set(d.id, {
          code: String(raw.code || d.id),
          planLabel: String(raw.planLabel || ''),
          durationDays: Number(raw.durationDays || 30),
          status: (raw.status as CloudVoucherItem['status']) || 'active',
          creatorUid: String(raw.creatorUid || ''),
          redeemedByUid: String(raw.redeemedByUid || ''),
        });
      });
      vouchersMap = next;
      emitMerged();
    },
    (err) => handleFirestoreError(err, OperationType.LIST, 'licenseVouchers')
  );

  const unsubBuyers = onSnapshot(
    buyersQuery,
    (snap) => {
      const next = new Map<
        string,
        { buyerName: string; buyerContact: string; paymentNote: string }
      >();
      snap.forEach((d) => {
        const raw = d.data();
        next.set(d.id, {
          buyerName: String(raw.buyerName || ''),
          buyerContact: String(raw.buyerContact || ''),
          paymentNote: String(raw.paymentNote || ''),
        });
      });
      buyersMap = next;
      emitMerged();
    },
    (err) => handleFirestoreError(err, OperationType.LIST, 'adminBuyerRecords')
  );

  return () => {
    unsubVouchers();
    unsubBuyers();
  };
}
