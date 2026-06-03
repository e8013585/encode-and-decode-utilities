/**
 * URL Encoding Utility
 *
 * Uses encodeURIComponent / decodeURIComponent which implement
 * percent-encoding as defined by RFC 3986.
 *
 * encodeURIComponent encodes everything except:
 *   A–Z  a–z  0–9  - _ . ! ~ * ' ( )
 *
 * This is the correct choice for encoding individual URI components
 * (query param values, path segments) rather than a full URI.
 */
'use strict';

const URLUtils = (() => {

  /**
   * Percent-encodes a string for safe use as a URI component.
   *
   * @param {string} input
   * @returns {{ result: string, error: null, errorCode: null } |
   *           { result: null, error: string, errorCode: string }}
   */
  function encode(input) {
    if (typeof input !== 'string') {
      return { result: null, error: 'Input must be a string.', errorCode: 'errorUrlEncodeSurrogate' };
    }
    if (input === '') {
      return { result: '', error: null, errorCode: null };
    }

    try {
      const result = encodeURIComponent(input);
      return { result, error: null, errorCode: null };
    } catch (err) {
      // encodeURIComponent can throw a URIError for lone surrogates
      // (malformed UTF-16 strings). Surface a clear message.
      return {
        result: null,
        error: `Encoding failed: the input contains invalid Unicode surrogate characters. (${err.message})`,
        errorCode: 'errorUrlEncodeSurrogate'
      };
    }
  }

  /**
   * Decodes a percent-encoded URI component string.
   *
   * @param {string} input
   * @returns {{ result: string, error: null, errorCode: null } |
   *           { result: null, error: string, errorCode: string }}
   */
  function decode(input) {
    if (typeof input !== 'string') {
      return { result: null, error: 'Input must be a string.', errorCode: 'errorUrlDecodeMalformed' };
    }

    const trimmed = input.trim();
    if (trimmed === '') {
      return { result: '', error: null, errorCode: null };
    }

    try {
      const result = decodeURIComponent(trimmed);
      return { result, error: null, errorCode: null };
    } catch (err) {
      // decodeURIComponent throws URIError for malformed percent sequences
      return {
        result: null,
        error: `Invalid URL encoding: the input contains a malformed percent-encoded sequence. (${err.message})`,
        errorCode: 'errorUrlDecodeMalformed'
      };
    }
  }

  return { encode, decode };
})();