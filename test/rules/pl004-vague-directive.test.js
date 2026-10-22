import test from "node:test";
import assert from "node:assert/strict";
import { lintText } from "../../src/linter.js";

test("PL004: detects vague directives", () => {
  const content = [
    "Please be careful when modifying the database schema.",
    "Do your best to complete all tasks.",
    "Try to ensure high quality in pull requests.",
    "Handle appropriately when errors occur."
  ].join("\n");

  const result = lintText(content);
  const vagueDiagnostics = result.diagnostics.filter(diag => diag.ruleId === "PL004");

  assert.ok(vagueDiagnostics.length >= 4, `Expected at least 4 diagnostics, got ${vagueDiagnostics.length}`);
  assert.equal(vagueDiagnostics[0].severity, "warning");
});

test("PL004 false-positive: ignores vague phrases inside fenced code blocks", () => {
  const content = [
    "```javascript",
    "// be careful not to mutate state here",
    "const result = tryToParse(input);",
    "```"
  ].join("\n");

  const result = lintText(content);
  const d = result.diagnostics.find(diag => diag.ruleId === "PL004");
  assert.equal(d, undefined);
});

test("PL004 false-positive: ignores vague phrases inside inline backticks", () => {
  const content = "Do not name variables `try to` or `be careful`.";
  const result = lintText(content);
  const d = result.diagnostics.find(diag => diag.ruleId === "PL004");
  assert.equal(d, undefined);
});

test("PL004 false-positive: passes on concrete, testable instructions", () => {
  const content = [
    "# Guidelines",
    "- Run `npm test` before pushing to origin.",
    "- Verify that status code is 200.",
    "- Export all public functions from `src/index.js`."
  ].join("\n");

  const result = lintText(content);
  const d = result.diagnostics.find(diag => diag.ruleId === "PL004");
  assert.equal(d, undefined);
});
