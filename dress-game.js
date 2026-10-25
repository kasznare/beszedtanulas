import { buildDressRound, buildWeatherRound, allDressItems, DRESS_OUTFITS, DRESS_WEATHERS, DRESS_WEATHER_TITLE, toggleDressItem, matchingWeather, nextDressOutfit, pickWeather, dressStars } from "./dress-data.js";
import { createDressBear, createDressIcon } from "./dress-art.js";
import { setGameTitle } from "./game-heading.js";

const DRESS_TITLES = { weather: DRESS_WEATHER_TITLE, free: "Szabad szekrény" };

export function setupDressGame({ effect = () => {}, getChoiceCount, playPrompt, playThanks, stopPlayback, onComplete, speak = () => {}, onRestart = () => {}, random = Math.random }) {
  const panel = document.querySelector("#dress-game");
  const answers = document.querySelector("#dress-answers");
  const progress = document.querySelector("#dress-progress");
  const status = document.querySelector("#dress-status");
  const next = document.querySelector("#dress-next");
  const replay = document.querySelector("#dress-replay");
  const leaf = panel.querySelector(".dress-leaf");
  const bear = createDressBear();
  let round = [];
  let index = 0;
  let solved = false;
  let complete = false;
  let misses = 0, cleanCount = 0, active = false, outfit = 'classic', weather = null, worn = new Set(), lastMatch = null;
  const modes = document.createElement('div'); modes.className = 'teddy-modes dress-modes'; modes.setAttribute('role', 'group'); modes.setAttribute('aria-label', 'Öltözős játék módja');
  modes.innerHTML = [
    ...Object.entries(DRESS_OUTFITS).map(([id, value]) => `<button type="button" data-dress-mode="${id}" aria-pressed="${id === outfit}">${value.emoji} ${value.label}</button>`),
    `<button type="button" data-dress-mode="weather" aria-pressed="false">🌦️ ${DRESS_WEATHER_TITLE}</button>`,
    '<button type="button" data-dress-mode="free" aria-pressed="false">👚 Szabad szekrény</button>',
  ].join('');
  panel.prepend(modes);
  const weatherLine = document.createElement('p'); weatherLine.className = 'dress-weather'; modes.after(weatherLine);
  // In the free wardrobe the three weather cards light up when Maci's outfit fits one of them.
  const weatherCards = document.createElement('div'); weatherCards.className = 'dress-weather-cards'; weatherCards.setAttribute('role', 'group'); weatherCards.setAttribute('aria-label', 'Milyen időre öltöztetjük?'); weatherCards.hidden = true;
  weatherCards.innerHTML = DRESS_WEATHERS.map(id => `<button type="button" class="dress-weather-card" data-weather="${id}" aria-label="${DRESS_OUTFITS[id].label}"><span aria-hidden="true">${DRESS_OUTFITS[id].emoji}</span></button>`).join('');
  status.before(weatherCards);
  weatherCards.querySelectorAll('button').forEach(button => button.addEventListener('click', () => {
    if (!active || document.hidden) return;
    speak(`dress_weather_${button.dataset.weather}`);
  }));
  modes.querySelectorAll('button').forEach(button => button.addEventListener('click', () => {
    if (!active || document.hidden) return;
    outfit = button.dataset.dressMode;
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
    if (outfit === 'free') { speak('dress_wardrobe'); return; }
    if (!round.length) return;
    if (solved) playThanks(round[index].target);
    // The weather game never names the garment: only the weather is heard.
    else if (outfit === 'weather') speak(`dress_weather_${weather}`);
    else playPrompt(round[index].target, options);
  }

  function renderQuestion() {
    solved = false;
    misses = 0;
    panel.dataset.mood = "waiting";
    next.disabled = true;
    next.setAttribute("aria-label", index === round.length - 1 ? "Induljunk sétálni!" : "Következő ruhadarab");
    replay.setAttribute("aria-label", outfit === 'weather' ? "Milyen idő van? Hallgasd meg újra!" : "Mit kér a maci? Hallgasd meg újra!");
    status.textContent = outfit === 'weather' ? "Mi illik ehhez az időhöz?" : "Mit vegyen fel a maci?";
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
          status.textContent = outfit === 'weather' ? "Ez most nem illik. Figyeld az időt!" : "Hallgassuk meg újra!";
          panel.dataset.mood = "thinking";
          if (misses >= 2) answers.querySelector(`[data-item="${round[index].target.id}"]`).classList.add("is-hint");
          repeat();
          return;
        }
        solved = true;
        if (!misses) cleanCount += 1;
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
    const match = matchingWeather(worn);
    weatherCards.querySelectorAll('button').forEach(button => {
      const fits = button.dataset.weather === match;
      button.classList.toggle('is-match', fits);
      button.setAttribute('aria-label', `${DRESS_OUTFITS[button.dataset.weather].label}${fits ? ': illik' : ''}`);
    });
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
        renderWardrobe(item.id);
        stopPlayback();
        const fit = matchingWeather(worn);
        // A newly fitting outfit is confirmed with that weather's own line.
        if (fit && fit !== lastMatch) speak(`dress_weather_${fit}`);
        else speak(`dress_name_${item.id}`);
        lastMatch = fit;
      }); return button;
    }));
    panel.dataset.mood = match ? 'happy' : 'waiting';
    status.textContent = match ? `${DRESS_OUTFITS[match].emoji} Ez illik! Kész vagyok.` : worn.size ? `${worn.size} ruhadarab van a macin.` : 'Mit vegyen fel a maci?';
    next.disabled = !match; next.setAttribute('aria-label', 'Elkészült az öltözék'); replay.setAttribute('aria-label', 'Szabad öltöztetés útmutatója');
    if (focusId) answers.querySelector(`[data-item="${focusId}"]`)?.focus({ preventScroll: true });
  }

  replay.addEventListener("click", () => repeat());
  next.addEventListener("click", () => {
    if (!active || complete || document.hidden) return;
    if (outfit === 'free') {
      const match = matchingWeather(worn);
      if (!match) return;
      complete = true; next.disabled = true; stopPlayback();
      for (const button of answers.children) button.disabled = true;
      onComplete(3, { mode: 'free', weather: match }); return;
    }
    if (!round.length || !solved) return;
    stopPlayback();
    if (index === round.length - 1) {
      complete = true;
      next.disabled = true;
      onComplete(dressStars(cleanCount, round.length), { mode: outfit, clean: cleanCount, total: round.length });
    } else {
      index++;
      renderQuestion();
      replay.focus({ preventScroll: true });
      repeat();
    }
  });

  function start({ announce = true, rotate = false } = {}) {
    onRestart();
    // "Még egy ilyen" moves on to the next outfit instead of repeating the same one.
    if (rotate) outfit = nextDressOutfit(outfit);
    active = true; stopPlayback();
    index = 0; complete = false; cleanCount = 0; worn = new Set(); lastMatch = null; bear.reset();
    modes.querySelectorAll('button').forEach(item => item.setAttribute('aria-pressed', String(item.dataset.dressMode === outfit)));
    setGameTitle(panel, DRESS_TITLES[outfit] || 'Maci öltözik');
    panel.dataset.outfit = outfit;
    // In the free wardrobe the weather cards replace the weather sentence.
    weatherCards.hidden = outfit !== 'free';
    weatherLine.hidden = outfit === 'free';
    if (outfit === 'free') { round = []; leaf.textContent = '👚'; renderWardrobe(); repeat(); return; }
    if (outfit === 'weather') {
      weather = pickWeather(weather, random);
      const plan = buildWeatherRound(weather, getChoiceCount(), random);
      round = plan.steps;
      plan.preWorn.forEach(id => bear.wear(id));
    } else {
      weather = null;
      round = buildDressRound(getChoiceCount(), random, outfit);
    }
    const shown = DRESS_OUTFITS[weather || outfit];
    leaf.textContent = shown.emoji;
    weatherLine.textContent = outfit === 'weather' ? `${shown.emoji} ${shown.text}` : shown.text;
    renderQuestion(); repeat({ intro: announce });
  }
  return { start, getContext() { return { outfit, weather }; }, stop() { active = false; round = []; stopPlayback(); }, repeat };
}
