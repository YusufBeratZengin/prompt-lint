import test from "node:test";
import assert from "node:assert/strict";
import { lintText } from "../../src/linter.js";

test("PL003: detects contradictory directives with always vs never", () => {
  const content = [
    "Always use TypeScript for all files.",
    "Write concise and maintainable code.",
    "Never use TypeScript in this project."
  ].join("\n");

  const result = lintText(content);
  const d = result.diagnostics.find(diag => diag.ruleId === "PL003");

  assert.ok(d, "Expected PL003 diagnostic");
  assert.equal(d.severity, "error");
  assert.equal(d.line, 3);
  assert.ok(d.message.includes("line 1"));
});

test("PL003: detects must vs do not contradictions", () => {
  const content = [
    "Must execute unit tests before committing code.",
    "Do not execute unit tests before committing code."
  ].join("\n");

  const result = lintText(content);
  const d = result.diagnostics.find(diag => diag.ruleId === "PL003");

  assert.ok(d, "Expected PL003 diagnostic");
  assert.equal(d.line, 2);
});

test("PL003 false-positive: does not flag directives on different subjects", () => {
  const content = [
    "Always use TypeScript for backend services.",
    "Never use external CSS frameworks for internal tooling."
  ].join("\n");

  const result = lintText(content);
  const d = result.diagnostics.find(diag => diag.ruleId === "PL003");
  assert.equal(d, undefined);
});

test("PL003 false-positive: does not flag matching positive directives", () => {
  const content = [
    "Always use TypeScript for all code.",
    "Ensure that TypeScript strict mode is enabled."
  ].join("\n");

  const result = lintText(content);
  const d = result.diagnostics.find(diag => diag.ruleId === "PL003");
  assert.equal(d, undefined);
});
