import { words, wordCategories } from './game-data.js';
import { ANIMAL_BOOK_ANIMALS, ANIMAL_BOOK_AUDIO } from './animal-book-data.js';
import { allDressItems } from './dress-data.js';

// Beszélő képek topics. Practice words keep their own `word_*` recordings and stay
// the only words in `wordCategories`, so listening, memory, flip, number and teddy
// pools are unchanged. Extra cards reuse recordings made for other games: `clip` is
// the voice id to say and `sound` an optional animal sound played after the name.
const practiceCard = id => {
  const word = words.find(item => item.id === id);
  return { ...word, practiceId: word.id };
};
const PICTURES = { cat: 'cica', dog: 'kutya' };
const PRACTICE = { cat: 'cica', dog: 'kutya' };
const animalCards = ANIMAL_BOOK_ANIMALS.map(animal => ({
  id: `abk_${animal.id}`, label: animal.label.toLocaleLowerCase('hu'), emoji: animal.emoji,
  clip: `abk_name_${animal.id}`, sound: ANIMAL_BOOK_AUDIO[animal.id],
  ...(PICTURES[animal.id] ? { pictureId: PICTURES[animal.id] } : {}),
  ...(PRACTICE[animal.id] ? { practiceId: PRACTICE[animal.id] } : {}),
}));
const R_CARDS = {
  korte: ['körte', '🍐'], barack: ['barack', '🍑'], torta: ['torta', '🎂'], perec: ['perec', '🥨'], repa: ['répa', '🥕'], banan: ['banán', '🍌'],
  raketa: ['rakéta', '🚀'], robot: ['robot', '🤖'], roller: ['roller', '🛴'], erdo: ['erdő', '🌲'], rozsa: ['rózsa', '🌹'],
};
const rCard = id => ({ id: `r_${id}`, label: R_CARDS[id][0], emoji: R_CARDS[id][1], clip: `r_word_${id}` });
const DRESS_EMOJI = { polo: '👕', sal: '🧣', esokabat: '🧥', gumicsizma: '👢', napkalap: '👒', rovidnadrag: '🩳', szandal: '🩴' };
const dressCard = id => ({ id: `dress_${id}`, label: allDressItems.find(item => item.id === id).label, emoji: DRESS_EMOJI[id], dressIcon: id, clip: `dress_name_${id}` });

const extra = {
  animals: animalCards,
  food: ['korte', 'barack', 'torta', 'perec', 'repa', 'banan'].map(rCard),
  play: ['raketa', 'robot', 'roller'].map(rCard),
  nature: ['erdo', 'rozsa'].map(rCard),
};
export const CARD_TOPICS = Object.freeze([
  ...wordCategories.map(category => ({
    id: category.id, label: category.label,
    // The animal book replaces the two practice animals with its own cat and dog.
    cards: category.id === 'animals' ? extra.animals : [...category.words.map(practiceCard), ...(extra[category.id] || [])],
  })),
  { id: 'clothes', label: '👕 Ruhák', cards: [practiceCard('sapka'), practiceCard('cipo'), ...['polo', 'sal', 'esokabat', 'gumicsizma', 'napkalap', 'rovidnadrag', 'szandal'].map(dressCard)] },
].map(topic => Object.freeze({ ...topic, cards: Object.freeze(topic.cards.map(card => Object.freeze(card))) })));

export function cardTopic(id) {
  return CARD_TOPICS.find(topic => topic.id === id) || CARD_TOPICS[0];
}

// Kukucs: after every card of a topic was heard, three "Hol van?" questions on it.
export const CARD_PEEK_LENGTH = 3;
function shuffled(items, random) {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.min(i, Math.max(0, Math.floor(random() * (i + 1))));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}
export function buildCardPeek(cards, random = Math.random) {
  const targets = shuffled(cards, random).slice(0, CARD_PEEK_LENGTH);
  return targets.map(target => ({
    targetId: target.id,
    choices: shuffled([target, ...shuffled(cards.filter(card => card.id !== target.id), random).slice(0, 2)], random).map(card => card.id),
  }));
}
export function cardPeekReady(cards, heard) {
  return cards.length > 0 && cards.every(card => heard.has(card.id));
}
export function cardPeekStars(firstTry) {
  return Math.max(1, Math.min(CARD_PEEK_LENGTH, Number.isInteger(firstTry) ? firstTry : 0));
}
