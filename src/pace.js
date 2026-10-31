// ABOUTME: The stir-speed meter: a seeded "right speed" band that drifts back and forth and sometimes lurches.
// ABOUTME: paceOf turns the player's stir speed into -1..1 (too slow .. too fast), 0 while inside the band.

export const METER_MAX = 9; // pot radii per second at the "Fast" end of the meter (~2.4 circles a second)
const LOW = 1.6; // the band's center never goes slower than this...
const HIGH = 7.2; // ...or faster than this
const FIRST_CENTER = 3.8; // about one easy circle a second
const SETTLE = 2; // seconds the band sits still at the start so you can find it
const SOFT = 0.75; // radii/s past the band's edge until it counts as fully too slow or too fast
const SCHEDULE_SECONDS = 90;

// The band never really stops: it drifts slowly back and forth, pauses now and then, and every so often
// lurches somewhere new. Later rounds are narrower, lurch more often, and drift faster.
const ROUNDS = [
  { width: 2.1, lurch: 0.28, drift: [2.0, 3.4] },
  { width: 1.8, lurch: 0.36, drift: [1.7, 2.9] },
  { width: 1.5, lurch: 0.45, drift: [1.4, 2.4] },
];
const DRIFT_REACH = [0.8, 2.4]; // how far a slow drift travels, radii/s
const LURCH_REACH = [2.0, 3.6]; // how far a lurch travels
const LURCH_SECONDS = [0.55, 0.9];
const PAUSE_CHANCE = 0.2;
const PAUSE_SECONDS = [0.4, 1.4];

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
  const between = ([a, b]) => a + rand() * (b - a);
  const { width, lurch, drift } = ROUNDS[Math.min(round, ROUNDS.length - 1)];
  // Moves: [{ start, duration, from, to, fast }], back to back, with an occasional pause between.
  const moves = [];
  let center = FIRST_CENTER;
  let dir = rand() < 0.5 ? -1 : 1;
  let t = SETTLE;
  while (t < SCHEDULE_SECONDS) {
    const fast = moves.length > 0 && rand() < lurch;
    const reach = between(fast ? LURCH_REACH : DRIFT_REACH);
    // Drifts mostly keep going the same way (back and forth); lurches pick a side at random.
    if (fast ? rand() < 0.5 : rand() < 0.25) dir = -dir;
    let to = center + dir * reach;
    if (to < LOW || to > HIGH) {
      dir = -dir;
      to = center + dir * reach;
    }
    to = Math.max(LOW, Math.min(HIGH, to));
    const duration = between(fast ? LURCH_SECONDS : drift);
    moves.push({ start: t, duration, from: center, to, fast });
    center = to;
    t += duration;
    if (rand() < PAUSE_CHANCE) t += between(PAUSE_SECONDS);
  }

  function centerAt(seconds) {
    let c = FIRST_CENTER;
    for (const m of moves) {
      if (seconds < m.start) break;
      const k = Math.min(1, (seconds - m.start) / m.duration);
      c = m.from + (m.to - m.from) * easeInOut(k);
    }
    return c;
  }

  // The band at `seconds` since the burner lit, in pot radii per second.
  function band(seconds) {
    const c = centerAt(Math.max(0, seconds));
    return { lo: c - width / 2, hi: c + width / 2 };
  }

  // True just before and during a lurch, so the meter can flag it.
  function moving(seconds, lead = 0.4) {
    return moves.some((m) => m.fast && seconds >= m.start - lead && seconds < m.start + m.duration);
  }

  return { band, moving };
}

// -1..1: how far below (negative) or above (positive) the band the speed is. 0 inside it.
export function paceOf(speed, { lo, hi }) {
  if (speed < lo) return -Math.min(1, (lo - speed) / SOFT);
  if (speed > hi) return Math.min(1, (speed - hi) / SOFT);
  return 0;
}
