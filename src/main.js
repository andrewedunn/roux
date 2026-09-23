// ABOUTME: Game flow and wiring: title → three dishes (ready → cooking → cooling → result) → menu summary.
// ABOUTME: Owns the frame loop, pointer/keyboard stirring, heat keys, captions, and the result sheets.
import { createCook, stepCook, dropTrinity } from './cook.js';
import { createStir, stirMove, stirRelease, stirTick } from './stir.js';
import { createMenu } from './menu.js';
import { scoreDish, menuVerdict } from './score.js';
import { STAGES, rouxColor, smellAt } from './roux.js';
import { createPotRenderer } from './render.js';
import { createSound } from './audio.js';

const $ = (id) => document.getElementById(id);
const els = {
  title: $('title'),
  stages: $('stages'),
  start: $('start'),
  progress: $('progress'),
  mute: $('mute'),
  chip: $('chip'),
  dish: $('dish'),
  target: $('target'),
  stove: $('stove'),
  canvas: $('pot'),
  caption: $('caption'),
  heat: document.querySelector('.heat'),
  heatKeys: [...document.querySelectorAll('[data-heat]')],
  action: $('action'),
  sheet: $('sheet'),
};

const renderer = createPotRenderer(els.canvas);
const sound = createSound();
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const KEYBOARD_SPIN = 6; // rad/s swirl when stirring with the S key
const SWIRL_FOLLOW = 0.55; // the roux turns a bit slower than the spoon
const RESULT_DELAY = 450; // ms between the pot settling and the result sheet
const ACTION_LOCKOUT = 600; // ms after lighting before the same button can drop the trinity (double-taps)

let game = null; // { menu, index, results }
let round = null; // one dish in progress
let heat = 'med';
let hasStirred = false;
let keyStirring = false;
let lastFrame = null;

const vibrate = (pattern) => navigator.vibrate?.(pattern);

// --- Flow -------------------------------------------------------------------

function newMenu() {
  game = { menu: createMenu((Math.random() * 2 ** 32) >>> 0), index: 0, results: [] };
  startDish();
}

function startDish() {
  const dish = game.menu[game.index];
  round = {
    dish,
    phase: 'ready',
    cook: createCook(),
    stir: createStir(),
    swirl: 0,
    trail: [],
    spoon: null,
    pointerId: null,
  };
  renderer.reset();
  els.progress.textContent = `Dish ${game.index + 1} of ${game.menu.length}`;
  els.chip.style.background = rouxColor(dish.target);
  els.dish.textContent = dish.dish;
  els.target.textContent = `${dish.stage.name} roux`;
  els.sheet.hidden = true;
  els.sheet.innerHTML = '';
  els.heat.classList.remove('off');
  setAction('Light the burner', 'light');
}

function setAction(label, kind) {
  els.action.textContent = label;
  els.action.dataset.kind = kind;
  els.action.setAttribute('aria-disabled', kind === 'wait' ? 'true' : 'false');
}

function onAction() {
  sound.unlock();
  if (round.phase === 'ready') {
    round.phase = 'cooking';
    round.litAt = performance.now();
    sound.ignite();
    setAction('Drop the trinity', 'trinity');
  } else if (round.phase === 'cooking' && performance.now() - round.litAt > ACTION_LOCKOUT) {
    round.cook = dropTrinity(round.cook);
    round.phase = 'cooling';
    renderer.dropTrinity(performance.now() / 1000);
    sound.trinity();
    vibrate(25);
    els.heat.classList.add('off');
    setAction('Still cooking…', 'wait');
  }
}

function finishDish() {
  round.phase = 'settled';
  els.heat.classList.add('off');
  if (round.cook.status === 'burnt') vibrate([30, 60, 30]);
  const result = scoreDish(round.dish.target, round.cook);
  game.results.push({ dish: round.dish, result });
  setAction('Still cooking…', 'wait');
  setTimeout(() => showResult(result), round.cook.status === 'burnt' ? RESULT_DELAY * 2 : RESULT_DELAY);
}

function showResult(r) {
  round.phase = 'result';
  const last = game.index === game.menu.length - 1;
  els.sheet.innerHTML = `
    <div class="swatches">
      <figure><div class="swatch" style="background:${r.targetHex}"></div><figcaption>Target</figcaption></figure>
      <figure><div class="swatch${r.speckPenalty || r.burnt ? ' specked' : ''}" style="background-color:${r.finalHex}"></div><figcaption>Yours</figcaption></figure>
    </div>
    <p class="score"><span class="num">${reduceMotion ? r.score : 0}</span><span class="of">/100</span></p>
    <p class="verdict">${r.verdict}</p>
    <p class="tip">${r.tip}</p>
    ${r.speckPenalty ? `<p class="penalty">−${r.speckPenalty} for scorched bits</p>` : ''}
    <button type="button" class="action" id="next">${last ? 'See your menu' : 'Next dish'}</button>`;
  els.sheet.hidden = false;
  countUp(els.sheet.querySelector('.num'), r.score);
  sound.result(r.score, r.burnt);
  const next = $('next');
  next.addEventListener(
    'click',
    () => {
      sound.click();
      if (last) showSummary();
      else {
        game.index += 1;
        startDish();
      }
    },
    { once: true },
  );
  next.focus({ preventScroll: true });
}

function showSummary() {
  const total = game.results.reduce((sum, { result }) => sum + result.score, 0);
  const rows = game.results
    .map(
      ({ dish, result }) => `
      <li>
        <span class="pair"><i style="background:${result.targetHex}"></i><i style="background:${result.finalHex}"></i></span>
        <span class="row-name">${dish.dish}<small>${dish.stage.name} roux</small></span>
        <span class="row-pts">${result.burnt ? 'Burnt' : result.score}</span>
      </li>`,
    )
    .join('');
  els.sheet.innerHTML = `
    <h2 class="menu-title">Your menu</h2>
    <ol class="menu-rows">${rows}</ol>
    <p class="score"><span class="num">${reduceMotion ? total : 0}</span><span class="of">/${game.menu.length * 100}</span></p>
    <p class="verdict">${menuVerdict(total)}</p>
    <button type="button" class="action" id="again">Cook another menu</button>`;
  countUp(els.sheet.querySelector('.num'), total);
  const again = $('again');
  again.addEventListener(
    'click',
    () => {
      sound.click();
      newMenu();
    },
    { once: true },
  );
  again.focus({ preventScroll: true });
}

function countUp(el, value) {
  if (reduceMotion || value === 0) {
    el.textContent = value;
    return;
  }
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

function updateCaption() {
  const { phase, cook } = round;
  let text = '';
  let tone = '';
  if (phase === 'ready') {
    text = hasStirred ? 'Pick your heat, then light it.' : 'Try stirring in circles.';
  } else if (phase === 'cooking') {
    if (cook.stick > 0.55) {
      text = 'It’s catching on the bottom. Stir!';
      tone = 'alarm';
    } else if (cook.stick > 0.3) {
      text = 'Starting to stick. Keep stirring.';
      tone = 'warn';
    } else {
      text = smellAt(cook.browning);
    }
  } else if (phase === 'cooling') {
    text = 'Trinity’s in. It’s still cooking…';
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

// --- Frame loop -------------------------------------------------------------

function frame(ms) {
  const now = ms / 1000;
  const dt = lastFrame === null ? 0 : Math.min(0.1, now - lastFrame);
  lastFrame = now;

  if (round) {
    round.stir = stirTick(round.stir, now);
    const stirLevel = keyStirring ? 1 : round.stir.activity;
    const spin = keyStirring ? KEYBOARD_SPIN : round.stir.spin;
    round.swirl += spin * SWIRL_FOLLOW * dt;
    if (keyStirring && round.pointerId === null) {
      const { cx, cy, R } = renderer.geometry();
      const a = round.swirl * 2.2;
      round.spoon = { x: cx + Math.cos(a) * R * 0.5, y: cy + Math.sin(a) * R * 0.5, t: now };
      round.trail.push(round.spoon);
    }
    round.trail = round.trail.filter((p) => now - p.t < 0.35);

    if (round.phase === 'cooking' || round.phase === 'cooling') {
      const specksBefore = Math.floor(round.cook.specks);
      round.cook = stepCook(round.cook, { heat, stir: stirLevel }, dt);
      if (Math.floor(round.cook.specks) > specksBefore) vibrate(12);
      if (round.cook.status === 'done' || round.cook.status === 'burnt') finishDish();
    }

    const { cook, phase } = round;
    const sizzling = phase === 'cooking' || phase === 'cooling';
    sound.update({ temp: cook.temp, stir: stirLevel, stick: cook.stick, sizzling }, dt);
    renderer.draw(
      {
        color: rouxColor(cook.browning),
        temp: cook.temp,
        heat,
        burnerOn: phase === 'cooking',
        active: sizzling,
        stick: phase === 'cooking' ? cook.stick : 0,
        specks: cook.specks,
        swirl: round.swirl,
        stirActivity: stirLevel,
        spoon: round.spoon,
        trail: round.trail,
        burnt: cook.status === 'burnt',
        hint: !hasStirred && phase === 'ready',
      },
      now,
      dt,
    );
    updateCaption();
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
    keyStirring = true;
    hasStirred = true;
  }
});
function endKeyStir() {
  keyStirring = false;
  if (round && round.pointerId === null) round.spoon = null;
}
window.addEventListener('keyup', (e) => {
  if (e.key === 's' || e.key === 'S') endKeyStir();
});
window.addEventListener('blur', endKeyStir);

for (const key of els.heatKeys) {
  key.addEventListener('click', () => {
    if (round && (round.phase === 'cooling' || round.phase === 'settled' || round.phase === 'result')) return;
    sound.unlock();
    sound.click();
    heat = key.dataset.heat;
    for (const k of els.heatKeys) k.setAttribute('aria-pressed', String(k === key));
  });
}

els.action.addEventListener('click', onAction);

els.mute.setAttribute('aria-pressed', String(sound.isMuted()));
els.mute.addEventListener('click', () => {
  sound.unlock();
  sound.setMuted(!sound.isMuted());
  els.mute.setAttribute('aria-pressed', String(sound.isMuted()));
  els.mute.setAttribute('aria-label', sound.isMuted() ? 'Unmute sound' : 'Mute sound');
});

els.start.addEventListener('click', () => {
  sound.unlock();
  sound.click();
  els.title.classList.add('gone');
  els.action.focus({ preventScroll: true });
});

new ResizeObserver(([entry]) => {
  const { width, height } = entry.contentRect;
  renderer.resize(width, height);
}).observe(els.stove);

els.stages.innerHTML = STAGES.map((s) => `<i style="background:${s.hex}"></i>`).join('');

newMenu();
requestAnimationFrame(frame);
