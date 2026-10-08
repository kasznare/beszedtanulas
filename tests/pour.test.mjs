import test from 'node:test';
import assert from 'node:assert/strict';
import { newPourRound, advancePour, settlePour, pourFeedback, screenTilt, relativeTilt, tiltPourInput } from '../pour-data.js';

test('automatic pouring stops at the target and leaves the other glass untouched', () => {
  let round = newPourRound();
  for (let i = 0; i < 100; i++) round = advancePour(round, 0, 1, .08);
  assert.equal(round.fills[0], round.targets[0]);
  assert.deepEqual(round.done, [true, false]);
  assert.equal(round.fills[1], 0);
  assert.equal(advancePour(round, 0, 1, .08), round);
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
