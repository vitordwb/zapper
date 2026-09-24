---
description: Non-negotiable Zapper compatibility, data and publication boundaries.
alwaysApply: true
---

# Zapper safety invariants

- Fix Raycast compatibility in Zapper, never by modifying downloaded third-party extensions.
- Preserve upstream MIT attribution, existing user work, stored data and intentional internal compatibility identifiers.
- Do not commit credentials, signing certificates, user data, `node_modules/`, `dist/` or `out/`. Use configured secret references, never print secret values.
- Do not commit, push, tag, publish, overwrite the installed app or terminate the user's app processes without authorization for the current task. Never force-push as routine synchronization.
- Every added, renamed or removed user-facing translation key must be reflected in every locale in the same change; preserve interpolation variables and product names.
- Keep silent/no-view commands silent: use the existing status badge, not the launcher window, for progress and completion.
- Claim success only for behavior actually exercised. State unavailable credentials, permissions, services and unverified paths explicitly; do not substitute fake success or empty-result stubs.
