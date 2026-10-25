import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { words, wordCategories, twoWordPhrases } from '../game-data.js';
import { VOICE_CLIPS } from '../voice-library.js';
import {
  buildListeningRound, buildListeningChoices, buildListeningBingo, bingoLines, hasBingo, bingoStars, adaptChoiceLevel, roundStars,
  PHRASE_LISTENING_SETS, phraseListeningItem, sharesPhrasePart, buildPhraseTargets, buildPhraseChoices, phrasePictureMarkup, normalizeListeningLevels,
} from '../listening-game.js';

const seeded = (seed = 1) => () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };

test('every topic and level has distinct choices and exactly one valid target', () => {
  for (const category of wordCategories) {
    const pool = words.filter(word => category.words.includes(word.id));
    for (const length of [3, 5, 10]) for (const choiceCount of [2, 3, 4]) {
      const round = buildListeningRound(pool, length, choiceCount);
      assert.equal(round.length, length);
      for (const [index, question] of round.entries()) {
        assert.equal(question.choices.length, Math.min(pool.length, choiceCount));
        assert.equal(new Set(question.choices.map(word => word.id)).size, question.choices.length);
        assert.equal(question.choices.filter(word => word.id === question.target.id).length, 1);
        assert.ok(question.choices.every(word => category.words.includes(word.id)));
        if (index) assert.notEqual(question.target.id, round[index - 1].target.id);
      }
    }
  }
});

test('cycles cover a topic before repeating and do not mutate shared content', () => {
  const pool = Object.freeze(words.slice(0, 4));
  const original = JSON.stringify(pool);
  const round = buildListeningRound(pool, 10, 3, () => .5);
  assert.equal(new Set(round.slice(0, 4).map(question => question.target.id)).size, 4);
  assert.equal(new Set(round.slice(4, 8).map(question => question.target.id)).size, 4);
  assert.equal(JSON.stringify(pool), original);
});

test('duplicate content cannot create identical answers or a one-picture game', () => {
  assert.throws(() => buildListeningRound([words[0], words[0]]), /két külön kép/);
  const round = buildListeningRound([words[0], words[0], words[1]], 10, 3, () => .99);
  assert.ok(round.every(question => question.choices.length === 2));
  assert.ok(round.every((question, index) => !index || question.target.id !== round[index - 1].target.id));
});

test('answer placement varies with the shuffle, not with target identity', () => {
  const pool = words.slice(0, 3);
  const first = buildListeningRound(pool, 3, 3, () => 0);
  const last = buildListeningRound(pool, 3, 3, () => .99);
  assert.notEqual(first[0].choices.findIndex(word => word.id === first[0].target.id), last[0].choices.findIndex(word => word.id === last[0].target.id));
});

test('choice counts stay between two and four pictures', () => {
  assert.equal(buildListeningChoices(words, words[0], 9).length, 4);
  assert.equal(buildListeningChoices(words, words[0], 1).length, 2);
});

test('three first-try answers in a row add a picture, two misses take one away', () => {
  let level = { choices: 2, streak: 0, missRun: 0 };
  for (let i = 0; i < 2; i++) { level = adaptChoiceLevel(level, { firstTry: true }); assert.equal(level.choices, 2); }
  level = adaptChoiceLevel(level, { firstTry: true });
  assert.deepEqual([level.choices, level.change], [3, 1]);
  for (let i = 0; i < 3; i++) level = adaptChoiceLevel(level, { firstTry: true });
  assert.equal(level.choices, 4);
  for (let i = 0; i < 6; i++) level = adaptChoiceLevel(level, { firstTry: true });
  assert.equal(level.choices, 4, 'never more than four pictures');
  level = adaptChoiceLevel(level, { firstTry: false, misses: 2 });
  assert.deepEqual([level.choices, level.change], [3, -1], 'two misses on one picture');
  level = adaptChoiceLevel(level, { firstTry: false, misses: 1 });
  assert.equal(level.choices, 3);
  level = adaptChoiceLevel(level, { firstTry: false, misses: 1 });
  assert.equal(level.choices, 2, 'two misses in a row');
  level = adaptChoiceLevel(level, { firstTry: false, misses: 5 });
  assert.equal(level.choices, 2, 'never fewer than two pictures');
  level = adaptChoiceLevel({ choices: 3, streak: 2, missRun: 1 }, { firstTry: true });
  assert.equal(level.missRun, 0, 'a first-try answer forgives an earlier miss');
  assert.equal(adaptChoiceLevel({ choices: 2, streak: 2 }, { firstTry: true }, { max: 2 }).choices, 2, 'small topics stay at their size');
});

test('stars follow the share of first-try answers', () => {
  assert.equal(roundStars(5, 5), 5);
  assert.equal(roundStars(3, 3), 5);
  assert.equal(roundStars(3, 5), 3);
  assert.equal(roundStars(5, 10), 3);
  assert.equal(roundStars(0, 5), 1);
  assert.deepEqual([bingoStars(0), bingoStars(2), bingoStars(9)], [5, 3, 1]);
});

test('bingo boards come from the topic first and calls include pictures that are not on the board', () => {
  for (const category of wordCategories) for (const size of [2, 3]) for (let seed = 1; seed <= 25; seed++) {
    const pool = words.filter(word => category.words.includes(word.id));
    const first = pool[seed % pool.length];
    const { board, calls, size: side } = buildListeningBingo(pool, size, seeded(seed), words, first.id);
    assert.equal(side, size);
    assert.equal(board.length, size * size);
    assert.equal(new Set(board.map(word => word.id)).size, board.length);
    const topicOnBoard = board.filter(word => pool.includes(word)).length;
    assert.equal(topicOnBoard, Math.min(pool.length, size * size), 'topic pictures fill the board first');
    const boardIds = new Set(board.map(word => word.id));
    const onBoard = calls.filter(call => call.onBoard), decoys = calls.filter(call => !call.onBoard);
    assert.deepEqual(new Set(onBoard.map(call => call.word.id)), boardIds, 'every board picture is called once');
    assert.equal(onBoard.length, board.length);
    assert.equal(decoys.length, size === 3 ? 3 : 2);
    assert.ok(decoys.every(call => !boardIds.has(call.word.id)), 'decoys are never on the board');
    assert.equal(new Set(decoys.map(call => call.word.id)).size, decoys.length);
    assert.equal(calls[0].word.id, first.id, 'the launched word is called first');
    assert.ok(calls[0].onBoard);
    assert.equal(calls[1].onBoard, false, 'the second call asks for a decision');
    assert.ok(calls.every((call, i) => call.onBoard || calls[i - 1].onBoard), 'never two decoys in a row');
    // Every decoy comes within the first size+1 board calls, before any line can be complete for sure.
    assert.ok(decoys.every(call => calls.slice(0, calls.indexOf(call)).filter(c => c.onBoard).length <= size + 1));
  }
});

test('bingo lines are rows and columns, not diagonals', () => {
  assert.deepEqual(bingoLines(2), [[0, 1], [2, 3], [0, 2], [1, 3]]);
  assert.equal(bingoLines(3).length, 6);
  assert.deepEqual(hasBingo(new Set([0, 1]), 2), [0, 1]);
  assert.deepEqual(hasBingo(new Set([1, 3]), 2), [1, 3]);
  assert.equal(hasBingo(new Set([0, 3]), 2), null);
  assert.equal(hasBingo(new Set([0, 4, 8]), 3), null);
  assert.deepEqual(hasBingo(new Set([2, 5, 8, 0]), 3), [2, 5, 8]);
});

test('bingo needs more pictures than its board', () => {
  assert.throws(() => buildListeningBingo(words.slice(0, 4), 2), /több kép/);
  assert.equal(buildListeningBingo(words.slice(0, 2), 2, Math.random, words).board.length, 4);
});

test('Két szó uses recorded two-word phrases whose pictures share a part', () => {
  for (const set of PHRASE_LISTENING_SETS) {
    assert.ok(set.length >= 2);
    const items = set.map(phraseListeningItem);
    for (const item of items) {
      assert.ok(twoWordPhrases.some(phrase => phrase.id === item.id));
      assert.ok(VOICE_CLIPS[`phrase_${item.id}`], `recorded phrase ${item.id}`);
    }
    assert.ok(items.some(a => items.some(b => sharesPhrasePart(a, b))), `${set.join()} shares a word or picture`);
  }
  for (const [a, b] of [['cica_alszik', 'baba_alszik'], ['nagy_auto', 'nagy_labda'], ['kerek_almat', 'kerek_tejet'], ['kerek_almat', 'meg_alma']]) assert.ok(sharesPhrasePart(phraseListeningItem(a), phraseListeningItem(b)));
  assert.equal(new Set(PHRASE_LISTENING_SETS.flat()).size, PHRASE_LISTENING_SETS.flat().length, 'a phrase belongs to one set');
});

test('Két szó questions offer the target and a look-alike from its set', () => {
  const targets = buildPhraseTargets(10, seeded(3));
  assert.equal(targets.length, 10);
  assert.ok(targets.every((target, i) => !i || target.id !== targets[i - 1].id));
  for (const id of PHRASE_LISTENING_SETS.flat()) for (const count of [2, 3, 4]) {
    const target = phraseListeningItem(id), set = PHRASE_LISTENING_SETS.find(entry => entry.includes(id));
    const choices = buildPhraseChoices(target, count, seeded(count));
    assert.equal(choices.length, Math.min(set.length, count, 3));
    assert.equal(choices.filter(choice => choice.id === id).length, 1);
    assert.ok(choices.every(choice => set.includes(choice.id)));
    const sharing = set.filter(other => sharesPhrasePart(target, phraseListeningItem(other)));
    if (count === 2 && sharing.length) assert.ok(sharesPhrasePart(target, choices.find(choice => choice.id !== id)), `${id}: the one distractor shares a part`);
  }
  assert.match(phrasePictureMarkup(phraseListeningItem('cica_alszik')), /<svg[^>]*word-picture/);
  assert.match(phrasePictureMarkup(phraseListeningItem('cica_alszik')), /💤/);
});

test('saved picture counts reset when the parent changes the starting count', () => {
  assert.deepEqual(normalizeListeningLevels({ base: 2, choices: 4, bingoSize: 3, phraseChoices: 3 }, 2), { base: 2, choices: 4, phraseChoices: 3, bingoSize: 3 });
  assert.equal(normalizeListeningLevels({ base: 2, choices: 4 }, 3).choices, 3);
  assert.deepEqual(normalizeListeningLevels('x', 9), { base: 3, choices: 3, phraseChoices: 2, bingoSize: 2 });
});

test('the game advances by itself and the bingo guide and decision button are wired', () => {
  const source = readFileSync(new URL('../listening-game.js', import.meta.url), 'utf8');
  assert.doesNotMatch(source, /listening-next/, 'no Next button to press after a right answer');
  assert.match(source, /scheduleAdvance\(playCorrect\(\)\)/);
  assert.match(source, /speak\?\.\('listening_bingo_start'\)/);
  assert.match(source, /Nincs nálam/);
  assert.doesNotMatch(readFileSync(new URL('../index.html', import.meta.url), 'utf8'), /listening-next/);
});
