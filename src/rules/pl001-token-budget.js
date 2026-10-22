/**
 * Rule PL001: File token estimate over budget
 */
export default {
  meta: {
    id: "PL001",
    name: "token-budget",
    description: "File token estimate exceeds configured budget",
    category: "budget",
    defaultSeverity: "warning",
    recommended: true,
    docsUrl: "https://github.com/YusufBeratZengin/prompt-lint#pl001"
  },

  run(context) {
    const maxTokens = context.options?.maxTokens ?? 2000;
    const estimated = context.tokenStats?.tokens ?? 0;

    if (estimated > maxTokens) {
      return [
        {
          ruleId: "PL001",
          severity: context.severity || "warning",
          message: `File estimated token count (${estimated.toLocaleString()}) exceeds configured budget (${maxTokens.toLocaleString()}).`,
          line: 1,
          column: 1,
          endLine: 1,
          endColumn: 1,
          snippet: context.lines[0]?.raw || ""
        }
      ];
    }

    return [];
  }
};
