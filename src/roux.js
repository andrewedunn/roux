// ABOUTME: The roux itself: named color stages along a 0→1 browning scale, the dishes each suits, and smells.
// ABOUTME: Hex values are estimates; dish pairings are sourced (docs/dishes.md); dark stages sit closer together.
import { mixHex } from './color.js';

// Dish pairings come from published Louisiana recipes; see docs/dishes.md for sources and the contested ones.
export const STAGES = [
  { name: 'White', at: 0.0, hex: '#efe3c8', dishes: [] },
  {
    name: 'Blond',
    at: 0.16,
    hex: '#e0c38a',
    dishes: ['Corn & crab bisque', 'Oyster & artichoke bisque', 'Seafood au gratin', 'Crawfish fettuccine', 'Crawfish étouffée'],
  },
  {
    name: 'Peanut butter',
    at: 0.34,
    hex: '#c08a4e',
    dishes: ['Shrimp étouffée', 'Shrimp Creole', 'Chicken Creole', 'Shrimp & corn soup', 'Turtle soup', 'Shrimp stew'],
  },
  { name: 'Copper penny', at: 0.52, hex: '#9e5b2e', dishes: ['Crawfish stew', 'Seafood gumbo'] },
  { name: 'Milk chocolate', at: 0.67, hex: '#74462a', dishes: ['Chicken & sausage gumbo', 'Grillades & grits'] },
  { name: 'Brick', at: 0.79, hex: '#5e2e1c', dishes: ['Gumbo ya-ya', 'Redfish courtbouillon', 'Crawfish bisque'] },
  {
    name: 'Dark chocolate',
    at: 0.89,
    hex: '#45281a',
    dishes: [
      'Duck & andouille gumbo',
      'Rabbit sauce piquante',
      'Chicken fricassée',
      'Meatball stew',
      'Crab & shrimp stew',
      'Shrimp & okra gumbo',
      'Backbone stew',
    ],
  },
  { name: 'Black', at: 0.97, hex: '#2b1a12', dishes: ['Black-roux seafood gumbo'] },
];

export const BURNT_HEX = '#1e1a17';
const BURNT_SPAN = 0.1;

const SMELLS = [
  { below: 0.08, text: 'Smells like raw flour.' },
  { below: 0.25, text: 'Smells like fresh popcorn.' },
  { below: 0.45, text: 'Smells like toasted bread.' },
  { below: 0.62, text: 'Smells like roasted pecans.' },
  { below: 0.8, text: 'Smells deep and nutty.' },
  { below: 0.93, text: 'Smells like chicory coffee.' },
  { below: Infinity, text: 'Smells sharp. Careful.' },
];

export function rouxColor(browning) {
  const last = STAGES[STAGES.length - 1];
  if (browning >= last.at) {
    if (browning <= 1) return last.hex;
    return mixHex(last.hex, BURNT_HEX, Math.min(1, (browning - 1) / BURNT_SPAN));
  }
  if (browning <= 0) return STAGES[0].hex;
  const i = STAGES.findIndex((s) => s.at > browning);
  const lo = STAGES[i - 1];
  const hi = STAGES[i];
  return mixHex(lo.hex, hi.hex, (browning - lo.at) / (hi.at - lo.at));
}

export function nearestStage(browning) {
  return STAGES.reduce((best, s) => (Math.abs(s.at - browning) < Math.abs(best.at - browning) ? s : best));
}

export function smellAt(browning) {
  return SMELLS.find((s) => browning < s.below).text;
}
