import test from "node:test";
import assert from "node:assert/strict";
import { lintText } from "../../src/linter.js";

test("PL011: detects headings with depth greater than 4", () => {
  const content = [
    "##### Fifth Level Heading",
    "Some text under level 5.",
    "###### Sixth Level Heading",
    "Some text under level 6."
  ].join("\n");

  const result = lintText(content);
  const diags = result.diagnostics.filter(d => d.ruleId === "PL011");

  assert.equal(diags.length, 2);
  assert.equal(diags[0].line, 1);
  assert.equal(diags[1].line, 3);
  assert.equal(diags[0].severity, "warning");
});

test("PL011 false-positive: passes on headings up to depth 4", () => {
  const content = [
    "# Top Level H1",
    "## Section H2",
    "### Subsection H3",
    "#### Detail H4"
  ].join("\n");

  const result = lintText(content);
  const d = result.diagnostics.find(diag => diag.ruleId === "PL011");
  assert.equal(d, undefined);
});

test("PL011 false-positive: ignores hash symbols inside fenced code blocks", () => {
  const content = [
    "```python",
    "##### This is a python comment banner #####",
    "```"
  ].join("\n");

  const result = lintText(content);
  const d = result.diagnostics.find(diag => diag.ruleId === "PL011");
  assert.equal(d, undefined);
});
