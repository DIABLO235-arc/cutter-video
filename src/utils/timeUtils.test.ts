import test from 'node:test';
import assert from 'node:assert/strict';
import {
  formatTimestamp,
  formatPlayerTime,
  parseTimestamp,
  clampTrimRange,
  extractYouTubeId,
  estimateClipFileSizeMb,
  buildDeterministicHighlights,
} from './timeUtils';
import { validateClipForPlatform, buildSocialShareIntentUrl } from './socialRules';

test('formatTimestamp formats hours, minutes, and seconds with zero padding', () => {
  assert.equal(formatTimestamp(0), '00:00:00');
  assert.equal(formatTimestamp(65), '00:01:05');
  assert.equal(formatTimestamp(4291), '01:11:31');
});

test('formatPlayerTime matches ClipsCutter compact player display', () => {
  assert.equal(formatPlayerTime(0), '0:00');
  assert.equal(formatPlayerTime(4292), '1:11:32');
});

test('parseTimestamp parses valid timestamps and rejects invalid inputs', () => {
  assert.equal(parseTimestamp('01:11:31'), 4291);
  assert.equal(parseTimestamp('02:30'), 150);
  assert.equal(parseTimestamp('45'), 45);
  assert.equal(parseTimestamp('00:75:00'), null);
  assert.equal(parseTimestamp('abc'), null);
});

test('clampTrimRange keeps start and end inside valid video bounds', () => {
  assert.deepEqual(clampTrimRange(-10, 500, 120, 1), { startSec: 0, endSec: 120 });
  assert.deepEqual(clampTrimRange(50, 50, 120, 2), { startSec: 50, endSec: 52 });
  assert.deepEqual(clampTrimRange(119, 125, 120, 5), { startSec: 115, endSec: 120 });
});

test('extractYouTubeId handles watch, short, youtu.be, live, and invalid links', () => {
  assert.equal(extractYouTubeId('https://www.youtube.com/watch?v=dQw4w9WgXcQ'), 'dQw4w9WgXcQ');
  assert.equal(extractYouTubeId('https://youtu.be/dQw4w9WgXcQ?t=42'), 'dQw4w9WgXcQ');
  assert.equal(extractYouTubeId('https://www.youtube.com/shorts/aqz-KE-bpKQ'), 'aqz-KE-bpKQ');
  assert.equal(extractYouTubeId('https://example.com/video.mp4'), null);
});

test('estimateClipFileSizeMb scales accurately by format and resolution', () => {
  const size360 = estimateClipFileSizeMb(60, 'MP4', '360p');
  const size4k = estimateClipFileSizeMb(60, 'MP4', '2160p');
  const sizeMp3 = estimateClipFileSizeMb(60, 'MP3', '360p');
  assert.ok(size4k > size360, '4K MP4 should be larger than 360p MP4');
  assert.ok(size360 > sizeMp3, 'Video MP4 should be larger than audio-only MP3');
});

test('buildDeterministicHighlights returns bounded segments inside video duration', () => {
  const highlights = buildDeterministicHighlights('Supermarket Simulator Stream', 4292, 45);
  assert.equal(highlights.length, 4);
  for (const seg of highlights) {
    assert.ok(seg.startSec >= 0);
    assert.ok(seg.endSec <= 4292);
    assert.ok(seg.endSec > seg.startSec);
  }
});

test('validateClipForPlatform checks max duration, aspect ratio warnings, and caption limits', () => {
  const validReels = validateClipForPlatform('reels', 45, '9:16', 'Awesome highlight!');
  assert.equal(validReels.compatible, true);
  assert.equal(validReels.warnings.length, 0);

  const tooLongReels = validateClipForPlatform('reels', 120, '16:9', 'Too long for Reels');
  assert.equal(tooLongReels.compatible, false);
  assert.equal(tooLongReels.errors.length, 1);
  assert.equal(tooLongReels.warnings.length, 1);

  const xUrl = buildSocialShareIntentUrl('x', 'https://clipscutter.com/c/123', 'Check this clip', ['viral']);
  assert.ok(xUrl.startsWith('https://twitter.com/intent/tweet?'));
  assert.ok(xUrl.includes('%23viral'));
});
