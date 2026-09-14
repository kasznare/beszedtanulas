import test from 'node:test';
import assert from 'node:assert/strict';
import { collectSpeechResults, recognizeHungarianSpeech } from '../speech-recognition.js';
import { matchTwoWordPhrase } from '../speech-matching.js';
import { twoWordPhrases } from '../game-data.js';

const result = (texts, isFinal = true) => Object.assign(texts.map(transcript => ({transcript, confidence:.9})), {isFinal});
const tick = () => new Promise(resolve => setTimeout(resolve, 0));
function harness({ start = recognition => queueMicrotask(() => recognition.onstart?.()), stop = recognition => recognition.onend?.() } = {}) {
  const instances = [];
  class Recognition {
    constructor() { this.stops=0; this.aborts=0; instances.push(this); }
    start() { start(this); }
    stop() { this.stops++; stop(this); }
    abort() { this.aborts++; }
    emit(results) { this.onresult?.({results}); }
  }
  return { instances, run: options => recognizeHungarianSpeech({SpeechRecognition:Recognition, timeoutMs:500, startupMs:500, finalResultMs:100, ...options}) };
}

test('sequential speech segments combine, mutually exclusive alternatives do not', () => {
  const targets=twoWordPhrases[0].targets;
  const separate=collectSpeechResults([result(['kérek','vizet'])]);
  assert.equal(matchTwoWordPhrase(targets,separate.alternatives).success,false);
  const sequential=collectSpeechResults([result(['kérek','kerem']),result(['vizet','tejet'])]);
  assert.equal(matchTwoWordPhrase(targets,sequential.alternatives).success,true);
  assert.equal(sequential.transcript,'kérek vizet');
  assert.equal(sequential.alternatives.length,4);
});

test('current snapshots discard corrected and removed interim results', async () => {
  const h=harness(), partials=[];
  const pending=h.run({isMatch:()=>false,onPartial:value=>partials.push(value)});
  const recognition=h.instances[0];
  recognition.emit([result(['kérek vizet'],false)]);
  recognition.emit([result(['kérek tejet'],false)]);
  recognition.emit([]);
  recognition.onend();
  const final=await pending;
  assert.deepEqual(partials[1].alternatives,['kérek tejet']);
  assert.deepEqual(final.alternatives,[]);
});

test('an interim match cannot finish before the final correction arrives', async () => {
  const h=harness();let completed=false;
  const pending=h.run({isMatch:value=>value.alternatives.includes('víz')}).then(value=>{completed=true;return value;});
  const recognition=h.instances[0];
  recognition.emit([result(['víz'],false)]);
  await tick();assert.equal(completed,false);assert.equal(recognition.aborts,0);
  recognition.emit([result(['tej'])]);recognition.onend();
  assert.deepEqual((await pending).alternatives,['tej']);
});

test('one final word does not end a two-word attempt; later segments can complete it', async () => {
  const h=harness();let completed=false;
  const pending=h.run({isMatch:value=>matchTwoWordPhrase(twoWordPhrases[0].targets,value.alternatives).success}).then(value=>{completed=true;return value;});
  const recognition=h.instances[0];
  recognition.emit([result(['kérek'])]);
  await tick();assert.equal(completed,false);assert.equal(recognition.stops,0);
  recognition.emit([result(['kérek']),result(['vizet'])]);
  assert.equal((await pending).transcript,'kérek vizet');assert.equal(recognition.aborts,1);
});

test('timeout waits for the final result delivered after stop()', async () => {
  const h=harness({stop:recognition=>setTimeout(()=>{recognition.emit([result(['víz'])]);recognition.onend?.();},10)});
  const pending=h.run({timeoutMs:15,isMatch:value=>value.transcript==='víz'});
  h.instances[0].emit([result(['biz'],false)]);
  const value=await pending;
  assert.equal(value.transcript,'víz');assert.equal(value.isFinal,true);assert.equal(h.instances[0].stops,1);
});

test('a service that never finishes is bounded and aborted', async () => {
  const h=harness({stop:()=>{}});
  const value=await h.run({timeoutMs:10,finalResultMs:10});
  assert.deepEqual(value.alternatives,[]);assert.equal(h.instances[0].stops,1);assert.equal(h.instances[0].aborts,1);
});

test('the response window starts when recognition is ready, not while it is opening', async () => {
  const h=harness({start:recognition=>setTimeout(()=>{recognition.onstart();setTimeout(()=>recognition.emit([result(['víz'])]),10);},35)});
  let starts=0;
  const value=await h.run({timeoutMs:25,onStart:()=>starts++});
  assert.equal(value.transcript,'víz');assert.equal(starts,1);
});

test('a recognizer that never starts returns a startup error', async () => {
  const h=harness({start:()=>{}});
  assert.equal((await h.run({startupMs:10})).error,'start-timeout');assert.equal(h.instances[0].aborts,1);
});

test('cancellation detaches handlers and late results cannot escape', async () => {
  const h=harness(), controller=new AbortController();let partials=0;
  const pending=h.run({signal:controller.signal,onPartial:()=>partials++});
  const recognition=h.instances[0], late=recognition.onresult;
  controller.abort();late({results:[result(['víz'])]});
  assert.equal((await pending).error,'aborted');assert.equal(partials,0);assert.equal(recognition.onresult,null);assert.equal(recognition.aborts,1);
});

test('a pre-aborted attempt never constructs or starts the service', async () => {
  const h=harness(),controller=new AbortController();controller.abort();
  assert.equal((await h.run({signal:controller.signal})).error,'aborted');assert.equal(h.instances.length,0);
});

test('only unsupported Hungarian locale triggers one hu retry, never English', async () => {
  const h=harness({start:recognition=>queueMicrotask(()=>{
    if(recognition.lang==='hu-HU')recognition.onerror({error:'language-not-supported'});
    else recognition.emit([result(['víz'])]);
  })});
  assert.equal((await h.run()).transcript,'víz');assert.deepEqual(h.instances.map(item=>item.lang),['hu-HU','hu']);
});

test('silence, network and permission errors do not start further recognition sessions', async () => {
  for(const error of ['no-speech','network','not-allowed','service-not-allowed','audio-capture']) {
    const h=harness({start:recognition=>queueMicrotask(()=>recognition.onerror({error}))});
    assert.equal((await h.run()).error,error);assert.equal(h.instances.length,1);
  }
});

test('locale fallback reports readiness only once for the whole child attempt', async () => {
  let starts=0;
  const h=harness({start:recognition=>queueMicrotask(()=>{
    recognition.onstart();
    if(recognition.lang==='hu-HU')recognition.onerror({error:'language-not-supported'});
    else recognition.emit([result(['víz'])]);
  })});
  assert.equal((await h.run({onStart:()=>starts++})).transcript,'víz');assert.equal(starts,1);
});

test('ending before the service starts is a startup error, not an incorrect word', async () => {
  const h=harness({start:recognition=>queueMicrotask(()=>recognition.onend())});
  assert.equal((await h.run()).error,'start-error');
});

test('constructor failures and missing APIs produce recoverable results', async () => {
  assert.equal((await recognizeHungarianSpeech({SpeechRecognition:null})).error,'unsupported');
  assert.equal((await recognizeHungarianSpeech({SpeechRecognition:class{constructor(){throw Error('unavailable');}}})).error,'start-error');
});

test('large alternative sets remain bounded and retain the strongest whole transcript', () => {
  const segment=Object.assign(['a','b','c','d','e'].map((transcript,index)=>({transcript,confidence:1-index*.1})),{isFinal:true});
  const value=collectSpeechResults([segment,segment,segment,segment]);
  assert.equal(value.alternatives.length,10);assert.equal(value.transcript,'a a a a');assert.equal(value.confidence,1);
});
