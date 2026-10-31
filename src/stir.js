// ABOUTME: Turns finger movement in the pot into stir activity (0..1) for the sim and a signed spin for the swirl.
// ABOUTME: Also tracks raw stir speed (pot radii per second) for the speed meter.

const FULL_SPEED = 1.5; // pot radii per second of finger travel counts as full stirring
const ATTACK = 0.08; // seconds for activity to rise toward the current speed
const RELEASE = 0.6; // seconds for activity to fade when the finger slows or stops
const SPIN_SMOOTHING = 0.15;
const SPEED_SMOOTHING = 0.2; // seconds; keeps the meter's needle from jittering with each finger event
const STILL_AFTER = 0.06; // seconds without movement before we treat the finger as still
const CENTER_DEADZONE = 0.15; // angle is too noisy this close to the middle of the pot

function approach(current, target, dt, tau) {
  return target + (current - target) * Math.exp(-dt / tau);
}

function wrapAngle(a) {
  return Math.atan2(Math.sin(a), Math.cos(a));
}

export function createStir() {
  return { activity: 0, spin: 0, speed: 0, last: null, lastMoveTime: -Infinity };
}

// point: { x, y, t } with t in seconds; pot: { cx, cy, r } in the same units as x/y.
export function stirMove(state, point, pot) {
  const { last } = state;
  if (!last) return { ...state, last: point, lastMoveTime: point.t };
  const dt = point.t - last.t;
  if (dt <= 0) return state;

  const speed = Math.hypot(point.x - last.x, point.y - last.y) / pot.r / dt;
  const target = Math.min(1, speed / FULL_SPEED);
  const activity = approach(state.activity, target, dt, target > state.activity ? ATTACK : RELEASE);
  const smoothed = approach(state.speed ?? 0, speed, dt, SPEED_SMOOTHING);

  const fromCenter = Math.hypot(point.x - pot.cx, point.y - pot.cy) / pot.r;
  let spin = state.spin;
  if (fromCenter > CENTER_DEADZONE) {
    const a0 = Math.atan2(last.y - pot.cy, last.x - pot.cx);
    const a1 = Math.atan2(point.y - pot.cy, point.x - pot.cx);
    spin = approach(spin, wrapAngle(a1 - a0) / dt, dt, SPIN_SMOOTHING);
  }

  return { activity, spin, speed: smoothed, last: point, lastMoveTime: point.t };
}

export function stirRelease(state) {
  return { ...state, last: null };
}

// Called every frame with the current time so stirring fades when the finger is still or lifted.
export function stirTick(state, now) {
  const idleFor = now - state.lastMoveTime;
  if (idleFor <= STILL_AFTER) return state;
  const dt = Math.min(idleFor - STILL_AFTER, now - (state.tickTime ?? now));
  if (dt <= 0) return { ...state, tickTime: now };
  return {
    ...state,
    tickTime: now,
    activity: approach(state.activity, 0, dt, RELEASE),
    speed: approach(state.speed ?? 0, 0, dt, SPEED_SMOOTHING * 2),
    spin: approach(state.spin, 0, dt, RELEASE * 2),
  };
}
