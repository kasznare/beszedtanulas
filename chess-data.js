// Small teaching positions: no opponent turn, clock, castling or en passant.
export const CHESS_PIECES = Object.freeze([
  { id: 'rook', name: 'Bástya', rule: 'Egyenesen lép: előre, hátra és oldalra. Más figurán nem ugorhat át.' },
  { id: 'bishop', name: 'Futó', rule: 'Átlósan lép. Mindig ugyanolyan színű mezőn marad. Más figurán nem ugorhat át.' },
  { id: 'knight', name: 'Huszár', rule: 'Kettőt lép az egyik irányba, egyet oldalra: L alakban. Átugorhat más figurákat.' },
  { id: 'queen', name: 'Vezér', rule: 'Egyenesen és átlósan is lép. Más figurán nem ugorhat át.' },
  { id: 'king', name: 'Király', rule: 'Egy mezőt lép bármelyik irányba. Olyan mezőre nem léphet, ahol leütnék.' },
  { id: 'pawn', name: 'Gyalog', rule: 'Előre egyet lép. Az induló helyéről kettőt is léphet, ha szabad az út. Átlósan előre üt.' },
]);

export const CHESS_MODES = ['explore', 'stars', 'puzzles'];
export const CHESS_LEVELS = Object.freeze([
  { id: 'easy', label: 'Kezdő' },
  { id: 'planning', label: 'Gondolkodós' },
  { id: 'challenge', label: 'Kihívás' },
]);
export const CHESS_CLIPS = {
  chess_start: 'Ismerkedjünk a sakkfigurákkal! Válassz egy figurát. Koppints rá, aztán egy pöttyös mezőre!',
  chess_stars: 'Gyűjtsd össze a három csillagot! Koppints a figurára, aztán arra a mezőre, ahová lépni szeretnél!',
  chess_puzzles: 'Oldjunk meg egy kis sakkfeladatot! A világos figurával lépj. A sötét figurák most a helyükön maradnak.',
  chess_rook: 'Bástya. Egyenesen lép: előre, hátra és oldalra. Más figurán nem ugorhat át.',
  chess_bishop: 'Futó. Átlósan lép. Mindig ugyanolyan színű mezőn marad. Más figurán nem ugorhat át.',
  chess_knight: 'Huszár. Kettőt lép az egyik irányba, egyet oldalra. L alakban. Átugorhat más figurákat.',
  chess_queen: 'Vezér. Egyenesen és átlósan is lép. Más figurán nem ugorhat át.',
  chess_king: 'Király. Egy mezőt lép bármelyik irányba. Olyan mezőre nem léphet, ahol leütnék.',
  chess_pawn: 'Gyalog. Előre egyet lép. Az induló helyéről kettőt is léphet, ha szabad az út. Átlósan előre üt.',
  chess_retry: 'Ide most nem léphet ez a figura. Próbálj egy másik mezőt, vagy kérj segítséget!',
  chess_select: 'Előbb koppints a világos figurára!',
  chess_star: 'Megvan a csillag! Keresd meg a következőt!',
  chess_solved: 'Ez az! Megoldottad a feladatot!',
  chess_done: 'Mind a három csillag megvan! Szép munka!',
  chess_hint: 'A pöttyök megmutatják, hová léphet a figura. A karika azt mutatja, hol üthet.',
  chess_capture_rook: 'Üsd le a sötét gyalogot a bástyával! A bástya egyenesen lép.',
  chess_capture_bishop: 'Üsd le a sötét bástyát a futóval! A futó átlósan lép.',
  chess_capture_knight: 'Üsd le a sötét bástyát a huszárral! A huszár átugorhatja a többi figurát.',
  chess_capture_queen: 'Üsd le a sötét huszárt a vezérrel! Egyenesen vagy átlósan léphetsz.',
  chess_pawn_forward: 'Vidd a gyalogot a csillagra! Az induló helyéről kettőt is léphet, ha szabad az út.',
  chess_pawn_capture: 'Üsd le a sötét huszárt a gyaloggal! A gyalog átlósan előre üt.',
  chess_safe_king: 'Vidd a királyt a csillagra! A sötét bástya útjába nem léphetsz.',
  chess_near_king: 'Vidd a királyt a csillagra! A két király nem állhat egymás mellett.',
  chess_blocked_rook: 'Vidd a bástyát a csillagra! A világos gyalogon nem ugorhat át.',
  chess_blocked_bishop: 'Vidd a futót a csillagra! A világos gyalogon nem ugorhat át.',
  chess_promote: 'A gyalog elérte a tábla végét, és vezér lett belőle!',
  chess_rook_detour: 'Vidd a bástyát a csillagra, legfeljebb három lépésből! Kerüld meg a világos gyalogot. A gyalog most a helyén marad.',
  chess_bishop_detour: 'Vidd a futót a csillagra, legfeljebb három lépésből! A világos gyalog lezárja a közvetlen átlót. Keress másik utat!',
  chess_knight_route: 'Vidd a huszárt a csillagra, legfeljebb két lépésből! Keress egy köztes mezőt, ahonnan eléred a csillagot!',
  chess_queen_collect: 'Üsd le mindkét megjelölt sötét figurát a vezérrel, legfeljebb két lépésből! A végén a vezér a csillagon álljon.',
  chess_king_route: 'Vidd a királyt a csillagra, legfeljebb három lépésből! Kerüld meg a világos gyalogot, és figyelj a sötét gyalog támadására!',
  chess_pawn_route: 'Vidd a gyalogot a csillagra, legfeljebb három lépésből! Üsd le mindkét megjelölt sötét figurát. Gondolj az átlós ütésekre!',
  chess_rook_team: 'Vidd a bástyát a csillagra, legfeljebb két lépésből! A világos gyaloggal is léphetsz. Szabadítsd fel az utat, és üsd le a megjelölt sötét huszárt!',
  chess_bishop_team: 'Vidd a futót a csillagra, legfeljebb két lépésből! A világos huszárral is léphetsz. Előbb nyiss utat a futónak!',
  chess_pin: 'Üsd le mindkét megjelölt sötét figurát a bástyával, legfeljebb két lépésből! A világos királyt egy pillanatra sem hagyhatod támadásban.',
  chess_knight_collect: 'Üsd le mindhárom megjelölt sötét figurát a huszárral, legfeljebb három lépésből! A végén a huszár a csillagon álljon.',
  chess_promotion_route: 'Vidd a gyalogot a tábla végére, hogy vezér legyen belőle! Üsd le mindkét megjelölt sötét figurát, legfeljebb három lépésből. A vezér a csillagon álljon!',
  chess_king_team: 'Vidd a királyt a csillagra, legfeljebb négy lépésből! A világos bástyával is léphetsz. Előbb üsd le a megjelölt sötét bástyát, hogy a király biztonságban átkelhessen!',
  chess_steps_used: 'Elfogytak a lépések. Vonj vissza egy lépést, vagy kezdd újra, és keress rövidebb utat!',
};

export function normalizeChessOptions(value = {}) {
  return {
    mode: CHESS_MODES.includes(value?.mode) ? value.mode : 'explore',
    piece: CHESS_PIECES.some(piece => piece.id === value?.piece) ? value.piece : 'rook',
    level: CHESS_LEVELS.some(level => level.id === value?.level) ? value.level : 'easy',
  };
}

export function squareName(square) {
  return Number.isInteger(square) && square >= 0 && square < 64 ? `${'abcdefgh'[square % 8]}${8 - Math.floor(square / 8)}` : '';
}

export function squareIndex(name) {
  return /^[a-h][1-8]$/.test(name) ? (8 - Number(name[1])) * 8 + 'abcdefgh'.indexOf(name[0]) : -1;
}

const pieceAt = (type, name, color = 'white') => ({ type, square: squareIndex(name), color });
const orthogonal = [[1, 0], [-1, 0], [0, 1], [0, -1]];
const diagonal = [[1, 1], [1, -1], [-1, 1], [-1, -1]];
const knightSteps = [[2, 1], [2, -1], [-2, 1], [-2, -1], [1, 2], [1, -2], [-1, 2], [-1, -2]];

function destinations(board, piece, attacks = false) {
  const row = Math.floor(piece.square / 8), column = piece.square % 8;
  const result = [];
  const add = (r, c) => {
    if (r < 0 || r >= 8 || c < 0 || c >= 8) return false;
    const square = r * 8 + c, occupant = board.find(other => other.square === square);
    if (attacks || !occupant || (occupant.color !== piece.color && occupant.type !== 'king')) result.push(square);
    return !occupant;
  };
  if (piece.type === 'pawn') {
    const direction = piece.color === 'white' ? -1 : 1;
    for (const c of [column - 1, column + 1]) {
      const r = row + direction;
      if (r < 0 || r >= 8 || c < 0 || c >= 8) continue;
      const square = r * 8 + c, occupant = board.find(other => other.square === square);
      if (attacks || (occupant && occupant.color !== piece.color && occupant.type !== 'king')) result.push(square);
    }
    if (!attacks) {
      const r = row + direction;
      if (r >= 0 && r < 8 && !board.some(other => other.square === r * 8 + column)) {
        result.push(r * 8 + column);
        if (row === (piece.color === 'white' ? 6 : 1) && !board.some(other => other.square === (r + direction) * 8 + column)) result.push((r + direction) * 8 + column);
      }
    }
  } else if (piece.type === 'king' || piece.type === 'knight') {
    for (const [dr, dc] of piece.type === 'king' ? [...orthogonal, ...diagonal] : knightSteps) add(row + dr, column + dc);
  } else {
    const directions = piece.type === 'rook' ? orthogonal : piece.type === 'bishop' ? diagonal : piece.type === 'queen' ? [...orthogonal, ...diagonal] : [];
    for (const [dr, dc] of directions) for (let distance = 1; distance < 8; distance++) if (!add(row + dr * distance, column + dc * distance)) break;
  }
  return result;
}

export function isSquareAttacked(board, square, byColor) {
  return board.some(piece => piece.color === byColor && destinations(board, piece, true).includes(square));
}

function moveUnchecked(board, from, to) {
  return board.filter(piece => piece.square !== to).map(piece => piece.square === from
    ? { ...piece, square: to, type: piece.type === 'pawn' && (Math.floor(to / 8) === 0 || Math.floor(to / 8) === 7) ? 'queen' : piece.type }
    : { ...piece });
}

export function legalMoves(board, from) {
  const piece = board.find(item => item.square === from);
  if (!piece) return [];
  return destinations(board, piece).filter(to => {
    const next = moveUnchecked(board, from, to);
    const king = next.find(item => item.color === piece.color && item.type === 'king');
    return !king || !isSquareAttacked(next, king.square, piece.color === 'white' ? 'black' : 'white');
  });
}

export function moveChessPiece(board, from, to) {
  return legalMoves(board, from).includes(to) ? moveUnchecked(board, from, to) : null;
}

export function buildChessLesson(type) {
  const selected = CHESS_PIECES.some(piece => piece.id === type) ? type : 'rook';
  return { board: [pieceAt(selected, selected === 'pawn' ? 'd2' : 'd4')], goals: (selected === 'rook' ? ['a4', 'a7', 'g7']
    : selected === 'bishop' ? ['b6', 'g1', 'h2']
    : selected === 'knight' ? ['e6', 'g5', 'h7']
    : selected === 'queen' ? ['g7', 'b7', 'e4']
    : selected === 'king' ? ['e5', 'f5', 'g6']
    : ['d3', 'd5', 'd6']).map(squareIndex) };
}

export const CHESS_PUZZLES = Object.freeze([
  { id: 'rook-capture', piece: 'rook', title: 'Egyenesen az ütéshez', voice: 'chess_capture_rook', from: 'b2', goal: 'b6', capture: true, pieces: [['rook', 'b2'], ['pawn', 'b6', 'black'], ['pawn', 'f5', 'black']] },
  { id: 'bishop-capture', piece: 'bishop', title: 'Az átlós ösvény', voice: 'chess_capture_bishop', from: 'c2', goal: 'f5', capture: true, pieces: [['bishop', 'c2'], ['rook', 'f5', 'black'], ['pawn', 'c5', 'black']] },
  { id: 'knight-capture', piece: 'knight', title: 'Ugorj át!', voice: 'chess_capture_knight', from: 'd4', goal: 'e6', capture: true, pieces: [['knight', 'd4'], ['pawn', 'd5'], ['pawn', 'e4'], ['rook', 'e6', 'black']] },
  { id: 'queen-capture', piece: 'queen', title: 'A vezér két útja', voice: 'chess_capture_queen', from: 'b3', goal: 'f7', capture: true, pieces: [['queen', 'b3'], ['knight', 'f7', 'black'], ['pawn', 'd3']] },
  { id: 'pawn-double', piece: 'pawn', title: 'Az első nagy lépés', voice: 'chess_pawn_forward', from: 'd2', goal: 'd4', pieces: [['pawn', 'd2'], ['pawn', 'f3', 'black']] },
  { id: 'pawn-capture', piece: 'pawn', title: 'Előre lép, átlósan üt', voice: 'chess_pawn_capture', from: 'd4', goal: 'e5', capture: true, pieces: [['pawn', 'd4'], ['knight', 'e5', 'black'], ['pawn', 'd5', 'black']] },
  { id: 'king-safe', piece: 'king', title: 'Biztonságba a királlyal', voice: 'chess_safe_king', from: 'd3', goal: 'e3', pieces: [['king', 'd3'], ['rook', 'd8', 'black'], ['king', 'h8', 'black']] },
  { id: 'king-distance', piece: 'king', title: 'Tarts egy kis távolságot', voice: 'chess_near_king', from: 'd4', goal: 'c4', pieces: [['king', 'd4'], ['king', 'f5', 'black']] },
  { id: 'rook-block', piece: 'rook', title: 'Kerüld meg az akadályt', voice: 'chess_blocked_rook', from: 'd4', goal: 'g4', pieces: [['rook', 'd4'], ['pawn', 'd5']] },
  { id: 'bishop-block', piece: 'bishop', title: 'Válassz szabad átlót', voice: 'chess_blocked_bishop', from: 'd4', goal: 'b6', pieces: [['bishop', 'd4'], ['pawn', 'e5']] },
]);

export const CHESS_COMPLEX_PUZZLES = Object.freeze([
  { id: 'rook-detour', level: 'planning', piece: 'rook', title: 'Bástya a kerülőúton', voice: 'chess_rook_detour', from: 'd4', goal: 'g4', maxMoves: 3, tip: 'Előbb lépj egy másik sorba. Onnan megkerülheted az akadályt.', pieces: [['rook', 'd4'], ['pawn', 'e4']] },
  { id: 'bishop-detour', level: 'planning', piece: 'bishop', title: 'Három átló', voice: 'chess_bishop_detour', from: 'c1', goal: 'g5', maxMoves: 3, tip: 'A futó másik átlóján indulj el. A csillag színét figyeld!', pieces: [['bishop', 'c1'], ['pawn', 'e3']] },
  { id: 'knight-route', level: 'planning', piece: 'knight', title: 'Két huszárugrás', voice: 'chess_knight_route', from: 'b1', goal: 'c4', maxMoves: 2, tip: 'Melyik első ugrás után lesz a csillag egy L alakú lépésre?', pieces: [['knight', 'b1'], ['pawn', 'd2'], ['pawn', 'b2']] },
  { id: 'queen-collect', level: 'planning', piece: 'queen', title: 'A vezér két zsákmánya', voice: 'chess_queen_collect', from: 'b2', goal: 'g5', maxMoves: 2, requiredCaptures: ['d2', 'g5'], tip: 'Előbb az egy sorban álló figurát keresd. Utána átlót válthatsz.', pieces: [['queen', 'b2'], ['pawn', 'd2', 'black'], ['knight', 'g5', 'black']] },
  { id: 'king-route', level: 'planning', piece: 'king', title: 'Óvatos királyút', voice: 'chess_king_route', from: 'c2', goal: 'e4', maxMoves: 3, tip: 'A sötét gyalog átlósan lefelé támad. A jobb oldalon keress biztonságos utat.', pieces: [['king', 'c2'], ['pawn', 'd3'], ['pawn', 'b4', 'black']] },
  { id: 'pawn-route', level: 'planning', piece: 'pawn', title: 'Gyalog a kanyarban', voice: 'chess_pawn_route', from: 'd4', goal: 'f7', maxMoves: 3, requiredCaptures: ['e5', 'f6'], tip: 'Két átlós ütés után egy egyenes lépés vezet a csillagra.', pieces: [['pawn', 'd4'], ['pawn', 'd5', 'black'], ['knight', 'e5', 'black'], ['rook', 'f6', 'black']] },
  { id: 'rook-team', level: 'challenge', piece: 'rook', title: 'A gyalog utat nyit', voice: 'chess_rook_team', from: 'a1', goal: 'a4', maxMoves: 2, movers: ['a1', 'a2'], requiredCaptures: ['b3'], tip: 'A gyalog egyenes lépése még elzárná az utat. Próbálj átlós ütést!', pieces: [['rook', 'a1'], ['pawn', 'a2'], ['knight', 'b3', 'black']] },
  { id: 'bishop-team', level: 'challenge', piece: 'bishop', title: 'A huszár segítsége', voice: 'chess_bishop_team', from: 'c1', goal: 'h6', maxMoves: 2, movers: ['c1', 'd2'], tip: 'A huszárnak el kell hagynia a futó átlóját.', pieces: [['bishop', 'c1'], ['knight', 'd2']] },
  { id: 'pinned-rook', level: 'challenge', piece: 'rook', title: 'Védd a királyt!', voice: 'chess_pin', from: 'e2', goal: 'h8', maxMoves: 2, requiredCaptures: ['e8', 'h8'], tip: 'A bástya oldalra lépve magára hagyná a királyt. Előbb a támadót üsd le!', pieces: [['king', 'e1'], ['rook', 'e2'], ['rook', 'e8', 'black'], ['knight', 'h8', 'black']] },
  { id: 'knight-collect', level: 'challenge', piece: 'knight', title: 'Huszárhármas', voice: 'chess_knight_collect', from: 'b1', goal: 'f6', maxMoves: 3, requiredCaptures: ['c3', 'e4', 'f6'], tip: 'Keresd azt a figurát, amelyet már az első ugrással elérsz.', pieces: [['knight', 'b1'], ['rook', 'c3', 'black'], ['bishop', 'e4', 'black'], ['knight', 'f6', 'black']] },
  { id: 'promotion-route', level: 'challenge', piece: 'pawn', title: 'Gyalogból vezér', voice: 'chess_promotion_route', from: 'd6', goal: 'h8', goalType: 'queen', maxMoves: 3, requiredCaptures: ['e7', 'h8'], tip: 'Előbb átlósan üss, aztán lépj a tábla végére. A vezér már oldalra is léphet.', pieces: [['pawn', 'd6'], ['pawn', 'd7', 'black'], ['knight', 'e7', 'black'], ['rook', 'h8', 'black']] },
  { id: 'king-team', level: 'challenge', piece: 'king', title: 'Együtt a biztonságért', voice: 'chess_king_team', from: 'c2', goal: 'e4', maxMoves: 4, movers: ['c2', 'a1'], requiredCaptures: ['d8'], tip: 'A világos bástya két lépéssel elérheti a sötét bástyát. Utána indulhat a király.', pieces: [['king', 'c2'], ['rook', 'a1'], ['rook', 'd8', 'black']] },
]);

export function chessPuzzlesForLevel(level = 'easy') {
  return level === 'planning' || level === 'challenge' ? CHESS_COMPLEX_PUZZLES.filter(puzzle => puzzle.level === level) : CHESS_PUZZLES;
}

export function buildChessPuzzle(index = 0, level = 'easy') {
  const puzzles = chessPuzzlesForLevel(level);
  const definition = puzzles[((Math.trunc(index) || 0) % puzzles.length + puzzles.length) % puzzles.length];
  return { ...definition, level, maxMoves: definition.maxMoves || 1,
    from: squareIndex(definition.from), goal: squareIndex(definition.goal),
    movers: (definition.movers || [definition.from]).map(squareIndex),
    requiredCaptures: (definition.requiredCaptures || (definition.capture ? [definition.goal] : [])).map(squareIndex),
    board: definition.pieces.map(([type, name, color]) => ({ ...pieceAt(type, name, color), id: squareIndex(name) })) };
}

export function chessPuzzleMovers(puzzle, board) {
  return board.filter(piece => piece.color === 'white' && puzzle.movers.includes(piece.id));
}

export function evaluateChessPuzzle(puzzle, board, moveCount) {
  const capturesRemaining = puzzle.requiredCaptures.filter(id => board.some(piece => piece.id === id));
  const actor = board.find(piece => piece.id === puzzle.from);
  const atGoal = actor?.square === puzzle.goal && (!puzzle.goalType || actor.type === puzzle.goalType);
  const solved = moveCount > 0 && moveCount <= puzzle.maxMoves && atGoal && !capturesRemaining.length;
  return { solved, atGoal, capturesRemaining, exhausted: !solved && moveCount >= puzzle.maxMoves };
}

export function moveChessPuzzlePiece(puzzle, board, from, to, moveCount = 0) {
  if (moveCount >= puzzle.maxMoves || evaluateChessPuzzle(puzzle, board, moveCount).solved
    || !chessPuzzleMovers(puzzle, board).some(piece => piece.square === from)
    || (puzzle.maxMoves === 1 && to !== puzzle.goal)) return null;
  return moveChessPiece(board, from, to);
}
