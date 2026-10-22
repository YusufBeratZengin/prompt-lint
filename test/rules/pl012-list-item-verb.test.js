import test from "node:test";
import assert from "node:assert/strict";
import { lintText } from "../../src/linter.js";

test("PL012: disabled by default", () => {
  const content = [
    "- database configuration",
    "- error handling strategy"
  ].join("\n");

  const result = lintText(content);
  const d = result.diagnostics.find(diag => diag.ruleId === "PL012");
  assert.equal(d, undefined);
});

test("PL012: detects list items not starting with action verbs when enabled", () => {
  const content = [
    "- database configuration and credentials",
    "- Run all integration tests before pushing",
    "- error handling logic"
  ].join("\n");

  const result = lintText(content, {
    config: {
      rules: {
        PL012: "warning"
      }
    }
  });

  const diags = result.diagnostics.filter(d => d.ruleId === "PL012");
  assert.equal(diags.length, 2);
  assert.equal(diags[0].line, 1);
  assert.equal(diags[1].line, 3);
});

test("PL012 false-positive: recognizes action verbs and modifiers", () => {
  const content = [
    "- Execute `npm test`",
    "- Always verify output files",
    "- Never commit secrets",
    "- Validate user inputs"
  ].join("\n");

  const result = lintText(content, {
    config: {
      rules: {
        PL012: "warning"
      }
    }
  });

  const diags = result.diagnostics.filter(d => d.ruleId === "PL012");
  assert.equal(diags.length, 0);
});
