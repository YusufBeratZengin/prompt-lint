import test from "node:test";
import assert from "node:assert/strict";
import { lintText } from "../../src/linter.js";

test("PL001: triggers warning when token estimate exceeds budget", () => {
  const content = "This is a repeated sentence. ".repeat(200); // approx 1400 tokens
  const result = lintText(content, {
    config: {
      budget: { maxTokens: 500 }
    }
  });

  const d = result.diagnostics.find(diag => diag.ruleId === "PL001");
  assert.ok(d, "Expected PL001 diagnostic");
  assert.equal(d.severity, "warning");
  assert.equal(d.line, 1);
  assert.ok(d.message.includes("exceeds configured budget"));
});

test("PL001: does not trigger when within budget", () => {
  const content = "# Guidelines\nShort prompt instruction file.";
  const result = lintText(content, {
    config: {
      budget: { maxTokens: 1000 }
    }
  });

  const d = result.diagnostics.find(diag => diag.ruleId === "PL001");
  assert.equal(d, undefined);
});
