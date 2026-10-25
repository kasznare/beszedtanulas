import { CARD_TOPICS } from './word-cards.js';

// Menus are grouped by skill, not by game. A card opens a screen, optionally straight into one of its
// exercises (kind), so one game (e.g. Montessori) can offer exercises in several skill groups.
// Cards run from the easiest to the hardest; ages is the range the card's levels cover.
const card = (screen, title, note, icon, ages, extra = {}) => Object.freeze({ screen, title, note, icon, ages, ...extra });
const section = (title, cards) => Object.freeze({ title, cards: Object.freeze(cards) });
export const GROUPS = Object.freeze([
  { screen: 'picture-menu', title: 'Képek és hangok', sections: [section('', [
    card('topics', 'Nézegessünk!', 'Beszélő képek', '🐱', '1–3'),
    card('animal-book', 'Hangos állatkönyv', 'Ki hogyan szól?', '📖', '1–4'),
    card('listening-game', 'Hol van?', 'Hallgasd meg, keresd meg', '🔎', '2–4'),
    card('flip', 'Mi bújt el?', 'Fordítsd fel a képeket', '🎁', '2–5'),
    card('memory', 'Hang–kép párok', 'Melyik képhez szól?', '🔊', '3–6', { kind: 'sound' }),
  ])] },
  { screen: 'practice-menu', title: 'Mondd utánam', sections: [section('', [
    card('imitate', 'Egy szó', 'Mondjuk együtt', '🍎', '1–4'),
    card('two-word', 'Két szó', 'Kérek vizet!', '🙏 💧', '2–4'),
    card('teddy-game', 'Én kérek', 'Kérj a macitól!', '🧸 🗣️', '2–5', { kind: 'expressive' }),
    card('r-practice', 'Róka R-kalandja', 'Gyakoroljuk az R-t', '🦊', '4–7'),
  ])] },
  { screen: 'play-menu', title: 'Játék Macival', sections: [section('', [
    card('teddy-game', 'Etesd meg a macit!', 'Mit kér a maci?', '🧸 🍎', '2–4', { kind: 'single' }),
    card('dress-game', 'Maci öltözik', 'Indulunk sétálni', '🧸 👟', '2–4'),
    card('meseliget', 'Meseliget', 'Piknik a macival', '🌳', '3–5'),
  ])] },
  { screen: 'shape-menu', title: 'Formák és minták', sections: [
    section('Válogass', [
      card('montessori', 'Építs tornyot!', 'Nagytól a kicsiig', '🥞', '2–4', { kind: 'tower' }),
      card('montessori', 'Formadoboz', 'Formák a helyükre', '🔺', '2–5', { kind: 'shapes' }),
      card('montessori', 'Színtálcák', 'Színek és árnyalatok', '🎨', '2–5', { kind: 'colors' }),
      card('workshop', 'Válogatókert', 'Mindent a helyére', '🧺', '3–6', { kind: 'sort' }),
    ]),
    section('Folytasd a sort', [
      card('teddy-game', 'Először… aztán…', 'Két kérés sorban', '🧸 1️⃣', '2–4', { kind: 'sequence' }),
      card('patterns', 'Folytasd a mintát!', 'Mi jön ezután?', '🔴 🔷', '3–7'),
      card('montessori', 'Mintaemlék', 'Jegyezd meg, rakd ki', '🟠 🔺', '3–6', { kind: 'memory' }),
      card('workshop', 'Mintaszövő', 'Fűzd tovább a mintát', '📿', '4–7', { kind: 'pattern' }),
    ]),
  ] },
  { screen: 'number-menu', title: 'Számok', sections: [section('', [
    card('numbers', 'Számoljuk meg!', 'Érints meg mindet', '🍎', '2–5', { mode: 'count' }),
    card('numbers', 'Keresd meg!', 'Melyiken van annyi?', '🔢', '3–5', { mode: 'quiz' }),
    card('furfangliget', 'Erdei bolt', 'Vásárolj és számolj', '🧺', '5–8', { kind: 'shop' }),
    card('workshop', 'Egyensúlyműhely', 'Mérd ki egyformára', '⚖️', '5–8', { kind: 'balance' }),
  ])] },
  { screen: 'activity-menu', title: 'Kirakók és építés', sections: [section('', [
    card('pour', 'Töltsünk a barátainknak!', 'Önts annyit, amennyi kell', '💧', '2–5'),
    card('memory', 'Képpárok', 'Keresd a párját', '🌼', '3–6', { kind: 'classic' }),
    card('puzzle', 'Képkirakó', 'Rakd össze a képet', '🧩', '3–6'),
    card('engineering', 'Pottyanó torony', 'Kapd el a jó pillanatot', '🏗️', '3–6', { kind: 'drop' }),
    card('differences', 'Találd meg a különbségeket!', 'Mi más a két képen?', '🔍', '4–8'),
    card('engineering', 'Szabad építés', 'Építs, amit szeretnél', '🧱', '4–8', { kind: 'build' }),
    card('engineering', 'Hídműhely', 'Építs hidat az autónak', '🌉', '6–10', { kind: 'bridge' }),
  ])] },
  { screen: 'big-menu', title: 'Fejtörők', sections: [section('', [
    card('montessori', 'Rendezőrács', 'Sor és oszlop', '▦', '4–7', { kind: 'grid' }),
    card('furfangliget', 'Szabálygép', 'Fedezd fel a szabályt', '⚙️', '5–8', { kind: 'machine' }),
    card('furfangliget', 'Csomagösvény', 'Tervezd meg az utat', '📦', '5–9', { kind: 'route' }),
    card('chess', 'Sakkliget', 'Lépések és fejtörők', '♟️', '5–10'),
    card('city-story', 'A film utolsó jelenete', 'Te alakítod a történetet', '🎬', '7–11'),
  ])] },
].map(group => Object.freeze({
  ...group,
  sections: Object.freeze(group.sections),
  cards: Object.freeze(group.sections.flatMap(entry => entry.cards)),
  // The distinct screens a group opens, for back navigation and the header label.
  screens: Object.freeze([...new Set(group.sections.flatMap(entry => entry.cards.map(item => item.screen)))]),
})));
// Stories are not a game: Mesetár opens straight from home, next to the game groups.
export const HOME_SCREENS = Object.freeze(['audiobooks']);

const screens = new Set(['home', 'parent', 'play-break', 'cards', ...HOME_SCREENS, ...GROUPS.flatMap(group => [group.screen, ...group.screens])]);
const categories = new Set(CARD_TOPICS.map(category => category.id));
const modes = new Set(['count', 'quiz']);
// A game offered in several groups returns to its main group after a reload or deep link.
const MAIN_GROUP = { memory: 'activity-menu', 'teddy-game': 'play-menu', montessori: 'shape-menu', workshop: 'shape-menu', furfangliget: 'big-menu', engineering: 'activity-menu' };
const parents = new Map(GROUPS.flatMap(group => [
  [group.screen, 'home'],
  ...group.screens.map(screen => [screen, group.screen]),
]).reverse());
for (const [screen, group] of Object.entries(MAIN_GROUP)) parents.set(screen, group);
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
