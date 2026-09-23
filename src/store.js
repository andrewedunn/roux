// ABOUTME: Keeps daily results and a "has played" flag on this device (localStorage).
// ABOUTME: Storage can be missing, full, or blocked (private mode); every call degrades to "nothing saved".

const DAILIES_KEY = 'roux-wars:dailies';
const PLAYED_KEY = 'roux-wars:played';

export function createStore(storage) {
  function read(key) {
    try {
      return storage?.getItem(key) ?? null;
    } catch {
      return null;
    }
  }

  function write(key, value) {
    try {
      storage?.setItem(key, value);
    } catch {
      // Nothing to do: the game still plays, it just won't remember this visit.
    }
  }

  function dailies() {
    try {
      const parsed = JSON.parse(read(DAILIES_KEY) ?? '{}');
      return parsed && typeof parsed === 'object' ? parsed : {};
    } catch {
      return {};
    }
  }

  function saveDaily(number, record) {
    write(DAILIES_KEY, JSON.stringify({ ...dailies(), [number]: record }));
    markPlayed();
  }

  function markPlayed() {
    write(PLAYED_KEY, '1');
  }

  function hasPlayed() {
    return read(PLAYED_KEY) === '1';
  }

  return { dailies, saveDaily, markPlayed, hasPlayed };
}
