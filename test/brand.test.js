// ABOUTME: Tests for the Crystal Hot Sauce partner copy: dash verdicts, menu line, and captions.
// ABOUTME: Captions share the one-line caption slot, so they keep its 27-character limit.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { dashVerdict, menuDashLine, crystalCaption, CRYSTAL } from '../src/brand.js';

test('the dash verdict grows with a heavier hand', () => {
  assert.match(dashVerdict(1), /polite/);
  assert.match(dashVerdict(3), /just right/i);
  assert.match(dashVerdict(12), /Cult of Crystal/);
});

test('the menu line counts dashes in plain English', () => {
  assert.equal(menuDashLine(1), '1 dash of Crystal across the menu.');
  assert.equal(menuDashLine(7), '7 dashes of Crystal across the menu.');
  assert.match(menuDashLine(0), /not a drop/i);
});

test('every Crystal caption fits the one-line caption (27 characters)', () => {
  for (const burnt of [false, true]) {
    for (let n = 0; n < 12; n++) {
      const text = crystalCaption(n, burnt);
      assert.ok(text.length <= 27, `"${text}" is ${text.length} characters`);
    }
  }
});

test('Crystal links point at crystalhotsauce.com', () => {
  for (const key of ['site', 'shop', 'recipes']) assert.match(CRYSTAL[key], /^https:\/\/crystalhotsauce\.com\//);
});
