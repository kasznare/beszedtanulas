import test from 'node:test';
import assert from 'node:assert/strict';
import { CHESS_PIECES, CHESS_PUZZLES, CHESS_TACTICS, CHESS_LEVELS, CHESS_CLIPS, PAWN_BATTLES, chessPuzzlesForLevel, buildChessLesson, buildChessPuzzle, squareName, squareIndex, legalMoves, moveChessPiece, isSquareAttacked, normalizeChessOptions, allLegalMoves, playChessTactic, chooseChessReply, chessPosition, inCheck, buildPawnBattle, pawnBattleWinner, pawnBattleResult } from '../chess-data.js';
const at = (type, square, color = 'white') => ({ type, square: squareIndex(square), color });
const moves = (board, from) => legalMoves(board, squareIndex(from)).map(squareName).sort();

test('all six pieces have the correct open-board movement', () => {
  for (const [type, count] of [['rook', 14], ['bishop', 13], ['knight', 8], ['queen', 27], ['king', 8]]) {
    const board = [at(type, 'd4')];
    assert.equal(moves(board, 'd4').length, count, type);
    assert.ok(!moves(board, 'd4').includes('d4'));
  }
  assert.deepEqual(moves([at('pawn', 'd2')], 'd2'), ['d3', 'd4']);
  assert.deepEqual(moves([at('pawn', 'd4')], 'd4'), ['d5']);
});

test('sliding pieces stop before friends and after an enemy, while knights jump', () => {
  const board = [at('rook', 'd4'), at('pawn', 'd5'), at('pawn', 'f4', 'black')];
  assert.ok(!moves(board, 'd4').includes('d5'));
  assert.ok(!moves(board, 'd4').includes('d6'));
  assert.ok(moves(board, 'd4').includes('f4'));
  assert.ok(!moves(board, 'd4').includes('g4'));
  const bishop = [at('bishop', 'd4'), at('pawn', 'e5'), at('pawn', 'b6', 'black')];
  assert.ok(!moves(bishop, 'd4').includes('f6'));
  assert.ok(moves(bishop, 'd4').includes('b6'));
  assert.ok(!moves(bishop, 'd4').includes('a7'));
  assert.ok(moves([at('knight', 'd4'), at('pawn', 'd5'), at('pawn', 'e4')], 'd4').includes('e6'));
});

test('pawns cannot jump, go backward, capture forward, or move diagonally without an enemy', () => {
  assert.deepEqual(moves([at('pawn', 'd2'), at('pawn', 'd3', 'black')], 'd2'), []);
  assert.deepEqual(moves([at('pawn', 'd2'), at('pawn', 'd4', 'black')], 'd2'), ['d3']);
  assert.deepEqual(moves([at('pawn', 'd4'), at('knight', 'e5', 'black'), at('pawn', 'c5'), at('pawn', 'd5', 'black')], 'd4'), ['e5']);
  assert.deepEqual(moves([at('pawn', 'd7', 'black')], 'd7'), ['d5', 'd6']);
  assert.deepEqual(moves([at('pawn', 'd5', 'black'), at('bishop', 'c4')], 'd5'), ['c4', 'd4']);
});

test('kings avoid attacked empty squares, protected captures and adjacent kings', () => {
  const rook = [at('king', 'd3'), at('rook', 'd8', 'black'), at('king', 'h8', 'black')];
  assert.ok(!moves(rook, 'd3').includes('d4'));
  assert.ok(!moves(rook, 'd3').includes('d2'));
  assert.ok(moves(rook, 'd3').includes('e3'));
  const kings = [at('king', 'd4'), at('king', 'f5', 'black')];
  assert.ok(!moves(kings, 'd4').includes('e4'));
  assert.ok(!moves(kings, 'd4').includes('e5'));
  assert.ok(moves(kings, 'd4').includes('c4'));
  const guarded = [at('king', 'd4'), at('pawn', 'e5', 'black'), at('rook', 'e8', 'black')];
  assert.ok(!moves(guarded, 'd4').includes('e5'));
  assert.ok(isSquareAttacked([at('pawn', 'd5', 'black')], squareIndex('e4'), 'black'));
  assert.ok(!isSquareAttacked([at('pawn', 'd5', 'black')], squareIndex('d4'), 'black'));
});

test('a pinned piece cannot expose its king and kings are never captured', () => {
  const board = [at('king', 'e1'), at('rook', 'e2'), at('rook', 'e8', 'black'), at('king', 'h8', 'black')];
  assert.ok(!moves(board, 'e2').includes('d2'));
  assert.ok(moves(board, 'e2').includes('e8'));
  assert.ok(!moves([at('rook', 'a1'), at('king', 'a8', 'black')], 'a1').includes('a8'));
});

test('a legal capture is immutable, an illegal move does nothing, and a pawn promotes at the end', () => {
  const board = [at('rook', 'd4'), at('pawn', 'd6', 'black')], snapshot = structuredClone(board);
  const next = moveChessPiece(board, squareIndex('d4'), squareIndex('d6'));
  assert.deepEqual(board, snapshot);
  assert.deepEqual(next, [at('rook', 'd6')]);
  assert.equal(moveChessPiece(board, squareIndex('d4'), squareIndex('e5')), null);
  assert.deepEqual(moveChessPiece([at('pawn', 'd7')], squareIndex('d7'), squareIndex('d8')), [at('queen', 'd8')]);
});

test('every teaching position has a legal one-move solution and a fresh board', () => {
  for (let index = 0; index < CHESS_PUZZLES.length; index++) {
    const puzzle = buildChessPuzzle(index);
    assert.ok(legalMoves(puzzle.board, puzzle.from).includes(puzzle.goal), puzzle.id);
    assert.ok(moveChessPiece(puzzle.board, puzzle.from, puzzle.goal), puzzle.id);
    assert.equal(new Set(puzzle.board.map(piece => piece.square)).size, puzzle.board.length);
    if (puzzle.capture) assert.equal(puzzle.board.find(piece => piece.square === puzzle.goal)?.color, 'black');
    puzzle.board[0].square = -1;
    assert.notEqual(buildChessPuzzle(index).board[0].square, -1);
  }
});

test('every star can be collected in sequence, including the pawn needing two single steps', () => {
  for (const piece of CHESS_PIECES) {
    const lesson = buildChessLesson(piece.id);
    let board = lesson.board;
    for (const goal of lesson.goals) {
      const queue = [board], visited = new Set();
      let reached;
      for (let index = 0; index < queue.length && !reached; index++) {
        const current = queue[index], from = current[0].square;
        if (from === goal) { reached = current; break; }
        for (const to of legalMoves(current, from)) if (!visited.has(to)) {
          visited.add(to); queue.push(moveChessPiece(current, from, to));
        }
      }
      assert.ok(reached, `${piece.id}: ${squareName(goal)}`); board = reached;
    }
  }
});

test('settings recover safely and board coordinates match standard orientation', () => {
  assert.deepEqual(normalizeChessOptions(null), { mode: 'explore', piece: 'rook', level: 'easy', battle: 'small' });
  assert.deepEqual(normalizeChessOptions({ mode: 'puzzles', piece: 'knight', extra: 1 }), { mode: 'puzzles', piece: 'knight', level: 'easy', battle: 'small' });
  assert.deepEqual(normalizeChessOptions({ mode: 'bad', piece: 'bad', level: 'bad' }), { mode: 'explore', piece: 'rook', level: 'easy', battle: 'small' });
  assert.equal(normalizeChessOptions({ level: 'challenge' }).level, 'challenge');
  for (let square = 0; square < 64; square++) assert.equal(squareIndex(squareName(square)), square);
  assert.equal(squareName(0), 'a8'); assert.equal(squareName(63), 'h1');
});

test('the puzzle levels hold the one-move lessons and the real positions', () => {
  assert.deepEqual(CHESS_LEVELS.map(({ id }) => chessPuzzlesForLevel(id).length), [10, 8, 7, 8]);
  const ids = [...CHESS_PUZZLES, ...CHESS_TACTICS].map(puzzle => puzzle.id);
  assert.equal(new Set(ids).size, ids.length);
  for (const puzzle of CHESS_PUZZLES) assert.ok(CHESS_CLIPS[puzzle.voice], puzzle.id);
});

// Every light move is answered, so solutions are searched through the real replies.
function solutionLines(puzzle, board = puzzle.board, played = 0) {
  const lines = [];
  for (const move of allLegalMoves(board, 'white')) {
    const turn = playChessTactic(puzzle, board, move.from, move.to, played);
    if (turn?.outcome === 'solved') lines.push([move]);
    else if (turn?.outcome === 'continue') for (const rest of solutionLines(puzzle, turn.board, played + 1)) lines.push([move, ...rest]);
  }
  return lines;
}

test('every real position is legal, solvable against the replies, and punishes its trap', () => {
  for (const { id: level } of CHESS_LEVELS.slice(1)) {
    chessPuzzlesForLevel(level).forEach((definition, index) => {
      const puzzle = buildChessPuzzle(index, level), snapshot = structuredClone(puzzle.board);
      assert.ok(puzzle.tactic && puzzle.task && puzzle.tip && puzzle.title, puzzle.id);
      assert.equal(new Set(puzzle.board.map(piece => piece.square)).size, puzzle.board.length, puzzle.id);
      assert.equal(puzzle.board.filter(piece => piece.type === 'king').length, 2, `${puzzle.id}: both kings`);
      assert.equal(inCheck(puzzle.board, 'black'), false, `${puzzle.id}: dark is not already in check`);
      assert.equal(inCheck(puzzle.board, 'white'), false, `${puzzle.id}: light is not in check`);
      assert.ok(puzzle.board.every(piece => piece.type !== 'pawn' || ![0, 7].includes(Math.floor(piece.square / 8))), puzzle.id);
      assert.ok(puzzle.targets.every(target => puzzle.board.find(piece => piece.id === target)?.color === 'black'), puzzle.id);
      assert.ok(solutionLines(puzzle).length, `${puzzle.id}: solvable`);
      if (definition.trap) {
        const turn = playChessTactic(puzzle, puzzle.board, squareIndex(definition.trap.slice(0, 2)), squareIndex(definition.trap.slice(2)), 0);
        assert.ok(turn, `${puzzle.id}: the trap is a legal move`);
        assert.equal(turn.outcome, 'failed', `${puzzle.id}: the trap fails`);
        assert.ok(turn.reply, `${puzzle.id}: the dark side answers the trap`);
      }
      assert.deepEqual(puzzle.board, snapshot, `${puzzle.id}: the search does not change the position`);
    });
  }
});

test('the choice positions have exactly one winning capture and a mate in two has no mate in one', () => {
  for (const id of ['free-bishop', 'free-rook', 'knight-choice', 'queen-choice', 'pawn-choice']) {
    const index = chessPuzzlesForLevel('planning').findIndex(puzzle => puzzle.id === id);
    const firsts = new Set(solutionLines(buildChessPuzzle(index, 'planning')).map(([move]) => `${move.from}-${move.to}`));
    assert.equal(firsts.size, 1, id);
  }
  const index = chessPuzzlesForLevel('master').findIndex(puzzle => puzzle.id === 'rook-ladder');
  const ladder = buildChessPuzzle(index, 'master');
  assert.equal(ladder.maxMoves, 2);
  assert.ok(solutionLines(ladder).every(line => line.length === 2));
});

test('the opponent recaptures, escapes check and saves an attacked piece', () => {
  const recapture = [at('king', 'g1'), at('rook', 'd6'), at('king', 'g8', 'black'), at('pawn', 'e7', 'black')];
  assert.deepEqual(chooseChessReply(recapture, 'black'), { from: squareIndex('e7'), to: squareIndex('d6') });
  const check = [at('king', 'g1'), at('rook', 'e1'), at('king', 'e8', 'black')];
  const escape = chooseChessReply(check, 'black');
  assert.ok(!inCheck(moveChessPiece(check, escape.from, escape.to), 'black'));
  const attacked = [at('king', 'g1'), at('pawn', 'd4'), at('king', 'g8', 'black'), at('knight', 'e5', 'black')];
  const saved = moveChessPiece(attacked, ...Object.values(chooseChessReply(attacked, 'black')));
  assert.equal(isSquareAttacked(saved, saved.find(piece => piece.type === 'knight').square, 'white'), false);
  assert.equal(chessPosition([at('king', 'g6'), at('rook', 'a8'), at('king', 'h8', 'black')], 'black'), 'mate');
  assert.equal(chessPosition([at('king', 'f7'), at('queen', 'g6'), at('king', 'h8', 'black')], 'black'), 'stalemate');
});

test('a stalemate in a mate puzzle is a failure, not a win', () => {
  const index = chessPuzzlesForLevel('master').findIndex(puzzle => puzzle.id === 'queen-king-mate');
  const puzzle = buildChessPuzzle(index, 'master');
  const turn = playChessTactic(puzzle, puzzle.board, squareIndex('b1'), squareIndex('b3'), 0);
  assert.equal(turn.outcome, 'failed');
  assert.equal(turn.reason, 'stalemate');
  assert.equal(playChessTactic(puzzle, puzzle.board, squareIndex('b1'), squareIndex('b8'), 0).outcome, 'solved');
});

test('the pawn battle starts symmetric, the computer always answers, and reaching the end wins', () => {
  for (const { id, files } of PAWN_BATTLES) {
    const board = buildPawnBattle(id);
    assert.equal(board.length, files.length * 2);
    assert.ok(board.every(piece => piece.type === 'pawn'));
    assert.equal(pawnBattleWinner(board, 'white'), null);
    const reply = chooseChessReply(moveChessPiece(board, squareIndex(`${files[0]}2`), squareIndex(`${files[0]}4`)), 'black', { pawnRace: true });
    assert.ok(reply && legalMoves(moveChessPiece(board, squareIndex(`${files[0]}2`), squareIndex(`${files[0]}4`)), reply.from).includes(reply.to), id);
  }
  assert.equal(pawnBattleWinner(moveChessPiece([at('pawn', 'c7')], squareIndex('c7'), squareIndex('c8')), 'black'), 'white');
  assert.equal(pawnBattleWinner([at('pawn', 'c4'), at('pawn', 'c5', 'black')], 'white'), 'draw');
  assert.equal(pawnBattleWinner([at('pawn', 'c4')], 'black'), 'white');
  assert.deepEqual(pawnBattleResult([at('pawn', 'c5'), at('pawn', 'c6', 'black'), at('pawn', 'h7', 'black')], 'black'), null, 'Dark can still move');
  assert.deepEqual(pawnBattleResult([at('pawn', 'c5'), at('pawn', 'c6', 'black')], 'white'), { winner: 'white', reason: 'blocked' });
  // A dark pawn takes a free light pawn instead of walking past it.
  const free = [at('pawn', 'd5'), at('pawn', 'e6', 'black'), at('pawn', 'a7', 'black')];
  assert.deepEqual(chooseChessReply(free, 'black', { pawnRace: true }), { from: squareIndex('e6'), to: squareIndex('d5') });
});
