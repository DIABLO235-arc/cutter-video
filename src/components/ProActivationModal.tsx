import React, { useEffect, useState } from 'react';
import {
  Ban,
  Check,
  Copy,
  Eye,
  EyeOff,
  KeyRound,
  Lock,
  LogIn,
  LogOut,
  MessageSquareShare,
  PlusCircle,
  RefreshCw,
  ShieldCheck,
  X,
} from 'lucide-react';
import {
  checkAndRedeemCloudVoucher,
  saveOfflineVoucherToFirestore,
  signInWithGooglePopup,
  signOutFirebase,
  subscribeOwnerVouchers,
  updateVoucherStatusInFirestore,
  type CloudVoucherItem,
  type User,
} from '../firebase';
import {
  OFFLINE_PRO_PLANS,
  OWNER_EMAIL,
  normalizeLicenseCode,
  type OfflinePlanOption,
  type ProLicenseSession,
} from '../utils/proLicense';
import { DiamondProIcon } from './QualityDropdown';

interface ProActivationModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: 'activate' | 'owner';
  proSession: ProLicenseSession | null;
  onActivateSession: (session: ProLicenseSession) => void;
  onDeactivateSession: () => void;
  firebaseUser: User | null;
}

interface CombinedVoucherDisplay {
  code: string;
  planLabel: string;
  durationDays: number;
  status: 'active' | 'redeemed' | 'revoked';
  buyerName: string;
  buyerContact: string;
  paymentNote: string;
}

export const ProActivationModal: React.FC<ProActivationModalProps> = ({
  isOpen,
  onClose,
  initialTab = 'activate',
  proSession,
  onActivateSession,
  onDeactivateSession,
  firebaseUser,
}) => {
  const [activeTab, setActiveTab] = useState<'activate' | 'owner'>(initialTab);
  const [codeInput, setCodeInput] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [activateError, setActivateError] = useState<string | null>(null);
  const [activateSuccess, setActivateSuccess] = useState<string | null>(null);

  // Owner Admin state
  const isGoogleOwner = Boolean(
    firebaseUser &&
      firebaseUser.emailVerified &&
      firebaseUser.email?.toLowerCase() === OWNER_EMAIL.toLowerCase()
  );
  const isOwnerUnlocked = Boolean(proSession?.active && proSession.role === 'owner') || isGoogleOwner;

  const [ownerMasterCodeDisplay, setOwnerMasterCodeDisplay] = useState<string>('VIBECLIP-OWNER-2026');
  const [showMasterCode, setShowMasterCode] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // Offline Buyer Code Generator Form
  const [buyerName, setBuyerName] = useState('');
  const [buyerContact, setBuyerContact] = useState('');
  const [selectedTier, setSelectedTier] = useState<OfflinePlanOption['tierCode']>('30D');
  const [paymentNote, setPaymentNote] = useState('Transfer / Pembelian Offline');
  const [generating, setGenerating] = useState(false);
  const [ownerError, setOwnerError] = useState<string | null>(null);

  // Synced list of generated codes (Cloud Firestore + Server session)
  const [cloudVouchers, setCloudVouchers] = useState<CloudVoucherItem[]>([]);
  const [localServerVouchers, setLocalServerVouchers] = useState<CombinedVoucherDisplay[]>([]);

  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
      setActivateError(null);
      setActivateSuccess(null);
      setOwnerError(null);
    }
  }, [isOpen, initialTab]);

  // Subscribe to Firestore vouchers when signed in with Google as Owner (vibeclip11@gmail.com)
  useEffect(() => {
    if (!isOpen || !isGoogleOwner || !firebaseUser) {
      setCloudVouchers([]);
      return;
    }
    const unsub = subscribeOwnerVouchers(firebaseUser.uid, (items) => {
      setCloudVouchers(items);
    });
    return () => unsub();
  }, [isOpen, isGoogleOwner, firebaseUser]);

  // Fetch Owner Master Code & server records when Owner panel is unlocked
  useEffect(() => {
    if (!isOpen || !isOwnerUnlocked) return;

    let cancelled = false;
    (async () => {
      try {
        const idToken = isGoogleOwner && firebaseUser ? await firebaseUser.getIdToken() : undefined;
        const ownerMasterCode =
          proSession?.role === 'owner' ? proSession.code : undefined;

        const res = await fetch('/api/pro/owner-codes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ownerMasterCode, firebaseIdToken: idToken }),
        });
        if (!res.ok || cancelled) return;
        const data = await res.json();
        if (data.ownerMasterCode) {
          setOwnerMasterCodeDisplay(data.ownerMasterCode);
        }
        if (Array.isArray(data.records)) {
          setLocalServerVouchers(data.records);
        }

        // Also auto-activate Pro session for verified Google Owner if not active yet
        if (isGoogleOwner && !proSession?.active && data.ownerMasterCode) {
          onActivateSession({
            active: true,
            role: 'owner',
            code: data.ownerMasterCode,
            planLabel: 'Owner Master Pro (Khusus Pemilik)',
            activatedAt: new Date().toISOString(),
            expiresAt: null,
          });
        }
      } catch {
        // Ignore transient fetch errors
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isOpen, isOwnerUnlocked, isGoogleOwner, firebaseUser, proSession, onActivateSession]);

  if (!isOpen) return null;

  // Merge cloud Firestore vouchers & current server session vouchers without duplicates
  const mergedVouchersMap = new Map<string, CombinedVoucherDisplay>();
  for (const cv of cloudVouchers) {
    mergedVouchersMap.set(cv.code, {
      code: cv.code,
      planLabel: cv.planLabel,
      durationDays: cv.durationDays,
      status: cv.status,
      buyerName: cv.buyerName || 'Pembeli Offline',
      buyerContact: cv.buyerContact || '',
      paymentNote: cv.paymentNote || '',
    });
  }
  for (const lv of localServerVouchers) {
    if (!mergedVouchersMap.has(lv.code)) {
      mergedVouchersMap.set(lv.code, lv);
    }
  }
  const allVouchers = Array.from(mergedVouchersMap.values());

  const handleActivateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setActivateError(null);
    setActivateSuccess(null);

    const normalized = normalizeLicenseCode(codeInput);
    if (!normalized) {
      setActivateError('Silakan masukkan Kode Khusus Owner atau Kode Pembeli Offline Anda.');
      return;
    }

    setVerifying(true);
    try {
      const res = await fetch('/api/pro/verify-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: normalized }),
      });
      const data = await res.json();
      if (!res.ok || !data.valid) {
        setActivateError(data.error || 'Kode aktivasi tidak valid.');
        return;
      }

      // If buyer is signed in with Google, also verify & lock voucher in Cloud Firestore
      if (data.role === 'buyer' && firebaseUser?.emailVerified) {
        const cloudCheck = await checkAndRedeemCloudVoucher(data.code);
        if (!cloudCheck.allowed) {
          setActivateError(cloudCheck.reason || 'Kode lisensi tidak dapat digunakan.');
          return;
        }
      }

      const newSession: ProLicenseSession = {
        active: true,
        role: data.role,
        code: data.code,
        planLabel: data.planLabel,
        activatedAt: new Date().toISOString(),
        expiresAt: data.expiresAt || null,
      };
      onActivateSession(newSession);
      setCodeInput('');
      setActivateSuccess(
        data.role === 'owner'
          ? 'Kode Khusus Owner berhasil diaktifkan! Seluruh fitur Pro 4K & Panel Generator Kode Offline telah terbuka.'
          : `Kode Pro berhasil diaktifkan (${data.planLabel})! Resolusi 4K/1080p60 & AI Auto-Cut telah terbuka.`
      );
    } catch {
      setActivateError('Gagal menghubungi server verifikasi lisensi. Coba lagi sesaat.');
    } finally {
      setVerifying(false);
    }
  };

  const handleGenerateBuyerCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setOwnerError(null);

    if (!buyerName.trim()) {
      setOwnerError('Masukkan nama pembeli offline terlebih dahulu.');
      return;
    }

    setGenerating(true);
    try {
      const idToken = isGoogleOwner && firebaseUser ? await firebaseUser.getIdToken() : undefined;
      const ownerMasterCode =
        proSession?.role === 'owner' ? proSession.code : ownerMasterCodeDisplay;

      const res = await fetch('/api/pro/generate-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ownerMasterCode,
          firebaseIdToken: idToken,
          tierCode: selectedTier,
          buyerName: buyerName.trim(),
          buyerContact: buyerContact.trim(),
          paymentNote: paymentNote.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.record) {
        throw new Error(data.error || 'Gagal membuat kode pembeli offline.');
      }

      const rec = data.record as CombinedVoucherDisplay;
      setLocalServerVouchers((prev) => [rec, ...prev]);

      // Persist to Cloud Firestore when Owner is signed in with Google (vibeclip11@gmail.com)
      if (isGoogleOwner) {
        await saveOfflineVoucherToFirestore({
          code: rec.code,
          planLabel: rec.planLabel,
          durationDays: rec.durationDays,
          buyerName: rec.buyerName,
          buyerContact: rec.buyerContact,
          paymentNote: rec.paymentNote,
        });
      }

      setBuyerName('');
      setBuyerContact('');
    } catch (err: unknown) {
      setOwnerError(err instanceof Error ? err.message : 'Gagal membuat kode lisensi.');
    } finally {
      setGenerating(false);
    }
  };

  const handleToggleRevoke = async (voucher: CombinedVoucherDisplay) => {
    const nextStatus = voucher.status === 'revoked' ? 'active' : 'revoked';
    try {
      const idToken = isGoogleOwner && firebaseUser ? await firebaseUser.getIdToken() : undefined;
      const ownerMasterCode =
        proSession?.role === 'owner' ? proSession.code : ownerMasterCodeDisplay;

      await fetch('/api/pro/revoke-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ownerMasterCode,
          firebaseIdToken: idToken,
          code: voucher.code,
          status: nextStatus,
        }),
      });

      setLocalServerVouchers((prev) =>
        prev.map((item) => (item.code === voucher.code ? { ...item, status: nextStatus } : item))
      );

      if (isGoogleOwner) {
        await updateVoucherStatusInFirestore(voucher.code, nextStatus);
      }
    } catch (err: unknown) {
      setOwnerError(err instanceof Error ? err.message : 'Gagal memperbarui status kode.');
    }
  };

  const handleCopyText = async (key: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // Fallback ignored in headless environments
    }
    setCopiedCode(key);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const handleGoogleOwnerLogin = async () => {
    setOwnerError(null);
    try {
      const user = await signInWithGooglePopup();
      if (user.email?.toLowerCase() !== OWNER_EMAIL.toLowerCase()) {
        setOwnerError(
          `Akun ${user.email} bukan email pemilik (${OWNER_EMAIL}). Gunakan Kode Khusus Owner atau akun pemilik.`
        );
      }
    } catch (err: unknown) {
      setOwnerError(
        err instanceof Error ? err.message : 'Login Google dibatalkan atau gagal.'
      );
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="pro-license-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 overflow-y-auto"
    >
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xl w-full max-w-2xl overflow-hidden my-auto">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <DiamondProIcon unlocked={Boolean(proSession?.active)} className="w-6 h-6 shrink-0" />
            <div>
              <h3 id="pro-license-modal-title" className="text-lg font-bold text-slate-900">
                Aktivasi Fitur Pro &amp; Lisensi Offline
              </h3>
              <p className="text-xs text-slate-500">
                Masukkan Kode Khusus Owner atau Kode Pembeli Resmi untuk membuka kualitas 4K/60fps
              </p>
            </div>
          </div>

          <button
            type="button"
            aria-label="Close Pro license modal"
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs inside Modal */}
        <div className="px-6 pt-3 border-b border-slate-100 flex items-center gap-2 bg-slate-50/60">
          <button
            type="button"
            onClick={() => setActiveTab('activate')}
            className={`px-4 py-2.5 rounded-t-xl text-xs sm:text-sm font-semibold inline-flex items-center gap-1.5 cursor-pointer transition-colors ${
              activeTab === 'activate'
                ? 'bg-white text-[#4F6EF7] border-t border-l border-r border-slate-200 -mb-px'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <KeyRound className="w-4 h-4" />
            <span>Masukkan Kode Pro</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('owner')}
            className={`px-4 py-2.5 rounded-t-xl text-xs sm:text-sm font-semibold inline-flex items-center gap-1.5 cursor-pointer transition-colors ${
              activeTab === 'owner'
                ? 'bg-white text-[#4F6EF7] border-t border-l border-r border-slate-200 -mb-px'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            <span>Panel Khusus Owner (Buat Kode Offline)</span>
          </button>
        </div>

        {/* TAB 1: REDEEM / ACTIVATE PRO CODE */}
        {activeTab === 'activate' && (
          <div className="p-6 space-y-5">
            {proSession?.active ? (
              <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50/70 flex flex-wrap items-center justify-between gap-4">
                <div className="space-y-1">
                  <p className="text-xs font-bold text-emerald-800 flex items-center gap-1.5">
                    <Check className="w-4 h-4 text-emerald-600" />
                    <span>
                      Status Pro Aktif —{' '}
                      {proSession.role === 'owner' ? 'Mode Pemilik (Owner)' : 'Pembeli Resmi'}
                    </span>
                  </p>
                  <p className="text-xs text-slate-700 font-tabular">
                    Paket: <strong>{proSession.planLabel}</strong> · Kode: {proSession.code}
                  </p>
                  <p className="text-[11px] text-slate-500">
                    {proSession.expiresAt
                      ? `Berlaku hingga ${new Date(proSession.expiresAt).toLocaleDateString('id-ID', {
                          day: 'numeric',
                          month: 'long',
                          year: 'numeric',
                        })}`
                      : 'Masa aktif: Selamanya (Unlimited)'}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  {proSession.role === 'owner' && (
                    <button
                      type="button"
                      onClick={() => setActiveTab('owner')}
                      className="px-3.5 py-2 rounded-lg bg-[#4F6EF7] text-white text-xs font-semibold cursor-pointer"
                    >
                      Buka Generator Kode
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={onDeactivateSession}
                    className="px-3.5 py-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 cursor-pointer"
                  >
                    Kunci / Keluar Pro
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-[#F7F8FA] text-xs text-slate-600 leading-relaxed">
                Fitur <strong className="text-slate-900">Pro 4K60, Durasi 1 Jam &amp; Unlimited AI Auto-Cut</strong> tidak dibuka secara bebas. Masukkan{' '}
                <strong className="text-slate-900">Kode Khusus Pemilik</strong> atau{' '}
                <strong className="text-slate-900">Kode Pembelian Offline</strong> yang Anda dapatkan langsung dari pemilik (<strong>{OWNER_EMAIL}</strong>).
              </div>
            )}

            <form onSubmit={handleActivateSubmit} noValidate className="space-y-3.5">
              <div>
                <label
                  htmlFor="pro-activation-code-input"
                  className="block text-xs font-semibold text-slate-700 mb-1.5"
                >
                  Kode Aktivasi Pro
                </label>
                <div className="flex flex-col sm:flex-row gap-2.5">
                  <input
                    id="pro-activation-code-input"
                    type="text"
                    value={codeInput}
                    onChange={(e) => {
                      setCodeInput(e.target.value.toUpperCase());
                      if (activateError) setActivateError(null);
                    }}
                    placeholder="Contoh: CCPRO-30D-XXXX-XXXX"
                    className="flex-1 h-12 px-4 rounded-xl border border-slate-200 font-tabular text-sm uppercase tracking-wider text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#4F6EF7]"
                  />
                  <button
                    type="submit"
                    disabled={verifying}
                    className="h-12 px-6 rounded-xl bg-[#4F6EF7] hover:bg-[#3D5CE5] disabled:opacity-60 text-white text-sm font-semibold cursor-pointer whitespace-nowrap"
                  >
                    {verifying ? 'Memverifikasi...' : 'Aktifkan Kode Pro'}
                  </button>
                </div>
              </div>

              {activateError && (
                <p role="alert" className="text-xs font-medium text-red-600">
                  {activateError}
                </p>
              )}

              {activateSuccess && (
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs font-medium text-emerald-800 flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{activateSuccess}</span>
                </div>
              )}
            </form>

            {/* Offline Purchase Instructions for Buyers */}
            <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500">
              <span>
                Belum punya kode Pro? Beli lisensi offline langsung melalui pemilik:{' '}
                <strong className="text-slate-800">{OWNER_EMAIL}</strong>
              </span>
              <a
                href={`mailto:${OWNER_EMAIL}?subject=${encodeURIComponent('Pembelian Kode Lisensi Pro Offline ClipsCutter')}`}
                className="font-semibold text-[#4F6EF7] hover:underline whitespace-nowrap"
              >
                Hubungi Pemilik →
              </a>
            </div>
          </div>
        )}

        {/* TAB 2: OWNER EXCLUSIVE OFFLINE CODE GENERATOR */}
        {activeTab === 'owner' && (
          <div className="p-6 space-y-5">
            {!isOwnerUnlocked ? (
              <div className="py-8 px-4 text-center rounded-2xl border border-slate-200 bg-[#F7F8FA] space-y-4">
                <div className="w-11 h-11 rounded-full bg-slate-200/80 text-slate-700 flex items-center justify-center mx-auto">
                  <Lock className="w-5 h-5" />
                </div>
                <div className="max-w-md mx-auto space-y-1.5">
                  <h4 className="text-base font-bold text-slate-900">
                    Area Terkunci Khusus Pemilik (Owner)
                  </h4>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Hanya pemilik aplikasi (<strong>{OWNER_EMAIL}</strong>) atau pemegang{' '}
                    <strong>Kode Khusus Owner</strong> yang dapat membuat dan mengelola kode aktivasi untuk pembeli offline.
                  </p>
                </div>

                {ownerError && (
                  <p role="alert" className="text-xs font-medium text-red-600 max-w-md mx-auto">
                    {ownerError}
                  </p>
                )}

                <div className="flex flex-wrap items-center justify-center gap-3 pt-1">
                  <button
                    type="button"
                    onClick={handleGoogleOwnerLogin}
                    className="px-4 py-2.5 rounded-xl bg-[#4F6EF7] hover:bg-[#3D5CE5] text-white text-xs font-semibold inline-flex items-center gap-2 cursor-pointer"
                  >
                    <LogIn className="w-4 h-4" />
                    <span>Login Google Owner ({OWNER_EMAIL})</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveTab('activate')}
                    className="px-4 py-2.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold cursor-pointer"
                  >
                    Masukkan Kode Khusus Owner
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-5">
                {/* 1. Owner Master Code Card + Cloud Sync Status */}
                <div className="p-4 rounded-xl bg-slate-900 text-white flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-[11px] text-slate-400">
                      Kode Khusus Pribadi Anda (Owner Master Code)
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="font-tabular text-sm sm:text-base font-bold tracking-wider text-[#93ACFF]">
                        {showMasterCode ? ownerMasterCodeDisplay : '••••••••-•••••-••••'}
                      </span>
                      <button
                        type="button"
                        aria-label={showMasterCode ? 'Hide owner code' : 'Show owner code'}
                        onClick={() => setShowMasterCode((v) => !v)}
                        className="p-1 text-slate-400 hover:text-white cursor-pointer"
                      >
                        {showMasterCode ? (
                          <EyeOff className="w-4 h-4" />
                        ) : (
                          <Eye className="w-4 h-4" />
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleCopyText('master', ownerMasterCodeDisplay)}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-white/10 hover:bg-white/20 text-[11px] font-medium cursor-pointer"
                      >
                        {copiedCode === 'master' ? (
                          <Check className="w-3 h-3 text-emerald-400" />
                        ) : (
                          <Copy className="w-3 h-3" />
                        )}
                        <span>{copiedCode === 'master' ? 'Tersalin' : 'Salin'}</span>
                      </button>
                    </div>
                  </div>

                  <div>
                    {isGoogleOwner ? (
                      <div className="flex items-center gap-2 text-xs">
                        <span className="text-emerald-400 font-medium">
                          Cloud Sync Aktif ({firebaseUser?.email})
                        </span>
                        <button
                          type="button"
                          onClick={() => signOutFirebase()}
                          aria-label="Sign out Google"
                          className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-slate-200 cursor-pointer"
                        >
                          <LogOut className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={handleGoogleOwnerLogin}
                        className="px-3 py-1.5 rounded-lg bg-[#4F6EF7] hover:bg-[#3D5CE5] text-white text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer"
                      >
                        <LogIn className="w-3.5 h-3.5" />
                        <span>Sinkronkan ke Cloud ({OWNER_EMAIL})</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* 2. Form Generator Kode Pembeli Offline */}
                <form
                  onSubmit={handleGenerateBuyerCode}
                  noValidate
                  className="p-4 rounded-xl border border-slate-200 bg-[#F7F8FA] space-y-3.5"
                >
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-slate-900">
                      Buat Kode Baru untuk Pembeli Offline
                    </h4>
                    <span className="text-[11px] text-slate-500">
                      Tanda tangan kriptografi anti-palsu
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label
                        htmlFor="offline-buyer-name"
                        className="block text-[11px] font-semibold text-slate-700 mb-1"
                      >
                        Nama Pembeli *
                      </label>
                      <input
                        id="offline-buyer-name"
                        type="text"
                        maxLength={80}
                        value={buyerName}
                        onChange={(e) => {
                          setBuyerName(e.target.value);
                          if (ownerError) setOwnerError(null);
                        }}
                        placeholder="Misal: Budi Santoso"
                        className="w-full h-10 px-3 rounded-lg bg-white border border-slate-200 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#4F6EF7]"
                      />
                    </div>

                    <div>
                      <label
                        htmlFor="offline-buyer-contact"
                        className="block text-[11px] font-semibold text-slate-700 mb-1"
                      >
                        WhatsApp / Kontak Pembeli
                      </label>
                      <input
                        id="offline-buyer-contact"
                        type="text"
                        maxLength={80}
                        value={buyerContact}
                        onChange={(e) => setBuyerContact(e.target.value)}
                        placeholder="Misal: 0812-xxxx-xxxx"
                        className="w-full h-10 px-3 rounded-lg bg-white border border-slate-200 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#4F6EF7]"
                      />
                    </div>

                    <div>
                      <label
                        htmlFor="offline-plan-tier"
                        className="block text-[11px] font-semibold text-slate-700 mb-1"
                      >
                        Paket Durasi Pro
                      </label>
                      <select
                        id="offline-plan-tier"
                        value={selectedTier}
                        onChange={(e) =>
                          setSelectedTier(e.target.value as OfflinePlanOption['tierCode'])
                        }
                        className="w-full h-10 px-3 rounded-lg bg-white border border-slate-200 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#4F6EF7]"
                      >
                        {OFFLINE_PRO_PLANS.map((plan) => (
                          <option key={plan.tierCode} value={plan.tierCode}>
                            {plan.label} ({plan.suggestedPriceIdr})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label
                        htmlFor="offline-payment-note"
                        className="block text-[11px] font-semibold text-slate-700 mb-1"
                      >
                        Catatan Pembayaran Offline
                      </label>
                      <input
                        id="offline-payment-note"
                        type="text"
                        maxLength={160}
                        value={paymentNote}
                        onChange={(e) => setPaymentNote(e.target.value)}
                        placeholder="Transfer BCA / Tunai COD"
                        className="w-full h-10 px-3 rounded-lg bg-white border border-slate-200 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#4F6EF7]"
                      />
                    </div>
                  </div>

                  {ownerError && (
                    <p role="alert" className="text-xs font-medium text-red-600">
                      {ownerError}
                    </p>
                  )}

                  <button
                    type="submit"
                    disabled={generating}
                    className="w-full h-10 rounded-xl bg-[#4F6EF7] hover:bg-[#3D5CE5] disabled:opacity-60 text-white text-xs font-semibold inline-flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <PlusCircle className="w-4 h-4" />
                    <span>
                      {generating ? 'Membuat Kode...' : 'Buat Kode Pembeli Offline'}
                    </span>
                  </button>
                </form>

                {/* 3. Daftar Kode Pembeli Offline yang Telah Dibuat */}
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800">
                      Riwayat Kode Pembeli Offline ({allVouchers.length})
                    </span>
                    <span className="text-[11px] text-slate-500">
                      Kirimkan kode ke pembeli setelah pembayaran diterima
                    </span>
                  </div>

                  {allVouchers.length === 0 ? (
                    <div className="py-6 px-4 text-center rounded-xl border border-slate-200 text-xs text-slate-500">
                      Belum ada kode pembeli offline yang dibuat. Isi nama pembeli di atas lalu klik{' '}
                      <strong>Buat Kode Pembeli Offline</strong>.
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                      {allVouchers.map((v) => {
                        const waTemplate = `Halo Kak ${v.buyerName}, terima kasih telah membeli ClipsCutter Pro (${v.planLabel}).\n\nKode Aktivasi Pro Anda:\n${v.code}\n\nCara pakai: Buka web ClipsCutter -> klik tombol Pro / Masukkan Kode Pro -> tempel kode di atas.`;
                        return (
                          <div
                            key={v.code}
                            className="p-3.5 rounded-xl border border-slate-200 bg-white flex flex-wrap items-center justify-between gap-3"
                          >
                            <div className="min-w-0 space-y-0.5">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-tabular text-sm font-bold text-slate-900">
                                  {v.code}
                                </span>
                                <span
                                  className={`text-[11px] font-semibold ${
                                    v.status === 'revoked'
                                      ? 'text-red-600'
                                      : v.status === 'redeemed'
                                      ? 'text-[#4F6EF7]'
                                      : 'text-emerald-700'
                                  }`}
                                >
                                  ·{' '}
                                  {v.status === 'revoked'
                                    ? 'Dicabut'
                                    : v.status === 'redeemed'
                                    ? 'Sudah Dipakai'
                                    : 'Aktif'}
                                </span>
                              </div>
                              <p className="text-xs text-slate-600 truncate">
                                Pembeli: <strong>{v.buyerName}</strong>
                                {v.buyerContact ? ` (${v.buyerContact})` : ''} · {v.planLabel}
                              </p>
                            </div>

                            <div className="flex items-center gap-1.5 shrink-0">
                              <button
                                type="button"
                                onClick={() => handleCopyText(v.code, v.code)}
                                className="px-2.5 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-xs font-medium text-slate-700 inline-flex items-center gap-1 cursor-pointer"
                              >
                                {copiedCode === v.code ? (
                                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                                ) : (
                                  <Copy className="w-3.5 h-3.5" />
                                )}
                                <span>{copiedCode === v.code ? 'Disalin' : 'Kode'}</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => handleCopyText(`wa-${v.code}`, waTemplate)}
                                className="px-2.5 py-1.5 rounded-lg bg-[#4F6EF7]/10 hover:bg-[#4F6EF7]/20 text-xs font-semibold text-[#4F6EF7] inline-flex items-center gap-1 cursor-pointer"
                              >
                                {copiedCode === `wa-${v.code}` ? (
                                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                                ) : (
                                  <MessageSquareShare className="w-3.5 h-3.5" />
                                )}
                                <span>{copiedCode === `wa-${v.code}` ? 'Pesan WA Disalin' : 'Pesan WA'}</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => handleToggleRevoke(v)}
                                aria-label={
                                  v.status === 'revoked'
                                    ? `Aktifkan kembali kode ${v.code}`
                                    : `Cabut kode ${v.code}`
                                }
                                className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold inline-flex items-center gap-1 cursor-pointer ${
                                  v.status === 'revoked'
                                    ? 'border border-emerald-200 text-emerald-700 hover:bg-emerald-50'
                                    : 'border border-red-200 text-red-600 hover:bg-red-50'
                                }`}
                              >
                                {v.status === 'revoked' ? (
                                  <>
                                    <RefreshCw className="w-3 h-3" />
                                    <span>Aktifkan</span>
                                  </>
                                ) : (
                                  <>
                                    <Ban className="w-3 h-3" />
                                    <span>Cabut</span>
                                  </>
                                )}
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
