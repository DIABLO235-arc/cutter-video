import React from 'react';
import type { AISegmentSuggestion } from '../types';
import { clampTrimRange, formatPlayerTime } from '../utils/timeUtils';

interface DualRangeSliderProps {
  min: number;
  max: number;
  startSec: number;
  endSec: number;
  onChange: (nextStart: number, nextEnd: number, activeHandle: 'start' | 'end') => void;
  aiSegments?: AISegmentSuggestion[];
  onSelectSegment?: (seg: AISegmentSuggestion) => void;
}

export const DualRangeSlider: React.FC<DualRangeSliderProps> = ({
  min,
  max,
  startSec,
  endSec,
  onChange,
  aiSegments = [],
  onSelectSegment,
}) => {
  const safeMax = Math.max(min + 1, max);
  const startPercent = Math.min(100, Math.max(0, ((startSec - min) / (safeMax - min)) * 100));
  const endPercent = Math.min(100, Math.max(0, ((endSec - min) / (safeMax - min)) * 100));

  const handleStartChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = Number(e.target.value);
    const clamped = clampTrimRange(Math.min(raw, endSec - 1), endSec, safeMax, 1);
    onChange(clamped.startSec, clamped.endSec, 'start');
  };

  const handleEndChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = Number(e.target.value);
    const clamped = clampTrimRange(startSec, Math.max(raw, startSec + 1), safeMax, 1);
    onChange(clamped.startSec, clamped.endSec, 'end');
  };

  return (
    <div className="py-2 select-none">
      <div className="relative h-7 flex items-center">
        {/* Background Track */}
        <div className="w-full h-[5px] bg-slate-200 rounded-full relative overflow-hidden">
          {/* AI Highlight Heatmap Markers (when AI Auto-Cut was run) */}
          {aiSegments.map((seg) => {
            const left = ((seg.startSec - min) / (safeMax - min)) * 100;
            const width = Math.max(1.5, ((seg.endSec - seg.startSec) / (safeMax - min)) * 100);
            return (
              <div
                key={seg.id}
                style={{ left: `${left}%`, width: `${width}%` }}
                className="absolute top-0 bottom-0 bg-amber-400/60"
              />
            );
          })}

          {/* Selected Active Blue Segment matching ClipsCutter */}
          <div
            style={{
              left: `${startPercent}%`,
              width: `${Math.max(0, endPercent - startPercent)}%`,
            }}
            className="absolute top-0 bottom-0 bg-[#4F6EF7]"
          />
        </div>

        {/* Start Handle */}
        <input
          type="range"
          aria-label="Clip start time in seconds"
          min={min}
          max={safeMax}
          step={1}
          value={startSec}
          onChange={handleStartChange}
          className="clip-range-thumb absolute inset-0 w-full h-full m-0 z-10"
        />

        {/* End Handle */}
        <input
          type="range"
          aria-label="Clip end time in seconds"
          min={min}
          max={safeMax}
          step={1}
          value={endSec}
          onChange={handleEndChange}
          className="clip-range-thumb absolute inset-0 w-full h-full m-0 z-20"
        />
      </div>

      {/* Quick AI Highlight Jump Buttons below timeline when AI segments exist */}
      {aiSegments.length > 0 && onSelectSegment && (
        <div className="mt-2 flex items-center gap-2 flex-wrap text-[11px] text-slate-500">
          <span className="font-medium text-slate-600">AI Highlights:</span>
          {aiSegments.map((seg, i) => (
            <button
              key={seg.id}
              type="button"
              onClick={() => onSelectSegment(seg)}
              className="text-[#4F6EF7] hover:underline font-tabular cursor-pointer whitespace-nowrap"
            >
              #{i + 1} ({formatPlayerTime(seg.startSec)}–{formatPlayerTime(seg.endSec)})
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
