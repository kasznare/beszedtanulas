import test from 'node:test';
import assert from 'node:assert/strict';
import {buildCuePlan,cueAt,createNarration} from '../narration.js';
import {narrationCue} from '../narration-cues.js';
import {VOICE_CLIPS} from '../voice-library.js';
import {VOICE_TIMING} from '../voice-timing.js';

test('every narrated phrase matches real word timing; cues follow audio position, not elapsed wall time',()=>{
 for(const [id,clip] of Object.entries(VOICE_CLIPS)) {
  const {parts=[]}=narrationCue(id,'furfangliget');
  const plan=buildCuePlan(clip.text,VOICE_TIMING[id],parts);
  assert.equal(plan.length,parts.length,`Missing spoken cue in ${id}`);
  if(plan.length) {
   assert.equal(cueAt(plan,plan[0].time-.01),undefined);
   for(const cue of plan) assert.equal(cueAt(plan,cue.time),cue);
  }
 }
});

test('Hungarian punctuation and browser char offsets select the same cue',()=>{
 const text='Almát a kosárba!';const words=[[.2,.8,'Almát'],[.8,.9,'a'],[.9,1.5,'kosárba']];
 const plan=buildCuePlan(text,words,[{at:'Almát',target:'.apple'},{at:'kosárba',target:'.basket'}]);
 assert.equal(cueAt(plan,.5).target,'.apple');
 assert.equal(cueAt(plan,1.2).target,'.basket');
 assert.equal(cueAt(plan,text.indexOf('kosárba'),'charStart').target,'.basket');
 assert.deepEqual(buildCuePlan(text,words,[{at:'missing',target:'.wrong'}]),[]);
});

test('late loading never highlights early; rerenders and cancellation clean up active elements',()=>{
 const originalDocument=globalThis.document;
 const events=[];
 globalThis.document={dispatchEvent:event=>events.push(event)};
 const element=()=>({dataset:{},classList:new Set(),getClientRects:()=>[{}]});
 const a=element(),b=element();for(const node of [a,b])node.classList.remove=node.classList.delete.bind(node.classList);
 let nodes=[a],frame,time=0;
 const narration=createNarration({getRoot:()=>({isConnected:true,querySelectorAll:()=>nodes}),getWords:()=>[],requestFrame:cb=>(frame=cb,1),cancelFrame:()=>{frame=null;}});
 try {
  const clip=narration.prepare('test','Szia!',{target:'.picture'});
  assert.equal(a.classList.has('is-narrated'),false);
  clip.start(()=>time);assert.equal(a.classList.has('is-narrated'),true);
  nodes=[b];frame();assert.equal(a.classList.has('is-narrated'),false);assert.equal(b.classList.has('is-narrated'),true);
  const staleFrame=frame;narration.stop();staleFrame();
  assert.equal(b.classList.has('is-narrated'),false);assert.equal(frame,null);
  assert.equal(events.filter(e=>e.type==='narrationstart').length,1);
  assert.equal(events.filter(e=>e.type==='narrationend').length,1);
 }finally{globalThis.document=originalDocument;}
});

test('choice games animate speakers and never identify a hidden correct answer',()=>{
 for(const id of ['word_alma','word_cica'])assert.equal(narrationCue(id,'listening-game').target,'#listening-replay');
 for(const id of ['teddy_alma','teddy_tej'])assert.equal(narrationCue(id,'teddy-game').target,'.teddy-illustration');
 for(const id of ['question_alma_3','question_auto_5'])assert.equal(narrationCue(id,'numbers').target,'#number-question-play');
});
