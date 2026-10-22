# Agent Guidelines

Guidelines for automated agents operating in the prompt-lint repository.

## Mission
Maintain and enhance prompt-lint as a zero-dependency, high-performance static analysis tool for prompt and agent instruction files.

## Environment and Runtime
- Run on Node.js 20 or higher.
- Use ECMAScript modules exclusively.
- Introduce zero external runtime dependencies.
- Keep devDependencies to standard tooling; prefer `node:test` for testing.

## Commands
- Run test suite: `node --test`
- Run linter on instructions: `node bin/prompt-lint.js`
- Test custom fixture: `node bin/prompt-lint.js test/fixtures/clean/CLAUDE.md`

## Architecture Rules
- Locate new rules in `src/rules/` with identifier format `plXXX-<name>.js`.
- Export all rules through `src/rules/index.js`.
- Provide corresponding unit tests in `test/rules/` for each rule.
- Verify both positive violation cases and false-positive avoidance cases.
- Maintain SARIF v2.1.0 compatibility in `src/formatters/sarif.js`.

## Code Style
- Write deterministic logic without external network calls.
- Handle Windows and POSIX path separators cleanly.
- Ensure all diagnostics include line, column, severity, and ruleId.
