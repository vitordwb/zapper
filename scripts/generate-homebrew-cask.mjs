#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { mkdir, readFile, stat, writeFile } from 'node:fs/promises';
import { basename, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';

const root = dirname(dirname(fileURLToPath(import.meta.url)));

try {
  const { values } = parseArgs({
    options: {
      dmg: { type: 'string' },
      output: { type: 'string' },
      help: { type: 'boolean' },
    },
  });
  if (values.help) {
    console.log('Usage: node scripts/generate-homebrew-cask.mjs [--dmg PATH] [--output PATH]\nDefaults: out/Zapper-<package.json version>-arm64.dmg and out/zapper.rb.\nHashes the supplied artifact; does not upload it or claim the release is published.\nAfter publishing v<version>, copy the cask into Casks/zapper.rb in vitordwb/homebrew-tap.');
  } else {
    const { version } = JSON.parse(await readFile(resolve(root, 'package.json'), 'utf8'));
    if (!/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?(?:\+[0-9A-Za-z.-]+)?$/.test(version)) {
      throw new Error('package.json must contain a valid release version.');
    }
    const filename = `Zapper-${version}-arm64.dmg`;
    const dmg = values.dmg ? resolve(values.dmg) : resolve(root, 'out', filename);
    const output = values.output ? resolve(values.output) : resolve(root, 'out/zapper.rb');
    if (basename(dmg) !== filename) throw new Error(`Expected a DMG named ${filename}; package.json determines the version.`);
    if (output === dmg) throw new Error('The cask output must not overwrite the DMG.');
    const info = await stat(dmg);
    if (!info.isFile() || info.size === 0) throw new Error('The DMG must be a nonempty file.');
    const hash = createHash('sha256');
    for await (const chunk of createReadStream(dmg)) hash.update(chunk);
    const sha256 = hash.digest('hex');
    const cask = `cask "zapper" do
  version "${version}"
  sha256 "${sha256}"

  url "https://github.com/vitordwb/zapper/releases/download/v#{version}/Zapper-#{version}-arm64.dmg"
  name "Zapper"
  desc "Open-source macOS launcher compatible with Raycast extensions"
  homepage "https://github.com/vitordwb/zapper"

  depends_on arch: :arm64

  app "Zapper.app"
end
`;
    await mkdir(dirname(output), { recursive: true });
    await writeFile(output, cask);
    console.log(`Generated ${output}\nSHA256 (${basename(dmg)}): ${sha256}\nPublish the matching v${version} release before installing or adding this cask to a public tap.`);
  }
} catch (error) {
  console.error(`Cask generation failed: ${error.message}`);
  process.exitCode = 1;
}
