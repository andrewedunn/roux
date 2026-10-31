// ABOUTME: Game flow and wiring: title → three rounds (countdown → cooking → cooling → result) → menu summary.
// ABOUTME: Owns the frame loop, stirring input, the speed meter, captions, result sheets, and sharing.
import { createCook, stepCook, dropTrinity, canDrop, stirScore, STIR_TO_UNLOCK } from './cook.js';
import { createStir, stirMove, stirRelease, stirTick } from './stir.js';
import { createMenu, TIERS } from './menu.js';
import { createPace, paceOf, METER_MAX } from './pace.js';
import { scoreDish, menuVerdict, stirVerdict } from './score.js';
import { STAGES, rouxColor, smellAt } from './roux.js';
import { shareText, menuFromLink } from './share.js';
import { createStore } from './store.js';
import { createPotRenderer } from './render.js';
import { createSound } from './audio.js';

const $ = (id) => document.getElementById(id);
const els = {
  title: $('title'),
  stages: $('stages'),
  intro: $('intro'),
  menuLabel: $('menu-label'),
  start: $('start'),
  kitchen: $('kitchen'),
  topbar: document.querySelector('.topbar'),
  ticket: $('ticket'),
  controls: $('controls'),
  announce: $('announce'),
  progress: $('progress'),
  mute: $('mute'),
  chip: $('chip'),
  dish: $('dish'),
  target: $('target'),
  stove: $('stove'),
  canvas: $('pot'),
  countdown: $('countdown'),
  meter: $('meter'),
  meterBand: $('meter-band'),
  meterNeedle: $('meter-needle'),
  rounds: $('rounds'),
  caption: $('caption'),
  action: $('action'),
  sheet: $('sheet'),
};

const renderer = createPotRenderer(els.canvas);
const sound = createSound();
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const KEY_SPIN = 1.6; // rad/s of swirl per unit of keyboard stir speed
const SWIRL_FOLLOW = 0.55; // the roux turns a bit slower than the spoon
const RESULT_DELAY = 450; // ms between the pot settling and the result sheet
const COUNT_STEP = 0.8; // seconds per beat of the 3…2…1 countdown
const COUNT_WORDS = ['3', '2', '1', 'Fire!'];
const COUNT_LEAD = 0.45; // seconds before "3" so the title or result sheet can clear first
// Keyboard stirring is a rhythm: each tap of S is a stroke, and tapping faster stirs faster.
const TAP_TO_SPEED = 1.4; // pot radii per second of stir speed per tap per second
const TAP_WINDOW = 1.5; // seconds of recent taps used to judge the rhythm
const TAP_TIMEOUT = 1.0; // seconds without a tap before the spoon stops
const TAP_SMOOTHING = 0.15; // seconds; keeps the needle steady between taps

function deviceStorage() {
  try {
    return window.localStorage;
  } catch {
    return undefined;
  }
}

const store = createStore(deviceStorage());
// A shared link (?m=…) opens the same three dishes the sender cooked.
const linkedSeed = menuFromLink(window.location.search);

let game = null; // { seed, menu, index, results }
let round = null; // one dish in progress
let hasStirred = false;
let keyStirring = false;
let keyTaps = []; // recent S taps, in seconds
let keySpeed = 0;
let lastFrame = null;

// Browsers refuse vibration until the page has had a real tap.
const vibrate = (pattern) => {
  if (navigator.userActivation?.hasBeenActive === false) return;
  navigator.vibrate?.(pattern);
};

// --- Flow -------------------------------------------------------------------

const randomSeed = () => (Math.random() * 2 ** 32) >>> 0;
const totalOf = (dishes) => dishes.reduce((sum, d) => sum + d.score, 0);

// Credit and link back to the published recipe (or story) the dish's roux color comes from.
function sourceLink({ credit, url, kind }) {
  const label = kind === 'story' ? 'Read more' : 'Get the recipe';
  return `${label}: <a href="${url}" target="_blank" rel="noopener">${credit}</a>`;
}

function startMenu(seed) {
  game = { seed, menu: createMenu(seed), index: 0, results: [] };
  startDish();
}

function startDish() {
  const dish = game.menu[game.index];
  round = {
    dish,
    phase: 'countdown',
    countAt: null, // set on the first frame, so the countdown starts once the dish is on screen
    countShown: -1,
    pace: createPace(game.seed, game.index),
    cook: createCook(),
    stir: createStir(),
    swirl: 0,
    trail: [],
    spoon: null,
    pointerId: null,
  };
  renderer.reset();
  els.progress.textContent = `Round ${game.index + 1} of ${game.menu.length}`;
  els.chip.style.background = rouxColor(dish.target);
  els.dish.textContent = dish.dish;
  els.target.textContent = `${dish.stage.name} roux`;
  els.countdown.textContent = '';
  els.countdown.className = 'countdown';
  closeSheet();
  setAction('Get ready…', 'wait');
}

// 3…2…1…Fire! The burner lights itself on "Fire!", so nobody has to find a button to start cooking.
function updateCountdown(now) {
  if (round.countAt === null) {
    if (round.phase === 'countdown') round.countAt = now + COUNT_LEAD;
    else return;
  }
  const step = Math.floor((now - round.countAt) / COUNT_STEP);
  if (step < 0 || step === round.countShown) return;
  round.countShown = step;
  if (step >= COUNT_WORDS.length) {
    els.countdown.textContent = '';
    els.countdown.className = 'countdown';
    return;
  }
  els.countdown.textContent = COUNT_WORDS[step];
  // Restart the pop animation for each beat.
  els.countdown.className = 'countdown';
  void els.countdown.offsetWidth;
  els.countdown.className = `countdown show${step === COUNT_WORDS.length - 1 ? ' fire' : ''}`;
  if (step === COUNT_WORDS.length - 1) ignite();
  else sound.beep();
}

function ignite() {
  round.phase = 'cooking';
  round.unlocked = false;
  sound.ignite();
  sound.beep(true);
  vibrate(20);
  setAction('Stir first', 'locked');
}

// While a sheet is up, the kitchen behind it is out of reach for Tab and screen readers.
const behindSheet = () => [els.topbar, els.ticket, els.stove, els.caption, els.controls];

function openSheet(announcement) {
  els.sheet.hidden = false;
  for (const el of behindSheet()) el.inert = true;
  els.announce.textContent = announcement;
}

function closeSheet() {
  els.sheet.hidden = true;
  els.sheet.innerHTML = '';
  for (const el of behindSheet()) el.inert = false;
}

function setAction(label, kind) {
  els.action.textContent = label;
  els.action.dataset.kind = kind;
  els.action.setAttribute('aria-disabled', kind === 'wait' || kind === 'locked' ? 'true' : 'false');
  els.action.style.setProperty('--progress', '0');
}

// After lighting, the button stays locked (and fills up) until the roux has been stirred for a bit,
// so nobody taps "Drop the trinity" just because it appeared.
function updateLock() {
  if (round.phase !== 'cooking' || round.unlocked) return;
  if (canDrop(round.cook)) {
    round.unlocked = true;
    setAction('Drop the trinity', 'trinity');
  } else {
    els.action.style.setProperty('--progress', String(Math.min(1, round.cook.stirredFor / STIR_TO_UNLOCK)));
  }
}

function onAction() {
  sound.unlock();
  if (round.phase === 'cooking' && canDrop(round.cook)) {
    round.cook = dropTrinity(round.cook);
    round.phase = 'cooling';
    renderer.dropTrinity(performance.now() / 1000);
    sound.trinity();
    vibrate(25);
    setAction('Still cooking…', 'wait');
  }
}

function finishDish() {
  round.phase = 'settled';
  if (round.cook.status === 'burnt') vibrate([30, 60, 30]);
  const result = scoreDish(round.dish.target, round.cook);
  const stir = stirScore(round.cook);
  game.results.push({ dish: round.dish, result, stir });
  setAction(result.burnt ? 'Burnt' : 'Done', 'wait');
  setTimeout(() => showResult(result, stir), round.cook.status === 'burnt' ? RESULT_DELAY * 2 : RESULT_DELAY);
}

// The stir score sits under the roux score: how steadily you kept it moving.
const stirLine = (stir, label = 'Stirring') =>
  `<p class="stir-line">${label} <strong>${stir}</strong>/100 · ${stirVerdict(stir)}</p>`;

function showResult(r, stir) {
  round.phase = 'result';
  const last = game.index === game.menu.length - 1;
  els.sheet.innerHTML = `
    <div class="swatches">
      <figure><div class="swatch" style="background:${r.targetHex}"></div><figcaption>Target</figcaption></figure>
      <figure><div class="swatch${r.speckPenalty || r.burnt ? ' specked' : ''}" style="background-color:${r.finalHex}"></div><figcaption>Yours</figcaption></figure>
    </div>
    <p class="score" aria-hidden="true"><span class="num">${reduceMotion ? r.score : 0}</span><span class="of">/100</span></p>
    <p class="verdict">${r.verdict}</p>
    <p class="tip">${r.tip}</p>
    ${stirLine(stir)}
    ${r.speckPenalty ? `<p class="penalty">−${r.speckPenalty} for scorched flecks</p>` : ''}
    ${r.splashPenalty ? `<p class="penalty">−${r.splashPenalty} for splashing it on the stove</p>` : ''}
    <p class="source">${sourceLink(round.dish.source)}</p>
    <button type="button" class="action" id="next">${last ? 'See your menu' : `On to round ${game.index + 2}`}</button>`;
  openSheet(`${r.score} out of 100. ${r.verdict} ${r.tip} Stirring ${stir} out of 100.`);
  countUp(els.sheet.querySelector('.num'), r.score);
  sound.result(r.score, r.burnt);
  const next = $('next');
  next.addEventListener(
    'click',
    () => {
      sound.click();
      if (last) finishMenu();
      else {
        game.index += 1;
        startDish();
      }
    },
    { once: true },
  );
  next.focus({ preventScroll: true });
}

function finishMenu() {
  const dishes = game.results.map(({ dish, result, stir }) => ({
    dish: dish.dish,
    stage: dish.stage.name,
    source: dish.source,
    targetHex: result.targetHex,
    finalHex: result.finalHex,
    score: result.score,
    burnt: result.burnt,
    stir,
  }));
  store.markPlayed();
  showSummary(game.seed, dishes);
}

// dishes: [{ dish, stage, source, targetHex, finalHex, score, burnt, stir }]
function showSummary(seed, dishes) {
  const total = totalOf(dishes);
  const rows = dishes
    .map(
      (d) => `
      <li>
        <span class="pair"><i style="background:${d.targetHex}"></i><i style="background:${d.finalHex}"></i></span>
        <span class="row-name"><a href="${d.source.url}" target="_blank" rel="noopener">${d.dish}</a><small>${d.stage} roux${d.burnt ? ' · burnt' : ''}</small></span>
        <span class="row-pts">${d.score}</span>
      </li>`,
    )
    .join('');
  const verdict = menuVerdict(total);
  const stir = Math.round(dishes.reduce((sum, d) => sum + d.stir, 0) / dishes.length);
  els.sheet.innerHTML = `
    <h2 class="menu-title">Your menu</h2>
    <ol class="menu-rows">${rows}</ol>
    <p class="score" aria-hidden="true"><span class="num">${reduceMotion ? total : 0}</span><span class="of">/${dishes.length * 100}</span></p>
    <p class="verdict">${verdict}</p>
    ${stirLine(stir, 'Stirring, on average,')}
    <div class="sheet-actions">
      <button type="button" class="action" id="share">Share</button>
      <button type="button" class="secondary" id="again">Cook another menu</button>
    </div>`;
  openSheet(`${total} out of ${dishes.length * 100}. ${verdict} Stirring ${stir} out of 100.`);
  countUp(els.sheet.querySelector('.num'), total);
  const shareButton = $('share');
  shareButton.addEventListener('click', () => shareMenu(seed, dishes, shareButton));
  $('again').addEventListener(
    'click',
    () => {
      sound.click();
      startMenu(randomSeed());
    },
    { once: true },
  );
  shareButton.focus({ preventScroll: true });
}

async function shareMenu(seed, dishes, button) {
  sound.click();
  const text = shareText({ seed, dishes, origin: window.location.origin });
  if (navigator.share) {
    try {
      await navigator.share({ text });
      return;
    } catch (err) {
      if (err.name === 'AbortError') return;
    }
  }
  try {
    await navigator.clipboard.writeText(text);
    const label = button.textContent;
    button.textContent = 'Copied';
    setTimeout(() => {
      button.textContent = label;
    }, 1800);
  } catch {
    showShareText(text);
  }
}

// Last resort when neither the share sheet nor the clipboard is available: show the text to copy by hand.
function showShareText(text) {
  if (els.sheet.querySelector('.share-text')) return;
  const box = document.createElement('textarea');
  box.className = 'share-text';
  box.readOnly = true;
  box.rows = 5;
  box.value = text;
  box.setAttribute('aria-label', 'Your results to copy');
  els.sheet.querySelector('.sheet-actions').before(box);
  box.select();
}

function countUp(el, value) {
  if (reduceMotion || value === 0) {
    el.textContent = value;
    return;
  }
  // Reserve the final number's width so the "/100" beside it doesn't slide while counting.
  el.textContent = value;
  el.style.minWidth = `${el.getBoundingClientRect().width}px`;
  el.textContent = 0;
  const start = performance.now();
  const duration = 650;
  const tick = (now) => {
    const t = Math.min(1, (now - start) / duration);
    el.textContent = Math.round(value * (1 - (1 - t) ** 3));
    if (t < 1) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

// --- Captions ---------------------------------------------------------------

let captionShown = '';

function updateCaption(pace, stirLevel) {
  const { phase, cook } = round;
  let text = '';
  let tone = '';
  if (phase === 'countdown') {
    text = hasStirred ? 'Burner’s coming on…' : 'Try stirring in circles.';
  } else if (phase === 'cooking') {
    if (cook.stick > 0.3) {
      text = 'It’s catching. Stir!';
      tone = 'alarm';
    } else if (pace > 0.3) {
      text = 'Easy! It’s splashing.';
      tone = 'warn';
    } else if (cook.stick > 0.08) {
      text = 'Starting to stick. Stir.';
      tone = 'warn';
    } else if (pace < -0.3 && stirLevel > 0.3) {
      text = 'Faster! Keep up.';
      tone = 'warn';
    } else if (!round.unlocked) {
      text = 'Stir to get it going.';
    } else {
      text = smellAt(cook.browning);
    }
  } else if (phase === 'cooling') {
    text = 'Still darkening…';
  } else if (cook.status === 'burnt') {
    text = cook.burnReason === 'scorched' ? 'Scorched on the bottom.' : 'Smells burnt.';
    tone = 'warn';
  } else {
    text = 'Done.';
  }
  const key = `${tone}|${text}`;
  if (key === captionShown) return;
  captionShown = key;
  els.caption.textContent = text;
  els.caption.className = `caption ${tone}`;
}

// --- Speed meter ------------------------------------------------------------

let meterShown = '';

function updateMeter(speed, band, pace) {
  const { phase, cook } = round;
  const live = phase === 'cooking';
  let state = 'idle';
  if (live) state = pace > 0.05 ? 'fast' : pace < -0.05 ? 'slow' : 'on';
  else if (phase !== 'countdown') state = 'off';
  const moving = live && round.pace.moving(cook.cookedFor);
  const pct = (v) => `${(100 * Math.max(0, Math.min(1, v / METER_MAX))).toFixed(2)}%`;
  els.meter.style.setProperty('--lo', pct(band.lo));
  els.meter.style.setProperty('--hi', pct(band.hi));
  els.meter.style.setProperty('--needle', pct(speed));
  const key = `${state}|${moving}`;
  if (key === meterShown) return;
  meterShown = key;
  els.meter.dataset.state = state;
  els.meter.toggleAttribute('data-moving', moving && !reduceMotion);
}

// --- Frame loop -------------------------------------------------------------

function frame(ms) {
  const now = ms / 1000;
  const dt = lastFrame === null ? 0 : Math.min(0.1, now - lastFrame);
  lastFrame = now;

  if (round) {
    round.stir = stirTick(round.stir, now);
    updateKeyStir(now, dt);
    const stirLevel = keyStirring ? 1 : round.stir.activity;
    const spin = keyStirring ? keySpeed * KEY_SPIN : round.stir.spin;
    round.swirl += spin * SWIRL_FOLLOW * dt;
    if (keyStirring && round.pointerId === null) {
      const { cx, cy, R } = renderer.geometry();
      const a = round.swirl * 2.2;
      round.spoon = { x: cx + Math.cos(a) * R * 0.5, y: cy + Math.sin(a) * R * 0.5, t: now };
      round.trail.push(round.spoon);
    }
    round.trail = round.trail.filter((p) => now - p.t < 0.35);

    updateCountdown(now);
    const speed = keyStirring ? keySpeed : round.stir.speed;
    const band = round.pace.band(round.cook.cookedFor);
    const pace = round.phase === 'cooking' ? paceOf(speed, band) : 0;

    if (round.phase === 'cooking' || round.phase === 'cooling') {
      const specksBefore = Math.floor(round.cook.specks);
      const splashesBefore = Math.floor(round.cook.splashes);
      round.cook = stepCook(round.cook, { stir: stirLevel, pace }, dt);
      if (Math.floor(round.cook.specks) > specksBefore) vibrate(12);
      if (Math.floor(round.cook.splashes) > splashesBefore) {
        sound.splash();
        vibrate(15);
      }
      if (round.cook.status === 'done' || round.cook.status === 'burnt') finishDish();
      updateLock();
    }

    const { cook, phase } = round;
    const sizzling = phase === 'cooking' || phase === 'cooling';
    sound.update({ temp: cook.temp, stir: stirLevel, stick: cook.stick, sizzling }, dt);
    renderer.draw(
      {
        color: rouxColor(cook.browning),
        temp: cook.temp,
        burnerOn: phase === 'cooking',
        active: sizzling,
        stick: phase === 'cooking' ? cook.stick : 0,
        specks: cook.specks,
        splashes: cook.splashes,
        swirl: round.swirl,
        stirActivity: stirLevel,
        spoon: round.spoon,
        trail: round.trail,
        burnt: cook.status === 'burnt',
        hint: (phase === 'countdown' && !hasStirred) || (phase === 'cooking' && !round.unlocked && stirLevel < 0.3),
      },
      now,
      dt,
    );
    updateMeter(speed, band, pace);
    updateCaption(pace, stirLevel);
  }
  requestAnimationFrame(frame);
}

// --- Input ------------------------------------------------------------------

function potPoint(e) {
  const rect = els.canvas.getBoundingClientRect();
  return { x: e.clientX - rect.left, y: e.clientY - rect.top, t: e.timeStamp / 1000 };
}

function stirTo(point) {
  const { cx, cy, R } = renderer.geometry();
  round.stir = stirMove(round.stir, point, { cx, cy, r: R });
  round.spoon = point;
  round.trail.push(point);
  if (round.stir.activity > 0.4) hasStirred = true;
}

els.canvas.addEventListener('pointerdown', (e) => {
  if (!round || round.pointerId !== null) return;
  const p = potPoint(e);
  const { cx, cy, Rw } = renderer.geometry();
  if (Math.hypot(p.x - cx, p.y - cy) > Rw * 1.1) return;
  e.preventDefault();
  sound.unlock();
  round.pointerId = e.pointerId;
  els.canvas.setPointerCapture(e.pointerId);
  stirTo(p);
});

els.canvas.addEventListener('pointermove', (e) => {
  if (!round || e.pointerId !== round.pointerId) return;
  const events = e.getCoalescedEvents ? e.getCoalescedEvents() : [e];
  for (const ce of events.length ? events : [e]) stirTo(potPoint(ce));
});

function endStir(e) {
  if (!round || e.pointerId !== round.pointerId) return;
  round.pointerId = null;
  round.spoon = null;
  round.stir = stirRelease(round.stir);
}
els.canvas.addEventListener('pointerup', endStir);
els.canvas.addEventListener('pointercancel', endStir);
els.canvas.addEventListener('lostpointercapture', endStir);

window.addEventListener('keydown', (e) => {
  if ((e.key === 's' || e.key === 'S') && !e.repeat && round) {
    keyTaps.push(e.timeStamp / 1000);
    hasStirred = true;
  }
});

// Stir speed from the tap rhythm. A pause stretches the interval, so the needle sinks as you slow down.
function updateKeyStir(now, dt) {
  keyTaps = keyTaps.filter((t) => now - t < TAP_WINDOW);
  const last = keyTaps[keyTaps.length - 1];
  let target = 0;
  if (keyTaps.length >= 2 && now - last < TAP_TIMEOUT) {
    const interval = Math.max((last - keyTaps[0]) / (keyTaps.length - 1), now - last);
    target = Math.min(METER_MAX, TAP_TO_SPEED / interval);
  }
  keySpeed = target + (keySpeed - target) * Math.exp(-dt / TAP_SMOOTHING);
  const wasStirring = keyStirring;
  keyStirring = target > 0;
  if (wasStirring && !keyStirring && round.pointerId === null) round.spoon = null;
}

window.addEventListener('blur', () => {
  keyTaps = [];
});


els.action.addEventListener('click', onAction);

els.mute.setAttribute('aria-pressed', String(sound.isMuted()));
els.mute.addEventListener('click', () => {
  sound.unlock();
  sound.setMuted(!sound.isMuted());
  els.mute.setAttribute('aria-pressed', String(sound.isMuted()));
  els.mute.setAttribute('aria-label', sound.isMuted() ? 'Unmute sound' : 'Mute sound');
});

// --- Title card -------------------------------------------------------------

function setupTitle() {
  els.intro.hidden = store.hasPlayed();
  els.menuLabel.hidden = linkedSeed == null;
  els.menuLabel.textContent = 'Someone shared their menu. Cook the same three dishes.';
  els.start.textContent = linkedSeed == null ? 'Start cooking' : 'Cook this menu';
}

// Nothing in the kitchen is reachable (or started) until the player leaves the title card.
els.start.addEventListener('click', () => {
  sound.unlock();
  sound.click();
  startMenu(linkedSeed ?? randomSeed());
  els.title.classList.add('gone');
  els.title.inert = true;
  els.kitchen.inert = false;
  els.action.focus({ preventScroll: true });
});

new ResizeObserver(([entry]) => {
  const { width, height } = entry.contentRect;
  renderer.resize(width, height);
}).observe(els.stove);

els.stages.innerHTML = STAGES.map((s) => `<i style="background:${s.hex}"></i>`).join('');
// Each round's chip runs through the shades that round can ask for.
els.rounds.querySelectorAll('.round-chip').forEach((chip, i) => {
  const hexes = STAGES.filter((s) => TIERS[i].stages.includes(s.name)).map((s) => s.hex);
  chip.style.background = `linear-gradient(135deg, ${hexes.join(', ')})`;
});

setupTitle();
requestAnimationFrame(frame);
