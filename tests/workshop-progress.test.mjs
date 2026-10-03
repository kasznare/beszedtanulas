import test from 'node:test';
import assert from 'node:assert/strict';
import { snapshotProgress, createProgressBackup, parseProgressBackup, replaceProgress } from '../progress-data.js';
import { switchProgressProfile } from '../progress-profiles.js';
import { newWorkshopSession, normalizeWorkshop } from '../workshop-data.js';

const date = new Date('2026-10-03T08:00:00Z');
function progress() {
  const p = snapshotProgress();
  p.rewards = 7;
  p.workshop.games.sort[2] = { independent: 2, assisted: 3 };
  p.workshop.sessions.sort[2] = newWorkshopSession('sort', 3, 20261003);
  p.workshop.sessions.balance[0] = newWorkshopSession('balance', 1, 42);
  p.workshop.sessions.balance[0].moves.rods = [1, 2];
  return p;
}
test('old backups gain empty workshops, while new backups preserve all levels and unfinished moves', () => {
  const original = progress(), backup = createProgressBackup(original, date);
  assert.deepEqual(parseProgressBackup(JSON.stringify(backup)).progress.workshop, original.workshop);
  delete backup.progress.workshop;
  assert.deepEqual(parseProgressBackup(JSON.stringify(backup)).progress.workshop, normalizeWorkshop());
});
test('workshop import rejects bad counters, unsupported versions and fabricated completions', () => {
  for (const alter of [p => { p.version = 2; }, p => { p.games.sort[2].assisted = -1; }, p => { p.sessions.sort[2].done = true; }, p => { p.sessions.balance[0].moves.rods = [999]; }]) {
    const backup = createProgressBackup(progress(), date); alter(backup.progress.workshop);
    assert.throws(() => parseProgressBackup(JSON.stringify(backup)));
  }
});
test('workshops are isolated by profile and survive export, reset and undo together', () => {
  const kid = { ...progress(), settings: { workshopLevel: 3 }, supabase: { url: 'https://test.invalid', profileCode: 'family-1', activeRole: 'kid', syncPaused: true }, undoProgress: null };
  const admin = switchProgressProfile(kid, { ...kid.supabase, activeRole: 'admin' });
  assert.deepEqual(admin.workshop, normalizeWorkshop());
  const restored = switchProgressProfile(admin, kid.supabase);
  assert.deepEqual(restored.workshop, kid.workshop);
  const reset = replaceProgress(restored, snapshotProgress(), 'reset', date);
  assert.deepEqual(reset.workshop, normalizeWorkshop());
  assert.deepEqual(reset.settings, kid.settings);
  const undone = replaceProgress(reset, reset.undoProgress.progress, 'undo', date);
  assert.deepEqual(undone.workshop, kid.workshop);
  assert.deepEqual(parseProgressBackup(JSON.stringify(createProgressBackup(undone, date))).progress.workshop, kid.workshop);
});
