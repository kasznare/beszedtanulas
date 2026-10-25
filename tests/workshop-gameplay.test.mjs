import test from 'node:test';
import assert from 'node:assert/strict';
import { WORKSHOP_GAMES, WORKSHOP_LEVEL_KEYS, WORKSHOP_TASK_VERSION, normalizeWorkshopOptions, workshopLevelFor, generateWorkshopTask, newWorkshopSession, workshopSortTarget, workshopSolved, workshopBalanceSolutions, workshopBalanceStars, workshopFixedSum, workshopHint, normalizeWorkshop, validateWorkshop, workshopTaskForSession } from '../workshop-data.js';

const same = (a, b) => a.color === b.color && a.shape === b.shape;

test('each workshop keeps its own level and the old shared level seeds all three', () => {
  assert.deepEqual(normalizeWorkshopOptions({ workshopLevel: 3 }), { workshopSortLevel: 3, workshopPatternLevel: 3, workshopBalanceLevel: 3 });
  assert.deepEqual(normalizeWorkshopOptions({ workshopLevel: 2, workshopSortLevel: 1 }), { workshopSortLevel: 1, workshopPatternLevel: 2, workshopBalanceLevel: 2 });
  for (const bad of [undefined, null, [], 'x', { workshopLevel: 7, workshopPatternLevel: 0 }]) assert.deepEqual(normalizeWorkshopOptions(bad), { workshopSortLevel: 1, workshopPatternLevel: 1, workshopBalanceLevel: 1 });
  assert.equal(workshopLevelFor({ workshopLevel: 1, workshopBalanceLevel: 3 }, 'balance'), 3);
  assert.deepEqual(Object.keys(WORKSHOP_LEVEL_KEYS), WORKSHOP_GAMES);
});

test('new Felfedező sorting never lets size stand in for shape or colour', () => {
  let sizeRounds = 0;
  for (let seed = 0; seed < 300; seed++) for (const round of [0, 1]) {
    const task = generateWorkshopTask('sort', 1, seed, WORKSHOP_TASK_VERSION, round);
    for (const shape of new Set(task.objects.map(object => object.shape))) {
      assert.deepEqual(new Set(task.objects.filter(object => object.shape === shape).map(object => object.size)), new Set([0, 1]), `seed ${seed}: ${shape} comes in both sizes`);
    }
    for (const color of task.colors) assert.equal(new Set(task.objects.filter(object => object.color === color).map(object => object.size)).size, 2);
    if (task.ruleKeys[0] === 'size') {
      sizeRounds++;
      const byShape = task.objects.map(object => object.shape), bins = task.objects.map(object => workshopSortTarget(task, object));
      assert.ok(byShape.some((shape, i) => byShape.some((other, j) => shape === other && bins[i] !== bins[j])));
    }
  }
  assert.ok(sizeRounds > 50);
  // Saved version-3 tasks are rebuilt exactly as they were dealt.
  for (let seed = 0; seed < 50; seed++) {
    const legacy = generateWorkshopTask('sort', 1, seed, 3);
    const shapes = [...new Set(legacy.objects.map(object => object.shape))];
    assert.ok(shapes.some(shape => new Set(legacy.objects.filter(object => object.shape === shape).map(object => object.size)).size === 1));
  }
});

test('pattern toolboxes include crossed decoys that never belong in the thread', () => {
  for (const level of [1, 2, 3]) for (let seed = 0; seed < 250; seed++) {
    const task = generateWorkshopTask('pattern', level, seed), used = new Set(task.motif);
    const decoys = task.palette.map((_, index) => index).filter(index => !used.has(index));
    assert.ok(task.palette.length <= 6);
    assert.ok(decoys.length >= Math.min(level === 1 ? 1 : 2, 6 - used.size), `level ${level} seed ${seed}`);
    assert.ok(task.sequence.every(value => used.has(value)));
    assert.equal(new Set(task.palette.map(object => `${object.color}:${object.shape}`)).size, task.palette.length);
    if (level === 1) {
      const decoy = task.palette[decoys[0]], motif = task.motif.map(index => task.palette[index]);
      assert.ok(motif.some(object => object.color === decoy.color || object.shape === decoy.shape), 'Felfedező decoy shares a colour or shape with the motif');
    }
    const session = newWorkshopSession('pattern', level, seed);
    session.moves.answers = task.holes.map(() => decoys[0] ?? 0);
    if (decoys.length) assert.equal(workshopSolved(task, session), false);
  }
  for (let seed = 0; seed < 40; seed++) {
    const legacy = generateWorkshopTask('pattern', 1, seed, 3);
    assert.ok(legacy.palette.every((_, index) => legacy.motif.includes(index)), 'version-3 saves keep their old toolbox');
  }
});

test('Felfedező balance offers a missing-rod task and a fewest-rods task with stars', () => {
  const modes = new Set();
  for (let seed = 0; seed < 300; seed++) {
    const task = generateWorkshopTask('balance', 1, seed), solutions = workshopBalanceSolutions(task);
    modes.add(task.mode);
    const ones = newWorkshopSession('balance', 1, seed); ones.moves.rods = Array(task.target).fill(1);
    assert.equal(workshopSolved(task, ones), false, 'a row of ones is never accepted');
    if (task.mode === 'missing') {
      assert.equal(task.fixed.length, 1);
      assert.equal(solutions.length, 1);
      assert.deepEqual(solutions[0], [task.target - task.fixed[0]]);
      assert.ok(task.fixed[0] >= 1 && solutions[0][0] >= 2 && solutions[0][0] <= 6);
      assert.equal(workshopFixedSum(task) + solutions[0][0], task.target);
      const wrong = newWorkshopSession('balance', 1, seed); wrong.moves.rods = [task.choices.find(n => n !== solutions[0][0])];
      assert.equal(workshopSolved(task, wrong), false);
      assert.deepEqual(workshopHint(task, wrong), { action: 'remove', index: 0, value: wrong.moves.rods[0] });
      assert.equal(workshopBalanceStars(task, solutions[0]), null);
    } else {
      assert.equal(task.mode, 'fewest');
      assert.equal(Math.min(...solutions.map(rods => rods.length)), task.minRods);
      const shortest = solutions.find(rods => rods.length === task.minRods), longest = solutions.reduce((a, b) => b.length > a.length ? b : a);
      assert.equal(workshopBalanceStars(task, shortest), 3);
      assert.equal(workshopBalanceStars(task, [...shortest, 0].slice(0, task.minRods + 1)), 2);
      assert.equal(workshopBalanceStars(task, longest), longest.length - task.minRods >= 2 ? 1 : longest.length > task.minRods ? 2 : 3);
      const fresh = newWorkshopSession('balance', 1, seed);
      for (let step = 0; step < 8 && !workshopSolved(task, fresh); step++) { const hint = workshopHint(task, fresh); assert.equal(hint.action, 'add'); fresh.moves.rods.push(hint.value); }
      assert.equal(fresh.moves.rods.length, task.minRods, 'hints from an empty tray lead to a three-star answer');
    }
    const session = newWorkshopSession('balance', 1, seed); session.moves.rods = [...solutions[0]];
    const progress = normalizeWorkshop(); progress.sessions.balance[0] = session;
    assert.deepEqual(validateWorkshop(JSON.parse(JSON.stringify(progress))).sessions.balance[0], session);
  }
  assert.deepEqual(modes, new Set(['missing', 'fewest']));
  const legacy = generateWorkshopTask('balance', 1, 7, 3);
  assert.equal(legacy.mode, undefined); assert.deepEqual(legacy.choices, [1, 2, 3]);
});

test('older version-3 sessions still validate and rebuild their original task', () => {
  for (const kind of WORKSHOP_GAMES) for (const level of [1, 2, 3]) for (const seed of [0, 5, 77]) {
    const session = newWorkshopSession(kind, level, seed); session.taskVersion = 3;
    const task = generateWorkshopTask(kind, level, seed, 3);
    session.moves = { placements: kind === 'sort' ? task.objects.map(() => -1) : [], answers: kind === 'pattern' ? task.holes.map(() => null) : [], rods: [] };
    assert.deepEqual(workshopTaskForSession(session), task);
    const progress = normalizeWorkshop(); progress.sessions[kind][level - 1] = session;
    assert.deepEqual(validateWorkshop(progress).sessions[kind][level - 1], session);
  }
  assert.equal(newWorkshopSession('sort', 1, 1).taskVersion, WORKSHOP_TASK_VERSION);
});
