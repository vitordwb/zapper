#!/usr/bin/env node
import assert from 'node:assert/strict';
import { build } from 'esbuild';

// Bundle the production resolver and ranking implementation in memory; no copied policy.
const { outputFiles } = await build({
  stdin: {
    contents: `export { resolveLauncherIntent, LAUNCHER_CALCULATOR_STABLE_KEY } from './src/renderer/src/utils/launcher-intent.ts';
export { scoreRootSearchCandidate, scoreRootSearchFields } from './src/renderer/src/utils/root-search-ranking.ts';`,
    resolveDir: process.cwd(),
    sourcefile: 'launcher-intent-test-entry.ts',
    loader: 'ts',
  },
  bundle: true,
  platform: 'node',
  format: 'esm',
  write: false,
});
const { resolveLauncherIntent, LAUNCHER_CALCULATOR_STABLE_KEY, scoreRootSearchCandidate, scoreRootSearchFields } =
  await import(`data:text/javascript;base64,${Buffer.from(outputFiles[0].text).toString('base64')}`);

function candidate(query, title, subtype = 'app', options = {}) {
  const id = options.id || `test:${title}`;
  const source = options.source || (subtype === 'file' ? 'file' : 'command');
  const stableKey = `${source}:${id}`;
  const fields = options.fields || [{ value: title, kind: 'label' }];
  const scored = scoreRootSearchFields(query, fields);
  assert.equal(scored.matched, true, `${title} should match ${query}`);
  const command = { id, title, category: subtype === 'app' ? 'app' : 'system', rootSearchStableKey: stableKey };
  return scoreRootSearchCandidate({
    command, source, subtype, stableKey, label: title, pathOrUrl: options.pathOrUrl,
    matchKind: scored.matchKind, matchScore: scored.matchScore,
    sourceQualityBoost: 0, freshnessBoost: 0, pathLocationBoost: 0,
    noisePenalty: options.noisePenalty || 0, depthPenalty: options.depthPenalty || 0,
  }, query);
}

function resolve(query, overrides = {}) {
  return resolveLauncherIntent({
    rawQuery: query, modelQuery: query, displayCommands: [], rootRankedCandidates: [],
    calculatorAvailable: false, explicitSelection: null, selectionRemoved: false,
    fileStatus: { query, status: 'ready' }, aiAvailable: true,
    bangActive: false, inlineArgumentsActive: false, ...overrides,
  });
}
function withCandidate(query, result, overrides = {}) {
  return resolve(query, {
    displayCommands: [result.command], rootRankedCandidates: [result], ...overrides,
  });
}
function commandIntent(result, query) {
  return { kind: 'command', query, commandId: result.command.id, stableKey: result.stableKey };
}

const app = candidate('Safari', 'Safari');
assert.deepEqual(withCandidate('Safari', app), commandIntent(app, 'Safari'));
const alias = candidate('editor', 'Visual Studio Code', 'app', { fields: [{ value: 'editor', kind: 'alias' }] });
assert.deepEqual(withCandidate('editor', alias), commandIntent(alias, 'editor'));
const file = candidate('quarterly report', 'quarterly report.pdf', 'file');
assert.deepEqual(withCandidate('quarterly report', file), commandIntent(file, 'quarterly report'));
const questionFile = candidate('what?', 'what?.txt', 'file');
assert.deepEqual(withCandidate('what?', questionFile), commandIntent(questionFile, 'what?'));
assert.equal(resolve('explain these results').kind, 'ai');
assert.equal(resolve('unmatched').kind, 'ai');
assert.equal(resolve('   ').kind, 'none');

const web = { id: 'web-search-direct', title: 'Search the web', rootSearchStableKey: 'direct-search:google' };
assert.equal(resolve('explain these results', { displayCommands: [web] }).kind, 'ai');
assert.deepEqual(resolve('!g explain', { bangActive: true, displayCommands: [web] }),
  { kind: 'command', query: '!g explain', commandId: web.id, stableKey: web.rootSearchStableKey });
const url = { id: 'browser-open-url', title: 'Open URL', rootSearchStableKey: 'open-url:example.com' };
assert.equal(resolve('example.com', { displayCommands: [url] }).kind, 'command');
assert.equal(resolve('~/Documents/report.txt', { displayCommands: [file.command] }).kind, 'command');
assert.equal(resolve('2 + 2', { calculatorAvailable: true }).kind, 'calculator');
assert.equal(resolve('2 + 2', {
  calculatorAvailable: true, explicitSelection: { query: '2 + 2', stableKey: LAUNCHER_CALCULATOR_STABLE_KEY },
}).kind, 'calculator');
const script = candidate('publish', 'Publish', 'script-command');
assert.deepEqual(withCandidate('publish', script, { inlineArgumentsActive: true }), commandIntent(script, 'publish'));
assert.deepEqual(withCandidate('publish', script, { calculatorAvailable: true,
  explicitSelection: { query: 'publish', stableKey: script.stableKey },
}), commandIntent(script, 'publish'));
assert.deepEqual(withCandidate('publish', script, { aiAvailable: false }), commandIntent(script, 'publish'));
assert.equal(resolve('unknown', { displayCommands: [web], aiAvailable: false }).kind, 'command');
assert.equal(resolve('unknown', { aiAvailable: false }).kind, 'none');

// An explicit choice follows its stable identity when a new row is inserted ahead of it.
assert.deepEqual(resolve('test', { displayCommands: [web, app.command],
  explicitSelection: { query: 'test', stableKey: app.stableKey },
}), commandIntent(app, 'test'));
assert.equal(resolve('test', { displayCommands: [web],
  explicitSelection: { query: 'test', stableKey: app.stableKey },
}).reason, 'selection-removed');
assert.equal(resolve('test', { displayCommands: [web], selectionRemoved: true }).reason, 'selection-removed');
assert.equal(resolve('new', { modelQuery: 'old', displayCommands: [file.command],
  rootRankedCandidates: [file] }).reason, 'model');
assert.equal(resolve('new', { fileStatus: { query: 'old', status: 'ready' },
  displayCommands: [web] }).kind, 'ai');
assert.equal(resolve('new', { fileStatus: { query: 'new', status: 'pending' } }).reason, 'files');
assert.deepEqual(withCandidate('publish', script, {
  fileStatus: { query: 'publish', status: 'pending' },
}), commandIntent(script, 'publish'));
assert.equal(resolve('new', { fileStatus: { query: 'new', status: 'error' } }).kind, 'ai');
assert.equal(resolve('new', { fileStatus: { query: 'new', status: 'pending' },
  aiAvailable: false, displayCommands: [web] }).kind, 'command');

// Weak local hits and synthetic web rows are visible without stealing implicit AI.
const weak = candidate('explain the architecture', 'Architecture Guide', 'file', {
  fields: [{ value: 'please explain the architecture', kind: 'description' }], depthPenalty: 180,
});
assert.equal(withCandidate('explain the architecture', weak).kind, 'ai');
assert.equal(resolve('search term', { displayCommands: [web, app.command],
  rootRankedCandidates: [app] }).kind, 'command');
console.log('launcher intent behavior passed');
