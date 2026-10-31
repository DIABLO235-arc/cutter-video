import type { AspectRatioMode, SocialPlatformId } from '../types';

export interface SocialPlatformSpec {
  id: SocialPlatformId;
  name: string;
  maxDurationSec: number;
  recommendedAspect: AspectRatioMode;
  maxCaptionChars: number;
  accentColor: string;
}

export const SOCIAL_PLATFORM_SPECS: Record<SocialPlatformId, SocialPlatformSpec> = {
  tiktok: {
    id: 'tiktok',
    name: 'TikTok',
    maxDurationSec: 600,
    recommendedAspect: '9:16',
    maxCaptionChars: 2200,
    accentColor: '#111827',
  },
  shorts: {
    id: 'shorts',
    name: 'YouTube Shorts',
    maxDurationSec: 180,
    recommendedAspect: '9:16',
    maxCaptionChars: 100,
    accentColor: '#DC2626',
  },
  reels: {
    id: 'reels',
    name: 'Instagram Reels',
    maxDurationSec: 90,
    recommendedAspect: '9:16',
    maxCaptionChars: 2200,
    accentColor: '#DB2777',
  },
  x: {
    id: 'x',
    name: 'X (Twitter)',
    maxDurationSec: 140,
    recommendedAspect: '16:9',
    maxCaptionChars: 280,
    accentColor: '#0F172A',
  },
  facebook: {
    id: 'facebook',
    name: 'Facebook Reels',
    maxDurationSec: 90,
    recommendedAspect: '9:16',
    maxCaptionChars: 2200,
    accentColor: '#1D4ED8',
  },
};

export interface SocialValidationResult {
  compatible: boolean;
  warnings: string[];
  errors: string[];
}

export function validateClipForPlatform(
  platform: SocialPlatformId,
  durationSec: number,
  aspectRatio: AspectRatioMode,
  captionText: string
): SocialValidationResult {
  const spec = SOCIAL_PLATFORM_SPECS[platform];
  const warnings: string[] = [];
  const errors: string[] = [];

  if (durationSec <= 0) {
    errors.push('Clip duration must be at least 1 second.');
  } else if (durationSec > spec.maxDurationSec) {
    errors.push(
      `${spec.name} supports clips up to ${spec.maxDurationSec}s (current clip is ${durationSec}s).`
    );
  }

  if (aspectRatio !== spec.recommendedAspect) {
    warnings.push(
      `Recommended aspect ratio for ${spec.name} is ${spec.recommendedAspect} (currently ${aspectRatio}).`
    );
  }

  if (captionText.length > spec.maxCaptionChars) {
    errors.push(
      `Caption exceeds ${spec.name} limit of ${spec.maxCaptionChars} characters (${captionText.length}/${spec.maxCaptionChars}).`
    );
  }

  return {
    compatible: errors.length === 0,
    warnings,
    errors,
  };
}

export function buildSocialShareIntentUrl(
  platform: 'x' | 'facebook' | 'whatsapp' | 'telegram',
  shareUrl: string,
  caption: string,
  hashtags: string[] = []
): string {
  const cleanTags = hashtags.map((t) => (t.startsWith('#') ? t : `#${t}`)).join(' ');
  const fullText = [caption.trim(), cleanTags].filter(Boolean).join(' ');

  switch (platform) {
    case 'x':
      return `https://twitter.com/intent/tweet?text=${encodeURIComponent(fullText)}&url=${encodeURIComponent(shareUrl)}`;
    case 'facebook':
      return `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}&quote=${encodeURIComponent(fullText)}`;
    case 'whatsapp':
      return `https://api.whatsapp.com/send?text=${encodeURIComponent(`${fullText} ${shareUrl}`)}`;
    case 'telegram':
      return `https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(fullText)}`;
  }
}
