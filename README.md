<h1 align="center"><b>I LOVE COMPUTERS CORPORATION (c)</b></h1>

<h1 align="left"><b>Zapper</b></h1>

Zapper is my personal version of [SuperCmd](https://github.com/SuperCmdLabs/SuperCmd): a macOS launcher with Raycast-compatible extensions, voice tools, notes, clipboard history and configurable AI providers. Maintained in [vitordwb/zapper](https://github.com/vitordwb/zapper).

Zapper uses its own app identity (`com.vitordwb.zapper`), URL scheme (`zapper://`), update repository and data directory (`~/Library/Application Support/Zapper`). Existing SuperCmd data is not migrated or deleted. Internal compatibility identifiers remain unchanged.

The initial distribution target is **macOS Apple Silicon (ARM64)**. Native helpers build for the host architecture; Intel releases are not offered. Public downloads and Homebrew installation require a published release and tap, not just this repository.

## What It Is

Zapper is an Electron + React launcher with an `@raycast/api` and `@raycast/utils` compatibility layer. Swift and Objective-C helpers provide native macOS integration. Upstream copyright and MIT license terms are preserved in [LICENSE](./LICENSE), including in packaged apps.

## Key Features

- **Raycast extension compatibility** — `@raycast/api` and `@raycast/utils` shims; install extensions directly from the Raycast store
- **Raycast backup import** — import encrypted `.rayconfig` backups with settings, hotkeys, extensions, scripts, quicklinks, snippets, notes, and extension prefs
- **AI cursor prompt** — inline AI suggestions at your cursor position across any app
- **AI chat** — chat with configurable providers (OpenAI / Anthropic / Ollama / Gemini / OpenAI-compatible)
- **Hold-to-speak dictation** — Wispr Flow-style voice input; hold hotkey, speak, release to type (Whisper, Parakeet, or native macOS STT)
- **Read aloud** — Speechify-style TTS for selected text (Edge TTS or ElevenLabs)
- **Clipboard history** — full clipboard manager with Cmd+1–9 quick-paste shortcuts
- **Snippet expansion** — create and trigger text snippets with keyboard shortcuts
- **Quick links** — bookmark URLs and launch them from the launcher
- **Notes** — lightweight in-launcher note-taking
- **Canvas** — freeform drawing and diagramming
- **File search** — fast indexed file search with protected-roots support
- **Calendar/schedule** — view today's events from EventKit
- **Window tiling** — 24 window placement commands (halves, thirds, quarters, center, fill, 10px nudge/resize)
- **Hyper key** — remap Caps Lock to a custom modifier with configurable behavior
- **System commands** — Sleep, Restart, Lock Screen, Log Out, Close All Apps, Empty Trash
- **Script command support** — run custom shell/Python/Ruby scripts from the launcher
- **Auto-updates** — built-in updater via GitHub Releases; check manually or install on next launch
- **Memory-aware AI** — Supermemory integration
- **Glassy UI** — liquid-glass morphism with custom background image, blur, and opacity controls
- **Localization** — English, Chinese (Simplified/Traditional), Japanese, Korean, French, German, Spanish, Russian

## Tech Stack

- Electron 41 (main process)
- React 18 + Vite 5 (renderer)
- TypeScript 5.3
- Tailwind CSS 3
- Swift binaries for macOS-native integrations (11 Swift helpers + fast-paste native module)

## Project Structure

```text
src/main/        Electron main process, IPC, extension execution, AI, settings
src/renderer/    React UI + Raycast compatibility layer + built-in feature views
src/native/      Swift native helpers (11 binaries)
extensions/      Installed/managed extension data
dist/            Build output
```

### Key source files

| Path | Purpose |
|---|---|
| `src/main/main.ts` | Entry point — IPC handlers, window management, global shortcuts |
| `src/main/preload.ts` | contextBridge — exposes `window.electron` API to renderer |
| `src/main/commands.ts` | App/extension/script discovery; `getAvailableCommands()` with cache |
| `src/main/extension-runner.ts` | Extension execution engine (esbuild bundle + require shim) |
| `src/main/extension-registry.ts` | Extension catalog, install, uninstall, update |
| `src/main/ai-provider.ts` | AI streaming (OpenAI / Anthropic / Ollama / Gemini) via Node http/https |
| `src/main/settings-store.ts` | JSON settings persistence (`AppSettings`, cached in memory) |
| `src/renderer/src/App.tsx` | Root component — wires hooks and routes to views |
| `src/renderer/src/raycast-api/` | `@raycast/api` + `@raycast/utils` compatibility runtime |
| `src/renderer/src/hooks/` | Feature hooks — state and logic, no JSX |
| `src/renderer/src/views/` | Full-screen view components — pure UI |

### Native Swift helpers

| Binary | Purpose |
|---|---|
| `calendar-events` | EventKit calendar integration |
| `color-picker` | System color picker |
| `get-selected-text` | Extract selected text from frontmost app |
| `hotkey-hold-monitor` | Hold-to-speak hotkey detection |
| `hyper-key-monitor` | Caps Lock → Hyper Key remapping |
| `input-monitoring-request` | Request Input Monitoring permission |
| `microphone-access` | Microphone permission checks |
| `snippet-expander` | Keyboard-triggered snippet expansion |
| `speech-recognizer` | macOS native speech recognition (STT) |
| `whisper-transcriber` | OpenAI Whisper STT integration |
| `window-adjust` | Window tiling and resizing (ApplicationServices) |
| `fast-paste-addon/` | Node.js native module for fast clipboard paste (Cmd+1–9) |
| `parakeet-transcriber/` | Swift package — on-device STT via swift-transformers |

## Install

### Install a local build

After installing development prerequisites and running `npm install`:

```bash
npm run package:unsigned
open out
```

Open `Zapper-<version>-arm64.dmg`, quit Zapper, then drag `Zapper.app` to Applications. Launch `/Applications/Zapper.app`; Node/npm are not required to run it. This local build is not Developer ID signed or notarized. If Gatekeeper blocks your own build, review it in System Settings → Privacy & Security; do not disable Gatekeeper globally.

Keep the original SuperCmd and development instance closed while using Zapper: global shortcuts and the inherited browser bridge port (`17373`) can conflict. Data directories are separate, but system-wide shortcuts are not.

### Public downloads and Homebrew

Releases belong at https://github.com/vitordwb/zapper/releases. **After** publishing a signed release and adding its generated cask to `vitordwb/homebrew-tap`, users can install with:

```bash
brew install --cask vitordwb/tap/zapper
```

This command is only usable after both the release and tap have been published. See **Publishing a release** below.

### macOS Permissions

Zapper needs the following permissions. The app will prompt you on first use, or you can enable them manually in **System Settings → Privacy & Security**:

| Permission | Why | Required for |
|---|---|---|
| **Accessibility** | Window management, keystroke injection | Window tiling, snippet expansion |
| **Input Monitoring** | Global hotkey detection (hold-to-speak, launcher shortcut, hyper key) | Core launcher functionality |
| **Microphone** | Voice dictation (speech-to-text) | Optional — only if using voice features |
| **Automation (AppleScript)** | Selected text capture, system automation | Extension actions |
| **Calendars** | Reading today's events | Optional — only if using schedule feature |

> You may need to restart the app after granting permissions.

### Auto-updates

Zapper uses the packaged `app-update.yml`, pointing to `vitordwb/zapper`. Signed releases must include the ZIP and macOS update YAML/blockmaps, not only the DMG. Until a matching release is published, update checks can report no available release. Update unsigned local builds manually.

### Raycast Backup Import

Zapper can import encrypted Raycast `.rayconfig` backups from the General settings tab.

It currently imports:
- Raycast settings that map cleanly to Zapper
- the global launcher hotkey
- command hotkeys
- quicklinks
- snippets
- notes
- installed Raycast extensions
- extension preferences
- script command folders
- disabled script commands
- disabled extension commands

It intentionally skips or only partially maps:
- AI chats
- clipboard history
- MCP server config
- Raycast aliases, where the backup does not expose a clean first-class field

The importer decrypts backups locally and prompts for the backup password before reading the file.

---

## Development Setup

### Prerequisites

- **macOS** (required — native Swift modules won't compile on Linux/Windows)
- **Node.js 22+** — check with `node -v`
- **npm** — comes with Node.js
- **Xcode Command Line Tools** — required for `swiftc` (Swift compiler)
- **Homebrew** — used at runtime to resolve `git` and `npm` for extension installation

### 1. Install system dependencies

If you don't have Xcode Command Line Tools:
```bash
xcode-select --install
```

Verify Swift is available:
```bash
swiftc --version
```

If you don't have Homebrew:
```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```

### 2. Clone and install
```bash
git clone https://github.com/vitordwb/zapper.git
cd zapper
npm install
```

The macOS esbuild binaries are optional dependencies so npm can select the host architecture. The `postinstall` script adds the other macOS binary for cross-architecture packaging; do not move these packages into required `dependencies`, which causes `EBADPLATFORM` on installation.

### 3. Build native modules

The `dev` script does **not** compile the Swift native helpers — build them once before your first run:
```bash
npm run build:native
```

This compiles all Swift binaries and native Node modules into `dist/native/`.

### 4. Run in development mode
```bash
npm run dev
```

This starts TypeScript watch for the main process, the Vite dev server for the renderer, and Electron in development mode.

### 5. Build for production
```bash
npm run build
```

Runs `build:main` + `build:renderer` + `build:native` in sequence.

### 6. Update your installed app

```bash
npm run package:unsigned
open out
```

This rebuilds main, renderer and native helpers, producing `out/mac-arm64/Zapper.app` and the DMG. Quit the installed app and replace it in Applications via the new DMG. Data remains in `~/Library/Application Support/Zapper`. Unsigned replacements may require granting macOS permissions again.

During development, Vite reloads the UI; main/preload changes require restarting `npm run dev`. Swift/addon changes require `npm run build:native` and a restart. Editing source does not change the installed app. Enable **Start at Login** in General settings on the installed app, not the development Electron instance.

### Publishing a release

1. Obtain an Apple **Developer ID Application** certificate. Configure repository Actions secrets: `CSC_LINK` (base64 `.p12`), `CSC_KEY_PASSWORD`, `APPLE_ID`, `APPLE_APP_SPECIFIC_PASSWORD`, `APPLE_TEAM_ID`. Never commit secrets.
2. `npm run release:check` checks variable presence and macOS ARM64, not credential validity with Apple.
3. Commit the code and lockfile. `npm version patch` creates the next version commit/tag; push the branch and tag. Do not reuse upstream tags or change files after tagging.
4. `.github/workflows/release.yml` runs on `v*` tags or manually with an existing tag. It installs from the lockfile, builds, signs, notarizes, verifies and publishes DMG/ZIP, update metadata and `zapper.rb`. Missing credentials stop the workflow rather than publishing unsigned artifacts.
5. `npm run release` performs the signed build locally without publishing. Lower-level `npm run package` also never publishes but omits the release verification sequence.

Apple signing/notarization requires real credentials; it has not been validated without them.

### Publishing the Homebrew tap

Create the public repository **vitordwb/homebrew-tap**. After a signed release succeeds, download its `zapper.rb` asset and commit it as `Casks/zapper.rb` there. The cask contains the exact DMG SHA-256 and versioned URL. Do not substitute the hash from an unsigned local build.

To generate a cask for an existing local artifact:

```bash
npm run homebrew:cask
ruby -c out/zapper.rb
```

This writes `out/zapper.rb`; it does not publish the DMG or create the tap. After pushing the release cask, test `brew install --cask vitordwb/tap/zapper` on a clean Mac. Later, update the cask from each new release; users run `brew update && brew upgrade --cask zapper`.

### Useful Commands

```bash
npm run dev              # Start local development (watch + Vite + Electron)
npm run build            # Build main, renderer, and native modules
npm run build:main       # Compile Electron main process TypeScript
npm run build:renderer   # Build renderer with Vite
npm run build:native     # Compile Swift helpers and native modules
npm run package          # Build and package app with electron-builder
npm run package:unsigned # Build unsigned package for local testing
npm run check:i18n       # Check internationalization strings
```

### Troubleshooting

| Problem | Solution |
|---|---|
| `swiftc: command not found` | Run `xcode-select --install` and restart your terminal |
| `npm install` fails on native modules | Ensure Xcode CLT is installed and up to date: `softwareupdate --install -a` |
| App launches but hotkeys don't work | Grant **Input Monitoring** permission (not just Accessibility) and restart the app |
| Window management doesn't work | Grant **Accessibility** permission — `window-adjust.swift` checks `AXIsProcessTrusted()` |
| Extensions fail to install | Verify Homebrew is installed (`brew --version`) — Zapper needs brew-resolved `git` to clone extensions |
| `node-gyp` build errors | Check Node.js version (`node -v`) — requires 22+. Try deleting `node_modules` and re-running `npm install` |
| Apple Silicon (M1/M2/M3) issues | Ensure you're running the arm64 version of Node.js, not the x64 version via Rosetta |
| Native features missing after `npm run dev` | Run `npm run build:native` first — the dev script doesn't compile Swift binaries |
| Snippet expansion not working | Grant **Accessibility** permission; snippet-expander uses `CGEventPost` for keystroke injection |
| Whisper/Parakeet STT not working | Grant **Microphone** permission in System Settings → Privacy & Security |

## AI + Memory Setup

Configure everything from the app UI:

1. Launch Zapper.
2. Open **Settings** (search "Settings" or use the gear icon).
3. Go to the **AI** tab.
4. Enable AI (`enabled = true`).
5. Pick your default provider and add the required key(s).

### Providers

| Provider | Setting | Notes |
|---|---|---|
| OpenAI | `openaiApiKey` | GPT-4o, GPT-4o-mini, etc. |
| Anthropic (Claude) | `anthropicApiKey` | Claude 3.5 Sonnet, Haiku, etc. |
| Google Gemini | `geminiApiKey` | Gemini 1.5 Pro, Flash, etc. |
| Ollama | `ollamaBaseUrl` | Default `http://localhost:11434` — local models |
| OpenAI-compatible | `openaiCompatibleBaseUrl` + `openaiCompatibleApiKey` | Any OpenAI-compatible endpoint |

### Speech / voice keys

| Feature | Setting |
|---|---|
| ElevenLabs TTS | `elevenlabsApiKey` |
| Edge TTS (built-in) | No key required |
| Native macOS STT | No key required |
| Whisper STT | Runs locally — no key required |
| Parakeet STT | Runs locally via swift-transformers — no key required |

### Memory keys

| Setting | Purpose |
|---|---|
| `supermemoryApiKey` | Supermemory API key |
| `supermemoryClient` | Supermemory client ID |
| `supermemoryBaseUrl` | Base URL (default: `https://api.supermemory.ai`) |
| `supermemoryLocalMode` | Use local Supermemory instance |

### Where settings are stored

All app settings are persisted in:

`~/Library/Application Support/Zapper/settings.json`

Key fields:

```json
{
  "globalShortcut": "Alt+Space",
  "openAtLogin": false,
  "uiStyle": "glassy",
  "fontSize": "medium",
  "appLanguage": "system",
  "ai": {
    "enabled": true,
    "provider": "openai",
    "openaiApiKey": "",
    "anthropicApiKey": "",
    "geminiApiKey": "",
    "ollamaBaseUrl": "http://localhost:11434",
    "elevenlabsApiKey": "",
    "supermemoryApiKey": "",
    "supermemoryBaseUrl": "https://api.supermemory.ai",
    "defaultModel": "openai-gpt-4o-mini",
    "speechToTextModel": "native",
    "textToSpeechModel": "edge-tts"
  }
}
```

Secrets use `~/Library/Application Support/Zapper/safe-storage.json` through Electron safeStorage; when encryption is unavailable, the existing vault implementation can fall back to plaintext.

### Optional environment variable fallbacks

- `ELEVENLABS_API_KEY`
- `SUPERMEMORY_API_KEY`
- `SUPERMEMORY_CLIENT`
- `SUPERMEMORY_BASE_URL`
- `SUPERMEMORY_LOCAL`

## Privacy & Security

Zapper is open-source, so you can audit exactly what it does. The short version:

- **Startup analytics**: upstream Aptabase and its `app_started` event have been removed.
- **AI prompts**: sent directly from your device to your configured provider (OpenAI / Anthropic / Gemini / Ollama).
- **Extension install/uninstall**: reports extension name + an anonymous random machine ID to `api.supercmd.sh` for download counts.
- **Voice data**: local speech providers process audio on-device; cloud speech/TTS providers receive audio/text for the selected feature.

- **Inherited services**: extension catalog/install counts, canvas downloads and hosted OAuth still use upstream infrastructure. This fork does not operate replacement servers. OAuth providers/hosted services must accept the new `zapper://` callback; live authorization has not been verified.
See **[SECURITY.md](./SECURITY.md)** for the full breakdown.

## Contributing

We welcome contributions! See [CONTRIBUTING.md](./CONTRIBUTING.md) for detailed guidelines on development setup, code architecture, PR conventions, and more.

Quick version:

1. Fork the repo and create a feature branch.
2. Make your changes, keeping Raycast extension compatibility in mind.
3. Run `npm run build` to verify.
4. Open a PR with a clear description of what, why, and how you tested.

## References

- Raycast API docs: https://developers.raycast.com/api-reference/
- Raycast extension store: https://www.raycast.com/store

## Contributors

Thanks to everyone who has contributed to SuperCmd!

## GitHub Star History

[![Star History Chart](https://api.star-history.com/svg?repos=vitordwb/zapper&type=Date)](https://star-history.com/#vitordwb/zapper&Date)
