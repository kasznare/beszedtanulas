import { words } from "./game-data.js";

export const MAX_BACKUP_BYTES = 1024 * 1024;
const SCHEMA = "beszedtanulas-progress";
const wordIds = new Set(words.map(word => word.id));
const isObject = value => value !== null && typeof value === "object" && !Array.isArray(value);
const counter = value => Number.isSafeInteger(value) && value >= 0;
const cleanCounter = value => counter(value) ? value : 0;
const validDate = value => typeof value === "string" && /^\d{4}-\d{2}-\d{2}T/.test(value) && value.length <= 40 && Number.isFinite(Date.parse(value));

export function snapshotProgress(source = {}) {
  const wordStats = {};
  for (const word of words) {
    const raw = source.wordStats?.[word.id] || {};
    const attempts = cleanCounter(raw.attempts);
    const successes = Math.min(attempts, cleanCounter(raw.successes));
    wordStats[word.id] = {
      attempts, successes,
      streak: Math.min(successes, cleanCounter(raw.streak)),
      lastSeenAt: validDate(raw.lastSeenAt) ? new Date(raw.lastSeenAt).toISOString() : "",
    };
  }
  return { plays: cleanCounter(source.plays), attempts: cleanCounter(source.attempts), rewards: cleanCounter(source.rewards), wordStats };
}

export function validateProgress(source) {
  if (!isObject(source) || ![source.plays, source.attempts, source.rewards].every(counter) || !isObject(source.wordStats)) {
    throw new Error("A mentés eredményei hibásak. Nem módosítottam a játékot.");
  }
  for (const [id, stats] of Object.entries(source.wordStats)) {
    if (!wordIds.has(id)) throw new Error("Ez a mentés más vagy újabb szóanyagot használ. Előbb frissítsd a játékot.");
    if (!isObject(stats) || ![stats.attempts, stats.successes, stats.streak].every(counter) ||
      stats.successes > stats.attempts || stats.streak > stats.successes ||
      (stats.lastSeenAt !== "" && !validDate(stats.lastSeenAt))) {
      throw new Error("A mentésben hibás szóeredmény található. Nem módosítottam a játékot.");
    }
  }
  return snapshotProgress(source);
}

export function createProgressBackup(state, now = new Date()) {
  return { schema: SCHEMA, version: 1, exportedAt: now.toISOString(), progress: snapshotProgress(state) };
}

export function parseProgressBackup(text) {
  if (typeof text !== "string" || text.length > MAX_BACKUP_BYTES || new TextEncoder().encode(text).length > MAX_BACKUP_BYTES) throw new Error("Ez a mentés túl nagy. Legfeljebb 1 MB-os játékmentést válassz.");
  let data;
  try { data = JSON.parse(text); } catch { throw new Error("Ez nem olvasható játékmentés. A játékból mentett JSON-fájlt válaszd."); }
  if (!isObject(data) || data.schema !== SCHEMA || data.version !== 1 || !validDate(data.exportedAt)) {
    throw new Error("Nem támogatott játékmentés. A Beszédjátékból mentett fájlt válaszd.");
  }
  return { exportedAt: new Date(data.exportedAt).toISOString(), progress: validateProgress(data.progress) };
}

export function normalizeUndo(value) {
  if (!isObject(value) || !["reset", "restore"].includes(value.kind) || !validDate(value.createdAt)) return null;
  try { return { kind: value.kind, createdAt: new Date(value.createdAt).toISOString(), progress: validateProgress(value.progress) }; }
  catch { return null; }
}

export function replaceProgress(current, replacement, kind, now = new Date()) {
  if (!["reset", "restore", "undo"].includes(kind)) throw new Error("Ismeretlen eredményművelet.");
  return {
    ...current,
    ...validateProgress(replacement),
    supabase: { ...current.supabase, syncPaused: true },
    undoProgress: kind === "undo" ? null : { kind, createdAt: now.toISOString(), progress: snapshotProgress(current) },
  };
}
