import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, writeFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { runAction } from "../scripts/run-action.mjs";

function setup(t) {
  const dir = mkdtempSync(join(tmpdir(), "prompt-lint-action-test-"));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const file = join(dir, "agent instructions.md");
  const config = join(dir, "config.json");
  writeFileSync(config, "{}");
  return { dir, file, config };
}

async function run(fixture, inputs = {}) {
  let stdout = "";
  let stderr = "";
  const env = {
    RUNNER_TEMP: fixture.dir,
    GITHUB_OUTPUT: join(fixture.dir, "outputs"),
    PROMPT_LINT_PATHS: fixture.file,
    PROMPT_LINT_CONFIG: fixture.config,
    PROMPT_LINT_FORMAT: "json",
    ...inputs
  };
  const code = await runAction(env, {
    stdout: { write: chunk => { stdout += chunk; } },
    stderr: { write: chunk => { stderr += chunk; } }
  });
  return { code, stdout, stderr, env };
}

for (const [content, failOn, expected] of [
  ["Run tests.", "warning", 0],
  ["Be careful.", "error", 0],
  ["Be careful.", "warning", 1],
  ["Be careful.", "none", 0],
  ["Always run tests.\nNever run tests.", "error", 1],
  ["Always run tests.\nNever run tests.", "none", 0]
]) {
  test(`action: fail-on=${failOn} returns ${expected} for ${content}`, async t => {
    const fixture = setup(t);
    writeFileSync(fixture.file, content);
    const result = await run(fixture, { PROMPT_LINT_FAIL_ON: failOn });
    assert.equal(result.code, expected, result.stderr);
    const outputs = readFileSync(result.env.GITHUB_OUTPUT, "utf8");
    const report = outputs.match(/^report=(.+)$/m)[1];
    assert.equal(readFileSync(report, "utf8"), result.stdout);
    assert.ok(Array.isArray(JSON.parse(result.stdout)));
  });
}

test("action: newline-separated globs, filenames with spaces and custom config", async t => {
  const fixture = setup(t);
  writeFileSync(fixture.file, "Be careful.");
  writeFileSync(fixture.config, JSON.stringify({ rules: { PL004: "off" } }));
  const result = await run(fixture, {
    PROMPT_LINT_PATHS: `${fixture.file}\r\ntest/fixtures/clean/*.md`,
    PROMPT_LINT_FAIL_ON: "warning"
  });
  assert.equal(result.code, 0, result.stderr);
  assert.equal(JSON.parse(result.stdout).length, 2);
});

test("action: writes SARIF before failing and exposes original lint exit code", async t => {
  const fixture = setup(t);
  writeFileSync(fixture.file, "Always run tests.\nNever run tests.");
  const result = await run(fixture, { PROMPT_LINT_FORMAT: "sarif" });
  assert.equal(result.code, 1);
  assert.equal(JSON.parse(result.stdout).version, "2.1.0");
  assert.match(readFileSync(result.env.GITHUB_OUTPUT, "utf8"), /exit-code=1/);
});

test("action: report-only retains errors and the original failing exit code", async t => {
  const fixture = setup(t);
  writeFileSync(fixture.file, "Always run tests.\nNever run tests.");
  const result = await run(fixture, { PROMPT_LINT_FAIL_ON: "none" });
  assert.equal(result.code, 0, result.stderr);
  assert.ok(JSON.parse(result.stdout)[0].messages.some(d => d.ruleId === "PL003" && d.severity === "error"));
  assert.match(readFileSync(result.env.GITHUB_OUTPUT, "utf8"), /exit-code=1/);
});

test("action: malformed configuration fails in report-only mode without exposing a report", async t => {
  const fixture = setup(t);
  writeFileSync(fixture.file, "Run tests.");
  writeFileSync(fixture.config, "{ invalid JSON");
  const result = await run(fixture, { PROMPT_LINT_FAIL_ON: "none" });
  assert.equal(result.code, 2);
  assert.match(result.stderr, /configuration error/);
  const outputs = readFileSync(result.env.GITHUB_OUTPUT, "utf8");
  assert.match(outputs, /exit-code=2/);
  assert.doesNotMatch(outputs, /^report=/m);
});

test("action: filenames that look like CLI options remain literal targets", async t => {
  const fixture = setup(t);
  writeFileSync(join(fixture.dir, "--help"), "Always run tests.\nNever run tests.");
  const originalCwd = process.cwd();
  try {
    process.chdir(fixture.dir);
    const result = await run(fixture, { PROMPT_LINT_PATHS: "--help" });
    assert.equal(result.code, 1);
    assert.equal(JSON.parse(result.stdout)[0].filePath, "--help");
  } finally {
    process.chdir(originalCwd);
  }
});

for (const [input, value, code] of [
  ["PROMPT_LINT_FORMAT", "xml", 2],
  ["PROMPT_LINT_FAIL_ON", "anything", 2],
  ["PROMPT_LINT_CONFIG", "missing-config.json", 2],
  ["PROMPT_LINT_PATHS", "missing-file.prompt", 1],
  ["PROMPT_LINT_PATHS", "--help", 1],
  ["PROMPT_LINT_PATHS", "$(echo unsafe).prompt", 1]
]) {
  test(`action: report-only preserves failures for ${input}=${value}`, async t => {
    const fixture = setup(t);
    writeFileSync(fixture.file, "Run tests.");
    const result = await run(fixture, { PROMPT_LINT_FAIL_ON: "none", [input]: value });
    assert.equal(result.code, code);
    assert.ok(result.stderr);
  });
}

test("action: stylish format is plain text", async t => {
  const fixture = setup(t);
  writeFileSync(fixture.file, "Run tests.");
  const result = await run(fixture, { PROMPT_LINT_FORMAT: "stylish" });
  assert.equal(result.code, 0);
  assert.match(result.stdout, /No problems found/);
  assert.ok(!result.stdout.includes("\u001b["));
});

test("action: auto-discovery with no instruction files emits empty SARIF", async t => {
  const fixture = setup(t);
  const originalCwd = process.cwd();
  try {
    process.chdir(fixture.dir);
    const result = await run(fixture, { PROMPT_LINT_PATHS: "", PROMPT_LINT_FORMAT: "sarif" });
    assert.equal(result.code, 0, result.stderr);
    assert.equal(JSON.parse(result.stdout).runs[0].results.length, 0);
  } finally {
    process.chdir(originalCwd);
  }
});

