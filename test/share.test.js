// ABOUTME: Tests for the share text, challenge links, and link-preview metadata.
// ABOUTME: The share text must read well pasted into a group chat: one header, one line per dish, one link.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { scoreBar, shareText, parseLink, menuUrl, metaFor, challengeLine } from '../src/share.js';

const dish = (name, score, burnt = false) => ({ dish: name, score, burnt });

test('the score bar fills a brown square per 20 points', () => {
  assert.equal(scoreBar(dish('x', 94)), '🟫🟫🟫🟫🟫');
  assert.equal(scoreBar(dish('x', 81)), '🟫🟫🟫🟫⬜');
  assert.equal(scoreBar(dish('x', 0)), '⬜⬜⬜⬜⬜');
});

test('a burnt dish shows fire', () => {
  assert.equal(scoreBar(dish('x', 0, true)), '🔥🔥🔥🔥🔥');
});

test('daily share text has a header, a line per dish, and a challenge link', () => {
  const text = shareText({
    menu: { kind: 'daily', number: 12 },
    dishes: [dish('Crawfish étouffée', 94), dish('Grillades and grits', 81), dish('Duck and andouille gumbo', 0, true)],
    origin: 'https://roux.dunn.us',
  });
  assert.equal(
    text,
    [
      'Roux Wars #12 — 175/300',
      '🟫🟫🟫🟫🟫 94 Crawfish étouffée',
      '🟫🟫🟫🟫⬜ 81 Grillades and grits',
      '🔥🔥🔥🔥🔥 Duck and andouille gumbo',
      'https://roux.dunn.us/?d=12&s=175',
    ].join('\n'),
  );
});

test('practice share text links to the same practice menu', () => {
  const text = shareText({
    menu: { kind: 'practice', seed: 46655 },
    dishes: [dish('A', 50), dish('B', 50), dish('C', 50)],
    origin: 'https://roux.dunn.us',
  });
  assert.match(text, /^Roux Wars practice — 150\/300\n/);
  assert.match(text, /\?p=zzz&s=150$/);
});

test('parseLink reads a daily challenge', () => {
  assert.deepEqual(parseLink('?d=5&s=241', 12), { kind: 'daily', number: 5, challenge: 241 });
});

test('parseLink sends future or junk daily numbers to today', () => {
  assert.equal(parseLink('?d=99', 12).number, 12);
  assert.equal(parseLink('?d=abc', 12).number, 12);
  assert.equal(parseLink('?d=0', 12).number, 12);
});

test('parseLink with no params is today’s daily with no challenge', () => {
  assert.deepEqual(parseLink('', 12), { kind: 'daily', number: 12, challenge: null });
});

test('parseLink reads a practice challenge', () => {
  assert.deepEqual(parseLink('?p=zzz&s=150', 12), { kind: 'practice', seed: 46655, challenge: 150 });
});

test('parseLink ignores challenge scores outside 0-300', () => {
  assert.equal(parseLink('?d=5&s=999', 12).challenge, null);
  assert.equal(parseLink('?d=5&s=-3', 12).challenge, null);
});

test('menuUrl round-trips through parseLink', () => {
  const url = new URL(menuUrl('https://roux.dunn.us', { kind: 'practice', seed: 123456 }, 222));
  assert.deepEqual(parseLink(url.search, 12), { kind: 'practice', seed: 123456, challenge: 222 });
});

test('link previews for a challenge name the score to beat', () => {
  const meta = metaFor('?d=5&s=241', 12);
  assert.match(meta.title, /241/);
  assert.match(meta.title, /#5/);
});

test('link previews without a challenge use the default title', () => {
  assert.equal(metaFor('', 12).title, 'Roux Wars');
});

test('the challenge line says whether you beat the score', () => {
  assert.match(challengeLine(250, 241), /beat/i);
  assert.match(challengeLine(230, 241), /241/);
  assert.match(challengeLine(241, 241), /tie/i);
});
