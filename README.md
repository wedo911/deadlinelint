# DeadlineLint

DeadlineLint finds dates and times that can change meaning across locales, publication dates, and time zones. It runs as a private browser tool, dependency-free Node.js CLI, and GitHub Action.

**[Open the live checker](https://wedo911.github.io/deadlinelint/)**

English and Arabic text are supported, including Arabic-Indic digits. Text pasted into the browser never leaves the device.

## Checks

| Rule | Review trigger | Example |
| --- | --- | --- |
| `DL001` | Numeric day and month are both 12 or less | `03/04/2026` |
| `DL002` | Two-digit year | `31/12/26` |
| `DL003` | Relative date in English or Arabic | `tomorrow`, `غدا` |
| `DL004` | Deadline or event time has no clear zone | `closes at 5:00 PM` |
| `DL005` | Ambiguous time-zone abbreviation | `CST`, `IST`, `AST` |
| `DL006` | Deadline month and day have no year | `closes March 4` |

Findings ask an editor to clarify the text. DeadlineLint never guesses the intended date or claims that a document is legally sufficient.

## GitHub Action

```yaml
name: Deadline clarity

on:
  pull_request:

permissions:
  contents: read

jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v7
      - uses: wedo911/deadlinelint@v0
        with:
          path: docs
```

The Action annotates exact files and lines and fails when findings exist. Set `fail-on-findings: "false"` for advisory mode.

## CLI

Node.js 20 or newer is required.

```bash
npx deadlinelint README.md docs/
npx deadlinelint public/ --format json --output deadline-report.json
npx deadlinelint docs/ --format github --no-fail
```

JSON reports use the stable schema identifier `deadlinelint.report.v1`.

With no path, the current directory is scanned. Supported defaults are Markdown, MDX, text, HTML, reStructuredText, and AsciiDoc. Git, dependencies, build output, coverage, and vendor trees are skipped.

Exit codes:

- `0`: clear, or advisory mode.
- `1`: editorial review required.
- `2`: invalid input, configuration, or filesystem error.

## Configuration

Create `.deadlinelintrc.json`:

```json
{
  "extensions": [".md", ".txt", ".html"],
  "ignore": ["**/archive/**", "**/fixtures/**"],
  "rules": {
    "DL003": false
  },
  "scanCodeBlocks": false
}
```

To suppress an intentional example on one line:

```markdown
An ambiguous date looks like 03/04/2026. <!-- deadlinelint-disable-line DL001 -->
```

Omit rule IDs after `deadlinelint-disable-line` to suppress all findings on that line.

## Privacy and security

- The live checker uses no network requests, analytics, cookies, or browser storage.
- The CLI has no runtime packages and reads only selected text files.
- Symlinks are skipped during recursive scans.
- Individual inputs are limited to 2,000,000 characters and scans to 5,000 files.
- The Action requires read-only repository contents.

See [SECURITY.md](SECURITY.md) for reporting and support details.

## Research and limits

Unicode CLDR documents that short date patterns vary by locale. RFC 3339 requires complete years and an explicit relationship to UTC for interoperable timestamps. DeadlineLint turns those interoperability risks into focused editorial reminders.

See [docs/RESEARCH.md](docs/RESEARCH.md) for the landscape check and [docs/SPEC.md](docs/SPEC.md) for the exact v0 contract.

## Development

```bash
npm ci
npm test
npm run check
```

## License

[MIT](LICENSE)
