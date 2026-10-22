# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - 2026-10-22

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
