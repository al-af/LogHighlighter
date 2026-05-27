import { state } from './state.js';
import { detectPayload } from './payload.js';
import { parseLogcat } from './logcat.js';
import { parseOSLog } from './oslog.js';
import { refreshAfterRender } from './lineNav.js';
import { escapeHTML, highlight } from './highlight.js';

function lineDiv(lineText, innerHTML, lineNumber) {
  const parsed = parseLogcat(lineText) || parseOSLog(lineText);
  const cls = parsed ? `lc lc-${parsed.level}` : '';
  return `<div class="line ${cls}"><span class="ln">${lineNumber}</span><span class="content">${innerHTML}</span></div>`;
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
    out.innerHTML = '<div class="placeholder">Paste raw logs in the Input panel, then pick a preset above (or open <kbd>? Guide</kbd>) to start highlighting.<br><small>Best with logs under 500 KB.</small></div>';
    refreshAfterRender();
    return;
  }
  const lines = raw.split('\n');
  const html = [];
  let dropped = 0;
  let emittedAny = false;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineNumber = i + 1;
    const matched = lineMatches(line);
    if (state.mode === 'filter') {
      if (!matched) { dropped++; continue; }
      if (dropped > 0 && emittedAny) html.push('<div class="sep">···</div>');
      dropped = 0;
      html.push(lineDiv(line, renderLine(line), lineNumber));
      emittedAny = true;
    } else {
      if (matched) html.push(lineDiv(line, renderLine(line), lineNumber));
      else html.push(lineDiv(line, escapeHTML(line), lineNumber));
      emittedAny = true;
    }
  }
  if (!emittedAny) {
    out.innerHTML = '<div class="placeholder">No matching lines.<br><small>Switch to Full mode to see everything, or adjust your keyword groups.</small></div>';
    refreshAfterRender();
    return;
  }
  out.innerHTML = html.join('');
  refreshAfterRender();
}
