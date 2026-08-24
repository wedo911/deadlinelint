import { buildReport, lintText, RULES } from "./analyzer.js";

const source = document.querySelector("#source-text");
const analyzeButton = document.querySelector("#analyze-button");
const sampleButton = document.querySelector("#sample-button");
const clearButton = document.querySelector("#clear-button");
const downloadButton = document.querySelector("#download-button");
const resultStatus = document.querySelector("#result-status");
const resultList = document.querySelector("#result-list");
const ruleOptions = document.querySelector("#rule-options");

const SAMPLE = `Applications close 03/04/2026 at 5:00 PM.
The webinar starts tomorrow at 17:00 CST.
آخر موعد للتقديم ٠٣/٠٤/٢٠٢٦ الساعة ٥:٠٠ م.

Clear alternative:
Applications close April 3, 2026 at 17:00 UTC+03:00.`;

let latestReport = null;

function element(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

for (const [rule, metadata] of Object.entries(RULES)) {
  const label = element("label", "rule-option");
  const checkbox = document.createElement("input");
  checkbox.type = "checkbox";
  checkbox.checked = true;
  checkbox.value = rule;
  checkbox.dataset.rule = rule;
  const text = element("span", "", `${rule} · ${metadata.title}`);
  label.append(checkbox, text);
  ruleOptions.append(label);
}

function disabledRules() {
  return [...ruleOptions.querySelectorAll("input:not(:checked)")].map((input) => input.value);
}

function setStatus(kind, icon, title, detail) {
  resultStatus.className = `result-status ${kind}`;
  resultStatus.replaceChildren();
  const iconNode = element("span", "status-icon", icon);
  iconNode.setAttribute("aria-hidden", "true");
  const copy = document.createElement("div");
  copy.append(element("strong", "", title), element("span", "", detail));
  resultStatus.append(iconNode, copy);
}

function renderIssue(item) {
  const card = element("li", "issue-card");
  const meta = element("div", "issue-meta");
  meta.append(element("span", "rule-pill", item.rule), element("span", "location", `Line ${item.line}, column ${item.column}`));
  const title = element("h3", "", item.title);
  const excerpt = element("p", "excerpt", item.excerpt);
  excerpt.dir = "auto";
  const message = element("p", "", item.message);
  const suggestion = element("p", "suggestion");
  suggestion.append(element("strong", "", "Try: "), document.createTextNode(item.suggestion));
  card.append(meta, title, excerpt, message, suggestion);
  return card;
}

function render(report) {
  latestReport = report;
  downloadButton.disabled = false;
  resultList.replaceChildren();
  if (report.summary.issues === 0) {
    setStatus("clear", "✓", "No ambiguity found", "The enabled rules found no review items.");
    return;
  }
  setStatus("review", "!", `${report.summary.issues} review item${report.summary.issues === 1 ? "" : "s"}`, "Clarify the highlighted wording before publishing.");
  const list = element("ol", "issue-list");
  for (const item of report.issues) list.append(renderIssue(item));
  resultList.append(list);
}

function analyze() {
  try {
    const result = lintText(source.value, { file: "pasted-text", disabledRules: disabledRules() });
    render(buildReport([result]));
  } catch (error) {
    latestReport = null;
    downloadButton.disabled = true;
    resultList.replaceChildren();
    setStatus("error", "×", "Could not check this text", error.message);
  }
}

analyzeButton.addEventListener("click", analyze);
sampleButton.addEventListener("click", () => {
  source.value = SAMPLE;
  source.focus();
  analyze();
});
clearButton.addEventListener("click", () => {
  source.value = "";
  latestReport = null;
  downloadButton.disabled = true;
  resultList.replaceChildren();
  setStatus("idle", "—", "Ready when you are", "Run the check to see precise lines and suggested fixes.");
  source.focus();
});
downloadButton.addEventListener("click", () => {
  if (!latestReport) return;
  const blob = new Blob([`${JSON.stringify(latestReport, null, 2)}\n`], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "deadlinelint-report.json";
  link.click();
  URL.revokeObjectURL(url);
});
