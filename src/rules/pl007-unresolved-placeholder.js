/**
 * Rule PL007: Unresolved placeholders ({{var}}, <TODO>, TBD)
 */

const STANDARD_HTML_TAGS = new Set([
  "a", "abbr", "address", "article", "aside", "b", "base", "bdi", "bdo",
  "blockquote", "body", "br", "button", "canvas", "caption", "cite", "code",
  "col", "colgroup", "data", "datalist", "dd", "del", "details", "dfn",
  "dialog", "div", "dl", "dt", "em", "embed", "fieldset", "figcaption",
  "figure", "footer", "form", "h1", "h2", "h3", "h4", "h5", "h6", "head",
  "header", "hgroup", "hr", "html", "i", "iframe", "img", "input", "ins",
  "kbd", "label", "legend", "li", "link", "main", "map", "mark", "menu",
  "meta", "meter", "nav", "noscript", "object", "ol", "optgroup", "option",
  "output", "p", "picture", "pre", "progress", "q", "rp", "rt", "ruby", "s",
  "samp", "script", "search", "section", "select", "slot", "small", "source",
  "span", "strong", "style", "sub", "summary", "sup", "table", "tbody", "td",
  "template", "textarea", "tfoot", "th", "thead", "time", "title", "tr",
  "track", "u", "ul", "var", "video", "wbr"
]);

export default {
  meta: {
    id: "PL007",
    name: "unresolved-placeholder",
    description: "Unresolved template placeholder or TODO marker detected",
    category: "integrity",
    defaultSeverity: "error",
    recommended: true,
    docsUrl: "https://github.com/YusufBeratZengin/prompt-lint/blob/main/docs/rules.md#pl007"
  },

  run(context) {
    const diagnostics = [];

    // Patterns
    const mustacheRegex = /\{\{[^{}\r\n]+\}\}/g;
    const bracketPlaceholderRegex = /\[(?:INSERT|REPLACE|YOUR)[_\s][^\]\r\n]+\]/gi;
    const anglePlaceholderRegex = /<(?:TODO|INSERT|REPLACE|YOUR)[_\-\s:][^>\r\n]*>/gi;
    const standaloneAngleTodoRegex = /<TODO>/gi;
    const keywordRegex = /\b(?:TODO|FIXME|TBD|XXX)\b(?::|\b)/g;

    for (const lineInfo of context.lines) {
      if (lineInfo.isCodeBlock || !lineInfo.raw.trim()) {
        continue;
      }

      // Ignore inline code snippets
      const lineWithoutInlineCode = lineInfo.raw.replace(/`[^`]+`/g, (m) => " ".repeat(m.length));

      // 1. Mustache templates {{var}}
      let match;
      while ((match = mustacheRegex.exec(lineWithoutInlineCode)) !== null) {
        diagnostics.push({
          ruleId: "PL007",
          severity: context.severity || "error",
          message: `Unresolved template placeholder "${match[0]}" detected. Replace with actual value before deployment.`,
          line: lineInfo.lineNumber,
          column: match.index + 1,
          endLine: lineInfo.lineNumber,
          endColumn: match.index + match[0].length + 1,
          snippet: lineInfo.raw
        });
      }

      // 2. Bracket placeholders [INSERT_HERE], [REPLACE_ME], [YOUR_KEY]
      while ((match = bracketPlaceholderRegex.exec(lineWithoutInlineCode)) !== null) {
        diagnostics.push({
          ruleId: "PL007",
          severity: context.severity || "error",
          message: `Unresolved placeholder marker "${match[0]}" detected.`,
          line: lineInfo.lineNumber,
          column: match.index + 1,
          endLine: lineInfo.lineNumber,
          endColumn: match.index + match[0].length + 1,
          snippet: lineInfo.raw
        });
      }

      // 3. Angle bracket placeholders <TODO>, <TODO: ...>, <INSERT_...>
      while ((match = anglePlaceholderRegex.exec(lineWithoutInlineCode)) !== null) {
        diagnostics.push({
          ruleId: "PL007",
          severity: context.severity || "error",
          message: `Unresolved placeholder tag "${match[0]}" detected.`,
          line: lineInfo.lineNumber,
          column: match.index + 1,
          endLine: lineInfo.lineNumber,
          endColumn: match.index + match[0].length + 1,
          snippet: lineInfo.raw
        });
      }

      while ((match = standaloneAngleTodoRegex.exec(lineWithoutInlineCode)) !== null) {
        // Only if not already matched
        if (!diagnostics.some(d => d.line === lineInfo.lineNumber && d.column === match.index + 1)) {
          diagnostics.push({
            ruleId: "PL007",
            severity: context.severity || "error",
            message: `Unresolved placeholder tag "${match[0]}" detected.`,
            line: lineInfo.lineNumber,
            column: match.index + 1,
            endLine: lineInfo.lineNumber,
            endColumn: match.index + match[0].length + 1,
            snippet: lineInfo.raw
          });
        }
      }

      // 4. Standalone keywords: TODO:, FIXME:, TBD, XXX:
      while ((match = keywordRegex.exec(lineWithoutInlineCode)) !== null) {
        // Exclude if already matched in brackets or angles
        const start = match.index;
        const end = start + match[0].length;
        const alreadyCovered = diagnostics.some(
          d => d.line === lineInfo.lineNumber && d.column <= start + 1 && d.endColumn >= end + 1
        );

        if (!alreadyCovered) {
          diagnostics.push({
            ruleId: "PL007",
            severity: context.severity || "error",
            message: `Unresolved task or placeholder "${match[0].trim()}" detected in instructions.`,
            line: lineInfo.lineNumber,
            column: start + 1,
            endLine: lineInfo.lineNumber,
            endColumn: end + 1,
            snippet: lineInfo.raw
          });
        }
      }
    }

    return diagnostics;
  }
};
