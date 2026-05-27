// data-theme on <html>; persists to localStorage, falls back to prefers-color-scheme.

import { load, save } from './storage.js';

const KEY = 'loghl:theme';

function systemPrefersDark() {
  return typeof window !== 'undefined'
    && typeof window.matchMedia === 'function'
    && window.matchMedia('(prefers-color-scheme: dark)').matches;
}

export function applyInitialTheme() {
  const stored = load(KEY);
  const theme = (stored === 'light' || stored === 'dark')
    ? stored
    : (systemPrefersDark() ? 'dark' : 'light');
  document.documentElement.setAttribute('data-theme', theme);
  return theme;
}

export function getTheme() {
  return document.documentElement.getAttribute('data-theme') || 'light';
}

export function toggleTheme() {
  const next = getTheme() === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  save(KEY, next);
  return next;
}

export function syncToggleButton(btn, theme) {
  btn.textContent = theme === 'dark' ? '☀' : '☾';
  btn.title = theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode';
}
