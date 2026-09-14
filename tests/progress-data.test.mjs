import test from 'node:test';
import assert from 'node:assert/strict';
import { snapshotProgress, createProgressBackup, parseProgressBackup, replaceProgress, normalizeUndo, MAX_BACKUP_BYTES } from '../progress-data.js';

const date = new Date('2026-09-07T22:00:00.000Z');
function state() {
  const progress = snapshotProgress();
  progress.plays=12; progress.attempts=6; progress.rewards=4;
  progress.wordStats.viz={attempts:4,successes:3,streak:2,lastSeenAt:date.toISOString()};
  return {...progress,settings:{roundLength:3,wordVoice:'family'},detection:{mode:'strictish'},supabase:{publishableKey:'PRIVATE_TEST_MARKER',profileCode:'PERSONAL_PROFILE',syncPaused:false},undoProgress:null};
}
test('export/import round trip preserves results and omits settings and connection data',()=>{
  const original=state();
  const serialized=JSON.stringify(createProgressBackup(original,date));
  assert.ok(!serialized.includes('PRIVATE_TEST_MARKER'));
  assert.ok(!serialized.includes('PERSONAL_PROFILE'));
  assert.ok(!serialized.includes('settings'));
  assert.deepEqual(parseProgressBackup(serialized).progress,snapshotProgress(original));
});
test('unrelated imported fields cannot change settings or connection information',()=>{
  const backup=createProgressBackup(state(),date);
  backup.supabase={publishableKey:'injected'};
  backup.progress.settings={roundLength:10};
  backup.progress.wordStats.viz.extra='injected';
  const restored=parseProgressBackup(JSON.stringify(backup));
  assert.equal(restored.progress.settings,undefined);
  assert.equal(restored.supabase,undefined);
  assert.equal(restored.progress.wordStats.viz.extra,undefined);
});
test('missing newer words start at zero, but unknown words require an app update',()=>{
  const backup=createProgressBackup(state(),date);
  delete backup.progress.wordStats.alma;
  assert.equal(parseProgressBackup(JSON.stringify(backup)).progress.wordStats.alma.attempts,0);
  backup.progress.wordStats.unknown={attempts:0,successes:0,streak:0,lastSeenAt:''};
  assert.throws(()=>parseProgressBackup(JSON.stringify(backup)),/szóanyag/);
});
test('negative, fractional, unsafe and inconsistent results are rejected',()=>{
  for(const value of [-1,.5,Number.MAX_SAFE_INTEGER+1,'12',null]){
    const backup=createProgressBackup(state(),date);backup.progress.attempts=value;
    assert.throws(()=>parseProgressBackup(JSON.stringify(backup)));
  }
  for(const changed of [{successes:5},{streak:5},{lastSeenAt:'not-a-date'}]){
    const backup=createProgressBackup(state(),date);Object.assign(backup.progress.wordStats.viz,changed);
    assert.throws(()=>parseProgressBackup(JSON.stringify(backup)),/szóeredmény/);
  }
});
test('malformed, oversized and unsupported backups are rejected',()=>{
  for(const data of ['', '{broken', '[]', JSON.stringify({version:2}), ' '.repeat(MAX_BACKUP_BYTES+1), 'á'.repeat(MAX_BACKUP_BYTES)]){
    assert.throws(()=>parseProgressBackup(data));
  }
  const backup=createProgressBackup(state(),date);backup.version=2;
  assert.throws(()=>parseProgressBackup(JSON.stringify(backup)),/támogatott/);
});
test('reset preserves settings and creates a single undo snapshot without mutating the source',()=>{
  const original=state(),before=structuredClone(original);
  const reset=replaceProgress(original,snapshotProgress(),'reset',date);
  assert.deepEqual(original,before);
  assert.equal(reset.plays,0);
  assert.equal(reset.wordStats.viz.attempts,0);
  assert.deepEqual(reset.settings,original.settings);
  assert.deepEqual(reset.detection,original.detection);
  assert.equal(reset.supabase.publishableKey,original.supabase.publishableKey);
  assert.equal(reset.supabase.syncPaused,true);
  assert.deepEqual(reset.undoProgress.progress,snapshotProgress(original));
  assert.equal(reset.undoProgress.progress.supabase,undefined);
});
test('restore replaces rather than adds counters, and undo restores exactly once',()=>{
  const original=state(),replacement=snapshotProgress();replacement.plays=7;
  const restored=replaceProgress(original,replacement,'restore',date);
  assert.equal(restored.plays,7);
  const undo=replaceProgress(restored,restored.undoProgress.progress,'undo',date);
  assert.deepEqual(snapshotProgress(undo),snapshotProgress(original));
  assert.equal(undo.undoProgress,null);
  assert.equal(undo.supabase.syncPaused,true);
});
test('invalid old undo data is ignored while valid undo data survives reload',()=>{
  assert.equal(normalizeUndo({kind:'reset',createdAt:'bad',progress:{}}),null);
  const changed=replaceProgress(state(),snapshotProgress(),'reset',date);
  assert.deepEqual(normalizeUndo(JSON.parse(JSON.stringify(changed.undoProgress))),changed.undoProgress);
});
