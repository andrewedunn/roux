// ABOUTME: The roux itself: named color stages along a 0→1 browning scale, the dishes each suits, and smells.
// ABOUTME: Hex values are estimates; dish pairings are sourced (docs/dishes.md); dark stages sit closer together.
import { mixHex } from './color.js';

// Each dish is a specific published recipe whose roux color it states. Where cooks disagree on a dish's
// color, each version is its own dish. Sources and notes: docs/dishes.md.
const dish = (name, credit, url, kind = 'recipe', crystal = false) => ({ name, credit, url, kind, crystal });
// Crystal Hot Sauce's own published recipes: the "Crystal Kitchen" dishes in the partner edition.
const crystalDish = (name, credit, url) => dish(name, credit, url, 'recipe', true);

export const STAGES = [
  { name: 'White', at: 0.0, hex: '#efe3c8', dishes: [] },
  {
    name: 'Blond',
    at: 0.16,
    hex: '#e0c38a',
    dishes: [
      dish('Creole crawfish étouffée', 'John Folse · WAFB', 'https://www.wafb.com/story/6267150/chef-john-folses-louisiana-style-crawfish-etoufee/'),
      dish('Creamy crawfish bisque', 'WAFB', 'https://www.wafb.com/story/26216515/creamy-crawfish-bisque/'),
      dish('Corn & crab bisque', 'Emeril Lagasse', 'https://www.emerils.com/123393/louisiana-corn-and-crab-bisque'),
      dish('Oyster & artichoke bisque', 'John Folse · FOX 8', 'https://www.fox8live.com/2018/09/12/chef-folse-oyster-artichoke-bisque/'),
      dish('Seafood au gratin', 'John Folse · WAFB', 'https://www.wafb.com/story/398868/chef-john-folses-seafood-au-gratin/'),
      dish('Crawfish fettuccine', 'The Speckled Palate', 'https://www.thespeckledpalate.com/crawfish-fettuccine/'),
    ],
  },
  {
    name: 'Peanut butter',
    at: 0.34,
    hex: '#c08a4e',
    dishes: [
      dish('Breaux Bridge étouffée', 'Explore Louisiana', 'https://www.explorelouisiana.com/culinary/recipes/crawfish-etouffee-recipe-and-instructional-video'),
      dish('NOLA shrimp étouffée', 'Emeril Lagasse', 'https://www.emerils.com/126622/shrimp-etouffee'),
      dish('Creole family gumbo', 'Serious Eats', 'https://www.seriouseats.com/creole-gumbo-recipe-11906420'),
      dish('City seafood gumbo', 'New Orleans Magazine', 'https://www.myneworleans.com/andouille-to-zherbes/'),
      dish('Roast duck gumbo', 'Southern Cast Iron', 'https://southerncastiron.com/duck-and-andouille-gumbo/'),
      dish('Cajun turtle piquante', 'Hank Shaw · Hunter Angler Gardener Cook', 'https://honest-food.net/turtle-sauce-piquante/'),
      dish('Acadian chicken piquante', 'Saveur', 'https://www.saveur.com/article/Recipes/Chicken-Sauce-Piquante'),
      dish('Mama’s chicken fricassée', 'John Folse', 'http://www.jfolse.com/recipes/poultry/chicken17.htm'),
      dish('Meatball stew', 'Magic Seasoning Blends', 'https://www.magicseasoningblends.com/recipes/meatball-stew/'),
      dish('Shrimp stew', 'Louisiana Cookin’', 'https://louisianacookin.com/shrimp-stew/'),
      dish('Grillades & rice grits', 'Louisiana Cookin’', 'https://louisianacookin.com/rice-grits-and-grillades/'),
      dish('New Orleans turtle soup', 'Hank Shaw · Hunter Angler Gardener Cook', 'https://honest-food.net/turtle-soup-recipe-creole/'),
      dish('Redfish courtbouillon', 'Rouses Markets', 'https://www.rouses.com/cooking/recipes/donny-rouses-redfish-court-bouillon/'),
      dish('Shrimp Creole', 'Explore Louisiana', 'https://www.explorelouisiana.com/culinary/recipes/oak-alleys-shrimp-creole-recipe'),
      dish('Shrimp & corn soup', 'Louisiana Kitchen & Culture', 'https://louisiana.kitchenandculture.com/recipes/louisiana-shrimp-and-corn-soup'),
    ],
  },
  {
    // John Folse's "dark brown" roux is lighter than chocolate by his own definition, so his recipes sit here.
    name: 'Copper penny',
    at: 0.52,
    hex: '#9e5b2e',
    dishes: [
      dish('Cajun seafood gumbo', 'Donald Link · Leite’s Culinaria', 'https://leitesculinaria.com/78819/recipes-seafood-gumbo.html'),
      dish('Country filé gumbo', 'Emeril Lagasse · Food Network', 'https://www.foodnetwork.com/recipes/emerils-country-file-gumbo-3644244'),
      dish('Seafood sauce piquante', 'John Folse · Louisiana Kitchen & Culture', 'https://louisiana.kitchenandculture.com/recipes/louisiana-seafood-sauce-piquant'),
      dish('Sunday chicken fricassée', 'John Folse', 'http://jfolse.com/stirrin/recipes/recipes2009/SIU_011709fricassee.htm'),
      dish('Easter crawfish bisque', 'John Folse · Louisiana Cookin’', 'https://louisianacookin.com/a-taste-of-tradition-in-every-pot-of-crawfish-bisque/'),
      dish('River Road crawfish stew', 'John Folse · WAFB', 'https://www.wafb.com/story/713777/chef-john-folses-river-road-crawfish-stew/'),
      dish('Creole turtle soup', 'John Folse · Louisiana Cookin’', 'https://louisianacookin.com/creole-turtle-soup/'),
      dish('Catfish courtbouillon', 'John Folse', 'http://jfolse.com/recipe_week/recipe0308/wafb_030108courtblln.html'),
    ],
  },
  {
    name: 'Milk chocolate',
    at: 0.67,
    hex: '#74462a',
    dishes: [
      // Both Crystal recipes say: the color of a Hershey's (milk chocolate) bar.
      crystalDish('Commander’s seafood gumbo', 'Commander’s Palace · Crystal Hot Sauce', 'https://crystalhotsauce.com/recipes/commanders-palace-seafood-gumbo/'),
      crystalDish('Crystal chicken gumbo', 'Crystal Hot Sauce', 'https://crystalhotsauce.com/recipes/chicken-and-sausage-gumbo/'),
      dish('Chicken & sausage gumbo', 'Isaac Toups · NewOrleans.com', 'https://www.neworleans.com/blog/post/chef-isaac-toups-chicken-sausage-gumbo-with-cornbread/'),
      dish('Classic seafood gumbo', 'Emeril Lagasse', 'https://www.emerils.com/126534/emerils-classic-seafood-gumbo'),
      dish('Rabbit sauce piquante', 'Louisiana Cookin’', 'https://louisianacookin.com/rabbit-sauce-piquante/'),
      dish('Mamou meatball fricassée', 'Acadiana Table', 'https://acadianatable.com/2022/01/17/cajun-meatball-fricassee/'),
      dish('Boucherie backbone stew', 'Acadiana Table', 'https://acadianatable.com/2025/03/17/backbone-stew/'),
      dish('Houma courtbouillon', 'Acadiana Table', 'https://acadianatable.com/2026/02/09/redfish-courtbouillon/'),
    ],
  },
  {
    name: 'Brick',
    at: 0.79,
    hex: '#5e2e1c',
    dishes: [
      dish('Flash-roux shrimp étouffée', 'Magic Seasoning Blends', 'https://www.magicseasoningblends.com/recipes/shrimp-or-crawfish-etouffee-stew/'),
      dish('New Orleans gumbo ya-ya', 'Mr. B’s Bistro · Country Roads', 'https://countryroadsmagazine.com/cuisine/recipes/mr-b-s-gumbo-ya-ya/'),
      dish('Flash-roux andouille gumbo', 'Magic Seasoning Blends', 'https://www.magicseasoningblends.com/recipes/chicken-and-andouille-smoked-sausage-gumbo/'),
      dish('Gulf seafood couvillion', 'Isaac Toups · Deep South', 'https://deepsouthmag.com/2019/11/20/chef-isaac-toups-has-the-recipe-to-bring-family-together/'),
    ],
  },
  {
    name: 'Dark chocolate',
    at: 0.89,
    hex: '#45281a',
    dishes: [
      dish('Cajun crawfish étouffée', 'Saveur', 'https://www.saveur.com/article/Recipes/Crawfish-Etouffee-1000079357/'),
      dish('Lake Charles chicken gumbo', 'Saveur', 'https://www.saveur.com/article/recipes/fried-chicken-and-andouille-gumbo/'),
      dish('French Quarter okra gumbo', 'Gumbo Shop', 'https://gumboshop.com/recipes/seafood-okra-gumbo/'),
      dish('Duck & andouille gumbo', 'Louisiana Cookin’', 'https://louisianacookin.com/duck-andouille-gumbo/'),
      dish('Alligator sauce piquante', 'Louisiana Seafood', 'https://www.louisianaseafood.com/recipe/alligator-sauce-piquante'),
      dish('Crab & shrimp stew', 'Marcelle Bienvenu · Louisiana Cookin’', 'https://louisianacookin.com/crab-and-shrimp-stew/'),
      dish('Dad’s grillades', 'Kelly English · Louisiana Kitchen & Culture', 'https://louisiana.kitchenandculture.com/recipes/kelly-english-s-dad-s-grillades'),
      dish('Shrimp & okra gumbo', 'Louisiana Kitchen & Culture', 'https://louisiana.kitchenandculture.com/recipes/traditional-shrimp-and-okra-gumbo'),
    ],
  },
  {
    name: 'Black',
    at: 0.97,
    hex: '#2b1a12',
    dishes: [
      dish('Cajun duck-andouille gumbo', 'Mason Hereford · TODAY', 'https://www.today.com/recipes/duck-andouille-gumbo-recipe-t279858'),
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
