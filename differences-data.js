// Art and hit testing share these centres. The illustration uses an 800 × 520
// viewBox; interaction areas are percentages so they also work when zoomed.
function difference(id, label, hint, x, y, rx, ry, difficulty = 1) {
  return { id, label, hint, difficulty, area: { x: x / 8, y: y / 5.2, rx: rx / 8, ry: ry / 5.2 } };
}

export const DIFFERENCE_SCENES = [
  {
    id: 'picnic', name: 'Kerti piknik', subtitle: 'Uzsonna a nagy almafa alatt', emoji: '🧺',
    differences: [
      difference('sun', 'A nap közepe', 'Nézz fel az égre, a jobb felső sarokba!', 710, 75, 38, 38),
      difference('kite', 'A papírsárkány színe', 'Hasonlítsd össze a magasban repülő papírsárkányt!', 465, 77, 43, 43),
      difference('birdhouse', 'A madárodú nyílása', 'Az almafán kis madárodú lóg. Milyen a bejárata?', 230, 132, 39, 42),
      difference('basket', 'A kosár kendője', 'A piknikkosárból kendő lóg ki. Nézd meg a színét!', 290, 280, 51, 44),
      difference('teapot', 'A teáskanna mintája', 'A pokróc fölött teáskanna vár. Mi van az oldalán?', 485, 285, 43, 37),
      difference('watering-can', 'A locsolókanna színe', 'Jobbra lent egy locsolókanna áll a fűben.', 675, 425, 50, 40),
      difference('bunting', 'A zászló alakja', 'Balra fent egy zászlófüzér leng. Figyeld a középső zászlót!', 83, 95, 34, 30, 2),
      difference('butterfly', 'A lepke szárnya', 'A bal oldali bokor fölött lepke repül. Hasonlítsd össze a szárnyait!', 105, 240, 36, 32, 2),
      difference('flower', 'A nagy virág közepe', 'Balra lent egy nagy rózsaszín virág nyílik.', 80, 430, 34, 38, 2),
      difference('fruit', 'A gyümölcs a tányéron', 'A pokróc bal alsó részén tányér van. Milyen gyümölcs fekszik rajta?', 255, 415, 35, 31, 2),
      difference('squirrel', 'A mókus makkja', 'A jobb oldali fa tövénél mókus ül. Nézd meg, mit tart!', 675, 280, 43, 39, 3),
      difference('napkin', 'A szalvéta csíkjai', 'A pokróc jobb alsó részén hajtogatott szalvéta van.', 450, 420, 38, 33, 3),
    ],
  },
  {
    id: 'harbor', name: 'Vidám kikötő', subtitle: 'Vitorlások, sirályok és parti kincsek', emoji: '⛵',
    differences: [
      difference('lighthouse-window', 'A világítótorony ablaka', 'Nézd meg a világítótorony középső ablakát!', 88, 202, 32, 34),
      difference('sail', 'A vitorla jelképe', 'A nagy vitorláson jel van a vitorla közepén.', 430, 210, 42, 39),
      difference('flag', 'A kikötő zászlója', 'Középen, a magas rúdon színes zászló leng.', 580, 105, 36, 33),
      difference('life-ring', 'A mentőöv csíkjai', 'A móló bal szélén mentőöv függ.', 190, 350, 40, 40),
      difference('cabin-window', 'A parti ház ablaka', 'A jobb felső sarokban kis parti ház áll. Nézd az ablakát!', 718, 100, 36, 34),
      difference('crab', 'A rák ollója', 'Jobbra lent egy rák sétál a homokban.', 680, 430, 42, 35),
      difference('weathervane', 'A szélkakas iránya', 'A világítótorony tetején hal alakú széljelző van.', 88, 76, 38, 31, 2),
      difference('gull', 'A sirály csőre', 'Balra fent egy sirály repül. Figyeld a csőrét!', 290, 96, 40, 30, 2),
      difference('float', 'A bója csíkja', 'A jobb oldalon egy bója ring a vízen.', 700, 230, 30, 32, 2),
      difference('porthole', 'A hajóablak keresztje', 'Nézd meg a nagy hajó kerek ablakát!', 455, 305, 33, 33, 2),
      difference('fish', 'A hal mintája', 'A mólón kis ládában hal fekszik. Figyeld az oldalát!', 335, 390, 46, 34, 3),
      difference('rope', 'A kötél melletti kagyló', 'A mólón feltekert kötél van. Mi fekszik mellette?', 495, 395, 40, 33, 3),
    ],
  },
  {
    id: 'workshop', name: 'Játékműhely', subtitle: 'Készülnek a játékok a napsütötte műhelyben', emoji: '🛠️',
    differences: [
      difference('clock', 'Az óra számlapja', 'Nézd meg a falióra közepét!', 95, 80, 39, 39),
      difference('apron', 'A kötény zsebe', 'Balra a fogason kötény lóg. Milyen a zsebe?', 90, 245, 42, 43),
      difference('toolbox', 'A szerszámosláda fogantyúja', 'A munkapad bal oldalán kis szerszámosláda áll.', 285, 310, 47, 38),
      difference('toy-car', 'A kisautó színe', 'A munkapadon kisautó készül. Nézd meg a karosszériáját!', 485, 310, 47, 37),
      difference('paint', 'A festékesdoboz címkéje', 'Jobbra lent festékesdoboz áll a földön.', 690, 430, 40, 37),
      difference('lamp', 'A lámpaernyő színe', 'Jobbra fent lámpa világítja meg a munkát.', 665, 95, 48, 38),
      difference('spools', 'A cérnaorsó színe', 'A felső polcon cérnaorsók állnak. A középsőt figyeld!', 295, 85, 36, 36, 2),
      difference('robot', 'A kis robot antennája', 'A jobb oldali polcon játékrobot áll.', 700, 240, 38, 41, 2),
      difference('window', 'A virágcserép mintája', 'Az ablakpárkányon virág nyílik. Figyeld a cserepét!', 485, 196, 36, 40, 2),
      difference('blocks', 'Az építőkockák sorrendje', 'Balra lent színes építőkockák vannak a szőnyegen.', 115, 430, 47, 35, 2),
      difference('ruler', 'A vonalzó rovátkái', 'A szerszámosfal közepén rövid vonalzó függ.', 300, 202, 36, 36, 3),
      difference('rocking-horse', 'A hintaló sörénye', 'A munkapad alatt hintaló áll. Nézd a sörényét!', 445, 425, 43, 40, 3),
    ],
  },
  {
    id: 'greenhouse', name: 'Titkos télikert', subtitle: 'Levelek, virágok és apró látogatók', emoji: '🌿',
    differences: [
      difference('hanging-pot', 'A függő cserép színe', 'Balra fent nagy cserép lóg a gerendáról.', 110, 105, 44, 43),
      difference('orchid', 'Az orchidea virága', 'A középső polcon nagy orchidea nyílik.', 320, 255, 42, 40),
      difference('watering-can', 'A locsolókanna rózsája', 'A jobb oldali polcon locsolókanna áll. Nézd meg a kiöntőjét!', 650, 275, 49, 39),
      difference('boots', 'A gumicsizma színe', 'Jobbra lent egy pár gumicsizma vár.', 690, 430, 46, 39),
      difference('cactus', 'A kaktusz virága', 'Balra lent kerek kaktusz él egy cserépben.', 115, 415, 40, 43),
      difference('butterfly', 'A magasban repülő lepke', 'Jobbra fent színes lepke repül az üveg alatt.', 680, 100, 38, 33),
      difference('bird', 'A madár szárnya', 'Az ablakon túl, középen madár pihen egy ágon.', 470, 100, 38, 32, 2),
      difference('labels', 'A vetőmagos tasak jele', 'Balra a polcon vetőmagos tasak áll. Nézd meg a rajzát!', 105, 260, 37, 36, 2),
      difference('lemon', 'A citromfa termése', 'Középen, a jobb oldali kis fán gyümölcs érik.', 485, 275, 37, 36, 2),
      difference('snail', 'A csiga háza', 'A padló közepén csiga mászik.', 325, 440, 39, 31, 2),
      difference('thermometer', 'A hőmérő folyadéka', 'A felső gerenda alatt hőmérő függ.', 300, 100, 30, 39, 3),
      difference('trowel', 'Az ültetőlapát nyele', 'Lent, a földes zsák mellett ültetőlapát fekszik.', 505, 420, 40, 34, 3),
    ],
  },
];

// Kezdő is the entry level: three obvious changes (missing or extra things) and generous tap areas.
export const DIFFERENCE_LEVELS = [
  { id: 'starter', name: 'Kezdő', count: 3, ceiling: 1, hitScale: 1.6, variants: ['missing', 'extra'] },
  { id: 'explorer', name: 'Felfedező', count: 5, ceiling: 1, hitScale: 1.2, variants: ['authored', 'missing', 'extra', 'color'] },
  { id: 'observer', name: 'Megfigyelő', count: 7, ceiling: 2, hitScale: 1, variants: ['authored', 'authored', 'color', 'mirror', 'extra'] },
  { id: 'detective', name: 'Nyomozó', count: 10, ceiling: 3, hitScale: 1, variants: ['authored', 'authored', 'color', 'mirror'] },
];
// Besides its drawn change, every detail can be shown recoloured, missing or with a small extra visitor.
// Mirroring is offered only where the drawing is clearly not left-right symmetric.
export const DIFFERENCE_VARIANTS = ['authored', 'color', 'missing', 'extra', 'mirror'];
const MIRROR_SAFE = new Set(['teapot', 'watering-can', 'squirrel', 'gull', 'fish', 'toy-car', 'rocking-horse', 'bird', 'snail', 'trowel', 'kite']);
export const differenceVariants = id => DIFFERENCE_VARIANTS.filter(kind => kind !== 'mirror' || MIRROR_SAFE.has(id));

const unit = rng => { const value = Number(rng()); return Number.isFinite(value) ? Math.max(0, Math.min(value, 1 - Number.EPSILON)) : 0; };
export function createDifferenceRound(sceneId, levelId = 'observer', rng = Math.random) {
  const scene = DIFFERENCE_SCENES.find(item => item.id === sceneId) || DIFFERENCE_SCENES[0];
  const level = DIFFERENCE_LEVELS.find(item => item.id === levelId) || DIFFERENCE_LEVELS[2];
  const available = scene.differences.filter(item => item.difficulty <= level.ceiling).map(item => item.id);
  for (let i = available.length - 1; i > 0; i -= 1) {
    const j = Math.floor(unit(rng) * (i + 1));
    [available[i], available[j]] = [available[j], available[i]];
  }
  const ids = available.slice(0, level.count);
  const variants = Object.fromEntries(ids.map(id => {
    const pool = level.variants.filter(kind => differenceVariants(id).includes(kind));
    return [id, pool[Math.floor(unit(rng) * pool.length)] || 'authored'];
  }));
  return { sceneId: scene.id, levelId: level.id, ids, variants };
}

export function findDifferenceAt(scene, ids, x, y, found = [], hitScale = 1) {
  const currentScene = typeof scene === 'string' ? DIFFERENCE_SCENES.find(item => item.id === scene) : scene;
  if (!currentScene || !Number.isFinite(x) || !Number.isFinite(y) || x < 0 || y < 0 || x > 100 || y > 100) return undefined;
  const selected = new Set(ids);
  const completed = new Set(found);
  const scale = Number.isFinite(hitScale) && hitScale >= 1 ? hitScale : 1;
  const distance = item => ((x - item.area.x) / (item.area.rx * scale)) ** 2 + ((y - item.area.y) / (item.area.ry * scale)) ** 2;
  // With enlarged areas two details can overlap; the nearer one wins.
  return currentScene.differences.filter(item => selected.has(item.id) && !completed.has(item.id) && distance(item) <= 1)
    .sort((a, b) => distance(a) - distance(b))[0];
}

// Fewer stars for scattered tapping (every third miss) and for each hint used.
export function differenceStars({ misses = 0, hints = 0 } = {}) {
  return Math.max(1, Math.min(5, 5 - Math.floor(Math.max(0, misses) / 3) - Math.max(0, hints)));
}

// The location sentence of a hint stays true for every variant; the detail question only fits the drawn change.
export function differenceHint(difference, variant = 'authored') {
  if (variant === 'authored') return difference.hint;
  const first = difference.hint.match(/^.*?[.!?](?=\s|$)/)?.[0] || difference.hint;
  return first;
}
