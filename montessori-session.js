import { newMontessoriRound, montessoriRandom, moveMontessoriPiece, rotationPeriod, placeMontessoriPiece, checkMontessoriRound, montessoriComplete } from './montessori-data.js';

export const montessoriSessionKey = (scope, kind, level) => `beszedtanulas.montessori.v2:${scope}:${kind}:${level}`;
export function createMontessoriSession(kind, level, seed = Math.floor(Math.random() * 4294967296)) {
  return { ...newMontessoriRound(kind, level, montessoriRandom(seed)), seed };
}
// Rebuild the exercise from its seed; only restore validated player moves.
export function restoreMontessoriSession(record, kind, level) {
  if (!record || !Number.isInteger(record.seed) || record.seed < 0 || record.seed > 4294967295) return null;
  let round = createMontessoriSession(kind, level, record.seed);
  for (const [id, xy] of Object.entries(record.positions || {})) {
    if (Array.isArray(xy) && xy.length === 2) round = moveMontessoriPiece(round, id, ...xy);
  }
  for (const [id, rotation] of Object.entries(record.rotations || {})) {
    const piece = round.pieces.find(item => item.id === id);
    if (piece && Number.isInteger(rotation) && rotation >= 0 && rotation < rotationPeriod(piece.shape)) round.rotations[id] = rotation;
  }
  round.cleared = Array.isArray(record.cleared) ? [...new Set(record.cleared.filter(id => round.blockers.includes(id)))] : [];
  if (kind === 'memory') { round.phase = record.phase === 'play' ? 'play' : 'preview'; round.assisted = record.assisted === true; }
  const savedCleared = round.cleared; round.cleared = [...round.blockers];
  const savedPhase = round.phase;
  if (kind === 'memory') round.phase = 'play';
  if (Array.isArray(record.placements)) for (const move of record.placements.slice(0, round.pieces.length)) {
    if (!move || round.placements.some(item => item.piece === move.piece)) continue;
    if (['grid', 'memory'].includes(kind) && round.placements.some(item => item.target === move.target)) continue;
    const result = placeMontessoriPiece(round, move.piece, move.target);
    if (result.accepted) round = result.round;
  }
  round.cleared = savedCleared;
  if (kind === 'memory') round.phase = savedPhase;
  if (record.checked === true) round = checkMontessoriRound(round);
  return { round, awarded: record.awarded === true || montessoriComplete(round) };
}
export function loadMontessoriSession(storage, scope, kind, level) {
  try { return restoreMontessoriSession(JSON.parse(storage.getItem(montessoriSessionKey(scope, kind, level))), kind, level); }
  catch { return null; }
}
export function saveMontessoriSession(storage, scope, round, awarded) {
  const { seed, positions, rotations, cleared, placements, phase, assisted, checked } = round;
  try { storage.setItem(montessoriSessionKey(scope, round.kind, round.level), JSON.stringify({ seed, positions, rotations, cleared, placements, phase, assisted, checked, awarded })); return true; }
  catch { return false; }
}
