import test from "node:test";
import assert from "node:assert/strict";
import { lintText } from "../../src/linter.js";

test("PL003: detects opposing directives across sections with source locations", () => {
  const diagnostics = lintText("# Build\nAlways run tests.\n# Release\nNever run tests.")
    .diagnostics.filter(d => d.ruleId === "PL003");
  assert.equal(diagnostics.length, 1);
  assert.equal(diagnostics[0].line, 4);
  assert.equal(diagnostics[0].column, 1);
  assert.equal(diagnostics[0].severity, "error");
});

test("PL003 false-positive: ignores opposing directives in fenced examples", () => {
  assert.equal(lintText("Always run tests.\n```md\nNever run tests.\n```")
    .diagnostics.filter(d => d.ruleId === "PL003").length, 0);
});

for (const [positive, negative] of [
  ["Always run tests before committing.", "Never run tests in production."],
  ["Always use tabs in Makefiles.", "Never use tabs in Python files."],
  ["Always run tests.", "Never run tests in production."],
  ["Always run unit tests.", "Never run integration tests."],
  ["Always run tests before committing.", "Never run tests after committing."]
]) {
  test(`PL003 false-positive: ${positive} / ${negative}`, () => {
    const result = lintText(`${positive}\n${negative}`);
    assert.equal(result.diagnostics.filter(d => d.ruleId === "PL003").length, 0);
  });
}

test("PL003: unqualified TypeScript contradiction produces one error", () => {
  const diagnostics = lintText("Always use TypeScript.\nNever use TypeScript.")
    .diagnostics.filter(d => d.ruleId === "PL003");
  assert.equal(diagnostics.length, 1);
  assert.equal(diagnostics[0].severity, "error");
});

test("PL003: normalizes case and spacing in matching qualifiers", () => {
  const result = lintText("Always use tabs in Makefiles.\nNever use TABS IN   makefiles.");
  assert.equal(result.diagnostics.filter(d => d.ruleId === "PL003").length, 1);
});

test("PL003: detects contradictory directives with always vs never", () => {
  const content = [
    "Always use TypeScript for all files.",
    "Write concise and maintainable code.",
    "Never use TypeScript for all files."
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
