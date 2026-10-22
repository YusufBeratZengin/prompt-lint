import test from "node:test";
import assert from "node:assert/strict";
import { lintText } from "../../src/linter.js";

test("PL005: detects excessive ALL-CAPS shouting", () => {
  const content = "You must DO NOT EVER FORGET THIS CRITICAL STEP in any case.";
  const result = lintText(content);
  const d = result.diagnostics.find(diag => diag.ruleId === "PL005");

  assert.ok(d, "Expected PL005 diagnostic");
  assert.equal(d.severity, "warning");
  assert.ok(d.message.includes("Excessive ALL-CAPS text"));
});

test("PL005 false-positive: allows standard technical acronyms", () => {
  const content = "The REST API returns JSON payloads with UUID identifiers for LLM workflows.";
  const result = lintText(content);
  const d = result.diagnostics.find(diag => diag.ruleId === "PL005");
  assert.equal(d, undefined);
});

test("PL005 false-positive: ignores SQL uppercase in fenced code blocks", () => {
  const content = [
    "```sql",
    "SELECT USER_ID, EMAIL FROM USERS WHERE ACTIVE = TRUE;",
    "```"
  ].join("\n");

  const result = lintText(content);
  const d = result.diagnostics.find(diag => diag.ruleId === "PL005");
  assert.equal(d, undefined);
});

test("PL005 false-positive: ignores markdown headings", () => {
  const content = "## PROJECT OVERVIEW";
  const result = lintText(content);
  const d = result.diagnostics.find(diag => diag.ruleId === "PL005");
  assert.equal(d, undefined);
});
