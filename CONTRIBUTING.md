# Contributing to prompt-lint

Thank you for your interest in contributing to `prompt-lint`. This project aims to maintain high performance, explainable diagnostics, and zero runtime dependencies.

## Prerequisites

- Node.js 20.0.0 or higher.
- Git.

`prompt-lint` has zero runtime dependencies and uses the native Node.js test runner (`node:test`). You do not need to install third-party packages to develop or run tests.

## Development Workflow

1. Clone the repository:
   ```bash
   git clone https://github.com/YusufBeratZengin/prompt-lint.git
   cd prompt-lint
   ```

2. Run the test suite:
   ```bash
   node --test
   ```

3. Run self-linting against project instructions:
   ```bash
   node bin/prompt-lint.js
   ```

## Architecture Overview

- `bin/prompt-lint.js`: CLI entry point.
- `src/index.js`: Main programmatic exports (`lintFiles`, `lintText`, `rules`, `loadConfig`).
- `src/cli.js`: Command-line interface parser and handler.
- `src/config.js`: Configuration discovery, parsing, and validation.
- `src/scanner.js`: File discovery and glob resolution without external dependencies.
- `src/token-estimator.js`: Deterministic token estimation algorithm.
- `src/rules/`: Individual rule definitions (`pl001-*.js` through `pl012-*.js`).
- `src/formatters/`: Output formatters (`stylish.js`, `json.js`, `sarif.js`).
- `src/utils/`: Markdown context parsing and text similarity utilities.
- `test/`: Native Node.js test suites and fixture files.

## Adding a New Rule

1. Assign an unused identifier in sequence (for example, `PL013`).
2. Implement the rule in `src/rules/pl013-<rule-name>.js`.
3. Export the rule in `src/rules/index.js`.
4. Add comprehensive unit tests in `test/rules/pl013-<rule-name>.test.js`, including:
   - Valid content that should not trigger the rule (false-positive prevention).
   - Code block isolation checks (ensure code snippets inside fences are ignored where appropriate).
   - Violation cases with exact expected diagnostic line, column, and message.
5. Document the rule in `README.md` and `README.tr.md`.
6. Update `.promptlintrc.json` with the default severity.

## Commit Message Guidelines

This project uses Conventional Commits:

- `feat: add PL013 rule for system prompt role ordering`
- `fix: prevent false positive in PL008 for absolute URL hashes`
- `docs: update SARIF integration instructions in README`
- `test: add edge cases for Jaccard similarity in PL002`
- `refactor: optimize token chunking in token-estimator`

## License

By contributing to `prompt-lint`, you agree that your contributions will be licensed under the MIT License.
