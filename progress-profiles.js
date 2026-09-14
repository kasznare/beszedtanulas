import { snapshotProgress, normalizeUndo } from "./progress-data.js";

export function profileKey(config = {}) {
  let origin = String(config.url || "local").trim().replace(/\/+$/, "");
  try { origin = new URL(origin).href.replace(/\/+$/, ""); } catch {}
  return JSON.stringify([origin, config.activeRole === "admin" ? "admin" : "kid", String(config.profileCode || "local").trim()]);
}

const entryFor = state => ({ progress: snapshotProgress(state), undoProgress: normalizeUndo(state.undoProgress), syncPaused: state.supabase?.syncPaused === true });

export function normalizeProfileStore(value) {
  if (value?.version !== 1 || typeof value.activeKey !== "string" || !value.entries || typeof value.entries !== "object") return null;
  const entries = {};
  for (const [key, entry] of Object.entries(value.entries)) {
    if (key.length > 1000 || !key.startsWith("[") || !entry?.progress) continue;
    entries[key] = { progress: snapshotProgress(entry.progress), undoProgress: normalizeUndo(entry.undoProgress), syncPaused: entry.syncPaused === true };
  }
  if (!entries[value.activeKey]) return null;
  return { version: 1, activeKey: value.activeKey, entries };
}

export function checkpointProfiles(state) {
  const store = state.profileStore || { version: 1, activeKey: profileKey(state.supabase), entries: {} };
  return { ...store, entries: { ...store.entries, [store.activeKey]: entryFor(state) } };
}

export function switchProgressProfile(state, nextConfig) {
  // Old saves without connection details belong to the first configured profile.
  // Saves with an existing identity keep that identity even if project config changed.
  const initialKey = state.supabase?.profileCode && state.supabase?.url ? profileKey(state.supabase) : profileKey(nextConfig);
  const current = { ...state, profileStore: state.profileStore || { version: 1, activeKey: initialKey, entries: {} } };
  const store = checkpointProfiles(current);
  const key = profileKey(nextConfig);
  const selected = key === store.activeKey ? entryFor(state) : store.entries[key] || { progress: snapshotProgress(), undoProgress: null, syncPaused: true };
  const next = { ...state, ...selected.progress, undoProgress: selected.undoProgress, supabase: { ...nextConfig, syncPaused: selected.syncPaused }, profileStore: { ...store, activeKey: key } };
  next.profileStore = checkpointProfiles(next);
  return next;
}

// This is a conservative, idempotent merge for the existing counter schema.
// It prevents local regression; exact sums of simultaneous device activity
// require server-side event IDs/transactions and cannot be inferred here.
export function mergeWordProgress(local, rows) {
  const merged = snapshotProgress({ wordStats: local }).wordStats;
  for (const row of rows || []) {
    const previous = merged[row.word_id];
    if (!previous || ![row.attempts, row.successes, row.streak].every(value => Number.isSafeInteger(value) && value >= 0) || row.successes > row.attempts || row.streak > row.successes) continue;
    const remote = snapshotProgress({ wordStats: { [row.word_id]: { attempts: row.attempts, successes: row.successes, streak: row.streak, lastSeenAt: row.last_seen_at } } }).wordStats[row.word_id];
    const latest = remote.lastSeenAt > previous.lastSeenAt ? remote : previous;
    merged[row.word_id] = { attempts: Math.max(previous.attempts, remote.attempts), successes: Math.max(previous.successes, remote.successes), streak: latest.streak, lastSeenAt: latest.lastSeenAt };
  }
  return merged;
}

export function isSharedProfileCode(code) {
  return ["kid", "admin"].includes(String(code || "").trim().toLowerCase());
}
