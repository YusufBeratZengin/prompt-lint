import { existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { extractFileReferences } from "../utils/markdown.js";

const FILE_EXT_REGEX = /\.(?:js|mjs|cjs|ts|tsx|jsx|json|md|txt|prompt|yml|yaml|toml|html|css|sh|py|rb|go|rs|c|cpp|h)$/i;

function isLikelyFilePath(candidate, type) {
  if (!candidate || typeof candidate !== "string") return false;
  // Markdown destinations may carry URL query/fragment suffixes. Inline code
  // keeps question marks as glob syntax, but can still refer to a file anchor.
  const trimmed = candidate.trim().split(type === "link" ? /[?#]/ : /#/)[0];

  // Exclude URLs, mailto, anchor fragments
  if (/^(?:https?:\/\/|ftp:\/\/|mailto:|data:|file:\/\/)/i.test(trimmed)) return false;
  if (/^[a-z][a-z0-9+.-]*:/i.test(trimmed) && !/^[a-z]:[\\/]/i.test(trimmed)) return false;
  if (trimmed.startsWith("#")) return false;
  // Path templates describe a pattern rather than an existing repository entry.
  if (/[<>]|\{[^}]*\}/.test(trimmed)) return false;

  // Exclude glob patterns
  if (trimmed.includes("*") || trimmed.includes("?")) return false;

  // Exclude node core modules
  if (trimmed.startsWith("node:")) return false;

  // Exclude command invocations or code statements (e.g. "npm test", "git commit -m")
  if (/\s-[a-zA-Z]/.test(trimmed) || trimmed.includes(" && ") || trimmed.includes(" | ")) return false;
  if (/^(?:npm|npx|yarn|pnpm|git|node|cargo|pip|python|deno|bun)\s+/.test(trimmed)) return false;

  // Exclude code expressions (e.g. "a / b", "obj.method()", "foo = bar")
  if (trimmed.includes("()") || trimmed.includes("=>") || trimmed.includes("=")) return false;

  // Must contain path separator or start with ./ ../ or have a recognized file extension
  const hasSeparator = trimmed.includes("/") || trimmed.includes("\\");
  const startsWithRelative = trimmed.startsWith("./") || trimmed.startsWith("../") || trimmed.startsWith(".\\");
  const hasFileExt = FILE_EXT_REGEX.test(trimmed);

  if (type === "link" || hasFileExt || startsWithRelative || (hasSeparator && !trimmed.includes(" "))) {
    return true;
  }

  return false;
}

/**
 * Rule PL008: Broken relative file references
 */
export default {
  meta: {
    id: "PL008",
    name: "broken-relative-link",
    description: "Referenced relative file path does not exist on disk",
    category: "integrity",
    defaultSeverity: "error",
    recommended: true,
    docsUrl: "https://github.com/YusufBeratZengin/prompt-lint/blob/main/docs/rules.md#pl008"
  },

  run(context) {
    const diagnostics = [];
    const baseFileDir = context.filePath && context.filePath !== "<stdin>"
      ? dirname(resolve(context.cwd, context.filePath))
      : context.cwd;

    for (const lineInfo of context.lines) {
      if (lineInfo.isCodeBlock || !lineInfo.raw.trim()) {
        continue;
      }

      const refs = extractFileReferences(lineInfo.raw);

      for (const ref of refs) {
        if (!isLikelyFilePath(ref.path, ref.type)) {
          continue;
        }

        // Clean query/hash if present (e.g. "path/to/file.md#L10")
        let cleanPath;
        try {
          cleanPath = decodeURIComponent(ref.path.split(/[?#]/)[0]).replace(/\\/g, "/");
        } catch {
          cleanPath = ref.path.split(/[?#]/)[0].replace(/\\/g, "/");
        }
        if (!cleanPath) continue;

        // Try relative to file directory, then workspace cwd
        const pathFromDir = resolve(baseFileDir, cleanPath);
        const pathFromCwd = resolve(context.cwd, cleanPath);

        const exists = existsSync(pathFromDir) || existsSync(pathFromCwd);

        if (!exists) {
          diagnostics.push({
            ruleId: "PL008",
            severity: context.severity || "error",
            message: `Referenced relative file "${ref.path}" does not exist on disk.`,
            line: lineInfo.lineNumber,
            column: ref.column,
            endLine: lineInfo.lineNumber,
            endColumn: ref.column + ref.fullMatch.length,
            snippet: lineInfo.raw
          });
        }
      }
    }

    return diagnostics;
  }
};
