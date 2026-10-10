import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, stat } from 'node:fs/promises';
import { PUZZLE_IMAGES, PUZZLE_SIZES, buildPuzzle, placePuzzlePiece, removePuzzlePiece, isPuzzleComplete, normalizePuzzleOptions } from '../puzzle-data.js';

test('every size covers the entire picture exactly once, with matching crop coordinates', () => {
  for (const count of PUZZLE_SIZES) {
    const puzzle = buildPuzzle(count);
    assert.equal(puzzle.columns * puzzle.rows, count);
    assert.deepEqual([...puzzle.order].sort((a, b) => a - b), Array.from({ length: count }, (_, i) => i));
    assert.equal(new Set(puzzle.pieces.map(piece => `${piece.row}:${piece.column}`)).size, count);
    for (const piece of puzzle.pieces) {
      assert.equal(piece.id, piece.row * puzzle.columns + piece.column);
      assert.equal(piece.x, piece.column * 100 / (puzzle.columns - 1));
      assert.equal(piece.y, piece.row * 100);
    }
  }
});
test('an ordered shuffle still becomes an unsolved tray, and invalid sizes fall back safely', () => {
  for (const random of [() => 0, () => 0.999999, () => 1]) {
    const puzzle = buildPuzzle(10, random);
    assert.equal(new Set(puzzle.order).size, 10);
    assert.ok(puzzle.order.some((id, index) => id !== index));
  }
  for (const value of [0, 7, 9, 12, '10', null]) assert.equal(buildPuzzle(value).pieces.length, 6);
});
test('any valid position accepts a piece, while a full shuffled board is not complete', () => {
  for (const count of PUZZLE_SIZES) {
    const puzzle = buildPuzzle(count), placed = new Map();
    assert.equal(isPuzzleComplete(puzzle, placed), false);
    for (let id = 0; id < count; id++) {
      assert.equal(placePuzzlePiece(puzzle, placed, id, (id + 1) % count), true);
      assert.equal(isPuzzleComplete(puzzle, placed), false);
    }
    assert.equal(placed.size, count);
    assert.equal(new Set(placed.values()).size, count);
    // Sorting through occupied slots swaps pieces, without losing any of them.
    for (const id of puzzle.order) {
      const alreadyCorrect = placed.get(id) === id;
      assert.equal(placePuzzlePiece(puzzle, placed, id, id), !alreadyCorrect);
      assert.equal(placePuzzlePiece(puzzle, placed, id, id), false);
      assert.equal(placed.size, count);
      assert.equal(new Set(placed.values()).size, count);
    }
    assert.equal(isPuzzleComplete(puzzle, placed), true);
    assert.deepEqual(placed, new Map(puzzle.pieces.map(piece => [piece.id, piece.id])));
  }
});
test('moving a board piece to an empty slot empties only its previous position', () => {
  const puzzle = buildPuzzle(), placed = new Map([[0, 3], [2, 5]]);
  assert.equal(placePuzzlePiece(puzzle, placed, 3, 1), true);
  assert.deepEqual(placed, new Map([[1, 3], [2, 5]]));
  const before = new Map(placed);
  assert.equal(placePuzzlePiece(puzzle, placed, 3, 1), false);
  assert.deepEqual(placed, before);
});
test('moving a board piece to an occupied slot swaps the two pieces, including slot zero', () => {
  const puzzle = buildPuzzle(), placed = new Map([[0, 3], [1, 4], [2, 5]]);
  assert.equal(placePuzzlePiece(puzzle, placed, 4, 0), true);
  assert.deepEqual(placed, new Map([[0, 4], [1, 3], [2, 5]]));
  assert.equal(placePuzzlePiece(puzzle, placed, 4, 1), true);
  assert.deepEqual(placed, new Map([[0, 3], [1, 4], [2, 5]]));
});
test('placing a tray piece over an occupant returns that occupant to the tray', () => {
  const puzzle = buildPuzzle(), placed = new Map([[0, 2], [4, 5]]);
  assert.equal(placePuzzlePiece(puzzle, placed, 3, 0), true);
  assert.deepEqual(placed, new Map([[0, 3], [4, 5]]));
  assert.equal([...placed.values()].includes(2), false);
  assert.equal(placePuzzlePiece(puzzle, placed, 2, 1), true);
  assert.deepEqual(placed, new Map([[0, 3], [1, 2], [4, 5]]));
});
test('removing a piece returns it to the tray and invalidates completion', () => {
  const puzzle = buildPuzzle(), placed = new Map(puzzle.pieces.map(piece => [piece.id, piece.id]));
  assert.equal(isPuzzleComplete(puzzle, placed), true);
  assert.equal(removePuzzlePiece(puzzle, placed, 0), true);
  assert.equal(placed.has(0), false);
  assert.equal(isPuzzleComplete(puzzle, placed), false);
  const before = new Map(placed);
  assert.equal(removePuzzlePiece(puzzle, placed, 0), false);
  assert.deepEqual(placed, before);
  assert.equal(placePuzzlePiece(puzzle, placed, 0, 0), true);
  assert.equal(isPuzzleComplete(puzzle, placed), true);
  assert.equal(placePuzzlePiece(puzzle, placed, 0, 5), true);
  assert.equal(isPuzzleComplete(puzzle, placed), false);
});
test('invalid piece and slot IDs never mutate valid placements', () => {
  const puzzle = buildPuzzle(), placed = new Map([[0, 2], [1, 4]]);
  for (const invalid of [-1, 6, '0', 1.5, null, undefined, NaN, Infinity]) {
    const before = new Map(placed);
    assert.equal(placePuzzlePiece(puzzle, placed, invalid, 0), false);
    assert.equal(placePuzzlePiece(puzzle, placed, 2, invalid), false);
    assert.equal(removePuzzlePiece(puzzle, placed, invalid), false);
    assert.deepEqual(placed, before);
  }
});
test('malformed boards, unknown occupants and duplicate pieces are rejected without mutation', () => {
  const puzzle = buildPuzzle();
  for (const placed of [new Map([[0, 1], [2, 1]]), new Map([[9, 0]]), new Map([[0, 9]]), new Map([['0', 1]]), new Set([0]), null]) {
    const before = placed instanceof Map || placed instanceof Set ? [...placed] : placed;
    assert.equal(placePuzzlePiece(puzzle, placed, 0, 0), false);
    assert.equal(removePuzzlePiece(puzzle, placed, 0), false);
    assert.equal(isPuzzleComplete(puzzle, placed), false);
    assert.deepEqual(placed instanceof Map || placed instanceof Set ? [...placed] : placed, before);
  }
  for (const malformed of [null, {}, { pieces: [] }, { pieces: [{ id: 0 }, { id: 0 }] }, { pieces: [{ id: -1 }] }]) {
    const placed = new Map();
    assert.equal(placePuzzlePiece(malformed, placed, 0, 0), false);
    assert.equal(removePuzzlePiece(malformed, placed, 0), false);
    assert.equal(isPuzzleComplete(malformed, placed), false);
    assert.equal(placed.size, 0);
  }
});
test('saved settings accept all supported pictures/sizes and recover from malformed storage', () => {
  for (const image of PUZZLE_IMAGES) for (const count of PUZZLE_SIZES) {
    assert.deepEqual(normalizePuzzleOptions({ puzzleImage: image.id, puzzlePieces: count }), { puzzleImage: image.id, puzzlePieces: count });
  }
  for (const value of [undefined, null, false, 'forest', { puzzleImage: '../bad', puzzlePieces: 500 }]) {
    assert.deepEqual(normalizePuzzleOptions(value), { puzzleImage: 'farm', puzzlePieces: 6 });
  }
});
test('four distinct original pictures and puzzle modules ship in the offline bundle', async () => {
  assert.equal(PUZZLE_IMAGES.length, 4);
  assert.equal(new Set(PUZZLE_IMAGES.map(image => image.image)).size, 4);
  const worker = await readFile(new URL('../sw.js', import.meta.url), 'utf8');
  const files = JSON.parse(worker.match(/const ASSETS = (\[[\s\S]*?\]);/)[1]).map(asset => asset.file);
  for (const file of ['puzzle-data.js', 'puzzle-game.js', 'puzzle.css', ...PUZZLE_IMAGES.map(image => image.image.replace('./', ''))]) {
    assert.ok((await stat(new URL(`../${file}`, import.meta.url))).size > 0);
    assert.ok(files.includes(file), `${file} must be playable offline`);
  }
});
