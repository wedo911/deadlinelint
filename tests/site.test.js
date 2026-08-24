import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { projectRoot } from "./helpers.js";

const html = fs.readFileSync(path.join(projectRoot, "index.html"), "utf8");
const app = fs.readFileSync(path.join(projectRoot, "src/app.js"), "utf8");
const css = fs.readFileSync(path.join(projectRoot, "styles.css"), "utf8");

test("site has strict privacy controls and no outbound application calls", () => {
  assert.match(html, /connect-src 'none'/);
  assert.doesNotMatch(app, /fetch\s*\(|XMLHttpRequest|localStorage|sessionStorage|indexedDB/);
  assert.doesNotMatch(app, /innerHTML|insertAdjacentHTML|document\.write/);
});

test("site uses semantic labels and live results", () => {
  assert.match(html, /<label for="source-text">/);
  assert.match(html, /role="status" aria-live="polite"/);
  assert.match(html, /<fieldset>/);
  assert.match(html, /class="skip-link"/);
  assert.match(html, /<noscript>/);
});

test("responsive and focus styles are present", () => {
  assert.match(css, /:focus-visible/);
  assert.match(css, /@media \(max-width: 520px\)/);
  assert.match(css, /min-height: 44px/);
  assert.match(css, /prefers-reduced-motion/);
});
