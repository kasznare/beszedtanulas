import test from 'node:test';
import assert from 'node:assert/strict';
import { snapshotProgress, replaceProgress, createProgressBackup } from '../progress-data.js';
import { profileKey, checkpointProfiles, normalizeProfileStore, switchProgressProfile, mergeWordProgress, isSharedProfileCode } from '../progress-profiles.js';

const config = (role='kid', url='https://example.invalid') => ({url,activeRole:role,profileCode:`qa-${role}`,syncPaused:false});
function initial() {
  return {...snapshotProgress({plays:12,attempts:7,rewards:5,wordStats:{viz:{attempts:7,successes:5,streak:2,lastSeenAt:'2026-09-07T10:00:00.000Z'}}}),supabase:config(),settings:{roundLength:3},undoProgress:null};
}
test('legacy progress binds once and never copies into the other role',()=>{
  const legacy=initial(),original=JSON.stringify(legacy);
  const kid=switchProgressProfile(legacy,config());
  const admin=switchProgressProfile(kid,config('admin'));
  assert.equal(kid.plays,12);assert.equal(admin.plays,0);assert.equal(admin.wordStats.viz.attempts,0);
  assert.equal(admin.supabase.syncPaused,true);assert.deepEqual(admin.settings,legacy.settings);
  assert.equal(switchProgressProfile(admin,config()).wordStats.viz.attempts,7);
  assert.equal(JSON.stringify(legacy),original);
});
test('profile results, pause and undo survive alternating roles and reload',()=>{
  let kid=switchProgressProfile(initial(),config());
  kid=replaceProgress(kid,snapshotProgress(),'reset');kid.profileStore=checkpointProfiles(kid);
  let admin=switchProgressProfile(kid,config('admin'));admin.plays=33;admin.profileStore=checkpointProfiles(admin);
  admin={...JSON.parse(JSON.stringify(admin)),profileStore:normalizeProfileStore(admin.profileStore)};
  kid=switchProgressProfile(admin,config());
  assert.equal(kid.plays,0);assert.equal(kid.undoProgress.progress.plays,12);assert.equal(kid.supabase.syncPaused,true);
  assert.equal(switchProgressProfile(kid,config('admin')).plays,33);
});
test('connection identity separates projects and keeps the previous results retrievable',()=>{
  const first=switchProgressProfile(initial(),config());
  const second=switchProgressProfile(first,config('kid','https://another.invalid'));
  assert.equal(second.attempts,0);assert.equal(switchProgressProfile(second,config()).attempts,7);
  assert.equal(profileKey(config()),profileKey(config('kid','https://example.invalid/')));
});
test('old saves with no connection keep their results on first configuration',()=>{
  const legacy=initial();legacy.supabase={activeRole:'kid'};
  assert.equal(switchProgressProfile(legacy,config()).plays,12);
});
test('active-profile export excludes other profiles, their counters and connection details',()=>{
  let state=switchProgressProfile(initial(),config());state=switchProgressProfile(state,config('admin'));state.plays=99;state.profileStore=checkpointProfiles(state);
  const output=createProgressBackup(switchProgressProfile(state,config()));
  assert.equal(output.progress.plays,12);assert.equal(output.profileStore,undefined);assert.ok(!JSON.stringify(output).includes('example.invalid'));
});
test('conservative merge never reduces counters or adds a repeated download twice',()=>{
  const local=initial().wordStats;
  const rows=[{word_id:'viz',attempts:3,successes:1,streak:0,last_seen_at:'2026-09-06T00:00:00Z'}];
  assert.deepEqual(mergeWordProgress(local,rows).viz,local.viz);
  rows[0]={word_id:'viz',attempts:9,successes:8,streak:4,last_seen_at:'2026-09-08T00:00:00Z'};
  const merged=mergeWordProgress(local,rows);
  assert.equal(merged.viz.attempts,9);assert.equal(merged.viz.successes,8);assert.equal(merged.viz.streak,4);
  assert.deepEqual(mergeWordProgress(merged,rows),merged);assert.equal(local.viz.attempts,7);
});
test('malformed remote counters and unknown words cannot corrupt progress',()=>{
  const local=initial().wordStats;
  for(const row of [{word_id:'viz',attempts:-1,successes:0,streak:0},{word_id:'viz',attempts:2,successes:3,streak:0},{word_id:'unknown',attempts:2,successes:1,streak:0}])assert.deepEqual(mergeWordProgress(local,[row]),local);
});
test('newer failure may reset streak while all known successes and attempts remain',()=>{
  const value=mergeWordProgress(initial().wordStats,[{word_id:'viz',attempts:8,successes:3,streak:0,last_seen_at:'2026-09-08T00:00:00Z'}]);
  assert.equal(value.viz.attempts,8);assert.equal(value.viz.successes,5);assert.equal(value.viz.streak,0);
});
test('shared sample codes are recognized explicitly',()=>{
  assert.equal(isSharedProfileCode(' Kid '),true);assert.equal(isSharedProfileCode('admin'),true);assert.equal(isSharedProfileCode('qa-kid'),false);
});
