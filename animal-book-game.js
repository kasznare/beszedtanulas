import { ANIMAL_BOOK_PAGES, ANIMAL_BOOK_ANIMALS, animalBookPageIndex, loadAnimalBookPreferences, saveAnimalBookPreferences } from './animal-book-data.js';

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

export function setupAnimalBook({ playSound, stopPlayback, onPageChange, onShowCredits }) {
  const root = document.querySelector('#animal-book');
  if (!root) return { start() {}, stop() {}, repeat() {} };
  root.classList.add('animal-book-panel');
  let storage;
  try { storage = window.localStorage; } catch { storage = null; }
  let preferences = loadAnimalBookPreferences(storage);
  let pageIndex = animalBookPageIndex(preferences.pageId), active = false, lastAnimalId = null;
  let pointer = null, suppressSceneClick = false, suppressUntil = 0;
  const page = () => ANIMAL_BOOK_PAGES[pageIndex];
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
      for (const button of root.querySelectorAll('[data-animal]')) {
        const selected = button.dataset.animal === state.animalId;
        button.classList.toggle('is-playing', selected && state.playing);
        button.classList.toggle('is-loading', selected && state.loading);
        button.setAttribute('aria-busy', String(selected && state.loading));
      }
      const animal = page().animals.find(value => value.id === state.animalId);
      if (!animal) { status('Koppints egy állatra a képen vagy az alatta lévő gombokon!'); return; }
      if (state.error) status(`A ${animal.label.toLocaleLowerCase('hu')} hangja most nem indult el. Koppints újra az állatra!`);
      else if (state.loading) status(`${animal.label} hangja betöltődik…`);
      else if (state.playing) status(`${animal.label} hangja szól. 🔊`);
      else status(`${animal.label} hangját hallottad. Koppints egy állatra!`);
    },
  });
  function chooseAnimal(id) {
    if (!allowed() || !page().animals.some(animal => animal.id === id)) return;
    lastAnimalId = id;
    void playback.play(id);
  }
  function render({ turn = '', focus = '' } = {}) {
    const current = page();
    root.style.setProperty('--abk-accent', current.accent);
    root.style.setProperty('--abk-tint', current.tint);
    root.dataset.page = current.id;
    root.innerHTML = `<div class="abk-book"><article class="abk-paper" ${turn ? `data-turn="${turn}"` : ''} aria-labelledby="abk-title"><header class="abk-heading"><span class="abk-eyebrow">HANGOS ÁLLATKÖNYV</span><h2 id="abk-title" tabindex="-1">${current.title}</h2><p>${current.subtitle}</p></header><div class="abk-scene ${preferences.markersVisible ? '' : 'hide-markers'}" role="group" aria-label="${current.title}: érinthető állatok"><img class="abk-image" src="${current.image}" width="1536" height="1024" alt="${current.title}: ${current.animals.map(animal => animal.label.toLocaleLowerCase('hu')).join(', ')}" draggable="false"><p class="abk-image-fallback" hidden>A kép most nem töltődött be. Az állatgombokkal meghallgathatod a hangokat.</p>${current.animals.map(animal => `<button id="abk-hotspot-${animal.id}" class="abk-hotspot" data-animal="${animal.id}" style="left:${animal.x}%;top:${animal.y}%;width:${animal.width}%;height:${animal.height}%" aria-label="${animal.label} hangjának lejátszása a képen"><span class="abk-sound-marker" aria-hidden="true">♪</span></button>`).join('')}<span class="abk-image-corner" aria-hidden="true"></span></div><div class="abk-animals" role="group" aria-label="Állathangok">${current.animals.map(animal => `<button id="abk-animal-${animal.id}" class="abk-animal" data-animal="${animal.id}" aria-label="${animal.label} hangjának lejátszása"><span class="abk-animal-symbol" aria-hidden="true">${animal.emoji}</span><span class="abk-animal-name">${animal.label}</span><span class="abk-animal-speaker" aria-hidden="true">🔊</span></button>`).join('')}</div><p id="abk-status" class="abk-status" role="status" aria-live="polite">Koppints a képen egy állatra, vagy az alatta lévő gombra!</p><div class="abk-page-controls"><button id="abk-prev" class="abk-page-arrow" aria-label="Előző lap" ${pageIndex === 0 ? 'disabled' : ''}>←</button><span class="abk-page-count" aria-label="${pageIndex + 1}. oldal a ${ANIMAL_BOOK_PAGES.length} oldalból"><b>${pageIndex + 1}</b><span aria-hidden="true"> / </span>${ANIMAL_BOOK_PAGES.length}</span><button id="abk-next" class="abk-page-arrow" aria-label="Következő lap" ${pageIndex === ANIMAL_BOOK_PAGES.length - 1 ? 'disabled' : ''}>→</button></div><nav class="abk-page-index" aria-label="A könyv lapjai">${ANIMAL_BOOK_PAGES.map((value, index) => `<button id="abk-page-${value.id}" data-page="${index}" ${index === pageIndex ? 'aria-current="page"' : ''} aria-label="${value.title}, ${index + 1}. oldal"><span aria-hidden="true">${index + 1}</span><small>${value.title}</small></button>`).join('')}</nav><footer class="abk-footer"><button id="abk-markers" aria-pressed="${preferences.markersVisible}"><span aria-hidden="true">♪</span> Hangpontok ${preferences.markersVisible ? 'be' : 'ki'}</button><span>Húzással is lapozhatsz.</span>${onShowCredits ? '<button id="abk-credits">Képek és hangok forrása</button>' : ''}</footer></article></div>`;
    root.querySelectorAll('[data-animal]').forEach(button => button.addEventListener('click', () => chooseAnimal(button.dataset.animal)));
    root.querySelectorAll('[data-page]').forEach(button => button.addEventListener('click', () => goToPage(Number(button.dataset.page), button.id)));
    bind('#abk-prev', () => goToPage(pageIndex - 1, 'abk-prev'));
    bind('#abk-next', () => goToPage(pageIndex + 1, 'abk-next'));
    bind('#abk-markers', () => {
      if (!allowed()) return;
      preferences.markersVisible = !preferences.markersVisible; persist();
      $('.abk-scene').classList.toggle('hide-markers', !preferences.markersVisible);
      $('#abk-markers').setAttribute('aria-pressed', String(preferences.markersVisible));
      $('#abk-markers').innerHTML = `<span aria-hidden="true">♪</span> Hangpontok ${preferences.markersVisible ? 'be' : 'ki'}`;
    });
    bind('#abk-credits', () => { if (allowed()) { playback.stop(); onShowCredits?.(); } });
    const image = $('.abk-image'), fallback = $('.abk-image-fallback');
    image.addEventListener('error', () => {
      if (image !== $('.abk-image')) return;
      image.classList.add('is-missing');
      if (fallback) fallback.hidden = false;
    }, { once: true });
    if (focus) {
      const target = $(`#${focus}`);
      (target && !target.disabled ? target : $('#abk-title'))?.focus({ preventScroll: true });
    }
  }
  function goToPage(index, focus = 'abk-title') {
    if (!allowed() || !Number.isInteger(index) || index < 0 || index >= ANIMAL_BOOK_PAGES.length || index === pageIndex) return false;
    playback.stop(); pointer = null; lastAnimalId = null;
    const turn = index > pageIndex ? 'forward' : 'backward';
    pageIndex = index; persist(); render({ turn, focus }); onPageChange?.(page(), pageIndex);
    return true;
  }
  root.addEventListener('keydown', event => {
    if (!allowed() || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
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
    if (document.hidden && active) { pointer = null; suppressSceneClick = false; playback.stop(); }
  });
  return {
    start() {
      playback.stop(); active = true; pointer = null; suppressSceneClick = false; lastAnimalId = null;
      preferences = loadAnimalBookPreferences(storage); pageIndex = animalBookPageIndex(preferences.pageId);
      render({ focus: 'abk-title' }); onPageChange?.(page(), pageIndex);
    },
    stop() {
      playback.stop(); active = false; pointer = null; suppressSceneClick = false;
    },
    repeat() {
      if (!allowed()) return;
      if (lastAnimalId && page().animals.some(animal => animal.id === lastAnimalId)) chooseAnimal(lastAnimalId);
      else status('Válassz egy állatot a képen vagy az alatta lévő gombokkal!');
    },
  };
}
