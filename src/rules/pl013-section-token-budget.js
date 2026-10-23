import { estimateTokens } from "../token-estimator.js";

export default {
  meta: {
    id: "PL013",
    name: "section-token-budget",
    description: "Markdown section token estimate exceeds configured budget",
    category: "budget",
    defaultSeverity: "warning",
    recommended: true,
    docsUrl: "https://github.com/YusufBeratZengin/prompt-lint/blob/main/docs/rules.md#pl013"
  },
  run(context) {
    const maxTokens = context.options?.maxTokens ?? 1000;
    const diagnostics = [];
    let section = [];
    let heading;
    const check = () => {
      const text = section.map(line => line.raw).join("\n");
      if (!text.trim()) return;
      const tokens = estimateTokens(text).tokens;
      if (tokens > maxTokens) {
        const start = heading || section.find(line => line.raw.trim());
        diagnostics.push({
          ruleId: "PL013",
          severity: context.severity || "warning",
          message: `Section "${heading?.headingText || "Preamble"}" estimated token count (${tokens}) exceeds configured budget (${maxTokens}). Split it into focused sections.`,
          line: start.lineNumber,
          column: 1,
          endLine: start.lineNumber,
          endColumn: start.raw.length + 1,
          snippet: start.raw
        });
      }
    };
    for (const line of context.lines) {
      if (line.isHeading) {
        check();
        heading = line;
        section = [];
      } else {
        section.push(line);
      }
    }
    check();
    return diagnostics;
  }
};
