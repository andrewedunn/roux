// ABOUTME: Crystal Hot Sauce partner edition: brand copy, links, and the "dash of Crystal" verdicts.
// ABOUTME: Pure data and text so it can be tested; the drawing lives in render.js and the marks in index.html.

export const CRYSTAL = {
  name: 'Crystal Hot Sauce',
  site: 'https://crystalhotsauce.com/',
  shop: 'https://crystalhotsauce.com/shop/',
  recipes: 'https://crystalhotsauce.com/recipes/',
  tagline: 'How New Orleans does flavor.',
  hashtag: '#CultOfCrystal',
};

// The Crystal step comes after the trinity: shake in as many dashes as you like.
export const DASHES_PER_SHAKE = 1;

// One line about how heavy a hand you had with the bottle. Copy stays under 40 characters.
export function dashVerdict(dashes) {
  if (dashes <= 0) return 'No Crystal? On a gumbo? Bold.';
  if (dashes === 1) return 'A polite dash.';
  if (dashes <= 4) return 'Just right. That’s New Orleans.';
  if (dashes <= 8) return 'Now we’re talking.';
  return 'Card-carrying Cult of Crystal.';
}

// One line for the menu sheet, across all three dishes.
export function menuDashLine(dashes) {
  if (dashes === 0) return 'Not a drop of Crystal. Next time.';
  return `${dashes} dash${dashes === 1 ? '' : 'es'} of Crystal across the menu.`;
}

// What to say in the caption while the bottle is out.
export function crystalCaption(dashes, burnt) {
  if (burnt) return dashes ? 'Even Crystal can’t save it.' : 'Maybe Crystal can help?';
  if (dashes === 0) return 'Now finish it with Crystal.';
  if (dashes < 3) return 'Another dash?';
  return 'Smells like New Orleans.';
}
