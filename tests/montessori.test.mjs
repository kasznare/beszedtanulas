import test from 'node:test';
import assert from 'node:assert/strict';
import { newMontessoriRound, normalizeMontessoriOptions, placeMontessoriPiece, clearMontessoriBlocker, setMontessoriBlocker, montessoriBoardLayout, montessoriComplete, montessoriSame, rotateMontessoriPiece, montessoriCurrentPiece, moveMontessoriPiece, checkMontessoriRound, MONTESSORI_GAMES, MONTESSORI_COLORS, MONTESSORI_SHAPES, pickMontessoriOdd, takeBackMontessoriPiece, montessoriTowerLeaning, montessoriWrongTargets, montessoriLocked, nextMemorySpan, isRepeatingMotif, montessoriRandom } from '../montessori-data.js';

test('all 28 difficulty variants are solvable, with unique pieces and targets', () => {
  assert.equal(Object.values(MONTESSORI_GAMES).reduce((n, game) => n + game.levels.length, 0), 28);
  for (const [kind, game] of Object.entries(MONTESSORI_GAMES)) for (let level = 1; level <= game.levels.length; level++) {
    for (const value of [0, .25, .7, .9999]) {
      let round = newMontessoriRound(kind, level, () => value);
      assert.equal(new Set(round.pieces.map(piece => piece.id)).size, round.pieces.length);
      assert.equal(new Set(round.targets.map(target => target.id)).size, round.targets.length);
      for (const target of round.blockers) round = clearMontessoriBlocker(round, target);
      if (kind === 'memory') round = { ...round, phase: 'play' };
      if (round.mode === 'odd') round = pickMontessoriOdd(round, round.odd).round;
      const order = kind === 'tower' ? [...round.pieces].sort((a, b) => b.size - a.size) : round.pieces;
      for (const original of order) {
        if (montessoriComplete(round)) break;
        if (kind === 'shapes') { const target = round.targets.find(t => t.id === original.id); if (!target) continue; for (let i = 0; i < 4 && !montessoriSame(montessoriCurrentPiece(round, original.id), target); i++) round = rotateMontessoriPiece(round, original.id); }
        const piece = montessoriCurrentPiece(round, original.id);
        const target = round.targets.find(t => kind === 'tower' || (kind === 'colors' ? t.color === piece.color && t.shade === piece.shade && round.placements.filter(p => p.target === t.id).length < t.count : montessoriSame(piece, t.expected || t) && !round.placements.some(p => p.target === t.id)));
        if (!target) continue;
        const result = placeMontessoriPiece(round, piece.id, target.id);
        assert.equal(result.accepted, true, `${kind}/${level}: ${piece.id}`); round = result.round;
      }
      round = checkMontessoriRound(round);
      assert.equal(montessoriComplete(round), true, `${kind}/${level}`);
      assert.equal(round.placements.length, round.total);
    }
  }
});

test('shape box isolates one shape, introduces distractors, then multiple holes and blockers', () => {
  const rounds = [1, 2, 3, 4].map(level => newMontessoriRound('shapes', level, () => 0));
  assert.deepEqual(rounds.map(round => [round.pieces.length, round.targets.length, round.blockers.length]), [[3, 3, 0], [5, 3, 0], [3, 3, 0], [4, 4, 2]]);
  // Level 1: three different shapes in one colour, so the shape decides.
  assert.equal(new Set(rounds[0].pieces.map(piece => piece.color)).size, 1);
  assert.equal(new Set(rounds[0].pieces.map(piece => piece.shape)).size, 3);
  let round = rounds[1];
  const target = round.targets[0], incorrect = round.pieces.find(piece => piece.shape !== target.shape);
  assert.equal(placeMontessoriPiece(round, incorrect.id, target.id).reason, 'mismatch');
  // Level 2: each distractor shares a shape or a colour with a hole.
  const distractors = round.pieces.filter(piece => !round.targets.some(t => t.id === piece.id));
  assert.equal(distractors.length, 2);
  for (const piece of distractors) assert.ok(round.targets.some(t => t.shape === piece.shape) && round.targets.some(t => t.color === piece.color));
  for (const hole of round.targets) round = placeMontessoriPiece(round, hole.id, hole.id).round;
  assert.equal(montessoriComplete(round), true, 'two distractors can remain on the board');
});

test('shape matching requires both color and outline at every choice level', () => {
  for (let level = 2; level <= 4; level++) {
    const round = newMontessoriRound('shapes', level, () => .5);
    const target = round.targets.find(target => round.pieces.some(piece => piece.shape === target.shape && piece.color !== target.color) && round.pieces.some(piece => piece.color === target.color && piece.shape !== target.shape));
    const matching = round.pieces.find(piece => piece.id === target.id);
    const differentColor = round.pieces.find(piece => piece.shape === target.shape && piece.color !== target.color);
    const differentShape = round.pieces.find(piece => piece.color === target.color && piece.shape !== target.shape);
    let opened = round;
    for (const id of round.blockers) opened = clearMontessoriBlocker(opened, id);
    assert.equal(placeMontessoriPiece(opened, differentColor.id, target.id).reason, 'mismatch');
    assert.equal(placeMontessoriPiece(opened, differentShape.id, target.id).reason, 'mismatch');
    assert.equal(placeMontessoriPiece(opened, matching.id, target.id).accepted, true);
  }
});

test('a moved obstacle can return to cover the same hole without changing placements', () => {
  const round = newMontessoriRound('shapes', 4), id = round.blockers[0];
  const opened = setMontessoriBlocker(round, id, true);
  const closed = setMontessoriBlocker(opened, id, false);
  assert.deepEqual(closed, round);
  assert.equal(placeMontessoriPiece(closed, id, id).reason, 'blocked');
  assert.equal(placeMontessoriPiece(opened, id, id).accepted, true);
});

test('every shape and hole has a stable location inside the shared board', () => {
  for (let level = 1; level <= 4; level++) {
    const round = newMontessoriRound('shapes', level);
    const layout = montessoriBoardLayout(round);
    for (const [items, positions] of [[round.pieces, layout.pieces], [round.targets, layout.targets]]) {
      for (const item of items) {
        const [x, y] = positions[item.id];
        assert.ok(x >= 15 && x <= 85 && y >= 15 && y <= 85);
      }
    }
    assert.deepEqual(montessoriBoardLayout({ ...round, placements: [{ piece: round.pieces[0].id, target: round.targets[0].id }] }), layout);
  }
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

test('tower accepts any disc, but a larger disc on a smaller one leans and the next one slides off', () => {
  let round = newMontessoriRound('tower', 3), before = structuredClone(round);
  // Any disc may start the tower: a small one is accepted…
  round = placeMontessoriPiece(round, 'disc-1', 'tower').round;
  assert.equal(montessoriTowerLeaning(round), false);
  // …and a larger one on top makes it lean.
  round = placeMontessoriPiece(round, 'disc-3', 'tower').round;
  assert.equal(montessoriTowerLeaning(round), true);
  assert.equal(placeMontessoriPiece(round, 'disc-0', 'tower').reason, 'wobble', 'nothing stays on a leaning tower');
  // Tapping the top disc lifts it off again; then the bottom one too.
  round = takeBackMontessoriPiece(round, 'tower');
  assert.deepEqual(round.placements.map(move => move.piece), ['disc-1']);
  round = takeBackMontessoriPiece(round, 'tower');
  assert.deepEqual(round.placements, []);
  assert.strictEqual(takeBackMontessoriPiece(round, 'tower'), round);
  assert.deepEqual(before.placements, [], 'history snapshots stay untouched');
  // Skipping a size is allowed but blocks the skipped disc: the child must undo.
  round = placeMontessoriPiece(round, 'disc-4', 'tower').round;
  round = placeMontessoriPiece(round, 'disc-2', 'tower').round;
  round = placeMontessoriPiece(round, 'disc-3', 'tower').round;
  assert.equal(montessoriTowerLeaning(round), true);
  round = takeBackMontessoriPiece(takeBackMontessoriPiece(round, 'tower'), 'tower');
  for (const index of [3, 2, 1, 0]) round = placeMontessoriPiece(round, `disc-${index}`, 'tower').round;
  assert.equal(montessoriComplete(round), true);
  assert.equal(placeMontessoriPiece(round, 'disc-4', 'tower').reason, 'invalid');
  assert.strictEqual(takeBackMontessoriPiece(round, 'tower'), round, 'a finished tower stays finished');
});

test('a leaning full tower is not finished', () => {
  let round = newMontessoriRound('tower', 1);
  for (const index of [2, 0, 1]) round = placeMontessoriPiece(round, `disc-${index}`, 'tower').round;
  assert.equal(round.placements.length, round.total);
  assert.equal(montessoriTowerLeaning(round), true);
  assert.equal(montessoriComplete(round), false);
});

test('unknown choices and invalid saved difficulty values fall back safely', () => {
  const defaults = { montessoriShapesLevel: 1, montessoriColorsLevel: 1, montessoriTowerLevel: 1, montessoriGridLevel: 1, montessoriMemoryLevel: 1, montessoriMemorySpan: 0, montessoriMemoryStreak: 0 };
  assert.deepEqual(normalizeMontessoriOptions(null), defaults);
  assert.deepEqual(normalizeMontessoriOptions({ montessoriShapesLevel: 4, montessoriColorsLevel: 4, montessoriTowerLevel: 2.5, montessoriGridLevel: 6, montessoriMemorySpan: 9, montessoriMemoryStreak: 3 }), { ...defaults, montessoriShapesLevel: 4, montessoriColorsLevel: 4, montessoriGridLevel: 6 });
  assert.deepEqual(normalizeMontessoriOptions({ montessoriMemorySpan: 6, montessoriMemoryStreak: 1 }), { ...defaults, montessoriMemorySpan: 6, montessoriMemoryStreak: 1 });
  const round = newMontessoriRound('unknown', 900, () => NaN);
  assert.equal(round.kind, 'shapes'); assert.equal(round.level, 1);
  assert.equal(placeMontessoriPiece(round, '__proto__', round.targets[0].id).reason, 'invalid');
  assert.equal(placeMontessoriPiece(round, round.pieces[0].id, 'missing').reason, 'invalid');
});

test('free piece positions and rotation preserve immutable undo snapshots', () => {
  const round = newMontessoriRound('shapes', 6), piece = round.pieces.find(p => p.shape === 'triangle'), before = structuredClone(round);
  let moved = moveMontessoriPiece(round, piece.id, 35, 47);
  assert.deepEqual(montessoriBoardLayout(moved).pieces[piece.id], [35, 47]);
  moved = rotateMontessoriPiece(moved, piece.id);
  assert.deepEqual(montessoriBoardLayout(moved).pieces[piece.id], [35, 47]);
  assert.deepEqual(round, before);
  assert.deepEqual(moveMontessoriPiece(moved, piece.id, -50, 200).positions[piece.id], [5, 95]);
  assert.strictEqual(moveMontessoriPiece(round, piece.id, NaN, 20), round);
  const target = round.targets.find(t => t.id === piece.id);
  assert.equal(placeMontessoriPiece(round, piece.id, target.id).reason, 'mismatch');
  let aligned = round; for (let n = 0; n < 3; n++) aligned = rotateMontessoriPiece(aligned, piece.id);
  assert.equal(placeMontessoriPiece(aligned, piece.id, target.id).accepted, true);
});

test('size and shade mismatches fail; counting bowls can overflow and need the ✓ check', () => {
  const shapes = newMontessoriRound('shapes', 5), target = shapes.targets[0];
  const wrong = shapes.pieces.find(p => p.color === target.color && p.shape === target.shape && p.size !== target.size);
  assert.equal(placeMontessoriPiece(shapes, wrong.id, target.id).reason, 'mismatch');
  let colors = newMontessoriRound('colors', 5), bowl = colors.targets[0];
  assert.deepEqual(colors.targets.map(t => t.count).sort(), [1, 2, 3, 4]);
  const opposite = colors.pieces.find(p => p.color === bowl.color && p.shade !== bowl.shade);
  assert.equal(placeMontessoriPiece(colors, opposite.id, bowl.id).reason, 'mismatch');
  // Fill every bowl exactly, then drop the spare ball into the first one too.
  for (const t of colors.targets) for (const piece of colors.pieces.filter(p => p.color === t.color && p.shade === t.shade).slice(0, t.count)) colors = placeMontessoriPiece(colors, piece.id, t.id).round;
  assert.equal(montessoriComplete(colors), false, 'the counting level is finished only by the check');
  const spare = colors.pieces.find(p => p.color === bowl.color && p.shade === bowl.shade && !colors.placements.some(m => m.piece === p.id));
  const over = placeMontessoriPiece(colors, spare.id, bowl.id);
  assert.equal(over.accepted, true, 'a full bowl takes one more ball');
  const failed = checkMontessoriRound(over.round);
  assert.equal(montessoriComplete(failed), false);
  assert.deepEqual(montessoriWrongTargets(failed), [bowl.id], 'the overfilled bowl is marked');
  const fixed = takeBackMontessoriPiece(failed, bowl.id);
  assert.equal(fixed.placements.filter(m => m.target === bowl.id).length, bowl.count);
  assert.deepEqual(montessoriWrongTargets(fixed), [], 'taking a ball out clears the marks until the next check');
  assert.equal(montessoriComplete(checkMontessoriRound(fixed)), true);
});

test('colour trays use a fresh colour choice and a fresh counting order', () => {
  const firstColours = new Set(), countOrders = new Set();
  for (let seed = 1; seed <= 40; seed++) {
    firstColours.add(newMontessoriRound('colors', 1, montessoriRandom(seed)).targets.map(t => t.color).join());
    countOrders.add(newMontessoriRound('colors', 5, montessoriRandom(seed)).targets.map(t => t.count).join());
  }
  assert.ok(firstColours.size >= 5, `colour pairs vary: ${[...firstColours]}`);
  assert.ok(countOrders.size >= 6, `bowl amounts vary: ${[...countOrders]}`);
});

test('grid requires both row and column, retains wrong placements, and supports swapping', () => {
  let round = newMontessoriRound('grid', 1), a = round.targets[0], b = round.targets[1];
  const pa = round.pieces.find(p => montessoriSame(p, a)), pb = round.pieces.find(p => montessoriSame(p, b));
  round = placeMontessoriPiece(round, pa.id, b.id).round; round = placeMontessoriPiece(round, pb.id, a.id).round;
  assert.equal(checkMontessoriRound(round).checked, false);
  const before = structuredClone(round);
  round = placeMontessoriPiece(round, pa.id, a.id).round;
  assert.equal(round.placements.find(p => p.piece === pb.id).target, b.id);
  assert.equal(before.placements.find(p => p.piece === pa.id).target, b.id);
  assert.equal(montessoriComplete(round), false);
});

test('memory verifies color and shape only when checked, and marks the wrong beads', () => {
  let round = newMontessoriRound('memory', 4);
  assert.equal(placeMontessoriPiece(round, round.pieces[0].id, round.targets[0].id).reason, 'preview');
  round = { ...round, phase: 'play' };
  for (const target of round.targets) {
    const piece = round.pieces.find(p => montessoriSame(p, target.expected) && !round.placements.some(move => move.piece === p.id));
    round = placeMontessoriPiece(round, piece.id, target.id).round;
  }
  assert.equal(montessoriComplete(round), false);
  // Swap the first two beads: the check fails, counts a miss and marks both places.
  const [a, b] = round.targets;
  const swapped = placeMontessoriPiece(round, round.placements.find(m => m.target === a.id).piece, b.id).round;
  const failed = checkMontessoriRound(swapped);
  assert.equal(failed.checked, false); assert.equal(failed.misses, 1);
  assert.deepEqual(montessoriWrongTargets(failed), [a.id, b.id]);
  assert.deepEqual(montessoriWrongTargets(swapped), [], 'nothing is marked before a check');
  assert.equal(montessoriComplete(checkMontessoriRound(round)), true);
});

test('memory rows are random spans of 3 to 7 beads with look-alike spares and limited peeking', () => {
  for (let level = 1; level <= 4; level++) for (let span = 3; span <= 7; span++) for (let seed = 1; seed <= 30; seed++) {
    const round = newMontessoriRound('memory', level, montessoriRandom(seed), { span });
    const row = round.targets.map(t => t.expected), label = `L${level}/${span}/${seed}`;
    assert.equal(row.length, span, label); assert.equal(round.total, span);
    for (let i = 1; i < row.length; i++) assert.ok(!montessoriSame(row[i], row[i - 1]), `${label}: no bead repeats right away`);
    if (level <= 2) assert.ok(row.every(bead => bead.shape === 'circle'), `${label}: colours only`);
    else assert.equal(new Set(row.map(bead => `${bead.color}/${bead.shape}`)).size, span, `${label}: every bead differs`);
    const spares = round.pieces.filter(piece => piece.id.startsWith('spare'));
    assert.equal(spares.length, level <= 2 ? 1 : 2);
    for (const spare of spares) assert.ok(row.some(bead => bead.color === spare.color || bead.shape === spare.shape), `${label}: spare looks like a real bead`);
    assert.equal(round.peekLimit, [null, null, 2, 1][level - 1]);
  }
  // With real randomness the row is not a short motif shown twice.
  let motifs = 0;
  for (let seed = 1; seed <= 200; seed++) motifs += isRepeatingMotif(newMontessoriRound('memory', 2, montessoriRandom(seed), { span: 6 }).targets.map(t => t.expected)) ? 1 : 0;
  assert.equal(motifs, 0);
  assert.equal(newMontessoriRound('memory', 1).total, 3, 'level 1 starts with three beads');
  assert.equal(newMontessoriRound('memory', 1, Math.random, { span: 12 }).total, 3, 'invalid spans fall back');
});

test('memory span grows after two clean rounds and shrinks after a missed check', () => {
  assert.deepEqual(nextMemorySpan(4, 0, {}), { span: 4, streak: 1 });
  assert.deepEqual(nextMemorySpan(4, 1, {}), { span: 5, streak: 0 });
  assert.deepEqual(nextMemorySpan(4, 1, { peeks: 1 }), { span: 4, streak: 0 }, 'peeking is not a clean round');
  assert.deepEqual(nextMemorySpan(4, 1, { misses: 1 }), { span: 3, streak: 0 });
  assert.deepEqual(nextMemorySpan(3, 0, { misses: 2 }), { span: 3, streak: 0 });
  assert.deepEqual(nextMemorySpan(7, 1, {}), { span: 7, streak: 0 });
});

test('grid marks wrong cells after a failed check', () => {
  let round = newMontessoriRound('grid', 1);
  const [a, b, ...rest] = round.targets;
  const pa = round.pieces.find(p => montessoriSame(p, a)), pb = round.pieces.find(p => montessoriSame(p, b));
  round = placeMontessoriPiece(round, pa.id, b.id).round; round = placeMontessoriPiece(round, pb.id, a.id).round;
  for (const target of rest) round = placeMontessoriPiece(round, round.pieces.find(p => montessoriSame(p, target)).id, target.id).round;
  const checked = checkMontessoriRound(round);
  assert.deepEqual(montessoriWrongTargets(checked), [a.id, b.id]);
  const moved = placeMontessoriPiece(checked, pa.id, a.id).round;
  assert.deepEqual(montessoriWrongTargets(moved), [], 'moving a tile clears the marks');
  assert.equal(montessoriComplete(checkMontessoriRound(moved)), true);
});

test('grid "Mi hiányzik?" fills one gap from three look-alike candidates', () => {
  for (let seed = 1; seed <= 40; seed++) {
    const round = newMontessoriRound('grid', 5, montessoriRandom(seed)), gap = round.targets.find(t => t.id === round.gap);
    assert.equal(round.mode, 'missing'); assert.equal(round.placements.length, 8);
    assert.ok(!round.placements.some(m => m.target === gap.id));
    const candidates = round.pieces.filter(p => !montessoriLocked(round, p.id));
    assert.equal(candidates.length, 3);
    assert.equal(candidates.filter(p => montessoriSame(p, gap)).length, 1, 'exactly one candidate fits');
    assert.ok(candidates.some(p => p.shape === gap.shape && p.color !== gap.color) && candidates.some(p => p.color === gap.color && p.shape !== gap.shape), 'decoys keep the row shape or the column colour');
    const decoy = candidates.find(p => !montessoriSame(p, gap));
    assert.equal(placeMontessoriPiece(round, decoy.id, gap.id).reason, 'mismatch');
    assert.equal(placeMontessoriPiece(round, round.fixed[0], gap.id).reason, 'invalid', 'pre-filled tiles stay put');
    const done = placeMontessoriPiece(round, candidates.find(p => montessoriSame(p, gap)).id, gap.id).round;
    assert.equal(montessoriComplete(done), true);
  }
});

test('grid "Mi nem illik?" asks for the rule-breaking tile, then its replacement', () => {
  for (let seed = 1; seed <= 40; seed++) {
    const round = newMontessoriRound('grid', 6, montessoriRandom(seed)), cell = round.targets.find(t => t.id === round.gap);
    assert.equal(round.mode, 'odd'); assert.equal(round.phase, 'find'); assert.equal(round.placements.length, 9);
    const odd = round.pieces.find(p => p.id === round.odd);
    assert.ok(!montessoriSame(odd, cell) && (odd.shape === cell.shape || odd.color === cell.color), 'the odd tile breaks exactly one rule');
    // Every other placed tile follows its row and column.
    for (const move of round.placements.filter(m => m.piece !== odd.id)) assert.ok(montessoriSame(round.pieces.find(p => p.id === move.piece), round.targets.find(t => t.id === move.target)));
    assert.equal(placeMontessoriPiece(round, 'candidate-0', cell.id).reason, 'preview');
    assert.equal(pickMontessoriOdd(round, round.fixed[0]).reason, 'mismatch');
    const opened = pickMontessoriOdd(round, odd.id).round;
    assert.equal(opened.phase, 'fix'); assert.equal(opened.placements.length, 8);
    const candidates = opened.pieces.filter(p => !montessoriLocked(opened, p.id));
    assert.equal(candidates.length, 3);
    assert.ok(!candidates.some(p => montessoriSame(p, odd)), 'the removed tile is not offered again');
    assert.equal(montessoriComplete(placeMontessoriPiece(opened, candidates.find(p => montessoriSame(p, cell)).id, cell.id).round), true);
  }
});
