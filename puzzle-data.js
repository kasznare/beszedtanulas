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
// Real grids: rows and columns follow the piece count, so pieces stay close to square on a 3:2 picture.
export const PUZZLE_SIZES = [2, 4, 6, 9, 12, 16];
// Earlier versions offered thin strips of 8 and 10 pieces. Their saved boards are ignored, never rejected.
const LEGACY_SIZES = { 8: 9, 10: 12 };
export const PUZZLE_TAB = .22;
export const PUZZLE_CLIPS = {
  puzzle_start: 'Rakjuk össze a képet! Válassz egy darabot, és koppints a helyére! Oda is húzhatod.',
  puzzle_hint: 'Nézzük meg a teljes képet! Keresd meg rajta a darabod helyét!',
  puzzle_retry: 'Ez a darab másik helyre illik. Próbáld újra!',
  puzzle_place: 'Ez az! A darab a helyén van.',
  puzzle_done: 'Elkészült a kép! Szép munka!',
};

export function normalizePuzzleOptions(options = {}) {
  if (!options || typeof options !== 'object') options = {};
  const pieces = LEGACY_SIZES[options.puzzlePieces] ?? options.puzzlePieces;
  return {
    puzzleImage: PUZZLE_IMAGES.some(image => image.id === options.puzzleImage) ? options.puzzleImage : 'farm',
    puzzlePieces: PUZZLE_SIZES.includes(pieces) ? pieces : 6,
    puzzleStrict: options.puzzleStrict !== false,
  };
}

export function puzzleGrid(pieceCount) {
  const count = PUZZLE_SIZES.includes(pieceCount) ? pieceCount : 6;
  let best = null;
  for (let rows = 1; rows * rows <= count; rows++) {
    if (count % rows) continue;
    const columns = count / rows, skew = Math.abs(Math.log(3 * rows / (2 * columns)));
    if (!best || skew < best.skew) best = { rows, columns, skew };
  }
  return { rows: best.rows, columns: best.columns };
}

// Each inner edge gets one tab and one blank. The pattern depends only on the size, so a saved board keeps its shapes.
function edgeSign(count, vertical, row, column) {
  let h = Math.imul(count + 31, 0x9e3779b1) ^ Math.imul(row + 7, 0x85ebca6b) ^ Math.imul(column + 13, 0xc2b2ae35) ^ (vertical ? 0x27d4eb2f : 0x165667b1);
  h = Math.imul(h ^ h >>> 15, 0x2c1b3c6d); h ^= h >>> 12;
  return (h >>> 3) & 1 ? 1 : -1;
}

export function buildPuzzle(pieceCount = 6, random = Math.random) {
  const count = PUZZLE_SIZES.includes(pieceCount) ? pieceCount : 6;
  const { rows, columns } = puzzleGrid(count);
  const right = (row, column) => column < columns - 1 ? edgeSign(count, true, row, column) : 0;
  const down = (row, column) => row < rows - 1 ? edgeSign(count, false, row, column) : 0;
  const pieces = Array.from({ length: count }, (_, id) => {
    const row = Math.floor(id / columns), column = id % columns;
    return {
      id, row, column,
      x: columns > 1 ? column * 100 / (columns - 1) : 0, y: rows > 1 ? row * 100 / (rows - 1) : 0,
      edges: { top: row ? -down(row - 1, column) : 0, right: right(row, column), bottom: down(row, column), left: column ? -right(row, column - 1) : 0 },
    };
  });
  const order = pieces.map(piece => piece.id);
  for (let i = order.length - 1; i > 0; i--) {
    const j = Math.min(i, Math.max(0, Math.floor(random() * (i + 1))));
    [order[i], order[j]] = [order[j], order[i]];
  }
  // Even a constant/randomly unlucky source must not show an already ordered tray.
  if (order.every((id, index) => id === index)) order.push(order.shift());
  return { columns, rows, pieces, order };
}

// The outline lives in a box that extends PUZZLE_TAB of a cell beyond each side, so tabs can reach into the neighbour.
const KNOB = [[.38, 0], ...[240, 200, 160, 120, 90, 60, 20, -20, -60].map(angle => [.5 + .085 * Math.cos(angle * Math.PI / 180), .12 + .085 * Math.sin(angle * Math.PI / 180)]), [.62, 0]];
export function puzzlePieceOutline(piece, tab = PUZZLE_TAB) {
  const points = [], edges = piece?.edges || {};
  const side = (sign, map) => { points.push(map(0, 0)); if (sign) for (const [u, v] of KNOB) points.push(map(u, v * sign)); };
  side(edges.top, (u, v) => [u, -v]);
  side(edges.right, (u, v) => [1 + v, u]);
  side(edges.bottom, (u, v) => [1 - u, 1 + v]);
  side(edges.left, (u, v) => [-v, 1 - u]);
  const scale = value => `${(((value + tab) / (1 + 2 * tab)) * 100).toFixed(2)}%`;
  return `polygon(${points.map(([x, y]) => `${scale(x)} ${scale(y)}`).join(',')})`;
}

// Background placement for that enlarged box: the whole picture is drawn behind it, offset to this piece.
export function puzzlePieceCrop(puzzle, piece, tab = PUZZLE_TAB) {
  const span = 1 + 2 * tab, position = (index, count) => ((index - tab) / (count - 1 - 2 * tab)) * 100;
  return `background-size:${(puzzle.columns / span * 100).toFixed(3)}% ${(puzzle.rows / span * 100).toFixed(3)}%;background-position:${position(piece.column, puzzle.columns).toFixed(3)}% ${position(piece.row, puzzle.rows).toFixed(3)}%;`;
}

export const puzzleFits = (strict, pieceId, slotId) => !strict || pieceId === slotId;

// Five stars for a clean picture; wrong drops beyond a small allowance and peeking at the picture cost one each.
export function puzzleStars({ pieces = 6, wrong = 0, hinted = false } = {}) {
  const allowance = Math.floor(Math.max(0, pieces) / 6);
  return Math.max(1, Math.min(5, 5 - Math.max(0, wrong - allowance) - (hinted ? 1 : 0)));
}

export function nextPuzzleChoice(imageId, pieceCount, mode = 'image') {
  const imageIndex = Math.max(0, PUZZLE_IMAGES.findIndex(image => image.id === imageId));
  const sizeIndex = PUZZLE_SIZES.indexOf(pieceCount);
  if (mode === 'more') return sizeIndex >= 0 && sizeIndex < PUZZLE_SIZES.length - 1 ? { puzzleImage: PUZZLE_IMAGES[imageIndex].id, puzzlePieces: PUZZLE_SIZES[sizeIndex + 1] } : null;
  return { puzzleImage: PUZZLE_IMAGES[(imageIndex + 1) % PUZZLE_IMAGES.length].id, puzzlePieces: PUZZLE_SIZES.includes(pieceCount) ? pieceCount : 6 };
}

export function normalizePuzzleBoard(value, imageId, pieceCount) {
  if (!value || typeof value !== 'object' || value.imageId !== imageId || value.pieceCount !== pieceCount) return null;
  const ids = Array.from({ length: pieceCount }, (_, id) => id);
  if (!Array.isArray(value.order) || value.order.length !== pieceCount ||
      [...value.order].sort((a, b) => a - b).some((id, i) => id !== ids[i]) ||
      !Array.isArray(value.placed) || typeof value.rewarded !== 'boolean' ||
      (value.solved !== undefined && !(Number.isSafeInteger(value.solved) && value.solved >= 0))) return null;
  // Earlier boards recorded only correctly placed IDs. Convert them to slot/piece pairs.
  const pairs = value.placed.map(entry => Number.isInteger(entry) ? [entry, entry] : entry);
  if (pairs.some(entry => !Array.isArray(entry) || entry.length !== 2 ||
      entry.some(id => !Number.isInteger(id) || id < 0 || id >= pieceCount)) ||
      new Set(pairs.map(([slot]) => slot)).size !== pairs.length ||
      new Set(pairs.map(([, piece]) => piece)).size !== pairs.length) return null;
  const complete = pairs.length === pieceCount && pairs.every(([slot, piece]) => slot === piece);
  const rewarded = value.rewarded || complete;
  // How many times this picture was finished at this size; older saves only knew whether it was rewarded.
  const solved = Math.max(value.solved ?? 0, rewarded ? 1 : 0);
  return { imageId, pieceCount, order: [...value.order], placed: pairs.map(pair => [...pair]), rewarded, solved };
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
  const legacy = new Set(PUZZLE_IMAGES.flatMap(image => Object.keys(LEGACY_SIZES).map(count => `${image.id}:${count}`)));
  for (const [key, board] of Object.entries(value)) {
    if (legacy.has(key)) continue;
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
