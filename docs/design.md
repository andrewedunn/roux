# Roux Wars — v1 design

A mobile-first browser game: cook a roux to match a target color. Stir so it
doesn't stick, pick your heat, and drop the trinity to stop the cooking.

v1 is about locking in the *play*. Sharing, dailies, challenge links, and
streaks come later.

## Core loop: stir and pull

1. A dish card shows the target roux as a paint chip (e.g. "Peanut butter —
   Crawfish étouffée").
2. The burner comes on. The roux darkens on its own.
3. The player **stirs** by circling a finger in the pot. Stirring is a
   forgiving keep-alive: stop too long and the bottom catches, black specks
   appear, and enough specks means it's scorched.
4. The player picks **heat** (Low / Med / High). Hotter browns faster, catches
   faster, and carries over more.
5. The player taps **Drop the trinity** to commit. The pot keeps darkening for
   a moment (carryover) while it cools. Then the result.
6. A menu is three dishes: one light, one medium, one dark target.

## Why it's built this way (from research)

- **Real roux is the game.** Browning starts slow, then the gap between shades
  shrinks at the dark end. Carryover after pulling it off the heat is real;
  cooks pull a shade early. Adding the trinity is what stops it. A scorched
  roux can't be saved.
- **Smell, not labels.** The current stage name is never shown while cooking —
  that would turn it into a "wait for the label" game. Instead a caption
  describes the smell (popcorn → toasted bread → pecans → coffee → acrid),
  which is how real cooks judge the dark end.
- **Perceptual scoring.** Score by OKLab distance, not RGB. The curve is tuned
  so one named stage off is roughly 60, not 90 (Dialed-style curves bunch
  everyone near the top).
- **Honest near-miss feedback.** "A shade dark. Pull it about 0.8s sooner."
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
- `temp` 0 → 1 chases the heat setting with lag. After the trinity drop it
  falls quickly toward zero; browning continues while it's still warm. That
  lag is the carryover, and it's bigger at high heat.
- `stick` 0 → 1 rises when you're not stirring (faster when hot and dark) and
  falls quickly when you stir. Above a threshold it lays down `specks`, which
  never go away. Too many specks = scorched.

## Out of scope for v1

Sharing, daily puzzle, challenge links, streaks, leaderboards, accounts,
server, PWA/offline.
