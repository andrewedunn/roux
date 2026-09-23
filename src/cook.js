// ABOUTME: Pure cooking simulation for one pot of roux: heat lag, browning, sticking, specks, carryover.
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
const SPECK_THRESHOLD = 0.6;
const SPECK_RATE = 3;
const SETTLED_RATE = 0.004;
const MAX_SUBSTEP = 1 / 120;
const REAL_STIR = 0.35; // stir activity that counts as actually stirring

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
    stirredFor: 0,
    browningAtDrop: null,
    rateAtDrop: null,
  };
}

function substep(s, stir, h) {
  const cooling = s.status === 'cooling';
  const target = cooling ? 0 : BURNER;
  const temp = target + (s.temp - target) * Math.exp(-h / (cooling ? COOL_LAG : HEAT_LAG));
  const rate = browningRate(temp, s.browning);
  const browning = s.browning + rate * h;

  let stick = s.stick;
  let specks = s.specks;
  const stirredFor = !cooling && stir >= REAL_STIR ? s.stirredFor + h : s.stirredFor;
  if (cooling) {
    stick = Math.max(0, stick - STICK_CLEAR * h);
  } else {
    stick += h * STICK_RISE * temp ** 1.5 * (0.35 + browning) * (1 - stir);
    stick = clamp01(stick - h * STICK_CLEAR * stir);
    if (stick > SPECK_THRESHOLD) {
      specks += (h * SPECK_RATE * temp * (stick - SPECK_THRESHOLD)) / (1 - SPECK_THRESHOLD);
    }
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

  return { ...s, status, burnReason, elapsed: s.elapsed + h, temp, browning, rate, stick, specks, stirredFor };
}

// input: { stir: 0..1 }
export function stepCook(state, { stir }, dt) {
  let s = state;
  let remaining = dt;
  while (remaining > 1e-9 && (s.status === 'cooking' || s.status === 'cooling')) {
    const h = Math.min(MAX_SUBSTEP, remaining);
    s = substep(s, clamp01(stir), h);
    remaining -= h;
  }
  return s;
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
