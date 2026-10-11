#!/usr/bin/env node
import test from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';

// Exercise the production hook across an actual mount/unmount sequence of its refs.
const { outputFiles } = await build({
  entryPoints: ['src/renderer/src/hooks/useLauncherSurface.ts'],
  bundle: true, platform: 'node', format: 'cjs', external: ['react'], write: false,
});
const slots = [];
let cursor = 0;
const pendingEffects = [];
const same = (a, b) => a && b && a.length === b.length && a.every((value, index) => Object.is(value, b[index]));
const react = {
  useRef(initial) {
    const index = cursor++;
    return slots[index] ??= { current: initial };
  },
  useState(initial) {
    const index = cursor++;
    slots[index] ??= { value: initial };
    return [slots[index].value, (next) => {
      slots[index].value = typeof next === 'function' ? next(slots[index].value) : next;
    }];
  },
  useEffect: effect,
  useLayoutEffect: effect,
};
function effect(callback, deps) {
  const index = cursor++;
  if (same(slots[index]?.deps, deps)) return;
  pendingEffects.push(() => {
    slots[index]?.cleanup?.();
    slots[index] = { deps, cleanup: callback() };
  });
}
const module = { exports: {} };
new Function('require', 'module', 'exports', outputFiles[0].text)(
  (name) => name === 'react' ? react : (() => { throw new Error(`Unexpected dependency ${name}`); })(),
  module, module.exports,
);
const { useLauncherSurface } = module.exports;
const callbacks = new Map();
let frameId = 0;
globalThis.requestAnimationFrame = (callback) => { callbacks.set(++frameId, callback); return frameId; };
globalThis.cancelAnimationFrame = (id) => callbacks.delete(id);
const observed = [];
globalThis.ResizeObserver = class {
  constructor(callback) { this.callback = callback; }
  observe(element) { observed.push(element); }
  disconnect() {}
};
globalThis.MutationObserver = class {
  observe() {}
  disconnect() {}
};
globalThis.document = { documentElement: { classList: { contains: () => true } } };
const snapshot = { rendererGeneration: 1, requestId: 0, revision: 1, kind: 'search',
  host: { width: 568, height: 136 }, regions: [], material: 'visual-effect',
  shadowInset: 24, preferences: { reduceMotion: false, reduceTransparency: false,
    increaseContrast: false, differentiateWithoutColor: false, invertColors: false } };
const presentations = [];
globalThis.window = { electron: {
  onLauncherSurfaceChanged: () => () => {},
  getLauncherSurface: async () => snapshot,
  setLauncherSurface: async (request) => {
    presentations.push(request.presentation);
    return { ...snapshot, requestId: request.requestId, revision: snapshot.revision + presentations.length };
  },
} };
const search = { scrollHeight: 88, getBoundingClientRect: () => ({ height: 88 }) };
const results = { scrollHeight: 320, getBoundingClientRect: () => ({ height: 320 }) };
const searchRef = { current: search };
const resultsRef = { current: null };
const refs = { search: searchRef, results: resultsRef };
function render(visible) {
  cursor = 0;
  useLauncherSurface('search', refs, visible);
  pendingEffects.splice(0).forEach((run) => run());
}
function paint() {
  const work = [...callbacks.values()];
  callbacks.clear();
  work.forEach((callback) => callback());
}

test('results mounted after the idle capsule receive a fresh measured host request', async () => {
  render(false);
  await Promise.resolve();
  render(false); // the initial main-process snapshot provides the renderer generation
  paint();
  assert.equal(presentations.at(-1)?.resultsHeight, 0);
  assert.equal(observed.includes(results), false);

  resultsRef.current = results;
  render(true);
  paint();
  assert.equal(observed.includes(results), true);
  assert.equal(presentations.at(-1)?.resultsHeight, 320);

  resultsRef.current = null;
  render(false);
  paint();
  assert.equal(presentations.at(-1)?.resultsHeight, 0);
});
