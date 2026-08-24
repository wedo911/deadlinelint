import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import { collectFiles, DEFAULT_CONFIG, parseConfig, scanPaths } from "../src/scanner.js";
import { tempDirectory, write } from "./helpers.js";

test("empty configuration returns independent defaults", () => {
  const one = parseConfig();
  const two = parseConfig();
  one.ignore.push("extra/**");
  assert.equal(two.ignore.includes("extra/**"), false);
});

test("parses rule and extension overrides", () => {
  const config = parseConfig(JSON.stringify({ extensions: [".MD"], rules: { DL003: false }, scanCodeBlocks: true }));
  assert.deepEqual(config.extensions, [".md"]);
  assert.equal(config.rules.DL003, false);
  assert.equal(config.scanCodeBlocks, true);
});

test("rejects invalid configuration", () => {
  assert.throws(() => parseConfig("[]"), /JSON object/);
  assert.throws(() => parseConfig('{"extensions":["md"]}'), /invalid file extension/);
  assert.throws(() => parseConfig('{"rules":{"DL999":true}}'), /Unknown rule/);
  assert.throws(() => parseConfig('{"rules":{"DL001":"yes"}}'), /true or false/);
});

test("collects supported text while skipping ignored trees and symlinks", () => {
  const root = tempDirectory();
  write(root, "public/notice.md", "Deadline tomorrow.");
  write(root, "public/image.png", "not scanned");
  write(root, "node_modules/pkg/readme.md", "Deadline tomorrow.");
  const outside = write(root, "outside.md", "Deadline tomorrow.");
  try {
    fs.symlinkSync(outside, `${root}/linked.md`);
  } catch (error) {
    if (error.code !== "EPERM") throw error;
  }
  const files = collectFiles(["."], parseConfig(), root);
  assert.deepEqual(files.map((file) => file.replaceAll("\\", "/").replace(`${root.replaceAll("\\", "/")}/`, "")), ["outside.md", "public/notice.md"]);
  fs.rmSync(root, { recursive: true, force: true });
});

test("scans multiple files into one report", () => {
  const root = tempDirectory();
  write(root, "a.md", "Apply tomorrow.");
  write(root, "b.txt", "Registration closes 03/04/2026 at 5:00 PM.");
  const report = scanPaths(["a.md", "b.txt"], parseConfig(), root);
  assert.equal(report.summary.files, 2);
  assert.ok(report.summary.issues >= 3);
  assert.equal(report.issues[0].file, "a.md");
  fs.rmSync(root, { recursive: true, force: true });
});

test("disabled config rules affect scans", () => {
  const root = tempDirectory();
  write(root, "notice.md", "Apply tomorrow.");
  const config = structuredClone(DEFAULT_CONFIG);
  config.rules.DL003 = false;
  assert.equal(scanPaths(["notice.md"], config, root).summary.issues, 0);
  fs.rmSync(root, { recursive: true, force: true });
});

test("missing inputs fail loudly", () => {
  assert.throws(() => collectFiles(["missing.md"], parseConfig(), tempDirectory()), /does not exist/);
});
