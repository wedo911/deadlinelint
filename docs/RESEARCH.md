# Research note

Research date: 2026-08-25.

## Problem

Short numeric dates change order across locales, relative dates expire as context changes, and a clock time without a zone can refer to different instants. These problems matter in applications, registrations, public events, support notices, and emergency information.

Primary sources:

- [Unicode CLDR date/time patterns](https://cldr.unicode.org/translation/date-time/date-time-patterns) documents locale-specific ordering and forms for short dates.
- [RFC 3339](https://www.rfc-editor.org/info/rfc3339/) explains why complete years and an explicit relationship to UTC improve interoperability.
- [GOV.UK date pattern guidance](https://design-system.service.gov.uk/patterns/dates/) recommends examples whose day and month demonstrate the expected order.

## Landscape check

Searches covered GitHub repositories, GitHub code, GitHub Marketplace, and the web with combinations of:

- `GitHub Action lint ambiguous dates documentation timezone deadline`
- `CLI detect ambiguous numeric dates text linter`
- `Vale rule ambiguous date format timezone deadline`
- `deadline lint timezone documentation`

Nearby software parses dates, validates structured timestamps, manages issue due dates, or provides general text-lint frameworks. One-off project style rules also exist. The reviewed results did not expose a standalone, bilingual, privacy-preserving editorial checker combining ambiguous dates, relative wording, missing deadline zones, and ambiguous zone abbreviations.

This search supports a focused tooling gap; it cannot prove that no private or unindexed implementation exists.

## Product decision

DeadlineLint reports textual evidence and a suggested clarification. It does not parse an ambiguous value into a date. This avoids converting an editorial warning into an authoritative but potentially wrong interpretation.

The browser, CLI, and Action share one deterministic analyzer. English and Arabic patterns are included in v0, while configuration and line directives let teams control rules that do not fit their publishing context.
