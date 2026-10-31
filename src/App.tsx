/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from 'react';
import { Captions, Check, Film, Layers, Share2, Sparkles, Upload } from 'lucide-react';
import { DEMO_VIDEOS } from './data/catalog';
import type {
  AppPage,
  ConnectedSocialAccount,
  CreatedClip,
  ScheduledSocialPost,
  SocialPlatformId,
  VideoSource,
} from './types';
import { extractYouTubeId } from './utils/timeUtils';
import { buildSocialShareIntentUrl } from './utils/socialRules';
import { isLicenseSessionValid, type ProLicenseSession } from './utils/proLicense';
import { auth, onAuthStateChanged, type User } from './firebase';
import { Navbar } from './components/Navbar';
import { VideoTrimmerWorkspace, type WorkspaceTab } from './components/VideoTrimmerWorkspace';
import { LandingSections } from './components/LandingSections';
import { SocialShareModal } from './components/SocialShareModal';
import { ProActivationModal } from './components/ProActivationModal';
import {
  AccountSocialModal,
  ClipsLibraryView,
  ContactUsView,
  DeveloperApiView,
  PricingView,
  PrivacyPolicyView,
} from './components/SecondaryPages';

const INITIAL_SOCIAL_ACCOUNTS: ConnectedSocialAccount[] = [
  { platform: 'tiktok', handle: '@vibeclip.studio', connected: true, followers: '42.8K' },
  { platform: 'shorts', handle: '@VibeClipOfficial', connected: true, followers: '118K' },
  { platform: 'reels', handle: '@vibeclip.id', connected: false, followers: '19.4K' },
  { platform: 'x', handle: '@vibeclip_ai', connected: true, followers: '12.1K' },
  { platform: 'facebook', handle: 'VibeClip Media', connected: false, followers: '8.5K' },
];

export default function App() {
  const [activePage, setActivePage] = useState<AppPage>('home');
  const [language, setLanguage] = useState<'en' | 'id'>('en');

  // Official Pro License Session (Owner Master Code or Signed Offline Buyer Code)
  const [proSession, setProSession] = useState<ProLicenseSession | null>(() => {
    try {
      const raw = localStorage.getItem('clipscutter_pro_session_v1');
      if (!raw) return null;
      const parsed = JSON.parse(raw) as ProLicenseSession;
      return isLicenseSessionValid(parsed) ? parsed : null;
    } catch {
      return null;
    }
  });
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [proModalState, setProModalState] = useState<{
    open: boolean;
    tab: 'activate' | 'owner';
  }>({ open: false, tab: 'activate' });

  const isPro = isLicenseSessionValid(proSession);
  const openProModal = (tab: 'activate' | 'owner' = 'activate') => {
    setProModalState({ open: true, tab });
  };

  // Hero URL input & loaded video state
  const [urlInput, setUrlInput] = useState<string>('');
  const [urlError, setUrlError] = useState<string | null>(null);
  const [loadingUrl, setLoadingUrl] = useState<boolean>(false);
  const [activeVideo, setActiveVideo] = useState<VideoSource | null>(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('autostart') === '1' ? DEMO_VIDEOS[0] : null;
  });
  const [workspaceInitialTab, setWorkspaceInitialTab] = useState<WorkspaceTab>('controls');

  // Clips & Social state (persisted in localStorage)
  const [clips, setClips] = useState<CreatedClip[]>(() => {
    try {
      const saved = localStorage.getItem('clipscutter_clips_v1');
      return saved ? (JSON.parse(saved) as CreatedClip[]) : [];
    } catch {
      return [];
    }
  });

  const [socialAccounts, setSocialAccounts] = useState<ConnectedSocialAccount[]>(
    INITIAL_SOCIAL_ACCOUNTS
  );
  const [scheduledPosts, setScheduledPosts] = useState<ScheduledSocialPost[]>([]);

  // Modals
  const [socialModalClip, setSocialModalClip] = useState<CreatedClip | null>(null);
  const [accountModalOpen, setAccountModalOpen] = useState<boolean>(false);
  const [copiedSiteLink, setCopiedSiteLink] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const heroInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      setFirebaseUser(user);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    try {
      if (proSession && isLicenseSessionValid(proSession)) {
        localStorage.setItem('clipscutter_pro_session_v1', JSON.stringify(proSession));
      } else {
        localStorage.removeItem('clipscutter_pro_session_v1');
      }
    } catch {
      // Ignore storage quota errors
    }
  }, [proSession]);

  useEffect(() => {
    try {
      // Persist serializable clips (exclude temporary blob URLs)
      const serializable = clips.map((c) => ({ ...c, downloadUrl: undefined }));
      localStorage.setItem('clipscutter_clips_v1', JSON.stringify(serializable));
    } catch {
      // Ignore storage quota errors
    }
  }, [clips]);

  const handleTrimUrlSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setUrlError(null);
    const trimmed = urlInput.trim();

    if (!trimmed) {
      setUrlError(
        language === 'id'
          ? 'Masukkan link video YouTube terlebih dahulu atau pilih contoh video di bawah.'
          : 'Please paste a valid YouTube video URL first, or pick a sample video below.'
      );
      return;
    }

    // Check if it matches one of our built-in demo links
    const matchedDemo = DEMO_VIDEOS.find((d) => d.url.toLowerCase() === trimmed.toLowerCase());
    if (matchedDemo) {
      setActiveVideo(matchedDemo);
      setWorkspaceInitialTab('controls');
      return;
    }

    const ytId = extractYouTubeId(trimmed);
    if (!ytId) {
      setUrlError(
        language === 'id'
          ? 'Format URL YouTube tidak valid. Contoh: https://www.youtube.com/watch?v=dQw4w9WgXcQ'
          : 'Invalid YouTube URL. Please enter a valid watch, youtu.be, or Shorts link.'
      );
      return;
    }

    setLoadingUrl(true);
    try {
      const res = await fetch(`/api/video-info?videoId=${encodeURIComponent(ytId)}`);
      const info = await res.json();
      setActiveVideo({
        id: `yt-${ytId}`,
        type: 'youtube',
        youtubeId: ytId,
        title: info.title || `YouTube Video (${ytId})`,
        author: info.author || 'YouTube Creator',
        url: `https://www.youtube.com/watch?v=${ytId}`,
        thumbnailUrl: info.thumbnailUrl,
        durationSec: Number(info.durationSec) || 900,
      });
      setWorkspaceInitialTab('controls');
    } catch {
      setActiveVideo({
        id: `yt-${ytId}`,
        type: 'youtube',
        youtubeId: ytId,
        title: `YouTube Video (${ytId})`,
        author: 'YouTube Creator',
        url: `https://www.youtube.com/watch?v=${ytId}`,
        durationSec: 900,
      });
      setWorkspaceInitialTab('controls');
    } finally {
      setLoadingUrl(false);
    }
  };

  const handleLocalFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUrlError(null);
    const objUrl = URL.createObjectURL(file);
    setActiveVideo({
      id: `upload-${Date.now()}`,
      type: 'upload',
      title: file.name.replace(/\.[^.]+$/, ''),
      author: 'Local Upload',
      url: objUrl,
      objectUrl: objUrl,
      durationSec: 180,
    });
    setWorkspaceInitialTab('controls');
    e.target.value = '';
  };

  const handleLoadDemo = (demo: VideoSource, tab: WorkspaceTab = 'controls') => {
    setUrlError(null);
    setUrlInput(demo.url);
    setActiveVideo(demo);
    setWorkspaceInitialTab(tab);
    setActivePage('home');
  };

  const handleToggleSocialAccount = (platform: SocialPlatformId) => {
    setSocialAccounts((prev) =>
      prev.map((acc) =>
        acc.platform === platform ? { ...acc, connected: !acc.connected } : acc
      )
    );
  };

  const handleCopySiteUrl = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopiedSiteLink(true);
      setTimeout(() => setCopiedSiteLink(false), 2000);
    } catch {
      setCopiedSiteLink(true);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-white text-slate-900">
      <Navbar
        activePage={activePage}
        onNavigate={(page) => {
          setActivePage(page);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        clipsCount={clips.length}
        isPro={isPro}
        proRole={isPro ? proSession?.role : null}
        language={language}
        onToggleLanguage={() => setLanguage((l) => (l === 'en' ? 'id' : 'en'))}
        onOpenProModal={openProModal}
        onOpenSocialHub={() => setAccountModalOpen(true)}
        onExploreAiAutoCut={() => {
          setActivePage('home');
          if (!activeVideo) {
            setActiveVideo(DEMO_VIDEOS[0]);
          }
          setWorkspaceInitialTab('ai');
        }}
      />

      <main className="flex-1">
        {activePage === 'home' && (
          <>
            {/* Show Hero Section when no video is loaded, or compact switchable workspace when loaded */}
            {!activeVideo ? (
              <section className="max-w-4xl mx-auto px-4 sm:px-8 pt-16 sm:pt-24 pb-16 text-center">
                <h1
                  style={{ textWrap: 'balance' }}
                  className="text-4xl sm:text-[54px] font-bold tracking-tight text-[#2B303A] leading-[1.12]"
                >
                  {language === 'id' ? 'Pemotong Video YouTube & AI' : 'Youtube Video Cutter'}
                </h1>

                <p className="mt-5 text-base sm:text-[18px] text-slate-600 max-w-2xl mx-auto leading-relaxed font-normal">
                  {language === 'id'
                    ? 'Potong bagian video YouTube mana pun dalam kualitas asli 4K tanpa re-encoding, atau gunakan AI Auto-Clipper untuk membuat konten viral TikTok, Reels & Shorts otomatis.'
                    : 'Cut any YouTube video to the exact clip you want, in original 4K quality with zero re-encoding. No quality loss, blazing-fast processing. Just paste a link and pick your timestamps.'}
                </p>

                {/* Signature Pill Input Bar matching clipscutter.com */}
                <form
                  onSubmit={handleTrimUrlSubmit}
                  noValidate
                  className="mt-9 max-w-[600px] mx-auto"
                >
                  <div className="flex items-center p-1.5 rounded-full border border-slate-200 bg-white shadow-xs focus-within:border-[#4F6EF7] focus-within:ring-2 focus-within:ring-[#4F6EF7]/20 transition-all">
                    <label htmlFor="youtube-url-input" className="sr-only">
                      Paste YouTube video link here
                    </label>
                    <input
                      ref={heroInputRef}
                      id="youtube-url-input"
                      type="url"
                      value={urlInput}
                      onChange={(e) => {
                        setUrlInput(e.target.value);
                        if (urlError) setUrlError(null);
                      }}
                      placeholder={
                        language === 'id'
                          ? 'Tempel link video YouTube di sini...'
                          : 'Paste YouTube video link here...'
                      }
                      className="flex-1 bg-transparent pl-5 pr-3 py-2.5 text-sm sm:text-[15px] text-slate-800 placeholder:text-slate-400 focus:outline-none"
                    />
                    <button
                      type="submit"
                      disabled={loadingUrl}
                      className="px-7 py-3 rounded-full bg-[#4F6EF7] hover:bg-[#3D5CE5] disabled:opacity-60 text-white text-xs sm:text-[13px] font-semibold tracking-wide uppercase transition-colors cursor-pointer whitespace-nowrap shrink-0"
                    >
                      {loadingUrl ? 'LOADING...' : 'TRIM NOW'}
                    </button>
                  </div>

                  {urlError && (
                    <p role="alert" className="mt-2.5 text-xs font-medium text-red-600">
                      {urlError}
                    </p>
                  )}
                </form>

                {/* Quick Action Bar: Upload Local Video | Sample Streams | 1-Click AI Auto-Cut */}
                <div className="mt-5 flex flex-wrap items-center justify-center gap-2.5 text-xs">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="video/*,audio/*"
                    onChange={handleLocalFileUpload}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-slate-200 hover:border-[#4F6EF7] text-slate-700 hover:text-[#4F6EF7] font-medium transition-colors cursor-pointer"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>{language === 'id' ? 'Upload Video Lokal' : 'Upload Video File'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleLoadDemo(DEMO_VIDEOS[0], 'controls')}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-slate-200 hover:border-[#4F6EF7] text-slate-700 hover:text-[#4F6EF7] font-medium transition-colors cursor-pointer"
                  >
                    <Film className="w-3.5 h-3.5 text-[#4F6EF7]" />
                    <span>Try Sample Stream (01:11:32)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleLoadDemo(DEMO_VIDEOS[0], 'templates')}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-slate-200 hover:border-[#4F6EF7] text-slate-700 hover:text-[#4F6EF7] font-medium transition-colors cursor-pointer whitespace-nowrap"
                  >
                    <Layers className="w-3.5 h-3.5 text-[#4F6EF7]" />
                    <span>Template &amp; Preset</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleLoadDemo(DEMO_VIDEOS[1], 'subtitles')}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg border border-slate-200 hover:border-[#4F6EF7] text-slate-700 hover:text-[#4F6EF7] font-medium transition-colors cursor-pointer whitespace-nowrap"
                  >
                    <Captions className="w-3.5 h-3.5 text-[#4F6EF7]" />
                    <span>Auto Subtitle 100%</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleLoadDemo(DEMO_VIDEOS[1], 'ai')}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#4F6EF7]/10 hover:bg-[#4F6EF7]/15 text-[#4F6EF7] font-semibold transition-colors cursor-pointer whitespace-nowrap"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>
                      {language === 'id' ? 'Demo AI Pemotong Otomatis' : 'Try AI Auto-Clipper'}
                    </span>
                  </button>
                </div>

                {/* Social Share Icons Row matching clipscutter-home.png */}
                <div className="mt-7 flex items-center justify-center gap-4">
                  <a
                    href={buildSocialShareIntentUrl(
                      'x',
                      window.location.origin,
                      'Cut any YouTube video in 4K raw quality & generate viral AI clips with ClipsCutter!',
                      ['ClipsCutter', 'VideoEditing']
                    )}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="Share on X (Twitter)"
                    className="w-8 h-8 rounded-full bg-slate-900 hover:bg-slate-700 text-white flex items-center justify-center text-xs font-bold transition-colors"
                  >
                    𝕏
                  </a>

                  <button
                    type="button"
                    onClick={handleCopySiteUrl}
                    aria-label="Copy link to share"
                    className="w-8 h-8 rounded-full bg-[#4F6EF7]/10 hover:bg-[#4F6EF7]/20 text-[#4F6EF7] flex items-center justify-center transition-colors cursor-pointer"
                  >
                    {copiedSiteLink ? (
                      <Check className="w-4 h-4 text-emerald-600" />
                    ) : (
                      <Share2 className="w-4 h-4" />
                    )}
                  </button>

                  <a
                    href={buildSocialShareIntentUrl(
                      'facebook',
                      window.location.origin,
                      'ClipsCutter – 4K YouTube Video Cutter & AI Auto-Clipper'
                    )}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="Share on Facebook"
                    className="w-8 h-8 rounded-full bg-[#1877F2] hover:bg-[#166FE5] text-white flex items-center justify-center text-sm font-bold transition-colors"
                  >
                    f
                  </a>
                </div>
              </section>
            ) : (
              <VideoTrimmerWorkspace
                source={activeVideo}
                onChangeVideoRequest={() => {
                  setActiveVideo(null);
                  setUrlInput('');
                }}
                clips={clips}
                onCreateClip={(newClip) => setClips((prev) => [newClip, ...prev])}
                onDeleteClip={(id) => setClips((prev) => prev.filter((c) => c.id !== id))}
                onOpenSocialModal={(clip) => setSocialModalClip(clip)}
                isPro={isPro}
                onOpenProModal={openProModal}
                language={language}
                initialTab={workspaceInitialTab}
              />
            )}

            <LandingSections
              language={language}
              onStartClipping={() => {
                window.scrollTo({ top: 0, behavior: 'smooth' });
                if (!activeVideo) {
                  setTimeout(() => heroInputRef.current?.focus(), 300);
                }
              }}
              onNavigate={(page) => {
                setActivePage(page);
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
            />
          </>
        )}

        {activePage === 'clips' && (
          <ClipsLibraryView
            clips={clips}
            scheduledPosts={scheduledPosts}
            accounts={socialAccounts}
            onToggleConnectAccount={handleToggleSocialAccount}
            onDeleteClip={(id) => setClips((prev) => prev.filter((c) => c.id !== id))}
            onOpenSocialModal={(clip) => setSocialModalClip(clip)}
            onGoToTrimmer={() => {
              setActivePage('home');
              if (!activeVideo) setActiveVideo(DEMO_VIDEOS[0]);
            }}
          />
        )}

        {activePage === 'api' && <DeveloperApiView />}

        {activePage === 'pricing' && (
          <PricingView
            isPro={isPro}
            proSession={proSession}
            onOpenProModal={openProModal}
            onNavigate={setActivePage}
          />
        )}

        {activePage === 'privacy' && <PrivacyPolicyView />}

        {activePage === 'contact' && <ContactUsView />}
      </main>

      <SocialShareModal
        clip={socialModalClip}
        isOpen={Boolean(socialModalClip)}
        onClose={() => setSocialModalClip(null)}
        accounts={socialAccounts}
        onToggleConnectAccount={handleToggleSocialAccount}
        onPublishOrSchedule={(post) => setScheduledPosts((prev) => [post, ...prev])}
        language={language}
      />

      <AccountSocialModal
        isOpen={accountModalOpen}
        onClose={() => setAccountModalOpen(false)}
        isPro={isPro}
        proSession={proSession}
        onOpenProModal={openProModal}
        accounts={socialAccounts}
        onToggleConnectAccount={handleToggleSocialAccount}
      />

      <ProActivationModal
        isOpen={proModalState.open}
        onClose={() => setProModalState((prev) => ({ ...prev, open: false }))}
        initialTab={proModalState.tab}
        proSession={proSession}
        onActivateSession={setProSession}
        onDeactivateSession={() => setProSession(null)}
        firebaseUser={firebaseUser}
      />
    </div>
  );
}
