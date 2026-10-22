# CLAUDE.md

Guidelines for Claude interacting with the prompt-lint repository.

## Commands
- Run test suite: `node --test`
- Run linter: `node bin/prompt-lint.js`
- Test specific file: `node --test test/rules/pl001-token-budget.test.js`

## Code Guidelines
- ESM modules only (`import`/`export`).
- Zero runtime dependencies (`dependencies` object in `package.json` must remain empty).
- Use Node.js built-in modules (`node:fs`, `node:path`, `node:test`, `node:assert/strict`, `node:util`).
- Document all new rules with category, default severity, and clear messages.
- Always run `node --test` before completing any task.
