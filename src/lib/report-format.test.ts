import { test } from "node:test";
import assert from "node:assert/strict";

import { REPORT_FORMAT_HEADER, formatReportFormat, prefixReportFormat } from "./report-format";

test("the report format rules cover natural communication, dynamic slides, images, and markdown", () => {
  const rules = formatReportFormat();
  assert.ok(rules.startsWith(REPORT_FORMAT_HEADER));
  // Must instruct natural communication, dynamic slide reporting, images, and markdown
  assert.match(rules, /동료/);
  assert.match(rules, /슬라이드/);
  assert.match(rules, /!\[설명\]\(URL\)/);
  assert.match(rules, /마크다운/);
});

test("rules are made of single-line entries only — the prefix doesn't push the script back", () => {
  const lines = formatReportFormat().split("\n");
  assert.ok(lines.length <= 7, `너무 길다: ${lines.length}줄`);
  for (const line of lines.slice(1)) assert.match(line, /^- /);
});

test("prefixing puts the rules first and the original script after", () => {
  const out = prefixReportFormat("노아: 보고서 정리해 줘");
  assert.ok(out.startsWith(REPORT_FORMAT_HEADER));
  assert.ok(out.endsWith("노아: 보고서 정리해 줘"));
  assert.ok(out.includes("\n\n노아:"));
});

test("the rule isn't prefixed onto an empty script — returned as-is when there's no script", () => {
  assert.equal(prefixReportFormat(""), "");
});
