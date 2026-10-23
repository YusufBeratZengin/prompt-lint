import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { ruleList } from "../src/rules/index.js";
import { runCli } from "../src/cli.js";

test("docs: every rule has a catalog entry, heading, and working help fragment", () => {
  const docs = readFileSync("docs/rules.md", "utf8").replace(/\r\n/g, "\n");
  for (const { meta } of ruleList) {
    assert.ok(docs.includes(`| [${meta.id}](#${meta.id.toLowerCase()}) | ${meta.name} | ${meta.defaultSeverity} |`));
    assert.ok(docs.includes(`## ${meta.id}\n`));
    assert.ok(meta.docsUrl.endsWith(`/docs/rules.md#${meta.id.toLowerCase()}`));
  }
});

test("docs: English and Turkish adoption workflow/config examples stay in sync", () => {
  const examples = path => [...readFileSync(path, "utf8").replace(/\r\n/g, "\n").matchAll(/```(yaml|json)\n([\s\S]*?)```/g)]
    .map(match => [match[1], match[2]]);
  const english = examples("README.md");
  assert.ok(english.length >= 4, "Expected configuration, Action, SARIF and pre-commit examples");
  assert.deepEqual(english, examples("README.tr.md"));
});

test("pre-commit: manifest selects instruction files and exposes the installed executable", () => {
  const manifest = readFileSync(".pre-commit-hooks.yaml", "utf8");
  const pattern = new RegExp(manifest.match(/^  files: '(.+)'$/m)[1]);
  for (const file of ["AGENTS.md", "nested/CLAUDE.md", ".cursorrules", ".cursor/rules/review.mdc", "system-guide.txt", "prompts/check.prompt.md"]) {
    assert.ok(pattern.test(file), file);
  }
  for (const file of ["README.md", "src/main.js", "notAGENTS.md"]) assert.ok(!pattern.test(file), file);
  const pkg = JSON.parse(readFileSync("package.json", "utf8"));
  assert.ok(pkg.bin[manifest.match(/^  entry: (.+)$/m)[1]]);
  assert.match(manifest, /^  language: node$/m);
});

test("pre-commit: default hook arguments pass clean input and fail warnings", async () => {
  const manifest = readFileSync(".pre-commit-hooks.yaml", "utf8");
  const args = manifest.match(/^  args: \[(.+)\]$/m)[1].split(/,\s*/).map(arg => arg.replace(/'/g, ""));
  const io = { stdout: { write() {} }, stderr: { write() {} } };
  assert.equal(await runCli([...args, "test/fixtures/clean/CLAUDE.md"], io), 0);
  assert.equal(await runCli([...args, "test/fixtures/dirty/warning.prompt"], io), 1);
});
