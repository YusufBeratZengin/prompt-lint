/**
 * Text processing and similarity utilities for prompt-lint.
 */

/**
 * Calculates Shannon entropy of a given string.
 * High entropy (> 4.5 for strings >= 20 chars) often indicates cryptographic keys or tokens.
 *
 * @param {string} str
 * @returns {number}
 */
export function calculateEntropy(str) {
  if (!str || str.length === 0) return 0;

  const frequencies = new Map();
  for (let i = 0; i < str.length; i++) {
    const char = str[i];
    frequencies.set(char, (frequencies.get(char) || 0) + 1);
  }

  let entropy = 0;
  const len = str.length;
  for (const count of frequencies.values()) {
    const p = count / len;
    entropy -= p * Math.log2(p);
  }

  return entropy;
}

/**
 * Tokenizes text into normalized words (lowercase, alphanumeric).
 *
 * @param {string} text
 * @returns {string[]}
 */
export function tokenizeWords(text) {
  if (!text) return [];
  const matches = text.toLowerCase().match(/[\p{L}\p{N}]+/gu);
  return matches || [];
}

/**
 * Generates an array of word n-grams (shingles) from an array of words.
 *
 * @param {string[]} words
 * @param {number} n Shingle size (default 2)
 * @returns {Set<string>}
 */
export function createShingles(words, n = 2) {
  const shingles = new Set();
  if (words.length < n) {
    if (words.length > 0) {
      shingles.add(words.join(" "));
    }
    return shingles;
  }

  for (let i = 0; i <= words.length - n; i++) {
    shingles.add(words.slice(i, i + n).join(" "));
  }
  return shingles;
}

/**
 * Computes Jaccard similarity between two sets of shingles.
 *
 * @param {Set<string>} setA
 * @param {Set<string>} setB
 * @returns {number} Value between 0.0 and 1.0
 */
export function jaccardSimilarity(setA, setB) {
  if (setA.size === 0 && setB.size === 0) return 1.0;
  if (setA.size === 0 || setB.size === 0) return 0.0;

  let intersection = 0;
  for (const item of setA) {
    if (setB.has(item)) {
      intersection++;
    }
  }

  const union = setA.size + setB.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

/**
 * Converts a 0-based character offset into 1-based { line, column }.
 *
 * @param {string} content
 * @param {number} offset
 * @returns {{ line: number, column: number }}
 */
export function getLineAndColumn(content, offset) {
  const boundedOffset = Math.max(0, Math.min(offset, content.length));
  let line = 1;
  let lastNewline = -1;

  for (let i = 0; i < boundedOffset; i++) {
    if (content[i] === "\n") {
      line++;
      lastNewline = i;
    }
  }

  const column = boundedOffset - lastNewline;
  return { line, column };
}

/**
 * Masks a secret string for safe display in diagnostics and logs.
 *
 * @param {string} secret
 * @returns {string}
 */
export function maskSecret(secret) {
  if (!secret || secret.length <= 6) {
    return "******";
  }
  const prefix = secret.slice(0, 4);
  const suffix = secret.slice(-2);
  return `${prefix}${"*".repeat(Math.max(4, secret.length - 6))}${suffix}`;
}

/**
 * Strips markdown emphasis, inline links, and backticks for clean text evaluation.
 *
 * @param {string} text
 * @returns {string}
 */
export function stripMarkdownFormatting(text) {
  return text
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, "$1") // images
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")  // links
    .replace(/`([^`]+)`/g, "$1")              // inline code
    .replace(/[*_~]{1,3}([^*_~]+)[*_~]{1,3}/g, "$1") // bold/italic/strike
    .replace(/^[\s*+-]+\s+/, "")              // list bullets
    .replace(/^\d+\.\s+/, "");                // numbered lists
}
