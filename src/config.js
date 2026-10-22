import { readFile } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { existsSync } from "node:fs";

/**
 * Default prompt-lint configuration.
 */
export const DEFAULT_CONFIG = {
  budget: {
    maxTokens: 2000
  },
  rules: {
    PL001: "warning",
    PL002: "warning",
    PL003: "error",
    PL004: "warning",
    PL005: "warning",
    PL006: "warning",
    PL007: "error",
    PL008: "error",
    PL009: "error",
    PL010: "warning",
    PL011: "warning",
    PL012: "off"
  },
  options: {
    PL001: {
      maxTokens: 2000
    },
    PL002: {
      threshold: 0.8,
      minWords: 4
    },
    PL003: {
      threshold: 0.65
    },
    PL005: {
      uppercaseThreshold: 0.4,
      minWords: 5,
      consecutiveLimit: 3
    },
    PL010: {
      maxLineLength: 500,
      maxParagraphWords: 250
    }
  },
  ignore: [
    "node_modules/**",
    ".git/**",
    "dist/**",
    "build/**",
    "coverage/**"
  ]
};

const VALID_SEVERITIES = new Set(["off", "info", "warning", "error"]);

/**
 * Validates and normalizes rule severity.
 *
 * @param {string} severity
 * @returns {"off" | "info" | "warning" | "error"}
 */
export function normalizeSeverity(severity) {
  if (!severity) return "off";
  const lower = String(severity).toLowerCase();
  if (VALID_SEVERITIES.has(lower)) {
    return lower;
  }
  // Accept boolean / numeric: 0 = off, 1 = warning, 2 = error
  if (severity === 0 || severity === false) return "off";
  if (severity === 1) return "warning";
  if (severity === 2 || severity === true) return "error";
  return "warning";
}

/**
 * Finds and loads a configuration file.
 *
 * @param {string} [explicitPath] Optional explicit config file path
 * @param {string} [cwd=process.cwd()] Current working directory
 * @returns {Promise<{ config: typeof DEFAULT_CONFIG, configPath: string | null }>}
 */
export async function loadConfig(explicitPath, cwd = process.cwd()) {
  let resolvedPath = null;

  if (explicitPath) {
    resolvedPath = resolve(cwd, explicitPath);
    if (!existsSync(resolvedPath)) {
      throw new Error(`Configuration file not found: ${explicitPath}`);
    }
  } else {
    const candidates = [
      resolve(cwd, ".promptlintrc.json"),
      resolve(cwd, ".promptlintrc"),
      resolve(cwd, "package.json")
    ];

    for (const candidate of candidates) {
      if (existsSync(candidate)) {
        resolvedPath = candidate;
        break;
      }
    }
  }

  if (!resolvedPath) {
    return { config: structuredClone(DEFAULT_CONFIG), configPath: null };
  }

  try {
    const rawContent = await readFile(resolvedPath, "utf-8");
    const parsed = JSON.parse(rawContent);
    const userConfig = resolvedPath.endsWith("package.json")
      ? parsed.promptlint || {}
      : parsed;

    const merged = mergeConfig(DEFAULT_CONFIG, userConfig);
    return { config: merged, configPath: resolvedPath };
  } catch (err) {
    throw new Error(`Failed to parse configuration file at ${resolvedPath}: ${err.message}`);
  }
}

/**
 * Deep merges user config with default config.
 *
 * @param {typeof DEFAULT_CONFIG} base
 * @param {Record<string, any>} user
 * @returns {typeof DEFAULT_CONFIG}
 */
export function mergeConfig(base, user = {}) {
  const result = structuredClone(base);

  if (user.budget?.maxTokens != null) {
    const val = Number(user.budget.maxTokens);
    if (!Number.isNaN(val) && val > 0) {
      result.budget.maxTokens = val;
      result.options.PL001.maxTokens = val;
    }
  }

  if (user.rules && typeof user.rules === "object") {
    for (const [ruleId, severity] of Object.entries(user.rules)) {
      const upperId = ruleId.toUpperCase();
      result.rules[upperId] = normalizeSeverity(severity);
    }
  }

  if (user.options && typeof user.options === "object") {
    for (const [ruleId, ruleOpts] of Object.entries(user.options)) {
      const upperId = ruleId.toUpperCase();
      result.options[upperId] = {
        ...(result.options[upperId] || {}),
        ...ruleOpts
      };
    }
  }

  if (Array.isArray(user.ignore)) {
    result.ignore = Array.from(new Set([...result.ignore, ...user.ignore]));
  }

  return result;
}
