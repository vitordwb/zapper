#!/usr/bin/env node
import assert from 'node:assert/strict';
import { build } from 'esbuild';

// Exercise the production hook and resolver, not a reimplementation of either.
const { outputFiles } = await build({
  stdin: {
    contents: `export { useLauncherKeyboardControls } from './src/renderer/src/hooks/useLauncherKeyboardControls.ts';
export { resolveLauncherIntent } from './src/renderer/src/utils/launcher-intent.ts';`,
    resolveDir: process.cwd(), sourcefile: 'launcher-keyboard-test-entry.ts', loader: 'ts',
  },
  bundle: true, platform: 'node', format: 'cjs', external: ['react'], write: false,
});
const refs = [];
const fakeReact = {
  useCallback: (callback) => callback,
  useRef: (initial) => refs[refs.index++] ?? (refs[refs.index - 1] = { current: initial }),
};
function renderHook(options) {
  refs.index = 0;
  return useLauncherKeyboardControls(options);
}
const module = { exports: {} };
new Function('require', 'module', 'exports', outputFiles[0].text)(
  (name) => name === 'react' ? fakeReact : (() => { throw new Error(`Unexpected dependency ${name}`); })(),
  module, module.exports,
);
const { useLauncherKeyboardControls, resolveLauncherIntent } = module.exports;

const actions = [];
const input = { value: '', focus() {}, setSelectionRange() {}, closest: () => null };
globalThis.localStorage = { getItem: () => null };
globalThis.requestAnimationFrame = (callback) => { callback(); return 1; };
Object.defineProperty(globalThis, 'navigator', { configurable: true, value: {
  clipboard: { writeText: (value) => actions.push(['copy', value]) },
} });
globalThis.window = { electron: { hideWindow: () => actions.push(['hide']) } };

const first = { id: 'app:first', title: 'First', rootSearchStableKey: 'app:first' };
const second = { id: 'app:second', title: 'Second', rootSearchStableKey: 'app:second' };
const state = {
  query: 'explain this', commands: [first, second], selectedIndex: -1,
  intent: { kind: 'ai', query: 'explain this' }, aiAvailable: true,
  calcOffset: 0, calcResult: null, completion: null, collapsed: false,
};
function options() {
  input.value = state.query;
  return {
    inputRef: { current: input }, isLauncherModeActiveRef: { current: true },
    inlineArgumentInputRefs: { current: [] }, inlineQuickLinkInputRefs: { current: [] },
    displayCommands: state.commands, selectedCommand: null, selectedIndex: state.selectedIndex,
    selectedFileResultPath: null, calcOffset: state.calcOffset, calcResult: state.calcResult,
    searchQuery: state.query, launcherIntent: state.intent,
    onSelectResult: (index) => actions.push(['select', index]),
    onReturnToAiDefault: () => actions.push(['ai-default']),
    canReturnToAiDefault: true, onQueryEdited: () => actions.push(['query-edited']),
    browserSearchAutoComplete: state.completion, launcherInputValue: state.query,
    aiAvailable: state.aiAvailable, shouldHideAskAi: false,
    isShowingInlineArgumentInputs: false,
    selectedInlineExtensionArgumentDefinitions: [], selectedInlineQuickLinkDynamicFields: [],
    selectedQuickLinkId: null, showActions: false, contextMenu: null,
    quickLinkDynamicPrompt: null, bookmarkNicknamePrompt: null, showAppUninstall: null,
    isCompactCollapsed: state.collapsed,
    setSearchQuery: (value) => actions.push(['query', value]),
    setSelectedIndex: (value) => actions.push(['legacy-index', value]),
    setIsCompactCollapsed: (value) => actions.push(['collapsed', value]), setShowActions: () => {},
    setContextMenu: () => {}, setActionsCommand: () => {}, setSelectedActionIndex: () => {},
    startAiChat: (query) => actions.push(['ai', query]), restoreLauncherFocus: () => {},
    handleCommandExecute: (command) => actions.push(['command', command.id]),
    submitBrowserSearch: (query) => actions.push(['browser', query]),
    pinToggleForCommand: () => {}, disableCommand: () => {},
    uninstallExtensionCommand: () => {}, movePinnedCommand: () => {},
    showFileResultDetailsByPath: () => {}, revealFileResultByPath: () => {},
    copyFileResultPath: () => {}, pinToggleForFile: () => {},
    copyCommandDeeplink: () => {}, openAppUninstall: () => {},
    updateInlineExtensionArgumentValue: () => {}, updateInlineQuickLinkDynamicValue: () => {},
  };
}
function key(keyName, overrides = {}) {
  let prevented = false;
  const event = {
    key: keyName, target: input, metaKey: false, altKey: false, ctrlKey: false,
    shiftKey: false, repeat: false, nativeEvent: { isComposing: false, keyCode: 0 },
    preventDefault: () => { prevented = true; }, ...overrides,
  };
  renderHook(options()).handleKeyDown(event);
  return prevented;
}
function expectActions(expected) {
  assert.deepEqual(actions.splice(0), expected);
}
function resolve(overrides = {}) {
  return resolveLauncherIntent({ rawQuery: state.query, modelQuery: state.query,
    displayCommands: state.commands, rootRankedCandidates: [], calculatorAvailable: false,
    explicitSelection: null, selectionRemoved: false,
    fileStatus: { query: state.query, status: 'ready' }, aiAvailable: true,
    bangActive: false, inlineArgumentsActive: false, ...overrides });
}

state.intent = resolve();
assert.equal(state.intent.kind, 'ai');
key('Enter'); expectActions([['ai', state.query]]);
key('Enter', { repeat: true }); expectActions([]);
key('Enter', { nativeEvent: { isComposing: true, keyCode: 229 } }); expectActions([]);
key('Enter', { nativeEvent: { isComposing: false, keyCode: 229 } }); expectActions([]);
key('ArrowDown'); expectActions([['select', 0]]);
state.selectedIndex = 0;
state.intent = resolve({ explicitSelection: { query: state.query, stableKey: first.rootSearchStableKey } });
key('ArrowUp'); expectActions([['ai-default']]);
key('Enter'); expectActions([['command', first.id]]);
state.commands = [second, first];
key('Enter'); expectActions([['command', first.id]]); // insertion before stable selection
state.commands = [second];
key('Enter'); expectActions([]); // stale target cannot fall through to AI or another row
state.commands = [{ ...first, id: 'different-id' }, second];
key('Enter'); expectActions([]); // identity must match ID as well as stable key
state.commands = [second];
state.intent = resolve({ explicitSelection: { query: state.query, stableKey: first.rootSearchStableKey } });
assert.equal(state.intent.kind, 'pending');
key('Enter'); expectActions([]);
key('Tab'); expectActions([]);
state.commands = [first, second];
state.intent = resolve({ modelQuery: 'older query' });
key('Enter'); expectActions([]);
state.intent = resolve();
key('Tab', { shiftKey: true }); expectActions([]);
state.completion = { completion: 'completed query' };
key('Tab'); expectActions([['query-edited'], ['query', 'completed query']]);
state.completion = null;
key('Tab'); expectActions([['ai', state.query]]);
state.query = ' '; state.intent = resolve();
key('Tab'); expectActions([]);
state.query = 'explain this'; state.intent = resolve();
key('1', { metaKey: true }); expectActions([['command', first.id]]);
state.commands = [second, first];
key('2', { metaKey: true }); expectActions([['command', first.id]]);
state.calcOffset = 1; state.calcResult = { result: '4' };
key('1', { metaKey: true }); expectActions([['copy', '4'], ['hide']]);
key('2', { metaKey: true }); expectActions([['command', second.id]]);
state.query = 'new query'; // prior render's committed intent may not execute a new raw query
key('Enter'); expectActions([]);
state.query = ''; state.collapsed = true; state.intent = resolve();
key('ArrowDown'); expectActions([['collapsed', false]]);
renderHook(options()).handleLauncherInputChange('sample');
expectActions([['query-edited'], ['query', 'sample'], ['collapsed', false]]);
state.collapsed = false;
renderHook(options()).handleLauncherInputChange('');
expectActions([['query-edited'], ['query', ''], ['collapsed', true]]);
console.log('launcher keyboard intent dispatch passed');
