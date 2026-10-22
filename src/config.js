import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
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

/** Validate file/CLI input while keeping the programmatic merge API permissive. */
export function validateConfig(config, source = "configuration") {
  const fail = (key, allowed) => {
    throw new Error(`${source}: invalid key/value "${key}". Allowed values: ${allowed}.`);
  };
  const isObject = value => value !== null && typeof value === "object" && !Array.isArray(value);
  const topKeys = ["$schema", "budget", "rules", "options", "ignore"];
  const ruleIds = Object.keys(DEFAULT_CONFIG.rules);
  if (!isObject(config)) fail("<root>", "a JSON object");
  for (const key of Object.keys(config)) {
    if (!topKeys.includes(key)) fail(key, topKeys.join(", "));
  }
  if (config.$schema !== undefined && typeof config.$schema !== "string") {
    fail("$schema", "a schema URL string");
  }
  for (const section of ["rules", "options"]) {
    if (config[section] === undefined) continue;
    if (!isObject(config[section])) fail(section, "an object keyed by rule ID");
    for (const [id, value] of Object.entries(config[section])) {
      if (!ruleIds.includes(id.toUpperCase())) fail(`${section}.${id}`, ruleIds.join(", "));
      if (section === "rules") {
        if (!(typeof value === "string" && VALID_SEVERITIES.has(value.toLowerCase())) &&
            ![0, 1, 2, true, false].includes(value)) {
          fail(`rules.${id}`, "off, info, warning, error, 0, 1, 2, true, false");
        }
      } else if (!isObject(value)) {
        fail(`options.${id}`, "a rule options object");
      }
    }
  }
  if (config.budget !== undefined) {
    if (!isObject(config.budget)) fail("budget", "an object with maxTokens");
    for (const key of Object.keys(config.budget)) {
      if (key !== "maxTokens") fail(`budget.${key}`, "maxTokens");
    }
    if (config.budget.maxTokens !== undefined &&
        (typeof config.budget.maxTokens !== "number" || !Number.isFinite(config.budget.maxTokens) || config.budget.maxTokens <= 0)) {
      fail("budget.maxTokens", "a positive finite number");
    }
  }
  if (config.ignore !== undefined &&
      (!Array.isArray(config.ignore) || !config.ignore.every(pattern => typeof pattern === "string"))) {
    fail("ignore", "an array of glob strings");
  }
}

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
      ? (parsed.promptlint === undefined ? {} : parsed.promptlint)
      : parsed;

    validateConfig(userConfig, resolvedPath);
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
