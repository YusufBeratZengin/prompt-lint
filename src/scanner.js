import { readdir, stat } from "node:fs/promises";
import { resolve, relative, join } from "node:path";
import { existsSync } from "node:fs";

const DEFAULT_PROMPT_PATTERNS = [
  "CLAUDE.md",
  "AGENTS.md",
  ".cursorrules",
  ".promptlintrc.json"
];

const DEFAULT_EXTENSIONS = new Set([".prompt", ".prompt.md"]);

/**
 * Converts a simple glob pattern (with * and **) to a RegExp.
 *
 * @param {string} glob
 * @returns {RegExp}
 */
export function globToRegex(glob) {
  const normalized = glob.replace(/\\/g, "/");
  let regexStr = "^";

  let i = 0;
  while (i < normalized.length) {
    const c = normalized[i];
    if (c === "*" && normalized[i + 1] === "*") {
      if (normalized[i + 2] === "/") {
        regexStr += "(?:.+/)?";
        i += 3;
      } else {
        regexStr += ".*";
        i += 2;
      }
    } else if (c === "*") {
      regexStr += "[^/]*";
      i++;
    } else if (c === "?") {
      regexStr += "[^/]";
      i++;
    } else if (/[.+^$[\](){}|\\]/.test(c)) {
      regexStr += "\\" + c;
      i++;
    } else {
      regexStr += c;
      i++;
    }
  }

  regexStr += "$";
  return new RegExp(regexStr);
}

/**
 * Checks if a relative path matches any ignore patterns.
 *
 * @param {string} relPath
 * @param {string[]} ignorePatterns
 * @returns {boolean}
 */
export function isIgnored(relPath, ignorePatterns) {
  const normalized = relPath.replace(/\\/g, "/");

  // Always ignore .git and node_modules folders
  if (
    normalized === ".git" ||
    normalized.startsWith(".git/") ||
    normalized === "node_modules" ||
    normalized.startsWith("node_modules/")
  ) {
    return true;
  }

  for (const pattern of ignorePatterns) {
    const regex = globToRegex(pattern);
    if (regex.test(normalized)) {
      return true;
    }
    // Also test directory prefix match
    if (pattern.endsWith("/**")) {
      const dirPrefix = pattern.slice(0, -3).replace(/\\/g, "/");
      if (normalized === dirPrefix || normalized.startsWith(dirPrefix + "/")) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Recursively scans directory for prompt and instruction files.
 *
 * @param {string} dir Current directory to walk
 * @param {string} cwd Root workspace directory
 * @param {string[]} ignorePatterns Ignore globs
 * @param {number} depth Recursion depth
 * @returns {Promise<string[]>}
 */
async function walkDirectory(dir, cwd, ignorePatterns, depth = 0) {
  if (depth > 10) return [];
  const results = [];

  try {
    const entries = await readdir(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = join(dir, entry.name);
      const relPath = relative(cwd, fullPath).replace(/\\/g, "/");

      if (isIgnored(relPath, ignorePatterns)) {
        continue;
      }

      if (entry.isDirectory()) {
        const subFiles = await walkDirectory(fullPath, cwd, ignorePatterns, depth + 1);
        results.push(...subFiles);
      } else if (entry.isFile()) {
        const lowerName = entry.name.toLowerCase();

        const isExactDefault = DEFAULT_PROMPT_PATTERNS.some(
          p => p.toLowerCase() === entry.name.toLowerCase() || p.toLowerCase() === relPath.toLowerCase()
        );

        const hasPromptExt = Array.from(DEFAULT_EXTENSIONS).some(ext => lowerName.endsWith(ext));

        const isSystemPrompt =
          (lowerName.startsWith("system") || lowerName.includes("prompt") || lowerName.includes("agent") || lowerName.includes("instruction")) &&
          (lowerName.endsWith(".md") || lowerName.endsWith(".txt"));

        const isCursorMdc = relPath.includes(".cursor/rules") && lowerName.endsWith(".mdc");

        if (isExactDefault || hasPromptExt || isSystemPrompt || isCursorMdc) {
          results.push(relPath);
        }
      }
    }
  } catch (err) {
    // If directory cannot be read (e.g. permission), skip gracefully
  }

  return results;
}

/**
 * Resolves targets (files, directories, globs) into an array of existing file paths.
 * Explicitly provided files are always included.
 *
 * @param {string[]} targets User-provided file paths or globs
 * @param {string} cwd Workspace root
 * @param {string[]} ignorePatterns Ignore patterns
 * @returns {Promise<string[]>}
 */
export async function scanFiles(targets = [], cwd = process.cwd(), ignorePatterns = []) {
  if (!targets || targets.length === 0) {
    // Default discovery: walk cwd looking for known prompt files
    const found = await walkDirectory(cwd, cwd, ignorePatterns);
    return Array.from(new Set(found)).sort();
  }

  const fileSet = new Set();

  for (const target of targets) {
    // Check if target is a glob pattern
    if (target.includes("*") || target.includes("?")) {
      const globRegex = globToRegex(target);
      const allFiles = await walkDirectory(cwd, cwd, ignorePatterns);
      for (const file of allFiles) {
        if (globRegex.test(file)) {
          fileSet.add(file);
        }
      }
      continue;
    }

    const fullPath = resolve(cwd, target);
    if (!existsSync(fullPath)) {
      continue;
    }

    const fileStat = await stat(fullPath);
    if (fileStat.isDirectory()) {
      const nested = await walkDirectory(fullPath, cwd, ignorePatterns);
      for (const f of nested) {
        fileSet.add(f);
      }
    } else if (fileStat.isFile()) {
      const rel = relative(cwd, fullPath).replace(/\\/g, "/");
      fileSet.add(rel);
    }
  }

  return Array.from(fileSet).sort();
}
