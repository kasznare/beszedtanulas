import test from 'node:test';
import assert from 'node:assert/strict';
import { WORKSHOP_GAMES, WORKSHOP_COLORS, generateWorkshopTask, newWorkshopSession, workshopSortTarget, workshopSolved, workshopBalanceSolutions, workshopHint, normalizeWorkshop, validateWorkshop, completeWorkshop, rememberWorkshop, undoWorkshop } from '../workshop-data.js';
import { WORKSHOP_CLIPS } from '../workshop-voice.js';

function solve(task, session) {
  if (task.kind === 'sort') session.moves.placements = task.objects.map(object => workshopSortTarget(task, object));
  if (task.kind === 'pattern') session.moves.answers = task.holes.map(index => task.sequence[index]);
  if (task.kind === 'balance') session.moves.rods = workshopBalanceSolutions(task)[0];
}
function applyHint(session, hint) {
  if (hint.action === 'place') session.moves.placements[hint.index] = hint.target;
  else if (hint.action === 'answer') session.moves.answers[hint.index] = hint.target;
  else if (hint.action === 'remove') session.moves.rods.splice(hint.index, 1);
  else if (hint.action === 'add') session.moves.rods.push(hint.value);
}

test('every game and level regenerates the exact saved task without storing generated answers', () => {
  for (const kind of WORKSHOP_GAMES) for (const level of [1, 2, 3]) for (let seed = 0; seed < 160; seed++) {
    const task = generateWorkshopTask(kind, level, seed), session = newWorkshopSession(kind, level, seed);
    assert.deepEqual(generateWorkshopTask(kind, session.level, session.seed), task);
    assert.equal(workshopSolved(task, session), false);
    solve(task, session); assert.ok(workshopSolved(task, session));
    const progress = normalizeWorkshop(); progress.sessions[kind][level - 1] = session;
    assert.deepEqual(validateWorkshop(JSON.parse(JSON.stringify(progress))), progress);
    assert.deepEqual(generateWorkshopTask(kind, level, validateWorkshop(progress).sessions[kind][level - 1].seed), task);
  }
});

test('sorting starts with diverse objects and every illustrated tray has an unambiguous destination', () => {
  for (const level of [1, 2, 3]) for (let seed = 0; seed < 200; seed++) {
    const task = generateWorkshopTask('sort', level, seed);
    assert.equal(task.objects.length, [6, 8, 12][level - 1]); assert.equal(task.bins.length, [2, 4, 5][level - 1]);
    const bins = task.objects.map(object => workshopSortTarget(task, object));
    assert.ok(bins.every(bin => bin >= 0 && bin < task.bins.length)); assert.equal(new Set(bins).size, task.bins.length);
    if (level === 1) assert.ok(task.bins.every(bin => bin.shape === undefined));
    if (level > 1) assert.equal(new Set(task.bins.filter(bin => !bin.other).map(bin => `${bin.color}:${bin.shape}`)).size, 4);
    if (level === 3) assert.equal(bins.filter(bin => bin === 4).length, 4);
  }
  assert.equal(new Set(Object.values(WORKSHOP_COLORS).map(color => color.mark)).size, 4, 'color identity is also encoded by a symbol');
});

test('patterns preserve the repeated unit, expose a full prefix and grow to simultaneous rules', () => {
  const secondLevelMotifs = new Set();
  for (const level of [1, 2, 3]) for (let seed = 0; seed < 160; seed++) {
    const task = generateWorkshopTask('pattern', level, seed);
    assert.equal(task.holes.length, [2, 3, 4][level - 1]); assert.equal(task.palette.length, level === 3 ? 6 : level === 1 ? 2 : task.palette.length);
    assert.ok(task.sequence.every((value, index) => value === task.motif[index % task.motif.length]));
    assert.ok(task.holes.every(index => index >= (level === 3 ? 3 : task.motif.length)));
    assert.equal(new Set(task.holes).size, task.holes.length);
    if (level === 2) secondLevelMotifs.add(task.motif.map(index => task.palette[index].color + ':' + task.palette[index].shape).join(','));
    if (level === 3) for (let i = 0; i < task.sequence.length - 3; i++) {
      assert.equal(task.palette[task.sequence[i]].color, task.palette[task.sequence[i + 2]].color);
      assert.equal(task.palette[task.sequence[i]].shape, task.palette[task.sequence[i + 3]].shape);
    }
    const session = newWorkshopSession('pattern', level, seed); solve(task, session);
    session.moves.answers[0] = (session.moves.answers[0] + 1) % task.palette.length; assert.equal(workshopSolved(task, session), false);
  }
  assert.ok(secondLevelMotifs.size > 12);
});

test('balance tasks accept every valid composition and enforce exact count, distinct lengths and finite stock', () => {
  for (const level of [1, 2, 3]) for (let seed = 0; seed < 160; seed++) {
    const task = generateWorkshopTask('balance', level, seed), solutions = workshopBalanceSolutions(task);
    assert.ok(solutions.length);
    for (const rods of solutions) {
      assert.equal(rods.reduce((sum, n) => sum + n, 0), task.target);
      if (level > 1) { assert.equal(rods.length, level); assert.equal(new Set(rods).size, level); }
      const session = newWorkshopSession('balance', level, seed); session.moves.rods = [...rods].reverse(); assert.ok(workshopSolved(task, session));
    }
    const session = newWorkshopSession('balance', level, seed);
    session.moves.rods = Array(task.target).fill(1); assert.equal(workshopSolved(task, session), level === 1);
    session.moves.rods = [100]; assert.equal(workshopSolved(task, session), false);
  }
  const task = generateWorkshopTask('balance', 2, 0), session = newWorkshopSession('balance', 2, 0);
  const repeated = [3, 3]; task.target = 6; session.moves.rods = repeated; assert.equal(workshopSolved(task, session), false);
  task.target = 6; session.moves.rods = [1, 2, 3]; assert.equal(workshopSolved(task, session), false);
});

test('progressive correction reaches a solution from empty, incorrect or overweight legal configurations', () => {
  for (const kind of WORKSHOP_GAMES) for (const level of [1, 2, 3]) for (let seed = 0; seed < 120; seed++) {
    const task = generateWorkshopTask(kind, level, seed), session = newWorkshopSession(kind, level, seed);
    if (kind === 'sort') session.moves.placements.fill(task.bins.length - 1);
    if (kind === 'pattern') session.moves.answers.fill(0);
    if (kind === 'balance') session.moves.rods = level === 3 ? [3, 4, 5, 6] : level === 2 ? [4, 4, 5, 5] : [3, 3, 3, 3, 3, 3];
    for (let step = 0; step < 24 && !workshopSolved(task, session); step++) {
      const hint = workshopHint(task, session); assert.notEqual(hint.action, 'ready'); applyHint(session, hint);
      const progress = normalizeWorkshop(); progress.sessions[kind][level - 1] = session; assert.deepEqual(validateWorkshop(progress).sessions[kind][level - 1], session);
    }
    assert.ok(workshopSolved(task, session), `${kind}, level ${level}, seed ${seed}`);
    assert.deepEqual(workshopHint(task, session), { action: 'ready' });
  }
});

test('completion rewards once and keeps every game and level in its own counter and resume slot', () => {
  let progress = normalizeWorkshop();
  for (const kind of WORKSHOP_GAMES) for (const level of [1, 2, 3]) {
    const session = newWorkshopSession(kind, level, 45), task = generateWorkshopTask(kind, level, 45); progress.sessions[kind][level - 1] = session;
    assert.equal(completeWorkshop(progress, kind, level).reward, false); solve(task, session);
    if (level === 2) session.help = 1; if (level === 3) session.misses = 1;
    const completed = completeWorkshop(progress, kind, level); assert.equal(completed.reward, true); progress = completed.progress;
    assert.equal(progress.games[kind][level - 1][level === 1 ? 'independent' : 'assisted'], 1);
    assert.equal(completeWorkshop(progress, kind, level).reward, false); assert.equal(completeWorkshop(progress, kind, level).changed, false);
    assert.ok(progress.sessions[kind][level - 1].done); assert.deepEqual(validateWorkshop(progress), progress);
  }
  for (const kind of WORKSHOP_GAMES) assert.deepEqual(progress.games[kind], [{ independent: 1, assisted: 0 }, { independent: 0, assisted: 1 }, { independent: 0, assisted: 1 }]);
});

test('undo restores reversible object moves while assistance persists, and completed sessions cannot undo', () => {
  for (const kind of WORKSHOP_GAMES) {
    const session = newWorkshopSession(kind, 3, 65), task = generateWorkshopTask(kind, 3, 65), initial = structuredClone(session.moves);
    session.help = 2; rememberWorkshop(session); applyHint(session, workshopHint(task, session)); assert.notDeepEqual(session.moves, initial);
    const progress = normalizeWorkshop(); progress.sessions[kind][2] = session; const restored = validateWorkshop(JSON.parse(JSON.stringify(progress))).sessions[kind][2];
    assert.ok(undoWorkshop(restored)); assert.deepEqual(restored.moves, initial); assert.equal(restored.help, 2); assert.equal(undoWorkshop(restored), false);
    for (let i = 0; i < 70; i++) rememberWorkshop(restored); assert.equal(restored.history.length, 60);
    solve(task, restored); restored.done = true; assert.equal(undoWorkshop(restored), false);
  }
});

test('missing legacy data gets defaults, malformed imports and fabricated unsolved completion are rejected', () => {
  assert.deepEqual(validateWorkshop(undefined), normalizeWorkshop()); assert.deepEqual(normalizeWorkshop(null), normalizeWorkshop());
  const progress = normalizeWorkshop(); progress.sessions.sort[2] = newWorkshopSession('sort', 3, 3);
  const corruptions = [
    value => value.version = 2,
    value => value.games.sort[0].assisted = -1,
    value => value.games.pattern[1].independent = 1.5,
    value => value.games.balance[2].assisted = Infinity,
    value => value.games.sort[0].independent = Number.MAX_SAFE_INTEGER + 1,
    value => value.sessions.sort[2].seed = -1,
    value => value.sessions.sort[2].seed = 0x100000000,
    value => value.sessions.sort[2].done = true,
    value => value.sessions.sort[2].moves.placements[0] = 5,
    value => value.sessions.sort[2].moves.placements.pop(),
    value => value.sessions.sort[2].level = 1,
    value => value.sessions.sort[2].history = [{}],
    value => value.sessions.sort[2].help = 4,
    value => value.sessions.sort[2].misses = 10000,
    value => value.sessions.sort[2].moves.rods = [1],
    value => value.sessions.sort.pop(),
    value => value.sessions.pattern = {},
    value => delete value.games.balance[0].independent,
  ];
  for (const mutate of corruptions) { const corrupted = structuredClone(progress); mutate(corrupted); assert.throws(() => validateWorkshop(corrupted), /Műhelyliget/); }
  for (const value of [null, [], {}, true, 'bad']) assert.throws(() => validateWorkshop(value), /Műhelyliget/);
  const normalized = normalizeWorkshop({ games: { sort: [{ independent: -2, assisted: Infinity }] }, sessions: { sort: [{ done: true }] } });
  assert.deepEqual(normalized, normalizeWorkshop());
});

test('safe counters saturate without turning a valid save into an invalid one', () => {
  const progress = normalizeWorkshop(), session = newWorkshopSession('balance', 3, 123), task = generateWorkshopTask('balance', 3, 123);
  solve(task, session); progress.sessions.balance[2] = session; progress.games.balance[2].independent = Number.MAX_SAFE_INTEGER;
  const done = completeWorkshop(progress, 'balance', 3); assert.equal(done.reward, true); assert.equal(done.progress.games.balance[2].independent, Number.MAX_SAFE_INTEGER); assert.deepEqual(validateWorkshop(done.progress), done.progress);
});

test('Hungarian voice ids cover every difficulty and helpful feedback without question prompts', () => {
  for (const kind of WORKSHOP_GAMES) for (const level of [1, 2, 3]) { assert.ok(WORKSHOP_CLIPS[`workshop_${kind}_${level}`]); assert.ok(WORKSHOP_CLIPS[`workshop_${kind}_hint${level}`]); }
  for (const kind of WORKSHOP_GAMES) { assert.ok(WORKSHOP_CLIPS[`workshop_${kind}_retry`]); assert.ok(WORKSHOP_CLIPS[`workshop_${kind}_done`]); }
  for (let n = 0; n <= 15; n++) assert.ok(WORKSHOP_CLIPS[`workshop_n_${n}`]);
  for (const text of Object.values(WORKSHOP_CLIPS)) assert.doesNotMatch(text, /\?|építsd|időzítő|tanúsítvány/i);
});
