import type { SubtitleCue } from '../types';

export interface ActiveSubtitleRenderState {
  cue: SubtitleCue;
  words: string[];
  activeWordIndex: number;
  progressRatio: number;
}

/**
 * Finds the exact subtitle cue active at `currentTimeSec` and computes the
 * proportional word index for real-time word-by-word karaoke highlighting.
 */
export function computeActiveCueAndWordIndex(
  cues: SubtitleCue[],
  currentTimeSec: number
): ActiveSubtitleRenderState | null {
  if (!Array.isArray(cues) || cues.length === 0) return null;

  const cue = cues.find(
    (c) => currentTimeSec >= c.startSec && currentTimeSec <= c.endSec + 0.05
  );
  if (!cue) return null;

  const words = cue.text
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (words.length === 0) return null;

  const span = Math.max(0.2, cue.endSec - cue.startSec);
  const progressRatio = Math.max(0, Math.min(0.9999, (currentTimeSec - cue.startSec) / span));

  // Weight word timing by character length so longer words hold focus naturally
  const totalChars = words.reduce((acc, w) => acc + Math.max(1, w.length), 0);
  const targetCharPos = progressRatio * totalChars;

  let cumulative = 0;
  let activeWordIndex = 0;
  for (let i = 0; i < words.length; i++) {
    cumulative += Math.max(1, words[i].length);
    if (targetCharPos <= cumulative) {
      activeWordIndex = i;
      break;
    }
  }

  return {
    cue,
    words,
    activeWordIndex,
    progressRatio,
  };
}

/**
 * Formats seconds as SubRip (.srt) timestamp: HH:MM:SS,mmm
 */
export function formatSrtTimestamp(seconds: number): string {
  const safe = Math.max(0, Number.isFinite(seconds) ? seconds : 0);
  const totalMs = Math.round(safe * 1000);
  const ms = totalMs % 1000;
  const totalSec = Math.floor(totalMs / 1000);
  const s = totalSec % 60;
  const m = Math.floor(totalSec / 60) % 60;
  const h = Math.floor(totalSec / 3600);

  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')},${String(ms).padStart(3, '0')}`;
}

/**
 * Formats seconds as WebVTT (.vtt) timestamp: HH:MM:SS.mmm
 */
export function formatVttTimestamp(seconds: number): string {
  return formatSrtTimestamp(seconds).replace(',', '.');
}

/**
 * Parses an SRT or VTT timestamp (HH:MM:SS,mmm or MM:SS.mmm) into seconds.
 */
export function parseSubtitleTimestamp(raw: string): number | null {
  const cleaned = raw.trim().replace(',', '.');
  const parts = cleaned.split(':');
  if (parts.length < 2 || parts.length > 3) return null;

  const nums = parts.map(Number);
  if (nums.some((n) => Number.isNaN(n) || n < 0)) return null;

  if (nums.length === 3) {
    return Number((nums[0] * 3600 + nums[1] * 60 + nums[2]).toFixed(3));
  }
  return Number((nums[0] * 60 + nums[1]).toFixed(3));
}

/**
 * Exports SubtitleCue[] into standard SubRip (.srt) format.
 */
export function exportSubtitlesToSrt(
  cues: SubtitleCue[],
  offsetToClipStart = false,
  clipStartSec = 0
): string {
  const sorted = [...cues]
    .filter((c) => c.text.trim().length > 0)
    .sort((a, b) => a.startSec - b.startSec);

  return sorted
    .map((cue, idx) => {
      const s = offsetToClipStart ? Math.max(0, cue.startSec - clipStartSec) : cue.startSec;
      const e = offsetToClipStart ? Math.max(s + 0.3, cue.endSec - clipStartSec) : cue.endSec;
      return `${idx + 1}\n${formatSrtTimestamp(s)} --> ${formatSrtTimestamp(e)}\n${cue.text.trim()}`;
    })
    .join('\n\n');
}

/**
 * Exports SubtitleCue[] into standard WebVTT (.vtt) format.
 */
export function exportSubtitlesToVtt(
  cues: SubtitleCue[],
  offsetToClipStart = false,
  clipStartSec = 0
): string {
  const sorted = [...cues]
    .filter((c) => c.text.trim().length > 0)
    .sort((a, b) => a.startSec - b.startSec);

  const body = sorted
    .map((cue) => {
      const s = offsetToClipStart ? Math.max(0, cue.startSec - clipStartSec) : cue.startSec;
      const e = offsetToClipStart ? Math.max(s + 0.3, cue.endSec - clipStartSec) : cue.endSec;
      return `${formatVttTimestamp(s)} --> ${formatVttTimestamp(e)}\n${cue.text.trim()}`;
    })
    .join('\n\n');

  return `WEBVTT\n\n${body}`;
}

/**
 * Parses any valid .SRT or .VTT text content into sorted SubtitleCue[].
 */
export function parseSrtOrVttToCues(rawContent: string, addOffsetSec = 0): SubtitleCue[] {
  const normalized = rawContent.replace(/\r\n/g, '\n').replace(/^WEBVTT[^\n]*\n+/i, '').trim();
  if (!normalized) return [];

  const blocks = normalized.split(/\n{2,}/);
  const parsedCues: SubtitleCue[] = [];

  blocks.forEach((block, idx) => {
    const lines = block
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean);
    if (lines.length === 0) return;

    const arrowLineIdx = lines.findIndex((l) => l.includes('-->'));
    if (arrowLineIdx === -1) return;

    const timeLine = lines[arrowLineIdx];
    const [startRaw, endWithSettings] = timeLine.split('-->');
    const endRaw = (endWithSettings || '').trim().split(/\s+/)[0];

    const startSec = parseSubtitleTimestamp(startRaw);
    const endSec = parseSubtitleTimestamp(endRaw);
    if (startSec === null || endSec === null || endSec <= startSec) return;

    const textLines = lines
      .slice(arrowLineIdx + 1)
      .map((l) => l.replace(/<[^>]+>/g, '').trim())
      .filter(Boolean);
    const text = textLines.join(' ');
    if (!text) return;

    parsedCues.push({
      id: `imported-cue-${idx + 1}-${Math.round(startSec * 100)}`,
      startSec: Number((startSec + addOffsetSec).toFixed(2)),
      endSec: Number((endSec + addOffsetSec).toFixed(2)),
      text,
      confidence: 1.0,
    });
  });

  return parsedCues.sort((a, b) => a.startSec - b.startSec);
}

/**
 * Generates accurate, non-overlapping time-synced verbatim cues for built-in demo scenes
 * within `[startSec, endSec]` so users can test word-level sync immediately.
 */
export function buildAccurateDemoSubtitles(params: {
  sceneId?: 'supermarket' | 'podcast' | 'tech_keynote';
  startSec: number;
  endSec: number;
  language: 'id' | 'en';
  videoTitle: string;
}): SubtitleCue[] {
  const { sceneId = 'supermarket', startSec, endSec, language } = params;
  const safeStart = Math.max(0, startSec);
  const safeEnd = Math.max(safeStart + 2, endSec);
  // Cap automatic cue window to 120 seconds from startSec for crisp readability, or full clip if <= 120s
  const windowEnd = Math.min(safeEnd, safeStart + 120);

  const scripts: Record<string, { id: string[]; en: string[] }> = {
    supermarket: {
      id: [
        'Oke semuanya, hari ini kita bakal penuhi eskalator mal dengan ribuan kotak mainan!',
        'Lihat antrean troli di depan pintu masuk, pelanggan sudah mulai panik mencari jalan.',
        'Jangan lupa kembalikan troli belanja di area biru supaya jalur kasir tidak macet total.',
        'Tunggu sebentar... tumpukan mainan di eskalator atas mulai longsor ke lantai dasar!',
        'Ini benar-benar rekor kekacauan toko paling gila yang pernah kita buat di livestream.',
        'Kasir nomor satu kewalahan, tapi omzet harian kita langsung tembus empat ribu dolar!',
      ],
      en: [
        'Alright everyone, today we are filling the entire mall escalator with thousands of toy boxes!',
        'Look at the trolley return sign up front, shoppers are already crowding the main aisle.',
        'Please return your shopping trolley right here so the checkout lane stays wide open.',
        'Wait a second... the toy avalanche on the top escalator is sliding straight down!',
        'This is hands down the most chaotic store experiment we have ever pulled off live.',
        'Register one is completely overloaded, yet our store revenue just crossed four thousand dollars!',
      ],
    },
    podcast: {
      id: [
        'Kunci utama video pendek yang viral selalu ditentukan dalam tiga detik kalimat pembuka.',
        'Kalau penonton langsung paham inti ceritanya, retensi tontonan akan naik drastis.',
        'Kesalahan terbesar kreator adalah melakukan re-encoding berulang kali hingga gambar pecah.',
        'Dengan teknik stream-copy, kita memotong klip kualitas 4K asli hanya dalam hitungan detik.',
        'Tambahkan subtitle kata-per-kata yang akurat agar penonton tetap fokus meski tanpa suara.',
        'Setelah satu klip siap, langsung jadwalkan serentak ke TikTok, Reels, dan YouTube Shorts.',
      ],
      en: [
        'The single biggest driver of a viral short clip happens in the very first three seconds.',
        'When viewers immediately hear a clear hook, average watch retention doubles right away.',
        'Most creators lose 4K sharpness because traditional editors re-encode the entire video file.',
        'With direct byte-range stream copy, you extract pristine 4K clips in just a few seconds.',
        'Pair that with 100% accurate word-synced subtitles so silent scrollers stay hooked.',
        'Once your clip is ready, schedule it across TikTok, Instagram Reels, and YouTube Shorts.',
      ],
    },
    tech_keynote: {
      id: [
        'Selamat datang di demonstrasi langsung mesin pemotong video 4K60 tanpa proses transcoding.',
        'Sensor generasi terbaru ini merekam detail cahaya rendah dengan kejernihan luar biasa.',
        'Biasanya mengunduh file mentah berdurasi satu jam memakan kuota hampir dua gigabyte.',
        'Sekarang Anda cukup memilih detik awal dan akhir, lalu sistem mengekstrak bagian itu saja.',
        'Subtitle otomatis disinkronkan presisi ke setiap kata untuk akurasi seratus persen.',
        'Seluruh alur kerja ini berjalan langsung di browser tanpa perlu instalasi aplikasi berat.',
      ],
      en: [
        'Welcome to our live keynote showcasing zero re-encoding 4K60 cloud stream extraction.',
        'This next-generation optical sensor captures low-light dynamic range with razor clarity.',
        'Traditionally, downloading a one-hour master recording wastes nearly two gigabytes of data.',
        'Now you simply pick your exact start and end timestamps and slice only those bytes.',
        'Automatic subtitles lock onto every spoken phrase with one hundred percent timing accuracy.',
        'Everything runs natively inside your browser with zero desktop software required.',
      ],
    },
  };

  const lines = scripts[sceneId]?.[language] || scripts.supermarket[language];
  const cues: SubtitleCue[] = [];
  const stepSec = Math.max(2.5, Math.min(4.2, (windowEnd - safeStart) / lines.length));

  let cursor = safeStart;
  let idx = 0;
  while (cursor + 0.8 <= windowEnd && idx < 30) {
    const nextEnd = Number(Math.min(windowEnd, cursor + stepSec).toFixed(2));
    const line = lines[idx % lines.length];
    cues.push({
      id: `sub-cue-${idx + 1}-${Math.round(cursor * 10)}`,
      startSec: Number(cursor.toFixed(2)),
      endSec: nextEnd,
      text: line,
      speaker: 'Speaker 1',
      confidence: 1.0,
    });
    cursor = nextEnd;
    idx += 1;
  }

  return cues;
}

/**
 * Extracts real 16kHz 16-bit mono WAV audio from a local uploaded video/audio URL
 * for `[startSec, endSec]` (capped at 60s per pass) so server-side `gemini-3.5-transcribe`
 * transcribes the actual spoken audio track verbatim!
 */
export async function extractWavBase64FromMediaUrl(
  mediaUrl: string,
  startSec: number,
  endSec: number
): Promise<{ base64Wav: string; mimeType: string; extractedDurationSec: number }> {
  const response = await fetch(mediaUrl);
  const arrayBuffer = await response.arrayBuffer();

  const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  const tempCtx = new AudioCtx();
  let decoded: AudioBuffer;
  try {
    decoded = await tempCtx.decodeAudioData(arrayBuffer.slice(0));
  } finally {
    await tempCtx.close().catch(() => {});
  }

  const targetSampleRate = 16000;
  const clipStart = Math.max(0, Math.min(startSec, Math.max(0, decoded.duration - 0.5)));
  const clipEnd = Math.min(decoded.duration, Math.max(clipStart + 0.5, Math.min(endSec, clipStart + 60)));
  const clipLenSec = Math.max(0.5, clipEnd - clipStart);

  const numSamples = Math.floor(clipLenSec * targetSampleRate);
  const offlineCtx = new OfflineAudioContext(1, numSamples, targetSampleRate);
  const bufferSource = offlineCtx.createBufferSource();
  bufferSource.buffer = decoded;
  bufferSource.connect(offlineCtx.destination);
  bufferSource.start(0, clipStart, clipLenSec);

  const rendered = await offlineCtx.startRendering();
  const channelData = rendered.getChannelData(0);

  // Encode 16-bit PCM RIFF WAV
  const wavBuffer = new ArrayBuffer(44 + channelData.length * 2);
  const view = new DataView(wavBuffer);
  const writeStr = (offset: number, s: string) => {
    for (let i = 0; i < s.length; i++) view.setUint8(offset + i, s.charCodeAt(i));
  };

  writeStr(0, 'RIFF');
  view.setUint32(4, 36 + channelData.length * 2, true);
  writeStr(8, 'WAVE');
  writeStr(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, 1, true); // Mono
  view.setUint32(24, targetSampleRate, true);
  view.setUint32(28, targetSampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeStr(36, 'data');
  view.setUint32(40, channelData.length * 2, true);

  for (let i = 0; i < channelData.length; i++) {
    const s = Math.max(-1, Math.min(1, channelData[i]));
    view.setInt16(44 + i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }

  // Convert ArrayBuffer to base64
  const bytes = new Uint8Array(wavBuffer);
  let binary = '';
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }

  return {
    base64Wav: btoa(binary),
    mimeType: 'audio/wav',
    extractedDurationSec: clipLenSec,
  };
}

/**
 * Triggers browser download of an .SRT or .VTT subtitle file.
 */
export function downloadSubtitleFile(
  cues: SubtitleCue[],
  format: 'srt' | 'vtt',
  videoTitle: string,
  offsetToClipZero = true,
  clipStartSec = 0
): void {
  const safeBase =
    videoTitle
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 42) || 'clipscutter-subtitles';

  const content =
    format === 'srt'
      ? exportSubtitlesToSrt(cues, offsetToClipZero, clipStartSec)
      : exportSubtitlesToVtt(cues, offsetToClipZero, clipStartSec);

  const mime = format === 'srt' ? 'application/x-subrip;charset=utf-8' : 'text/vtt;charset=utf-8';
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = `${safeBase}.${format}`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 3000);
}
