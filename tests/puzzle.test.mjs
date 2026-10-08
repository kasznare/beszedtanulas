import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, stat } from 'node:fs/promises';
import { PUZZLE_IMAGES, PUZZLE_SIZES, buildPuzzle, placePuzzlePiece, normalizePuzzleOptions } from '../puzzle-data.js';

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
test('wrong places and repeated placements cannot change completion; all sizes can finish', () => {
  for (const count of PUZZLE_SIZES) {
    const puzzle = buildPuzzle(count), placed = new Set();
    for (const [piece, slot] of [[0, 1], [-1, -1], [count, count], ['0', 0], [1.5, 1.5], [null, null]]) {
      assert.equal(placePuzzlePiece(puzzle, placed, piece, slot), false);
      assert.equal(placed.size, 0);
    }
    for (const id of puzzle.order) {
      assert.equal(placePuzzlePiece(puzzle, placed, id, id), true);
      assert.equal(placePuzzlePiece(puzzle, placed, id, id), false);
    }
    assert.equal(placed.size, count);
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
