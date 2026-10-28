export const BUILD_PIECES = Object.freeze([
  { id: 'block', name: 'Kocka', width: 64, height: 64, color: '#e5ab50', mark: '▦', volume: 4 },
  { id: 'plank', name: 'Hosszú gerenda', width: 128, height: 32, color: '#67a897', mark: '▬', volume: 4 },
  { id: 'pillar', name: 'Oszlop', width: 32, height: 96, color: '#8b9ec7', mark: '▥', volume: 3 },
  { id: 'roof', name: 'Háromszög', width: 96, height: 64, color: '#dc8871', mark: '▲', volume: 3 },
  { id: 'ball', name: 'Henger', width: 64, height: 64, color: '#a5b879', mark: '●', volume: Math.PI },
]);
// stars: the most material that still earns three and two stars. The limits
// come from searched working designs (tests/engineering.test.mjs re-checks
// that each three-star limit is reachable by a bridge that carries the load).
export const BRIDGE_LEVELS = Object.freeze([
  { name: 'Kis patak', spans: 3, budget: 24, stars: [18, 21], load: 0.65, vehicle: 'Kisautó', lesson: 'A háromszög megtartja az alakját. Próbálj átlós rudakat is!' },
  { name: 'Széles folyó', spans: 4, budget: 34, stars: [28, 30], load: 0.85, vehicle: 'Kisteherautó', lesson: 'A hosszabb híd több helyen hajolhat meg. Támaszd meg a közepét is!' },
  { name: 'Nehéz rakomány', spans: 4, budget: 30, stars: [30, 30], load: 1.65, vehicle: 'Rakott teherautó', lesson: 'Nehéz teher alatt a gyenge rúd eltörik. Figyeld, melyik rúd pirosodik!' },
  { name: 'Kőpillér', spans: 4, piers: [2], budget: 26, stars: [23, 24], load: 1.65, vehicle: 'Rakott teherautó', lesson: 'A folyó közepén kőpillér áll. Arra is támaszkodhat a híd!' },
  { name: 'Hosszú híd', spans: 5, budget: 42, stars: [38, 40], load: 1, vehicle: 'Kisteherautó', lesson: 'Öt szakasz, sok hajlási pont. Háromszögekkel merevítsd végig!' },
]);
// Pottyanó torony: reach the flag height (in cubes) before three splashes.
export const DROP_SPLASHES = 3;
export const BLOCK_UNIT = 64;
const FIRST_BAG = ['block', 'block', 'block', 'plank', 'plank', 'pillar'];
const FULL_BAG = ['block', 'block', 'block', 'plank', 'plank', 'pillar', 'roof', 'ball'];
export const DROP_LEVELS = Object.freeze([
  { goal: 3, island: 300, bag: FIRST_BAG },
  { goal: 5, island: 300, bag: FULL_BAG },
  { goal: 6, island: 250, bag: FULL_BAG },
  { goal: 7, island: 220, bag: FULL_BAG },
]);
// Szabad építés challenge cards, checked against the settled construction.
export const BUILD_CHALLENGES = Object.freeze([
  { id: 'house', name: 'Maci háza', mark: '🏠', hint: 'Tegyél tetőt két oszlopra!' },
  { id: 'tree', name: 'Olyan magas, mint a fa', mark: '🌳', height: 5, hint: 'Építs a fa tetejéig!' },
  { id: 'castle', name: 'Nagy vár', mark: '🏰', count: 10, hint: 'Állíts össze tíz elemet!' },
]);
export const ROTATABLE_PIECES = Object.freeze(['plank', 'pillar']);
export const ENGINEERING_CLIPS = {
  engineering_flag: 'Elérted a zászlót!',
  engineering_challenge: 'Kész! Ügyesen építettél!',
  engineering_bar_broke: 'Eltört egy rúd! Erősítsd meg háromszögekkel!',
  engineering_hub: 'Építsünk együtt! Ejts elemeket a toronyra, tervezz saját építményt, vagy építs hidat!',
  engineering_drop: 'Az elem ide-oda mozog. Koppints, és leesik! Építs a szigetre! A vízbe ne essen!',
  engineering_build: 'Válassz egy elemet, és koppints oda, ahová tennéd! El is forgathatod. Próbálj széles alapot építeni!',
  engineering_bridge: 'Építs hidat! Koppints két pontra, és összekötjük egy rúddal. A végén engedd át az autót!',
  engineering_water: 'Csobbant! Próbáld beljebb tenni! Vissza is vonhatod az utolsó lépést.',
  engineering_success: 'Átért az autó! A híd megtartotta a rakományt!',
  engineering_retry: 'A híd meghajlott. Próbáld átlós rudakkal megerősíteni!',
};

export function bridgeLayout(level = 0) {
  const info = BRIDGE_LEVELS[level] || BRIDGE_LEVELS[0];
  const step = 480 / info.spans;
  return { ...info, step, nodes: Array.from({ length: (info.spans + 1) * 2 }, (_, i) => {
    const row = i > info.spans ? 1 : 0, col = i % (info.spans + 1);
    const pier = row === 0 && (info.piers || []).includes(col);
    return { id: `${row ? 't' : 'd'}${col}`, x: 160 + col * step, y: 360 - row * 140, fixed: row === 0 && (col === 0 || col === info.spans || pier), ...(pier ? { pier: true } : {}) };
  }) };
}
export function beamKey(a, b) { return [a, b].sort().join(':'); }
export function beamCost(layout, a, b) {
  const p = layout.nodes.find(n => n.id === a), q = layout.nodes.find(n => n.id === b);
  if (!p || !q || a === b) return 0;
  const colA = Number(a.slice(1)), colB = Number(b.slice(1));
  if (Math.abs(colA - colB) > 1) return 0;
  return a[0] !== b[0] && colA !== colB ? 3 : 2;
}
export function bridgeSpent(layout, beams) { return beams.reduce((sum, [a, b]) => sum + beamCost(layout, a, b), 0); }
export function editBridge(layout, beams, a, b) {
  const cost = beamCost(layout, a, b);
  if (!cost) return { beams, error: 'Szomszédos pontokat köss össze! Átlósan is lehet.' };
  const key = beamKey(a, b), exists = beams.some(pair => beamKey(...pair) === key);
  if (exists) return { beams: beams.filter(pair => beamKey(...pair) !== key) };
  if (bridgeSpent(layout, beams) + cost > layout.budget) return { beams, error: 'Elfogyott az anyagkeret. Vegyél ki egy rudat, vagy vond vissza az utolsót!' };
  return { beams: [...beams, [a, b]] };
}
export function hasBridgeRoad(layout, beams) {
  const keys = new Set(beams.map(pair => beamKey(...pair)));
  return Array.from({ length: layout.spans }, (_, i) => keys.has(beamKey(`d${i}`, `d${i + 1}`))).every(Boolean);
}
export function bridgeStars(layout, beams) {
  const spent = bridgeSpent(layout, beams), [three, two] = layout.stars || [0, 0];
  return spent <= three ? 3 : spent <= two ? 2 : 1;
}

// A fresh bag holds every piece of the level once, shuffled. A triangle or a
// cylinder never opens a bag, so a run cannot start on an unstackable piece.
export function createDropBag(level = 0, random = Math.random) {
  const bag = [...(DROP_LEVELS[level] || DROP_LEVELS[0]).bag];
  for (let i = bag.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [bag[i], bag[j]] = [bag[j], bag[i]];
  }
  const first = bag.findIndex(id => id === 'block' || id === 'plank');
  if (first > 0) [bag[0], bag[first]] = [bag[first], bag[0]];
  return bag;
}
export function dropStars(splashes) { return Math.max(1, DROP_SPLASHES - Math.max(0, splashes)); }
/** Tower height in whole cubes, with a little tolerance for resting contacts. */
export function towerBlocks(top) { return Math.max(0, Math.floor((500 - top + 6) / BLOCK_UNIT)); }

const stars = v => Number.isInteger(v) && v >= 0 && v <= 3 ? v : 0;
export function normalizeEngineering(value = {}) {
  const best = v => Number.isInteger(v) && v >= 0 && v <= 100 ? v : 0;
  const dropStarsSaved = DROP_LEVELS.map((_, i) => stars(value?.dropStars?.[i]));
  // A level opens after the previous one earned at least one star.
  let dropLevel = 0;
  while (dropLevel < DROP_LEVELS.length - 1 && dropStarsSaved[dropLevel] > 0) dropLevel++;
  return {
    dropBest: best(value?.dropBest), buildBest: best(value?.buildBest),
    dropLevel, dropStars: dropStarsSaved,
    buildStars: Object.fromEntries(BUILD_CHALLENGES.map(({ id }) => [id, stars(value?.buildStars?.[id])])),
    bridges: BRIDGE_LEVELS.map((_, level) => {
      const raw = value?.bridges?.[level], layout = bridgeLayout(level);
      let beams = [];
      for (const pair of (Array.isArray(raw?.beams) ? raw.beams.slice(0, 40) : [])) {
        if (!Array.isArray(pair) || pair.length !== 2 || pair.some(id => typeof id !== 'string')) continue;
        if (beams.some(p => beamKey(...p) === beamKey(...pair))) continue;
        beams = editBridge(layout, beams, ...pair).beams;
      }
      const completed = raw?.completed === true;
      return { beams, completed, stars: completed ? Math.max(1, stars(raw?.stars)) : 0 };
    }),
  };
}
export function bridgeUnlocked(progress, level) {
  return level === 0 || progress?.bridges?.[level - 1]?.completed === true;
}
export function validateEngineering(value) {
  if (value === undefined) return;
  const fields = ['dropBest', 'buildBest', 'dropLevel', 'dropStars', 'buildStars', 'bridges'];
  if (!value || typeof value !== 'object' || Array.isArray(value) || JSON.stringify(normalizeEngineering(value)) !== JSON.stringify(Object.fromEntries(fields.map(key => [key, value[key]])))) {
    throw new Error('Az Építőliget mentése hibás. Nem módosítottam a játékot.');
  }
}
// Progress lives per profile in its own storage key (like Montessori rounds),
// outside the shared progress backup.
export const ENGINEERING_STORAGE_PREFIX = 'engineering_progress_v1:';
export function loadEngineering(storage, scope = 'default') {
  try { return normalizeEngineering(JSON.parse(storage?.getItem(ENGINEERING_STORAGE_PREFIX + scope) || 'null')); }
  catch { return normalizeEngineering(); }
}
export function saveEngineering(storage, scope = 'default', value) {
  try { storage?.setItem(ENGINEERING_STORAGE_PREFIX + scope, JSON.stringify(normalizeEngineering(value))); return true; }
  catch { return false; }
}
