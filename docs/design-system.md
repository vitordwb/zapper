# Zapper Design System — Spotlight Search and Inline Siri AI

Research baseline: **2026-10-10 · macOS 27.0.1 (26A434) · Apple Silicon**.

**Status: primary search and inline-answer implementation integrated; research observations below remain historical. Full-app, provider, signed-build, and native-composite qualification are not yet established.**

## Implementation record (2026-10-10)

This section records Zapper behavior and tests, not new Apple observations. The research ledger and proposed reference measurements below retain their original provenance.

- The primary renderer uses a scoped search capsule (520px content, 88px minimum), 10px gap and independently scrollable results region, plus a 420px inline-answer region with a normal-flow follow-up composer. Both stored visual-style choices use this primary layout; legacy/extension/settings views retain their existing shell and saved preferences. Opaque fallback colors are #F5F5F7/#1C1C1E, with system text, neutral selection, 36px answer controls and no decorative background in primary views. Search/results and answer are separate material islands; the gap is nonactionable, not cross-app click-through.
- Main owns a generation/request-ID surface snapshot and applies host bounds and native region geometry together without a size transition (0ms). Renderer measures the actual search/results and intrinsic answer content, excluding capped transcript scrolling from desired height. Public region-bounded NSVisualEffectView is the selected native path; public glass was not qualified. Missing addon/attachment or Reduce Transparency falls back to opaque renderer fill, with a reason in the snapshot. A temporary Electron NSPanel harness attached and updated bounded effect regions and focused an input; it did not establish final compositing, first-click behavior in the complete app, or signed-runtime support.
- Intent is derived once from raw-query/model identity, current candidates, current-query file status, calculator, provider availability and a stable explicit result key. Pending snapshots dispatch nothing. Protected local matches, explicit bang/URL/path/arguments and calculator retain local actions; other nonempty ordinary text defaults to Ask AI when configured. Arrow selection persists through insertion and refuses removed targets. The displayed action and Enter use the same intent; typing alone does not submit AI. File lookup errors retain other results and expose failure text. IME, repeat Enter, Tab precedence, Shift+Tab, modifiers and Cmd+number were exercised in a HookHost keyboard test.
- Inline AI reuses the existing provider IPC and version-1 conversation store. Subscriptions precede first send; request IDs own chunks/terminal events; cancellation persists actual partial content and rejects late events; failure remains separate from answer prose; retry replaces the failed assistant without duplicating the user. Back retains the root query, Close keeps the answer visible during explicit dismissal and hidden-window cleanup cancels without focusing a hidden input. Explicit expansion preserves the same request in the existing full-history UI. No provider connectivity was exercised.
- Main opacity uses 120ms entry/100ms explicit dismissal with cubic-bezier(.2,.8,.2,1); Reduce Motion bypasses both. Host geometry remains instantaneous. Ten locale resources have key and interpolation parity, including the updated secondary-view settings descriptions.

2026-10-10 refinement: invoking primary search now recenters the host horizontally on the invocation display, rather than restoring a saved offset; existing saved coordinates are not deleted, and a manual drag remains effective within the current invocation. An empty query initially shows only the search capsule in either saved launcher mode. Typing reveals results, clearing hides them, and the labeled Show More control inside the capsule can reveal empty-query groups explicitly. Dark search/results/answer regions shade their bounded native material from black at the top to a transparent overlay at the bottom; opaque and Increased Contrast fallback surfaces remain solid. This is a Zapper treatment inspired by the supplied Siri screenshots, not a claim about Apple's material values. The actual React primary component was exercised in a temporary Chromium/Vite fixture against a controlled backdrop: one 520px search region when idle, two regions after typing, one after clearing, and two after Show More. Surface-controller and keyboard-focused tests plus main/renderer builds passed. The new native composite and installed application were not exercised or replaced for this refinement.

Conditional-results fix: after the idle capsule, the results element did not exist when ResizeObserver attached. Typing mounted it without changing the observer effect's dependencies, leaving main at the capsule-only host height and clipping the menu to a strip. The shared visible-results state now reattaches observation after mount/unmount and drives the list's expanded state. The production-hook mount regression requests a nonzero results height, and a temporary Chromium fixture using the real controller and hook measured the host growing from 138px (one region) to 494px (two regions) on input, then shrinking to 138px on clear. The fixture was removed; this does not prove the installed Electron panel until a separately authorized replacement is exercised.

Native material calibration (2026-10-11): user screenshots showed a clear lower edge exposing window text, then a nearly solid black panel. The final dark primary islands keep full bounded NSVisualEffectView with public BehindWindow UnderWindowBackground blur and taper only their CSS black tint from 0.52 at the top through 0.35/0.18 to 0.08 at the bottom. This replaces both the alpha-mask and stronger-tint experiments; the transparent gap is unchanged. UnderWindowBackground and HUD were compared against the same synthetic blue-to-white background; the former retained more restrained color without revealing sharp text. After authorized installation of the unsigned ARM64 package, opening the actual launcher and typing a synthetic "journal" query over a controlled blue window showed a dark-to-blue translucent result panel with the window text hidden by the native effect. The earlier app/text backdrop had looked gray-black because the background itself was dark. This is neither an exact Apple material recipe nor a signed/contrast-matrix qualification. Opaque and Increased Contrast fallbacks remain solid, light material unchanged.

Controlled component evidence (Chromium/Vite, **not** the complete Electron/native composite): [light search](design-system-assets/zapper-primary-search-light-component.png), [dark search](design-system-assets/zapper-primary-search-dark-component.png), [dark inline answer](design-system-assets/zapper-inline-answer-dark-component.png). The fixture used synthetic application/file/query text and was removed after capture. At 568×480 viewport, the search region measured 520px wide and its results began 10px below it; at 468px viewport the answer region measured 420px wide. The answer screenshot exercised Markdown headings, table, code, Copy, Back and a follow-up submission. Axe's fixture audit found no color-contrast violation in the opaque dark search surface; full translucent-composite contrast, VoiceOver and native material optics remain unqualified. Fixture-level document title/language/landmark warnings were fixture scaffolding, not an application accessibility pass.

Verification: launcher intent, keyboard dispatch, surface-controller and AI lifecycle/storage focused tests passed; the non-Electron suite reported 88 passed/1 skipped after removing an obsolete source-text assertion file; strict nine non-English locale parity passed; main TypeScript and main/renderer/native builds passed. Renderer TypeScript still reports 42 diagnostics in pre-existing areas (including Raycast compatibility, the command model and other components), so no clean renderer typecheck is claimed. Full-app activation, global shortcut, real provider stream/failure, second-display relocation, live accessibility preferences, native first-click/composite contrast and signed/hardened ARM64 cold start require separately authorized isolated/runtime prerequisites. The component fixture does not prove those paths.

## Introduction & Design Philosophy

### Primary experience

Zapper should feel like a focused macOS utility: invoke it, type, understand what Enter will do, and get a useful result without moving into a different application context.

The primary reference is **Cmd+Space → search or natural-language request → Enter → an answer in the floating panel**. The standalone Siri conversation-history application is **not** the target layout. Do not turn the launcher into a chat dashboard, add a permanent history sidebar, or require opening the existing AI chat view merely to answer one question.

The native flow was exercised with both an application query and questions. On this machine, the Cmd+Space surface was owned by **Siri AI, `com.apple.campo`**, even though a separate Spotlight process and bundle also existed. This matters: “Spotlight” describes the entry experience, not proof that every visible state belongs to `com.apple.Spotlight`.

### Design decisions

1. **One entry field; explicit intent.** Search and asking AI share the entry point. A quiet inline suffix communicates the impending action: opening a selected item versus asking AI. Never silently send a file search to a model.
2. **Progressive disclosure.** Empty search is a capsule. Results appear in a separate related surface. An AI answer becomes a readable floating response surface, with follow-up input when appropriate.
3. **Native material, restrained foreground.** Use the operating system for desktop-aware material when available. Keep text, selection, geometry, and controls deterministic in the renderer. Do not substitute huge CSS blur values for native glass.
4. **Stable interaction before decorative fidelity.** Preserve global activation, typing, keyboard navigation, IME composition, focus restoration, extension execution, and cancellation before reproducing optical details.
5. **Shared semantics, not identical layouts.** Search, answer, preview, actions, and settings use the same color/type/spacing vocabulary, but their dimensions and window behavior may differ.
6. **Readable fallbacks are first-class.** Opaque, reduced-motion, high-contrast, and native-effect-unavailable modes must remain complete interfaces.

This is a Zapper specification informed by Apple, **not an extracted Apple token library**. Exact public material parameters, Apple routing heuristics, and private view construction were not recovered.

### Evidence language

| Label | Meaning | What it does not imply |
|---|---|---|
| **Observed (O)** | Direct capture, AX state, system query, binary metadata, or inspected repository source | A source branch is not runtime verification; a screenshot is not source code |
| **Documented (D)** | Supported by a linked Apple/Electron public contract, with version where relevant | That Apple uses that API internally, or that a feature works on this machine |
| **Inferred (I)** | Plausible explanation not directly established | A requirement or exact measurement |
| **Proposed (P)** | A deliberate future Zapper design/engineering choice | Existing functionality or Apple’s exact value |

Confidence is independent of category: **H** = direct, well-bounded evidence; **M** = visual estimate or reasonable implementation choice needing validation; **L** = incomplete/ambiguous evidence. A proposed value can be concrete while its visual-match confidence remains medium.

## Research Environment & References

### Local environment

| Property | Observed value | Method / limitation |
|---|---|---|
| OS | macOS **27.0.1**, build **26A434** | `sw_vers`; do not replace with the kernel version or call this Tahoe 26 |
| Architecture / GPU | arm64 / Apple M4 | `uname -m`; `system_profiler SPDisplaysDataType -json` |
| Main display | 1710 × 1107 logical points; 3420 × 2214 rendering pixels; scale 2 | `NSScreen` and display profiler; panel resolution also reported as 2880 × 1864, so physical panel pixels are not the capture conversion factor |
| Main visible frame | AppKit `{{0,0},{1710,1073.5}}` | AppKit uses bottom-left screen coordinates; capture/AX metadata here uses top-left coordinates |
| Secondary display | Sidecar, 1135 × 789 logical; 2270 × 1578 pixels; scale 2 | Present, but no interaction or cross-display placement test performed |
| Appearance | Dark | Read-only `defaults read -g AppleInterfaceStyle` |
| Accessibility display preferences | Reduce Motion false; Reduce Transparency false; Increase Contrast false | Public `NSWorkspace` getters; no preferences changed |
| UI language observed | English controls | Locale/region settings were not changed; filesystem dates in results had their existing formatting |
| Refresh rate reported | 60 Hz | Not an animation/frame-time measurement |

Read-only permission preflights returned true for `AXIsProcessTrusted`, `CGPreflightPostEventAccess`, and `CGPreflightScreenCaptureAccess`. No TCC reset, security-setting change, protected-file modification, debugger injection, or permission bypass was used.

### Project technology stack

The architecture was inspected **before** deriving the design. Versions below distinguish package declarations from installed files; no dependency was installed or upgraded.

| Area | Declared / installed at research time | Responsibility |
|---|---|---|
| Electron | `^41.2.1` / **41.10.7** | Chromium renderer, native BrowserWindow host, IPC, activation, macOS effects |
| React / React DOM | `^18.2.0` / **18.3.1** | Launcher, built-in views, extension compatibility UI |
| TypeScript | `^5.3.3` / **5.9.3** | Main/renderer contracts; native integration orchestration |
| Vite | `^5.0.11` / **5.4.21** | Renderer development/build and code-split entry points |
| Tailwind CSS | `^3.4.1` / **3.4.19** | Utilities mapped partly to semantic CSS variables |
| Native glass wrapper | `electron-liquid-glass` **1.1.1** | AppKit effect view attached behind Electron content |
| Icons / Markdown | Phosphor, Lucide, `react-markdown`, `remark-gfm`, `marked` | Existing icon and content rendering paths; do not add another library for this design |
| Native helpers | Swift executables and an Objective-C++ N-API addon | macOS integration; includes NSWindow animation control |

The launcher is **not a SwiftUI application**. Its foreground controls are Chromium-rendered React. Existing native material does not make DOM text equivalent to vibrant AppKit controls.

### Evidence ledger and assets

The machine-readable record is [research-evidence.json](design-system-assets/research-evidence.json). It contains capture dimensions, crop rectangles, scale, provenance, runtime limitations, and REA artifact digests. Retained native captures have no personal conversation-history sidebar or home-directory paths.

| ID | Evidence | Capture pixels / scale | Established behavior |
|---|---|---|---|
| O01 | [Cmd+Space idle](design-system-assets/panel-idle.png) | 1040 × 190 / 2 | Focused “Search or Ask” field, microphone control, capsule surface |
| O02–O03 | [Results and Down-selected folder](design-system-assets/panel-results-selected.png) | 1040 × 1016 / 2 | Application/folder/document results, category chips, neutral selection, inline selected-result intent |
| O04 | [Question with Ask Siri intent](design-system-assets/panel-prompt-intent.png) | 1040 × 176 / 2 | Natural-language question is classified as an AI request before Return |
| O05 | [AI loading](design-system-assets/panel-ai-loading.png) | 500 × 200 crop from 3420 × 2148 / 2 | Small activity capsule; AX says “Looking into it” |
| O06 | [Inline arithmetic response](design-system-assets/panel-ai-calculation.png) | 840 × 350 / 2 | “What is 7 times 8?” → answer/card/Copy in floating surface |
| O07 | [Inline prose response](design-system-assets/panel-ai-answer.png) | 840 × 1202 / 2 | “Why is the sky blue?” → scrollable answer, headings, sources, follow-up field |
| O08 | Escape after O07 | AX observation, no image | Subsequent query found no on-screen panel window |
| O09 | [Standalone Siri empty pane, secondary only](design-system-assets/siri-standalone-empty-secondary.png) | 1008 × 1044 crop from 1680 × 1044 / 2 | Separate application surface; deliberately not the launcher design |
| D01 image | [Apple’s macOS 27 Spotlight illustration](design-system-assets/apple-spotlight-27-reference.png) | 974 × 646; HTML presents 487 × 323; capture scale unknown | Light-material, selected action, inline arguments; **not a local screenshot** |

The Apple illustration is copyrighted Apple material retained as an attributed research reference, not a Zapper distributable UI asset. [Original image](https://ipcdn-web.apple.com/assets/v2/web/41f5b833-3bf6-480c-8010-1fd8ea421ed2). Do not ship it or the native screenshots as product graphics.

### Measurement protocol

- Use original PNG dimensions, not the resized image shown in an agent transcript or Markdown preview.
- For admitted local captures, **logical length = source pixel length / 2**. A crop preserves that scale. For example, O04’s 1040-pixel width corresponds to a 520-point captured window.
- Window-frame numbers come from explicit-window AX/CG observations after settling. They are not necessarily the opaque-content bounds, visible shadow bounds, or default sizes for another user.
- Internal visual measurements below use visible edges/baselines in the original raster, divided by 2, with approximately **±2 points for spacing/edges** and **±4 points for radius estimates**. Font size cannot be recovered exactly from glyph ink height.
- These are window-only ScreenCaptureKit/`screencapture` images. Desktop backdrop contributions may be absent or appear dark. **Do not sample their black background and claim it is Apple’s material color.** No exact blur kernel, saturation, opacity, or shadow falloff is recovered.
- Some transition captures temporarily reported a 1710 × 1074 window and full-display backing extent. Only the small visible activity capsule is relevant; this is **not** a fullscreen content specification.
- No frame-timed recording was made. Waits used to obtain captures are not measured animation durations or service latency.
- The light/dark comparison is asymmetrical: local dark observations plus an Apple light illustration. Light appearance on the local build was not exercised.

### REA investigation

REA **6.3.0**, already available in the npm cache, was used through its CLI. `doctor --client omp` reported missing/drifted MCP registration; no configuration repair or installation was necessary for the static CLI inspections.

`inspect-macho` verified the shipped Spotlight and Siri AI artifacts. Both reported minimum OS/SDK 27.0. Spotlight’s imports included AppKit, Swift runtime, `SpotlightUIInternal`, and `SpotlightUIShared`. This establishes dependencies, **not** which framework draws a particular control, a material recipe, or use of a public API by Apple.

REA’s `observe-native-ui` could not bind the Siri process to a stable launch-time identity; the attempted hidden Spotlight window also failed exact-window validation. Runtime observation therefore used Orca AX/ScreenCaptureKit and already-authorized public macOS input APIs. Initial Orca shortcuts targeted a standard Siri window and occasionally returned a new-dialog tree with old-window geometry. Those mismatched captures were excluded. Explicit panel window **35869**, owner `com.apple.campo`, yielded the admitted O01–O08 evidence. Runtime IDs are historical and must be rediscovered in a later session.

### Public references

| Ref | Source | Use / version boundary |
|---|---|---|
| D01 | [Find what you need with Spotlight](https://support.apple.com/guide/mac-help/find-what-you-need-with-spotlight-mchlp1008/mac) | macOS 27 page fetched during research: search, Quick Actions, question + Return to Siri AI |
| D02 | [Spotlight on Tahoe 26](https://support.apple.com/guide/mac-help/search-with-spotlight-mchlp1008/26/mac/26), [26 keyboard shortcuts](https://support.apple.com/guide/mac-help/spotlight-keyboard-shortcuts-mh26783/26/mac/26) | Historical version; category shortcuts, Quick Look, search scoping; not a local 27 behavior test |
| D03 | [Siri AI app](https://support.apple.com/guide/mac-help/siri-ai-use-the-siri-app-q7ny3g54v9lk/mac), [Siri activation on 27](https://support.apple.com/guide/mac-help/turn-on-and-activate-siri-mchlb66b4ad6/27/mac/27) | Distinguishes Siri AI Beta and Classic; availability depends on device/language/region |
| D04 | [Siri with Apple Intelligence on 26](https://support.apple.com/en-au/guide/mac-help/mchl0f933212/26/mac/26), [Type to Siri accessibility on 26](https://support.apple.com/en-au/guide/mac-help/mchl5715a9f2/26/mac/26) | Older input behavior; no Apple Intelligence does not imply typing is impossible |
| D05 | [NSVisualEffectView](https://developer.apple.com/documentation/appkit/nsvisualeffectview), [materials](https://developer.apple.com/documentation/appkit/nsvisualeffectview/material-swift.enum) | Semantic material, behind-/within-window blending, foreground vibrancy |
| D06 | [NSGlassEffectView](https://developer.apple.com/documentation/appkit/nsglasseffectview), [contentView](https://developer.apple.com/documentation/appkit/nsglasseffectview/contentview), [effectIsInteractive](https://developer.apple.com/documentation/appkit/nsglasseffectview/effectisinteractive) | Public class from macOS 26; interactive property documented from 27; content-view composition matters |
| D07 | [SwiftUI glassEffect](https://developer.apple.com/documentation/swiftui/view/glasseffect(_:in:)) | Public native alternative from macOS 26, not evidence of the inspected app’s implementation |
| D08 | [NSColor](https://developer.apple.com/documentation/appkit/nscolor), [system NSFont](https://developer.apple.com/documentation/appkit/nsfont/systemfont(ofsize:weight:)) | Semantic color and system typography; no official Spotlight point-size table |
| D09 | [Reduce Motion](https://developer.apple.com/documentation/appkit/nsworkspace/accessibilitydisplayshouldreducemotion), [Reduce Transparency](https://developer.apple.com/documentation/appkit/nsworkspace/accessibilitydisplayshouldreducetransparency), [display-change notification](https://developer.apple.com/documentation/appkit/nsworkspace/accessibilitydisplayoptionsdidchangenotification) | Read preferences and observe the workspace notification center |
| D10 | [NSWindow collectionBehavior](https://developer.apple.com/documentation/appkit/nswindow/collectionbehavior-swift.struct) | Spaces/Mission Control/fullscreen policy, not Spotlight’s exact flags |
| D11 | [Electron transparent windows](https://www.electronjs.org/docs/latest/tutorial/custom-window-styles#transparent-windows), [window options](https://www.electronjs.org/docs/latest/api/structures/base-window-options), [BaseWindow](https://www.electronjs.org/docs/latest/api/base-window) | Transparency/vibrancy, hit testing, shadows, resize and workspace caveats |
| D12 | [Electron systemPreferences](https://www.electronjs.org/docs/latest/api/system-preferences), [nativeTheme](https://www.electronjs.org/docs/latest/api/native-theme) | System colors and accessibility signals; check availability against the installed Electron version |

Public pages can change. The macOS 26 URLs are pinned; unversioned pages were macOS 27 when fetched. Local Electron 41.10.7 declarations were checked for `getAnimationSettings`, `getColor`, `nativeTheme.prefersReducedTransparency`, and the deprecated `accessibilityDisplayShouldReduceTransparency` property. Reading declarations is not a runtime signal-propagation test.

## Spotlight UI Analysis

### Scope: the search experience in this installation

The active Cmd+Space experience is the combined “Search or Ask” panel. A standalone Spotlight bundle is present, but its separate UI was not switched on by changing Siri settings. Do not relabel the inspected combined interface as a classic Spotlight implementation.

| State | Local observation | Evidence strength / remaining boundary |
|---|---|---|
| Initial / empty query | Capsule with large left-aligned placeholder, focused caret, trailing microphone | O01, H; not a recent-items browser |
| Typing an application name | `Calculator` produces an application, folders, and documents; application initially selected | O02, H; index contents are machine-specific |
| Selected result | Neutral rounded highlight; primary/secondary text and icon stay aligned; inline input suffix changes with selection | O03, H |
| Keyboard navigation | Down moves from Calculator to a folder and AX focus moves to the result collection | O03, H; full key matrix not exercised |
| Different categories | Dictionary / Applications / Folders chips and application/folder/document result kinds visible | O03, H; chip filtering itself not exercised |
| Natural-language question | `Why is the sky blue?` displays an inline “— Ask Siri” intent; no separate chat launch required | O04, H |
| No conventional match | Question resolves to Ask Siri rather than a generic zero-results view | O04, H for this question; not proof of arbitrary nonsense/no-network behavior |
| Loading / result refresh | Earlier result content can remain while the changed query settles; Enter leads to an explicit activity state | O05; no measured debounce/latency or universal stale-results rule |
| Expanded / preview | Result area expands; long AI response scrolls | O03/O07; native Quick Look was not activated |
| Quick Actions | Supported by D01; light illustration shows inline action arguments and selected action | Documented, not exercised locally; do not copy 26 shortcuts blindly |
| Dismissal | Escape after response removes the visible panel | O08; full multi-Escape search behavior remains unverified |

### Geometry and layout

| Element | Observed frame or visual estimate | Method / confidence |
|---|---|---|
| Idle captured frame | 520 × 95 pt at x 595, y 251 | O01 metadata, H; includes more than the visible capsule |
| Settled question frame | 520 × 88 pt at x 595, y 251 | O04 metadata, H |
| Results captured frame | 520 × 508 pt at x 595, y 251 | O03 metadata, H; content-dependent height, not a global maximum |
| Search visible capsule | Approximately 86–88 pt high; radius approximately 40–44 pt | O03/O04 raster, M; continuous native curvature is not a measured CSS circular radius |
| Gap between search and result surfaces | Approximately 10 pt | O03 raster: search bottom near pixel 174; result top near 194; M |
| Results surface corners | Approximately 28–34 pt | O03 raster, M |
| Result row pitch / selection height | Approximately 62 pt | O03 repeated rows and selected fill, M |
| Result selected-fill horizontal inset | Approximately 12 pt | O03 fill starts near source x 24 px, M |
| Result icon box | Approximately 32–36 pt | O03 app/folder icons; differing artwork has differing optical bounds, M |
| Text-column start | Approximately 78–80 pt from surface left | O03 source x 156–160 px, M |
| Query leading inset | Approximately 38 pt | O04 source x 76 px, M |
| Category chip band | Approximately 26 pt high; approximately 8 pt inter-chip gap | O03 raster, M |
| Horizontal placement | Search center x 855 on a 1710-point display | O01/O04 metadata, H for this placement only |

The search field and results are **two visually separated material regions**, not one rectangular card with a dividing line. The same top anchor survives typing and selection in the admitted search captures. The response uses a different size/position; see Siri analysis.

### Material, color, and typography

- **Observed:** fine luminous edge, dark neutral interior in the isolated capture, soft rounding, no heavy separator between every result. Selected rows are a lighter neutral fill rather than a saturated accent block. Trailing key hints are smaller and lower contrast.
- **Observed:** selected folder title is visibly stronger than its secondary date/path metadata. Long names and accessories share a constrained row rather than pushing its icon out of alignment. Search text is much larger than the current Zapper search text.
- **Estimated:** query text resembles a system sans at approximately 22–24 pt; root result primary approximately 16–17 pt; metadata approximately 13–15 pt. These are glyph-based estimates, not recovered font descriptors. Exact family instance, optical-size axis, line-height, tracking, and weights are unknown.
- **Documented:** system font and semantic colors are appropriate public construction tools (D08). This does not establish Apple’s exact internal font calls.
- **Unknown:** exact material, tint, blur radius, alpha, physical shadow bounds, hover fill, and light-mode counterparts on this build. Window-only captures cannot solve these by pixel sampling.
- **Documented visual comparison:** D01’s light illustration is translucent, takes on wallpaper color, and uses a neutral selected-action region and blue editable argument emphasis. It is a different state from O03, not a controlled light/dark pair.

### Behavior not to accidentally import

Tahoe 26 documents Cmd+1…4 as category shortcuts and Tab for scoping, while current Zapper uses Cmd+1…9 for quick launch and Tab for arguments/autocomplete/AI. Appearance work is not permission to change those contracts. Quick Look on Space also cannot override normal spaces in a focused text field. Version-aware interaction changes need separate acceptance criteria.

## Siri UI Analysis

### Inline AI is the primary Siri reference

The successful scenario was:

1. Invoke Cmd+Space.
2. Enter a benign question.
3. Observe **Ask Siri** as the inline intended action.
4. Press Return.
5. Observe a processing state.
6. Receive the answer in a **floating system-dialog surface**, still window 35869, not the standalone history window 35872.

Two examples were verified: arithmetic (`What is 7 times 8?`) and open-ended prose (`Why is the sky blue?`). Apple’s exact classifier, thresholds, model, search provider selection, and routing implementation remain unknown. Do not infer that every query with spaces or a question mark is always an AI prompt.

### State inventory

| State | Observed construction | Implication for Zapper |
|---|---|---|
| Idle activation | Large entry capsule; small microphone; focused caret with a subtle luminous treatment | Search remains the central affordance; any AI identity treatment is subordinate |
| Prompt-ready | Query plus lower-contrast inline “— Ask Siri” suffix | Show the current Enter action before submission; suffix is not part of the editable query |
| Processing | Smaller capsule with a ring of bright dots; AX “Searching” or “Looking into it” | A compact task-status presentation, not an empty chat transcript; exact motion unmeasured |
| Short answer | 420 × 175 pt frame; answer sentence, inset calculator card, Copy control | Fit short content; do not reserve 600 pt of empty space |
| Long answer | 420 × 601 pt frame; vertically scrolling body, headings, source chips, close/expand controls, follow-up input | Distinct response typography and scrolling; retain a clear return/close route |
| Follow-up ready | `Ask Siri` field focused in the response surface; attachment and voice controls | Follow-up stays in context; attachments are not a requirement to add to Zapper |
| Voice interface | Microphone present in the primary entry surface; standalone voice-mode AX toggled on and replaced the text field | Primary voice activation visuals not fully characterized; never claim waveform/recognition parity |
| Dismissed | Escape after long answer removes the on-screen panel | Restore launcher lifecycle/focus predictably; do not create a second immortal overlay |

### Geometry and visual hierarchy

| Element | Observed / estimated | Confidence |
|---|---|---|
| Short answer frame | 420 × 175 pt, x 644/y 222 | O06 metadata, H |
| Long answer frame | 420 × 601 pt, x 645/y 226 | O07 metadata, H; not a demonstrated maximum |
| Response horizontal center | Approximately the same screen center as search | O04/O06/O07 metadata, H |
| Response corner shape | Rounded rectangle, estimated radius 30–40 pt | Raster, M |
| Long answer text inset | Approximately 30 pt | O07 source x 60 px, M |
| Long answer body | Estimated 15–16 pt glyph sizing; approximately 18–20 pt line pitch | O07 raster, M; not exact font metrics |
| Section heading | Estimated 20–22 pt, stronger weight than body | O07 raster, M |
| Close / expand circular controls | Approximately 36 pt diameter, inset approximately 16 pt | O07 raster, M |
| Follow-up capsule | Approximately 36 pt high, flanked by circular controls | O07 raster, M |
| Source chips | Compact pill-shaped labels beneath relevant paragraphs | O07, H for structure; exact sizes not measured |

The native search → answer transition **narrows from 520 to 420 pt and moves upward slightly** in these observations. No exact animation duration, spring, or focus-transition timeline was measured. The capture’s follow-up bar overlaps the visible scrolling text region; Zapper should reserve readable bottom space rather than copying text occlusion.

### Separate Siri application: deliberately secondary

A standard-window Siri app also exposed a sidebar, toolbar, empty detail state, and composer. A benign arithmetic request returned a textual answer and calculator card. Voice mode switched the AX toggle to 1 and removed the field; Escape restored the field/toggle 0. No spoken-input recognition test was performed.

Its 840-point-wide window and 336-point sidebar **must not become launcher tokens**. A later window-height change was observed without controlled attribution and is not evidence of Siri’s automatic sizing. The cropped O09 reference is retained only to distinguish this application from the requested floating panel.

### Version distinctions

- **Local 27.0.1:** combined entry surface and inline Siri AI answers were observed.
- **Public macOS 27 docs:** describe Siri AI Beta and Classic, and asking a question from Spotlight with Return (D01/D03). Enrollment/availability is conditional; local successful queries do not establish worldwide availability.
- **Tahoe 26 with Apple Intelligence:** documentation describes its newer Siri field, answers below, and double-Command typing (D04). Do not substitute it for local Cmd+Space geometry.
- **Without Apple Intelligence:** Accessibility Type to Siri is documented in 26. Do not invent a voice-only limitation.
- **Earlier/classic visuals:** not measured here. No Siri orb, screen-edge glow, or historical waveform should be called an observed feature of this local flow.

## Shared Visual Language

| Principle | Search/results | Inline AI | Zapper decision |
|---|---|---|---|
| Material | Floating capsule plus result surface | Activity capsule then response surface | Share material roles; allow separate geometry |
| Typography | Large query, compact row hierarchy | Readable body, headings, sources | Share font family and semantic contrast, not every size |
| Emphasis | Neutral selection and action suffix | Response content and task state | Reserve accent for actionable/focus/status meaning |
| Density | Repeated aligned rows | Content-dependent paragraphs/cards | Separate row and prose layout tokens |
| Interaction | Keyboard-first selection and execution | Submit, cancel, scroll, follow up | One predictable lifecycle; no forced history UI |
| Motion | Content expansion and selection change | Intent → activity → answer | State continuity; no decorative perpetual motion |
| Color / identity | Mostly neutral | Subtle activity/caret treatment | No mandatory rainbow border around every component |

**Recommended direction:** reproduce the compact native search-and-answer grammar, not every Apple optical effect. Use two related surfaces for root search/results, a centered response surface for AI, and the existing larger host for extension/detail workflows. Keep the standalone chat/history view available where it already belongs, but do not make it the destination for every launcher question.

## Design Foundations & Tokens

### Naming and authority

Tokens below are **Proposed Zapper defaults** unless explicitly marked otherwise. They are implementable choices, not recovered Apple constants. Measurements remain in the analysis tables rather than being silently promoted to design truth.

Canonical names use `category.role.property`. CSS mapping: `layout.launcher.width` → `--sc-layout-launcher-width`. Keep the existing `sc-*` compatibility namespace; do not rename stored preferences or extension contracts as visual cleanup.

A future token representation must retain value, unit, evidence, and confidence. For example, the documentation schema can be expressed without introducing a runtime abstraction:

```ts
type EvidenceClass = 'observed' | 'documented' | 'inferred' | 'proposed';
type Confidence = 'high' | 'medium' | 'low';
type DesignToken<T> = {
  value: T;
  unit?: 'px' | 'ms' | 'ratio';
  purpose: string;
  evidenceClass: EvidenceClass;
  evidence: string[];
  confidence: Confidence;
};
```

Use existing CSS variables for production styling. A separate JavaScript token framework is not required. Geometry shared with a native bridge or virtualizer must have one authoritative numeric source, not manually repeated CSS/TS/native literals.

**Units:** layout values are CSS px at renderer zoom 1, corresponding nominally to logical points. Device pixels are only for raster verification. Type/line-height tokens should scale with the existing font-size preference; dimension tokens are minimums where text can grow. All size/radius/spacing/motion/layer values are identical in light/dark appearance unless a row says otherwise.

### Material and opacity roles

| Token | Value / fallback | Purpose | Basis / confidence |
|---|---|---|---|
| `surface.search.material` | Native regular glass where validated; semantic under-window visual effect fallback; opaque fallback last | Desktop-aware root entry surface | P-M; O01/O04 shape, D05/D06 APIs; exact Apple material unknown |
| `surface.results.material` | Same material family as search; separate bounded region | Results visually related but separated by a transparent gap | P-M; O03 |
| `surface.answer.material` | Same native family with a readability scrim only if contrast requires it | Stable prose/background separation | P-M; O06/O07 |
| `surface.preview.material` | Opaque content background inside parent surface | Images/documents must not mix unpredictably with desktop | P-M; content readability, D05 |
| `surface.menu.material` | Semantic popover material; opaque menu fallback | Transient action menu, not another whole-window glass layer | P-M; D05 |
| `surface.search.nativeTint` | Unset initially; no per-component tint overrides | Let semantic material react to environment | P-M; D05/D06, avoids guessing a private recipe |
| `surface.search.scrimOpacity` | 0 initially; calibration allowance 0–0.12 | Optional foreground readability correction, never whole-window opacity | P-M; not a measured Apple alpha |
| `surface.fallback.opacity` | 1 | Reliable unsupported/reduced-transparency path | P-H; D09 |
| `surface.webOverlay.blur` | 20px only for content behind an overlay **inside the same web document**; 0 when native owns that region | Optional web popover treatment | P-M; D11; not desktop blur |
| `surface.native.blur` | System-controlled; no numeric CSS token | Avoid a fake “Apple blur radius” contract | D-H for public material semantics |
| `opacity.disabled` | 0.55 for control chrome only; readable explanatory text uses secondary color | Disabled state without deleting hierarchy | P-M; existing reusable-control convention |
| `opacity.decorativeBackground` | 0 in native-reference mode | Prevent wallpaper overlays from competing with native material | P-M; preserves user setting in other existing styles |

Native material must not receive both a full opaque renderer fill and an additional renderer backdrop blur. Reduced Transparency overrides every translucent branch, including detached menus. An opaque fallback is genuine accessible rendering, not a claim that native glass succeeded.

### Semantic colors

These sRGB values define the **opaque renderer fallback palette**. They are not samples of Apple glass. Use the same foreground roles over native material only after checking final composite contrast; increase scrim/opacity when necessary.

| Token | Light | Dark | Purpose / evidence / confidence |
|---|---|---|---|
| `color.surface.base` | `#F5F5F7` | `#1C1C1E` | Neutral opaque fallback; P-M, macOS-like neutrality, not exact system color |
| `color.surface.inset` | `#EBEBEF` | `#141416` | Preview/calculation inset; P-M, O06 hierarchy |
| `color.surface.raised` | `#FFFFFF` | `#2C2C30` | Menus and elevated controls; P-M |
| `color.text.primary` | `#1D1D1F` | `#F5F5F7` | Query, titles, answer body; P-M, O03/O07 + D08 roles |
| `color.text.secondary` | `#56565C` | `#B8B8BE` | Descriptions, intent suffix, sources; P-M |
| `color.text.tertiary` | `#606066` | `#A2A2A9` | Supporting metadata; P-M; chosen to retain 4.5:1 contrast on the listed opaque surfaces, including selection |
| `color.text.disabled` | `#99999F` | `#737379` | Inactive chrome only; P-M; not an informational-text contrast guarantee |
| `color.selection.background` | `#DDDEE2` | `#38383D` | Active root result, neutral not saturated; P-M, O03 |
| `color.selection.foreground` | `color.text.primary` | `color.text.primary` | Selection does not invert the entire text hierarchy; P-M |
| `color.selection.inactive` | `#E7E7EB` | `#303034` | Retain context while a child overlay owns focus; P-M |
| `color.hover.background` | `#ECECF0` | `#29292E` | Pointer affordance weaker than selection; P-M, proposed, native hover unmeasured |
| `color.accent` | System accent; fallback `#005BC4` | System accent; fallback `#78B7FF` | Focus/link/explicit action, not every selected row; P-M + D12 |
| `color.onAccent` | `#FFFFFF` for fallback | `#101114` for fallback | Text on fallback accent; P-M; recompute contrast for actual system accent |
| `color.status.success` | `#176D3A` | `#7BD59A` | Success with icon/text; P-M |
| `color.status.warning` | `#835500` | `#E9C46A` | Caution with explanation; P-M |
| `color.status.error` | `#B3261E` | `#FF9D97` | Error and recovery affordance; P-M |
| `color.separator` | `rgba(0,0,0,.12)` | `rgba(255,255,255,.14)` | Section/preview boundary when spatial grouping is insufficient; P-M |
| `color.surface.stroke` | `rgba(0,0,0,.12)` | `rgba(255,255,255,.16)` | Thin outer fallback edge; P-M, O01/O03 edge, alpha proposed |
| `color.surface.highlight` | `rgba(255,255,255,.65)` | `rgba(255,255,255,.10)` | Optional inner highlight in CSS fallback only; P-M |
| `color.focus` | System keyboard-focus-indicator; accent fallback | Same semantic source | Keyboard focus independent of selection; P-H for semantic intent, D12 |

System `label`, `secondary-label`, `separator`, `selected-content-background`, and `keyboard-focus-indicator` colors are available inputs through Electron. Do not blindly map the OS’s saturated selected-content color to the neutral root-result role. If the user forces a different app theme, resolve colors for that effective appearance or use the explicit fallback palette; do not mix dark system label values into a light app surface.

### Geometry, spacing, borders, and shadows

| Token | Proposed default | Purpose | Basis / confidence |
|---|---|---|---|
| `layout.launcher.width` | 520px; clamp to work-area width minus 48px | Root search/results content width | P-H for chosen default, O01/O03 measured width; other displays unverified |
| `layout.answer.width` | 420px; same horizontal center; clamp to available width | Compact AI answer | P-M; O06/O07, must grow if enlarged type requires it |
| `layout.extension.width` | 760px initially | Preserve existing rich extension/form workspace | P-H; current main-window width, not native Spotlight geometry |
| `layout.panel.maxHeight` | `min(600px, workArea.height - 48px)` | Long response / expanded content cap | P-M; O07 near 601pt, screen-bound safety |
| `layout.results.maxHeight` | 420px, also constrained by overall cap | Root result scrolling | P-M; accommodates observed row density without expanding to desktop height |
| `layout.search.height` | 88px minimum | Large input capsule | P-M; O04 measured frame and O03 visual height |
| `layout.search.resultsGap` | 10px | Transparent separation of material regions | P-M; O03 estimated gap |
| `layout.panel.topFraction` | 0.20 of selected display work area, plus work-area origin | Initial vertical placement | P-M; near observed placement; existing Zapper convention |
| `layout.panel.screenMargin` | 24px | Keep controls/shadow away from display edges | P-M |
| `layout.panel.shadowInset` | 24px if CSS shadow is used; 0 if native shadow owns exterior | Prevent BrowserWindow clipping a CSS shadow | P-M; D11, do not double-apply |
| `layout.result.height` | 60px minimum | Comfortable root result row | P-M; O03 approximately 62pt |
| `layout.result.compactHeight` | 36px minimum | Existing extension dense-list variant | P-H for preserving current virtualizer metric; must expand consistently for larger fonts |
| `layout.section.height` | 28px minimum; dense extension variant 24px | Group header | P-M; existing virtualizer header 24 and proposed readable root role |
| `layout.followup.height` | 36px minimum | Inline answer composer | P-M; O07 estimate |
| `layout.control.hitTarget` | 32px minimum; 36px for primary icon buttons | Pointer/keyboard control target | P-M; O07 approximately 36pt, usability choice |
| `layout.preview.minWidth` | 280px within the 760px rich-content shell | Preview readability | P-M; existing detail sidebar lower bound; not required beside 520px root search |
| `radius.search` | 44px, clamped to half the current height | Capsule silhouette | P-M; O04 estimated 40–44pt |
| `radius.results` | 32px | Expanded results surface | P-M; O03 estimated 28–34pt |
| `radius.answer` | 32px | AI response outer surface | P-M; O06/O07 estimated 30–40pt |
| `radius.result` | 24px | Comfortable selected row | P-M; O03 large rounding; circular CSS approximation |
| `radius.result.compact` | 8px | Dense extension selected row | P-M; density-specific variant, not global Tailwind override |
| `radius.control` | 10px | Non-capsule form/menu controls | P-M; existing shared-control convention |
| `radius.keycap` | 5px | Shortcut hint | P-M; compact visual role |
| `radius.pill` | 999px | Chips and small capsule controls | P-M; radius semantically constrained by height |
| `stroke.surface` | 1px CSS | Outer fallback edge | P-M; perceptual edge, not a claimed one-device-pixel Apple stroke |
| `stroke.separator` | 1px CSS | Internal separation | P-M |
| `stroke.focus` | 2px CSS with 2px offset | Visible keyboard focus | P-M; accessibility requirement |
| `shadow.panel` | Light `0 12px 36px rgba(0,0,0,.18)`; dark `0 12px 36px rgba(0,0,0,.38)` | Fallback exterior separation | P-L for native fidelity; native shadow was not measured |
| `shadow.menu` | Light `0 6px 20px rgba(0,0,0,.16)`; dark `0 6px 20px rgba(0,0,0,.32)` | Secondary elevation | P-M; product hierarchy, not Apple measurement |

**Spacing primitives:** `space.2=2`, `space.4=4`, `space.8=8`, `space.10=10`, `space.12=12`, `space.16=16`, `space.20=20`, `space.24=24`, `space.32=32`, `space.36=36`, `space.40=40` (px). All are P-M product choices; `10/12/36` accommodate the observed gap, result inset, and input/control geometry. Do not use the scale as permission to choose randomly.

| Semantic spacing token | Alias | Purpose / rationale / confidence |
|---|---|---|
| `spacing.search.inline` | `space.36` | Query/capsule inset; close to observed 38pt; P-M |
| `spacing.results.inset` | `space.12` | Selected fill clearance to surface edge; P-M, O03 |
| `spacing.result.inline` | `space.16` | Content inset inside selected fill; P-M |
| `spacing.result.iconGap` | `space.16` | Icon/text alignment; P-M, O03 approximately 18pt |
| `spacing.result.textGap` | `space.2` | Title/description separation; P-M |
| `spacing.section.before` | `space.12` | Separate result groups without per-row rules; P-M |
| `spacing.answer.inline` | `space.32` | Prose inset; P-M, O07 approximately 30pt |
| `spacing.answer.block` | `space.16` | Paragraph/source/card rhythm; P-M |
| `spacing.answer.headingBefore` | `space.24` | Prose heading hierarchy; P-M |
| `spacing.followup.inset` | `space.16` | Composer and neighboring controls; P-M |
| `spacing.control.gap` | `space.8` | Related controls/chips; P-M |

A surface’s content width excludes optional CSS-shadow padding. With a 520px content width and a 24px external inset on both sides, a fallback BrowserWindow would need 568px width. Do not accidentally compare that host rectangle to O04’s captured native content frame.

### Typography and icons

Font family: use the macOS system sans through `-apple-system, BlinkMacSystemFont, "SF Pro Text", "SF Pro Display", system-ui, sans-serif`; no bundled font is required. This is P-H for platform integration, not proof of the exact font instance in Apple’s screenshots. Tracking defaults to `normal`; do not bake in estimated negative letter spacing.

Sizes below are default-scale CSS px; implement scalable type and line-height together. A 16px root can express these as rem. Preserve existing user font preferences rather than forcing every user back to 16px.

| Token | Size / line-height / weight | Purpose | Basis / confidence |
|---|---|---|---|
| `typography.search` | 22 / 28 / 400 | Query and placeholder | P-M; O04 estimated 22–24pt |
| `typography.search.intent` | Same metrics as search; secondary color | Inline Enter action, outside editable value | P-M; O04 |
| `typography.result.primary` | 16 / 20 / 500 | Root result title | P-M; O03 |
| `typography.result.secondary` | 13 / 18 / 400 | Metadata/description | P-M; O03, readability over literal dimness |
| `typography.result.compact` | 13 / 18 / 500 | Dense extension row | P-H for preserving existing metrics; future scaling must update virtualizer |
| `typography.section` | 12 / 16 / 500 | Sentence-case group labels | P-M; avoid current arbitrary all-uppercase emphasis |
| `typography.control` | 13 / 18 / 400 | Filters, menus, buttons | P-M; shared control rhythm |
| `typography.shortcut` | 11 / 14 / 400 | Shortcut hints | P-M; secondary foreground, no decorative tracking |
| `typography.answer.body` | 16 / 22 / 400 | Readable AI prose | P-M; slightly roomier than O07 estimated line pitch |
| `typography.answer.heading` | 20 / 26 / 600 | Response sections | P-M; O07 |
| `typography.answer.result` | 28 / 34 / 500 | Short calculator/conversion result | P-M; O06 emphasis |
| `typography.caption` | 12 / 16 / 400 | Source labels/nonessential supporting text | P-M |
| `typography.monospace` | 13 / 18 / 400; `ui-monospace, "SF Mono", Menlo, monospace` | Code/technical values only | P-M; existing platform convention |
| `icon.result.size` | 36px comfortable; 20px compact | Root versus dense extension icon boxes | P-M from O03 / current root 20px |
| `icon.control.size` | 18px, inside a ≥32px hit target | Search/clear/menu controls | P-M |
| `icon.status.size` | 16px | Spinner/status symbol | P-M |
| `icon.stroke.width` | 1.5px at an 18px vector box | Coherent monochrome control icon weight | P-M; not an SF Symbols extraction |

Use real application/file icons through existing paths. Preserve their artwork; do not recolor all app icons or draw a generic tile around each. Choose one existing control-icon family for each cohesive surface. Do not redistribute SF Symbols/SF font assets without checking their license and intended platform use.

Primary and secondary result text are each one line by default, with ellipsis; maintain the full accessible name. Prose wraps and remains selectable. URLs/code need overflow handling rather than widening the window. Never infer font size from a screenshot’s scaled preview.

### Motion and layering tokens

| Token | Proposed value | Purpose / evidence / confidence |
|---|---|---|
| `motion.panel.enter.duration` | 120ms | Opacity entrance; P-M, Apple timing unknown |
| `motion.panel.exit.duration` | 100ms | Opacity exit; P-M |
| `motion.panel.resize.duration` | 180ms | Coordinated content/host geometry transition; P-M, O03/O07 establish transition endpoints only |
| `motion.panel.easing` | `cubic-bezier(.2,.8,.2,1)` | Short deceleration; P-M, not a measured Apple curve |
| `motion.selection.duration` | 0ms for keyboard target; 80ms optional fill interpolation | Immediate navigation; P-M |
| `motion.hover.duration` | 100ms | Pointer background feedback only; P-M |
| `motion.control.press.duration` | 80ms; opacity/fill, no mandatory translation | Press feedback; P-M |
| `motion.loading.revealDelay` | 150ms visual delay, semantic busy state immediate | Avoid tiny spinner flashes; P-M, not native latency |
| `motion.loading.cycle` | 800ms if animated | Determinate location, indeterminate work; P-M |
| `motion.reduced.duration` | 0ms; no translation/scale/morph | Respect Reduce Motion in every layer; P-H, D09 |
| `layer.material` | 0 within renderer stacking context | Base native/CSS region; P-H |
| `layer.content` | 10 | Search/results/answer content; P-H, existing surface convention |
| `layer.stickyControl` | 20 | Header/footer/composer within surface | P-H |
| `layer.popover` | 40 | Action/filter menu above content | P-H |
| `layer.modalScrim` | 50 | In-window modal barrier | P-H |
| `layer.modal` | 60 | In-window modal content | P-H |
| `layer.tooltip` | 70 | Noninteractive help, never above native modal ownership | P-H |

CSS layer numbers have **no relationship** to CoreGraphics/NSWindow levels. OS window levels are a main-process policy; do not set Zapper to `screen-saver` merely to imitate native stacking.

## Component Specifications

All component values resolve through the tokens above. Dimensions are default-scale minimums, not justification to clip enlarged/localized text. Every interactive component needs normal, keyboard-focus, disabled, and error/busy states where meaningful.

### Main search host and material regions

- **Appearance:** search capsule; separate results region after `layout.search.resultsGap`; centered answer region in AI state. No launcher title bar, permanent navigation rail, or history sidebar.
- **Sizing:** root width 520, answer 420, rich extension 760; bound height to work area. Search stays top-anchored while results grow downward. AI response may narrow around the same horizontal center; do not imitate an unmeasured upward bounce.
- **Material:** `surface.search/results/answer.material`; one material owner per region. The gap must be genuinely transparent if targeting O03’s geometry.
- **States:** hidden, idle, searching, results, prompt-ready, AI-processing, AI-answer, recoverable error, child overlay. Keep background/no-view runners independent of these visual states.
- **Interaction:** only explicit activation takes focus. Escape dismisses topmost in-window overlay first; then follows the active search/AI lifecycle. Clicking content must work on first mouse activation.
- **Motion:** opacity and bounded geometry transitions; no fullscreen content expansion copied from capture metadata.
- **Accessibility:** semantic combobox/listbox in search; response region with heading and follow-up field in AI. Hide inactive state trees from accessibility.

### Search input and intent suffix

- `layout.search.height`, `radius.search`, `spacing.search.inline`, `typography.search`; no inset input box inside the capsule.
- Intent suffix uses `typography.search.intent` and is not inserted into the editable value, copied text, query history, or provider prompt.
- Placeholder is not an accessible label. Supply a stable localized name and instructions for the current Enter action. Announce an intent change politely, not on every character.
- Leading/trailing content has reserved space. Clear button gets a label; microphone is only shown if a real configured voice path exists.
- **Overflow:** query scrolls horizontally while editing. Intent yields/truncates before the user’s query; expose the full action through accessible description. Do not pretend a selected result name is the input value.
- **Keyboard:** preserve text editing shortcuts, composition, and candidate-window behavior. Enter while `isComposing` must not execute or submit.
- **States:** focused caret; prompt-ready intent; unavailable-AI state without a false submit affordance; busy only after explicit submission. No network classification on each keystroke is implied by this design.

### Result row and selected result

- Comfortable root row: `layout.result.height`, `radius.result`, 36px icon, primary 16/20, secondary 13/18; inset/gaps from result spacing tokens.
- Dense extension row: explicit compact variant, not arbitrary smaller styles. Height and virtualizer estimates must agree.
- Title/description column has `min-width: 0`; accessories/shortcut hints have bounded space. Align icons to the row’s visual center and text to a consistent column.
- Normal background transparent within parent. Hover uses `color.hover.background`; keyboard selection uses `color.selection.background`, retaining primary/secondary hierarchy. Selected + hovered stays selected, not a compounded fill.
- Selection belongs to a stable item ID, not only an array index. As results change, do not execute a newly inserted item under an already-pressed Enter.
- Maintain one active option; use `aria-selected` and combobox `aria-activedescendant` if focus remains in the input. Native AX happened to move into a collection; DOM implementation need not emulate that literally.
- Disabled rows cannot execute; show a reason in accessible text. Use a status icon/text for unavailable items rather than opacity alone.
- Selection updates immediately; scroll active row into view without smooth-scroll lag on every key repeat.

### Result groups, category chips, and section headers

- Group by the existing ranking/command model; visual grouping must not reorder results by accident.
- Root group labels use `typography.section`, sentence case, `layout.section.height`, and `spacing.section.before`.
- Chips use `radius.pill`, `typography.control`, `spacing.control.gap`, and a hit target of at least 32px even if the visible fill is smaller.
- Chips are buttons/tabs only if they actually filter; otherwise use noninteractive labels. Expose selected state and an accessible group name.
- No separator after every result. Use spacing for groups and `color.separator` for structural boundaries.
- Category changes retain query, announce the new scope, and do not silently route the same Enter press to AI.

### Icons, shortcut hints, and secondary descriptions

- App/file artwork: `icon.result.size`; fixed box, intrinsic aspect ratio, no layout jumps while loading. Missing artwork uses the existing meaningful fallback, not a broken image or blank success state.
- Control icons: `icon.control.size` and `icon.stroke.width`; decorative icons `aria-hidden`; icon-only actions have localized labels.
- Shortcut hints: `typography.shortcut`, `radius.keycap`, raised/inset neutral color, minimum visible height 18px. Use platform symbols visually and a readable accessible shortcut name. The hint itself is not a separate tab stop.
- Descriptions: `typography.result.secondary` and `color.text.secondary`; one line for list density, full value accessible. Metadata cannot be the only indicator of an error or destructive action.

### Empty states and unavailable states

- **Empty query:** input-only capsule unless an existing user preference explicitly enables suggestions; do not invent a mandatory recent-items grid.
- **No local matches:** preserve query and show a compact explanation. If AI is available and selected as the pending intent, show the Ask AI action; absence of local matches is not itself consent to transmit.
- **AI unavailable / provider error:** truthful inline state and existing settings/retry route; no fake answer, endless spinner, or automatic provider switching. Do not erase the query.
- **Permission-limited search:** distinguish insufficient access from a genuine zero-result set when the backend supplies that distinction.
- Use primary/secondary/caption type and shared spacing, not illustration-heavy marketing empty states. Expose results count/status through a polite live region with debouncing.

### Loading and task-status presentation

- Show semantic busy state immediately on submission; defer the visual indicator by `motion.loading.revealDelay`.
- For search refresh, preserve useful existing results but mark updating; prevent a stale result from becoming an unintended action. Do not reproduce the investigation’s temporary query/result mismatch as a required effect.
- For an explicit AI prompt, use a compact status region with truthful operation text and cancel affordance. “Searching” must mean search is actually occurring; generic thinking/working copy is safer when provider phases are unknown.
- Indicator uses `icon.status.size` and shared motion tokens; reduced motion uses a static status symbol and text. An unmeasured Siri dotted-ring/glow is optional polish, not a dependency.
- Existing silent/no-view commands keep the existing floating status badge. Never open the launcher to show their progress/completion.

### Scrollable results, separators, and previews

- Results get an independently scrollable region with `min-height: 0`; no body/document scrolling behind an action menu.
- Scrollbars remain discoverable through OS preference behavior; do not force invisible scrollbars. Keep selected rows and hit targets clear of the scrollbar lane.
- Large lists preserve virtualization. Recompute item/header metrics with density/font settings; do not mix 60px rendered rows with a 36px virtualizer.
- Preview belongs in the richer 760px shell when needed, rather than squeezing a second column into the 520px root panel. Use `layout.preview.minWidth`, opaque content surface, and a single structural separator.
- Preview content may wrap/scroll; loading/error states are explicit. Do not execute files merely to produce a preview. Native Quick Look integration is not established by this research.
- Escape closes preview before dismissing the parent, restores result selection, and returns focus to its prior owner.

### Inline AI response and follow-up

- Use `layout.answer.width`, `layout.panel.maxHeight`, `radius.answer`, answer spacing/type, and a scrollable readable response region. This is a launcher response, not a history browser.
- Short answer fits content. Structured calculation/conversion cards use `color.surface.inset`, result typography, and labeled Copy. Do not show citation chips unless the provider actually supplies sources.
- Long answer uses headings, paragraphs, lists, links, and code through the existing Markdown rendering path. Never fabricate headings or sources solely to match O07.
- Keep close/back and optional expand controls in predictable positions with full hit targets. “Expand” may open the existing full AI experience, but is an explicit action, not an automatic redirect on Enter.
- Reserve composer height + inset below scrolling text. The current screenshot’s text-under-composer overlap is **not** the desired Zapper behavior.
- Follow-up uses `layout.followup.height` and `typography.control`; stop generation/cancel is available while in flight. Voice/attachments are exposed only for real supported capabilities.
- Announce that an answer started/completed; do not put every streamed token into an assertive live region. Do not force-scroll if the user has scrolled up to read.
- Cancel/close prevents late chunks from reviving a dismissed response. Preserve actual request ownership and user data.

### Action menus and secondary controls

- Menu uses `surface.menu.material`, control/shortcut typography, selected/hover colors, and `layer.popover`. Reserve minimum readable width; use one semantic width variant across root and extension actions instead of unrelated 384/320px defaults.
- Appropriate menu/dialog semantics, focus entry, roving selection, Escape, and focus restoration are required. Pointer-only clickable divs are insufficient.
- Forms/settings reuse shared type/colors/control radius but do not inherit the giant search capsule radius. Fields/errors/help remain associated accessibly.
- Footer/status controls must not overlap result rows. If kept, their height becomes part of content measurement rather than an absolute-position surprise.

## Motion & Interaction Guidelines

### Entry → intent → execution contract

The native observations establish a visible intent and two successful AI requests, **not Apple’s complete routing algorithm**. Future Zapper routing should have these proposed invariants:

1. Explicit user-selected command, inline argument completion, calculator operation, or scoped action retains its existing meaning.
2. A natural-language request may become the default AI action when a local intent decision selects it; show that decision before Enter. The exact inference algorithm is an implementation design question, not a recovered Apple heuristic.
3. The AI route must work with ordinary typing + Enter, without requiring Tab or opening the history UI, when Ask AI is the displayed pending action.
4. Do not implement “every query containing a space goes to AI” or “no results means send immediately.” Local search strings can contain spaces and sensitive filenames.
5. Network dispatch happens on explicit submission, never just because a suffix appeared. Respect provider availability and the existing privacy settings.
6. Snapshot the query, selected target, and intent at dispatch; an asynchronous search update must not change that action afterward.
7. On error/cancel, retain the query and an honest state. No invented success or silent provider fallback.

A future state model should distinguish search query, selected item, displayed intent, request ID, response state, and focus owner. Reuse the existing hooks/state boundaries; do not bury a new classifier or network call inside a presentational row component.

### Keyboard and pointer

| Input | Proposed behavior | Compatibility note |
|---|---|---|
| Configured global shortcut | Show/focus current launcher on intended display/Space | Cmd+Space is the reference, not permission to overwrite the user’s shortcut |
| Up/Down | Move active result; keep it visible | Preserve existing history boundary behavior unless deliberately redesigned |
| Enter | Execute the displayed intent/selected action | AI submission must not steal execution from explicit result selection; IME composition wins |
| Tab / Shift-Tab | Existing arguments/autocomplete/focus semantics; accessible route to intent controls | Current Tab-to-AI behavior must be consciously migrated, not duplicated unpredictably |
| Cmd+1…9 | Existing quick launch | Do not import Tahoe category bindings without a separate decision |
| Escape | Child overlay/preview first; search clear/collapse/dismiss or AI cancel/back/dismiss according to state | Native O08 establishes dismissal only; full Zapper precedence must remain deterministic |
| Pointer hover | Subtle hover, no animated row displacement | Native hover timing was not measured |
| Click on result | Select/execute according to existing contract; first click not swallowed by activation | Preserve `acceptFirstMouse` behavior |
| Click outside | Dismiss only where existing launcher lifecycle permits | OAuth and owned child-window exceptions must survive |

### Motion rules

- Animate opacity/transform in the renderer where useful; avoid `transition: all` and layout thrash.
- Host-window bounds and native material masks must move together. CSS height animation cannot resize a BrowserWindow by itself.
- Do not restart entry animations on every streamed chunk or result refresh. No staggered row cascades, magnetic buttons, animated decorative backgrounds, or continuous selection pulses.
- Avoid scaling text during routine search. The proposed default entrance is opacity-only; reproducing native morphing requires separate frame-timed evidence and a real native/renderer synchronization plan.
- Reduce Motion removes geometry animation and decorative cycling. A static truthful busy state remains.
- Theme changes use one controlled update across native material and renderer; do not briefly expose dark text on a dark surface or vice versa.

### Accessibility and display behavior

- Read reduced-motion/transparency/contrast preferences initially and observe updates. NSWorkspace notifications belong to its notification center; the default notification center is not equivalent (D09).
- Apply Reduce Transparency to both native material and CSS overlays. It is not solved by changing only `backdrop-filter`.
- Target WCAG AA text contrast on the **final composite**: 4.5:1 for ordinary text; 3:1 for large text and meaningful non-text control boundaries. Disabled decorative chrome is not an excuse to dim informative text.
- Maintain visible focus independent of selected/hover states. Use shape/text as well as color for errors, loading, and unavailable items.
- Verify VoiceOver announces query label, intent, result name/position, selected state, loading/cancel, answer structure, and follow-up controls in a sensible order.
- Test current font-size preferences 12/14/16/18/20px, long localized strings, RTL, CJK, and IME. Existing fixed-px extension typography currently scales differently from rem-based launcher typography.
- Validate Retina captures against logical geometry. A 1px CSS stroke becomes 2 device pixels at scale 2; use a hairline only when deliberately specified, not by accidentally dividing all dimensions by 2.
- Spaces, Mission Control, full-screen, multi-display, and focus restoration require native runtime checks. They are not CSS acceptance criteria.

## Technical Feasibility & Architecture

### Existing source map

Paths/ranges refer to the inspected source snapshot; symbols are the durable navigation anchors.

| Area | Existing files / symbols | Findings and future reuse |
|---|---|---|
| Root window | `src/main/main.ts` `createWindow` (~7962–8058) | 760×480 default, 100 compact; frameless transparent panel, `hasShadow:false`, non-user-resizable, `acceptFirstMouse:true`, hidden in Mission Control; native attachment after `renderer-ready` |
| Glass policy | `main.ts` `isGlassyUiStyleEnabled`, `applyLiquidGlassToWindow`, `applyNativeWindowGlassFallback` (~1915–2100) | Native branch only for `uiStyle: glassy`; renderer class synchronization; optional wrapper and fallback |
| Activation / Spaces | `main.ts` `setLauncherOverlayTopmost` (~3161), `showWindow` (~9080), AeroSpace helper | Focus/topmost/workspace handling, 400ms show-blur grace, own-window focus exception, OAuth blur suppression; preserve these semantics |
| Resizing | `main.ts` `resize-launcher-window` (~14355) | Boolean expanded/compact chooses 480/100 height; insufficient for 520→420 width and content-driven answer heights |
| Native helpers | `src/native/native-helpers-addon/`, `scripts/build-native.mjs` | Existing addon sets NSWindow animation behavior to none; native integration has an established owner/build route |
| IPC bridge | `src/main/preload.ts`, `src/renderer/types/electron.d.ts` | Every future geometry/theme/accessibility bridge change must update both plus main handler |
| Renderer boot | `src/renderer/src/main.tsx` | Shared CSS/theme setup, per-window hash-based code splitting; not a new router requirement |
| Root composition | `App.tsx`, `hooks/useAppViewManager.ts`, `views/LauncherMainView.tsx` | View transitions and feature hooks; keep business logic out of shell JSX |
| Shell/material | `components/LauncherViewShell.tsx`, `LauncherSurface.tsx` | Reuse lifecycle and always-mounted runners; current surface is one full-size glass rectangle |
| Search/results | `LauncherSearchHeader.tsx`, `LauncherCommandList.tsx`, `LauncherCommandRow.tsx`, `hooks/useLauncherKeyboardControls.ts` | Natural place for token adoption and intent presentation; current Enter/Tab behavior differs from requested target |
| Ranking / arguments | `hooks/useLauncherCommandModel.ts`, `useLauncherInlineArguments.ts`, `utils/root-search-ranking.ts`, `root-search-sections.ts` | Preserve ranking/execution contracts; visual selection must not invent a second ranking model |
| AI behavior | `hooks/useAiChat.ts`, `views/AiChatView.tsx`, `views/ChatMarkdown.tsx` | Real streaming/cancel/history/Markdown exist; reuse provider ownership, not necessarily full chat layout |
| Actions / footers | `LauncherActionsOverlay.tsx`, `LauncherContextMenuOverlay.tsx`, `LauncherFooter.tsx`, `ExtensionActionFooter.tsx`, `launcher-overlay-style.ts` | Shared roles, currently divergent menu widths/material formulas/markup |
| Theme foundations | `src/renderer/styles/index.css`, `tailwind.config.js`, `utils/theme.ts`, `ui-style.ts`, `font-size.ts`, `base-color.ts`, `launcher-background.ts` | Extend the existing semantic-variable convention; no parallel design-token framework |
| Extension compatibility | `raycast-api/list-runtime*.tsx`, `grid-runtime*.tsx`, `form-runtime*.tsx`, `detail-runtime.tsx`, `action-runtime-overlay.tsx` | Separate renderer implementations with shared variables; migrate host presentation without editing downloaded extensions |

The fork relationship is explicit in README/LICENSE. `sc-*`, `__sc*`, `SUPERCMD_*`, `sc-theme-preference`, and `data-supercmd-search-input` are existing compatibility identifiers, not evidence that each current component is unmodified upstream. A file-by-file SuperCmd provenance comparison was not performed. Preserve upstream MIT attribution and intentional identifiers.

The launcher renderer has `nodeIntegration:true`, `contextIsolation:false`, and `sandbox:false` to support existing extension execution. It is **not a security sandbox**. Other auxiliary windows use different isolation settings. Keep native integration in main/native and consult [SECURITY.md](../SECURITY.md); a visual redesign must not silently alter extension execution or make new isolation claims.

`LiquidGlassSurface.tsx` and `LiquidGlassDefs.tsx` were found as unreferenced components, not the live launcher material path. The former imports `liquid-glass-react`, which is not a declared application dependency. Do not assume it is an available replacement or install it as a side effect of this specification.

Zapper architecture findings in this document are source observations. The installed Zapper UI and its configured AI provider were not exercised during this research; native Apple behavior is the runtime evidence. Existing native-attachment comments describe historical signed-build input problems, not a problem reproduced by this investigation.

### Current appearance conflicts

| Current source fact | Conflict with target | Future treatment |
|---|---|---|
| Search header 60px, search 15px/500; row icon 20px and title 13px | Smaller/denser than O01–O04 root search | Apply comfortable root tokens while keeping an explicit dense extension variant |
| Shell radius 14px; glassy 12px; native attach 16px | Different clipping silhouettes at different layers | One per-role radius contract shared with native regions |
| Global glassy `rounded-* !important` overrides | Utility name does not mean stable radius | Replace affected uses with semantic roles; remove obsolete overrides in each migrated scope |
| CSS blur 54/96px, footer 48px; action material formulas differ | Multiple optical owners and arbitrary blur escalation | Native owns desktop material; renderer fallback has an explicit purpose, not an Apple-blur claim |
| Custom background image/tint | Competes with native-reference appearance | Disable only in the proposed native-reference mode; preserve stored preference/data |
| Root neutral selection changes again under native-glass selectors | Mode-specific contrast can diverge | Single semantic selection role with controlled appearance resolution |
| Absolute footer; no unified height token | Risk of obscured final rows/composer | Include chrome in measured layout |
| Root rows/input lack full combobox/listbox/selected semantics in inspected markup | Visual polish without equivalent keyboard/AT clarity | Semantic component cutover with live VoiceOver validation |
| No reduced-motion/transparency/contrast handling found in scoped source searches | OS preference changes are not a demonstrated end-to-end path | Establish shared preference inputs before adding motion/material polish |
| Extension virtualizer 36px row /24px header; fixed-px text | Root density/type changes can break scrolling/hit-testing | Update measured geometry and virtualizer together |

Tailwind’s `white` maps to `--on-surface-rgb` and `black` to `--backdrop-rgb`; `text-white/30` is **not necessarily literal white**. Audit resolved semantics, not utility names alone.

### Native material: actual code versus comments

The installed wrapper source dynamically looks up `NSGlassEffectView`; if unavailable it creates an active behind-window `NSVisualEffectView` using under-window-background material. It configures CALayer corner radius/clipping and tint, and exposes unstable selectors for additional properties.

Apple now documents `NSGlassEffectView` publicly from macOS 26 (D06). Older comments calling the entire class “private” are not an authoritative availability statement. Conversely, public availability of the class does **not** make the wrapper’s `unstable_setSubdued` and dynamic underscored setters a stable public contract.

Important current source discrepancy: `applyLiquidGlassToWindow` declares `fallbackVibrancy` in its options and callers pass `under-window`, but the function body assigns **`const fallbackVibrancy = 'hud'`**. Document the effective behavior; do not assume caller intent is implemented. This research does not fix it.

A nonnegative wrapper view ID causes `sc-native-liquid-glass` to be set, even though the wrapper can internally fall back to `NSVisualEffectView`. That class name alone does not prove actual Liquid Glass. The wrapper can return `-1` without throwing; success/fallback behavior needs runtime capability verification in a future material cutover.

### Fidelity boundary

| Capability | Current stack feasibility | Required boundary / trade-off |
|---|---|---|
| Typography, spacing, neutral selection, row layout, intent suffix | High in React/CSS | Chromium text rendering will not be pixel-identical to every AppKit glyph |
| Inline AI answer with streaming/cancel | Existing hook/backend can be reused | Root currently routes to full `AiChatView`; new inline presentation and intent precedence are real future work |
| Real desktop translucency/blur | Native APIs already reachable | CSS filter/backdrop-filter cannot reproduce other applications behind the window (D11) |
| Two disconnected material islands with a clear gap | **Not provided by the current whole-window wrapper API** | Requires bounded native effect regions or separate native windows; merely splitting DOM backgrounds leaves the underlying whole-window glass visible in the gap |
| Exact native Liquid Glass optical behavior | Public API is available, exact match uncertain | Version/appearance/contentView hierarchy and wrapper behavior matter; no private selector dependency should be required |
| DOM foreground vibrancy | Approximation | NSVisualEffectView foreground vibrancy requires appropriate native views; ordinary DOM text is not automatically a vibrant leaf view |
| Continuous native corner curves | Approximation in CSS | `border-radius` is a circular construction, not proof of Apple’s curve; fit perceived silhouette, not a claimed exact formula |
| Exterior shadow on transparent Electron window | Conditional | Electron documents transparent-window shadow/resize caveats; CSS shadow needs bounds inset, native approach needs actual testing |
| Dynamic host width/height | Possible in main with `setBounds` | Current boolean resize IPC is insufficient; transparent-window resizing has documented caveats; prototype packaged behavior |
| Native selection/caret/glow animation | Partial | Plain caret/selection is easy; precise Siri optical treatment remains unmeasured and optional |
| Spaces/focus/fullscreen | Existing main-process machinery | Do not replace with renderer z-index or indiscriminate always-on-top flags |
| OS appearance/accessibility adaptation | Public Electron/AppKit inputs exist | Need a synchronized main/preload/renderer contract and event coverage verification |
| Native previews / arbitrary rich cards | Depends on actual backend capability | Do not add fake preview/card content just to reproduce a screenshot |

**Recommended material architecture (P):** retain one keyboard/focus-owning Electron launcher window. If true two-island fidelity is required, use public AppKit material views with explicit region bounds managed through the existing native integration boundary, with transparent Chromium content above. Prefer this to two independently focusable BrowserWindows. Separate windows remain a trade-off only if the single-host approach cannot preserve composition/hit-testing; they multiply blur/dismissal/Spaces synchronization risks.

Public `NSGlassEffectView.contentView` has defined composition guarantees; arbitrary sibling/subview insertion does not. Test the chosen hierarchy against Electron’s content view, resize, hit testing, and signed packaging rather than relying on comments or a successful addon load.

### Requested AI flow versus current Zapper

Observed source behavior:

- `useLauncherKeyboardControls.ts` (~419–425): Tab can expand compact mode and call `startAiChat(searchQuery)` after argument/autocomplete precedence.
- Its Enter branch (~490–515) copies calculator output or executes the selected command/browser action; it is not a general natural-language-to-AI dispatcher.
- `useAiChat.ts` (~317–328): `startAiChat` clears the current in-memory turn state, sets `aiMode`, and sends a nonempty query.
- `App.tsx` (~2869–2887): `aiMode` renders the full `AiChatView`, including conversation props.
- `useAiChat` already owns request IDs, chunk batching, done/error/cancel handling, and persistent conversations. It also currently forces scroll-to-bottom on message changes (~234–238), which would need attention for an inline readable answer.

Therefore the requested native-style Enter flow is **not just CSS**. Future work must connect a visible intent decision to existing request ownership and an inline response presentation. Reuse the streaming/cancel backend; do not create a second provider client in the search component. Do not change persistence semantics silently while changing presentation.

### Suggested organization

1. Keep semantic color/material/typography variables in `styles/index.css`; group them by role. Extend `tailwind.config.js` mappings only where useful.
2. Keep preference resolution in existing `utils/theme.ts`, `ui-style.ts`, `font-size.ts`, and related modules. Do not create another theme store.
3. Put visual role composition in existing `LauncherSurface`, `LauncherViewShell`, search/list/row/footer components. Shared measurements belong outside `App.tsx` business logic.
4. Keep intent and transition logic in focused existing hooks; preserve `useAppViewManager` lifecycle and hidden extension runners.
5. Reuse `useAiChat` request ownership and `ChatMarkdown` content rendering for an inline answer variant. Full-history UI remains an explicit separate presentation.
6. Migrate Raycast host list/grid/form/detail/action surfaces by semantic role, not by modifying installed extensions or globally overriding all rounded classes.
7. Native region/geometry/accessibility work belongs in main/native, with preload and renderer types updated together. No private macOS calls from the renderer.

This is a proposed organization and ownership map, not authorization to perform the migration now.

## Future Implementation Roadmap

No step below was executed.

| Order | Milestone | Dependencies / exit criteria | Main risk |
|---|---|---|---|
| 1 | **Shared foundations and a native search-shell proof** | Adopt role tokens for existing root shell; verify 520px capsule/comfortable density and opaque light/dark fallback; exercise native material ownership in an isolated development window; no routing changes yet | Double material, mismatched clipping, false glass-capability detection |
| 2 | Main-window/material region contract | Resolve true transparent gap; synchronize native and renderer geometry; validate first-click, show/blur, shadow, signed/unsigned behavior | Whole-window wrapper cannot express two islands; native attachment lifecycle |
| 3 | Typography, spacing, and font-scale consistency | Shared type/spacing roles; grow rows/chrome safely; synchronize virtualizer metrics | Fixed/rem mismatch, localized clipping |
| 4 | Search field and visible intent | Query and noneditable intent suffix; accessible labels/composition behavior; stable selected-target model | Sending unintended searches or breaking argument/autocomplete precedence |
| 5 | Results, groups, selection, scrolling, previews | Tokenized comfortable/compact variants; keyboard/VoiceOver; existing ranking unchanged | Density changes breaking virtualized lists and extension semantics |
| 6 | **Cmd+Space-style prompt → Enter → inline AI response** | Reuse real provider/cancel/request ownership; show intent before submit; working loading/error/short/long/follow-up states; no automatic history-view redirect | Ambiguous intent and async races; source/citation capability differences |
| 7 | Interaction and motion | Native/renderer transition coordination; reduced-motion/transparency updates; stable focus restoration | Animating host and content at different times; old native animation disabled |
| 8 | Secondary components and extension parity | Menus, key hints, footers, forms, dense lists/grids/details reuse roles; no downloaded-extension edits | Global style overrides and duplicated runtime markup |
| 9 | Visual polish and accessibility qualification | Contrast/composite checks, display/Space matrix, input methods, packaged hit-testing, capture regression set | Mistaking screenshots/build success for end-to-end platform correctness |

**First implementation milestone:** shared tokens plus the root search shell and its native/opaque material ownership, exercised in light/dark and reduced-transparency modes. Keep command ranking, shortcuts, AI routing, stored preferences, and installed application untouched during that first milestone. Its output should prove that the visual foundation can support the requested inline-AI flow; it must not deliver a new chat sidebar.

Before changing Enter behavior, define and verify a small routing corpus containing exact app names, multiword file names, inline arguments, calculations, natural-language prompts, unavailable providers, IME composition, and a user-selected result during an async update. This is an implementation acceptance requirement, not evidence that Apple uses the same rules.

## Consistency Rules for Future Development

1. **Name the role before choosing a value.** A new panel must declare search/results/answer/preview/menu/content semantics. Reuse the matching material, radius, type, and spacing tokens.
2. **No arbitrary component constants.** New values require a documented token, purpose, evidence category, light/dark behavior, accessibility fallback, and confidence. Do not label a proposal “Apple exact.”
3. **One material owner per region.** No nested whole-window native glass + CSS backdrop blur + opaque fill combination. A background image is not a native material.
4. **One geometry source across boundaries.** Native masks, BrowserWindow bounds, renderer boxes, scroll limits, and virtualization must agree. Keep logical/device units explicit.
5. **Search is not chat history.** Natural-language input should reach an inline answer when Ask AI is the pending action. History/expansion is optional and explicit.
6. **Selection is not consent to a model request.** Preserve visible intent, explicit submission, selected-command precedence, and provider availability. Do not transmit while merely searching.
7. **Accessibility is part of the component contract.** Labels, roles, focus, keyboard order, contrast, reduced effects, and live-state behavior accompany geometry, not a later visual pass.
8. **Reuse real services.** No fake sources, synthetic successful answers, fabricated loading phases, or silent empty-result fallbacks. Distinguish missing access from no data.
9. **Preserve compatibility.** Keep intentional `sc-*`/`__sc*`/`SUPERCMD_*` identifiers, extension API semantics, MIT attribution, and existing user settings/data. Do not infer provenance from naming.
10. **All locales move together.** Future added/renamed/removed user-facing keys must be reflected in every locale, preserving interpolation and product names; consult the repository’s i 18n rule.
11. **Silent commands remain silent.** Use the existing no-view status badge, not the launcher, for background progress/completion.
12. **No cosmetic shortcut migration.** Native Apple shortcuts are research inputs, not permission to replace Zapper’s configured global shortcut or established command bindings.
13. **Migrate an affected scope completely.** Update its callers, styles, metrics, and accessibility together; remove obsolete overrides in that scope rather than stacking permanent compatibility shims.
14. **Evidence must remain attributable.** New screenshots record OS/build, effective theme, display scale, source pixel dimensions, capture type, crop/redaction, state, and any uncertain measurement.
15. **Do not bundle research assets.** Screenshots and Apple illustrations are documentation evidence only; preserve their attribution and privacy boundaries.

## Validation Checklist

This is the acceptance checklist for future implementation, **not a claim that current Zapper passes it**.

### Foundations and visual structure

- [ ] Root search uses 520px content width at default scale, work-area clamping, and an 88px-minimum capsule; rich extension width is deliberately distinct.
- [ ] Search/results are separated by the 10px token gap; no unexpected native fill occupies that gap.
- [ ] Comfortable rows use a consistent 60px minimum, 36px icon box, shared text column, and neutral selected fill; compact metrics match their virtualizer.
- [ ] Geometry matches proposed tokens within ±1 CSS px for deterministic boxes; perceptual native curves/material are reviewed separately rather than compared as exact pixels.
- [ ] All radii match between native clipping, renderer backgrounds, hit testing, and visible selection.
- [ ] There is no clipped exterior shadow, double shadow, opaque rectangle behind rounded corners, or background image competing with native material.
- [ ] Light, dark, system theme, forced app theme, opaque fallback, and native-capability-failure modes remain readable.

### Entry, search, and AI flow

- [ ] Configured shortcut focuses input immediately without changing the user’s binding.
- [ ] App/file query produces stable results; Down/Up selection, scrolling, Enter execution, and first mouse click work.
- [ ] Selected command/arguments/calculation preserve existing precedence.
- [ ] Natural-language prompt shows Ask AI intent before submission; Enter dispatches exactly once and presents the answer inline, not the history view.
- [ ] Query/intent/selected target cannot race with a search update at dispatch.
- [ ] No provider request occurs while merely typing/searching.
- [ ] Real loading, provider error, cancellation, partial answer, short answer, long answer, unavailable-provider, and retry paths are exercised; no fake success.
- [ ] Follow-up input works; expanding full history requires an explicit action.
- [ ] Close/cancel cannot be undone by a late stream chunk; old request IDs are ignored.
- [ ] Long responses do not hide behind the composer; scrolling up is not defeated by unconditional auto-scroll.
- [ ] Source chips appear only with actual provider provenance; code/links/Markdown stay readable and bounded.

### Accessibility, motion, and platform

- [ ] VoiceOver announces query label, intent, selected result, busy/cancel, answer headings, and follow-up in order.
- [ ] Every icon-only action has a label and ≥32px hit target; visible keyboard focus is independent of selection.
- [ ] Ordinary text meets 4.5:1 contrast and meaningful non-text boundaries meet 3:1 on final composites over both light and dark controlled backgrounds.
- [ ] Reduce Transparency removes translucent backgrounds at both native and CSS layers; Reduce Motion removes transform/morph/cycling motion.
- [ ] Preference changes propagate live without relaunch; high-contrast/differentiate-without-color behavior is checked.
- [ ] Font preferences 12/14/16/18/20px, long localized text, RTL, CJK, and IME composition do not clip or mis-execute.
- [ ] Retina/scaled displays preserve logical geometry; capture metadata explains every pixel-to-point conversion.
- [ ] Current Space, another Space, fullscreen app, Mission Control, secondary display, Sidecar disconnect, and changed work area are tested without global focus theft.
- [ ] OAuth/child-window exceptions and no-view status behavior still work.
- [ ] Native attachment and hit testing are exercised in the actual packaged build; build success alone is not accepted as UI proof.

### Research/documentation maintenance

- [ ] New/changed tokens and components have purpose, value/unit, confidence, evidence category, fallback, and light/dark definitions.
- [ ] Local source links, relative asset links, original capture dimensions, and crops remain valid.
- [ ] Apple version distinctions and observed-versus-proposed labels remain intact.
- [ ] Screenshots contain no private history, credentials, unrelated user data, or unredacted desktop context.
- [ ] All affected consumers/locales/docs are updated; no new runtime dependency is assumed from a documentation example.

## Unknowns and Open Questions

| Unknown | Current evidence boundary | Next targeted investigation, if needed |
|---|---|---|
| Exact Apple material/blur/tint/shadow recipe | Window captures and binary imports cannot establish it | Compare controlled composited captures and public native material prototypes; do not call private selectors |
| Exact font instances, optical axes, tracking and baseline metrics | Glyph-based size estimates only | Capture matched system-font prototypes at the same scale; keep values proposed until measured |
| Exact animation duration/easing and intermediate shapes | Endpoint/one-flight captures only | Frame-timed capture with input timestamps, same display/refresh, no service-latency conflation |
| Complete natural-language routing rules | Two questions and one app query observed; public docs support the flow | Define a Zapper routing corpus and visible precedence policy; Apple’s internals need not be copied |
| Local light appearance and contrasting desktops | Dark local captures; external light illustration only | Separate opt-in visual session, restore preferences/backgrounds, capture final composites |
| True no-match/offline/AI-disabled panel | Not exercised | Controlled queries/network/service conditions without inventing zero-result behavior |
| Primary-panel voice/listening/recognition states | Microphone visible; secondary app toggle verified, no spoken request | Focused primary-panel voice session with privacy controls; do not generalize standalone visuals |
| Hover, Quick Actions interaction, Quick Look, resizing by drag | Some controls documented/visible, not exercised | Non-destructive fixtures and explicit before/after captures |
| Spaces/fullscreen/Sidecar behavior | Display inventory observed; transitions not tested | Dedicated platform matrix; do not infer focus/Space behavior from window metadata alone |
| Why some capture frames temporarily cover the display | Observed transient geometry, not implementation proof | Correlate frame timestamps and native window metadata; exclude those bounds from content tokens |
| One-host two-island native composition in Electron 41 | Existing wrapper attaches a whole-window view | Public-API native-region prototype with clipping, hit-testing, resize and packaged verification |
| Wrapper fallback/capability correctness | Source can return a view ID for legacy visual effects; class name is ambiguous | Record actual native capability separately from renderer class activation |
| Inline AI persistence/history policy | Existing hook persists conversations | Preserve current data semantics unless a separate product decision explicitly changes them |
| System accent with forced app appearance | Public color inputs exist, combined live behavior untested | Resolve against effective appearance and validate contrast; use specified palette when unresolved |
| Upstream provenance of individual UI modules | Fork/license and compatibility identifiers established, no complete upstream diff | Compare historical source only if authorship/provenance is needed; not a prerequisite for this design |

**Decision boundary:** the measured floating search-and-answer flow is sufficient to guide the shared visual foundations, component contracts, and integration sequence. Unverified optics, timing, and platform behavior remain explicit qualification work—not invented measurements or a reason to replace the requested launcher experience with a chat application.
