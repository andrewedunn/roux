# Roux Wars

> **This branch is the Crystal Hot Sauce partner edition**, a pitch mockup deployed separately
> as the Worker `roux-crystal` at https://crystal-roux.dunn.us. Don't merge it into `main`;
> the live game at roux.dunn.us deploys from `main`. What it adds: a "Shake in the Crystal" step
> after the trinity (`src/brand.js`, bottle and dashes in `src/render.js`), Crystal's own gumbo
> recipes as "Crystal Kitchen" dishes, and Crystal colors and marks throughout. The marks are
> drawn stand-ins (Yellowtail script); swap in Crystal's real logo files if the deal moves ahead.

First you make a roux. Cook it to the color on the card: stir so it doesn't
stick, and drop the trinity to stop the cooking — it keeps darkening for a moment.

Mobile-first browser game at **https://roux.dunn.us**. No build step, no dependencies.

- Each play is a menu of three dishes (light, medium, dark), picked at random
  from 49 real Louisiana recipes, each credited and linked on the result screen.
- Every dish gets a roux score (how close the color is) and a stir score (how
  steadily you kept it moving). Pauses leave flecks that cost points.
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
| `src/stir.js` | Finger movement → stir activity (0..1) and swirl direction. |
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

On a keyboard, hold **S** to stir.
