import test from 'node:test';
import assert from 'node:assert/strict';
import { R_WORDS,R_DISTRACTORS,R_RHYMES,R_GAMES,buildRHunterRound,matchRPracticeSpeech,normalizeRPreferences,loadRPreferences,saveRPreferences,normalizeRProgress,validateRProgress,recordRProgress } from '../r-practice-data.js';
import { R_CLIPS } from '../r-practice-voice.js';
import { createProgressBackup,parseProgressBackup,snapshotProgress,replaceProgress } from '../progress-data.js';
import { switchProgressProfile } from '../progress-profiles.js';
import { openRStream,createRRecorder } from '../r-practice-media.js';

test('thirty distinct R words in three location groups and all narrated content are present',()=>{
  assert.equal(R_WORDS.length,30);assert.equal(new Set(R_WORDS.map(word=>word.id)).size,30);
  for(const position of ['initial','medial','final'])assert.equal(R_WORDS.filter(word=>word.position===position).length,10);
  for(const word of R_WORDS){
    assert.ok(word.text.includes('r'));assert.equal(R_CLIPS[`r_word_${word.id}`],word.text);assert.equal(R_CLIPS[`r_phrase_${word.id}`],word.phrase);
    if(word.position==='initial')assert.ok(word.text.startsWith('r'));
    if(word.position==='final')assert.ok(word.text.endsWith('r'));
    if(word.position==='medial')assert.ok(word.text.slice(1,-1).includes('r'));
  }
  for(const word of R_DISTRACTORS)assert.ok(!word.text.includes('r'));
  for(const rhyme of R_RHYMES){assert.equal(rhyme.lines.length,4);rhyme.lines.forEach(([line],i)=>{assert.ok(line.toLowerCase().includes('r'));assert.equal(R_CLIPS[`r_rhyme_${rhyme.id}_${i}`],line);});}
});
test('both hunter modes build solvable distinct rounds for each position and choice count',()=>{
  for(const hunterKind of ['picture','sound'])for(const choices of [2,3])for(const position of ['all','initial','medial','final']){
    const rounds=buildRHunterRound({hunterKind,choices,position,roundLength:5},()=>.42);
    assert.equal(rounds.length,5);assert.equal(new Set(rounds.map(round=>round.target.id)).size,5);
    for(const round of rounds){assert.equal(round.choices.length,choices);assert.equal(round.choices.filter(word=>word.id===round.target.id).length,1);assert.equal(new Set(round.choices.map(word=>word.id)).size,choices);if(hunterKind==='sound')assert.equal(round.choices.filter(word=>word.text.includes('r')).length,1);}
  }
});
test('transcript matching requires complete ordered tokens in one alternative',()=>{
  assert.ok(matchRPracticeSpeech('piros répa',['A piros répa itt van.']));
  assert.ok(matchRPracticeSpeech('répa',['répa!']));
  assert.ok(!matchRPracticeSpeech('répa',['répát']));
  assert.ok(!matchRPracticeSpeech('répa',['lépa']));
  assert.ok(!matchRPracticeSpeech('piros répa',['piros','répa']));
  assert.ok(!matchRPracticeSpeech('piros répa',['répa piros']));
  assert.ok(!matchRPracticeSpeech('',['']));
});
test('preferences are bounded, private to the module and tolerate corrupt or blocked storage',()=>{
  const invalid=normalizeRPreferences({choices:7,roundLength:-2,speechMode:'therapy',position:'bad'});
  assert.equal(invalid.choices,2);assert.equal(invalid.speechMode,'together');assert.equal(invalid.position,'all');
  const store={getItem:()=>'{broken',setItem(){throw Error('blocked');}};
  assert.deepEqual(loadRPreferences(store),normalizeRPreferences());assert.doesNotThrow(()=>saveRPreferences(store,invalid));
  assert.deepEqual(loadRPreferences({getItem(){throw Error('blocked');}}),normalizeRPreferences());
});
test('R results distinguish practice, word recognition, adult confirmation and rounds without articulation scores',()=>{
  const zero=normalizeRProgress();let progress=recordRProgress(zero,'post','recognized');
  progress=recordRProgress(progress,'post','practice');progress=recordRProgress(progress,'post','confirmed');progress=recordRProgress(progress,'post','round');
  assert.deepEqual(progress.games.post,{rounds:1,practices:2,recognized:1,confirmed:1});assert.equal(zero.games.post.practices,0);
  assert.doesNotThrow(()=>validateRProgress(progress));assert.equal(progress.articulation,undefined);
  assert.throws(()=>validateRProgress({version:1,games:{alien:{}}}));
  assert.throws(()=>validateRProgress({version:1,games:{post:{rounds:0,practices:1,recognized:2,confirmed:0}}}));
  assert.equal(normalizeRProgress({games:{post:{practices:1,recognized:99}}}).games.post.recognized,1);
});
test('all five games survive backup, reset/undo and child/adult profiles while recordings stay absent',()=>{
  let state={...snapshotProgress(),settings:{roundLength:3},supabase:{activeRole:'kid',url:'local',profileCode:'kid'}};
  for(const {id} of R_GAMES)state.rPractice=recordRProgress(state.rPractice,id,'round');
  const original=structuredClone(state), backup=createProgressBackup({...state,recording:new Blob(['secret voice'])});
  assert.deepEqual(parseProgressBackup(JSON.stringify(backup)).progress.rPractice,state.rPractice);
  assert.ok(!JSON.stringify(backup).includes('secret voice'));assert.equal(backup.progress.recording,undefined);
  const reset=replaceProgress(state,snapshotProgress(),'reset');assert.equal(reset.rPractice.games.echo.rounds,0);
  assert.deepEqual(replaceProgress(reset,reset.undoProgress.progress,'undo').rPractice,original.rPractice);
  const adult=switchProgressProfile(state,{...state.supabase,activeRole:'admin',profileCode:'admin'});assert.equal(adult.rPractice.games.post.rounds,0);
  assert.deepEqual(switchProgressProfile(adult,state.supabase).rPractice,original.rPractice);
});
test('permission resolved after cancellation or startup timeout closes the late microphone stream',async()=>{
  for(const kind of ['abort','timeout']){
    let resolve,stops=0;const controller=new AbortController(),permission=new Promise(r=>{resolve=r;});
    const request=openRStream(controller.signal,()=>permission,kind==='timeout'?5:1000);
    if(kind==='abort')controller.abort();
    await assert.rejects(request);
    resolve({getTracks:()=>[{stop(){stops++;}}]});await new Promise(r=>setTimeout(r,0));assert.equal(stops,1);
  }
});

function fakeRecording({deny=false,maxBytes}={}) {
  let stops=0,time=0;
  class Recorder {
    static isTypeSupported(type){return type.startsWith('audio/webm');}
    constructor(){this.state='inactive';this.mimeType='audio/webm';}
    start(){this.state='recording';queueMicrotask(()=>this.onstart?.());}
    stop(){this.state='inactive';queueMicrotask(()=>{this.ondataavailable?.({data:new Blob([new Uint8Array(256)],{type:this.mimeType})});this.onstop?.();});}
  }
  const factory=createRRecorder({Recorder,supported:()=>true,now:()=>time,maxBytes,getMedia:async()=>{if(deny)throw new DOMException('denied','NotAllowedError');return {getTracks:()=>[{stop(){stops++;}}]};}});
  return {factory,stops:()=>stops,advance:value=>{time=value;}};
}
test('recording stops owned tracks, keeps native MIME, and resolves a usable bounded local Blob',async()=>{
  const mock=fakeRecording();
  const result=await mock.factory.record({onStart(){mock.advance(650);queueMicrotask(()=>mock.factory.finish());}});
  assert.equal(mock.stops(),1);assert.equal(result.duration,650);assert.equal(result.blob.size,256);assert.equal(result.blob.type,'audio/webm');
});
test('cancelled or oversized recordings discard all audio and release the microphone',async()=>{
  const mock=fakeRecording(),controller=new AbortController();
  const result=await mock.factory.record({signal:controller.signal,onStart(){controller.abort();}});
  assert.equal(result.error,'aborted');assert.equal(result.blob,undefined);assert.equal(mock.stops(),1);
  const large=fakeRecording({maxBytes:150});
  const oversize=await large.factory.record({onStart(){large.advance(1000);queueMicrotask(()=>large.factory.finish());}});
  assert.equal(oversize.error,'too-large');assert.equal(oversize.blob,undefined);assert.equal(large.stops(),1);
});
test('automatic recording cap ends without a user stop, and permission/unsupported cases never start recording',async()=>{
  const mock=fakeRecording();const result=await mock.factory.record({maxMs:300,onStart(){mock.advance(400);}});
  assert.equal(result.duration,300);assert.equal(mock.stops(),1);
  let started=false;const denied=fakeRecording({deny:true});
  assert.equal((await denied.factory.record({onStart(){started=true;}})).error,'not-allowed');assert.equal(started,false);
  assert.equal((await createRRecorder({Recorder:undefined,supported:()=>false}).record()).error,'unsupported');
});
test('cancelling a recorder during pending permission closes its late stream without publishing a Blob',async()=>{
  let resolve,stops=0;const pending=new Promise(r=>{resolve=r;});
  const mock=createRRecorder({Recorder:class {},supported:()=>true,getMedia:()=>pending});
  const result=mock.record();mock.cancel();assert.equal((await result).error,'aborted');
  resolve({getTracks:()=>[{stop(){stops++;}}]});await new Promise(r=>setTimeout(r,0));assert.equal(stops,1);
});
