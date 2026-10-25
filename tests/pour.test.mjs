import test from 'node:test';
import assert from 'node:assert/strict';
import { POUR_LEVELS, JUG_CAPACITY, JUG_INTERIOR, polygonArea, jugLiquid, jugPourAngle, refillPour, newPourRound, advancePour, settlePour, correctPour, pourFeedback, screenTilt, relativeTilt, tiltPourInput } from '../pour-data.js';

test('every level can pass the mark and physically overflow without automatic stopping', () => {
  for (const level of POUR_LEVELS.filter(item => !item.exact)) {
    let round = newPourRound(level.id);
    for (let i = 0; i < 120; i++) round = advancePour(round, 0, 1, .08);
    assert.equal(round.fills[0], 1);
    assert.ok(round.spills[0] > 0);
    assert.deepEqual(round.done, [false, false]);
    assert.equal(round.fills[1], 0);
    assert.ok(Math.abs(round.remaining + round.fills[0] + round.spills[0] - JUG_CAPACITY) < 1e-10);
  }
});

test('water is conserved through a nearly full cup, overflow, and an empty jug', () => {
  let round = newPourRound(2);
  round.fills[0] = .995; round.remaining = .009;
  round = advancePour(round, 0, 1, .08);
  assert.equal(round.fills[0], 1);
  assert.ok(Math.abs(round.spills[0] - .004) < 1e-12);
  assert.equal(round.remaining, 0);
  assert.equal(advancePour(round, 0, 1, .08), round);
  const refilled = refillPour(round);
  assert.equal(refilled.remaining, JUG_CAPACITY);
  assert.deepEqual(refilled.fills, round.fills);
  assert.deepEqual(refilled.spills, round.spills);
});

test('a finished glass remains pourable and loses its ready state when filling resumes', () => {
  const round = newPourRound(); round.targets = [.72, .72]; round.fills[0] = .72;
  const ready = settlePour(round, 0), next = advancePour(ready, 0, 1, .08);
  assert.equal(ready.done[0], true);
  assert.equal(next.done[0], false);
  assert.ok(next.fills[0] > ready.fills[0]);
});

test('beginner pouring is slower and accepts a wider stopping band', () => {
  assert.ok(advancePour(newPourRound(1), 0, 1, .08).fills[0] < advancePour(newPourRound(2), 0, 1, .08).fills[0]);
  for (const level of [1, 2]) {
    const round = newPourRound(level); round.targets = [.72, .72]; round.fills[0] = .63;
    assert.equal(pourFeedback(round, 0), level === 1 ? 'ready' : 'more');
  }
});

test('rotating the jug preserves liquid volume and a horizontal surface', () => {
  for (const fraction of [.01, .3, .7, 1]) for (const degrees of [0, 20, 60, 100]) {
    const liquid = jugLiquid(fraction, degrees), radians = degrees * Math.PI / 180;
    assert.ok(Math.abs(polygonArea(liquid.points) - polygonArea(JUG_INTERIOR) * .88 * fraction) < .0001);
    const heights = liquid.surface.map(([x, y]) => x * Math.sin(radians) + y * Math.cos(radians));
    assert.ok(heights.length >= 2);
    assert.ok(Math.max(...heights) - Math.min(...heights) < 1e-10);
  }
  assert.ok(jugPourAngle(.1) > jugPourAngle(.8));
});

test('manual pouring is accepted on release, while excess remains retryable', () => {
  const round = newPourRound(2); round.targets = [.55, .72];
  round.fills[0] = round.targets[0] - .04;
  assert.equal(pourFeedback(round, 0), 'ready');
  const accepted = settlePour(round, 0);
  assert.equal(accepted.done[0], true);
  assert.equal(round.done[0], false);
  round.fills[1] = .9;
  assert.equal(pourFeedback(round, 1), 'over');
  assert.equal(settlePour(round, 1).done[1], false);
});

test('advanced glasses have different amounts and a long frame cannot dump water', () => {
  const round = newPourRound(3);
  assert.ok(Math.abs(round.targets[0] - round.targets[1]) >= .25 - 1e-9);
  assert.deepEqual(advancePour(round, 0, 1, 20), advancePour(round, 0, 1, .08));
  assert.equal(advancePour(round, 0, NaN, 1), round);
  assert.equal(advancePour(round, 0, 1, Infinity), round);
  assert.equal(advancePour(round, 4, 1, .08), round);
});
test('advanced targets vary and small pour-back conserves water', () => {
  const round = newPourRound(3); round.fills[0] = round.targets[0] + .1; round.remaining -= round.fills[0];
  assert.equal(pourFeedback(round, 0), 'over');
  const corrected = correctPour(round, 0);
  assert.ok(corrected.fills[0] > 0 && corrected.fills[0] < round.fills[0]);
  assert.ok(Math.abs(corrected.remaining + corrected.fills[0] - round.remaining - round.fills[0]) < 1e-10);
  assert.equal(pourFeedback(corrected, 0), 'ready');
  assert.equal(correctPour(corrected, 5), corrected);
});
test('advanced rounds alternate which friend needs more and excess can be corrected gradually', () => {
  const round = newPourRound(3); round.fills[0] = round.targets[0] + .1;
  assert.equal(pourFeedback(round, 0), 'over');
  const corrected = correctPour(round, 0);
  assert.ok(corrected.fills[0] > 0 && corrected.fills[0] < round.fills[0]);
  assert.equal(round.fills[0], round.targets[0] + .1);
  assert.equal(pourFeedback(corrected, 0), 'ready');
  assert.equal(correctPour(corrected, 5), corrected);
});

test('device axes are remapped for both landscape orientations and null readings are rejected', () => {
  assert.equal(screenTilt(20, -12, 0), -12);
  assert.equal(screenTilt(20, -12, 90), 20);
  assert.equal(screenTilt(20, -12, 180), 12);
  assert.equal(screenTilt(20, -12, -90), -20);
  assert.equal(screenTilt(null, 20), null);
  assert.equal(relativeTilt(-178, 178), 4);
});

test('small movements do not pour and tilt strength is bounded', () => {
  assert.deepEqual(tiltPourInput(7), { cup: null, strength: 0 });
  assert.deepEqual(tiltPourInput(NaN), { cup: null, strength: 0 });
  assert.equal(tiltPourInput(-12).cup, 0);
  assert.equal(tiltPourInput(12).cup, 1);
  assert.equal(tiltPourInput(100).strength, 1);
});

import { pourTargets, POUR_HEIGHTS, emptyCup, pourStillPossible, pourStars, nextPourLevel, POUR_EXACT_MARGIN } from '../pour-data.js';
import { readFileSync } from 'node:fs';
const seeded = (seed = 1) => () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };

test('marks change every round: one shared height, two different heights, or a clearly larger portion', () => {
  const random = seeded(5);
  for (const level of [1, 2, 3, 4]) {
    let previous = null; const seen = new Set();
    for (let run = 0; run < 60; run += 1) {
      const targets = pourTargets(level, random, previous);
      assert.notDeepEqual(targets, previous);
      if (level === 1) { assert.equal(targets[0], targets[1]); assert.ok(POUR_HEIGHTS.includes(targets[0])); }
      else if (level === 3) assert.ok(Math.abs(targets[0] - targets[1]) >= .25 - 1e-9);
      else { assert.notEqual(targets[0], targets[1]); assert.ok(targets.every(height => POUR_HEIGHTS.includes(height))); }
      for (const height of targets) assert.ok(height + POUR_LEVELS[level - 1].tolerance <= 1, 'the band stays inside the glass');
      seen.add(targets.join()); previous = targets;
    }
    assert.ok(seen.size >= 3, `level ${level} varies`);
  }
  const advanced = Array.from({ length: 40 }, () => pourTargets(3, random));
  assert.ok(advanced.some(([bear, rabbit]) => bear < rabbit) && advanced.some(([bear, rabbit]) => bear > rabbit), 'either friend may want more');
});

test('Pont elég víz: the jug holds just enough, cannot be refilled, and emptying pours back into it', () => {
  const round = newPourRound(4, { random: seeded(2) });
  assert.ok(Math.abs(round.remaining - (round.targets[0] + round.targets[1] + POUR_EXACT_MARGIN)) < 1e-12);
  assert.equal(refillPour(round), round);
  let poured = advancePour(round, 0, 1, .08);
  const back = emptyCup(poured, 0);
  assert.equal(back.fills[0], 0);
  assert.ok(Math.abs(back.remaining - round.remaining) < 1e-12);
  assert.ok(pourStillPossible(round));
  const wasted = { ...round, remaining: .1 };
  assert.equal(pourStillPossible(wasted), false);
  // Other levels still throw the water away and keep the refill button.
  const normal = newPourRound(1); normal.fills[0] = .5;
  assert.equal(emptyCup(normal, 0).remaining, normal.remaining);
  assert.equal(refillPour({ ...normal, remaining: 0 }).remaining, JUG_CAPACITY);
});

test('stars and the level ladder follow how cleanly the friends were served', () => {
  assert.equal(pourStars({}), 5);
  assert.equal(pourStars({ overs: 1 }), 4);
  assert.equal(pourStars({ spilled: true }), 3);
  assert.equal(pourStars({ spilled: true, overs: 2, refills: 1 }), 1);
  let ladder = nextPourLevel(1, 0, true);
  assert.deepEqual(ladder, { level: 1, streak: 1, raised: false });
  ladder = nextPourLevel(1, ladder.streak, true);
  assert.deepEqual(ladder, { level: 2, streak: 0, raised: true });
  assert.deepEqual(nextPourLevel(2, 1, false), { level: 2, streak: 0, raised: false });
  assert.equal(nextPourLevel(4, 5, true).level, 4);
});

test('pour speech: the last glass is not cut off, the reminder is not repeated and the ending respects spoken guidance', () => {
  const game = readFileSync(new URL('../pour-game.js', import.meta.url), 'utf8');
  const app = readFileSync(new URL('../app.js', import.meta.url), 'utf8');
  assert.doesNotMatch(game, /if \(round\.done\.every\(Boolean\)\) say\('pour_done'\)/);
  assert.match(game, /moreSaid\[cup\]/);
  assert.doesNotMatch(app, /if \(kind === "pour"\) speakVoice\('pour_done'\)/);
  assert.match(app, /kind === "pour"\) \{ if \(state\.settings\.spokenGuidance\)/);
});
