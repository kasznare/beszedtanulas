import test from 'node:test';
import assert from 'node:assert/strict';
import { POUR_LEVELS, JUG_CAPACITY, JUG_INTERIOR, polygonArea, jugLiquid, jugPourAngle, refillPour, newPourRound, advancePour, settlePour, pourFeedback, screenTilt, relativeTilt, tiltPourInput } from '../pour-data.js';

test('every level can pass the mark and physically overflow without automatic stopping', () => {
  for (const level of POUR_LEVELS) {
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
  const round = newPourRound(); round.fills[0] = .72;
  const ready = settlePour(round, 0), next = advancePour(ready, 0, 1, .08);
  assert.equal(ready.done[0], true);
  assert.equal(next.done[0], false);
  assert.ok(next.fills[0] > ready.fills[0]);
});

test('beginner pouring is slower and accepts a wider stopping band', () => {
  assert.ok(advancePour(newPourRound(1), 0, 1, .08).fills[0] < advancePour(newPourRound(2), 0, 1, .08).fills[0]);
  for (const level of [1, 2]) {
    const round = newPourRound(level); round.fills[0] = .63;
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
  const round = newPourRound(2);
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
  assert.ok(round.targets[0] < round.targets[1]);
  assert.deepEqual(advancePour(round, 0, 1, 20), advancePour(round, 0, 1, .08));
  assert.equal(advancePour(round, 0, NaN, 1), round);
  assert.equal(advancePour(round, 0, 1, Infinity), round);
  assert.equal(advancePour(round, 4, 1, .08), round);
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
