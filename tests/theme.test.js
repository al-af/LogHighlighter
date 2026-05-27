import { describe, it, expect, beforeEach } from 'vitest';
import { applyInitialTheme, getTheme, toggleTheme } from '../src/theme.js';

describe('theme', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute('data-theme');
  });

  it('applies light theme by default in jsdom (no system pref)', () => {
    expect(applyInitialTheme()).toBe('light');
    expect(getTheme()).toBe('light');
  });

  it('toggleTheme flips light -> dark and persists', () => {
    applyInitialTheme();
    expect(toggleTheme()).toBe('dark');
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
  });

  it('toggleTheme flips dark -> light', () => {
    applyInitialTheme();
    toggleTheme();
    expect(toggleTheme()).toBe('light');
  });

  it('persists choice across reload (simulated)', () => {
    applyInitialTheme();
    toggleTheme();
    document.documentElement.removeAttribute('data-theme');
    expect(applyInitialTheme()).toBe('dark');
  });

  it('respects prefers-color-scheme: dark when no stored choice', () => {
    const original = window.matchMedia;
    window.matchMedia = (q) => ({ matches: q.includes('dark'), media: q, addListener: () => {}, removeListener: () => {} });
    try {
      expect(applyInitialTheme()).toBe('dark');
    } finally {
      window.matchMedia = original;
    }
  });
});
