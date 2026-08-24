import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { projectRoot } from "./helpers.js";

function read(file) {
  return fs.readFileSync(path.join(projectRoot, file), "utf8");
}

test("project is MIT licensed and documents live, CLI, and Action use", () => {
  assert.match(read("LICENSE"), /MIT License/);
  assert.equal(JSON.parse(read("package.json")).license, "MIT");
  assert.match(read("README.md"), /wedo911\/deadlinelint@v0/);
  assert.match(read("README.md"), /wedo911\.github\.io\/deadlinelint/);
  assert.match(read("README.md"), /deadlinelint\.report\.v1/);
});

test("Action invokes local code without installs or network commands", () => {
  const action = read("action.yml");
  assert.match(action, /using: composite/);
  assert.match(action, /node "\$GITHUB_ACTION_PATH\/src\/cli\.js"/);
  assert.doesNotMatch(action, /curl|wget|npm install|pull_request_target/);
});

test("CI and Pages test before publishing", () => {
  const ci = read(".github/workflows/ci.yml");
  const pages = read(".github/workflows/pages.yml");
  assert.match(ci, /node: \[20, 22, 24\]/);
  assert.match(ci, /uses: \.\//);
  assert.match(ci, /permissions:\s+contents: read/);
  assert.match(pages, /npm test/);
  assert.match(pages, /npm run check/);
  assert.match(pages, /actions\/deploy-pages@v4/);
});
