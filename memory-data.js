import { ANIMAL_BOOK_ANIMALS } from './animal-book-data.js';

export const MEMORY_CLIPS = {
  memory_sound_name_start: 'Fordíts fel két kártyát! Keresd meg az állat hangját és a nevét!',
  memory_start: 'Keress egyforma képeket! Fordíts fel két kártyát!',
  memory_sound_start: 'Hallgass meg egy hangot, és keresd meg a képét!',
  memory_hint: 'Nézzük meg együtt a képeket! Jegyezd meg, melyik hol van!',
  memory_match: 'Ez egy pár! A két kép egyforma.',
  memory_done: 'Minden pár megvan! Szép munka!',
};
export const MEMORY_TIMING_KEY = 'beszedtanulas.memoryTiming.v1';
export const SOUND_MEMORY_KEY = 'beszedtanulas.memorySound.v1';
export const MEMORY_SIZES = Object.freeze([2, 3, 4, 6]);
// Hang–kép párok: animal sound + animal picture first, then animal sound + spoken name.
export const SOUND_MEMORY_LEVELS = Object.freeze([
  Object.freeze({ partner: 'picture', pairs: 3 }), Object.freeze({ partner: 'picture', pairs: 4 }), Object.freeze({ partner: 'picture', pairs: 6 }),
  Object.freeze({ partner: 'name', pairs: 3 }), Object.freeze({ partner: 'name', pairs: 4 }), Object.freeze({ partner: 'name', pairs: 6 }),
]);
// Every animal of the animal book has a real recorded sound and a recorded name.
export const MEMORY_ANIMALS = Object.freeze(ANIMAL_BOOK_ANIMALS.map(animal => Object.freeze({ id: animal.id, label: animal.label, emoji: animal.emoji })));

export function normalizeMemoryTiming(value) {
  return {
    mismatchMs: [1100, 2000, 3500].includes(value?.mismatchMs) ? value.mismatchMs : 1100,
    previewMs: [3500, 7000, 0].includes(value?.previewMs) ? value.previewMs : 3500,
  };
}
export function normalizeSoundMemoryLevel(value) {
  return Number.isInteger(value?.level) ? Math.max(0, Math.min(SOUND_MEMORY_LEVELS.length - 1, value.level)) : 0;
}

function shuffleWith(random) {
  return items => {
    const result = [...items];
    for (let i = result.length - 1; i > 0; i--) {
      const j = Math.min(i, Math.max(0, Math.floor(random() * (i + 1))));
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  };
}

// Stars count the wrong pairs: some are unavoidable, so up to half a miss per pair still earns five.
export function memoryStars(mismatches, pairs) {
  const ratio = Math.max(0, mismatches) / Math.max(1, pairs);
  return ratio <= .5 ? 5 : ratio <= 1 ? 4 : ratio <= 1.5 ? 3 : ratio <= 2.5 ? 2 : 1;
}
// A round with at most one miss per pair opens the next board size; a much harder round steps back.
export function nextMemoryPairs(pairs, mismatches) {
  const index = Math.max(0, MEMORY_SIZES.indexOf(pairs));
  if (mismatches <= pairs) return MEMORY_SIZES[Math.min(MEMORY_SIZES.length - 1, index + 1)];
  if (mismatches >= pairs * 3) return MEMORY_SIZES[Math.max(0, index - 1)];
  return MEMORY_SIZES[index];
}
export function nextSoundMemoryLevel(level, mismatches) {
  const { pairs } = SOUND_MEMORY_LEVELS[level] || SOUND_MEMORY_LEVELS[0];
  if (mismatches <= pairs) return Math.min(SOUND_MEMORY_LEVELS.length - 1, level + 1);
  if (mismatches >= pairs * 3) return Math.max(0, level - 1);
  return level;
}

// The chosen topic comes first; other pictures fill a board the topic is too small for.
export function buildMemoryDeck(pool, pairCount = 3, random = Math.random, extraPool = []) {
  const shuffle = shuffleWith(random);
  const unique = [...new Map(pool.map(word => [word.id, word])).values()];
  if (unique.length < 2) throw new Error('A párosítóhoz legalább két külön kép kell.');
  const ids = new Set(unique.map(word => word.id));
  const extra = [...new Map(extraPool.filter(word => !ids.has(word.id)).map(word => [word.id, word])).values()];
  const candidates = [...shuffle(unique), ...shuffle(extra)];
  const count = Math.min(candidates.length, MEMORY_SIZES.includes(pairCount) ? pairCount : 3);
  return shuffle(candidates.slice(0, count).flatMap(word => [0, 1].map(copy => ({ key: `${word.id}-${copy}`, word, kind: 'picture' }))));
}

// Face-down cards: one plays the animal's sound, its partner shows the animal or says its name.
// Keys are positions only, so the markup does not give the pairs away.
export function buildSoundMemoryDeck(levelIndex = 0, random = Math.random, animals = MEMORY_ANIMALS) {
  const shuffle = shuffleWith(random);
  const level = SOUND_MEMORY_LEVELS[levelIndex] || SOUND_MEMORY_LEVELS[0];
  const unique = [...new Map(animals.map(animal => [animal.id, animal])).values()];
  if (unique.length < 2) throw new Error('A hangos párosítóhoz legalább két állat kell.');
  const selected = shuffle(unique).slice(0, Math.min(unique.length, level.pairs));
  const cards = shuffle(selected.flatMap(word => [{ word, kind: 'sound' }, { word, kind: level.partner }]));
  return cards.map((card, index) => ({ ...card, key: `card-${index}` }));
}
export const isMemoryPair = (a, b) => a.key !== b.key && a.word.id === b.word.id && (a.kind === 'picture' && b.kind === 'picture' || a.kind !== b.kind);
