import React, { useState } from 'react';
import { KeyRound, Menu, User, X } from 'lucide-react';
import type { AppPage } from '../types';

interface NavbarProps {
  activePage: AppPage;
  onNavigate: (page: AppPage) => void;
  clipsCount: number;
  isPro: boolean;
  proRole?: 'owner' | 'buyer' | null;
  language: 'en' | 'id';
  onToggleLanguage: () => void;
  onOpenProModal: (tab?: 'activate' | 'owner') => void;
  onOpenSocialHub: () => void;
  onExploreAiAutoCut: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activePage,
  onNavigate,
  clipsCount,
  isPro,
  proRole,
  language,
  onToggleLanguage,
  onOpenProModal,
  onOpenSocialHub,
  onExploreAiAutoCut,
}) => {
  const [bannerDismissed, setBannerDismissed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems: Array<{ page: AppPage; label: string; isNew?: boolean; count?: number }> = [
    { page: 'api', label: 'API', isNew: true },
    { page: 'clips', label: 'Clips', count: clipsCount > 0 ? clipsCount : undefined },
    { page: 'pricing', label: 'Pricing' },
    { page: 'privacy', label: 'Privacy' },
    { page: 'contact', label: language === 'id' ? 'Kontak' : 'Contact Us' },
  ];

  return (
    <>
      {/* Top Dark Announcement Banner matching clipscutter.com */}
      {!bannerDismissed && (
        <div className="bg-[#161B26] text-white px-4 py-2 text-xs sm:text-[13px] relative flex items-center justify-center">
          <div className="flex items-center gap-2.5 flex-wrap justify-center pr-7">
            <span className="bg-[#5865F2] text-white text-[10px] font-bold tracking-wider uppercase px-2.5 py-0.5 rounded-full whitespace-nowrap shrink-0">
              AI Powered
            </span>
            <p className="text-slate-200">
              <strong className="font-semibold text-white">AI Auto-Clipper &amp; Social Sync</strong>
              {' — '}
              {language === 'id'
                ? 'Potong video panjang jadi konten viral 9:16 TikTok, Reels & Shorts otomatis dalam 1 klik.'
                : 'Turn long videos into viral 9:16 shorts & social posts in one click. Free, no signup.'}{' '}
              <button
                type="button"
                onClick={onExploreAiAutoCut}
                className="text-[#8198FF] hover:text-white font-semibold underline-offset-2 hover:underline transition-colors cursor-pointer whitespace-nowrap"
              >
                {language === 'id' ? 'Coba AI Sekarang →' : 'Explore AI →'}
              </button>
            </p>
          </div>
          <button
            type="button"
            aria-label="Dismiss announcement"
            onClick={() => setBannerDismissed(true)}
            className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Main Navigation Header */}
      <header className="w-full sticky top-0 z-40 bg-white/95 backdrop-blur-sm border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-8 h-16 sm:h-[68px] flex items-center justify-between gap-6 sm:gap-8">
          {/* Zone 1: Brand Wordmark matching ClipsCutter blue paperclip logo */}
          <button
            type="button"
            onClick={() => onNavigate('home')}
            className="flex items-center gap-2.5 text-left group cursor-pointer whitespace-nowrap shrink-0 focus:outline-none"
          >
            <svg
              width="28"
              height="28"
              viewBox="0 0 28 28"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              aria-hidden="true"
              className="text-[#4F6EF7] transition-transform duration-150 group-hover:scale-105"
            >
              <path
                d="M17.8 6.2L9.2 14.8C7.65 16.35 7.65 18.85 9.2 20.4C10.75 21.95 13.25 21.95 14.8 20.4L22.6 12.6C25.1 10.1 25.1 6.05 22.6 3.55C20.1 1.05 16.05 1.05 13.55 3.55L5.4 11.7C1.95 15.15 1.95 20.75 5.4 24.2C8.85 27.65 14.45 27.65 17.9 24.2L24.5 17.6"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <span className="text-[24px] font-bold tracking-tight text-[#4F6EF7]">
              ClipsCutter
            </span>
          </button>

          {/* Zone 2 & 3: Desktop Nav Links + Profile/Social Hub Trigger */}
          <div className="hidden md:flex items-center gap-7">
            <nav aria-label="Main navigation" className="flex items-center gap-7">
              {navItems.map((item) => {
                const isActive = activePage === item.page;
                return (
                  <button
                    key={item.page}
                    type="button"
                    onClick={() => onNavigate(item.page)}
                    className={`relative text-[15px] font-medium transition-colors cursor-pointer whitespace-nowrap shrink-0 py-1 ${
                      isActive
                        ? 'text-[#4F6EF7] font-semibold'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {item.isNew && (
                      <span className="absolute -top-2.5 -left-5 px-1.5 py-[1px] text-[10px] font-semibold leading-tight text-[#4F6EF7] border border-[#4F6EF7]/60 rounded-full bg-white">
                        New
                      </span>
                    )}
                    <span>{item.label}</span>
                    {typeof item.count === 'number' && (
                      <span className="ml-1.5 text-xs font-semibold text-[#4F6EF7]">
                        ({item.count})
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>

            <div className="flex items-center gap-2.5 pl-2 border-l border-slate-200">
              <button
                type="button"
                onClick={onToggleLanguage}
                aria-label="Switch interface language"
                className="text-xs font-semibold text-slate-500 hover:text-[#4F6EF7] px-2 py-1 rounded-md hover:bg-slate-50 transition-colors cursor-pointer whitespace-nowrap shrink-0"
              >
                {language === 'en' ? 'EN / ID' : 'ID / EN'}
              </button>

              <button
                type="button"
                onClick={() => onOpenProModal('activate')}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                  isPro
                    ? 'bg-[#4F6EF7] text-white hover:bg-[#3D5CE5]'
                    : 'border border-[#4F6EF7]/40 text-[#4F6EF7] hover:bg-[#4F6EF7]/5'
                }`}
              >
                <KeyRound className="w-3.5 h-3.5" />
                <span>
                  {isPro ? (proRole === 'owner' ? 'OWNER PRO' : 'PRO AKTIF') : 'Kode Pro'}
                </span>
              </button>

              <button
                type="button"
                onClick={onOpenSocialHub}
                aria-label="Connected Social Accounts and Plan Status"
                className="relative flex items-center p-1 rounded-full hover:bg-slate-100 transition-colors cursor-pointer shrink-0"
              >
                <span className="w-8 h-8 rounded-full bg-slate-500 text-white flex items-center justify-center">
                  <User className="w-4 h-4" />
                </span>
              </button>
            </div>
          </div>

          {/* Mobile Menu Toggle */}
          <div className="flex items-center gap-1.5 md:hidden shrink-0">
            <button
              type="button"
              onClick={() => onOpenProModal('activate')}
              className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap shrink-0 ${
                isPro
                  ? 'bg-[#4F6EF7] text-white'
                  : 'border border-[#4F6EF7]/40 text-[#4F6EF7]'
              }`}
            >
              <KeyRound className="w-3.5 h-3.5" />
              <span>{isPro ? 'PRO' : 'Kode Pro'}</span>
            </button>
            <button
              type="button"
              onClick={onOpenSocialHub}
              aria-label="Account and Social Connections"
              className="w-9 h-9 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center shrink-0"
            >
              <User className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setMobileMenuOpen((v) => !v)}
              aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
              aria-expanded={mobileMenuOpen}
              className="p-2 rounded-lg text-slate-700 hover:bg-slate-100 shrink-0"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Drawer */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-slate-100 bg-white px-4 py-3 space-y-1">
            {navItems.map((item) => (
              <button
                key={item.page}
                type="button"
                onClick={() => {
                  onNavigate(item.page);
                  setMobileMenuOpen(false);
                }}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium ${
                  activePage === item.page
                    ? 'bg-[#4F6EF7]/10 text-[#4F6EF7]'
                    : 'text-slate-700 hover:bg-slate-50'
                }`}
              >
                <span>{item.label}</span>
                {typeof item.count === 'number' && (
                  <span className="text-xs font-semibold text-[#4F6EF7]">{item.count}</span>
                )}
              </button>
            ))}
            <div className="pt-2 border-t border-slate-100 flex items-center justify-between px-3 py-1.5">
              <span className="text-xs text-slate-500">Language / Bahasa</span>
              <button
                type="button"
                onClick={onToggleLanguage}
                className="text-xs font-semibold text-[#4F6EF7]"
              >
                {language === 'en' ? 'Switch to Bahasa Indonesia' : 'Switch to English'}
              </button>
            </div>
          </div>
        )}
      </header>
    </>
  );
};
