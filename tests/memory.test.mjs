import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import {
  buildMemoryDeck, buildSoundMemoryDeck, normalizeMemoryTiming, normalizeSoundMemoryLevel, isMemoryPair, memoryStars, nextMemoryPairs, nextSoundMemoryLevel,
  MEMORY_ANIMALS, SOUND_MEMORY_LEVELS, MEMORY_SIZES,
} from '../memory-data.js';
import { words, wordCategories } from '../game-data.js';
import { VOICE_CLIPS } from '../voice-library.js';

test('memory decks contain exactly two of every selected image at every supported size/topic', () => {
  for (const category of wordCategories) for (const pairs of [2, 3, 4, 6]) {
    const pool = words.filter(word => category.words.includes(word.id));
    const original = JSON.stringify(pool), deck = buildMemoryDeck(pool, pairs);
    assert.equal(deck.length, Math.min(pool.length, pairs) * 2);
    assert.equal(new Set(deck.map(card => card.key)).size, deck.length);
    for (const id of new Set(deck.map(card => card.word.id))) assert.equal(deck.filter(card => card.word.id === id).length, 2);
    assert.equal(JSON.stringify(pool), original);
  }
});
test('a small topic is filled up to the level size, topic pictures first', () => {
  for (const category of wordCategories) for (const pairs of MEMORY_SIZES) {
    const pool = words.filter(word => category.words.includes(word.id));
    const deck = buildMemoryDeck(pool, pairs, Math.random, words);
    const ids = new Set(deck.map(card => card.word.id));
    assert.equal(deck.length, pairs * 2, `${category.id}: ${pairs} pairs`);
    assert.equal([...ids].filter(id => category.words.includes(id)).length, Math.min(pool.length, pairs));
  }
});
test('memory timing accepts only the supported viewing choices', () => {
  assert.deepEqual(normalizeMemoryTiming({ mismatchMs: 3500, previewMs: 0 }), { mismatchMs: 3500, previewMs: 0 });
  assert.deepEqual(normalizeMemoryTiming({ mismatchMs: -1, previewMs: '0' }), { mismatchMs: 1100, previewMs: 3500 });
});
test('duplicate content cannot create extra pairs or an ambiguous deck', () => {
  assert.throws(() => buildMemoryDeck([words[0], words[0]]), /két külön kép/);
  const deck = buildMemoryDeck([words[0], words[0], words[1]], 6, () => 0);
  assert.equal(deck.length, 4);
  assert.equal(new Set(deck.map(card => card.key)).size, 4);
});
test('classic memory moves up a size after a good round and stars come from mismatches', () => {
  assert.deepEqual([2, 3, 4, 6].map(pairs => nextMemoryPairs(pairs, pairs)), [3, 4, 6, 6]);
  assert.equal(nextMemoryPairs(3, 4), 3);
  assert.equal(nextMemoryPairs(3, 9), 2);
  assert.equal(nextMemoryPairs(2, 9), 2);
  assert.deepEqual([0, 2, 4, 6, 10, 20].map(m => memoryStars(m, 4)), [5, 5, 4, 3, 2, 1]);
});
test('sound memory pairs an animal sound with its picture, then with its spoken name', () => {
  assert.equal(MEMORY_ANIMALS.length, 12);
  for (const animal of MEMORY_ANIMALS) {
    assert.ok(existsSync(new URL(`../audio/animals/${animal.id}.mp3`, import.meta.url)), `${animal.id} sound`);
    assert.ok(VOICE_CLIPS[`abk_name_${animal.id}`], `${animal.id} name`);
  }
  assert.deepEqual(SOUND_MEMORY_LEVELS.map(level => `${level.partner}${level.pairs}`), ['picture3', 'picture4', 'picture6', 'name3', 'name4', 'name6']);
  for (const [index, level] of SOUND_MEMORY_LEVELS.entries()) for (let seed = 0; seed < 5; seed++) {
    const deck = buildSoundMemoryDeck(index, () => (seed + .5) / 6);
    assert.equal(deck.length, level.pairs * 2);
    assert.equal(new Set(deck.map(card => card.key)).size, deck.length);
    assert.ok(deck.every(card => /^card-\d+$/.test(card.key)), 'keys never name the animal');
    for (const id of new Set(deck.map(card => card.word.id))) {
      const cards = deck.filter(card => card.word.id === id);
      assert.deepEqual(cards.map(card => card.kind).sort(), [level.partner, 'sound'].sort());
      assert.ok(isMemoryPair(cards[0], cards[1]));
    }
    const sounds = deck.filter(card => card.kind === 'sound');
    assert.ok(!isMemoryPair(sounds[0], sounds[1]), 'two sounds never make a pair');
  }
  assert.ok(isMemoryPair({ key: 'a-0', word: words[0], kind: 'picture' }, { key: 'a-1', word: words[0], kind: 'picture' }));
  assert.ok(!isMemoryPair({ key: 'a-0', word: words[0], kind: 'picture' }, { key: 'a-0', word: words[0], kind: 'picture' }));
  assert.deepEqual([nextSoundMemoryLevel(0, 3), nextSoundMemoryLevel(5, 0), nextSoundMemoryLevel(3, 5), nextSoundMemoryLevel(3, 9)], [1, 5, 3, 2]);
  assert.deepEqual([normalizeSoundMemoryLevel({ level: 4 }), normalizeSoundMemoryLevel({ level: 99 }), normalizeSoundMemoryLevel(null)], [4, 5, 0]);
});
test('the game leaves "memory_done" to the round dialog and praises each pair', () => {
  const source = readFileSync(new URL('../memory-game.js', import.meta.url), 'utf8');
  const complete = source.slice(source.indexOf('function complete('), source.indexOf('function flip('));
  assert.doesNotMatch(complete, /(say|speak)\(\s*'memory_done'/,'completion does not speak memory_done itself');
  assert.match(source, /'memory_match'/);
  assert.doesNotMatch(source, /data-pairs/, 'no child-visible pair-count menu');
  assert.match(source, /previewUsed/);
  const app = readFileSync(new URL('../app.js', import.meta.url), 'utf8');
  assert.equal(app.match(/speakVoice\('memory_done'\)/g).length, 1);
});
