// ABOUTME: The roux itself: named color stages along a 0→1 browning scale, the dishes each suits, and smells.
// ABOUTME: Hex values are estimates from research; stage spacing tightens at the dark end like real roux.
import { mixHex } from './color.js';

export const STAGES = [
  { name: 'White', at: 0.0, hex: '#efe3c8', dishes: [] },
  { name: 'Blond', at: 0.16, hex: '#e0c38a', dishes: ['Crab and corn bisque', 'Shrimp Creole'] },
  { name: 'Peanut butter', at: 0.34, hex: '#c08a4e', dishes: ['Crawfish étouffée', 'Shrimp étouffée'] },
  { name: 'Copper penny', at: 0.52, hex: '#9e5b2e', dishes: ['Grillades and grits', 'Shrimp sauce piquante'] },
  { name: 'Milk chocolate', at: 0.67, hex: '#74462a', dishes: ['Chicken and sausage gumbo', 'Chicken fricassee'] },
  { name: 'Brick', at: 0.79, hex: '#5e2e1c', dishes: ['Redfish courtbouillon', 'Seafood gumbo'] },
  { name: 'Dark chocolate', at: 0.89, hex: '#45281a', dishes: ['Duck and andouille gumbo', 'Rabbit sauce piquante'] },
  { name: 'Black', at: 0.97, hex: '#2b1a12', dishes: ['Old-school gumbo'] },
];

export const BURNT_HEX = '#1e1a17';
const BURNT_SPAN = 0.1;

const SMELLS = [
  { below: 0.08, text: 'Smells like raw flour.' },
  { below: 0.25, text: 'Smells like fresh popcorn.' },
  { below: 0.45, text: 'Smells like toasted bread.' },
  { below: 0.62, text: 'Smells like roasting pecans.' },
  { below: 0.8, text: 'Smells deep and nutty.' },
  { below: 0.93, text: 'Smells like dark-roast coffee.' },
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
