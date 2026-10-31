import React, { useState } from 'react';
import {
  Check,
  ChevronDown,
  Cpu,
  HardDriveDownload,
  Scissors,
  Share2,
  Sparkles,
  X as XIcon,
  Zap,
} from 'lucide-react';
import { FORMAT_OPTIONS } from '../data/catalog';
import type { AppPage } from '../types';

interface LandingSectionsProps {
  language: 'en' | 'id';
  onStartClipping: () => void;
  onNavigate: (page: AppPage) => void;
}

const FAQ_ITEMS = [
  {
    q: 'Can I cut a YouTube video on my phone or tablet?',
    a: 'Yes. ClipsCutter runs directly in your browser with no software to install, so it works on iPhone, Android, tablet, laptop, or desktop. Paste your YouTube link or upload a video, pick your timestamps or run AI Auto-Cut, and export your clip.',
  },
  {
    q: 'How does the AI Auto-Clipper detect viral highlights?',
    a: 'Our server-side Gemini AI analyzes video structure, topic shifts, chapters, and hook pacing to pinpoint the strongest 30s–90s standalone segments, complete with ready-to-post captions and hashtags for TikTok, Reels, and YouTube Shorts.',
  },
  {
    q: 'Can I cut multiple clips from the same YouTube video?',
    a: 'Yes. You can create as many clips as you need from a single video—either manually with the start/end slider or in one batch using AI Auto-Cut. Every clip is saved in your Clips tab for previewing, downloading, or social publishing.',
  },
  {
    q: 'Do I need a YouTube account to cut videos with ClipsCutter?',
    a: 'No YouTube account is required to cut public videos. Simply paste any public watch, Shorts, or youtu.be link and trim immediately.',
  },
  {
    q: 'What is the best format for sharing clips on social media?',
    a: 'MP4 is universally accepted across Instagram Reels, TikTok, YouTube Shorts, X (Twitter), and Facebook. You can also switch the framing guide to 9:16 vertical in Settings before publishing. For podcast audio snippets, MP3 and M4A are ideal.',
  },
  {
    q: 'Does ClipsCutter re-encode my video or reduce quality?',
    a: 'No. Stream-copy byte-range extraction slices the exact segment bytes in original raw resolution up to 2160p 4K60 without re-encoding or adding watermarks.',
  },
  {
    q: 'How many clips can I create per day on the free plan?',
    a: 'Free users can trim clips up to 10 minutes in 360p and preview AI highlight suggestions. Activating an official Pro License Code (purchased offline directly from the owner) unlocks clips up to 1 hour+, 4K60 raw resolution, and unlimited AI processing.',
  },
  {
    q: 'How long will my processed clip remain available?',
    a: 'Cloud-processed clips remain available for 24 hours before automatic deletion for privacy. Download your clip or publish it to your connected social channels anytime within that window.',
  },
];

const COMPARISON_ROWS = [
  { feature: 'Trim Before Downloading', cc: true, typical: false },
  { feature: 'No Full Video Download Required', cc: true, typical: false },
  { feature: 'Original 4K Quality, Zero Re-encoding', cc: true, typical: false },
  { feature: 'AI Viral Highlight Auto-Clipper', cc: true, typical: false },
  { feature: 'Direct Social Media Caption & Sync', cc: true, typical: false },
  { feature: 'MP3 / M4A / Opus Audio Extraction', cc: true, typical: true },
  { feature: 'No Watermarks or Software Install', cc: true, typical: false },
];

const USE_CASES = [
  'Social Media Clips',
  'Memes Sharing',
  'Sharing Highlights',
  'Archiving Moments',
  'Content Creation',
  'Educational Snippets',
  'Presentations & Pitches',
  'Research & Analysis',
  'Event Highlights',
  'Tutorial Creation',
  'Product Reviews',
  'Advertisements',
];

export const LandingSections: React.FC<LandingSectionsProps> = ({
  language,
  onStartClipping,
  onNavigate,
}) => {
  const [openFaqIdx, setOpenFaqIdx] = useState<number | null>(0);

  return (
    <div className="w-full">
      {/* 1. 4-Column Quantitative Stats Strip matching clipscutter.com */}
      <section className="border-t border-b border-slate-100 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-8 py-12 grid grid-cols-2 md:grid-cols-4 divide-y md:divide-y-0 md:divide-x divide-slate-100">
          {[
            { value: '2M+', label: language === 'id' ? 'Klip Diproses' : 'Clips Processed' },
            { value: '4K', label: language === 'id' ? 'Resolusi Maksimal' : 'Max Resolution' },
            { value: '99.98%', label: language === 'id' ? 'Tingkat Sukses' : 'Success Rate' },
            { value: '100K+', label: language === 'id' ? 'Kreator Puas' : 'Satisfied Users' },
          ].map((stat) => (
            <div key={stat.label} className="py-4 md:py-2 px-6 text-center">
              <div className="text-3xl sm:text-[40px] font-extrabold tracking-tight text-[#4F6EF7] tabular-nums">
                {stat.value}
              </div>
              <div className="text-xs sm:text-sm text-slate-500 mt-1.5">{stat.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* 2. Features Section on Soft Periwinkle Canvas (#F2F5FF) matching clipscutter-home.png */}
      <section className="bg-[#F2F5FF] py-20 px-4 sm:px-8">
        <div className="max-w-6xl mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-slate-900">
              {language === 'id' ? 'Fitur Unggulan' : 'Features'}
            </h2>
            <p className="text-slate-600 mt-3 text-base">
              {language === 'id'
                ? 'Pemotongan byte-range instan ditambah AI Auto-Clipper dan publikasi media sosial.'
                : 'Byte-range stream extraction paired with AI highlight detection and social media publishing.'}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white rounded-2xl p-7 border border-slate-200/80 flex flex-col justify-between gap-5">
              <div>
                <div className="w-10 h-10 rounded-xl bg-[#4F6EF7]/10 text-[#4F6EF7] flex items-center justify-center mb-4">
                  <Zap className="w-5 h-5" />
                </div>
                <h3 className="text-xl font-bold text-slate-900">Quick Stream-Copy Processing</h3>
                <p className="text-sm text-slate-600 mt-2 leading-relaxed">
                  Slice exact start and end timestamps directly from the source stream without downloading or re-encoding the entire file.
                </p>
              </div>
              <p className="text-xs text-slate-500 pt-3 border-t border-slate-100">
                Instant results · Zero transcoding wait queues
              </p>
            </div>

            <div className="bg-white rounded-2xl p-7 border border-slate-200/80 flex flex-col justify-between gap-5">
              <div>
                <div className="w-10 h-10 rounded-xl bg-[#4F6EF7]/10 text-[#4F6EF7] flex items-center justify-center mb-4">
                  <Sparkles className="w-5 h-5" />
                </div>
                <h3 className="text-xl font-bold text-slate-900">AI Viral Auto-Clipper</h3>
                <p className="text-sm text-slate-600 mt-2 leading-relaxed">
                  Automatically detect high-retention hooks, funniest moments, and quotable insights with 9:16 vertical crop framing and captions.
                </p>
              </div>
              <p className="text-xs text-slate-500 pt-3 border-t border-slate-100">
                Powered by Gemini AI · Multi-clip batch extraction
              </p>
            </div>

            <div className="bg-white rounded-2xl p-7 border border-slate-200/80 flex flex-col justify-between gap-5">
              <div>
                <div className="w-10 h-10 rounded-xl bg-[#4F6EF7]/10 text-[#4F6EF7] flex items-center justify-center mb-4">
                  <Cpu className="w-5 h-5" />
                </div>
                <h3 className="text-xl font-bold text-slate-900">Pristine 4K60 Raw Quality</h3>
                <p className="text-sm text-slate-600 mt-2 leading-relaxed">
                  Export clips in original 2160p 4K, 1440p, or 1080p60 clarity, or extract pure studio-grade MP3, M4A, OGG, and Opus audio.
                </p>
              </div>
              <p className="text-xs text-slate-500 pt-3 border-t border-slate-100">
                6 video &amp; audio codecs · Zero watermarks
              </p>
            </div>

            <div className="bg-white rounded-2xl p-7 border border-slate-200/80 flex flex-col justify-between gap-5">
              <div>
                <div className="w-10 h-10 rounded-xl bg-[#4F6EF7]/10 text-[#4F6EF7] flex items-center justify-center mb-4">
                  <Share2 className="w-5 h-5" />
                </div>
                <h3 className="text-xl font-bold text-slate-900">
                  Social Media Integration &amp; Bandwidth Saving
                </h3>
                <p className="text-sm text-slate-600 mt-2 leading-relaxed">
                  Validate duration &amp; aspect ratios for TikTok, YouTube Shorts, Instagram Reels, X, and Facebook, generate AI hashtags, and schedule posts.
                </p>
              </div>
              <p className="text-xs text-slate-500 pt-3 border-t border-slate-100">
                Up to 98% less bandwidth vs full-video downloaders
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 3. How to Cut and Download YouTube Videos (01, 02, 03) */}
      <section className="py-20 px-4 sm:px-8 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-slate-900">
              How to Cut and Share Videos
            </h2>
            <p className="text-slate-600 mt-3 text-base">
              Three simple steps to cut any YouTube or uploaded video and publish just the clip you need
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                num: '01.',
                title: 'Paste YouTube URL or Upload',
                desc: 'Copy the link of any YouTube video (watch, Shorts, or live archive) or upload an MP4/WebM file into the trimmer.',
              },
              {
                num: '02.',
                title: 'Select Time Range or AI Auto-Cut',
                desc: 'Drag the precision dual-handle timeline slider or click AI Auto-Cut to automatically pinpoint viral moments.',
              },
              {
                num: '03.',
                title: 'Download or Publish to Socials',
                desc: 'Click "Create" to download your raw clip in seconds or push directly to TikTok, Shorts, Reels, and X with AI captions.',
              },
            ].map((step) => (
              <div key={step.num} className="p-7 rounded-2xl border border-slate-200 bg-white">
                <span className="font-tabular text-2xl font-extrabold text-[#4F6EF7]">
                  {step.num}
                </span>
                <h3 className="text-lg font-bold text-slate-900 mt-3">{step.title}</h3>
                <p className="text-sm text-slate-600 mt-2 leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 4. Stop Downloading What You Don't Need (~1.8 GB vs ~4 MB) + Comparison Table */}
      <section className="py-20 px-4 sm:px-8 bg-slate-50/80 border-t border-b border-slate-100">
        <div className="max-w-5xl mx-auto space-y-16">
          <div>
            <div className="text-center max-w-2xl mx-auto mb-12">
              <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-slate-900">
                Stop Downloading What You Don&apos;t Need
              </h2>
              <p className="text-slate-600 mt-3 text-base">
                Most tools make you grab the whole multi-gigabyte video first. ClipsCutter skips that entirely.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-11 gap-6 items-center">
              <div className="md:col-span-5 p-7 rounded-2xl bg-white border border-slate-200">
                <h3 className="text-base font-semibold text-slate-500">Full Video Download</h3>
                <div className="text-3xl font-extrabold text-slate-800 font-tabular mt-1 mb-5">
                  ~1.8 GB
                </div>
                <ul className="space-y-2.5 text-sm text-slate-600">
                  <li className="flex items-center gap-2.5">
                    <XIcon className="w-4 h-4 text-red-500 shrink-0" />
                    <span>Takes 10 – 30 min to download</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <XIcon className="w-4 h-4 text-red-500 shrink-0" />
                    <span>Requires heavy desktop editing software</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <XIcon className="w-4 h-4 text-red-500 shrink-0" />
                    <span>Wastes storage on footage you skip</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <XIcon className="w-4 h-4 text-red-500 shrink-0" />
                    <span>Loses quality after re-exporting</span>
                  </li>
                </ul>
              </div>

              <div className="md:col-span-1 text-center font-bold text-sm text-slate-400">VS</div>

              <div className="md:col-span-5 p-7 rounded-2xl bg-white border-2 border-[#4F6EF7]">
                <h3 className="text-base font-semibold text-[#4F6EF7]">ClipsCutter Clip</h3>
                <div className="text-3xl font-extrabold text-slate-900 font-tabular mt-1 mb-5">
                  ~4 MB
                </div>
                <ul className="space-y-2.5 text-sm text-slate-700">
                  <li className="flex items-center gap-2.5">
                    <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Ready to download or share in seconds</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Runs 100% in browser, no software needed</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Extracts only the segment you actually want</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>Original 4K quality with AI social hooks</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>

          {/* Comparison Matrix */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
            <div className="px-6 py-5 border-b border-slate-100">
              <h3 className="text-xl font-bold text-slate-900">
                ClipsCutter vs Other YouTube Download Tools
              </h3>
            </div>
            <div className="divide-y divide-slate-100">
              <div className="grid grid-cols-12 px-6 py-3 bg-slate-50 text-xs font-semibold text-slate-500">
                <div className="col-span-6">Feature</div>
                <div className="col-span-3 text-center text-[#4F6EF7]">ClipsCutter</div>
                <div className="col-span-3 text-center">Typical Tool</div>
              </div>
              {COMPARISON_ROWS.map((row) => (
                <div key={row.feature} className="grid grid-cols-12 px-6 py-3.5 items-center text-sm">
                  <div className="col-span-6 font-medium text-slate-800">{row.feature}</div>
                  <div className="col-span-3 flex justify-center">
                    <Check className="w-5 h-5 text-[#4F6EF7]" aria-label="Supported" />
                  </div>
                  <div className="col-span-3 flex justify-center">
                    {row.typical ? (
                      <Check className="w-5 h-5 text-slate-400" aria-label="Supported" />
                    ) : (
                      <XIcon className="w-5 h-5 text-slate-300" aria-label="Not supported" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* 5. 6 Formats Section */}
      <section className="py-20 px-4 sm:px-8 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-slate-900">
              6 Formats to Download Your Clip
            </h2>
            <p className="text-slate-600 mt-3 text-base">
              Choose the video or audio codec that fits your device, editing suite, or social platform.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {FORMAT_OPTIONS.map((fmt) => (
              <div
                key={fmt.value}
                className="p-6 rounded-2xl border border-slate-200 hover:border-[#4F6EF7]/50 transition-colors bg-white"
              >
                <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
                  <span className="capitalize font-medium">{fmt.category} Format</span>
                  {fmt.value === 'MP4' && (
                    <span className="text-[#4F6EF7] font-semibold">Most Popular</span>
                  )}
                  {fmt.value === 'MP3' && (
                    <span className="text-[#4F6EF7] font-semibold">Best for Audio</span>
                  )}
                </div>
                <h3 className="text-xl font-bold text-slate-900">{fmt.label}</h3>
                <p className="text-sm text-slate-600 mt-2 leading-relaxed">{fmt.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 6. Use Cases Grid */}
      <section className="py-16 px-4 sm:px-8 bg-[#F2F5FF]/60 border-t border-slate-100">
        <div className="max-w-6xl mx-auto text-center">
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-900">Use Cases</h2>
          <p className="text-slate-600 mt-2 text-sm sm:text-base mb-10">
            Built for creators, marketers, educators, and social media teams
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3.5">
            {USE_CASES.map((uc) => (
              <div
                key={uc}
                className="px-4 py-3.5 rounded-xl bg-white border border-slate-200/80 text-sm font-medium text-slate-800 flex items-center justify-center gap-2"
              >
                <Scissors className="w-3.5 h-3.5 text-[#4F6EF7] shrink-0" />
                <span>{uc}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 7. Interactive FAQs */}
      <section className="py-20 px-4 sm:px-8 bg-white">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900">FAQ&apos;s</h2>
            <p className="text-slate-600 mt-2.5 text-base">
              Everything you need to know about cutting videos, AI highlights, and social publishing.
            </p>
          </div>

          <div className="divide-y divide-slate-200 border-t border-b border-slate-200">
            {FAQ_ITEMS.map((item, idx) => {
              const isOpen = openFaqIdx === idx;
              return (
                <div key={item.q} className="py-4">
                  <button
                    type="button"
                    aria-expanded={isOpen}
                    onClick={() => setOpenFaqIdx(isOpen ? null : idx)}
                    className="w-full flex items-center justify-between gap-4 text-left py-1.5 cursor-pointer group"
                  >
                    <span className="text-base font-semibold text-slate-900 group-hover:text-[#4F6EF7] transition-colors">
                      {item.q}
                    </span>
                    <ChevronDown
                      className={`w-5 h-5 text-slate-400 shrink-0 transition-transform duration-150 ${
                        isOpen ? 'rotate-180 text-[#4F6EF7]' : ''
                      }`}
                    />
                  </button>
                  {isOpen && (
                    <p className="text-sm text-slate-600 leading-relaxed pt-2 pr-8">{item.a}</p>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* 8. Bottom Conversion Banner */}
      <section className="py-16 px-4 sm:px-8 bg-[#4F6EF7] text-white text-center">
        <div className="max-w-3xl mx-auto space-y-5">
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
            Ready to cut and share your next viral clip?
          </h2>
          <p className="text-white/85 text-sm sm:text-base">
            Paste any YouTube link or upload a video—no watermarks, zero quality loss.
          </p>
          <button
            type="button"
            onClick={onStartClipping}
            className="inline-flex items-center gap-2 px-7 py-3.5 rounded-full bg-white text-[#4F6EF7] font-bold text-sm hover:bg-slate-50 transition-colors cursor-pointer shadow-sm"
          >
            <HardDriveDownload className="w-4 h-4" />
            <span>Start Clipping</span>
          </button>
        </div>
      </section>

      {/* 9. Quiet Footer matching clipscutter.com */}
      <footer className="bg-slate-950 text-slate-400 py-12 px-4 sm:px-8 text-sm">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-8 pb-8 border-b border-slate-800">
          <div>
            <span className="text-lg font-bold text-white tracking-tight">ClipsCutter</span>
            <p className="text-xs text-slate-500 mt-1">
              4K Raw Video Trimmer · AI Auto-Clipper · Social Media Publisher
            </p>
          </div>

          <div className="flex flex-wrap gap-8 text-xs font-medium">
            <div className="flex flex-col gap-2">
              <button
                type="button"
                onClick={() => onNavigate('privacy')}
                className="text-left hover:text-white cursor-pointer"
              >
                Privacy Policy
              </button>
              <button
                type="button"
                onClick={() => onNavigate('privacy')}
                className="text-left hover:text-white cursor-pointer"
              >
                Terms of Service
              </button>
            </div>
            <div className="flex flex-col gap-2">
              <button
                type="button"
                onClick={() => onNavigate('home')}
                className="text-left hover:text-white cursor-pointer"
              >
                YT Trimmer
              </button>
              <button
                type="button"
                onClick={() => onNavigate('contact')}
                className="text-left hover:text-white cursor-pointer"
              >
                Contact Us
              </button>
            </div>
            <div className="flex flex-col gap-2">
              <button
                type="button"
                onClick={() => onNavigate('api')}
                className="text-left hover:text-white cursor-pointer"
              >
                Developer API
              </button>
              <button
                type="button"
                onClick={() => onNavigate('pricing')}
                className="text-left hover:text-white cursor-pointer"
              >
                Pricing
              </button>
            </div>
          </div>
        </div>
        <div className="max-w-6xl mx-auto pt-6 text-xs text-slate-500 flex items-center justify-between flex-wrap gap-2">
          <span>ClipsCutter.com® | Copyright 2026. All Rights Reserved.</span>
          <span>Zero Re-Encoding Stream Architecture</span>
        </div>
      </footer>
    </div>
  );
};
