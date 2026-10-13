import test from 'node:test';
import assert from 'node:assert/strict';
import { createMontessoriSession, restoreMontessoriSession, saveMontessoriSession, loadMontessoriSession } from '../montessori-session.js';
import { moveMontessoriPiece, rotateMontessoriPiece, setMontessoriBlocker, placeMontessoriPiece } from '../montessori-data.js';
const storage = () => { const values = new Map(); return { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value) }; };
test('seed restores exact exercise, positions, turns, obstacles and accepted placements', () => {
  const store = storage(); let round = createMontessoriSession('shapes', 8, 42);
  const piece = round.pieces.find(p => p.shape === 'triangle');
  round = moveMontessoriPiece(round, piece.id, 40, 32); round = rotateMontessoriPiece(round, piece.id);
  round = setMontessoriBlocker(round, round.blockers[0], true);
  assert.equal(saveMontessoriSession(store, 'child-a', round, false), true);
  assert.deepEqual(loadMontessoriSession(store, 'child-a', 'shapes', 8), { round, awarded: false });
  assert.equal(loadMontessoriSession(store, 'child-b', 'shapes', 8), null);
  assert.equal(loadMontessoriSession(store, 'child-a', 'shapes', 7), null);
});
test('completed reward flag survives undo, exit and reload', () => {
  const store = storage(), initial = createMontessoriSession('shapes', 1, 23);
  const done = placeMontessoriPiece(initial, initial.targets[0].id, initial.targets[0].id).round;
  saveMontessoriSession(store, 'a', done, true);
  assert.equal(loadMontessoriSession(store, 'a', 'shapes', 1).awarded, true);
  saveMontessoriSession(store, 'a', initial, true);
  assert.equal(loadMontessoriSession(store, 'a', 'shapes', 1).awarded, true);
});
test('invalid saves cannot forge moves, answers, rotations or a completed challenge', () => {
  assert.equal(restoreMontessoriSession({ seed: -1 }, 'grid', 4), null);
  const record = { seed: 42, positions: { missing: [3, 4] }, rotations: { missing: 5 }, cleared: ['fake'], placements: [{ piece: 'missing', target: 'fake' }], checked: true };
  const restored = restoreMontessoriSession(record, 'grid', 4);
  assert.equal(restored.round.checked, false); assert.equal(restored.round.placements.length, 0);
  assert.equal(restored.awarded, false);
  const corrupt = { getItem: () => '{', setItem: () => { throw Error('quota'); } };
  assert.equal(loadMontessoriSession(corrupt, 'a', 'grid', 4), null);
  assert.equal(saveMontessoriSession(corrupt, 'a', restored.round, false), false);
});
test('memory preview can resume with an existing editable arrangement', () => {
  const store = storage(); let round = { ...createMontessoriSession('memory', 4, 12), phase: 'play' };
  round = placeMontessoriPiece(round, round.pieces[0].id, round.targets[0].id).round;
  round = { ...round, phase: 'preview', assisted: true };
  saveMontessoriSession(store, 'a', round, false);
  assert.deepEqual(loadMontessoriSession(store, 'a', 'memory', 4), { round, awarded: false });
});

test('an obstacle returned over a used hole cannot discard the accepted move on reload', () => {
  const store = storage(); let round = createMontessoriSession('shapes', 4, 89), id = round.blockers[0];
  round = setMontessoriBlocker(round, id, true); round = placeMontessoriPiece(round, id, id).round; round = setMontessoriBlocker(round, id, false);
  saveMontessoriSession(store, 'a', round, false);
  assert.deepEqual(loadMontessoriSession(store, 'a', 'shapes', 4).round, round);
});
