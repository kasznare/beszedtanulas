import { DIFFERENCE_SCENES, DIFFERENCE_LEVELS, createDifferenceRound, findDifferenceAt, differenceStars, differenceHint, differenceVariants } from './differences-data.js';
import { renderDifferenceScene } from './differences-art.js';

const WIDTH = 800, HEIGHT = 520;
// Three misses this close together start a short "look first" pause.
const MISS_BURST = 3, MISS_WINDOW = 4000, REST_TIME = 2600;
const clamp = (value, low, high) => Math.max(low, Math.min(high, value));
const escapeHtml = value => String(value).replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character]));
const signature = round => `${round.sceneId}:${round.levelId}:${[...round.ids].sort().join(',')}`;

/** The round and its choices live only in this closure; this game never saves progress. */
export function setupDifferencesGame({ effect = () => {}, speak = () => {}, stopPlayback = () => {}, onComplete = () => {}, onRestart = () => {} } = {}) {
  const root = document.querySelector('#differences');
  let active = false, finished = false, sceneId = DIFFERENCE_SCENES[0].id, levelId = 'observer';
  let scene, round, found = [], hintTarget = null, hintStage = 0, pending = null;
  let zoom = false, view = { x: 0, y: 0, width: WIDTH, height: HEIGHT };
  let cursor = { x: 50, y: 50 }, keyboard = false, pointer = null, miss = null, missTimer = null;
  let listeners = null, lastSignature = '', renderNumber = 0;
  let misses = 0, hints = 0, missTimes = [], resting = false, restTimer = null;
  const playable = () => active && !finished && !document.hidden && !root.querySelector('dialog[open]');
  const status = text => { const node = root.querySelector('#differences-status'); if (node) node.textContent = text; };
  const say = (id, force = false) => { if (active && !document.hidden) speak(id, force); };
  const focus = selector => root.querySelector(selector)?.focus({ preventScroll: true });

  function clearPointer() {
    if (!pointer) return;
    const old = pointer; pointer = null;
    if (old.picture.hasPointerCapture?.(old.id)) old.picture.releasePointerCapture(old.id);
    root.classList.remove('is-panning');
  }
  function clearTransient() {
    clearPointer(); clearTimeout(missTimer); missTimer = null; miss = null; endRest(false);
  }
  function endRest(announce = true) {
    clearTimeout(restTimer); restTimer = null; missTimes = [];
    if (!resting) return;
    resting = false; root.classList.remove('is-resting');
    if (announce && active) status('Most keress tovább nyugodtan!');
  }
  function rest() {
    resting = true; missTimes = []; root.classList.add('is-resting'); stopPlayback();
    status('Állj meg egy kicsit! Előbb nézd meg jól a két képet, aztán koppints.');
    say('differences_hint');
    clearTimeout(restTimer); restTimer = setTimeout(() => endRest(), REST_TIME);
  }

  function render() {
    const level = DIFFERENCE_LEVELS.find(item => item.id === levelId);
    root.dataset.sceneId = sceneId; root.dataset.levelId = levelId;
    root.innerHTML = `<div class="differences-toolbar">
      <button id="differences-change" class="differences-choice-button" aria-haspopup="dialog" aria-controls="differences-chooser"><span class="differences-scene-name">${escapeHtml(scene.name)}</span><span class="differences-choice-detail">${escapeHtml(level.name)} · ${round.ids.length} eltérés <span aria-hidden="true">⌄</span></span></button>
      <div class="differences-progress-wrap"><strong id="differences-progress" aria-live="off"></strong><span class="differences-progress-dots" aria-hidden="true"></span></div>
    </div>
    <p class="differences-instruction" id="differences-instruction">Keresd meg, mi változott! Bármelyik képen jelölhetsz.</p>
    <div class="differences-pair" role="group" aria-label="A két összehasonlítható kép">${['left', 'right'].map((side, index) => `<figure class="differences-frame"><figcaption><span>${index + 1}. kép</span><span aria-hidden="true">${index ? '✧' : '✦'}</span></figcaption><div class="differences-picture" data-side="${side}" role="button" tabindex="0" aria-label="${index + 1}. kép: ${escapeHtml(scene.name)}. Jelöld meg az eltérést!" aria-describedby="differences-keyboard-help differences-instruction"><div class="differences-art" aria-hidden="true">${renderDifferenceScene(sceneId, index ? round.variants : [], `differences-${renderNumber}-${side}`)}</div><svg class="differences-overlay" viewBox="0 0 800 520" aria-hidden="true"></svg></div></figure>`).join('')}</div>
    <div class="differences-actions"><button id="differences-hint"><span aria-hidden="true">☀</span> Segítség</button><button id="differences-zoom" aria-pressed="false"><span aria-hidden="true">⌕</span> 2× nagyító</button><button id="differences-restart" aria-label="Új kör ugyanezzel a képpel és nehézséggel"><span aria-hidden="true">↻</span><span class="differences-restart-label"> Új kör</span></button></div>
    <p id="differences-status" class="differences-status" role="status" aria-live="polite" aria-atomic="true"></p>
    <p class="differences-zoom-help" hidden>Húzd bármelyik képet: együtt mozognak. Koppints egy eltérésre!</p>
    <p id="differences-keyboard-help" class="differences-keyboard-help">Billentyűzettel: a képen a nyilak mozgatják a keresőjelet, Enter vagy szóköz jelöl. Shift + nyíl: finom lépés.</p>
    <dialog id="differences-chooser" class="differences-chooser" aria-labelledby="differences-chooser-title"></dialog>`;
    root.querySelectorAll('.differences-art > svg').forEach(svg => { svg.setAttribute('focusable', 'false'); svg.setAttribute('aria-hidden', 'true'); });
    updateProgress(); updateView(); updateOverlays();
    status('Nézz körül nyugodtan, nincs időre menő verseny.');
  }

  function updateProgress() {
    root.dataset.foundCount = String(found.length); root.dataset.totalCount = String(round.ids.length);
    root.querySelector('#differences-progress').textContent = `${found.length} / ${round.ids.length} megvan`;
    root.querySelector('.differences-progress-dots').innerHTML = round.ids.map((_, index) => `<i class="${index < found.length ? 'is-found' : ''}">${index < found.length ? '✓' : ''}</i>`).join('');
    root.querySelector('#differences-hint').disabled = finished;
    root.classList.toggle('is-complete', finished);
    root.querySelectorAll('.differences-picture').forEach(picture => picture.setAttribute('aria-disabled', String(finished)));
  }

  function updateOverlays() {
    if (!round) return;
    const marks = found.map((id, index) => {
      const { area } = scene.differences.find(item => item.id === id);
      const x = area.x * 8, y = area.y * 5.2, rx = area.rx * 8 + 5, ry = area.ry * 5.2 + 5;
      return `<g class="differences-found-mark" data-found-id="${escapeHtml(id)}"><ellipse class="differences-mark-halo" cx="${x}" cy="${y}" rx="${rx}" ry="${ry}"/><ellipse class="differences-mark-outline" cx="${x}" cy="${y}" rx="${rx}" ry="${ry}"/><g transform="translate(${clamp(x + rx * .7, 15, 785)} ${clamp(y - ry * .7, 15, 505)})"><circle r="14"/><text y="1">${index + 1}</text></g></g>`;
    }).join('');
    let hint = '';
    if (hintTarget && hintStage >= 2) {
      const { area } = scene.differences.find(item => item.id === hintTarget);
      const rx = hintStage === 2 ? Math.max(area.rx * 2.8, 16) : area.rx + 1.2;
      const ry = hintStage === 2 ? Math.max(area.ry * 2.8, 18) : area.ry + 1.5;
      hint = `<ellipse class="differences-hint-mark" data-hint-stage="${hintStage}" cx="${area.x * 8}" cy="${area.y * 5.2}" rx="${rx * 8}" ry="${ry * 5.2}"/>`;
    }
    const missed = miss ? `<circle class="differences-miss-mark" cx="${miss.x * 8}" cy="${miss.y * 5.2}" r="17"/>` : '';
    const x = cursor.x * 8, y = cursor.y * 5.2;
    const cursorMark = `<g class="differences-cursor" transform="translate(${x} ${y})"><circle r="14"/><path d="M-24 0h15M9 0h15M0-24v15M0 9v15"/></g>`;
    root.querySelectorAll('.differences-overlay').forEach(svg => { svg.innerHTML = `${hint}${marks}${missed}${cursorMark}`; });
    root.classList.toggle('is-keyboard', keyboard);
  }

  function updateView() {
    root.classList.toggle('is-zoomed', zoom);
    const value = `${view.x} ${view.y} ${view.width} ${view.height}`;
    root.querySelectorAll('.differences-art > svg, .differences-overlay').forEach(svg => svg.setAttribute('viewBox', value));
    const button = root.querySelector('#differences-zoom');
    if (button && button.getAttribute('aria-pressed') !== String(zoom)) {
      button.setAttribute('aria-pressed', String(zoom));
      button.innerHTML = zoom ? '<span aria-hidden="true">⊖</span> Teljes kép' : '<span aria-hidden="true">⌕</span> 2× nagyító';
    }
    const help = root.querySelector('.differences-zoom-help');
    if (help) help.hidden = !zoom;
  }

  function centerView(x = cursor.x, y = cursor.y) {
    view = zoom ? { x: clamp(x * 8 - WIDTH / 4, 0, WIDTH / 2), y: clamp(y * 5.2 - HEIGHT / 4, 0, HEIGHT / 2), width: WIDTH / 2, height: HEIGHT / 2 } : { x: 0, y: 0, width: WIDTH, height: HEIGHT };
    updateView();
  }

  function pointOnPicture(picture, clientX, clientY) {
    const rect = picture.querySelector('.differences-art > svg').getBoundingClientRect();
    if (!rect.width || !rect.height) return null;
    const localX = (clientX - rect.left) / rect.width, localY = (clientY - rect.top) / rect.height;
    if (localX < 0 || localX > 1 || localY < 0 || localY > 1) return null;
    return { x: (view.x + localX * view.width) / 8, y: (view.y + localY * view.height) / 5.2 };
  }

  function choosePoint(point) {
    if (!playable() || !point || resting) return;
    cursor = point; clearTimeout(missTimer); miss = null;
    const hitScale = DIFFERENCE_LEVELS.find(item => item.id === levelId)?.hitScale ?? 1;
    const difference = findDifferenceAt(scene, round.ids, point.x, point.y, found, hitScale);
    if (!difference) {
      const previous = findDifferenceAt(scene, round.ids, point.x, point.y, [], hitScale);
      if (previous && found.includes(previous.id)) status('Ezt már megtaláltad. Keress egy másik eltérést!');
      else {
        // Tapping everywhere is no longer free: misses cost stars, and a quick burst of them asks for a pause.
        const now = Date.now(); misses++;
        missTimes = [...missTimes.filter(time => now - time < MISS_WINDOW), now];
        status('Itt most nincs eltérés. Nézz körül tovább!'); miss = point;
        missTimer = setTimeout(() => { missTimer = null; miss = null; if (active) updateOverlays(); }, 850);
        if (missTimes.length >= MISS_BURST) rest();
      }
      updateOverlays(); return;
    }
    stopPlayback(); found.push(difference.id); effect('collect'); missTimes = [];
    if (hintTarget === difference.id) { hintTarget = null; hintStage = 0; }
    finished = found.length === round.ids.length;
    updateProgress(); updateOverlays();
    const label = round.variants?.[difference.id] === 'authored' ? `${difference.label} · ` : '';
    status(finished ? 'Minden különbséget megtaláltál!' : `Megvan! ${label}Még ${round.ids.length - found.length} eltérés vár.`);
    say('guide_good');
    if (finished) onComplete({ sceneId, levelId, count: differenceStars({ misses, hints }), misses, hints });
  }

  function hint() {
    if (!playable()) return;
    clearTransient();
    if (!hintTarget || found.includes(hintTarget)) {
      const remaining = round.ids.filter(id => !found.includes(id));
      hintTarget = remaining[Math.floor(Math.random() * remaining.length)]; hintStage = 0;
    }
    hintStage = Math.min(3, hintStage + 1); hints++;
    const difference = scene.differences.find(item => item.id === hintTarget), text = differenceHint(difference, round.variants?.[hintTarget]);
    status(hintStage === 1 ? text : hintStage === 2 ? `${text} Nézd meg a jelölt környéket mindkét képen!` : 'A kisebb jelölésen belül hasonlítsd össze a részleteket, és jelöld meg az eltérést!');
    if (hintStage >= 2 && zoom) centerView(difference.area.x, difference.area.y);
    if (hintStage === 2) say('differences_hint', true); else if (hintStage === 3) say('differences_closer', true);
    updateOverlays();
  }

  function openChooser() {
    if (!active || document.hidden) return;
    clearTransient(); stopPlayback(); pending = { sceneId, levelId };
    const dialog = root.querySelector('#differences-chooser');
    dialog.innerHTML = `<div class="differences-chooser-heading"><div><p>Új felfedezés</p><h2 id="differences-chooser-title">Melyik képet nézzük?</h2></div><button id="differences-close" aria-label="Vissza a játékhoz">×</button></div>
      <div class="differences-scenes" role="group" aria-label="Jelenet">${DIFFERENCE_SCENES.map(item => `<button data-difference-scene="${item.id}" aria-pressed="${sceneId === item.id}"><span class="differences-thumbnail" aria-hidden="true">${renderDifferenceScene(item.id, [], `differences-choice-${renderNumber}-${item.id}`)}</span><strong>${escapeHtml(item.name)}</strong><small>${escapeHtml(item.subtitle)}</small></button>`).join('')}</div>
      <h3>Mennyi részletet keresel?</h3><div class="differences-levels" role="group" aria-label="Nehézség">${DIFFERENCE_LEVELS.map(item => `<button data-difference-level="${item.id}" aria-pressed="${levelId === item.id}"><strong>${escapeHtml(item.name)}</strong><span>${item.count} eltérés</span></button>`).join('')}</div><p class="differences-chooser-note">Az új kör új eltéréseket rejt. A megtalált jelölések az aktuális kör végéig maradnak meg.</p><button id="differences-apply">Kezdjük!</button>`;
    dialog.showModal();
  }

  function onClick(event) {
    if (!active || document.hidden) return;
    const button = event.target.closest('button');
    if (button?.id === 'differences-change') openChooser();
    else if (button?.id === 'differences-close') root.querySelector('#differences-chooser').close();
    else if (button?.dataset.differenceScene) {
      pending.sceneId = button.dataset.differenceScene;
      root.querySelectorAll('[data-difference-scene]').forEach(item => item.setAttribute('aria-pressed', String(item.dataset.differenceScene === pending.sceneId)));
    } else if (button?.dataset.differenceLevel) {
      pending.levelId = button.dataset.differenceLevel;
      root.querySelectorAll('[data-difference-level]').forEach(item => item.setAttribute('aria-pressed', String(item.dataset.differenceLevel === pending.levelId)));
    } else if (button?.id === 'differences-apply') {
      const options = { ...pending }; root.querySelector('#differences-chooser').close(); start(options); focus('.differences-picture');
    } else if (button?.id === 'differences-restart') { restart(); focus('#differences-restart'); }
    else if (button?.id === 'differences-hint') hint();
    else if (button?.id === 'differences-zoom') {
      clearTransient(); zoom = !zoom; centerView(); updateOverlays();
      status(zoom ? 'Nagyítva látod ugyanazt a részletet. Húzd bármelyik képet, együtt mozognak!' : 'Újra a teljes képpárt látod.');
    } else if (!button && event.detail === 0 && event.target.closest('.differences-picture')) choosePoint(cursor);
  }

  function onPointerDown(event) {
    const picture = event.target.closest('.differences-picture');
    if (!picture || !playable() || !event.isPrimary || event.button !== 0) return;
    clearPointer(); keyboard = false;
    pointer = { id: event.pointerId, picture, x: event.clientX, y: event.clientY, view: { ...view }, moved: false };
    picture.focus({ preventScroll: true }); picture.setPointerCapture(event.pointerId); updateOverlays();
  }
  function onPointerMove(event) {
    if (!pointer || pointer.id !== event.pointerId) return;
    const dx = event.clientX - pointer.x, dy = event.clientY - pointer.y;
    if (Math.hypot(dx, dy) > 8) pointer.moved = true;
    if (!zoom || !pointer.moved) return;
    const rect = pointer.picture.getBoundingClientRect();
    view.x = clamp(pointer.view.x - dx / rect.width * view.width, 0, WIDTH - view.width);
    view.y = clamp(pointer.view.y - dy / rect.height * view.height, 0, HEIGHT - view.height);
    root.classList.add('is-panning'); updateView();
  }
  function onPointerUp(event) {
    if (!pointer || pointer.id !== event.pointerId) return;
    const previous = pointer, point = pointOnPicture(previous.picture, event.clientX, event.clientY);
    clearPointer(); if (!previous.moved) choosePoint(point);
  }
  function onKeyDown(event) {
    if (!event.target.closest('.differences-picture') || !playable()) return;
    const move = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[event.key];
    if (move) {
      event.preventDefault(); keyboard = true;
      const step = event.shiftKey ? .5 : 2.5;
      cursor = { x: clamp(cursor.x + move[0] * step, 0, 100), y: clamp(cursor.y + move[1] * step, 0, 100) };
      if (zoom && (cursor.x * 8 < view.x + 20 || cursor.x * 8 > view.x + view.width - 20 || cursor.y * 5.2 < view.y + 20 || cursor.y * 5.2 > view.y + view.height - 20)) centerView();
      updateOverlays();
    } else if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); keyboard = true; choosePoint(cursor); }
    else if (event.key === 'Escape' && zoom) { event.preventDefault(); zoom = false; centerView(); }
  }

  function attachListeners() {
    listeners?.abort(); listeners = new AbortController();
    const options = { signal: listeners.signal };
    root.addEventListener('click', onClick, options);
    root.addEventListener('pointerdown', onPointerDown, options);
    root.addEventListener('pointermove', onPointerMove, options);
    root.addEventListener('pointerup', onPointerUp, options);
    root.addEventListener('pointercancel', clearPointer, options);
    root.addEventListener('lostpointercapture', clearPointer, options);
    root.addEventListener('keydown', onKeyDown, options);
    root.addEventListener('focusin', event => { if (event.target.matches('.differences-picture:focus-visible')) { keyboard = true; updateOverlays(); } }, options);
    root.addEventListener('focusout', event => { if (event.target.matches('.differences-picture')) { keyboard = false; updateOverlays(); } }, options);
    document.addEventListener('visibilitychange', () => { if (document.hidden) { clearTransient(); stopPlayback(); updateOverlays(); } }, options);
    window.addEventListener('pagehide', () => { clearTransient(); stopPlayback(); }, options);
  }

  function start(options = {}) {
    clearTransient(); root.querySelector('dialog[open]')?.close(); stopPlayback(); onRestart();
    sceneId = DIFFERENCE_SCENES.some(item => item.id === options.sceneId) ? options.sceneId : sceneId;
    levelId = DIFFERENCE_LEVELS.some(item => item.id === options.levelId) ? options.levelId : levelId;
    scene = DIFFERENCE_SCENES.find(item => item.id === sceneId);
    round = createDifferenceRound(sceneId, levelId);
    // A fresh round should not accidentally present exactly the same subset.
    for (let attempt = 0; attempt < 12 && signature(round) === lastSignature; attempt++) round = createDifferenceRound(sceneId, levelId);
    if (signature(round) === lastSignature) {
      const ceiling = DIFFERENCE_LEVELS.find(item => item.id === levelId)?.ceiling ?? 3;
      const replacement = scene.differences.find(item => item.difficulty <= ceiling && !round.ids.includes(item.id));
      if (replacement) {
        const variants = { ...round.variants, [replacement.id]: differenceVariants(replacement.id).includes(round.variants[round.ids[0]]) ? round.variants[round.ids[0]] : 'authored' };
        delete variants[round.ids[0]];
        round = { ...round, ids: [...round.ids.slice(1), replacement.id], variants };
      }
    }
    lastSignature = signature(round); renderNumber++;
    active = true; finished = false; found = []; hintTarget = null; hintStage = 0; pending = null; misses = 0; hints = 0; missTimes = [];
    zoom = false; view = { x: 0, y: 0, width: WIDTH, height: HEIGHT }; cursor = { x: 50, y: 50 }; keyboard = false;
    render(); attachListeners(); if (options.announce !== false) say('differences_start');
  }
  function restart() { start({ sceneId, levelId }); }
  function stop() {
    active = false; clearTransient(); root.querySelector('dialog[open]')?.close(); listeners?.abort(); listeners = null; stopPlayback();
  }
  return { start, restart, stop, hint, repeat() { say('differences_start', true); }, getContext() { return { sceneId, levelId }; } };
}
