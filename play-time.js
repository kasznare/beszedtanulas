export const PLAY_TIME_KEY = 'beszedtanulas.playTime.v1';
export const PLAY_LIMIT_MS = 30 * 60 * 1000;
export const BREAK_MS = 15 * 60 * 1000;

export function freshPlayTime(now) {
  return { version: 1, cycle: `${now}-${Math.random().toString(36).slice(2)}`, startedAt: null };
}

export function normalizePlayTime(value, now) {
  if (!value || value.version !== 1 || typeof value.cycle !== 'string' || !(value.startedAt === null || (Number.isFinite(value.startedAt) && value.startedAt >= 0))) return freshPlayTime(now);
  if (value.startedAt !== null && now >= value.startedAt + PLAY_LIMIT_MS + BREAK_MS) return freshPlayTime(now);
  return { version: 1, cycle: value.cycle, startedAt: value.startedAt };
}

// An absolute deadline never pauses, even while the page is closed. Keep it
// separate from scores, so progress imports and resets cannot renew the budget.
export function createPlayTimeLimit({ storage, now = Date.now, onChange = () => {} }) {
  let record = freshPlayTime(now());
  let storageError = false;

  function read(time) {
    try {
      const raw = storage.getItem(PLAY_TIME_KEY);
      if (raw) {
        const saved = normalizePlayTime(JSON.parse(raw), time);
        if (saved.cycle === record.cycle && record.startedAt !== null) {
          record = { ...saved, startedAt: saved.startedAt === null ? record.startedAt : Math.min(saved.startedAt, record.startedAt) };
        } else if (!storageError) record = saved;
      } else record = normalizePlayTime(record, time);
    } catch { record = normalizePlayTime(record, time); }
    // The same in-memory cycle must also expire after a failed storage write.
    record = normalizePlayTime(record, time);
  }

  function snapshot(time = now()) {
    const deadline = record.startedAt === null ? null : record.startedAt + PLAY_LIMIT_MS;
    const breakUntil = deadline === null ? null : deadline + BREAK_MS;
    return {
      started: deadline !== null,
      remainingMs: deadline === null ? PLAY_LIMIT_MS : Math.max(0, deadline - time),
      locked: deadline !== null && time >= deadline && time < breakUntil,
      breakRemainingMs: deadline !== null && time >= deadline ? Math.max(0, breakUntil - time) : 0,
      storageError,
    };
  }

  function save() {
    try { storage.setItem(PLAY_TIME_KEY, JSON.stringify(record)); storageError = false; }
    catch { storageError = true; }
  }

  function tick({ notify = true } = {}) {
    const previous = JSON.stringify(record);
    read(now());
    if (previous !== JSON.stringify(record) || storageError) save();
    const result = snapshot();
    if (notify) onChange(result);
    return result;
  }

  read(now()); save();
  return {
    tick, snapshot,
    start() {
      tick({ notify: false });
      if (record.startedAt === null) { record.startedAt = now(); save(); }
      return tick();
    },
    renew() {
      record = { ...freshPlayTime(now()), startedAt: now() }; save();
      const result = snapshot(); onChange(result); return result;
    },
  };
}

export function formatPlayTime(milliseconds) {
  const seconds = Math.ceil(Math.max(0, milliseconds) / 1000);
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}
