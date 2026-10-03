import test from 'node:test';
import assert from 'node:assert/strict';
import { buildMemoryDeck } from '../memory-data.js';
import { words, wordCategories } from '../game-data.js';

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
test('duplicate content cannot create extra pairs or an ambiguous deck', () => {
  assert.throws(() => buildMemoryDeck([words[0], words[0]]), /két külön kép/);
  const deck = buildMemoryDeck([words[0], words[0], words[1]], 6, () => 0);
  assert.equal(deck.length, 4);
  assert.equal(new Set(deck.map(card => card.key)).size, 4);
});
