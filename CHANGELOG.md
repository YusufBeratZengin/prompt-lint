# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Reproducible terminal SVG demo with a generator and CI freshness check.
- Native Node.js test coverage reports in local runs and the CI matrix.
- Weekly CodeQL analysis for JavaScript and weekly dependency updates for GitHub Actions.
- Matching English and Turkish quick starts, project rationale, and FAQs.
- Configuration validation with actionable errors and a published JSON Schema.
- CLI regression coverage for colors, exit codes, warning limits, quiet output, usage errors, and invalid configurations.
- Runnable good/bad instruction examples and example configuration.
- Tag-triggered npm release workflow using trusted publishing, provenance, and a version check.
- Issue forms, pull request template, Contributor Covenant 2.1, and Dependabot configuration.
- Exit-code tables, pre-commit and CI examples, and owner release instructions.
- Version-controlled lockfile, LF attributes, and Node.js 24 CI coverage.

### Changed

- Include Turkish documentation, changelog, security policy, and config schema in the npm package.
- Add public/provenance publish settings and test/self-lint checks before publication.
- Refresh English and Turkish READMEs with matching structure, badges, and real terminal output.
- Describe token counts as heuristic estimates and remove unsupported tokenizer accuracy claims.

### Fixed

- Respect TTY detection, NO_COLOR, and FORCE_COLOR for default terminal output.
- Avoid PL003 contradictions between directives with different qualifier scopes or objects.
- Emit only the most specific PL009 diagnostic for overlapping secret matches.

## [0.1.0] - 2026-10-23

### Added
- Initial release of prompt-lint.
- Core CLI binary `prompt-lint` with zero runtime dependencies.
- Programmatic API for linting files, globs, and raw text strings.
- Rule PL001: File token budget estimator.
- Rule PL002: Duplicate and near-duplicate line detector (normalized shingles and Jaccard similarity).
- Rule PL003: Contradictory directives detector ("always X" vs "never X" polarity conflict).
- Rule PL004: Vague and untestable directive detector.
- Rule PL005: ALL-CAPS shouting density detector.
- Rule PL006: Excessive emphasis markers detector (repeated punctuation and nested emphasis).
- Rule PL007: Unresolved placeholder and TODO detector.
- Rule PL008: Broken relative file reference detector.
- Rule PL009: Exposed credentials, tokens, and API keys detector with value masking.
- Rule PL010: Long lines and unbounded paragraphs detector.
- Rule PL011: Excessive heading depth detector (depth > 4).
- Rule PL012: List item action verb detector (optional, off by default).
- Flexible configuration loader supporting `.promptlintrc.json` and overrides.
- Output formatters: stylish text (with ANSI coloring and NO_COLOR support), JSON, and SARIF v2.1.0 for GitHub Code Scanning.
- Unit and integration test suite using native Node.js test runner (`node:test`).
