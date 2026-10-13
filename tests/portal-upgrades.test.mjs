import test from 'node:test';
import assert from 'node:assert/strict';
import { words, wordCategories } from '../game-data.js';
import { illustratedWordIds, wordPicture } from '../word-art.js';
import { normalizePracticeSettings } from '../portal-practice-data.js';
import { buildListeningRound } from '../listening-game.js';
import { buildNumberChoices, newNumberSession, normalizeNumberProgress, validateNumberProgress } from '../number-data.js';
import { createProgressBackup, parseProgressBackup, snapshotProgress } from '../progress-data.js';

test('every teaching word has a portable drawing; water and milk remain distinct', () => {
  assert.deepEqual([...illustratedWordIds].sort(), words.map(w=>w.id).sort());
  for (const word of words) assert.match(wordPicture(word), /^<svg /);
  assert.notEqual(wordPicture({id:'viz'}), wordPicture({id:'tej'}));
  assert.ok(!wordPicture({emoji:'<script>'}).includes('<script>'));
});

test('favorites retain only five unique known words and old settings start without a microphone', () => {
  const settings=normalizePracticeSettings({favoriteWords:['unknown','viz','viz',...words.map(w=>w.id)]});
  assert.equal(settings.favoriteWords.length,5);
  assert.equal(new Set(settings.favoriteWords).size,5);
  assert.ok(settings.favoriteWords.every(id=>words.some(w=>w.id===id)));
  assert.equal(settings.wordPracticeMode,'together');
  assert.equal(settings.phrasePracticeMode,'together');
});

test('launching from any picture always starts with that picture, even in a short round', () => {
  for(const word of words){
    const round=buildListeningRound(words,3,3,()=>.1,'different',word.id);
    assert.equal(round[0].target.id,word.id);
    assert.ok(round.every((question,index)=>!index||question.target.id!==round[index-1].target.id));
  }
});

test('listening difficulty chooses same-topic or different-topic distractors when available', () => {
  for(const difficulty of ['similar','different']){
    const question=buildListeningRound(words,3,3,()=>.2,difficulty,'alma')[0];
    const food=wordCategories.find(c=>c.id==='food').words;
    for(const word of question.choices.filter(w=>w.id!=='alma'))assert.equal(food.includes(word.id),difficulty==='similar');
  }
});

test('quantity answers stay unique and use the requested nearby or distant distractors', () => {
  for(const limit of [3,5,10])for(let target=1;target<=limit;target++)for(const difficulty of ['wide','close']){
    const choices=buildNumberChoices(target,limit,difficulty,()=>.1);
    assert.equal(choices.length,difficulty==='wide'?2:3);
    assert.equal(new Set(choices).size,choices.length);
    assert.ok(choices.includes(target));
    const distances=choices.filter(n=>n!==target).map(n=>Math.abs(n-target)).sort((a,b)=>a-b);
    const possible=Array.from({length:limit},(_,i)=>i+1).filter(n=>n!==target).map(n=>Math.abs(n-target)).sort((a,b)=>a-b);
    assert.deepEqual(distances,difficulty==='wide'?[possible.at(-1)]:possible.slice(0,2));
  }
});

test('number tasks and per-quantity results survive export and profile snapshots without sharing references', () => {
  const progress=snapshotProgress();
  progress.numbers.sessions.count={...newNumberSession('count',5,3),counted:[2,0]};
  progress.numbers.stats.count[3].independent=2;
  const restored=parseProgressBackup(JSON.stringify(createProgressBackup(progress))).progress;
  assert.deepEqual(restored.numbers,progress.numbers);
  restored.numbers.sessions.count.counted.push(1);
  assert.deepEqual(progress.numbers.sessions.count.counted,[2,0]);
});

test('invalid completed tasks and forged quantities cannot enter an imported backup', () => {
  const base=normalizeNumberProgress();
  base.sessions.count=newNumberSession('count',5,3);
  for(const patch of [{amount:11},{counted:[0,0]},{counted:[0,1,2]},{solved:true},{completed:3,rewarded:false},{rewarded:true}]){
    const bad=structuredClone(base);Object.assign(bad.sessions.count,patch);
    assert.throws(()=>validateNumberProgress(bad));
    assert.doesNotThrow(()=>validateNumberProgress(normalizeNumberProgress(bad)));
  }
  assert.doesNotThrow(()=>validateNumberProgress(base));
  assert.doesNotThrow(()=>validateNumberProgress(undefined));
});
