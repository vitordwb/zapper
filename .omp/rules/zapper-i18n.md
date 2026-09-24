---
description: Read before adding, renaming or removing user-facing copy or localization behavior.
globs:
  - src/renderer/src/i18n/**
alwaysApply: false
---

# Localization

English source: `src/renderer/src/i18n/locales/en.json`. Enumerate the locale directory rather than relying on an old list; currently it also contains `de`, `es`, `fr`, `it`, `ja`, `ko`, `ru`, `zh-Hans` and `zh-Hant`.

- Use the existing `useI18n().t(...)` pattern and stable feature-scoped keys. Avoid new hardcoded renderer UI strings.
- Add, rename and remove matching key paths in every locale in the same change. English fallback is not completion.
- Translate values in the correct language. Never copy a locale wholesale as a template or leave English values unless they are intentional product names/technical tokens.
- Preserve interpolation variables verbatim, including `{count}`, `{name}`, `{version}` and other placeholders present in the source string.
- Preserve brands such as Zapper, Whisper and provider/model names.
- Check text layout in the changed surface, especially long translations. Do not change persisted keys just to change their displayed label.

Run `npm run check:i18n`. Structural parity does not establish translation quality; review the changed values and placeholders too. Read `docs/i18n-architecture.md` for runtime flow, but use current source for supported languages.
