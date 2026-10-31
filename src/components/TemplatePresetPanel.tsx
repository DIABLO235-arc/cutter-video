import React, { useState } from 'react';
import { BookmarkPlus, Check, Layers, Sliders, Trash2 } from 'lucide-react';
import type {
  ExportFormat,
  QualityTier,
  TrimSettings,
  VideoTemplate,
  WorkflowPreset,
} from '../types';
import {
  BUILT_IN_PRESETS,
  BUILT_IN_TEMPLATES,
  buildCustomWorkflowPreset,
  getTemplateById,
} from '../utils/templatesAndPresets';

interface TemplatePresetPanelProps {
  language: 'en' | 'id';
  format: ExportFormat;
  quality: QualityTier;
  settings: TrimSettings;
  customPresets: WorkflowPreset[];
  activePresetId: string | null;
  onApplyPreset: (preset: WorkflowPreset) => void;
  onSaveCustomPreset: (preset: WorkflowPreset) => void;
  onDeleteCustomPreset: (presetId: string) => void;
  onSelectTemplate: (template: VideoTemplate) => void;
  onUpdateSettings: (patch: Partial<TrimSettings>) => void;
}

export const TemplatePresetPanel: React.FC<TemplatePresetPanelProps> = ({
  language,
  format,
  quality,
  settings,
  customPresets,
  activePresetId,
  onApplyPreset,
  onSaveCustomPreset,
  onDeleteCustomPreset,
  onSelectTemplate,
  onUpdateSettings,
}) => {
  const [newPresetName, setNewPresetName] = useState('');
  const [presetError, setPresetError] = useState<string | null>(null);
  const [presetSavedMsg, setPresetSavedMsg] = useState<string | null>(null);

  const isId = language === 'id';
  const activeTemplate = getTemplateById(settings.templateId);
  const allPresets = [...customPresets, ...BUILT_IN_PRESETS];

  const handleCreatePreset = (e: React.FormEvent) => {
    e.preventDefault();
    setPresetError(null);
    setPresetSavedMsg(null);
    try {
      const created = buildCustomWorkflowPreset({
        name: newPresetName,
        format,
        quality,
        aspectRatio: settings.aspectRatio,
        templateId: settings.templateId,
        hookText: settings.hookText,
        watermarkText: settings.watermarkText,
        autoCaptions: settings.autoCaptions,
        subtitleStyleId: settings.subtitleStyleId,
      });
      onSaveCustomPreset(created);
      setNewPresetName('');
      setPresetSavedMsg(`Preset "${created.name}" berhasil disimpan.`);
    } catch (err: unknown) {
      setPresetError(err instanceof Error ? err.message : 'Gagal menyimpan preset.');
    }
  };

  return (
    <div className="space-y-5">
      {/* 1. One-Click Workflow Presets (Built-in + User Custom) */}
      <div className="p-4 rounded-xl bg-[#F7F8FA] space-y-3">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
            <Sliders className="w-3.5 h-3.5 text-[#4F6EF7]" />
            <span>{isId ? 'Preset Siap Pakai (1-Klik)' : 'One-Click Workflow Presets'}</span>
          </span>
          <span className="text-[11px] text-slate-500 font-tabular">
            {allPresets.length} presets
          </span>
        </div>

        <div className="space-y-2 max-h-44 overflow-y-auto pr-1">
          {allPresets.map((preset) => {
            const isSelected = activePresetId === preset.id;
            return (
              <div
                key={preset.id}
                className={`p-2.5 rounded-xl border transition-colors flex items-center justify-between gap-2 ${
                  isSelected
                    ? 'border-[#4F6EF7] bg-white'
                    : 'border-slate-200/90 bg-white hover:border-[#4F6EF7]/50'
                }`}
              >
                <button
                  type="button"
                  onClick={() => onApplyPreset(preset)}
                  className="flex-1 min-w-0 text-left cursor-pointer"
                >
                  <div className="flex items-center gap-1.5">
                    {isSelected && <Check className="w-3.5 h-3.5 text-[#4F6EF7] shrink-0" />}
                    <span className="text-xs font-semibold text-slate-900 truncate">
                      {preset.name}
                    </span>
                    {preset.isCustom && (
                      <span className="text-[10px] font-medium text-[#4F6EF7] shrink-0">
                        · Kustom
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-500 truncate mt-0.5">{preset.description}</p>
                </button>

                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => onApplyPreset(preset)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold cursor-pointer whitespace-nowrap ${
                      isSelected
                        ? 'bg-[#4F6EF7] text-white'
                        : 'bg-[#4F6EF7]/10 text-[#4F6EF7] hover:bg-[#4F6EF7]/20'
                    }`}
                  >
                    {isSelected ? 'Terpasang' : 'Pakai'}
                  </button>
                  {preset.isCustom && (
                    <button
                      type="button"
                      aria-label={`Delete custom preset ${preset.name}`}
                      onClick={() => onDeleteCustomPreset(preset.id)}
                      className="p-1 text-slate-400 hover:text-red-600 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Save Current Configuration as Custom Preset */}
        <form onSubmit={handleCreatePreset} noValidate className="pt-2 border-t border-slate-200/80 space-y-2">
          <label htmlFor="custom-preset-name" className="block text-[11px] font-semibold text-slate-700">
            Simpan Pengaturan Saat Ini sebagai Preset Baru
          </label>
          <div className="flex items-center gap-2">
            <input
              id="custom-preset-name"
              type="text"
              maxLength={48}
              value={newPresetName}
              onChange={(e) => {
                setNewPresetName(e.target.value);
                if (presetError) setPresetError(null);
              }}
              placeholder="Contoh: Preset Podcast Harian"
              className="flex-1 h-9 px-3 rounded-lg bg-white border border-slate-200 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#4F6EF7]"
            />
            <button
              type="submit"
              className="h-9 px-3 rounded-lg bg-[#4F6EF7] hover:bg-[#3D5CE5] text-white text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0"
            >
              <BookmarkPlus className="w-3.5 h-3.5" />
              <span>Simpan Preset</span>
            </button>
          </div>
          {presetError && (
            <p role="alert" className="text-[11px] font-medium text-red-600">
              {presetError}
            </p>
          )}
          {presetSavedMsg && (
            <p className="text-[11px] font-medium text-emerald-700">{presetSavedMsg}</p>
          )}
        </form>
      </div>

      {/* 2. Visual Video Layout Templates */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-[#4F6EF7]" />
            <span>Pilih Template Frame Video</span>
          </span>
          <span className="text-[11px] text-slate-500">
            Aktif: {activeTemplate.name}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {BUILT_IN_TEMPLATES.map((tpl) => {
            const active = settings.templateId === tpl.id;
            return (
              <button
                key={tpl.id}
                type="button"
                onClick={() => onSelectTemplate(tpl)}
                className={`p-3 rounded-xl border text-left transition-colors cursor-pointer space-y-1 ${
                  active
                    ? 'border-[#4F6EF7] bg-[#4F6EF7]/5'
                    : 'border-slate-200 bg-white hover:border-[#4F6EF7]/50'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-slate-900 truncate">{tpl.name}</span>
                  <span className="text-[10px] font-tabular text-slate-500 shrink-0">
                    {tpl.aspectRatio}
                  </span>
                </div>
                <p className="text-[11px] text-slate-600 leading-snug line-clamp-2">
                  {tpl.description}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. Live Template Customization (Hook Headline, Watermark, Progress Bar) */}
      <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-3">
        <p className="text-xs font-bold text-slate-900">Kustomisasi Teks Template di Video</p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label htmlFor="template-hook-input" className="block text-[11px] font-semibold text-slate-700 mb-1">
              Teks Judul / Hook Atas
            </label>
            <input
              id="template-hook-input"
              type="text"
              maxLength={70}
              value={settings.hookText}
              onChange={(e) => onUpdateSettings({ hookText: e.target.value })}
              placeholder="Misal: TUNGGU SAMPAI AKHIR!"
              className="w-full h-9 px-3 rounded-lg border border-slate-200 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#4F6EF7]"
            />
          </div>

          <div>
            <label htmlFor="template-watermark-input" className="block text-[11px] font-semibold text-slate-700 mb-1">
              Watermark / Nama Channel
            </label>
            <input
              id="template-watermark-input"
              type="text"
              maxLength={36}
              value={settings.watermarkText}
              onChange={(e) => onUpdateSettings({ watermarkText: e.target.value })}
              placeholder="Misal: @vibeclip.studio"
              className="w-full h-9 px-3 rounded-lg border border-slate-200 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#4F6EF7]"
            />
          </div>
        </div>

        <label className="flex items-center justify-between text-xs text-slate-700 cursor-pointer pt-1">
          <span>Tampilkan Dynamic Progress Bar pada Klip</span>
          <input
            type="checkbox"
            checked={settings.showProgressBar}
            onChange={(e) => onUpdateSettings({ showProgressBar: e.target.checked })}
            className="rounded accent-[#4F6EF7] w-4 h-4"
          />
        </label>
      </div>
    </div>
  );
};
