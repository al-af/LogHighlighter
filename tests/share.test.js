import { describe, it, expect, beforeEach } from 'vitest';
import { encodeGroups, decodeHash, consumeHash } from '../src/share.js';

const sampleGroups = [
  { keywords: ['session', 'attribution'], colorIndex: 0 },
  { keywords: ['CMP'], colorIndex: 3 },
];

beforeEach(() => {
  window.location.hash = '';
});

describe('share', () => {
  it('encodes and decodes a roundtrip', () => {
    const link = encodeGroups(sampleGroups, 'filter');
    const hash = link.split('#')[1];
    window.location.hash = hash;
    const decoded = decodeHash();
    expect(decoded.ok).toBe(true);
    expect(decoded.groups).toEqual(sampleGroups);
    expect(decoded.mode).toBe('filter');
  });

  it('returns no-hash when location has no hash', () => {
    window.location.hash = '';
    expect(decodeHash()).toEqual({ ok: false, reason: 'no-hash' });
  });

  it('rejects malformed base64', () => {
    window.location.hash = '#s=!!!not-base64!!!';
    const r = decodeHash();
    expect(r.ok).toBe(false);
    expect(['malformed-base64', 'malformed-json']).toContain(r.reason);
  });

  it('rejects malformed JSON', () => {
    const bad = btoa('{not-json').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    window.location.hash = `#s=${bad}`;
    expect(decodeHash().reason).toBe('malformed-json');
  });

  it('rejects future schema versions', () => {
    const payload = btoa(JSON.stringify({ v: 99, g: [], m: 'filter' }))
      .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    window.location.hash = `#s=${payload}`;
    expect(decodeHash().reason).toBe('future-version');
  });

  it('rejects missing groups field', () => {
    const payload = btoa(JSON.stringify({ v: 1, m: 'filter' }))
      .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    window.location.hash = `#s=${payload}`;
    expect(decodeHash().reason).toBe('missing-groups');
  });

  it('clamps out-of-range colorIndex', () => {
    const payload = btoa(JSON.stringify({
      v: 1,
      g: [{ k: ['x'], c: 99 }],
      m: 'filter',
    })).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    window.location.hash = `#s=${payload}`;
    const r = decodeHash();
    expect(r.ok).toBe(true);
    expect(r.groups[0].colorIndex).toBe(99 % 10);
  });

  it('defaults mode to filter when invalid', () => {
    const payload = btoa(JSON.stringify({ v: 1, g: [], m: 'garbage' }))
      .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    window.location.hash = `#s=${payload}`;
    expect(decodeHash().mode).toBe('filter');
  });

  it('consumeHash strips the hash on success', () => {
    const link = encodeGroups(sampleGroups, 'filter');
    window.location.hash = link.split('#')[1];
    const r = consumeHash();
    expect(r.ok).toBe(true);
    expect(window.location.hash).toBe('');
  });

  it('consumeHash leaves hash when decode fails', () => {
    window.location.hash = '#s=!!!bad!!!';
    consumeHash();
    expect(window.location.hash).toBe('#s=!!!bad!!!');
  });
});
