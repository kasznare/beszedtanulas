import { words, teddyRequests } from './game-data.js';
import { buildListeningRound } from './listening-game.js';

export const teddyFoods = words.filter(word => Object.hasOwn(teddyRequests, word.id));
const accusative = { alma: 'almát', kifli: 'kiflit', kenyer: 'kenyeret', tej: 'tejet', viz: 'vizet' };
export const TEDDY_CLIPS = { teddy_sequence_next: 'Az első finomság megvan! Most jöhet a második.', teddy_sequence_intro: 'Figyelj a sorrendre! Először az első finomságot add, aztán a másodikat!' };
for (const first of teddyFoods) for (const second of teddyFoods) {
  if (first.id !== second.id) TEDDY_CLIPS[`teddy_sequence_${first.id}_${second.id}`] = `Először ${accusative[first.id]} kérek, aztán ${accusative[second.id]}.`;
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
