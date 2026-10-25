import { wordCategories, twoWordPhrases, words as coreWords } from './game-data.js';
import { setWordPicture, wordPicture } from './word-art.js';
import { setGameTitle, focusGameTitle } from './game-heading.js';

export const LISTENING_LEVELS_KEY = 'beszedtanulas.listeningLevels.v1';
export const MIN_CHOICES = 2;
export const MAX_CHOICES = 4;
// The pause after a right answer; a longer praise clip may stretch it up to the cap.
export const ADVANCE_MS = 1000;
const MAX_FEEDBACK_MS = 2600;
const MODE_TITLES = { classic: 'Hol van?', bingo: 'Hangos bingó', phrase: 'Két szó' };

function shuffled(items, random) {
  const result = [...items];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const other = Math.min(index, Math.floor(random() * (index + 1)));
    [result[index], result[other]] = [result[other], result[index]];
  }
  return result;
}
const uniqueWords = pool => [...new Map(pool.map(word => [word.id, word])).values()];
const clampChoices = (count, max = MAX_CHOICES) => Math.max(MIN_CHOICES, Math.min(max, Math.round(Number(count)) || MIN_CHOICES));

// Every picture of the topic is asked once before any repeats, never twice in a row.
export function buildListeningTargets(pool, length = 5, random = Math.random, firstWordId = null) {
  const unique = uniqueWords(pool);
  if (unique.length < 2) throw new Error("A választójátékhoz legalább két külön kép kell.");
  const total = [3, 5, 10].includes(length) ? length : 5;
  const targets = [];
  const selected = unique.find(word => word.id === firstWordId);
  if (selected) targets.push(selected);
  while (targets.length < total) {
    const cycle = shuffled(unique, random);
    if (cycle[0].id === targets.at(-1)?.id) [cycle[0], cycle[1]] = [cycle[1], cycle[0]];
    targets.push(...cycle);
  }
  return targets.slice(0, total);
}

export function buildListeningChoices(pool, target, choiceCount = 2, random = Math.random, difficulty = 'different') {
  const unique = uniqueWords(pool);
  const count = Math.min(unique.length, clampChoices(choiceCount));
  const category = wordCategories.find(c => c.id !== 'all' && c.words.includes(target.id));
  const distractors = shuffled(unique.filter(word => word.id !== target.id), random);
  distractors.sort((a, b) => (difficulty === 'similar' ? -1 : 1) * (Number(category?.words.includes(a.id)) - Number(category?.words.includes(b.id))));
  return shuffled([target, ...distractors.slice(0, count - 1)], random);
}

export function buildListeningRound(pool, length = 5, choiceCount = 2, random = Math.random, difficulty = 'different', firstWordId = null) {
  return buildListeningTargets(pool, length, random, firstWordId)
    .map(target => ({ target, choices: buildListeningChoices(pool, target, choiceCount, random, difficulty) }));
}

// Three first-try answers in a row add a picture; two misses close together take one away.
export function adaptChoiceLevel({ choices, streak = 0, missRun = 0 }, { firstTry, misses = 0 }, { min = MIN_CHOICES, max = MAX_CHOICES } = {}) {
  if (firstTry) {
    if (streak + 1 >= 3 && choices < max) return { choices: choices + 1, streak: 0, missRun: 0, change: 1 };
    return { choices, streak: streak + 1, missRun: 0, change: 0 };
  }
  const run = missRun + Math.max(1, misses);
  if (run >= 2 && choices > min) return { choices: choices - 1, streak: 0, missRun: 0, change: -1 };
  return { choices, streak: 0, missRun: run, change: 0 };
}

// Stars on the round dialog: the share of first-try answers, scaled to five. Finishing earns one.
export function roundStars(good, total) {
  if (!total) return 1;
  return Math.max(1, Math.min(5, Math.round(5 * Math.max(0, good) / total)));
}

// --- Hangos bingó: a 2×2 or 3×3 board, and calls that are sometimes not on the board.
export const BINGO_SIZES = Object.freeze([2, 3]);
export function bingoLines(size) {
  const range = Array.from({ length: size }, (_, i) => i);
  return [...range.map(row => range.map(col => row * size + col)), ...range.map(col => range.map(row => row * size + col))];
}
export function hasBingo(covered, size) {
  return bingoLines(size).find(line => line.every(cell => covered.has(cell))) || null;
}
export function bingoStars(misses) { return Math.max(1, 5 - Math.max(0, misses)); }

export function buildListeningBingo(pool, size = 2, random = Math.random, extraPool = [], firstWordId = null) {
  const side = size === 3 ? 3 : 2, cells = side * side, decoyCount = side === 3 ? 3 : 2;
  const topic = shuffled(uniqueWords(pool), random);
  const topicIds = new Set(topic.map(word => word.id));
  const first = topic.find(word => word.id === firstWordId);
  const candidates = [
    ...(first ? [first, ...topic.filter(word => word !== first)] : topic),
    ...shuffled(uniqueWords(extraPool).filter(word => !topicIds.has(word.id)), random),
  ];
  if (candidates.length < cells + 1) throw new Error('A bingóhoz több kép kell.');
  const boardWords = candidates.slice(0, cells);
  const decoys = candidates.slice(cells, cells + decoyCount);
  const board = shuffled(boardWords, random);
  const order = first ? [first, ...shuffled(boardWords.filter(word => word !== first), random)] : shuffled(boardWords, random);
  // The second call is always one that is not on the board; the other decoys follow one of the next board calls,
  // so every decision comes before a line can be complete.
  const gaps = [1, ...shuffled(Array.from({ length: side }, (_, i) => i + 2), random).slice(0, decoys.length - 1)].sort((a, b) => a - b);
  const calls = [];
  order.forEach((word, index) => {
    calls.push({ word, onBoard: true });
    if (gaps[0] === index + 1) { gaps.shift(); calls.push({ word: decoys.shift(), onBoard: false }); }
  });
  return { size: side, board, calls };
}

// --- Két szó: picture pairs share one part, so both words of the phrase matter.
export const PHRASE_LISTENING_SETS = Object.freeze([
  Object.freeze(['cica_alszik', 'baba_alszik', 'kutya_fut']),
  Object.freeze(['nagy_auto', 'nagy_labda']),
  Object.freeze(['kerek_almat', 'kerek_tejet', 'meg_alma']),
  Object.freeze(['anya_foz', 'anya_gyere', 'apa_integet']),
  Object.freeze(['maci_eszik', 'puha_maci']),
]);
export function phraseListeningItem(id) {
  const phrase = twoWordPhrases.find(entry => entry.id === id);
  if (!phrase) throw new Error(`Ismeretlen kifejezés: ${id}`);
  return Object.freeze({ id: phrase.id, label: phrase.text, kind: 'phrase', emojis: phrase.emojis, parts: phrase.targets.map(part => part.base) });
}
export const sharesPhrasePart = (a, b) => a.id !== b.id && (a.parts.some(part => b.parts.includes(part)) || a.emojis.some(emoji => b.emojis.includes(emoji)));
const phraseSetOf = id => PHRASE_LISTENING_SETS.find(set => set.includes(id));
export function buildPhraseTargets(length = 5, random = Math.random) {
  const all = PHRASE_LISTENING_SETS.flat().map(phraseListeningItem);
  return buildListeningTargets(all, length, random);
}
export function buildPhraseChoices(target, choiceCount = 2, random = Math.random) {
  const others = shuffled(phraseSetOf(target.id).filter(id => id !== target.id).map(phraseListeningItem), random);
  others.sort((a, b) => Number(sharesPhrasePart(target, b)) - Number(sharesPhrasePart(target, a)));
  const count = Math.min(others.length + 1, clampChoices(choiceCount, 3));
  return shuffled([target, ...others.slice(0, count - 1)], random);
}
const pictureWords = new Map(coreWords.map(word => [word.emoji, word]));
export function phrasePictureMarkup(item) {
  return item.emojis.map(emoji => {
    const word = pictureWords.get(emoji);
    return `<span class="listening-phrase-part">${word ? wordPicture(word) : `<span class="word-picture">${emoji}</span>`}</span>`;
  }).join('');
}

export function normalizeListeningLevels(value, base = 2) {
  const start = clampChoices(base, 3);
  const sameBase = value?.base === start;
  return {
    base: start,
    choices: sameBase ? clampChoices(value?.choices) : start,
    phraseChoices: clampChoices(value?.phraseChoices, 3),
    bingoSize: BINGO_SIZES.includes(value?.bingoSize) ? value.bingoSize : 2,
  };
}

export function setupListeningGame({ effect = () => {}, getOptions, setDifficulty, speak, playPrompt, playCorrect, stopPlayback, onComplete, onRestart = () => {}, storage = globalThis.localStorage }) {
  const panel = document.querySelector('#listening-game');
  const answers = document.querySelector("#listening-answers");
  const progress = document.querySelector("#listening-progress");
  const status = document.querySelector("#listening-status");
  const replay = document.querySelector("#listening-replay");
  let active = false, mode = 'classic', generation = 0, timer = null;
  let complete = false, solved = false, pending = false, misses = 0;
  let targets = [], index = 0, question = null, firstTryCount = 0, results = [], pool = [], difficulty = 'different';
  let adapt = { streak: 0, missRun: 0 };
  let bingo = null, callIndex = 0, covered = new Set(), bingoMisses = 0;
  let levels = normalizeListeningLevels(null);
  const readLevels = base => { try { return normalizeListeningLevels(JSON.parse(storage?.getItem(LISTENING_LEVELS_KEY) ?? 'null'), base); } catch { return normalizeListeningLevels(null, base); } };
  const saveLevels = () => { try { storage?.setItem(LISTENING_LEVELS_KEY, JSON.stringify(levels)); } catch {} };

  const modes = document.createElement('div'); modes.className = 'listening-modes'; modes.setAttribute('role', 'group'); modes.setAttribute('aria-label', 'Keresős játék módja');
  modes.innerHTML = Object.entries(MODE_TITLES).map(([id, name]) => `<button type="button" data-listening-mode="${id}" aria-pressed="false">${name}</button>`).join('');
  panel.prepend(modes);
  modes.addEventListener('click', event => {
    const button = event.target.closest('[data-listening-mode]'); if (!button || document.hidden) return;
    start({ mode: button.dataset.listeningMode });
    focusGameTitle(panel);
  });
  const settings = document.createElement('div'); settings.className = 'upgrade-options listening-similarity'; settings.setAttribute('role', 'group'); settings.setAttribute('aria-label', 'Képek hasonlósága');
  settings.innerHTML = '<button type="button" data-listening-difficulty="different">Különböző képek</button><button type="button" data-listening-difficulty="similar">Hasonló képek</button>';
  answers.before(settings);
  settings.addEventListener('click', event => {
    const b = event.target.closest('[data-listening-difficulty]'); if (!b) return;
    setDifficulty?.(b.dataset.listeningDifficulty); start({ announce: false });
    settings.querySelector(`[data-listening-difficulty="${b.dataset.listeningDifficulty}"]`).focus({ preventScroll: true });
  });
  const sizes = document.createElement('div'); sizes.className = 'upgrade-options listening-bingo-sizes'; sizes.setAttribute('role', 'group'); sizes.setAttribute('aria-label', 'Bingótábla mérete');
  sizes.innerHTML = BINGO_SIZES.map(size => `<button type="button" data-bingo-size="${size}" aria-label="${size}-szer ${size}-es tábla">${size} × ${size}</button>`).join('');
  answers.before(sizes);
  sizes.addEventListener('click', event => {
    const b = event.target.closest('[data-bingo-size]'); if (!b) return;
    levels.bingoSize = Number(b.dataset.bingoSize); saveLevels(); start({ announce: false });
    sizes.querySelector(`[data-bingo-size="${levels.bingoSize}"]`).focus({ preventScroll: true });
  });
  const none = document.createElement('button'); none.type = 'button'; none.id = 'listening-none'; none.className = 'listening-none';
  none.innerHTML = '<span aria-hidden="true">✋</span><span>Nincs nálam</span>';
  answers.after(none);
  none.hidden = true; sizes.hidden = true;
  none.addEventListener('click', () => chooseNone());

  function syncControls() {
    modes.querySelectorAll('button').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.listeningMode === mode)));
    settings.hidden = mode !== 'classic';
    settings.querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.listeningDifficulty === difficulty)));
    sizes.hidden = mode !== 'bingo';
    sizes.querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', String(Number(b.dataset.bingoSize) === levels.bingoSize)));
    none.hidden = mode !== 'bingo';
    panel.dataset.listeningMode = mode;
  }

  function renderProgress() {
    if (mode === 'bingo') { progress.replaceChildren(); progress.setAttribute('aria-label', `${covered.size} / ${bingo?.board.length || 0} kép megjelölve`); return; }
    const done = index + Number(solved);
    progress.setAttribute("aria-label", `${done} / ${targets.length} kép`);
    progress.replaceChildren(...targets.map((_, position) => {
      const dot = document.createElement("span");
      dot.className = `progress-dot${position < done ? " is-done" : position === index ? " is-current" : ""}${results[position] ? ' is-star' : ''}`;
      dot.setAttribute("aria-hidden", "true");
      return dot;
    }));
  }

  const promptItem = () => mode === 'bingo' ? bingo?.calls[callIndex]?.word : question?.target;
  function repeat(options = {}) {
    const item = promptItem();
    if (!active || !item || complete || solved || document.hidden) return;
    if (mode === 'bingo' && options.intro) {
      const token = generation;
      Promise.resolve(speak?.('listening_bingo_start')).catch(() => {}).then(() => {
        if (token === generation && active && !complete && !document.hidden) playPrompt(promptItem(), { ...options, intro: false });
      });
      return;
    }
    playPrompt(item, options);
  }

  // After a right answer the next question comes by itself; hiding the page keeps it waiting.
  function scheduleAdvance(feedback) {
    pending = true;
    const token = generation;
    clearTimeout(timer);
    const feedbackDone = Promise.race([Promise.resolve(feedback).catch(() => {}), new Promise(resolve => setTimeout(resolve, MAX_FEEDBACK_MS))]);
    const minimum = new Promise(resolve => { timer = setTimeout(resolve, ADVANCE_MS); });
    Promise.all([feedbackDone, minimum]).then(() => {
      if (token !== generation || !active || !pending || document.hidden) return;
      advance();
    });
  }
  function advance() {
    pending = false;
    if (mode === 'bingo') {
      if (hasBingo(covered, bingo.size) || callIndex >= bingo.calls.length - 1) { finish(); return; }
      callIndex += 1; renderBingoQuestion(); repeat(); return;
    }
    if (index >= targets.length - 1) { finish(); return; }
    index += 1; renderQuestion(); repeat();
  }
  function finish() {
    if (complete) return;
    complete = true; pending = false; generation++; clearTimeout(timer);
    if (mode === 'bingo') {
      const stars = bingoStars(bingoMisses);
      if (bingo.size === 2 && bingoMisses === 0) levels.bingoSize = 3;
      else if (bingo.size === 3 && bingoMisses >= 3) levels.bingoSize = 2;
      saveLevels();
      onComplete(stars, { mode, misses: bingoMisses });
      return;
    }
    onComplete(roundStars(firstTryCount, targets.length), { mode, firstTry: firstTryCount, total: targets.length });
  }

  const levelKey = () => mode === 'phrase' ? 'phraseChoices' : 'choices';
  const maxChoices = () => mode === 'phrase' ? 3 : Math.min(MAX_CHOICES, uniqueWords(pool).length);
  function renderQuestion() {
    generation++;
    solved = false; misses = 0;
    const target = targets[index];
    const count = Math.min(levels[levelKey()], maxChoices());
    question = { target, choices: mode === 'phrase' ? buildPhraseChoices(target, count) : buildListeningChoices(pool, target, count, Math.random, difficulty) };
    status.textContent = "";
    answers.classList.remove('is-bingo');
    answers.style.removeProperty('--bingo-size');
    answers.setAttribute('aria-label', 'Válassz képet');
    answers.replaceChildren();
    answers.dataset.count = question.choices.length;
    for (const item of question.choices) {
      const button = document.createElement("button");
      button.type = 'button';
      button.className = `listening-answer${item.kind === 'phrase' ? ' listening-phrase' : ''}`;
      button.dataset.word = item.id;
      button.setAttribute("aria-label", item.label);
      const picture = document.createElement("span");
      picture.className = "listening-picture";
      if (item.kind === 'phrase') picture.innerHTML = phrasePictureMarkup(item); else setWordPicture(picture, item);
      picture.setAttribute("aria-hidden", "true");
      const mark = document.createElement("span");
      mark.className = "listening-mark";
      mark.setAttribute("aria-hidden", "true");
      button.append(picture, mark);
      button.addEventListener("click", () => chooseAnswer(item, button, mark));
      answers.appendChild(button);
    }
    renderProgress();
  }
  async function chooseAnswer(item, button, mark) {
    if (!active || solved || complete || !question || document.hidden || mode === 'bingo') return;
    answers.querySelectorAll(".is-retry").forEach(choice => choice.classList.remove("is-retry"));
    if (item.id !== question.target.id) {
      effect("retry");
      misses++;
      button.classList.add("is-retry");
      status.textContent = "Hallgassuk meg újra!";
      const visible = [...answers.children].filter(choice => !choice.hidden);
      if (misses === 2 && visible.length > 2) { button.hidden = true; answers.dataset.count = visible.length - 1; }
      if (misses >= 3) {
        const token = generation;
        answers.querySelector(`[data-word="${question.target.id}"]`)?.classList.add('is-hint');
        status.textContent = 'Nézd a kiemelt képet!';
        await speak?.('listening_help');
        if (token !== generation || !active || solved || document.hidden) return;
      }
      repeat({ retry: true });
      return;
    }
    solved = true;
    generation++;
    const firstTry = misses === 0;
    results[index] = firstTry;
    if (firstTry) firstTryCount++;
    const next = adaptChoiceLevel({ choices: Math.min(levels[levelKey()], maxChoices()), ...adapt }, { firstTry, misses }, { max: maxChoices() });
    adapt = { streak: next.streak, missRun: next.missRun };
    levels[levelKey()] = next.choices; saveLevels();
    button.classList.remove('is-hint');
    button.classList.add("is-correct");
    mark.textContent = firstTry ? "⭐" : "✓";
    for (const choice of answers.children) choice.disabled = true;
    status.textContent = next.change > 0 ? 'Megtaláltad! Jön még egy kép.' : "Megtaláltad!";
    renderProgress();
    scheduleAdvance(playCorrect());
  }

  function renderBingoBoard() {
    answers.replaceChildren(...bingo.board.map((word, cell) => {
      const button = document.createElement('button'); button.type = 'button'; button.className = 'listening-answer listening-bingo-tile'; button.dataset.word = word.id; button.dataset.cell = cell; button.setAttribute('aria-label', word.label);
      const picture = document.createElement('span'); picture.className = 'listening-picture'; picture.setAttribute('aria-hidden', 'true'); setWordPicture(picture, word);
      const cover = document.createElement('span'); cover.className = 'listening-bingo-cover'; cover.setAttribute('aria-hidden', 'true'); cover.textContent = '✓';
      button.append(picture, cover); button.addEventListener('click', () => chooseBingo(word, button, cell)); return button;
    }));
    answers.dataset.count = bingo.board.length;
    answers.style.setProperty('--bingo-size', bingo.size);
    answers.classList.add('is-bingo');
    answers.setAttribute('aria-label', 'Hangos bingó képei');
  }
  function renderBingoQuestion() {
    generation++; solved = false; misses = 0;
    status.textContent = 'Megvan nálad? Jelöld meg!';
    answers.querySelectorAll('.is-retry,.is-hint').forEach(button => button.classList.remove('is-retry', 'is-hint'));
    none.classList.remove('is-retry', 'is-hint');
    none.disabled = false;
    renderProgress();
  }
  function wrongBingo(element, message) {
    effect('retry'); misses++; bingoMisses++;
    answers.querySelectorAll('.is-retry').forEach(button => button.classList.remove('is-retry'));
    none.classList.remove('is-retry');
    element.classList.add('is-retry');
    status.textContent = message;
    if (misses >= 2) {
      const call = bingo.calls[callIndex];
      (call.onBoard ? answers.querySelector(`[data-word="${call.word.id}"]`) : none)?.classList.add('is-hint');
    }
    repeat({ retry: true });
  }
  function bingoReady() { return mode === 'bingo' && active && bingo && !complete && !solved && !document.hidden; }
  function chooseBingo(word, button, cell) {
    if (!bingoReady() || button.disabled) return;
    const call = bingo.calls[callIndex];
    if (!call.onBoard || call.word.id !== word.id) { wrongBingo(button, 'Hallgasd meg újra!'); return; }
    solved = true; generation++; stopPlayback();
    covered.add(cell);
    button.classList.remove('is-retry', 'is-hint'); button.classList.add('is-covered'); button.disabled = true;
    button.setAttribute('aria-label', `${word.label}, megjelölve`);
    none.disabled = true;
    const line = hasBingo(covered, bingo.size);
    renderProgress();
    if (line) {
      for (const lineCell of line) answers.querySelector(`[data-cell="${lineCell}"]`)?.classList.add('is-line');
      answers.classList.add('has-bingo');
      status.textContent = 'Bingó!';
      effect('success');
      scheduleAdvance(playCorrect());
      return;
    }
    effect('collect');
    status.textContent = 'Megvan!';
    scheduleAdvance();
  }
  function chooseNone() {
    if (!bingoReady() || none.disabled) return;
    const call = bingo.calls[callIndex];
    if (call.onBoard) { wrongBingo(none, 'Keresd meg a képeid között!'); return; }
    solved = true; generation++; stopPlayback();
    none.classList.remove('is-retry', 'is-hint'); none.disabled = true;
    effect('select');
    const picture = document.createElement('span'); picture.className = 'listening-status-picture'; picture.setAttribute('aria-hidden', 'true'); setWordPicture(picture, call.word);
    status.replaceChildren(picture, document.createTextNode(`Igen, ${call.word.label} nincs nálad.`));
    scheduleAdvance();
  }

  replay.addEventListener("click", () => repeat());

  function start({ announce = true, mode: requestedMode } = {}) {
    generation++;
    clearTimeout(timer);
    onRestart();
    stopPlayback();
    active = true; complete = false; solved = false; pending = false;
    if (MODE_TITLES[requestedMode]) mode = requestedMode;
    const options = getOptions();
    levels = readLevels(options.choiceCount);
    difficulty = options.difficulty || 'different';
    pool = options.words;
    index = 0; firstTryCount = 0; results = []; adapt = { streak: 0, missRun: 0 };
    covered = new Set(); bingoMisses = 0; callIndex = 0; question = null; bingo = null;
    answers.classList.remove('has-bingo');
    setGameTitle(panel, MODE_TITLES[mode]);
    syncControls();
    if (mode === 'bingo') {
      bingo = buildListeningBingo(options.words, levels.bingoSize, Math.random, options.allWords || [], options.firstWordId);
      renderBingoBoard();
      renderBingoQuestion();
    } else {
      targets = mode === 'phrase' ? buildPhraseTargets(options.length) : buildListeningTargets(options.words, options.length, Math.random, options.firstWordId);
      renderQuestion();
    }
    repeat({ intro: announce });
  }
  const suspend = () => { generation++; clearTimeout(timer); stopPlayback(); };
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) suspend();
    else if (active && pending && !complete) scheduleAdvance();
  });
  window.addEventListener('pagehide', suspend);
  return {
    start,
    restart() { start({ mode }); },
    getContext() { return { mode }; },
    stop() { active = false; pending = false; generation++; clearTimeout(timer); stopPlayback(); },
    repeat,
  };
}
