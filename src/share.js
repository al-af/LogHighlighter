const VERSION = 1;
const PALETTE_LEN = 10;

function base64urlEncode(str) {
  const bytes = new TextEncoder().encode(str);
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64urlDecode(s) {
  const pad = s.length % 4 === 0 ? '' : '='.repeat(4 - (s.length % 4));
  const b64 = s.replace(/-/g, '+').replace(/_/g, '/') + pad;
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new TextDecoder().decode(bytes);
}

export function encodeGroups(groups, mode) {
  const payload = {
    v: VERSION,
    g: groups.map(g => ({ k: g.keywords, c: g.colorIndex })),
    m: mode,
  };
  const encoded = base64urlEncode(JSON.stringify(payload));
  const base = window.location.href.split('#')[0];
  return `${base}#s=${encoded}`;
}

export function decodeHash() {
  const hash = window.location.hash;
  if (!hash || !hash.startsWith('#s=')) return { ok: false, reason: 'no-hash' };
  const encoded = hash.slice(3);
  let json;
  try {
    json = base64urlDecode(encoded);
  } catch (_) {
    return { ok: false, reason: 'malformed-base64' };
  }
  let parsed;
  try {
    parsed = JSON.parse(json);
  } catch (_) {
    return { ok: false, reason: 'malformed-json' };
  }
  if (!parsed || typeof parsed !== 'object') return { ok: false, reason: 'not-object' };
  if (parsed.v == null) return { ok: false, reason: 'missing-version' };
  if (parsed.v > VERSION) return { ok: false, reason: 'future-version' };
  if (!Array.isArray(parsed.g)) return { ok: false, reason: 'missing-groups' };
  const groups = parsed.g.map(g => ({
    keywords: Array.isArray(g.k) ? g.k.filter(s => typeof s === 'string') : [],
    colorIndex: Number.isInteger(g.c)
      ? ((g.c % PALETTE_LEN) + PALETTE_LEN) % PALETTE_LEN
      : 0,
  }));
  const mode = parsed.m === 'full' ? 'full' : 'filter';
  return { ok: true, groups, mode };
}

export function stripHash() {
  const url = window.location.href.split('#')[0];
  window.history.replaceState(null, '', url);
}

export function consumeHash() {
  const result = decodeHash();
  if (result.ok) stripHash();
  return result;
}
