import test from 'node:test';
import assert from 'node:assert/strict';
import { access } from 'node:fs/promises';
import { words, wordCategories } from '../game-data.js';
import { VOICE_CLIPS } from '../voice-library.js';
import { CARD_TOPICS, cardTopic, buildCardPeek, cardPeekReady, cardPeekStars, CARD_PEEK_LENGTH } from '../word-cards.js';
import { normalizeRoute } from '../navigation.js';

const root = new URL('../', import.meta.url);
const topic = id => CARD_TOPICS.find(item => item.id === id);
function seeded(seed) {
  let value = seed;
  return () => { value = (value * 1103515245 + 12345) % 2147483648; return value / 2147483648; };
}

test('every picture card plays an existing recording whose text matches the card', async () => {
  for (const item of CARD_TOPICS) {
    assert.ok(item.cards.length >= 4, `${item.id} has enough cards for Kukucs`);
    assert.equal(new Set(item.cards.map(card => card.id)).size, item.cards.length, `${item.id}: unique cards`);
    for (const card of item.cards) {
      const clip = card.clip || `word_${card.id}`;
      assert.ok(VOICE_CLIPS[clip], `${card.id}: ${clip} is recorded`);
      assert.equal(VOICE_CLIPS[clip].text.toLocaleLowerCase('hu'), card.label.toLocaleLowerCase('hu'), `${card.id}: shown word and recording agree`);
      await access(new URL(VOICE_CLIPS[clip].file, root));
      if (card.sound) await access(new URL(card.sound, root));
      if (card.practiceId) assert.ok(words.some(word => word.id === card.practiceId), `${card.id}: practice link is a practice word`);
    }
  }
});

test('topics are larger: twelve book animals, a clothes topic and R-words for food and toys', () => {
  const animals = topic('animals');
  assert.equal(animals.cards.length, 12);
  assert.ok(animals.cards.every(card => card.clip.startsWith('abk_name_') && card.sound.startsWith('./audio/animals/')));
  assert.deepEqual(animals.cards.filter(card => card.practiceId).map(card => card.practiceId).sort(), ['cica', 'kutya'], 'the book cat and dog still open the word practice');
  const clothes = topic('clothes');
  assert.ok(clothes.cards.length >= 8 && clothes.cards.filter(card => card.clip).every(card => card.clip.startsWith('dress_name_')));
  for (const [id, wanted] of [['food', ['körte', 'barack', 'torta', 'perec']], ['play', ['rakéta', 'robot', 'roller']]]) {
    const labels = topic(id).cards.map(card => card.label);
    for (const label of wanted) assert.ok(labels.includes(label), `${id} has ${label}`);
    assert.ok(topic(id).cards.some(card => card.clip?.startsWith('r_word_')));
  }
  assert.equal(cardTopic('unknown').id, 'all');
});

test('the shared practice word pool stays unchanged for listening, memory, flip, number and teddy games', () => {
  assert.equal(words.length, 24);
  const practiceIds = new Set(words.map(word => word.id));
  for (const category of wordCategories) assert.ok(category.words.every(id => practiceIds.has(id)));
  assert.ok(!wordCategories.some(category => category.id === 'clothes'), 'card-only topics never become practice topics');
  for (const category of wordCategories) {
    const practiceCards = topic(category.id).cards.filter(card => !card.clip).map(card => card.id);
    assert.ok(practiceCards.every(id => category.words.includes(id)));
  }
  assert.equal(normalizeRoute({ screen: 'cards', category: 'clothes' }).category, 'clothes', 'the clothes topic survives back navigation and reload');
});

test('Kukucs opens only after every card was heard and asks three different words from the topic', () => {
  const cards = topic('animals').cards, heard = new Set();
  assert.equal(cardPeekReady(cards, heard), false);
  for (const card of cards.slice(0, -1)) heard.add(card.id);
  assert.equal(cardPeekReady(cards, heard), false);
  heard.add(cards.at(-1).id);
  assert.equal(cardPeekReady(cards, heard), true);
  assert.equal(cardPeekReady([], heard), false);
  for (const item of CARD_TOPICS) for (let seed = 1; seed < 20; seed++) {
    const peek = buildCardPeek(item.cards, seeded(seed));
    assert.equal(peek.length, CARD_PEEK_LENGTH);
    assert.equal(new Set(peek.map(question => question.targetId)).size, 3);
    for (const question of peek) {
      assert.equal(question.choices.length, 3);
      assert.equal(new Set(question.choices).size, 3);
      assert.ok(question.choices.includes(question.targetId));
      assert.ok(question.choices.every(id => item.cards.some(card => card.id === id)));
    }
  }
  assert.equal(cardPeekStars(3), 3); assert.equal(cardPeekStars(0), 1); assert.equal(cardPeekStars(7), 3);
});
