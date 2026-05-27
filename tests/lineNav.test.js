import { describe, it, expect, beforeEach } from 'vitest';
import { refreshAfterRender, attachKeyboard } from '../src/lineNav.js';

function setupDOM(html) {
  document.body.innerHTML = `
    <h2>Output<span id="matchCount" class="match-count" hidden></span></h2>
    <div id="output">${html}</div>
  `;
}

describe('lineNav', () => {
  beforeEach(() => { document.body.innerHTML = ''; });

  it('hides counter when no matches', () => {
    setupDOM('<div>plain</div>');
    refreshAfterRender();
    expect(document.getElementById('matchCount').hidden).toBe(true);
  });

  it('shows match count when matches exist', () => {
    setupDOM('<div><mark>a</mark></div><div><mark>b</mark></div>');
    refreshAfterRender();
    const el = document.getElementById('matchCount');
    expect(el.hidden).toBe(false);
    expect(el.textContent).toBe('— 2 matches');
  });

  it('advances current match with n key', () => {
    setupDOM('<div><mark>a</mark></div><div><mark>b</mark></div>');
    refreshAfterRender();
    attachKeyboard();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'n' }));
    expect(document.querySelectorAll('mark.mark-current').length).toBe(1);
    expect(document.getElementById('matchCount').textContent).toBe('— 1 of 2 matches');
  });

  it('wraps around at the end', () => {
    setupDOM('<div><mark>a</mark></div><div><mark>b</mark></div>');
    refreshAfterRender();
    attachKeyboard();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'n' }));
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'n' }));
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'n' }));
    expect(document.getElementById('matchCount').textContent).toBe('— 1 of 2 matches');
  });

  it('Shift+N steps backwards', () => {
    setupDOM('<div><mark>a</mark></div><div><mark>b</mark></div>');
    refreshAfterRender();
    attachKeyboard();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'N', shiftKey: true }));
    expect(document.getElementById('matchCount').textContent).toBe('— 2 of 2 matches');
  });

  it('ignores n when an input is focused', () => {
    setupDOM('<input id="x"><div><mark>a</mark></div>');
    refreshAfterRender();
    attachKeyboard();
    document.getElementById('x').focus();
    document.getElementById('x').dispatchEvent(new KeyboardEvent('keydown', { key: 'n', bubbles: true }));
    expect(document.querySelectorAll('mark.mark-current').length).toBe(0);
  });
});
