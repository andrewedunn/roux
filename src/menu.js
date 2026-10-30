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
// Partner edition: about half of menus feature a Crystal Kitchen recipe as the medium dish.
const CRYSTAL_SHARE = 0.5;

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
    // Pick across every dish in the tier, so each dish is equally likely and thin stages stay rare.
    const options = STAGES.filter((s) => stages.includes(s.name)).flatMap((stage) => stage.dishes.map((d) => ({ stage, d })));
    const featured = options.filter(({ d }) => d.crystal);
    const { stage, d } = featured.length && rand() < CRYSTAL_SHARE ? pick(rand, featured) : pick(rand, options);
    const target = Math.min(DARKEST_TARGET, stage.at + (rand() * 2 - 1) * JITTER);
    return { tier, stage, dish: d.name, source: { credit: d.credit, url: d.url, kind: d.kind }, crystal: d.crystal, target };
  });
}
