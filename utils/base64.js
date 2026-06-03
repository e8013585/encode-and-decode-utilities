/**
 * Base64 Utility
 * Handles encoding and decoding with full Unicode support.
 *
 * Problem:  btoa() only accepts ASCII (Latin-1) characters.
 * Solution: Convert to/from UTF-8 byte sequences via TextEncoder/TextDecoder,
 *           then apply btoa/atob on the raw binary string.
 */
'use strict';

const Base64Utils = (() => {

  /**
   * Converts a Uint8Array of bytes to a binary string.
   * Required as an intermediate step for btoa().
   *
   * Uses a chunked approach with apply() to avoid stack overflow
   * from spreading too many arguments.
   *
   * @param {Uint8Array} bytes
   * @returns {string}
   */
  function bytesToBinaryString(bytes) {
    const CHUNK = 8192;
    const parts = [];
    for (let i = 0; i < bytes.length; i += CHUNK) {
      const slice = bytes.subarray(i, i + CHUNK);
      parts.push(String.fromCharCode.apply(null, slice));
    }
    return parts.join('');
  }

  /**
   * Encodes any Unicode string to Base64.
   *
   * @param {string} input - Raw text to encode.
   * @returns {{ result: string, error: null, errorCode: null } |
   *           { result: null, error: string, errorCode: string, errorDetail?: string }}
   */
  function encode(input) {
    if (typeof input !== 'string') {
      return { result: null, error: 'Input must be a string.', errorCode: 'errorBase64EncodeFailed', errorDetail: 'Input must be a string.' };
    }
    if (input === '') {
      return { result: '', error: null, errorCode: null };
    }

    try {
      const encoder = new TextEncoder(); // UTF-8 by default
      const bytes = encoder.encode(input);
      const binaryString = bytesToBinaryString(bytes);
      const result = btoa(binaryString);
      return { result, error: null, errorCode: null };
    } catch (err) {
      return {
        result: null,
        error: `Encoding failed: ${err.message}`,
        errorCode: 'errorBase64EncodeFailed',
        errorDetail: err.message
      };
    }
  }

  /**
   * Decodes a Base64 string back to the original Unicode text.
   *
   * @param {string} input - Base64-encoded string to decode.
   * @returns {{ result: string, error: null, errorCode: null } |
   *           { result: null, error: string, errorCode: string }}
   */
  function decode(input) {
    if (typeof input !== 'string') {
      return { result: null, error: 'Input must be a string.', errorCode: 'errorInvalidBase64Chars' };
    }

    // Normalise: trim whitespace and line breaks that may be present
    // in formatted Base64 (e.g. PEM-style, copy-pasted from emails).
    const cleaned = input.replace(/\s+/g, '');

    if (cleaned === '') {
      return { result: '', error: null, errorCode: null };
    }

    // Validate Base64 alphabet (RFC 4648): A-Z a-z 0-9 + / and = padding
    const base64Regex = /^[A-Za-z0-9+/]*={0,2}$/;
    if (!base64Regex.test(cleaned)) {
      return {
        result: null,
        error: 'Invalid Base64: contains characters outside the Base64 alphabet.',
        errorCode: 'errorInvalidBase64Chars'
      };
    }

    // Base64 strings must have a length that is a multiple of 4.
    if (cleaned.length % 4 !== 0) {
      return {
        result: null,
        error: 'Invalid Base64: incorrect padding (length must be a multiple of 4).',
        errorCode: 'errorInvalidBase64Padding'
      };
    }

    try {
      const binaryString = atob(cleaned);

      // Convert binary string back to bytes, then decode UTF-8.
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      const decoder = new TextDecoder('utf-8', { fatal: true });
      const result = decoder.decode(bytes);
      return { result, error: null, errorCode: null };
    } catch (err) {
      // TextDecoder with { fatal: true } throws on invalid UTF-8 sequences.
      if (err instanceof TypeError) {
        return {
          result: null,
          error: 'Decoded bytes are not valid UTF-8. The Base64 may encode binary data.',
          errorCode: 'errorInvalidBase64Utf8'
        };
      }
      return {
        result: null,
        error: `Decoding failed: ${err.message}`,
        errorCode: 'errorBase64EncodeFailed',
        errorDetail: err.message
      };
    }
  }

  // Public API
  return { encode, decode };
})();