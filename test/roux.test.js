// ABOUTME: Tests for the roux stage table: color along the browning scale, stage names, and smells.
// ABOUTME: Guards the design intents that roux only darkens and dark stages sit closer together.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { STAGES, BURNT_HEX, rouxColor, nearestStage, smellAt } from '../src/roux.js';
import { hexToOklab } from '../src/color.js';

test('rouxColor returns each stage hex at that stage position', () => {
  for (const stage of STAGES) {
    assert.equal(rouxColor(stage.at), stage.hex, stage.name);
  }
});

test('roux only gets darker as browning increases', () => {
  let prevL = Infinity;
  for (let i = 0; i <= 100; i++) {
    const L = hexToOklab(rouxColor(i / 100)).L;
    assert.ok(L <= prevL + 1e-9, `lighter at browning ${i / 100}`);
    prevL = L;
  }
});

test('past full browning the roux turns burnt', () => {
  assert.equal(rouxColor(1.3), BURNT_HEX);
});

test('dark stages sit closer together than light ones', () => {
  const gap = (a, b) => STAGES.find((s) => s.name === b).at - STAGES.find((s) => s.name === a).at;
  assert.ok(gap('Milk chocolate', 'Brick') < gap('Peanut butter', 'Copper penny'));
  assert.ok(gap('Dark chocolate', 'Black') < gap('Milk chocolate', 'Brick'));
});

test('nearestStage names the closest stage', () => {
  const pb = STAGES.find((s) => s.name === 'Peanut butter');
  assert.equal(nearestStage(pb.at + 0.01).name, 'Peanut butter');
  assert.equal(nearestStage(0).name, 'White');
});

test('smell moves from raw flour to a warning as it darkens', () => {
  assert.match(smellAt(0), /raw flour/i);
  assert.match(smellAt(0.3), /toast/i);
  assert.match(smellAt(0.97), /careful/i);
});

test('every smell caption fits the one-line caption (27 characters)', () => {
  for (let b = 0; b <= 1; b += 0.01) {
    const text = smellAt(b);
    assert.ok(text.length <= 27, `"${text}" is ${text.length} characters`);
  }
});

test('every stage past white has dishes, and every dish name fits the ticket (26 characters)', () => {
  for (const stage of STAGES.slice(1)) {
    assert.ok(stage.dishes.length >= 1, `${stage.name} has no dishes`);
    for (const dish of stage.dishes) assert.ok(dish.length <= 26, `"${dish}" is ${dish.length} characters`);
  }
});

test('the menu has a real range of dishes to draw from', () => {
  const all = STAGES.flatMap((s) => s.dishes);
  assert.ok(all.length >= 25, `only ${all.length} dishes`);
  assert.equal(new Set(all).size, all.length, 'no dish should appear twice');
});
