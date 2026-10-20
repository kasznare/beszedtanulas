import { buildTeddyRound, buildExpressiveTeddyRound, teddyFoodForPhrase, teddyAccusative } from "./teddy-data.js";
import { setWordPicture } from "./word-art.js";
import { setGameTitle } from "./game-heading.js";

const TEDDY_TITLES = { single: "Etesd meg a macit!", sequence: "Először… aztán…", expressive: "Én kérek" };

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
  let expressionLength = 2, selectedFood = null, expressivePhase = "choose";
  let launchPhraseId = null, launchFoodId = null;
  const modeControls = document.createElement("div");
  modeControls.className = "teddy-modes";
  modeControls.setAttribute("role", "group");
  modeControls.setAttribute("aria-label", "Etetős játék módja");
  modeControls.innerHTML = '<button type="button" data-teddy-mode="single" aria-pressed="true">Egy finomság</button><button type="button" data-teddy-mode="sequence" aria-pressed="false">Először… aztán…</button><button type="button" data-teddy-mode="expressive" aria-pressed="false">Én kérek</button>';
  panel.prepend(modeControls);
  const expressionControls = document.createElement("div");
  expressionControls.className = "teddy-expression";
  expressionControls.hidden = true;
  expressionControls.innerHTML = '<div class="teddy-expression-length" role="group" aria-label="Hány szót mondunk?"><button type="button" data-expression-length="1" aria-pressed="false">Egy szó</button><button type="button" data-expression-length="2" aria-pressed="true">Két szó</button></div><button type="button" class="teddy-expression-confirm" disabled>Kimondtam ✓</button><button type="button" class="teddy-expression-give" disabled>Add oda Macinak →</button>';
  answers.after(expressionControls);
  const confirmExpression = expressionControls.querySelector(".teddy-expression-confirm");
  const giveExpression = expressionControls.querySelector(".teddy-expression-give");
  const scene = panel.querySelector(".teddy-scene");
  const chosenVisual = document.createElement("div");
  chosenVisual.className = "teddy-chosen-food";
  chosenVisual.setAttribute("aria-hidden", "true");
  chosenVisual.hidden = true;
  scene.append(chosenVisual);
  const meal = document.createElement("div");
  meal.className = "teddy-meal";
  meal.setAttribute("role", "group");
  meal.setAttribute("aria-label", "Maci megkapta");
  scene.append(meal);
  const order = document.createElement("ol"); order.className = "teddy-order"; order.setAttribute("aria-label", "Az etetés sorrendje");
  answers.before(order);
  modeControls.querySelectorAll("button").forEach(button => button.addEventListener("click", () => {
    if (!active || document.hidden) return;
    requestMode = button.dataset.teddyMode;
    modeControls.querySelectorAll("button").forEach(item => item.setAttribute("aria-pressed", String(item === button)));
    start({ announce: false });
  }));
  expressionControls.querySelectorAll("[data-expression-length]").forEach(button => button.addEventListener("click", () => {
    if (!active || requestMode !== "expressive" || document.hidden) return;
    expressionLength = Number(button.dataset.expressionLength);
    expressionControls.querySelectorAll("[data-expression-length]").forEach(item => item.setAttribute("aria-pressed", String(item === button)));
    if (selectedFood && expressivePhase === "model") { status.textContent = modelText(selectedFood); repeat(); }
  }));
  confirmExpression.addEventListener("click", () => {
    if (!active || requestMode !== "expressive" || expressivePhase !== "model" || !selectedFood || document.hidden) return;
    expressivePhase = "give";
    confirmExpression.disabled = true;
    giveExpression.disabled = false;
    expressionControls.querySelectorAll("[data-expression-length]").forEach(button => { button.disabled = true; });
    status.textContent = "Most add oda Macinak!";
    panel.dataset.mood = "happy";
    giveExpression.focus({ preventScroll: true });
  });
  giveExpression.addEventListener("click", () => {
    if (!active || requestMode !== "expressive" || expressivePhase !== "give" || !selectedFood || document.hidden) return;
    const button = answers.querySelector(`[data-word="${selectedFood.id}"]`);
    if (!button) return;
    expressivePhase = "feeding";
    giveExpression.disabled = true;
    round[index].targets = [selectedFood];
    feed(button, selectedFood);
  });
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
    if (requestMode === "expressive") {
      if (selectedFood && !solved && expressivePhase !== "feeding") speak?.(`${expressionLength === 1 ? "word" : "teddy"}_${selectedFood.id}`);
      else if (solved) playThanks();
      return;
    }
    if (solved) playThanks();
    else if (requestMode === "sequence" && step === 0 && speak) speak(`teddy_sequence_${round[index].targets.map(food => food.id).join("_")}`);
    else playPrompt(round[index].targets[step], options);
  }

  function modelText(food) {
    return `Mondd: ${expressionLength === 1 ? food.label : `Kérek ${teddyAccusative[food.id]}`}`;
  }

  function ready() {
    panel.dataset.mood = "happy";
    status.textContent = requestMode === "expressive" ? `Maci megkapta ${selectedFood.id === "alma" ? "az" : "a"} ${teddyAccusative[selectedFood.id]}. Köszönöm!` : "De finom! Köszönöm!";
    if (requestMode === "expressive") {
      chosenVisual.hidden = true;
      if (expressivePhase !== "done") {
        expressivePhase = "done";
        const icon = document.createElement("span");
        setWordPicture(icon, selectedFood);
        icon.setAttribute("aria-hidden", "true");
        meal.append(icon);
      }
    }
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
    selectedFood = null;
    expressivePhase = "choose";
    chosenVisual.hidden = true;
    chosenVisual.replaceChildren();
    expressionControls.hidden = requestMode !== "expressive";
    confirmExpression.disabled = true;
    giveExpression.disabled = true;
    panel.dataset.mood = "waiting";
    next.disabled = true;
    next.classList.remove("is-ready");
    next.setAttribute("aria-label", index === round.length - 1 ? "Piknik befejezése" : "Következő finomság");
    replay.disabled = requestMode === "expressive";
    replay.setAttribute("aria-label", requestMode === "expressive" ? "Hallgasd meg újra a mintát!" : "Mit kér a maci? Hallgasd meg újra!");
    expressionControls.querySelectorAll("[data-expression-length]").forEach(button => { button.disabled = false; });
    status.textContent = requestMode === "expressive" ? "Válassz finomságot, amit kérsz!" : "Mit kér a maci?";
    answers.setAttribute("aria-label", requestMode === "expressive" ? "Melyik finomságot kéred?" : "Mivel kínálod meg a macit?");
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
        if (solved || complete || !round.length || document.hidden || (requestMode !== "expressive" && replay.disabled)) return;
        if (requestMode === "expressive") {
          if (expressivePhase !== "choose" && expressivePhase !== "model") return;
          selectedFood = food;
          expressivePhase = "model";
          answers.querySelectorAll(".teddy-plate").forEach(item => item.classList.toggle("is-selected", item === button));
          setWordPicture(chosenVisual, food);
          chosenVisual.hidden = false;
          panel.dataset.mood = "waiting";
          status.textContent = modelText(food);
          confirmExpression.disabled = false;
          giveExpression.disabled = true;
          replay.disabled = false;
          repeat();
          return;
        }
        if (food.id !== round[index].targets[step].id) {
          effect('retry'); misses += 1;
          button.classList.remove("is-wrong"); void button.offsetWidth; button.classList.add("is-wrong");
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
      onComplete(round.length, { mode: requestMode });
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
    if (requestMode !== "expressive" && round.length && interrupted && !solved && !complete) {
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

  function start({ announce = true, mode, phraseId, foodId } = {}) {
    onRestart();
    active = true;
    if (mode && TEDDY_TITLES[mode]) requestMode = mode;
    setGameTitle(panel, TEDDY_TITLES[requestMode]);
    launchPhraseId = phraseId || null;
    launchFoodId = foodId || null;
    modeControls.querySelectorAll("button").forEach(item => item.setAttribute("aria-pressed", String(item.dataset.teddyMode === requestMode)));
    ++generation;
    clearFlight(); stopPlayback();
    const options = getOptions();
    const firstFoodId = launchFoodId || teddyFoodForPhrase(launchPhraseId);
    round = requestMode === "expressive"
      ? buildExpressiveTeddyRound(options.length, options.choiceCount, firstFoodId)
      : buildTeddyRound(options.length, options.choiceCount, requestMode);
    meal.replaceChildren();
    index = 0; complete = false;
    renderQuestion();
    if (requestMode !== "expressive") repeat({ intro: announce });
  }
  return {
    start,
    startExpressive(options = {}) { start({ ...options, mode: "expressive" }); },
    restart() { start({ mode: requestMode, phraseId: launchPhraseId, foodId: launchFoodId }); },
    getContext() { return { mode: requestMode, phraseId: launchPhraseId, foodId: launchFoodId, expressionLength }; },
    stop() { active = false; ++generation; round = []; clearFlight(); stopPlayback(); },
    repeat,
  };
}
