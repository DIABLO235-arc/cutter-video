import React, { useEffect, useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { QUALITY_OPTIONS } from '../data/catalog';
import type { QualityTier } from '../types';
import { MediaLayerIcon } from './FormatDropdown';

interface QualityDropdownProps {
  value: QualityTier;
  onChange: (quality: QualityTier) => void;
  isPro: boolean;
  onRequestProUnlock: (requestedQuality: QualityTier) => void;
  disabled?: boolean;
}

export const DiamondProIcon: React.FC<{ className?: string; unlocked?: boolean }> = ({
  className = 'w-5 h-5',
  unlocked = false,
}) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
    className={className}
  >
    <path
      d="M6.5 3.5H17.5L21.5 9.2L12 20.8L2.5 9.2L6.5 3.5Z"
      stroke={unlocked ? '#16A34A' : '#4F6EF7'}
      strokeWidth="1.9"
      strokeLinejoin="round"
      fill={unlocked ? 'rgba(22, 163, 74, 0.10)' : 'rgba(79, 110, 247, 0.12)'}
    />
    <path
      d="M2.8 9.2H21.2M12 20.4L8.2 9.2L9.8 3.6M12 20.4L15.8 9.2L14.2 3.6"
      stroke={unlocked ? '#16A34A' : '#4F6EF7'}
      strokeWidth="1.5"
      strokeLinejoin="round"
    />
  </svg>
);

export const QualityDropdown: React.FC<QualityDropdownProps> = ({
  value,
  onChange,
  isPro,
  onRequestProUnlock,
  disabled = false,
}) => {
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

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        disabled={disabled}
        aria-label={`Video quality: ${disabled ? 'Audio Only' : value}`}
        aria-expanded={open}
        onClick={() => !disabled && setOpen((prev) => !prev)}
        className={`w-full h-[52px] px-4 rounded-xl flex items-center justify-between transition-all ${
          disabled
            ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
            : open
            ? 'bg-[#F7F8FA] ring-2 ring-[#4F6EF7] text-slate-900 cursor-pointer'
            : 'bg-[#F7F8FA] hover:bg-[#F0F2F6] text-slate-800 cursor-pointer'
        }`}
      >
        <div className="flex items-center gap-3">
          <MediaLayerIcon className="w-5 h-5 text-slate-700 shrink-0" />
          <span className="text-[15px] font-medium tracking-tight whitespace-nowrap">
            {disabled ? 'High Bitrate' : value}
          </span>
        </div>
        <div className="flex items-center gap-3 pl-3 border-l border-slate-300 h-6">
          <ChevronDown
            className={`w-4 h-4 text-slate-700 transition-transform duration-150 ${
              open ? 'rotate-180' : ''
            }`}
          />
        </div>
      </button>

      {open && !disabled && (
        <div
          role="listbox"
          aria-label="Select video resolution"
          className="absolute left-0 right-0 mt-1.5 bg-white rounded-xl border border-slate-200 shadow-lg z-30 overflow-hidden max-h-96 overflow-y-auto"
        >
          {QUALITY_OPTIONS.map((opt, idx) => {
            const selected = opt.value === value;
            return (
              <button
                key={opt.value}
                type="button"
                role="option"
                aria-selected={selected}
                onClick={() => {
                  if (opt.requiresPro && !isPro) {
                    onRequestProUnlock(opt.value);
                  } else {
                    onChange(opt.value);
                  }
                  setOpen(false);
                }}
                className={`w-full text-left px-4 py-3 text-[15px] flex items-center justify-between transition-colors cursor-pointer ${
                  idx < QUALITY_OPTIONS.length - 1 ? 'border-b border-slate-100' : ''
                } ${
                  selected
                    ? 'bg-slate-100/80 font-semibold text-slate-900'
                    : 'bg-white hover:bg-slate-50 text-slate-800'
                }`}
              >
                <span>{opt.value}</span>
                {opt.requiresPro && <DiamondProIcon unlocked={isPro} className="w-5 h-5 shrink-0" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
