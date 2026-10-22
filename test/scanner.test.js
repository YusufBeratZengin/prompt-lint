import test from "node:test";
import assert from "node:assert/strict";
import { globToRegex, isIgnored, scanFiles } from "../src/scanner.js";

test("scanner: globToRegex converts globs to regex correctly", () => {
  const reg1 = globToRegex("*.md");
  assert.ok(reg1.test("CLAUDE.md"));
  assert.ok(!reg1.test("docs/CLAUDE.md"));

  const reg2 = globToRegex("**/*.md");
  assert.ok(reg2.test("CLAUDE.md"));
  assert.ok(reg2.test("docs/rules.md"));
  assert.ok(!reg2.test("docs/rules.txt"));
});

test("scanner: isIgnored respects default ignores and patterns", () => {
  assert.ok(isIgnored("node_modules/foo/index.js", []));
  assert.ok(isIgnored(".git/config", []));
  assert.ok(isIgnored("dist/bundle.js", ["dist/**"]));
  assert.ok(!isIgnored("src/index.js", ["dist/**"]));
});

test("scanner: scanFiles discovers files in project", async () => {
  const files = await scanFiles(["package.json", "LICENSE"], process.cwd(), []);
  assert.ok(files.includes("package.json"));
  assert.ok(files.includes("LICENSE"));
});
