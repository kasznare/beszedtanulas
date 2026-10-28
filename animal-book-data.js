export const ANIMAL_BOOK_STORAGE_KEY = 'beszedtanulas.animalBook.v1';

// Percentages describe the pictured animal's full hit area, not a floating card.
// Keep these rectangles inside the image when adjusting them to the final artwork.
const pages = [
  {
    id: 'farm', title: 'Tanya', subtitle: 'Koppints a tehénre, a lóra vagy a bárányra!',
    image: './assets/animal-book/farm.webp', accent: '#886241', tint: '#f1e4c8',
    animals: [
      { id: 'cow', label: 'Tehén', emoji: '🐄', x: 2, y: 30, width: 40, height: 61 },
      { id: 'horse', label: 'Ló', emoji: '🐎', x: 60, y: 15, width: 30, height: 43 },
      { id: 'sheep', label: 'Bárány', emoji: '🐑', x: 68, y: 58, width: 31, height: 31 },
    ],
  },
  {
    id: 'garden', title: 'Kert', subtitle: 'A kutya, a cica és a tyúk is megszólal.',
    image: './assets/animal-book/garden.webp', accent: '#567652', tint: '#e3edcf',
    animals: [
      { id: 'dog', label: 'Kutya', emoji: '🐕', x: 7, y: 39, width: 35, height: 49 },
      { id: 'cat', label: 'Cica', emoji: '🐈', x: 53, y: 21, width: 19, height: 30 },
      { id: 'chicken', label: 'Tyúk', emoji: '🐔', x: 66, y: 52, width: 23, height: 41 },
    ],
  },
  {
    id: 'pond', title: 'Tópart', subtitle: 'Hallgasd meg a kacsát, a békát és a libát!',
    image: './assets/animal-book/pond.webp', accent: '#4e7a7a', tint: '#dceceb',
    animals: [
      { id: 'duck', label: 'Kacsa', emoji: '🦆', x: 2, y: 44, width: 32, height: 30 },
      { id: 'frog', label: 'Béka', emoji: '🐸', x: 42, y: 67, width: 19, height: 23 },
      { id: 'goose', label: 'Liba', emoji: '🪿', x: 70, y: 12, width: 26, height: 49 },
    ],
  },
  {
    id: 'forest', title: 'Erdő', subtitle: 'A bagoly, a kakukk és a farkas hangja vár.',
    image: './assets/animal-book/forest.webp', accent: '#65735f', tint: '#e2e9dc',
    animals: [
      { id: 'owl', label: 'Bagoly', emoji: '🦉', x: 14, y: 4, width: 18, height: 25 },
      { id: 'cuckoo', label: 'Kakukk', emoji: '🐦', x: 76, y: 5, width: 18, height: 34 },
      { id: 'wolf', label: 'Farkas', emoji: '🐺', x: 47, y: 50, width: 41, height: 40 },
    ],
  },
];
export const ANIMAL_BOOK_PAGES = Object.freeze(pages.map(page => Object.freeze({ ...page, animals: Object.freeze(page.animals.map(animal => Object.freeze(animal))) })));
export const ANIMAL_BOOK_ANIMALS = Object.freeze(ANIMAL_BOOK_PAGES.flatMap(page => page.animals));
export const ANIMAL_BOOK_AUDIO = Object.freeze(Object.fromEntries(ANIMAL_BOOK_ANIMALS.map(animal => [animal.id, `./audio/animals/${animal.id}.mp3`])));
export const ANIMAL_BOOK_CLIPS = Object.freeze({
  abk_sound_guide: 'Hallgasd meg az állat hangját, és válaszd ki, melyik állat szólt!',
  abk_scene_guide: 'Keresd meg a megnevezett állatot a képen!',
  abk_try_again: 'Próbáld újra! Figyeld meg a képet vagy hallgasd meg a hangot!',
  abk_well_done: 'Ügyes vagy! Megtaláltad az állatot!',
  ...Object.fromEntries(ANIMAL_BOOK_ANIMALS.map(animal => [`abk_name_${animal.id}`, animal.label])),
});

export function animalBookPageIndex(id) {
  const index = ANIMAL_BOOK_PAGES.findIndex(page => page.id === id);
  return index >= 0 ? index : 0;
}
export function normalizeAnimalBookPreferences(value) {
  return {
    pageId: ANIMAL_BOOK_PAGES[animalBookPageIndex(value?.pageId)].id,
    markersVisible: typeof value?.markersVisible === 'boolean' ? value.markersVisible : true,
    quizLevel: value?.quizLevel === 2 ? 2 : 1,
  };
}

function shuffled(items, random) {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.min(i, Math.max(0, Math.floor(random() * (i + 1))));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

// Page tasks pick a random animal of the page, never the one just asked,
// so the child cannot learn a fixed order.
export function nextAnimalBookTarget(animals, previousId = null, random = Math.random) {
  const ids = animals.map(animal => animal.id);
  const fresh = ids.filter(id => id !== previousId);
  const pool = fresh.length ? fresh : ids;
  return pool[Math.min(pool.length - 1, Math.max(0, Math.floor(random() * pool.length)))];
}

// Állatkvíz: five different targets from the whole book. The first two questions
// offer three pictures, the rest four, with distractors drawn from every page.
export const ANIMAL_QUIZ_LENGTH = 5;
export const ANIMAL_QUIZ_CHOICES = Object.freeze([3, 3, 4, 4, 4]);
export function buildAnimalQuiz(random = Math.random, previousFirst = null) {
  let targets = shuffled(ANIMAL_BOOK_ANIMALS, random).slice(0, ANIMAL_QUIZ_LENGTH);
  if (targets[0].id === previousFirst) targets = [...targets.slice(1), targets[0]];
  return targets.map((target, index) => {
    const others = shuffled(ANIMAL_BOOK_ANIMALS.filter(animal => animal.id !== target.id), random).slice(0, ANIMAL_QUIZ_CHOICES[index] - 1);
    return { targetId: target.id, choices: shuffled([target, ...others], random).map(animal => animal.id) };
  });
}
// Stars count the questions solved on the first try; finishing earns at least one.
export function animalQuizStars(firstTry) {
  return Math.max(1, Math.min(ANIMAL_QUIZ_LENGTH, Number.isInteger(firstTry) ? firstTry : 0));
}
// Four or five first-try answers unlock the harder level without names.
export function nextAnimalQuizLevel(level, firstTry) {
  return level === 2 || firstTry >= 4 ? 2 : 1;
}
export function loadAnimalBookPreferences(storage) {
  try { return normalizeAnimalBookPreferences(JSON.parse(storage?.getItem(ANIMAL_BOOK_STORAGE_KEY) ?? 'null')); }
  catch { return normalizeAnimalBookPreferences(); }
}
export function saveAnimalBookPreferences(storage, value) {
  try {
    if (!storage?.setItem) return false;
    storage.setItem(ANIMAL_BOOK_STORAGE_KEY, JSON.stringify(normalizeAnimalBookPreferences(value)));
    return true;
  } catch { return false; }
}
