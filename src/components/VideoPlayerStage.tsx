import React, { useEffect, useRef, useState } from 'react';
import {
  FastForward,
  Maximize,
  Pause,
  Play,
  Rewind,
  Square,
  Volume2,
  VolumeX,
} from 'lucide-react';
import type {
  AspectRatioMode,
  SubtitleCue,
  SubtitleStyleId,
  VideoSource,
} from '../types';
import { formatPlayerTime } from '../utils/timeUtils';
import { computeActiveCueAndWordIndex } from '../utils/subtitleEngine';
import { getSubtitleStyleById, getTemplateById } from '../utils/templatesAndPresets';

interface VideoPlayerStageProps {
  source: VideoSource;
  currentTimeSec: number;
  startSec: number;
  endSec: number;
  isPlaying: boolean;
  isPreviewLooping: boolean;
  aspectRatio: AspectRatioMode;
  autoCaptions: boolean;
  templateId?: string;
  hookText?: string;
  watermarkText?: string;
  showProgressBar?: boolean;
  subtitleStyleId?: SubtitleStyleId;
  subtitles?: SubtitleCue[];
  onPlayPause: () => void;
  onStop: () => void;
  onSeek: (timeSec: number) => void;
  onTimeUpdate: (timeSec: number) => void;
  onDurationDetected?: (durationSec: number) => void;
}

export const VideoPlayerStage: React.FC<VideoPlayerStageProps> = ({
  source,
  currentTimeSec,
  startSec,
  endSec,
  isPlaying,
  isPreviewLooping,
  aspectRatio,
  autoCaptions,
  templateId = 'clean-raw',
  hookText = '',
  watermarkText = '',
  showProgressBar = false,
  subtitleStyleId = 'hormozi-karaoke',
  subtitles = [],
  onPlayPause,
  onStop,
  onSeek,
  onTimeUpdate,
  onDurationDetected,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [muted, setMuted] = useState(false);

  // Latest state refs so requestAnimationFrame / intervals never tear down canvas
  const stateRef = useRef({
    currentTimeSec,
    isPlaying,
    isPreviewLooping,
    startSec,
    endSec,
    durationSec: source.durationSec,
    demoSceneId: source.demoSceneId,
    onTimeUpdate,
    onStop,
  });

  useEffect(() => {
    stateRef.current = {
      currentTimeSec,
      isPlaying,
      isPreviewLooping,
      startSec,
      endSec,
      durationSec: source.durationSec,
      demoSceneId: source.demoSceneId,
      onTimeUpdate,
      onStop,
    };
  }, [
    currentTimeSec,
    isPlaying,
    isPreviewLooping,
    startSec,
    endSec,
    source.durationSec,
    source.demoSceneId,
    onTimeUpdate,
    onStop,
  ]);

  // Sync HTML5 uploaded video playback
  useEffect(() => {
    const vid = videoRef.current;
    if (!vid || source.type !== 'upload') return;
    vid.muted = muted;
    if (isPlaying) {
      vid.play().catch(() => {});
    } else {
      vid.pause();
    }
  }, [isPlaying, muted, source.type]);

  useEffect(() => {
    const vid = videoRef.current;
    if (!vid || source.type !== 'upload') return;
    if (Math.abs(vid.currentTime - currentTimeSec) > 0.75) {
      vid.currentTime = currentTimeSec;
    }
  }, [currentTimeSec, source.type]);

  // Smooth 100ms timer progression while playing so word-by-word karaoke sync is frame-accurate
  useEffect(() => {
    if (source.type === 'upload') return;
    if (!isPlaying) return;

    const interval = window.setInterval(() => {
      const st = stateRef.current;
      const next = Number((st.currentTimeSec + 0.1).toFixed(2));
      if (st.isPreviewLooping && next >= st.endSec) {
        st.onTimeUpdate(st.startSec);
      } else if (next >= st.durationSec) {
        st.onStop();
      } else {
        st.onTimeUpdate(next);
      }
    }, 100);

    return () => window.clearInterval(interval);
  }, [isPlaying, source.type]);

  // Draw crisp scene on Demo Canvas (on-demand + low-overhead tick when playing)
  useEffect(() => {
    if (source.type !== 'demo') return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;
    const t = currentTimeSec;
    const scene = source.demoSceneId || 'supermarket';

    ctx.clearRect(0, 0, w, h);

    if (scene === 'supermarket') {
      // Ceiling & Mall Interior inspired by the user's Supermarket Simulator reference frame
      const skyGrad = ctx.createLinearGradient(0, 0, 0, h * 0.45);
      skyGrad.addColorStop(0, '#3C3F41');
      skyGrad.addColorStop(1, '#686D73');
      ctx.fillStyle = skyGrad;
      ctx.fillRect(0, 0, w, h * 0.45);

      //Ceiling beams
      ctx.strokeStyle = 'rgba(255,255,255,0.16)';
      ctx.lineWidth = 3;
      for (let i = 0; i < 7; i++) {
        ctx.beginPath();
        ctx.moveTo(i * 150, 0);
        ctx.lineTo(w * 0.42 + (i - 3) * 45, h * 0.42);
        ctx.stroke();
      }

      // Glossy Mall Floor
      const floorGrad = ctx.createLinearGradient(0, h * 0.44, 0, h);
      floorGrad.addColorStop(0, '#CFD4DA');
      floorGrad.addColorStop(1, '#8F969E');
      ctx.fillStyle = floorGrad;
      ctx.fillRect(0, h * 0.44, w, h * 0.56);

      // Escalator structure in center-right
      ctx.fillStyle = '#2B3036';
      ctx.beginPath();
      ctx.moveTo(w * 0.31, h * 0.46);
      ctx.lineTo(w * 0.37, h * 0.16);
      ctx.lineTo(w * 0.48, h * 0.16);
      ctx.lineTo(w * 0.45, h * 0.46);
      ctx.closePath();
      ctx.fill();

      // Animated escalator steps
      ctx.strokeStyle = '#94A3B8';
      ctx.lineWidth = 2;
      const stepOffset = (t * 18) % 14;
      for (let y = h * 0.18 + stepOffset; y < h * 0.45; y += 14) {
        const progress = (y - h * 0.16) / (h * 0.3);
        const lx = w * 0.36 - progress * 25;
        const rx = lx + 68;
        ctx.beginPath();
        ctx.moveTo(lx, y);
        ctx.lineTo(rx, y);
        ctx.stroke();
      }

      // Colorful scattered toy boxes across the mall floor (animated subtly)
      const palette = ['#EF4444', '#F59E0B', '#3B82F6', '#10B981', '#EC4899', '#8B5CF6'];
      for (let i = 0; i < 95; i++) {
        const seed = (i * 9301 + 49297) % 233280;
        const normX = seed / 233280;
        const seedY = ((i * 4331 + 19211) % 233280) / 233280;
        const bx = w * 0.28 + normX * (w * 0.66) + Math.sin(t * 1.4 + i) * 1.8;
        const by = h * 0.47 + seedY * (h * 0.38);
        const bw = 10 + (i % 4) * 5;
        const bh = 7 + (i % 3) * 4;
        ctx.fillStyle = palette[i % palette.length];
        ctx.fillRect(bx, by, bw, bh);
      }

      // Iconic Blue "Please return your trolley here" Sign on the left
      ctx.save();
      ctx.fillStyle = '#0B358E';
      ctx.beginPath();
      ctx.moveTo(22, h * 0.47);
      ctx.lineTo(w * 0.31, h * 0.46);
      ctx.lineTo(w * 0.32, h * 0.78);
      ctx.lineTo(22, h * 0.81);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = '#DCE7FF';
      ctx.font = '600 17px "Plus Jakarta Sans", sans-serif';
      ctx.fillText('Please return', 34, h * 0.545);
      ctx.fillText('your trolley here', 34, h * 0.605);
      ctx.font = '400 13px "Plus Jakarta Sans", sans-serif';
      ctx.fillText('Thank you', 40, h * 0.725);

      // Trolley wireframe icon positioned cleanly to the right of text
      ctx.strokeStyle = '#DCE7FF';
      ctx.lineWidth = 2.2;
      ctx.strokeRect(w * 0.232, h * 0.59, 42, 26);
      ctx.beginPath();
      ctx.arc(w * 0.246, h * 0.665, 4.5, 0, Math.PI * 2);
      ctx.arc(w * 0.278, h * 0.665, 4.5, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();

      // Top-left HUD metrics bar
      ctx.fillStyle = 'rgba(15, 23, 42, 0.72)';
      ctx.fillRect(14, 14, 130, 74);
      ctx.fillStyle = '#E2E8F0';
      ctx.font = '600 11px "JetBrains Mono", monospace';
      ctx.fillText(`BOXES  ${2844 + Math.floor(t % 50)}/13380`, 22, 32);
      ctx.fillText('ITEMS  257/978', 22, 50);
      ctx.fillStyle = '#FACC15';
      ctx.fillText('LEVEL  16   $4,820', 22, 69);

      // Creator PiP Cam on bottom-right
      ctx.fillStyle = '#1E293B';
      ctx.fillRect(w - 178, h - 122, 158, 92);
      ctx.strokeStyle = 'rgba(255,255,255,0.28)';
      ctx.lineWidth = 2;
      ctx.strokeRect(w - 178, h - 122, 158, 92);
      ctx.fillStyle = '#94A3B8';
      ctx.beginPath();
      ctx.arc(w - 99, h - 84, 20, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#475569';
      ctx.beginPath();
      ctx.arc(w - 99, h - 38, 34, Math.PI, 0);
      ctx.fill();
    } else if (scene === 'podcast') {
      // Warm Studio Dual-Camera Podcast Scene
      const bg = ctx.createLinearGradient(0, 0, w, h);
      bg.addColorStop(0, '#0F172A');
      bg.addColorStop(1, '#1E293B');
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, w, h);

      // Acoustic Wood Slats
      ctx.fillStyle = 'rgba(180, 120, 70, 0.22)';
      for (let x = 30; x < w - 30; x += 26) {
        ctx.fillRect(x, 30, 12, h - 90);
      }

      // Live Audio Waveform Visualization
      ctx.fillStyle = '#4F6EF7';
      const bars = 48;
      const barW = (w * 0.7) / bars;
      for (let i = 0; i < bars; i++) {
        const amp =
          18 +
          Math.abs(Math.sin(t * 4.5 + i * 0.45)) * 68 +
          Math.abs(Math.cos(t * 2.1 + i * 0.2)) * 28;
        const bx = w * 0.15 + i * barW;
        ctx.fillRect(bx, h * 0.52 - amp / 2, barW - 4, amp);
      }

      ctx.fillStyle = '#F8FAFC';
      ctx.font = '700 24px "Plus Jakarta Sans", sans-serif';
      ctx.fillText('CREATOR STUDIO EP. 48 — 4K RAW PODCAST', 48, 64);
      ctx.fillStyle = '#94A3B8';
      ctx.font = '500 14px "JetBrains Mono", monospace';
      ctx.fillText(`TIMECODE ${formatPlayerTime(t)}  |  48kHz STEREO PCM`, 48, 92);
    } else {
      // 4K Tech Keynote Stage
      const bg = ctx.createRadialGradient(w * 0.5, h * 0.4, 30, w * 0.5, h * 0.5, w * 0.7);
      bg.addColorStop(0, '#1E3A8A');
      bg.addColorStop(1, '#090D16');
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, w, h);

      // Rotating geometric lens rings
      ctx.strokeStyle = 'rgba(129, 152, 255, 0.55)';
      ctx.lineWidth = 2.5;
      for (let r = 45; r <= 165; r += 30) {
        ctx.beginPath();
        ctx.arc(w * 0.5, h * 0.46, r + Math.sin(t * 2 + r) * 4, 0, Math.PI * 2);
        ctx.stroke();
      }

      ctx.fillStyle = '#FFFFFF';
      ctx.font = '700 26px "Plus Jakarta Sans", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('4K60 ZERO RE-ENCODING ENGINE', w * 0.5, h * 0.16);
      ctx.textAlign = 'start';
    }
  }, [currentTimeSec, source.type, source.demoSceneId]);

  const handleScrubBarClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    onSeek(Math.floor(ratio * source.durationSec));
  };

  const handleFullscreen = () => {
    if (!containerRef.current) return;
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    } else {
      containerRef.current.requestFullscreen?.().catch(() => {});
    }
  };

  const progressPct = Math.min(
    100,
    Math.max(0, (currentTimeSec / Math.max(1, source.durationSec)) * 100)
  );
  const trimStartPct = (startSec / Math.max(1, source.durationSec)) * 100;
  const trimWidthPct = ((endSec - startSec) / Math.max(1, source.durationSec)) * 100;
  const clipProgressPct = Math.min(
    100,
    Math.max(0, ((currentTimeSec - startSec) / Math.max(1, endSec - startSec)) * 100)
  );

  const activeTemplate = getTemplateById(templateId);
  const activeSubStyle = getSubtitleStyleById(subtitleStyleId);
  const activeSubtitleState = autoCaptions
    ? computeActiveCueAndWordIndex(subtitles, currentTimeSec)
    : null;

  return (
    <div
      ref={containerRef}
      data-testid="video-player-stage"
      className="relative w-full aspect-video rounded-xl overflow-hidden bg-slate-950 shadow-sm select-none group"
    >
      {/* 1. Uploaded Local File Video */}
      {source.type === 'upload' && source.objectUrl && (
        <video
          ref={videoRef}
          src={source.objectUrl}
          className="w-full h-full object-contain bg-black"
          playsInline
          onLoadedMetadata={(e) => {
            const dur = Math.floor(e.currentTarget.duration);
            if (dur > 0 && onDurationDetected) {
              onDurationDetected(dur);
            }
          }}
          onTimeUpdate={(e) => {
            const cur = e.currentTarget.currentTime;
            if (isPreviewLooping && cur >= endSec) {
              e.currentTarget.currentTime = startSec;
              onTimeUpdate(startSec);
            } else {
              onTimeUpdate(cur);
            }
          }}
          onEnded={onStop}
        />
      )}

      {/* 2. YouTube Embedded Video */}
      {source.type === 'youtube' && source.youtubeId && (
        <div className="w-full h-full relative bg-slate-950">
          <iframe
            title={source.title}
            src={`https://www.youtube.com/embed/${source.youtubeId}?start=${Math.floor(startSec)}&end=${Math.floor(endSec)}&autoplay=${isPlaying ? 1 : 0}&mute=${muted ? 1 : 0}&rel=0&modestbranding=1`}
            className="w-full h-full border-0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
      )}

      {/* 3. Interactive Multi-Scene Demo Canvas */}
      {source.type === 'demo' && (
        <canvas
          ref={canvasRef}
          width={854}
          height={480}
          onClick={onPlayPause}
          className="w-full h-full object-cover cursor-pointer"
        />
      )}

      {/* Smart Aspect Crop + Live Video Template & Word-Synced Subtitle Overlay */}
      <div className="absolute inset-0 pointer-events-none flex items-center justify-center z-10">
        {aspectRatio !== '16:9' && <div className="h-full bg-black/60 flex-1" />}

        <div
          data-testid="active-template-frame"
          className={`h-full relative flex flex-col justify-between overflow-hidden ${
            aspectRatio === '9:16'
              ? 'aspect-[9/16] border-x-2 border-[#4F6EF7]/90'
              : aspectRatio === '1:1'
              ? 'aspect-square border-x-2 border-[#4F6EF7]/90'
              : 'w-full'
          }`}
        >
          {/* Cinema Letterbox Top Bar */}
          {activeTemplate.headerTheme === 'cinema-bars' && (
            <div className="w-full h-7 bg-black/95 shrink-0" />
          )}

          {/* Top Template Hook Banner + Optional Watermark */}
          <div className="px-2.5 pt-2.5 flex flex-col items-center gap-1 shrink-0">
            {showProgressBar && (
              <div className="w-full h-1 bg-white/25 rounded-full overflow-hidden">
                <div
                  style={{ width: `${clipProgressPct}%` }}
                  className="h-full bg-[#FACC15]"
                />
              </div>
            )}

            {hookText.trim() && (
              <div
                data-testid="template-hook-banner"
                className={`px-2.5 py-1 rounded-md text-center font-extrabold tracking-tight leading-tight max-w-full break-words shadow-sm ${
                  activeTemplate.headerTheme === 'yellow-impact'
                    ? 'bg-[#FACC15] text-slate-950 text-[10px] sm:text-xs uppercase'
                    : activeTemplate.headerTheme === 'royal-banner'
                    ? 'bg-[#4F6EF7] text-white text-[10px] sm:text-xs uppercase'
                    : activeTemplate.headerTheme === 'podcast-tag'
                    ? 'bg-slate-950/85 text-white border border-white/20 text-[10px] sm:text-[11px]'
                    : 'bg-black/70 text-white text-[10px] sm:text-[11px]'
                }`}
              >
                {hookText}
              </div>
            )}

            {watermarkText.trim() && (
              <span className="text-[10px] font-semibold text-white/85 drop-shadow">
                {watermarkText}
              </span>
            )}
          </div>

          {/* Live 100% Synced Automatic Subtitles Overlay (2-line beat window in 9:16/1:1 so it never covers center play button) */}
          <div className="px-2.5 pb-12 sm:pb-14 flex justify-center shrink-0">
            {autoCaptions && (
              <div data-testid="live-subtitle-overlay" className="max-w-[95%] text-center">
                {activeSubtitleState ? (
                  (() => {
                    const maxWordsPerBeat =
                      aspectRatio === '9:16' ? 5 : aspectRatio === '1:1' ? 7 : 14;
                    const beatStart =
                      Math.floor(activeSubtitleState.activeWordIndex / maxWordsPerBeat) *
                      maxWordsPerBeat;
                    const visibleWords = activeSubtitleState.words.slice(
                      beatStart,
                      beatStart + maxWordsPerBeat
                    );
                    const sizeClass =
                      aspectRatio === '9:16'
                        ? 'text-[11px] sm:text-xs px-2.5 py-1'
                        : 'text-xs sm:text-sm px-3 py-1.5';

                    return (
                      <p
                        className={`inline-flex flex-wrap items-center justify-center gap-x-1 gap-y-0.5 leading-snug rounded-lg ${sizeClass} ${
                          activeSubStyle.uppercase ? 'uppercase' : ''
                        } ${
                          subtitleStyleId === 'hormozi-karaoke'
                            ? 'bg-black/80 font-extrabold text-white shadow'
                            : subtitleStyleId === 'clean-pop'
                            ? 'bg-slate-950/80 font-bold text-white shadow'
                            : subtitleStyleId === 'cinema-yellow'
                            ? 'bg-black/70 font-semibold text-[#FDE047]'
                            : subtitleStyleId === 'glass-minimal'
                            ? 'bg-black/60 font-medium text-white'
                            : 'bg-black/85 font-semibold text-white'
                        }`}
                      >
                        {visibleWords.map((word, localIdx) => {
                          const globalIdx = beatStart + localIdx;
                          const isWordActive =
                            activeSubStyle.wordByWordHighlight &&
                            globalIdx === activeSubtitleState.activeWordIndex;
                          return (
                            <span
                              key={`${activeSubtitleState.cue.id}-${globalIdx}`}
                              className={
                                isWordActive
                                  ? subtitleStyleId === 'hormozi-karaoke'
                                    ? 'text-[#FACC15] underline decoration-2 underline-offset-2'
                                    : 'bg-[#4F6EF7] text-white px-1 rounded'
                                  : ''
                              }
                            >
                              {word}
                            </span>
                          );
                        })}
                      </p>
                    );
                  })()
                ) : subtitles.length === 0 ? (
                  <p className="bg-black/80 text-white font-semibold text-[11px] sm:text-xs px-2.5 py-1 rounded-lg shadow">
                    {`Aktifkan subtitle otomatis di tab Subtitles`}
                  </p>
                ) : null}
              </div>
            )}
          </div>

          {/* Cinema Letterbox Bottom Bar */}
          {activeTemplate.headerTheme === 'cinema-bars' && (
            <div className="w-full h-11 bg-black/95 shrink-0" />
          )}
        </div>

        {aspectRatio !== '16:9' && <div className="h-full bg-black/60 flex-1" />}
      </div>

      {/* Center Translucent Play Overlay Button matching ClipsCutter */}
      {source.type !== 'youtube' && !isPlaying && (
        <button
          type="button"
          aria-label="Play video"
          onClick={onPlayPause}
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 rounded-full bg-black/45 hover:bg-black/65 text-white flex items-center justify-center transition-transform duration-150 hover:scale-105 cursor-pointer z-20"
        >
          <Play className="w-8 h-8 fill-white ml-1" />
        </button>
      )}

      {/* Bottom Scrim & Transport Controls matching image_910a48da.png */}
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/45 to-transparent pt-8 pb-3 px-4 z-20">
        {/* Progress & Trim Highlight Scrub Bar */}
        <div
          role="slider"
          aria-label="Video timeline scrubber"
          aria-valuemin={0}
          aria-valuemax={source.durationSec}
          aria-valuenow={Math.floor(currentTimeSec)}
          tabIndex={0}
          onClick={handleScrubBarClick}
          onKeyDown={(e) => {
            if (e.key === 'ArrowRight') onSeek(Math.min(source.durationSec, currentTimeSec + 5));
            if (e.key === 'ArrowLeft') onSeek(Math.max(0, currentTimeSec - 5));
          }}
          className="w-full h-1.5 bg-white/35 hover:h-2 transition-all rounded-full cursor-pointer relative mb-3 overflow-hidden"
        >
          {/* Active Trim Window Tint */}
          <div
            style={{ left: `${trimStartPct}%`, width: `${trimWidthPct}%` }}
            className="absolute top-0 bottom-0 bg-[#4F6EF7]/55"
          />
          {/* Playhead Fill */}
          <div
            style={{ width: `${progressPct}%` }}
            className="absolute top-0 bottom-0 left-0 bg-white"
          />
        </div>

        <div className="flex items-center justify-between text-white">
          <div className="flex items-center gap-3.5">
            <button
              type="button"
              aria-label={isPlaying ? 'Pause' : 'Play'}
              onClick={onPlayPause}
              className="hover:text-[#8198FF] transition-colors cursor-pointer"
            >
              {isPlaying ? (
                <Pause className="w-5 h-5 fill-current" />
              ) : (
                <Play className="w-5 h-5 fill-current" />
              )}
            </button>

            <button
              type="button"
              aria-label="Rewind 10 seconds"
              onClick={() => onSeek(Math.max(0, currentTimeSec - 10))}
              className="hover:text-[#8198FF] transition-colors cursor-pointer"
            >
              <Rewind className="w-5 h-5 fill-current" />
            </button>

            <button
              type="button"
              aria-label="Stop playback"
              onClick={onStop}
              className="hover:text-[#8198FF] transition-colors cursor-pointer"
            >
              <Square className="w-4 h-4 fill-current" />
            </button>

            <button
              type="button"
              aria-label="Forward 10 seconds"
              onClick={() => onSeek(Math.min(source.durationSec, currentTimeSec + 10))}
              className="hover:text-[#8198FF] transition-colors cursor-pointer"
            >
              <FastForward className="w-5 h-5 fill-current" />
            </button>

            <span className="font-tabular text-xs sm:text-[13px] font-medium tracking-tight text-white/95 pl-1 whitespace-nowrap">
              {formatPlayerTime(currentTimeSec)} / {formatPlayerTime(source.durationSec)}
            </span>

            {isPreviewLooping && (
              <span className="text-[11px] font-medium text-[#93ACFF] whitespace-nowrap hidden sm:inline">
                · Previewing Range
              </span>
            )}
          </div>

          <div className="flex items-center gap-3.5">
            <button
              type="button"
              aria-label={muted ? 'Unmute audio' : 'Mute audio'}
              onClick={() => setMuted((m) => !m)}
              className="hover:text-[#8198FF] transition-colors cursor-pointer"
            >
              {muted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
            </button>

            <button
              type="button"
              aria-label="Toggle fullscreen"
              onClick={handleFullscreen}
              className="hover:text-[#8198FF] transition-colors cursor-pointer"
            >
              <Maximize className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
