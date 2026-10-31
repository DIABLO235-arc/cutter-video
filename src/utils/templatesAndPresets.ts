import type {
  AspectRatioMode,
  ExportFormat,
  QualityTier,
  SubtitleStyleId,
  SubtitleStylePreset,
  TrimSettings,
  VideoTemplate,
  WorkflowPreset,
} from '../types';
import { QUALITY_OPTIONS } from '../data/catalog';

export const BUILT_IN_TEMPLATES: VideoTemplate[] = [
  {
    id: 'clean-raw',
    name: 'Original Clean (Tanpa Frame)',
    category: 'minimal',
    description: 'Tampilan bersih tanpa banner atas, cocok untuk arsip YouTube 16:9 murni.',
    aspectRatio: '16:9',
    headerTheme: 'none',
    defaultHookText: '',
    showProgressBar: false,
    defaultWatermark: '',
    recommendedSubtitleStyle: 'classic-box',
  },
  {
    id: 'viral-hook-916',
    name: 'TikTok Viral Hook 9:16',
    category: 'viral',
    description: 'Frame vertikal 9:16 dengan judul Hook kuning mencolok, progress bar, & karaoke.',
    aspectRatio: '9:16',
    headerTheme: 'yellow-impact',
    defaultHookText: 'TUNGGU SAMPAI AKHIR!',
    showProgressBar: true,
    defaultWatermark: '@vibeclip.studio',
    recommendedSubtitleStyle: 'hormozi-karaoke',
  },
  {
    id: 'podcast-studio-916',
    name: 'Podcast Creator 9:16',
    category: 'podcast',
    description: 'Tag topik elegan di bagian atas untuk kutipan podcast, edukasi, & interview.',
    aspectRatio: '9:16',
    headerTheme: 'podcast-tag',
    defaultHookText: 'INSIGHT PENTING HARI INI',
    showProgressBar: true,
    defaultWatermark: '@vibeclip.studio',
    recommendedSubtitleStyle: 'clean-pop',
  },
  {
    id: 'gaming-streamer-916',
    name: 'Gaming & Stream Highlight',
    category: 'gaming',
    description: 'Header Royal Blue tegas untuk momen lucu livestream, gaming, & reaksi.',
    aspectRatio: '9:16',
    headerTheme: 'royal-banner',
    defaultHookText: 'MOMEN PALING KACAU!',
    showProgressBar: true,
    defaultWatermark: '@vibeclip.id',
    recommendedSubtitleStyle: 'hormozi-karaoke',
  },
  {
    id: 'square-quote-1x1',
    name: 'Feed Quote Square 1:1',
    category: 'minimal',
    description: 'Rasio kotak 1:1 dengan label kaca minimalis untuk Instagram Feed, X & LinkedIn.',
    aspectRatio: '1:1',
    headerTheme: 'glass-minimal',
    defaultHookText: 'KUTIPAN TERBAIK',
    showProgressBar: true,
    defaultWatermark: '@vibeclip_ai',
    recommendedSubtitleStyle: 'cinema-yellow',
  },
  {
    id: 'cinema-letterbox',
    name: 'Cinema Letterbox 16:9',
    category: 'cinema',
    description: 'Bar sinematik hitam atas-bawah dengan subtitle kuning bergaya film dokumenter.',
    aspectRatio: '16:9',
    headerTheme: 'cinema-bars',
    defaultHookText: '',
    showProgressBar: false,
    defaultWatermark: '',
    recommendedSubtitleStyle: 'cinema-yellow',
  },
];

export const SUBTITLE_STYLE_PRESETS: SubtitleStylePreset[] = [
  {
    id: 'hormozi-karaoke',
    name: 'Hormozi Karaoke',
    description: 'Sorotan kata aktif berwarna kuning real-time mengikuti suara pembicara.',
    wordByWordHighlight: true,
    uppercase: true,
    position: 'center-lower',
  },
  {
    id: 'clean-pop',
    name: 'Clean Creator Pop',
    description: 'Teks putih tebal dengan highlight kata aktif biru Royal yang bersih.',
    wordByWordHighlight: true,
    uppercase: false,
    position: 'bottom',
  },
  {
    id: 'cinema-yellow',
    name: 'Cinema Yellow',
    description: 'Subtitle kuning sinematik kontras tinggi yang nyaman dibaca di semua layar.',
    wordByWordHighlight: false,
    uppercase: false,
    position: 'bottom',
  },
  {
    id: 'classic-box',
    name: 'Broadcast Box',
    description: 'Kotak latar gelap solid standar penyiaran TV & YouTube CC.',
    wordByWordHighlight: false,
    uppercase: false,
    position: 'bottom',
  },
  {
    id: 'glass-minimal',
    name: 'Minimalist Glass',
    description: 'Kapsul transparan lembut dengan sorotan kata aktif elegan untuk Reels.',
    wordByWordHighlight: true,
    uppercase: false,
    position: 'bottom',
  },
];

export const BUILT_IN_PRESETS: WorkflowPreset[] = [
  {
    id: 'preset-tiktok-viral',
    name: 'TikTok Viral 9:16 + Karaoke',
    description: 'MP4 · 9:16 · Hook Kuning + Subtitle Karaoke Kata-per-Kata (45s)',
    format: 'MP4',
    preferredQuality: '1080p60',
    aspectRatio: '9:16',
    templateId: 'viral-hook-916',
    hookText: 'TUNGGU SAMPAI AKHIR!',
    watermarkText: '@vibeclip.studio',
    autoCaptions: true,
    subtitleStyleId: 'hormozi-karaoke',
    targetDurationSec: 45,
  },
  {
    id: 'preset-shorts-60fps',
    name: 'YouTube Shorts Gaming 60fps',
    description: 'MP4 · 9:16 · Gaming Banner + Clean Creator Pop Subtitle (60s)',
    format: 'MP4',
    preferredQuality: '1080p60',
    aspectRatio: '9:16',
    templateId: 'gaming-streamer-916',
    hookText: 'DETIK-DETIK PALING PECAH!',
    watermarkText: '@VibeClipOfficial',
    autoCaptions: true,
    subtitleStyleId: 'clean-pop',
    targetDurationSec: 60,
  },
  {
    id: 'preset-reels-podcast',
    name: 'Reels Podcast Insight',
    description: 'MP4 · 9:16 · Podcast Header + Minimalist Subtitle (30s)',
    format: 'MP4',
    preferredQuality: '1080p60',
    aspectRatio: '9:16',
    templateId: 'podcast-studio-916',
    hookText: 'PELAJARAN PENTING HARI INI',
    watermarkText: '@vibeclip.id',
    autoCaptions: true,
    subtitleStyleId: 'glass-minimal',
    targetDurationSec: 30,
  },
  {
    id: 'preset-square-feed',
    name: 'X & LinkedIn Square 1:1',
    description: 'MP4 · 1:1 · Square Quote Frame + Cinema Yellow Subtitle (60s)',
    format: 'MP4',
    preferredQuality: '720p',
    aspectRatio: '1:1',
    templateId: 'square-quote-1x1',
    hookText: 'POIN UTAMA DARI VIDEO INI',
    watermarkText: '@vibeclip_ai',
    autoCaptions: true,
    subtitleStyleId: 'cinema-yellow',
    targetDurationSec: 60,
  },
  {
    id: 'preset-cinema-4k',
    name: 'Cinema 4K Master 16:9',
    description: 'MP4 · 16:9 · Cinema Letterbox + Subtitle Dokumenter',
    format: 'MP4',
    preferredQuality: '2160p',
    aspectRatio: '16:9',
    templateId: 'cinema-letterbox',
    hookText: '',
    watermarkText: '',
    autoCaptions: true,
    subtitleStyleId: 'cinema-yellow',
  },
];

export function getTemplateById(templateId: string): VideoTemplate {
  return BUILT_IN_TEMPLATES.find((t) => t.id === templateId) || BUILT_IN_TEMPLATES[0];
}

export function getSubtitleStyleById(styleId: SubtitleStyleId): SubtitleStylePreset {
  return SUBTITLE_STYLE_PRESETS.find((s) => s.id === styleId) || SUBTITLE_STYLE_PRESETS[0];
}

export function resolvePresetApplication(
  preset: WorkflowPreset,
  isPro: boolean,
  currentSettings: TrimSettings
): {
  format: ExportFormat;
  quality: QualityTier;
  settings: TrimSettings;
  downgradedFromProQuality: QualityTier | null;
} {
  const qOpt = QUALITY_OPTIONS.find((q) => q.value === preset.preferredQuality);
  const needsPro = Boolean(qOpt?.requiresPro);
  const resolvedQuality: QualityTier = !needsPro || isPro ? preset.preferredQuality : '360p';
  const tpl = getTemplateById(preset.templateId);

  return {
    format: preset.format,
    quality: resolvedQuality,
    downgradedFromProQuality: needsPro && !isPro ? preset.preferredQuality : null,
    settings: {
      ...currentSettings,
      aspectRatio: preset.aspectRatio,
      autoCaptions: preset.autoCaptions,
      templateId: tpl.id,
      hookText: preset.hookText,
      watermarkText: preset.watermarkText,
      showProgressBar: tpl.showProgressBar,
      subtitleStyleId: preset.subtitleStyleId,
      streamCopy: preset.aspectRatio === '16:9' && tpl.id === 'clean-raw',
    },
  };
}

export function buildCustomWorkflowPreset(params: {
  name: string;
  format: ExportFormat;
  quality: QualityTier;
  aspectRatio: AspectRatioMode;
  templateId: string;
  hookText: string;
  watermarkText: string;
  autoCaptions: boolean;
  subtitleStyleId: SubtitleStyleId;
  targetDurationSec?: number;
}): WorkflowPreset {
  const cleanName = params.name.trim().slice(0, 48);
  if (!cleanName) {
    throw new Error('Nama preset tidak boleh kosong.');
  }

  return {
    id: `custom-preset-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    name: cleanName,
    description: `${params.format} · ${params.aspectRatio} · ${params.quality}`,
    isCustom: true,
    format: params.format,
    preferredQuality: params.quality,
    aspectRatio: params.aspectRatio,
    templateId: params.templateId,
    hookText: params.hookText.trim().slice(0, 70),
    watermarkText: params.watermarkText.trim().slice(0, 36),
    autoCaptions: params.autoCaptions,
    subtitleStyleId: params.subtitleStyleId,
    targetDurationSec: params.targetDurationSec,
  };
}
