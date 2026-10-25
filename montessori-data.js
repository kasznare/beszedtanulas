export const MONTESSORI_GAMES = {
  shapes: { name: 'Formadoboz', description: 'Párosítsd a színt, az alakot és a méretet!', levels: ['Három forma', 'Szín és forma', 'Minden forma', 'Csúszó akadályok', 'Kicsi és nagy', 'Fordítsd el!', 'Apró különbségek', 'Terveződeszka'] },
  colors: { name: 'Színtálcák', description: 'Színek, árnyalatok és pontos adagok.', levels: ['Két szín', 'Három szín', 'Négy szín', 'Árnyalatok', 'Pont annyit'] },
  tower: { name: 'Építs tornyot!', description: 'Nagy alul, kicsi felül.', levels: ['Három korong', 'Négy korong', 'Öt korong', 'Hat korong', 'Hetes torony'] },
  grid: { name: 'Rendezőrács', description: 'A sor és az oszlop együtt mutatja a helyet.', levels: ['Két szabály', 'Három oszlop', 'Kilenc hely', 'Három tulajdonság', 'Mi hiányzik?', 'Mi nem illik?'] },
  memory: { name: 'Mintaemlék', description: 'Figyeld meg, rejtsd el, majd rakd ki!', levels: ['Színsor', 'Hosszabb színsor', 'Szín és alak', 'Kevés nézés'] },
};
// Memory span: each level starts here, then adapts between 3 and 7 beads.
export const MONTESSORI_MEMORY_START = [3, 4, 4, 5];
export const MONTESSORI_MEMORY_PEEKS = [null, null, 2, 1];
export const MONTESSORI_SPAN_MIN = 3, MONTESSORI_SPAN_MAX = 7;
export const MONTESSORI_SHAPES = { circle: 'kör', square: 'négyzet', triangle: 'háromszög', hexagon: 'hatszög' };
export const MONTESSORI_COLORS = [
  { id: 'coral', name: 'Piros', hex: '#c95f4e' },
  { id: 'blue', name: 'Kék', hex: '#5088a8' },
  { id: 'gold', name: 'Sárga', hex: '#d6a132' },
  { id: 'green', name: 'Zöld', hex: '#69936b' },
];
export const MONTESSORI_CLIPS = {
  montessori_menu: 'Fedezzük fel a kis műhelyt! Formadoboz, színtálcák, torony, rendezőrács és mintamemória vár rád!',
  montessori_shapes_1: 'Tedd a formát a hozzá illő lyukba! Húzd oda, vagy koppints a formára, majd a lyukra!',
  montessori_shapes_2: 'Nézd a lyuk alakját és a keret színét! Keresd meg az ugyanilyen színű és alakú formát, és tedd bele!',
  montessori_shapes_3: 'A szín és a forma is egyezzen! Tedd a formákat a hozzájuk illő, színes keretű lyukakba!',
  montessori_shapes_4: 'Csúsztasd félre az akadályokat a deszkán! Az akadályra koppinthatsz is. Aztán tedd a formákat az ugyanolyan színű kerettel jelölt, hozzájuk illő lyukakba!',
  montessori_shapes_size: 'A szín, az alak és a méret is számít. A kicsi forma a kicsi lyukba illik. A bábukat arrébb is tolhatod a deszkán.',
  montessori_shapes_turn: 'Nézd meg a méretet és az elfordítást is! A kijelölt formát a forgatás gombbal fordíthatod el. Tedd minden formát a helyére!',
  montessori_colors_shades: 'A világos és a sötét golyóknak külön tálkájuk van. A golyó és a tálka árnyalata is egyezzen!',
  montessori_colors_count: 'Minden tálkába annyi golyó kerüljön, amennyit a pöttyök mutatnak! Maradhatnak golyók a tálcán.',
  montessori_grid: 'Nézd a sor jelét és az oszlop színét! A kettő együtt mutatja az elem helyét. Rakd tele a rácsot, majd ellenőrizd!',
  montessori_grid_size: 'A sorban az alak és a méret, az oszlopban a szín mutatja a helyet. Figyelj mindháromra, majd ellenőrizd!',
  montessori_grid_done: 'Minden elem a megfelelő sorban és oszlopban van!',
  montessori_grid_retry: 'Nézd meg újra a sor és az oszlop jelét! A lerakott elemeket is áthelyezheted.',
  montessori_memory: 'Figyeld meg a mintát! Ha megjegyezted, rejtsd el, és rakd ki emlékezetből! A végén ellenőrizd!',
  montessori_memory_done: 'Újra kiraktad a megfigyelt mintát!',
  montessori_memory_retry: 'Nézzük meg újra a mintát! Az elemeket átcserélheted, és újra ellenőrizheted.',
  montessori_colors: 'Tedd a golyókat az azonos színű tálkákba! Húzd oda, vagy koppints a golyóra, majd a tálkára!',
  montessori_tower: 'Építs tornyot! A legnagyobb korong kerüljön alulra, aztán mindig a következő legnagyobb. Tedd a korongot a toronyra!',
  montessori_shape_retry: 'Nézd meg az alakját és a színét is! Keress egy ugyanilyen színű kerettel jelölt, hozzá illő lyukat!',
  montessori_shape_turn_retry: 'Jó formát választottál. Fordítsd el a nyilakkal!',
  montessori_color_retry: 'Keress egy ugyanilyen színű tálkát!',
  montessori_tower_retry: 'Előbb egy nagyobb korong következik. Nézd meg a tálcát!',
  montessori_blocked: 'Ezt a lyukat még akadály takarja. Csúsztasd félre az akadályt!',
  montessori_clear: 'Szabad az út! Most már belefér a forma.',
  montessori_shapes_done: 'Minden forma átpottyant a dobozba!',
  montessori_colors_done: 'Minden golyó a saját színű tálkájába került!',
  montessori_tower_done: 'Elkészült a torony! Nagy alul, kicsi felül.',
};

export function normalizeMontessoriOptions(options = {}) {
  const source = options && typeof options === 'object' ? options : {};
  const levels = Object.fromEntries(Object.entries(MONTESSORI_GAMES).map(([kind, game]) => {
    const key = `montessori${kind[0].toUpperCase()}${kind.slice(1)}Level`;
    return [key, Number.isInteger(source[key]) && source[key] >= 1 && source[key] <= game.levels.length ? source[key] : 1];
  }));
  // 0 means "the chosen level's starting span".
  const span = source.montessoriMemorySpan;
  return { ...levels, montessoriMemorySpan: Number.isInteger(span) && span >= MONTESSORI_SPAN_MIN && span <= MONTESSORI_SPAN_MAX ? span : 0, montessoriMemoryStreak: source.montessoriMemoryStreak === 1 ? 1 : 0 };
}

// Two clean rounds in a row lengthen the sequence; a failed check shortens it.
export function nextMemorySpan(span, streak, { misses = 0, peeks = 0 } = {}) {
  const current = Math.max(MONTESSORI_SPAN_MIN, Math.min(MONTESSORI_SPAN_MAX, Number.isInteger(span) ? span : MONTESSORI_SPAN_MIN));
  if (misses > 0) return { span: Math.max(MONTESSORI_SPAN_MIN, current - 1), streak: 0 };
  if (peeks > 0) return { span: current, streak: 0 };
  if (streak >= 1) return { span: Math.min(MONTESSORI_SPAN_MAX, current + 1), streak: 0 };
  return { span: current, streak: 1 };
}

function shuffled(items, random) {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const n = random();
    const j = Number.isFinite(n) ? Math.max(0, Math.min(i, Math.floor(n * (i + 1)))) : 0;
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export function montessoriRandom(seed) {
  let value = seed >>> 0;
  return () => { value += 0x6D2B79F5; let t = Math.imul(value ^ value >>> 15, 1 | value); t ^= t + Math.imul(t ^ t >>> 7, 61 | t); return ((t ^ t >>> 14) >>> 0) / 4294967296; };
}
export const rotationPeriod = shape => ({ circle: 1, square: 1, triangle: 4, hexagon: 2 })[shape] || 1;
export function montessoriColorHex(color, shade = null) {
  const hex = MONTESSORI_COLORS.find(item => item.id === color)?.hex || '#c95f4e';
  if (shade === null) return hex;
  const components = [1, 3, 5].map(index => parseInt(hex.slice(index, index + 2), 16));
  return '#' + components.map(n => Math.round(shade === 0 ? n + (255 - n) * .3 : n * .76).toString(16).padStart(2, '0')).join('');
}

function pick(length, random) {
  const n = random();
  return Number.isFinite(n) ? Math.max(0, Math.min(length - 1, Math.floor(n * length))) : 0;
}
const sameBead = (a, b) => a.color === b.color && a.shape === b.shape;
// True when the row is just a shorter motif shown at least twice (ABAB, ABCABC).
export function isRepeatingMotif(row, same = sameBead) {
  for (let period = 1; period * 2 <= row.length; period++) if (row.every((item, i) => same(item, row[i % period]))) return true;
  return false;
}

export function newMontessoriRound(kind = 'shapes', level = 1, random = Math.random, options = {}) {
  if (!Object.hasOwn(MONTESSORI_GAMES, kind)) kind = 'shapes';
  if (!Number.isInteger(level) || level < 1 || level > MONTESSORI_GAMES[kind].levels.length) level = 1;
  let pieces, targets, extra = {};
  if (kind === 'shapes') {
    const shapes = shuffled(Object.keys(MONTESSORI_SHAPES), random);
    const colors = shuffled(MONTESSORI_COLORS.map(color => color.id), random);
    // Level 1 is a real sorter: three shapes, one colour, three holes.
    let combinations = level === 1 ? [0, 1, 2].map(i => [shapes[i], colors[0], 1, 0]) : [[shapes[0], colors[0], 1, 0]];
    // Repeated shapes and colors make both properties necessary to solve.
    if (level === 2) combinations.push([shapes[1], colors[1], 1, 0], [shapes[2], colors[0], 1, 0], [shapes[0], colors[1], 1, 0], [shapes[1], colors[0], 1, 0]);
    if (level >= 3) combinations.push([shapes[0], colors[1], 1, 0], [shapes[1], colors[0], 1, 0]);
    if (level === 4) combinations.push([shapes[2], colors[2], 1, 0]);
    if (level === 5) combinations = [0, 1].flatMap(size => [[shapes[0], colors[0], size, 0], [shapes[1], colors[1], size, 0]]);
    if (level === 6) combinations = [0, 1].flatMap(rotation => [['triangle', colors[0], 1, rotation], ['hexagon', colors[1], 1, rotation]]);
    if (level === 7) combinations = [['triangle', colors[0], 0, 0], ['triangle', colors[0], 1, 0], ['square', colors[1], 0, 0], ['square', colors[2], 1, 0], ['hexagon', colors[1], 1, 0], ['hexagon', colors[1], 1, 1]];
    if (level === 8) combinations = [['triangle', colors[0], 0, 0], ['triangle', colors[0], 0, 1], ['triangle', colors[1], 1, 2], ['square', colors[1], 0, 0], ['square', colors[2], 1, 0], ['hexagon', colors[2], 0, 0], ['hexagon', colors[2], 1, 1], ['circle', colors[3], 1, 0]];
    const matched = combinations.map(([shape, color, size, rotation]) => ({ id: level < 5 ? `${shape}-${color}` : `${shape}-${color}-s${size}-r${rotation}`, shape, color, size, rotation }));
    // Level 2: three holes; the last two pieces are distractors sharing a shape or a colour.
    targets = shuffled(level === 2 ? matched.slice(0, 3) : matched, random).map(piece => ({ ...piece }));
    pieces = matched.map(piece => ({ ...piece, rotation: level >= 6 ? (piece.rotation + 1) % rotationPeriod(piece.shape) : 0 }));
  } else if (kind === 'colors') {
    const palette = shuffled(MONTESSORI_COLORS, random);
    if (level <= 3) targets = palette.slice(0, level + 1).map(color => ({ id: color.id, color: color.id, shade: null, count: 2 }));
    else if (level === 4) targets = palette.slice(0, 3).flatMap(color => [0, 1].map(shade => ({ id: `${color.id}-${shade}`, color: color.id, shade, count: 2 })));
    else {
      // Four bowls ask for 1, 2, 3 and 4 balls in a new order each time; every bowl has one spare ball.
      const counts = shuffled([1, 2, 3, 4], random);
      targets = palette.slice(0, 2).flatMap((color, c) => [0, 1].map(shade => ({ id: `${color.id}-${shade}`, color: color.id, shade, count: counts[c * 2 + shade] })));
      extra = { checked: false };
    }
    pieces = targets.flatMap(target => Array.from({ length: target.count + (level === 5 ? 1 : 0) }, (_, i) => ({ id: `${target.id}-${i}`, color: target.color, shade: target.shade })));
  } else if (kind === 'tower') {
    pieces = Array.from({ length: level + 2 }, (_, index) => ({ id: `disc-${index}`, size: index + 1 }));
    targets = [{ id: 'tower' }];
  } else if (kind === 'grid') {
    const colors = shuffled(MONTESSORI_COLORS, random).slice(0, level === 1 ? 2 : 3);
    const shapes = shuffled(Object.keys(MONTESSORI_SHAPES), random);
    const rows = level === 4 ? [0, 1].flatMap(size => shapes.slice(0, 2).map(shape => ({ shape, size }))) : shapes.slice(0, level < 3 ? 2 : 3).map(shape => ({ shape, size: 1 }));
    targets = rows.flatMap((row, r) => colors.map((color, c) => ({ id: `cell-${r}-${c}`, row: r, column: c, color: color.id, shape: row.shape, size: row.size, rotation: 0 })));
    pieces = targets.map((target, i) => ({ id: `tile-${i}`, color: target.color, shape: target.shape, size: target.size, rotation: 0 }));
    extra = { rows, columns: colors.map(color => color.id), checked: false };
    if (level >= 5) {
      // A finished 3×3 grid with one gap (5) or one tile that breaks the rule (6).
      const gap = pick(targets.length, random), cell = targets[gap];
      const otherColors = shuffled(colors.filter(color => color.id !== cell.color), random).map(color => color.id);
      const otherShapes = shuffled(rows.map(row => row.shape).filter(shape => shape !== cell.shape), random);
      const tile = (id, shape, color) => ({ id, shape, color, size: 1, rotation: 0 });
      const wrong = [...otherColors.map(color => tile('', cell.shape, color)), ...otherShapes.map(shape => tile('', shape, cell.color))];
      const odd = level === 6 ? { ...wrong[pick(wrong.length, random)], id: 'odd-tile' } : null;
      const decoys = shuffled(wrong.filter(item => !odd || !sameBead(item, odd)), random);
      // One decoy keeps the row's shape, the other keeps the column's colour.
      const pair = [decoys.find(item => item.shape === cell.shape), decoys.find(item => item.color === cell.color)].filter(Boolean);
      const candidates = [tile('candidate-0', cell.shape, cell.color), ...pair.slice(0, 2).map((item, i) => ({ ...item, id: `candidate-${i + 1}` }))];
      const fixed = pieces.filter((_, i) => i !== gap);
      pieces = [...fixed, ...candidates, ...(odd ? [odd] : [])];
      const placements = fixed.map(piece => ({ piece: piece.id, target: targets[Number(piece.id.slice(5))].id }));
      if (odd) placements.push({ piece: odd.id, target: cell.id });
      extra = { ...extra, mode: odd ? 'odd' : 'missing', phase: odd ? 'find' : 'fix', fixed: fixed.map(piece => piece.id), odd: odd?.id ?? null, gap: cell.id, placements };
    }
  } else {
    const span = Number.isInteger(options.span) && options.span >= MONTESSORI_SPAN_MIN && options.span <= MONTESSORI_SPAN_MAX ? options.span : MONTESSORI_MEMORY_START[level - 1];
    const colorsOnly = level <= 2;
    const palette = colorsOnly ? MONTESSORI_COLORS.map(color => ({ color: color.id, shape: 'circle' })) : MONTESSORI_COLORS.flatMap(color => Object.keys(MONTESSORI_SHAPES).map(shape => ({ color: color.id, shape })));
    // A random sequence, not a repeating motif: colours never repeat within two
    // steps, and colour-and-shape beads never repeat at all.
    let pattern = [];
    for (let attempt = 0; attempt < 12; attempt++) {
      pattern = [];
      for (let i = 0; i < span; i++) {
        const allowed = palette.filter(bead => colorsOnly ? !pattern.slice(-2).some(item => sameBead(item, bead)) : !pattern.some(item => sameBead(item, bead)));
        pattern.push(allowed[pick(allowed.length, random)]);
      }
      if (!isRepeatingMotif(pattern)) break;
    }
    pattern = pattern.map(bead => ({ ...bead, size: 1, rotation: 0 }));
    targets = pattern.map((expected, index) => ({ id: `bead-${index}`, expected }));
    pieces = pattern.map((piece, i) => ({ ...piece, id: `bead-piece-${i}` }));
    // Spare beads look like the real ones: same shape, or same colour with another shape.
    const spares = level <= 2 ? 1 : 2;
    for (let i = 0; i < spares; i++) {
      const base = pattern[pick(pattern.length, random)];
      const unused = MONTESSORI_COLORS.map(color => color.id).filter(color => !pattern.some(bead => bead.color === color));
      const colorsLeft = MONTESSORI_COLORS.map(color => color.id).filter(color => color !== base.color);
      const shapesLeft = Object.keys(MONTESSORI_SHAPES).filter(shape => shape !== base.shape);
      const spare = colorsOnly || i === 0
        ? { color: (unused.length ? unused : colorsLeft)[pick((unused.length ? unused : colorsLeft).length, random)], shape: base.shape }
        : { color: base.color, shape: shapesLeft[pick(shapesLeft.length, random)] };
      pieces.push({ ...spare, size: 1, rotation: 0, id: `spare-bead-${i}` });
    }
    extra = { phase: 'preview', checked: false, assisted: false, span, peeks: 0, peekLimit: MONTESSORI_MEMORY_PEEKS[level - 1], misses: 0 };
  }
  const blockers = kind === 'shapes' && [4, 7, 8].includes(level) ? (level === 4 ? [0, 2] : level === 7 ? [0, 3] : [0, 3, 6]).map(i => targets[i].id) : [];
  return { kind, level, pieces: shuffled(pieces, random), targets, blockers, cleared: [], positions: {}, rotations: {}, placements: [], total: kind === 'colors' ? targets.reduce((sum, target) => sum + target.count, 0) : kind === 'tower' ? pieces.length : targets.length, ...extra };
}

// Exercises finished with the ✓ button: grids, memory rows and exact counting.
export const montessoriNeedsCheck = round => ['grid', 'memory'].includes(round.kind) && !round.mode || round.kind === 'colors' && round.level === 5;
const discSize = (round, move) => round.pieces.find(piece => piece.id === move.piece)?.size ?? 0;
// A larger disc on a smaller one makes the tower lean.
export const montessoriTowerLeaning = round => round.kind === 'tower' && round.placements.some((move, i) => i > 0 && discSize(round, move) > discSize(round, round.placements[i - 1]));
export function montessoriComplete(round) {
  if (round.kind === 'tower') return round.placements.length === round.total && !montessoriTowerLeaning(round);
  if (round.kind === 'grid' && round.mode) return round.placements.length === round.total && round.checked === true;
  if (round.kind === 'colors' && round.level === 5) return round.checked === true;
  return round.placements.length === round.total && (!montessoriNeedsCheck(round) || round.checked === true);
}
// Targets to mark after a failed check: wrong or empty cells, or bowls with the wrong amount.
export function montessoriWrongTargets(round) {
  if (!round.inspected || round.checked) return [];
  if (round.kind === 'colors') return round.targets.filter(target => round.placements.filter(move => move.target === target.id).length !== target.count).map(target => target.id);
  return round.targets.filter(target => {
    const move = round.placements.find(move => move.target === target.id);
    return !move || !montessoriSame(montessoriCurrentPiece(round, move.piece), target.expected || target);
  }).map(target => target.id);
}
export const montessoriSame = (piece, target) => piece.color === target.color && piece.shape === target.shape && (piece.size ?? 1) === (target.size ?? 1) && (piece.rotation ?? 0) % rotationPeriod(piece.shape) === (target.rotation ?? 0) % rotationPeriod(piece.shape);
export function montessoriCurrentPiece(round, id) { const piece = round.pieces.find(piece => piece.id === id); return piece ? { ...piece, rotation: round.rotations[id] ?? piece.rotation ?? 0 } : null; }

export function moveMontessoriPiece(round, id, x, y) {
  if (round.kind !== 'shapes' || !round.pieces.some(piece => piece.id === id) || round.placements.some(move => move.piece === id) || !Number.isFinite(x) || !Number.isFinite(y)) return round;
  const position = [Math.max(5, Math.min(95, x)), Math.max(5, Math.min(95, y))];
  if (round.positions[id]?.every((n, i) => Math.abs(n - position[i]) < .05)) return round;
  return { ...round, positions: { ...round.positions, [id]: position } };
}
export function rotateMontessoriPiece(round, id, step = 1) {
  const piece = montessoriCurrentPiece(round, id);
  if (!piece || round.placements.some(move => move.piece === id) || rotationPeriod(piece.shape) === 1) return round;
  return { ...round, rotations: { ...round.rotations, [id]: (piece.rotation + step + 4) % rotationPeriod(piece.shape) } };
}
export function checkMontessoriRound(round) {
  if (!montessoriNeedsCheck(round)) return round;
  const full = round.kind === 'colors' ? round.placements.length > 0 : round.placements.length === round.total;
  const checked = full && montessoriWrongTargets({ ...round, inspected: true, checked: false }).length === 0;
  // A failed check of a full board counts as a miss (memory shortens the next row).
  return { ...round, checked, inspected: true, misses: (round.misses || 0) + (full && !checked ? 1 : 0) };
}
// Tower: tap the top disc to lift it off. Counting bowls: tap a bowl to take a ball out.
export function takeBackMontessoriPiece(round, targetId) {
  if (montessoriComplete(round) || !['tower', 'colors'].includes(round.kind)) return round;
  const index = round.placements.findLastIndex(move => move.target === targetId);
  if (index < 0) return round;
  return { ...round, placements: round.placements.filter((_, i) => i !== index), checked: false, inspected: false };
}
// "Mi nem illik?" grid: tapping the tile that breaks the rule lifts it out.
export function pickMontessoriOdd(round, pieceId) {
  if (round.kind !== 'grid' || round.mode !== 'odd' || round.phase !== 'find') return { accepted: false, reason: 'invalid', round };
  if (pieceId !== round.odd) return { accepted: false, reason: 'mismatch', round };
  return { accepted: true, round: { ...round, phase: 'fix', placements: round.placements.filter(move => move.piece !== pieceId) } };
}
export const montessoriLocked = (round, pieceId) => round.kind === 'grid' && !!round.mode && (round.fixed.includes(pieceId) || pieceId === round.odd);

export function clearMontessoriBlocker(round, targetId) {
  return setMontessoriBlocker(round, targetId, true);
}

export function setMontessoriBlocker(round, targetId, cleared) {
  if (!round.blockers.includes(targetId) || round.cleared.includes(targetId) === cleared) return round;
  return { ...round, cleared: cleared ? [...round.cleared, targetId] : round.cleared.filter(id => id !== targetId) };
}

export function montessoriBoardLayout(round) {
  const pieces = round.pieces.length === 1 ? [[25, 48]] : round.pieces.length <= 4 ? [[18, 23], [50, 17], [82, 26], [52, 41]] : round.pieces.length === 5 ? [[18, 20], [50, 17], [82, 20], [32, 40], [68, 40]] : [[18, 12], [50, 12], [82, 12], [18, 28], [50, 28], [82, 28], [30, 43], [68, 43]];
  const targets = round.targets.length === 1 ? [[round.pieces.length === 1 ? 74 : 50, round.pieces.length === 1 ? 50 : 74]] : round.targets.length === 3 ? [[20, 64], [50, 82], [80, 63]] : round.targets.length <= 4 ? [[20, 62], [80, 62], [20, 84], [80, 84]] : Array.from({ length: round.targets.length }, (_, i) => [[18, 50, 82][i % 3], 61 + Math.floor(i / 3) * 15]);
  return { pieces: Object.fromEntries(round.pieces.map((piece, i) => [piece.id, round.positions[piece.id] || pieces[i]])), targets: Object.fromEntries(round.targets.map((target, i) => [target.id, targets[i]])) };
}

export function placeMontessoriPiece(round, pieceId, targetId) {
  const piece = montessoriCurrentPiece(round, pieceId);
  const target = round.targets.find(item => item.id === targetId);
  if (!piece || !target || montessoriComplete(round)) return { accepted: false, reason: 'invalid', round };
  if (round.kind === 'grid' && round.mode) {
    if (round.phase !== 'fix') return { accepted: false, reason: 'preview', round };
    if (montessoriLocked(round, pieceId) || round.placements.some(move => move.piece === pieceId)) return { accepted: false, reason: 'invalid', round };
    if (round.placements.some(move => move.target === targetId) || !montessoriSame(piece, target)) return { accepted: false, reason: 'mismatch', round };
    return { accepted: true, round: { ...round, placements: [...round.placements, { piece: pieceId, target: targetId }], checked: true } };
  }
  if (['grid', 'memory'].includes(round.kind)) {
    if (round.kind === 'memory' && round.phase !== 'play') return { accepted: false, reason: 'preview', round };
    const old = round.placements.find(move => move.piece === pieceId), occupant = round.placements.find(move => move.target === targetId);
    const placements = round.placements.filter(move => move.piece !== pieceId && move.target !== targetId);
    placements.push({ piece: pieceId, target: targetId });
    if (old && occupant && occupant.piece !== pieceId) placements.push({ piece: occupant.piece, target: old.target });
    return { accepted: true, round: { ...round, placements, checked: false, inspected: false } };
  }
  if (round.placements.some(item => item.piece === pieceId)) return { accepted: false, reason: 'invalid', round };
  if (round.blockers.includes(targetId) && !round.cleared.includes(targetId)) return { accepted: false, reason: 'blocked', round };
  let fits;
  if (round.kind === 'shapes') fits = montessoriSame(piece, target) && !round.placements.some(item => item.target === targetId);
  else if (round.kind === 'colors') {
    // The counting level lets a bowl overflow; the ✓ check finds it.
    if (round.level < 5 && round.placements.filter(move => move.target === targetId).length >= target.count) return { accepted: false, reason: 'full', round };
    fits = piece.color === target.color && piece.shade === target.shade;
  }
  // Any disc may go on a straight tower; a leaning tower lets the next disc slide off.
  else if (montessoriTowerLeaning(round)) return { accepted: false, reason: 'wobble', round };
  else fits = true;
  if (!fits) return { accepted: false, reason: 'mismatch', round };
  return { accepted: true, round: { ...round, placements: [...round.placements, { piece: pieceId, target: targetId }], ...(montessoriNeedsCheck(round) ? { checked: false, inspected: false } : {}) } };
}
