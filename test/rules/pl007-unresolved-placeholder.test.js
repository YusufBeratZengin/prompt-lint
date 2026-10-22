import test from "node:test";
import assert from "node:assert/strict";
import { lintText } from "../../src/linter.js";

test("PL007: detects template mustache variables", () => {
  const content = "The user name is {{user_name}} and role is {{role}}.";
  const result = lintText(content);
  const diags = result.diagnostics.filter(d => d.ruleId === "PL007");

  assert.equal(diags.length, 2);
  assert.equal(diags[0].severity, "error");
});

test("PL007: detects TODO and TBD markers", () => {
  const content = [
    "Here is the plan for release: <TODO: write release steps>",
    "Deployment target: TBD",
    "API token: [INSERT_TOKEN_HERE]",
    "FIXME: clarify permissions"
  ].join("\n");

  const result = lintText(content);
  const diags = result.diagnostics.filter(d => d.ruleId === "PL007");

  assert.equal(diags.length, 4);
});

test("PL007 false-positive: allows standard HTML tags", () => {
  const content = [
    "<details>",
    "<summary>Click for details</summary>",
    "<div>Text content</div>",
    "</details>"
  ].join("\n");

  const result = lintText(content);
  const d = result.diagnostics.find(diag => diag.ruleId === "PL007");
  assert.equal(d, undefined);
});

test("PL007 false-positive: ignores templates in fenced code blocks", () => {
  const content = [
    "```handlebars",
    "<h1>{{title}}</h1>",
    "```"
  ].join("\n");

  const result = lintText(content);
  const d = result.diagnostics.find(diag => diag.ruleId === "PL007");
  assert.equal(d, undefined);
});
