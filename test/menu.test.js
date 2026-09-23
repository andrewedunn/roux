// ABOUTME: Tests for building a three-dish menu: one light, one medium, one dark target.
// ABOUTME: Menus come from a seed so the same seed always gives the same dishes.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createMenu } from '../src/menu.js';
import { STAGES } from '../src/roux.js';

test('a menu is three dishes from light to dark', () => {
  const menu = createMenu(42);
  assert.deepEqual(menu.map((d) => d.tier), ['light', 'medium', 'dark']);
  assert.ok(menu[0].target < menu[1].target && menu[1].target < menu[2].target);
});

test('the same seed gives the same menu', () => {
  assert.deepEqual(createMenu(7), createMenu(7));
});

test('each target sits close to its named stage and names a dish for it', () => {
  for (let seed = 0; seed < 50; seed++) {
    for (const dish of createMenu(seed)) {
      assert.ok(Math.abs(dish.target - dish.stage.at) <= 0.02, `${dish.stage.name} target ${dish.target}`);
      assert.ok(dish.stage.dishes.some((d) => d.name === dish.dish), `${dish.dish} not listed for ${dish.stage.name}`);
      assert.match(dish.source.url, /^https?:/);
    }
  }
});

test('targets never sit past black', () => {
  for (let seed = 0; seed < 200; seed++) {
    assert.ok(createMenu(seed)[2].target <= 0.97);
  }
});

test('over many menus every stage past white shows up', () => {
  const seen = new Set();
  for (let seed = 0; seed < 200; seed++) createMenu(seed).forEach((d) => seen.add(d.stage.name));
  assert.deepEqual([...seen].sort(), STAGES.slice(1).map((s) => s.name).sort());
});

test('every dish in a tier is equally likely, so thin stages like Black stay rare', () => {
  let black = 0;
  const runs = 2000;
  for (let seed = 0; seed < runs; seed++) if (createMenu(seed)[2].stage.name === 'Black') black += 1;
  const blackDishes = STAGES.find((s) => s.name === 'Black').dishes.length;
  const darkDishes = STAGES.filter((s) => ['Brick', 'Dark chocolate', 'Black'].includes(s.name)).reduce((n, s) => n + s.dishes.length, 0);
  const expected = blackDishes / darkDishes;
  assert.ok(Math.abs(black / runs - expected) < 0.04, `Black came up ${(100 * black) / runs}% vs ${(100 * expected).toFixed(0)}% expected`);
});
