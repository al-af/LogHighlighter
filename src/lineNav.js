// Tracks the set of <mark> elements inside #output and exposes
// next/prev navigation plus a count to render in the header slot.

let currentIdx = -1;

function getMarks() {
  return Array.from(document.querySelectorAll('#output mark'));
}

function clearCurrent(marks) {
  for (const m of marks) m.classList.remove('mark-current');
}

function applyCurrent(marks) {
  if (currentIdx < 0 || currentIdx >= marks.length) return;
  const el = marks[currentIdx];
  el.classList.add('mark-current');
  if (typeof el.scrollIntoView === 'function') {
    el.scrollIntoView({ block: 'center', behavior: 'smooth' });
  }
}

function renderCounter(total) {
  const el = document.getElementById('matchCount');
  if (!el) return;
  if (total === 0) { el.hidden = true; el.textContent = ''; return; }
  el.hidden = false;
  el.textContent = currentIdx >= 0
    ? `— ${currentIdx + 1} of ${total} matches`
    : `— ${total} matches`;
}

export function refreshAfterRender() {
  currentIdx = -1;
  const marks = getMarks();
  clearCurrent(marks);
  renderCounter(marks.length);
}

function step(delta) {
  const marks = getMarks();
  if (marks.length === 0) return;
  clearCurrent(marks);
  currentIdx = currentIdx === -1
    ? (delta > 0 ? 0 : marks.length - 1)
    : (currentIdx + delta + marks.length) % marks.length;
  applyCurrent(marks);
  renderCounter(marks.length);
}

function isTypingTarget(el) {
  if (!el) return false;
  const tag = el.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || el.isContentEditable;
}

let keyboardAttached = false;

function onKeydown(e) {
  if (isTypingTarget(e.target)) return;
  if (e.metaKey || e.ctrlKey || e.altKey) return;
  if (e.key === 'n' && !e.shiftKey) { e.preventDefault(); step(1); }
  else if (e.key === 'N' || (e.key === 'n' && e.shiftKey)) { e.preventDefault(); step(-1); }
}

export function attachKeyboard() {
  if (keyboardAttached) return;
  keyboardAttached = true;
  document.addEventListener('keydown', onKeydown);
}
