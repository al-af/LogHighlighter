import { describe, it, expect, beforeEach } from 'vitest';
import { seedStarterPresets, STARTER_PRESETS } from '../src/starterPresets.js';
import { listPresets, deletePreset, savePreset } from '../src/presets.js';

describe('seedStarterPresets', () => {
  beforeEach(() => localStorage.clear());

  it('seeds all starter presets on fresh storage', () => {
    const result = seedStarterPresets();
    expect(result.seeded).toBe(true);
    expect(result.added).toBe(STARTER_PRESETS.length);
    for (const p of STARTER_PRESETS) expect(listPresets()).toContain(p.name);
  });

  it('does not re-seed on second call', () => {
    seedStarterPresets();
    const second = seedStarterPresets();
    expect(second.seeded).toBe(false);
  });

  it('does not restore a starter preset the user deleted', () => {
    seedStarterPresets();
    deletePreset('iOS SDK');
    seedStarterPresets();
    expect(listPresets()).not.toContain('iOS SDK');
  });

  it('does not overwrite a user preset that shares a starter name', () => {
    savePreset('iOS SDK', [{ keywords: ['mine'], colorIndex: 0 }]);
    seedStarterPresets();
    expect(listPresets()).toContain('iOS SDK');
    const all = JSON.parse(localStorage.getItem('loghl:presets')).data;
    expect(all['iOS SDK'].groups[0].keywords).toEqual(['mine']);
  });
});
