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
      { id: 'sheep', label: 'Bárány', emoji: '🐑', x: 68, y: 56, width: 31, height: 33 },
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

export function animalBookPageIndex(id) {
  const index = ANIMAL_BOOK_PAGES.findIndex(page => page.id === id);
  return index >= 0 ? index : 0;
}
export function normalizeAnimalBookPreferences(value) {
  return {
    pageId: ANIMAL_BOOK_PAGES[animalBookPageIndex(value?.pageId)].id,
    markersVisible: typeof value?.markersVisible === 'boolean' ? value.markersVisible : true,
  };
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
