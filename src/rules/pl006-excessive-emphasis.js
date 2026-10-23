/**
 * Rule PL006: Excessive emphasis markers
 */

export default {
  meta: {
    id: "PL006",
    name: "excessive-emphasis",
    description: "Excessive emphasis markers detected (repeated punctuation or stacked formatting)",
    category: "style",
    defaultSeverity: "warning",
    recommended: true,
    docsUrl: "https://github.com/YusufBeratZengin/prompt-lint/blob/main/docs/rules.md#pl006"
  },

  run(context) {
    const diagnostics = [];

    const repeatedPunctuationRegex = /(?:!{2,}|\?{2,}|![?!]+|\?[!]+)/g;
    const stackedFormattingRegex = /(?:\*\*\*[^*]+\*\*\*|_\*\*[^*]+\*\*_\`|\*\*_[^*]+_\*\*)/g;

    for (const lineInfo of context.lines) {
      if (lineInfo.isCodeBlock || !lineInfo.raw.trim()) {
        continue;
      }

      // Ignore inline code snippets
      const lineWithoutInlineCode = lineInfo.raw.replace(/`[^`]+`/g, (m) => " ".repeat(m.length));

      // 1. Repeated punctuation (!, ?, !?)
      let match;
      while ((match = repeatedPunctuationRegex.exec(lineWithoutInlineCode)) !== null) {
        const col = match.index + 1;
        diagnostics.push({
          ruleId: "PL006",
          severity: context.severity || "warning",
          message: `Excessive emphasis marker "${match[0]}" detected. Multiple punctuation marks do not improve model adherence.`,
          line: lineInfo.lineNumber,
          column: col,
          endLine: lineInfo.lineNumber,
          endColumn: col + match[0].length,
          snippet: lineInfo.raw
        });
      }

      // 2. Stacked bold/italic asterisks
      while ((match = stackedFormattingRegex.exec(lineWithoutInlineCode)) !== null) {
        const col = match.index + 1;
        diagnostics.push({
          ruleId: "PL006",
          severity: context.severity || "warning",
          message: `Stacked emphasis formatting "${match[0]}" detected. Use standard single-level bold or italics.`,
          line: lineInfo.lineNumber,
          column: col,
          endLine: lineInfo.lineNumber,
          endColumn: col + match[0].length,
          snippet: lineInfo.raw
        });
      }
    }

    return diagnostics;
  }
};
