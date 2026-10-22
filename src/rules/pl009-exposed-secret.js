import { calculateEntropy, maskSecret } from "../utils/text.js";

/**
 * Rule PL009: Secrets-looking strings
 */

const KNOWN_SECRET_PATTERNS = [
  // OpenAI API Key
  {
    name: "OpenAI API key",
    regex: /\bsk-(?:proj-|live-)?[a-zA-Z0-9_-]{24,}\b/g
  },
  // Anthropic API Key
  {
    name: "Anthropic API key",
    regex: /\bsk-ant-[a-zA-Z0-9_-]{24,}\b/g
  },
  // GitHub Personal Access Token
  {
    name: "GitHub token",
    regex: /\b(?:ghp|gho|ghu|ghs|ghr)_[a-zA-Z0-9]{36}\b/g
  },
  // GitHub Fine-grained PAT
  {
    name: "GitHub Fine-grained PAT",
    regex: /\bgithub_pat_[a-zA-Z0-9_]{30,}\b/g
  },
  // AWS Access Key
  {
    name: "AWS Access Key",
    regex: /\bAKIA[0-9A-Z]{16}\b/g
  },
  // PEM Private Key header
  {
    name: "Private Key Header",
    regex: /-----BEGIN (?:RSA |EC |OPENSSH |DSA )?PRIVATE KEY-----/g
  }
];

const GENERIC_SECRET_REGEX = /\b(?:api[_-]?key|secret|token|auth[_-]?token|password)\s*[:=]\s*["']?([a-zA-Z0-9_-]{24,})["']?/gi;

function isDummySecret(value) {
  const lower = value.toLowerCase();
  return (
    lower.includes("example") ||
    lower.includes("dummy") ||
    lower.includes("placeholder") ||
    lower.includes("your_") ||
    lower.includes("xxx") ||
    lower.includes("test-") ||
    lower.includes("-test") ||
    /^(.)\1+$/.test(value) ||
    /^[0-9]+$/.test(value.replace(/^sk-(?:proj-|live-)?/, ""))
  );
}

export default {
  meta: {
    id: "PL009",
    name: "exposed-secret",
    description: "Potential secret, API key, or credential string detected",
    category: "security",
    defaultSeverity: "error",
    recommended: true,
    docsUrl: "https://github.com/YusufBeratZengin/prompt-lint#pl009"
  },

  run(context) {
    const diagnostics = [];

    for (const lineInfo of context.lines) {
      if (!lineInfo.raw.trim()) {
        continue;
      }

      // Check known provider secret patterns
      for (const pattern of KNOWN_SECRET_PATTERNS) {
        let match;
        const regex = new RegExp(pattern.regex.source, pattern.regex.flags);

        while ((match = regex.exec(lineInfo.raw)) !== null) {
          const secretStr = match[0];
          if (isDummySecret(secretStr)) {
            continue;
          }

          diagnostics.push({
            ruleId: "PL009",
            severity: context.severity || "error",
            message: `Potential ${pattern.name} exposed: "${maskSecret(secretStr)}". Use environment variables instead of hardcoding secrets.`,
            line: lineInfo.lineNumber,
            column: match.index + 1,
            endLine: lineInfo.lineNumber,
            endColumn: match.index + secretStr.length + 1,
            snippet: lineInfo.raw.replace(secretStr, maskSecret(secretStr))
          });
        }
      }

      // Check generic key-value secrets with entropy verification
      let genericMatch;
      const genRegex = new RegExp(GENERIC_SECRET_REGEX.source, "gi");
      while ((genericMatch = genRegex.exec(lineInfo.raw)) !== null) {
        const secretVal = genericMatch[1];
        if (isDummySecret(secretVal)) {
          continue;
        }

        // Check if already matched
        const alreadyFlagged = diagnostics.some(
          d => d.line === lineInfo.lineNumber && d.snippet.includes(maskSecret(secretVal))
        );
        if (alreadyFlagged) {
          continue;
        }

        const entropy = calculateEntropy(secretVal);
        if (entropy >= 3.8) {
          diagnostics.push({
            ruleId: "PL009",
            severity: context.severity || "error",
            message: `High-entropy credential string exposed: "${maskSecret(secretVal)}". Store credentials in environment variables.`,
            line: lineInfo.lineNumber,
            column: genericMatch.index + 1,
            endLine: lineInfo.lineNumber,
            endColumn: genericMatch.index + genericMatch[0].length + 1,
            snippet: lineInfo.raw.replace(secretVal, maskSecret(secretVal))
          });
        }
      }
    }

    return diagnostics;
  }
};
