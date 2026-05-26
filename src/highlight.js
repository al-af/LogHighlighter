import { PALETTE } from './state.js';

export function escapeHTML(s) {
  return s.replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));
}

export function highlight(text, groups) {
  if (!groups.length || !text) return escapeHTML(text);
  const lower = text.toLowerCase();
  const claimed = new Uint8Array(text.length);
  const spans = [];
  groups.forEach((g, gi) => {
    for (const kw of g.keywords) {
      if (!kw) continue;
      const k = kw.toLowerCase();
      if (!k.length) continue;
      let from = 0;
      while (from <= lower.length - k.length) {
        const i = lower.indexOf(k, from);
        if (i < 0) break;
        let cur = i;
        const end = i + k.length;
        while (cur < end) {
          while (cur < end && claimed[cur]) cur++;
          if (cur >= end) break;
          let segEnd = cur;
          while (segEnd < end && !claimed[segEnd]) segEnd++;
          spans.push({ start: cur, end: segEnd, gi });
          for (let p = cur; p < segEnd; p++) claimed[p] = 1;
          cur = segEnd;
        }
        from = i + k.length;
      }
    }
  });
  if (!spans.length) return escapeHTML(text);
  spans.sort((a, b) => a.start - b.start);
  let out = '', pos = 0;
  for (const sp of spans) {
    if (sp.start > pos) out += escapeHTML(text.slice(pos, sp.start));
    const color = PALETTE[groups[sp.gi].colorIndex];
    out += `<mark style="background:${color}">${escapeHTML(text.slice(sp.start, sp.end))}</mark>`;
    pos = sp.end;
  }
  if (pos < text.length) out += escapeHTML(text.slice(pos));
  return out;
}
