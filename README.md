# Roux Wars

Cook a roux to the color on the card. Stir so it doesn't stick, pick your heat,
and drop the trinity to stop the cooking — it keeps darkening for a moment.

Mobile-first browser game. No build step, no dependencies.

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
cooking sim, stirring, scoring, menus). Rendering and sound are checked by
playing.

## How it's put together

| File | What it does |
| --- | --- |
| `src/cook.js` | The cooking sim: heat lag, browning, sticking, specks, carryover, burning. Pure. |
| `src/roux.js` | Stage colors, dishes, and smell captions along the 0→1 browning scale. |
| `src/score.js` | OKLab scoring, verdict lines, and the "pull it ~0.8s sooner" tip. |
| `src/stir.js` | Finger movement → stir activity (0..1) and swirl direction. |
| `src/menu.js` | Seeded three-dish menus (light, medium, dark). |
| `src/color.js` | hex ↔ OKLab, distance, mixing. |
| `src/render.js` | Canvas drawing of the pot, flames, roux, trinity, spoon. |
| `src/audio.js` | Procedural Web Audio: sizzle, crackles, scrape, trinity hiss. |
| `src/main.js` | Game flow, frame loop, input, and the result sheets. |

See [docs/design.md](docs/design.md) for why it works the way it does.

## Tuning

Almost all of the feel lives in the constants at the top of `src/cook.js`
(browning speed, heat lag, carryover, how fast it sticks) and `src/score.js`
(how harsh the score curve is). The cook tests pin the pacing to ranges, so
if you retune, `npm test` tells you what moved.

On a keyboard, hold **S** to stir.
