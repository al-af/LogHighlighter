import { PALETTE, state, notify } from './state.js';

function nextColor() {
  const used = new Set(state.groups.map(g => g.colorIndex));
  for (let i = 0; i < PALETTE.length; i++) {
    if (!used.has(i)) return i;
  }
  return state.groups.length % PALETTE.length;
}

export function addGroup(text) {
  const raw = text.split(',').map(s => s.trim()).filter(Boolean);
  const unique = [];
  for (const k of raw) {
    if (!unique.some(x => x.toLowerCase() === k.toLowerCase())) unique.push(k);
  }
  if (!unique.length) return;
  state.groups.push({ keywords: unique, colorIndex: nextColor() });
  notify();
}

export function removeGroup(i) {
  state.groups.splice(i, 1);
  notify();
}

export function removeKeyword(gi, ki) {
  state.groups[gi].keywords.splice(ki, 1);
  if (!state.groups[gi].keywords.length) {
    state.groups.splice(gi, 1);
  }
  notify();
}
