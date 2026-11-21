import test from "node:test";
import assert from "node:assert/strict";
import { OFFICE_LOOKS } from "./office-looks";
import {
  lookCategoryLabel,
  lookLabel,
  lookSearchText,
  looksMissingLabels,
} from "./office-look-labels";

const jun = OFFICE_LOOKS.find((l) => l.id === "office-jun")!;

test("every look has ja, zh, and vi labels", () => {
  assert.deepEqual(looksMissingLabels(), []);
});

test("lookLabel keeps ko and en from the look and falls back to en", () => {
  assert.deepEqual(lookLabel(jun, "ko"), { name: jun.name, subtitle: jun.subtitle });
  assert.deepEqual(lookLabel(jun, "en"), { name: jun.nameEn, subtitle: jun.subtitleEn });
  assert.deepEqual(lookLabel(jun, "fr"), { name: jun.nameEn, subtitle: jun.subtitleEn });
  assert.equal(lookLabel(jun, "ja").name, "ソジュン");
  assert.equal(lookLabel(jun, "vi").name, "Jun");
});

test("ja, zh, and vi labels keep the 'role · outfit' shape and contain no Hangul", () => {
  for (const look of OFFICE_LOOKS) {
    for (const locale of ["ja", "zh", "vi"]) {
      const { name, subtitle } = lookLabel(look, locale);
      assert.doesNotMatch(`${name} ${subtitle}`, /[가-힣]/, look.id);
      assert.equal(subtitle.split(" · ").length, look.subtitle.split(" · ").length, look.id);
    }
  }
  assert.equal(lookCategoryLabel("classic", "zh"), "经典西装");
  assert.equal(lookCategoryLabel("classic", "vi"), "Âu phục cổ điển");
});

test("search text covers all supported languages", () => {
  const text = lookSearchText(jun);
  for (const needle of ["서준", "jun", "ソジュン", "藏青", "xanh navy"])
    assert.ok(text.includes(needle), needle);
});
