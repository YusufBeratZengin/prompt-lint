import { tokenizeWords, createShingles, jaccardSimilarity, stripMarkdownFormatting } from "../utils/text.js";

/**
 * Rule PL002: Duplicate or near-duplicate lines (normalized shingles + Jaccard)
 */
export default {
  meta: {
    id: "PL002",
    name: "duplicate-content",
    description: "Duplicate or near-duplicate lines detected in prompt instructions",
    category: "redundancy",
    defaultSeverity: "warning",
    recommended: true,
    docsUrl: "https://github.com/YusufBeratZengin/prompt-lint/blob/main/docs/rules.md#pl002"
  },

  run(context) {
    const threshold = context.options?.threshold ?? 0.8;
    const minWords = context.options?.minWords ?? 4;
    const diagnostics = [];

    // Track previously evaluated lines
    const processedLines = [];

    for (const lineInfo of context.lines) {
      // Skip lines inside code blocks, empty lines, headings, tables, or thematic breaks
      if (
        lineInfo.isCodeBlock ||
        lineInfo.isHeading ||
        lineInfo.isTable ||
        !lineInfo.raw.trim() ||
        /^[-\*_]{3,}$/.test(lineInfo.raw.trim())
      ) {
        continue;
      }

      const cleanText = stripMarkdownFormatting(lineInfo.raw).trim();
      const words = tokenizeWords(cleanText);

      if (words.length < minWords) {
        continue;
      }

      const shingles = createShingles(words, 2);
      const wordSet = new Set(words);

      let matchedPrevious = null;
      let highestSimilarity = 0;

      for (const prev of processedLines) {
        const shingleSim = jaccardSimilarity(shingles, prev.shingles);
        const wordSim = jaccardSimilarity(wordSet, prev.wordSet);
        const similarity = Math.max(shingleSim, wordSim);

        if (similarity >= threshold && similarity > highestSimilarity) {
          highestSimilarity = similarity;
          matchedPrevious = prev;
        }
      }

      if (matchedPrevious) {
        const percent = Math.round(highestSimilarity * 100);
        const prevSnippet = matchedPrevious.raw.trim();
        const truncatedSnippet = prevSnippet.length > 50 ? `${prevSnippet.slice(0, 47)}...` : prevSnippet;

        diagnostics.push({
          ruleId: "PL002",
          severity: context.severity || "warning",
          message: `Line is duplicate or near-duplicate (${percent}% similarity) of line ${matchedPrevious.lineNumber}: "${truncatedSnippet}".`,
          line: lineInfo.lineNumber,
          column: 1,
          endLine: lineInfo.lineNumber,
          endColumn: lineInfo.raw.length + 1,
          snippet: lineInfo.raw
        });
      } else {
        processedLines.push({
          lineNumber: lineInfo.lineNumber,
          raw: lineInfo.raw,
          words,
          wordSet,
          shingles
        });
      }
    }

    return diagnostics;
  }
};
