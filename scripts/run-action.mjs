import { appendFileSync, mkdtempSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { pathToFileURL } from "node:url";
import { runCli } from "../src/cli.js";
import { getFormatter } from "../src/formatters/index.js";

// Inputs are data, never shell-expanded or evaluated. One target per line permits spaces.
export async function runAction(env = process.env, io = process) {
  const format = (env.PROMPT_LINT_FORMAT || "stylish").trim();
  const failOn = (env.PROMPT_LINT_FAIL_ON || "error").trim();
  if (!["stylish", "json", "sarif"].includes(format) ||
      !["error", "warning", "none"].includes(failOn)) {
    io.stderr.write("prompt-lint action: invalid format or fail-on input.\n");
    return 2;
  }
  const args = ["--format", "json", "--no-color"];
  const config = env.PROMPT_LINT_CONFIG?.trim();
  if (config) args.push("--config", config);
  if (failOn === "warning") args.push("--max-warnings", "0");
  const paths = (env.PROMPT_LINT_PATHS || "").split(/\r?\n/).map(p => p.trim()).filter(Boolean);
  args.push("--", ...paths);

  let output = "";
  let errors = "";
  const code = await runCli(args, {
    stdout: { write: chunk => { output += chunk; } },
    stderr: { write: chunk => { errors += chunk; } }
  });
  if (env.GITHUB_OUTPUT) appendFileSync(env.GITHUB_OUTPUT, `exit-code=${code}\n`);
  // Auto-discovery with no matches is successful; still produce an uploadable report.
  if (code === 0 && output === "No prompt instruction files found to lint.\n") {
    output = "[]";
  }
  let results = [];
  if (output) {
    results = JSON.parse(output).map(result => ({ ...result, diagnostics: result.messages }));
    output = getFormatter(format)(results, { color: false }) + "\n";
    const dir = mkdtempSync(join(env.RUNNER_TEMP || tmpdir(), "prompt-lint-"));
    const extension = { stylish: "txt", json: "json", sarif: "sarif" }[format];
    const report = join(dir, `results.${extension}`);
    writeFileSync(report, output);
    if (env.GITHUB_OUTPUT) appendFileSync(env.GITHUB_OUTPUT, `report=${report}\n`);
    io.stdout.write(output);
  }
  io.stderr.write(errors);
  // Configuration, target discovery and I/O failures remain failures in report-only mode.
  if (failOn === "none" && code === 1 && output && !errors) {
    if (results.some(r => r.diagnostics.some(d => d.ruleId === "PL000" || d.message.startsWith("Internal rule error")))) return 1;
    return 0;
  }
  return code;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    process.exitCode = await runAction();
  } catch (error) {
    process.stderr.write(`prompt-lint action: ${error.message}\n`);
    process.exitCode = 2;
  }
}
