# LogHighlighter Phase 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add persistence, named presets, and share-by-link to LogHighlighter so keyword setups survive refreshes and can be shared with teammates via URL.

**Architecture:** Three new ES modules — `storage.js` (versioned localStorage I/O), `presets.js` (named preset CRUD), `share.js` (base64url hash encoding). One UI strip inside the Keyword Groups panel. `main.js` unifies mode mutations through `notify()` so auto-save subscribes once.

**Tech Stack:** Vanilla ES modules, no build step. Vitest for unit tests (Node, native ESM, no bundler required). GitHub Pages for hosting.

**Spec:** `docs/superpowers/specs/2026-05-26-loghighlighter-phase1-design.md`

---

## File Structure

**Create:**
- `package.json` — Vitest dev dependency, `test` script
- `vitest.config.js` — jsdom environment for DOM-aware tests
- `src/storage.js` — versioned localStorage I/O
- `src/presets.js` — preset CRUD
- `src/share.js` — URL hash encode/decode
- `tests/storage.test.js`
- `tests/presets.test.js`
- `tests/share.test.js`
- `.gitignore` — exclude `node_modules`

**Modify:**
- `index.html` — add preset sub-strip, share banner element, link to module
- `src/main.js` — new init order, persist subscriber, mode through notify, wire preset + share UI, banner handlers
- `styles/app.css` — `.presets` row and `.share-banner` styles

**Untouched:** `src/state.js`, `src/groups.js`, `src/groupsView.js`, `src/payload.js`, `src/highlight.js`, `src/output.js`, `src/logcat.js`, `.nojekyll`, `README.md`.

---

## Task 1: Set up Vitest

**Files:**
- Create: `package.json`
- Create: `vitest.config.js`
- Create: `.gitignore`
- Create: `tests/smoke.test.js`

- [ ] **Step 1: Create `package.json`**

```json
{
  "name": "loghighlighter",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "devDependencies": {
    "vitest": "^2.1.0",
    "jsdom": "^25.0.0"
  }
}
```

- [ ] **Step 2: Create `vitest.config.js`**

```js
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    include: ['tests/**/*.test.js'],
  },
});
```

- [ ] **Step 3: Create `.gitignore`**

```
node_modules/
.DS_Store
```

- [ ] **Step 4: Install dependencies**

Run: `npm install`

Expected: `node_modules/` created, no errors.

- [ ] **Step 5: Write smoke test**

Create `tests/smoke.test.js`:

```js
import { describe, it, expect } from 'vitest';

describe('smoke', () => {
  it('runs', () => {
    expect(1 + 1).toBe(2);
  });

  it('has DOM access (jsdom)', () => {
    document.body.innerHTML = '<div id="x">hi</div>';
    expect(document.getElementById('x').textContent).toBe('hi');
  });
});
```

- [ ] **Step 6: Run smoke test**

Run: `npm test`

Expected: `2 passed`.

- [ ] **Step 7: Commit**

```bash
git add package.json package-lock.json vitest.config.js .gitignore tests/smoke.test.js
git commit -m "chore: add vitest with jsdom for unit tests"
```

---

## Task 2: `src/storage.js` — versioned localStorage

**Files:**
- Create: `src/storage.js`
- Create: `tests/storage.test.js`

- [ ] **Step 1: Write failing test — save/load roundtrip**

Create `tests/storage.test.js`:

```js
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
});
```

- [ ] **Step 2: Run test, verify it fails**

Run: `npm test -- tests/storage.test.js`

Expected: FAIL — `Cannot find module '../src/storage.js'`.

- [ ] **Step 3: Implement `src/storage.js`**

```js
const VERSION = 1;
let availableCache = null;

export function isAvailable() {
  if (availableCache !== null) return availableCache;
  try {
    const probe = '__loghl_probe__';
    localStorage.setItem(probe, '1');
    localStorage.removeItem(probe);
    availableCache = true;
  } catch (_) {
    availableCache = false;
  }
  return availableCache;
}

export function load(key) {
  if (!isAvailable()) return null;
  try {
    const raw = localStorage.getItem(key);
    if (raw == null) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || parsed.version !== VERSION) return null;
    return parsed.data;
  } catch (err) {
    console.warn('[loghl:storage] load failed for', key, err);
    return null;
  }
}

export function save(key, value) {
  if (!isAvailable()) return false;
  try {
    const envelope = JSON.stringify({ version: VERSION, data: value });
    localStorage.setItem(key, envelope);
    return true;
  } catch (err) {
    console.warn('[loghl:storage] save failed for', key, err);
    return false;
  }
}

export function remove(key) {
  if (!isAvailable()) return;
  try {
    localStorage.removeItem(key);
  } catch (err) {
    console.warn('[loghl:storage] remove failed for', key, err);
  }
}
```

- [ ] **Step 4: Run test, verify it passes**

Run: `npm test -- tests/storage.test.js`

Expected: `1 passed`.

- [ ] **Step 5: Add tests for null-on-missing, corrupt JSON, version mismatch**

Append to `tests/storage.test.js` inside the `describe('storage', ...)` block:

```js
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
```

- [ ] **Step 6: Run tests, verify all pass**

Run: `npm test -- tests/storage.test.js`

Expected: `7 passed`.

- [ ] **Step 7: Commit**

```bash
git add src/storage.js tests/storage.test.js
git commit -m "feat(storage): add versioned localStorage with fail-soft I/O"
```

---

## Task 3: `src/presets.js` — preset CRUD

**Files:**
- Create: `src/presets.js`
- Create: `tests/presets.test.js`

- [ ] **Step 1: Write failing test — list empty, save, list returns name**

Create `tests/presets.test.js`:

```js
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
});
```

- [ ] **Step 2: Run test, verify it fails**

Run: `npm test -- tests/presets.test.js`

Expected: FAIL — module not found.

- [ ] **Step 3: Implement `src/presets.js`**

```js
import { load, save } from './storage.js';

const KEY = 'loghl:presets';
const MAX_NAME = 40;
const listeners = new Set();

function readAll() {
  return load(KEY) || {};
}

function writeAll(all) {
  save(KEY, all);
  listeners.forEach(fn => fn());
}

function validateName(name) {
  if (typeof name !== 'string') return { ok: false, reason: 'name must be a string' };
  const trimmed = name.trim();
  if (!trimmed.length) return { ok: false, reason: 'name is empty' };
  if (trimmed.length > MAX_NAME) return { ok: false, reason: `name exceeds ${MAX_NAME} chars` };
  if (/[\x00-\x1f\x7f]/.test(trimmed)) return { ok: false, reason: 'name contains control characters' };
  return { ok: true, trimmed };
}

export function listPresets() {
  return Object.keys(readAll());
}

export function savePreset(name, groups) {
  const v = validateName(name);
  if (!v.ok) return v;
  const all = readAll();
  all[v.trimmed] = { groups: structuredClone(groups), savedAt: Date.now() };
  writeAll(all);
  return { ok: true };
}

export function loadPreset(name) {
  const all = readAll();
  const entry = all[name];
  if (!entry) return null;
  return structuredClone(entry.groups);
}

export function deletePreset(name) {
  const all = readAll();
  if (!(name in all)) return false;
  delete all[name];
  writeAll(all);
  return true;
}

export function renamePreset(oldName, newName) {
  const v = validateName(newName);
  if (!v.ok) return v;
  const all = readAll();
  if (!(oldName in all)) return { ok: false, reason: 'preset not found' };
  if (v.trimmed === oldName) return { ok: true };
  if (v.trimmed in all) return { ok: false, reason: 'name already exists' };
  all[v.trimmed] = all[oldName];
  delete all[oldName];
  writeAll(all);
  return { ok: true };
}

export function onChange(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
```

- [ ] **Step 4: Run tests, verify they pass**

Run: `npm test -- tests/presets.test.js`

Expected: `2 passed`.

- [ ] **Step 5: Add tests for load, delete, rename, name validation, overwrite, onChange**

Append inside the `describe('presets', ...)` block:

```js
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
```

- [ ] **Step 6: Run tests, verify all pass**

Run: `npm test -- tests/presets.test.js`

Expected: `14 passed`.

- [ ] **Step 7: Commit**

```bash
git add src/presets.js tests/presets.test.js
git commit -m "feat(presets): add named-preset CRUD on top of storage"
```

---

## Task 4: `src/share.js` — URL hash encode/decode

**Files:**
- Create: `src/share.js`
- Create: `tests/share.test.js`

- [ ] **Step 1: Write failing test — encode/decode roundtrip**

Create `tests/share.test.js`:

```js
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
});
```

- [ ] **Step 2: Run test, verify it fails**

Run: `npm test -- tests/share.test.js`

Expected: FAIL — module not found.

- [ ] **Step 3: Implement `src/share.js`**

```js
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
```

- [ ] **Step 4: Run test, verify it passes**

Run: `npm test -- tests/share.test.js`

Expected: `1 passed`.

- [ ] **Step 5: Add tests for edge cases**

Append inside the `describe('share', ...)` block:

```js
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
```

- [ ] **Step 6: Run tests, verify all pass**

Run: `npm test -- tests/share.test.js`

Expected: `10 passed`.

- [ ] **Step 7: Commit**

```bash
git add src/share.js tests/share.test.js
git commit -m "feat(share): add URL hash encode/decode for shareable links"
```

---

## Task 5: HTML markup + CSS for preset strip and share banner

**Files:**
- Modify: `index.html`
- Modify: `styles/app.css`

- [ ] **Step 1: Add preset sub-strip and share banner to `index.html`**

In `index.html`, find the Keyword Groups panel block:

```html
    <section class="panel">
      <h2>Keyword Groups</h2>
      <div class="panel-body">
        <div id="groups"></div>
        <div class="add-group">
          <input id="newGroup" placeholder="comma,separated,keywords" autocomplete="off">
          <button id="addGroup">Add</button>
        </div>
      </div>
    </section>
```

Replace the `<div class="panel-body">` block with:

```html
      <div class="panel-body">
        <div class="presets" id="presets">
          <select id="presetSelect" aria-label="Preset">
            <option value="">— Presets —</option>
          </select>
          <button id="presetLoad" type="button">Load</button>
          <button id="presetSave" type="button" title="Save current as preset…">Save…</button>
          <button id="presetDelete" type="button" title="Delete selected preset">×</button>
          <button id="copyShareLink" type="button" title="Copy a link with current groups">Share</button>
        </div>
        <div id="groups"></div>
        <div class="add-group">
          <input id="newGroup" placeholder="comma,separated,keywords" autocomplete="off">
          <button id="addGroup">Add</button>
        </div>
      </div>
```

Then immediately AFTER the closing `</header>` tag (so the banner sits at the top of the document flow), add:

```html
<div id="shareBanner" class="share-banner" hidden>
  <span class="share-banner-text">Loaded a shared setup (<span id="shareBannerCount">0</span> groups).</span>
  <button id="shareBannerUse" type="button">Use shared</button>
  <button id="shareBannerKeep" type="button">Keep mine</button>
  <button id="shareBannerMerge" type="button">Merge</button>
</div>
```

- [ ] **Step 2: Add CSS for `.presets` and `.share-banner`**

Append to `styles/app.css`:

```css
.presets {
  display: flex;
  gap: 6px;
  margin-bottom: 8px;
  align-items: center;
}
.presets select {
  flex: 1;
  min-width: 0;
  padding: 5px 6px;
  border: 1px solid var(--border);
  border-radius: 6px;
  background: var(--panel);
  font: inherit;
  color: var(--text);
}
.presets button {
  padding: 5px 10px;
  border: 1px solid var(--border);
  background: var(--panel);
  border-radius: 6px;
  cursor: pointer;
  font: inherit;
  color: var(--text);
}
.presets button:hover:not(:disabled) { background: #f0f0f0; }
.presets button:disabled { opacity: 0.5; cursor: not-allowed; }
.presets #presetDelete { padding: 5px 8px; }

.share-banner {
  display: flex;
  gap: 8px;
  align-items: center;
  padding: 8px 16px;
  background: #fff8d4;
  border-bottom: 1px solid #e0c060;
  font-size: 13px;
}
.share-banner[hidden] { display: none; }
.share-banner-text { flex: 1; }
.share-banner button {
  padding: 4px 10px;
  border: 1px solid var(--border);
  background: var(--panel);
  border-radius: 6px;
  cursor: pointer;
  font: inherit;
  color: var(--text);
}
.share-banner button:hover { background: #f0f0f0; }
```

- [ ] **Step 3: Manual smoke check**

Run: `python3 -m http.server 8765` then open `http://localhost:8765` in a browser.

Expected:
- Preset strip visible above the empty groups list, with select and four buttons.
- No share banner visible.
- App still functions (add a keyword group; it appears).

Stop the server with Ctrl+C.

- [ ] **Step 4: Commit**

```bash
git add index.html styles/app.css
git commit -m "feat(ui): add preset strip and share banner markup + styles"
```

---

## Task 6: Wire preset UI, share, banner, and persistence in `main.js`

**Files:**
- Modify: `src/main.js`

- [ ] **Step 1: Replace `src/main.js` with the new wiring**

Replace the entire contents of `src/main.js` with:

```js
import { state, subscribe, notify } from './state.js';
import { addGroup } from './groups.js';
import { renderGroups } from './groupsView.js';
import { renderOutput } from './output.js';
import { load, save } from './storage.js';
import { listPresets, savePreset, loadPreset, deletePreset, onChange as onPresetsChange } from './presets.js';
import { encodeGroups, consumeHash } from './share.js';

const STATE_KEY = 'loghl:state';

function applyLoadedState(loaded) {
  if (!loaded) return;
  if (Array.isArray(loaded.groups)) state.groups = loaded.groups;
  if (loaded.mode === 'filter' || loaded.mode === 'full') state.mode = loaded.mode;
}

function renderPresetSelect() {
  const select = document.getElementById('presetSelect');
  const current = select.value;
  while (select.options.length > 1) select.remove(1);
  for (const name of listPresets()) {
    const opt = document.createElement('option');
    opt.value = name;
    opt.textContent = name;
    select.appendChild(opt);
  }
  if (current && listPresets().includes(current)) select.value = current;
}

function syncModeButtons() {
  document.querySelectorAll('#mode button').forEach(b => {
    b.classList.toggle('active', b.dataset.mode === state.mode);
  });
}

function syncShareButton() {
  document.getElementById('copyShareLink').disabled = state.groups.length === 0;
  document.getElementById('presetSave').disabled = state.groups.length === 0;
}

function dedupeGroups(groups) {
  const seen = new Set();
  const out = [];
  for (const g of groups) {
    const key = g.keywords.slice().sort().join('').toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(g);
  }
  return out;
}

function showBanner(sharedGroups, sharedMode) {
  const banner = document.getElementById('shareBanner');
  const use = document.getElementById('shareBannerUse');
  const keep = document.getElementById('shareBannerKeep');
  const merge = document.getElementById('shareBannerMerge');
  document.getElementById('shareBannerCount').textContent = String(sharedGroups.length);
  banner.hidden = false;

  const onUse = () => {
    state.groups = sharedGroups;
    state.mode = sharedMode;
    syncModeButtons();
    notify();
    cleanup();
  };
  const onKeep = () => cleanup();
  const onMerge = () => {
    state.groups = dedupeGroups([...state.groups, ...sharedGroups]);
    notify();
    cleanup();
  };

  function cleanup() {
    banner.hidden = true;
    use.removeEventListener('click', onUse);
    keep.removeEventListener('click', onKeep);
    merge.removeEventListener('click', onMerge);
  }

  use.addEventListener('click', onUse);
  keep.addEventListener('click', onKeep);
  merge.addEventListener('click', onMerge);
}

async function copyShareLink() {
  const link = encodeGroups(state.groups, state.mode);
  const btn = document.getElementById('copyShareLink');
  const original = btn.textContent;
  const flash = () => {
    btn.textContent = 'Copied ✓';
    setTimeout(() => { btn.textContent = original; }, 1800);
  };
  try {
    await navigator.clipboard.writeText(link);
    flash();
  } catch (_) {
    window.prompt('Copy this link:', link);
  }
}

// ── init ────────────────────────────────────────────────────────────────────

const saved = load(STATE_KEY);
applyLoadedState(saved);

const hashResult = consumeHash();
if (hashResult.ok) {
  if (state.groups.length === 0) {
    state.groups = hashResult.groups;
    state.mode = hashResult.mode;
    save(STATE_KEY, { groups: state.groups, mode: state.mode });
  } else {
    showBanner(hashResult.groups, hashResult.mode);
  }
}

subscribe(renderGroups);
subscribe(renderOutput);
subscribe(syncShareButton);
subscribe(() => save(STATE_KEY, { groups: state.groups, mode: state.mode }));

onPresetsChange(renderPresetSelect);

// ── DOM wiring ──────────────────────────────────────────────────────────────

document.getElementById('addGroup').addEventListener('click', () => {
  const input = document.getElementById('newGroup');
  addGroup(input.value);
  input.value = '';
  input.focus();
});

document.getElementById('newGroup').addEventListener('keydown', e => {
  if (e.key === 'Enter') {
    e.preventDefault();
    document.getElementById('addGroup').click();
  }
});

document.getElementById('input').addEventListener('input', e => {
  state.input = e.target.value;
  renderOutput();
});

document.getElementById('mode').addEventListener('click', e => {
  const btn = e.target.closest('button[data-mode]');
  if (!btn) return;
  state.mode = btn.dataset.mode;
  syncModeButtons();
  notify();
});

document.getElementById('presetLoad').addEventListener('click', () => {
  const name = document.getElementById('presetSelect').value;
  if (!name) return;
  const groups = loadPreset(name);
  if (!groups) return;
  state.groups = groups;
  notify();
});

document.getElementById('presetSave').addEventListener('click', () => {
  if (state.groups.length === 0) return;
  const name = window.prompt('Preset name:');
  if (name == null) return;
  if (listPresets().includes(name.trim()) && !window.confirm(`Overwrite preset "${name.trim()}"?`)) {
    return;
  }
  const result = savePreset(name, state.groups);
  if (!result.ok) window.alert(`Could not save: ${result.reason}`);
  else document.getElementById('presetSelect').value = name.trim();
});

document.getElementById('presetDelete').addEventListener('click', () => {
  const name = document.getElementById('presetSelect').value;
  if (!name) return;
  if (!window.confirm(`Delete preset "${name}"?`)) return;
  deletePreset(name);
  document.getElementById('presetSelect').value = '';
});

document.getElementById('copyShareLink').addEventListener('click', copyShareLink);

window.addEventListener('hashchange', () => {
  const r = consumeHash();
  if (r.ok) {
    if (state.groups.length === 0) {
      state.groups = r.groups;
      state.mode = r.mode;
      syncModeButtons();
      notify();
    } else {
      showBanner(r.groups, r.mode);
    }
  }
});

// ── initial render ──────────────────────────────────────────────────────────

renderPresetSelect();
syncModeButtons();
syncShareButton();
renderGroups();
renderOutput();
```

- [ ] **Step 2: Manual smoke — persistence**

Run: `python3 -m http.server 8765` then open `http://localhost:8765`.

Steps:
1. Add a keyword group: `session, attribution`.
2. Confirm it shows in the groups panel.
3. Refresh the browser (`Cmd+R`).
4. Confirm the group is still there.

Expected: group survives refresh.

- [ ] **Step 3: Manual smoke — mode persistence**

Continuing from Step 2:

1. Click "Full" in the mode toggle.
2. Refresh.
3. Confirm "Full" is still selected and active.

Expected: mode survives refresh.

- [ ] **Step 4: Manual smoke — preset save/load/delete**

1. Click "Save…", enter `MyPreset`. Click OK.
2. Confirm "MyPreset" appears in the preset dropdown.
3. Remove the group via its × button. Groups panel is empty.
4. Select "MyPreset" in the dropdown, click "Load".
5. Group reappears.
6. Click "×" (delete preset). Confirm prompt. Dropdown empty.

Expected: all preset operations work end-to-end.

- [ ] **Step 5: Manual smoke — share link**

1. With at least one group present, click "Share".
2. Button flashes "Copied ✓".
3. Paste the URL into a new browser tab.
4. New tab opens with the same group(s) preloaded.

Expected: shared link round-trips. (Note: `navigator.clipboard.writeText` requires HTTPS or localhost — `localhost:8765` qualifies.)

- [ ] **Step 6: Manual smoke — share link with existing local state (banner)**

1. In the original tab, add a different group: `foo, bar`.
2. Copy the share link from another setup (use the share link from Step 5).
3. Open a new tab with that link.
4. Modify localStorage in DevTools so the tab already has groups (`loghl:state` with content), OR add a group first, THEN paste the share URL into the address bar.
5. The yellow banner appears: "Loaded a shared setup (N groups). [Use shared] [Keep mine] [Merge]".
6. Click each option in three test runs; verify behavior:
   - **Use shared**: replaces local groups with shared.
   - **Keep mine**: dismisses banner, local groups unchanged.
   - **Merge**: appends shared groups, dedupes exact matches.

Expected: banner behaves per spec.

Stop the server with Ctrl+C.

- [ ] **Step 7: Run unit tests one more time**

Run: `npm test`

Expected: all tests pass (smoke + storage + presets + share).

- [ ] **Step 8: Commit**

```bash
git add src/main.js
git commit -m "feat(main): wire persistence, presets, and share-by-link"
```

---

## Task 7: Update README

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Add new module entries and a usage section**

In `README.md`, find the `src/` block in the directory tree and add the new modules. Replace the existing tree section with:

```
.
├── index.html          # markup shell, loads ES module entry
├── styles/
│   └── app.css         # all styles
├── src/
│   ├── main.js         # entry: wires DOM listeners, kicks initial render
│   ├── state.js        # PALETTE, state, subscribe/notify pub-sub
│   ├── groups.js       # group/keyword CRUD mutators
│   ├── groupsView.js   # renders #groups panel
│   ├── payload.js      # JSON + NSDictionary detection and pretty-print
│   ├── logcat.js       # Android logcat line detection (level + tag)
│   ├── highlight.js    # HTML-escaping + overlap-free multi-group highlighter
│   ├── output.js       # renders #output panel (filter/full modes)
│   ├── storage.js      # versioned localStorage I/O
│   ├── presets.js      # named-preset CRUD
│   └── share.js        # URL hash encode/decode for shareable links
├── tests/              # vitest unit tests
└── .nojekyll           # disables Jekyll processing on GitHub Pages
```

Append to the README, before the "Deploy to GitHub Pages" section:

```markdown
## Tests

Unit tests cover storage, presets, and share-link encoding.

```bash
npm install
npm test
```

## Sharing setups

Click **Share** in the Keyword Groups panel to copy a URL with your current groups encoded in the fragment. Send it to a teammate — they open the link, get your setup preloaded, and paste their own logs in. The share URL never includes log content.

If the recipient already has local groups configured, a banner asks whether to use the shared setup, keep theirs, or merge.
```

- [ ] **Step 2: Commit**

```bash
git add README.md
git commit -m "docs: document storage/presets/share modules and usage"
```

---

## Task 8: Final integration check

**Files:** none modified.

- [ ] **Step 1: Run all tests**

Run: `npm test`

Expected: all tests pass across `smoke`, `storage`, `presets`, `share`.

- [ ] **Step 2: Serve and walk through the full workflow**

Run: `python3 -m http.server 8765` then open `http://localhost:8765`.

Walk through:
1. Add two groups: `session,attribution` and `error,fail`.
2. Paste a sample log into the input. Verify highlighting works.
3. Toggle Filter ↔ Full. Verify mode switches and persists on refresh.
4. Save preset "Debug", load preset, delete preset.
5. Click Share. Paste the URL into a new tab. Verify it preloads.
6. In a tab with existing groups, paste the share URL. Verify the banner appears and each button works.
7. Refresh the page repeatedly. Verify nothing is lost.

Stop the server with Ctrl+C.

- [ ] **Step 3: Verify no regressions in existing behavior**

In the served page:
1. Pretty-printed JSON payloads still render multi-line.
2. NSDictionary payloads still reindent.
3. Logcat severity colors still render (V/D/I/W/E/F/A).
4. Filter mode still drops non-matching lines with `···` separators.

Expected: all previous features behave identically.

- [ ] **Step 4: No commit needed for this task.**

If anything failed in the walkthrough, fix it as a new commit before declaring Phase 1 done.
