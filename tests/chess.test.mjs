import test from 'node:test';
import assert from 'node:assert/strict';
import { CHESS_PIECES, CHESS_PUZZLES, buildChessLesson, buildChessPuzzle, squareName, squareIndex, legalMoves, moveChessPiece, isSquareAttacked, normalizeChessOptions } from '../chess-data.js';
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
  assert.deepEqual(normalizeChessOptions(null), { mode: 'explore', piece: 'rook' });
  assert.deepEqual(normalizeChessOptions({ mode: 'puzzles', piece: 'knight', extra: 1 }), { mode: 'puzzles', piece: 'knight' });
  assert.deepEqual(normalizeChessOptions({ mode: 'bad', piece: 'bad' }), { mode: 'explore', piece: 'rook' });
  for (let square = 0; square < 64; square++) assert.equal(squareIndex(squareName(square)), square);
  assert.equal(squareName(0), 'a8'); assert.equal(squareName(63), 'h1');
});
