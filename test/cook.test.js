// ABOUTME: Tests for the cooking simulation: browning speed, sticking and specks, carryover, and burning.
// ABOUTME: Each test drives the real sim with scripted heat/stir input and checks the behavior a player feels.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createCook, stepCook, dropTrinity, SCORCH_SPECKS } from '../src/cook.js';

const FPS = 60;

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

const timeToReach = (browning, input) =>
  run(createCook(), input, (s) => s.browning >= browning).t;

test('medium heat with steady stirring reaches milk chocolate in 25-40 seconds', () => {
  const t = timeToReach(0.67, { heat: 'med', stir: 1 });
  assert.ok(t > 25 && t < 40, `took ${t.toFixed(1)}s`);
});

test('hotter heat browns faster', () => {
  const low = timeToReach(0.5, { heat: 'low', stir: 1 });
  const med = timeToReach(0.5, { heat: 'med', stir: 1 });
  const high = timeToReach(0.5, { heat: 'high', stir: 1 });
  assert.ok(high < med && med < low, `low ${low} med ${med} high ${high}`);
  assert.ok(med / high > 1.4, 'high should be clearly faster than med');
});

test('browning starts slow while the flour cooks out', () => {
  const input = { heat: 'med', stir: 1 };
  const first = timeToReach(0.1, input);
  const toSix = timeToReach(0.6, input);
  const toFive = timeToReach(0.5, input);
  assert.ok(first > (toSix - toFive) * 1.3, `first 10%: ${first}s, 0.5->0.6: ${toSix - toFive}s`);
});

test('heat changes take a moment to reach the pot', () => {
  let s = run(createCook(), { heat: 'low', stir: 1 }, (_, t) => t > 10).state;
  const before = s.temp;
  s = stepCook(s, { heat: 'high', stir: 1 }, 0.25);
  assert.ok(s.temp > before, 'temp should start rising');
  assert.ok(s.temp < 0.9, `temp jumped to ${s.temp}`);
});

test('steady stirring keeps the bottom from catching', () => {
  const { state } = run(createCook(), { heat: 'med', stir: 1 }, (s) => s.browning >= 0.67);
  assert.equal(state.specks, 0);
});

test('short stir breaks at medium heat are forgiven', () => {
  const stirTwoOfFive = (t) => ({ heat: 'med', stir: t % 5 < 3 ? 1 : 0 });
  const { state } = run(createCook(), stirTwoOfFive, (s) => s.browning >= 0.67);
  assert.equal(state.specks, 0);
});

test('not stirring at medium heat lays down specks within ten seconds', () => {
  const warm = run(createCook(), { heat: 'med', stir: 1 }, (s) => s.browning >= 0.3).state;
  const { state } = run(warm, { heat: 'med', stir: 0 }, (_, t) => t >= 10);
  assert.ok(state.specks > 0, 'expected specks');
});

test('a hot, dark roux catches faster than a cool, light one', () => {
  const catchTime = (heat, browning) => {
    const warm = run(createCook(), { heat, stir: 1 }, (s) => s.browning >= browning).state;
    return run(warm, { heat, stir: 0 }, (s) => s.specks > 0, 60).t;
  };
  assert.ok(catchTime('high', 0.8) < catchTime('low', 0.2));
});

test('enough specks scorches the roux', () => {
  const warm = run(createCook(), { heat: 'med', stir: 1 }, (s) => s.browning >= 0.4).state;
  const { state } = run(warm, { heat: 'med', stir: 0 }, (s) => s.status === 'burnt', 60);
  assert.equal(state.status, 'burnt');
  assert.equal(state.burnReason, 'scorched');
  assert.ok(state.specks >= SCORCH_SPECKS);
});

test('cooking past black burns the roux', () => {
  const { state } = run(createCook(), { heat: 'high', stir: 1 }, (s) => s.status === 'burnt');
  assert.equal(state.status, 'burnt');
  assert.equal(state.burnReason, 'overcooked');
});

test('after the trinity drops the roux keeps darkening, then settles', () => {
  let s = run(createCook(), { heat: 'med', stir: 1 }, (st) => st.browning >= 0.5).state;
  s = dropTrinity(s);
  const atDrop = s.browning;
  assert.equal(s.status, 'cooling');
  const { state, t } = run(s, { heat: 'med', stir: 0 }, (st) => st.status === 'done', 20);
  assert.equal(state.status, 'done');
  assert.ok(state.browning > atDrop, 'expected carryover browning');
  assert.ok(t < 6, `took ${t.toFixed(1)}s to settle`);
  assert.equal(state.specks, 0, 'the trinity should stop sticking');
});

test('carryover is bigger at high heat and meaningful but not huge', () => {
  const carryover = (heat) => {
    let s = run(createCook(), { heat, stir: 1 }, (_, t) => t > 8).state;
    s = run(s, { heat, stir: 1 }, (st) => st.browning >= 0.5).state;
    s = dropTrinity(s);
    const atDrop = s.browning;
    return run(s, { heat, stir: 0 }, (st) => st.status === 'done', 20).state.browning - atDrop;
  };
  const low = carryover('low');
  const high = carryover('high');
  assert.ok(high > low * 2, `low ${low} high ${high}`);
  assert.ok(high > 0.03 && high < 0.08, `high carryover ${high}`);
});

test('dropping the trinity records how fast it was browning', () => {
  let s = run(createCook(), { heat: 'med', stir: 1 }, (st) => st.browning >= 0.5).state;
  s = dropTrinity(s);
  assert.ok(s.rateAtDrop > 0);
  assert.equal(s.browningAtDrop, s.browning);
});

test('the sim gives the same result at 30fps and 120fps', () => {
  const at = (fps) => run(createCook(), { heat: 'high', stir: 1 }, (_, t) => t >= 12, 300, fps).state.browning;
  const slow = at(30);
  const fast = at(120);
  assert.ok(Math.abs(slow - fast) < 0.01, `30fps ${slow} vs 120fps ${fast}`);
});
