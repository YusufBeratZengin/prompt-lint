# Contributing to prompt-lint

Thank you for your interest in contributing to `prompt-lint`. This project aims to maintain high performance, explainable diagnostics, and zero runtime dependencies.

## Prerequisites

- Node.js 20.0.0 or higher.
- Git.

`prompt-lint` has zero runtime dependencies and uses the native Node.js test runner (`node:test`). You do not need to install third-party packages to develop or run tests.

Keep `package-lock.json` in version control so CI and releases can use `npm ci` reproducibly, even while the dependency set is empty.

## Development Workflow

1. Clone the repository:
   ```bash
   git clone https://github.com/YusufBeratZengin/prompt-lint.git
   cd prompt-lint
   ```

2. Run the test suite:
   ```bash
   npm test
   ```

3. Run self-linting against project instructions:
   ```bash
   node bin/prompt-lint.js
   ```

`npm test` prints line, branch, and function coverage using Node.js's native coverage support. Keep line coverage at or above 85% and add behavior-focused tests for uncovered branches when it drops below that target. There is no separate typecheck command for this JavaScript project.

When CLI output changes, run `npm run demo` and review `docs/demo.svg`. CI runs `npm run demo:check` to catch stale images. Keep the terminal examples in both READMEs synchronized with the CLI output.

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

## Releasing

The owner must first configure an [npm trusted publisher](https://docs.npmjs.com/trusted-publishers/) for user `YusufBeratZengin`, repository `prompt-lint`, workflow filename `release.yml`, and environment `npm`. Enable direct `npm publish` for that publisher and configure the matching GitHub environment. The workflow uses Node.js 24 with npm 11.5.1 or newer for OIDC authentication; it contains no npm token.

For a release, update the Unreleased changelog entries, bump the SemVer version in both `package.json` and `package-lock.json`, and run:

```bash
npm ci
npm run lint
npm test
npm pack --dry-run
```

Review the package contents, then commit with `chore(release): vX.Y.Z`, using the actual version in place of `X.Y.Z`. Create the matching version tag and push it when ready to publish. Only a pushed tag matching `v*.*.*` triggers `.github/workflows/release.yml`; the job checks that the tag equals the package version, reruns checks, and publishes with provenance and public access. Do not run the release workflow just to validate a contribution.

## License

By contributing to `prompt-lint`, you agree that your contributions will be licensed under the MIT License.
