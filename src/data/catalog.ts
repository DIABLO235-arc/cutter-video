import type { FormatOption, QualityOption, VideoSource } from '../types';

export const FORMAT_OPTIONS: FormatOption[] = [
  {
    value: 'MP4',
    label: 'MP4',
    category: 'video',
    mimeType: 'video/mp4',
    extension: 'mp4',
    description: 'Universal video format. Plays on every device, browser, and platform without extra apps.',
  },
  {
    value: 'WEBM',
    label: 'WEBM',
    category: 'video',
    mimeType: 'video/webm',
    extension: 'webm',
    description: 'Smaller file size than MP4. Ideal for web embeds, online sharing, and modern browsers.',
  },
  {
    value: 'MP3',
    label: 'MP3',
    category: 'audio',
    mimeType: 'audio/mpeg',
    extension: 'mp3',
    description: 'Extract audio only from any YT video. Perfect for music, podcasts, and interviews.',
  },
  {
    value: 'M4A',
    label: 'M4A',
    category: 'audio',
    mimeType: 'audio/mp4',
    extension: 'm4a',
    description: 'Apple-native audio format. High quality with compact file size, great for iOS devices.',
  },
  {
    value: 'OGG',
    label: 'OGG',
    category: 'audio',
    mimeType: 'audio/ogg',
    extension: 'ogg',
    description: 'Open-source audio format widely supported on Linux, web, and media players.',
  },
  {
    value: 'OPUS',
    label: 'OPUS',
    category: 'audio',
    mimeType: 'audio/opus',
    extension: 'opus',
    description: 'Next-gen audio codec with excellent quality at very low bitrates. Ideal for streaming and voice.',
  },
];

export const QUALITY_OPTIONS: QualityOption[] = [
  { value: '1080p60', label: '1080p60', requiresPro: true, bitrateMbps: 6.5 },
  { value: '720p60', label: '720p60', requiresPro: true, bitrateMbps: 4.2 },
  { value: '720p', label: '720p', requiresPro: true, bitrateMbps: 2.8 },
  { value: '480p', label: '480p', requiresPro: true, bitrateMbps: 1.4 },
  { value: '360p', label: '360p', requiresPro: false, bitrateMbps: 0.85 },
  { value: '1440p', label: '1440p (2K)', requiresPro: true, bitrateMbps: 10 },
  { value: '2160p', label: '2160p (4K)', requiresPro: true, bitrateMbps: 18 },
];

export const DEMO_VIDEOS: VideoSource[] = [
  {
    id: 'demo-supermarket',
    type: 'demo',
    demoSceneId: 'supermarket',
    title: 'Supermarket Simulator — Filling the Entire Mall Escalator with Toys!',
    author: 'CaseOh & Simulation Gaming Live',
    url: 'https://www.youtube.com/watch?v=ccSimStream01',
    durationSec: 4292, // 01:11:32 matching user's exact reference screenshot!
    transcriptSummary:
      '00:00 Intro & store setup; 12:40 Trolley return chaos begins; 28:15 Escalator toy avalanche; 49:10 Checkout queue overload; 01:05:20 Final store rating reveal.',
    chapters: [
      { title: 'Store Opening & Setup', startSec: 0, endSec: 760 },
      { title: 'Please Return Your Trolley Here Chaos', startSec: 760, endSec: 1695 },
      { title: 'Escalator Toy Avalanche Peak', startSec: 1695, endSec: 2950 },
      { title: 'Checkout Overload & Finale', startSec: 2950, endSec: 4292 },
    ],
  },
  {
    id: 'demo-podcast',
    type: 'demo',
    demoSceneId: 'podcast',
    title: 'How Creators Turn 1-Hour Podcasts into 30 Viral Shorts with AI',
    author: 'Creator Studio Podcast',
    url: 'https://www.youtube.com/watch?v=ccPodcastAI02',
    durationSec: 1845, // 30:45
    transcriptSummary:
      '00:00 The 3-second retention rule; 06:20 Why re-encoding ruins 4K clarity; 14:50 Multi-platform posting across TikTok, Reels & Shorts; 24:10 Monetization breakdown.',
    chapters: [
      { title: 'The 3-Second Hook Formula', startSec: 0, endSec: 380 },
      { title: 'Stream-Copy vs Re-Encoding Explained', startSec: 380, endSec: 890 },
      { title: 'TikTok, Shorts & Reels Distribution', startSec: 890, endSec: 1450 },
      { title: 'Creator Revenue Numbers', startSec: 1450, endSec: 1845 },
    ],
  },
  {
    id: 'demo-keynote',
    type: 'demo',
    demoSceneId: 'tech_keynote',
    title: 'Next-Gen Spatial Camera & 4K60 Raw Workflow Keynote',
    author: 'Studio Hardware Lab',
    url: 'https://www.youtube.com/watch?v=ccKeynote4K03',
    durationSec: 2420, // 40:20
    transcriptSummary:
      '00:00 Keynote opening; 08:15 Live 4K60 low-light sensor test; 19:30 Instant byte-range cloud trimming demo; 32:00 Developer API announcement.',
    chapters: [
      { title: 'Keynote Opening', startSec: 0, endSec: 495 },
      { title: 'Live 4K60 Sensor Benchmark', startSec: 495, endSec: 1170 },
      { title: 'Zero Re-Encoding Cloud Demo', startSec: 1170, endSec: 1920 },
      { title: 'Developer API & Q&A', startSec: 1920, endSec: 2420 },
    ],
  },
];
