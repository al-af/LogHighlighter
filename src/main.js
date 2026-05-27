import { state, subscribe, notify } from './state.js';
import { addGroup } from './groups.js';
import { renderGroups } from './groupsView.js';
import { renderOutput } from './output.js';
import { load, save } from './storage.js';
import { listPresets, savePreset, loadPreset, deletePreset, onChange as onPresetsChange } from './presets.js';
import { encodeGroups, consumeHash } from './share.js';
import { openGuide } from './guide.js';
import { openPresetEditor } from './presetEditor.js';

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
  syncPresetSelectionButtons();
}

function syncModeButtons() {
  document.querySelectorAll('#mode button').forEach(b => {
    b.classList.toggle('active', b.dataset.mode === state.mode);
  });
}

function syncShareButton() {
  document.getElementById('copyShareLink').disabled = state.groups.length === 0;
}

function syncPresetSelectionButtons() {
  const hasSelection = document.getElementById('presetSelect').value !== '';
  document.getElementById('presetDelete').disabled = !hasSelection;
}

function dedupeGroups(groups) {
  const seen = new Set();
  const out = [];
  for (const g of groups) {
    const key = g.keywords.slice().sort().join('').toLowerCase();
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

document.getElementById('presetSelect').addEventListener('change', () => {
  syncPresetSelectionButtons();
  const name = document.getElementById('presetSelect').value;
  if (!name) return;
  const groups = loadPreset(name);
  if (!groups) return;
  state.groups = groups;
  notify();
});

document.getElementById('presetCreate').addEventListener('click', async () => {
  const result = await openPresetEditor();
  if (!result) return;
  const { name, groups } = result;
  if (listPresets().includes(name) && !window.confirm(`Overwrite existing preset "${name}"?`)) return;
  const saved = savePreset(name, groups);
  if (!saved.ok) { window.alert(`Could not create preset: ${saved.reason}`); return; }
  document.getElementById('presetSelect').value = name;
  syncPresetSelectionButtons();
});

document.getElementById('presetDelete').addEventListener('click', () => {
  const name = document.getElementById('presetSelect').value;
  if (!name) return;
  if (!window.confirm(`Delete preset "${name}"?`)) return;
  deletePreset(name);
  document.getElementById('presetSelect').value = '';
  syncPresetSelectionButtons();
});

document.getElementById('copyShareLink').addEventListener('click', copyShareLink);

document.getElementById('openGuide').addEventListener('click', openGuide);

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
syncPresetSelectionButtons();
renderGroups();
renderOutput();
