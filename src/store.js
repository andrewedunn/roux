// ABOUTME: Remembers on this device (localStorage) whether someone has played, to skip the how-to next time.
// ABOUTME: Storage can be missing, full, or blocked (private mode); every call degrades to "nothing saved".

const PLAYED_KEY = 'roux-wars:played';

export function createStore(storage) {
  function markPlayed() {
    try {
      storage?.setItem(PLAYED_KEY, '1');
    } catch {
      // Nothing to do: the game still plays, it just won't remember this visit.
    }
  }

  function hasPlayed() {
    try {
      return storage?.getItem(PLAYED_KEY) === '1';
    } catch {
      return false;
    }
  }

  return { markPlayed, hasPlayed };
}
