# Contributing to Zapper

Thanks for your interest in contributing to Zapper! This guide will help you get started.

## Quick Links

- [Issues](https://github.com/vitordwb/zapper/issues) — report bugs or request features
- [README — Development Setup](./README.md#development-setup) — set up your dev environment

## Development Setup

1. Follow the [Development Setup](./README.md#development-setup) section in the README to clone, install, and run the project.
2. Make sure `npm run build` completes without errors before starting work.

## Project Architecture
```text
src/
├── main/           # Electron main process
│   ├── main.ts     # Electron lifecycle and IPC handlers
│   ├── preload.ts  # Renderer bridge
│   └── settings-store.ts # Persistent settings
├── renderer/       # React UI (Vite-powered)
│   └── src/
│       ├── raycast-api/   # Raycast API compatibility shims (@raycast/api, @raycast/utils)
│       ├── components/    # React components
│       ├── hooks/         # React hooks
│       └── ...
└── native/         # Swift helpers for macOS-native features
```

### Key principles

- **Raycast compatibility is the priority.** Extensions built for Raycast must work without changing extension source. Fix compatibility in Zapper.
- **System-level logic lives in `src/main/`.** IPC, settings, file access, and native module bridges belong here.
- **UI code lives in `src/renderer/src/`.** Views, hooks, and components go here.

## Making a Pull Request

### Branch naming

Use descriptive branch names with a prefix:

- `feat/description` — new feature
- `fix/description` — bug fix
- `docs/description` — documentation
- `chore/description` — maintenance, cleanup
- `test/description` — tests

### Commit messages

Follow [Conventional Commits](https://www.conventionalcommits.org/):
```
feat: add clipboard history search
fix: resolve hotkey not registering on Sonoma
docs: update AI setup instructions
chore: remove unused dependencies
test: add unit tests for ai-provider
```

### PR checklist

Before submitting your PR, verify:

- [ ] `npm run build` completes without errors
- [ ] You've tested your changes locally with `npm run dev`
- [ ] Your PR description includes: what changed, why, compatibility impact, and how you tested it
- [ ] If you modified the Raycast API shims, you've tested with at least one existing Raycast extension

### PR size

Keep PRs focused. A single PR should address one concern. If you're working on a large feature, consider breaking it into smaller PRs.

## Working with Extensions

Zapper aims for compatibility with [Raycast extensions](https://www.raycast.com/store). When working on the runtime:

- Test against popular extensions (Calculator, Clipboard History, etc.)
- The API shims are in `src/renderer/src/raycast-api/` — check the [Raycast API docs](https://developers.raycast.com/api-reference/) for reference
- Implement APIs in focused runtime modules and export through `index.tsx`. Do not use warning-only stubs or fabricated empty results to claim support.

## AI agents (Oh My Pi)

Launch `omp` from the repository root. The project uses OMP-native instructions, independent of whether the selected model is GPT or another provider:

| File | Purpose |
| --- | --- |
| `.omp/AGENTS.md` | Automatically loaded project context, architecture and verification commands |
| `.omp/rules/zapper-safety.md` | Short always-applied compatibility, data and publication requirements |
| `.omp/rules/zapper-raycast.md` | On-demand extension runtime/API guidance |
| `.omp/rules/zapper-i18n.md` | On-demand localization guidance |
| `.omp/rules/zapper-macos-release.md` | On-demand native, packaging and distribution guidance |

Use `/extensions` to inspect discovered context and rules. After changing them, start a fresh session with `/new` or `/clear`. Rule globs are routing hints, not enforcement: the agent must read the applicable rule. Start from the repository root because native `.omp/rules/` discovery is cwd-based.

The old `CLAUDE.md` has been replaced rather than retained as a competing source. No project `SYSTEM.md` overrides OMP's default tool/workflow instructions. Keep personal model settings and global preferences in your own OMP profile; do not duplicate them here. Installed skills remain separate and are used only when available and relevant. Do not add an unconditional routing table for skills that this project cannot guarantee are installed.

Keep the main context short. Put specialized details in uniquely named `zapper-*` rules with meaningful descriptions; reserve `alwaysApply: true` for a few durable invariants. Avoid a project `RULES.md` when a global rule of that same name could shadow it. Treat source and exercised behavior as authoritative instead of maintaining a blanket API-completeness table.

## Reporting Bugs

When opening an issue, include:

- macOS version
- Node.js version (`node -v`)
- Zapper version (Settings → About, or check `package.json`)
- Steps to reproduce
- Expected vs actual behavior
- Console logs if available (Cmd+Option+I to open DevTools)

## Code of Conduct

Be respectful. We're all here to build something great together.
