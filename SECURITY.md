# Security & Privacy

Zapper occupies a central role in your workflow — it sees your keystrokes, clipboard, voice input, and AI prompts. This document explains exactly what the app monitors and what data leaves your device.

---

## What This Document Covers

- [Data Collected & Telemetry](#data-collected--telemetry)
- [What Leaves Your Device](#what-leaves-your-device)
- [Privacy Options](#privacy-options)
- [API Key & Secret Storage](#api-key--secret-storage)
- [Extension Security](#extension-security)
- [Electron Security Architecture](#electron-security-architecture)
- [Known Limitations](#known-limitations)
- [Reporting a Vulnerability](#reporting-a-vulnerability)

---

## Data Collected & Telemetry

Zapper removes the upstream Aptabase dependency and `app_started` event. Extension-store reporting and provider requests described below remain; this is not a network-free app.

### Extension Install/Uninstall Reporting

When you install or uninstall an extension, the following is sent to `https://api.supercmd.sh`:

- Extension name (e.g. `raycast/github`)
- An **anonymous machine ID** — a randomly generated hex string stored at `~/Library/Application Support/Zapper/.machine-id`

This is used for install/download count metrics on the extension catalog.

---

## What Leaves Your Device

| Destination | What is sent | When | Controlled by |
|---|---|---|---|
| `https://api.supercmd.sh` | Extension name + anonymous machine ID | On extension install/uninstall | Extension store usage |
| `https://api.supercmd.sh` | Extension name | When browsing the extension catalog | Extension store usage |
| Your configured AI provider (OpenAI / Anthropic / Gemini / custom) | Your prompt + system prompt | When you use AI features | AI settings |
| `http://localhost:11434` | Your prompt | When using Ollama | AI settings (local) |
| `https://api.elevenlabs.io` | Text to be spoken | When using ElevenLabs TTS | TTS settings |
| Edge TTS (`speech.platform.bing.com`) | Text to be spoken | When using built-in Edge TTS | TTS settings |
| `https://api.supermemory.ai` | Memory snippets (up to ~2,400 chars) | When Supermemory integration is enabled | Memory settings |
| GitHub Releases API | App version string | On auto-update check | Built-in updater |
| Extension CDN / S3 | Binary download | On extension install | Extension store usage |

---

## Privacy Options

### Startup analytics

No Aptabase initialization or startup event is included in this fork. No hosts-file change is needed.

### Disable Extension Install Reporting

To opt out of install/uninstall reporting:

1. Delete `~/Library/Application Support/Zapper/.machine-id` to discard the current anonymous ID.
2. Build from source and remove the `reportInstall()` / `reportUninstall()` calls in `src/main/extension-api.ts`.

### Disable Clipboard History

Go to **Settings → General** and disable **Clipboard History**, or delete the stored history:
```bash
rm -rf ~/Library/Application\ Support/Zapper/clipboard-history/
```

### Use Local AI

Set your AI provider to **Ollama** with a local model. All AI processing stays on-device.

### Use Local Memory

Leave `supermemoryApiKey` blank. Zapper will fall back to `local-memories.json` on your device.

### Use Native STT

Set `speechToTextModel` to `native` in AI settings. This uses Apple's on-device speech recognizer.

---

## API Key & Secret Storage

AI keys and OAuth secrets managed by the vault are stored in `~/Library/Application Support/Zapper/safe-storage.json` using Electron safeStorage (backed by macOS Keychain when available). Legacy plaintext settings are migrated by the settings store.

The current implementation can persist plaintext when encryption is unavailable. Extensions run with broad local capabilities: encryption at rest does not isolate secrets from trusted code running inside the app. Use minimally privileged provider keys and protect local backups.

---

## Extension Security

Extensions run as JavaScript bundles inside the renderer process, with access to Zapper's IPC bridge. An extension can:

- Read and write files on your behalf
- Execute AppleScript
- Make network requests
- Read settings (including other extensions' preferences)

**Mitigations:**
- Extensions in the Zapper store are sourced from the public [Raycast extension registry](https://github.com/raycast/extensions), which is open-source and community-reviewed.
- Extensions execute bundled code with Node/IPC access in the launcher renderer; they are not sandboxed from the user account.

Treat installing an extension like installing any other macOS app — it runs with your user's permissions.

**Per-extension sandboxing (capability restrictions) is not yet implemented.**

---

## Electron Security Architecture

| Control | Status | Notes |
|---|---|---|
| Launcher renderer | Node integration enabled; context isolation disabled | Required by the inherited extension runtime; install only trusted extensions |
| Other app windows | Node integration generally disabled; context isolation enabled | See each BrowserWindow configuration |
| Asset protocol | CSP bypass enabled | `sc-asset://` serves extension assets |
| Release signing | Developer ID + hardened runtime + notarization required by release workflow | Local unsigned builds are not notarized |

---

## Known Limitations

1. **Extension install reporting remains** — no dedicated opt-out UI.
2. **Vault plaintext fallback** — encryption availability affects persistence.
3. **No per-extension sandboxing** — all extensions share the same IPC surface.
4. **IPC handlers lack sender validation** — relies on Electron's process isolation.
5. **CSP bypass for asset protocol** — `sc-asset://` bypasses Content Security Policy to serve extension images.

---

## Reporting a Vulnerability

If you discover a security issue, **please do not open a public GitHub issue.**

For Zapper-specific issues, use private vulnerability reporting in [vitordwb/zapper](https://github.com/vitordwb/zapper/security/advisories/new) when enabled. Do not send fork reports to the upstream project's former contact address.

Please include:
- A description of the vulnerability
- Steps to reproduce
- Potential impact
- Any proof-of-concept code (if applicable)

This personal fork does not currently offer a guaranteed security response timeline.
