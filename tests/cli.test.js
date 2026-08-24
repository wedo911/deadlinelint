import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import { runCli, tempDirectory, write } from "./helpers.js";

test("CLI returns 1 with machine-readable findings", () => {
  const root = tempDirectory();
  write(root, "notice.md", "Applications close 03/04/2026 at 5:00 PM.");
  const result = runCli(["notice.md", "--format", "json"], root);
  assert.equal(result.status, 1, result.stderr);
  assert.equal(JSON.parse(result.stdout).verdict, "review-required");
  fs.rmSync(root, { recursive: true, force: true });
});

test("CLI returns 0 for clear text", () => {
  const root = tempDirectory();
  write(root, "notice.md", "Applications close April 3, 2026 at 17:00 UTC+03:00.");
  const result = runCli(["notice.md"], root);
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /clear/);
  fs.rmSync(root, { recursive: true, force: true });
});

test("CLI auto-loads config and supports no-fail", () => {
  const root = tempDirectory();
  write(root, "notice.md", "Apply tomorrow.");
  write(root, ".deadlinelintrc.json", JSON.stringify({ rules: { DL003: false } }));
  assert.equal(runCli(["notice.md"], root).status, 0);
  write(root, ".deadlinelintrc.json", "{}");
  const advisory = runCli(["notice.md", "--no-fail"], root);
  assert.equal(advisory.status, 0);
  assert.match(advisory.stdout, /DL003/);
  fs.rmSync(root, { recursive: true, force: true });
});

test("CLI writes output files", () => {
  const root = tempDirectory();
  write(root, "notice.md", "Clear date: 2026-04-03.");
  const result = runCli(["notice.md", "--format", "json", "--output", "report.json"], root);
  assert.equal(result.status, 0, result.stderr);
  assert.equal(JSON.parse(fs.readFileSync(`${root}/report.json`, "utf8")).schema, "deadlinelint.report.v1");
  fs.rmSync(root, { recursive: true, force: true });
});

test("CLI reports usage and operational errors as exit 2", () => {
  assert.equal(runCli(["--format", "xml"], tempDirectory()).status, 2);
  assert.equal(runCli(["missing.md"], tempDirectory()).status, 2);
});

test("CLI prints help and version", () => {
  assert.match(runCli(["--help"], tempDirectory()).stdout, /Exit codes/);
  assert.match(runCli(["--version"], tempDirectory()).stdout, /^0\.1\.0/);
});
