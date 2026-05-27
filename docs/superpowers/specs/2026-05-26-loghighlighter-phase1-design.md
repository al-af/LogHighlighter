# LogHighlighter v2 — Phase 1 Design

**Date:** 2026-05-26
**Scope:** Persistence + Named Presets + Share-by-link
**Out of scope (deferred):** regex support, match counts, n/N navigation, collapsible payloads, dark mode

## 1. Goals

Solve two stated pains:

1. **Recurring debug sessions** — keyword groups disappear on page refresh. User re-types them every session.
2. **Sharing setup with teammates** — today, "paste the raw log + tell them which keywords" requires the teammate to manually re-create the configuration.

These three features form a cohesive bundle. They share the same encoding logic, the same data shape, and the same schema version. They reinforce each other.

## 2. Non-goals

- Regex support, match counts, n/N navigation, collapsible payloads, dark mode — all deferred to future phases. Layer in only when friction is real.
- Persisting `state.input` (the log text). Logs can be MB-scale and may contain PII; persisting them across reloads is a data-retention risk with no UX win.
- Cloud sync, multi-user, server-side state — out of scope forever; this is a static tool.

## 3. Architecture overview

Three new modules, one UI strip, two small touchpoints in existing files.

```
src/
├── storage.js   NEW   namespaced localStorage with versioned envelope
├── presets.js   NEW   preset CRUD (uses storage.js)
├── share.js     NEW   URL hash encode/decode + load-time banner
├── main.js      MOD   wire persist + load order + share button + presets UI
├── state.js     —     unchanged
├── groups.js    —     unchanged (mutators already call notify())
├── ...          —     all other modules unchanged
```

Plus a UI strip inside the existing Keyword Groups panel (presets `<select>` + Load/Save/Delete + Copy share link).

## 4. Module: `src/storage.js`

### Responsibility
Namespaced, versioned, fail-soft localStorage I/O. No business logic.

### Keys
- `loghl:state` — current working state (groups + mode).
- `loghl:presets` — named saved groups.

### On-disk envelope
Every value is wrapped:
```js
{ version: 1, data: <payload> }
```
On read, mismatched/missing version returns `null` (treated as "no data"). Reserves a migration hook for future versions, unused at v1.

### API
```
load(key) -> any | null
save(key, value) -> boolean
remove(key) -> void
isAvailable() -> boolean
```
- `load`: returns `null` on missing, corrupt JSON, version mismatch, or disabled storage.
- `save`: returns `false` on quota exceeded or disabled storage. Never throws.
- `isAvailable`: one-time probe, cached.

### Error policy
Fail-soft. `console.warn` on errors. No toasts, no modals. This is a dev utility, not a system of record.

### What gets persisted
- `state.groups` ✓
- `state.mode` ✓
- `state.input` ✗ — never. Size + PII risk.

Persisted blob shape under `loghl:state`:
```js
{ version: 1, data: { groups: [...], mode: 'filter' } }
```

## 5. Module: `src/presets.js`

### Responsibility
CRUD for named keyword-group sets, backed by `storage.js`.

### On-disk shape (under `loghl:presets`)
```js
{
  version: 1,
  data: {
    [name: string]: { groups: Group[], savedAt: number }
  }
}
```
Object keyed by name; insertion order preserved by modern JS engines (good enough for listing). `savedAt` enables future "sort by recent" if needed.

### API
```
listPresets() -> string[]                      // names, insertion order
savePreset(name, groups) -> { ok, reason? }    // validates name; auto-overwrites
loadPreset(name) -> Group[] | null
deletePreset(name) -> boolean
renamePreset(oldName, newName) -> { ok, reason? }
onChange(fn) -> void                           // listener for the preset <select> renderer
```

### Naming constraints
- Trim whitespace.
- 1–40 chars.
- Allow any printable Unicode except control chars.
- Exact-match (case-sensitive) duplicate detection.

### Overwrite policy
`savePreset` auto-overwrites. The UI layer (not the data layer) shows a `confirm()` when the name already exists.

### Load semantics
Full replace of `state.groups`. Not merge. Merge would force conflict resolution on `colorIndex` and would not match the user's mental model.

## 6. Module: `src/share.js`

### Responsibility
Encode the current keyword setup to a URL hash; decode and apply on load.

### URL format
```
https://user.github.io/LogHighlighter/#s=<base64url(json)>
```

Hash fragment, not query — never sent to the server. Single opaque key `s` — atomic, parser-simple.

### Encoded payload
```js
{ v: 1, g: [{ k: [...keywords], c: colorIndex }], m: 'filter' | 'full' }
```
Short keys (`g`, `k`, `c`, `m`) save ~25% on JSON before encoding. Schema version `v` is required.

### What's encoded
- `groups` ✓ (the user's intent)
- `mode` ✓ (sender chose it deliberately; recipient sees the same view)
- `input` ✗ — same reasons as persistence
- theme/other prefs ✗ — recipient's preference wins

### Size
Plain base64url, no compression. Typical payload (~5 groups × ~8 keywords): ~670 chars. No LZ-string dependency in Phase 1 — it doesn't earn its keep until payloads exceed ~1500 chars, which we won't hit without regex or massive keyword lists. If someone builds a 50-group setup, the link will still work; just longer.

### Load-time behavior
On page boot, before reading localStorage:

1. Check `location.hash` for `s=`.
2. Decode. On error, see §6 edge cases.
3. If decoded successfully:
   - If `localStorage.groups` is empty/unset → **apply silently**, strip hash via `history.replaceState`, proceed.
   - If existing local groups → show a non-blocking banner:
     > *Loaded a shared setup (N groups). [Use shared] [Keep mine] [Merge]*
     - "Use shared" (default): replace local groups with shared.
     - "Keep mine": dismiss banner, do nothing.
     - "Merge": append shared groups to local; dedupe by exact `keywords` array equality.
4. After choice, strip hash.

### UI surface
- "Copy share link" button inside the Keyword Groups panel header (right-aligned).
- On click: copy to clipboard, swap button label to "Copied ✓" for 1.8s, then revert.
- Disabled when `state.groups` is empty, with tooltip "Add a keyword group first."
- Fallback: if `navigator.clipboard.writeText` fails (insecure context, permission), open a `prompt()` with the link preselected.

### Edge cases
| Case | Behavior |
|---|---|
| Malformed base64 / JSON | Strip hash, `console.warn`, show dismissible banner "Shared link was invalid or corrupted." |
| Schema `v` > 1 | Banner: "Link made with a newer version. Update LogHighlighter or ask sender to re-share." Do not partially apply. |
| Missing required field (`g`) | Treat as malformed. |
| `colorIndex` out of range | Clamp: `colorIndex % PALETTE.length`. Don't reject. |
| `hashchange` mid-session | Listen for `hashchange`; replace any current banner with the new one. |
| Empty `groups: []` in payload | Valid — sender shared "no groups". Apply. |

## 7. UI changes

### Keyword Groups panel — preset sub-strip
Inserted as the first child of the existing `.panel-body` in the Keyword Groups panel, above the current add-group row:

```html
<div class="presets" id="presets">
  <select id="presetSelect">
    <option value="">— Presets —</option>
  </select>
  <button id="presetLoad">Load</button>
  <button id="presetSave" title="Save current as preset…">Save…</button>
  <button id="presetDelete" title="Delete selected">×</button>
  <button id="copyShareLink" title="Copy a link with current groups">🔗 Share</button>
</div>
```

- `Save…` prompts for a name via `prompt()` (v1; modal can come later).
- The `<select>` renderer subscribes to `presets.onChange(fn)`.
- All buttons disabled when `groups` is empty (Save/Share specifically).

CSS: minimal — `.presets { display: flex; gap: 6px; margin-bottom: 8px; }`. Same input/button styling as the existing add-group row.

## 8. Auto-save trigger — unifying the mutation seam

### Current state (post-refactor)
- `groups.js` mutators call `notify()`.
- `main.js` mode listener mutates `state.mode` directly and calls `renderOutput()` — bypasses `notify()`.
- Textarea input listener mutates `state.input` and calls `renderOutput()` — bypasses `notify()`.

### Phase 1 change
Move **mode** changes through `notify()` to make auto-save automatic. Leave textarea input bypassing `notify()` — we don't want to persist on every keystroke, and we never persist `input` anyway.

In `main.js` mode click handler:
```js
state.mode = btn.dataset.mode;
notify();  // was renderOutput()
```

The `.active` class toggle currently happens in the listener. Move it into a small subscriber that reads `state.mode` and updates the buttons. Or: keep it in the listener for now (still imperative, but localized). Pick whichever is smaller. **Recommendation: keep in listener for v1, refactor only if a second mode-mutation site appears.**

### Auto-save subscriber
In `main.js`, after subscribing renderers:
```js
subscribe(() => storage.save('loghl:state', {
  groups: state.groups,
  mode: state.mode,
}));
```

`notify()` already fires for every group mutation (add/remove/keyword-removal) and now mode changes. Textarea typing does not fire `notify()`, so we don't churn localStorage on every keystroke.

## 9. Init order

Critical: load before subscribers attach, so the auto-save subscriber doesn't fire on the initial state mutation and overwrite saved state with empty defaults.

In `main.js`:

1. **`storage.load('loghl:state')`** — populate `state.groups` and `state.mode` from localStorage.
2. **`share.consumeHash()`** — check URL hash. If a valid payload is present:
   - If `state.groups` is empty (nothing in localStorage either) → apply silently.
   - Else → render banner; banner button clicks mutate `state` and call `notify()`.
   In both cases, strip the hash via `history.replaceState`.
3. Subscribe renderers (`renderGroups`, `renderOutput`).
4. Subscribe auto-save persistence.
5. Attach DOM listeners (add-group button, textarea, mode toggle, preset controls, share button).
6. Initial render: `renderGroups(); renderOutput();`.

Ordering rationale:
- `storage.load` first so `share.consumeHash` can correctly compare against existing state (empty vs not).
- Subscribers attach AFTER state is loaded so the auto-save subscriber doesn't fire on the load itself (load mutates `state` directly, no `notify()` involved).
- Initial render last so the user sees the loaded (or share-applied) state, not the empty default.

The banner's Use-shared/Keep/Merge clicks happen well after this init runs; they call mutators on `state.groups` and `notify()`, which fires the renderers and the auto-save subscriber. Persistence of the shared setup happens automatically through that path — no special-case code in `share.js`.

## 10. Risks & open questions

| Risk | Mitigation |
|---|---|
| Auto-save fires on initial subscribe → overwrites loaded state with empty defaults | Subscribe to `notify()` AFTER `storage.load()`. Listed in §9 init order. |
| `colorIndex` mismatch if PALETTE ever changes | Clamp `colorIndex % PALETTE.length` on load. |
| Quota exceeded on `savePreset` | Silent in v1 (`console.warn`). If users hit it, surface inline. Flagged. |
| Preset name case-sensitivity ambiguous | Exact-match in v1. Revisit if "Errors" vs "errors" causes confusion. |
| Clipboard API in insecure contexts | Wire `prompt()` fallback. Local `file://` tests will exercise this path. |
| Banner-while-banner-pasted (`hashchange` reentrancy) | Replace any current banner with new one. Simple precedence. |
| Merge dedupe semantics | Exact `keywords` array equality. Document; revisit if users want fuzzy. |

## 11. What changes in existing files

- **`index.html`** — add the preset sub-strip markup inside the Keyword Groups panel.
- **`src/main.js`** — new init order; subscribe persist; wire preset UI + share button; mode listener routes through `notify()`.
- **`styles/app.css`** — small `.presets` rule block. Banner styles (a simple `.share-banner` fixed at top).

No changes to: `state.js`, `groups.js`, `groupsView.js`, `payload.js`, `highlight.js`, `output.js`, `logcat.js`.

## 12. Out of scope (Phase 1)

Explicitly NOT in this design:
- Regex keywords
- Match counts per group
- Jump-to-next-match (n/N)
- Collapsible JSON/NSDict payloads
- Dark mode
- Export/import preset to JSON file
- Built-in shipped presets
- Cloud sync
- Diff view, timestamp alignment, virtualized rendering

Each of these is a candidate for a future phase, designed independently when the friction is real.
