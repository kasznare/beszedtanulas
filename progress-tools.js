import { MAX_BACKUP_BYTES, createProgressBackup, parseProgressBackup, snapshotProgress } from "./progress-data.js";

export function setupProgressTools({ getState, getRevision, applyProgress, resumeCloud, cancelCloud, isParentScreen }) {
  const status = document.querySelector("#progress-status");
  const fileInput = document.querySelector("#progress-file");
  const dialog = document.querySelector("#progress-dialog");
  const error = document.querySelector("#progress-dialog-error");
  const apply = document.querySelector("#progress-apply");
  let generation = 0;
  let pending;

  const dateLabel = value => new Date(value).toLocaleString("hu-HU", { dateStyle: "medium", timeStyle: "short" });

  function refresh() {
    const undo = getState().undoProgress;
    const button = document.querySelector("#undo-progress");
    button.hidden = !undo;
    button.textContent = undo?.kind === "reset" ? "Legutóbbi nullázás visszavonása" : "Legutóbbi visszaállítás visszavonása";
  }

  function cancelPending() {
    if (pending?.kind === "cloud") cancelCloud();
    generation += 1;
    pending = null;
    fileInput.value = "";
    dialog.close();
  }

  function openConfirmation(kind, progress, description) {
    if (!isParentScreen()) return;
    const titles = { reset: "Lenullázzuk a helyi eredményeket?", restore: "Visszaállítsuk ezt a mentést?", undo: "Visszaállítsuk az előző eredményeket?", cloud: "Folytassuk a felhőszinkront?" };
    const labels = { reset: "Helyi eredmények nullázása", restore: "Mentés visszaállítása", undo: "Előző eredmények visszaállítása", cloud: "Felhőszinkron folytatása" };
    try { pending = { kind, progress, revision: getRevision() }; }
    catch { status.textContent = "A böngésző nem engedi az eredmények módosítását. Fájlba továbbra is mentheted őket."; return; }
    document.querySelector("#progress-dialog-title").textContent = titles[kind];
    document.querySelector("#progress-dialog-description").textContent = description;
    const summary = document.querySelector("#progress-preview");
    summary.hidden = !progress;
    if (progress) {
      document.querySelector("#preview-plays").textContent = progress.plays.toLocaleString("hu-HU");
      document.querySelector("#preview-attempts").textContent = progress.attempts.toLocaleString("hu-HU");
      document.querySelector("#preview-rewards").textContent = progress.rewards.toLocaleString("hu-HU");
    }
    document.querySelector("#progress-dialog-note").textContent = kind === "cloud"
      ? "A helyi és felhős szóeredmények nagyobb számlálóit tartjuk meg. A korábban helyben nullázott eredmények így visszakerülhetnek a felhőből."
      : "A játék beállításai megmaradnak. A felhős eredményeket ez a művelet nem törli vagy írja át; a szinkron szünetelni fog.";
    apply.textContent = labels[kind];
    apply.classList.toggle("danger", kind === "reset");
    apply.disabled = false;
    error.textContent = "";
    dialog.showModal();
    document.querySelector("#progress-cancel").focus();
  }

  document.querySelector("#export-progress").addEventListener("click", () => {
    const now = new Date();
    const blob = new Blob([JSON.stringify(createProgressBackup(getState(), now), null, 2) + "\n"], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    const date = [now.getFullYear(), String(now.getMonth() + 1).padStart(2, "0"), String(now.getDate()).padStart(2, "0")].join("-");
    link.download = `beszedjatek-eredmenyek-${date}.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
    status.textContent = "A mentésfájl elkészült. Őrizd meg a Letöltésekben vagy a Fájlok között.";
  });
  document.querySelector("#import-progress").addEventListener("click", () => fileInput.click());
  fileInput.addEventListener("change", async () => {
    const file = fileInput.files[0];
    fileInput.value = "";
    if (!file) return;
    const token = ++generation;
    try {
      if (file.size > MAX_BACKUP_BYTES) throw new Error("Ez a mentés túl nagy. Legfeljebb 1 MB-os játékmentést válassz.");
      const backup = parseProgressBackup(await file.text());
      if (token !== generation || !isParentScreen()) return;
      openConfirmation("restore", backup.progress, `Mentés ideje: ${dateLabel(backup.exportedAt)}. Az alábbi eredmények kerülnek a mostaniak helyére. A művelet visszavonható.`);
    } catch (problem) {
      if (token === generation && isParentScreen()) status.textContent = problem.message;
    }
  });
  document.querySelector("#reset-progress").addEventListener("click", () => {
    const current = snapshotProgress(getState());
    openConfirmation("reset", current, "Az alábbi helyi számlálók és minden szó gyakorlási eredménye nullára áll. A legutóbbi nullázás visszavonható.");
  });
  document.querySelector("#undo-progress").addEventListener("click", () => {
    const undo = getState().undoProgress;
    if (undo) openConfirmation("undo", undo.progress, `Előző állapot: ${dateLabel(undo.createdAt)}. Azóta elért eredményeid helyére ez az állapot kerül. Ez a visszavonás egyszer használható.`);
  });
  document.querySelector("#progress-cancel").addEventListener("click", cancelPending);
  dialog.addEventListener("cancel", cancelPending);
  dialog.addEventListener("close", () => { pending = null; });
  apply.addEventListener("click", async () => {
    const action = pending;
    if (!action || !isParentScreen()) return;
    const token = generation;
    apply.disabled = true;
    try {
      if (action.kind === "cloud") await resumeCloud(action.revision);
      else applyProgress(action.kind === "reset" ? snapshotProgress() : action.progress, action.kind, action.revision);
      if (token !== generation) return;
      dialog.close();
      status.textContent = { reset: "A helyi eredmények nullázva. A legutóbbi módosítás visszavonható.", restore: "A mentés visszaállítva. A korábbi helyi eredmények még visszahozhatók.", undo: "Az előző helyi eredmények visszaállítva.", cloud: "A felhőszinkron újra engedélyezve." }[action.kind];
      refresh();
    } catch (problem) {
      if (token === generation) error.textContent = problem.message || "Nem sikerült menteni. Az eredmények megmaradtak.";
    } finally {
      if (token === generation) apply.disabled = false;
    }
  });
  refresh();
  return {
    refresh, cancelPending,
    confirmCloudResume: () => openConfirmation("cloud", null, "A kapcsolat összeveti az aktív profil helyi és felhős szóeredményeit, majd bekapcsolja az automatikus mentést."),
  };
}
