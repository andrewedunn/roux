// ABOUTME: Tests for the stir-speed meter: the band starts easy, moves during the cook, and is the same for a shared menu.
// ABOUTME: Also checks how a stir speed maps to too slow / on pace / too fast.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createPace, paceOf, METER_MAX } from '../src/pace.js';

const centers = (pace, seconds) =>
  Array.from({ length: seconds * 4 }, (_, i) => {
    const { lo, hi } = pace.band(i / 4);
    return (lo + hi) / 2;
  });

test('the band starts at an easy speed and holds still for the first couple of seconds', () => {
  const pace = createPace(42, 0);
  const first = pace.band(0);
  const later = pace.band(1.9);
  assert.deepEqual(first, later);
  assert.ok(first.lo > 1 && first.hi < 6, JSON.stringify(first));
});

test('the band keeps drifting, and sometimes lurches quickly', () => {
  for (let seed = 0; seed < 20; seed++) {
    const c = centers(createPace(seed, 2), 45);
    const steps = c.slice(12).map((v, i) => Math.abs(v - c[i + 11]));
    const still = steps.filter((d) => d < 0.005).length;
    assert.ok(still < steps.length * 0.35, `seed ${seed}: still ${still} of ${steps.length} quarter-seconds`);
    assert.ok(Math.max(...steps) > 0.6, `seed ${seed}: fastest step ${Math.max(...steps)}`);
  }
});

test('the band always stays on the meter', () => {
  for (let seed = 0; seed < 50; seed++) {
    for (let round = 0; round < 3; round++) {
      const pace = createPace(seed, round);
      for (let t = 0; t < 60; t += 0.5) {
        const { lo, hi } = pace.band(t);
        assert.ok(lo > 0 && hi < METER_MAX, `seed ${seed} round ${round} t ${t}: ${lo}..${hi}`);
      }
    }
  }
});

test('later rounds have a narrower band', () => {
  const width = (round) => {
    const { lo, hi } = createPace(1, round).band(0);
    return hi - lo;
  };
  assert.ok(width(0) > width(1) && width(1) > width(2));
});

test('the same menu seed gives the same moves; different rounds differ', () => {
  assert.deepEqual(centers(createPace(99, 1), 40), centers(createPace(99, 1), 40));
  assert.notDeepEqual(centers(createPace(99, 0), 40), centers(createPace(99, 1), 40));
});

test('pace is 0 inside the band, negative when slow, positive when fast, and capped', () => {
  const band = { lo: 3, hi: 5 };
  assert.equal(paceOf(4, band), 0);
  assert.ok(paceOf(2.5, band) < 0 && paceOf(2.5, band) > -1);
  assert.ok(paceOf(5.5, band) > 0 && paceOf(5.5, band) < 1);
  assert.equal(paceOf(0, band), -1);
  assert.equal(paceOf(20, band), 1);
});
