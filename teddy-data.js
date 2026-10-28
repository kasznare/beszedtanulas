import { words, teddyRequests } from './game-data.js';
import { buildListeningRound } from './listening-game.js';

export const teddyFoods = words.filter(word => Object.hasOwn(teddyRequests, word.id));
export const teddyAccusative = { alma: 'almát', kifli: 'kiflit', kenyer: 'kenyeret', tej: 'tejet', viz: 'vizet' };
export const TEDDY_CLIPS = { teddy_expressive_intro: 'Most te kérsz a macitól! Válassz egy finomságot!', teddy_sequence_next: 'Az első finomság megvan! Most jöhet a második.', teddy_sequence_intro: 'Figyelj a sorrendre! Először az első finomságot add, aztán a másodikat!' };
for (const first of teddyFoods) for (const second of teddyFoods) {
  if (first.id !== second.id) TEDDY_CLIPS[`teddy_sequence_${first.id}_${second.id}`] = `Először ${teddyAccusative[first.id]} kérek, aztán ${teddyAccusative[second.id]}.`;
}

export const TEDDY_MAX_PLATES = teddyFoods.length;
export const TEDDY_SPAN = { min: 2, max: 4 };
// After Maci asks again for the same food, he never asks for a third helping in a row.
export const TEDDY_MORE_CHANCE = .25;
// At most this many helpings of one food reach the child's plate in the expressive mode.
export const TEDDY_MAX_HELPINGS = 3;

function shuffled(items, random) {
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const other = Math.floor(random() * (index + 1));
    [copy[index], copy[other]] = [copy[other], copy[index]];
  }
  return copy;
}

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

// One ladder for plate count and memory span: two clean answers in a row move up,
// two missed ones in a row move back down.
export function updateTeddyLadder({ level, clean: cleanStreak = 0, missed = 0 }, wasClean, { min, max }) {
  if (wasClean) {
    cleanStreak += 1; missed = 0;
    if (cleanStreak >= 2 && level < max) { level += 1; cleanStreak = 0; }
  } else {
    missed += 1; cleanStreak = 0;
    if (missed >= 2 && level > min) { level -= 1; missed = 0; }
  }
  return { level: clamp(level, min, max), clean: cleanStreak, missed };
}

export function teddyPlateRange(choiceCount = 2) {
  return { min: clamp(choiceCount === 3 ? 3 : 2, 2, TEDDY_MAX_PLATES), max: TEDDY_MAX_PLATES };
}

// A single request: one target, never the same food twice in a row unless Maci
// explicitly asks for more, and the plates are reshuffled every time.
export function buildTeddyRequest({ plates = 2, previousId = null, again = false, firstFoodId = null, random = Math.random } = {}) {
  const count = clamp(plates, 2, TEDDY_MAX_PLATES);
  const named = teddyFoods.find(food => food.id === (again ? previousId : firstFoodId));
  const pool = teddyFoods.filter(food => food.id !== previousId);
  const target = named || pool[Math.floor(random() * pool.length)];
  const distractors = shuffled(teddyFoods.filter(food => food.id !== target.id), random).slice(0, count - 1);
  return { target, targets: [target], choices: shuffled([target, ...distractors], random), again: Boolean(named && again) };
}

export function sequenceDistractorCount(span, choiceCount = 2) {
  return Math.max(1, Math.min(TEDDY_MAX_PLATES - span, choiceCount === 3 ? 2 : 1));
}

// An ordered request of `span` different foods, always with at least one plate
// that is not asked for, so the last food is never found by elimination.
export function buildSequenceRequest({ span = 2, choiceCount = 2, previousIds = [], random = Math.random } = {}) {
  const length = clamp(span, TEDDY_SPAN.min, Math.min(TEDDY_SPAN.max, TEDDY_MAX_PLATES - 1));
  let targets;
  for (let attempt = 0; attempt < 8; attempt += 1) {
    targets = shuffled(teddyFoods, random).slice(0, length);
    if (targets.map(food => food.id).join() !== previousIds.join()) break;
  }
  const extra = shuffled(teddyFoods.filter(food => !targets.includes(food)), random).slice(0, sequenceDistractorCount(length, choiceCount));
  return { target: targets[0], targets, choices: shuffled([...targets, ...extra], random) };
}

// Two foods have one recorded instruction; longer orders chain the single requests.
export function sequencePromptIds(targets, { intro = false } = {}) {
  const ids = targets.length === 2 ? [`teddy_sequence_${targets[0].id}_${targets[1].id}`] : targets.map(food => `teddy_${food.id}`);
  return intro ? ['teddy_sequence_intro', ...ids] : ids;
}

export function shouldAskForMore({ random = Math.random, last = false, previousWasMore = false } = {}) {
  return !last && !previousWasMore && random() < TEDDY_MORE_CHANCE;
}

export function teddyStars(clean, total) {
  if (!total) return 1;
  return clamp(Math.round(5 * clamp(clean, 0, total) / total), 1, 5);
}

// Kept for older callers: a whole single-food session built up front.
export function buildTeddyRound(length = 5, choiceCount = 2, mode = 'single', random = Math.random) {
  const total = [3, 5, 10].includes(length) ? length : 5;
  const rounds = [];
  for (let index = 0; index < total; index += 1) {
    rounds.push(mode === 'sequence'
      ? buildSequenceRequest({ span: 2, choiceCount, previousIds: rounds.at(-1)?.targets.map(food => food.id), random })
      : buildTeddyRequest({ plates: choiceCount, previousId: rounds.at(-1)?.target.id, random }));
  }
  return rounds;
}

// In expressive play the child chooses the food; target is only a way to rotate
// the available plates, never an answer that can be wrong.
export function buildExpressiveTeddyRound(length = 5, choiceCount = 2, firstFoodId = null, random = Math.random) {
  return buildListeningRound(teddyFoods, length, choiceCount, random, 'different', firstFoodId)
    .map(({ choices }) => ({ choices, targets: [] }));
}

export function teddyFoodForPhrase(phraseId) {
  const named = { kerek_vizet: 'viz', kerek_almat: 'alma', kerek_tejet: 'tej', kerek_kiflit: 'kifli', kerek_kenyeret: 'kenyer', meg_alma: 'alma', adj_vizet: 'viz', piros_alma: 'alma', meleg_tej: 'tej' };
  return named[phraseId] || null;
}
