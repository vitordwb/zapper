---
description: Read before changing macOS helpers, app identity, packaging, updater, signing, releases or Homebrew distribution.
globs:
  - src/native/**
  - package.json
  - scripts/build-native.mjs
  - scripts/release.mjs
  - scripts/generate-homebrew-cask.mjs
  - .github/workflows/release.yml
alwaysApply: false
---

# macOS, packaging and distribution

## App and native boundaries

- App ID `com.vitordwb.zapper`, product `Zapper`, protocol `zapper`, data directory `~/Library/Application Support/Zapper`, GitHub updates `vitordwb/zapper`.
- Preserve independent data and updater identity. Do not migrate/delete SuperCmd data or globally rename `SUPERCMD_*` / `sc-*` internals as branding work.
- The supported package target is Apple Silicon ARM64. Helpers compile through `scripts/build-native.mjs`; do not claim Intel support without native artifacts and runtime verification.
- Inspect macOS permission requirements and subprocess lifecycle for changed helpers. Do not weaken entitlements, Gatekeeper or signing to conceal a failure.
- Workers running from `app.asar.unpacked` need their runtime dependencies there too. The window-manager path depends on `node-window-manager`, `node-gyp-build` and `extract-file-icon`; verify resolution from the packaged worker, not just the repository's `node_modules`.
- Platform-specific esbuild packages are optional dependencies. Preserve installability on Apple Silicon and keep npm's lockfile consistent.

## Commands and artifacts

- Development: `npm run dev`.
- Local installer: `npm run package:unsigned` → `out/Zapper-<version>-arm64.dmg` and `out/mac-arm64/Zapper.app`.
- Signed release prerequisites: `npm run release:check` checks presence/host/version, not credential validity or actual notarization.
- Signed build: `npm run release` builds, signs, notarizes and verifies artifacts; it does not publish them itself.
- Cask: `npm run homebrew:cask` hashes the actual DMG and generates `out/zapper.rb`.

`package.json`, `scripts/release.mjs`, `scripts/generate-homebrew-cask.mjs` and `.github/workflows/release.yml` are the source of truth. For detailed steps, read README's publishing section. Do not copy version numbers, hashes or machine-specific credentials into these instructions.

The workflow runs for version tags or manual dispatch against an existing tag. It requires `CSC_LINK`, `CSC_KEY_PASSWORD`, `APPLE_ID`, `APPLE_APP_SPECIFIC_PASSWORD` and `APPLE_TEAM_ID` in GitHub secrets. Never print their values. Publishing the release and publishing its generated cask to `vitordwb/homebrew-tap` are separate steps; `brew install --cask vitordwb/tap/zapper` is not available until both exist.

## Verification

For packaging changes, launch the actual packaged app and exercise the affected path. Check packaged metadata, native dependency resolution and `app-update.yml` as applicable. Never use the unsigned local DMG hash for a differently signed public artifact. Validate the generated cask syntax and its checksum against the exact release DMG.

Keep `out/`, `dist/`, native build output and credentials out of commits. Do not generate tags/releases or overwrite `/Applications/Zapper.app` without current-task authorization. Close only app instances you own or are authorized to stop; SuperCmd and Zapper can contend for shortcuts and browser bridge port `17373`.
