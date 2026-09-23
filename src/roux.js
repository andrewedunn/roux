// ABOUTME: The roux itself: named color stages along a 0→1 browning scale, the dishes each suits, and smells.
// ABOUTME: Hex values are estimates; dish pairings are sourced (docs/dishes.md); dark stages sit closer together.
import { mixHex } from './color.js';

// Dish pairings come from published Louisiana recipes; see docs/dishes.md for sources and the contested ones.
const dish = (name, credit, url, kind = 'recipe') => ({ name, credit, url, kind });

export const STAGES = [
  { name: 'White', at: 0.0, hex: '#efe3c8', dishes: [] },
  {
    name: 'Blond',
    at: 0.16,
    hex: '#e0c38a',
    dishes: [
      dish('Corn & crab bisque', 'Emeril Lagasse', 'https://www.emerils.com/123393/louisiana-corn-and-crab-bisque'),
      dish('Oyster & artichoke bisque', 'John Folse · FOX 8', 'https://www.fox8live.com/2018/09/12/chef-folse-oyster-artichoke-bisque/'),
      dish('Seafood au gratin', 'John Folse · WAFB', 'https://www.wafb.com/story/398868/chef-john-folses-seafood-au-gratin/'),
      dish('Crawfish fettuccine', 'Louisiana Cookin’', 'https://louisianacookin.com/crawfish-fettuccini/'),
      dish('Crawfish étouffée', 'John Folse · WAFB', 'https://www.wafb.com/story/6267150/chef-john-folses-louisiana-style-crawfish-etoufee/'),
    ],
  },
  {
    name: 'Peanut butter',
    at: 0.34,
    hex: '#c08a4e',
    dishes: [
      dish('Shrimp étouffée', 'Emeril Lagasse', 'https://www.emerils.com/126622/shrimp-etouffee'),
      dish('Shrimp Creole', 'Louisiana Cookin’', 'https://louisianacookin.com/shrimp-creole/'),
      dish('Chicken Creole', 'John Folse · WAFB', 'https://www.wafb.com/2022/01/01/lite-flavorful-chicken-creole/'),
      dish('Shrimp & corn soup', 'Donald Link · Real Cajun', 'https://www.ddvculinary.com/cookbooks_pdf/Real-Cajun.pdf'),
      dish('Turtle soup', 'Commander’s Palace · Food Network', 'https://www.foodnetwork.com/recipes/turtle-soup-recipe-1951164'),
      dish('Shrimp stew', 'Louisiana Cookin’', 'https://louisianacookin.com/shrimp-stew/'),
    ],
  },
  {
    name: 'Copper penny',
    at: 0.52,
    hex: '#9e5b2e',
    dishes: [
      dish('Crawfish stew', 'Real Cajun Recipes', 'https://www.realcajunrecipes.com/recipe/shrimp-or-crawfish-stew/'),
      dish('Seafood gumbo', 'Donald Link · Real Cajun', 'https://www.ddvculinary.com/cookbooks_pdf/Real-Cajun.pdf'),
    ],
  },
  {
    name: 'Milk chocolate',
    at: 0.67,
    hex: '#74462a',
    dishes: [
      dish('Chicken & sausage gumbo', 'Isaac Toups · Deep South', 'https://deepsouthmag.com/2020/10/20/chef-isaac-toups-chicken-sausage-gumbo/'),
      dish('Grillades & grits', 'America’s Test Kitchen', 'https://www.americastestkitchen.com/recipes/13442-slow-cooker-pork-grillades'),
    ],
  },
  {
    name: 'Brick',
    at: 0.79,
    hex: '#5e2e1c',
    dishes: [
      dish('Gumbo ya-ya', 'Mr. B’s Bistro', 'https://www.mrbsbistro.com/recipes_gumbo.php'),
      dish('Redfish courtbouillon', 'Isaac Toups · Deep South', 'https://deepsouthmag.com/2019/11/20/chef-isaac-toups-has-the-recipe-to-bring-family-together/'),
      dish('Crawfish bisque', 'Isaac Toups · Garden & Gun', 'https://gardenandgun.com/articles/how-to-make-a-roux/', 'story'),
    ],
  },
  {
    name: 'Dark chocolate',
    at: 0.89,
    hex: '#45281a',
    dishes: [
      dish('Duck & andouille gumbo', 'Emeril Lagasse · Food Network', 'https://www.foodnetwork.com/recipes/duck-and-andouille-sausage-gumbo-3644983'),
      dish('Rabbit sauce piquante', 'Jean-Paul Bourgeois · Garden & Gun', 'https://gardenandgun.com/recipe/classic-cajun-country-stew'),
      dish('Chicken fricassée', 'Acadiana Table', 'https://acadianatable.com/cest-what-the-cajun-creole-dictionary/', 'story'),
      dish('Meatball stew', 'Acadiana Table', 'https://acadianatable.com/2022/01/17/cajun-meatball-fricassee/'),
      dish('Crab & shrimp stew', 'Marcelle Bienvenu · Louisiana Cookin’', 'https://louisianacookin.com/crab-and-shrimp-stew/'),
      dish('Shrimp & okra gumbo', 'Acadiana Table', 'https://acadianatable.com/2025/03/31/cajun-and-creole-whats-the-difference-and-which-is-the-true-louisiana-cuisine/', 'story'),
      dish('Backbone stew', 'Acadiana Table', 'https://acadianatable.com/2025/03/17/backbone-stew/'),
    ],
  },
  {
    name: 'Black',
    at: 0.97,
    hex: '#2b1a12',
    dishes: [
      dish('Black-roux seafood gumbo', 'Seafood Palace · Southern Foodways', 'https://www.southernfoodways.org/interview/seafood-palace/', 'story'),
    ],
  },
];

export const BURNT_HEX = '#1e1a17';
const BURNT_SPAN = 0.1;

const SMELLS = [
  { below: 0.08, text: 'Smells like raw flour.' },
  { below: 0.25, text: 'Smells like fresh popcorn.' },
  { below: 0.45, text: 'Smells like toasted bread.' },
  { below: 0.62, text: 'Smells like roasted pecans.' },
  { below: 0.8, text: 'Smells deep and nutty.' },
  { below: 0.93, text: 'Smells like chicory coffee.' },
  { below: Infinity, text: 'Smells sharp. Careful.' },
];

export function rouxColor(browning) {
  const last = STAGES[STAGES.length - 1];
  if (browning >= last.at) {
    if (browning <= 1) return last.hex;
    return mixHex(last.hex, BURNT_HEX, Math.min(1, (browning - 1) / BURNT_SPAN));
  }
  if (browning <= 0) return STAGES[0].hex;
  const i = STAGES.findIndex((s) => s.at > browning);
  const lo = STAGES[i - 1];
  const hi = STAGES[i];
  return mixHex(lo.hex, hi.hex, (browning - lo.at) / (hi.at - lo.at));
}

export function nearestStage(browning) {
  return STAGES.reduce((best, s) => (Math.abs(s.at - browning) < Math.abs(best.at - browning) ? s : best));
}

export function smellAt(browning) {
  return SMELLS.find((s) => browning < s.below).text;
}
