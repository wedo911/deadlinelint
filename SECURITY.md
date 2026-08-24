# Security policy

## Supported versions

Security fixes are applied to the latest release line.

## Reporting

Use GitHub private vulnerability reporting for this repository. Do not disclose a suspected vulnerability in a public issue. Include the affected version, reproduction steps, impact, and any suggested mitigation. An acknowledgement is expected within seven days.

## Boundaries

The browser checker performs local string analysis and makes no network requests. The CLI recursively reads supported text files, skips symbolic links, and does not execute document content. Run third-party pull requests with a read-only token and no unrelated secrets.
