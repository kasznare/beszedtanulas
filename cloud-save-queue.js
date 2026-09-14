export function createCloudSaveQueue({ run, onError = () => {}, delayMs = 120 }) {
  let dirty = false, stopped = false, running = null, timer;
  async function drain() {
    try {
      while (dirty && !stopped) {
        dirty = false;
        try { await run(); }
        catch (error) { dirty = true; throw error; }
      }
    } finally { running = null; }
  }
  function flush() {
    clearTimeout(timer);
    if (stopped) return Promise.resolve();
    dirty = true;
    if (!running) running = Promise.resolve().then(drain);
    return running;
  }
  return {
    request() {
      if (stopped) return;
      dirty = true;
      if (running) return;
      clearTimeout(timer);
      timer = setTimeout(() => flush().catch(onError), delayMs);
    },
    flush,
    stop() { stopped = true; dirty = false; clearTimeout(timer); },
  };
}
