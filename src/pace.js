// ABOUTME: The stir-speed meter: a seeded "right speed" band that holds, then glides somewhere new during a cook.
// ABOUTME: paceOf turns the player's stir speed into -1..1 (too slow .. too fast), 0 while inside the band.

export const METER_MAX = 9; // pot radii per second at the "Fast" end of the meter (~2.4 circles a second)
const LOW = 1.6; // the band's center never goes slower than this...
const HIGH = 7.2; // ...or faster than this
const FIRST_CENTER = 3.8; // about one easy circle a second
const MIN_JUMP = 1.8; // each move goes somewhere you have to notice
const SOFT = 1.1; // radii/s past the band's edge until it counts as fully too slow or too fast
const SCHEDULE_SECONDS = 90;

// Width of the band, and how long it holds still, for each round: later rounds are narrower and fidgetier.
const ROUNDS = [
  { width: 3.0, hold: [5, 8], glide: 1.6 },
  { width: 2.6, hold: [4, 6.5], glide: 1.3 },
  { width: 2.2, hold: [3, 5], glide: 1.1 },
];

// mulberry32: small, fast, deterministic PRNG.
function seededRandom(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const easeInOut = (t) => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2);

// Seeded so a shared menu link gets the same meter moves, round by round.
export function createPace(seed, round = 0) {
  const rand = seededRandom(seed ^ Math.imul(round + 1, 0x9e3779b1));
  const { width, hold, glide } = ROUNDS[Math.min(round, ROUNDS.length - 1)];
  // Moves: [{ start, from, to }] — hold at `from` until `start`, then glide to `to`.
  const moves = [];
  let center = FIRST_CENTER;
  let t = hold[0] + 1; // a little extra time to settle in before the first move
  while (t < SCHEDULE_SECONDS) {
    let to;
    do to = LOW + rand() * (HIGH - LOW);
    while (Math.abs(to - center) < MIN_JUMP);
    moves.push({ start: t, from: center, to });
    center = to;
    t += glide + hold[0] + rand() * (hold[1] - hold[0]);
  }

  function centerAt(seconds) {
    let c = FIRST_CENTER;
    for (const m of moves) {
      if (seconds < m.start) break;
      const k = Math.min(1, (seconds - m.start) / glide);
      c = m.from + (m.to - m.from) * easeInOut(k);
    }
    return c;
  }

  // The band at `seconds` since the burner lit, in pot radii per second.
  function band(seconds) {
    const c = centerAt(Math.max(0, seconds));
    return { lo: c - width / 2, hi: c + width / 2 };
  }

  // True while the band is gliding (or about to), so the meter can flag it.
  function moving(seconds, lead = 0.6) {
    return moves.some((m) => seconds >= m.start - lead && seconds < m.start + glide);
  }

  return { band, moving };
}

// -1..1: how far below (negative) or above (positive) the band the speed is. 0 inside it.
export function paceOf(speed, { lo, hi }) {
  if (speed < lo) return -Math.min(1, (lo - speed) / SOFT);
  if (speed > hi) return Math.min(1, (speed - hi) / SOFT);
  return 0;
}
