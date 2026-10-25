import { buildTeddyRequest, buildSequenceRequest, buildExpressiveTeddyRound, sequencePromptIds, shouldAskForMore, teddyFoodForPhrase, teddyAccusative, teddyPlateRange, teddyStars, updateTeddyLadder, TEDDY_SPAN, TEDDY_MAX_HELPINGS } from "./teddy-data.js";
import { setWordPicture } from "./word-art.js";
import { setGameTitle } from "./game-heading.js";

const TEDDY_TITLES = { single: "Etesd meg a macit!", sequence: "Először… aztán…", expressive: "Én kérek" };
const SVG_NS = "http://www.w3.org/2000/svg";
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));

export function setupTeddyGame({ effect = () => {}, getOptions, playPrompt, playThanks, stopPlayback, onComplete, speak = () => {}, onRestart = () => {}, random = Math.random }) {
  const panel = document.querySelector("#teddy-game");
  const answers = document.querySelector("#teddy-answers");
  const progress = document.querySelector("#teddy-progress");
  const status = document.querySelector("#teddy-status");
  const next = document.querySelector("#teddy-next");
  const replay = document.querySelector("#teddy-replay");
  const mouth = document.querySelector("#teddy-mouth");
  let requestMode = "single", active = false, complete = false, solved = false, busy = false;
  let total = 5, done = 0, cleanCount = 0, utterances = 0, choiceCount = 2;
  let request = null, expressiveItems = [], step = 0, misses = 0, requestClean = true, generation = 0;
  let plateRange = teddyPlateRange(2), plates = { level: plateRange.min, clean: 0, missed: 0 };
  // The memory span is kept between sessions, so a child who mastered three foods starts there again.
  let span = { level: TEDDY_SPAN.min, clean: 0, missed: 0 };
  let expressionLength = 2, selectedFood = null, phase = "choose", helpings = 0;
  let launchPhraseId = null, launchFoodId = null;
  let flight = null, morsel = null, settle = null;

  const modeControls = document.createElement("div");
  modeControls.className = "teddy-modes";
  modeControls.setAttribute("role", "group");
  modeControls.setAttribute("aria-label", "Etetős játék módja");
  modeControls.innerHTML = '<button type="button" data-teddy-mode="single" aria-pressed="true">Egy finomság</button><button type="button" data-teddy-mode="sequence" aria-pressed="false">Először… aztán…</button><button type="button" data-teddy-mode="expressive" aria-pressed="false">Én kérek</button>';
  panel.prepend(modeControls);
  const expressionControls = document.createElement("div");
  expressionControls.className = "teddy-expression";
  expressionControls.hidden = true;
  expressionControls.innerHTML = '<div class="teddy-expression-length" role="group" aria-label="Hány szót mondunk?"><button type="button" data-expression-length="1" aria-pressed="false">Egy szó</button><button type="button" data-expression-length="2" aria-pressed="true">Két szó</button></div><button type="button" class="teddy-expression-confirm" disabled>Kimondtam ✓</button><div class="teddy-expression-offer" role="group" aria-label="Kérsz még?" hidden><button type="button" data-teddy-offer="more">Még kérek</button><button type="button" data-teddy-offer="enough">Elég volt</button></div>';
  answers.after(expressionControls);
  const confirmExpression = expressionControls.querySelector(".teddy-expression-confirm");
  const offer = expressionControls.querySelector(".teddy-expression-offer");
  const moreButton = offer.querySelector('[data-teddy-offer="more"]');
  const enoughButton = offer.querySelector('[data-teddy-offer="enough"]');
  const scene = panel.querySelector(".teddy-scene");
  const chosenVisual = document.createElement("div");
  chosenVisual.className = "teddy-chosen-food";
  chosenVisual.setAttribute("aria-hidden", "true");
  chosenVisual.hidden = true;
  scene.append(chosenVisual);
  // Requests now continue by themselves; the skip arrow waits in the corner of the scene instead of taking a table row.
  scene.append(next);
  // In "Én kérek" this is the child's own plate: Maci passes every requested food onto it.
  const meal = document.createElement("div");
  meal.className = "teddy-meal";
  meal.setAttribute("role", "group");
  meal.setAttribute("aria-label", "A te tányérod");
  scene.append(meal);
  const order = document.createElement("ol"); order.className = "teddy-order"; order.setAttribute("aria-label", "Az etetés sorrendje");
  answers.before(order);
  // Maci's tummy fills up with every food he eats.
  const belly = panel.querySelector(".teddy-body > ellipse:nth-child(2)");
  const tummy = document.createElementNS(SVG_NS, "rect");
  if (belly) {
    const clip = document.createElementNS(SVG_NS, "clipPath");
    clip.id = "teddy-belly-clip";
    const shape = document.createElementNS(SVG_NS, "ellipse");
    for (const [name, value] of Object.entries({ cx: 180, cy: 251, rx: 53, ry: 53 })) shape.setAttribute(name, value);
    clip.append(shape);
    for (const [name, value] of Object.entries({ class: "teddy-tummy", x: 127, y: 198, width: 106, height: 80, "clip-path": "url(#teddy-belly-clip)" })) tummy.setAttribute(name, value);
    belly.after(clip, tummy);
  }
  const setTummy = fraction => tummy.style.setProperty("--tummy", String(Math.max(0, Math.min(1, fraction))));

  modeControls.querySelectorAll("button").forEach(button => button.addEventListener("click", () => {
    if (!active || document.hidden) return;
    requestMode = button.dataset.teddyMode;
    start({ announce: false });
  }));
  expressionControls.querySelectorAll("[data-expression-length]").forEach(button => button.addEventListener("click", () => {
    if (!active || requestMode !== "expressive" || document.hidden) return;
    expressionLength = Number(button.dataset.expressionLength);
    expressionControls.querySelectorAll("[data-expression-length]").forEach(item => item.setAttribute("aria-pressed", String(item === button)));
    if (selectedFood && phase === "model") { status.textContent = modelText(selectedFood); repeat(); }
  }));
  confirmExpression.addEventListener("click", () => {
    if (!active || requestMode !== "expressive" || phase !== "model" || !selectedFood || document.hidden) return;
    utterances += 1;
    expressionControls.querySelectorAll("[data-expression-length]").forEach(button => { button.disabled = true; });
    serve(selectedFood);
  });
  moreButton.addEventListener("click", () => {
    if (!active || requestMode !== "expressive" || phase !== "offer" || helpings >= TEDDY_MAX_HELPINGS || document.hidden) return;
    utterances += 1;
    serve(selectedFood, () => speak("phrase_meg_kerek"));
  });
  enoughButton.addEventListener("click", () => {
    if (!active || requestMode !== "expressive" || phase !== "offer" || document.hidden) return;
    utterances += 1;
    phase = "done";
    moreButton.disabled = enoughButton.disabled = true;
    finishRequest();
  });

  function clearFlight() {
    flight?.cancel();
    flight = null;
    morsel?.remove();
    morsel = null;
  }

  async function fly(from, to, food) {
    if (matchMedia("(prefers-reduced-motion: reduce)").matches || !from?.animate) return;
    const origin = from.getBoundingClientRect();
    const destination = to.getBoundingClientRect();
    morsel = document.createElement("span");
    morsel.className = "teddy-morsel";
    setWordPicture(morsel, food);
    morsel.setAttribute("aria-hidden", "true");
    Object.assign(morsel.style, { left: `${origin.left}px`, top: `${origin.top}px`, width: `${origin.width}px`, height: `${origin.height}px`, fontSize: getComputedStyle(from).fontSize });
    document.body.append(morsel);
    const dx = destination.left + destination.width / 2 - origin.left - origin.width / 2;
    const dy = destination.top + destination.height / 2 - origin.top - origin.height / 2;
    const end = to === mouth ? .12 : .45;
    flight = morsel.animate([
      { transform: "translate(0, 0) scale(1)", opacity: 1 },
      { transform: `translate(${dx * .55}px, ${dy * .55 - 35}px) scale(.85)`, opacity: 1, offset: .55 },
      { transform: `translate(${dx}px, ${dy}px) scale(${end})`, opacity: to === mouth ? 0 : 1 },
    ], { duration: 650, easing: "ease-in-out", fill: "forwards" });
    await flight.finished.catch(() => {});
  }

  function renderProgress() {
    progress.setAttribute("aria-label", `${done} / ${total} finomság`);
    progress.replaceChildren(...Array.from({ length: total }, (_, position) => {
      const dot = document.createElement("span");
      dot.className = `progress-dot${position < done ? " is-done" : position === done ? " is-current" : ""}`;
      dot.setAttribute("aria-hidden", "true");
      return dot;
    }));
  }

  const modelId = food => `${expressionLength === 1 ? "word" : "teddy"}_${food.id}`;
  function modelText(food) {
    return `Mondd: ${expressionLength === 1 ? food.label : `Kérek ${teddyAccusative[food.id]}`}`;
  }

  function prompt(options = {}) {
    if (requestMode === "expressive") return speak(selectedFood && phase !== "choose" ? modelId(selectedFood) : "guide_listening");
    if (requestMode === "sequence") return speak(sequencePromptIds(request.targets, { intro: options.intro }));
    if (request.again && !options.intro) return speak("phrase_meg_kerek");
    return playPrompt(request.target, options);
  }

  function repeat(options = {}) {
    if (!request || complete || document.hidden || busy) return;
    if (solved) { if (requestMode !== "expressive") playThanks(); return; }
    prompt(options);
  }

  function renderOrder() {
    order.hidden = requestMode !== "sequence" || !request;
    if (order.hidden) { order.replaceChildren(); return; }
    // The order stays secret: each slot shows its food only after Maci ate it.
    order.replaceChildren(...request.targets.map((food, position) => {
      const item = document.createElement("li");
      const fed = position < step;
      item.className = fed ? "is-done" : position === step && !solved ? "is-current" : "";
      item.setAttribute("aria-current", String(position === step && !solved));
      const image = document.createElement("span"); image.setAttribute("aria-hidden", "true");
      const label = document.createElement("span");
      if (fed) { setWordPicture(image, food); label.textContent = `${position + 1}. ${food.label} ✓`; }
      else { image.className = "teddy-order-blank"; image.textContent = "?"; label.textContent = `${position + 1}.`; }
      item.append(image, label); return item;
    }));
  }

  function ready() {
    panel.dataset.mood = "happy";
    if (requestMode !== "expressive") status.textContent = done >= total ? "Elég volt! Tele a pocakom." : "De finom! Köszönöm!";
    else status.textContent = done >= total ? "Elég volt! Köszönöm." : "Jó étvágyat!";
    replay.setAttribute("aria-label", "Hallgasd meg újra a macit!");
    next.setAttribute("aria-label", done >= total ? "Piknik befejezése" : "Következő finomság");
    next.disabled = false;
    next.classList.add("is-ready");
  }

  // A finished request is thanked, then the next one starts by itself; Next only skips the wait.
  async function finishRequest({ silent = false } = {}) {
    solved = true;
    done += 1;
    if (requestClean) cleanCount += 1;
    if (requestMode === "single") plates = updateTeddyLadder(plates, requestClean, plateRange);
    if (requestMode === "sequence") span = updateTeddyLadder(span, requestClean, TEDDY_SPAN);
    renderProgress();
    renderOrder();
    ready();
    if (silent) return;
    const token = generation;
    const last = done >= total;
    const line = requestMode === "expressive" || last ? speak("phrase_eleg_volt") : playThanks();
    await Promise.all([line, wait(last ? 900 : 1300)]);
    if (token !== generation || !active || complete || document.hidden) return;
    advance();
  }

  async function feed(button, food) {
    busy = true;
    effect("collect");
    stopPlayback();
    const fedStep = step;
    step += 1;
    const finished = step === request.targets.length;
    button.classList.add("is-fed");
    for (const choice of answers.children) choice.disabled = true;
    panel.dataset.mood = "eating";
    status.textContent = "Hamm!";
    replay.disabled = true;
    const token = ++generation;
    settle = silent => {
      settle = null; busy = false;
      clearFlight();
      replay.disabled = false;
      setTummy((done + step / request.targets.length) / total);
      if (finished) { finishRequest({ silent }); return; }
      misses = 0;
      panel.dataset.mood = "waiting";
      status.textContent = "Ügyes! És aztán?";
      renderOrder();
      for (const choice of answers.children) { choice.disabled = choice.classList.contains("is-fed"); choice.classList.remove("is-hint"); }
      answers.querySelector(":not([disabled])")?.focus({ preventScroll: true });
      if (!silent && request.targets.length === 2 && fedStep === 0) speak("teddy_sequence_next");
    };
    await fly(button.querySelector(".teddy-food"), mouth, food);
    if (token !== generation) return;
    settle?.(false);
  }

  function wrong(button) {
    effect("retry");
    misses += 1;
    requestClean = false;
    button.classList.remove("is-wrong"); void button.offsetWidth; button.classList.add("is-wrong");
    status.textContent = "Nem kérem! Figyeld, mit kér!";
    panel.dataset.mood = "thinking";
    if (misses >= 2) answers.querySelector(`[data-word="${request.targets[step].id}"]`)?.classList.add("is-hint");
    const again = requestMode === "sequence" ? sequencePromptIds(request.targets) : [`teddy_${request.target.id}`];
    speak(["phrase_nem_kerem", ...again]);
  }

  function choose(food, button) {
    selectedFood = food;
    phase = "model";
    answers.querySelectorAll(".teddy-plate").forEach(item => item.classList.toggle("is-selected", item === button));
    setWordPicture(chosenVisual, food);
    chosenVisual.hidden = false;
    panel.dataset.mood = "waiting";
    status.textContent = modelText(food);
    confirmExpression.disabled = false;
    replay.disabled = false;
    speak(modelId(food));
  }

  // "Én kérek": the child asks, and Maci passes the chosen food onto the child's plate.
  async function serve(food, voice) {
    busy = true;
    phase = "serving";
    stopPlayback();
    voice?.();
    effect("collect");
    confirmExpression.disabled = true;
    moreButton.disabled = enoughButton.disabled = true;
    for (const choice of answers.children) choice.disabled = true;
    panel.dataset.mood = "happy";
    status.textContent = "Tessék!";
    const token = ++generation;
    const source = answers.querySelector(`[data-word="${food.id}"] .teddy-food`);
    settle = () => {
      settle = null; busy = false;
      clearFlight();
      helpings += 1;
      const icon = document.createElement("span");
      setWordPicture(icon, food);
      icon.setAttribute("aria-hidden", "true");
      meal.append(icon);
      meal.setAttribute("aria-label", `A te tányérod: ${meal.children.length} finomság`);
      phase = "offer";
      chosenVisual.hidden = true;
      confirmExpression.hidden = true;
      offer.hidden = false;
      enoughButton.disabled = false;
      moreButton.disabled = helpings >= TEDDY_MAX_HELPINGS;
      status.textContent = helpings >= TEDDY_MAX_HELPINGS ? "Ennyi elég lesz." : "Kérsz még?";
      (moreButton.disabled ? enoughButton : moreButton).focus({ preventScroll: true });
    };
    await fly(source, meal, food);
    if (token !== generation) return;
    settle?.();
  }

  function renderRequest() {
    solved = false; step = 0; misses = 0; requestClean = true;
    selectedFood = null; phase = "choose"; helpings = 0;
    const expressive = requestMode === "expressive";
    chosenVisual.hidden = true;
    chosenVisual.replaceChildren();
    expressionControls.hidden = !expressive;
    confirmExpression.hidden = false;
    confirmExpression.disabled = true;
    offer.hidden = true;
    panel.dataset.mood = "waiting";
    panel.dataset.requestMode = requestMode;
    next.disabled = true;
    next.classList.remove("is-ready");
    next.setAttribute("aria-label", done === total - 1 ? "Piknik befejezése" : "Következő finomság");
    replay.disabled = false;
    replay.setAttribute("aria-label", expressive ? "Hallgasd meg újra a mintát!" : "Mit kér a maci? Hallgasd meg újra!");
    expressionControls.querySelectorAll("[data-expression-length]").forEach(button => { button.disabled = false; });
    status.textContent = expressive ? "Mit kérsz?" : requestMode === "sequence" ? "Jegyezd meg a sorrendet!" : request.again ? "„Még kérek!”" : "Mit kér a maci?";
    answers.setAttribute("aria-label", expressive ? "Melyik finomságot kéred?" : "Mivel kínálod meg a macit?");
    answers.dataset.count = request.choices.length;
    answers.replaceChildren(...request.choices.map(food => {
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
        if (!active || solved || complete || !request || busy || document.hidden) return;
        if (requestMode === "expressive") {
          if (phase === "choose" || phase === "model") choose(food, button);
          return;
        }
        if (button.classList.contains("is-fed")) return;
        if (food.id !== request.targets[step].id) wrong(button);
        else feed(button, food);
      });
      return button;
    }));
    renderProgress();
    renderOrder();
  }

  function buildNext() {
    if (requestMode === "expressive") return expressiveItems[done];
    if (requestMode === "sequence") return buildSequenceRequest({ span: span.level, choiceCount, previousIds: request?.targets.map(food => food.id) || [], random });
    const again = shouldAskForMore({ random, previousWasMore: Boolean(request?.again) });
    return buildTeddyRequest({ plates: plates.level, previousId: request?.target.id, again, random });
  }

  function stars() {
    return requestMode === "expressive" ? Math.max(1, Math.min(5, utterances)) : teddyStars(cleanCount, total);
  }

  function advance() {
    if (!solved || complete || !request) return;
    ++generation;
    settle = null; busy = false;
    clearFlight();
    stopPlayback();
    if (done >= total) {
      complete = true;
      next.disabled = true;
      onComplete(stars(), { mode: requestMode, clean: cleanCount, total });
      return;
    }
    request = buildNext();
    renderRequest();
    replay.focus({ preventScroll: true });
    prompt();
  }

  replay.addEventListener("click", () => repeat());
  next.addEventListener("click", () => { if (!next.disabled) advance(); });

  function suspend() {
    const pending = settle;
    ++generation;
    clearFlight();
    if (pending) pending(true);
    else if (request && solved && !complete) ready();
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
    settle = null; busy = false;
    clearFlight(); stopPlayback();
    const options = getOptions();
    total = [3, 5, 10].includes(options.length) ? options.length : 5;
    choiceCount = options.choiceCount === 3 ? 3 : 2;
    plateRange = teddyPlateRange(choiceCount);
    plates = { level: plateRange.min, clean: 0, missed: 0 };
    span = { level: span.level, clean: 0, missed: 0 };
    done = 0; cleanCount = 0; utterances = 0; complete = false; request = null;
    meal.replaceChildren();
    meal.setAttribute("aria-label", "A te tányérod");
    setTummy(0);
    const firstFoodId = launchFoodId || teddyFoodForPhrase(launchPhraseId);
    if (requestMode === "expressive") {
      expressiveItems = buildExpressiveTeddyRound(total, choiceCount, firstFoodId, random);
      request = expressiveItems[0];
    } else if (requestMode === "sequence") request = buildSequenceRequest({ span: span.level, choiceCount, random });
    else request = buildTeddyRequest({ plates: plates.level, firstFoodId, random });
    renderRequest();
    // Every mode speaks first: the expressive mode used to start silently.
    if (requestMode === "single") prompt({ intro: announce });
    else prompt({ intro: true });
  }
  return {
    start,
    startExpressive(options = {}) { start({ ...options, mode: "expressive" }); },
    restart() { start({ mode: requestMode, phraseId: launchPhraseId, foodId: launchFoodId }); },
    getContext() { return { mode: requestMode, phraseId: launchPhraseId, foodId: launchFoodId, expressionLength, span: span.level, plates: plates.level }; },
    stop() { active = false; ++generation; settle = null; busy = false; request = null; clearFlight(); stopPlayback(); },
    repeat,
  };
}
