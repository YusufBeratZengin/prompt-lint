import { tokenizeWords, jaccardSimilarity, stripMarkdownFormatting } from "../utils/text.js";

const STOP_WORDS = new Set([
  "a", "an", "the", "to", "for", "in", "on", "at", "by", "with",
  "from", "of", "and", "or", "as", "is", "be", "are", "do", "does",
  "use", "using", "all", "any", "your", "our", "their", "this", "that"
]);

/**
 * Rule PL003: Contradictions between "always X" / "never X" style directives
 */
export default {
  meta: {
    id: "PL003",
    name: "contradictory-directives",
    description: "Contradictory directives detected on the same target instruction",
    category: "logic",
    defaultSeverity: "error",
    recommended: true,
    docsUrl: "https://github.com/YusufBeratZengin/prompt-lint#pl003"
  },

  run(context) {
    const threshold = context.options?.threshold ?? 0.6;
    const diagnostics = [];

    // Patterns for polarity
    const positiveRegex = /\b(?:always|must(?!\s+not)|strictly(?:\s+enforce)?|ensure(?:\s+that)?|make\s+sure\s+to|required?\s+to)\b\s+([^.;\n]+)/i;
    const negativeRegex = /\b(?:never|must\s+not|do\s+not|don't|should\s+not|shouldn't|cannot|prohibit(?:ed)?|avoid)\b\s+([^.;\n]+)/i;

    const directives = [];

    for (const lineInfo of context.lines) {
      if (lineInfo.isCodeBlock || !lineInfo.raw.trim()) {
        continue;
      }

      const text = stripMarkdownFormatting(lineInfo.raw);

      const posMatch = text.match(positiveRegex);
      const negMatch = text.match(negativeRegex);

      if (posMatch) {
        const targetText = posMatch[1].trim();
        const contentWords = tokenizeWords(targetText).filter(w => !STOP_WORDS.has(w));
        if (contentWords.length >= 1) {
          directives.push({
            lineNumber: lineInfo.lineNumber,
            polarity: "positive",
            directive: posMatch[0],
            targetText,
            contentWords: new Set(contentWords),
            firstContentWord: contentWords[0],
            raw: lineInfo.raw
          });
        }
      }

      if (negMatch) {
        const targetText = negMatch[1].trim();
        const contentWords = tokenizeWords(targetText).filter(w => !STOP_WORDS.has(w));
        if (contentWords.length >= 1) {
          directives.push({
            lineNumber: lineInfo.lineNumber,
            polarity: "negative",
            directive: negMatch[0],
            targetText,
            contentWords: new Set(contentWords),
            firstContentWord: contentWords[0],
            raw: lineInfo.raw
          });
        }
      }
    }

    // Compare directives with opposing polarities
    for (let i = 0; i < directives.length; i++) {
      for (let j = i + 1; j < directives.length; j++) {
        const dirA = directives[i];
        const dirB = directives[j];

        if (dirA.polarity === dirB.polarity) {
          continue;
        }

        const similarity = jaccardSimilarity(dirA.contentWords, dirB.contentWords);

        let commonCount = 0;
        for (const word of dirA.contentWords) {
          if (dirB.contentWords.has(word)) commonCount++;
        }

        const minSize = Math.min(dirA.contentWords.size, dirB.contentWords.size);
        const overlapRatio = minSize > 0 ? commonCount / minSize : 0;

        // Conflict occurs if:
        // 1. High Jaccard similarity between content words
        // 2. High overlap ratio (e.g. "typescript" in both)
        // 3. Or identical first content word (e.g. both start action on same subject)
        let isConflict =
          similarity >= threshold ||
          overlapRatio >= 0.5 ||
          (commonCount >= 1 && dirA.firstContentWord === dirB.firstContentWord);

        if (isConflict) {
          diagnostics.push({
            ruleId: "PL003",
            severity: context.severity || "error",
            message: `Conflicting directive on line ${dirB.lineNumber} ("${dirB.directive.trim()}") contradicts line ${dirA.lineNumber} ("${dirA.directive.trim()}").`,
            line: dirB.lineNumber,
            column: 1,
            endLine: dirB.lineNumber,
            endColumn: dirB.raw.length + 1,
            snippet: dirB.raw
          });
        }
      }
    }

    return diagnostics;
  }
};
