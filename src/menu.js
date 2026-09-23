// ABOUTME: Builds a three-dish menu (light, medium, dark) from a seed, with a little jitter around each stage.
// ABOUTME: Seeded so a future daily menu can be the same for everyone.
import { STAGES } from './roux.js';

const TIERS = [
  { tier: 'light', stages: ['Blond', 'Peanut butter'] },
  { tier: 'medium', stages: ['Copper penny', 'Milk chocolate'] },
  { tier: 'dark', stages: ['Brick', 'Dark chocolate', 'Black'] },
];
const JITTER = 0.015;
const DARKEST_TARGET = 0.97;

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

const pick = (rand, list) => list[Math.floor(rand() * list.length)];

export function createMenu(seed) {
  const rand = seededRandom(seed);
  return TIERS.map(({ tier, stages }) => {
    const name = pick(rand, stages);
    const stage = STAGES.find((s) => s.name === name);
    const target = Math.min(DARKEST_TARGET, stage.at + (rand() * 2 - 1) * JITTER);
    const { name: dish, credit, url, kind } = pick(rand, stage.dishes);
    return { tier, stage, dish, source: { credit, url, kind }, target };
  });
}
