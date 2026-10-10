import test from 'node:test';
import assert from 'node:assert/strict';
import { createAudiobookPlayer, normalizeAudiobookState, saveAudiobookOffline, isAudiobookSaved, resolveAudiobookSource } from '../audiobook-player.js';
import { createHash } from 'node:crypto';

const stories = [{id:'a',sha256:'hash-a',duration:300},{id:'b',sha256:'hash-b',duration:500}];
const bookmark = seconds => ({selected:'a',positions:{a:{seconds,sha256:'hash-a'}}});
class AudioStub extends EventTarget {
  currentTime = 0; duration = 300; paused = true; ended = false;
  setAttribute() {} removeAttribute() {} load() {}
  play() { this.paused = false; this.dispatchEvent(new Event('playing')); return Promise.resolve(); }
  pause() { this.paused = true; this.dispatchEvent(new Event('pause')); }
  event(name) { this.dispatchEvent(new Event(name)); }
}
function fixture(options = {}) {
  const audios = [], changes = [], saves = [], releases = [];
  const player = createAudiobookPlayer({stories,preferences:bookmark(65),
    audioFactory:()=>{const audio=new AudioStub();audios.push(audio);return audio;},
    onChange:state=>changes.push(state),persist:state=>saves.push(state),releaseSource:source=>{if(source)releases.push(source);},...options});
  return {player,audios,changes,saves,releases};
}
test('invalid and stale bookmarks cannot seek outside a story', () => {
  for(const seconds of [-1,NaN,Infinity,'65',300,299]) assert.deepEqual(normalizeAudiobookState(bookmark(seconds),stories).positions,{});
  assert.deepEqual(normalizeAudiobookState({selected:'unknown',positions:{a:{seconds:60,sha256:'old'}}},stories),{selected:'a',positions:{}});
  assert.equal(normalizeAudiobookState(bookmark(65),stories).positions.a.seconds,65);
});
test('initial home-screen cleanup preserves a saved bookmark; playback continues beyond one minute', async () => {
  const {player,audios,saves}=fixture();
  player.stop(); assert.equal(player.getPreferences().positions.a.seconds,65);assert.equal(saves.length,0);
  await player.select('a');const audio=audios[0];
  audio.event('timeupdate');assert.equal(player.getState().position,65);
  audio.event('loadedmetadata');assert.equal(audio.currentTime,65);
  await player.play();audio.currentTime=185;audio.event('timeupdate');
  assert.equal(player.getState().phase,'playing');assert.equal(player.getState().position,185);
  player.pause();assert.equal(player.getPreferences().positions.a.seconds,185);
  await player.play();assert.equal(audio.currentTime,185);
  player.stop();await player.select('a');audios[1].event('loadedmetadata');assert.equal(audios[1].currentTime,185);
});
test('switching stories discards late cached sources and late old audio events', async () => {
  let firstResolve;
  const {player,audios,releases}=fixture({resolveSource:story=>story.id==='a'?new Promise(resolve=>{firstResolve=resolve;}):Promise.resolve({url:'b'})});
  const first=player.select('a');await player.select('b');firstResolve({url:'old-blob',blob:true});
  assert.equal(await first,false);assert.equal(player.getState().storyId,'b');assert.equal(audios.length,1);
  assert.deepEqual(releases,[{url:'old-blob',blob:true}]);
  const old=audios[0];await player.select('b');old.event('error');old.event('ended');
  assert.equal(player.getState().phase,'ready');
});
test('a pending play request cannot resume after pause or departure', async () => {
  let resolvePlay;
  const {player,audios}=fixture();await player.select('a');const audio=audios[0];audio.event('loadedmetadata');
  audio.play=()=>new Promise(resolve=>{resolvePlay=resolve;});
  const attempt=player.play();player.pause();audio.event('playing');resolvePlay();
  assert.equal(await attempt,false);assert.equal(audio.paused,true);assert.equal(player.getState().phase,'paused');
  const second=player.play();player.stop();resolvePlay();assert.equal(await second,false);assert.equal(player.getState().phase,'idle');
});
test('ending, seeking, retrying and restarting keep completion separate from bookmarks', async () => {
  const {player,audios}=fixture();await player.select('a');const audio=audios[0];audio.event('loadedmetadata');
  await player.play();audio.currentTime=300;audio.ended=true;audio.event('ended');
  assert.equal(player.getState().phase,'ended');assert.equal(player.getPreferences().positions.a.seconds,0);
  player.pause();assert.equal(player.getPreferences().positions.a.seconds,0);
  audio.ended=false;await player.play();assert.equal(audio.currentTime,0);
  player.seek(800);assert.equal(audio.currentTime,300);player.seek(-10);assert.equal(audio.currentTime,0);
  audio.event('error');assert.equal(player.getState().phase,'error');await player.play();assert.equal(player.getState().phase,'playing');
  player.seek(92);await player.restart();assert.equal(audio.currentTime,0);
});

test('failed or corrupt downloads preserve the old audio and a retry stores verified bytes', async () => {
  const originals={caches:globalThis.caches,fetch:globalThis.fetch};
  const bytes='complete mp3 bytes', sha256=createHash('sha256').update(bytes).digest('hex');
  const story={id:'offline-a',file:'audio/audiobooks/a.mp3',sha256};
  const base=new URL('../audio/audiobooks/a.mp3',import.meta.url).href;
  const store=new Map([[base+'?v=old',new Response('old recording')]]);
  globalThis.caches={open:async()=>({match:async key=>store.get(key)?.clone(),put:async(key,response)=>store.set(key,response.clone()),keys:async()=>[...store.keys()].map(url=>({url})),delete:async key=>store.delete(key.url||key)})};
  try {
    globalThis.fetch=async()=>new Response('partial', {status:200});
    await assert.rejects(saveAudiobookOffline(story));assert.equal(store.size,1);assert.equal(await isAudiobookSaved(story),false);
    globalThis.fetch=async()=>new Response('failed',{status:503});
    await assert.rejects(saveAudiobookOffline(story));assert.equal(store.size,1);
    globalThis.fetch=async()=>new Response(bytes,{headers:{'Content-Type':'audio/mpeg'}});
    await saveAudiobookOffline(story);assert.equal(store.size,1);assert.equal(await isAudiobookSaved(story),true);
    const resolved=await resolveAudiobookSource(story);assert.equal(resolved.blob,true);assert.ok(resolved.url.startsWith('blob:'));URL.revokeObjectURL(resolved.url);
  } finally { globalThis.caches=originals.caches;globalThis.fetch=originals.fetch; }
});
