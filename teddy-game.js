import { words, teddyRequests } from "./game-data.js";
import { buildListeningRound } from "./listening-game.js";

export function setupTeddyGame({ getOptions, playPrompt, playThanks, stopPlayback, onComplete, onRestart = () => {} }) {
  const panel = document.querySelector("#teddy-game");
  const answers = document.querySelector("#teddy-answers");
  const progress = document.querySelector("#teddy-progress");
  const status = document.querySelector("#teddy-status");
  const next = document.querySelector("#teddy-next");
  const replay = document.querySelector("#teddy-replay");
  const mouth = document.querySelector("#teddy-mouth");
  let round = [];
  let index = 0;
  let solved = false;
  let complete = false;
  let misses = 0;
  let generation = 0;
  let flight;
  let morsel;

  function clearFlight() {
    flight?.cancel();
    flight = null;
    morsel?.remove();
    morsel = null;
  }

  function renderProgress() {
    const done = index + Number(solved);
    progress.setAttribute("aria-label", `${done} / ${round.length} finomság`);
    progress.replaceChildren(...round.map((_, position) => {
      const dot = document.createElement("span");
      dot.className = `progress-dot${position < done ? " is-done" : position === index ? " is-current" : ""}`;
      dot.setAttribute("aria-hidden", "true");
      return dot;
    }));
  }

  function repeat(options = {}) {
    if (!round.length || complete || document.hidden) return;
    if (solved) playThanks();
    else playPrompt(round[index].target, options);
  }

  function ready() {
    panel.dataset.mood = "happy";
    status.textContent = "De finom! Köszönöm!";
    replay.setAttribute("aria-label", "Hallgasd meg újra a macit!");
    next.disabled = false;
    next.classList.add("is-ready");
  }

  async function feed(button, food) {
    solved = true;
    stopPlayback();
    button.classList.add("is-fed");
    for (const choice of answers.children) choice.disabled = true;
    renderProgress();
    panel.dataset.mood = "eating";
    status.textContent = "Hamm!";
    replay.disabled = true;
    const token = ++generation;
    const origin = button.querySelector(".teddy-food").getBoundingClientRect();
    const destination = mouth.getBoundingClientRect();
    if (!matchMedia("(prefers-reduced-motion: reduce)").matches && button.animate) {
      morsel = document.createElement("span");
      morsel.className = "teddy-morsel";
      morsel.textContent = food.emoji;
      morsel.setAttribute("aria-hidden", "true");
      Object.assign(morsel.style, { left: `${origin.left}px`, top: `${origin.top}px`, width: `${origin.width}px`, height: `${origin.height}px`, fontSize: getComputedStyle(button.querySelector(".teddy-food")).fontSize });
      document.body.append(morsel);
      const dx = destination.left + destination.width / 2 - origin.left - origin.width / 2;
      const dy = destination.top + destination.height / 2 - origin.top - origin.height / 2;
      flight = morsel.animate([
        { transform: "translate(0, 0) scale(1)", opacity: 1 },
        { transform: `translate(${dx * .55}px, ${dy * .55 - 35}px) scale(.85)`, opacity: 1, offset: .55 },
        { transform: `translate(${dx}px, ${dy}px) scale(.12)`, opacity: 0 },
      ], { duration: 650, easing: "ease-in-out", fill: "forwards" });
      await flight.finished.catch(() => {});
    }
    if (token !== generation || !round.length || document.hidden) return;
    clearFlight();
    replay.disabled = false;
    ready();
    playThanks();
  }

  function renderQuestion() {
    solved = false;
    misses = 0;
    panel.dataset.mood = "waiting";
    next.disabled = true;
    next.classList.remove("is-ready");
    next.setAttribute("aria-label", index === round.length - 1 ? "Piknik befejezése" : "Következő finomság");
    replay.disabled = false;
    replay.setAttribute("aria-label", "Mit kér a maci? Hallgasd meg újra!");
    status.textContent = "Mit kér a maci?";
    answers.dataset.count = round[index].choices.length;
    answers.replaceChildren(...round[index].choices.map(food => {
      const button = document.createElement("button");
      button.className = "teddy-plate";
      button.dataset.word = food.id;
      button.setAttribute("aria-label", food.label);
      const picture = document.createElement("span");
      picture.className = "teddy-food";
      picture.setAttribute("aria-hidden", "true");
      picture.textContent = food.emoji;
      button.append(picture);
      button.addEventListener("click", () => {
        if (solved || complete || !round.length || document.hidden) return;
        if (food.id !== round[index].target.id) {
          misses += 1;
          status.textContent = "Hallgassuk meg újra!";
          panel.dataset.mood = "thinking";
          if (misses >= 2) answers.querySelector(`[data-word="${round[index].target.id}"]`).classList.add("is-hint");
          repeat();
          return;
        }
        feed(button, food);
      });
      return button;
    }));
    renderProgress();
  }

  replay.addEventListener("click", () => repeat());
  next.addEventListener("click", () => {
    if (!solved || complete || !round.length || next.disabled) return;
    ++generation;
    clearFlight();
    stopPlayback();
    if (index === round.length - 1) {
      complete = true;
      next.disabled = true;
      onComplete(round.length);
    } else {
      index += 1;
      renderQuestion();
      replay.focus({ preventScroll: true });
      repeat();
    }
  });

  function suspend() {
    ++generation;
    clearFlight();
    if (round.length && solved && !complete) {
      ready();
      replay.disabled = false;
    }
  }
  document.addEventListener("visibilitychange", () => { if (document.hidden) suspend(); });
  window.addEventListener("pagehide", suspend);

  return {
    start({ announce = true } = {}) {
      onRestart();
      ++generation;
      clearFlight();
      const options = getOptions();
      round = buildListeningRound(words.filter(word => Object.hasOwn(teddyRequests, word.id)), options.length, options.choiceCount);
      index = 0;
      complete = false;
      renderQuestion();
      repeat({ intro: announce });
    },
    stop() { ++generation; round = []; clearFlight(); stopPlayback(); },
    repeat,
  };
}
