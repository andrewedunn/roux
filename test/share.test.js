// ABOUTME: Tests for the share text and the menu link that lets a friend cook the same three dishes.
// ABOUTME: The share text must read well pasted into a group chat: one header, one line per dish, one link.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { scoreBar, shareText, menuUrl, menuFromLink } from '../src/share.js';

const dish = (name, score, burnt = false, stir = 90, dashes = 2) => ({ dish: name, score, burnt, stir, dashes });

test('the score bar fills a brown square per 20 points', () => {
  assert.equal(scoreBar(dish('x', 94)), '🟫🟫🟫🟫🟫');
  assert.equal(scoreBar(dish('x', 81)), '🟫🟫🟫🟫⬜');
  assert.equal(scoreBar(dish('x', 0)), '⬜⬜⬜⬜⬜');
});

test('a burnt dish shows black squares, the end of the color ladder', () => {
  assert.equal(scoreBar(dish('x', 0, true)), '⬛⬛⬛⬛⬛');
});

test('share text has a header with the average stir score, a line per dish, the Crystal count, and a link to the same menu', () => {
  const text = shareText({
    seed: 46655,
    dishes: [
      dish('Crawfish étouffée', 94, false, 100),
      dish('Grillades & grits', 81, false, 88),
      dish('Duck & andouille gumbo', 0, true, 61),
    ],
    origin: 'https://roux.dunn.us',
  });
  assert.equal(
    text,
    [
      'Roux Wars × Crystal — 175/300 · stirring 83',
      '🟫🟫🟫🟫🟫 94 Crawfish étouffée',
      '🟫🟫🟫🟫⬜ 81 Grillades & grits',
      '⬛⬛⬛⬛⬛ Duck & andouille gumbo',
      '🌶️ 6 dashes of Crystal #CultOfCrystal',
      'https://roux.dunn.us/?m=zzz',
    ].join('\n'),
  );
});

test('a menu link round-trips to the same seed', () => {
  const url = new URL(menuUrl('https://roux.dunn.us', 123456));
  assert.equal(menuFromLink(url.search), 123456);
});

test('no menu in the link means a fresh random menu', () => {
  assert.equal(menuFromLink(''), null);
});

test('junk menu links are ignored', () => {
  assert.equal(menuFromLink('?m=!!'), null);
  assert.equal(menuFromLink('?m=zzzzzzzzzz'), null);
});
