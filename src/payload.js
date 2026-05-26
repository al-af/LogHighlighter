const NSDICT_LINE = /^[^\s=;{}]+\s*=\s*.+;\s*$/;
const NSDICT_OPEN = /^[^\s=;{}]+\s*=\s*\{\s*$/;

function findBalanced(text, startIdx) {
  const open = text[startIdx];
  const close = open === '{' ? '}' : ']';
  let depth = 0, inStr = false, esc = false;
  for (let i = startIdx; i < text.length; i++) {
    const c = text[i];
    if (inStr) {
      if (esc) esc = false;
      else if (c === '\\') esc = true;
      else if (c === '"') inStr = false;
      continue;
    }
    if (c === '"') { inStr = true; continue; }
    if (c === open) depth++;
    else if (c === close) {
      depth--;
      if (depth === 0) return i + 1;
    }
  }
  return -1;
}

function tryNSDict(text) {
  const inner = text.slice(1, -1);
  const lines = inner.split('\n').map(l => l.trim()).filter(Boolean);
  if (!lines.length) return null;
  let kvHits = 0;
  for (const l of lines) {
    if (NSDICT_LINE.test(l)) { kvHits++; continue; }
    if (NSDICT_OPEN.test(l)) { kvHits++; continue; }
    if (l === '{' || l === '}' || l === '},' || l === '};') continue;
    if (/^\(.*\);?$/.test(l)) continue;
    return null;
  }
  if (!kvHits) return null;
  return reindentNSDict(text);
}

function reindentNSDict(text) {
  const out = [];
  let depth = 0;
  let buf = '';
  const indent = () => '  '.repeat(depth);
  const flushTrimmed = () => {
    const s = buf.trim();
    buf = '';
    if (s) out.push(indent() + s);
  };
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === '{') {
      const head = buf.trim();
      buf = '';
      out.push(indent() + (head ? head + ' {' : '{'));
      depth++;
    } else if (c === '}') {
      flushTrimmed();
      depth = Math.max(0, depth - 1);
      let suffix = '';
      if (text[i + 1] === ';' || text[i + 1] === ',') {
        suffix = text[i + 1];
        i++;
      }
      out.push(indent() + '}' + suffix);
    } else if (c === ';') {
      buf += ';';
      flushTrimmed();
    } else if (c === '\n' || c === '\r') {
      // structure comes from { } ;
    } else {
      buf += c;
    }
  }
  if (buf.trim()) out.push(indent() + buf.trim());
  return out.join('\n');
}

export function detectPayload(line) {
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c !== '{' && c !== '[') continue;
    const end = findBalanced(line, i);
    if (end < 0) continue;
    const raw = line.slice(i, end);
    try {
      const parsed = JSON.parse(raw);
      return { start: i, end, pretty: JSON.stringify(parsed, null, 2) };
    } catch (_) { /* try NSDict */ }
    if (c === '{') {
      const ns = tryNSDict(raw);
      if (ns) return { start: i, end, pretty: ns };
    }
  }
  return null;
}
