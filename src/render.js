// ABOUTME: Draws the pot top-down on a canvas: burner flames, enamel pot, roux with swirl, bubbles, specks, trinity, spoon.
// ABOUTME: Everything is drawn from a view object each frame; particles live here because they are purely visual.
import { mixHex } from './color.js';

const FLAME_LEVEL = 0.65;

// Canvas colors come from the same CSS tokens as the rest of the page (styles.css :root).
function readPalette() {
  const css = getComputedStyle(document.documentElement);
  const token = (name) => css.getPropertyValue(name).trim();
  return {
    pot: token('--pot'),
    potEdge: token('--pot-edge'),
    enamel: token('--enamel'),
    enamelLip: token('--enamel-lip'),
    grate: token('--grate'),
    wood: token('--wood'),
    woodEdge: token('--wood-edge'),
    speck: token('--speck'),
    speckRgb: token('--speck-rgb'),
    ink: token('--ink'),
    flameOuter: token('--flame-outer'),
    flameInner: token('--flame-inner'),
    steamRgb: token('--steam-rgb'),
    smokeRgb: token('--smoke-rgb'),
    // Onion, celery, bell pepper: the classic 2:1:1.
    trinity: [token('--onion'), token('--onion'), token('--celery'), token('--pepper')],
  };
}

const frac = (x) => x - Math.floor(x);

export function createPotRenderer(canvas) {
  const ctx = canvas.getContext('2d');
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const C = readPalette();
  let w = 0;
  let h = 0;
  let flame = 0;
  let spawnBubble = 0;
  let spawnSmoke = 0;
  let spoonAngle = -0.75;
  let bubbles = [];
  let puffs = [];
  let trinity = [];
  let dropAt = null;

  function resize(cssW, cssH) {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    w = cssW;
    h = cssH;
    canvas.width = Math.round(cssW * dpr);
    canvas.height = Math.round(cssH * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  // Pot geometry in canvas CSS pixels. R is the roux surface radius.
  function geometry() {
    const S = Math.min(w, h);
    const Ro = S * 0.4;
    return { S, cx: w / 2, cy: h / 2, Ro, Rw: Ro * 0.9, R: Ro * 0.82 };
  }

  function reset() {
    bubbles = [];
    puffs = [];
    trinity = [];
    dropAt = null;
  }

  function dropTrinity(now) {
    const { R } = geometry();
    dropAt = now;
    trinity = Array.from({ length: 46 }, () => ({
      r: R * 0.86 * Math.sqrt(Math.random()),
      th: Math.random() * Math.PI * 2,
      size: R * (0.034 + Math.random() * 0.02),
      rot: Math.random() * Math.PI,
      color: C.trinity[Math.floor(Math.random() * C.trinity.length)],
      delay: Math.random() * 0.16,
    }));
    for (let i = 0; i < 16; i++) addPuff('steam', R * 0.8 * Math.sqrt(Math.random()), Math.random() * Math.PI * 2, now, R);
  }

  function addPuff(kind, r, th, now, R) {
    puffs.push({
      kind,
      x: Math.cos(th) * r,
      y: Math.sin(th) * r,
      vx: Math.cos(th) * R * 0.15,
      vy: -R * (0.25 + Math.random() * 0.25),
      size: R * (kind === 'steam' ? 0.12 + Math.random() * 0.1 : 0.08 + Math.random() * 0.06),
      born: now,
      life: kind === 'steam' ? 1.1 + Math.random() * 0.6 : 1.4 + Math.random() * 0.8,
    });
  }

  function drawGrate(S) {
    ctx.strokeStyle = C.grate;
    ctx.lineWidth = S * 0.022;
    ctx.lineCap = 'round';
    for (let i = 0; i < 4; i++) {
      const a = Math.PI / 4 + (i * Math.PI) / 2;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * S * 0.3, Math.sin(a) * S * 0.3);
      ctx.lineTo(Math.cos(a) * S * 0.485, Math.sin(a) * S * 0.485);
      ctx.stroke();
    }
  }

  function drawFlames(Ro, S, now) {
    if (flame < 0.02) return;
    const n = 30;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      const flick = reduceMotion ? 1 : 0.82 + 0.12 * Math.sin(now * 17 + i * 2.3) + 0.08 * Math.sin(now * 29 + i * 5.1);
      const len = S * (0.012 + 0.05 * flame) * flick;
      const base = Ro * 0.96;
      for (const [scale, color] of [
        [1, C.flameOuter],
        [0.55, C.flameInner],
      ]) {
        const spread = 0.075 * scale;
        const tip = base + len * scale + Ro * 0.04;
        ctx.beginPath();
        ctx.moveTo(Math.cos(a - spread) * base, Math.sin(a - spread) * base);
        ctx.quadraticCurveTo(Math.cos(a - spread * 0.4) * tip * 0.97, Math.sin(a - spread * 0.4) * tip * 0.97, Math.cos(a) * tip, Math.sin(a) * tip);
        ctx.quadraticCurveTo(Math.cos(a + spread * 0.4) * tip * 0.97, Math.sin(a + spread * 0.4) * tip * 0.97, Math.cos(a + spread) * base, Math.sin(a + spread) * base);
        ctx.fillStyle = color;
        ctx.fill();
      }
    }
  }

  function drawHandles(Ro) {
    for (const side of [-1, 1]) {
      const x = side * Ro * 1.04;
      ctx.beginPath();
      ctx.roundRect(x - Ro * 0.1, -Ro * 0.2, Ro * 0.2, Ro * 0.4, Ro * 0.07);
      ctx.roundRect(x - Ro * 0.035 + side * Ro * 0.02, -Ro * 0.12, Ro * 0.07, Ro * 0.24, Ro * 0.035);
      ctx.fillStyle = C.pot;
      ctx.fill('evenodd');
      ctx.strokeStyle = C.potEdge;
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }
  }

  function drawPotBody(Ro, Rw) {
    ctx.beginPath();
    ctx.arc(0, 0, Ro, 0, Math.PI * 2);
    ctx.fillStyle = C.pot;
    ctx.fill();
    ctx.strokeStyle = C.potEdge;
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(0, 0, (Ro + Rw) / 2, Math.PI * 1.08, Math.PI * 1.55);
    ctx.strokeStyle = `rgba(${C.steamRgb}, 0.22)`;
    ctx.lineWidth = (Ro - Rw) * 0.35;
    ctx.lineCap = 'round';
    ctx.stroke();
  }

  // The enamel wall is the roux's immediate surround. It matches the target chip's mount so both are judged alike.
  function drawWall(Rw, R) {
    const g = ctx.createRadialGradient(0, 0, R, 0, 0, Rw);
    g.addColorStop(0, C.enamel);
    g.addColorStop(1, C.enamelLip);
    ctx.beginPath();
    ctx.arc(0, 0, Rw, 0, Math.PI * 2);
    ctx.fillStyle = g;
    ctx.fill();
  }

  function drawRoux(v, R, now, dt) {
    const swirlAt = (r) => v.swirl * (1 - (0.35 * r) / R);
    const light = mixHex(v.color, '#ffffff', 0.1);
    const dark = mixHex(v.color, '#000000', 0.16);

    ctx.save();
    ctx.beginPath();
    ctx.arc(0, 0, R, 0, Math.PI * 2);
    ctx.fillStyle = v.color;
    ctx.fill();
    ctx.clip();

    // Swirl streaks, balanced light and dark so the average color stays true.
    ctx.lineCap = 'round';
    ctx.lineWidth = R * 0.035;
    ctx.globalAlpha = 0.28 + 0.4 * v.stirActivity;
    for (let k = 0; k < 6; k++) {
      const r = R * (0.2 + 0.13 * k);
      const start = swirlAt(r) + k * 1.9;
      ctx.beginPath();
      ctx.arc(0, 0, r, start, start + 0.8 + 0.35 * (k % 3));
      ctx.strokeStyle = k % 2 ? light : dark;
      ctx.stroke();
    }

    // Wake where the spoon just passed.
    if (v.trail.length > 1) {
      ctx.strokeStyle = light;
      ctx.lineWidth = R * 0.1;
      for (let i = 1; i < v.trail.length; i++) {
        const a = v.trail[i - 1];
        const b = v.trail[i];
        ctx.globalAlpha = Math.max(0, 0.55 * (1 - (now - b.t) / 0.35));
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();
      }
    }
    ctx.globalAlpha = 1;

    // Bubbles, more of them the hotter the pot.
    spawnBubble += (v.active ? 2 + 16 * v.temp : 0.6) * dt;
    while (spawnBubble >= 1) {
      spawnBubble -= 1;
      bubbles.push({
        r: R * 0.9 * Math.sqrt(Math.random()),
        th: Math.random() * Math.PI * 2,
        size: R * (0.012 + Math.random() * 0.022),
        born: now,
        life: 0.35 + Math.random() * 0.6,
      });
    }
    bubbles = bubbles.filter((b) => now - b.born < b.life * 1.3);
    for (const b of bubbles) {
      const age = (now - b.born) / b.life;
      const th = b.th + swirlAt(b.r);
      const x = Math.cos(th) * b.r;
      const y = Math.sin(th) * b.r;
      ctx.beginPath();
      if (age < 1) {
        ctx.arc(x, y, b.size * Math.sqrt(age), 0, Math.PI * 2);
        ctx.fillStyle = dark;
        ctx.globalAlpha = 0.45;
        ctx.fill();
        ctx.strokeStyle = light;
        ctx.globalAlpha = 0.7;
        ctx.lineWidth = 1;
        ctx.stroke();
      } else {
        ctx.arc(x, y, b.size * (1 + (age - 1) * 3), 0, Math.PI * 2);
        ctx.strokeStyle = light;
        ctx.globalAlpha = 0.6 * (1 - (age - 1) / 0.3);
        ctx.lineWidth = 1;
        ctx.stroke();
      }
    }
    ctx.globalAlpha = 1;

    // Scorched specks: placed on a golden-angle spiral near the edges, where a pot catches first.
    const specks = Math.min(60, Math.floor(v.specks));
    ctx.fillStyle = C.speck;
    for (let i = 0; i < specks; i++) {
      const r = R * (0.5 + 0.45 * frac(i * 0.618034 + 0.13));
      const th = i * 2.39996 + 0.7 + swirlAt(r);
      ctx.beginPath();
      ctx.arc(Math.cos(th) * r, Math.sin(th) * r, R * (0.012 + 0.009 * frac(i * 0.37)), 0, Math.PI * 2);
      ctx.fill();
    }

    // The trinity lands with a little drop-in, then rides the swirl.
    if (dropAt !== null) {
      for (const p of trinity) {
        const t = Math.min(1, Math.max(0, (now - dropAt - p.delay) / 0.22));
        if (t <= 0) continue;
        const scale = reduceMotion ? 1 : 1 + 0.9 * (1 - t) ** 2;
        const th = p.th + swirlAt(p.r);
        ctx.save();
        ctx.translate(Math.cos(th) * p.r, Math.sin(th) * p.r);
        ctx.rotate(p.rot + swirlAt(p.r));
        ctx.globalAlpha = t;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.roundRect((-p.size / 2) * scale, (-p.size / 2) * scale, p.size * scale, p.size * scale, p.size * 0.25);
        ctx.fill();
        ctx.restore();
      }
    }

    // Oil sheen, kept faint so it doesn't lighten the color you're judging.
    const sheen = ctx.createRadialGradient(-R * 0.38, -R * 0.42, 0, -R * 0.38, -R * 0.42, R * 0.6);
    sheen.addColorStop(0, `rgba(${C.steamRgb}, 0.09)`);
    sheen.addColorStop(1, `rgba(${C.steamRgb}, 0)`);
    ctx.fillStyle = sheen;
    ctx.fillRect(-R, -R, R * 2, R * 2);

    // Catching on the bottom: a dark band creeps in from the edge.
    if (v.stick > 0.08) {
      const a = Math.min(1, (v.stick - 0.08) / 0.6);
      ctx.beginPath();
      ctx.arc(0, 0, R, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(${C.speckRgb}, ${0.55 * a})`;
      ctx.lineWidth = R * 0.16 * a;
      ctx.stroke();
    }

    // Meniscus where the roux meets the wall.
    ctx.beginPath();
    ctx.arc(0, 0, R, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(${C.speckRgb}, 0.1)`;
    ctx.lineWidth = R * 0.04;
    ctx.stroke();
    ctx.restore();

    // Smoke when it's catching or burnt.
    const smokeRate = v.burnt ? 12 : v.stick > 0.2 ? 8 * (v.stick - 0.2) : 0;
    spawnSmoke += smokeRate * dt;
    while (spawnSmoke >= 1) {
      spawnSmoke -= 1;
      addPuff('smoke', R * (0.7 + Math.random() * 0.25), Math.random() * Math.PI * 2, now, R);
    }
  }

  function drawPuffs(now, dt) {
    puffs = puffs.filter((p) => now - p.born < p.life);
    for (const p of puffs) {
      const age = (now - p.born) / p.life;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      const radius = p.size * (1 + age * 1.4);
      const rgb = p.kind === 'steam' ? C.steamRgb : C.smokeRgb;
      const alpha = (p.kind === 'steam' ? 0.5 : 0.36) * (1 - age);
      const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, radius);
      g.addColorStop(0, `rgba(${rgb}, ${alpha})`);
      g.addColorStop(1, `rgba(${rgb}, 0)`);
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // A flat-ended wooden roux paddle: the straight edge is what scrapes the bottom clean.
  function drawSpoon(v, R, S, color) {
    let x;
    let y;
    if (v.spoon) {
      x = v.spoon.x;
      y = v.spoon.y;
      const d = Math.hypot(x, y);
      if (d > R * 0.1) spoonAngle = Math.atan2(y, x);
      const max = R * 0.84;
      if (d > max) {
        x = (x / d) * max;
        y = (y / d) * max;
      }
    } else {
      x = Math.cos(spoonAngle) * R * 0.72;
      y = Math.sin(spoonAngle) * R * 0.72;
    }
    const ux = Math.cos(spoonAngle);
    const uy = Math.sin(spoonAngle);
    const bladeBack = R * 0.14;
    const hx0 = x + ux * bladeBack;
    const hy0 = y + uy * bladeBack;
    const reach = S * 0.36;
    ctx.lineCap = 'round';
    ctx.strokeStyle = C.woodEdge;
    ctx.lineWidth = R * 0.06;
    ctx.beginPath();
    ctx.moveTo(hx0, hy0);
    ctx.lineTo(hx0 + ux * reach, hy0 + uy * reach);
    ctx.stroke();
    ctx.strokeStyle = C.wood;
    ctx.lineWidth = R * 0.045;
    ctx.stroke();

    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(spoonAngle);
    const bladeFront = -R * 0.12;
    const half = R * 0.075;
    ctx.beginPath();
    ctx.roundRect(bladeFront, -half, bladeBack - bladeFront, half * 2, R * 0.018);
    ctx.fillStyle = C.wood;
    ctx.fill();
    ctx.strokeStyle = C.woodEdge;
    ctx.lineWidth = 1.5;
    ctx.stroke();
    // Roux coats the leading edge.
    ctx.beginPath();
    ctx.roundRect(bladeFront + 1, -half + 1, R * 0.08, half * 2 - 2, R * 0.014);
    ctx.fillStyle = color;
    ctx.fill();
    ctx.restore();
  }

  function drawHint(R, now) {
    const r = R * 0.55;
    const a0 = -Math.PI * 0.85;
    const a1 = Math.PI * 0.45;
    ctx.save();
    ctx.globalAlpha = reduceMotion ? 0.6 : 0.55 + 0.2 * Math.sin(now * 3);
    ctx.strokeStyle = C.ink;
    ctx.fillStyle = C.ink;
    ctx.lineWidth = 3;
    ctx.setLineDash([9, 9]);
    ctx.lineDashOffset = reduceMotion ? 0 : -now * 30;
    ctx.beginPath();
    ctx.arc(0, 0, r, a0, a1);
    ctx.stroke();
    ctx.setLineDash([]);
    const ex = Math.cos(a1) * r;
    const ey = Math.sin(a1) * r;
    const tx = -Math.sin(a1);
    const ty = Math.cos(a1);
    ctx.beginPath();
    ctx.moveTo(ex + tx * 12, ey + ty * 12);
    ctx.lineTo(ex - ty * 9, ey + tx * 9);
    ctx.lineTo(ex + ty * 9, ey - tx * 9);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  // view: { color, temp, burnerOn, active, stick, specks, swirl, stirActivity, spoon, trail, burnt, hint }
  // spoon and trail points are in canvas CSS pixels.
  function draw(v, now, dt) {
    const { S, cx, cy, Ro, Rw, R } = geometry();
    flame += ((v.burnerOn ? FLAME_LEVEL : 0) - flame) * (1 - Math.exp(-dt / 0.25));

    ctx.clearRect(0, 0, w, h);
    ctx.save();
    ctx.translate(cx, cy);
    if (dropAt !== null && !reduceMotion && now - dropAt < 0.25) {
      const bump = 1 + 0.014 * Math.sin((Math.PI * (now - dropAt)) / 0.25);
      ctx.scale(bump, bump);
    }
    const local = (p) => ({ ...p, x: p.x - cx, y: p.y - cy });
    const view = { ...v, spoon: v.spoon && local(v.spoon), trail: v.trail.map(local) };

    drawGrate(S);
    drawFlames(Ro, S, now);
    drawHandles(Ro);
    drawPotBody(Ro, Rw);
    drawWall(Rw, R);
    drawRoux(view, R, now, dt);
    drawPuffs(now, dt);
    if (v.hint) drawHint(R, now);
    drawSpoon(view, R, S, v.color);
    ctx.restore();
  }

  return { resize, geometry, reset, dropTrinity, draw };
}
