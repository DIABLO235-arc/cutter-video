import React, { useEffect, useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { FORMAT_OPTIONS } from '../data/catalog';
import type { ExportFormat } from '../types';

interface FormatDropdownProps {
  value: ExportFormat;
  onChange: (format: ExportFormat) => void;
}

export const MediaLayerIcon: React.FC<{ className?: string }> = ({ className = 'w-5 h-5' }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    className={className}
  >
    <rect x="6" y="4" width="15" height="13" rx="2" />
    <path d="M3 8v10a2 2 0 0 0 2 2h12" />
    <polygon points="11.5 8 16.5 10.5 11.5 13 11.5 8" fill="currentColor" stroke="none" />
  </svg>
);

export const FormatDropdown: React.FC<FormatDropdownProps> = ({ value, onChange }) => {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, []);

  const videoFormats = FORMAT_OPTIONS.filter((f) => f.category === 'video');
  const audioFormats = FORMAT_OPTIONS.filter((f) => f.category === 'audio');

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        aria-label={`Output format: ${value}`}
        aria-expanded={open}
        onClick={() => setOpen((prev) => !prev)}
        className={`w-full h-[52px] px-4 rounded-xl flex items-center justify-between transition-all cursor-pointer ${
          open
            ? 'bg-[#F7F8FA] ring-2 ring-[#4F6EF7] text-slate-900'
            : 'bg-[#F7F8FA] hover:bg-[#F0F2F6] text-slate-800 border border-transparent'
        }`}
      >
        <div className="flex items-center gap-3">
          <MediaLayerIcon className="w-5 h-5 text-slate-700 shrink-0" />
          <span className="text-[15px] font-medium tracking-tight whitespace-nowrap">{value}</span>
        </div>
        <div className="flex items-center gap-3 pl-3 border-l border-slate-300 h-6">
          <ChevronDown
            className={`w-4 h-4 text-slate-700 transition-transform duration-150 ${
              open ? 'rotate-180' : ''
            }`}
          />
        </div>
      </button>

      {open && (
        <div
          role="listbox"
          aria-label="Select video or audio format"
          className="absolute left-0 right-0 mt-1.5 bg-white rounded-xl border border-slate-200 shadow-lg z-30 overflow-hidden max-h-80 overflow-y-auto"
        >
          <div className="px-4 py-2.5 text-[11px] font-semibold tracking-wider text-slate-500 border-b border-slate-100 bg-white">
            VIDEO FORMATS
          </div>
          {videoFormats.map((fmt) => {
            const selected = fmt.value === value;
            return (
              <button
                key={fmt.value}
                type="button"
                role="option"
                aria-selected={selected}
                onClick={() => {
                  onChange(fmt.value);
                  setOpen(false);
                }}
                className={`w-full text-left px-4 py-3 text-[15px] border-b border-slate-100 transition-colors cursor-pointer flex items-center justify-between ${
                  selected
                    ? 'bg-slate-100/80 font-semibold text-slate-900'
                    : 'bg-white hover:bg-slate-50 text-slate-800'
                }`}
              >
                <span>{fmt.label}</span>
              </button>
            );
          })}

          <div className="px-4 py-2.5 text-[11px] font-semibold tracking-wider text-slate-500 border-b border-slate-100 bg-white">
            AUDIO FORMATS
          </div>
          {audioFormats.map((fmt, index) => {
            const selected = fmt.value === value;
            return (
              <button
                key={fmt.value}
                type="button"
                role="option"
                aria-selected={selected}
                onClick={() => {
                  onChange(fmt.value);
                  setOpen(false);
                }}
                className={`w-full text-left px-4 py-3 text-[15px] transition-colors cursor-pointer flex items-center justify-between ${
                  index < audioFormats.length - 1 ? 'border-b border-slate-100' : ''
                } ${
                  selected
                    ? 'bg-slate-100/80 font-semibold text-slate-900'
                    : 'bg-white hover:bg-slate-50 text-slate-800'
                }`}
              >
                <span>{fmt.label}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
