import test from 'node:test';
import assert from 'node:assert/strict';
import {R_WORDS,R_RHYMES,R_POST_MISSIONS,R_RHYME_PARTS,R_DECORATIONS,rPostMissions,buildRPostMission,rRhymeUnits,buildRRhymeStory,isRRhymeStoryComplete,normalizeRPreferences} from '../r-practice-data.js';
import {R_CLIPS} from '../r-practice-voice.js';
import {createRRecorder} from '../r-practice-media.js';

test('post missions always have two connected distinct parcels within the chosen word group',()=>{
  for(const position of ['all','initial','medial','final']){
    assert.ok(rPostMissions(position).length>=2);
    for(const random of [()=>0,()=>.5,()=>.999]){
      const mission=buildRPostMission(position,random);
      assert.equal(mission.deck.length,2);assert.notEqual(mission.deck[0].id,mission.deck[1].id);
      assert.ok(mission.deck.every(word=>position==='all'||word.position===position));
      assert.equal(R_CLIPS[`r_mission_${mission.id}`],mission.text);
      mission.deck[0].text='changed';assert.notEqual(R_WORDS.find(word=>word.id===mission.words[0]).text,'changed');
    }
  }
  assert.equal(new Set(R_POST_MISSIONS.map(m=>m.id)).size,R_POST_MISSIONS.length);
});
test('short rhyme units reconstruct each original line and each has its own static recording definition',()=>{
  for(const rhyme of R_RHYMES){
    const full=rRhymeUnits(rhyme),short=rRhymeUnits(rhyme,true);
    assert.equal(full.length,4);assert.equal(short.length,8);assert.equal(new Set(short.map(u=>u.key)).size,8);
    for(const [line,[text]] of rhyme.lines.entries())assert.equal(R_RHYME_PARTS[rhyme.id][line].join(' '),text);
    for(const unit of [...full,...short])assert.equal(R_CLIPS[unit.clip],unit.text);
    assert.deepEqual(short.map(u=>u.line),[0,0,1,1,2,2,3,3]);
  }
});
test('story cards start shuffled with all four scenes and only the complete original order succeeds',()=>{
  for(const rhyme of R_RHYMES)for(const random of [()=>0,()=>.5,()=>.999]){
    const before=JSON.stringify(rhyme),cards=buildRRhymeStory(rhyme,random);
    assert.deepEqual(cards.map(c=>c.id).sort(),[0,1,2,3]);
    assert.ok(!isRRhymeStoryComplete(cards.map(c=>c.id)));
    assert.equal(JSON.stringify(rhyme),before);
  }
  assert.ok(isRRhymeStoryComplete([0,1,2,3]));
  for(const order of [[],[0,1,2],[0,1,2,2],[1,0,2,3],[0,1,2,3,4]])assert.ok(!isRRhymeStoryComplete(order));
});
test('new preferences are bounded and decorations have distinct child-friendly labels',()=>{
  assert.equal(normalizeRPreferences({rhymeMode:'repeat',rhymeShort:true}).rhymeShort,true);
  assert.equal(normalizeRPreferences({rhymeMode:'automatic',rhymeShort:'yes'}).rhymeMode,'say');
  assert.equal(normalizeRPreferences({rhymeShort:'yes'}).rhymeShort,false);
  assert.equal(new Set(R_DECORATIONS.map(d=>d.id)).size,R_DECORATIONS.length);
  assert.ok(R_DECORATIONS.every(d=>d.name&&d.icon));
});
test('a failed replacement recording does not invalidate the prior successful Blob and a later retry works',async()=>{
  let now=0,deny=false,stops=0;
  class Recorder{
    static isTypeSupported(){return true;}
    constructor(){this.state='inactive';this.mimeType='audio/webm';}
    start(){this.state='recording';queueMicrotask(()=>this.onstart?.());}
    stop(){this.state='inactive';queueMicrotask(()=>{this.ondataavailable?.({data:new Blob([new Uint8Array(256)])});this.onstop?.();});}
  }
  const recorder=createRRecorder({Recorder,supported:()=>true,now:()=>now,getMedia:async()=>{if(deny)throw new DOMException('denied','NotAllowedError');return{getTracks:()=>[{stop(){stops++;}}]};}});
  const capture=()=>recorder.record({onStart(){now+=500;queueMicrotask(()=>recorder.finish());}});
  const first=await capture();deny=true;
  const failed=await capture();assert.equal(failed.error,'not-allowed');assert.equal(first.blob.size,256);assert.equal(first.duration,500);
  deny=false;const replacement=await capture();assert.equal(replacement.blob.size,256);assert.notEqual(replacement.blob,first.blob);assert.equal(stops,2);
});

test('linked missions avoid the immediately previous mission in every R group',()=>{for(const position of ['all','initial','medial','final']){const first=buildRPostMission(position,()=>.5);const next=buildRPostMission(position,()=>.5,first.id);assert.notEqual(first.id,next.id);assert.ok(next.deck.every(word=>position==='all'||word.position===position));}});
import {buildRPostMission as buildMission,rPostParcelCount,rPostWishOwner,R_RECIPIENTS,R_RHYMES as RHYMES,rhymeGap,buildRHunterRound,rSoundPositions} from '../r-practice-data.js';
import {R_CLIPS as CLIPS} from '../r-practice-voice.js';

test('every Robotpostás parcel is wished for by exactly one house, and later missions carry three',()=>{
  assert.equal(rPostParcelCount(0),2);assert.equal(rPostParcelCount(1),2);assert.equal(rPostParcelCount(2),3);assert.equal(rPostParcelCount(9),3);
  for(const position of ['all','initial','medial','final'])for(const parcels of [2,3])for(const seed of [0,.31,.5,.77,.999]){
    const mission=buildMission(position,()=>seed,'',parcels);
    assert.equal(mission.deck.length,parcels);assert.equal(new Set(mission.deck.map(word=>word.id)).size,parcels);
    assert.deepEqual(Object.keys(mission.wishes).sort(),R_RECIPIENTS.map(friend=>friend.id).sort());
    for(const word of mission.deck){const owner=rPostWishOwner(mission.wishes,word.id);assert.ok(owner,'each parcel has a wishing friend');assert.equal(Object.values(mission.wishes).filter(id=>id===word.id).length,1);}
    assert.equal(Object.values(mission.wishes).filter(id=>id===null).length,3-parcels,'with two parcels one house wishes for nothing');
    if(position!=='all')assert.ok(mission.deck.every(word=>word.position===position));
  }
  assert.equal(rPostWishOwner({fox:'roka'},'repa'),'');
});

test('the hidden rhyme word is never spoken before it is found; the full line confirms it',()=>{
  for(const rhyme of RHYMES)rhyme.lines.forEach(([text],line)=>{
    const gap=rhymeGap(rhyme.id,line),model=CLIPS[gap.modelClip];
    assert.ok(model,`${gap.modelClip} is recorded`);
    assert.ok(!model.toLocaleLowerCase('hu').includes(gap.missing.toLocaleLowerCase('hu')),`${rhyme.id} ${line+1}: the model does not reveal ${gap.missing}`);
    assert.equal(CLIPS[gap.lineClip],text);
    if(gap.part===1)assert.equal(gap.modelClip,`r_rhyme_part_${rhyme.id}_${line}_0`,'second-half gaps play the first half');
  });
  assert.equal(rhymeGap('sator',2).missing,'kosárba','the basket line hides its line-final word');
});

test('Az R helye always mixes the three R positions, whatever word group is saved',()=>{
  for(const position of ['all','initial','medial','final'])for(const roundLength of [3,5])for(const seed of [0,.42,.999]){
    const rounds=buildRHunterRound({hunterKind:'position',position,roundLength},()=>seed);
    assert.equal(rounds.length,roundLength);assert.equal(new Set(rounds.map(round=>round.target.id)).size,roundLength);
    assert.equal(new Set(rounds.map(round=>round.target.position)).size,3,`${position}/${roundLength}: initial, medial and final words appear`);
    for(const round of rounds)assert.ok(rSoundPositions(round.target.text).includes(round.target.position));
  }
});
