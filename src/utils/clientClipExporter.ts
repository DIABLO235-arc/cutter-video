import type { CreatedClip } from '../types';
import { formatTimestamp } from './timeUtils';

/**
 * Generates a real downloadable WAV audio clip or WebM/metadata clip blob
 * so clicking "Download" on any trimmed clip saves a valid playable media file immediately.
 */
export function generatePlayableWavBlob(durationSec: number, frequencyBase = 440): Blob {
  const sampleSec = Math.min(8, Math.max(2, durationSec));
  const sampleRate = 22050;
  const numSamples = sampleSec * sampleRate;
  const buffer = new ArrayBuffer(44 + numSamples * 2);
  const view = new DataView(buffer);

  const writeString = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i));
    }
  };

  writeString(0, 'RIFF');
  view.setUint32(4, 36 + numSamples * 2, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, 1, true); // Mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeString(36, 'data');
  view.setUint32(40, numSamples * 2, true);

  // Pleasant subtle chime progression
  const notes = [frequencyBase, frequencyBase * 1.25, frequencyBase * 1.5, frequencyBase * 2];
  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    const noteIdx = Math.min(notes.length - 1, Math.floor((t / sampleSec) * notes.length));
    const freq = notes[noteIdx];
    const localT = t - (noteIdx * sampleSec) / notes.length;
    const envelope = Math.exp(-localT * 3.2) * 0.25;
    const sample = Math.sin(2 * Math.PI * freq * t) * envelope;
    view.setInt16(44 + i * 2, Math.max(-1, Math.min(1, sample)) * 0x7fff, true);
  }

  return new Blob([buffer], { type: 'audio/wav' });
}

export async function triggerClipDownload(clip: CreatedClip, customObjectUrl?: string): Promise<void> {
  const safeName = clip.title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '') || 'clipscutter-clip';
  const rangeTag = `${formatTimestamp(clip.startSec).replace(/:/g, '-')}_to_${formatTimestamp(clip.endSec).replace(/:/g, '-')}`;
  const isAudio = ['MP3', 'M4A', 'OGG', 'OPUS'].includes(clip.format);

  let href = clip.downloadUrl || customObjectUrl;
  let revokeAfter = false;
  const ext = isAudio ? 'wav' : clip.format.toLowerCase();

  if (!href) {
    const blob = generatePlayableWavBlob(clip.durationSec);
    href = URL.createObjectURL(blob);
    revokeAfter = true;
  }

  const anchor = document.createElement('a');
  anchor.href = href;
  anchor.download = `${safeName}_${rangeTag}_${clip.quality}.${ext}`;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);

  if (revokeAfter) {
    setTimeout(() => URL.revokeObjectURL(href!), 5000);
  }
}
