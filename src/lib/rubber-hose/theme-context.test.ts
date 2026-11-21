import test from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_RUBBER_HOSE_CONFIG, type RubberHoseConfig } from "./theme-context";

test("DEFAULT_RUBBER_HOSE_CONFIG defaults to disabled with all sections enabled when turned on", () => {
  assert.equal(DEFAULT_RUBBER_HOSE_CONFIG.enabled, false);
  assert.equal(DEFAULT_RUBBER_HOSE_CONFIG.all, true);
  assert.equal(DEFAULT_RUBBER_HOSE_CONFIG.header, true);
  assert.equal(DEFAULT_RUBBER_HOSE_CONFIG.chat, true);
  assert.equal(DEFAULT_RUBBER_HOSE_CONFIG.modals, true);
  assert.equal(DEFAULT_RUBBER_HOSE_CONFIG.cards, true);
  assert.equal(DEFAULT_RUBBER_HOSE_CONFIG.buttons, true);
  assert.equal(DEFAULT_RUBBER_HOSE_CONFIG.font, true);
  assert.equal(DEFAULT_RUBBER_HOSE_CONFIG.filmEffect, true);
});

test("Custom section configuration toggles sections independently", () => {
  const customConfig: RubberHoseConfig = {
    enabled: true,
    all: false,
    header: false,
    chat: true,
    modals: false,
    cards: false,
    buttons: true,
    font: true,
    filmEffect: false,
  };

  assert.equal(customConfig.enabled, true);
  assert.equal(customConfig.all, false);
  assert.equal(customConfig.chat, true);
  assert.equal(customConfig.buttons, true);
  assert.equal(customConfig.header, false);
  assert.equal(customConfig.modals, false);
});
