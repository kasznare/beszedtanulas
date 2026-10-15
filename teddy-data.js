import { words, teddyRequests } from './game-data.js';
import { buildListeningRound } from './listening-game.js';

export const teddyFoods = words.filter(word => Object.hasOwn(teddyRequests, word.id));
export const teddyAccusative = { alma: 'almát', kifli: 'kiflit', kenyer: 'kenyeret', tej: 'tejet', viz: 'vizet' };
export const TEDDY_CLIPS = { teddy_sequence_next: 'Az első finomság megvan! Most jöhet a második.', teddy_sequence_intro: 'Figyelj a sorrendre! Először az első finomságot add, aztán a másodikat!' };
for (const first of teddyFoods) for (const second of teddyFoods) {
  if (first.id !== second.id) TEDDY_CLIPS[`teddy_sequence_${first.id}_${second.id}`] = `Először ${teddyAccusative[first.id]} kérek, aztán ${teddyAccusative[second.id]}.`;
}

export function buildTeddyRound(length = 5, choiceCount = 2, mode = 'single', random = Math.random) {
  return buildListeningRound(teddyFoods, length, choiceCount, random).map(question => {
    const targets = [question.target];
    if (mode === 'sequence') {
      // Keep both requested foods available, without duplicate answers.
      const alternatives = question.choices.filter(food => food.id !== question.target.id);
      targets.push(alternatives[Math.floor(random() * alternatives.length)]);
    }
    return { ...question, targets };
  });
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
