import { buildDressRound, allDressItems, DRESS_OUTFITS, toggleDressItem } from "./dress-data.js";
import { createDressBear, createDressIcon } from "./dress-art.js";

export function setupDressGame({ effect = () => {}, getChoiceCount, playPrompt, playThanks, stopPlayback, onComplete, speak, onRestart = () => {} }) {
  const panel = document.querySelector("#dress-game");
  const answers = document.querySelector("#dress-answers");
  const progress = document.querySelector("#dress-progress");
  const status = document.querySelector("#dress-status");
  const next = document.querySelector("#dress-next");
  const replay = document.querySelector("#dress-replay");
  const bear = createDressBear();
  let round = [];
  let index = 0;
  let solved = false;
  let complete = false;
  let misses = 0, active = false, outfit = 'classic', worn = new Set();
  const modes = document.createElement('div'); modes.className = 'teddy-modes dress-modes'; modes.setAttribute('role', 'group'); modes.setAttribute('aria-label', 'Öltözős játék módja');
  modes.innerHTML = [...Object.entries(DRESS_OUTFITS).map(([id, value]) => `<button type="button" data-dress-mode="${id}" aria-pressed="${id === outfit}">${value.emoji} ${value.label}</button>`), '<button type="button" data-dress-mode="free" aria-pressed="false">👚 Szabad szekrény</button>'].join('');
  panel.prepend(modes);
  const weather = document.createElement('p'); weather.className = 'dress-weather'; modes.after(weather);
  modes.querySelectorAll('button').forEach(button => button.addEventListener('click', () => {
    if (!active || document.hidden) return;
    outfit = button.dataset.dressMode;
    modes.querySelectorAll('button').forEach(item => item.setAttribute('aria-pressed', String(item === button)));
    start({ announce: false });
  }));

  function renderProgress() {
    const done = index + Number(solved);
    progress.setAttribute("aria-label", `${done} / ${round.length} ruhadarab`);
    progress.replaceChildren(...round.map((_, position) => {
      const dot = document.createElement("span");
      dot.className = `progress-dot${position < done ? " is-done" : position === index ? " is-current" : ""}`;
      dot.setAttribute("aria-hidden", "true");
      return dot;
    }));
  }

  function repeat(options = {}) {
    if (!active || complete || document.hidden) return;
    if (outfit === 'free') { speak?.('dress_wardrobe'); return; }
    if (!round.length) return;
    if (solved) playThanks(round[index].target);
    else playPrompt(round[index].target, options);
  }

  function renderQuestion() {
    solved = false;
    misses = 0;
    panel.dataset.mood = "waiting";
    next.disabled = true;
    next.setAttribute("aria-label", index === round.length - 1 ? "Induljunk sétálni!" : "Következő ruhadarab");
    replay.setAttribute("aria-label", "Mit kér a maci? Hallgasd meg újra!");
    status.textContent = "Mit vegyen fel a maci?";
    answers.dataset.count = round[index].choices.length;
    answers.replaceChildren(...round[index].choices.map(item => {
      const button = document.createElement("button");
      button.className = "dress-choice";
      button.dataset.item = item.id;
      button.setAttribute("aria-label", item.label);
      button.append(createDressIcon(item.id));
      const mark = document.createElement("span");
      mark.className = "dress-mark";
      mark.setAttribute("aria-hidden", "true");
      button.append(mark);
      button.addEventListener("click", () => {
        if (!round.length || solved || complete || document.hidden) return;
        if (item.id !== round[index].target.id) {
          effect('retry'); misses++;
          button.classList.remove("is-wrong"); void button.offsetWidth; button.classList.add("is-wrong");
          status.textContent = "Hallgassuk meg újra!";
          panel.dataset.mood = "thinking";
          if (misses >= 2) answers.querySelector(`[data-item="${round[index].target.id}"]`).classList.add("is-hint");
          repeat();
          return;
        }
        solved = true;
        stopPlayback();
        effect('fabric'); bear.wear(item.id);
        panel.dataset.mood = "happy";
        button.classList.add("is-correct");
        mark.textContent = "✓";
        for (const choice of answers.children) choice.disabled = true;
        status.textContent = index === round.length - 1 ? "Felöltöztem! Indulhatunk!" : item.thanks;
        replay.setAttribute("aria-label", "Hallgasd meg újra a macit!");
        next.disabled = false;
        renderProgress();
        playThanks(item);
      });
      return button;
    }));
    renderProgress();
  }

  function renderWardrobe(focusId) {
    weather.textContent = 'Koppints egy ruhára: felvesszük vagy levesszük.';
    progress.replaceChildren(); progress.setAttribute('aria-label', `${worn.size} ruhadarab a macin`);
    answers.dataset.count = 'free';
    answers.replaceChildren(...allDressItems.map(item => {
      const button = document.createElement('button'); button.className = 'dress-choice'; button.dataset.item = item.id;
      button.setAttribute('aria-label', `${item.label}: ${worn.has(item.id) ? 'levétel' : 'felvétel'}`); button.setAttribute('aria-pressed', String(worn.has(item.id)));
      button.append(createDressIcon(item.id)); const label = document.createElement('span'); label.textContent = item.label; button.append(label);
      button.addEventListener('click', () => {
        if (!active || complete || document.hidden) return;
        const removing = worn.has(item.id); worn = toggleDressItem(worn, item.id);
        effect(removing ? 'undo' : 'fabric'); bear.reset(); worn.forEach(id => bear.wear(id));
        renderWardrobe(item.id); status.textContent = `${item.label}: ${removing ? 'levettük' : 'felvettük'}.`;
        stopPlayback(); if (speak) speak(`dress_name_${item.id}`); else playThanks(item);
      }); return button;
    }));
    panel.dataset.mood = worn.size ? 'happy' : 'waiting';
    status.textContent = worn.size ? `${worn.size} ruhadarabot választottál.` : 'Mit vegyen fel a maci?';
    next.disabled = worn.size === 0; next.setAttribute('aria-label', 'Elkészült az öltözék'); replay.setAttribute('aria-label', 'Szabad öltöztetés útmutatója');
    if (focusId) answers.querySelector(`[data-item="${focusId}"]`)?.focus({ preventScroll: true });
  }

  replay.addEventListener("click", () => repeat());
  next.addEventListener("click", () => {
    if (!active || complete || document.hidden) return;
    if (outfit === 'free') {
      if (!worn.size) return;
      complete = true; next.disabled = true; stopPlayback();
      for (const button of answers.children) button.disabled = true;
      onComplete(worn.size); return;
    }
    if (!round.length || !solved) return;
    stopPlayback();
    if (index === round.length - 1) {
      complete = true;
      next.disabled = true;
      onComplete(round.length);
    } else {
      index++;
      renderQuestion();
      replay.focus({ preventScroll: true });
      repeat();
    }
  });

  function start({ announce = true } = {}) {
    onRestart();
    active = true; stopPlayback();
    index = 0; complete = false; worn = new Set(); bear.reset();
    if (outfit === 'free') { round = []; renderWardrobe(); repeat(); return; }
    round = buildDressRound(getChoiceCount(), Math.random, outfit);
    weather.textContent = DRESS_OUTFITS[outfit].text;
    renderQuestion(); repeat({ intro: announce });
  }
  return { start, stop() { active = false; round = []; stopPlayback(); }, repeat };
}
