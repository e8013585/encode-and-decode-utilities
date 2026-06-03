# Encode / Decode

A privacy-focused Chrome extension for encoding and decoding text — supporting **Base64**, **URL encoding**, and **HTML entities**.

![icon](icons/icon128.png)

---

## Store Description

**Convert text between encodings instantly — all locally, nothing leaves your browser.**

Encode / Decode is a fast, lightweight Chrome extension that gives you three essential text transformation tools in one clean popup:

- **Base64** — Encode any Unicode text to Base64, or decode Base64 back to readable text. Full Unicode support via UTF-8.
- **URL** — Percent-encode strings for safe use in URLs, or decode percent-encoded sequences back to plain text.
- **HTML Entities** — Escape special HTML characters (`&`, `<`, `>`, `"`, `'`) for safe rendering, or decode named entities (&amp;, &lt;, &gt;), numeric character references, and hex references back to their original characters.

### Features

- **All processing is local.** Your text never leaves your browser — no servers, no telemetry, no network requests.
- **Copy with one click.** Every output has a dedicated copy button with visual confirmation.
- **Keyboard shortcut.** Press `Ctrl+Enter` to encode without reaching for the mouse.
- **Character counts.** See output length at a glance.
- **Clear error messages.** Invalid input is explained in plain language, not cryptic error codes.
- **140+ interface languages.** Switch languages on the fly from the dropdown — includes RTL support for Arabic, Hebrew, Persian, Urdu, and others.
- **Clean, accessible UI.** Built with WAI-ARIA tab semantics, keyboard navigation, and screen-reader labels.

### Use cases

- Developers inspecting or preparing data for APIs
- Troubleshooting URL encoding issues in web applications
- Quickly escaping HTML for rendering or debugging
- Decoding Base64 payloads or configuration values
- Anyone who needs fast, private text encoding/decoding in their browser

---

## Permissions

This extension requires **one permission**:

### `storage`

**Why it's needed:** Used solely to persist your chosen interface language across browser sessions. When you select a language from the dropdown, your preference is saved to `chrome.storage.local` so the extension opens in that language the next time. No data is synced to your Google account or sent anywhere.

This permission is used exclusively in `i18n.js` — the internationalisation controller that manages the language selector and dynamic translation loading.

### What we do NOT request

| Permission | Reason not needed |
|---|---|
| `activeTab` / `scripting` | All processing happens inside the popup; we never inject code into pages |
| `host_permissions` | No network requests are made to any server |
| `clipboardWrite` | We use the standard `navigator.clipboard.writeText()` API which works in extension popups without this permission |
| `cookies` / `tabs` / `webRequest` | Unrelated to encoding/decoding |

---

## Architecture

```
popup.html          →  Main popup layout (3 tabs, header, footer)
popup.css           →  Styling (light theme, RTL support)
popup.js            →  Controller (tab switching, event delegation, clipboard)
i18n.js             →  Internationalisation (dynamic locale loading, DOM hydration)
utils/
  base64.js         →  Base64 encode/decode with UTF-8 support
  url.js            →  URL percent-encoding via encodeURIComponent / decodeURIComponent
  htmlEntities.js   →  HTML entity encode (5 chars) / decode (150+ named entities + numeric refs)
_locales/
  en/               →  English translations (source of truth)
  ar/, fr/, ja/, …  →  100+ locale bundles
icons/
  icon16.png        →  Toolbar icon
  icon48.png        →  Extensions page icon
  icon128.png       →  Store listing icon
```

---

## Development

No build step is required. Load the extension in Chrome via `chrome://extensions` → **Load unpacked** → select this directory.

Translation files live in `_locales/<locale>/messages.json`. The English file is the source of truth; all keys and their `message` values should match across locales.

---

## License

MIT
