#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';

const root = dirname(dirname(fileURLToPath(import.meta.url)));

function run(command, args) {
  const result = spawnSync(command, args, {
    cwd: root,
    stdio: 'inherit',
    env: { ...process.env, NODE_ENV: 'production' },
  });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`${command} failed (${result.signal || result.status}).`);
}

try {
  const { values } = parseArgs({ options: { check: { type: 'boolean' }, help: { type: 'boolean' } } });
  if (values.help) {
    console.log('Usage: node scripts/release.mjs [--check]\nBuild signed, notarized ARM64 DMG/ZIP and a Homebrew cask in out/. Never publishes.\nRequires CSC_LINK, CSC_KEY_PASSWORD, APPLE_ID, APPLE_APP_SPECIFIC_PASSWORD, APPLE_TEAM_ID.\nSet RELEASE_TAG to validate a release tag against package.json; --check only checks prerequisites.');
  } else {
    const required = ['CSC_LINK', 'CSC_KEY_PASSWORD', 'APPLE_ID', 'APPLE_APP_SPECIFIC_PASSWORD', 'APPLE_TEAM_ID'];
    const missing = required.filter((name) => !process.env[name]?.trim());
    if (missing.length) throw new Error(`Missing signing/notarization prerequisites: ${missing.join(', ')}. Refusing an unsigned public release; use package:unsigned only for local development.`);
    if (process.platform !== 'darwin' || process.arch !== 'arm64') {
      throw new Error('Release builds require macOS with native ARM64 Node.js; native modules are built for the host architecture.');
    }
    const { version } = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
    if (process.env.RELEASE_TAG && process.env.RELEASE_TAG !== `v${version}`) {
      throw new Error(`Release tag ${process.env.RELEASE_TAG} must match package.json: v${version}.`);
    }
    console.log(`Signing prerequisites present for Zapper ${version} (macOS ARM64).`);
    if (!values.check) {
      run('npm', ['run', 'build']);
      run(process.execPath, [
        join(root, 'node_modules/electron-builder/cli.js'),
        '--mac', 'dmg', 'zip', '--arm64', '--publish', 'never',
        '-c.forceCodeSigning=true', '-c.mac.hardenedRuntime=true', '-c.mac.notarize=true',
      ]);
      const app = join(root, 'out/mac-arm64/Zapper.app');
      run('codesign', ['--verify', '--deep', '--strict', app]);
      run('xcrun', ['stapler', 'validate', app]);
      run('spctl', ['--assess', '--type', 'execute', '--verbose', app]);
      for (const extension of ['dmg', 'zip']) {
        const artifact = join(root, `out/Zapper-${version}-arm64.${extension}`);
        const info = statSync(artifact);
        if (!info.isFile() || info.size === 0) throw new Error(`Missing release artifact: ${artifact}`);
      }
      const outputs = readdirSync(join(root, 'out'));
      if (!outputs.some((name) => name.endsWith('-mac.yml')) || !outputs.some((name) => name.endsWith('.blockmap'))) {
        throw new Error('electron-builder did not produce macOS update metadata and blockmaps. Nothing has been published.');
      }
      run(process.execPath, [join(root, 'scripts/generate-homebrew-cask.mjs')]);
      console.log('Verified signed release artifacts and generated out/zapper.rb. Nothing has been published.');
    }
  }
} catch (error) {
  console.error(`Release failed: ${error.message}`);
  process.exitCode = 1;
}
