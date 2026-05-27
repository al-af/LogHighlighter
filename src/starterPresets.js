// Built-in preset library seeded once into localStorage on first run.
// Users may delete or overwrite these; the seed flag prevents re-seeding.

import { load, save } from './storage.js';
import { listPresets, savePreset } from './presets.js';

export const STARTER_PRESETS = [
  {
    name: 'iOS SDK',
    groups: [
      { keywords: ['error', 'fatal', 'exception', 'NSError', 'crash'], colorIndex: 9 },
      { keywords: ['warning', 'deprecated'], colorIndex: 0 },
      { keywords: ['didFinishLaunching', 'willTerminate', 'applicationDidBecomeActive'], colorIndex: 4 },
    ],
  },
  {
    name: 'Android SDK',
    groups: [
      { keywords: ['FATAL', 'AndroidRuntime', 'Exception'], colorIndex: 9 },
      { keywords: ['W/', 'deprecated'], colorIndex: 0 },
      { keywords: ['onCreate', 'onResume', 'onDestroy'], colorIndex: 2 },
    ],
  },
  {
    name: 'React Native bridge',
    groups: [
      { keywords: ['ReactNativeJS', 'Unhandled', 'Error:'], colorIndex: 9 },
      { keywords: ['NativeModule', 'bridge', 'callback'], colorIndex: 5 },
      { keywords: ['Metro', 'bundling', 'Bundle'], colorIndex: 3 },
    ],
  },
  {
    name: 'OkHttp',
    groups: [
      { keywords: ['-->', '--> POST', '--> GET'], colorIndex: 4 },
      { keywords: ['<--', '<-- 200', '<-- 4', '<-- 5'], colorIndex: 2 },
      { keywords: ['SocketTimeoutException', 'IOException', 'failed'], colorIndex: 9 },
    ],
  },
];

const SEED_KEY = 'loghl:starterSeeded';
const SEED_VERSION = 1;

export function seedStarterPresets() {
  const seeded = load(SEED_KEY);
  if (seeded && seeded.version >= SEED_VERSION) return { seeded: false, reason: 'already-seeded' };
  const existing = new Set(listPresets());
  let added = 0;
  for (const preset of STARTER_PRESETS) {
    if (existing.has(preset.name)) continue;
    const result = savePreset(preset.name, preset.groups);
    if (result.ok) added++;
  }
  save(SEED_KEY, { version: SEED_VERSION, seededAt: Date.now() });
  return { seeded: true, added };
}
