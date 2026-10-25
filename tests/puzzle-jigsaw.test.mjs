import test from 'node:test';
import assert from 'node:assert/strict';
import { PUZZLE_IMAGES, PUZZLE_SIZES, PUZZLE_TAB, puzzleGrid, buildPuzzle, puzzlePieceOutline, puzzlePieceCrop, puzzleFits, puzzleStars, nextPuzzleChoice, normalizePuzzleBoard, normalizePuzzleProgress, validatePuzzleProgress } from '../puzzle-data.js';

test('piece counts make real grids instead of thin strips', () => {
  assert.deepEqual(PUZZLE_SIZES, [2, 4, 6, 9, 12, 16]);
  const grids = Object.fromEntries(PUZZLE_SIZES.map(count => [count, puzzleGrid(count)]));
  assert.deepEqual(grids, { 2: { rows: 1, columns: 2 }, 4: { rows: 2, columns: 2 }, 6: { rows: 2, columns: 3 }, 9: { rows: 3, columns: 3 }, 12: { rows: 3, columns: 4 }, 16: { rows: 4, columns: 4 } });
  for (const count of PUZZLE_SIZES.slice(1)) {
    const { rows, columns } = grids[count], ratio = 3 * rows / (2 * columns);
    assert.ok(ratio >= .74 && ratio <= 1.51, `${count}: pieces stay chunky (${ratio})`);
  }
});

test('neighbouring edges interlock, and only the picture border is flat', () => {
  for (const count of PUZZLE_SIZES) {
    const puzzle = buildPuzzle(count), at = (row, column) => puzzle.pieces[row * puzzle.columns + column];
    let tabs = 0;
    for (const piece of puzzle.pieces) {
      const { top, right, bottom, left } = piece.edges;
      assert.equal(top === 0, piece.row === 0); assert.equal(left === 0, piece.column === 0);
      assert.equal(bottom === 0, piece.row === puzzle.rows - 1); assert.equal(right === 0, piece.column === puzzle.columns - 1);
      if (right) { assert.equal(right, -at(piece.row, piece.column + 1).edges.left); tabs += right > 0; }
      if (bottom) assert.equal(bottom, -at(piece.row + 1, piece.column).edges.top);
    }
    assert.deepEqual(buildPuzzle(count, () => .3).pieces, puzzle.pieces, 'shapes do not depend on the shuffle, so a saved board keeps them');
    if (count >= 6) assert.ok(tabs > 0);
  }
});

test('outlines stay inside their enlarged box, and flat sides follow the cell edge', () => {
  const lo = PUZZLE_TAB / (1 + 2 * PUZZLE_TAB) * 100, hi = 100 - lo;
  for (const count of PUZZLE_SIZES) for (const piece of buildPuzzle(count).pieces) {
    const outline = puzzlePieceOutline(piece);
    assert.match(outline, /^polygon\(/);
    const points = [...outline.matchAll(/([\d.]+)% ([\d.]+)%/g)].map(match => [Number(match[1]), Number(match[2])]);
    assert.ok(points.length >= 4 && points.every(([x, y]) => x >= -.01 && x <= 100.01 && y >= -.01 && y <= 100.01));
    const tabCount = Object.values(piece.edges).filter(Boolean).length;
    assert.equal(points.length, 4 + tabCount * 11);
    if (!piece.edges.top) assert.ok(points.every(([, y]) => y >= lo - .01), 'a flat top never rises above the cell');
    if (!piece.edges.left) assert.ok(points.every(([x]) => x >= lo - .01));
    if (piece.edges.right > 0) assert.ok(points.some(([x]) => x > hi + 5), 'a tab reaches into the neighbour');
    if (piece.edges.bottom < 0) assert.ok(points.some(([, y]) => y < hi - 5), 'a blank cuts into the piece');
  }
});

test('crop offsets put the matching part of the picture behind each enlarged piece', () => {
  for (const count of PUZZLE_SIZES) {
    const puzzle = buildPuzzle(count), span = 1 + 2 * PUZZLE_TAB;
    for (const piece of puzzle.pieces) {
      const [, sizeX, sizeY, posX, posY] = puzzlePieceCrop(puzzle, piece).match(/background-size:([\d.-]+)% ([\d.-]+)%;background-position:([\d.-]+)% ([\d.-]+)%/).map(Number);
      // Offset of the image inside the box, in cell units, must equal the box's distance from the picture origin.
      const offsetX = posX / 100 * (span - sizeX / 100 * span), offsetY = posY / 100 * (span - sizeY / 100 * span);
      assert.ok(Math.abs(offsetX + (piece.column - PUZZLE_TAB)) < .01, `${count}/${piece.id} x`);
      assert.ok(Math.abs(offsetY + (piece.row - PUZZLE_TAB)) < .01, `${count}/${piece.id} y`);
    }
  }
});

test('"Csak a jó helyre" accepts only the matching slot; stars reflect mistakes and peeking', () => {
  assert.equal(puzzleFits(true, 3, 3), true); assert.equal(puzzleFits(true, 3, 4), false); assert.equal(puzzleFits(false, 3, 4), true);
  assert.equal(puzzleStars({ pieces: 4 }), 5);
  assert.equal(puzzleStars({ pieces: 4, wrong: 1 }), 4);
  assert.equal(puzzleStars({ pieces: 12, wrong: 2 }), 5, 'big pictures allow a couple of tries');
  assert.equal(puzzleStars({ pieces: 12, wrong: 3, hinted: true }), 3);
  assert.equal(puzzleStars({ pieces: 2, wrong: 40, hinted: true }), 1);
});

test('after a finished picture the child can move to the next picture or to more pieces', () => {
  assert.deepEqual(nextPuzzleChoice('sun', 4), { puzzleImage: 'ball', puzzlePieces: 4 });
  assert.deepEqual(nextPuzzleChoice(PUZZLE_IMAGES.at(-1).id, 6), { puzzleImage: PUZZLE_IMAGES[0].id, puzzlePieces: 6 });
  assert.deepEqual(nextPuzzleChoice('farm', 6, 'more'), { puzzleImage: 'farm', puzzlePieces: 9 });
  assert.equal(nextPuzzleChoice('farm', 16, 'more'), null);
});

test('finished counts survive saves, and old 8/10-piece boards are skipped rather than rejected', () => {
  const order = buildPuzzle(9, () => 0).order;
  const board = { imageId: 'farm', pieceCount: 9, order, placed: [], rewarded: false, solved: 3 };
  assert.equal(normalizePuzzleBoard(board, 'farm', 9).solved, 3);
  assert.equal(normalizePuzzleBoard({ ...board, solved: undefined }, 'farm', 9).solved, 0);
  assert.equal(normalizePuzzleBoard({ ...board, solved: undefined, rewarded: true }, 'farm', 9).solved, 1);
  for (const solved of [-1, 1.5, '2']) assert.equal(normalizePuzzleBoard({ ...board, solved }, 'farm', 9), null);
  const legacy = { imageId: 'farm', pieceCount: 10, order: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9], placed: [], rewarded: false };
  assert.equal(validatePuzzleProgress({ 'farm:10': legacy, 'farm:9': board }), true);
  assert.deepEqual(Object.keys(normalizePuzzleProgress({ 'farm:10': legacy, 'farm:9': board })), ['farm:9']);
  assert.throws(() => validatePuzzleProgress({ 'farm:11': legacy }));
});
