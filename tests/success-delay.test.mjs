import test from 'node:test';
import assert from 'node:assert/strict';
import { createSuccessDelay } from '../success-delay.js';

function harness({ hidden = false, delayMs } = {}) {
  let time = 0, next = 0;
  const timers = new Map(), listeners = new Set();
  const visibilityTarget = {
    visibilityState: hidden ? 'hidden' : 'visible',
    addEventListener(type, listener) { assert.equal(type, 'visibilitychange'); listeners.add(listener); },
    removeEventListener(type, listener) { assert.equal(type, 'visibilitychange'); listeners.delete(listener); },
  };
  const delay = createSuccessDelay({ delayMs, visibilityTarget, now: () => time,
    setTimer: (callback, ms) => { const id = ++next; timers.set(id, { callback, at: time + ms }); return id; },
    clearTimer: id => timers.delete(id),
  });
  const advance = ms => {
    const end = time + ms;
    while (true) {
      const first = [...timers.entries()].filter(([, timer]) => timer.at <= end).sort((a, b) => a[1].at - b[1].at)[0];
      if (!first) break;
      time = first[1].at;
      timers.delete(first[0]);
      first[1].callback();
    }
    time = end;
  };
  return { delay, advance, timers, listeners,
    visibility(hidden) { visibilityTarget.visibilityState = hidden ? 'hidden' : 'visible'; for (const listener of [...listeners]) listener(); },
    elapseWithoutTimers(ms) { time += ms; },
  };
}

test('saved results remain immediate while the finished game gets a full second before celebration', () => {
  const h = harness();
  const state = { rewards: 0, saves: 0, modal: false, sound: 0, confetti: 0 };
  state.rewards++; state.saves++;
  h.delay.schedule(() => { state.modal = true; state.sound++; state.confetti++; });
  assert.deepEqual(state, { rewards: 1, saves: 1, modal: false, sound: 0, confetti: 0 });
  h.advance(999);
  assert.equal(state.modal, false);
  h.advance(1);
  assert.deepEqual(state, { rewards: 1, saves: 1, modal: true, sound: 1, confetti: 1 });
  h.advance(10_000);
  assert.equal(state.sound, 1);
});

test('hidden time never consumes the remaining visible time across repeated pauses', () => {
  const h = harness();
  let completed = 0;
  h.delay.schedule(() => completed++);
  h.advance(400); h.visibility(true); h.advance(30_000);
  assert.equal(completed, 0);
  assert.equal(h.timers.size, 0);
  h.visibility(false); h.advance(300); h.visibility(true); h.advance(20_000);
  h.visibility(true);
  h.visibility(false); h.visibility(false); h.advance(299);
  assert.equal(completed, 0);
  h.advance(1);
  assert.equal(completed, 1);
  assert.equal(h.timers.size, 0);
});

test('completion while initially hidden waits a full second after visibility returns', () => {
  const h = harness({ hidden: true });
  let completed = 0;
  h.delay.schedule(() => completed++);
  h.advance(50_000);
  assert.equal(h.timers.size, 0);
  h.visibility(false); h.advance(999);
  assert.equal(completed, 0);
  h.advance(1);
  assert.equal(completed, 1);
});

test('exit, restart or another dialog can cancel even an already queued timer callback', () => {
  const h = harness();
  let completed = 0;
  h.delay.schedule(() => completed++);
  const queued = [...h.timers.values()][0].callback;
  h.advance(800); h.delay.cancel();
  queued(); h.advance(20_000); h.visibility(true); h.visibility(false);
  assert.equal(completed, 0);
  assert.equal(h.timers.size, 0);
  h.delay.schedule(() => completed++); h.advance(1_000);
  assert.equal(completed, 1);
});

test('a new completion replaces the old pending round and starts a fresh visible interval', () => {
  const h = harness();
  const completed = [];
  h.delay.schedule(() => completed.push('old'));
  const stale = [...h.timers.values()][0].callback;
  h.advance(800); h.delay.schedule(() => completed.push('new'));
  stale(); h.advance(999);
  assert.deepEqual(completed, []);
  h.advance(1);
  assert.deepEqual(completed, ['new']);
});

test('stale callbacks from a pause cannot fire after resume or replace its clock', () => {
  const h = harness();
  let completed = 0;
  h.delay.schedule(() => completed++);
  const stale = [...h.timers.values()][0].callback;
  h.advance(350); h.visibility(true); h.advance(5_000); h.visibility(false);
  stale(); h.advance(649);
  assert.equal(completed, 0);
  h.advance(1);
  assert.equal(completed, 1);
});

test('early timer delivery preserves the full duration and a callback may schedule the next round', () => {
  const h = harness();
  let completed = 0;
  h.delay.schedule(() => { completed++; h.delay.schedule(() => completed++); });
  const early = [...h.timers.values()][0].callback;
  h.elapseWithoutTimers(250); early();
  assert.equal(completed, 0);
  h.advance(749); assert.equal(completed, 0);
  h.advance(1); assert.equal(completed, 1);
  h.advance(999); assert.equal(completed, 1);
  h.advance(1); assert.equal(completed, 2);
});

test('dispose cancels pending work and detaches visibility listeners permanently', () => {
  const h = harness();
  let completed = 0;
  h.delay.schedule(() => completed++);
  const stale = [...h.timers.values()][0].callback;
  h.delay.dispose(); h.delay.dispose();
  assert.equal(h.listeners.size, 0);
  assert.equal(h.timers.size, 0);
  assert.equal(h.delay.schedule(() => completed++), false);
  stale(); h.visibility(true); h.visibility(false); h.advance(20_000);
  assert.equal(completed, 0);
});
