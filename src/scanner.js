import fs from "node:fs";
import path from "node:path";
import { buildReport, lintText, MAX_TEXT_LENGTH, RULES } from "./analyzer.js";

export const DEFAULT_CONFIG = Object.freeze({
  extensions: [".md", ".mdx", ".txt", ".html", ".htm", ".rst", ".adoc"],
  ignore: ["**/.git/**", "**/node_modules/**", "**/dist/**", "**/build/**", "**/coverage/**", "**/vendor/**"],
  rules: Object.fromEntries(Object.keys(RULES).map((rule) => [rule, true])),
  scanCodeBlocks: false
});

const MAX_CONFIG_BYTES = 256_000;
const MAX_FILES = 5_000;

function normalizePath(value) {
  return value.replaceAll("\\", "/");
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function globRegex(pattern) {
  let output = "^";
  for (let index = 0; index < pattern.length; index += 1) {
    const character = pattern[index];
    if (character === "*" && pattern[index + 1] === "*") {
      output += ".*";
      index += 1;
    } else if (character === "*") output += "[^/]*";
    else if (character === "?") output += "[^/]";
    else output += escapeRegex(character);
  }
  return new RegExp(`${output}$`, "iu");
}

function stringArray(value, name, fallback) {
  if (value === undefined) return [...fallback];
  if (!Array.isArray(value) || value.some((item) => typeof item !== "string" || !item.trim())) {
    throw new Error(`Configuration field "${name}" must be an array of non-empty strings.`);
  }
  return value.map((item) => item.trim());
}

export function parseConfig(text = "") {
  if (!text.trim()) return structuredClone(DEFAULT_CONFIG);
  if (Buffer.byteLength(text, "utf8") > MAX_CONFIG_BYTES) throw new Error(`Configuration exceeds ${MAX_CONFIG_BYTES} bytes.`);
  let raw;
  try {
    raw = JSON.parse(text);
  } catch (error) {
    throw new Error(`Invalid JSON configuration: ${error.message}`);
  }
  if (!raw || Array.isArray(raw) || typeof raw !== "object") throw new Error("Configuration must be a JSON object.");
  const extensions = stringArray(raw.extensions, "extensions", DEFAULT_CONFIG.extensions).map((item) => item.toLowerCase());
  if (extensions.some((item) => !/^\.[a-z0-9]+$/.test(item))) throw new Error("Configuration contains an invalid file extension.");
  const ignore = stringArray(raw.ignore, "ignore", DEFAULT_CONFIG.ignore).map(normalizePath);
  const rules = { ...DEFAULT_CONFIG.rules };
  if (raw.rules !== undefined) {
    if (!raw.rules || Array.isArray(raw.rules) || typeof raw.rules !== "object") throw new Error('Configuration field "rules" must be an object.');
    for (const [rule, state] of Object.entries(raw.rules)) {
      if (!(rule in RULES)) throw new Error(`Unknown rule in configuration: ${rule}`);
      if (typeof state !== "boolean") throw new Error(`Configuration rule ${rule} must be true or false.`);
      rules[rule] = state;
    }
  }
  if (raw.scanCodeBlocks !== undefined && typeof raw.scanCodeBlocks !== "boolean") throw new Error('Configuration field "scanCodeBlocks" must be boolean.');
  return { extensions, ignore, rules, scanCodeBlocks: raw.scanCodeBlocks ?? false };
}

function ignored(relativePath, patterns) {
  const normalized = `/${normalizePath(relativePath)}`;
  return patterns.some((pattern) => globRegex(pattern.startsWith("**/") ? `**/${pattern.slice(3)}` : pattern).test(normalized) || globRegex(pattern).test(normalizePath(relativePath)));
}

export function collectFiles(inputs, config, cwd = process.cwd()) {
  const files = [];
  const roots = inputs.length > 0 ? inputs : ["."];

  function visit(target) {
    const absolute = path.resolve(cwd, target);
    if (!fs.existsSync(absolute)) throw new Error(`Path does not exist: ${target}`);
    const stat = fs.lstatSync(absolute);
    if (stat.isSymbolicLink()) return;
    const relative = normalizePath(path.relative(cwd, absolute) || path.basename(cwd));
    if (ignored(relative, config.ignore)) return;
    if (stat.isDirectory()) {
      for (const entry of fs.readdirSync(absolute).sort((a, b) => a.localeCompare(b))) visit(path.join(absolute, entry));
      return;
    }
    if (config.extensions.includes(path.extname(absolute).toLowerCase())) {
      files.push(absolute);
      if (files.length > MAX_FILES) throw new Error(`File count exceeds ${MAX_FILES}. Narrow the input paths.`);
    }
  }

  for (const root of roots) visit(root);
  return [...new Set(files)].sort((a, b) => a.localeCompare(b));
}

export function scanPaths(inputs, config, cwd = process.cwd()) {
  const disabledRules = Object.entries(config.rules).filter(([, state]) => !state).map(([rule]) => rule);
  const results = collectFiles(inputs, config, cwd).map((absolute) => {
    const stat = fs.statSync(absolute);
    if (stat.size > MAX_TEXT_LENGTH * 4) throw new Error(`File is too large to scan: ${absolute}`);
    const text = fs.readFileSync(absolute, "utf8");
    return lintText(text, {
      file: normalizePath(path.relative(cwd, absolute)),
      disabledRules,
      scanCodeBlocks: config.scanCodeBlocks
    });
  });
  return buildReport(results);
}
