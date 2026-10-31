# Roux Wars

First you make a roux. Cook it to the color on the card: stir so it doesn't
stick, keep your stir speed in the meter's moving green zone, and drop the
trinity to stop the cooking — it keeps darkening for a moment.

Mobile-first browser game at **https://roux.dunn.us**. No build step, no dependencies.

- Each play is three rounds: a menu of three dishes (light, medium, dark), picked at random
  from 49 real Louisiana recipes, each credited and linked on the result screen.
- Each round starts with a 3…2…1…Fire! countdown that lights the burner.
- A stir-speed meter shows a green zone that holds, then slides somewhere new
  during the cook (narrower and fidgetier each round). Too slow and the bottom
  catches (flecks, −3 each); too fast and roux splashes on the stove (−2 each).
- Every dish gets a roux score (how close the color is) and a stir score (how
  much of the cook you kept it moving at the meter's pace).
- **Share** posts a text scorecard with a link that opens the same three dishes.

Code: https://github.com/andrewedunn/roux (private).

## Run it

```bash
npm run serve
```

Then open http://localhost:5190. To try it on a phone on the same Wi-Fi, open
`http://<your-mac's-ip>:5190`. Sound needs the phone's silent switch off.

## Test it

```bash
npm test
```

Uses Node's built-in test runner. Tests cover the game logic (color math,
cooking sim, stirring, scoring, menus, share text, links, storage).
Rendering and sound are checked by playing.

## Deploy it

```bash
wrangler deploy
```

A static-assets-only Cloudflare Worker named `roux` on the custom domain
`roux.dunn.us` (`wrangler.jsonc`). There's no server code. `.assetsignore`
keeps tests, docs, and config out of the public files.

## How it's put together

| File | What it does |
| --- | --- |
| `src/cook.js` | The cooking sim: browning, sticking, flecks, carryover, burning, the stir lock, and the stir score. Pure. |
| `src/roux.js` | Stage colors, the 49 dishes with recipe credits, and smell captions along the 0→1 browning scale. |
| `src/score.js` | OKLab scoring, verdict lines (dish, menu, stirring), and the "pull it ~0.8 s sooner" tip. |
| `src/stir.js` | Finger movement → stir activity (0..1), stir speed, and swirl direction. |
| `src/pace.js` | The speed meter's seeded, moving green zone, and too slow / on pace / too fast. |
| `src/menu.js` | Seeded three-dish menus (light, medium, dark). |
| `src/share.js` | Share text and the menu link (`?m=…`). |
| `src/store.js` | Remembers on the device that you've played (skips the how-to). |
| `src/color.js` | hex ↔ OKLab, distance, mixing. |
| `src/render.js` | Canvas drawing of the pot, flames, roux, trinity, paddle. |
| `src/audio.js` | Procedural Web Audio: sizzle, crackles, scrape, trinity hiss. |
| `src/main.js` | Game flow, frame loop, input, title card, and the result sheets. |

See [docs/design.md](docs/design.md) for why it works the way it does, and
[docs/dishes.md](docs/dishes.md) for where each dish's roux color comes from.

## Tuning

Almost all of the feel lives in the constants at the top of `src/cook.js`
(browning speed, carryover, how fast it sticks) and `src/score.js` (how harsh
the score curve is). The cook tests pin the pacing to ranges, so if you retune,
`npm test` tells you what moved.

On a keyboard, hold **S** to stir; **↑** and **↓** change your stir speed.
