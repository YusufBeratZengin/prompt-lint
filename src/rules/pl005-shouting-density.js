/**
 * Rule PL005: ALL-CAPS shouting density
 */

const COMMON_ACRONYMS = new Set([
  "API", "LLM", "CLI", "JSON", "URL", "HTML", "CSS", "SARIF", "UUID", "HTTP",
  "HTTPS", "REST", "SQL", "CI", "CD", "PR", "ID", "OS", "OK", "MIT", "BPE",
  "ESM", "TODO", "FIXME", "TBD", "README", "CHANGELOG", "CONTRIBUTING",
  "SECURITY", "LICENSE", "SDK", "IDE", "AI", "AST", "CWD", "STDIN", "STDOUT",
  "STDERR", "UTF8", "ASCII", "PL001", "PL002", "PL003", "PL004", "PL005",
  "PL006", "PL007", "PL008", "PL009", "PL010", "PL011", "PL012"
]);

export default {
  meta: {
    id: "PL005",
    name: "shouting-density",
    description: "Excessive ALL-CAPS text detected (shouting at the model)",
    category: "style",
    defaultSeverity: "warning",
    recommended: true,
    docsUrl: "https://github.com/YusufBeratZengin/prompt-lint#pl005"
  },

  run(context) {
    const uppercaseThreshold = context.options?.uppercaseThreshold ?? 0.4;
    const minWords = context.options?.minWords ?? 5;
    const consecutiveLimit = context.options?.consecutiveLimit ?? 3;
    const diagnostics = [];

    for (const lineInfo of context.lines) {
      if (lineInfo.isCodeBlock || lineInfo.isHeading || !lineInfo.raw.trim()) {
        continue;
      }

      // Remove inline code and markdown links
      const cleanLine = lineInfo.raw
        .replace(/`[^`]+`/g, " ")
        .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1");

      const wordMatches = [...cleanLine.matchAll(/\b[\p{L}\p{N}_]+\b/gu)];
      if (wordMatches.length < minWords) {
        continue;
      }

      let upperCount = 0;
      let consecutiveUpper = 0;
      let maxConsecutiveUpper = 0;
      let consecutiveStartIndex = -1;
      let consecutiveEndIndex = -1;
      let tempConsecutiveStart = -1;

      for (const match of wordMatches) {
        const word = match[0];
        const isAllUpper = word === word.toUpperCase() &&
          word !== word.toLowerCase() &&
          word.length >= 2 &&
          !COMMON_ACRONYMS.has(word);

        if (isAllUpper) {
          upperCount++;
          consecutiveUpper++;
          if (tempConsecutiveStart === -1) {
            tempConsecutiveStart = match.index;
          }
          if (consecutiveUpper > maxConsecutiveUpper) {
            maxConsecutiveUpper = consecutiveUpper;
            consecutiveStartIndex = tempConsecutiveStart;
            consecutiveEndIndex = match.index + word.length;
          }
        } else {
          consecutiveUpper = 0;
          tempConsecutiveStart = -1;
        }
      }

      const ratio = upperCount / wordMatches.length;

      if (maxConsecutiveUpper >= consecutiveLimit || (ratio >= uppercaseThreshold && upperCount >= 3)) {
        const col = consecutiveStartIndex !== -1 ? consecutiveStartIndex + 1 : 1;
        const endCol = consecutiveEndIndex !== -1 ? consecutiveEndIndex + 1 : lineInfo.raw.length + 1;
        const snippet = cleanLine.trim();
        const displaySnippet = snippet.length > 50 ? `${snippet.slice(0, 47)}...` : snippet;

        diagnostics.push({
          ruleId: "PL005",
          severity: context.severity || "warning",
          message: `Excessive ALL-CAPS text detected ("${displaySnippet}"). Models do not require shouting; use precise phrasing instead.`,
          line: lineInfo.lineNumber,
          column: col,
          endLine: lineInfo.lineNumber,
          endColumn: endCol,
          snippet: lineInfo.raw
        });
      }
    }

    return diagnostics;
  }
};
