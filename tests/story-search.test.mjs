import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { mergeStoryLibrary, matchesStorySearch, normalizeStorySearch } from '../audiobook-library.js';
import { AUDIOBOOKS } from '../audiobook-data.js';
import { REQUESTED_CLASSICS } from '../requested-classics.js';
import { KRIZA_REQUESTED } from '../kriza-requested.js';
import { RADO_STORIES } from '../rado-stories.js';
import { REQUESTED_CLASSICS_WORD_TIMING } from '../requested-classics-word-timing.js';
import { STORY_CAPTION_TIMES } from '../story-caption-timing.js';
import { storyVisualFor } from '../story-visual-library.js';

test('search finds accentless mixed-case titles, authors, aliases and spaced combined terms', () => {
  const stories=mergeStoryLibrary(AUDIOBOOKS, REQUESTED_CLASSICS, KRIZA_REQUESTED, RADO_STORIES);
  for(const [query,id] of [['  GYONGYVIRAG  Palko  ','classic-palko'],['arany  JANOS   fulemule','classic-fulemile'],['fülemile','classic-fulemile'],['  PeToFi\tSandor  lacinak ','classic-arany-lacinak']]) {
    assert.deepEqual(stories.filter(story=>matchesStorySearch(story,query)).map(story=>story.id),[id]);
  }
  assert.equal(normalizeStorySearch('Ő  Ü\nÁ'), 'o u a');
  assert.equal(stories.filter(story=>matchesStorySearch(story,'nincs-ilyen-mű')).length,0);
  assert.equal(stories.filter(story=>matchesStorySearch(story,' \t ')).length,stories.length);
  assert.deepEqual(stories.filter(story=>matchesStorySearch(story,'szekely furfangos')).map(story=>story.id),KRIZA_REQUESTED.map(story=>story.id));
  assert.deepEqual(stories.filter(story=>matchesStorySearch(story,'ozike')).map(story=>story.id),['rado-i-31']);
  assert.equal(stories.filter(story=>story.id.startsWith('rado-')).length,50);
});

test('collection merge covers unknown future IDs and retains metadata without duplicating recordings', () => {
  const [ready,pending]=mergeStoryLibrary([{id:'new-42',title:'Minta',file:'fixed.mp3',duration:90}], [{id:'new-42',title:'Minta',author:'Új Szerző',searchAliases:['Másik cím']},{id:'new-99',title:'Későbbi mű',author:'Más Szerző'}]);
  assert.equal(ready.file,'fixed.mp3');assert.equal(ready.author,'Új Szerző');assert.equal(ready.audioStatus,'ready');
  assert.equal(pending.file,undefined);assert.equal(pending.audioStatus,'pending');
  assert.ok(matchesStorySearch(ready,'masik cim'));assert.ok(matchesStorySearch(pending,'mas szerzo'));
  assert.equal(mergeStoryLibrary(AUDIOBOOKS,REQUESTED_CLASSICS).length,AUDIOBOOKS.length);
});

test('every imported source line and stanza remains in the text and the final recording captions', async () => {
  const counts={'classic-palko':[74,74],'classic-fulemile':[160,10],'classic-arany-lacinak':[72,2]};
  for(const source of REQUESTED_CLASSICS) {
    const text=await readFile(new URL(`../content/stories/${source.file}`,import.meta.url),'utf8');
    assert.equal(text.trim(),source.text);
    const lines=text.trim().split('\n').filter(line=>line.trim());
    assert.equal(lines.length,counts[source.id][0]);assert.equal(text.trim().split('\n\n').length,counts[source.id][1]);
    const recording=AUDIOBOOKS.find(story=>story.id===source.id);
    assert.equal(recording.text,source.text);
    assert.equal(STORY_CAPTION_TIMES[source.id].length,lines.length);
    const words=REQUESTED_CLASSICS_WORD_TIMING[source.id];
    assert.deepEqual(words.map(word=>word[2]),`${source.title}\n\n${source.text}`.match(/[\p{L}\p{N}_]+(?:[-’'][\p{L}\p{N}_]+)*/gu));
    assert.ok(words.every((word,index)=>word[0]>=0&&word[1]>=word[0]&&word[1]<=recording.duration&&(!index||word[0]>=words[index-1][0])));
    const visual=storyVisualFor(source.id);
    assert.ok(visual.scenes.length>=12);
    for(const [index,scene] of visual.scenes.entries()) assert.equal(scene.time,index?STORY_CAPTION_TIMES[source.id][scene.line]:0);
    assert.equal(source.rights.status,'public-domain');
  }
});

test('Kriza source-review cards expose status and all numbered parts without publishing adapted prose', () => {
  assert.equal(KRIZA_REQUESTED.length,3);
  assert.equal(KRIZA_REQUESTED.find(story=>story.id==='kriza-harom-hazug').partsInWork,3);
  for(const story of KRIZA_REQUESTED){
    assert.equal(story.audioStatus,'rights-pending');assert.equal(story.rights.status,'edition-review-required');
    assert.ok(story.providerCharacters>0);assert.ok(story.text.length<250);
    assert.equal(AUDIOBOOKS.some(recording=>recording.id===story.id),false);
  }
});


test('new full MP3s remain optional while the local search and collection metadata are offline assets',async()=>{
  const worker=await readFile(new URL('../sw.js',import.meta.url),'utf8');
  const required=JSON.parse(worker.match(/const ASSETS = (\[[\s\S]*?\]);/)[1]).map(asset=>asset.file);
  const optional=JSON.parse(worker.match(/const OPTIONAL_ASSETS = (\[[\s\S]*?\]);/)[1]).map(asset=>asset.file);
  for(const story of AUDIOBOOKS.filter(story=>story.id.startsWith('classic-'))){assert.ok(optional.includes(story.file));assert.equal(required.includes(story.file),false);}
  for(const file of ['audiobook-library.js','requested-classics.js','kriza-requested.js'])assert.ok(required.includes(file));
});
