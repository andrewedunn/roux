// ABOUTME: Share text for a finished menu, plus the link that lets a friend cook the same three dishes.
// ABOUTME: Menus are identified by their seed, written in base 36 (?m=abc12).

const BAR_LENGTH = 5;

export function scoreBar({ score, burnt }) {
  if (burnt) return '⬛'.repeat(BAR_LENGTH);
  const filled = Math.round(score / (100 / BAR_LENGTH));
  return '🟫'.repeat(filled) + '⬜'.repeat(BAR_LENGTH - filled);
}

export function menuUrl(origin, seed) {
  return `${origin}/?m=${seed.toString(36)}`;
}

// Returns the menu seed from a link, or null for a fresh random menu.
export function menuFromLink(search) {
  const value = new URLSearchParams(search).get('m');
  if (!/^[0-9a-z]{1,7}$/.test(value ?? '')) return null;
  const seed = parseInt(value, 36);
  return seed <= 0xffffffff ? seed : null;
}

// dishes: [{ dish, score, burnt }]
export function shareText({ seed, dishes, origin }) {
  const total = dishes.reduce((sum, d) => sum + d.score, 0);
  const lines = dishes.map((d) => (d.burnt ? `${scoreBar(d)} ${d.dish}` : `${scoreBar(d)} ${d.score} ${d.dish}`));
  return [`Roux Wars — ${total}/${dishes.length * 100}`, ...lines, menuUrl(origin, seed)].join('\n');
}
