/**
 * i18n.js — Internationalisation Controller
 *
 * Responsibilities:
 *   · Wrap chrome.i18n.getMessage() with a safe fallback.
 *   · Resolve all [data-i18n-*] attributes in the DOM at startup.
 *   · Manage the user-facing language selector and persist the
 *     user's override choice to chrome.storage.local.
 *   · Apply RTL layout when the active locale requires it.
 *   · Export t(), getActiveLocale(), and initI18n() to the global
 *     scope for use by popup.js.
 *
 * What this file does NOT do:
 *   · It does not contain translation strings for any language.
 *   · It does not make network requests (beyond fetching local JSON).
 *   · It does not know about encoding/decoding logic.
 *
 * How translations work:
 *   Translations are loaded dynamically from _locales/<locale>/messages.json
 *   via fetch(). The language can be switched at runtime without reloading
 *   the popup. The user's choice is persisted in chrome.storage.local.
 */
'use strict';

// ─── Supported Locales Registry ───────────────────────────────────────────────

const SUPPORTED_LOCALES = [
  { code: 'af',       chrome: 'af',       name: 'Afrikaans',           dir: 'ltr' },
  { code: 'sq',       chrome: 'sq',       name: 'Shqip',              dir: 'ltr' },
  { code: 'am',       chrome: 'am',       name: 'አማርኛ',               dir: 'ltr' },
  { code: 'ar',       chrome: 'ar',       name: 'العربية',             dir: 'rtl' },
  { code: 'hy',       chrome: 'hy',       name: 'Հայերեն',            dir: 'ltr' },
  { code: 'as',       chrome: 'as',       name: 'অসমীয়া',             dir: 'ltr' },
  { code: 'ay',       chrome: 'ay',       name: 'Aymar',              dir: 'ltr' },
  { code: 'az',       chrome: 'az',       name: 'Azərbaycan',         dir: 'ltr' },
  { code: 'bm',       chrome: 'bm',       name: 'Bamanankan',         dir: 'ltr' },
  { code: 'eu',       chrome: 'eu',       name: 'Euskara',            dir: 'ltr' },
  { code: 'be',       chrome: 'be',       name: 'Беларуская',         dir: 'ltr' },
  { code: 'bn',       chrome: 'bn',       name: 'বাংলা',              dir: 'ltr' },
  { code: 'bho',      chrome: 'bho',      name: 'भोजपुरी',            dir: 'ltr' },
  { code: 'bs',       chrome: 'bs',       name: 'Bosanski',           dir: 'ltr' },
  { code: 'bg',       chrome: 'bg',       name: 'Български',          dir: 'ltr' },
  { code: 'ca',       chrome: 'ca',       name: 'Català',             dir: 'ltr' },
  { code: 'ceb',      chrome: 'ceb',      name: 'Cebuano',            dir: 'ltr' },
  { code: 'ny',       chrome: 'ny',       name: 'Chichewa',           dir: 'ltr' },
  { code: 'zh-CN',    chrome: 'zh_CN',    name: '中文（简体）',         dir: 'ltr' },
  { code: 'zh-TW',    chrome: 'zh_TW',    name: '中文（繁體）',         dir: 'ltr' },
  { code: 'co',       chrome: 'co',       name: 'Corsu',              dir: 'ltr' },
  { code: 'hr',       chrome: 'hr',       name: 'Hrvatski',           dir: 'ltr' },
  { code: 'cs',       chrome: 'cs',       name: 'Čeština',            dir: 'ltr' },
  { code: 'da',       chrome: 'da',       name: 'Dansk',              dir: 'ltr' },
  { code: 'dv',       chrome: 'dv',       name: 'ދިވެހި',              dir: 'rtl' },
  { code: 'doi',      chrome: 'doi',      name: 'डोगरी',              dir: 'ltr' },
  { code: 'nl',       chrome: 'nl',       name: 'Nederlands',         dir: 'ltr' },
  { code: 'en',       chrome: 'en',       name: 'English',            dir: 'ltr' },
  { code: 'eo',       chrome: 'eo',       name: 'Esperanto',          dir: 'ltr' },
  { code: 'et',       chrome: 'et',       name: 'Eesti',              dir: 'ltr' },
  { code: 'ee',       chrome: 'ee',       name: 'Eʋegbe',             dir: 'ltr' },
  { code: 'tl',       chrome: 'tl',       name: 'Filipino',           dir: 'ltr' },
  { code: 'fi',       chrome: 'fi',       name: 'Suomi',              dir: 'ltr' },
  { code: 'fr',       chrome: 'fr',       name: 'Français',           dir: 'ltr' },
  { code: 'fy',       chrome: 'fy',       name: 'Frysk',              dir: 'ltr' },
  { code: 'gl',       chrome: 'gl',       name: 'Galego',             dir: 'ltr' },
  { code: 'ka',       chrome: 'ka',       name: 'ქართული',            dir: 'ltr' },
  { code: 'de',       chrome: 'de',       name: 'Deutsch',            dir: 'ltr' },
  { code: 'el',       chrome: 'el',       name: 'Ελληνικά',           dir: 'ltr' },
  { code: 'gn',       chrome: 'gn',       name: 'Avañeẽ',            dir: 'ltr' },
  { code: 'gu',       chrome: 'gu',       name: 'ગુજરાતી',            dir: 'ltr' },
  { code: 'ht',       chrome: 'ht',       name: 'Kreyòl ayisyen',    dir: 'ltr' },
  { code: 'ha',       chrome: 'ha',       name: 'Hausa',              dir: 'ltr' },
  { code: 'haw',      chrome: 'haw',      name: 'ʻŌlelo Hawaiʻi',    dir: 'ltr' },
  { code: 'iw',       chrome: 'iw',       name: 'עברית',              dir: 'rtl' },
  { code: 'hi',       chrome: 'hi',       name: 'हिन्दी',              dir: 'ltr' },
  { code: 'hmn',      chrome: 'hmn',      name: 'Hmong',              dir: 'ltr' },
  { code: 'hu',       chrome: 'hu',       name: 'Magyar',             dir: 'ltr' },
  { code: 'is',       chrome: 'is',       name: 'Íslenska',           dir: 'ltr' },
  { code: 'ig',       chrome: 'ig',       name: 'Igbo',               dir: 'ltr' },
  { code: 'ilo',      chrome: 'ilo',      name: 'Ilocano',            dir: 'ltr' },
  { code: 'id',       chrome: 'id',       name: 'Indonesia',          dir: 'ltr' },
  { code: 'ga',       chrome: 'ga',       name: 'Gaeilge',            dir: 'ltr' },
  { code: 'it',       chrome: 'it',       name: 'Italiano',           dir: 'ltr' },
  { code: 'ja',       chrome: 'ja',       name: '日本語',              dir: 'ltr' },
  { code: 'jw',       chrome: 'jw',       name: 'Basa Jawa',          dir: 'ltr' },
  { code: 'kn',       chrome: 'kn',       name: 'ಕನ್ನಡ',              dir: 'ltr' },
  { code: 'kk',       chrome: 'kk',       name: 'Қазақ',              dir: 'ltr' },
  { code: 'km',       chrome: 'km',       name: 'ខ្មែរ',               dir: 'ltr' },
  { code: 'rw',       chrome: 'rw',       name: 'Kinyarwanda',        dir: 'ltr' },
  { code: 'gom',      chrome: 'gom',      name: 'कोंकणी',             dir: 'ltr' },
  { code: 'ko',       chrome: 'ko',       name: '한국어',              dir: 'ltr' },
  { code: 'kri',      chrome: 'kri',      name: 'Krio',               dir: 'ltr' },
  { code: 'ku',       chrome: 'ku',       name: 'Kurdî (Kurmancî)',   dir: 'ltr' },
  { code: 'ckb',      chrome: 'ckb',      name: 'کوردی (سۆرانی)',     dir: 'rtl' },
  { code: 'ky',       chrome: 'ky',       name: 'Кыргызча',           dir: 'ltr' },
  { code: 'lo',       chrome: 'lo',       name: 'ລາວ',                dir: 'ltr' },
  { code: 'la',       chrome: 'la',       name: 'Latina',             dir: 'ltr' },
  { code: 'lv',       chrome: 'lv',       name: 'Latviešu',           dir: 'ltr' },
  { code: 'ln',       chrome: 'ln',       name: 'Lingála',            dir: 'ltr' },
  { code: 'lt',       chrome: 'lt',       name: 'Lietuvių',           dir: 'ltr' },
  { code: 'lg',       chrome: 'lg',       name: 'Luganda',            dir: 'ltr' },
  { code: 'lb',       chrome: 'lb',       name: 'Lëtzebuergesch',     dir: 'ltr' },
  { code: 'mk',       chrome: 'mk',       name: 'Македонски',         dir: 'ltr' },
  { code: 'mai',      chrome: 'mai',      name: 'मैथिली',             dir: 'ltr' },
  { code: 'mg',       chrome: 'mg',       name: 'Malagasy',           dir: 'ltr' },
  { code: 'ms',       chrome: 'ms',       name: 'Melayu',             dir: 'ltr' },
  { code: 'ml',       chrome: 'ml',       name: 'മലയാളം',             dir: 'ltr' },
  { code: 'mt',       chrome: 'mt',       name: 'Malti',              dir: 'ltr' },
  { code: 'mi',       chrome: 'mi',       name: 'Māori',              dir: 'ltr' },
  { code: 'mr',       chrome: 'mr',       name: 'मराठी',              dir: 'ltr' },
  { code: 'mni-Mtei', chrome: 'mni_Mtei', name: 'ꯃꯤꯇꯩꯂꯣꯟ',          dir: 'ltr' },
  { code: 'lus',      chrome: 'lus',      name: 'Mizo ṭawng',        dir: 'ltr' },
  { code: 'mn',       chrome: 'mn',       name: 'Монгол',             dir: 'ltr' },
  { code: 'my',       chrome: 'my',       name: 'မြန်မာ',             dir: 'ltr' },
  { code: 'ne',       chrome: 'ne',       name: 'नेपाली',             dir: 'ltr' },
  { code: 'no',       chrome: 'no',       name: 'Norsk',              dir: 'ltr' },
  { code: 'or',       chrome: 'or',       name: 'ଓଡ଼ିଆ',              dir: 'ltr' },
  { code: 'om',       chrome: 'om',       name: 'Afaan Oromoo',       dir: 'ltr' },
  { code: 'ps',       chrome: 'ps',       name: 'پښتو',              dir: 'rtl' },
  { code: 'fa',       chrome: 'fa',       name: 'فارسی',              dir: 'rtl' },
  { code: 'pl',       chrome: 'pl',       name: 'Polski',             dir: 'ltr' },
  { code: 'pt-BR',    chrome: 'pt_BR',    name: 'Português (Brasil)', dir: 'ltr' },
  { code: 'pa',       chrome: 'pa',       name: 'ਪੰਜਾਬੀ',             dir: 'ltr' },
  { code: 'qu',       chrome: 'qu',       name: 'Qichwa',             dir: 'ltr' },
  { code: 'ro',       chrome: 'ro',       name: 'Română',             dir: 'ltr' },
  { code: 'ru',       chrome: 'ru',       name: 'Русский',            dir: 'ltr' },
  { code: 'sm',       chrome: 'sm',       name: 'Gagana Samoa',       dir: 'ltr' },
  { code: 'sa',       chrome: 'sa',       name: 'संस्कृत',            dir: 'ltr' },
  { code: 'gd',       chrome: 'gd',       name: 'Gàidhlig',           dir: 'ltr' },
  { code: 'nso',      chrome: 'nso',      name: 'Sepedi',             dir: 'ltr' },
  { code: 'sr',       chrome: 'sr',       name: 'Српски',             dir: 'ltr' },
  { code: 'st',       chrome: 'st',       name: 'Sesotho',            dir: 'ltr' },
  { code: 'sn',       chrome: 'sn',       name: 'ChiShona',           dir: 'ltr' },
  { code: 'sd',       chrome: 'sd',       name: 'سنڌي',              dir: 'rtl' },
  { code: 'si',       chrome: 'si',       name: 'සිංහල',              dir: 'ltr' },
  { code: 'sk',       chrome: 'sk',       name: 'Slovenčina',         dir: 'ltr' },
  { code: 'sl',       chrome: 'sl',       name: 'Slovenščina',        dir: 'ltr' },
  { code: 'so',       chrome: 'so',       name: 'Soomaali',           dir: 'ltr' },
  { code: 'es',       chrome: 'es',       name: 'Español',            dir: 'ltr' },
  { code: 'su',       chrome: 'su',       name: 'Basa Sunda',         dir: 'ltr' },
  { code: 'sw',       chrome: 'sw',       name: 'Kiswahili',          dir: 'ltr' },
  { code: 'sv',       chrome: 'sv',       name: 'Svenska',            dir: 'ltr' },
  { code: 'tg',       chrome: 'tg',       name: 'Тоҷикӣ',            dir: 'ltr' },
  { code: 'ta',       chrome: 'ta',       name: 'தமிழ்',              dir: 'ltr' },
  { code: 'tt',       chrome: 'tt',       name: 'Татар',              dir: 'ltr' },
  { code: 'te',       chrome: 'te',       name: 'తెలుగు',             dir: 'ltr' },
  { code: 'th',       chrome: 'th',       name: 'ภาษาไทย',            dir: 'ltr' },
  { code: 'ti',       chrome: 'ti',       name: 'ትግርኛ',              dir: 'ltr' },
  { code: 'ts',       chrome: 'ts',       name: 'Xitsonga',           dir: 'ltr' },
  { code: 'tr',       chrome: 'tr',       name: 'Türkçe',             dir: 'ltr' },
  { code: 'tk',       chrome: 'tk',       name: 'Türkmen',            dir: 'ltr' },
  { code: 'ak',       chrome: 'ak',       name: 'Twi',                dir: 'ltr' },
  { code: 'uk',       chrome: 'uk',       name: 'Українська',         dir: 'ltr' },
  { code: 'ur',       chrome: 'ur',       name: 'اردو',              dir: 'rtl' },
  { code: 'ug',       chrome: 'ug',       name: 'ئۇيغۇرچە',          dir: 'rtl' },
  { code: 'uz',       chrome: 'uz',       name: "O'zbek",             dir: 'ltr' },
  { code: 'vi',       chrome: 'vi',       name: 'Tiếng Việt',         dir: 'ltr' },
  { code: 'cy',       chrome: 'cy',       name: 'Cymraeg',            dir: 'ltr' },
  { code: 'xh',       chrome: 'xh',       name: 'isiXhosa',           dir: 'ltr' },
  { code: 'yi',       chrome: 'yi',       name: 'ייִדיש',             dir: 'rtl' },
  { code: 'yo',       chrome: 'yo',       name: 'Yorùbá',             dir: 'ltr' },
  { code: 'zu',       chrome: 'zu',       name: 'isiZulu',            dir: 'ltr' },
];

// ─── RTL locale codes (for fast lookup) ──────────────────────────────────────

const RTL_LOCALES = new Set(
  SUPPORTED_LOCALES
    .filter(l => l.dir === 'rtl')
    .map(l => l.code)
);

// ─── Storage key ─────────────────────────────────────────────────────────────

const STORAGE_KEY_LOCALE = 'userLocaleOverride';

// ─── Internal state ───────────────────────────────────────────────────────────

/** @type {string} The locale currently rendered in the UI. */
let _activeLocale = 'en';

/** @type {Object<string, string>} Cached translations for the active locale. */
let _translations = {};

/** @type {boolean} Whether the language selector has been populated at least once. */
let _selectorPopulated = false;

// ─── Core translation function ────────────────────────────────────────────────

/**
 * Loads translations for the specified locale from _locales/<chrome_locale>/messages.json
 * Uses chrome.runtime.getURL() to correctly resolve extension-internal paths.
 *
 * @param {string} localeCode - The locale code (e.g., 'en', 'fr', 'pt-BR')
 * @returns {Promise<Object<string, string>>} Translations object (message key → message string)
 */
async function _loadTranslations(localeCode) {
  try {
    const localeEntry = SUPPORTED_LOCALES.find(l => l.code === localeCode);
    const chromeLocale = localeEntry ? localeEntry.chrome : localeCode;

    // Use chrome.runtime.getURL for reliable path resolution in extensions
    const url = chrome.runtime.getURL(`_locales/${chromeLocale}/messages.json`);
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status} for ${chromeLocale}`);
    }

    const messages = await response.json();

    // Extract just the 'message' values from the full message objects
    const translations = {};
    for (const key in messages) {
      if (Object.prototype.hasOwnProperty.call(messages, key)) {
        const obj = messages[key];
        if (obj && typeof obj.message === 'string') {
          translations[key] = obj.message;
        }
      }
    }

    return translations;
  } catch (error) {
    console.error(`[i18n] Failed to load translations for locale "${localeCode}":`, error);
    return {};
  }
}

/**
 * Retrieves a localised string by message key.
 * Uses cached translations that were loaded dynamically from _locales/.
 *
 * Supports positional placeholders: $1, $2, etc.
 *
 * @param {string} key   - Message key from messages.json
 * @param {string|string[]|number} [substitutions] - Optional placeholder values
 * @returns {string}
 */
function t(key, substitutions) {
  if (!key) return '';

  let msg = _translations[key];
  if (!msg) {
    console.warn(`[i18n] Missing message key: "${key}" for locale: ${_activeLocale}`);
    return key;
  }

  // Handle substitutions for parameterised messages like "$1 chars"
  if (substitutions != null) {
    const subs = Array.isArray(substitutions) ? substitutions : [String(substitutions)];
    for (let i = 0; i < subs.length; i++) {
      // Replace all occurrences of $N (1-indexed) — escaped for regex safety
      const placeholder = '$' + (i + 1);
      // Use split/join to avoid regex issues with $ in replacement strings
      msg = msg.split(placeholder).join(String(subs[i]));
    }
  }

  return msg;
}

// ─── DOM Hydration ────────────────────────────────────────────────────────────

/**
 * Walks the DOM and applies localised strings to elements that carry
 * data-i18n-* attributes. Called at startup and on language change.
 *
 * Performs a single querySelectorAll pass for better performance.
 *
 * Supported attributes:
 *   data-i18n-text          → element.textContent
 *   data-i18n-placeholder   → element.placeholder
 *   data-i18n-title         → element.title
 *   data-i18n-aria-label    → element.setAttribute('aria-label', ...)
 */
function _hydrateDOM() {
  // Single pass: select all elements with any data-i18n-* attribute
  const els = document.querySelectorAll(
    '[data-i18n-text], [data-i18n-placeholder], [data-i18n-title], [data-i18n-aria-label]'
  );

  for (let i = 0; i < els.length; i++) {
    const el = els[i];
    const ds = el.dataset;

    if (ds.i18nText) {
      const msg = t(ds.i18nText);
      if (msg) el.textContent = msg;
    }
    if (ds.i18nPlaceholder) {
      const msg = t(ds.i18nPlaceholder);
      if (msg) el.placeholder = msg;
    }
    if (ds.i18nTitle) {
      const msg = t(ds.i18nTitle);
      if (msg) el.title = msg;
    }
    if (ds.i18nAriaLabel) {
      const msg = t(ds.i18nAriaLabel);
      if (msg) el.setAttribute('aria-label', msg);
    }
  }
}

// ─── RTL / LTR layout ────────────────────────────────────────────────────────

/**
 * Sets the dir and lang attributes on <html> based on the active locale.
 *
 * @param {string} localeCode
 */
function _applyTextDirection(localeCode) {
  const dir = RTL_LOCALES.has(localeCode) ? 'rtl' : 'ltr';
  document.documentElement.setAttribute('dir', dir);
  document.documentElement.setAttribute('lang', localeCode);
}

// ─── Language Selector ────────────────────────────────────────────────────────

/**
 * Builds or updates the <select> options for the language selector dropdown.
 * On first call, creates all <option> elements. On subsequent calls,
 * only updates the selected state for performance (140+ options).
 */
function _populateLanguageSelector() {
  const select = document.getElementById('lang-selector');
  if (!select) return;

  if (!_selectorPopulated) {
    // First time: build all options using a DocumentFragment
    const fragment = document.createDocumentFragment();
    for (let i = 0; i < SUPPORTED_LOCALES.length; i++) {
      const locale = SUPPORTED_LOCALES[i];
      const option = document.createElement('option');
      option.value = locale.code;
      option.textContent = locale.name;
      if (locale.code === _activeLocale) {
        option.selected = true;
      }
      fragment.appendChild(option);
    }
    select.appendChild(fragment);
    _selectorPopulated = true;
  } else {
    // Subsequent calls: just update selected state
    select.value = _activeLocale;
  }
}

/**
 * Handles the user choosing a different language from the selector.
 * Persists the choice, loads translations, and updates the UI instantly.
 *
 * @param {string} newLocaleCode
 */
async function _handleLocaleChange(newLocaleCode) {
  if (newLocaleCode === _activeLocale) return;

  // Validate the code is in our supported list
  const found = SUPPORTED_LOCALES.some(l => l.code === newLocaleCode);
  if (!found) {
    console.warn(`[i18n] Unsupported locale selected: "${newLocaleCode}"`);
    return;
  }

  // Update active locale
  _activeLocale = newLocaleCode;

  // Load translations for the new locale
  _translations = await _loadTranslations(newLocaleCode);

  // Persist the user's choice to storage
  try {
    chrome.storage.local.set({ [STORAGE_KEY_LOCALE]: newLocaleCode });
  } catch (err) {
    console.warn('[i18n] Failed to persist locale preference:', err);
  }

  // Apply the new direction and update all DOM strings instantly
  _applyTextDirection(newLocaleCode);
  _hydrateDOM();
  _populateLanguageSelector();
}

// ─── Locale Resolution ────────────────────────────────────────────────────────

/**
 * Determines the locale to use, in priority order:
 *   1. User's stored override (chrome.storage.local)
 *   2. Chrome's UI language (chrome.i18n.getUILanguage())
 *   3. Best partial match (e.g. 'en-US' → 'en')
 *   4. English fallback
 *
 * @returns {Promise<string>}
 */
function _resolveLocale() {
  return new Promise((resolve) => {
    try {
      chrome.storage.local.get(STORAGE_KEY_LOCALE, (stored) => {
        // Handle potential runtime.lastError
        if (chrome.runtime.lastError) {
          console.warn('[i18n] Storage access error:', chrome.runtime.lastError.message);
          resolve(_matchBrowserLocale());
          return;
        }

        const override = stored && stored[STORAGE_KEY_LOCALE];

        // 1. Stored user override
        if (override && SUPPORTED_LOCALES.some(l => l.code === override)) {
          resolve(override);
          return;
        }

        // 2–4. Browser locale matching
        resolve(_matchBrowserLocale());
      });
    } catch (err) {
      // chrome.storage might not be available (e.g., in tests)
      console.warn('[i18n] Could not access chrome.storage:', err);
      resolve(_matchBrowserLocale());
    }
  });
}

/**
 * Attempts to match the browser's UI language to a supported locale.
 *
 * @returns {string} matched locale code or 'en'
 */
function _matchBrowserLocale() {
  let uiLang;
  try {
    uiLang = chrome.i18n.getUILanguage(); // e.g. 'en-US', 'zh-CN', 'ar'
  } catch (err) {
    return 'en';
  }

  // Exact match first
  if (SUPPORTED_LOCALES.some(l => l.code === uiLang)) {
    return uiLang;
  }

  // Normalise: try the base language tag (e.g. 'en-US' → 'en')
  const baseLang = uiLang.split('-')[0].toLowerCase();
  const baseMatch = SUPPORTED_LOCALES.find(l =>
    l.code === baseLang ||
    l.code.toLowerCase().startsWith(baseLang + '-') ||
    l.code.toLowerCase().startsWith(baseLang + '_')
  );
  if (baseMatch) {
    return baseMatch.code;
  }

  // English fallback
  return 'en';
}

// ─── Public Initialiser ───────────────────────────────────────────────────────

/**
 * Initialises the i18n system. Must be called (and awaited) before
 * popup.js touches any translatable DOM.
 *
 * @returns {Promise<void>}
 */
async function initI18n() {
  _activeLocale = await _resolveLocale();
  _translations = await _loadTranslations(_activeLocale);

  _applyTextDirection(_activeLocale);
  _hydrateDOM();
  _populateLanguageSelector();

  // Wire up the language selector change event
  const select = document.getElementById('lang-selector');
  if (select) {
    select.addEventListener('change', (e) => {
      _handleLocaleChange(e.target.value);
    });
  }
}

/**
 * Returns the currently active locale code.
 *
 * @returns {string}
 */
function getActiveLocale() {
  return _activeLocale;
}

// ─── Expose public API to global scope ────────────────────────────────────────
// popup.js relies on these being globally accessible.
// Using window explicitly for clarity.

window.t = t;
window.getActiveLocale = getActiveLocale;
window.initI18n = initI18n;