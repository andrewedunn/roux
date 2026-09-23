// ABOUTME: Tests for saving daily results on the device, including storage that is broken or unavailable.
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

test('a saved daily comes back', () => {
  const store = createStore(memoryStorage());
  store.saveDaily(12, { playedOn: 12, dishes: [{ dish: 'Gumbo', score: 90 }] });
  assert.deepEqual(store.dailies()[12], { playedOn: 12, dishes: [{ dish: 'Gumbo', score: 90 }] });
});

test('a fresh device has no dailies and has not played', () => {
  const store = createStore(memoryStorage());
  assert.deepEqual(store.dailies(), {});
  assert.equal(store.hasPlayed(), false);
});

test('finishing any menu marks the device as having played', () => {
  const store = createStore(memoryStorage());
  store.markPlayed();
  assert.equal(store.hasPlayed(), true);
});

test('corrupted saved data reads as empty instead of crashing', () => {
  const storage = memoryStorage();
  storage.setItem('roux-wars:dailies', '{not json');
  assert.deepEqual(createStore(storage).dailies(), {});
});

test('storage that throws is survivable', () => {
  const store = createStore(throwingStorage);
  assert.doesNotThrow(() => store.saveDaily(1, { playedOn: 1, dishes: [] }));
  assert.deepEqual(store.dailies(), {});
  assert.equal(store.hasPlayed(), false);
});

test('no storage at all is survivable', () => {
  const store = createStore(undefined);
  assert.doesNotThrow(() => store.markPlayed());
  assert.deepEqual(store.dailies(), {});
});
