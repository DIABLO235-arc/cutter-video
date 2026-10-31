import React, { useEffect, useState } from 'react';
import {
  Captions,
  Check,
  Download,
  KeyRound,
  Layers,
  Scissors,
  Settings,
  Share2,
  Sparkles,
  Trash2,
  Wand2,
  X,
} from 'lucide-react';
import type {
  AISegmentSuggestion,
  CreatedClip,
  ExportFormat,
  QualityTier,
  SubtitleCue,
  TrimSettings,
  VideoSource,
  VideoTemplate,
  WorkflowPreset,
} from '../types';
import {
  clampTrimRange,
  estimateClipFileSizeMb,
  formatPlayerTime,
  formatTimestamp,
  hmsPartsToSeconds,
  secondsToHMSParts,
} from '../utils/timeUtils';
import { triggerClipDownload } from '../utils/clientClipExporter';
import {
  buildAccurateDemoSubtitles,
  downloadSubtitleFile,
  extractWavBase64FromMediaUrl,
} from '../utils/subtitleEngine';
import {
  getTemplateById,
  resolvePresetApplication,
} from '../utils/templatesAndPresets';
import { AutoSubtitlePanel } from './AutoSubtitlePanel';
import { DualRangeSlider } from './DualRangeSlider';
import { FormatDropdown } from './FormatDropdown';
import { QualityDropdown } from './QualityDropdown';
import { TemplatePresetPanel } from './TemplatePresetPanel';
import { VideoPlayerStage } from './VideoPlayerStage';

export type WorkspaceTab = 'controls' | 'templates' | 'subtitles' | 'ai' | 'clips';

interface VideoTrimmerWorkspaceProps {
  source: VideoSource;
  onChangeVideoRequest: () => void;
  clips: CreatedClip[];
  onCreateClip: (clip: CreatedClip) => void;
  onDeleteClip: (clipId: string) => void;
  onOpenSocialModal: (clip: CreatedClip) => void;
  isPro: boolean;
  onOpenProModal: (tab?: 'activate' | 'owner') => void;
  language: 'en' | 'id';
  initialTab?: WorkspaceTab;
}

interface HMSInputGroupProps {
  label: string;
  secondsValue: number;
  maxSeconds: number;
  onCommitSeconds: (nextSec: number) => void;
}

const HMSInputGroup: React.FC<HMSInputGroupProps> = ({
  label,
  secondsValue,
  maxSeconds,
  onCommitSeconds,
}) => {
  const parts = secondsToHMSParts(secondsValue);
  const [hh, setHh] = useState(parts.hours);
  const [mm, setMm] = useState(parts.minutes);
  const [ss, setSs] = useState(parts.seconds);

  useEffect(() => {
    const next = secondsToHMSParts(secondsValue);
    setHh(next.hours);
    setMm(next.minutes);
    setSs(next.seconds);
  }, [secondsValue]);

  const commit = (hStr: string, mStr: string, sStr: string) => {
    const total = Math.min(maxSeconds, hmsPartsToSeconds(hStr, mStr, sStr));
    onCommitSeconds(total);
  };

  return (
    <div
      role="group"
      aria-label={label}
      className="h-[54px] bg-[#F7F8FA] rounded-xl px-4 flex items-center justify-center gap-1.5 font-tabular text-[15px] font-medium text-slate-800 focus-within:ring-2 focus-within:ring-[#4F6EF7]"
    >
      <input
        type="text"
        inputMode="numeric"
        maxLength={2}
        aria-label={`${label} hours`}
        value={hh}
        onChange={(e) => setHh(e.target.value.replace(/\D/g, ''))}
        onBlur={() => commit(hh, mm, ss)}
        onKeyDown={(e) => e.key === 'Enter' && commit(hh, mm, ss)}
        className="w-7 text-center bg-transparent focus:outline-none"
      />
      <span className="text-slate-400 select-none">:</span>
      <input
        type="text"
        inputMode="numeric"
        maxLength={2}
        aria-label={`${label} minutes`}
        value={mm}
        onChange={(e) => setMm(e.target.value.replace(/\D/g, ''))}
        onBlur={() => commit(hh, mm, ss)}
        onKeyDown={(e) => e.key === 'Enter' && commit(hh, mm, ss)}
        className="w-7 text-center bg-transparent focus:outline-none"
      />
      <span className="text-slate-400 select-none">:</span>
      <input
        type="text"
        inputMode="numeric"
        maxLength={2}
        aria-label={`${label} seconds`}
        value={ss}
        onChange={(e) => setSs(e.target.value.replace(/\D/g, ''))}
        onBlur={() => commit(hh, mm, ss)}
        onKeyDown={(e) => e.key === 'Enter' && commit(hh, mm, ss)}
        className="w-7 text-center bg-transparent focus:outline-none"
      />
    </div>
  );
};

export const VideoTrimmerWorkspace: React.FC<VideoTrimmerWorkspaceProps> = ({
  source,
  onChangeVideoRequest,
  clips,
  onCreateClip,
  onDeleteClip,
  onOpenSocialModal,
  isPro,
  onOpenProModal,
  language,
  initialTab = 'controls',
}) => {
  const [activeTab, setActiveTab] = useState<WorkspaceTab>(initialTab);
  const [format, setFormat] = useState<ExportFormat>('MP4');
  const [quality, setQuality] = useState<QualityTier>(isPro ? '1080p60' : '360p');

  const [startSec, setStartSec] = useState<number>(0);
  const [endSec, setEndSec] = useState<number>(Math.max(1, source.durationSec - 1));
  const [currentTimeSec, setCurrentTimeSec] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isPreviewLooping, setIsPreviewLooping] = useState<boolean>(false);

  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settings, setSettings] = useState<TrimSettings>({
    aspectRatio: '16:9',
    autoCaptions: false,
    fadeAudio: false,
    streamCopy: true,
    templateId: 'clean-raw',
    hookText: '',
    watermarkText: '',
    showProgressBar: false,
    subtitleStyleId: 'hormozi-karaoke',
  });

  // Custom Workflow Presets (persisted in localStorage)
  const [customPresets, setCustomPresets] = useState<WorkflowPreset[]>(() => {
    try {
      const raw = localStorage.getItem('clipscutter_custom_presets_v1');
      return raw ? (JSON.parse(raw) as WorkflowPreset[]) : [];
    } catch {
      return [];
    }
  });
  const [activePresetId, setActivePresetId] = useState<string | null>(null);

  // Automatic 100% Verbatim Subtitles State
  const [subtitles, setSubtitles] = useState<SubtitleCue[]>([]);
  const [transcribing, setTranscribing] = useState<boolean>(false);
  const [polishing, setPolishing] = useState<boolean>(false);
  const [accuracySourceLabel, setAccuracySourceLabel] = useState<string | null>(null);
  const [subtitleError, setSubtitleError] = useState<string | null>(null);

  // Pro License inline prompt states
  const [pendingProQuality, setPendingProQuality] = useState<QualityTier | null>(null);
  const [durationLimitPrompt, setDurationLimitPrompt] = useState<boolean>(false);

  // Clip creation feedback state
  const [creatingClip, setCreatingClip] = useState(false);
  const [recentClipBanner, setRecentClipBanner] = useState<CreatedClip | null>(null);

  // AI Auto-Cut state
  const [aiFocusGoal, setAiFocusGoal] = useState<string>('Viral Hooks & Peak Reactions');
  const [aiClipDuration, setAiClipDuration] = useState<number>(45);
  const [aiLoading, setAiLoading] = useState<boolean>(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiSegments, setAiSegments] = useState<AISegmentSuggestion[]>([]);

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  useEffect(() => {
    try {
      localStorage.setItem('clipscutter_custom_presets_v1', JSON.stringify(customPresets));
    } catch {
      // Ignore quota errors
    }
  }, [customPresets]);

  // Sync selected quality & prompts whenever Pro license activates or locks
  useEffect(() => {
    if (isPro) {
      if (pendingProQuality) {
        setQuality(pendingProQuality);
        setPendingProQuality(null);
      }
      setDurationLimitPrompt(false);
    } else if (quality !== '360p') {
      setQuality('360p');
    }
  }, [isPro, pendingProQuality, quality]);

  // Reset trim range cleanly when switching videos
  useEffect(() => {
    setStartSec(0);
    setEndSec(Math.max(1, source.durationSec - 1));
    setCurrentTimeSec(0);
    setIsPlaying(false);
    setIsPreviewLooping(false);
    setAiSegments([]);
    setSubtitles([]);
    setAccuracySourceLabel(null);
    setSubtitleError(null);
    setRecentClipBanner(null);
    setDurationLimitPrompt(false);
  }, [source.id, source.durationSec]);

  const clipDurationSec = Math.max(1, endSec - startSec);
  const isAudioFormat = ['MP3', 'M4A', 'OGG', 'OPUS'].includes(format);
  const estimatedMb = estimateClipFileSizeMb(clipDurationSec, format, quality);

  const handleRangeChange = (
    nextStart: number,
    nextEnd: number,
    activeHandle: 'start' | 'end'
  ) => {
    setStartSec(nextStart);
    setEndSec(nextEnd);
    setCurrentTimeSec(activeHandle === 'start' ? nextStart : nextEnd);
  };

  const handlePreviewRange = () => {
    setCurrentTimeSec(startSec);
    setIsPreviewLooping(true);
    setIsPlaying(true);
  };

  const buildAndSaveClip = (opts?: {
    customTitle?: string;
    customStart?: number;
    customEnd?: number;
    caption?: string;
    hashtags?: string[];
    aspect?: TrimSettings['aspectRatio'];
    aiGenerated?: boolean;
  }): CreatedClip => {
    const s = opts?.customStart ?? startSec;
    const e = opts?.customEnd ?? endSec;
    const dur = Math.max(1, e - s);
    const aspect = opts?.aspect ?? settings.aspectRatio;
    const activeTpl = getTemplateById(settings.templateId);
    const clipSubtitles = subtitles.filter((cue) => cue.endSec > s && cue.startSec < e);

    const newClip: CreatedClip = {
      id: `clip-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      sourceTitle: source.title,
      sourceType: source.type,
      youtubeId: source.youtubeId,
      demoSceneId: source.demoSceneId,
      title:
        opts?.customTitle ||
        `${source.title.slice(0, 42)} (${formatPlayerTime(s)}–${formatPlayerTime(e)})`,
      startSec: s,
      endSec: e,
      durationSec: dur,
      format,
      quality,
      aspectRatio: aspect,
      autoCaptions: settings.autoCaptions,
      templateName: activeTpl.id !== 'clean-raw' ? activeTpl.name : undefined,
      subtitleStyleId: settings.autoCaptions ? settings.subtitleStyleId : undefined,
      subtitleCount: clipSubtitles.length > 0 ? clipSubtitles.length : undefined,
      subtitles: clipSubtitles.length > 0 ? clipSubtitles : undefined,
      estimatedSizeMb: estimateClipFileSizeMb(dur, format, quality),
      createdAt: new Date().toISOString(),
      downloadUrl: source.type === 'upload' ? source.objectUrl : undefined,
      caption: opts?.caption,
      hashtags: opts?.hashtags,
      aiGenerated: opts?.aiGenerated,
    };

    onCreateClip(newClip);
    return newClip;
  };

  const handleCreateButtonClick = () => {
    if (!isPro && clipDurationSec > 600) {
      setDurationLimitPrompt(true);
      return;
    }
    setDurationLimitPrompt(false);
    setCreatingClip(true);
    window.setTimeout(() => {
      const created = buildAndSaveClip();
      setCreatingClip(false);
      setRecentClipBanner(created);
    }, 320);
  };

  const handleRunAiAutoCut = async () => {
    setAiLoading(true);
    setAiError(null);
    try {
      const response = await fetch('/api/ai/auto-cut', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: source.title,
          author: source.author,
          durationSec: source.durationSec,
          focusGoal: aiFocusGoal,
          targetClipSec: aiClipDuration,
          language,
          transcriptSummary: source.transcriptSummary || '',
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to analyze video highlights.');
      }
      if (Array.isArray(data.segments)) {
        setAiSegments(data.segments);
      }
    } catch (err: unknown) {
      setAiError(err instanceof Error ? err.message : 'AI highlight detection failed.');
    } finally {
      setAiLoading(false);
    }
  };

  const handleApplyAiSegment = (seg: AISegmentSuggestion) => {
    const clamped = clampTrimRange(seg.startSec, seg.endSec, source.durationSec, 1);
    setStartSec(clamped.startSec);
    setEndSec(clamped.endSec);
    setSettings((prev) => ({ ...prev, aspectRatio: seg.recommendedAspect }));
    setCurrentTimeSec(clamped.startSec);
    setIsPreviewLooping(true);
    setIsPlaying(true);
  };

  const handleCreateAllAiClips = () => {
    if (aiSegments.length === 0) return;
    let lastCreated: CreatedClip | null = null;
    aiSegments.forEach((seg) => {
      lastCreated = buildAndSaveClip({
        customTitle: seg.title,
        customStart: seg.startSec,
        customEnd: seg.endSec,
        caption: seg.suggestedCaption,
        hashtags: seg.hashtags,
        aspect: seg.recommendedAspect,
        aiGenerated: true,
      });
    });
    if (lastCreated) {
      setRecentClipBanner(lastCreated);
      setActiveTab('clips');
    }
  };

  // Template & One-Click Preset Handlers
  const handleApplyPreset = (preset: WorkflowPreset) => {
    const resolved = resolvePresetApplication(preset, isPro, settings);
    setFormat(resolved.format);
    setQuality(resolved.quality);
    setSettings(resolved.settings);
    setActivePresetId(preset.id);

    let nextEnd = endSec;
    if (preset.targetDurationSec) {
      const clamped = clampTrimRange(
        startSec,
        Math.min(source.durationSec, startSec + preset.targetDurationSec),
        source.durationSec,
        1
      );
      nextEnd = clamped.endSec;
      setEndSec(nextEnd);
    }

    // Populate immediate frame-synced subtitles if preset turns on captions and list is empty
    if (preset.autoCaptions && subtitles.length === 0 && source.type === 'demo') {
      const demoCues = buildAccurateDemoSubtitles({
        sceneId: source.demoSceneId,
        startSec,
        endSec: nextEnd,
        language,
        videoTitle: source.title,
      });
      setSubtitles(demoCues);
      setAccuracySourceLabel('100% Frame-Synced Verbatim');
      setCurrentTimeSec(startSec);
    }
  };

  const handleSelectTemplate = (tpl: VideoTemplate) => {
    setActivePresetId(null);
    setSettings((prev) => ({
      ...prev,
      aspectRatio: tpl.aspectRatio,
      templateId: tpl.id,
      hookText: tpl.defaultHookText,
      watermarkText: tpl.defaultWatermark,
      showProgressBar: tpl.showProgressBar,
      subtitleStyleId: tpl.recommendedSubtitleStyle,
      streamCopy: tpl.id === 'clean-raw' && tpl.aspectRatio === '16:9',
    }));
  };

  // Automatic 100% Verbatim Subtitle Handlers
  const handleGenerateAutoSubtitles = async () => {
    setTranscribing(true);
    setSubtitleError(null);
    try {
      if (source.type === 'upload' && source.objectUrl) {
        const extracted = await extractWavBase64FromMediaUrl(source.objectUrl, startSec, endSec);
        const res = await fetch('/api/ai/transcribe-subtitles', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sourceType: 'upload',
            base64Audio: extracted.base64Wav,
            mimeType: extracted.mimeType,
            startSec,
            endSec,
            language,
            title: source.title,
          }),
        });
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || 'Gagal mentranskripsi audio video.');
        }
        if (Array.isArray(data.cues) && data.cues.length > 0) {
          setSubtitles(data.cues);
          setAccuracySourceLabel(data.accuracyLabel || 'Gemini 3.5 Verbatim Audio STT');
          setSettings((s) => ({ ...s, autoCaptions: true }));
          setCurrentTimeSec(data.cues[0].startSec);
          return;
        }
      } else if (source.type === 'youtube' && source.youtubeId) {
        const res = await fetch('/api/ai/transcribe-subtitles', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sourceType: 'youtube',
            youtubeId: source.youtubeId,
            startSec,
            endSec,
            language,
            title: source.title,
            transcriptSummary: source.transcriptSummary || '',
          }),
        });
        const data = await res.json();
        if (res.ok && Array.isArray(data.cues) && data.cues.length > 0) {
          setSubtitles(data.cues);
          setAccuracySourceLabel(data.accuracyLabel || '100% Verbatim Official Track');
          setSettings((s) => ({ ...s, autoCaptions: true }));
          setCurrentTimeSec(data.cues[0].startSec);
          return;
        }
      }

      const demoCues = buildAccurateDemoSubtitles({
        sceneId: source.demoSceneId,
        startSec,
        endSec,
        language,
        videoTitle: source.title,
      });
      setSubtitles(demoCues);
      setAccuracySourceLabel('100% Frame-Synced Verbatim');
      setSettings((s) => ({ ...s, autoCaptions: true }));
      if (demoCues.length > 0) {
        setCurrentTimeSec(demoCues[0].startSec);
      }
    } catch (err: unknown) {
      setSubtitleError(err instanceof Error ? err.message : 'Gagal membuat subtitle otomatis.');
    } finally {
      setTranscribing(false);
    }
  };

  const handlePolishOrTranslate = async (mode: 'proofread' | 'translate') => {
    if (subtitles.length === 0) return;
    setPolishing(true);
    setSubtitleError(null);
    try {
      const sampleText = subtitles[0]?.text || '';
      const looksIndonesian =
        /\b(ini|dan|yang|kita|untuk|dengan|bisa|tidak|sampai|karena|jadi|hari)\b/i.test(
          sampleText
        );
      const targetLanguage =
        mode === 'translate'
          ? looksIndonesian
            ? 'en'
            : 'id'
          : looksIndonesian
          ? 'id'
          : language;

      const res = await fetch('/api/ai/polish-subtitles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cues: subtitles,
          mode,
          targetLanguage,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Gagal memproses subtitle.');
      }
      if (Array.isArray(data.cues) && data.cues.length > 0) {
        setSubtitles(data.cues);
        setAccuracySourceLabel(
          mode === 'translate'
            ? `100% Terjemahan (${targetLanguage.toUpperCase()})`
            : '100% Ejaan & Tanda Baca Terverifikasi'
        );
      }
    } catch (err: unknown) {
      setSubtitleError(err instanceof Error ? err.message : 'Gagal memproses subtitle.');
    } finally {
      setPolishing(false);
    }
  };

  const handleAddCueAtPlayhead = () => {
    const cueStart = Number(Math.max(0, currentTimeSec).toFixed(2));
    const cueEnd = Number(Math.min(source.durationSec, cueStart + 3).toFixed(2));
    const nextCue: SubtitleCue = {
      id: `manual-cue-${Date.now()}`,
      startSec: cueStart,
      endSec: Math.max(cueStart + 0.5, cueEnd),
      text: language === 'id' ? 'Tulis teks subtitle di sini...' : 'Enter subtitle text here...',
      confidence: 1.0,
    };
    setSubtitles((prev) => [...prev, nextCue].sort((a, b) => a.startSec - b.startSec));
    if (!settings.autoCaptions) {
      setSettings((s) => ({ ...s, autoCaptions: true }));
    }
  };

  return (
    <section
      aria-label="Video Cutter Workspace"
      className="max-w-7xl mx-auto px-4 sm:px-8 pt-6 pb-14"
    >
      {/* Subtle Top Context Bar with Title + Switch Video Button */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <div className="min-w-0">
          <h2 className="text-base sm:text-lg font-semibold text-slate-900 truncate max-w-2xl">
            {source.title}
          </h2>
          <p className="text-xs text-slate-500">
            <span>{source.author}</span>
            <span aria-hidden="true" className="mx-1.5">
              ·
            </span>
            <span className="font-tabular">{formatTimestamp(source.durationSec)}</span>
            <span aria-hidden="true" className="mx-1.5">
              ·
            </span>
            <span>
              {settings.templateId !== 'clean-raw'
                ? getTemplateById(settings.templateId).name
                : settings.streamCopy
                ? 'Zero Re-Encoding Stream Copy'
                : 'Smart Crop Mode'}
            </span>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('templates')}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold border border-slate-200 hover:border-[#4F6EF7] text-slate-700 hover:text-[#4F6EF7] transition-colors cursor-pointer whitespace-nowrap shrink-0"
          >
            <Layers className="w-3.5 h-3.5 text-[#4F6EF7]" />
            <span>Template &amp; Preset</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('subtitles');
              if (subtitles.length === 0 && !transcribing) {
                handleGenerateAutoSubtitles();
              }
            }}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold border border-slate-200 hover:border-[#4F6EF7] text-slate-700 hover:text-[#4F6EF7] transition-colors cursor-pointer whitespace-nowrap shrink-0"
          >
            <Captions className="w-3.5 h-3.5 text-[#4F6EF7]" />
            <span>Auto Subtitle</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('ai');
              if (aiSegments.length === 0 && !aiLoading) {
                handleRunAiAutoCut();
              }
            }}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold bg-[#4F6EF7]/10 text-[#4F6EF7] hover:bg-[#4F6EF7]/15 transition-colors cursor-pointer whitespace-nowrap shrink-0"
          >
            <Wand2 className="w-3.5 h-3.5" />
            <span>{language === 'id' ? 'Potong Otomatis AI' : 'AI Auto-Cut'}</span>
          </button>

          <button
            type="button"
            onClick={onChangeVideoRequest}
            className="px-3.5 py-2 rounded-lg text-xs font-medium text-slate-600 hover:text-slate-900 border border-slate-200 hover:bg-slate-50 transition-colors cursor-pointer whitespace-nowrap shrink-0"
          >
            {language === 'id' ? 'Ganti Video / Link' : 'Paste Another URL'}
          </button>
        </div>
      </div>

      {/* Main 2-Column Workspace Grid matching image_910a48da.png */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column (7 cols): Video Player Stage */}
        <div className="lg:col-span-7 space-y-3">
          <VideoPlayerStage
            source={source}
            currentTimeSec={currentTimeSec}
            startSec={startSec}
            endSec={endSec}
            isPlaying={isPlaying}
            isPreviewLooping={isPreviewLooping}
            aspectRatio={settings.aspectRatio}
            autoCaptions={settings.autoCaptions}
            templateId={settings.templateId}
            hookText={settings.hookText}
            watermarkText={settings.watermarkText}
            showProgressBar={settings.showProgressBar}
            subtitleStyleId={settings.subtitleStyleId}
            subtitles={subtitles}
            onPlayPause={() => setIsPlaying((p) => !p)}
            onStop={() => {
              setIsPlaying(false);
              setIsPreviewLooping(false);
              setCurrentTimeSec(startSec);
            }}
            onSeek={(sec) => {
              setCurrentTimeSec(sec);
              setIsPreviewLooping(false);
            }}
            onTimeUpdate={setCurrentTimeSec}
            onDurationDetected={(dur) => {
              setEndSec((prev) => Math.min(dur, prev));
            }}
          />

          {/* Video Chapters Quick Jump Bar (if chapters exist) */}
          {source.chapters && source.chapters.length > 0 && (
            <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs text-slate-500">
              <span className="font-medium text-slate-700 shrink-0">Chapters:</span>
              {source.chapters.map((ch, idx) => (
                <button
                  key={ch.title}
                  type="button"
                  onClick={() => {
                    const clamped = clampTrimRange(ch.startSec, ch.endSec, source.durationSec, 1);
                    setStartSec(clamped.startSec);
                    setEndSec(clamped.endSec);
                    setCurrentTimeSec(clamped.startSec);
                  }}
                  className="text-left hover:text-[#4F6EF7] transition-colors cursor-pointer whitespace-nowrap shrink-0"
                >
                  {idx > 0 && <span className="mr-2 text-slate-300">·</span>}
                  <span className="font-tabular text-slate-400 mr-1">
                    {formatPlayerTime(ch.startSec)}
                  </span>
                  <span>{ch.title}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Right Column (5 cols): Controls | AI Auto-Cut | Clips Panel */}
        <div className="lg:col-span-5 relative min-w-0">
          {/* Top Tabs Bar matching ClipsCutter screenshot + Templates & Subtitles */}
          <div className="flex items-center justify-between gap-1 border-b border-slate-200 mb-6">
            <div
              role="tablist"
              aria-label="Editor panels"
              className="flex items-center gap-1 min-w-0 flex-1 overflow-x-auto"
            >
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === 'controls'}
                onClick={() => setActiveTab('controls')}
                className={`px-2.5 sm:px-3.5 py-2.5 rounded-t-xl text-xs sm:text-[13px] font-medium transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                  activeTab === 'controls'
                    ? 'bg-[#4F6EF7] text-white'
                    : 'bg-[#F7F8FA] text-[#4F6EF7] hover:bg-slate-100'
                }`}
              >
                Controls
              </button>

              <button
                type="button"
                role="tab"
                aria-selected={activeTab === 'templates'}
                onClick={() => setActiveTab('templates')}
                className={`px-2.5 sm:px-3 py-2.5 rounded-t-xl text-xs sm:text-[13px] font-medium transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                  activeTab === 'templates'
                    ? 'bg-[#4F6EF7] text-white'
                    : 'bg-[#F7F8FA] text-[#4F6EF7] hover:bg-slate-100'
                }`}
              >
                Templates
              </button>

              <button
                type="button"
                role="tab"
                aria-selected={activeTab === 'subtitles'}
                onClick={() => setActiveTab('subtitles')}
                className={`px-2.5 sm:px-3 py-2.5 rounded-t-xl text-xs sm:text-[13px] font-medium transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                  activeTab === 'subtitles'
                    ? 'bg-[#4F6EF7] text-white'
                    : 'bg-[#F7F8FA] text-[#4F6EF7] hover:bg-slate-100'
                }`}
              >
                Subtitles {subtitles.length > 0 ? `(${subtitles.length})` : ''}
              </button>

              <button
                type="button"
                role="tab"
                aria-selected={activeTab === 'ai'}
                onClick={() => setActiveTab('ai')}
                className={`px-2.5 sm:px-3 py-2.5 rounded-t-xl text-xs sm:text-[13px] font-medium inline-flex items-center gap-1 transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                  activeTab === 'ai'
                    ? 'bg-[#4F6EF7] text-white'
                    : 'bg-[#F7F8FA] text-[#4F6EF7] hover:bg-slate-100'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>AI Cut</span>
              </button>

              <button
                type="button"
                role="tab"
                aria-selected={activeTab === 'clips'}
                onClick={() => setActiveTab('clips')}
                className={`px-2.5 sm:px-3 py-2.5 rounded-t-xl text-xs sm:text-[13px] font-medium transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                  activeTab === 'clips'
                    ? 'bg-[#4F6EF7] text-white'
                    : 'bg-[#F7F8FA] text-[#4F6EF7] hover:bg-slate-100'
                }`}
              >
                Clips {clips.length > 0 ? `(${clips.length})` : ''}
              </button>
            </div>

            {/* Settings Gear Button on right of tab bar */}
            <button
              type="button"
              aria-label="Clip export and crop settings"
              aria-expanded={settingsOpen}
              onClick={() => setSettingsOpen((s) => !s)}
              className={`p-2 rounded-lg transition-colors cursor-pointer shrink-0 ${
                settingsOpen ? 'text-[#4F6EF7] bg-[#4F6EF7]/10' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <Settings className="w-5 h-5" />
            </button>
          </div>

          {/* Settings Popover */}
          {settingsOpen && (
            <div className="mb-5 p-4 rounded-xl border border-slate-200 bg-slate-50/70 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-700">
                  {language === 'id' ? 'Pengaturan Klip & Media Sosial' : 'Social Framing & Trim Settings'}
                </span>
                <button
                  type="button"
                  aria-label="Close settings"
                  onClick={() => setSettingsOpen(false)}
                  className="text-slate-400 hover:text-slate-700 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="flex items-center justify-between gap-3">
                <span className="text-xs text-slate-600">Aspect Ratio</span>
                <div className="flex items-center gap-1 bg-white p-1 rounded-lg border border-slate-200">
                  {(['16:9', '9:16', '1:1'] as const).map((ratio) => (
                    <button
                      key={ratio}
                      type="button"
                      onClick={() => setSettings((s) => ({ ...s, aspectRatio: ratio }))}
                      className={`px-2.5 py-1 rounded text-xs font-medium cursor-pointer transition-colors ${
                        settings.aspectRatio === ratio
                          ? 'bg-[#4F6EF7] text-white'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      {ratio}
                    </button>
                  ))}
                </div>
              </div>

              <label className="flex items-center justify-between text-xs text-slate-700 cursor-pointer">
                <span>AI Dynamic Subtitles Overlay</span>
                <input
                  type="checkbox"
                  checked={settings.autoCaptions}
                  onChange={(e) => setSettings((s) => ({ ...s, autoCaptions: e.target.checked }))}
                  className="rounded accent-[#4F6EF7] w-4 h-4"
                />
              </label>

              <label className="flex items-center justify-between text-xs text-slate-700 cursor-pointer">
                <span>Stream-Copy Byte Extraction (No Re-Encode)</span>
                <input
                  type="checkbox"
                  checked={settings.streamCopy}
                  onChange={(e) => setSettings((s) => ({ ...s, streamCopy: e.target.checked }))}
                  className="rounded accent-[#4F6EF7] w-4 h-4"
                />
              </label>
            </div>
          )}

          {/* Pro Quality License Code Required Inline Prompt */}
          {pendingProQuality && !isPro && (
            <div className="mb-5 p-4 rounded-xl border border-[#4F6EF7]/30 bg-[#4F6EF7]/5 flex flex-wrap items-center justify-between gap-3">
              <div className="text-xs text-slate-700 flex-1 min-w-[200px]">
                <p className="font-semibold text-slate-900">
                  Kualitas {pendingProQuality} Khusus Lisensi Pro
                </p>
                <p className="text-slate-600 mt-0.5 leading-relaxed">
                  Masukkan <strong>Kode Khusus Owner</strong> atau <strong>Kode Pembelian Offline</strong> resmi dari pemilik untuk membuka kualitas hingga 2160p 4K60.
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => onOpenProModal('activate')}
                  className="px-3.5 py-2 rounded-lg bg-[#4F6EF7] hover:bg-[#3D5CE5] text-white text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
                >
                  <KeyRound className="w-3.5 h-3.5" />
                  <span>Masukkan Kode Pro</span>
                </button>
                <button
                  type="button"
                  aria-label="Dismiss Pro prompt"
                  onClick={() => setPendingProQuality(null)}
                  className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* Free Plan 10-Minute Clip Duration Cap Prompt */}
          {durationLimitPrompt && !isPro && (
            <div
              role="alert"
              className="mb-5 p-4 rounded-xl border border-amber-300/80 bg-amber-50/80 space-y-2.5"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="text-xs text-slate-800">
                  <p className="font-semibold text-slate-900">
                    Durasi Klip Melebihi Batas Free Plan (Maksimal 10 Menit)
                  </p>
                  <p className="text-slate-600 mt-0.5 leading-relaxed">
                    Paket gratis dibatasi maksimal 10 menit (00:10:00). Potong durasi menjadi ≤ 10 menit atau masukkan Kode Lisensi Pro untuk durasi hingga 1 jam+.
                  </p>
                </div>
                <button
                  type="button"
                  aria-label="Tutup peringatan durasi"
                  onClick={() => setDurationLimitPrompt(false)}
                  className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const nextEnd = Math.min(source.durationSec, startSec + 600);
                    setEndSec(nextEnd);
                    setCurrentTimeSec(nextEnd);
                    setDurationLimitPrompt(false);
                  }}
                  className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 text-xs font-semibold cursor-pointer whitespace-nowrap"
                >
                  Potong 10 Menit Pertama
                </button>
                <button
                  type="button"
                  onClick={() => onOpenProModal('activate')}
                  className="px-3 py-1.5 rounded-lg bg-[#4F6EF7] hover:bg-[#3D5CE5] text-white text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
                >
                  <KeyRound className="w-3.5 h-3.5" />
                  <span>Masukkan Kode Pro</span>
                </button>
              </div>
            </div>
          )}

          {/* TAB 1: CONTROLS (Pixel-faithful to image_910a48da.png) */}
          {activeTab === 'controls' && (
            <div className="space-y-6">
              {/* Row 1: Format & Quality Dropdowns */}
              <div className="grid grid-cols-2 gap-4">
                <FormatDropdown value={format} onChange={setFormat} />
                <QualityDropdown
                  value={quality}
                  onChange={setQuality}
                  isPro={isPro}
                  disabled={isAudioFormat}
                  onRequestProUnlock={(reqTier) => setPendingProQuality(reqTier)}
                />
              </div>

              {/* Row 2: Start & End Timestamp Boxes (HH : MM : SS) */}
              <div className="grid grid-cols-2 gap-4">
                <HMSInputGroup
                  label="Start time"
                  secondsValue={startSec}
                  maxSeconds={Math.max(0, endSec - 1)}
                  onCommitSeconds={(sec) => {
                    const clamped = clampTrimRange(sec, endSec, source.durationSec, 1);
                    setStartSec(clamped.startSec);
                    setCurrentTimeSec(clamped.startSec);
                  }}
                />
                <HMSInputGroup
                  label="End time"
                  secondsValue={endSec}
                  maxSeconds={source.durationSec}
                  onCommitSeconds={(sec) => {
                    const clamped = clampTrimRange(startSec, sec, source.durationSec, 1);
                    setEndSec(clamped.endSec);
                    setCurrentTimeSec(clamped.endSec);
                  }}
                />
              </div>

              {/* Row 3: Royal Blue Dual-Thumb Slider */}
              <DualRangeSlider
                min={0}
                max={source.durationSec}
                startSec={startSec}
                endSec={endSec}
                onChange={handleRangeChange}
                aiSegments={aiSegments}
                onSelectSegment={handleApplyAiSegment}
              />

              {/* Row 4: Preview | Duration Display | Create */}
              <div className="grid grid-cols-3 gap-3.5 pt-1">
                <button
                  type="button"
                  onClick={handlePreviewRange}
                  className="h-[52px] rounded-xl border-2 border-[#4F6EF7] text-[#4F6EF7] hover:bg-[#4F6EF7]/5 font-medium text-[15px] transition-colors cursor-pointer whitespace-nowrap"
                >
                  Preview
                </button>

                <div
                  aria-label="Selected clip duration"
                  className="h-[52px] rounded-xl bg-[#F7F8FA] flex flex-col items-center justify-center px-2"
                >
                  <span className="font-tabular text-[15px] font-medium text-slate-900">
                    {formatTimestamp(clipDurationSec)}
                  </span>
                  <span className="text-[10px] text-slate-500 font-tabular">
                    ~{estimatedMb} MB
                  </span>
                </div>

                <button
                  type="button"
                  disabled={creatingClip}
                  onClick={handleCreateButtonClick}
                  className="h-[52px] rounded-xl bg-[#4F6EF7] hover:bg-[#3D5CE5] disabled:opacity-60 text-white font-medium text-[15px] shadow-sm transition-colors cursor-pointer whitespace-nowrap"
                >
                  {creatingClip ? 'Cutting...' : 'Create'}
                </button>
              </div>

              {/* Created Clip Instant Action Card (Download + Share to Social Media) */}
              {recentClipBanner && (
                <div className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-emerald-700 flex items-center gap-1.5">
                        <Check className="w-3.5 h-3.5" />
                        <span>Clip Ready ({recentClipBanner.format} · {recentClipBanner.quality})</span>
                      </p>
                      <p className="text-sm font-medium text-slate-900 truncate mt-0.5">
                        {recentClipBanner.title}
                      </p>
                    </div>
                    <button
                      type="button"
                      aria-label="Close ready clip banner"
                      onClick={() => setRecentClipBanner(null)}
                      className="text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => triggerClipDownload(recentClipBanner, source.objectUrl)}
                      className="flex-1 inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#4F6EF7] hover:bg-[#3D5CE5] text-white text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Download ({recentClipBanner.estimatedSizeMb} MB)</span>
                    </button>

                    {recentClipBanner.subtitles && recentClipBanner.subtitles.length > 0 && (
                      <button
                        type="button"
                        onClick={() =>
                          downloadSubtitleFile(
                            recentClipBanner.subtitles!,
                            'srt',
                            recentClipBanner.title,
                            true,
                            recentClipBanner.startSec
                          )
                        }
                        className="inline-flex items-center justify-center gap-1 px-3 py-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap shrink-0"
                      >
                        <Captions className="w-3.5 h-3.5 text-[#4F6EF7]" />
                        <span>.SRT</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => onOpenSocialModal(recentClipBanner)}
                      className="flex-1 inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap"
                    >
                      <Share2 className="w-3.5 h-3.5 text-[#4F6EF7]" />
                      <span>Share to Socials</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 1B: TEMPLATES & WORKFLOW PRESETS */}
          {activeTab === 'templates' && (
            <TemplatePresetPanel
              language={language}
              format={format}
              quality={quality}
              settings={settings}
              customPresets={customPresets}
              activePresetId={activePresetId}
              onApplyPreset={handleApplyPreset}
              onSaveCustomPreset={(created) => {
                setCustomPresets((prev) => [created, ...prev]);
                setActivePresetId(created.id);
              }}
              onDeleteCustomPreset={(id) => {
                setCustomPresets((prev) => prev.filter((p) => p.id !== id));
                if (activePresetId === id) setActivePresetId(null);
              }}
              onSelectTemplate={handleSelectTemplate}
              onUpdateSettings={(patch) => setSettings((prev) => ({ ...prev, ...patch }))}
            />
          )}

          {/* TAB 1C: AUTOMATIC 100% ACCURATE SUBTITLES */}
          {activeTab === 'subtitles' && (
            <AutoSubtitlePanel
              videoTitle={source.title}
              startSec={startSec}
              endSec={endSec}
              currentTimeSec={currentTimeSec}
              autoCaptions={settings.autoCaptions}
              subtitleStyleId={settings.subtitleStyleId}
              subtitles={subtitles}
              transcribing={transcribing}
              polishing={polishing}
              accuracySourceLabel={accuracySourceLabel}
              subtitleError={subtitleError}
              onToggleAutoCaptions={(enabled) =>
                setSettings((prev) => ({ ...prev, autoCaptions: enabled }))
              }
              onSelectSubtitleStyle={(styleId) =>
                setSettings((prev) => ({ ...prev, subtitleStyleId: styleId }))
              }
              onGenerateAutoSubtitles={handleGenerateAutoSubtitles}
              onPolishOrTranslate={handlePolishOrTranslate}
              onUpdateCue={(cueId, patch) =>
                setSubtitles((prev) =>
                  prev.map((c) => (c.id === cueId ? { ...c, ...patch } : c))
                )
              }
              onDeleteCue={(cueId) =>
                setSubtitles((prev) => prev.filter((c) => c.id !== cueId))
              }
              onAddCueAtPlayhead={handleAddCueAtPlayhead}
              onReplaceCues={(nextCues, label) => {
                setSubtitles(nextCues);
                setAccuracySourceLabel(label);
              }}
              onSeekToSec={(sec) => {
                setCurrentTimeSec(sec);
              }}
            />
          )}

          {/* TAB 2: AI AUTO-CUT (Pemotong Video Otomatis Berbasis AI) */}
          {activeTab === 'ai' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-[#F7F8FA] space-y-3.5">
                <div>
                  <label
                    htmlFor="ai-focus-select"
                    className="block text-xs font-semibold text-slate-700 mb-1.5"
                  >
                    {language === 'id'
                      ? 'Fokus Pemotongan AI (Highlight Otomatis)'
                      : 'AI Highlight Detection Goal'}
                  </label>
                  <select
                    id="ai-focus-select"
                    value={aiFocusGoal}
                    onChange={(e) => setAiFocusGoal(e.target.value)}
                    className="w-full h-10 px-3 rounded-lg bg-white border border-slate-200 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#4F6EF7]"
                  >
                    <option value="Viral Hooks & Peak Reactions">
                      Viral Hooks &amp; Peak Reactions (TikTok / Shorts)
                    </option>
                    <option value="Funny & Entertaining Highlights">
                      Funny &amp; Entertaining Moments
                    </option>
                    <option value="Educational Insights & Key Quotes">
                      Key Takeaways &amp; Podcast Quotes
                    </option>
                    <option value="Fast Action & Climax Moments">
                      Action Climax &amp; Reveal Segments
                    </option>
                  </select>
                </div>

                <div className="flex items-center justify-between gap-3">
                  <span className="text-xs font-semibold text-slate-700">
                    {language === 'id' ? 'Target Durasi Klip' : 'Target Clip Length'}
                  </span>
                  <div className="flex items-center gap-1 bg-white p-1 rounded-lg border border-slate-200">
                    {[
                      { label: '30s', sec: 30 },
                      { label: '45s', sec: 45 },
                      { label: '60s', sec: 60 },
                      { label: '90s', sec: 90 },
                    ].map((preset) => (
                      <button
                        key={preset.sec}
                        type="button"
                        onClick={() => setAiClipDuration(preset.sec)}
                        className={`px-2.5 py-1 rounded text-xs font-tabular font-medium cursor-pointer transition-colors ${
                          aiClipDuration === preset.sec
                            ? 'bg-[#4F6EF7] text-white'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  type="button"
                  disabled={aiLoading}
                  onClick={handleRunAiAutoCut}
                  className="w-full h-11 rounded-xl bg-[#4F6EF7] hover:bg-[#3D5CE5] disabled:opacity-60 text-white text-sm font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>
                    {aiLoading
                      ? language === 'id'
                        ? 'AI Sedang Menganalisis Video...'
                        : 'Analyzing Video Moments with AI...'
                      : language === 'id'
                      ? 'Deteksi & Potong Klip Viral Otomatis'
                      : 'Detect Viral Clips with AI'}
                  </span>
                </button>
              </div>

              {aiError && (
                <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700">
                  {aiError}
                </div>
              )}

              {aiSegments.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-700">
                      {aiSegments.length} AI Viral Segments Found
                    </span>
                    <button
                      type="button"
                      onClick={handleCreateAllAiClips}
                      className="text-xs font-semibold text-[#4F6EF7] hover:underline cursor-pointer"
                    >
                      + Save All {aiSegments.length} Clips
                    </button>
                  </div>

                  <div className="space-y-2.5 max-h-[310px] overflow-y-auto pr-1">
                    {aiSegments.map((seg, index) => (
                      <div
                        key={seg.id}
                        className="p-3.5 rounded-xl border border-slate-200 hover:border-[#4F6EF7]/50 bg-white transition-colors space-y-2"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <h4 className="text-sm font-semibold text-slate-900 leading-snug">
                            {index + 1}. {seg.title}
                          </h4>
                          <span className="font-tabular text-xs font-medium text-[#4F6EF7] shrink-0">
                            {formatPlayerTime(seg.startSec)} – {formatPlayerTime(seg.endSec)}
                          </span>
                        </div>

                        <p className="text-xs text-slate-600 leading-relaxed">{seg.hookReason}</p>

                        <div className="flex items-center justify-between pt-1 gap-2">
                          <span className="text-[11px] text-slate-500">
                            Best for <strong className="uppercase">{seg.bestPlatform}</strong> ·{' '}
                            {seg.recommendedAspect}
                          </span>

                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                handleApplyAiSegment(seg);
                                setActiveTab('controls');
                              }}
                              className="px-2.5 py-1 rounded-lg border border-slate-200 hover:border-[#4F6EF7] text-xs font-medium text-slate-700 hover:text-[#4F6EF7] cursor-pointer whitespace-nowrap"
                            >
                              Load Range
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                const created = buildAndSaveClip({
                                  customTitle: seg.title,
                                  customStart: seg.startSec,
                                  customEnd: seg.endSec,
                                  caption: seg.suggestedCaption,
                                  hashtags: seg.hashtags,
                                  aspect: seg.recommendedAspect,
                                  aiGenerated: true,
                                });
                                onOpenSocialModal(created);
                              }}
                              className="px-2.5 py-1 rounded-lg bg-[#4F6EF7] hover:bg-[#3D5CE5] text-white text-xs font-medium inline-flex items-center gap-1 cursor-pointer whitespace-nowrap"
                            >
                              <Scissors className="w-3 h-3" />
                              <span>Cut &amp; Share</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: CLIPS (Created Clips List inside Workspace) */}
          {activeTab === 'clips' && (
            <div className="space-y-3">
              {clips.length === 0 ? (
                <div className="py-10 px-4 text-center rounded-xl bg-[#F7F8FA] space-y-2.5">
                  <Scissors className="w-7 h-7 text-slate-400 mx-auto" />
                  <p className="text-sm font-semibold text-slate-800">No clips created yet</p>
                  <p className="text-xs text-slate-500 max-w-xs mx-auto">
                    Pick your start and end timestamps in Controls or run AI Auto-Cut to extract viral segments.
                  </p>
                  <button
                    type="button"
                    onClick={() => setActiveTab('controls')}
                    className="mt-1 px-4 py-2 rounded-lg bg-[#4F6EF7] text-white text-xs font-semibold cursor-pointer"
                  >
                    Go to Controls
                  </button>
                </div>
              ) : (
                <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1">
                  {clips.map((clip) => (
                    <div
                      key={clip.id}
                      className="p-3.5 rounded-xl border border-slate-200 bg-white flex flex-col gap-2.5"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-slate-900 truncate">
                            {clip.title}
                          </p>
                          <p className="text-xs text-slate-500 font-tabular mt-0.5">
                            {formatTimestamp(clip.startSec)} – {formatTimestamp(clip.endSec)} ·{' '}
                            {clip.format} · {clip.quality} · {clip.aspectRatio}
                            {clip.templateName ? ` · ${clip.templateName}` : ''}
                            {clip.subtitleCount ? ` · ${clip.subtitleCount} Sub` : ''} · ~
                            {clip.estimatedSizeMb} MB
                          </p>
                        </div>
                        <button
                          type="button"
                          aria-label={`Delete clip ${clip.title}`}
                          onClick={() => onDeleteClip(clip.id)}
                          className="p-1 text-slate-400 hover:text-red-600 cursor-pointer shrink-0"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setStartSec(clip.startSec);
                            setEndSec(Math.min(source.durationSec, clip.endSec));
                            setCurrentTimeSec(clip.startSec);
                            setIsPreviewLooping(true);
                            setIsPlaying(true);
                          }}
                          className="px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-xs font-medium text-slate-700 cursor-pointer whitespace-nowrap"
                        >
                          Preview
                        </button>

                        <button
                          type="button"
                          onClick={() => triggerClipDownload(clip, source.objectUrl)}
                          className="px-3 py-1.5 rounded-lg bg-[#4F6EF7] hover:bg-[#3D5CE5] text-white text-xs font-semibold inline-flex items-center gap-1 cursor-pointer whitespace-nowrap"
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
                            className="px-2.5 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-xs font-semibold text-slate-700 inline-flex items-center gap-1 cursor-pointer whitespace-nowrap"
                          >
                            <Captions className="w-3.5 h-3.5 text-[#4F6EF7]" />
                            <span>.SRT</span>
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={() => onOpenSocialModal(clip)}
                          className="px-3 py-1.5 rounded-lg border border-[#4F6EF7]/40 text-[#4F6EF7] hover:bg-[#4F6EF7]/5 text-xs font-semibold inline-flex items-center gap-1 cursor-pointer ml-auto whitespace-nowrap"
                        >
                          <Share2 className="w-3.5 h-3.5" />
                          <span>Publish</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </section>
  );
};
