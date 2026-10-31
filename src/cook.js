// ABOUTME: Pure cooking simulation for one pot of roux: heat lag, browning, sticking, specks, splashes, carryover.
// ABOUTME: stepCook advances on real elapsed seconds (sub-stepped) so it plays the same at any frame rate.

export const SCORCH_SPECKS = 10;
export const STIR_TO_UNLOCK = 2; // seconds of real stirring before the trinity can go in

const BURNER = 0.7; // one steady medium flame
const START_TEMP = 0.35;
const BROWN_RATE = 0.041;
const HEAT_EXPONENT = 1.7;
const HEAT_LAG = 2.5; // seconds for the pot to come up to the burner
const COOL_LAG = 3.2; // seconds for the pot to shed heat once the trinity is in
const TRINITY_CHILL = 0.9; // cold vegetables knock the heat down right away
const STICK_RISE = 0.34;
const STICK_CLEAR = 1.2;
// Flecks start early and gently as the bottom catches, then top out: a 2-second pause leaves one,
// walking away scorches it in about 9 seconds.
const SPECK_THRESHOLD = 0.12;
const SPECK_RAMP = 0.2;
const SPECK_RATE = 1.8;
const SETTLED_RATE = 0.004;
const MAX_SUBSTEP = 1 / 120;
const REAL_STIR = 0.35; // stir activity that counts as actually stirring
const STIR_GRACE = 0.3; // seconds after a stir that still count as "kept it moving"
// Stirring too fast for the meter slops roux over the side: two splashes a second when way too fast.
const SPLASH_RATE = 2;
// Stirring too slow for the meter barely moves the bottom: past this much "too slow" it's as good as stopped,
// and the bottom starts catching right away.
const SLOW_STALL = 0.6;
const SLOW_CATCH = 0.5;
const ON_PACE = 0.35; // |pace| under this still counts as keeping the meter's pace

const clamp01 = (v) => Math.max(0, Math.min(1, v));

function smoothstep(edge0, edge1, x) {
  const t = clamp01((x - edge0) / (edge1 - edge0));
  return t * t * (3 - 2 * t);
}

// Slow while moisture cooks out of the flour, then speeds up a little as the pot runs hotter.
function browningRate(temp, browning) {
  const warmUp = 0.45 + 0.55 * smoothstep(0, 0.2, browning);
  const runaway = 1 + 0.35 * browning;
  return BROWN_RATE * temp ** HEAT_EXPONENT * warmUp * runaway;
}

export function createCook() {
  return {
    status: 'cooking',
    burnReason: null,
    elapsed: 0,
    temp: START_TEMP,
    browning: 0,
    rate: 0,
    stick: 0,
    specks: 0,
    splashes: 0,
    stirredFor: 0,
    sinceStir: 0,
    cookedFor: 0,
    coveredFor: 0,
    browningAtDrop: null,
    rateAtDrop: null,
  };
}

// pace: -1..1 from the speed meter (src/pace.js). Too slow stirs less well; too fast splashes.
function substep(s, rawStir, pace, h) {
  const cooling = s.status === 'cooling';
  const target = cooling ? 0 : BURNER;
  const temp = target + (s.temp - target) * Math.exp(-h / (cooling ? COOL_LAG : HEAT_LAG));
  const rate = browningRate(temp, s.browning);
  const browning = s.browning + rate * h;

  let stick = s.stick;
  let specks = s.specks;
  let splashes = s.splashes;
  const slow = Math.max(0, -pace);
  const stir = rawStir * Math.max(0, 1 - slow / SLOW_STALL);
  const stirring = stir >= REAL_STIR;
  const stirredFor = !cooling && stirring ? s.stirredFor + h : s.stirredFor;
  // Stir consistency is only measured while the burner is on, not while the trinity cools it.
  const sinceStir = stirring ? 0 : s.sinceStir + h;
  const cookedFor = cooling ? s.cookedFor : s.cookedFor + h;
  const onPace = Math.abs(pace) < ON_PACE;
  const coveredFor = !cooling && onPace && (stirring || sinceStir < STIR_GRACE) ? s.coveredFor + h : s.coveredFor;
  if (cooling) {
    stick = Math.max(0, stick - STICK_CLEAR * h);
  } else {
    stick += h * STICK_RISE * temp ** 1.5 * (0.35 + browning) * (1 - stir);
    if (rawStir >= REAL_STIR) stick += h * SLOW_CATCH * slow;
    stick = clamp01(stick - h * STICK_CLEAR * stir);
    if (stick > SPECK_THRESHOLD) {
      specks += h * SPECK_RATE * temp * Math.min(1, (stick - SPECK_THRESHOLD) / SPECK_RAMP);
    }
    if (pace > 0 && rawStir >= REAL_STIR) splashes += h * SPLASH_RATE * pace;
  }

  let status = s.status;
  let burnReason = s.burnReason;
  if (browning > 1) {
    status = 'burnt';
    burnReason = 'overcooked';
  } else if (specks >= SCORCH_SPECKS) {
    status = 'burnt';
    burnReason = 'scorched';
  } else if (cooling && rate < SETTLED_RATE) {
    status = 'done';
  }

  return {
    ...s,
    status,
    burnReason,
    elapsed: s.elapsed + h,
    temp,
    browning,
    rate,
    stick,
    specks,
    splashes,
    stirredFor,
    sinceStir,
    cookedFor,
    coveredFor,
  };
}

// input: { stir: 0..1, pace: -1..1 (optional; 0 = on pace) }
export function stepCook(state, { stir, pace = 0 }, dt) {
  let s = state;
  let remaining = dt;
  while (remaining > 1e-9 && (s.status === 'cooking' || s.status === 'cooling')) {
    const h = Math.min(MAX_SUBSTEP, remaining);
    s = substep(s, clamp01(stir), Math.max(-1, Math.min(1, pace)), h);
    remaining -= h;
  }
  return s;
}

// 0–100: how much of the cooking the roux was kept moving at the meter's pace. Stop-and-go or off-pace scores low.
export function stirScore(state) {
  return state.cookedFor > 0 ? Math.round((100 * state.coveredFor) / state.cookedFor) : 100;
}

// The trinity only goes in once the roux has actually been stirred for a bit.
export function canDrop(state) {
  return state.status === 'cooking' && state.stirredFor >= STIR_TO_UNLOCK;
}

export function dropTrinity(state) {
  if (!canDrop(state)) return state;
  return {
    ...state,
    status: 'cooling',
    temp: state.temp * TRINITY_CHILL,
    browningAtDrop: state.browning,
    rateAtDrop: browningRate(state.temp, state.browning),
  };
}
