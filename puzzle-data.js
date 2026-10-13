// The original book illustrations are shared with the puzzle and its offline bundle.
export const PUZZLE_IMAGES = [
  { id: 'sun', name: 'Napocska', image: './assets/puzzle-simple/sun.svg' },
  { id: 'ball', name: 'Labda', image: './assets/puzzle-simple/ball.svg' },
  { id: 'apple', name: 'Alma', image: './assets/puzzle-simple/apple.svg' },
  { id: 'farm', name: 'Tanya', image: './assets/animal-book/farm.webp' },
  { id: 'garden', name: 'Kert', image: './assets/animal-book/garden.webp' },
  { id: 'pond', name: 'Tópart', image: './assets/animal-book/pond.webp' },
  { id: 'forest', name: 'Erdő', image: './assets/animal-book/forest.webp' },
];
export const PUZZLE_SIZES = [2, 4, 6, 8, 10];
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
  const rows = count === 2 ? 1 : 2, columns = count / rows;
  const pieces = Array.from({ length: count }, (_, id) => ({
    id, row: Math.floor(id / columns), column: id % columns,
    x: (id % columns) * 100 / (columns - 1), y: rows === 1 ? 0 : Math.floor(id / columns) * 100,
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

export function normalizePuzzleBoard(value, imageId, pieceCount) {
  if (!value || typeof value !== 'object' || value.imageId !== imageId || value.pieceCount !== pieceCount) return null;
  const ids = Array.from({ length: pieceCount }, (_, id) => id);
  if (!Array.isArray(value.order) || value.order.length !== pieceCount ||
      [...value.order].sort((a, b) => a - b).some((id, i) => id !== ids[i]) ||
      !Array.isArray(value.placed) || typeof value.rewarded !== 'boolean') return null;
  // Earlier boards recorded only correctly placed IDs. Convert them to slot/piece pairs.
  const pairs = value.placed.map(entry => Number.isInteger(entry) ? [entry, entry] : entry);
  if (pairs.some(entry => !Array.isArray(entry) || entry.length !== 2 ||
      entry.some(id => !Number.isInteger(id) || id < 0 || id >= pieceCount)) ||
      new Set(pairs.map(([slot]) => slot)).size !== pairs.length ||
      new Set(pairs.map(([, piece]) => piece)).size !== pairs.length) return null;
  const complete = pairs.length === pieceCount && pairs.every(([slot, piece]) => slot === piece);
  return { imageId, pieceCount, order: [...value.order], placed: pairs.map(pair => [...pair]), rewarded: value.rewarded || complete };
}

export function normalizePuzzleProgress(value) {
  const result = {};
  if (!value || typeof value !== 'object' || Array.isArray(value)) return result;
  for (const image of PUZZLE_IMAGES) for (const count of PUZZLE_SIZES) {
    const key = `${image.id}:${count}`;
    const board = normalizePuzzleBoard(value[key], image.id, count);
    if (board) result[key] = board;
  }
  return result;
}

export function validatePuzzleProgress(value) {
  if (value == null) return true;
  if (typeof value !== 'object' || Array.isArray(value)) throw new Error('Érvénytelen kirakómentés.');
  const allowed = new Set(PUZZLE_IMAGES.flatMap(image => PUZZLE_SIZES.map(count => `${image.id}:${count}`)));
  for (const [key, board] of Object.entries(value)) {
    if (!allowed.has(key)) throw new Error('Ismeretlen kirakómentés.');
    const [imageId, count] = key.split(':');
    const normalized = normalizePuzzleBoard(board, imageId, Number(count));
    if (!normalized) throw new Error('Hibás kirakóállás.');
    if (normalized.rewarded && !board.rewarded) throw new Error('Hiányzó jutalomjelölés.');
  }
  return true;
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
