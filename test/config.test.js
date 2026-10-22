import test from "node:test";
import assert from "node:assert/strict";
import { resolve } from "node:path";
import { DEFAULT_CONFIG, mergeConfig, normalizeSeverity, loadConfig, validateConfig } from "../src/config.js";
import { mkdtemp, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

test("config: accepts schema, case-insensitive rule IDs, and legacy severity aliases", () => {
  assert.doesNotThrow(() => validateConfig({
    $schema: "https://raw.githubusercontent.com/YusufBeratZengin/prompt-lint/main/schema.json",
    rules: { pl001: "ERROR", PL002: 1, PL003: true, PL004: false, PL005: 0, PL006: 2 }
  }));
});

for (const [config, key] of [
  [null, "<root>"], [[], "<root>"], [{ rules: [] }, "rules"],
  [{ options: { PL999: {} } }, "options.PL999"],
  [{ options: { PL001: [] } }, "options.PL001"],
  [{ budget: { maxTokens: -1 } }, "budget.maxTokens"],
  [{ budget: { maxToken: 100 } }, "budget.maxToken"],
  [{ ignore: "dist/**" }, "ignore"], [{ ignore: [42] }, "ignore"],
  [{ $schema: false }, "$schema"]
]) {
  test(`config: rejects invalid shape at ${key}`, () => {
    assert.throws(() => validateConfig(config, "invalid.json"), err =>
      err.message.includes("invalid.json") && err.message.includes(key) && err.message.includes("Allowed values"));
  });
}

test("config: package.json validates only the promptlint field", async t => {
  const dir = await mkdtemp(join(tmpdir(), "prompt-lint-package-"));
  t.after(() => rm(dir, { recursive: true, force: true }));
  const file = join(dir, "package.json");
  await writeFile(file, JSON.stringify({ name: "config-fixture", promptlint: { rules: { pl001: 2 } } }));
  assert.equal((await loadConfig(undefined, dir)).config.rules.PL001, "error");
  await writeFile(file, JSON.stringify({ promptlint: { rules: { PL999: "error" } } }));
  await assert.rejects(loadConfig(undefined, dir), /rules.PL999/);
});

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
