import React, { useState } from 'react';
import {
  Captions,
  Check,
  Code2,
  Download,
  KeyRound,
  Mail,
  Play,
  Scissors,
  Send,
  Share2,
  ShieldCheck,
  Trash2,
  X,
} from 'lucide-react';
import type {
  AppPage,
  ConnectedSocialAccount,
  CreatedClip,
  ScheduledSocialPost,
  SocialPlatformId,
} from '../types';
import { SOCIAL_PLATFORM_SPECS } from '../utils/socialRules';
import { formatTimestamp } from '../utils/timeUtils';
import { triggerClipDownload } from '../utils/clientClipExporter';
import { downloadSubtitleFile } from '../utils/subtitleEngine';
import { OWNER_EMAIL, type ProLicenseSession } from '../utils/proLicense';
import { DiamondProIcon } from './QualityDropdown';

/* ---------------- 1. CLIPS & SOCIAL PUBLISHING HUB PAGE ---------------- */
interface ClipsPageProps {
  clips: CreatedClip[];
  scheduledPosts: ScheduledSocialPost[];
  accounts: ConnectedSocialAccount[];
  onToggleConnectAccount: (platform: SocialPlatformId) => void;
  onDeleteClip: (id: string) => void;
  onOpenSocialModal: (clip: CreatedClip) => void;
  onGoToTrimmer: () => void;
}

export const ClipsLibraryView: React.FC<ClipsPageProps> = ({
  clips,
  scheduledPosts,
  accounts,
  onToggleConnectAccount,
  onDeleteClip,
  onOpenSocialModal,
  onGoToTrimmer,
}) => {
  const [filterFormat, setFilterFormat] = useState<'ALL' | 'VIDEO' | 'AUDIO' | 'AI'>('ALL');

  const filtered = clips.filter((c) => {
    if (filterFormat === 'VIDEO') return ['MP4', 'WEBM'].includes(c.format);
    if (filterFormat === 'AUDIO') return ['MP3', 'M4A', 'OGG', 'OPUS'].includes(c.format);
    if (filterFormat === 'AI') return Boolean(c.aiGenerated);
    return true;
  });

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-8 py-12 space-y-12">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Your Clips &amp; Social Queue</h1>
          <p className="text-sm text-slate-600 mt-1">
            Manage trimmed segments, download raw files, and monitor scheduled social media posts.
          </p>
        </div>
        <button
          type="button"
          onClick={onGoToTrimmer}
          className="px-4 py-2.5 rounded-xl bg-[#4F6EF7] hover:bg-[#3D5CE5] text-white text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer"
        >
          <Scissors className="w-4 h-4" />
          <span>Cut New Video</span>
        </button>
      </div>

      {/* Connected Social Accounts Strip */}
      <div className="p-6 rounded-2xl border border-slate-200 bg-white space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-900">Connected Social Media Channels</h2>
          <span className="text-xs text-slate-500">
            {accounts.filter((a) => a.connected).length} of {accounts.length} active
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {accounts.map((acc) => {
            const spec = SOCIAL_PLATFORM_SPECS[acc.platform];
            return (
              <div
                key={acc.platform}
                className="p-3.5 rounded-xl border border-slate-200 flex flex-col justify-between gap-3"
              >
                <div>
                  <p className="text-sm font-semibold text-slate-900">{spec.name}</p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {acc.connected ? `${acc.handle} · ${acc.followers}` : 'Disconnected'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => onToggleConnectAccount(acc.platform)}
                  className={`w-full py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${
                    acc.connected
                      ? 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                      : 'bg-[#4F6EF7]/10 text-[#4F6EF7] hover:bg-[#4F6EF7]/20'
                  }`}
                >
                  {acc.connected ? 'Connected' : 'Connect'}
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Clips Filter & Table/Cards */}
      <div className="space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg">
            {(['ALL', 'VIDEO', 'AUDIO', 'AI'] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setFilterFormat(tab)}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold cursor-pointer transition-colors ${
                  filterFormat === tab
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {tab === 'ALL' ? 'All Clips' : tab === 'AI' ? 'AI Auto-Cut' : `${tab} Only`}
              </button>
            ))}
          </div>
          <span className="text-xs text-slate-500 font-tabular">{filtered.length} clips</span>
        </div>

        {filtered.length === 0 ? (
          <div className="py-16 px-4 text-center rounded-2xl border border-slate-200 bg-slate-50/60 space-y-3">
            <Scissors className="w-8 h-8 text-slate-400 mx-auto" />
            <h3 className="text-base font-bold text-slate-900">No clips in this view yet</h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              Paste a YouTube link or load a demo video on the trimmer workspace to slice 4K clips or generate AI highlights.
            </p>
            <button
              type="button"
              onClick={onGoToTrimmer}
              className="px-4 py-2 rounded-xl bg-[#4F6EF7] text-white text-xs font-semibold cursor-pointer"
            >
              Open Video Trimmer
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filtered.map((clip) => (
              <div
                key={clip.id}
                className="p-5 rounded-2xl border border-slate-200 bg-white flex flex-col justify-between gap-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs text-slate-500">
                      {clip.aiGenerated ? 'AI Highlight · ' : 'Manual Trim · '}
                      {clip.format} · {clip.quality} · {clip.aspectRatio}
                      {clip.templateName ? ` · ${clip.templateName}` : ''}
                      {clip.subtitleCount ? ` · ${clip.subtitleCount} Sub` : ''}
                    </p>
                    <h3 className="text-base font-bold text-slate-900 mt-0.5 truncate">
                      {clip.title}
                    </h3>
                    <p className="text-xs text-slate-500 font-tabular mt-1">
                      Range: {formatTimestamp(clip.startSec)} – {formatTimestamp(clip.endSec)} (
                      {clip.durationSec}s · ~{clip.estimatedSizeMb} MB)
                    </p>
                  </div>
                  <button
                    type="button"
                    aria-label={`Delete ${clip.title}`}
                    onClick={() => onDeleteClip(clip.id)}
                    className="p-1.5 text-slate-400 hover:text-red-600 cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => triggerClipDownload(clip)}
                    className="flex-1 py-2 px-3 rounded-xl bg-[#4F6EF7] hover:bg-[#3D5CE5] text-white text-xs font-semibold inline-flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download</span>
                  </button>
                  {clip.subtitles && clip.subtitles.length > 0 && (
                    <button
                      type="button"
                      onClick={() =>
                        downloadSubtitleFile(
                          clip.subtitles!,
                          'srt',
                          clip.title,
                          true,
                          clip.startSec
                        )
                      }
                      className="py-2 px-3 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-800 text-xs font-semibold inline-flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0"
                    >
                      <Captions className="w-3.5 h-3.5 text-[#4F6EF7]" />
                      <span>.SRT</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => onOpenSocialModal(clip)}
                    className="flex-1 py-2 px-3 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-800 text-xs font-semibold inline-flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap"
                  >
                    <Share2 className="w-3.5 h-3.5 text-[#4F6EF7]" />
                    <span>Share / Schedule</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Scheduled & Published Social Posts Queue */}
      {scheduledPosts.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-bold text-slate-900">Social Publishing Activity</h2>
          <div className="rounded-2xl border border-slate-200 bg-white divide-y divide-slate-100">
            {scheduledPosts.map((post) => (
              <div
                key={post.id}
                className="px-5 py-3.5 flex flex-wrap items-center justify-between gap-3 text-xs"
              >
                <div className="min-w-0">
                  <p className="font-semibold text-slate-900">
                    {SOCIAL_PLATFORM_SPECS[post.platform].name} — {post.clipTitle}
                  </p>
                  <p className="text-slate-500 truncate max-w-xl mt-0.5">{post.caption}</p>
                </div>
                <div className="font-tabular text-right">
                  <span
                    className={`font-semibold ${
                      post.status === 'published' ? 'text-emerald-700' : 'text-[#4F6EF7]'
                    }`}
                  >
                    {post.status === 'published' ? 'Published' : 'Scheduled'}
                  </span>
                  <span className="text-slate-400 mx-1.5">·</span>
                  <span className="text-slate-500">
                    {new Date(post.scheduledFor).toLocaleString()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

/* ---------------- 2. DEVELOPER API GATEWAY PAGE ---------------- */
export const DeveloperApiView: React.FC = () => {
  const [videoId, setVideoId] = useState('dQw4w9WgXcQ');
  const [startTime, setStartTime] = useState('00:00:15');
  const [endTime, setEndTime] = useState('00:00:45');
  const [format, setFormat] = useState('mp4');
  const [apiResponse, setApiResponse] = useState<string | null>(null);
  const [testing, setTesting] = useState(false);

  const runApiTest = async (e: React.FormEvent) => {
    e.preventDefault();
    setTesting(true);
    try {
      const res = await fetch('/api/v1/clips/youtube', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          video_id: videoId,
          start_time: startTime,
          end_time: endTime,
          format,
          quality: '1080p60',
        }),
      });
      const json = await res.json();
      setApiResponse(JSON.stringify(json, null, 2));
    } catch (err: unknown) {
      setApiResponse(JSON.stringify({ error: String(err) }, null, 2));
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-8 py-12 space-y-10">
      <div className="max-w-3xl">
        <p className="text-xs font-semibold text-[#4F6EF7] mb-2">Developer API Gateway</p>
        <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 tracking-tight">
          Extract YouTube Clips Programmatically at $0.01 / Clip
        </h1>
        <p className="text-slate-600 mt-3 text-base leading-relaxed">
          Integrate byte-range stream copying into your AI video pipelines, podcast automation workflows, and social schedulers with zero transcoding overhead. Credits never expire.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        <form
          onSubmit={runApiTest}
          className="lg:col-span-5 p-6 rounded-2xl border border-slate-200 bg-white space-y-4"
        >
          <div className="flex items-center gap-2 text-sm font-bold text-slate-900">
            <Code2 className="w-4 h-4 text-[#4F6EF7]" />
            <span>Interactive Endpoint Playground</span>
          </div>

          <div>
            <label htmlFor="api-vid-id" className="block text-xs font-semibold text-slate-700 mb-1">
              video_id
            </label>
            <input
              id="api-vid-id"
              type="text"
              value={videoId}
              onChange={(e) => setVideoId(e.target.value)}
              className="w-full h-10 px-3 rounded-lg border border-slate-200 font-mono text-xs"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label
                htmlFor="api-start"
                className="block text-xs font-semibold text-slate-700 mb-1"
              >
                start_time
              </label>
              <input
                id="api-start"
                type="text"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full h-10 px-3 rounded-lg border border-slate-200 font-tabular text-xs"
              />
            </div>
            <div>
              <label htmlFor="api-end" className="block text-xs font-semibold text-slate-700 mb-1">
                end_time
              </label>
              <input
                id="api-end"
                type="text"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="w-full h-10 px-3 rounded-lg border border-slate-200 font-tabular text-xs"
              />
            </div>
          </div>

          <div>
            <label htmlFor="api-fmt" className="block text-xs font-semibold text-slate-700 mb-1">
              format
            </label>
            <select
              id="api-fmt"
              value={format}
              onChange={(e) => setFormat(e.target.value)}
              className="w-full h-10 px-3 rounded-lg border border-slate-200 text-xs"
            >
              <option value="mp4">mp4</option>
              <option value="webm">webm</option>
              <option value="mp3">mp3</option>
              <option value="m4a">m4a</option>
            </select>
          </div>

          <button
            type="submit"
            disabled={testing}
            className="w-full h-11 rounded-xl bg-[#4F6EF7] hover:bg-[#3D5CE5] text-white text-xs font-semibold inline-flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>{testing ? 'Sending POST /clips/youtube...' : 'Test Live API Request'}</span>
          </button>
        </form>

        <div className="lg:col-span-7 space-y-4">
          <div className="rounded-2xl bg-slate-950 text-slate-200 p-5 font-mono text-xs overflow-x-auto">
            <div className="text-slate-400 mb-2">cURL Request</div>
            <pre className="leading-relaxed">{`curl -X POST https://api.clipscutter.com/c/clips/youtube \\
  -H "x-api-key: cc_live_your_api_key" \\
  -H "Content-Type: application/json" \\
  -d '{
    "video_id": "${videoId}",
    "start_time": "${startTime}",
    "end_time": "${endTime}",
    "format": "${format}",
    "quality": "1080p60"
  }'`}</pre>
          </div>

          {apiResponse && (
            <div className="rounded-2xl bg-slate-900 text-emerald-300 p-5 font-mono text-xs overflow-x-auto">
              <div className="text-slate-400 mb-2">200 OK JSON Response</div>
              <pre>{apiResponse}</pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

/* ---------------- 3. PRICING PAGE ---------------- */
interface PricingViewProps {
  isPro: boolean;
  proSession: ProLicenseSession | null;
  onOpenProModal: (tab?: 'activate' | 'owner') => void;
  onNavigate: (page: AppPage) => void;
}

export const PricingView: React.FC<PricingViewProps> = ({
  isPro,
  proSession,
  onOpenProModal,
  onNavigate,
}) => {
  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-8 py-14 space-y-12">
      <div className="text-center max-w-2xl mx-auto">
        <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 tracking-tight">
          Simple, Official Pro Licensing
        </h1>
        <p className="text-slate-600 mt-3 text-base">
          Gunakan paket gratis untuk klip kasual hingga 10 menit, atau aktifkan <strong>Kode Lisensi Pro Resmi</strong> melalui pembelian offline langsung ke pemilik (<strong>{OWNER_EMAIL}</strong>) untuk membuka 4K60, durasi 1 jam, dan AI Auto-Cut.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-stretch">
        {/* Free Plan */}
        <div className="p-8 rounded-2xl border border-slate-200 bg-white flex flex-col justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500">Untuk pengguna kasual</p>
            <h2 className="text-2xl font-bold text-slate-900 mt-1">Free Plan</h2>
            <div className="mt-4 flex items-baseline gap-1">
              <span className="text-4xl font-extrabold text-slate-900 font-tabular">Rp 0</span>
              <span className="text-sm text-slate-500">/ selamanya</span>
            </div>

            <ul className="mt-6 space-y-3 text-sm text-slate-700">
              <li className="flex items-center gap-2.5">
                <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Durasi potong klip maksimal 10 menit</span>
              </li>
              <li className="flex items-center gap-2.5">
                <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Resolusi standar 360p &amp; ekstraksi audio MP3/M4A</span>
              </li>
              <li className="flex items-center gap-2.5">
                <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Template frame 9:16, Custom Preset &amp; Auto Subtitle (.SRT/.VTT)</span>
              </li>
              <li className="flex items-center gap-2.5">
                <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Integrasi caption &amp; share media sosial</span>
              </li>
            </ul>
          </div>

          <button
            type="button"
            onClick={() => onNavigate('home')}
            className="mt-8 w-full py-3 rounded-xl border border-slate-300 hover:bg-slate-50 text-sm font-semibold text-slate-800 cursor-pointer"
          >
            Gunakan Versi Gratis
          </button>
        </div>

        {/* Premium Offline Code Plan */}
        <div className="p-8 rounded-2xl border-2 border-[#4F6EF7] bg-white flex flex-col justify-between relative">
          <div>
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-[#4F6EF7]">
                Khusus Pemilik &amp; Pembeli Offline Resmi
              </p>
              <DiamondProIcon unlocked={isPro} className="w-5 h-5" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900 mt-1">Pro 4K60 License</h2>
            <div className="mt-4 flex items-baseline gap-1.5 flex-wrap">
              <span className="text-4xl font-extrabold text-slate-900 font-tabular">Rp 39.000</span>
              <span className="text-sm text-slate-500">/ 30 hari · tersedia paket 7H s/d Lifetime</span>
            </div>

            <ul className="mt-6 space-y-3 text-sm text-slate-700">
              <li className="flex items-center gap-2.5">
                <Check className="w-4 h-4 text-[#4F6EF7] shrink-0" />
                <span>Durasi klip hingga 1 jam+ (tanpa batas 10 menit)</span>
              </li>
              <li className="flex items-center gap-2.5">
                <Check className="w-4 h-4 text-[#4F6EF7] shrink-0" />
                <span>Kualitas asli hingga 2160p 4K, 1440p &amp; 1080p60</span>
              </li>
              <li className="flex items-center gap-2.5">
                <Check className="w-4 h-4 text-[#4F6EF7] shrink-0" />
                <span>Unlimited Gemini AI Auto-Cut &amp; Penjadwalan Sosial</span>
              </li>
              <li className="flex items-center gap-2.5">
                <Check className="w-4 h-4 text-[#4F6EF7] shrink-0" />
                <span>Aktivasi instan dengan Kode Lisensi bertanda tangan kriptografi</span>
              </li>
              <li className="flex items-center gap-2.5">
                <Check className="w-4 h-4 text-[#4F6EF7] shrink-0" />
                <span>Pembelian offline resmi langsung via {OWNER_EMAIL}</span>
              </li>
            </ul>
          </div>

          <div className="mt-8 space-y-2.5">
            <button
              type="button"
              onClick={() => onOpenProModal('activate')}
              className="w-full py-3 rounded-xl bg-[#4F6EF7] hover:bg-[#3D5CE5] text-white text-sm font-semibold inline-flex items-center justify-center gap-2 cursor-pointer"
            >
              <KeyRound className="w-4 h-4" />
              <span>
                {isPro
                  ? `Pro Aktif (${proSession?.planLabel || 'Resmi'}) — Kelola Kode`
                  : 'Masukkan Kode Aktivasi Pro'}
              </span>
            </button>
            <button
              type="button"
              onClick={() => onOpenProModal('owner')}
              className="w-full py-2 text-xs font-semibold text-slate-500 hover:text-[#4F6EF7] cursor-pointer"
            >
              Pemilik Aplikasi? Buka Generator Kode Pembeli Offline →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

/* ---------------- 4. PRIVACY & CONTACT VIEWS ---------------- */
export const PrivacyPolicyView: React.FC = () => (
  <div className="max-w-3xl mx-auto px-4 sm:px-8 py-14 space-y-6">
    <div className="flex items-center gap-2 text-[#4F6EF7] text-xs font-semibold">
      <ShieldCheck className="w-4 h-4" />
      <span>Privacy &amp; Data Protection</span>
    </div>
    <h1 className="text-3xl font-bold text-slate-900">Privacy Policy</h1>
    <p className="text-sm text-slate-600 leading-relaxed">
      ClipsCutter processes requested timestamp byte-ranges ephemerally. Trimmed clips are retained for a maximum of 24 hours so you can download or publish them to your connected social media channels, after which all temporary media buffers are permanently purged.
    </p>
    <div className="space-y-4 pt-2 text-sm text-slate-700 leading-relaxed">
      <h2 className="text-lg font-bold text-slate-900">1. Zero Permanent Video Storage</h2>
      <p>
        Uploaded local videos are processed directly inside your browser session whenever possible, and cloud stream-copy segments are automatically deleted within 24 hours.
      </p>
      <h2 className="text-lg font-bold text-slate-900">2. AI Highlight Processing</h2>
      <p>
        When you invoke AI Auto-Cut or AI Social Caption generation, only video metadata, titles, chapters, and your prompt preferences are sent to our server-side Gemini endpoint.
      </p>
      <h2 className="text-lg font-bold text-slate-900">3. Social Media Permissions</h2>
      <p>
        Connected creator accounts are used strictly when you explicitly click Publish or Schedule inside the Social Composer. You can disconnect any channel in one click.
      </p>
    </div>
  </div>
);

export const ContactUsView: React.FC = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [subject, setSubject] = useState('Feature Request / API Inquiry');
  const [message, setMessage] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [ticketId, setTicketId] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!name.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) || !message.trim()) {
      setError('Please enter your name, a valid email address, and your message.');
      return;
    }

    setSending(true);
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, subject, message }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Submission failed');
      setTicketId(data.ticketId);
      setName('');
      setEmail('');
      setMessage('');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unable to send message.');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto px-4 sm:px-8 py-14 space-y-6">
      <div>
        <div className="flex items-center gap-2 text-[#4F6EF7] text-xs font-semibold mb-1">
          <Mail className="w-4 h-4" />
          <span>Support &amp; Enterprise API</span>
        </div>
        <h1 className="text-3xl font-bold text-slate-900">Contact Us</h1>
        <p className="text-sm text-slate-600 mt-1">
          Questions about 4K trimming, custom API rate limits, or social publishing? Send us a note.
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        noValidate
        className="p-6 rounded-2xl border border-slate-200 bg-white space-y-4"
      >
        <div>
          <label htmlFor="contact-name" className="block text-xs font-semibold text-slate-700 mb-1">
            Full Name
          </label>
          <input
            id="contact-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Alex Rivera"
            className="w-full h-11 px-3.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#4F6EF7]"
          />
        </div>

        <div>
          <label
            htmlFor="contact-email"
            className="block text-xs font-semibold text-slate-700 mb-1"
          >
            Email Address
          </label>
          <input
            id="contact-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="alex@studio.com"
            className="w-full h-11 px-3.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#4F6EF7]"
          />
        </div>

        <div>
          <label
            htmlFor="contact-subject"
            className="block text-xs font-semibold text-slate-700 mb-1"
          >
            Topic
          </label>
          <select
            id="contact-subject"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            className="w-full h-11 px-3.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#4F6EF7]"
          >
            <option>Feature Request / API Inquiry</option>
            <option>Billing &amp; Pro Trial Support</option>
            <option>Social Media Integration Help</option>
            <option>Bug Report</option>
          </select>
        </div>

        <div>
          <label
            htmlFor="contact-message"
            className="block text-xs font-semibold text-slate-700 mb-1"
          >
            Message
          </label>
          <textarea
            id="contact-message"
            rows={4}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="How can our engineering team help?"
            className="w-full p-3.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-[#4F6EF7]"
          />
        </div>

        {error && (
          <p role="alert" className="text-xs font-medium text-red-600">
            {error}
          </p>
        )}

        {ticketId && (
          <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Message received! Support Ticket #{ticketId} created.</span>
          </div>
        )}

        <button
          type="submit"
          disabled={sending}
          className="w-full h-11 rounded-xl bg-[#4F6EF7] hover:bg-[#3D5CE5] text-white text-sm font-semibold inline-flex items-center justify-center gap-2 cursor-pointer"
        >
          <Send className="w-4 h-4" />
          <span>{sending ? 'Sending...' : 'Send Message'}</span>
        </button>
      </form>
    </div>
  );
};

/* ---------------- 5. ACCOUNT & SOCIAL CONNECTIONS MODAL ---------------- */
interface AccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  isPro: boolean;
  proSession: ProLicenseSession | null;
  onOpenProModal: (tab?: 'activate' | 'owner') => void;
  accounts: ConnectedSocialAccount[];
  onToggleConnectAccount: (platform: SocialPlatformId) => void;
}

export const AccountSocialModal: React.FC<AccountModalProps> = ({
  isOpen,
  onClose,
  isPro,
  proSession,
  onOpenProModal,
  accounts,
  onToggleConnectAccount,
}) => {
  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="account-hub-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 backdrop-blur-xs p-4"
    >
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xl w-full max-w-md overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h3 id="account-hub-title" className="text-base font-bold text-slate-900">
            Creator Account &amp; Social Sync
          </h3>
          <button
            type="button"
            aria-label="Close account modal"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          <div className="p-4 rounded-xl bg-[#F7F8FA] flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs text-slate-500">Status Lisensi Workspace</p>
              <p className="text-sm font-bold text-slate-900 mt-0.5 truncate">
                {isPro
                  ? proSession?.planLabel || 'Pro 4K60 Aktif'
                  : 'Free Plan (360p · Maks 10m)'}
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenProModal(proSession?.role === 'owner' ? 'owner' : 'activate');
              }}
              className="px-3 py-1.5 rounded-lg bg-[#4F6EF7] hover:bg-[#3D5CE5] text-white text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0"
            >
              <KeyRound className="w-3.5 h-3.5" />
              <span>{isPro ? 'Kelola Pro' : 'Kode Pro'}</span>
            </button>
          </div>

          <div className="space-y-2.5">
            <p className="text-xs font-semibold text-slate-700">Social Media Integrations</p>
            {accounts.map((acc) => {
              const spec = SOCIAL_PLATFORM_SPECS[acc.platform];
              return (
                <div
                  key={acc.platform}
                  className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0"
                >
                  <div>
                    <p className="text-sm font-medium text-slate-900">{spec.name}</p>
                    <p className="text-xs text-slate-500">
                      {acc.connected ? `Connected as ${acc.handle}` : 'Not connected'}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => onToggleConnectAccount(acc.platform)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer ${
                      acc.connected
                        ? 'border border-slate-200 text-slate-700 hover:bg-slate-50'
                        : 'bg-[#4F6EF7]/10 text-[#4F6EF7] hover:bg-[#4F6EF7]/20'
                    }`}
                  >
                    {acc.connected ? 'Disconnect' : 'Connect'}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
