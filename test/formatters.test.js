import test from "node:test";
import assert from "node:assert/strict";
import { formatStylish, formatJson, formatSarif, getFormatter } from "../src/formatters/index.js";
import { resolve, sep } from "node:path";
import { pathToFileURL } from "node:url";
import { lintText } from "../src/linter.js";

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

test("SARIF: encodes URI characters and normalizes POSIX and Windows source paths", () => {
  for (const [filePath, cwd, expected] of [
    ["docs\\agent #1?.md", process.cwd(), "docs/agent%20%231%3F.md"],
    [resolve("docs", "agent ü.md"), process.cwd(), "docs/agent%20%C3%BC.md"],
    ["C:\\repo\\docs\\agent.md", "C:\\repo", "docs/agent.md"],
    ["./AGENTS.md", process.cwd(), "AGENTS.md"]
  ]) {
    const results = [{ ...sampleResults[0], filePath }];
    const run = JSON.parse(formatSarif(results, { cwd })).runs[0];
    const location = run.results[0].locations[0].physicalLocation.artifactLocation;
    assert.equal(location.uri, expected);
    assert.equal(location.uriBaseId, "%SRCROOT%");
    assert.equal(run.columnKind, "utf16CodeUnits");
  }
});

test("SARIF: declares an absolute source root for relative artifact URIs", () => {
  for (const [cwd, expected] of [
    [process.cwd(), pathToFileURL(resolve(process.cwd()) + sep).href],
    ["C:\\repo with spaces\\", "file:///C:/repo%20with%20spaces/"],
    ["\\\\server\\share\\repo", "file://server/share/repo/"]
  ]) {
    const run = JSON.parse(formatSarif(sampleResults, { cwd })).runs[0];
    assert.equal(run.originalUriBaseIds["%SRCROOT%"].uri, expected);
    assert.equal(new URL("AGENTS.md", expected).protocol, "file:");
  }
});

test("SARIF: UNC source paths become relative to a Windows network checkout", () => {
  const results = [{ ...sampleResults[0], filePath: "\\\\server\\share\\repo\\AGENTS.md" }];
  const run = JSON.parse(formatSarif(results, { cwd: "\\\\server\\share\\repo" })).runs[0];
  assert.equal(run.results[0].locations[0].physicalLocation.artifactLocation.uri, "AGENTS.md");
});

test("SARIF: rule indices resolve, info maps to note, and empty regions are omitted", () => {
  const result = lintText("Always run tests.\nNever run tests.", { config: { rules: { PL003: "info" } } });
  result.diagnostics.push({ ruleId: "PL000", severity: "error", message: "Unable to read file", line: 1, column: 1 });
  const run = JSON.parse(formatSarif([result])).runs[0];
  for (const finding of run.results) {
    assert.equal(run.tool.driver.rules[finding.ruleIndex].id, finding.ruleId);
    assert.ok(finding.message.text);
    const region = finding.locations[0].physicalLocation.region;
    assert.ok(region.startLine >= 1 && region.startColumn >= 1);
  }
  assert.equal(run.results.find(r => r.ruleId === "PL003").level, "note");
  assert.equal(run.results.find(r => r.ruleId === "PL000").locations[0].physicalLocation.region.endColumn, undefined);
  assert.ok(run.tool.driver.rules.every(r => !r.helpUri || r.helpUri.includes("/docs/rules.md#pl")));
});

test("SARIF: zero findings still produces an uploadable run", () => {
  const sarif = JSON.parse(formatSarif([]));
  assert.equal(sarif.version, "2.1.0");
  assert.equal(sarif.runs[0].results.length, 0);
  assert.ok(sarif.runs[0].tool.driver.rules.length >= 13);
});
