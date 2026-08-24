export const REPORT_SCHEMA = "deadlinelint.report.v1";
export const MAX_TEXT_LENGTH = 2_000_000;

export const RULES = Object.freeze({
  DL001: {
    title: "Ambiguous numeric date",
    message: "Both leading date fields are 12 or less, so readers may swap day and month.",
    suggestion: "Spell out the month or use an explicitly documented ISO date such as 2026-04-03."
  },
  DL002: {
    title: "Two-digit year",
    message: "A two-digit year can be interpreted in different centuries.",
    suggestion: "Write the complete four-digit year."
  },
  DL003: {
    title: "Relative date",
    message: "Relative wording changes meaning depending on when and where the text is read.",
    suggestion: "Replace it with a complete calendar date."
  },
  DL004: {
    title: "Deadline time without zone",
    message: "A deadline or event time appears without a UTC offset, IANA zone, or named time zone.",
    suggestion: "Add a zone such as UTC+03:00 or Asia/Riyadh, and include a date."
  },
  DL005: {
    title: "Ambiguous time-zone abbreviation",
    message: "This short time-zone label has multiple regional meanings.",
    suggestion: "Use an IANA zone name or a numeric UTC offset."
  },
  DL006: {
    title: "Deadline date without year",
    message: "A deadline or event date names a month and day but not a year.",
    suggestion: "Add the four-digit year."
  }
});

const ARABIC_DIGITS = Object.freeze({
  "٠": "0", "١": "1", "٢": "2", "٣": "3", "٤": "4",
  "٥": "5", "٦": "6", "٧": "7", "٨": "8", "٩": "9",
  "۰": "0", "۱": "1", "۲": "2", "۳": "3", "۴": "4",
  "۵": "5", "۶": "6", "۷": "7", "۸": "8", "۹": "9"
});

const RELATIVE_PATTERN = /\b(?:today|tomorrow|tonight|yesterday|next\s+(?:monday|tuesday|wednesday|thursday|friday|saturday|sunday|week|month)|this\s+(?:morning|afternoon|evening))\b|(?:اليوم|غد[اأإىً]|غداً|الليلة|الأسبوع\s+(?:القادم|المقبل)|الاسبوع\s+(?:القادم|المقبل)|الشهر\s+(?:القادم|المقبل)|(?:الأحد|الاحد|الإثنين|الاثنين|الثلاثاء|الأربعاء|الاربعاء|الخميس|الجمعة|السبت)\s+(?:القادم|المقبل))/giu;
const CONTEXT_PATTERN = /\b(?:deadline|due|closes?|closing|submit\s+by|apply\s+by|starts?|begins?|event|meeting|webinar|registration)\b|(?:الموعد\s+النهائي|آخر\s+موعد|اخر\s+موعد|يغلق|الإغلاق|الاغلاق|التقديم|يبدأ|يبدا|اجتماع|ندوة|فعالية|التسجيل)/iu;
const TIME_PATTERN = /(?:^|[^\d])((?:[01]?\d|2[0-3]):[0-5]\d(?:\s?(?:a\.?m\.?|p\.?m\.?|ص|م))?|(?:1[0-2]|[1-9])\s?(?:a\.?m\.?|p\.?m\.?|ص|م))(?!\d)/giu;
const ZONE_PATTERN = /\b(?:UTC|GMT)(?:\s?[+-]\d{1,2}(?::?\d{2})?)?\b|\b(?:CST|IST|BST|AST|SST|MST|PST|EST|CET|EET|JST|KST|AEST|NZST)\b|(?:^|\s)[+-]\d{2}:\d{2}\b|\b[A-Za-z_]+\/[A-Za-z_]+\b|(?:توقيت|بتوقيت)\s+[\p{L}_/+:-]+/iu;
const AMBIGUOUS_ZONE_PATTERN = /\b(?:CST|IST|BST|AST|SST|MST|PST|EST)\b/gu;
const MONTH_PATTERN = /\b(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\s+\d{1,2}(?:st|nd|rd|th)?\b|\b\d{1,2}\s+(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\b|(?:\d{1,2}\s+(?:يناير|فبراير|مارس|أبريل|ابريل|مايو|يونيو|يوليو|أغسطس|اغسطس|سبتمبر|أكتوبر|اكتوبر|نوفمبر|ديسمبر)|(?:يناير|فبراير|مارس|أبريل|ابريل|مايو|يونيو|يوليو|أغسطس|اغسطس|سبتمبر|أكتوبر|اكتوبر|نوفمبر|ديسمبر)\s+\d{1,2})/giu;

export function normalizeDigits(text) {
  return [...text].map((character) => ARABIC_DIGITS[character] ?? character).join("");
}

function enabled(rule, options) {
  return !new Set(options.disabledRules ?? []).has(rule);
}

function lineDisabled(line, rule) {
  const match = line.match(/deadlinelint-disable-line(?:\s+([A-Z0-9,\s]+))?/i);
  if (!match) return false;
  if (!match[1]) return true;
  return match[1].split(/[\s,]+/).filter(Boolean).map((item) => item.toUpperCase()).includes(rule);
}

function issue(rule, file, lineNumber, column, match, excerpt) {
  return {
    rule,
    severity: "warning",
    title: RULES[rule].title,
    message: RULES[rule].message,
    suggestion: RULES[rule].suggestion,
    file,
    line: lineNumber,
    column,
    match,
    excerpt: excerpt.trim()
  };
}

function addRegexIssues({ issues, regex, line, normalizedLine, lineNumber, file, rule, matchGroup = 0, predicate = null }) {
  regex.lastIndex = 0;
  let match;
  while ((match = regex.exec(normalizedLine)) !== null) {
    const value = match[matchGroup];
    const offset = match.index + (match[0].indexOf(value));
    if (!predicate || predicate(match, value)) {
      issues.push(issue(rule, file, lineNumber, offset + 1, line.slice(offset, offset + value.length), line));
    }
    if (match[0].length === 0) regex.lastIndex += 1;
  }
}

export function lintText(text, options = {}) {
  if (typeof text !== "string") throw new TypeError("Text input must be a string.");
  if (text.length > MAX_TEXT_LENGTH) throw new Error(`Text exceeds ${MAX_TEXT_LENGTH} characters.`);
  const file = options.file ?? "input";
  const issues = [];
  const lines = text.split(/\r?\n/);
  let inCodeFence = false;

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    const trimmed = line.trimStart();
    if (/^(?:```|~~~)/.test(trimmed)) {
      inCodeFence = !inCodeFence;
      if (!options.scanCodeBlocks) continue;
    }
    if (inCodeFence && !options.scanCodeBlocks) continue;

    const normalizedLine = normalizeDigits(line);
    const lineNumber = index + 1;

    if (enabled("DL001", options) && !lineDisabled(line, "DL001")) {
      addRegexIssues({
        issues,
        regex: /(?:^|[^\d])((\d{1,2})([\/.-])(\d{1,2})\3(\d{4}))(?!\d)/gu,
        line,
        normalizedLine,
        lineNumber,
        file,
        rule: "DL001",
        matchGroup: 1,
        predicate: (match) => Number(match[2]) >= 1 && Number(match[2]) <= 12 && Number(match[4]) >= 1 && Number(match[4]) <= 12
      });
    }

    if (enabled("DL002", options) && !lineDisabled(line, "DL002")) {
      addRegexIssues({
        issues,
        regex: /(?:^|[^\d])((\d{1,2})([\/.-])(\d{1,2})\3(\d{2}))(?!\d)/gu,
        line,
        normalizedLine,
        lineNumber,
        file,
        rule: "DL002",
        matchGroup: 1,
        predicate: (match) => Number(match[2]) >= 1 && Number(match[2]) <= 31 && Number(match[4]) >= 1 && Number(match[4]) <= 31
      });
    }

    if (enabled("DL003", options) && !lineDisabled(line, "DL003")) {
      addRegexIssues({ issues, regex: RELATIVE_PATTERN, line, normalizedLine, lineNumber, file, rule: "DL003" });
    }

    const hasContext = CONTEXT_PATTERN.test(normalizedLine);
    CONTEXT_PATTERN.lastIndex = 0;
    const hasTime = TIME_PATTERN.test(normalizedLine);
    TIME_PATTERN.lastIndex = 0;
    if (hasContext && enabled("DL004", options) && !lineDisabled(line, "DL004") && !ZONE_PATTERN.test(normalizedLine)) {
      addRegexIssues({ issues, regex: TIME_PATTERN, line, normalizedLine, lineNumber, file, rule: "DL004", matchGroup: 1 });
    }

    if (hasTime && enabled("DL005", options) && !lineDisabled(line, "DL005")) {
      addRegexIssues({ issues, regex: AMBIGUOUS_ZONE_PATTERN, line, normalizedLine, lineNumber, file, rule: "DL005" });
    }

    if (hasContext && enabled("DL006", options) && !lineDisabled(line, "DL006") && !/\b\d{4}\b/u.test(normalizedLine)) {
      addRegexIssues({ issues, regex: MONTH_PATTERN, line, normalizedLine, lineNumber, file, rule: "DL006" });
    }
  }

  const deduplicated = [...new Map(issues.map((item) => [`${item.rule}:${item.line}:${item.column}:${item.match}`, item])).values()];
  return {
    file,
    issues: deduplicated,
    lines: lines.length,
    characters: text.length
  };
}

export function buildReport(results) {
  const issues = results.flatMap((result) => result.issues);
  const byRule = Object.fromEntries(Object.keys(RULES).map((rule) => [rule, issues.filter((item) => item.rule === rule).length]));
  return {
    schema: REPORT_SCHEMA,
    verdict: issues.length > 0 ? "review-required" : "clear",
    summary: {
      files: results.length,
      issues: issues.length,
      byRule
    },
    issues
  };
}

export function formatText(report) {
  const lines = [`DeadlineLint: ${report.verdict}`, `${report.summary.files} file(s), ${report.summary.issues} issue(s).`];
  for (const item of report.issues) {
    lines.push("", `${item.file}:${item.line}:${item.column} ${item.rule} ${item.title}`, item.message, `Suggestion: ${item.suggestion}`);
  }
  return `${lines.join("\n")}\n`;
}

function githubPropertyEscape(value) {
  return String(value).replaceAll("%", "%25").replaceAll("\r", "%0D").replaceAll("\n", "%0A").replaceAll(":", "%3A").replaceAll(",", "%2C");
}

function githubMessageEscape(value) {
  return String(value).replaceAll("%", "%25").replaceAll("\r", "%0D").replaceAll("\n", "%0A");
}

export function formatGitHub(report) {
  const lines = report.issues.map((item) => `::warning file=${githubPropertyEscape(item.file)},line=${item.line},col=${item.column},title=${githubPropertyEscape(`${item.rule}: ${item.title}`)}::${githubMessageEscape(`${item.message} ${item.suggestion}`)}`);
  lines.push(`DeadlineLint: ${report.summary.issues} issue(s) in ${report.summary.files} file(s).`);
  return `${lines.join("\n")}\n`;
}
