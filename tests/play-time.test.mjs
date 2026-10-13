import test from 'node:test';
import assert from 'node:assert/strict';
import { createPlayTimeLimit, normalizePlayTime, PLAY_TIME_KEY, PLAY_LIMIT_MS, BREAK_MS, formatPlayTime } from '../play-time.js';

function fixture() {
  let time = 100_000_000;
  const storage = new Map();
  const adapter = { getItem: key => storage.get(key) || null, setItem: (key, value) => storage.set(key, value) };
  const clock = { now: () => time, advance: ms => { time += ms; } };
  const timer = createPlayTimeLimit({ storage: adapter, now: clock.now });
  return { timer, clock, storage, adapter };
}

test('the first game starts 30 minutes; repeated starts never reset it', () => {
  const { timer, clock } = fixture();
  clock.advance(300_000); assert.equal(timer.tick().remainingMs, PLAY_LIMIT_MS);
  timer.start(); clock.advance(10_000); assert.equal(timer.tick().remainingMs, PLAY_LIMIT_MS - 10_000);
  timer.start(); clock.advance(20_000); assert.equal(timer.tick().remainingMs, PLAY_LIMIT_MS - 30_000);
});

test('the countdown never pauses for inactivity, menus, audio pauses or backgrounding', () => {
  const { timer, clock } = fixture();
  timer.start(); clock.advance(300_000); assert.equal(timer.tick().remainingMs, 25 * 60_000);
  clock.advance(300_000); assert.equal(timer.tick().remainingMs, 20 * 60_000);
});

test('30 minutes locks for 15 minutes, then a fresh budget waits for the next game', () => {
  const { timer, clock } = fixture();
  timer.start(); clock.advance(PLAY_LIMIT_MS); assert.equal(timer.tick().locked, true);
  assert.equal(timer.snapshot().breakRemainingMs, BREAK_MS);
  clock.advance(BREAK_MS - 1); assert.equal(timer.tick().locked, true);
  clock.advance(1); const status = timer.tick(); assert.equal(status.locked, false); assert.equal(status.remainingMs, PLAY_LIMIT_MS); assert.equal(status.started, false);
  clock.advance(300_000); assert.equal(timer.tick().remainingMs, PLAY_LIMIT_MS);
  timer.start(); assert.equal(timer.snapshot().started, true);
});

test('closing and reopening consumes time and keeps the original break deadline', () => {
  const { timer, clock, adapter } = fixture();
  timer.start(); clock.advance(10 * 60_000);
  const reopened = createPlayTimeLimit({ storage: adapter, now: clock.now });
  assert.equal(reopened.snapshot().remainingMs, 20 * 60_000);
  clock.advance(22 * 60_000);
  const locked = createPlayTimeLimit({ storage: adapter, now: clock.now });
  assert.equal(locked.snapshot().locked, true); assert.equal(locked.snapshot().breakRemainingMs, 13 * 60_000);
  clock.advance(13 * 60_000);
  const later = createPlayTimeLimit({ storage: adapter, now: clock.now });
  assert.equal(later.snapshot().remainingMs, PLAY_LIMIT_MS); assert.equal(later.snapshot().locked, false);
});

test('parent renewal clears the break and stale tabs adopt the renewed cycle', () => {
  const { timer, clock, adapter } = fixture();
  const other = createPlayTimeLimit({ storage: adapter, now: clock.now });
  timer.start(); other.tick(); clock.advance(PLAY_LIMIT_MS); assert.equal(other.tick().locked, true);
  timer.renew(); assert.equal(other.tick().locked, false); assert.equal(other.snapshot().remainingMs, PLAY_LIMIT_MS);
  other.start(); clock.advance(500); assert.equal(timer.tick().remainingMs, PLAY_LIMIT_MS - 500);
});

test('simultaneous tabs share one deadline without restarting or double charging', () => {
  const { timer, clock, adapter } = fixture();
  const other = createPlayTimeLimit({ storage: adapter, now: clock.now });
  timer.start(); clock.advance(20_000); other.start();
  assert.equal(other.snapshot().remainingMs, PLAY_LIMIT_MS - 20_000);
  clock.advance(15_000); assert.equal(timer.tick().remainingMs, PLAY_LIMIT_MS - 35_000);
});

test('progress imports and reset do not affect the separate timer record', () => {
  const { timer, clock, storage } = fixture();
  timer.start(); clock.advance(5000); storage.set('speech_game_progress_v1', '{}');
  assert.equal(timer.tick().remainingMs, PLAY_LIMIT_MS - 5000); assert.ok(storage.get(PLAY_TIME_KEY));
});

test('a storage failure retains the in-memory deadline and reports the error', () => {
  let time = 10000;
  const timer = createPlayTimeLimit({ storage: { getItem() { throw Error(); }, setItem() { throw Error(); } }, now: () => time });
  timer.start(); time += 5000;
  assert.equal(timer.tick().remainingMs, PLAY_LIMIT_MS - 5000); assert.equal(timer.snapshot().storageError, true);
  time += PLAY_LIMIT_MS; assert.equal(timer.tick().locked, true);
  time += BREAK_MS; assert.equal(timer.tick().remainingMs, PLAY_LIMIT_MS);
});

test('a failed write cannot replace an in-memory start with an older saved state', () => {
  const { timer, clock, adapter } = fixture();
  adapter.setItem = () => { throw Error(); };
  timer.start(); clock.advance(10_000); assert.equal(timer.tick().remainingMs, PLAY_LIMIT_MS - 10_000);
});

test('invalid stored records recover and countdown rounds up', () => {
  assert.equal(normalizePlayTime({ version: 99 }, 5000).startedAt, null);
  assert.equal(normalizePlayTime({ version: 1, cycle: 'bad', startedAt: '0' }, 5000).startedAt, null);
  assert.equal(formatPlayTime(1001), '0:02'); assert.equal(formatPlayTime(BREAK_MS), '15:00');
});
