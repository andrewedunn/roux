// ABOUTME: Tests for the cooking simulation: browning speed, sticking and specks, carryover, and burning.
// ABOUTME: Each test drives the real sim with scripted stir input and checks the behavior a player feels.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createCook, stepCook, dropTrinity, canDrop, stirScore, SCORCH_SPECKS, STIR_TO_UNLOCK } from '../src/cook.js';

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

// Stirring patterns: a quick lift of the finger vs. real stop-and-go.
const briefLifts = (t) => ({ stir: t % 3 < 2.5 ? 1 : 0 });
const stopAndGo = (t) => ({ stir: t % 5 < 3 ? 1 : 0 });

test('lifting the finger for a moment to reposition is forgiven', () => {
  const { state } = run(createCook(), briefLifts, (s) => s.browning >= 0.67);
  assert.equal(state.specks, 0);
});

test('stop-and-go stirring leaves flecks but doesn’t scorch', () => {
  const { state } = run(createCook(), stopAndGo, (s) => s.browning >= 0.67);
  assert.ok(state.specks >= 1, `only ${state.specks.toFixed(2)} specks`);
  assert.equal(state.status, 'cooking');
});

test('stopping mid-cook lays down a fleck within about four seconds', () => {
  const warm = run(createCook(), STIRRING, (s) => s.browning >= 0.4).state;
  const { t } = run(warm, IDLE, (s) => s.specks >= 1, 30);
  assert.ok(t < 4.5, `first fleck took ${t.toFixed(1)}s`);
});

test('walking away scorches it, but not instantly', () => {
  const warm = run(createCook(), STIRRING, (s) => s.browning >= 0.4).state;
  const { state, t } = run(warm, IDLE, (s) => s.status === 'burnt', 60);
  assert.equal(state.burnReason, 'scorched');
  assert.ok(t > 6 && t < 14, `scorched after ${t.toFixed(1)}s`);
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

test('the trinity can’t go in until the roux has been stirred', () => {
  const idle = run(createCook(), IDLE, (_, t) => t >= 5).state;
  assert.equal(canDrop(idle), false);
  assert.equal(dropTrinity(idle).status, 'cooking');
});

test('a couple of seconds of real stirring unlocks the trinity', () => {
  const almost = run(createCook(), STIRRING, (_, t) => t >= STIR_TO_UNLOCK - 0.2).state;
  assert.equal(canDrop(almost), false);
  const stirred = run(createCook(), STIRRING, (_, t) => t >= STIR_TO_UNLOCK + 0.1).state;
  assert.equal(canDrop(stirred), true);
  assert.equal(dropTrinity(stirred).status, 'cooling');
});

test('lazy half-hearted stirring doesn’t count toward unlocking', () => {
  const lazy = run(createCook(), { stir: 0.1 }, (_, t) => t >= 5).state;
  assert.equal(canDrop(lazy), false);
});

test('steady stirring earns a perfect stir score', () => {
  const { state } = run(createCook(), STIRRING, (s) => s.browning >= 0.67);
  assert.equal(stirScore(state), 100);
});

test('brief lifts barely dent the stir score', () => {
  const { state } = run(createCook(), briefLifts, (s) => s.browning >= 0.67);
  assert.ok(stirScore(state) >= 85, `stir score ${stirScore(state)}`);
});

test('stop-and-go stirring scores clearly lower', () => {
  const { state } = run(createCook(), stopAndGo, (s) => s.browning >= 0.67);
  const score = stirScore(state);
  assert.ok(score >= 50 && score <= 80, `stir score ${score}`);
});

test('never stirring scores near zero', () => {
  const { state } = run(createCook(), IDLE, (_, t) => t >= 5);
  assert.ok(stirScore(state) <= 10, `stir score ${stirScore(state)}`);
});

test('only the cooking counts toward the stir score, not the wait after the trinity', () => {
  let s = run(createCook(), STIRRING, (st) => st.browning >= 0.5).state;
  s = dropTrinity(s);
  const { state } = run(s, IDLE, (st) => st.status === 'done', 20);
  assert.equal(stirScore(state), 100);
});

test('stirring well below the meter lets the bottom catch', () => {
  const { state } = run(createCook(), { stir: 1, pace: -1 }, (s) => s.browning >= 0.5);
  assert.ok(state.specks >= 3, `specks ${state.specks}`);
});

test('a little under the band is forgiven', () => {
  const { state } = run(createCook(), { stir: 1, pace: -0.15 }, (s) => s.browning >= 0.5);
  assert.equal(Math.floor(state.specks), 0);
});

test('stirring too fast splashes roux out of the pot, about two a second', () => {
  const { state, t } = run(createCook(), { stir: 1, pace: 1 }, (s, time) => time >= 5);
  assert.ok(state.splashes > 8 && state.splashes < 12, `splashes ${state.splashes} in ${t}s`);
  assert.equal(Math.floor(state.specks), 0);
});

test('on-pace stirring never splashes', () => {
  const { state } = run(createCook(), STIRRING, (s) => s.browning >= 0.67);
  assert.equal(state.splashes, 0);
});

test('stir score counts only time spent on pace', () => {
  const half = (t) => ({ stir: 1, pace: Math.floor(t / 2) % 2 ? 1 : 0 });
  const { state } = run(createCook(), half, (s) => s.browning >= 0.4);
  const score = stirScore(state);
  assert.ok(score > 40 && score < 60, `stir score ${score}`);
});

test('stirring well under the band flecks within a few seconds', () => {
  const { t } = run(createCook(), { stir: 1, pace: -0.8 }, (s) => s.specks >= 1);
  assert.ok(t < 6, `first fleck after ${t.toFixed(1)}s`);
});
