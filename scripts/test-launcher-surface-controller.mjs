#!/usr/bin/env node
import test from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';

// Bundle the actual TypeScript module and shared constants without generating artifacts.
const { outputFiles } = await build({
  entryPoints: ['src/main/launcher-surface-controller.ts'], bundle: true,
  platform: 'node', format: 'esm', write: false,
});
const { LauncherSurfaceController } = await import(
  `data:text/javascript;base64,${Buffer.from(outputFiles[0].contents).toString('base64')}`
);
const screen = { x: -1920, y: -240, width: 1920, height: 1080 };
const search = (rendererGeneration, requestId, searchHeight = 88, resultsHeight = 180, overlayHeight = 0) => ({
  rendererGeneration, requestId, appearance: 'dark',
  presentation: { kind: 'search', searchHeight, resultsHeight, overlayHeight },
});

function create(area = screen) {
  const sender = {};
  const controller = new LauncherSurfaceController(sender, area);
  const generation = controller.beginRendererGeneration(sender);
  controller.rendererReady(sender, generation);
  return { sender, controller, generation };
}

test('negative work-area origins remain in global DIPs and results have a clear 10px gap', () => {
  const { sender, controller, generation } = create();
  const { bounds, snapshot } = controller.request(sender, search(generation, 1));
  assert.equal(bounds.width, 568);
  assert.equal(bounds.x, -1244);
  assert.equal(bounds.y, -24);
  assert.equal(snapshot.regions[1].y - snapshot.regions[0].y - snapshot.regions[0].height, 10);
  assert.equal(snapshot.regions[0].x, 24);
  assert.equal(snapshot.regions[0].width, 520);
  assert.equal(snapshot.material, 'opaque');
  assert.equal(snapshot.fallbackReason, undefined);
});

test('content cap reserves result space, clamps font-grown chrome, and does not fill overlay-only height', () => {
  const { sender, controller, generation } = create({ x: 200, y: -100, width: 740, height: 480 });
  const { bounds, snapshot } = controller.request(sender, search(generation, 1, 370, 400, 500));
  // 480 - 48 screen margin - 48 shadow inset = 384 available content.
  assert.equal(bounds.height, 432);
  assert.equal(snapshot.regions[0].height, 314);
  assert.equal(snapshot.regions[1].height, 60);
  assert.equal(snapshot.regions[1].y, 24 + 314 + 10);
  assert.ok(bounds.y >= -76 && bounds.y + bounds.height <= 356);
  const overlay = controller.request(sender, search(generation, 2, 88, 0, 300));
  assert.equal(overlay.bounds.height, 348);
  assert.deepEqual(overlay.snapshot.regions.map((region) => region.id), ['search']);
  assert.equal(overlay.snapshot.regions[0].height, 88);
});

test('tiny work areas never create negative dimensions or out-of-display bounds', () => {
  const { sender, controller, generation } = create({ x: -34, y: 71, width: 64, height: 92 });
  const { bounds, snapshot } = controller.request(sender, search(generation, 1, 200, 200, 400));
  assert.ok(bounds.x >= -34 && bounds.y >= 71);
  assert.ok(bounds.x + bounds.width <= 30 && bounds.y + bounds.height <= 163);
  assert.ok(snapshot.regions.every((r) => r.width >= 0 && r.height >= 0 && r.radius >= 0));
});

test('answer stays centered on root search without drifting on repeated width switches', () => {
  const { sender, controller, generation } = create();
  const root = controller.show(screen);
  assert.equal(root.bounds.x, -1244);
  const answer = controller.request(sender, {
    rendererGeneration: generation, requestId: 1, appearance: 'light',
    presentation: { kind: 'answer', contentHeight: 260, overlayHeight: 0 },
  });
  assert.equal(answer.bounds.width, 468);
  assert.equal(answer.bounds.x, -1194);
  assert.equal(answer.bounds.y, root.bounds.y);
  controller.request(sender, search(generation, 2));
  assert.equal(controller.get().bounds.x, -1244);
  assert.equal(controller.get().bounds.y, root.bounds.y);
  // Moving the answer saves equivalent root coordinates, not its narrower host x.
  controller.request(sender, { rendererGeneration: generation, requestId: 3, appearance: 'dark',
    presentation: { kind: 'answer', contentHeight: 260, overlayHeight: 0 } });
  const position = controller.move({ x: -1200, y: 40, width: 468, height: 308 });
  assert.deepEqual(position, { x: -1250, y: 40 });
  controller.request(sender, search(generation, 4));
  assert.equal(controller.get().bounds.x, -1250);
  // A manual drag is session-local; each invocation centers on its current display.
  assert.equal(controller.show(screen).bounds.x, -1244);
});

test('rejects foreign senders, malformed measurements, old IDs and prior renderer generation', () => {
  const { sender, controller, generation } = create();
  assert.throws(() => controller.request({}, search(generation, 1)), /sender/);
  assert.throws(() => controller.request(sender, search(generation, 1, NaN)), /presentation/);
  assert.throws(() => controller.request(sender, search(generation, 1, -1)), /presentation/);
  assert.equal(controller.get().snapshot.requestId, 0);
  controller.request(sender, search(generation, 3));
  const revision = controller.get().snapshot.revision;
  assert.throws(() => controller.request(sender, search(generation, 2)), /Stale/);
  assert.equal(controller.get().snapshot.revision, revision);
  const next = controller.beginRendererGeneration(sender);
  assert.throws(() => controller.rendererReady(sender, generation), /Stale/);
  assert.throws(() => controller.request(sender, search(generation, 4)), /Stale/);
  assert.equal(controller.get().snapshot.fallbackReason, 'renderer-not-ready');
  controller.request(sender, search(next, 1));
  assert.equal(controller.get().snapshot.material, 'opaque');
  controller.rendererReady(sender, next);
  assert.ok(controller.get().snapshot.revision > revision);
});

test('native material is reported only from actual outcome and reduced transparency forces opaque', () => {
  const { sender, controller, generation } = create();
  controller.request(sender, search(generation, 1));
  controller.setMaterial('visual-effect');
  assert.equal(controller.get().snapshot.material, 'visual-effect');
  controller.setPreferences({ reduceMotion: false, reduceTransparency: true, increaseContrast: false,
    differentiateWithoutColor: false, invertColors: false });
  assert.equal(controller.get().snapshot.material, 'opaque');
  assert.equal(controller.get().snapshot.fallbackReason, 'reduced-transparency');
  controller.beginRendererGeneration(sender);
  assert.equal(controller.get().snapshot.material, 'opaque');
  assert.equal(controller.get().snapshot.fallbackReason, 'reduced-transparency');
});
