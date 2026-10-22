import test from "node:test";
import assert from "node:assert/strict";
import { lintText } from "../../src/linter.js";

test("PL006: detects repeated exclamation and question marks", () => {
  const content = [
    "Make sure you never skip this step!!!",
    "Did you really commit secrets???",
    "How could this happen!?!?"
  ].join("\n");

  const result = lintText(content);
  const emphasisDiags = result.diagnostics.filter(diag => diag.ruleId === "PL006");

  assert.equal(emphasisDiags.length, 3);
  assert.equal(emphasisDiags[0].severity, "warning");
});

test("PL006: detects stacked bold-italics formatting", () => {
  const content = "This is ***critically important*** to understand.";
  const result = lintText(content);
  const d = result.diagnostics.find(diag => diag.ruleId === "PL006");

  assert.ok(d, "Expected PL006 diagnostic for stacked formatting");
});

test("PL006 false-positive: allows single exclamation marks and standard markdown bold", () => {
  const content = "**Important:** Always verify your changes before opening a PR!";
  const result = lintText(content);
  const d = result.diagnostics.find(diag => diag.ruleId === "PL006");
  assert.equal(d, undefined);
});

test("PL006 false-positive: ignores repeated punctuation in code blocks", () => {
  const content = [
    "```javascript",
    "const isTruthy = !!value;",
    "```"
  ].join("\n");

  const result = lintText(content);
  const d = result.diagnostics.find(diag => diag.ruleId === "PL006");
  assert.equal(d, undefined);
});
