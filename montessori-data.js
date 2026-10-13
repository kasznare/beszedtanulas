export const MONTESSORI_GAMES = {
  shapes: { name: 'Formadoboz', description: 'Párosítsd a színt és a formát!', levels: ['Egy forma', 'Szín és forma', 'Minden forma', 'Csúszó akadályok'] },
  colors: { name: 'Színtálcák', description: 'Gyűjtsd össze az azonos színeket!', levels: ['Két szín', 'Három szín', 'Négy szín'] },
  tower: { name: 'Építs tornyot!', description: 'Nagy alul, kicsi felül.', levels: ['Három korong', 'Négy korong', 'Öt korong'] },
};
export const MONTESSORI_SHAPES = { circle: 'kör', square: 'négyzet', triangle: 'háromszög', hexagon: 'hatszög' };
export const MONTESSORI_COLORS = [
  { id: 'coral', name: 'Piros', hex: '#c95f4e' },
  { id: 'blue', name: 'Kék', hex: '#5088a8' },
  { id: 'gold', name: 'Sárga', hex: '#d6a132' },
  { id: 'green', name: 'Zöld', hex: '#69936b' },
];
export const MONTESSORI_CLIPS = {
  montessori_menu: 'Fedezzük fel a kis műhelyt! Válassz formadobozt, színtálcákat vagy tornyot!',
  montessori_shapes_1: 'Tedd a formát a hozzá illő lyukba! Húzd oda, vagy koppints a formára, majd a lyukra!',
  montessori_shapes_2: 'Nézd a lyuk alakját és a keret színét! Keresd meg az ugyanilyen színű és alakú formát, és tedd bele!',
  montessori_shapes_3: 'A szín és a forma is egyezzen! Tedd a formákat a hozzájuk illő, színes keretű lyukakba!',
  montessori_shapes_4: 'Csúsztasd félre az akadályokat a deszkán! Az akadályra koppinthatsz is. Aztán tedd a formákat az ugyanolyan színű kerettel jelölt, hozzájuk illő lyukakba!',
  montessori_colors: 'Tedd a golyókat az azonos színű tálkákba! Húzd oda, vagy koppints a golyóra, majd a tálkára!',
  montessori_tower: 'Építs tornyot! A legnagyobb korong kerüljön alulra, aztán mindig a következő legnagyobb. Tedd a korongot a toronyra!',
  montessori_shape_retry: 'Nézd meg az alakját és a színét is! Keress egy ugyanilyen színű kerettel jelölt, hozzá illő lyukat!',
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
  return Object.fromEntries(Object.entries(MONTESSORI_GAMES).map(([kind, game]) => {
    const key = `montessori${kind[0].toUpperCase()}${kind.slice(1)}Level`;
    return [key, Number.isInteger(source[key]) && source[key] >= 1 && source[key] <= game.levels.length ? source[key] : 1];
  }));
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

export function newMontessoriRound(kind = 'shapes', level = 1, random = Math.random) {
  if (!Object.hasOwn(MONTESSORI_GAMES, kind)) kind = 'shapes';
  if (!Number.isInteger(level) || level < 1 || level > MONTESSORI_GAMES[kind].levels.length) level = 1;
  let pieces, targets;
  if (kind === 'shapes') {
    const shapes = shuffled(Object.keys(MONTESSORI_SHAPES), random);
    const colors = shuffled(MONTESSORI_COLORS.map(color => color.id), random);
    const combinations = [[shapes[0], colors[0]]];
    // Repeated shapes and colors make both properties necessary to solve.
    if (level >= 2) combinations.push([shapes[0], colors[1]], [shapes[1], colors[0]]);
    if (level === 4) combinations.push([shapes[2], colors[2]]);
    pieces = combinations.map(([shape, color]) => ({ id: `${shape}-${color}`, shape, color }));
    targets = (level <= 2 ? pieces.slice(0, 1) : shuffled(pieces, random)).map(piece => ({ ...piece }));
  } else if (kind === 'colors') {
    targets = MONTESSORI_COLORS.slice(0, level + 1).map(color => ({ id: color.id, color: color.id }));
    pieces = targets.flatMap(target => [0, 1].map(i => ({ id: `${target.id}-${i}`, color: target.color })));
  } else {
    pieces = Array.from({ length: level + 2 }, (_, index) => ({ id: `disc-${index}`, size: index + 1 }));
    targets = [{ id: 'tower' }];
  }
  const blockers = kind === 'shapes' && level === 4 ? [targets[0].id, targets[2].id] : [];
  return { kind, level, pieces: shuffled(pieces, random), targets, blockers, cleared: [], placements: [], total: kind === 'shapes' ? targets.length : pieces.length };
}

export function montessoriComplete(round) { return round.placements.length === round.total; }

export function clearMontessoriBlocker(round, targetId) {
  return setMontessoriBlocker(round, targetId, true);
}

export function setMontessoriBlocker(round, targetId, cleared) {
  if (!round.blockers.includes(targetId) || round.cleared.includes(targetId) === cleared) return round;
  return { ...round, cleared: cleared ? [...round.cleared, targetId] : round.cleared.filter(id => id !== targetId) };
}

export function montessoriBoardLayout(round) {
  const pieces = round.pieces.length === 1 ? [[25, 48]] : [[18, 23], [50, 17], [82, 26], [52, 41]];
  const targets = round.targets.length === 1 ? [[round.pieces.length === 1 ? 74 : 50, round.pieces.length === 1 ? 50 : 74]] : round.targets.length === 3 ? [[20, 64], [50, 82], [80, 63]] : [[20, 62], [80, 62], [20, 84], [80, 84]];
  return { pieces: Object.fromEntries(round.pieces.map((piece, i) => [piece.id, pieces[i]])), targets: Object.fromEntries(round.targets.map((target, i) => [target.id, targets[i]])) };
}

export function placeMontessoriPiece(round, pieceId, targetId) {
  const piece = round.pieces.find(item => item.id === pieceId);
  const target = round.targets.find(item => item.id === targetId);
  if (!piece || !target || montessoriComplete(round) || round.placements.some(item => item.piece === pieceId)) return { accepted: false, reason: 'invalid', round };
  if (round.blockers.includes(targetId) && !round.cleared.includes(targetId)) return { accepted: false, reason: 'blocked', round };
  let fits;
  if (round.kind === 'shapes') fits = piece.shape === target.shape && piece.color === target.color && !round.placements.some(item => item.target === targetId);
  else if (round.kind === 'colors') fits = piece.color === target.color;
  else fits = piece.size === Math.max(...round.pieces.filter(item => !round.placements.some(placement => placement.piece === item.id)).map(item => item.size));
  if (!fits) return { accepted: false, reason: 'mismatch', round };
  return { accepted: true, round: { ...round, placements: [...round.placements, { piece: pieceId, target: targetId }] } };
}
