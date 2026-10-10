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

function placementIds(puzzle, placed) {
  if (!Array.isArray(puzzle?.pieces) || !puzzle.pieces.length || !(placed instanceof Map)) return null;
  const ids = new Set();
  for (const piece of puzzle.pieces) {
    if (!Number.isInteger(piece?.id) || piece.id < 0 || ids.has(piece.id)) return null;
    ids.add(piece.id);
  }
  const used = new Set();
  for (const [slotId, pieceId] of placed) {
    if (!ids.has(slotId) || !ids.has(pieceId) || used.has(pieceId)) return null;
    used.add(pieceId);
  }
  return ids;
}

function pieceSlot(placed, pieceId) {
  for (const [slotId, occupant] of placed) if (occupant === pieceId) return slotId;
  return undefined;
}

export function placePuzzlePiece(puzzle, placed, pieceId, slotId) {
  const ids = placementIds(puzzle, placed);
  if (!ids?.has(pieceId) || !ids.has(slotId)) return false;
  const source = pieceSlot(placed, pieceId);
  if (source === slotId) return false;

  // A board-to-board move swaps an occupied destination into the old slot.
  // A tray piece replaces its destination; that old occupant returns to the tray.
  if (source !== undefined) {
    if (placed.has(slotId)) placed.set(source, placed.get(slotId));
    else placed.delete(source);
  }
  placed.set(slotId, pieceId);
  return true;
}

export function removePuzzlePiece(puzzle, placed, pieceId) {
  if (!placementIds(puzzle, placed)?.has(pieceId)) return false;
  const source = pieceSlot(placed, pieceId);
  return source !== undefined && placed.delete(source);
}

export function isPuzzleComplete(puzzle, placed) {
  const ids = placementIds(puzzle, placed);
  return Boolean(ids && placed.size === ids.size && [...ids].every(id => placed.get(id) === id));
}
