import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { runCli } from "../src/cli.js";

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
