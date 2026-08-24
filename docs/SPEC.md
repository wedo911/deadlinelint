# DeadlineLint v0 specification

## Inputs

- Browser: one text value up to 2,000,000 characters.
- CLI: supported text files or directories, up to 5,000 files.
- Optional JSON configuration controlling extensions, ignores, rules, and code-fence scanning.

Arabic-Indic and Eastern Arabic digits are normalized only for matching. Original text, line, column, and excerpt are preserved in reports.

## Rules

- `DL001`: `D/M/YYYY` or `M/D/YYYY` form where both leading values are 1–12.
- `DL002`: numeric date with a two-digit year.
- `DL003`: selected English or Arabic relative date wording.
- `DL004`: time on a deadline/event line without a UTC label or offset, IANA zone, recognized zone label, or Arabic named-time phrase.
- `DL005`: selected alphabetic zone abbreviations with multiple regional meanings.
- `DL006`: named month and day on a deadline/event line without a four-digit year.

Markdown fenced code is skipped by default. `deadlinelint-disable-line` can suppress all or selected rule IDs on its line.

## Output

JSON uses `deadlinelint.report.v1`. Every issue includes rule, severity, title, message, suggestion, file, line, column, matched text, and excerpt. Text and GitHub workflow formats derive from the same report.

Exit codes are `0` clear, `1` review required, and `2` operational or usage error. Advisory mode maps review-required to `0` without removing findings.

## Non-goals

- Inferring which date or zone the author intended.
- Calendar conversion or date arithmetic.
- Legal, regulatory, or accessibility conformance claims.
- Natural-language completeness beyond the documented patterns.
