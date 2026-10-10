export function createSuccessDelay({
  delayMs = 1_000,
  visibilityTarget = globalThis.document,
  now = () => globalThis.performance?.now() ?? Date.now(),
  setTimer = (callback, delay) => setTimeout(callback, delay),
  clearTimer = timer => clearTimeout(timer),
} = {}) {
  const duration = Number.isFinite(delayMs) && delayMs >= 0 ? delayMs : 1_000;
  let callback;
  let remaining = duration;
  let startedAt;
  let timer;
  let generation = 0;
  let disposed = false;

  function visible() {
    if (!visibilityTarget) return true;
    return visibilityTarget.visibilityState
      ? visibilityTarget.visibilityState === "visible"
      : !visibilityTarget.hidden;
  }

  function pause() {
    if (timer !== undefined) clearTimer(timer);
    timer = undefined;
    generation++;
    if (startedAt !== undefined) remaining = Math.max(0, remaining - Math.max(0, now() - startedAt));
    startedAt = undefined;
  }

  function resume() {
    if (disposed || !callback || startedAt !== undefined || !visible()) return;
    startedAt = now();
    const token = ++generation;
    timer = setTimer(() => {
      if (disposed || token !== generation || !callback) return;
      pause();
      if (!visible()) return;
      // Timer rounding or an early wakeup must not shorten the viewing time.
      if (remaining > 0) { resume(); return; }
      const complete = callback;
      callback = undefined;
      complete();
    }, remaining);
  }

  function cancel() {
    pause();
    callback = undefined;
    remaining = duration;
  }

  function schedule(complete) {
    if (disposed) return false;
    if (typeof complete !== "function") throw new TypeError("A sikerjelzéshez függvény szükséges.");
    cancel();
    callback = complete;
    resume();
    return true;
  }

  function onVisibilityChange() {
    if (visible()) resume();
    else pause();
  }

  function dispose() {
    if (disposed) return;
    cancel();
    disposed = true;
    visibilityTarget?.removeEventListener("visibilitychange", onVisibilityChange);
  }

  visibilityTarget?.addEventListener("visibilitychange", onVisibilityChange);
  return { schedule, cancel, dispose };
}
