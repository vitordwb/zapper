# Zapper — project context

Zapper is Vitor Watanabe's personal macOS launcher, forked from SuperCmd. Repository: `vitordwb/zapper`. Preserve the upstream MIT license and attribution.

## Working agreement

- Answer the user in Brazilian Portuguese unless asked otherwise. Keep code identifiers and technical documentation in the repository's existing English style.
- Implement the requested scope end to end. Prefer existing patterns and focused modules over new abstractions or unrelated cleanup.
- Inspect the current implementation before editing. This document is a navigation guide, not proof that a feature works.
- Use the tools and skills actually exposed by the current OMP session. Read a matching available skill; do not require a Claude-only Skill tool or invent unavailable skills.
- Respect existing work. Commit, push, tag, publish releases or change the installed app only when requested; previous permission does not authorize unrelated future tasks.
- Report changed behavior, verification actually performed and remaining limitations. Do not call a build proof of a working UI or a configured release proof of publication.

## Identity and compatibility

- Product: `Zapper`; package: `zapper`; app ID: `com.vitordwb.zapper`.
- URL scheme: `zapper://`; user data: `~/Library/Application Support/Zapper`.
- Update repository: `vitordwb/zapper`; current distribution target: macOS Apple Silicon (ARM64).
- Internal `sc-*`, `__sc*` and `SUPERCMD_*` identifiers still exist intentionally. Do not bulk-rename them or migrate user data as cosmetic cleanup.
- Some catalog, Canvas and hosted OAuth services still use upstream infrastructure. Do not replace working endpoints with invented Zapper URLs. Verify hosted callback support before claiming OAuth works.

## Architecture boundaries

| Area | Location and ownership |
| --- | --- |
| Electron lifecycle and IPC handlers | `src/main/main.ts` |
| Renderer bridge and its types | `src/main/preload.ts`, `src/renderer/types/electron.d.ts` |
| Command discovery and ranking inputs | `src/main/commands.ts` |
| Extension execution and installation | `src/main/extension-runner.ts`, `src/main/extension-registry.ts` |
| Persistent settings | `src/main/settings-store.ts` |
| Root UI composition | `src/renderer/src/App.tsx`; keep business logic in hooks/modules |
| View state machine | `src/renderer/src/hooks/useAppViewManager.ts` |
| Feature state and lifecycle | `src/renderer/src/hooks/` |
| Full-screen UI | `src/renderer/src/views/` |
| Pure shared renderer helpers | `src/renderer/src/utils/` |
| Raycast compatibility | `src/renderer/src/raycast-api/`; `index.tsx` is the integration/export surface |
| macOS integration | `src/native/`; native build orchestrator: `scripts/build-native.mjs` |

Update IPC handlers, preload exposure and renderer types together when changing a bridge contract. System integration belongs in the main process/native helpers, not new renderer-side shortcuts. Existing extension execution is not a security sandbox; consult `SECURITY.md` before making isolation claims.

## Read by task

Read the applicable rule before editing. Paths below are relative to the repository root; if a `rule://` URL is unavailable, read the listed file directly.

| Task | Required reference |
| --- | --- |
| Raycast APIs, extension runtime, OAuth, no-view commands | `rule://zapper-raycast` — `.omp/rules/zapper-raycast.md` |
| User-facing copy, locale resources or localization | `rule://zapper-i18n` — `.omp/rules/zapper-i18n.md` |
| Native helpers, packaging, updater, signing or Homebrew | `rule://zapper-macos-release` — `.omp/rules/zapper-macos-release.md` |
| Extension install/catalog/backend sync | `docs/extension-install-flow.md` (describes inherited upstream infrastructure; verify current paths/configuration) |
| Development setup and release procedure | `README.md` |
| Security boundaries and secret storage | `SECURITY.md` |

## Verification commands

Use `package.json` as the source of truth for available scripts. Use npm and maintain `package-lock.json`; Bun downloaded for extensions is not a reason to change the application's package manager.

| Change | Starting verification |
| --- | --- |
| Main-process TypeScript | `npm run build:main` |
| Renderer code | `npm run build:renderer`, then exercise the affected Electron UI |
| Native helpers | `npm run build:native`, then invoke the changed helper/path |
| Localization | `npm run check:i18n`, plus review of translated text/placeholders |
| Focused regression | `node --test scripts/test-<relevant-name>.mjs` |
| Existing test suite | `npm test` |
| Full build | `npm run build` |
| Local unsigned ARM64 installer | `npm run package:unsigned` |
| Signing prerequisites | `npm run release:check` (not a signing/notarization test) |

`npm run dev` starts the development app. Close other Zapper/SuperCmd instances before checking global shortcuts or the inherited browser bridge on port `17373`; do not terminate the user's processes without permission.

For bugs, demonstrate the original failure and the fixed path; retain a regression test when it guards meaningful behavior. For UI, inspect the actual application, not only JSX/build output. Add permanent tests for observable contracts and plausible regressions, not source-text assertions. Update affected docs without maintaining a speculative API-completeness table.

## Maintaining these instructions

- `.omp/AGENTS.md`: concise project context, architecture boundaries and navigation.
- `.omp/rules/zapper-safety.md`: short always-applied invariants, uniquely named to avoid collision with global `RULES.md`.
- Other `.omp/rules/zapper-*.md`: task-specific guidance; loaded on demand, not imported wholesale here.
- Keep personal preferences/model settings in the user's OMP configuration, not this repository. Do not add `SYSTEM.md` merely to add project rules: it replaces the default instruction template.
- Launch OMP from the repository root so native project rules are discovered. Use `/extensions` to inspect discovery and `/new` or `/clear` after changing instructions.
