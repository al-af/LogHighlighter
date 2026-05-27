import { state } from './state.js';
import { detectPayload } from './payload.js';
import { parseLogcat } from './logcat.js';
import { escapeHTML, highlight } from './highlight.js';

function lineDiv(line, innerHTML) {
  const lc = parseLogcat(line);
  const cls = lc ? ` class="lc lc-${lc.level}"` : '';
  return `<div${cls}>${innerHTML}</div>`;
}

function lineMatches(line) {
  if (!state.groups.length) return false;
  const lower = line.toLowerCase();
  for (const g of state.groups) {
    for (const kw of g.keywords) {
      if (kw && lower.includes(kw.toLowerCase())) return true;
    }
  }
  return false;
}

function renderLine(line) {
  const payload = detectPayload(line);
  let assembled;
  if (payload) {
    const prefix = line.slice(0, payload.start).replace(/\s+$/, '');
    const suffix = line.slice(payload.end).replace(/^\s+/, '');
    const parts = [];
    if (prefix) parts.push(prefix);
    parts.push(payload.pretty);
    if (suffix) parts.push(suffix);
    assembled = parts.join('\n');
  } else {
    assembled = line;
  }
  return highlight(assembled, state.groups);
}

export function renderOutput() {
  const out = document.getElementById('output');
  const raw = state.input;
  if (!raw) {
    out.innerHTML = '<div class="placeholder">Add a keyword group and paste logs to begin. (best with logs under 500KB)</div>';
    return;
  }
  const lines = raw.split('\n');
  const html = [];
  let dropped = 0;
  let emittedAny = false;
  for (const line of lines) {
    const matched = lineMatches(line);
    if (state.mode === 'filter') {
      if (!matched) { dropped++; continue; }
      if (dropped > 0 && emittedAny) html.push('<div class="sep">···</div>');
      dropped = 0;
      html.push(lineDiv(line, renderLine(line)));
      emittedAny = true;
    } else {
      if (matched) html.push(lineDiv(line, renderLine(line)));
      else html.push(lineDiv(line, escapeHTML(line)));
      emittedAny = true;
    }
  }
  if (!emittedAny) {
    out.innerHTML = '<div class="placeholder">No matching lines.</div>';
    return;
  }
  out.innerHTML = html.join('');
}
