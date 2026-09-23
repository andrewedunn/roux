// ABOUTME: Tests for remembering on the device that someone has played, including broken or missing storage.
// ABOUTME: Uses a tiny in-memory Storage stand-in with the same getItem/setItem shape as localStorage.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createStore } from '../src/store.js';

function memoryStorage() {
  const data = new Map();
  return {
    getItem: (k) => (data.has(k) ? data.get(k) : null),
    setItem: (k, v) => data.set(k, String(v)),
  };
}

const throwingStorage = {
  getItem() {
    throw new Error('SecurityError');
  },
  setItem() {
    throw new Error('QuotaExceededError');
  },
};

test('a fresh device has not played', () => {
  assert.equal(createStore(memoryStorage()).hasPlayed(), false);
});

test('finishing any menu marks the device as having played', () => {
  const store = createStore(memoryStorage());
  store.markPlayed();
  assert.equal(store.hasPlayed(), true);
});

test('storage that throws is survivable', () => {
  const store = createStore(throwingStorage);
  assert.doesNotThrow(() => store.markPlayed());
  assert.equal(store.hasPlayed(), false);
});

test('no storage at all is survivable', () => {
  const store = createStore(undefined);
  assert.doesNotThrow(() => store.markPlayed());
  assert.equal(store.hasPlayed(), false);
});
