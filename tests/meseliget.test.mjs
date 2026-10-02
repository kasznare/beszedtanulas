import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeMeadow, recordMeadowTask, countFeedback } from '../meseliget-data.js';
import { snapshotProgress, createProgressBackup, parseProgressBackup, replaceProgress } from '../progress-data.js';
import { switchProgressProfile } from '../progress-profiles.js';

test('story checkpoints advance through clothing, collection and serving and finish once', () => {
 let value=normalizeMeadow({adventure:{step:0,target:3}});
 for(const kind of ['dress','collect','serve']){
  const result=recordMeadowTask(value,kind,kind==='collect');value=result.progress;
  assert.equal(result.finished,kind==='serve');
 }
 assert.equal(value.journeys,1);assert.equal(value.adventure,null);
 assert.deepEqual(value.collect,{independent:0,assisted:1});
 assert.deepEqual(value.serve,{independent:1,assisted:0});
 const repeat=recordMeadowTask(value,'serve',false);
 assert.equal(repeat.finished,false);assert.equal(repeat.progress.journeys,1);
});
test('old backups load, new backups preserve story, album and assistance and reject corrupt data', () => {
 const old=snapshotProgress();delete old.meadow;
 const backup=createProgressBackup(old);assert.equal(parseProgressBackup(JSON.stringify(backup)).progress.meadow.journeys,0);
 const state=snapshotProgress({meadow:{journeys:4,collect:{independent:9,assisted:2},adventure:{step:2,target:5}}});
 assert.deepEqual(parseProgressBackup(JSON.stringify(createProgressBackup(state))).progress,state);
 for(const change of [m=>m.journeys=-1,m=>m.collect.assisted=.5,m=>m.adventure.target=11,m=>m.adventure.step=7]){
  const invalid=createProgressBackup(state);change(invalid.progress.meadow);
  assert.throws(()=>parseProgressBackup(JSON.stringify(invalid)),/Meseliget/);
 }
});
test('meadow data stays with the active profile and is included in reset/undo',()=>{
 const kid={url:'',activeRole:'kid',profileCode:'local'},admin={...kid,activeRole:'admin'};
 let state={...snapshotProgress({meadow:{journeys:2,adventure:{step:1,target:3}}}),supabase:kid};
 state=switchProgressProfile(state,kid);
 const other=switchProgressProfile(state,admin);assert.equal(other.meadow.journeys,0);
 state=switchProgressProfile(other,kid);assert.equal(state.meadow.journeys,2);assert.equal(state.meadow.adventure.step,1);
 const reset=replaceProgress(state,snapshotProgress(),'reset');assert.equal(reset.meadow.journeys,0);
 const undo=replaceProgress(reset,reset.undoProgress.progress,'undo');assert.deepEqual(undo.meadow,state.meadow);
});
test('quantity feedback distinguishes too few, too many and exactly enough throughout range',()=>{
 for(let n=1;n<=10;n++){
  assert.equal(countFeedback(n,n),'correct');assert.equal(countFeedback(n-1,n),'more');assert.equal(countFeedback(n+1,n),'less');
 }
});
