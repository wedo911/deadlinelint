import assert from "node:assert/strict";
import test from "node:test";
import { buildReport, formatGitHub, formatText, lintText, MAX_TEXT_LENGTH, normalizeDigits, REPORT_SCHEMA, RULES } from "../src/analyzer.js";

test("flags an ambiguous numeric date without leading whitespace", () => {
  const result = lintText("Apply by 03/04/2026.", { file: "notice.md" });
  assert.equal(result.issues.length, 1);
  assert.equal(result.issues[0].rule, "DL001");
  assert.equal(result.issues[0].match, "03/04/2026");
  assert.equal(result.issues[0].column, 10);
});

test("does not flag unambiguous or ISO dates", () => {
  const result = lintText("Apply by 31/12/2026 or 2026-12-31.");
  assert.equal(result.issues.length, 0);
});

test("recognizes Arabic-Indic and Eastern Arabic digits", () => {
  assert.equal(normalizeDigits("٠٣/۰۴/٢٠٢٦"), "03/04/2026");
  const result = lintText("آخر موعد ٠٣/٠٤/٢٠٢٦.");
  assert.equal(result.issues[0].match, "٠٣/٠٤/٢٠٢٦");
});

test("flags two-digit years", () => {
  const issues = lintText("Dates: 31/12/26 and 01/02/26.").issues;
  assert.equal(issues.filter((item) => item.rule === "DL002").length, 2);
  assert.equal(issues.filter((item) => item.rule === "DL001").length, 0);
});

test("finds English and Arabic relative dates", () => {
  const issues = lintText("Submit tomorrow. الموعد النهائي غدا. الاجتماع الأسبوع القادم.").issues;
  assert.equal(issues.filter((item) => item.rule === "DL003").length, 3);
});

test("flags contextual times without zones", () => {
  const issues = lintText("Registration closes at 5:30 PM.\nآخر موعد الساعة ٥:٣٠ م.").issues;
  assert.equal(issues.filter((item) => item.rule === "DL004").length, 2);
});

test("accepts UTC offsets and IANA zones", () => {
  const text = "Registration closes at 17:30 UTC+03:00.\nMeeting starts at 9:00 AM Europe/Paris.";
  assert.equal(lintText(text).issues.length, 0);
});

test("reports an ambiguous zone without also calling it missing", () => {
  const issues = lintText("The webinar starts at 17:00 CST.").issues;
  assert.deepEqual(issues.map((item) => item.rule), ["DL005"]);
});

test("does not treat an abbreviation as a zone without a clock time", () => {
  assert.equal(lintText("CST is an internal project acronym.").issues.length, 0);
});

test("flags English and Arabic month dates without a year in deadline context", () => {
  const issues = lintText("Applications close March 4.\nآخر موعد 4 مارس.").issues;
  assert.equal(issues.filter((item) => item.rule === "DL006").length, 2);
});

test("skips fenced code unless requested", () => {
  const text = "```text\nDeadline 03/04/2026 at 5:00 PM\n```";
  assert.equal(lintText(text).issues.length, 0);
  assert.ok(lintText(text, { scanCodeBlocks: true }).issues.length > 0);
});

test("supports line-level suppression", () => {
  assert.equal(lintText("Deadline 03/04/2026. <!-- deadlinelint-disable-line DL001 -->").issues.length, 0);
  assert.equal(lintText("Deadline tomorrow. <!-- deadlinelint-disable-line -->").issues.length, 0);
});

test("supports disabled rules", () => {
  assert.equal(lintText("Tomorrow", { disabledRules: ["DL003"] }).issues.length, 0);
});

test("rejects oversized text", () => {
  assert.throws(() => lintText("x".repeat(MAX_TEXT_LENGTH + 1)), /exceeds/);
});

test("builds stable reports and formatters", () => {
  const report = buildReport([lintText("Deadline 03/04/2026.", { file: "a,b.md" })]);
  assert.equal(report.schema, REPORT_SCHEMA);
  assert.equal(report.verdict, "review-required");
  assert.equal(Object.keys(report.summary.byRule).length, Object.keys(RULES).length);
  assert.match(formatText(report), /a,b\.md:1/);
  assert.match(formatGitHub(report), /file=a%2Cb\.md,line=1/);
  assert.doesNotMatch(formatGitHub(report).split("::").at(-1), /%2C|%3A/);
});
