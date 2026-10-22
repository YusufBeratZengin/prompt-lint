import { parseArgs } from "node:util";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { loadConfig } from "./config.js";
import { scanFiles } from "./scanner.js";
import { lintFiles, lintText } from "./linter.js";
import { getFormatter } from "./formatters/index.js";

const HELP_TEXT = `prompt-lint - Linter for LLM prompt and agent instruction files

Usage:
  prompt-lint [options] [files or globs...]

Options:
  -f, --format <format>       Output format: stylish, json, sarif (default: stylish)
  -c, --config <path>         Path to custom JSON configuration file
      --max-tokens <count>    Override max token budget for PL001
      --max-warnings <count>  Exit with code 1 if warnings exceed this number (default: -1)
  -q, --quiet                 Report errors only; suppress warnings
      --rule <id>=<severity>  Override rule severity (e.g. --rule PL001=off)
      --ignore <pattern>      Ignore glob pattern (can be passed multiple times)
      --stdin                 Read prompt text from standard input
      --stdin-filename <name> Filename to display when using --stdin (default: <stdin>)
      --no-color              Disable ANSI color output
  -v, --version               Display version information
  -h, --help                  Show this help message

Default targets:
  If no files or globs are provided, prompt-lint automatically scans for:
  CLAUDE.md, AGENTS.md, .cursorrules, .cursor/rules/*.mdc,
  **/*.prompt, **/*.prompt.md, **/system*.md, **/system*.txt

Examples:
  prompt-lint
  prompt-lint CLAUDE.md AGENTS.md
  prompt-lint --format sarif > results.sarif
  cat system.prompt | prompt-lint --stdin
`;

/**
 * Reads all data from standard input.
 *
 * @param {NodeJS.ReadableStream} [stdinStream=process.stdin]
 * @returns {Promise<string>}
 */
async function readStdin(stdinStream = process.stdin) {
  const chunks = [];
  for await (const chunk of stdinStream) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks).toString("utf-8");
}

/**
 * Main CLI execution entry point.
 *
 * @param {string[]} args Command-line arguments (usually process.argv.slice(2))
 * @param {Object} [io]
 * @param {Object} [io.stdout=process.stdout]
 * @param {Object} [io.stderr=process.stderr]
 * @param {Object} [io.stdin=process.stdin]
 * @returns {Promise<number>} Exit code
 */
export async function runCli(args = process.argv.slice(2), io = {}) {
  const out = io.stdout || process.stdout;
  const errOut = io.stderr || process.stderr;
  const inStream = io.stdin || process.stdin;

  let parsed;

  try {
    parsed = parseArgs({
      args,
      options: {
        format: { type: "string", short: "f", default: "stylish" },
        config: { type: "string", short: "c" },
        "max-tokens": { type: "string" },
        "max-warnings": { type: "string", default: "-1" },
        quiet: { type: "boolean", short: "q", default: false },
        rule: { type: "string", multiple: true, default: [] },
        ignore: { type: "string", multiple: true, default: [] },
        stdin: { type: "boolean", default: false },
        "stdin-filename": { type: "string", default: "<stdin>" },
        "no-color": { type: "boolean", default: false },
        version: { type: "boolean", short: "v", default: false },
        help: { type: "boolean", short: "h", default: false }
      },
      allowPositionals: true
    });
  } catch (err) {
    errOut.write(`prompt-lint error: ${err.message}\n\n${HELP_TEXT}`);
    return 2;
  }

  const { values, positionals } = parsed;

  if (values.help) {
    out.write(HELP_TEXT);
    return 0;
  }

  if (values.version) {
    try {
      const pkgPath = resolve(new URL(".", import.meta.url).pathname.replace(/^\/([A-Z]:)/, "$1"), "../package.json");
      const pkg = JSON.parse(readFileSync(pkgPath, "utf-8"));
      out.write(`prompt-lint v${pkg.version}\n`);
    } catch {
      out.write("prompt-lint v0.1.0\n");
    }
    return 0;
  }

  // Load configuration
  let config;
  try {
    const loaded = await loadConfig(values.config);
    config = loaded.config;
  } catch (err) {
    errOut.write(`prompt-lint configuration error: ${err.message}\n`);
    return 2;
  }

  // CLI overrides
  if (values["max-tokens"]) {
    const maxTokens = Number(values["max-tokens"]);
    if (!Number.isNaN(maxTokens) && maxTokens > 0) {
      config.budget = config.budget || {};
      config.budget.maxTokens = maxTokens;
      config.options.PL001 = config.options.PL001 || {};
      config.options.PL001.maxTokens = maxTokens;
    }
  }

  if (values.rule && values.rule.length > 0) {
    for (const ruleOverride of values.rule) {
      const [id, sev] = ruleOverride.split("=");
      if (id && sev) {
        config.rules[id.toUpperCase()] = sev.toLowerCase();
      }
    }
  }

  if (values.ignore && values.ignore.length > 0) {
    config.ignore = [...config.ignore, ...values.ignore];
  }

  let results = [];

  if (values.stdin) {
    const stdinContent = await readStdin(inStream);
    const result = lintText(stdinContent, {
      filePath: values["stdin-filename"] || "<stdin>",
      config
    });
    results = [result];
  } else {
    const files = await scanFiles(positionals, process.cwd(), config.ignore);

    if (files.length === 0) {
      if (positionals.length > 0) {
        errOut.write(`prompt-lint: No matching files found for pattern: ${positionals.join(", ")}\n`);
        return 1;
      }
      out.write("No prompt instruction files found to lint.\n");
      return 0;
    }

    results = await lintFiles(files, { config });
  }

  // Filter diagnostics if --quiet is enabled
  if (values.quiet) {
    for (const r of results) {
      r.diagnostics = r.diagnostics.filter(d => d.severity === "error");
    }
  }

  // Format and print output
  const formatter = getFormatter(values.format);
  const formattedOutput = formatter(results, { color: !values["no-color"] });
  out.write(formattedOutput.endsWith("\n") ? formattedOutput : formattedOutput + "\n");

  // Determine exit code
  let totalErrors = 0;
  let totalWarnings = 0;

  for (const r of results) {
    for (const d of r.diagnostics) {
      if (d.severity === "error") totalErrors++;
      if (d.severity === "warning") totalWarnings++;
    }
  }

  const maxWarnings = Number(values["max-warnings"]);

  if (totalErrors > 0) {
    return 1;
  }

  if (maxWarnings >= 0 && totalWarnings > maxWarnings) {
    return 1;
  }

  return 0;
}
