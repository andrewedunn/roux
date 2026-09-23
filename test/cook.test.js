// ABOUTME: Tests for the cooking simulation: browning speed, sticking and specks, carryover, and burning.
// ABOUTME: Each test drives the real sim with scripted stir input and checks the behavior a player feels.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createCook, stepCook, dropTrinity, SCORCH_SPECKS } from '../src/cook.js';

const FPS = 60;
const STIRRING = { stir: 1 };
const IDLE = { stir: 0 };

// Runs the sim until `until(state, t)` is true or `maxSeconds` pass. `input` may be a function of time.
function run(state, input, until, maxSeconds = 300, fps = FPS) {
  const dt = 1 / fps;
  let t = 0;
  while (t < maxSeconds && !until(state, t)) {
    const inp = typeof input === 'function' ? input(t) : input;
    state = stepCook(state, inp, dt);
    t += dt;
  }
  return { state, t };
}

const timeToReach = (browning) => run(createCook(), STIRRING, (s) => s.browning >= browning).t;

test('steady stirring reaches milk chocolate in 25-40 seconds', () => {
  const t = timeToReach(0.67);
  assert.ok(t > 25 && t < 40, `took ${t.toFixed(1)}s`);
});

test('browning starts slow while the flour cooks out', () => {
  const first = timeToReach(0.1);
  const middleTenth = timeToReach(0.6) - timeToReach(0.5);
  assert.ok(first > middleTenth * 1.3, `first 10%: ${first}s, 0.5->0.6: ${middleTenth}s`);
});

test('steady stirring keeps the bottom from catching', () => {
  const { state } = run(createCook(), STIRRING, (s) => s.browning >= 0.67);
  assert.equal(state.specks, 0);
});

test('short stir breaks are forgiven', () => {
  const stirThreeOfFive = (t) => ({ stir: t % 5 < 3 ? 1 : 0 });
  const { state } = run(createCook(), stirThreeOfFive, (s) => s.browning >= 0.67);
  assert.equal(state.specks, 0);
});

test('not stirring lays down specks within ten seconds', () => {
  const warm = run(createCook(), STIRRING, (s) => s.browning >= 0.3).state;
  const { state } = run(warm, IDLE, (_, t) => t >= 10);
  assert.ok(state.specks > 0, 'expected specks');
});

test('a dark roux catches faster than a light one', () => {
  const catchTime = (browning) => {
    const warm = run(createCook(), STIRRING, (s) => s.browning >= browning).state;
    return run(warm, IDLE, (s) => s.specks > 0, 60).t;
  };
  assert.ok(catchTime(0.8) < catchTime(0.2));
});

test('enough specks scorches the roux', () => {
  const warm = run(createCook(), STIRRING, (s) => s.browning >= 0.4).state;
  const { state } = run(warm, IDLE, (s) => s.status === 'burnt', 60);
  assert.equal(state.status, 'burnt');
  assert.equal(state.burnReason, 'scorched');
  assert.ok(state.specks >= SCORCH_SPECKS);
});

test('cooking past black burns the roux', () => {
  const { state } = run(createCook(), STIRRING, (s) => s.status === 'burnt');
  assert.equal(state.status, 'burnt');
  assert.equal(state.burnReason, 'overcooked');
});

test('after the trinity drops the roux keeps darkening, then settles', () => {
  let s = run(createCook(), STIRRING, (st) => st.browning >= 0.5).state;
  s = dropTrinity(s);
  const atDrop = s.browning;
  assert.equal(s.status, 'cooling');
  const { state, t } = run(s, IDLE, (st) => st.status === 'done', 20);
  assert.equal(state.status, 'done');
  assert.ok(state.browning > atDrop, 'expected carryover browning');
  assert.ok(t < 4.5, `took ${t.toFixed(1)}s to settle`);
  assert.equal(state.specks, 0, 'the trinity should stop sticking');
});

test('carryover is big enough to matter: a sizable fraction of a dark stage', () => {
  let s = run(createCook(), STIRRING, (st) => st.browning >= 0.8).state;
  s = dropTrinity(s);
  const atDrop = s.browning;
  const carryover = run(s, IDLE, (st) => st.status === 'done', 20).state.browning - atDrop;
  assert.ok(carryover > 0.03 && carryover < 0.06, `carryover ${carryover}`);
});

test('dropping the trinity records how fast it was browning', () => {
  let s = run(createCook(), STIRRING, (st) => st.browning >= 0.5).state;
  s = dropTrinity(s);
  assert.ok(s.rateAtDrop > 0);
  assert.equal(s.browningAtDrop, s.browning);
});

test('the sim gives the same result at 30fps and 120fps', () => {
  const at = (fps) => run(createCook(), STIRRING, (_, t) => t >= 20, 300, fps).state.browning;
  const slow = at(30);
  const fast = at(120);
  assert.ok(Math.abs(slow - fast) < 0.01, `30fps ${slow} vs 120fps ${fast}`);
});
