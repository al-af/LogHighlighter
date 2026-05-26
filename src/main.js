import { state, subscribe } from './state.js';
import { addGroup } from './groups.js';
import { renderGroups } from './groupsView.js';
import { renderOutput } from './output.js';

subscribe(renderGroups);
subscribe(renderOutput);

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
  document.querySelectorAll('#mode button').forEach(b => {
    b.classList.toggle('active', b === btn);
  });
  renderOutput();
});

renderGroups();
renderOutput();
