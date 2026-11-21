import test from "node:test";
import assert from "node:assert/strict";

import { isSlideUrl, detectSlideLinks } from "./slide-links";

test("isSlideUrl accurately identifies slide URLs", () => {
  assert.equal(isSlideUrl("/slides/report-q3.html"), true);
  assert.equal(isSlideUrl("https://deskrpg.com/slides/demo.html"), true);
  assert.equal(isSlideUrl("file:///workspace/slide.html"), true);
  assert.equal(isSlideUrl("presentation_slide_deck.html"), true);
  assert.equal(isSlideUrl("/api/channels/123/artifacts/456"), false);
  assert.equal(isSlideUrl("https://example.com/about-us"), false);
  assert.equal(isSlideUrl(null), false);
  assert.equal(isSlideUrl(undefined), false);
});

test("detectSlideLinks extracts slide links from markdown and text", () => {
  const text = `
Dưới đây là báo cáo tiến độ:
- [Mở Slide Báo Cáo](/slides/progress-report.html)
- File đính kèm: file:///d:/project/slides/summary.html
Vui lòng tham khảo /slides/final-deck.html khi cần.
  `;
  const links = detectSlideLinks(text);
  assert.ok(links.includes("/slides/progress-report.html"));
  assert.ok(links.includes("file:///d:/project/slides/summary.html"));
  assert.ok(links.includes("/slides/final-deck.html"));
});
