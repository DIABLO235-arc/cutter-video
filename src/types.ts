export type AppPage = 'home' | 'clips' | 'api' | 'pricing' | 'privacy' | 'contact';

export type ExportFormat = 'MP4' | 'WEBM' | 'MP3' | 'M4A' | 'OGG' | 'OPUS';

export type QualityTier = '2160p' | '1440p' | '1080p60' | '720p60' | '720p' | '480p' | '360p';

export type AspectRatioMode = '16:9' | '9:16' | '1:1';

export type SocialPlatformId = 'tiktok' | 'shorts' | 'reels' | 'x' | 'facebook';

export type TemplateHeaderTheme =
  | 'none'
  | 'royal-banner'
  | 'yellow-impact'
  | 'glass-minimal'
  | 'podcast-tag'
  | 'cinema-bars';

export type SubtitleStyleId =
  | 'hormozi-karaoke'
  | 'clean-pop'
  | 'cinema-yellow'
  | 'classic-box'
  | 'glass-minimal';

export interface FormatOption {
  value: ExportFormat;
  label: string;
  category: 'video' | 'audio';
  mimeType: string;
  extension: string;
  description: string;
}

export interface QualityOption {
  value: QualityTier;
  label: string;
  requiresPro: boolean;
  bitrateMbps: number;
}

export interface VideoChapter {
  title: string;
  startSec: number;
  endSec: number;
}

export interface VideoSource {
  id: string;
  type: 'youtube' | 'upload' | 'demo';
  title: string;
  author: string;
  url: string;
  youtubeId?: string;
  objectUrl?: string;
  demoSceneId?: 'supermarket' | 'podcast' | 'tech_keynote';
  thumbnailUrl?: string;
  durationSec: number;
  chapters?: VideoChapter[];
  transcriptSummary?: string;
}

export interface AISegmentSuggestion {
  id: string;
  title: string;
  startSec: number;
  endSec: number;
  hookReason: string;
  suggestedCaption: string;
  hashtags: string[];
  recommendedAspect: AspectRatioMode;
  bestPlatform: SocialPlatformId;
}

export interface VideoTemplate {
  id: string;
  name: string;
  category: 'viral' | 'podcast' | 'gaming' | 'cinema' | 'minimal';
  description: string;
  aspectRatio: AspectRatioMode;
  headerTheme: TemplateHeaderTheme;
  defaultHookText: string;
  showProgressBar: boolean;
  defaultWatermark: string;
  recommendedSubtitleStyle: SubtitleStyleId;
}

export interface SubtitleStylePreset {
  id: SubtitleStyleId;
  name: string;
  description: string;
  wordByWordHighlight: boolean;
  uppercase: boolean;
  position: 'bottom' | 'center-lower';
}

export interface WorkflowPreset {
  id: string;
  name: string;
  description: string;
  isCustom?: boolean;
  format: ExportFormat;
  preferredQuality: QualityTier;
  aspectRatio: AspectRatioMode;
  templateId: string;
  hookText: string;
  watermarkText: string;
  autoCaptions: boolean;
  subtitleStyleId: SubtitleStyleId;
  targetDurationSec?: number;
}

export interface SubtitleCue {
  id: string;
  startSec: number;
  endSec: number;
  text: string;
  speaker?: string;
  confidence?: number;
}

export interface TrimSettings {
  aspectRatio: AspectRatioMode;
  autoCaptions: boolean;
  fadeAudio: boolean;
  streamCopy: boolean;
  templateId: string;
  hookText: string;
  watermarkText: string;
  showProgressBar: boolean;
  subtitleStyleId: SubtitleStyleId;
}

export interface CreatedClip {
  id: string;
  sourceTitle: string;
  sourceType: 'youtube' | 'upload' | 'demo';
  youtubeId?: string;
  demoSceneId?: 'supermarket' | 'podcast' | 'tech_keynote';
  title: string;
  startSec: number;
  endSec: number;
  durationSec: number;
  format: ExportFormat;
  quality: QualityTier;
  aspectRatio: AspectRatioMode;
  autoCaptions: boolean;
  templateName?: string;
  subtitleStyleId?: SubtitleStyleId;
  subtitleCount?: number;
  subtitles?: SubtitleCue[];
  estimatedSizeMb: number;
  createdAt: string;
  downloadUrl?: string;
  caption?: string;
  hashtags?: string[];
  aiGenerated?: boolean;
}

export interface ConnectedSocialAccount {
  platform: SocialPlatformId;
  handle: string;
  connected: boolean;
  followers: string;
}

export interface ScheduledSocialPost {
  id: string;
  clipId: string;
  clipTitle: string;
  platform: SocialPlatformId;
  caption: string;
  hashtags: string[];
  scheduledFor: string;
  status: 'published' | 'scheduled';
}
