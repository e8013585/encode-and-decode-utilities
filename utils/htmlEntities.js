/**
 * HTML Entity Encoding Utility
 *
 * Manually implemented without any DOM manipulation or third-party libraries.
 *
 * Encode: replaces characters with security/HTML implications with named entities.
 * Decode: replaces both named entities and numeric character references (decimal
 *         and hexadecimal) back to their original characters.
 *
 * Named entity coverage:
 *   The five characters that MUST be escaped in HTML content and attributes:
 *     &  <  >  "  '
 *   Plus a curated set of common named entities for decode support.
 */
'use strict';

const HTMLEntitiesUtils = (() => {

  // ── Encode regex ──────────────────────────────────────────────────────────
  // Single pass replacement for the five security-critical characters.
  const ENCODE_REGEX = /[&<>"']/g;

  const ENCODE_CHAR_MAP = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  };

  // ── Decode map ──────────────────────────────────────────────────────────────
  // Uses a Map for O(1) lookups instead of Object + hasOwnProperty.
  const DECODE_MAP = new Map([
    // Essential five
    ['&amp;', '&'],
    ['&lt;', '<'],
    ['&gt;', '>'],
    ['&quot;', '"'],
    ['&#39;', "'"],
    ['&apos;', "'"],

    // Whitespace / formatting
    ['&nbsp;', '\u00A0'],
    ['&ensp;', '\u2002'],
    ['&emsp;', '\u2003'],
    ['&thinsp;', '\u2009'],
    ['&zwj;', '\u200D'],
    ['&zwnj;', '\u200C'],

    // Punctuation
    ['&mdash;', '\u2014'],
    ['&ndash;', '\u2013'],
    ['&laquo;', '\u00AB'],
    ['&raquo;', '\u00BB'],
    ['&lsquo;', '\u2018'],
    ['&rsquo;', '\u2019'],
    ['&ldquo;', '\u201C'],
    ['&rdquo;', '\u201D'],
    ['&sbquo;', '\u201A'],
    ['&bdquo;', '\u201E'],
    ['&hellip;', '\u2026'],
    ['&bull;', '\u2022'],
    ['&middot;', '\u00B7'],
    ['&para;', '\u00B6'],
    ['&sect;', '\u00A7'],
    ['&dagger;', '\u2020'],
    ['&Dagger;', '\u2021'],
    ['&permil;', '\u2030'],
    ['&prime;', '\u2032'],
    ['&Prime;', '\u2033'],
    ['&lsaquo;', '\u2039'],
    ['&rsaquo;', '\u203A'],
    ['&oline;', '\u203E'],
    ['&frasl;', '\u2044'],

    // Math / symbols
    ['&trade;', '\u2122'],
    ['&copy;', '\u00A9'],
    ['&reg;', '\u00AE'],
    ['&deg;', '\u00B0'],
    ['&plusmn;', '\u00B1'],
    ['&micro;', '\u00B5'],
    ['&times;', '\u00D7'],
    ['&divide;', '\u00F7'],
    ['&frac12;', '\u00BD'],
    ['&frac14;', '\u00BC'],
    ['&frac34;', '\u00BE'],
    ['&sup1;', '\u00B9'],
    ['&sup2;', '\u00B2'],
    ['&sup3;', '\u00B3'],
    ['&euro;', '\u20AC'],
    ['&pound;', '\u00A3'],
    ['&yen;', '\u00A5'],
    ['&cent;', '\u00A2'],
    ['&curren;', '\u00A4'],
    ['&infin;', '\u221E'],
    ['&sum;', '\u2211'],
    ['&prod;', '\u220F'],
    ['&minus;', '\u2212'],
    ['&lowast;', '\u2217'],
    ['&radic;', '\u221A'],
    ['&prop;', '\u221D'],
    ['&part;', '\u2202'],
    ['&int;', '\u222B'],
    ['&ne;', '\u2260'],
    ['&equiv;', '\u2261'],
    ['&le;', '\u2264'],
    ['&ge;', '\u2265'],
    ['&sub;', '\u2282'],
    ['&sup;', '\u2283'],
    ['&sube;', '\u2286'],
    ['&supe;', '\u2287'],
    ['&oplus;', '\u2295'],
    ['&otimes;', '\u2297'],
    ['&perp;', '\u22A5'],
    ['&sdot;', '\u22C5'],
    ['&and;', '\u2227'],
    ['&or;', '\u2228'],
    ['&cap;', '\u2229'],
    ['&cup;', '\u222A'],
    ['&empty;', '\u2205'],
    ['&exist;', '\u2203'],
    ['&forall;', '\u2200'],
    ['&fnof;', '\u0192'],
    ['&isin;', '\u2208'],
    ['&notin;', '\u2209'],
    ['&ni;', '\u220B'],
    ['&ang;', '\u2220'],
    ['&lang;', '\u2329'],
    ['&rang;', '\u232A'],
    ['&loz;', '\u25CA'],
    ['&spades;', '\u2660'],
    ['&clubs;', '\u2663'],
    ['&hearts;', '\u2665'],
    ['&diams;', '\u2666'],

    // Latin extended
    ['&Agrave;', '\u00C0'], ['&Aacute;', '\u00C1'], ['&Acirc;', '\u00C2'],
    ['&Atilde;', '\u00C3'], ['&Auml;', '\u00C4'], ['&Aring;', '\u00C5'],
    ['&AElig;', '\u00C6'], ['&Ccedil;', '\u00C7'], ['&Egrave;', '\u00C8'],
    ['&Eacute;', '\u00C9'], ['&Ecirc;', '\u00CA'], ['&Euml;', '\u00CB'],
    ['&Igrave;', '\u00CC'], ['&Iacute;', '\u00CD'], ['&Icirc;', '\u00CE'],
    ['&Iuml;', '\u00CF'], ['&ETH;', '\u00D0'], ['&Ntilde;', '\u00D1'],
    ['&Ograve;', '\u00D2'], ['&Oacute;', '\u00D3'], ['&Ocirc;', '\u00D4'],
    ['&Otilde;', '\u00D5'], ['&Ouml;', '\u00D6'], ['&Oslash;', '\u00D8'],
    ['&Ugrave;', '\u00D9'], ['&Uacute;', '\u00DA'], ['&Ucirc;', '\u00DB'],
    ['&Uuml;', '\u00DC'], ['&Yacute;', '\u00DD'], ['&THORN;', '\u00DE'],
    ['&szlig;', '\u00DF'], ['&agrave;', '\u00E0'], ['&aacute;', '\u00E1'],
    ['&acirc;', '\u00E2'], ['&atilde;', '\u00E3'], ['&auml;', '\u00E4'],
    ['&aring;', '\u00E5'], ['&aelig;', '\u00E6'], ['&ccedil;', '\u00E7'],
    ['&egrave;', '\u00E8'], ['&eacute;', '\u00E9'], ['&ecirc;', '\u00EA'],
    ['&euml;', '\u00EB'], ['&igrave;', '\u00EC'], ['&iacute;', '\u00ED'],
    ['&icirc;', '\u00EE'], ['&iuml;', '\u00EF'], ['&eth;', '\u00F0'],
    ['&ntilde;', '\u00F1'], ['&ograve;', '\u00F2'], ['&oacute;', '\u00F3'],
    ['&ocirc;', '\u00F4'], ['&otilde;', '\u00F5'], ['&ouml;', '\u00F6'],
    ['&oslash;', '\u00F8'], ['&ugrave;', '\u00F9'], ['&uacute;', '\u00FA'],
    ['&ucirc;', '\u00FB'], ['&uuml;', '\u00FC'], ['&yacute;', '\u00FD'],
    ['&thorn;', '\u00FE'], ['&yuml;', '\u00FF'],

    // Greek
    ['&Alpha;', '\u0391'], ['&Beta;', '\u0392'], ['&Gamma;', '\u0393'],
    ['&Delta;', '\u0394'], ['&Epsilon;', '\u0395'], ['&Zeta;', '\u0396'],
    ['&Eta;', '\u0397'], ['&Theta;', '\u0398'], ['&Iota;', '\u0399'],
    ['&Kappa;', '\u039A'], ['&Lambda;', '\u039B'], ['&Mu;', '\u039C'],
    ['&Nu;', '\u039D'], ['&Xi;', '\u039E'], ['&Omicron;', '\u039F'],
    ['&Pi;', '\u03A0'], ['&Rho;', '\u03A1'], ['&Sigma;', '\u03A3'],
    ['&Tau;', '\u03A4'], ['&Upsilon;', '\u03A5'], ['&Phi;', '\u03A6'],
    ['&Chi;', '\u03A7'], ['&Psi;', '\u03A8'], ['&Omega;', '\u03A9'],
    ['&alpha;', '\u03B1'], ['&beta;', '\u03B2'], ['&gamma;', '\u03B3'],
    ['&delta;', '\u03B4'], ['&epsilon;', '\u03B5'], ['&zeta;', '\u03B6'],
    ['&eta;', '\u03B7'], ['&theta;', '\u03B8'], ['&iota;', '\u03B9'],
    ['&kappa;', '\u03BA'], ['&lambda;', '\u03BB'], ['&mu;', '\u03BC'],
    ['&nu;', '\u03BD'], ['&xi;', '\u03BE'], ['&omicron;', '\u03BF'],
    ['&pi;', '\u03C0'], ['&rho;', '\u03C1'], ['&sigmaf;', '\u03C2'],
    ['&sigma;', '\u03C3'], ['&tau;', '\u03C4'], ['&upsilon;', '\u03C5'],
    ['&phi;', '\u03C6'], ['&chi;', '\u03C7'], ['&psi;', '\u03C8'],
    ['&omega;', '\u03C9'], ['&thetasym;', '\u03D1'], ['&upsih;', '\u03D2'],
    ['&piv;', '\u03D6'],

    // Arrows
    ['&larr;', '\u2190'], ['&uarr;', '\u2191'], ['&rarr;', '\u2192'],
    ['&darr;', '\u2193'], ['&harr;', '\u2194'], ['&crarr;', '\u21B5'],
    ['&lArr;', '\u21D0'], ['&uArr;', '\u21D1'], ['&rArr;', '\u21D2'],
    ['&dArr;', '\u21D3'], ['&hArr;', '\u21D4'],
  ]);

  // Build regex for decode: matches named entities AND numeric references.
  const DECODE_REGEX = /&(?:#x[0-9a-fA-F]+|#[0-9]+|[a-zA-Z][a-zA-Z0-9]*);/g;

  // Maximum number of unknown entities to show in the warning preview
  const MAX_UNKNOWN_PREVIEW = 3;

  /**
   * Encodes special HTML characters in a string to their entity equivalents.
   * Only the five security-critical characters are encoded to keep output clean.
   *
   * Uses a single-pass regex replace for better performance than split/join loops.
   *
   * @param {string} input
   * @returns {{ result: string, error: null, errorCode: null } |
   *           { result: null, error: string, errorCode: string, errorDetail?: string }}
   */
  function encode(input) {
    if (typeof input !== 'string') {
      return { result: null, error: 'Input must be a string.', errorCode: 'errorHtmlEncodeFailed', errorDetail: 'Input must be a string.' };
    }
    if (input === '') {
      return { result: '', error: null, errorCode: null };
    }

    try {
      const result = input.replace(ENCODE_REGEX, (ch) => ENCODE_CHAR_MAP[ch]);
      return { result, error: null, errorCode: null };
    } catch (err) {
      return {
        result: null,
        error: `Encoding failed: ${err.message}`,
        errorCode: 'errorHtmlEncodeFailed',
        errorDetail: err.message
      };
    }
  }

  /**
   * Decodes HTML entities (named, decimal, and hex) back to plain text.
   *
   * Returns structured warningCode/warningDetail fields for i18n-compatible
   * warning messages when unknown entities are encountered.
   *
   * @param {string} input
   * @returns {{ result: string, error: null, errorCode: null,
   *             warning?: string, warningCode?: string, warningDetail?: string[] }}
   */
  function decode(input) {
    if (typeof input !== 'string') {
      return { result: null, error: 'Input must be a string.', errorCode: 'errorHtmlDecodeFailed', errorDetail: 'Input must be a string.' };
    }
    if (input === '') {
      return { result: '', error: null, errorCode: null };
    }

    const unknownEntities = [];

    try {
      const result = input.replace(DECODE_REGEX, (match) => {
        // Hexadecimal numeric: &#xHHH;
        if (match.startsWith('&#x') || match.startsWith('&#X')) {
          const codePoint = parseInt(match.slice(3, -1), 16);
          if (Number.isNaN(codePoint) || codePoint < 1 || codePoint > 0x10FFFF) {
            unknownEntities.push(match);
            return match;
          }
          return String.fromCodePoint(codePoint);
        }

        // Decimal numeric: &#NNN;
        if (match.startsWith('&#')) {
          const codePoint = parseInt(match.slice(2, -1), 10);
          if (Number.isNaN(codePoint) || codePoint < 1 || codePoint > 0x10FFFF) {
            unknownEntities.push(match);
            return match;
          }
          return String.fromCodePoint(codePoint);
        }

        // Named entity — O(1) Map lookup
        if (DECODE_MAP.has(match)) {
          return DECODE_MAP.get(match);
        }

        // Unknown named entity — leave as-is and collect for user feedback
        unknownEntities.push(match);
        return match;
      });

      // Surface a non-blocking warning for unrecognised entities
      if (unknownEntities.length > 0) {
        const preview = unknownEntities.slice(0, MAX_UNKNOWN_PREVIEW).join(', ');
        const remaining = unknownEntities.length - MAX_UNKNOWN_PREVIEW;

        let warning;
        let warningCode;
        let warningDetail;

        if (remaining > 0) {
          warning = `Some entities were not recognised and left unchanged: ${preview} and ${remaining} more.`;
          warningCode = 'warningUnknownEntitiesMore';
          warningDetail = [preview, String(remaining)];
        } else {
          warning = `Some entities were not recognised and left unchanged: ${preview}`;
          warningCode = 'warningUnknownEntities';
          warningDetail = [preview];
        }

        return { result, error: null, errorCode: null, warning, warningCode, warningDetail };
      }

      return { result, error: null, errorCode: null };
    } catch (err) {
      return {
        result: null,
        error: `Decoding failed: ${err.message}`,
        errorCode: 'errorHtmlDecodeFailed',
        errorDetail: err.message
      };
    }
  }

  return { encode, decode };
})();