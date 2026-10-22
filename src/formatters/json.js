/**
 * JSON output formatter for prompt-lint.
 */

/**
 * Formats lint results as JSON string.
 *
 * @param {Array<{ filePath: string, diagnostics: Array<any>, tokenStats?: any }>} results
 * @returns {string}
 */
export function formatJson(results) {
  const formatted = results.map(r => ({
    filePath: r.filePath,
    tokenStats: r.tokenStats || null,
    errorCount: r.diagnostics.filter(d => d.severity === "error").length,
    warningCount: r.diagnostics.filter(d => d.severity === "warning").length,
    messages: r.diagnostics.map(d => ({
      ruleId: d.ruleId,
      severity: d.severity,
      message: d.message,
      line: d.line,
      column: d.column,
      endLine: d.endLine,
      endColumn: d.endColumn
    }))
  }));

  return JSON.stringify(formatted, null, 2);
}

export default formatJson;
