/**
 * Rule PL011: Heading depth > 4
 */
export default {
  meta: {
    id: "PL011",
    name: "excessive-heading-depth",
    description: "Markdown heading depth exceeds maximum recommended depth of 4",
    category: "style",
    defaultSeverity: "warning",
    recommended: true,
    docsUrl: "https://github.com/YusufBeratZengin/prompt-lint/blob/main/docs/rules.md#pl011"
  },

  run(context) {
    const diagnostics = [];

    for (const lineInfo of context.lines) {
      if (!lineInfo.isCodeBlock && lineInfo.isHeading && lineInfo.headingDepth > 4) {
        diagnostics.push({
          ruleId: "PL011",
          severity: context.severity || "warning",
          message: `Heading depth (${lineInfo.headingDepth}) exceeds recommended maximum depth of 4. Flatten hierarchy to improve LLM instruction retrieval.`,
          line: lineInfo.lineNumber,
          column: 1,
          endLine: lineInfo.lineNumber,
          endColumn: lineInfo.raw.length + 1,
          snippet: lineInfo.raw
        });
      }
    }

    return diagnostics;
  }
};
