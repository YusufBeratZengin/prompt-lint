import test from "node:test";
import assert from "node:assert/strict";
import { lintText } from "../../src/linter.js";

test("PL009: detects synthetic exposed OpenAI API key and masks it", () => {
  // Use synthetic key pattern
  const fakeKey = "sk-" + "proj-" + "m9k8j7h6g5f4d3s2a1q0w9e8r7t6y5u4i3o2p1";
  const content = `Use this key: ${fakeKey}`;

  const result = lintText(content);
  const d = result.diagnostics.find(diag => diag.ruleId === "PL009");

  assert.ok(d, "Expected PL009 diagnostic");
  assert.equal(d.severity, "error");
  assert.ok(d.message.includes("sk-p"));
  assert.ok(d.message.includes("****"));
  assert.ok(!d.message.includes(fakeKey), "Raw secret must not be exposed in message");
});

test("PL009: detects synthetic GitHub personal access token", () => {
  const fakeGhToken = "gh" + "p_" + "1234567890abcdefghijklmnopqrstuvwx";
  const content = `Token: ${fakeGhToken}`;

  const result = lintText(content);
  const d = result.diagnostics.find(diag => diag.ruleId === "PL009");

  assert.ok(d, "Expected PL009 diagnostic for GitHub token");
  assert.ok(!d.message.includes(fakeGhToken));
});

test("PL009: detects synthetic AWS access key", () => {
  const fakeAws = "AK" + "IA" + "34567890ABCDEFGH";
  const content = `AWS_ACCESS_KEY_ID=${fakeAws}`;

  const result = lintText(content);
  const d = result.diagnostics.find(diag => diag.ruleId === "PL009");

  assert.ok(d, "Expected PL009 diagnostic for AWS Key");
});

test("PL009 false-positive: ignores explicit placeholder keys", () => {
  const content = [
    "OPENAI_API_KEY=YOUR_API_KEY_HERE",
    "ANTHROPIC_KEY=placeholder_token",
    "sk-test-00000000000000000000000000000000"
  ].join("\n");

  const result = lintText(content);
  const d = result.diagnostics.find(diag => diag.ruleId === "PL009");
  assert.equal(d, undefined);
});
