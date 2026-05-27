// Modal for creating (or editing) a preset. Pre-fills the keywords textarea
// from `initialGroups` so "save my current setup" still works in one click.
//
// Returns a promise that resolves to { name, groups } on Create, or null on
// Cancel / Esc / backdrop click.

function parseKeywordLines(text) {
  const groups = [];
  for (const line of text.split('\n')) {
    const raw = line.split(',').map(s => s.trim()).filter(Boolean);
    const unique = [];
    for (const k of raw) {
      if (!unique.some(x => x.toLowerCase() === k.toLowerCase())) unique.push(k);
    }
    if (unique.length) groups.push({ keywords: unique, colorIndex: groups.length % 10 });
  }
  return groups;
}

function serializeGroups(groups) {
  return groups.map(g => g.keywords.join(', ')).join('\n');
}

const HTML = `
<div class="editor-backdrop" data-editor-close></div>
<div class="editor-dialog" role="dialog" aria-modal="true" aria-labelledby="editorTitle">
  <header class="editor-header">
    <h2 id="editorTitle">New preset</h2>
    <button class="editor-close" type="button" data-editor-close aria-label="Close">×</button>
  </header>
  <div class="editor-body">
    <label class="editor-field">
      <span class="editor-label">Name</span>
      <input id="editorName" type="text" maxlength="40" autocomplete="off" placeholder="e.g. Network errors">
    </label>
    <label class="editor-field">
      <span class="editor-label">Keyword groups</span>
      <textarea id="editorKeywords" rows="6" spellcheck="false" placeholder="One group per line. Within a line, separate keywords with commas.

error, fatal, crash
network, timeout, 5xx"></textarea>
      <span class="editor-hint">Each line becomes one group with its own highlight color.</span>
    </label>
  </div>
  <footer class="editor-footer">
    <button id="editorCancel" type="button" data-editor-close>Cancel</button>
    <button id="editorSubmit" type="button" class="primary" disabled>Create</button>
  </footer>
</div>
`;

export function openPresetEditor({ initialName = '', initialGroups = [] } = {}) {
  return new Promise(resolve => {
    const root = document.createElement('div');
    root.className = 'editor-root';
    root.innerHTML = HTML;
    document.body.appendChild(root);

    const nameInput = root.querySelector('#editorName');
    const kwInput = root.querySelector('#editorKeywords');
    const submit = root.querySelector('#editorSubmit');

    nameInput.value = initialName;
    kwInput.value = serializeGroups(initialGroups);

    function syncSubmit() {
      const hasName = nameInput.value.trim().length > 0;
      const hasGroups = parseKeywordLines(kwInput.value).length > 0;
      submit.disabled = !(hasName && hasGroups);
    }
    syncSubmit();

    function done(result) {
      root.remove();
      document.removeEventListener('keydown', onKey);
      resolve(result);
    }

    function onKey(e) {
      if (e.key === 'Escape') done(null);
      else if (e.key === 'Enter' && (e.metaKey || e.ctrlKey) && !submit.disabled) {
        done({ name: nameInput.value.trim(), groups: parseKeywordLines(kwInput.value) });
      }
    }

    nameInput.addEventListener('input', syncSubmit);
    kwInput.addEventListener('input', syncSubmit);
    root.addEventListener('click', e => {
      if (e.target.hasAttribute('data-editor-close')) done(null);
    });
    submit.addEventListener('click', () => {
      done({ name: nameInput.value.trim(), groups: parseKeywordLines(kwInput.value) });
    });

    document.addEventListener('keydown', onKey);
    (initialName ? kwInput : nameInput).focus();
  });
}
