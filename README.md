# Roux Wars

First you make a roux. Cook it to the color on the card: stir so it doesn't
stick, and drop the trinity to stop the cooking — it keeps darkening for a moment.

Mobile-first browser game at **https://roux.dunn.us**. No build step, no dependencies.

- **Today's menu** is three dishes (light, medium, dark), numbered, and the same
  for everyone on a given day in Louisiana (Central) time. One attempt.
- **Practice menus** are random and unlimited.
- **Share** posts a text scorecard with a link that replays the same menu with
  your score to beat. Link previews say "Beat 241 on Roux Wars #12".

## Run it

```bash
npm run serve
```

Then open http://localhost:5190. To try it on a phone on the same Wi-Fi, open
`http://<your-mac's-ip>:5190`. Sound needs the phone's silent switch off.

To run it the way Cloudflare does (including the link-preview rewriting):

```bash
wrangler dev
```

## Test it

```bash
npm test
```

Uses Node's built-in test runner. Tests cover the game logic (color math,
cooking sim, stirring, scoring, menus, daily calendar, share text, links,
storage). Rendering and sound are checked by playing.

## Deploy it

```bash
wrangler deploy
```

Cloudflare Worker `roux` with static assets, on the custom domain `roux.dunn.us`
(`wrangler.jsonc`). `.assetsignore` keeps tests, docs, and config out of the
public files. `worker.js` only runs for `/` and only changes anything when the
URL carries a challenge score.

## How it's put together

| File | What it does |
| --- | --- |
| `src/cook.js` | The cooking sim: heat lag, browning, sticking, specks, carryover, burning. Pure. |
| `src/roux.js` | Stage colors, dishes, and smell captions along the 0→1 browning scale. |
| `src/score.js` | OKLab scoring, verdict lines, and the "pull it ~0.8 s sooner" tip. |
| `src/stir.js` | Finger movement → stir activity (0..1) and swirl direction. |
| `src/menu.js` | Seeded three-dish menus (light, medium, dark). |
| `src/daily.js` | Central-time daily numbers, daily seeds, streaks. |
| `src/share.js` | Share text, challenge links, link-preview titles. |
| `src/store.js` | Daily results saved on the device. |
| `src/color.js` | hex ↔ OKLab, distance, mixing. |
| `src/render.js` | Canvas drawing of the pot, flames, roux, trinity, paddle. |
| `src/audio.js` | Procedural Web Audio: sizzle, crackles, scrape, trinity hiss. |
| `src/main.js` | Game flow, frame loop, input, title card, and the result sheets. |
| `worker.js` | Cloudflare Worker: serves the game, rewrites preview tags on challenge links. |

See [docs/design.md](docs/design.md) for why it works the way it does, and
[docs/dishes.md](docs/dishes.md) for where each dish's roux color comes from.

## Tuning

Almost all of the feel lives in the constants at the top of `src/cook.js`
(browning speed, carryover, how fast it sticks) and `src/score.js` (how harsh
the score curve is). The cook tests pin the pacing to ranges, so if you retune,
`npm test` tells you what moved.

On a keyboard, hold **S** to stir.
