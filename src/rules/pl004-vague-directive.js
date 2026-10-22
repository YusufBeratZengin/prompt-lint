/**
 * Rule PL004: Vague directives ("be careful", "do your best")
 */

const VAGUE_PATTERNS = [
  { regex: /\bbe\s+careful\b/i, phrase: "be careful" },
  { regex: /\bdo\s+your\s+best\b/i, phrase: "do your best" },
  { regex: /\btry\s+your\s+best\b/i, phrase: "try your best" },
  { regex: /\btry\s+to\b/i, phrase: "try to" },
  { regex: /\bensure\s+high\s+quality\b/i, phrase: "ensure high quality" },
  { regex: /\bmake\s+sure\s+it(?:'s|\s+is)?\s+(?:good|well|high\s+quality)\b/i, phrase: "make sure it works well" },
  { regex: /\bas\s+best\s+as\s+(?:you\s+can|possible)\b/i, phrase: "as best as you can" },
  { regex: /\bhandle\s+(?:appropriately|properly|suitably)\b/i, phrase: "handle appropriately" },
  { regex: /\bact\s+professionally\b/i, phrase: "act professionally" },
  { regex: /\bthink\s+carefully\b/i, phrase: "think carefully" },
  { regex: /\bpay\s+attention\b/i, phrase: "pay attention" },
  { regex: /\bdo\s+good\s+work\b/i, phrase: "do good work" },
  { regex: /\bbe\s+smart\b/i, phrase: "be smart" }
];

export default {
  meta: {
    id: "PL004",
    name: "vague-directive",
    description: "Vague, untestable directive lacks actionable constraints",
    category: "clarity",
    defaultSeverity: "warning",
    recommended: true,
    docsUrl: "https://github.com/YusufBeratZengin/prompt-lint#pl004"
  },

  run(context) {
    const diagnostics = [];

    for (const lineInfo of context.lines) {
      if (lineInfo.isCodeBlock || !lineInfo.raw.trim()) {
        continue;
      }

      // Strip inline code to prevent false positives in markdown code snippets
      const strippedLine = lineInfo.raw.replace(/`[^`]+`/g, (m) => " ".repeat(m.length));

      for (const pattern of VAGUE_PATTERNS) {
        let match;
        const regex = new RegExp(pattern.regex.source, "gi");

        while ((match = regex.exec(strippedLine)) !== null) {
          const col = match.index + 1;
          const matchedText = lineInfo.raw.slice(match.index, match.index + match[0].length);

          diagnostics.push({
            ruleId: "PL004",
            severity: context.severity || "warning",
            message: `Vague directive "${matchedText}" lacks actionable criteria. Replace with testable constraints or explicit rules.`,
            line: lineInfo.lineNumber,
            column: col,
            endLine: lineInfo.lineNumber,
            endColumn: col + match[0].length,
            snippet: lineInfo.raw
          });
        }
      }
    }

    return diagnostics;
  }
};
