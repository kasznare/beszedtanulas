// The original book illustrations are shared with the puzzle and its offline bundle.
export const PUZZLE_IMAGES = [
  { id: 'farm', name: 'Tanya', image: './assets/animal-book/farm.webp' },
  { id: 'garden', name: 'Kert', image: './assets/animal-book/garden.webp' },
  { id: 'pond', name: 'Tópart', image: './assets/animal-book/pond.webp' },
  { id: 'forest', name: 'Erdő', image: './assets/animal-book/forest.webp' },
];
export const PUZZLE_SIZES = [6, 8, 10];
export const PUZZLE_CLIPS = {
  puzzle_start: 'Rakjuk össze a képet! Válassz egy darabot, és koppints a helyére! Oda is húzhatod.',
  puzzle_hint: 'Nézzük meg a teljes képet! Keresd meg rajta a darabod helyét!',
  puzzle_retry: 'Ez a darab másik helyre illik. Próbáld újra!',
  puzzle_place: 'Ez az! A darab a helyén van.',
  puzzle_done: 'Elkészült a kép! Szép munka!',
};

export function normalizePuzzleOptions(options = {}) {
  if (!options || typeof options !== 'object') options = {};
  return {
    puzzleImage: PUZZLE_IMAGES.some(image => image.id === options.puzzleImage) ? options.puzzleImage : 'farm',
    puzzlePieces: PUZZLE_SIZES.includes(options.puzzlePieces) ? options.puzzlePieces : 6,
  };
}

export function buildPuzzle(pieceCount = 6, random = Math.random) {
  const count = PUZZLE_SIZES.includes(pieceCount) ? pieceCount : 6;
  const columns = count / 2, rows = 2;
  const pieces = Array.from({ length: count }, (_, id) => ({
    id, row: Math.floor(id / columns), column: id % columns,
    x: (id % columns) * 100 / (columns - 1), y: Math.floor(id / columns) * 100,
  }));
  const order = pieces.map(piece => piece.id);
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.min(i, Math.max(0, Math.floor(random() * (i + 1))));
    [order[i], order[j]] = [order[j], order[i]];
  }
  // Even a constant/randomly unlucky source must not show an already ordered tray.
  if (order.every((id, index) => id === index)) order.push(order.shift());
  return { columns, rows, pieces, order };
}

export function placePuzzlePiece(puzzle, placed, pieceId, slotId) {
  if (!Number.isInteger(pieceId) || !Number.isInteger(slotId) || pieceId !== slotId ||
      !puzzle.pieces.some(piece => piece.id === pieceId) || placed.has(pieceId)) return false;
  placed.add(pieceId);
  return true;
}
