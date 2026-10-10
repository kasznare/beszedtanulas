const UPDATE_CHECK_INTERVAL_MS = 60_000;
const ACTIVATION_RETRY_DELAY_MS = 1_000;

export function setupOffline({ beforeReload = () => {}, isSafeToReload = () => false } = {}) {
  const status = document.querySelector("#offline-status");
  const homeStatus = document.querySelector("#home-update-status");
  const refresh = document.querySelector("#home-refresh");
  const progress = document.querySelector("#offline-progress");
  const retry = document.querySelector("#offline-retry");
  const update = document.querySelector("#offline-update");
  const install = document.querySelector("#install-game");
  const supported = "serviceWorker" in navigator && window.isSecureContext;
  const watchedWorkers = new WeakSet();
  let registration;
  let ready = false;
  let checking;
  let lastCheck;
  let controller = navigator.serviceWorker?.controller;
  let waitingWorker;
  let installingWorker;
  let activationRequested = false;
  let activationBlocked = false;
  let activationRetryTimer;
  let delayedRetryWorker;
  let pendingReload = false;
  let reloaded = false;
  let downloadingUpdate = false;
  let installPrompt;

  const text = (element, value) => { if (element) element.textContent = value; };
  const hidden = (element, value) => { if (element) element.hidden = value; };
  const disabled = (element, value) => { if (element) element.disabled = value; };

  refresh?.addEventListener("click", event => {
    if (navigator.onLine === false) {
      event.preventDefault();
      showHomeStatus("A frissítéshez internetkapcsolat kell. A letöltött játék tovább használható.");
      return;
    }
    const target = new URL("./refresh.html", import.meta.url);
    target.searchParams.set("t", String(Date.now()));
    refresh.href = target.href;
    beforeReload();
  });

  function showHomeStatus(message = "") {
    text(homeStatus, message);
    hidden(homeStatus, !message);
  }

  function safeToReload() {
    if (document.visibilityState !== "visible") return false;
    try { return Boolean(isSafeToReload()); } catch { return false; }
  }

  function cancelActivationRetry() {
    if (activationRetryTimer !== undefined) window.clearTimeout(activationRetryTimer);
    activationRetryTimer = undefined;
    delayedRetryWorker = undefined;
  }

  function scheduleActivationRetry() {
    const worker = registration?.waiting;
    if (!worker || worker !== delayedRetryWorker) return;
    // Some browsers briefly keep a just-closed client in clients.matchAll().
    // Consume the event's single retry before scheduling; a second refusal stops.
    delayedRetryWorker = undefined;
    if (!safeToReload() || pendingReload || reloaded) return;
    activationRetryTimer = window.setTimeout(() => {
      activationRetryTimer = undefined;
      if (registration?.waiting !== worker || !safeToReload() || pendingReload || reloaded) return;
      showWaiting({ allowRetry: true });
    }, ACTIVATION_RETRY_DELAY_MS);
  }

  function reloadWhenSafe() {
    if (!pendingReload || reloaded || !safeToReload()) return false;
    reloaded = true;
    showHomeStatus("Új verzió betöltése…");
    beforeReload();
    location.reload();
    return true;
  }

  function showError() {
    downloadingUpdate = false;
    hidden(progress, true);
    hidden(retry, false);
    disabled(retry, false);
    text(status, ready
      ? "A letöltött játék használható internet nélkül. Az új verzió letöltése még nem sikerült."
      : "Még nincs letöltve minden. Ellenőrizd az internetkapcsolatot és a szabad helyet, majd próbáld újra.");
    if (ready || controller) {
      showHomeStatus("A frissítés most nem sikerült. A korábbi játék tovább használható.");
    }
  }

  function showWaiting({ allowRetry = false, allowDelayedRetry = false } = {}) {
    const worker = registration?.waiting;
    // The install event completes only after every checked file is cached.
    if (!worker || worker.state !== "installed" || pendingReload || reloaded) return;
    if (worker !== waitingWorker) {
      cancelActivationRetry();
      waitingWorker = worker;
      activationRequested = false;
      activationBlocked = false;
    }
    hidden(progress, true);
    hidden(retry, true);
    hidden(update, false);
    disabled(update, activationRequested);
    if (allowDelayedRetry && safeToReload()) {
      cancelActivationRetry();
      delayedRetryWorker = worker;
    }
    if (activationRequested) return;
    if (activationBlocked && !allowRetry) {
      const message = "Az új verzió kész. A frissítéshez zárd be a játék másik ablakát.";
      text(status, message);
      showHomeStatus(message);
      return;
    }
    const message = "Az új verzió kész. A főképernyőre visszatérve automatikusan betöltődik.";
    text(status, message);
    showHomeStatus(message);
    if (!safeToReload()) return;
    activationBlocked = false;
    activationRequested = true;
    disabled(update, true);
    showHomeStatus("Új verzió betöltése…");
    try {
      worker.postMessage({ type: "ACTIVATE_UPDATE" });
    } catch {
      activationRequested = false;
      disabled(update, false);
      showError();
    }
  }

  function watchWorker(worker) {
    if (!worker || watchedWorkers.has(worker)) return;
    installingWorker = worker;
    watchedWorkers.add(worker);
    worker.addEventListener("statechange", () => {
      if (worker.state === "installed") showWaiting();
      if (worker.state === "redundant" && worker === installingWorker && !pendingReload) showError();
    });
  }

  async function checkForUpdate({ force = false } = {}) {
    if (!supported || reloaded) return;
    if (!safeToReload()) cancelActivationRetry();
    if (reloadWhenSafe()) return;
    // Each screen/focus/online/check event permits one immediate and one delayed attempt.
    showWaiting({ allowRetry: true, allowDelayedRetry: true });
    if (activationRequested || pendingReload) return;
    if (checking) return checking;
    const now = Date.now();
    if (!force && lastCheck !== undefined && now - lastCheck < UPDATE_CHECK_INTERVAL_MS) return;
    if (registration && navigator.onLine === false) return;
    lastCheck = navigator.onLine === false ? undefined : now;
    disabled(retry, true);
    checking = (async () => {
      try {
        if (!registration) {
          registration = await navigator.serviceWorker.register(new URL("./sw.js", import.meta.url), { updateViaCache: "none" });
          registration.addEventListener("updatefound", () => watchWorker(registration.installing));
          watchWorker(registration.installing);
          registration.active?.postMessage({ type: "OFFLINE_STATUS" });
        } else {
          await registration.update();
        }
        if (!registration.waiting && !registration.installing && !downloadingUpdate) showHomeStatus();
        showWaiting({ allowRetry: true, allowDelayedRetry: true });
      } catch {
        showError();
      } finally {
        disabled(retry, false);
      }
    })();
    try { await checking; } finally { checking = undefined; }
  }

  function notifyScreenChange() {
    return checkForUpdate();
  }

  window.addEventListener("beforeinstallprompt", event => {
    event.preventDefault();
    installPrompt = event;
    hidden(install, false);
  });
  install?.addEventListener("click", async () => {
    if (!installPrompt) return;
    await installPrompt.prompt();
    await installPrompt.userChoice;
    installPrompt = null;
    hidden(install, true);
  });
  window.addEventListener("appinstalled", () => { hidden(install, true); installPrompt = null; });

  if (!supported) {
    text(status, "A játék letöltéséhez biztonságos (HTTPS) címen nyisd meg az oldalt. Itt a böngésző nem engedi az offline mentést.");
    showHomeStatus();
    return { notifyScreenChange, checkForUpdate };
  }

  navigator.serviceWorker.addEventListener("message", event => {
    switch (event.data?.type) {
      case "OFFLINE_PROGRESS":
        downloadingUpdate = downloadingUpdate || Boolean(ready || controller);
        hidden(progress, false);
        if (progress) {
          progress.max = event.data.total;
          progress.value = event.data.completed;
        }
        hidden(retry, true);
        text(status, `${ready ? "Új verzió előkészítése" : "Játék és hangok letöltése"}: ${event.data.completed} / ${event.data.total}`);
        if (downloadingUpdate) showHomeStatus(`Új verzió letöltése: ${event.data.completed} / ${event.data.total}`);
        break;
      case "OFFLINE_READY":
        ready = true;
        // The old active worker may answer while its replacement is downloading.
        if (!registration?.installing) {
          hidden(progress, true);
          hidden(retry, true);
          text(status, "Letöltve. A játék és a hangok internet nélkül is használhatók.");
        }
        showWaiting();
        break;
      case "OFFLINE_DOWNLOADED":
        downloadingUpdate = false;
        showWaiting();
        break;
      case "OFFLINE_ERROR":
        downloadingUpdate = false;
        showError();
        break;
      case "OFFLINE_INCOMPLETE":
        ready = false;
        showError();
        break;
      case "UPDATE_CLOSE_WINDOWS":
        if (!activationRequested) break;
        activationRequested = false;
        activationBlocked = true;
        showWaiting();
        scheduleActivationRetry();
        break;
    }
  });
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    cancelActivationRetry();
    const hadController = Boolean(controller);
    controller = navigator.serviceWorker.controller;
    if (hadController || activationRequested) {
      activationRequested = false;
      pendingReload = true;
      disabled(update, true);
      const message = "Az új verzió kész. A főképernyőre visszatérve automatikusan betöltődik.";
      text(status, message);
      showHomeStatus(message);
      reloadWhenSafe();
    } else {
      downloadingUpdate = false;
      showHomeStatus();
      controller?.postMessage({ type: "OFFLINE_STATUS" });
    }
  });
  retry?.addEventListener("click", () => {
    if (registration?.active && !ready) {
      disabled(retry, true);
      registration.active.postMessage({ type: "REPAIR_OFFLINE" });
    } else checkForUpdate({ force: true });
  });
  update?.addEventListener("click", () => checkForUpdate({ force: true }));
  window.addEventListener("offline", () => { lastCheck = undefined; });
  window.addEventListener("online", () => checkForUpdate());
  window.addEventListener("focus", () => {
    if (document.visibilityState === "visible") checkForUpdate();
  });
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") checkForUpdate();
    else cancelActivationRetry();
  });
  window.setTimeout(() => checkForUpdate(), 300);
  return { notifyScreenChange, checkForUpdate };
}
