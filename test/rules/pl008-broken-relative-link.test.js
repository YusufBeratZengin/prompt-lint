import test from "node:test";
import assert from "node:assert/strict";
import { lintText } from "../../src/linter.js";

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
