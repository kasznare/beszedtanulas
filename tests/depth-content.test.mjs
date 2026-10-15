import test from 'node:test';
import assert from 'node:assert/strict';
import { twoWordPhrases } from '../game-data.js';
import { PHRASE_GROUPS, phraseIndexes, buildPhraseDeck } from '../phrase-practice.js';
import { nextTask, relatedTaskMarkup } from '../next-task.js';
import { R_WORDS, R_PHRASE_VARIANTS, R_POST_MISSIONS, rPostMissions, withRPhraseVariant } from '../r-practice-data.js';
import { R_CLIPS } from '../r-practice-voice.js';

test('filtered phrase rounds exhaust their pool before repetition and never switch topics',()=>{
  for(const group of Object.keys(PHRASE_GROUPS))for(const topic of ['all',...new Set(twoWordPhrases.map(p=>p.topic))]){
    const pool=phraseIndexes({group,topic});
    if(!pool.length){assert.deepEqual(buildPhraseDeck(pool,10),[]);continue;}
    for(const random of [()=>0,()=>.47,()=>.999]){
      const deck=buildPhraseDeck(pool,30,pool[0],random);
      assert.equal(deck.length,30);assert.equal(deck[0],pool[0]);assert.ok(deck.every(i=>pool.includes(i)));
      assert.equal(new Set(deck.slice(0,pool.length)).size,Math.min(pool.length,30));
      if(pool.length>1)assert.ok(deck.every((item,i)=>!i||item!==deck[i-1]));
    }
  }
});

test('new R scenes use known words, two-word models and recorded text that matches the visual task',()=>{
  assert.equal(R_POST_MISSIONS.length,12);
  for(const group of ['initial','medial','final'])assert.equal(rPostMissions(group).length,4);
  for(const variant of R_PHRASE_VARIANTS){
    const word=R_WORDS.find(w=>w.id===variant.wordId);
    assert.ok(word);assert.equal(variant.text.split(' ').length,2);
    assert.ok(variant.text.split(' ').includes(word.text));assert.equal(variant.icons.length,2);
    assert.equal(R_CLIPS[variant.clip],variant.text);
    const fresh=withRPhraseVariant(word,`r_phrase_${word.id}`,()=>.9);
    assert.notEqual(fresh.phraseClip,`r_phrase_${word.id}`);
    assert.equal(fresh.position,word.position);assert.equal(R_CLIPS[fresh.phraseClip],fresh.phrase);
    assert.notEqual(withRPhraseVariant(word,fresh.phraseClip,()=>.9).phraseClip,fresh.phraseClip);
  }
});

test('related tasks are deterministic, caller-independent and cannot add arbitrary markup or change difficulty',()=>{
  for(const [source,kinds] of [['listening-game',['']],['two-word',['']],['memory',['']],['furfangliget',['shop','machine','route']],['workshop',['sort','pattern','balance']],['r-practice',['hunter','post','workshop','rhyme','echo']]]){
    for(const kind of kinds){
      const first=nextTask(source,kind),second=nextTask(source,kind);assert.ok(first?.screen);assert.deepEqual(first,second);
      assert.ok(!Object.hasOwn(first,'level')&&!Object.hasOwn(first,'progress'));
      first.screen='mutated';assert.notEqual(nextTask(source,kind).screen,'mutated');
      assert.match(relatedTaskMarkup(source,kind),/Kapcsolódó játék/);
    }
  }
  for(const source of ['constructor','__proto__','<script>','unknown']){assert.equal(nextTask(source),null);assert.equal(relatedTaskMarkup(source),'');}
  assert.ok(!relatedTaskMarkup('memory','" onclick="evil').includes('onclick'));
  for(const [source,kind,mode] of [['puzzle','','classic'],['imitate','','classic'],['workshop','sort','classic'],['dress-game','','single']])assert.equal(nextTask(source,kind).mode,mode);
});
