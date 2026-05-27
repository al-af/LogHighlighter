import { describe, it, expect, beforeEach } from 'vitest';
import { listPresets, savePreset, loadPreset, deletePreset, renamePreset, onChange } from '../src/presets.js';

beforeEach(() => {
  localStorage.clear();
});

const sampleGroups = [{ keywords: ['session'], colorIndex: 0 }];

describe('presets', () => {
  it('list is empty initially', () => {
    expect(listPresets()).toEqual([]);
  });

  it('saves a preset and lists it', () => {
    const result = savePreset('Attribution', sampleGroups);
    expect(result.ok).toBe(true);
    expect(listPresets()).toEqual(['Attribution']);
  });

  it('loadPreset returns the saved groups', () => {
    savePreset('A', sampleGroups);
    expect(loadPreset('A')).toEqual(sampleGroups);
  });

  it('loadPreset returns null for unknown name', () => {
    expect(loadPreset('Nope')).toBeNull();
  });

  it('savePreset auto-overwrites existing name', () => {
    savePreset('A', sampleGroups);
    const newer = [{ keywords: ['attribution'], colorIndex: 1 }];
    savePreset('A', newer);
    expect(loadPreset('A')).toEqual(newer);
    expect(listPresets()).toEqual(['A']);
  });

  it('savePreset trims whitespace', () => {
    savePreset('  Trim Me  ', sampleGroups);
    expect(listPresets()).toEqual(['Trim Me']);
  });

  it('savePreset rejects empty name', () => {
    expect(savePreset('   ', sampleGroups).ok).toBe(false);
  });

  it('savePreset rejects names over 40 chars', () => {
    const long = 'x'.repeat(41);
    expect(savePreset(long, sampleGroups).ok).toBe(false);
  });

  it('savePreset rejects names with control characters', () => {
    expect(savePreset('A\nB', sampleGroups).ok).toBe(false);
  });

  it('deletePreset removes a preset and returns true', () => {
    savePreset('A', sampleGroups);
    expect(deletePreset('A')).toBe(true);
    expect(listPresets()).toEqual([]);
  });

  it('deletePreset returns false for unknown name', () => {
    expect(deletePreset('Nope')).toBe(false);
  });

  it('renamePreset moves an entry', () => {
    savePreset('Old', sampleGroups);
    const result = renamePreset('Old', 'New');
    expect(result.ok).toBe(true);
    expect(listPresets()).toEqual(['New']);
    expect(loadPreset('New')).toEqual(sampleGroups);
  });

  it('renamePreset rejects collision with existing name', () => {
    savePreset('A', sampleGroups);
    savePreset('B', sampleGroups);
    expect(renamePreset('A', 'B').ok).toBe(false);
  });

  it('onChange fires after savePreset and deletePreset', () => {
    let calls = 0;
    onChange(() => calls++);
    savePreset('A', sampleGroups);
    deletePreset('A');
    expect(calls).toBe(2);
  });
});
