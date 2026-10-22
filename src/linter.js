import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { parseMarkdownLines } from "./utils/markdown.js";
import { estimateTokens } from "./token-estimator.js";
import { rules } from "./rules/index.js";
import { DEFAULT_CONFIG, mergeConfig } from "./config.js";

/**
 * @typedef {Object} LintDiagnostic
 * @property {string} ruleId
 * @property {"error" | "warning" | "info"} severity
 * @property {string} message
 * @property {number} line
 * @property {number} column
 * @property {number} endLine
 * @property {number} endColumn
 * @property {string} [snippet]
 */

/**
 * @typedef {Object} FileLintResult
 * @property {string} filePath
 * @property {LintDiagnostic[]} diagnostics
 * @property {import('./token-estimator.js').TokenEstimate} tokenStats
 */

/**
 * Lints a raw text string with the specified configuration.
 *
 * @param {string} content Raw prompt text
 * @param {Object} [options]
 * @param {string} [options.filePath='<stdin>']
 * @param {Object} [options.config]
 * @param {string} [options.cwd=process.cwd()]
 * @returns {FileLintResult}
 */
export function lintText(content, options = {}) {
  const filePath = options.filePath || "<stdin>";
  const cwd = options.cwd || process.cwd();
  const config = options.config ? mergeConfig(DEFAULT_CONFIG, options.config) : DEFAULT_CONFIG;

  const tokenStats = estimateTokens(content);
  const lines = parseMarkdownLines(content);

  const diagnostics = [];

  for (const [ruleId, ruleDef] of Object.entries(rules)) {
    const configuredSeverity = config.rules[ruleId] || ruleDef.meta.defaultSeverity;

    if (configuredSeverity === "off") {
      continue;
    }

    const ruleOptions = {
      ...(config.options[ruleId] || {}),
      ...(ruleId === "PL001" && config.budget?.maxTokens ? { maxTokens: config.budget.maxTokens } : {})
    };

    const ruleContext = {
      filePath,
      content,
      lines,
      tokenStats,
      options: ruleOptions,
      severity: configuredSeverity,
      cwd
    };

    try {
      const ruleDiagnostics = ruleDef.run(ruleContext);
      if (Array.isArray(ruleDiagnostics)) {
        for (const diag of ruleDiagnostics) {
          diagnostics.push({
            ...diag,
            severity: configuredSeverity // Ensure user-configured severity takes precedence
          });
        }
      }
    } catch (err) {
      diagnostics.push({
        ruleId,
        severity: "error",
        message: `Internal rule error in ${ruleId}: ${err.message}`,
        line: 1,
        column: 1,
        endLine: 1,
        endColumn: 1,
        snippet: ""
      });
    }
  }

  // Sort diagnostics by line, then column
  diagnostics.sort((a, b) => {
    if (a.line !== b.line) return a.line - b.line;
    return a.column - b.column;
  });

  return {
    filePath,
    diagnostics,
    tokenStats
  };
}

/**
 * Lints a single file on disk.
 *
 * @param {string} relativeOrAbsolutePath
 * @param {Object} [options]
 * @returns {Promise<FileLintResult>}
 */
export async function lintFile(relativeOrAbsolutePath, options = {}) {
  const cwd = options.cwd || process.cwd();
  const fullPath = resolve(cwd, relativeOrAbsolutePath);
  const content = await readFile(fullPath, "utf-8");

  return lintText(content, {
    ...options,
    filePath: relativeOrAbsolutePath,
    cwd
  });
}

/**
 * Lints multiple files.
 *
 * @param {string[]} filePaths
 * @param {Object} [options]
 * @returns {Promise<FileLintResult[]>}
 */
export async function lintFiles(filePaths, options = {}) {
  const results = [];
  for (const file of filePaths) {
    try {
      const res = await lintFile(file, options);
      results.push(res);
    } catch (err) {
      results.push({
        filePath: file,
        tokenStats: { tokens: 0, words: 0, characters: 0, lines: 0 },
        diagnostics: [
          {
            ruleId: "PL000",
            severity: "error",
            message: `Failed to read file: ${err.message}`,
            line: 1,
            column: 1,
            endLine: 1,
            endColumn: 1,
            snippet: ""
          }
        ]
      });
    }
  }
  return results;
}
