// Small teaching positions: no opponent turn, clock, castling or en passant.
export const CHESS_PIECES = Object.freeze([
  { id: 'rook', name: 'Bástya', rule: 'Egyenesen lép: előre, hátra és oldalra. Más figurán nem ugorhat át.' },
  { id: 'bishop', name: 'Futó', rule: 'Átlósan lép. Mindig ugyanolyan színű mezőn marad. Más figurán nem ugorhat át.' },
  { id: 'knight', name: 'Huszár', rule: 'Kettőt lép az egyik irányba, egyet oldalra: L alakban. Átugorhat más figurákat.' },
  { id: 'queen', name: 'Vezér', rule: 'Egyenesen és átlósan is lép. Más figurán nem ugorhat át.' },
  { id: 'king', name: 'Király', rule: 'Egy mezőt lép bármelyik irányba. Olyan mezőre nem léphet, ahol leütnék.' },
  { id: 'pawn', name: 'Gyalog', rule: 'Előre egyet lép. Az induló helyéről kettőt is léphet, ha szabad az út. Átlósan előre üt.' },
]);

export const CHESS_MODES = ['explore', 'stars', 'puzzles', 'pawns'];
// Kezdő keeps the one-move lessons; the other levels are real positions where the dark side answers.
export const CHESS_LEVELS = Object.freeze([
  { id: 'easy', label: 'Kezdő' },
  { id: 'planning', label: 'Okos ütés' },
  { id: 'challenge', label: 'Villa' },
  { id: 'master', label: 'Matt' },
]);
export const PAWN_BATTLES = Object.freeze([
  { id: 'small', label: '4 gyalog', files: 'cdef' },
  { id: 'full', label: '8 gyalog', files: 'abcdefgh' },
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
  chess_rook_three: 'Üsd le a három megjelölt figurát a bástyával! A végén állj a csillagra, legfeljebb három lépésből.',
  chess_bishop_three: 'Üsd le a három megjelölt figurát a futóval! A végén állj a csillagra, legfeljebb három lépésből.',
  chess_knight_three: 'Három huszárugrással üsd le a megjelölt figurákat, és érj a csillagra!',
  chess_queen_open: 'A gyaloggal is léphetsz. Nyiss utat a vezérnek, aztán érj a csillagra két lépésből!',
  chess_pawn_three: 'A gyaloggal üsd le a három megjelölt figurát, és érj a csillagra három lépésből!',
  chess_rook_pin_three: 'A királyt végig védd meg! Üsd le a három megjelölt figurát a bástyával, és érj a csillagra!',
  chess_rook_knight_open: 'A huszárral is léphetsz. Szabadítsd fel a bástya útját, üsd le a megjelölt figurákat, és érj a csillagra négy lépésből!',
  chess_bishop_pawn_open: 'A gyaloggal is léphetsz. Nyisd meg a futó átlóját, aztán gyűjtsd össze a megjelölt figurákat négy lépésből!',
  chess_queen_four: 'A vezérrel üsd le a három megjelölt figurát, majd érj a csillagra négy lépésből!',
  chess_knight_four: 'A huszárral üsd le a három megjelölt figurát, majd érj a csillagra négy ugrásból!',
  chess_promotion_four: 'Változtasd vezérré a gyalogot! Üsd le a megjelölt figurákat, és érj a csillagra négy lépésből!',
  chess_king_five: 'A bástyával is léphetsz. Üsd le a sötét bástyát, majd vezesd a királyt a csillagra öt lépésből!',
  chess_rook_master: 'Négy lépésből üsd le a négy megjelölt figurát a bástyával, és érj a csillagra!',
  chess_bishop_master: 'Négy lépésből üsd le a négy megjelölt figurát a futóval, és érj a csillagra!',
  chess_knight_master: 'Öt ugrásból üsd le az öt megjelölt figurát a huszárral, és érj a csillagra!',
  chess_queen_master: 'Öt lépésből üsd le az öt megjelölt figurát a vezérrel, és érj a csillagra!',
  chess_pawn_master: 'Juss el az utolsó sorig a gyaloggal, majd vezérként érj a csillagra! Üsd le a megjelölt figurákat hat lépésből!',
  chess_rook_pawn_master: 'A gyaloggal is léphetsz. Nyiss utat a bástyának, üsd le a megjelölt figurákat, és érj a csillagra öt lépésből!',
  chess_rook_knight_master: 'A huszárral is léphetsz. Nyisd meg a bástya útját, üsd le a megjelölt figurákat, és érj a csillagra négy lépésből!',
  chess_rook_pin_master: 'A királyt végig védd meg! Négy lépésből üsd le a megjelölt figurákat a bástyával, és érj a csillagra!',
  chess_king_master: 'A gyaloggal és a bástyával is léphetsz. Tedd biztonságossá az utat, és vezesd a királyt a csillagra hat lépésből!',
  chess_queen_pawn_master: 'A gyaloggal is léphetsz. Nyiss utat a vezérnek, üsd le a megjelölt figurákat, és érj a csillagra öt lépésből!',
  chess_bishop_knight_master: 'A huszárral is léphetsz. Nyisd meg a futó átlóját, üsd le a megjelölt figurákat, és érj a csillagra öt lépésből!',
  chess_promotion_master: 'Változtasd vezérré a gyalogot! Utána is folytasd: üsd le a megjelölt figurákat, és érj a csillagra hat lépésből!',
  chess_steps_used: 'Elfogytak a lépések. Vonj vissza egy lépést, vagy kezdd újra, és keress rövidebb utat!',
  chess_tactics_intro: 'Most a sötét is lép! Gondold át, mit válaszol.',
  chess_tactic_failed: 'A sötét visszaütött. Vond vissza, és keress jobb lépést!',
  chess_mate: 'Matt! A sötét király nem tud elmenekülni.',
  chess_pawns_intro: 'Gyalogcsata! Juttasd át egy gyalogodat a tábla túlsó végére!',
};

export function normalizeChessOptions(value = {}) {
  return {
    mode: CHESS_MODES.includes(value?.mode) ? value.mode : 'explore',
    piece: CHESS_PIECES.some(piece => piece.id === value?.piece) ? value.piece : 'rook',
    level: CHESS_LEVELS.some(level => level.id === value?.level) ? value.level : 'easy',
    battle: PAWN_BATTLES.some(battle => battle.id === value?.battle) ? value.battle : 'small',
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

// Real positions: every white move gets a reply from the dark side.
// goal 'win': capture at least `gain` points of material (or the `targets`) and lose nothing in reply.
// goal 'safe': after the dark reply, no light piece may be lost.
// goal 'mate': checkmate within `maxMoves` light moves.
export const CHESS_TACTICS = Object.freeze([
  { id: 'free-bishop', level: 'planning', goal: 'win', targets: ['a1'], title: 'A védtelen futó', task: 'Üss le egy sötét figurát úgy, hogy ne üthessék vissza!', tip: 'A huszárt egy sötét gyalog védi. A futót senki.', trap: 'd1d6', pieces: [['king', 'e1'], ['rook', 'd1'], ['king', 'g8', 'black'], ['knight', 'd6', 'black'], ['pawn', 'e7', 'black'], ['bishop', 'a1', 'black']] },
  { id: 'free-rook', level: 'planning', goal: 'win', targets: ['a3'], title: 'Melyik átló?', task: 'Melyik figurát ütheti le a futó büntetlenül?', tip: 'Az f4-es huszárt a g5-ös gyalog védi.', trap: 'c1f4', pieces: [['king', 'h1'], ['bishop', 'c1'], ['king', 'g8', 'black'], ['rook', 'a3', 'black'], ['knight', 'f4', 'black'], ['pawn', 'g5', 'black']] },
  { id: 'knight-choice', level: 'planning', goal: 'win', targets: ['b5'], title: 'Huszár két ütése', task: 'A huszár két figurát is üthet. Melyik a biztonságos?', tip: 'Az e4-es huszárt az f5-ös gyalog védi.', trap: 'c3e4', pieces: [['king', 'g1'], ['knight', 'c3'], ['king', 'g8', 'black'], ['knight', 'e4', 'black'], ['pawn', 'f5', 'black'], ['bishop', 'b5', 'black']] },
  { id: 'queen-choice', level: 'planning', goal: 'win', targets: ['a4'], title: 'Vigyázz a vezérre!', task: 'Üss a vezérrel úgy, hogy ne veszítsd el!', tip: 'A d6-os futót a c7-es gyalog védi. A vezér többet ér a futónál!', trap: 'd1d6', pieces: [['king', 'g1'], ['queen', 'd1'], ['king', 'g8', 'black'], ['rook', 'a4', 'black'], ['bishop', 'd6', 'black'], ['pawn', 'c7', 'black']] },
  { id: 'pawn-choice', level: 'planning', goal: 'win', targets: ['f5'], title: 'A gyalog ütése', task: 'A gyalog két figurát is üthet. Melyik nem üthet vissza?', tip: 'A d5-ös gyalogot a c6-os gyalog védi. A huszárt senki.', trap: 'e4d5', pieces: [['king', 'g1'], ['pawn', 'e4'], ['king', 'g8', 'black'], ['pawn', 'd5', 'black'], ['pawn', 'c6', 'black'], ['knight', 'f5', 'black']] },
  { id: 'queen-escape', level: 'planning', goal: 'safe', maxMoves: 1, title: 'Menekítsd a vezért!', task: 'A sötét gyalog megtámadta a vezért. Vidd biztonságba!', tip: 'Olyan mezőre lépj, amelyet egyik sötét figura sem támad.', trap: 'd4e5', pieces: [['king', 'g1'], ['queen', 'd4'], ['king', 'g8', 'black'], ['pawn', 'e5', 'black'], ['knight', 'c6', 'black']] },
  { id: 'rook-escape', level: 'planning', goal: 'safe', maxMoves: 1, title: 'Menekítsd a bástyát!', task: 'A sötét futó támadja a bástyát. Hová léphet biztonságban?', tip: 'Az e7-es huszár a d5-öt és a c6-ot is figyeli.', trap: 'd4d5', pieces: [['king', 'h1'], ['rook', 'd4'], ['king', 'g8', 'black'], ['bishop', 'b6', 'black'], ['knight', 'e7', 'black']] },
  { id: 'catch-attacker', level: 'planning', goal: 'safe', maxMoves: 1, title: 'Üsd le a támadót!', task: 'A sötét huszár a bástyát és a királyt is fenyegeti. Mit teszel?', tip: 'A futó átlósan eléri a huszárt.', trap: 'g1h1', pieces: [['king', 'g1'], ['rook', 'a1'], ['bishop', 'd3'], ['king', 'g8', 'black'], ['knight', 'c2', 'black']] },

  { id: 'knight-fork', level: 'challenge', goal: 'win', targets: ['a8'], maxMoves: 2, title: 'Huszárvilla', task: 'Adj sakkot a huszárral úgy, hogy közben a bástyát is támadd!', tip: 'Keresd azt a mezőt, ahonnan a huszár a királyt és a bástyát is eléri.', pieces: [['king', 'g1'], ['knight', 'b5'], ['king', 'e8', 'black'], ['rook', 'a8', 'black']] },
  { id: 'queen-fork', level: 'challenge', goal: 'win', targets: ['a8'], maxMoves: 2, title: 'A vezér két átlója', task: 'Adj sakkot a vezérrel, és támadd vele a bástyát is!', tip: 'Az e4 mezőről két átló indul: az egyik a királyhoz, a másik a bástyához.', pieces: [['king', 'g1'], ['queen', 'e2'], ['king', 'h7', 'black'], ['rook', 'a8', 'black'], ['pawn', 'g7', 'black']] },
  { id: 'pawn-fork', level: 'challenge', goal: 'win', gain: 2, maxMoves: 2, title: 'Gyalogvilla', task: 'Lépj a gyaloggal úgy, hogy egyszerre két huszárt támadjon!', tip: 'A gyalog átlósan üt: jobbra és balra előre. A d3-as gyalog védi.', pieces: [['king', 'g1'], ['pawn', 'd3'], ['pawn', 'e4'], ['king', 'g8', 'black'], ['knight', 'd6', 'black'], ['knight', 'f6', 'black']] },
  { id: 'king-fork', level: 'challenge', goal: 'win', targets: ['d7'], maxMoves: 2, title: 'Király és vezér', task: 'Adj sakkot a huszárral, és nyerd meg a sötét vezért!', tip: 'Az e5 mezőről a huszár a g6-ot és a d7-et is eléri.', pieces: [['king', 'g1'], ['knight', 'f3'], ['king', 'g6', 'black'], ['queen', 'd7', 'black']] },
  { id: 'bishop-fork', level: 'challenge', goal: 'win', targets: ['a4'], maxMoves: 2, title: 'Futóvilla', task: 'Adj sakkot a futóval, és közben támadd a bástyát is!', tip: 'A b5 mezőről az egyik átló a királyhoz, a másik a bástyához vezet.', pieces: [['king', 'g1'], ['bishop', 'f1'], ['king', 'e8', 'black'], ['rook', 'a4', 'black']] },
  { id: 'queen-check-fork', level: 'challenge', goal: 'win', targets: ['h4'], maxMoves: 2, title: 'Sakk és ütés', task: 'Adj sakkot a vezérrel úgy, hogy a futót is támadd!', tip: 'Az a4 mezőről átlósan a király, oldalra a futó látszik.', pieces: [['king', 'g1'], ['queen', 'd1'], ['king', 'e8', 'black'], ['bishop', 'h4', 'black']] },
  { id: 'rook-skewer', level: 'challenge', goal: 'win', targets: ['d8'], maxMoves: 2, title: 'Nyárs', task: 'Adj sakkot a bástyával! Ha a király félreáll, a vezér marad mögötte.', tip: 'A király és a vezér ugyanazon az oszlopon áll.', pieces: [['king', 'g1'], ['rook', 'a1'], ['king', 'd5', 'black'], ['queen', 'd8', 'black']] },

  { id: 'back-rank', level: 'master', goal: 'mate', maxMoves: 1, title: 'Az alsó sor', task: 'Adj mattot egy lépésből!', tip: 'A sötét királyt a saját gyalogjai zárják be.', pieces: [['king', 'g1'], ['rook', 'a1'], ['king', 'g8', 'black'], ['pawn', 'f7', 'black'], ['pawn', 'g7', 'black'], ['pawn', 'h7', 'black']] },
  { id: 'rook-king-mate', level: 'master', goal: 'mate', maxMoves: 1, title: 'Bástya a sarokban', task: 'Adj mattot a bástyával!', tip: 'A világos király már elzárja a h7-et és a g7-et.', pieces: [['king', 'g6'], ['rook', 'a1'], ['king', 'h8', 'black']] },
  { id: 'queen-king-mate', level: 'master', goal: 'mate', maxMoves: 1, title: 'Vezér a sarokban', task: 'Adj mattot a vezérrel!', tip: 'Melyik sorban maradna szabad mező a sötét királynak?', pieces: [['king', 'g6'], ['queen', 'b1'], ['king', 'h8', 'black']] },
  { id: 'two-rooks', level: 'master', goal: 'mate', maxMoves: 1, title: 'Két bástya', task: 'Adj mattot az egyik bástyával!', tip: 'Az egyik bástya már őrzi a hetedik sort.', pieces: [['king', 'c1'], ['rook', 'a7'], ['rook', 'b1'], ['king', 'h8', 'black']] },
  { id: 'smothered', level: 'master', goal: 'mate', maxMoves: 1, title: 'Bezárt király', task: 'Adj mattot a huszárral!', tip: 'A sötét királyt a saját figurái zárják körbe.', pieces: [['king', 'b1'], ['knight', 'g5'], ['king', 'h8', 'black'], ['rook', 'g8', 'black'], ['pawn', 'g7', 'black'], ['pawn', 'h7', 'black']] },
  { id: 'queen-bishop-h7', level: 'master', goal: 'mate', maxMoves: 1, title: 'A futó segít', task: 'Adj mattot a vezérrel! A futó védi.', tip: 'A futó a h7 mezőt figyeli.', pieces: [['king', 'g1'], ['queen', 'h5'], ['bishop', 'd3'], ['king', 'h8', 'black'], ['pawn', 'h7', 'black'], ['pawn', 'f7', 'black']] },
  { id: 'queen-bishop-g7', level: 'master', goal: 'mate', maxMoves: 1, title: 'Hosszú átló', task: 'Adj mattot a vezérrel! A futó védi.', tip: 'A c3-as futó egészen a g7-ig ellát.', pieces: [['king', 'g1'], ['queen', 'g4'], ['bishop', 'c3'], ['king', 'g8', 'black'], ['pawn', 'f7', 'black'], ['pawn', 'g7', 'black'], ['pawn', 'h7', 'black']] },
  { id: 'rook-ladder', level: 'master', goal: 'mate', maxMoves: 2, title: 'Bástyalétra', task: 'Adj mattot két lépésből a két bástyával!', tip: 'Az egyik bástya sakkot ad, a másik a következő sort zárja le.', pieces: [['king', 'c1'], ['rook', 'a6'], ['rook', 'b1'], ['king', 'g7', 'black']] },
]);

export function chessPuzzlesForLevel(level = 'easy') {
  return level === 'easy' || !CHESS_LEVELS.some(entry => entry.id === level) ? CHESS_PUZZLES : CHESS_TACTICS.filter(puzzle => puzzle.level === level);
}

export function buildChessPuzzle(index = 0, level = 'easy') {
  const puzzles = chessPuzzlesForLevel(level);
  const definition = puzzles[((Math.trunc(index) || 0) % puzzles.length + puzzles.length) % puzzles.length];
  const board = definition.pieces.map(([type, name, color]) => ({ ...pieceAt(type, name, color), id: squareIndex(name) }));
  if (CHESS_TACTICS.includes(definition)) {
    const targets = (definition.targets || []).map(squareIndex);
    const targetValue = targets.reduce((sum, id) => sum + PIECE_VALUES[board.find(piece => piece.id === id).type], 0);
    return { ...definition, level, tactic: true, maxMoves: definition.maxMoves || 1, gain: definition.gain || targetValue,
      targets, board,
      movers: board.filter(piece => piece.color === 'white').map(piece => piece.id), requiredCaptures: [] };
  }
  return { ...definition, level, maxMoves: 1, from: squareIndex(definition.from), goal: squareIndex(definition.goal),
    movers: [squareIndex(definition.from)],
    requiredCaptures: (definition.capture ? [definition.goal] : []).map(squareIndex), board };
}

export function chessPuzzleMovers(puzzle, board) {
  return board.filter(piece => piece.color === 'white' && puzzle.movers.includes(piece.id));
}

export function evaluateChessPuzzle(puzzle, board, moveCount) {
  const capturesRemaining = puzzle.requiredCaptures.filter(id => board.some(piece => piece.id === id));
  const actor = board.find(piece => piece.id === puzzle.from);
  const atGoal = actor?.square === puzzle.goal;
  const solved = moveCount === 1 && atGoal && !capturesRemaining.length;
  return { solved, atGoal, capturesRemaining, exhausted: !solved && moveCount >= 1 };
}

export function moveChessPuzzlePiece(puzzle, board, from, to, moveCount = 0) {
  if (moveCount >= 1 || !chessPuzzleMovers(puzzle, board).some(piece => piece.square === from) || to !== puzzle.goal) return null;
  return moveChessPiece(board, from, to);
}

// ---- A small opponent: it answers checks, punishes loose pieces and saves its own. ----
export const PIECE_VALUES = Object.freeze({ pawn: 1, knight: 3, bishop: 3, rook: 5, queen: 9, king: 0 });
export const otherColor = color => color === 'white' ? 'black' : 'white';
export const moveCode = move => `${squareName(move.from)}${squareName(move.to)}`;

export function allLegalMoves(board, color) {
  return board.filter(piece => piece.color === color).flatMap(piece => legalMoves(board, piece.square).map(to => ({ from: piece.square, to })));
}

export function inCheck(board, color) {
  const king = board.find(piece => piece.color === color && piece.type === 'king');
  return !!king && isSquareAttacked(board, king.square, otherColor(color));
}

// 'mate', 'stalemate', 'check' or 'play' for the side about to move.
export function chessPosition(board, color) {
  const moves = allLegalMoves(board, color).length, check = inCheck(board, color);
  return moves ? check ? 'check' : 'play' : check ? 'mate' : 'stalemate';
}

export function material(board, color) {
  return board.filter(piece => piece.color === color).reduce((sum, piece) => sum + PIECE_VALUES[piece.type], 0);
}

function attackers(board, square, color) {
  return board.filter(piece => piece.color === color && piece.square !== square && destinations(board, piece, true).includes(square));
}

// The most this side could lose on the opponent's next move, if nothing is done.
function hangingRisk(board, color) {
  let risk = 0;
  for (const piece of board) {
    if (piece.color !== color || piece.type === 'king') continue;
    const defenders = attackers(board, piece.square, color);
    const enemies = attackers(board, piece.square, otherColor(color)).filter(enemy => enemy.type !== 'king' || !defenders.length);
    if (!enemies.length) continue;
    const cheapest = Math.min(...enemies.map(enemy => PIECE_VALUES[enemy.type]));
    risk = Math.max(risk, defenders.length ? Math.max(0, PIECE_VALUES[piece.type] - cheapest) : PIECE_VALUES[piece.type]);
  }
  return risk;
}

// gentle: half of the time play any move that does not simply give a piece away.
export function chooseChessReply(board, color, { pawnRace = false, gentle = false, random = Math.random } = {}) {
  let best = null, bestScore = -Infinity;
  const scored = [];
  for (const move of allLegalMoves(board, color)) {
    const target = board.find(piece => piece.square === move.to);
    const next = moveUnchecked(board, move.from, move.to);
    const moved = next.find(piece => piece.square === move.to);
    const enemy = otherColor(color);
    let score = (target ? PIECE_VALUES[target.type] * 10 : 0) - hangingRisk(next, color) * 10;
    const position = chessPosition(next, enemy);
    if (position === 'mate') score += 1000;
    if (position === 'check') score += 1;
    if (pawnRace) {
      const row = Math.floor(move.to / 8), progress = color === 'black' ? row : 7 - row;
      if (moved.type === 'queen') score += 500;
      score += progress * 0.6;
      // Stop a light pawn that would otherwise walk to the end.
      const runner = next.filter(piece => piece.color === enemy && piece.type === 'pawn').map(piece => enemy === 'white' ? Math.floor(piece.square / 8) : 7 - Math.floor(piece.square / 8));
      if (runner.length) score -= Math.max(0, 3 - Math.min(...runner)) * 2;
    }
    scored.push({ move, score });
    if (score > bestScore) { bestScore = score; best = move; }
  }
  if (gentle && best && random() < .5) {
    const relaxed = scored.filter(entry => entry.score > -5 && entry.score < 400);
    if (relaxed.length) return relaxed[Math.floor(random() * relaxed.length)].move;
  }
  return best;
}

// One full turn of a tactic: the light move, the dark reply, and the verdict.
export function playChessTactic(puzzle, board, from, to, movesPlayed = 0) {
  if (movesPlayed >= puzzle.maxMoves) return null;
  const after = moveChessPiece(board, from, to);
  if (!after) return null;
  const position = chessPosition(after, 'black');
  const turn = movesPlayed + 1;
  const result = (outcome, finalBoard, reply = null, reason = '') => ({ outcome, board: finalBoard, reply, reason, moves: turn });
  if (puzzle.goal === 'mate') {
    if (position === 'mate') return result('solved', after);
    if (position === 'stalemate') return result('failed', after, null, 'stalemate');
  }
  if (position === 'mate') return result('solved', after);
  const reply = position === 'stalemate' ? null : chooseChessReply(after, 'black');
  const answered = reply ? moveUnchecked(after, reply.from, reply.to) : after;
  // Count material from the start of the puzzle, so a fork may give up a pawn to win a knight.
  const lightLost = material(puzzle.board, 'white') - material(answered, 'white');
  const darkLost = material(puzzle.board, 'black') - material(answered, 'black');
  const net = darkLost - lightLost;
  const won = puzzle.goal === 'win' && net >= puzzle.gain;
  const lost = puzzle.goal === 'safe' ? lightLost > 0 : puzzle.goal === 'win' && net < 0;
  if (lost) return result('failed', answered, reply, 'lost');
  if (position === 'stalemate') return result('failed', answered, null, 'stalemate');
  if (won || puzzle.goal === 'safe') return result('solved', answered, reply);
  if (turn >= puzzle.maxMoves) return result('failed', answered, reply, 'moves');
  return result('continue', answered, reply);
}

// ---- Gyalogcsata: pawns only, the first pawn to reach the far side wins. ----
export function buildPawnBattle(id = 'small') {
  const battle = PAWN_BATTLES.find(entry => entry.id === id) || PAWN_BATTLES[0];
  return [...battle.files].flatMap(file => [pieceAt('pawn', `${file}2`), pieceAt('pawn', `${file}7`, 'black')]);
}

// reason: 'through' (a pawn reached the far side), 'captured' (no pawns left) or 'blocked'
// (the side to move is stuck; then whoever's pawns walked further wins).
export function pawnBattleResult(board, toMove) {
  if (board.some(piece => piece.color === 'white' && (piece.type !== 'pawn' || Math.floor(piece.square / 8) === 0))) return { winner: 'white', reason: 'through' };
  if (board.some(piece => piece.color === 'black' && (piece.type !== 'pawn' || Math.floor(piece.square / 8) === 7))) return { winner: 'black', reason: 'through' };
  if (!board.some(piece => piece.color === 'black')) return { winner: 'white', reason: 'captured' };
  if (!board.some(piece => piece.color === 'white')) return { winner: 'black', reason: 'captured' };
  if (allLegalMoves(board, toMove).length) return null;
  const walked = color => board.filter(piece => piece.color === color).reduce((sum, piece) => sum + (color === 'white' ? 6 - Math.floor(piece.square / 8) : Math.floor(piece.square / 8) - 1), 0);
  const light = walked('white'), dark = walked('black');
  return { winner: light > dark ? 'white' : dark > light ? 'black' : 'draw', reason: 'blocked' };
}

export function pawnBattleWinner(board, toMove) {
  return pawnBattleResult(board, toMove)?.winner ?? null;
}
