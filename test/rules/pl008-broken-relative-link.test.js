import test from "node:test";
import assert from "node:assert/strict";
import { lintText } from "../../src/linter.js";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

test("PL008: catches bare filenames, missing directories and extensionless links", () => {
  const diagnostics = lintText("Read `missing-guide.md`, `./missing-folder/`, and [guide](MISSING-GUIDE).")
    .diagnostics.filter(d => d.ruleId === "PL008");
  assert.equal(diagnostics.length, 3);
  for (const d of diagnostics) {
    assert.equal(d.line, 1);
    assert.ok(d.column > 0);
    assert.equal(d.severity, "error");
  }
});

test("PL008: resolves Windows separators, encoded spaces, titles, anchors and workspace fallback", t => {
  const cwd = mkdtempSync(join(tmpdir(), "prompt-lint-links-"));
  t.after(() => rmSync(cwd, { recursive: true, force: true }));
  mkdirSync(join(cwd, "docs"));
  writeFileSync(join(cwd, "docs", "guide notes.md"), "Guide");
  writeFileSync(join(cwd, "LICENSE"), "License");
  const content = [
    "Read `docs\\guide notes.md`.",
    '[guide](docs/guide%20notes.md#start "Guide")',
    "[guide](<docs/guide notes.md>)",
    "[license](LICENSE)",
    "`./docs/`"
  ].join("\n");
  assert.equal(lintText(content, { cwd, filePath: "nested/AGENTS.md" })
    .diagnostics.filter(d => d.ruleId === "PL008").length, 0);
});

test("PL008 false-positive: skips globs, anchors, code fences and module specifiers", () => {
  const content = "`src/**/*.js` [section](#start) `node:fs` [support](tel:123) `plXXX-<name>.js` `src/{name}.js`\n```md\n`missing-guide.md`\n```";
  assert.equal(lintText(content).diagnostics.filter(d => d.ruleId === "PL008").length, 0);
});

test("PL008: checks missing link destinations with queries and inline files with fragments", () => {
  const diagnostics = lintText([
    "[guide](missing-guide.md?raw=true#start)",
    "Read `missing-guide.md#start`.",
    "[license](MISSING-LICENSE?raw=true)"
  ].join("\n")).diagnostics.filter(d => d.ruleId === "PL008");
  assert.deepEqual(diagnostics.map(d => d.line), [1, 2, 3]);
});

test("PL008 false-positive: existing files with query/fragment suffixes and question-mark globs pass", () => {
  const content = '[config](package.json?raw=true#start) `package.json#start` `src/file?.js`';
  assert.equal(lintText(content).diagnostics.filter(d => d.ruleId === "PL008").length, 0);
});

test("PL008: detects non-existent referenced files in backticks", () => {
  const content = "Please check `./src/non-existent-module-xyz.js` for implementation.";
  const result = lintText(content, { cwd: process.cwd() });
  const d = result.diagnostics.find(diag => diag.ruleId === "PL008");

  assert.ok(d, "Expected PL008 diagnostic for missing backtick file");
  assert.equal(d.severity, "error");
  assert.ok(d.message.includes("non-existent-module-xyz.js"));
});

test("PL008: detects non-existent referenced files in markdown links", () => {
  const content = "Read the [guide](docs/non-existent-guide.md) to get started.";
  const result = lintText(content, { cwd: process.cwd() });
  const d = result.diagnostics.find(diag => diag.ruleId === "PL008");

  assert.ok(d, "Expected PL008 diagnostic for missing markdown link file");
  assert.equal(d.severity, "error");
});

test("PL008: a backtick link label is checked once through its destination", () => {
  const diagnostics = lintText("Read [`missing-guide.md`](missing-guide.md).")
    .diagnostics.filter(d => d.ruleId === "PL008");
  assert.equal(diagnostics.length, 1);
  assert.equal(diagnostics[0].column, 6);
});

test("PL008 false-positive: link labels are not independent file references", () => {
  const content = "Read [`missing-guide.md`](README.md) and [`virtual.md`](https://example.invalid/guide).";
  assert.equal(lintText(content).diagnostics.filter(d => d.ruleId === "PL008").length, 0);
});

test("PL008 false-positive: passes on existing project files", () => {
  const content = [
    "Check `package.json` for script definitions.",
    "See [License](LICENSE) for copyright details."
  ].join("\n");

  const result = lintText(content, { cwd: process.cwd() });
  const d = result.diagnostics.find(diag => diag.ruleId === "PL008");
  assert.equal(d, undefined);
});

test("PL008 false-positive: ignores external URLs and shell commands", () => {
  const content = [
    "Clone from `https://github.com/YusufBeratZengin/prompt-lint`.",
    "Run `npm run build` after changes.",
    "Execute `node bin/prompt-lint.js`."
  ].join("\n");

  const result = lintText(content, { cwd: process.cwd() });
  const d = result.diagnostics.find(diag => diag.ruleId === "PL008");
  assert.equal(d, undefined);
});
