#!/usr/bin/env node
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import vm from 'node:vm';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const ts = require('typescript');
let activeHost;
const react = {
  useState: (...args) => activeHost.useState(...args),
  useRef: (...args) => activeHost.useRef(...args),
  useCallback: (...args) => activeHost.useCallback(...args),
  useEffect: (...args) => activeHost.useEffect(...args),
};

class HookHost {
  constructor(hook) {
    this.hook = hook;
    this.slots = [];
    this.output = null;
    this.pending = false;
    this.unmounted = false;
    this.render();
  }
  render() {
    if (this.unmounted) return;
    this.index = 0;
    const effects = [];
    this.effects = effects;
    activeHost = this;
    this.output = this.hook();
    activeHost = undefined;
    for (const [index, effect] of effects) {
      this.slots[index].cleanup?.();
      this.slots[index].cleanup = effect() || undefined;
    }
  }
  schedule() {
    if (this.pending || this.unmounted) return;
    this.pending = true;
    queueMicrotask(() => { this.pending = false; this.render(); });
  }
  useState(initial) {
    const index = this.index++;
    this.slots[index] ??= { value: initial };
    return [this.slots[index].value, (next) => {
      const old = this.slots[index].value;
      this.slots[index].value = typeof next === 'function' ? next(old) : next;
      if (!Object.is(old, this.slots[index].value)) this.schedule();
    }];
  }
  useRef(initial) {
    const index = this.index++;
    this.slots[index] ??= { current: initial };
    return this.slots[index];
  }
  useCallback(value, deps) {
    const index = this.index++;
    const previous = this.slots[index];
    if (previous && deps.every((dep, i) => Object.is(dep, previous.deps[i]))) return previous.value;
    this.slots[index] = { value, deps };
    return value;
  }
  useEffect(effect, deps) {
    const index = this.index++;
    const previous = this.slots[index];
    if (!previous || !deps.every((dep, i) => Object.is(dep, previous.deps[i]))) {
      this.slots[index] = { deps, cleanup: previous?.cleanup };
      this.effects.push([index, effect]);
    }
  }
  unmount() {
    this.unmounted = true;
    for (const slot of this.slots) slot.cleanup?.();
  }
}

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((res, rej) => { resolve = res; reject = rej; });
  return { promise, resolve, reject };
}

async function settle() {
  for (let i = 0; i < 12; i++) await Promise.resolve();
}

function createFixture(options = {}) {
  const listeners = new Map();
  const calls = [];
  const cancelled = [];
  const saved = [];
  const pending = new Map();
  let snapshot = options.snapshot ?? { version: 1, conversations: [] };
  const snapshots = [];
  const electron = {
    aiIsAvailable: () => options.availability ?? Promise.resolve(true),
    getAiChatSnapshot: () => snapshots.shift()?.promise ?? Promise.resolve(snapshot),
    onAiChatsUpdated: (cb) => subscribe('updated', cb),
    onAIStreamChunk: (cb) => subscribe('chunk', cb),
    onAIStreamDone: (cb) => subscribe('done', cb),
    onAIStreamError: (cb) => subscribe('error', cb),
    aiChat: (id, messages) => {
      calls.push({ id, messages });
      const operation = deferred();
      pending.set(id, operation);
      return operation.promise;
    },
    aiCancel: (id) => { cancelled.push(id); return Promise.resolve(); },
    upsertAiChatConversation: (conversation) => {
      saved.push(structuredClone(conversation));
      snapshot = { version: 1, conversations: [structuredClone(conversation)] };
      return Promise.resolve(conversation);
    },
    deleteAiChatConversation: () => Promise.resolve(true),
  };
  function subscribe(kind, cb) {
    const entries = listeners.get(kind) ?? new Set();
    entries.add(cb);
    listeners.set(kind, entries);
    return () => entries.delete(cb);
  }
  const emit = (kind, value) => {
    for (const cb of listeners.get(kind) ?? []) cb(value);
  };
  const source = fs.readFileSync('src/renderer/src/hooks/useAiChat.ts', 'utf8');
  const js = ts.transpileModule(source, {
    fileName: 'useAiChat.ts',
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const module = { exports: {} };
  const sandbox = {
    module, exports: module.exports, require: (name) => name === 'react' ? react : require(name),
    window: { electron, setTimeout }, requestAnimationFrame: () => 1,
    cancelAnimationFrame: () => {}, setTimeout, clearTimeout, Date, Math, Promise, Error,
  };
  vm.runInNewContext(js, sandbox, { filename: 'useAiChat.ts' });
  const modes = [];
  let exits = 0;
  const host = new HookHost(() => module.exports.useAiChat({
    setAiMode: (mode) => modes.push(mode), onExitAiMode: () => { exits++; },
  }));
  return { host, calls, cancelled, saved, pending, snapshots, emit, listeners, modes, get exits() { return exits; } };
}

test('first inline turn subscribes before dispatch; cancellation flushes partial and rejects late A events', async () => {
  const f = createFixture();
  await settle();
  f.host.output.startAiChat('  What is this?  ');
  await settle();
  assert.equal(f.host.output.aiPresentation, 'inline');
  assert.deepEqual(Array.from(f.listeners.keys()).sort(), ['chunk', 'done', 'error', 'updated']);
  assert.equal(f.calls.length, 1);
  const a = f.calls[0].id;
  assert.equal(f.calls[0].messages[0].content, 'What is this?');
  f.emit('chunk', { requestId: a, chunk: 'partial' });
  f.host.output.stopStreaming();
  await settle();
  assert.equal(f.saved.at(-1).messages.at(-1).content, 'partial');
  assert.equal(f.saved.at(-1).messages.at(-1).cancelled, true);
  f.host.output.startAiChat('Second');
  await settle();
  const b = f.calls[1].id;
  f.emit('chunk', { requestId: a, chunk: ' stale' });
  f.emit('done', { requestId: a });
  f.emit('error', { requestId: a, error: 'old error' });
  f.emit('chunk', { requestId: b, chunk: 'answer B' });
  f.emit('done', { requestId: b });
  await settle();
  assert.equal(f.host.output.messages.at(-1).content, 'answer B');
  assert.equal(f.host.output.messages.at(-1).error, undefined);
  assert.equal(f.saved.at(-1).messages.at(-1).content, 'answer B');
  assert.deepEqual(f.cancelled, [a]);
  f.host.unmount();
  assert.equal(f.listeners.get('chunk').size, 0);
});

test('exit before pending dispatch sends nothing and does not restore hidden focus', async () => {
  const f = createFixture();
  await settle();
  f.host.output.startAiChat('do not send');
  f.host.output.exitAiMode({ restoreFocus: false });
  await settle();
  assert.equal(f.calls.length, 0);
  assert.equal(f.exits, 0);
  f.host.unmount();
});

test('invoke rejection and double terminal events finalize once; retry replaces failed assistant', async () => {
  const f = createFixture();
  await settle();
  f.host.output.startAiChat('Original');
  await settle();
  const first = f.calls[0].id;
  f.pending.get(first).reject(new Error('provider unavailable'));
  await settle();
  f.emit('done', { requestId: first });
  f.emit('error', { requestId: first, error: 'late' });
  assert.equal(f.saved.length, 1);
  assert.equal(f.host.output.messages.at(-1).error, 'provider unavailable');
  f.host.output.retryLastMessage();
  await settle();
  assert.equal(f.host.output.messages.length, 2);
  assert.equal(f.calls[1].messages.length, 1);
  assert.equal(f.calls[1].messages[0].content, 'Original');
  f.emit('done', { requestId: f.calls[1].id });
  f.host.unmount();
});

test('old snapshot cannot erase local completion; expansion preserves request and availability rejection is handled', async () => {
  const read = deferred();
  const f = createFixture({ availability: Promise.reject(new Error('offline')) });
  f.snapshots.push(read);
  await settle();
  assert.equal(f.host.output.aiAvailable, false);
  f.host.output.setAiAvailable(true);
  await settle();
  f.host.output.startAiChat('Question');
  await settle();
  f.host.output.expandAiChat();
  await settle();
  assert.equal(f.host.output.aiPresentation, 'history');
  assert.equal(f.calls.length, 1);
  f.emit('chunk', { requestId: f.calls[0].id, chunk: 'reply' });
  f.emit('done', { requestId: f.calls[0].id });
  read.resolve({ version: 1, conversations: [] });
  await settle();
  assert.equal(f.host.output.messages.at(-1).content, 'reply');
  assert.equal(f.host.output.conversations[0].messages.at(-1).content, 'reply');
  f.host.unmount();
});

test('unmount cancels and persists a partial answer; subscriptions are removed', async () => {
  const f = createFixture();
  await settle();
  f.host.output.startAiChat('Unmount');
  await settle();
  const id = f.calls[0].id;
  f.emit('chunk', { requestId: id, chunk: 'started' });
  f.host.unmount();
  assert.equal(f.saved.at(-1).messages.at(-1).content, 'started');
  assert.equal(f.saved.at(-1).messages.at(-1).cancelled, true);
  assert.deepEqual(f.cancelled, [id]);
  assert.equal(f.listeners.get('done').size, 0);
});

test('version-1 imports survive and terminal status records round-trip without assistant prose pollution', () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'zapper-ai-store-'));
  try {
    const original = {
      version: 1,
      conversations: [{ id: 'import-1', title: 'Imported', createdAt: Date.now(), updatedAt: Date.now(),
        source: 'raycast', messages: [{ id: 'u1', role: 'user', content: 'Original', createdAt: Date.now() },
          { id: 'a1', role: 'assistant', content: 'Existing response', createdAt: Date.now() }] }],
    };
    fs.writeFileSync(path.join(directory, 'ai-chat-conversations.json'), JSON.stringify(original));
    const source = fs.readFileSync('src/main/ai-chat-store.ts', 'utf8');
    const js = ts.transpileModule(source, {
      fileName: 'ai-chat-store.ts',
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
    }).outputText;
    const module = { exports: {} };
    vm.runInNewContext(js, { module, exports: module.exports, Date, Map, JSON, String,
      require: (name) => name === 'electron' ? { app: { getPath: () => directory } } : require(name),
    }, { filename: 'ai-chat-store.ts' });
    const store = module.exports;
    const before = store.getAiChatSnapshot();
    assert.equal(before.version, 1);
    assert.equal(before.conversations[0].messages[1].content, 'Existing response');
    store.upsertAiChatConversation({ ...before.conversations[0], messages: [
      ...before.conversations[0].messages,
      { id: 'u2', role: 'user', content: 'Follow-up', createdAt: Date.now() },
      { id: 'a2', role: 'assistant', content: '', error: 'Provider failed', createdAt: Date.now() },
      { id: 'a3', role: 'assistant', content: '', cancelled: true, createdAt: Date.now() },
      { id: 'a4', role: 'assistant', content: '', createdAt: Date.now() },
    ] });
    const saved = store.getAiChatSnapshot().conversations[0].messages;
    assert.deepEqual(Array.from(saved, (message) => message.id), ['u1', 'a1', 'u2', 'a2', 'a3']);
    assert.equal(saved[3].error, 'Provider failed');
    assert.equal(saved[4].cancelled, true);
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});
