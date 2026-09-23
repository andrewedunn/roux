// ABOUTME: Tests for color conversion between hex, sRGB, and OKLab.
// ABOUTME: Checks known OKLab reference values, round-trips, distance, and mixing.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { hexToOklab, oklabToHex, deltaE, mixHex } from '../src/color.js';

const close = (actual, expected, tol = 1e-3) =>
  assert.ok(Math.abs(actual - expected) < tol, `${actual} not within ${tol} of ${expected}`);

test('white converts to OKLab L=1 with no chroma', () => {
  const c = hexToOklab('#ffffff');
  close(c.L, 1);
  close(c.a, 0);
  close(c.b, 0);
});

test('pure red matches the published OKLab reference value', () => {
  const c = hexToOklab('#ff0000');
  close(c.L, 0.62796);
  close(c.a, 0.22486);
  close(c.b, 0.12585);
});

test('hex survives a round trip through OKLab', () => {
  for (const hex of ['#c08a4e', '#2b1a12', '#efe3c8', '#000000']) {
    assert.equal(oklabToHex(hexToOklab(hex)), hex);
  }
});

test('deltaE is zero for identical colors and one for black vs white', () => {
  close(deltaE('#9e5b2e', '#9e5b2e'), 0);
  close(deltaE('#000000', '#ffffff'), 1);
});

test('mixHex returns the endpoints at 0 and 1', () => {
  assert.equal(mixHex('#e0c38a', '#c08a4e', 0), '#e0c38a');
  assert.equal(mixHex('#e0c38a', '#c08a4e', 1), '#c08a4e');
});

test('mixHex halfway lands halfway in OKLab lightness', () => {
  const a = hexToOklab('#e0c38a');
  const b = hexToOklab('#45281a');
  const mid = hexToOklab(mixHex('#e0c38a', '#45281a', 0.5));
  close(mid.L, (a.L + b.L) / 2, 0.005);
});
