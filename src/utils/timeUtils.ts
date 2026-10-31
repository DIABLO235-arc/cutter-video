import type { AISegmentSuggestion, ExportFormat, QualityTier } from '../types';

export interface HMSParts {
  hours: string;
  minutes: string;
  seconds: string;
}

/**
 * Formats seconds into HH:MM:SS string (always 2-digit padded parts).
 */
export function formatTimestamp(totalSeconds: number): string {
  const safe = Math.max(0, Math.floor(Number.isFinite(totalSeconds) ? totalSeconds : 0));
  const hrs = Math.floor(safe / 3600);
  const mins = Math.floor((safe % 3600) / 60);
  const secs = safe % 60;
  return [hrs, mins, secs].map((v) => String(v).padStart(2, '0')).join(':');
}

/**
 * Splits seconds into separate 2-digit strings for HH : MM : SS inputs.
 */
export function secondsToHMSParts(totalSeconds: number): HMSParts {
  const formatted = formatTimestamp(totalSeconds);
  const [hours, minutes, seconds] = formatted.split(':');
  return { hours, minutes, seconds };
}

/**
 * Formats player compact time like 0:00 or 1:11:32 matching ClipsCutter's player bar.
 */
export function formatPlayerTime(totalSeconds: number): string {
  const safe = Math.max(0, Math.floor(Number.isFinite(totalSeconds) ? totalSeconds : 0));
  const hrs = Math.floor(safe / 3600);
  const mins = Math.floor((safe % 3600) / 60);
  const secs = safe % 60;
  if (hrs > 0) {
    return `${hrs}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }
  return `${mins}:${String(secs).padStart(2, '0')}`;
}

/**
 * Parses HH:MM:SS or MM:SS or SS string into total seconds. Returns null if invalid.
 */
export function parseTimestamp(input: string): number | null {
  const cleaned = input.trim();
  if (!cleaned) return null;
  const parts = cleaned.split(':').map((p) => p.trim());
  if (parts.length > 3 || parts.some((p) => !/^\d+$/.test(p))) {
    return null;
  }
  const nums = parts.map((p) => Number(p));
  if (nums.length === 3) {
    const [h, m, s] = nums;
    if (m >= 60 || s >= 60) return null;
    return h * 3600 + m * 60 + s;
  }
  if (nums.length === 2) {
    const [m, s] = nums;
    if (s >= 60) return null;
    return m * 60 + s;
  }
  return nums[0];
}

/**
 * Converts individual HH, MM, SS string inputs into clamped seconds.
 */
export function hmsPartsToSeconds(hours: string, minutes: string, seconds: string): number {
  const h = Math.max(0, parseInt(hours || '0', 10) || 0);
  const m = Math.min(59, Math.max(0, parseInt(minutes || '0', 10) || 0));
  const s = Math.min(59, Math.max(0, parseInt(seconds || '0', 10) || 0));
  return h * 3600 + m * 60 + s;
}

/**
 * Clamps start and end timestamps within [0, maxDuration] ensuring at least minGapSec length.
 */
export function clampTrimRange(
  startSec: number,
  endSec: number,
  maxDurationSec: number,
  minGapSec = 1
): { startSec: number; endSec: number } {
  const safeMax = Math.max(minGapSec, Math.floor(maxDurationSec));
  let s = Math.max(0, Math.min(Math.floor(startSec), safeMax - minGapSec));
  let e = Math.max(s + minGapSec, Math.min(Math.floor(endSec), safeMax));
  if (e - s < minGapSec) {
    s = Math.max(0, e - minGapSec);
  }
  return { startSec: s, endSec: e };
}

/**
 * Extracts an 11-character YouTube video ID from standard watch, short, embed, live, or youtu.be URLs.
 */
export function extractYouTubeId(rawUrl: string): string | null {
  const trimmed = rawUrl.trim();
  if (!trimmed) return null;

  // Direct 11-char ID only if explicitly valid ID pattern without spaces/slashes
  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) {
    return trimmed;
  }

  try {
    const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
    const parsed = new URL(withProtocol);
    const host = parsed.hostname.replace(/^www\./i, '').toLowerCase();

    if (host === 'youtu.be') {
      const id = parsed.pathname.split('/').filter(Boolean)[0];
      return id && /^[a-zA-Z0-9_-]{11}$/.test(id) ? id : null;
    }

    if (host === 'youtube.com' || host === 'm.youtube.com' || host === 'music.youtube.com') {
      const vParam = parsed.searchParams.get('v');
      if (vParam && /^[a-zA-Z0-9_-]{11}$/.test(vParam)) {
        return vParam;
      }
      const segments = parsed.pathname.split('/').filter(Boolean);
      if (
        segments.length >= 2 &&
        ['shorts', 'embed', 'live', 'v'].includes(segments[0].toLowerCase())
      ) {
        const candidate = segments[1];
        return /^[a-zA-Z0-9_-]{11}$/.test(candidate) ? candidate : null;
      }
    }
  } catch {
    return null;
  }

  return null;
}

/**
 * Estimates output clip file size in MB based on stream-copy bitrate and duration.
 */
export function estimateClipFileSizeMb(
  durationSec: number,
  format: ExportFormat,
  quality: QualityTier
): number {
  const safeDuration = Math.max(1, durationSec);
  const isAudio = ['MP3', 'M4A', 'OGG', 'OPUS'].includes(format);

  if (isAudio) {
    const audioBitrateKbps = format === 'OPUS' ? 96 : format === 'OGG' ? 128 : 160;
    const sizeMb = (safeDuration * audioBitrateKbps) / 8 / 1024;
    return Math.max(0.1, Number(sizeMb.toFixed(2)));
  }

  const qualityBitrateMbps: Record<QualityTier, number> = {
    '2160p': 18.0,
    '1440p': 10.0,
    '1080p60': 6.5,
    '720p60': 4.2,
    '720p': 2.8,
    '480p': 1.4,
    '360p': 0.85,
  };

  const baseMbps = qualityBitrateMbps[quality] ?? 1.2;
  const formatFactor = format === 'WEBM' ? 0.82 : 1.0;
  const sizeMb = (safeDuration * baseMbps * formatFactor) / 8;
  return Math.max(0.2, Number(sizeMb.toFixed(1)));
}

/**
 * Generates deterministic, bounded AI highlight segments when offline or as baseline validation.
 */
export function buildDeterministicHighlights(
  videoTitle: string,
  durationSec: number,
  targetClipSec = 45
): AISegmentSuggestion[] {
  const safeTotal = Math.max(15, Math.floor(durationSec));
  const clipLen = Math.min(targetClipSec, Math.max(10, Math.floor(safeTotal * 0.22)));

  const anchors = [0.06, 0.34, 0.62, 0.82];
  const templates = [
    {
      suffix: 'Opening Viral Hook & Reaction',
      reason: 'High-energy opening hook with immediate visual payoff in the first 3 seconds.',
      platform: 'tiktok' as const,
      aspect: '9:16' as const,
      tags: ['#viralclips', '#fyp', '#highlights', '#clipscutter'],
    },
    {
      suffix: 'Peak Action & Funniest Moment',
      reason: 'Strongest audience retention spike and rapid pacing ideal for Shorts & Reels.',
      platform: 'shorts' as const,
      aspect: '9:16' as const,
      tags: ['#youtubeshorts', '#trending', '#bestmoments', '#ai'],
    },
    {
      suffix: 'Core Insight & Key Takeaway',
      reason: 'Self-contained explanation segment that drives shares and saves.',
      platform: 'reels' as const,
      aspect: '9:16' as const,
      tags: ['#reels', '#creator', '#insight', '#videoediting'],
    },
    {
      suffix: 'Climax & Final Reveal',
      reason: 'Memorable payoff clip formatted for social discussion threads.',
      platform: 'x' as const,
      aspect: '16:9' as const,
      tags: ['#mustwatch', '#recap', '#viral', '#clips'],
    },
  ];

  return templates.map((tpl, idx) => {
    const rawStart = Math.floor(safeTotal * anchors[idx]);
    const clamped = clampTrimRange(rawStart, rawStart + clipLen, safeTotal, 5);
    const shortTitle = videoTitle.length > 36 ? `${videoTitle.slice(0, 36).trim()}…` : videoTitle;

    return {
      id: `ai-seg-${idx + 1}`,
      title: `${tpl.suffix}`,
      startSec: clamped.startSec,
      endSec: clamped.endSec,
      hookReason: tpl.reason,
      suggestedCaption: `Watch this highlight from "${shortTitle}" (${formatPlayerTime(clamped.startSec)} - ${formatPlayerTime(clamped.endSec)})! What would you do here?`,
      hashtags: tpl.tags,
      recommendedAspect: tpl.aspect,
      bestPlatform: tpl.platform,
    };
  });
}
