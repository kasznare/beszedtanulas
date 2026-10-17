import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CHESS_CLIPS, CHESS_LEVELS, CHESS_PUZZLES, CHESS_COMPLEX_PUZZLES,
  buildChessPuzzle, chessPuzzlesForLevel, chessPuzzleMovers, evaluateChessPuzzle,
  legalMoves, moveChessPuzzlePiece, squareIndex,
} from '../chess-data.js';
import { chessExpansionSolutions } from './fixtures/chess-solutions.mjs';

const boardKey = board => board.map(piece => `${piece.id}:${piece.type}:${piece.square}`).join('|');

function hasSolutionBy(puzzle, initialBoard = puzzle.board, initialDepth = 0, limit = puzzle.maxMoves - 1) {
  const seen = new Set();
  function search(board, depth) {
    const progress = evaluateChessPuzzle(puzzle, board, depth);
    if (progress.solved) return true;
    if (depth === limit) return false;
    const actor = board.find(piece => piece.id === puzzle.from);
    const goalIsOutstandingCapture = progress.capturesRemaining.includes(puzzle.goal);
    // Every marked identity needs its own capture. Unless the last capture is on
    // the goal, the named actor needs one further move to finish there.
    const lowerBound = progress.capturesRemaining.length
      + (goalIsOutstandingCapture || actor.square === puzzle.goal ? 0 : 1);
    if (depth + lowerBound > limit) return false;
    const key = `${depth}:${boardKey(board)}`;
    if (seen.has(key)) return false;
    seen.add(key);
    for (const piece of chessPuzzleMovers(puzzle, board)) {
      for (const to of legalMoves(board, piece.square)) {
        const next = moveChessPuzzlePiece(puzzle, board, piece.square, to, depth);
        if (next && search(next, depth + 1)) return true;
      }
    }
    return false;
  }
  return search(initialBoard, initialDepth);
}

test('the appended puzzles are distinct, complete, and have immutable starting positions', () => {
  assert.deepEqual(CHESS_LEVELS.map(({ id }) => chessPuzzlesForLevel(id).length), [10, 12, 12, 12]);
  assert.equal(chessExpansionSolutions.length, 24);
  assert.equal(CHESS_PUZZLES.length + CHESS_COMPLEX_PUZZLES.length, 46);
  const ids = [...CHESS_PUZZLES, ...CHESS_COMPLEX_PUZZLES].map(puzzle => puzzle.id);
  assert.equal(new Set(ids).size, ids.length);
  for (const { id: level } of CHESS_LEVELS) {
    for (let index = 0; index < chessPuzzlesForLevel(level).length; index++) {
      const puzzle = buildChessPuzzle(index, level);
      assert.ok(puzzle.board.every(piece => piece.type !== 'pawn' || ![0, 7].includes(Math.floor(piece.square / 8))), `${puzzle.id}: pawn on a final rank`);
    }
  }
  for (const { level, id } of chessExpansionSolutions) {
    const index = chessPuzzlesForLevel(level).findIndex(puzzle => puzzle.id === id);
    assert.ok(index >= 6 || level === 'master' && index >= 0, id);
    const puzzle = buildChessPuzzle(index, level);
    assert.equal(puzzle.id, id);
    assert.ok(CHESS_CLIPS[puzzle.voice]?.trim(), id);
    assert.ok(puzzle.tip?.trim(), id);
    assert.equal(new Set(puzzle.board.map(piece => piece.square)).size, puzzle.board.length, id);
    assert.ok(puzzle.requiredCaptures.every(target => puzzle.board.find(piece => piece.id === target)?.color === 'black'), id);
    assert.ok(puzzle.movers.every(mover => puzzle.board.find(piece => piece.id === mover)?.color === 'white'), id);
    assert.equal(puzzle.board.find(piece => piece.id === puzzle.from)?.type, puzzle.piece, id);
    const snapshot = structuredClone(puzzle.board);
    puzzle.board[0].square = -1;
    assert.deepEqual(buildChessPuzzle(index, level).board, snapshot, id);
  }
});

test('each new puzzle has a legal witness and no solution using fewer moves', () => {
  for (const { level, id, moves } of chessExpansionSolutions) {
    const index = chessPuzzlesForLevel(level).findIndex(puzzle => puzzle.id === id);
    const puzzle = buildChessPuzzle(index, level);
    assert.equal(moves.length, puzzle.maxMoves, id);
    let board = puzzle.board;
    for (const [step, { from, to }] of moves.entries()) {
      const next = moveChessPuzzlePiece(puzzle, board, squareIndex(from), squareIndex(to), step);
      assert.ok(next, `${id}: ${from} → ${to}`);
      board = next;
      assert.equal(evaluateChessPuzzle(puzzle, board, step + 1).solved, step + 1 === moves.length, id);
    }
    assert.equal(hasSolutionBy(puzzle), false, id);
  }
});

test('the master fork choices and helper pieces matter', () => {
  for (const [id, wrongMove] of [
    ['rook-master', { from: 'a1', to: 'a4' }],
    ['knight-master', { from: 'b1', to: 'c3' }],
  ]) {
    const index = chessPuzzlesForLevel('master').findIndex(puzzle => puzzle.id === id);
    const puzzle = buildChessPuzzle(index, 'master');
    const wrong = moveChessPuzzlePiece(puzzle, puzzle.board, squareIndex(wrongMove.from), squareIndex(wrongMove.to));
    assert.ok(wrong, `${id}: the tempting move is legal`);
    assert.equal(hasSolutionBy(puzzle, wrong, 1, puzzle.maxMoves), false, `${id}: the tempting move misses the budget`);
  }
  for (const definition of chessPuzzlesForLevel('master').filter(puzzle => puzzle.movers?.length > 1)) {
    const index = chessPuzzlesForLevel('master').findIndex(puzzle => puzzle.id === definition.id);
    const puzzle = buildChessPuzzle(index, 'master');
    assert.equal(hasSolutionBy({ ...puzzle, movers: [puzzle.from] }, puzzle.board, 0, puzzle.maxMoves), false, `${puzzle.id}: a second mover is necessary`);
  }
});
