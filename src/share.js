// ABOUTME: Share text for a finished menu, challenge links that replay the same menu, and link-preview metadata.
// ABOUTME: Shared by the page (share button, reading links) and the Worker (rewriting preview tags).

const BAR_LENGTH = 5;
const MAX_CHALLENGE = 300;
export const DESCRIPTION = 'Cook three roux to the color on the card. Don’t burn it.';

export function scoreBar({ score, burnt }) {
  if (burnt) return '⬛'.repeat(BAR_LENGTH);
  const filled = Math.round(score / (100 / BAR_LENGTH));
  return '🟫'.repeat(filled) + '⬜'.repeat(BAR_LENGTH - filled);
}

// menu: { kind: 'daily', number } | { kind: 'practice', seed }
export function menuUrl(origin, menu, score) {
  const ref = menu.kind === 'daily' ? `d=${menu.number}` : `p=${menu.seed.toString(36)}`;
  return `${origin}/?${ref}${score == null ? '' : `&s=${score}`}`;
}

// dishes: [{ dish, score, burnt }]
export function shareText({ menu, dishes, origin }) {
  const total = dishes.reduce((sum, d) => sum + d.score, 0);
  const max = dishes.length * 100;
  const name = menu.kind === 'daily' ? `Roux Wars #${menu.number}` : 'Roux Wars practice';
  const lines = dishes.map((d) => (d.burnt ? `${scoreBar(d)} ${d.dish}` : `${scoreBar(d)} ${d.score} ${d.dish}`));
  return [`${name} — ${total}/${max}`, ...lines, menuUrl(origin, menu, total)].join('\n');
}

function parseChallenge(value) {
  if (!/^\d{1,3}$/.test(value ?? '')) return null;
  const n = Number(value);
  return n <= MAX_CHALLENGE ? n : null;
}

// Reads ?d=<daily>&s=<score> or ?p=<practice seed, base 36>&s=<score>. Anything odd falls back to today's daily.
export function parseLink(search, today) {
  const q = new URLSearchParams(search);
  const challenge = parseChallenge(q.get('s'));
  if (q.has('p')) {
    const seed = parseInt(q.get('p'), 36);
    if (Number.isFinite(seed) && seed >= 0 && seed <= 0xffffffff) return { kind: 'practice', seed, challenge };
  }
  const n = Number(q.get('d'));
  const number = Number.isInteger(n) && n >= 1 && n <= today ? n : today;
  return { kind: 'daily', number, challenge };
}

export function metaFor(search, today) {
  const link = parseLink(search, today);
  if (link.challenge == null) return { title: 'Roux Wars', description: DESCRIPTION };
  const which = link.kind === 'daily' ? `Roux Wars #${link.number}` : 'a Roux Wars practice menu';
  return { title: `Beat ${link.challenge} on ${which}`, description: DESCRIPTION };
}

export function challengeLine(total, target) {
  if (total > target) return `You beat ${target} by ${total - target}.`;
  if (total < target) return `${target} still stands. You were ${target - total} short.`;
  return `Dead even at ${target}. It’s a tie.`;
}
