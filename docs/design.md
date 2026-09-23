# Roux Wars — design

A mobile-first browser game: cook a roux to match a target color. Stir so it
doesn't stick, and drop the trinity to stop the cooking.

## Core loop: stir and pull

1. A dish card shows the target roux as a paint chip (e.g. "Peanut butter —
   Crawfish étouffée").
2. The burner comes on. The roux darkens on its own.
3. The player **stirs** by circling a finger in the pot. Stirring is a
   forgiving keep-alive: stop too long and the bottom catches, black specks
   appear, and enough specks means it's scorched.
4. There is one steady burner. (Heat levels were cut: with no reward for speed,
   Low was always the safer pick, so it wasn't a real choice.)
5. After lighting, the button is a locked **Stir first** that fills as you stir.
   It unlocks after ~2 seconds of real stirring (`STIR_TO_UNLOCK` in `src/cook.js`,
   enforced in the sim), and then reads **Drop the trinity** as a calm outlined
   key rather than a bright "go" button, so nobody taps it just because it
   appeared.
6. The player taps **Drop the trinity** to commit. The pot keeps darkening for
   a moment (carryover) while it cools. Then the result.
7. A menu is three dishes: one light, one medium, one dark target.

## Why it's built this way (from research)

- **Real roux is the game.** Browning starts slow, then the gap between shades
  shrinks at the dark end. Carryover after pulling it off the heat is real;
  cooks pull a shade early. Adding the trinity is what stops it. A scorched
  roux can't be saved.
- **Smell, not labels.** The current stage name is never shown while cooking —
  that would turn it into a "wait for the label" game. Instead a caption
  describes the smell (popcorn → toasted bread → pecans → chicory coffee → sharp),
  which is how real cooks judge the dark end.
- **Perceptual scoring.** Score by OKLab distance, not RGB. The curve is tuned
  so one named stage off is roughly 60, not 90 (Dialed-style curves bunch
  everyone near the top).
- **Honest near-miss feedback.** "A shade dark. Pull it about 0.8 s sooner."
  The seconds come from the browning rate at the moment you dropped.
- **Light surroundings.** Brown only reads as brown when it's darker than what
  surrounds it; on black it reads orange. So the stovetop is light, the pot has
  a light enamel interior rim, and the target chip sits on a light card. No
  dark mode for the kitchen.
- **Sound first.** A procedural sizzle tied to heat, crackles near burning,
  a big hiss when the trinity hits. Haptics only where the platform supports
  them (Android); nothing depends on them.
- **Frame-rate independent.** The sim steps on real elapsed time so carryover
  and burning behave the same at 30fps (iOS Low Power Mode) and 120fps.

## Simulation model (`src/cook.js`)

- `browning` 0 → 1 is raw → black. Past 1 is burnt.
- `temp` 0 → 1 warms up toward one steady burner. After the trinity drop it
  falls toward zero; browning continues while it's still warm. That lag is
  the carryover.
- `stick` 0 → 1 rises when you're not stirring (faster when hot and dark) and
  falls quickly when you stir. Above a threshold it lays down `specks`, which
  never go away. Too many specks = scorched.

## Current pacing

Seconds from lighting the burner, stirring steadily:

| Blond | Peanut butter | Copper penny | Milk chocolate | Brick | Dark chocolate | Black | Burnt |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 13 | 21 | 28 | 33 | 37 | 41 | 44 | 45 |

Carryover after the trinity drop is 0.03–0.04 on the browning scale — about
1.3 seconds' worth of cooking at every stage — and the pot settles about 3
seconds after the drop. Neighboring dark stages are ~0.08–0.12 apart, so
ignoring carryover costs real points. With no stirring, the first speck
appears after ~4–6 seconds.

Scoring: one dark stage off scores ~60; a light stage off scores lower because
light stages are further apart in color (and slower to cook, so easier to hit).

## Known limits

- Stage hex values are estimates and need checking against real roux photos.
- No haptics on iOS (Safari has no Vibration API); Android gets small pulses.
- Needs a browser with canvas `roundRect` (Safari 16+, Chrome 99+).
- Screen color settings (Night Shift, True Tone) can't be detected. Target and
  pot are on the same screen, so the comparison stays fair.

## Sharing

- Every play is a fresh random menu. (A numbered daily menu and "score to
  beat" challenge links were built and then cut: more machinery than a small
  game needs.)
- **Share text** is one header, one line per dish, one link:

  ```
  Roux Wars — 175/300
  🟫🟫🟫🟫🟫 94 Crawfish étouffée
  🟫🟫🟫🟫⬜ 81 Grillades & grits
  ⬛⬛⬛⬛⬛ Duck & andouille gumbo
  https://roux.dunn.us/?m=zzz
  ```

  Brown squares count 20 points each; a burnt dish is all black (not fire,
  which reads as "great" in group chats). The link opens the same three
  dishes, so a friend can cook what you cooked.
- **No accounts, no server.** The site is static files.

## Design pass (Hallmark)

The UI went through a Hallmark audit (Andrew's anti-AI-slop design skill).
The notable decisions: the kitchen is inert and unstarted behind the title
card; the target chip and the pot wall share one neutral enamel surround so
both are judged alike; one five-step type scale; Courier only for text
"written on the card" and the smell caption; every color, including the
canvas's, comes from CSS tokens. The Louisiana touches are kept light: "First
you make a roux.", "Ça c'est bon." for a top score, chicory coffee, the po-boy line, and a flat wooden roux paddle. "Mawmaw" is
the only family term; no dialect spellings.

## Out of scope for now

Daily menus, leaderboards, accounts, PWA/offline, analytics.
