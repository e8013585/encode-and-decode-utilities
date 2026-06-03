/**
 * popup.js — Main popup controller
 *
 * Orchestrates tab navigation, encode/decode operations, copy-to-clipboard,
 * status messages, and character counts. All user-facing strings are
 * resolved through the i18n system (t() function from i18n.js).
 */
'use strict';

// ─── Constants ─────────────────────────────────────────────────────────────
const TABS = ['base64', 'url', 'html'];
const STATUS_CLEAR_DELAY = 3000;
const COPY_FEEDBACK_DELAY = 1800;

// ─── Helpers ────────────────────────────────────────────────────────────────

/**
 * Shorthand for document.getElementById with null safety.
 * @param {string} id
 * @returns {HTMLElement|null}
 */
function $id(id) {
  return document.getElementById(id);
}

// ─── Localised char count ────────────────────────────────────────────────────

/**
 * Formats the character count for display next to the output label.
 *
 * @param {number} count
 * @returns {string}
 */
function formatCharCount(count) {
  if (count === 0) return '';
  if (count === 1) return t('charCountSingular');
  return t('charCountPlural', [count.toLocaleString(getActiveLocale())]);
}

// ─── Status Management ───────────────────────────────────────────────────────

/** @type {Map<string, number>} Maps tab type → active timeout ID */
const statusTimers = new Map();

/**
 * Displays a status message below the output for a given tab.
 *
 * @param {string} type    - Tab type: 'base64', 'url', or 'html'
 * @param {string} message - The message text to display
 * @param {string} [level='error'] - 'error', 'success', or 'warning'
 */
function showStatus(type, message, level) {
  if (!level) level = 'error';
  const el = $id(type + '-status');
  if (!el) return;

  el.textContent = message;
  el.className = 'status-msg status-msg--' + level;

  if (statusTimers.has(type)) {
    clearTimeout(statusTimers.get(type));
  }

  const timerId = setTimeout(function () {
    el.textContent = '';
    el.className = 'status-msg';
    statusTimers.delete(type);
  }, STATUS_CLEAR_DELAY);

  statusTimers.set(type, timerId);
}

/**
 * Clears the status message for a given tab immediately.
 *
 * @param {string} type - Tab type
 */
function clearStatus(type) {
  const el = $id(type + '-status');
  if (!el) return;

  el.textContent = '';
  el.className = 'status-msg';

  if (statusTimers.has(type)) {
    clearTimeout(statusTimers.get(type));
    statusTimers.delete(type);
  }
}

// ─── Output Helpers ──────────────────────────────────────────────────────────

/**
 * Sets the output textarea value and updates the character count.
 *
 * @param {string} type  - Tab type
 * @param {string} value - The output string
 */
function setOutput(type, value) {
  const outputEl = $id(type + '-output');
  const countEl = $id(type + '-char-count');
  if (!outputEl || !countEl) return;

  outputEl.value = value;
  outputEl.classList.remove('field-textarea--error');
  countEl.textContent = formatCharCount(value.length);
}

/**
 * Marks the output textarea as having an error (clears value, adds error styling).
 *
 * @param {string} type - Tab type
 */
function setOutputError(type) {
  const outputEl = $id(type + '-output');
  const countEl = $id(type + '-char-count');
  if (!outputEl || !countEl) return;

  outputEl.value = '';
  outputEl.classList.add('field-textarea--error');
  countEl.textContent = '';
}

/**
 * Clears both input and output for a tab, resets status, and focuses input.
 *
 * @param {string} type - Tab type
 */
function clearAll(type) {
  const inputEl = $id(type + '-input');
  const outputEl = $id(type + '-output');
  const countEl = $id(type + '-char-count');
  if (!inputEl || !outputEl || !countEl) return;

  inputEl.value = '';
  outputEl.value = '';
  outputEl.classList.remove('field-textarea--error');
  countEl.textContent = '';
  clearStatus(type);
  inputEl.focus();
}

// ─── Encode / Decode ─────────────────────────────────────────────────────────

/** Maps tab type → getter for the corresponding utility module */
const utilityMap = {
  base64: function () { return Base64Utils; },
  url:    function () { return URLUtils; },
  html:   function () { return HTMLEntitiesUtils; },
};

/**
 * Translates an error/warning code (+ optional detail) into a localised
 * string via the t() function.
 *
 * @param {string} code                - Message key matching messages.json
 * @param {string|string[]} [detail]   - Optional interpolation value(s)
 * @returns {string}
 */
function localiseUtilityMessage(code, detail) {
  if (!code) return '';
  if (detail != null) {
    const subs = Array.isArray(detail) ? detail : [detail];
    return t(code, subs);
  }
  return t(code);
}

/**
 * Runs an encode or decode operation for the given tab type.
 *
 * @param {string} type   - Tab type: 'base64', 'url', or 'html'
 * @param {string} action - 'encode' or 'decode'
 */
function runOperation(type, action) {
  const inputEl = $id(type + '-input');
  if (!inputEl) return;

  const input = inputEl.value;

  if (input === '') {
    setOutput(type, '');
    clearStatus(type);
    return;
  }

  const getUtils = utilityMap[type];
  if (!getUtils) return;

  const utils = getUtils();
  const fn = utils[action];
  if (typeof fn !== 'function') return;

  const result = fn(input);

  if (result.error !== null) {
    setOutputError(type);
    // Prefer a structured error code for i18n; fall back to the raw error string
    const msg = result.errorCode
      ? localiseUtilityMessage(result.errorCode, result.errorDetail)
      : result.error;
    showStatus(type, msg, 'error');
    return;
  }

  setOutput(type, result.result);

  if (result.warningCode) {
    showStatus(type, localiseUtilityMessage(result.warningCode, result.warningDetail), 'warning');
  } else if (result.warning) {
    showStatus(type, result.warning, 'warning');
  } else {
    clearStatus(type);
  }
}

// ─── Copy to Clipboard ───────────────────────────────────────────────────────

/** @type {Map<string, number>} Tracks active copy feedback timers by target ID */
const copyTimers = new Map();

/**
 * Copies the output textarea value to the clipboard and shows visual feedback.
 *
 * Uses textContent instead of innerHTML for the feedback label to prevent XSS.
 *
 * @param {string} targetId - ID of the textarea to copy from
 * @param {HTMLButtonElement} btn - The copy button element
 */
function copyToClipboard(targetId, btn) {
  const targetEl = $id(targetId);
  if (!targetEl || !targetEl.value) return;

  // Prevent overlapping feedback timers for the same button
  if (copyTimers.has(targetId)) {
    clearTimeout(copyTimers.get(targetId));
  }

  // Save original state
  const originalHTML = btn.innerHTML;
  const originalClass = btn.className;
  const copiedLabel = t('btnCopied');

  navigator.clipboard.writeText(targetEl.value).then(function () {
    // Build feedback safely without innerHTML injection
    // Clear the button
    btn.textContent = '';

    // Create SVG check icon
    const svgNS = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(svgNS, 'svg');
    svg.setAttribute('viewBox', '0 0 16 16');
    svg.setAttribute('fill', 'none');
    svg.setAttribute('aria-hidden', 'true');

    const path = document.createElementNS(svgNS, 'path');
    path.setAttribute('d', 'M3 8l3.5 3.5L13 5');
    path.setAttribute('stroke', 'currentColor');
    path.setAttribute('stroke-width', '1.8');
    path.setAttribute('stroke-linecap', 'round');
    path.setAttribute('stroke-linejoin', 'round');
    svg.appendChild(path);

    const span = document.createElement('span');
    span.textContent = copiedLabel;

    btn.appendChild(svg);
    btn.appendChild(span);
    btn.classList.add('btn--copy--success');

    const timerId = setTimeout(function () {
      btn.innerHTML = originalHTML;
      btn.className = originalClass;
      copyTimers.delete(targetId);
    }, COPY_FEEDBACK_DELAY);

    copyTimers.set(targetId, timerId);
  }).catch(function () {
    // Fallback: select the text for manual copy
    targetEl.select();
    targetEl.setSelectionRange(0, targetEl.value.length);
  });
}

// ─── Tab Management ──────────────────────────────────────────────────────────

/**
 * Switches to the specified tab, updating ARIA attributes and panel visibility.
 *
 * @param {string} activeTab - Tab type to activate
 */
function switchTab(activeTab) {
  for (let i = 0; i < TABS.length; i++) {
    const tab = TABS[i];
    const tabBtn = $id('tab-' + tab);
    const panel = $id('panel-' + tab);
    if (!tabBtn || !panel) continue;

    const isActive = tab === activeTab;
    tabBtn.classList.toggle('tab-btn--active', isActive);
    tabBtn.setAttribute('aria-selected', String(isActive));

    if (isActive) {
      panel.removeAttribute('hidden');
    } else {
      panel.setAttribute('hidden', '');
    }
  }

  // Focus the input of the active tab
  requestAnimationFrame(function () {
    var inputEl = $id(activeTab + '-input');
    if (inputEl) inputEl.focus();
  });
}

// ─── Keyboard Navigation for Tabs ────────────────────────────────────────────

/**
 * Handles arrow key navigation within the tab bar per WAI-ARIA tab pattern.
 *
 * @param {KeyboardEvent} e
 */
function handleTabKeydown(e) {
  const tabBtn = e.target.closest('[role="tab"]');
  if (!tabBtn) return;

  let direction = 0;
  if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
    direction = 1;
  } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
    direction = -1;
  } else {
    return;
  }

  e.preventDefault();

  const currentTab = tabBtn.dataset.tab;
  const currentIndex = TABS.indexOf(currentTab);
  if (currentIndex === -1) return;

  const nextIndex = (currentIndex + direction + TABS.length) % TABS.length;
  const nextTabBtn = $id('tab-' + TABS[nextIndex]);
  if (nextTabBtn) {
    nextTabBtn.focus();
    nextTabBtn.click();
  }
}

// ─── Event Listeners ─────────────────────────────────────────────────────────

/**
 * Sets up all event listeners using event delegation for efficiency.
 */
function setupEventListeners() {
  // Tab clicks
  var tabNav = document.querySelector('.tab-nav');
  if (tabNav) {
    tabNav.addEventListener('click', function (e) {
      var tabBtn = e.target.closest('[data-tab]');
      if (tabBtn) switchTab(tabBtn.dataset.tab);
    });

    // Arrow key navigation for tabs
    tabNav.addEventListener('keydown', handleTabKeydown);
  }

  // Action buttons (encode, decode, clear, copy)
  var panels = document.querySelector('.panels');
  if (panels) {
    panels.addEventListener('click', function (e) {
      var btn = e.target.closest('[data-action]');
      if (!btn) return;

      var action = btn.dataset.action;
      var type = btn.dataset.type;
      var target = btn.dataset.target;

      switch (action) {
        case 'encode':
        case 'decode':
          runOperation(type, action);
          break;
        case 'clear':
          clearAll(type);
          break;
        case 'copy':
          copyToClipboard(target, btn);
          break;
      }
    });

    // Ctrl+Enter keyboard shortcut to encode
    panels.addEventListener('keydown', function (e) {
      if (e.key !== 'Enter' || !e.ctrlKey) return;

      var textarea = e.target.closest('textarea:not([readonly])');
      if (!textarea) return;

      e.preventDefault();

      var type = textarea.id.replace('-input', '');
      if (TABS.indexOf(type) !== -1) {
        runOperation(type, 'encode');
      }
    });
  }
}

// ─── Init ────────────────────────────────────────────────────────────────────

/**
 * Initialises the popup. Waits for i18n to fully resolve before
 * setting up event listeners and activating the default tab.
 */
async function init() {
  try {
    // i18n MUST resolve before we touch the DOM or run any operations
    await initI18n();
  } catch (err) {
    console.error('[popup] i18n initialisation failed:', err);
    // Continue anyway — UI will show fallback English from HTML
  }

  setupEventListeners();
  switchTab('base64');
}

// Ensure init runs after DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}