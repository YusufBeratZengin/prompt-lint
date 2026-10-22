# prompt-lint

A static analysis linter for Large Language Model (LLM) system prompts and agent instruction files (`CLAUDE.md`, `AGENTS.md`, `.cursorrules`, `.prompt`, `.prompt.md`, and system prompt templates).

As software engineering teams adopt AI coding assistants, agent configuration files expand into contradictory, repetitive documents that exhaust token budgets and degrade model adherence. `prompt-lint` enforces clean, deterministic standards on prompt files using explainable static rules with zero runtime dependencies.

[Türkçe Dokümantasyon](README.tr.md)

---

## Features

- Zero runtime dependencies: Built strictly with native Node.js standard libraries.
- High-performance token estimator: Deterministic subword, unicode, and whitespace heuristics approximating BPE tokenizers without external weights.
- 12 explainable static analysis rules covering token budgets, contradictions, shouting, placeholders, broken relative links, and exposed secrets.
- Multi-format output: Stylish terminal reporter with ANSI colors and `NO_COLOR` support, machine-readable JSON, and OASIS SARIF v2.1.0 for GitHub Code Scanning.
- Native configuration via `.promptlintrc.json` with severity controls and rule-level options.
- Programmatic API for integration into custom build chains and test pipelines.

---

## Installation

`prompt-lint` requires Node.js version 20.0.0 or higher.

Install globally:
```bash
npm install -g prompt-lint
```

Or run directly with `npx`:
```bash
npx prompt-lint
```

Or install as a development dependency:
```bash
npm install --save-dev prompt-lint
```

---

## CLI Usage

### Automatic Discovery
When invoked without file arguments, `prompt-lint` recursively discovers standard prompt files in your repository (`CLAUDE.md`, `AGENTS.md`, `.cursorrules`, `.cursor/rules/*.mdc`, `**/*.prompt`, `**/*.prompt.md`, `**/system*.md`, `**/system*.txt`):

```bash
prompt-lint
```

### Explicit Targets
You can specify explicit files or directory targets:

```bash
prompt-lint CLAUDE.md AGENTS.md
prompt-lint "prompts/**/*.md"
```

### Standard Input
`prompt-lint` can analyze prompt templates piped from standard input:

```bash
cat system.prompt | prompt-lint --stdin --stdin-filename system.prompt
```

### Output Formats

#### Terminal (Default)
```bash
prompt-lint
```

#### JSON Output
```bash
prompt-lint --format json > report.json
```

#### SARIF (GitHub Code Scanning)
```bash
prompt-lint --format sarif > results.sarif
```

### Command-Line Options

| Option | Short | Description | Default |
| --- | --- | --- | --- |
| `--format <format>` | `-f` | Output format: `stylish`, `json`, `sarif` | `stylish` |
| `--config <path>` | `-c` | Custom JSON configuration file path | Auto-detected |
| `--max-tokens <count>` | | Override token budget threshold for PL001 | `2000` |
| `--max-warnings <count>` | | Exit with status code 1 if warnings exceed count | `-1` (disabled) |
| `--quiet` | `-q` | Report errors only, suppressing warnings | `false` |
| `--rule <id>=<sev>` | | Override rule severity (`off`, `info`, `warning`, `error`) | None |
| `--ignore <pattern>` | | Exclude glob pattern from linting | None |
| `--stdin` | | Read prompt content from standard input | `false` |
| `--stdin-filename <name>` | | Label displayed when using `--stdin` | `<stdin>` |
| `--no-color` | | Disable ANSI terminal colors | `false` |
| `--version` | `-v` | Display package version | |
| `--help` | `-h` | Display help screen | |

---

## Rules Reference

Every rule has a unique identifier (`PL001` to `PL012`), default severity, and configurable options.

| Rule ID | Name | Category | Default Severity | Description |
| --- | --- | --- | --- | --- |
| `PL001` | `token-budget` | Budget | `warning` | Flags instruction files whose estimated token count exceeds the configured budget. |
| `PL002` | `duplicate-content` | Redundancy | `warning` | Detects duplicate or near-duplicate lines using normalized shingles and Jaccard similarity. |
| `PL003` | `contradictory-directives` | Logic | `error` | Flags conflicting instructions (such as "always X" vs "never X") targeting the same subject. |
| `PL004` | `vague-directive` | Clarity | `warning` | Identifies non-actionable directives like "be careful", "do your best", or "ensure high quality". |
| `PL005` | `shouting-density` | Style | `warning` | Detects excessive consecutive ALL-CAPS words or shouting sentences. Excludes standard acronyms. |
| `PL006` | `excessive-emphasis` | Style | `warning` | Detects repeated punctuation marks (`!!!`, `???`) or stacked markdown bold-italics formatting. |
| `PL007` | `unresolved-placeholder` | Integrity | `error` | Detects unresolved placeholders (`{{var}}`, `<TODO>`, `TBD`, `[INSERT_...]`). |
| `PL008` | `broken-relative-link` | Integrity | `error` | Verifies that relative file paths referenced in backticks or markdown links exist on disk. |
| `PL009` | `exposed-secret` | Security | `error` | Scans for exposed API keys, bearer tokens, or private credentials, masking values in reports. |
| `PL010` | `long-paragraph` | Clarity | `warning` | Flags lines exceeding character limits or dense paragraphs exceeding word limits without breaks. |
| `PL011` | `excessive-heading-depth` | Style | `warning` | Flags markdown heading depths greater than 4 (`#####` and `######`) that fragment context. |
| `PL012` | `list-item-verb` | Style | `off` | Enforces that list items begin with an active imperative verb. (Optional, disabled by default). |

---

## Configuration

`prompt-lint` automatically searches for a `.promptlintrc.json` file in the current working directory or a `"promptlint"` property in `package.json`.

Example `.promptlintrc.json`:

```json
{
  "budget": {
    "maxTokens": 2000
  },
  "rules": {
    "PL001": "warning",
    "PL002": "warning",
    "PL003": "error",
    "PL004": "warning",
    "PL005": "warning",
    "PL006": "warning",
    "PL007": "error",
    "PL008": "error",
    "PL009": "error",
    "PL010": "warning",
    "PL011": "warning",
    "PL012": "off"
  },
  "options": {
    "PL001": {
      "maxTokens": 2500
    },
    "PL002": {
      "threshold": 0.80,
      "minWords": 4
    },
    "PL010": {
      "maxLineLength": 500,
      "maxParagraphWords": 250
    }
  },
  "ignore": [
    "node_modules/**",
    ".git/**",
    "dist/**",
    "coverage/**"
  ]
}
```

---

## Programmatic API

`prompt-lint` exposes a clean ESM programmatic API for integration into Node.js workflows.

```javascript
import { lintFile, lintFiles, lintText, estimateTokens } from "prompt-lint";

// Estimate tokens for a string
const stats = estimateTokens("Always format files with Prettier.");
console.log(`Tokens: ${stats.tokens}, Words: ${stats.words}`);

// Lint a raw text string
const textResult = lintText("Never use TypeScript.\nAlways use TypeScript.");
for (const diag of textResult.diagnostics) {
  console.log(`[${diag.ruleId}] Line ${diag.line}: ${diag.message}`);
}

// Lint files on disk
const fileResults = await lintFiles(["CLAUDE.md", "AGENTS.md"]);
```

---

## CI / CD Integration

### GitHub Actions Workflow

Add the following step to upload SARIF results directly to GitHub Code Scanning:

```yaml
name: Prompt Quality

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  lint-prompts:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout repository
        uses: actions/checkout@v4

      - name: Set up Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 20

      - name: Run prompt-lint SARIF
        run: npx prompt-lint --format sarif > results.sarif
        continue-on-error: true

      - name: Upload SARIF to GitHub Code Scanning
        uses: github/codeql-action/upload-sarif@v3
        with:
          sarif_file: results.sarif
```

---

## License

MIT License. Copyright (c) 2026 Yusuf Berat Zengin.
See [LICENSE](LICENSE) for full details.
