import test from "node:test";
import assert from "node:assert/strict";
import { lintText } from "../../src/linter.js";
import { estimateTokens } from "../../src/token-estimator.js";

const check = (content, maxTokens = 10) => lintText(content, {
  config: { options: { PL013: { maxTokens } } }
}).diagnostics.filter(d => d.ruleId === "PL013");

test("PL013: reports an oversized section at its heading", () => {
  const diagnostics = check("# Guide\n## Testing\n" + "Run tests. ".repeat(20));
  assert.equal(diagnostics.length, 1);
  assert.equal(diagnostics[0].line, 2);
  assert.equal(diagnostics[0].column, 1);
  assert.equal(diagnostics[0].severity, "warning");
  assert.match(diagnostics[0].message, /Testing.*exceeds configured budget \(10\)/);
});

test("PL013: counts preamble and includes fenced content without treating code headings as sections", () => {
  const diagnostics = check("Run tests. ".repeat(15) + "\n# Code\n```md\n# Example\n" + "Run tests. ".repeat(15) + "\n```");
  assert.equal(diagnostics.length, 2);
  assert.match(diagnostics[0].message, /Preamble/);
  assert.match(diagnostics[1].message, /Code/);
});

test("PL013 false-positive: headings at any depth split sections and empty sections pass", () => {
  assert.equal(check("# Guide\n## One\nRun tests.\n### Two\nRun tests.\n## Empty\n").length, 0);
  assert.equal(check("").length, 0);
});

test("PL013: threshold is exclusive, configurable, and supports CRLF", () => {
  const content = "Run unit tests.";
  const tokens = estimateTokens(content).tokens;
  assert.equal(check(content, tokens).length, 0);
  assert.equal(check(content, tokens - 1).length, 1);
  assert.equal(check("## One\r\n" + content, tokens).length, 0);
});

test("PL013: default threshold and rule disabling work independently of file budget", () => {
  const content = "# Steps\n" + "Run tests. ".repeat(400);
  assert.equal(lintText(content).diagnostics.filter(d => d.ruleId === "PL013").length, 1);
  assert.equal(lintText(content, { config: { rules: { PL013: "off" } } }).diagnostics.filter(d => d.ruleId === "PL013").length, 0);
});

test("PL013: sections stay within their limits when the total file budget is exceeded", () => {
  const content = "## One\nRun tests.\n## Two\nRun tests.";
  const diagnostics = lintText(content, {
    config: { budget: { maxTokens: 5 }, options: { PL013: { maxTokens: 10 } } }
  }).diagnostics;
  assert.ok(diagnostics.some(d => d.ruleId === "PL001"));
  assert.ok(!diagnostics.some(d => d.ruleId === "PL013"));
});
