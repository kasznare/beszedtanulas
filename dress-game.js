import { buildDressRound } from "./dress-data.js";
import { createDressBear, createDressIcon } from "./dress-art.js";

export function setupDressGame({ getChoiceCount, playPrompt, playThanks, stopPlayback, onComplete, onRestart = () => {} }) {
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
  let misses = 0;

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
    if (!round.length || complete || document.hidden) return;
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
          misses++;
          status.textContent = "Hallgassuk meg újra!";
          panel.dataset.mood = "thinking";
          if (misses >= 2) answers.querySelector(`[data-item="${round[index].target.id}"]`).classList.add("is-hint");
          repeat();
          return;
        }
        solved = true;
        stopPlayback();
        bear.wear(item.id);
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

  replay.addEventListener("click", () => repeat());
  next.addEventListener("click", () => {
    if (!round.length || !solved || complete) return;
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

  return {
    start({ announce = true } = {}) {
      onRestart();
      stopPlayback();
      round = buildDressRound(getChoiceCount());
      index = 0;
      complete = false;
      bear.reset();
      renderQuestion();
      repeat({ intro: announce });
    },
    stop() { round = []; stopPlayback(); },
    repeat,
  };
}
