import test from 'node:test';
import assert from 'node:assert/strict';
import { newMontessoriRound, normalizeMontessoriOptions, placeMontessoriPiece, clearMontessoriBlocker, montessoriComplete, MONTESSORI_GAMES } from '../montessori-data.js';

test('all ten difficulty variants are solvable, with unique pieces and targets', () => {
  for (const [kind, game] of Object.entries(MONTESSORI_GAMES)) for (let level = 1; level <= game.levels.length; level++) {
    for (const value of [0, .25, .7, .9999]) {
      let round = newMontessoriRound(kind, level, () => value);
      assert.equal(new Set(round.pieces.map(piece => piece.id)).size, round.pieces.length);
      assert.equal(new Set(round.targets.map(target => target.id)).size, round.targets.length);
      for (const target of round.blockers) round = clearMontessoriBlocker(round, target);
      const order = kind === 'tower' ? [...round.pieces].sort((a, b) => b.size - a.size) : round.pieces;
      for (const piece of order) {
        const target = round.targets.find(target => kind === 'shapes' ? target.shape === piece.shape : kind === 'colors' ? target.color === piece.color : true);
        if (!target) continue;
        const result = placeMontessoriPiece(round, piece.id, target.id);
        assert.equal(result.accepted, true, `${kind}/${level}: ${piece.id}`);
        round = result.round;
      }
      assert.equal(montessoriComplete(round), true, `${kind}/${level}`);
      assert.equal(round.placements.length, round.total);
    }
  }
});

test('shape box isolates one shape, introduces distractors, then multiple holes and blockers', () => {
  const rounds = [1, 2, 3, 4].map(level => newMontessoriRound('shapes', level, () => 0));
  assert.deepEqual(rounds.map(round => [round.pieces.length, round.targets.length, round.blockers.length]), [[1, 1, 0], [3, 1, 0], [3, 3, 0], [4, 4, 2]]);
  const round = rounds[1], target = round.targets[0];
  const incorrect = round.pieces.find(piece => piece.shape !== target.shape);
  assert.equal(placeMontessoriPiece(round, incorrect.id, target.id).reason, 'mismatch');
  const finished = placeMontessoriPiece(round, target.id, target.id).round;
  assert.equal(montessoriComplete(finished), true, 'two distractors can remain in the tray');
});

test('blocked holes refuse a matching shape until that specific obstacle moves', () => {
  const round = newMontessoriRound('shapes', 4), before = structuredClone(round);
  const [first, second] = round.blockers;
  assert.equal(placeMontessoriPiece(round, first, first).reason, 'blocked');
  assert.strictEqual(clearMontessoriBlocker(round, 'missing'), round);
  const cleared = clearMontessoriBlocker(round, first);
  assert.strictEqual(clearMontessoriBlocker(cleared, first), cleared);
  assert.equal(placeMontessoriPiece(cleared, first, first).accepted, true);
  assert.equal(placeMontessoriPiece(cleared, second, second).reason, 'blocked');
  assert.deepEqual(round, before, 'history snapshots remain intact for undo');
});

test('color bowls accept both matching balls but never duplicate a piece', () => {
  const round = newMontessoriRound('colors', 3), before = structuredClone(round);
  const piece = round.pieces[0], same = round.pieces.find(item => item.color === piece.color && item.id !== piece.id);
  const wrong = round.targets.find(target => target.color !== piece.color);
  assert.equal(placeMontessoriPiece(round, piece.id, wrong.id).reason, 'mismatch');
  const first = placeMontessoriPiece(round, piece.id, piece.color).round;
  assert.equal(placeMontessoriPiece(first, piece.id, piece.color).reason, 'invalid');
  const second = placeMontessoriPiece(first, same.id, same.color).round;
  assert.equal(second.placements.length, 2);
  assert.deepEqual(round, before);
});

test('tower requires largest to smallest at every step', () => {
  let round = newMontessoriRound('tower', 3);
  assert.equal(placeMontessoriPiece(round, 'disc-0', 'tower').reason, 'mismatch');
  for (let index = 4; index >= 0; index--) {
    const result = placeMontessoriPiece(round, `disc-${index}`, 'tower');
    assert.equal(result.accepted, true); round = result.round;
    if (index > 1) assert.equal(placeMontessoriPiece(round, 'disc-0', 'tower').reason, 'mismatch');
  }
  assert.equal(montessoriComplete(round), true);
  assert.equal(placeMontessoriPiece(round, 'disc-4', 'tower').reason, 'invalid');
});

test('unknown choices and invalid saved difficulty values fall back safely', () => {
  assert.deepEqual(normalizeMontessoriOptions(null), { montessoriShapesLevel: 1, montessoriColorsLevel: 1, montessoriTowerLevel: 1 });
  assert.deepEqual(normalizeMontessoriOptions({ montessoriShapesLevel: 4, montessoriColorsLevel: 4, montessoriTowerLevel: 2.5 }), { montessoriShapesLevel: 4, montessoriColorsLevel: 1, montessoriTowerLevel: 1 });
  const round = newMontessoriRound('unknown', 900, () => NaN);
  assert.equal(round.kind, 'shapes'); assert.equal(round.level, 1);
  assert.equal(placeMontessoriPiece(round, '__proto__', round.targets[0].id).reason, 'invalid');
  assert.equal(placeMontessoriPiece(round, round.pieces[0].id, 'missing').reason, 'invalid');
});
