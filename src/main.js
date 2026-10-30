// ABOUTME: Game flow and wiring: title → three dishes (ready → cooking → cooling → result) → menu summary.
// ABOUTME: Owns the frame loop, stirring input, captions, result sheets, and sharing. Crystal edition adds a shake step.
import { createCook, stepCook, dropTrinity, canDrop, stirScore, STIR_TO_UNLOCK } from './cook.js';
import { createStir, stirMove, stirRelease, stirTick } from './stir.js';
import { createMenu } from './menu.js';
import { scoreDish, menuVerdict, stirVerdict } from './score.js';
import { STAGES, rouxColor, smellAt } from './roux.js';
import { shareText, menuFromLink } from './share.js';
import { createStore } from './store.js';
import { createPotRenderer } from './render.js';
import { createSound } from './audio.js';
import { CRYSTAL, dashVerdict, menuDashLine, crystalCaption } from './brand.js';

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
  caption: $('caption'),
  action: $('action'),
  serve: $('serve'),
  stamp: $('stamp'),
  sheet: $('sheet'),
};

const renderer = createPotRenderer(els.canvas);
const sound = createSound();
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const KEYBOARD_SPIN = 6; // rad/s swirl when stirring with the S key
const SWIRL_FOLLOW = 0.55; // the roux turns a bit slower than the spoon
const RESULT_DELAY = 450; // ms between the pot settling and the result sheet

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
  els.stamp.hidden = !dish.crystal;
  els.serve.hidden = true;
  closeSheet();
  setAction('Light the burner', 'light');
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
  if (round.phase === 'ready') {
    round.phase = 'cooking';
    round.unlocked = false;
    sound.ignite();
    setAction('Stir first', 'locked');
  } else if (round.phase === 'crystal') {
    round.dashes += 1;
    renderer.shake(performance.now() / 1000);
    sound.dash();
    vibrate(15);
    setAction(`Another dash · ${round.dashes}`, 'crystal');
    if (round.dashes === 1) {
      els.serve.hidden = false;
    }
  } else if (round.phase === 'cooking' && canDrop(round.cook)) {
    round.cook = dropTrinity(round.cook);
    round.phase = 'cooling';
    renderer.dropTrinity(performance.now() / 1000);
    sound.trinity();
    vibrate(25);
    setAction('Still cooking…', 'wait');
  }
}

// The roux is scored the moment it settles. Then the Crystal comes out: shake in as many dashes as you like.
function finishDish() {
  round.phase = 'settled';
  if (round.cook.status === 'burnt') vibrate([30, 60, 30]);
  round.scored = { result: scoreDish(round.dish.target, round.cook), stir: stirScore(round.cook) };
  setAction(round.scored.result.burnt ? 'Burnt' : 'Done', 'wait');
  setTimeout(bringCrystal, round.cook.status === 'burnt' ? RESULT_DELAY * 2 : RESULT_DELAY);
}

function bringCrystal() {
  round.phase = 'crystal';
  round.dashes = 0;
  renderer.showBottle(performance.now() / 1000);
  setAction('Shake in the Crystal', 'crystal');
  els.action.focus({ preventScroll: true });
}

function serveDish() {
  if (round.phase !== 'crystal') return;
  sound.click();
  round.phase = 'served';
  els.serve.hidden = true;
  const { result, stir } = round.scored;
  game.results.push({ dish: round.dish, result, stir, dashes: round.dashes });
  setAction('Served', 'wait');
  setTimeout(() => showResult(result, stir, round.dashes), RESULT_DELAY);
}

// The stir score sits under the roux score: how steadily you kept it moving.
const stirLine = (stir, label = 'Stirring') =>
  `<p class="stir-line">${label} <strong>${stir}</strong>/100 · ${stirVerdict(stir)}</p>`;

// A little Crystal bottle for the sheets, drawn from the shared symbol in index.html.
const bottleIcon = '<svg class="bottle-icon" aria-hidden="true"><use href="#crystal-bottle"></use></svg>';

const dashLine = (dashes) => `
  <div class="crystal-line">
    ${bottleIcon}
    <p><strong>${dashes} dash${dashes === 1 ? '' : 'es'} of Crystal</strong><span>${dashVerdict(dashes)}</span></p>
  </div>`;

function showResult(r, stir, dashes) {
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
    ${dashLine(dashes)}
    <p class="source">${round.dish.crystal ? '<span class="kitchen-tag">Crystal Kitchen</span> ' : ''}${sourceLink(round.dish.source)}</p>
    <button type="button" class="action" id="next">${last ? 'See your menu' : 'Next dish'}</button>`;
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
  const dishes = game.results.map(({ dish, result, stir, dashes }) => ({
    dish: dish.dish,
    stage: dish.stage.name,
    source: dish.source,
    targetHex: result.targetHex,
    finalHex: result.finalHex,
    score: result.score,
    burnt: result.burnt,
    stir,
    dashes,
    crystal: dish.crystal,
  }));
  store.markPlayed();
  showSummary(game.seed, dishes);
}

// dishes: [{ dish, stage, source, targetHex, finalHex, score, burnt, stir, dashes, crystal }]
function showSummary(seed, dishes) {
  const total = totalOf(dishes);
  const rows = dishes
    .map(
      (d) => `
      <li>
        <span class="pair"><i style="background:${d.targetHex}"></i><i style="background:${d.finalHex}"></i></span>
        <span class="row-name"><a href="${d.source.url}" target="_blank" rel="noopener">${d.dish}</a><small>${d.stage} roux${d.burnt ? ' · burnt' : ''} · ${d.dashes} 🌶️${d.crystal ? ' · Crystal Kitchen' : ''}</small></span>
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
    <div class="crystal-line">
      ${bottleIcon}
      <p><strong>${menuDashLine(dishes.reduce((sum, d) => sum + d.dashes, 0))}</strong><span>${CRYSTAL.tagline}</span></p>
    </div>
    <div class="sheet-actions">
      <button type="button" class="action" id="share">Share</button>
      <a class="shop" href="${CRYSTAL.shop}" target="_blank" rel="noopener">Get Crystal for your kitchen</a>
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

function updateCaption() {
  const { phase, cook } = round;
  let text = '';
  let tone = '';
  if (phase === 'ready') {
    text = hasStirred ? 'Light it when you’re ready.' : 'Try stirring in circles.';
  } else if (phase === 'cooking') {
    if (cook.stick > 0.3) {
      text = 'It’s catching. Stir!';
      tone = 'alarm';
    } else if (cook.stick > 0.08) {
      text = 'Starting to stick. Stir.';
      tone = 'warn';
    } else if (!round.unlocked) {
      text = 'Stir to get it going.';
    } else {
      text = smellAt(cook.browning);
    }
  } else if (phase === 'cooling') {
    text = 'Still darkening…';
  } else if (phase === 'crystal' || phase === 'served') {
    text = crystalCaption(round.dashes, cook.status === 'burnt');
    tone = cook.status === 'burnt' ? 'warn' : 'brand';
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
      round.cook = stepCook(round.cook, { stir: stirLevel }, dt);
      if (Math.floor(round.cook.specks) > specksBefore) vibrate(12);
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
        swirl: round.swirl,
        stirActivity: stirLevel,
        spoon: round.spoon,
        trail: round.trail,
        burnt: cook.status === 'burnt',
        hint: (phase === 'ready' && !hasStirred) || (phase === 'cooking' && !round.unlocked && stirLevel < 0.3),
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
  if ((e.key === 'c' || e.key === 'C') && !e.repeat && round?.phase === 'crystal') onAction();
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


els.action.addEventListener('click', onAction);
els.serve.addEventListener('click', serveDish);

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

setupTitle();
requestAnimationFrame(frame);
