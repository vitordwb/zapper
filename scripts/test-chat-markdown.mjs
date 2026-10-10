import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createRequire } from 'node:module';
import { buildSync } from 'esbuild';

const require = createRequire(import.meta.url);
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
const bundle = buildSync({
  entryPoints: ['src/renderer/src/views/ChatMarkdown.tsx'],
  bundle: true,
  platform: 'node',
  format: 'cjs',
  packages: 'external',
  write: false,
});
const module = { exports: {} };
new Function('module', 'exports', 'require', bundle.outputFiles[0].text)(module, module.exports, require);
const ChatMarkdown = module.exports.default;
const render = (content, streaming = false) => renderToStaticMarkup(
  React.createElement(ChatMarkdown, { content, streaming })
);

test('chat renders structured Markdown and escaped model HTML', () => {
  const html = render('# Heading\n\n- **one**\n- two\n\n| A | B |\n|---|---|\n| x | y |\n\n<script>alert(1)</script>');
  assert.match(html, /<h1>Heading<\/h1>/);
  assert.match(html, /<strong>one<\/strong>/);
  assert.match(html, /<table>/);
  assert.match(html, /&lt;script&gt;alert\(1\)&lt;\/script&gt;/);
  assert.doesNotMatch(html, /<script>/);
});

test('chat does not expose unsafe links or images', () => {
  const html = render('[bad](javascript:alert(1)) [good](https://example.com) ![secret](file:///tmp/secret)');
  assert.doesNotMatch(html, /javascript:|file:\/\/\//);
  assert.match(html, /href="https:\/\/example.com"/);
  assert.match(html, /secret/);
});

test('incomplete code fence remains visible while streaming', () => {
  const html = render('```js\nconst x = 1;', true);
  assert.match(html, /<pre><code>const x = 1;<\/code><\/pre>/);
});
