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
