// ABOUTME: Scores a finished pot against the target shade using perceptual (OKLab) distance.
// ABOUTME: Also produces the verdict line and an honest tip: which way it missed and by roughly how many seconds.
import { deltaE } from './color.js';
import { rouxColor } from './roux.js';

// score = 100 / (1 + (ΔE / K)^2). K is tuned so a barely visible miss keeps ~95
// and one named dark stage off lands around 60.
const K = 0.1;
const SPOT_ON_DELTA = 0.015;
const POINTS_PER_SPECK = 3;

const VERDICTS = [
  { min: 95, text: 'Ça c’est bon.' },
  { min: 85, text: 'Mawmaw would eat it.' },
  { min: 70, text: 'Close enough for a Tuesday.' },
  { min: 50, text: 'It’s a roux. Technically.' },
  { min: 0, text: 'That’s a different dish.' },
];

const BURN_VERDICTS = {
  scorched: 'Scorched. There’s no saving it — throw it out.',
  overcooked: 'Past black. Everybody burns one.',
};

function missAmount(dE) {
  if (dE < 0.04) return 'A touch';
  if (dE < 0.1) return 'A shade';
  return 'Way too';
}

function tipFor(direction, dE, secondsOff) {
  if (direction === 'spot-on') return 'Pulled it right on time.';
  const when = secondsOff > 10 ? 'a lot' : `about ${secondsOff.toFixed(1)}\u00a0s`;
  if (direction === 'dark') {
    return `${missAmount(dE)} dark. Pull it ${when} sooner — it keeps cooking after the trinity.`;
  }
  return `${missAmount(dE)} light. Give it ${when} longer.`;
}

export function scoreDish(targetBrowning, cook) {
  const targetHex = rouxColor(targetBrowning);
  const finalHex = rouxColor(cook.browning);
  const dE = deltaE(targetHex, finalHex);

  if (cook.status === 'burnt') {
    return {
      score: 0,
      burnt: true,
      targetHex,
      finalHex,
      deltaE: dE,
      direction: 'dark',
      secondsOff: null,
      speckPenalty: 0,
      verdict: BURN_VERDICTS[cook.burnReason],
      tip: cook.burnReason === 'scorched' ? 'Keep stirring so the bottom doesn’t catch.' : 'Pull it sooner, or drop the heat.',
    };
  }

  const speckPenalty = POINTS_PER_SPECK * Math.floor(cook.specks);
  const colorScore = Math.round(100 / (1 + (dE / K) ** 2));
  const score = Math.max(0, colorScore - speckPenalty);

  let direction = 'spot-on';
  if (dE >= SPOT_ON_DELTA) direction = cook.browning > targetBrowning ? 'dark' : 'light';
  const secondsOff = cook.rateAtDrop > 0 ? Math.abs(cook.browning - targetBrowning) / cook.rateAtDrop : null;

  return {
    score,
    burnt: false,
    targetHex,
    finalHex,
    deltaE: dE,
    direction,
    secondsOff,
    speckPenalty,
    verdict: VERDICTS.find((v) => score >= v.min).text,
    tip: tipFor(direction, dE, secondsOff ?? 0),
  };
}

const MENU_VERDICTS = [
  { min: 270, text: 'Somebody sign you up for the gumbo cook-off.' },
  { min: 225, text: 'The family’s coming back for seconds.' },
  { min: 150, text: 'Solid. Nobody’s complaining out loud.' },
  { min: 75, text: 'Might be a po-boy night.' },
  { min: 0, text: 'Mawmaw’s taking over the stove.' },
];

export function menuVerdict(total) {
  return MENU_VERDICTS.find((v) => total >= v.min).text;
}
