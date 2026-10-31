// ABOUTME: Tests for turning finger movement in the pot into stir activity (0..1) and swirl direction.
// ABOUTME: Feeds scripted pointer paths at 60Hz, the way a phone delivers pointermove events.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createStir, stirMove, stirRelease, stirTick } from '../src/stir.js';

const POT = { cx: 200, cy: 200, r: 150 };
const HZ = 60;

// Circles the pot for `seconds` at `revsPerSec` (negative = the other way) at a fraction of the radius.
function circle(state, { seconds, revsPerSec, radius = 0.6, start = 0 }) {
  for (let i = 0; i <= seconds * HZ; i++) {
    const t = start + i / HZ;
    const angle = 2 * Math.PI * revsPerSec * (t - start);
    const x = POT.cx + Math.cos(angle) * POT.r * radius;
    const y = POT.cy + Math.sin(angle) * POT.r * radius;
    state = stirTick(stirMove(state, { x, y, t }, POT), t);
  }
  return state;
}

test('circling the pot once a second is full stirring', () => {
  const s = circle(createStir(), { seconds: 1, revsPerSec: 1 });
  assert.ok(s.activity > 0.9, `activity ${s.activity}`);
});

test('lazy circling is partial stirring', () => {
  const s = circle(createStir(), { seconds: 2, revsPerSec: 0.2, radius: 0.5 });
  assert.ok(s.activity > 0.2 && s.activity < 0.8, `activity ${s.activity}`);
});

test('holding a finger still lets stirring fade within a second', () => {
  let s = circle(createStir(), { seconds: 1, revsPerSec: 1 });
  const held = s.last;
  for (let i = 1; i <= HZ * 1.5; i++) s = stirTick(s, held.t + i / HZ);
  assert.ok(s.activity < 0.15, `activity ${s.activity}`);
});

test('lifting the finger lets stirring fade', () => {
  let s = circle(createStir(), { seconds: 1, revsPerSec: 1 });
  const t0 = s.last.t;
  s = stirRelease(s);
  for (let i = 1; i <= HZ * 1.5; i++) s = stirTick(s, t0 + i / HZ);
  assert.ok(s.activity < 0.15, `activity ${s.activity}`);
});

test('stirring direction sets the swirl direction', () => {
  const cw = circle(createStir(), { seconds: 1, revsPerSec: 1 });
  const ccw = circle(createStir(), { seconds: 1, revsPerSec: -1 });
  assert.ok(cw.spin > 0 && ccw.spin < 0, `cw ${cw.spin} ccw ${ccw.spin}`);
});

test('scraping back and forth also counts as stirring', () => {
  let s = createStir();
  for (let i = 0; i <= HZ; i++) {
    const t = i / HZ;
    const x = POT.cx + Math.sin(t * 2 * Math.PI * 1.5) * POT.r * 0.6;
    s = stirTick(stirMove(s, { x, y: POT.cy, t }, POT), t);
  }
  assert.ok(s.activity > 0.5, `activity ${s.activity}`);
});

test('speed tracks how fast the finger travels, in pot radii per second', () => {
  const slow = circle(createStir(), { seconds: 2, revsPerSec: 0.5 });
  const fast = circle(createStir(), { seconds: 2, revsPerSec: 2 });
  // One lap at 0.6 of the radius is 2π·0.6 ≈ 3.8 radii.
  assert.ok(Math.abs(slow.speed - 1.9) < 0.3, `slow ${slow.speed}`);
  assert.ok(Math.abs(fast.speed - 7.5) < 0.6, `fast ${fast.speed}`);
});

test('speed falls back to zero when the finger stops', () => {
  let s = circle(createStir(), { seconds: 1, revsPerSec: 1 });
  for (let i = 1; i <= 2 * HZ; i++) s = stirTick(s, 1 + i / HZ);
  assert.ok(s.speed < 0.2, `speed ${s.speed}`);
});
