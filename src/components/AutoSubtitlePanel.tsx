import React, { useRef } from 'react';
import {
  Captions,
  CheckCheck,
  Download,
  Languages,
  Plus,
  Sparkles,
  Trash2,
  Upload,
} from 'lucide-react';
import type { SubtitleCue, SubtitleStyleId } from '../types';
import { SUBTITLE_STYLE_PRESETS } from '../utils/templatesAndPresets';
import {
  downloadSubtitleFile,
  parseSrtOrVttToCues,
} from '../utils/subtitleEngine';
import { formatPlayerTime } from '../utils/timeUtils';

interface AutoSubtitlePanelProps {
  videoTitle: string;
  startSec: number;
  endSec: number;
  currentTimeSec: number;
  autoCaptions: boolean;
  subtitleStyleId: SubtitleStyleId;
  subtitles: SubtitleCue[];
  transcribing: boolean;
  polishing: boolean;
  accuracySourceLabel: string | null;
  subtitleError: string | null;
  onToggleAutoCaptions: (enabled: boolean) => void;
  onSelectSubtitleStyle: (styleId: SubtitleStyleId) => void;
  onGenerateAutoSubtitles: () => void;
  onPolishOrTranslate: (mode: 'proofread' | 'translate') => void;
  onUpdateCue: (cueId: string, patch: Partial<SubtitleCue>) => void;
  onDeleteCue: (cueId: string) => void;
  onAddCueAtPlayhead: () => void;
  onReplaceCues: (cues: SubtitleCue[], sourceLabel: string) => void;
  onSeekToSec: (sec: number) => void;
}

export const AutoSubtitlePanel: React.FC<AutoSubtitlePanelProps> = ({
  videoTitle,
  startSec,
  currentTimeSec,
  autoCaptions,
  subtitleStyleId,
  subtitles,
  transcribing,
  polishing,
  accuracySourceLabel,
  subtitleError,
  onToggleAutoCaptions,
  onSelectSubtitleStyle,
  onGenerateAutoSubtitles,
  onPolishOrTranslate,
  onUpdateCue,
  onDeleteCue,
  onAddCueAtPlayhead,
  onReplaceCues,
  onSeekToSec,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImportSubtitleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const rawText = await file.text();
      const parsed = parseSrtOrVttToCues(rawText, 0);
      if (parsed.length > 0) {
        onReplaceCues(parsed, `Imported ${file.name} (100% Exact)`);
        onToggleAutoCaptions(true);
      }
    } catch {
      // Ignore malformed file read errors
    } finally {
      e.target.value = '';
    }
  };

  return (
    <div className="space-y-4">
      {/* 1. Automatic Subtitle Generator Header Card */}
      <div className="p-4 rounded-xl bg-[#F7F8FA] space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <p className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
              <Captions className="w-4 h-4 text-[#4F6EF7] shrink-0" />
              <span>Auto Subtitle 100% Akurat (Word-Level Sync)</span>
            </p>
            <p className="text-[11px] text-slate-500 mt-0.5">
              {accuracySourceLabel
                ? `Sumber: ${accuracySourceLabel} · ${subtitles.length} baris tersinkronisasi`
                : 'Transkripsi suara otomatis + editor presisi kata demi kata'}
            </p>
          </div>

          <label className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-700 cursor-pointer shrink-0">
            <input
              type="checkbox"
              aria-label="Aktifkan subtitle pada video"
              checked={autoCaptions}
              onChange={(e) => onToggleAutoCaptions(e.target.checked)}
              className="rounded accent-[#4F6EF7] w-4 h-4"
            />
            <span>Aktif</span>
          </label>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            disabled={transcribing}
            onClick={onGenerateAutoSubtitles}
            className="flex-1 h-10 px-4 rounded-xl bg-[#4F6EF7] hover:bg-[#3D5CE5] disabled:opacity-60 text-white text-xs font-semibold inline-flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>
              {transcribing
                ? 'Mentranskripsi Suara Presisi...'
                : 'Buat Subtitle Otomatis (Akurat 100%)'}
            </span>
          </button>

          <input
            ref={fileInputRef}
            type="file"
            accept=".srt,.vtt,text/plain"
            onChange={handleImportSubtitleFile}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="h-10 px-3 rounded-xl border border-slate-200 bg-white hover:border-[#4F6EF7] text-xs font-semibold text-slate-700 hover:text-[#4F6EF7] inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Import SRT/VTT</span>
          </button>
        </div>

        {subtitleError && (
          <p role="alert" className="text-xs font-medium text-red-600">
            {subtitleError}
          </p>
        )}
      </div>

      {/* 2. Subtitle Visual Style Presets */}
      <div className="space-y-2">
        <span className="block text-xs font-bold text-slate-900">
          Preset Gaya Visual Subtitle
        </span>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {SUBTITLE_STYLE_PRESETS.map((style) => {
            const selected = subtitleStyleId === style.id;
            return (
              <button
                key={style.id}
                type="button"
                onClick={() => {
                  onSelectSubtitleStyle(style.id);
                  if (!autoCaptions) onToggleAutoCaptions(true);
                }}
                className={`px-2.5 py-2 rounded-lg border text-left transition-colors cursor-pointer ${
                  selected
                    ? 'border-[#4F6EF7] bg-[#4F6EF7]/8 text-[#4F6EF7]'
                    : 'border-slate-200 bg-white text-slate-700 hover:border-[#4F6EF7]/40'
                }`}
              >
                <div className="text-[11px] font-semibold truncate">{style.name}</div>
                <div className="text-[10px] text-slate-500 truncate mt-0.5">
                  {style.wordByWordHighlight ? 'Karaoke Kata' : 'Baris Utuh'}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. Precision Cue Editor & 100% Accuracy Proofread / Export Bar */}
      <div className="space-y-2.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              type="button"
              disabled={subtitles.length === 0 || polishing}
              onClick={() => onPolishOrTranslate('proofread')}
              className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-50 text-[11px] font-semibold text-slate-700 inline-flex items-center gap-1 cursor-pointer whitespace-nowrap"
            >
              <CheckCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>{polishing ? 'Memproses...' : 'Auto-Koreksi Ejaan'}</span>
            </button>

            <button
              type="button"
              disabled={subtitles.length === 0 || polishing}
              onClick={() => onPolishOrTranslate('translate')}
              className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-50 text-[11px] font-semibold text-slate-700 inline-flex items-center gap-1 cursor-pointer whitespace-nowrap"
            >
              <Languages className="w-3.5 h-3.5 text-[#4F6EF7]" />
              <span>Terjemahkan ID/EN</span>
            </button>

            <button
              type="button"
              onClick={onAddCueAtPlayhead}
              className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-[11px] font-semibold text-slate-700 inline-flex items-center gap-1 cursor-pointer whitespace-nowrap"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Baris</span>
            </button>
          </div>

          {subtitles.length > 0 && (
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => downloadSubtitleFile(subtitles, 'srt', videoTitle, true, startSec)}
                className="px-2.5 py-1.5 rounded-lg bg-[#4F6EF7]/10 hover:bg-[#4F6EF7]/20 text-[11px] font-semibold text-[#4F6EF7] inline-flex items-center gap-1 cursor-pointer whitespace-nowrap"
              >
                <Download className="w-3 h-3" />
                <span>.SRT</span>
              </button>
              <button
                type="button"
                onClick={() => downloadSubtitleFile(subtitles, 'vtt', videoTitle, true, startSec)}
                className="px-2.5 py-1.5 rounded-lg bg-[#4F6EF7]/10 hover:bg-[#4F6EF7]/20 text-[11px] font-semibold text-[#4F6EF7] inline-flex items-center gap-1 cursor-pointer whitespace-nowrap"
              >
                <Download className="w-3 h-3" />
                <span>.VTT</span>
              </button>
            </div>
          )}
        </div>

        {/* Cue List */}
        {subtitles.length === 0 ? (
          <div className="py-7 px-4 text-center rounded-xl border border-slate-200 bg-white space-y-2">
            <p className="text-xs font-semibold text-slate-800">
              Belum ada baris subtitle untuk rentang klip ini
            </p>
            <p className="text-[11px] text-slate-500 max-w-xs mx-auto leading-relaxed">
              Klik <strong>Buat Subtitle Otomatis (Akurat 100%)</strong> di atas untuk mengekstrak transkripsi presisi, atau import file <code>.SRT</code> / <code>.VTT</code>.
            </p>
          </div>
        ) : (
          <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
            {subtitles.map((cue, index) => {
              const isPlayingCue =
                currentTimeSec >= cue.startSec && currentTimeSec <= cue.endSec + 0.05;
              return (
                <div
                  key={cue.id}
                  className={`p-2.5 rounded-xl border transition-colors space-y-1.5 ${
                    isPlayingCue
                      ? 'border-[#4F6EF7] bg-[#4F6EF7]/5'
                      : 'border-slate-200 bg-white'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 text-[11px]">
                    <button
                      type="button"
                      onClick={() => onSeekToSec(cue.startSec)}
                      className="font-tabular font-semibold text-[#4F6EF7] hover:underline cursor-pointer"
                    >
                      #{index + 1} · {formatPlayerTime(cue.startSec)} – {formatPlayerTime(cue.endSec)}
                    </button>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        aria-label={`Shift cue ${index + 1} earlier`}
                        onClick={() =>
                          onUpdateCue(cue.id, {
                            startSec: Number(Math.max(0, cue.startSec - 0.25).toFixed(2)),
                            endSec: Number(Math.max(0.5, cue.endSec - 0.25).toFixed(2)),
                          })
                        }
                        className="px-1.5 py-0.5 rounded border border-slate-200 text-[10px] font-tabular text-slate-600 hover:bg-slate-50 cursor-pointer"
                      >
                        -0.25s
                      </button>
                      <button
                        type="button"
                        aria-label={`Shift cue ${index + 1} later`}
                        onClick={() =>
                          onUpdateCue(cue.id, {
                            startSec: Number((cue.startSec + 0.25).toFixed(2)),
                            endSec: Number((cue.endSec + 0.25).toFixed(2)),
                          })
                        }
                        className="px-1.5 py-0.5 rounded border border-slate-200 text-[10px] font-tabular text-slate-600 hover:bg-slate-50 cursor-pointer"
                      >
                        +0.25s
                      </button>
                      <button
                        type="button"
                        aria-label={`Delete subtitle line ${index + 1}`}
                        onClick={() => onDeleteCue(cue.id)}
                        className="p-1 text-slate-400 hover:text-red-600 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <input
                    type="text"
                    aria-label={`Subtitle line ${index + 1} text`}
                    value={cue.text}
                    onChange={(e) => onUpdateCue(cue.id, { text: e.target.value, confidence: 1.0 })}
                    className="w-full h-8 px-2.5 rounded-lg border border-slate-200 bg-white text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#4F6EF7]"
                  />
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
