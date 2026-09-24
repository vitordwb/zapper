---
description: Read before changing Raycast compatibility, extension execution, OAuth or no-view command behavior.
globs:
  - src/renderer/src/raycast-api/**
  - src/renderer/src/ExtensionView.tsx
  - src/main/extension-*.ts
alwaysApply: false
---

# Raycast compatibility and extension runtime

## Contract

Existing Raycast extensions must work without extension-source modifications. Fix the host runtime and preserve `@raycast/api` / `@raycast/utils` contracts. Check the relevant official documentation at https://developers.raycast.com/api-reference/ before adding or changing API behavior.

Extensions are bundled to CommonJS with esbuild. The custom require shim supplies the host React instance and compatibility modules. Preserve shared React/context identity. Do not treat extension execution as a security sandbox.

Keep implementation in focused runtime files; wire/export from `index.tsx`. Before changing a public symbol, inspect references and callers. Migrate all affected consumers together. Unsupported APIs must not silently return fabricated success or empty results.

## Runtime navigation

Paths below are relative to `src/renderer/src/raycast-api/`.

| Concern | Files |
| --- | --- |
| Integration/export wiring | `index.tsx` |
| Actions and registration/execution | `action-runtime.tsx`, `action-runtime-registry.tsx`, `action-runtime-components.tsx` |
| Action overlays and shortcuts | `action-runtime-overlay.tsx`, `action-runtime-shortcuts.tsx` |
| List container and item registry | `list-runtime.tsx`, `list-runtime-hooks.ts`, `list-runtime-types.tsx` |
| List rendering and details | `list-runtime-renderers.tsx`, `list-runtime-detail.tsx` |
| Form container, fields and snapshots | `form-runtime.tsx`, `form-runtime-fields.tsx`, `form-runtime-context.tsx` |
| Grid container, registry and items | `grid-runtime.tsx`, `grid-runtime-hooks.ts`, `grid-runtime-items.tsx` |
| Detail and menu-bar runtime | `detail-runtime.tsx`, `menubar-runtime*.tsx` |
| Icons, assets and tinting | `icon-runtime.tsx`, `icon-runtime-config.ts`, `icon-runtime-phosphor.tsx`, `icon-runtime-assets.tsx`, `icon-runtime-render.tsx` |
| Canonical icon enum | `raycast-icon-enum.ts` (generated; inspect generation provenance before changing) |
| Platform APIs and utilities | `platform-runtime.ts`, `misc-runtime.ts`, `utility-runtime.ts` |
| Async extension context ownership | `context-scope-runtime.ts` |
| Storage notifications | `storage-events.ts` |
| Hook implementations | `hooks/use-*.ts` |
| OAuth exports/configuration | `oauth/index.ts`, `oauth/runtime-config.ts` |
| Callback parsing and waiters | `oauth/oauth-bridge.ts` |
| PKCE and token persistence | `oauth/oauth-client.ts` |
| Authorization and provider presets | `oauth/oauth-service-core.ts`, `oauth/oauth-service.ts` |
| Auth UI gate and token access | `oauth/with-access-token.tsx` |

OAuth has implementation modules; do not classify it as a stub from old documentation. Inspect each provider flow. Hosted authorization still depends on upstream services and acceptance of `zapper://` callbacks. Preserve callback-state matching, timeout/queue behavior, token ownership and extension-context isolation.

For extension installation/catalog changes, read `docs/extension-install-flow.md` before editing. It documents the prebuilt bundle → source + Bun/npm → git fallback and upstream backend; do not invent a replacement backend.

## Background/no-view status

Use the existing floating status badge:

- Main: `showMemoryStatusBar(variant, text)` in `src/main/main.ts`.
- Renderer: `window.electron.reportNoViewStatus(variant, text)` through the `no-view-status` IPC handler.
- Variants: `processing` remains visible while work is in flight; `success` / `error` auto-hide.

Preserve `NoViewRunner`'s `__scNoViewStatusTracking` and `__scNoViewStatusReported` lifecycle. Toast/HUD reporting must prevent duplicate generic completion messages; flags must be cleared after resolution/rejection. Never open the launcher merely to report silent command completion.

## Verification

Exercise a real affected extension when available and report its command/path. Target existing `scripts/test-*.mjs` regressions for changed behavior. For OAuth callback work, run `node --test scripts/test-oauth-callback-queue.mjs`; callback tests alone do not prove live provider authorization. Test registration cleanup, selection, navigation and async ownership transitions when the change affects them. Do not declare blanket API parity from compilation or a single extension.
