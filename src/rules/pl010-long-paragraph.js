import { tokenizeWords } from "../utils/text.js";

/**
 * Rule PL010: Very long lines and paragraphs
 */
export default {
  meta: {
    id: "PL010",
    name: "long-paragraph",
    description: "Line or paragraph exceeds recommended length for LLM attention",
    category: "clarity",
    defaultSeverity: "warning",
    recommended: true,
    docsUrl: "https://github.com/YusufBeratZengin/prompt-lint#pl010"
  },

  run(context) {
    const maxLineLength = context.options?.maxLineLength ?? 500;
    const maxParagraphWords = context.options?.maxParagraphWords ?? 250;
    const diagnostics = [];

    // 1. Check line lengths
    for (const lineInfo of context.lines) {
      if (lineInfo.isCodeBlock || lineInfo.isTable || !lineInfo.raw.trim()) {
        continue;
      }

      // Check if line is solely a markdown link or single URL
      const isJustUrl = /^\[[^\]]+\]\(https?:\/\/[^\s)]+\)$/.test(lineInfo.raw.trim()) ||
        /^https?:\/\/[^\s]+$/.test(lineInfo.raw.trim());

      if (!isJustUrl && lineInfo.raw.length > maxLineLength) {
        diagnostics.push({
          ruleId: "PL010",
          severity: context.severity || "warning",
          message: `Line exceeds ${maxLineLength} characters (${lineInfo.raw.length} chars). Long lines degrade prompt readability and LLM parsing.`,
          line: lineInfo.lineNumber,
          column: 1,
          endLine: lineInfo.lineNumber,
          endColumn: lineInfo.raw.length + 1,
          snippet: `${lineInfo.raw.slice(0, 80)}...`
        });
      }
    }

    // 2. Check multi-line continuous paragraphs
    let currentParagraphWords = 0;
    let paragraphStartLine = null;
    let paragraphEndLine = null;

    for (let i = 0; i <= context.lines.length; i++) {
      const lineInfo = context.lines[i];
      const isEndOrEmpty = !lineInfo ||
        !lineInfo.raw.trim() ||
        lineInfo.isCodeBlock ||
        lineInfo.isHeading ||
        lineInfo.isTable;

      if (isEndOrEmpty) {
        if (currentParagraphWords > maxParagraphWords && paragraphStartLine !== null) {
          diagnostics.push({
            ruleId: "PL010",
            severity: context.severity || "warning",
            message: `Paragraph (lines ${paragraphStartLine.lineNumber}-${paragraphEndLine.lineNumber}) exceeds ${maxParagraphWords} words (${currentParagraphWords} words). Break dense text into shorter paragraphs or bullet points for improved instruction adherence.`,
            line: paragraphStartLine.lineNumber,
            column: 1,
            endLine: paragraphEndLine.lineNumber,
            endColumn: paragraphEndLine.raw.length + 1,
            snippet: `${paragraphStartLine.raw.slice(0, 80)}...`
          });
        }
        currentParagraphWords = 0;
        paragraphStartLine = null;
        paragraphEndLine = null;
      } else {
        const words = tokenizeWords(lineInfo.raw);
        if (paragraphStartLine === null) {
          paragraphStartLine = lineInfo;
        }
        paragraphEndLine = lineInfo;
        currentParagraphWords += words.length;
      }
    }

    return diagnostics;
  }
};
