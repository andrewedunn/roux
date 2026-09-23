// ABOUTME: Tests for scoring a finished roux against its target: perceptual score, direction, and penalties.
// ABOUTME: Uses real stage colors so "one stage off" means what a player would see.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { scoreDish } from '../src/score.js';
import { STAGES } from '../src/roux.js';

const at = (name) => STAGES.find((s) => s.name === name).at;

const finished = (browning, extra = {}) => ({
  status: 'done',
  burnReason: null,
  browning,
  specks: 0,
  rateAtDrop: 0.03,
  ...extra,
});

test('an exact match scores 100 and is spot on', () => {
  const r = scoreDish(at('Copper penny'), finished(at('Copper penny')));
  assert.equal(r.score, 100);
  assert.equal(r.direction, 'spot-on');
});

test('one dark stage off scores in the 50s or 60s', () => {
  const r = scoreDish(at('Milk chocolate'), finished(at('Brick')));
  assert.ok(r.score >= 50 && r.score < 70, `scored ${r.score}`);
});

test('score falls as the roux drifts further from the target', () => {
  const target = at('Peanut butter');
  let prev = 101;
  for (let off = 0; off <= 0.3; off += 0.02) {
    const { score } = scoreDish(target, finished(target + off));
    assert.ok(score <= prev, `score rose at offset ${off}`);
    prev = score;
  }
});

test('too dark says so and estimates how much sooner to pull it', () => {
  const target = at('Copper penny');
  const r = scoreDish(target, finished(target + 0.06, { rateAtDrop: 0.03 }));
  assert.equal(r.direction, 'dark');
  assert.ok(Math.abs(r.secondsOff - 2) < 0.05, `secondsOff ${r.secondsOff}`);
});

test('too light says so', () => {
  const target = at('Copper penny');
  assert.equal(scoreDish(target, finished(target - 0.06)).direction, 'light');
});

test('each whole speck costs three points', () => {
  const target = at('Copper penny');
  const clean = scoreDish(target, finished(target)).score;
  const specked = scoreDish(target, finished(target, { specks: 2.7 }));
  assert.equal(specked.score, clean - 6);
  assert.equal(specked.speckPenalty, 6);
});

test('a burnt roux scores zero', () => {
  const r = scoreDish(at('Black'), finished(1.02, { status: 'burnt', burnReason: 'overcooked' }));
  assert.equal(r.score, 0);
  assert.equal(r.burnt, true);
});

test('a scorched roux says it was scorched', () => {
  const r = scoreDish(at('Brick'), finished(0.7, { status: 'burnt', burnReason: 'scorched', specks: 10 }));
  assert.equal(r.score, 0);
  assert.match(r.verdict, /scorch/i);
});

test('score never goes below zero', () => {
  const r = scoreDish(at('Blond'), finished(at('Black'), { specks: 9 }));
  assert.equal(r.score, 0);
});
