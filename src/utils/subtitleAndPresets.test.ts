import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildAccurateDemoSubtitles,
  computeActiveCueAndWordIndex,
  exportSubtitlesToSrt,
  exportSubtitlesToVtt,
  formatSrtTimestamp,
  formatVttTimestamp,
  parseSrtOrVttToCues,
} from './subtitleEngine';
import {
  BUILT_IN_PRESETS,
  buildCustomWorkflowPreset,
  resolvePresetApplication,
} from './templatesAndPresets';
import type { TrimSettings } from '../types';

const DEFAULT_SETTINGS: TrimSettings = {
  aspectRatio: '16:9',
  autoCaptions: false,
  fadeAudio: false,
  streamCopy: true,
  templateId: 'clean-raw',
  hookText: '',
  watermarkText: '',
  showProgressBar: false,
  subtitleStyleId: 'hormozi-karaoke',
};

test('formatSrtTimestamp and formatVttTimestamp format exact millisecond timestamps', () => {
  assert.equal(formatSrtTimestamp(0), '00:00:00,000');
  assert.equal(formatSrtTimestamp(65.42), '00:01:05,420');
  assert.equal(formatSrtTimestamp(3661.005), '01:01:01,005');
  assert.equal(formatVttTimestamp(65.42), '00:01:05.420');
});

test('exportSubtitlesToSrt and parseSrtOrVttToCues perform lossless round-trip', () => {
  const original = [
    { id: '1', startSec: 10, endSec: 13.5, text: 'Halo semuanya selamat datang di ClipsCutter!' },
    { id: '2', startSec: 13.5, endSec: 17.25, text: 'Subtitle otomatis ini 100% akurat dan presisi.' },
  ];

  const srt = exportSubtitlesToSrt(original, false, 0);
  assert.match(srt, /00:00:10,000 --> 00:00:13,500/);

  const reparsed = parseSrtOrVttToCues(srt);
  assert.equal(reparsed.length, 2);
  assert.equal(reparsed[0].startSec, 10);
  assert.equal(reparsed[0].endSec, 13.5);
  assert.equal(reparsed[0].text, original[0].text);
  assert.equal(reparsed[1].text, original[1].text);

  const vtt = exportSubtitlesToVtt(original, true, 10);
  assert.match(vtt, /^WEBVTT/);
  assert.match(vtt, /00:00:00\.000 --> 00:00:03\.500/);
  const vttParsed = parseSrtOrVttToCues(vtt, 10);
  assert.equal(vttParsed[0].startSec, 10);
  assert.equal(vttParsed[1].endSec, 17.25);
});

test('computeActiveCueAndWordIndex highlights exact spoken word across cue duration', () => {
  const cues = [
    { id: 'c1', startSec: 0, endSec: 4, text: 'Satu dua tiga empat' },
  ];

  const startState = computeActiveCueAndWordIndex(cues, 0.1);
  assert.ok(startState);
  assert.equal(startState.activeWordIndex, 0);
  assert.equal(startState.words[startState.activeWordIndex], 'Satu');

  const midState = computeActiveCueAndWordIndex(cues, 2.3);
  assert.ok(midState);
  assert.equal(midState.words[midState.activeWordIndex], 'tiga');

  const endState = computeActiveCueAndWordIndex(cues, 3.9);
  assert.ok(endState);
  assert.equal(endState.words[endState.activeWordIndex], 'empat');

  assert.equal(computeActiveCueAndWordIndex(cues, 6.0), null);
});

test('buildAccurateDemoSubtitles generates strictly ordered cues inside requested range', () => {
  const cues = buildAccurateDemoSubtitles({
    sceneId: 'podcast',
    startSec: 20,
    endSec: 45,
    language: 'id',
    videoTitle: 'Demo Podcast',
  });

  assert.ok(cues.length >= 4);
  for (const cue of cues) {
    assert.ok(cue.startSec >= 20);
    assert.ok(cue.endSec <= 45);
    assert.ok(cue.endSec > cue.startSec);
  }
});

test('resolvePresetApplication respects Pro license gating and applies template + subtitle style', () => {
  const tiktokPreset = BUILT_IN_PRESETS[0];

  const freeApplied = resolvePresetApplication(tiktokPreset, false, DEFAULT_SETTINGS);
  assert.equal(freeApplied.quality, '360p');
  assert.equal(freeApplied.downgradedFromProQuality, '1080p60');
  assert.equal(freeApplied.settings.aspectRatio, '9:16');
  assert.equal(freeApplied.settings.templateId, 'viral-hook-916');
  assert.equal(freeApplied.settings.autoCaptions, true);
  assert.equal(freeApplied.settings.subtitleStyleId, 'hormozi-karaoke');

  const proApplied = resolvePresetApplication(tiktokPreset, true, DEFAULT_SETTINGS);
  assert.equal(proApplied.quality, '1080p60');
  assert.equal(proApplied.downgradedFromProQuality, null);

  const custom = buildCustomWorkflowPreset({
    name: 'Preset Podcast Favorit',
    format: 'MP4',
    quality: '1080p60',
    aspectRatio: '9:16',
    templateId: 'podcast-studio-916',
    hookText: 'DENGARKAN INI!',
    watermarkText: '@vibeclip11',
    autoCaptions: true,
    subtitleStyleId: 'clean-pop',
    targetDurationSec: 45,
  });
  assert.equal(custom.isCustom, true);
  assert.equal(custom.name, 'Preset Podcast Favorit');
});
