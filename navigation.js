import { wordCategories } from './game-data.js';

// Each game has one home in the menu. A trail can still cross between groups.
// Every group is one kind of activity, listed from the easiest game to the hardest.
export const GROUPS = Object.freeze([
  { screen: 'picture-menu', title: 'Képek és hangok', screens: ['topics', 'animal-book', 'listening-game', 'flip'] },
  { screen: 'practice-menu', title: 'Mondd utánam', screens: ['imitate', 'two-word', 'r-practice'] },
  { screen: 'play-menu', title: 'Játék Macival', screens: ['teddy-game', 'dress-game', 'meseliget'] },
  { screen: 'activity-menu', title: 'Kirakók és ügyesség', screens: ['memory', 'puzzle', 'pour', 'montessori', 'differences'] },
  { screen: 'number-menu', title: 'Számok és minták', screens: ['numbers', 'patterns'] },
  // Reading, planning and longer puzzles live apart from the toddler games.
  { screen: 'big-menu', title: 'Nagyoknak', screens: ['city-story', 'chess', 'furfangliget', 'workshop', 'engineering'] },
].map(group => Object.freeze({ ...group, screens: Object.freeze(group.screens) })));
// Stories are not a game: Mesetár opens straight from home, next to the game groups.
export const HOME_SCREENS = Object.freeze(['audiobooks']);

const screens = new Set(['home', 'parent', 'play-break', 'cards', ...HOME_SCREENS, ...GROUPS.flatMap(group => [group.screen, ...group.screens])]);
const categories = new Set(wordCategories.map(category => category.id));
const modes = new Set(['count', 'quiz']);
const parents = new Map(GROUPS.flatMap(group => [
  [group.screen, 'home'],
  ...group.screens.map(screen => [screen, group.screen]),
]));
parents.set('cards', 'topics');
parents.set('parent', 'home');

export function parentScreen(screen) {
  return parents.get(screen) || 'home';
}

function object(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

export function normalizeRoute(value, defaults = {}) {
  const source = object(value) ? value : {};
  return {
    screen: screens.has(source.screen) ? source.screen : 'home',
    category: categories.has(source.category) ? source.category : categories.has(defaults.category) ? defaults.category : 'all',
    numberMode: modes.has(source.numberMode) ? source.numberMode : modes.has(defaults.numberMode) ? defaults.numberMode : 'count',
  };
}

export function canonicalTrail(value) {
  const route = normalizeRoute(value);
  const path = [route.screen];
  while (path[0] !== 'home') path.unshift(parentScreen(path[0]));
  return path.map(screen => ({ ...route, screen }));
}

function validRoute(route) {
  return object(route) && screens.has(route.screen) && categories.has(route.category) && modes.has(route.numberMode);
}

function readTrail(value) {
  if (!Array.isArray(value) || !value.length || value[0]?.screen !== 'home') return null;
  for (let index = 0; index < value.length; index++) {
    if (!validRoute(value[index])) return null;
    if (index && (value[index].screen === 'home' || value[index - 1].screen === value[index].screen)) return null;
  }
  return value.map(route => normalizeRoute(route));
}

export function normalizeTrail(value, fallbackRoute = { screen: 'home' }) {
  return readTrail(value) || canonicalTrail(fallbackRoute);
}

export function transitionTrail(value, destination) {
  const trail = normalizeTrail(value);
  const route = normalizeRoute(destination, trail.at(-1));
  if (route.screen === 'home') return [route];
  if (route.screen === trail.at(-1).screen) return [...trail.slice(0, -1), route];
  return [...trail, route];
}

// ownedDepth counts actual earlier entries written by this app, not inferred
// parents. A repaired deep link therefore has a useful trail but depth zero.
export function createHistoryState(value, ownedDepth = 0) {
  const trail = normalizeTrail(value);
  const depth = Number.isInteger(ownedDepth) && ownedDepth >= 0
    ? Math.min(ownedDepth, trail.length - 1)
    : 0;
  return { navigationVersion: 1, ...trail.at(-1), trail, ownedDepth: depth };
}

export function restoreHistoryState(value, fallbackRoute = { screen: 'home' }) {
  const source = object(value) ? value : {};
  const trail = source.navigationVersion === 1 ? readTrail(source.trail) : null;
  const route = trail?.at(-1);
  const depthValid = Number.isInteger(source.ownedDepth) && source.ownedDepth >= 0 && source.ownedDepth < (trail?.length || 0);
  const agrees = route && source.screen === route.screen && source.category === route.category && source.numberMode === route.numberMode;
  if (trail && depthValid && agrees) return { trail, route: { ...route }, ownedDepth: source.ownedDepth };

  const fallback = normalizeRoute(screens.has(source.screen) ? source : fallbackRoute, fallbackRoute);
  return { trail: canonicalTrail(fallback), route: fallback, ownedDepth: 0 };
}
