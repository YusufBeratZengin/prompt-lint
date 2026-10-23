# Rules

All rules run locally with no network access. Severities are defaults; set `rules.<ID>` to `off`, `info`, `warning`, or `error` in your configuration. Examples below are illustrative text, not credentials. English directive checks are heuristic.

| ID | Name | Severity | Why | Bad example | Good example |
| --- | --- | --- | --- | --- | --- |
| [PL001](#pl001) | token-budget | warning | Oversized files consume the context budget. | A file above 2,000 estimated tokens. | A focused file within its budget. |
| [PL002](#pl002) | duplicate-content | warning | Repetition wastes context and complicates maintenance. | Repeat `Run unit tests before committing.` twice. | State the instruction once. |
| [PL003](#pl003) | contradictory-directives | error | Opposing instructions leave the agent without a consistent action. | `Always run tests.` followed by `Never run tests.` | `Always run tests before committing.` |
| [PL004](#pl004) | vague-directive | warning | Unmeasurable instructions cannot be checked. | `Be careful.` | `Run unit tests before committing.` |
| [PL005](#pl005) | shouting-density | warning | Capitalization adds noise rather than precision. | `YOU MUST ALWAYS FOLLOW EVERY INSTRUCTION EXACTLY` | `Follow the instructions in order.` |
| [PL006](#pl006) | excessive-emphasis | warning | Repeated punctuation distracts from actionable content. | `Run tests!!!` | `Run tests.` |
| [PL007](#pl007) | unresolved-placeholder | error | Unfilled templates can reach an agent as literal text. | `Use {{language}}.` | `Use JavaScript.` |
| [PL008](#pl008) | broken-relative-link | error | Dangling references prevent the agent from finding context. | `Read` followed by a backtick reference to `missing-guide.md`. | `[guide](../README.md)` from this document. |
| [PL009](#pl009) | exposed-secret | error | Credentials do not belong in instruction files. | A credential pasted into a prompt (value omitted). | `Read credentials from the environment.` |
| [PL010](#pl010) | long-paragraph | warning | Dense text obscures individual constraints. | A line above 500 characters or paragraph above 250 words. | Short paragraphs with focused instructions. |
| [PL011](#pl011) | excessive-heading-depth | warning | Deep nesting fragments instructions. | `##### Testing` | `## Testing` |
| [PL012](#pl012) | list-item-verb | off | Imperative list items clarify the requested action. | `- Unit tests before commit` | `- Run unit tests before committing.` |
| [PL013](#pl013) | section-token-budget | warning | One oversized section is hard to navigate even within a larger file budget. | A section above 1,000 estimated tokens. | Split independent instructions under separate headings. |

## PL001

The whole-file budget defaults to 2,000 estimated tokens. Configure `budget.maxTokens` or CLI `--max-tokens`. Token estimates are heuristic, not model tokenizer counts.

## PL002

Compares normalized line shingles with Jaccard similarity. Options: `threshold` (default `0.8`) and `minWords` (default `4`). Fenced code is excluded.

## PL003

Detects opposing English directives in the same file, including across sections. For example:

```markdown
Always use TypeScript.
Never use TypeScript.
```

Replace the pair with one consistent instruction. Objects and qualifier scopes must match after normalization. `Always run tests before committing.` and `Never run tests in production.` have different scopes and pass. Fenced examples are ignored. The legacy `threshold` option is accepted for compatibility but does not affect matching.

## PL004

Replace phrases such as `do your best` or `ensure high quality` with observable criteria, commands, or acceptance conditions.

## PL005

Detects uppercase density and consecutive uppercase words, excluding known acronyms. Options: `uppercaseThreshold` (`0.4`), `minWords` (`5`), and `consecutiveLimit` (`3`).

## PL006

Avoid repeated exclamation/question marks and stacked bold-italic emphasis. Prefer precise wording with normal punctuation.

## PL007

Resolve template expressions, TODO tags, `TBD`, and insertion markers before using the instructions. Fenced code examples are excluded.

## PL008

Checks local paths in inline backticks and Markdown links, including bare filenames with recognized extensions, directory paths, and extensionless link targets. Paths resolve against the instruction file's directory, then the working directory. Both POSIX and Windows separators work. URL-encoded paths, fragments, query strings in Markdown links, optional link titles, and angle-bracket destinations with spaces are supported.

External URLs, anchor-only links, shell commands, globs, path templates, and fenced examples are ignored. Bare prose is not scanned for paths. This is an existence check; it cannot tell whether a referenced file's content is correct or whether a future generated file will exist. Reference generated paths in fenced examples or disable the rule when that is intentional.

## PL009

Detects credential-shaped strings and masks matched values in diagnostics. Reports can still contain other instruction text; review them before sharing. Never use live credentials as examples or fixtures.

## PL010

Options: `maxLineLength` (default `500` characters) and `maxParagraphWords` (default `250`). Fenced code, tables, and standalone URLs have exclusions to reduce false positives.

## PL011

Heading depths five and six produce warnings. Use at most four levels for instructions. Headings inside fenced code do not count.

## PL012

Optional English imperative-verb check for list items. Enable with `"rules": { "PL012": "warning" }`. It uses a fixed verb vocabulary rather than grammatical analysis.

## PL013

Each ATX heading (`#` through `######`) begins a new section, ending at the next heading of any depth. Parent sections do not include child sections. Text before the first heading is the preamble; a file without headings is one section. Heading text is excluded from the estimate; body text, lists, tables, and fenced examples are included. Headings inside fences do not split sections.

A section above the default 1,000 estimated tokens produces one diagnostic at its heading (or first nonblank preamble line). Equality with the limit passes. Empty sections pass. This rule is independent of the whole-file PL001 budget.

```json
{
  "rules": { "PL013": "warning" },
  "options": { "PL013": { "maxTokens": 750 } }
}
```

Split oversized sections into focused topics, raise the threshold for intentional long sections, or disable PL013 with `"rules": { "PL013": "off" }`.
