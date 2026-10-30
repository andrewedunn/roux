// ABOUTME: Procedural kitchen sound with Web Audio: sizzle bed, crackles, spoon scrape, trinity hiss, result tones.
// ABOUTME: The context is created on the first tap (iOS requires a user gesture); calls are no-ops before that.

const MUTE_KEY = 'roux-wars:muted';

function readMuted() {
  try {
    return localStorage.getItem(MUTE_KEY) === '1';
  } catch {
    return false;
  }
}

function writeMuted(muted) {
  try {
    localStorage.setItem(MUTE_KEY, muted ? '1' : '0');
  } catch {
    // Storage can be unavailable (private mode); muting still works for this visit.
  }
}

function makeNoise(ctx, seconds) {
  const buffer = ctx.createBuffer(1, ctx.sampleRate * seconds, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  return buffer;
}

export function createSound() {
  let ctx = null;
  let noise = null;
  let master = null;
  let sizzleGain = null;
  let sizzleFilter = null;
  let scrapeGain = null;
  let muted = readMuted();

  function loopNoise(filterType, frequency) {
    const src = ctx.createBufferSource();
    src.buffer = noise;
    src.loop = true;
    const filter = ctx.createBiquadFilter();
    filter.type = filterType;
    filter.frequency.value = frequency;
    const gain = ctx.createGain();
    gain.gain.value = 0;
    src.connect(filter).connect(gain).connect(master);
    src.start(0, Math.random() * 1.5);
    return { filter, gain };
  }

  function unlock() {
    if (ctx) {
      if (ctx.state === 'suspended') ctx.resume();
      return;
    }
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    ctx = new AudioCtx();
    noise = makeNoise(ctx, 2);
    master = ctx.createGain();
    master.gain.value = muted ? 0 : 1;
    master.connect(ctx.destination);
    ({ filter: sizzleFilter, gain: sizzleGain } = loopNoise('highpass', 2500));
    ({ gain: scrapeGain } = loopNoise('lowpass', 650));
  }

  function burst({ at, duration, type, frequency, q = 1, peak }) {
    const src = ctx.createBufferSource();
    src.buffer = noise;
    const filter = ctx.createBiquadFilter();
    filter.type = type;
    filter.frequency.value = frequency;
    filter.Q.value = q;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, at);
    gain.gain.exponentialRampToValueAtTime(peak, at + 0.004);
    gain.gain.exponentialRampToValueAtTime(0.0001, at + duration);
    src.connect(filter).connect(gain).connect(master);
    src.start(at, Math.random() * 1.8, duration + 0.02);
  }

  function crackle(at, loudness = 1) {
    burst({
      at,
      duration: 0.012 + Math.random() * 0.03,
      type: 'bandpass',
      frequency: 2200 + Math.random() * 4200,
      q: 1.4,
      peak: (0.04 + Math.random() * 0.16) * loudness,
    });
  }

  function tone(freq, at, duration, peak, type = 'sine') {
    const osc = ctx.createOscillator();
    osc.type = type;
    osc.frequency.value = freq;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, at);
    gain.gain.exponentialRampToValueAtTime(peak, at + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, at + duration);
    osc.connect(gain).connect(master);
    osc.start(at);
    osc.stop(at + duration + 0.05);
  }

  // state: { temp 0..1, stir 0..1, stick 0..1, sizzling bool }, dt in seconds.
  function update({ temp, stir, stick, sizzling }, dt) {
    if (!ctx) return;
    const t = ctx.currentTime;
    sizzleGain.gain.setTargetAtTime(sizzling ? 0.02 + 0.1 * temp ** 1.5 : 0, t, 0.2);
    sizzleFilter.frequency.setTargetAtTime(1800 + 2600 * temp, t, 0.25);
    scrapeGain.gain.setTargetAtTime(0.16 * stir, t, 0.05);
    const cracklesPerSecond = sizzling ? 1 + 12 * temp ** 2 + 26 * stick : 0;
    if (Math.random() < cracklesPerSecond * dt) crackle(t + Math.random() * 0.01, 0.6 + stick);
  }

  function ignite() {
    if (!ctx) return;
    const t = ctx.currentTime;
    burst({ at: t, duration: 0.35, type: 'bandpass', frequency: 900, q: 0.7, peak: 0.25 });
    tone(70, t, 0.25, 0.12, 'triangle');
  }

  function trinity() {
    if (!ctx) return;
    const t = ctx.currentTime;
    const src = ctx.createBufferSource();
    src.buffer = noise;
    src.loop = true;
    const filter = ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = 1400;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(0.5, t + 0.03);
    gain.gain.exponentialRampToValueAtTime(0.09, t + 1.1);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 3);
    src.connect(filter).connect(gain).connect(master);
    src.start(t);
    src.stop(t + 3.1);
    tone(95, t, 0.18, 0.2, 'sine');
    for (let i = 0; i < 18; i++) crackle(t + Math.random() * 0.9, 1.4);
  }

  // A shake of the Crystal bottle: a glassy shk, then the drops spitting into hot roux.
  function dash() {
    if (!ctx) return;
    const t = ctx.currentTime;
    burst({ at: t, duration: 0.07, type: 'bandpass', frequency: 2600, q: 1.4, peak: 0.22 });
    tone(1320, t, 0.06, 0.03, 'triangle');
    for (let i = 0; i < 4; i++) crackle(t + 0.1 + Math.random() * 0.12, 0.9);
  }

  function click() {
    if (!ctx) return;
    burst({ at: ctx.currentTime, duration: 0.03, type: 'bandpass', frequency: 3000, q: 3, peak: 0.12 });
  }

  function result(score, burnt) {
    if (!ctx) return;
    const t = ctx.currentTime + 0.05;
    if (burnt) {
      tone(147, t, 0.5, 0.18, 'triangle');
      tone(110, t + 0.22, 0.7, 0.18, 'triangle');
    } else if (score >= 85) {
      tone(660, t, 0.35, 0.14);
      tone(990, t + 0.12, 0.5, 0.12);
    } else {
      tone(523, t, 0.4, 0.12);
    }
  }

  function setMuted(value) {
    muted = value;
    writeMuted(muted);
    if (master) master.gain.setTargetAtTime(muted ? 0 : 1, ctx.currentTime, 0.02);
  }

  return { unlock, update, ignite, trinity, dash, click, result, setMuted, isMuted: () => muted };
}
