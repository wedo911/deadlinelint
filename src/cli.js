#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { formatGitHub, formatText } from "./analyzer.js";
import { parseConfig, scanPaths } from "./scanner.js";

export const VERSION = "0.1.0";

const HELP = `DeadlineLint ${VERSION}

Find ambiguous dates and underspecified deadlines in public-facing text.

Usage:
  deadlinelint [paths...] [options]

Options:
  --config <path>     Config file (default: .deadlinelintrc.json when present)
  --format <format>   text, json, or github (default: text)
  --output <path>     Also write the report to a file
  --no-fail           Exit 0 while preserving findings
  --version           Print version
  --help              Print help

Exit codes: 0 clear, 1 review required, 2 usage or operational error.
`;

function valueAfter(args, index, option) {
  const value = args[index + 1];
  if (!value || value.startsWith("--")) throw new Error(`${option} requires a value.`);
  return value;
}

export function parseArgs(args) {
  const options = { paths: [], format: "text", noFail: false };
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === "--help") options.help = true;
    else if (arg === "--version") options.version = true;
    else if (arg === "--no-fail") options.noFail = true;
    else if (["--config", "--format", "--output"].includes(arg)) {
      options[arg.slice(2)] = valueAfter(args, index, arg);
      index += 1;
    } else if (arg.startsWith("--")) throw new Error(`Unknown option: ${arg}`);
    else options.paths.push(arg);
  }
  if (!["text", "json", "github"].includes(options.format)) throw new Error("--format must be text, json, or github.");
  return options;
}

function render(report, format) {
  if (format === "json") return `${JSON.stringify(report, null, 2)}\n`;
  if (format === "github") return formatGitHub(report);
  return formatText(report);
}

export function run(args = process.argv.slice(2), cwd = process.cwd()) {
  const options = parseArgs(args);
  if (options.help) {
    process.stdout.write(HELP);
    return 0;
  }
  if (options.version) {
    process.stdout.write(`${VERSION}\n`);
    return 0;
  }
  const defaultConfig = path.join(cwd, ".deadlinelintrc.json");
  const configPath = options.config ? path.resolve(cwd, options.config) : defaultConfig;
  const configText = fs.existsSync(configPath) ? fs.readFileSync(configPath, "utf8") : "";
  const report = scanPaths(options.paths, parseConfig(configText), cwd);
  const output = render(report, options.format);
  process.stdout.write(output);
  if (options.output) fs.writeFileSync(path.resolve(cwd, options.output), output, { encoding: "utf8", flag: "w" });
  return report.verdict === "review-required" && !options.noFail ? 1 : 0;
}

const invokedPath = process.argv[1] ? path.resolve(process.argv[1]) : "";
const modulePath = path.resolve(new URL(import.meta.url).pathname.replace(/^\/(.:)/, "$1"));
if (invokedPath === modulePath) {
  try {
    process.exitCode = run();
  } catch (error) {
    process.stderr.write(`DeadlineLint error: ${error.message}\n`);
    process.exitCode = 2;
  }
}
