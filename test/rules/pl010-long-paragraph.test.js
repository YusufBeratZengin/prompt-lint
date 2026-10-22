import test from "node:test";
import assert from "node:assert/strict";
import { lintText } from "../../src/linter.js";

test("PL010: detects continuous line exceeding 500 characters", () => {
  const longLine = "This is a very long sentence that keeps going on and on without any line breaks ".repeat(8);
  assert.ok(longLine.length > 500);

  const result = lintText(longLine);
  const d = result.diagnostics.find(diag => diag.ruleId === "PL010");

  assert.ok(d, "Expected PL010 diagnostic for long line");
  assert.equal(d.severity, "warning");
});

test("PL010: detects paragraph exceeding word budget", () => {
  const paragraphLines = Array(30).fill("This is a line containing ten standard words for testing paragraphs.").join("\n");
  const result = lintText(paragraphLines, {
    config: {
      options: {
        PL010: { maxParagraphWords: 200 }
      }
    }
  });

  const d = result.diagnostics.find(diag => diag.ruleId === "PL010");
  assert.ok(d, "Expected PL010 diagnostic for long paragraph");
});

test("PL010 false-positive: ignores wide markdown tables", () => {
  const wideTable = "| Column 1 | Column 2 | Column 3 | Column 4 | Column 5 | Column 6 | Column 7 | Column 8 |\n" +
    "| --- | --- | --- | --- | --- | --- | --- | --- |\n" +
    "| Some long description text here | Another value that takes space | Third column content goes here | Fourth item | Fifth item | Sixth item | Seventh item | Eighth item |";

  const result = lintText(wideTable);
  const d = result.diagnostics.find(diag => diag.ruleId === "PL010");
  assert.equal(d, undefined);
});

test("PL010 false-positive: ignores long lines inside fenced code blocks", () => {
  const code = [
    "```javascript",
    "const data = '" + "A".repeat(600) + "';",
    "```"
  ].join("\n");

  const result = lintText(code);
  const d = result.diagnostics.find(diag => diag.ruleId === "PL010");
  assert.equal(d, undefined);
});
