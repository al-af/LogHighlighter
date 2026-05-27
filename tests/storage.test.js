import { describe, it, expect, beforeEach } from 'vitest';
import { load, save, remove, isAvailable } from '../src/storage.js';

beforeEach(() => {
  localStorage.clear();
});

describe('storage', () => {
  it('saves and loads a value', () => {
    save('loghl:test', { hello: 'world' });
    expect(load('loghl:test')).toEqual({ hello: 'world' });
  });

  it('returns null for missing key', () => {
    expect(load('loghl:missing')).toBeNull();
  });

  it('returns null for corrupt JSON', () => {
    localStorage.setItem('loghl:bad', '{not-json');
    expect(load('loghl:bad')).toBeNull();
  });

  it('returns null for version mismatch', () => {
    localStorage.setItem('loghl:old', JSON.stringify({ version: 99, data: { x: 1 } }));
    expect(load('loghl:old')).toBeNull();
  });

  it('returns null for envelope without version', () => {
    localStorage.setItem('loghl:naked', JSON.stringify({ x: 1 }));
    expect(load('loghl:naked')).toBeNull();
  });

  it('remove deletes a key', () => {
    save('loghl:rm', { x: 1 });
    remove('loghl:rm');
    expect(load('loghl:rm')).toBeNull();
  });

  it('isAvailable returns true in jsdom', () => {
    expect(isAvailable()).toBe(true);
  });
});
