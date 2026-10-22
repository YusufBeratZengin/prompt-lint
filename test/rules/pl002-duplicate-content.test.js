import test from "node:test";
import assert from "node:assert/strict";
import { lintText } from "../../src/linter.js";

test("PL002: detects exact duplicate lines", () => {
  const content = [
    "Always format TypeScript code using Prettier with default settings.",
    "Follow standard convention for git commits.",
    "Always format TypeScript code using Prettier with default settings."
  ].join("\n");

  const result = lintText(content);
  const d = result.diagnostics.find(diag => diag.ruleId === "PL002");

  assert.ok(d, "Expected PL002 diagnostic");
  assert.equal(d.line, 3);
  assert.ok(d.message.includes("line 1"));
});

test("PL002: detects near-duplicate lines with high similarity", () => {
  const content = [
    "Make sure that all tests are executed before creating a pull request.",
    "Some other unrelated instructions.",
    "Make sure that all unit tests are executed before creating pull request."
  ].join("\n");

  const result = lintText(content);
  const d = result.diagnostics.find(diag => diag.ruleId === "PL002");

  assert.ok(d, "Expected PL002 diagnostic for near-duplicate lines");
  assert.equal(d.line, 3);
});

test("PL002 false-positive: ignores repeated lines inside fenced code blocks", () => {
  const content = [
    "```javascript",
    "console.log('repeated line in code block');",
    "console.log('repeated line in code block');",
    "```"
  ].join("\n");

  const result = lintText(content);
  const d = result.diagnostics.find(diag => diag.ruleId === "PL002");
  assert.equal(d, undefined);
});

test("PL002 false-positive: ignores short lines and headings", () => {
  const content = [
    "# Commands",
    "- item one",
    "- item two",
    "## Commands"
  ].join("\n");

  const result = lintText(content);
  const d = result.diagnostics.find(diag => diag.ruleId === "PL002");
  assert.equal(d, undefined);
});
