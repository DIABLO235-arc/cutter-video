import React, { useEffect, useState } from 'react';
import {
  AlertTriangle,
  Calendar,
  Check,
  Copy,
  Download,
  ExternalLink,
  Link2,
  Send,
  Sparkles,
  X,
} from 'lucide-react';
import type {
  ConnectedSocialAccount,
  CreatedClip,
  ScheduledSocialPost,
  SocialPlatformId,
} from '../types';
import {
  buildSocialShareIntentUrl,
  SOCIAL_PLATFORM_SPECS,
  validateClipForPlatform,
} from '../utils/socialRules';
import { formatTimestamp } from '../utils/timeUtils';
import { triggerClipDownload } from '../utils/clientClipExporter';

interface SocialShareModalProps {
  clip: CreatedClip | null;
  isOpen: boolean;
  onClose: () => void;
  accounts: ConnectedSocialAccount[];
  onToggleConnectAccount: (platform: SocialPlatformId) => void;
  onPublishOrSchedule: (post: ScheduledSocialPost) => void;
  language: 'en' | 'id';
}

export const SocialShareModal: React.FC<SocialShareModalProps> = ({
  clip,
  isOpen,
  onClose,
  accounts,
  onToggleConnectAccount,
  onPublishOrSchedule,
  language,
}) => {
  const [selectedPlatform, setSelectedPlatform] = useState<SocialPlatformId>('tiktok');
  const [caption, setCaption] = useState('');
  const [hashtagsText, setHashtagsText] = useState('#clipscutter #viralclips #shorts');
  const [scheduleMode, setScheduleMode] = useState<'now' | 'later'>('now');
  const [scheduleDateTime, setScheduleDateTime] = useState('2026-11-01T18:00');
  const [aiWriting, setAiWriting] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [publishedConfirmation, setPublishedConfirmation] = useState<string | null>(null);

  useEffect(() => {
    if (clip) {
      setCaption(
        clip.caption ||
          `Watch this ${clip.durationSec}s highlight from "${clip.sourceTitle}"!`
      );
      setHashtagsText(
        clip.hashtags && clip.hashtags.length > 0
          ? clip.hashtags.join(' ')
          : '#clipscutter #viralclips #highlights #fyp'
      );
      setSelectedPlatform(clip.aspectRatio === '9:16' ? 'tiktok' : 'x');
      setPublishedConfirmation(null);
    }
  }, [clip]);

  if (!isOpen || !clip) return null;

  const parsedHashtags = hashtagsText
    .split(/\s+/)
    .map((t) => t.trim())
    .filter(Boolean)
    .map((t) => (t.startsWith('#') ? t : `#${t}`));

  const fullCaptionPreview = `${caption.trim()} ${parsedHashtags.join(' ')}`.trim();
  const validation = validateClipForPlatform(
    selectedPlatform,
    clip.durationSec,
    clip.aspectRatio,
    fullCaptionPreview
  );

  const activeAccount = accounts.find((a) => a.platform === selectedPlatform);
  const clipPublicShareUrl = `${window.location.origin}/?clip=${encodeURIComponent(clip.id)}`;

  const handleGenerateAiCaption = async () => {
    setAiWriting(true);
    try {
      const res = await fetch('/api/ai/social-copy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clipTitle: clip.title,
          sourceTitle: clip.sourceTitle,
          platform: selectedPlatform,
          durationSec: clip.durationSec,
          language,
        }),
      });
      const data = await res.json();
      if (data.caption) setCaption(data.caption);
      if (Array.isArray(data.hashtags)) setHashtagsText(data.hashtags.join(' '));
    } catch {
      // Retain existing caption if network error
    } finally {
      setAiWriting(false);
    }
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(clipPublicShareUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    } catch {
      setCopiedLink(true);
    }
  };

  const handlePublishSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validation.compatible) return;

    const spec = SOCIAL_PLATFORM_SPECS[selectedPlatform];
    const post: ScheduledSocialPost = {
      id: `post-${Date.now()}`,
      clipId: clip.id,
      clipTitle: clip.title,
      platform: selectedPlatform,
      caption: caption.trim(),
      hashtags: parsedHashtags,
      scheduledFor: scheduleMode === 'now' ? new Date().toISOString() : scheduleDateTime,
      status: scheduleMode === 'now' ? 'published' : 'scheduled',
    };

    onPublishOrSchedule(post);
    setPublishedConfirmation(
      scheduleMode === 'now'
        ? `Published "${clip.title}" to ${spec.name}!`
        : `Scheduled "${clip.title}" for ${spec.name} on ${scheduleDateTime.replace('T', ' ')}.`
    );
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="social-share-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 backdrop-blur-xs p-4 overflow-y-auto"
    >
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xl w-full max-w-2xl overflow-hidden my-auto">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 id="social-share-modal-title" className="text-lg font-bold text-slate-900">
              {language === 'id'
                ? 'Publikasi & Integrasi Media Sosial'
                : 'Publish & Share Clip to Social Media'}
            </h3>
            <p className="text-xs text-slate-500 font-tabular mt-0.5">
              {clip.title} · {formatTimestamp(clip.startSec)}–{formatTimestamp(clip.endSec)} ·{' '}
              {clip.format} {clip.quality} ({clip.aspectRatio})
            </p>
          </div>
          <button
            type="button"
            aria-label="Close social publishing modal"
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handlePublishSubmit} className="p-6 space-y-5">
          {/* Platform Selector Tabs */}
          <div>
            <span className="block text-xs font-semibold text-slate-700 mb-2">
              1. Select Destination Platform
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              {(Object.keys(SOCIAL_PLATFORM_SPECS) as SocialPlatformId[]).map((pid) => {
                const spec = SOCIAL_PLATFORM_SPECS[pid];
                const acc = accounts.find((a) => a.platform === pid);
                const active = selectedPlatform === pid;
                return (
                  <button
                    key={pid}
                    type="button"
                    onClick={() => {
                      setSelectedPlatform(pid);
                      setPublishedConfirmation(null);
                    }}
                    className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                      active
                        ? 'border-[#4F6EF7] bg-[#4F6EF7]/5 ring-1 ring-[#4F6EF7]'
                        : 'border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <p className="text-xs font-semibold text-slate-900 truncate">{spec.name}</p>
                    <p className="text-[11px] text-slate-500 mt-0.5 truncate">
                      {acc?.connected ? acc.handle : 'Not linked'}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Account Connection Bar */}
          <div className="p-3.5 rounded-xl bg-[#F7F8FA] flex flex-wrap items-center justify-between gap-3">
            <div className="text-xs">
              <span className="font-semibold text-slate-900">
                {SOCIAL_PLATFORM_SPECS[selectedPlatform].name} Account:{' '}
              </span>
              {activeAccount?.connected ? (
                <span className="text-emerald-700 font-medium">
                  Connected as {activeAccount.handle} ({activeAccount.followers})
                </span>
              ) : (
                <span className="text-slate-500">
                  Connect your creator channel for direct 1-click API publishing
                </span>
              )}
            </div>
            <button
              type="button"
              onClick={() => onToggleConnectAccount(selectedPlatform)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${
                activeAccount?.connected
                  ? 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
                  : 'bg-[#4F6EF7] text-white hover:bg-[#3D5CE5]'
              }`}
            >
              {activeAccount?.connected ? 'Disconnect' : `Connect ${SOCIAL_PLATFORM_SPECS[selectedPlatform].name}`}
            </button>
          </div>

          {/* Platform Validation Status */}
          {(validation.errors.length > 0 || validation.warnings.length > 0) && (
            <div className="space-y-1.5">
              {validation.errors.map((err) => (
                <div
                  key={err}
                  className="p-2.5 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700 flex items-center gap-2"
                >
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{err}</span>
                </div>
              ))}
              {validation.warnings.map((warn) => (
                <div
                  key={warn}
                  className="p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-800 flex items-center gap-2"
                >
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{warn}</span>
                </div>
              ))}
            </div>
          )}

          {/* AI Caption & Hashtag Composer */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label htmlFor="social-caption-input" className="text-xs font-semibold text-slate-700">
                2. Post Caption &amp; Viral Hook
              </label>
              <button
                type="button"
                disabled={aiWriting}
                onClick={handleGenerateAiCaption}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#4F6EF7] hover:underline cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>{aiWriting ? 'Generating with Gemini AI...' : 'Generate AI Caption & Tags'}</span>
              </button>
            </div>

            <textarea
              id="social-caption-input"
              rows={3}
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              className="w-full rounded-xl border border-slate-200 p-3 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#4F6EF7]"
              placeholder="Write a hook for your clip..."
            />

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-center">
              <div className="sm:col-span-2">
                <label htmlFor="social-hashtags-input" className="sr-only">
                  Hashtags
                </label>
                <input
                  id="social-hashtags-input"
                  type="text"
                  value={hashtagsText}
                  onChange={(e) => setHashtagsText(e.target.value)}
                  className="w-full h-10 px-3 rounded-lg border border-slate-200 text-xs font-mono text-[#4F6EF7] focus:outline-none focus:ring-2 focus:ring-[#4F6EF7]"
                  placeholder="#viral #shorts #tiktok"
                />
              </div>
              <div className="text-right font-tabular text-xs text-slate-500">
                {fullCaptionPreview.length} / {SOCIAL_PLATFORM_SPECS[selectedPlatform].maxCaptionChars} chars
              </div>
            </div>
          </div>

          {/* Schedule Toggle */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
            <div className="flex items-center gap-2 bg-[#F7F8FA] p-1 rounded-lg">
              <button
                type="button"
                onClick={() => setScheduleMode('now')}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold cursor-pointer ${
                  scheduleMode === 'now' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
                }`}
              >
                Publish Immediately
              </button>
              <button
                type="button"
                onClick={() => setScheduleMode('later')}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold inline-flex items-center gap-1 cursor-pointer ${
                  scheduleMode === 'later' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
                }`}
              >
                <Calendar className="w-3.5 h-3.5" />
                <span>Schedule Post</span>
              </button>
            </div>

            {scheduleMode === 'later' && (
              <input
                type="datetime-local"
                aria-label="Scheduled publish date and time"
                value={scheduleDateTime}
                onChange={(e) => setScheduleDateTime(e.target.value)}
                className="h-9 px-3 rounded-lg border border-slate-200 text-xs font-tabular text-slate-800"
              />
            )}
          </div>

          {publishedConfirmation && (
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs font-medium text-emerald-800 flex items-center gap-2">
              <Check className="w-4 h-4 shrink-0 text-emerald-600" />
              <span>{publishedConfirmation}</span>
            </div>
          )}

          {/* Direct Web Intents & Primary Submit Row */}
          <div className="pt-4 border-t border-slate-100 space-y-3.5">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <span className="text-xs font-medium text-slate-500">Quick Web Share:</span>
              <div className="flex items-center gap-2 flex-wrap">
                <a
                  href={buildSocialShareIntentUrl('x', clipPublicShareUrl, caption, parsedHashtags)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-xs font-medium text-slate-700"
                >
                  <span>Post on X</span>
                  <ExternalLink className="w-3 h-3" />
                </a>

                <a
                  href={buildSocialShareIntentUrl(
                    'facebook',
                    clipPublicShareUrl,
                    caption,
                    parsedHashtags
                  )}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-xs font-medium text-slate-700"
                >
                  <span>Facebook</span>
                  <ExternalLink className="w-3 h-3" />
                </a>

                <a
                  href={buildSocialShareIntentUrl(
                    'whatsapp',
                    clipPublicShareUrl,
                    caption,
                    parsedHashtags
                  )}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-xs font-medium text-slate-700"
                >
                  <span>WhatsApp</span>
                  <ExternalLink className="w-3 h-3" />
                </a>

                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-xs font-medium text-slate-700 cursor-pointer"
                >
                  {copiedLink ? (
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                  ) : (
                    <Link2 className="w-3.5 h-3.5" />
                  )}
                  <span>{copiedLink ? 'Copied!' : 'Copy Link'}</span>
                </button>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-1">
              <button
                type="button"
                onClick={() => triggerClipDownload(clip)}
                className="px-4 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-xs font-semibold text-slate-700 inline-flex items-center gap-1.5 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download File</span>
              </button>

              <button
                type="submit"
                disabled={!validation.compatible}
                className="px-5 py-2.5 rounded-xl bg-[#4F6EF7] hover:bg-[#3D5CE5] disabled:opacity-50 text-white text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
                <span>
                  {scheduleMode === 'now'
                    ? `Publish to ${SOCIAL_PLATFORM_SPECS[selectedPlatform].name}`
                    : `Schedule on ${SOCIAL_PLATFORM_SPECS[selectedPlatform].name}`}
                </span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
