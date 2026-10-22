import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { runCli } from "../src/cli.js";

function runProcess(args, { env: overrides = {}, input } = {}) {
  const env = { ...process.env };
  delete env.FORCE_COLOR;
  delete env.NO_COLOR;
  return spawnSync(process.execPath, ["bin/prompt-lint.js", ...args], {
    encoding: "utf8", env: { ...env, ...overrides }, input
  });
}

for (const { name, env, args = [], colored } of [
  { name: "piped stdout is plain", env: {}, colored: false },
  { name: "FORCE_COLOR enables piped colors", env: { FORCE_COLOR: "1" }, colored: true },
  { name: "NO_COLOR disables colors", env: { NO_COLOR: "1" }, colored: false },
  { name: "--no-color overrides FORCE_COLOR", env: { FORCE_COLOR: "1" }, args: ["--no-color"], colored: false }
]) {
  test(`cli: ${name}`, () => {
    const result = runProcess(["test/fixtures/dirty/bloated.md", ...args], { env });
    assert.equal(result.status, 1, result.stderr);
    assert.equal(result.stdout.includes("\u001b["), colored);
  });
}

for (const { name, input, args = [], code } of [
  { name: "clean", input: "Run unit tests.", code: 0 },
  { name: "errors", input: "Always use TypeScript.\nNever use TypeScript.", code: 1 },
  { name: "warnings allowed by default", input: "Be careful.", code: 0 },
  { name: "warnings exceed limit", input: "Be careful.", args: ["--max-warnings", "0"], code: 1 },
  { name: "warnings equal limit", input: "Be careful.", args: ["--max-warnings", "1"], code: 0 },
  { name: "quiet keeps warning limit", input: "Be careful.", args: ["--quiet", "--max-warnings", "0"], code: 1 },
  { name: "unknown flag", args: ["--unknown"], code: 2 },
  { name: "unknown format", args: ["--format", "xml"], code: 2 },
  { name: "bad warning limit", args: ["--max-warnings", "many"], code: 2 },
  { name: "bad token limit", args: ["--max-tokens", "Infinity"], code: 2 },
  { name: "bad rule ID", args: ["--rule", "PL999=error"], code: 2 },
  { name: "bad rule severity", args: ["--rule", "PL001=fatal"], code: 2 },
  { name: "bad rule syntax", args: ["--rule", "PL001"], code: 2 }
]) {
  test(`cli exit code: ${name}`, () => {
    const result = runProcess(["--stdin", ...args], { input: input || "Run tests." });
    assert.equal(result.status, code, result.stderr);
    if (code === 2) {
      assert.match(result.stderr, /Usage:/);
      assert.doesNotMatch(result.stderr, /\n\s+at |Error \[|Fatal prompt-lint error/);
    }
  });
}

test("cli: --quiet hides warnings and retains errors", () => {
  const result = runProcess(["--stdin", "--quiet", "--format", "json"], {
    input: "Be careful.\nAlways use TypeScript.\nNever use TypeScript."
  });
  assert.equal(result.status, 1, result.stderr);
  const messages = JSON.parse(result.stdout)[0].messages;
  assert.equal(messages.length, 1);
  assert.equal(messages[0].severity, "error");
});

for (const { config, key, allowed } of [
  { config: { rules: { PL999: "error" } }, key: "rules.PL999", allowed: "PL012" },
  { config: { rules: { PL001: "fatal" } }, key: "rules.PL001", allowed: "warning" },
  { config: { rulez: {} }, key: "rulez", allowed: "$schema" }
]) {
  test(`cli config error: ${key}`, t => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "prompt-lint-config-"));
    t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
    const file = path.join(dir, "invalid.json");
    fs.writeFileSync(file, JSON.stringify(config));
    const result = runProcess(["--config", file, "--stdin"], { input: "Run tests." });
    assert.equal(result.status, 2);
    assert.ok(result.stderr.includes(file));
    assert.ok(result.stderr.includes(key));
    assert.ok(result.stderr.includes(allowed));
    assert.doesNotMatch(result.stderr, /\n\s+at /);
  });
}

test("cli: runnable examples fail and pass as documented", () => {
  for (const [file, expected] of [["bad", 1], ["good", 0]]) {
    const result = runProcess(["--config", "examples/.promptlintrc.json", `examples/CLAUDE.${file}.md`]);
    assert.equal(result.status, expected, result.stderr);
  }
});

test("cli: README terminal output matches a real run", () => {
  const result = runProcess(["--no-color", "test/fixtures/dirty/bloated.md"]);
  assert.equal(result.status, 1, result.stderr);
  for (const file of ["README.md", "README.tr.md"]) {
    const readme = fs.readFileSync(file, "utf8");
    const block = readme.match(/```text\n\$ node bin\/prompt-lint\.js --no-color test\/fixtures\/dirty\/bloated\.md\n([\s\S]*?)```/);
    assert.ok(block, `Missing terminal example in ${file}`);
    assert.equal(block[1], result.stdout, `Stale output in ${file}`);
  }
});

// The dirty fixture holds a placeholder instead of a secret-shaped string, so
// scanners do not flag the repo. The real-looking value is built at run time.
const DIRTY_FIXTURE = (() => {
  const src = fs.readFileSync("test/fixtures/dirty/bloated.md", "utf8");
  const fakeKey = "sk-" + "proj-" + "a9b8c7d6e5f4g3h2i1j0k9l8m7n6b5v4c3x2z1";
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "prompt-lint-"));
  const file = path.join(dir, "bloated.md");
  fs.writeFileSync(file, src.replaceAll("@@FAKE_OPENAI_KEY@@", fakeKey));
  process.on("exit", () => fs.rmSync(dir, { recursive: true, force: true }));
  return file;
})();

function createMockIo() {
  let stdoutStr = "";
  let stderrStr = "";
  return {
    io: {
      stdout: {
        write: (str) => {
          stdoutStr += String(str);
          return true;
        }
      },
      stderr: {
        write: (str) => {
          stderrStr += String(str);
          return true;
        }
      }
    },
    getStdout: () => stdoutStr,
    getStderr: () => stderrStr
  };
}

test("cli: displays help with --help", async () => {
  const { io, getStdout } = createMockIo();
  const code = await runCli(["--help"], io);

  assert.equal(code, 0);
  assert.ok(getStdout().includes("Usage:"));
  assert.ok(getStdout().includes("prompt-lint"));
});

test("cli: displays version with --version", async () => {
  const { io, getStdout } = createMockIo();
  const code = await runCli(["--version"], io);

  assert.equal(code, 0);
  assert.ok(getStdout().includes("prompt-lint v0.1.0"));
});

test("cli: passes on clean fixture file", async () => {
  const { io, getStdout } = createMockIo();
  const code = await runCli(["test/fixtures/clean/CLAUDE.md", "--no-color"], io);

  assert.equal(code, 0);
  assert.ok(getStdout().includes("No problems found"));
});

test("cli: returns exit code 1 on dirty fixture file", async () => {
  const { io, getStdout } = createMockIo();
  const code = await runCli([DIRTY_FIXTURE, "--no-color"], io);

  assert.equal(code, 1);
  const out = getStdout();
  assert.ok(out.includes("PL003"));
  assert.ok(out.includes("PL007"));
  assert.ok(out.includes("PL008"));
  assert.ok(out.includes("PL009"));
});

test("cli: outputs json with --format json", async () => {
  const { io, getStdout } = createMockIo();
  const code = await runCli([DIRTY_FIXTURE, "--format", "json"], io);

  assert.equal(code, 1);
  const parsed = JSON.parse(getStdout());
  assert.ok(Array.isArray(parsed));
  assert.ok(parsed[0].messages.length > 0);
});

test("cli: outputs sarif with --format sarif", async () => {
  const { io, getStdout } = createMockIo();
  const code = await runCli([DIRTY_FIXTURE, "--format", "sarif"], io);

  assert.equal(code, 1);
  const parsed = JSON.parse(getStdout());
  assert.equal(parsed.version, "2.1.0");
  assert.ok(parsed.runs[0].results.length > 0);
});

test("cli: handles rule override via --rule flag", async () => {
  const { io, getStdout } = createMockIo();
  const code = await runCli([
    DIRTY_FIXTURE,
    "--rule", "PL001=off",
    "--rule", "PL002=off",
    "--rule", "PL003=off",
    "--rule", "PL004=off",
    "--rule", "PL005=off",
    "--rule", "PL006=off",
    "--rule", "PL007=off",
    "--rule", "PL008=off",
    "--rule", "PL009=off",
    "--rule", "PL010=off",
    "--rule", "PL011=off",
    "--rule", "PL012=off"
  ], io);

  assert.equal(code, 0);
  assert.ok(getStdout().includes("No problems found"));
});
