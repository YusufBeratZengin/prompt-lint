import test from "node:test";
import assert from "node:assert/strict";
import { resolve } from "node:path";
import { DEFAULT_CONFIG, mergeConfig, normalizeSeverity, loadConfig } from "../src/config.js";

test("config: normalizeSeverity maps valid and fallback severities", () => {
  assert.equal(normalizeSeverity("error"), "error");
  assert.equal(normalizeSeverity("warning"), "warning");
  assert.equal(normalizeSeverity("info"), "info");
  assert.equal(normalizeSeverity("off"), "off");
  assert.equal(normalizeSeverity(2), "error");
  assert.equal(normalizeSeverity(1), "warning");
  assert.equal(normalizeSeverity(0), "off");
  assert.equal(normalizeSeverity(false), "off");
  assert.equal(normalizeSeverity("unknown"), "warning");
});

test("config: mergeConfig merges user overrides properly", () => {
  const merged = mergeConfig(DEFAULT_CONFIG, {
    budget: { maxTokens: 1500 },
    rules: {
      PL001: "error",
      pl012: "warning"
    },
    ignore: ["custom/**"]
  });

  assert.equal(merged.budget.maxTokens, 1500);
  assert.equal(merged.options.PL001.maxTokens, 1500);
  assert.equal(merged.rules.PL001, "error");
  assert.equal(merged.rules.PL012, "warning");
  assert.ok(merged.ignore.includes("custom/**"));
  assert.equal(merged.rules.PL003, "error"); // preserves defaults
});

test("config: loadConfig loads existing config file", async () => {
  const cwd = process.cwd();
  const loaded = await loadConfig(".promptlintrc.json", cwd);

  assert.ok(loaded.config);
  assert.equal(loaded.config.budget.maxTokens, 2000);
  assert.ok(loaded.configPath.endsWith(".promptlintrc.json"));
});

test("config: loadConfig throws on non-existent explicit path", async () => {
  await assert.rejects(
    async () => {
      await loadConfig("non-existent-config.json");
    },
    { message: /Configuration file not found/ }
  );
});
