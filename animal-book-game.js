import { ANIMAL_BOOK_PAGES, ANIMAL_BOOK_ANIMALS, animalBookPageIndex, loadAnimalBookPreferences, saveAnimalBookPreferences, nextAnimalBookTarget, buildAnimalQuiz, animalQuizStars, nextAnimalQuizLevel, ANIMAL_QUIZ_LENGTH } from './animal-book-data.js';
import { setGameTitle, focusGameTitle } from './game-heading.js';

// playSound resolves at the end of playback. Its onStart callback identifies the
// actual sound onset; waiting for a file is visually different from listening.
export function createAnimalBookPlayback({ playSound, stopPlayback, onChange = () => {}, isAllowed = () => true }) {
  let generation = 0;
  let state = { animalId: null, loading: false, playing: false, error: false };
  const emit = () => onChange({ ...state });
  const cancel = () => {
    generation++;
    state = { animalId: null, loading: false, playing: false, error: false };
    stopPlayback(); emit();
  };
  async function play(animalId) {
    if (!isAllowed() || !ANIMAL_BOOK_ANIMALS.some(animal => animal.id === animalId)) return false;
    const token = ++generation;
    stopPlayback();
    state = { animalId, loading: true, playing: false, error: false }; emit();
    let settled = false;
    const onStart = () => {
      if (settled || token !== generation || !isAllowed() || state.playing) return;
      state = { animalId, loading: false, playing: true, error: false }; emit();
    };
    let result;
    try { result = await playSound(animalId, { onStart }); }
    catch { result = false; }
    settled = true;
    if (token !== generation || !isAllowed()) return false;
    state = { animalId, loading: false, playing: false, error: result === false }; emit();
    return result !== false;
  }
  return { play, stop: cancel, getState: () => ({ ...state }) };
}

// The audio that answers a task choice: a wrong pick contrasts the chosen animal's
// own sound with the target prompt again, a right pick names the animal and lets it sound.
export function animalAnswerSteps({ mode, chosenId, targetId }) {
  if (chosenId === targetId) return [['name', chosenId], ['sound', chosenId]];
  return [['sound', chosenId], [mode === 'scene' ? 'name' : 'sound', targetId]];
}

const BOOK_TITLE = 'Állathangos könyv', QUIZ_TITLE = 'Állatkvíz';
const animalById = id => ANIMAL_BOOK_ANIMALS.find(animal => animal.id === id);

export function setupAnimalBook({ playSound, playName, speak, stopPlayback, onPageChange, onShowCredits, effect = () => {}, onComplete = () => {}, onRestart = () => {} }) {
  const root = document.querySelector('#animal-book');
  if (!root) return { start() {}, stop() {}, repeat() {}, startQuiz() {} };
  root.classList.add('animal-book-panel');
  let storage;
  try { storage = window.localStorage; } catch { storage = null; }
  let preferences = loadAnimalBookPreferences(storage);
  let pageIndex = animalBookPageIndex(preferences.pageId), active = false, lastAnimalId = null;
  let pointer = null, suppressSceneClick = false, suppressUntil = 0;
  let mode = 'browse', targetId = null, previousTarget = null, nameAndSound = false, nameToken = 0;
  let quiz = [], quizStep = 0, quizMisses = 0, quizSolved = false, quizDone = false, quizResults = [], quizWrong = '', advanceTimer = null;
  const guide = id => allowed() ? speak?.(id) : undefined;
  const nextTarget = () => { previousTarget = nextAnimalBookTarget(page().animals, previousTarget); return previousTarget; };
  const page = () => ANIMAL_BOOK_PAGES[pageIndex];
  const question = () => quiz[Math.min(quizStep, quiz.length - 1)];
  const choiceAnimals = () => mode === 'quiz' ? (question()?.choices ?? []).map(animalById) : page().animals;
  // While a sound task is unsolved, the target's own glow would give the answer away.
  const hiddenTarget = () => mode === 'sound' ? targetId : mode === 'quiz' && !quizSolved && !quizDone ? question()?.targetId : null;
  const $ = selector => root.querySelector(selector);
  const bind = (selector, handler) => $(selector)?.addEventListener('click', handler);
  const allowed = () => active && !document.hidden;
  const status = text => { const element = $('#abk-status'); if (element) element.textContent = text; };
  function persist() {
    preferences.pageId = page().id;
    saveAnimalBookPreferences(storage, preferences);
  }
  const playback = createAnimalBookPlayback({
    playSound, stopPlayback, isAllowed: allowed,
    onChange(state) {
      if (!active) return;
      const hidden = hiddenTarget();
      for (const button of root.querySelectorAll('[data-animal]')) {
        const selected = button.dataset.animal === state.animalId && state.animalId !== hidden;
        button.classList.toggle('is-playing', selected && state.playing);
        button.classList.toggle('is-loading', selected && state.loading);
        button.setAttribute('aria-busy', String(selected && state.loading));
      }
      if (mode !== 'browse') { if (state.error) status('A hang most nem indult el. Próbáld újra a lejátszást!'); return; }
      const animal = page().animals.find(value => value.id === state.animalId);
      if (!animal) { status('Koppints egy állatra a képen vagy az alatta lévő gombokon!'); return; }
      if (state.error) status(`A ${animal.label.toLocaleLowerCase('hu')} hangja most nem indult el. Koppints újra az állatra!`);
      else if (state.loading) status(`${animal.label} hangja betöltődik…`);
      else if (state.playing) status(`${animal.label} hangja szól. 🔊`);
      else status(`${animal.label} hangját hallottad. Koppints egy állatra!`);
    },
  });
  function cancelAudio() { nameToken++; clearTimeout(advanceTimer); advanceTimer = null; playback.stop(); }
  // Plays name and sound steps in order; a newer tap, page or mode change cancels the rest.
  async function playSteps(steps) {
    const token = ++nameToken;
    for (const [kind, id] of steps) {
      if (token !== nameToken || !allowed()) return false;
      if (kind === 'name') {
        if (!playName) continue;
        playback.stop();
        try { await playName(id); } catch {}
      } else await playback.play(id);
    }
    return token === nameToken && allowed();
  }
  async function playChosen(id) {
    const token = ++nameToken;
    if (nameAndSound && playName) {
      playback.stop();
      try { await playName(id); } catch {}
      if (token !== nameToken || !allowed() || mode !== 'browse') return;
    }
    if (token === nameToken) void playback.play(id);
  }
  function promptTarget() {
    if (!allowed() || !targetId) return;
    if (mode === 'sound') void playback.play(targetId);
    else if (mode === 'scene' && playName) void playSteps([['name', targetId]]);
  }
  async function beginTask(nextMode) {
    cancelAudio(); const token = nameToken;
    if (mode === 'quiz') setGameTitle(root, BOOK_TITLE);
    mode = nextMode; targetId = nextTarget(); lastAnimalId = null;
    render({ focus: nextMode === 'sound' ? 'abk-listen' : 'abk-task-title' });
    await guide(nextMode === 'sound' ? 'abk_sound_guide' : 'abk_scene_guide');
    if (token !== nameToken || !allowed() || mode !== nextMode) return;
    promptTarget();
  }
  function answerTask(id) {
    if (!targetId) { lastAnimalId = id; void playSteps([['name', id], ['sound', id]]); return; }
    const correct = id === targetId, chosen = animalById(id);
    if (!correct) {
      effect('retry');
      status(mode === 'sound' ? `Ez a ${chosen.label.toLocaleLowerCase('hu')} volt. Figyeld meg újra!` : `Ez a ${chosen.label.toLocaleLowerCase('hu')}. Keresd tovább!`);
      void playSteps(animalAnswerSteps({ mode, chosenId: id, targetId }));
      return;
    }
    effect('collect');
    targetId = null; lastAnimalId = id;
    status(`Ügyes vagy! Megtaláltad: ${chosen.label.toLocaleLowerCase('hu')}!`);
    const next = $('#abk-next-task'); if (next) next.hidden = false;
    void playSteps(animalAnswerSteps({ mode, chosenId: id, targetId: id }));
  }
  function startQuiz() {
    if (!allowed()) return;
    cancelAudio(); onRestart();
    mode = 'quiz'; targetId = null; lastAnimalId = null;
    quiz = buildAnimalQuiz(Math.random, quiz[0]?.targetId ?? null);
    quizStep = 0; quizMisses = 0; quizSolved = false; quizDone = false; quizResults = []; quizWrong = '';
    setGameTitle(root, QUIZ_TITLE);
    render({ focus: 'abk-listen' });
    void playQuizPrompt(true);
  }
  async function playQuizPrompt(intro = false) {
    if (!allowed() || mode !== 'quiz' || quizDone) return;
    cancelAudio(); const token = nameToken;
    if (intro) {
      await guide('abk_sound_guide');
      if (token !== nameToken || !allowed() || mode !== 'quiz') return;
    }
    void playback.play(question().targetId);
  }
  function chooseQuiz(id) {
    if (quizDone || quizSolved) return;
    const chosen = animalById(id), target = question().targetId;
    if (id !== target) {
      quizMisses++; quizWrong = id; effect('retry');
      root.querySelectorAll('.abk-quiz-choice').forEach(button => button.classList.toggle('is-try', button.dataset.animal === id));
      status(`Ez a ${chosen.label.toLocaleLowerCase('hu')} hangja. Figyeld újra!`);
      void playSteps(animalAnswerSteps({ mode: 'quiz', chosenId: id, targetId: target }));
      return;
    }
    quizSolved = true; quizWrong = '';
    quizResults[quizStep] = quizMisses === 0 ? 'first' : 'later';
    effect('collect');
    render({ focus: 'abk-next-task' });
    status(`Ügyes vagy! ${chosen.label} szólt.`);
    void (async () => {
      const finished = await playSteps(animalAnswerSteps({ mode: 'quiz', chosenId: id, targetId: id }));
      if (!finished || mode !== 'quiz' || !quizSolved) return;
      const token = nameToken;
      advanceTimer = setTimeout(() => { if (token === nameToken && allowed()) nextQuizQuestion(); }, 700);
    })();
  }
  function nextQuizQuestion() {
    if (!allowed() || mode !== 'quiz' || !quizSolved || quizDone) return;
    cancelAudio();
    if (quizStep >= quiz.length - 1) {
      quizDone = true;
      const firstTry = quizResults.filter(result => result === 'first').length;
      preferences.quizLevel = nextAnimalQuizLevel(preferences.quizLevel, firstTry); persist();
      render({ focus: 'abk-quiz-again' });
      onComplete(animalQuizStars(firstTry), { firstTry, level: preferences.quizLevel });
      return;
    }
    quizStep++; quizMisses = 0; quizSolved = false; quizWrong = '';
    render({ focus: 'abk-listen' });
    void playQuizPrompt();
  }
  function chooseAnimal(id) {
    if (!allowed() || !choiceAnimals().some(animal => animal?.id === id)) return;
    if (mode === 'quiz') { chooseQuiz(id); return; }
    if (mode !== 'browse') { answerTask(id); return; }
    lastAnimalId = id;
    void playChosen(id);
  }
  function quizMarkup() {
    const current = question(), firstTry = quizResults.filter(result => result === 'first').length;
    const dots = `<div class="abk-quiz-dots" aria-label="${Math.min(quizStep + 1, quiz.length)}. kérdés, összesen ${quiz.length}">${quiz.map((_, i) => `<span class="${quizResults[i] ? 'is-done' : i === quizStep ? 'is-current' : ''}" aria-hidden="true">${quizResults[i] === 'first' ? '⭐' : quizResults[i] ? '✓' : '•'}</span>`).join('')}</div>`;
    const levels = `<div class="abk-quiz-levels" role="group" aria-label="Nehézség">${[1, 2].map(level => `<button id="abk-level-${level}" data-level="${level}" aria-pressed="${preferences.quizLevel === level}" aria-label="${level}. szint${level === 2 ? ', nevek nélkül' : ', nevekkel'}">${level === 1 ? '🔤' : '🙈'} ${level}</button>`).join('')}</div>`;
    if (quizDone) return `<div class="abk-quiz">${dots}<div class="abk-quiz-done"><p id="abk-task-title" tabindex="-1"><span aria-hidden="true">🏆</span> ${firstTry} / ${ANIMAL_QUIZ_LENGTH} elsőre</p><button id="abk-quiz-again">↻ Új kvíz</button></div>${levels}</div>`;
    const named = preferences.quizLevel === 1;
    return `<div class="abk-quiz"><div class="abk-quiz-bar">${dots}${levels}</div><div class="abk-task"><button id="abk-listen" ${quizSolved ? 'disabled' : ''}>🔊 Ki szólt?</button><button id="abk-next-task" ${quizSolved ? '' : 'hidden'}>Tovább ▶</button></div><div class="abk-quiz-choices" style="--abk-choices:${current.choices.length}" role="group" aria-label="Melyik állat szólt?">${current.choices.map(animalById).map(animal => `<button id="abk-animal-${animal.id}" class="abk-animal abk-quiz-choice ${quizSolved && animal.id === current.targetId ? 'is-found' : ''} ${quizWrong === animal.id ? 'is-try' : ''}" data-animal="${animal.id}" aria-label="${animal.label}"><span class="abk-animal-symbol" aria-hidden="true">${animal.emoji}</span>${named ? `<span class="abk-animal-name">${animal.label}</span>` : ''}${quizSolved && animal.id === current.targetId ? '<b class="abk-quiz-check" aria-hidden="true">✓</b>' : ''}</button>`).join('')}</div></div>`;
  }
  function render({ turn = '', focus = '' } = {}) {
    const current = page();
    root.style.setProperty('--abk-accent', current.accent);
    root.style.setProperty('--abk-tint', current.tint);
    root.dataset.page = current.id;
    root.dataset.mode = mode;
    const modes = `<div class="abk-modes" role="group" aria-label="Állatkönyv játékok"><button id="abk-browse" aria-pressed="${mode === 'browse'}">📖 Nézelődöm</button><button id="abk-sound" aria-pressed="${mode === 'sound'}">🔊 Ki szólt?</button><button id="abk-search" aria-pressed="${mode === 'scene'}">🔎 Keresd a képen!</button><button id="abk-quiz" aria-pressed="${mode === 'quiz'}">🏆 Állatkvíz</button></div>`;
    if (mode === 'quiz') {
      root.innerHTML = `<div class="abk-book"><article class="abk-paper is-quiz" aria-label="${QUIZ_TITLE}">${modes}${quizMarkup()}<p id="abk-status" class="abk-status" role="status" aria-live="polite">${quizDone ? 'Elkészült a kvíz!' : quizSolved ? '' : 'Hallgasd meg, és koppints az állatra!'}</p>${onShowCredits ? '<footer class="abk-footer"><button id="abk-credits">Képek és hangok forrása</button></footer>' : ''}</article></div>`;
    } else {
      const target = mode === 'scene' ? animalById(targetId) : null;
      root.innerHTML = `<div class="abk-book"><article class="abk-paper" ${turn ? `data-turn="${turn}"` : ''} aria-labelledby="abk-title"><header class="abk-heading"><h2 id="abk-title" tabindex="-1">${current.title}</h2>${mode === 'browse' ? `<p>${current.subtitle}</p>` : ''}</header>${modes}${mode === 'browse' ? `<button id="abk-name-sound" aria-pressed="${nameAndSound}" ${playName ? '' : 'disabled'}>🗣️ Név és hang ${nameAndSound ? 'be' : 'ki'}</button>` : `<div class="abk-task"><p id="abk-task-title" tabindex="-1">${mode === 'sound' ? 'Melyik állat szólt? Hallgasd meg!' : `Keresd meg a képen: ${target?.label ?? ''}!`}</p>${mode === 'sound' ? '<button id="abk-listen">🔊 Meghallgatom újra</button>' : ''}<button id="abk-next-task" hidden>Másik állat ▶</button></div>`}<div class="abk-scene ${preferences.markersVisible ? '' : 'hide-markers'}" role="group" aria-label="${current.title}: érinthető állatok"><img class="abk-image" src="${current.image}" width="1536" height="1024" alt="${current.title}: ${current.animals.map(animal => animal.label.toLocaleLowerCase('hu')).join(', ')}" draggable="false"><p class="abk-image-fallback" hidden>A kép most nem töltődött be. Az állatgombokkal meghallgathatod a hangokat.</p>${current.animals.map(animal => `<button id="abk-hotspot-${animal.id}" class="abk-hotspot" data-animal="${animal.id}" style="left:${animal.x}%;top:${animal.y}%;width:${animal.width}%;height:${animal.height}%" aria-label="${mode === 'sound' ? animal.label : animal.label + ' a képen'}"><span class="abk-sound-marker" aria-hidden="true">♪</span></button>`).join('')}<span class="abk-image-corner" aria-hidden="true"></span></div><div class="abk-animals ${mode === 'scene' ? 'is-scene-task' : ''}" role="group" aria-label="Állathangok">${current.animals.map(animal => `<button id="abk-animal-${animal.id}" class="abk-animal" data-animal="${animal.id}" aria-label="${animal.label}"><span class="abk-animal-symbol" aria-hidden="true">${animal.emoji}</span><span class="abk-animal-name">${animal.label}</span><span class="abk-animal-speaker" aria-hidden="true">🔊</span></button>`).join('')}</div><p id="abk-status" class="abk-status" role="status" aria-live="polite">${mode === 'sound' ? 'Hallgasd meg a hangot, majd válaszd ki az állatot!' : ''}</p><div class="abk-page-controls"><button id="abk-prev" class="abk-page-arrow" aria-label="Előző lap" ${pageIndex === 0 ? 'disabled' : ''}>←</button><span class="abk-page-count" aria-label="${pageIndex + 1}. oldal a ${ANIMAL_BOOK_PAGES.length} oldalból"><b>${pageIndex + 1}</b><span aria-hidden="true"> / </span>${ANIMAL_BOOK_PAGES.length}</span><button id="abk-next" class="abk-page-arrow" aria-label="Következő lap" ${pageIndex === ANIMAL_BOOK_PAGES.length - 1 ? 'disabled' : ''}>→</button></div><nav class="abk-page-index" aria-label="A könyv lapjai">${ANIMAL_BOOK_PAGES.map((value, index) => `<button id="abk-page-${value.id}" data-page="${index}" ${index === pageIndex ? 'aria-current="page"' : ''} aria-label="${value.title}, ${index + 1}. oldal"><span aria-hidden="true">${index + 1}</span><small>${value.title}</small></button>`).join('')}</nav><footer class="abk-footer"><button id="abk-markers" aria-pressed="${preferences.markersVisible}"><span aria-hidden="true">♪</span> Hangpontok ${preferences.markersVisible ? 'be' : 'ki'}</button><span>Húzással is lapozhatsz.</span>${onShowCredits ? '<button id="abk-credits">Képek és hangok forrása</button>' : ''}</footer></article></div>`;
    }
    root.querySelectorAll('[data-animal]').forEach(button => button.addEventListener('click', () => chooseAnimal(button.dataset.animal)));
    root.querySelectorAll('[data-page]').forEach(button => button.addEventListener('click', () => goToPage(Number(button.dataset.page), button.id)));
    root.querySelectorAll('[data-level]').forEach(button => button.addEventListener('click', () => {
      if (!allowed()) return;
      preferences.quizLevel = Number(button.dataset.level) === 2 ? 2 : 1; persist(); startQuiz();
    }));
    bind('#abk-browse', () => {
      if (!allowed()) return;
      cancelAudio(); if (mode === 'quiz') setGameTitle(root, BOOK_TITLE);
      mode = 'browse'; targetId = null; render({ focus: 'abk-browse' });
    });
    bind('#abk-sound', () => { if (allowed()) beginTask('sound'); });
    bind('#abk-search', () => { if (allowed()) beginTask('scene'); });
    bind('#abk-quiz', () => startQuiz());
    bind('#abk-quiz-again', () => startQuiz());
    bind('#abk-listen', () => {
      if (!allowed()) return;
      if (mode === 'quiz') void playQuizPrompt();
      else if (mode === 'sound' && targetId) { cancelAudio(); void playback.play(targetId); }
    });
    bind('#abk-next-task', () => {
      if (!allowed()) return;
      if (mode === 'quiz') nextQuizQuestion();
      else if (mode !== 'browse') beginTask(mode);
    });
    bind('#abk-name-sound', () => { if (!allowed() || !playName) return; nameAndSound = !nameAndSound; render({ focus: 'abk-name-sound' }); });
    bind('#abk-prev', () => goToPage(pageIndex - 1, 'abk-prev'));
    bind('#abk-next', () => goToPage(pageIndex + 1, 'abk-next'));
    bind('#abk-markers', () => {
      if (!allowed()) return;
      preferences.markersVisible = !preferences.markersVisible; persist();
      $('.abk-scene').classList.toggle('hide-markers', !preferences.markersVisible);
      $('#abk-markers').setAttribute('aria-pressed', String(preferences.markersVisible));
      $('#abk-markers').innerHTML = `<span aria-hidden="true">♪</span> Hangpontok ${preferences.markersVisible ? 'be' : 'ki'}`;
    });
    bind('#abk-credits', () => { if (allowed()) { cancelAudio(); onShowCredits?.(); } });
    const image = $('.abk-image'), fallback = $('.abk-image-fallback');
    image?.addEventListener('error', () => {
      if (image !== $('.abk-image')) return;
      image.classList.add('is-missing');
      if (fallback) fallback.hidden = false;
    }, { once: true });
    if (focus) {
      const target = $(`#${focus}`);
      if (target && !target.disabled && !target.hidden) target.focus({ preventScroll: true });
      else if (mode === 'quiz') focusGameTitle(root);
      else $('#abk-title')?.focus({ preventScroll: true });
    }
  }
  function goToPage(index, focus = 'abk-title') {
    if (!allowed() || mode === 'quiz' || !Number.isInteger(index) || index < 0 || index >= ANIMAL_BOOK_PAGES.length || index === pageIndex) return false;
    cancelAudio(); pointer = null; lastAnimalId = null; targetId = null; previousTarget = null;
    const turn = index > pageIndex ? 'forward' : 'backward';
    pageIndex = index; persist(); if (mode !== 'browse') targetId = nextTarget(); render({ turn, focus }); onPageChange?.(page(), pageIndex);
    promptTarget();
    return true;
  }
  root.addEventListener('keydown', event => {
    if (!allowed() || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      if (mode === 'quiz') return;
      event.preventDefault(); goToPage(pageIndex + (event.key === 'ArrowRight' ? 1 : -1));
    }
  });
  root.addEventListener('pointerdown', event => {
    suppressSceneClick = false;
    if (!allowed() || event.isPrimary === false || event.button !== 0 || !event.target.closest('.abk-scene')) return;
    pointer = { id: event.pointerId, x: event.clientX, y: event.clientY };
  });
  root.addEventListener('pointerup', event => {
    if (!pointer || event.pointerId !== pointer.id) return;
    const dx = event.clientX - pointer.x, dy = event.clientY - pointer.y; pointer = null;
    if (Math.abs(dx) < 50 || Math.abs(dx) <= Math.abs(dy) * 1.25) return;
    suppressSceneClick = true; suppressUntil = Date.now() + 500;
    event.preventDefault(); goToPage(pageIndex + (dx < 0 ? 1 : -1));
  });
  root.addEventListener('pointercancel', () => { pointer = null; suppressSceneClick = false; });
  root.addEventListener('click', event => {
    if (suppressSceneClick && event.detail !== 0 && Date.now() <= suppressUntil && event.target.closest('[data-animal]')) {
      suppressSceneClick = false; event.preventDefault(); event.stopImmediatePropagation();
    }
  }, true);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && active) { cancelAudio(); pointer = null; suppressSceneClick = false; }
  });
  return {
    start() {
      cancelAudio(); active = true; mode = 'browse'; targetId = null; pointer = null; suppressSceneClick = false; lastAnimalId = null;
      preferences = loadAnimalBookPreferences(storage); pageIndex = animalBookPageIndex(preferences.pageId);
      setGameTitle(root, BOOK_TITLE);
      render({ focus: 'abk-title' }); onPageChange?.(page(), pageIndex);
    },
    stop() {
      cancelAudio(); active = false; pointer = null; suppressSceneClick = false;
    },
    startQuiz,
    repeat() {
      if (!allowed()) return;
      if (mode === 'quiz') { if (!quizDone && !quizSolved) void playQuizPrompt(); else if (quizDone) status('Indíts új kvízt, vagy válassz másik játékot!'); }
      else if (mode === 'sound' && targetId) { cancelAudio(); void playback.play(targetId); }
      else if (mode === 'scene' && targetId) {
        cancelAudio(); const token = nameToken;
        void Promise.resolve(guide('abk_scene_guide')).then(() => { if (token === nameToken && mode === 'scene') promptTarget(); });
      }
      else if (lastAnimalId && page().animals.some(animal => animal.id === lastAnimalId)) chooseAnimal(lastAnimalId);
      else status('Válassz egy állatot a képen vagy az alatta lévő gombokkal!');
    },
  };
}
