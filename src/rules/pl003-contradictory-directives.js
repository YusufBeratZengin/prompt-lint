/**
 * PL003 uses an English-language heuristic, not semantic contradiction detection.
 * Split each target at its first in/on/for/before/after/when/during/unless/outside/
 * inside qualifier. Opposing directives conflict only when their normalized
 * objects match and their qualifier tails (including the preposition) match or
 * are both empty. Case, punctuation and whitespace are normalized; object stop
 * words are ignored. Different scopes are deliberately left unreported.
 */
import { tokenizeWords, stripMarkdownFormatting } from "../utils/text.js";

const STOP_WORDS = new Set([
  "a", "an", "the", "to", "for", "in", "on", "at", "by", "with",
  "from", "of", "and", "or", "as", "is", "be", "are", "do", "does",
  "use", "using", "all", "any", "your", "our", "their", "this", "that"
]);

function normalizeTarget(text) {
  const qualifier = /\b(?:in|on|for|before|after|when|during|unless|outside|inside)\b/i.exec(text);
  const object = qualifier ? text.slice(0, qualifier.index) : text;
  const tail = qualifier ? text.slice(qualifier.index) : "";
  return {
    object: tokenizeWords(object).filter(word => !STOP_WORDS.has(word)).join(" "),
    qualifier: tokenizeWords(tail).join(" ")
  };
}

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
        const normalized = normalizeTarget(targetText);
        if (normalized.object) {
          directives.push({
            lineNumber: lineInfo.lineNumber,
            polarity: "positive",
            directive: posMatch[0],
            targetText,
            ...normalized,
            raw: lineInfo.raw
          });
        }
      }

      if (negMatch) {
        const targetText = negMatch[1].trim();
        const normalized = normalizeTarget(targetText);
        if (normalized.object) {
          directives.push({
            lineNumber: lineInfo.lineNumber,
            polarity: "negative",
            directive: negMatch[0],
            targetText,
            ...normalized,
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

        const isConflict = dirA.object === dirB.object && dirA.qualifier === dirB.qualifier;

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
