import test from "node:test";
import assert from "node:assert/strict";
import { formatStylish, formatJson, formatSarif, getFormatter } from "../src/formatters/index.js";

const sampleResults = [
  {
    filePath: "CLAUDE.md",
    tokenStats: { tokens: 120, words: 85, characters: 500, lines: 15 },
    diagnostics: [
      {
        ruleId: "PL004",
        severity: "warning",
        message: 'Vague directive "be careful" lacks actionable criteria.',
        line: 5,
        column: 9,
        endLine: 5,
        endColumn: 19,
        snippet: "Please be careful here."
      },
      {
        ruleId: "PL008",
        severity: "error",
        message: 'Referenced relative file "missing.md" does not exist on disk.',
        line: 10,
        column: 1,
        endLine: 10,
        endColumn: 15,
        snippet: "`missing.md`"
      }
    ]
  }
];

test("formatters: getFormatter returns requested formatter", () => {
  assert.equal(typeof getFormatter("stylish"), "function");
  assert.equal(typeof getFormatter("json"), "function");
  assert.equal(typeof getFormatter("sarif"), "function");
  assert.equal(getFormatter("unknown"), formatStylish);
});

test("formatters: formatStylish renders clean formatted output", () => {
  const output = formatStylish(sampleResults, { color: false });
  assert.ok(output.includes("CLAUDE.md"));
  assert.ok(output.includes("PL004"));
  assert.ok(output.includes("PL008"));
  assert.ok(output.includes("2 problems (1 error, 1 warning)"));
});

test("formatters: formatStylish renders clean passing state", () => {
  const emptyResults = [
    {
      filePath: "clean.md",
      tokenStats: { tokens: 50, words: 30, characters: 200, lines: 10 },
      diagnostics: []
    }
  ];
  const output = formatStylish(emptyResults, { color: false });
  assert.ok(output.includes("No problems found"));
});

test("formatters: formatJson outputs valid JSON with diagnostic structure", () => {
  const jsonStr = formatJson(sampleResults);
  const parsed = JSON.parse(jsonStr);

  assert.equal(parsed.length, 1);
  assert.equal(parsed[0].filePath, "CLAUDE.md");
  assert.equal(parsed[0].errorCount, 1);
  assert.equal(parsed[0].warningCount, 1);
  assert.equal(parsed[0].messages.length, 2);
  assert.equal(parsed[0].messages[0].ruleId, "PL004");
});

test("formatters: formatSarif outputs compliant SARIF 2.1.0 document", () => {
  const sarifStr = formatSarif(sampleResults);
  const sarif = JSON.parse(sarifStr);

  assert.equal(sarif.version, "2.1.0");
  assert.ok(sarif.runs && sarif.runs.length > 0);

  const run = sarif.runs[0];
  assert.equal(run.tool.driver.name, "prompt-lint");
  assert.ok(run.tool.driver.rules.some(r => r.id === "PL004"));
  assert.equal(run.results.length, 2);
  assert.equal(run.results[0].ruleId, "PL004");
  assert.equal(run.results[0].level, "warning");
  assert.equal(run.results[1].ruleId, "PL008");
  assert.equal(run.results[1].level, "error");
  assert.equal(run.results[0].locations[0].physicalLocation.region.startLine, 5);
});
