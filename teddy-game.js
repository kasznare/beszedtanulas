import { buildTeddyRound } from "./teddy-data.js";
import { setWordPicture } from "./word-art.js";

export function setupTeddyGame({ effect = () => {}, getOptions, playPrompt, playThanks, stopPlayback, onComplete, speak, onRestart = () => {} }) {
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
  let requestMode = "single", step = 0, active = false;
  const modeControls = document.createElement("div");
  modeControls.className = "teddy-modes";
  modeControls.setAttribute("role", "group");
  modeControls.setAttribute("aria-label", "Etetős játék nehézsége");
  modeControls.innerHTML = '<button type="button" data-teddy-mode="single" aria-pressed="true">Egy finomság</button><button type="button" data-teddy-mode="sequence" aria-pressed="false">Először… aztán…</button>';
  panel.prepend(modeControls);
  const order = document.createElement("ol"); order.className = "teddy-order"; order.setAttribute("aria-label", "Az etetés sorrendje");
  answers.before(order);
  modeControls.querySelectorAll("button").forEach(button => button.addEventListener("click", () => {
    if (!active || document.hidden) return;
    requestMode = button.dataset.teddyMode;
    modeControls.querySelectorAll("button").forEach(item => item.setAttribute("aria-pressed", String(item === button)));
    start({ announce: false });
  }));
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
    else if (requestMode === "sequence" && step === 0 && speak) speak(`teddy_sequence_${round[index].targets.map(food => food.id).join("_")}`);
    else playPrompt(round[index].targets[step], options);
  }

  function ready() {
    panel.dataset.mood = "happy";
    status.textContent = "De finom! Köszönöm!";
    replay.setAttribute("aria-label", "Hallgasd meg újra a macit!");
    next.disabled = false;
    next.classList.add("is-ready");
  }

  async function feed(button, food) {
    solved = step === round[index].targets.length - 1;
    effect('collect');
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
      setWordPicture(morsel, food);
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
    if (!solved) {
      step += 1;
      misses = 0;
      panel.dataset.mood = "waiting";
      status.textContent = "Az első megvan! Most jöhet a második.";
      renderOrder();
      for (const choice of answers.children) { choice.disabled = choice.dataset.word === round[index].targets[0].id; choice.classList.remove("is-hint"); }
      answers.querySelector(":not([disabled])")?.focus({ preventScroll: true });
      repeat();
    } else { ready(); renderOrder(); playThanks(); }
  }

  function renderOrder() {
    order.hidden = requestMode !== "sequence";
    order.replaceChildren(...round[index].targets.map((food, position) => {
      const item = document.createElement("li");
      item.className = position < step || solved ? "is-done" : position === step ? "is-current" : "";
      item.setAttribute("aria-current", String(position === step && !solved));
      const image = document.createElement("span"); setWordPicture(image, food); image.setAttribute("aria-hidden", "true");
      const label = document.createElement("span"); label.textContent = `${position + 1}. ${food.label}${position < step || solved ? " ✓" : ""}`;
      item.append(image, label); return item;
    }));
  }

  function renderQuestion() {
    solved = false;
    step = 0;
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
      setWordPicture(picture, food);
      button.append(picture);
      button.addEventListener("click", () => {
        if (solved || complete || !round.length || document.hidden || replay.disabled) return;
        if (food.id !== round[index].targets[step].id) {
          effect('retry'); misses += 1;
          status.textContent = "Hallgassuk meg újra!";
          panel.dataset.mood = "thinking";
          if (misses >= 2) answers.querySelector(`[data-word="${round[index].targets[step].id}"]`).classList.add("is-hint");
          repeat();
          return;
        }
        feed(button, food);
      });
      return button;
    }));
    renderProgress();
    renderOrder();
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
    const interrupted = !!flight || replay.disabled;
    ++generation;
    clearFlight();
    if (round.length && interrupted && !solved && !complete) {
      step += 1; renderOrder();
      for (const choice of answers.children) choice.disabled = choice.dataset.word === round[index].targets[0].id;
      panel.dataset.mood = "waiting"; status.textContent = "Most jöhet a második finomság!"; replay.disabled = false;
    }
    if (round.length && solved && !complete) {
      ready();
      renderOrder();
      replay.disabled = false;
    }
  }
  document.addEventListener("visibilitychange", () => { if (document.hidden) suspend(); });
  window.addEventListener("pagehide", suspend);

  function start({ announce = true } = {}) {
    onRestart();
    active = true;
    ++generation;
    clearFlight(); stopPlayback();
    const options = getOptions();
    round = buildTeddyRound(options.length, options.choiceCount, requestMode);
    index = 0; complete = false;
    renderQuestion(); repeat({ intro: announce });
  }
  return { start, stop() { active = false; ++generation; round = []; clearFlight(); stopPlayback(); }, repeat };
}
