// ABOUTME: Tests for the daily menu calendar: Central-time dates, daily numbers, seeds, and streaks.
// ABOUTME: The day rolls over at midnight in Louisiana, not UTC.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { LAUNCH_DATE, centralDate, dailyNumber, dailySeed, streak } from '../src/daily.js';

test('the day rolls over at midnight Central time', () => {
  assert.equal(centralDate(new Date('2026-09-24T04:59:00Z')), '2026-09-23');
  assert.equal(centralDate(new Date('2026-09-24T05:00:00Z')), '2026-09-24');
});

test('launch day is menu #1 and each day after counts up', () => {
  assert.equal(dailyNumber(new Date(`${LAUNCH_DATE}T17:00:00Z`)), 1);
  assert.equal(dailyNumber(new Date('2026-09-24T17:00:00Z')), dailyNumber(new Date(`${LAUNCH_DATE}T17:00:00Z`)) + 1);
});

test('daily numbers stay continuous across the fall daylight-saving change', () => {
  const before = dailyNumber(new Date('2026-10-31T17:00:00Z'));
  const after = dailyNumber(new Date('2026-11-02T17:00:00Z'));
  assert.equal(after - before, 2);
});

test('daily seeds are stable and differ day to day', () => {
  assert.equal(dailySeed(12), dailySeed(12));
  assert.notEqual(dailySeed(12), dailySeed(13));
});

const played = (...pairs) => Object.fromEntries(pairs.map(([number, playedOn]) => [number, { playedOn }]));

test('a streak counts consecutive dailies played on their own day', () => {
  assert.equal(streak(played([8, 8], [9, 9], [10, 10]), 10), 3);
});

test('a streak is still alive if today has not been played yet', () => {
  assert.equal(streak(played([8, 8], [9, 9]), 10), 2);
});

test('a missed day breaks the streak', () => {
  assert.equal(streak(played([7, 7], [9, 9], [10, 10]), 10), 2);
  assert.equal(streak(played([7, 7], [8, 8]), 10), 0);
});

test('playing an old menu from a link does not fill a gap', () => {
  assert.equal(streak(played([9, 10], [10, 10]), 10), 1);
});
