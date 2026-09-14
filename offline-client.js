export function setupOffline({ beforeReload = () => {} } = {}) {
  const status = document.querySelector("#offline-status");
  const progress = document.querySelector("#offline-progress");
  const retry = document.querySelector("#offline-retry");
  const update = document.querySelector("#offline-update");
  const install = document.querySelector("#install-game");
  let registration;
  let ready = false;
  let starting = false;
  let controller = navigator.serviceWorker?.controller;
  let reloading = false;
  let installPrompt;

  function showError() {
    progress.hidden = true;
    retry.hidden = false;
    retry.disabled = false;
    status.textContent = ready
      ? "A letöltött játék használható internet nélkül. Az új verzió letöltése még nem sikerült."
      : "Még nincs letöltve minden. Ellenőrizd az internetkapcsolatot és a szabad helyet, majd próbáld újra.";
  }

  function showWaiting() {
    if (!registration?.waiting) return;
    progress.hidden = true;
    retry.hidden = true;
    update.hidden = false;
    update.disabled = false;
    status.textContent = "Új verzió készült. A mostani játékot használhatjátok tovább; frissítéskor visszatérünk a főképernyőre.";
  }

  function watchWorker(worker) {
    if (!worker) return;
    worker.addEventListener("statechange", () => {
      if (worker.state === "installed") showWaiting();
      if (worker.state === "redundant") showError();
    });
  }

  async function start() {
    if (starting) return;
    starting = true;
    retry.disabled = true;
    try {
      registration = await navigator.serviceWorker.register(new URL("./sw.js", import.meta.url), { updateViaCache: "none" });
      registration.addEventListener("updatefound", () => watchWorker(registration.installing));
      watchWorker(registration.installing);
      registration.active?.postMessage({ type: "OFFLINE_STATUS" });
      showWaiting();
    } catch {
      showError();
    } finally {
      retry.disabled = false;
      starting = false;
    }
  }

  window.addEventListener("beforeinstallprompt", event => {
    event.preventDefault();
    installPrompt = event;
    install.hidden = false;
  });
  install.addEventListener("click", async () => {
    if (!installPrompt) return;
    await installPrompt.prompt();
    await installPrompt.userChoice;
    installPrompt = null;
    install.hidden = true;
  });
  window.addEventListener("appinstalled", () => { install.hidden = true; installPrompt = null; });

  if (!("serviceWorker" in navigator) || !window.isSecureContext) {
    status.textContent = "A játék letöltéséhez biztonságos (HTTPS) címen nyisd meg az oldalt. Itt a böngésző nem engedi az offline mentést.";
    return;
  }

  navigator.serviceWorker.addEventListener("message", event => {
    switch (event.data?.type) {
      case "OFFLINE_PROGRESS":
        progress.hidden = false;
        progress.max = event.data.total;
        progress.value = event.data.completed;
        retry.hidden = true;
        status.textContent = `${ready ? "Új verzió előkészítése" : "Játék és hangok letöltése"}: ${event.data.completed} / ${event.data.total}`;
        break;
      case "OFFLINE_READY":
        ready = true;
        progress.hidden = true;
        retry.hidden = true;
        status.textContent = "Letöltve. A képek, a számolás, a meglepetésjáték és a hangok internet nélkül is használhatók.";
        showWaiting();
        break;
      case "OFFLINE_DOWNLOADED":
        showWaiting();
        break;
      case "OFFLINE_ERROR":
        showError();
        break;
      case "OFFLINE_INCOMPLETE":
        ready = false;
        showError();
        break;
      case "UPDATE_CLOSE_WINDOWS":
        reloading = false;
        update.disabled = false;
        status.textContent = "Másik ablakban is nyitva van a játék. Zárd be azt az ablakot, majd indítsd újra a frissítést.";
        break;
    }
  });
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    const hadController = Boolean(controller);
    controller = navigator.serviceWorker.controller;
    if (hadController || reloading) {
      beforeReload();
      location.reload();
    } else {
      controller?.postMessage({ type: "OFFLINE_STATUS" });
    }
  });
  retry.addEventListener("click", () => {
    if (registration?.active && !ready) {
      retry.disabled = true;
      registration.active.postMessage({ type: "REPAIR_OFFLINE" });
    } else start();
  });
  update.addEventListener("click", () => {
    if (!registration?.waiting) return;
    reloading = true;
    update.disabled = true;
    registration.waiting.postMessage({ type: "ACTIVATE_UPDATE" });
  });
  window.addEventListener("online", start);
  window.setTimeout(start, 300);
}
