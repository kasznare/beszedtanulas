import {
  normalizeMeadow, normalizeMeadowOptions, recordMeadowTask, countFeedback, MESE_WORDS, MESE_ANIMALS,
  meadowShuffle, meadowGuests, meadowAppleTotal, meadowInitialCount, createMeadowTask,
  changeMeadowSelection, meadowTaskComplete, meadowServingRequest,
} from './meseliget-data.js';
import { createDressBear, createDressIcon } from './dress-art.js';
import { createSuccessDelay } from './success-delay.js';
import { setGameTitle, focusGameTitle } from './game-heading.js';

const animal = id => MESE_ANIMALS.find(item => item.id === id);
const clone = value => JSON.parse(JSON.stringify(value));
const stationNames = { dress: 'Maciház', collect: 'Almáskert', serve: 'Piknikrét' };
export function setupMeadow({ effect = () => {}, getProgress, updateProgress, getOptions, speak, stopPlayback, openScreen }) {
  const root = document.querySelector('#meseliget');
  let active = false, mode = 'map', story = false, target = 3, round = 0, length = 3, bear;
  let prefs, options, guestIds = [], task = null, lastClip = 'mese_map', lastMemory = null;
  let successPending = false;
  const successDelay = createSuccessDelay();
  function cancelSuccess() { successDelay.cancel(); successPending = false; delete root.dataset.successPending; }
  const progress = () => normalizeMeadow(getProgress());
  const numberLimit = () => Math.max(1, Math.min(10, Math.floor(Number(getOptions().numberLimit) || 3)));
  const alive = () => active && !document.hidden;
  function say(id) { lastClip = id; if (alive()) speak(id); }
  function bind(id, fn) { root.querySelector(`#${id}`)?.addEventListener('click', fn); }
  // Views with a task or result heading focus it; the others focus the shared title.
  function focusTitle() { const heading = root.querySelector('h2'); if (heading) heading.focus({ preventScroll: true }); else focusGameTitle(root); }
  function rememberPrefs() { const p = progress(); p.practice = clone(prefs); updateProgress(p, false); }
  function saveTask() {
    if (!task || !['dress', 'collect', 'serve'].includes(mode)) return;
    const p = progress();
    if (story) { if (!p.adventure || p.adventure.step !== round || task.solved) return; p.adventure.task = clone(task); }
    else p.free = { kind: mode, round, length, target, guests: [...guestIds], options: clone(options), task: clone(task) };
    updateProgress(p, false);
  }
  const effectiveTarget = value => Math.min(numberLimit(), Math.max(options?.collectMode === 'add' ? 2 : 1, value));
  function newTarget() {
    const low = options.collectMode === 'add' ? Math.min(2, numberLimit()) : 1;
    return prefs.varied ? low + Math.floor(Math.random() * (numberLimit() - low + 1)) : effectiveTarget(prefs.target);
  }
  function collectClip() { return `mese_${options.collectMode === 'count' ? 'collect' : options.collectMode}_${target}`; }
  function servingRequest() { return meadowServingRequest(task, guestIds, options); }
  function requestText() {
    const request = servingRequest();
    return request ? `Adj a ${animal(request.guest).to} egy ${request.item === 'plate' ? 'tányért' : 'poharat'}!` : 'Minden teríték elkészült! Koppints a Kész gombra!';
  }
  function repeat() {
    if (!active || successPending) return;
    if (task && !task.solved && mode === 'collect') say(collectClip());
    else if (task && !task.solved && mode === 'serve') {
      const request = servingRequest();
      say(options.serveMode !== 'all' && request ? `mese_guest_${request.guest}_${request.item}` : options.serveMode === 'full' ? 'mese_serve_full' : 'mese_serve');
    } else if (task && !task.solved && mode === 'dress') say(`dress_request_${task.dressed ? 'cipo' : 'sapka'}`);
    else say(lastClip);
  }
  function quantityButtons(value) {
    return `<div class="meadow-quantities" role="group" aria-label="Válassz mennyiséget">${Array.from({ length: numberLimit() }, (_, i) => `<button class="meadow-quantity" data-quantity="${i + 1}" aria-label="${MESE_WORDS[i + 1]} barát" aria-pressed="${value === i + 1}"><strong>${i + 1}</strong><span class="meadow-quantity-dots" aria-hidden="true">${'<i></i>'.repeat(i + 1)}</span></button>`).join('')}</div>`;
  }
  function bindQuantities(inTask = false) {
    root.querySelectorAll('[data-quantity]').forEach(button => button.addEventListener('click', () => {
      if (!alive() || (inTask && task.solved)) return;
      prefs.target = Number(button.dataset.quantity); prefs.varied = false; rememberPrefs();
      if (inTask) { target = effectiveTarget(prefs.target); guestIds = meadowGuests(target); question(mode); }
      else { map(false); root.querySelector(`[data-quantity="${prefs.target}"]`)?.focus({ preventScroll: true }); say(`number_${prefs.target}`); }
    }));
  }
  function practiceOptions() {
    const select = (id, label, items, value) => `<label for="${id}">${label}<select id="${id}">${Object.entries(items).map(([key, text]) => `<option value="${key}" ${key === value ? 'selected' : ''}>${text}</option>`).join('')}</select></label>`;
    return `<details class="meadow-mode-options"><summary>Játékváltozatok</summary><div class="meadow-option-fields">
      ${select('meadow-collect-mode', 'Almáskert', { count: 'Számolás', sort: 'Almák a körték között', add: 'Tegyél hozzá egyet!', remove: 'Vegyél el egyet!' }, prefs.collectMode)}
      ${select('meadow-serve-mode', 'Piknikrét', { all: 'Mindenkinek egy tányér', named: 'Hallgasd meg, ki kér!', full: 'Tányér és pohár, név szerint' }, prefs.serveMode)}
      <label class="meadow-count-toggle"><input id="meadow-show-count" type="checkbox" ${prefs.showCount ? 'checked' : ''}> Mutassuk, hány alma van a kosárban</label>
      <p>Az új játékra és az új kalandra vonatkozik. A félbehagyott játék megtartja a saját változatát.</p>
    </div></details>`;
  }
  function bindPracticeOptions() {
    for (const [id, key] of [['meadow-collect-mode', 'collectMode'], ['meadow-serve-mode', 'serveMode']]) {
      root.querySelector(`#${id}`)?.addEventListener('change', event => {
        if (!alive()) return;
        prefs[key] = event.target.value; rememberPrefs();
      });
    }
    root.querySelector('#meadow-show-count')?.addEventListener('change', event => { if (alive()) { prefs.showCount = event.target.checked; rememberPrefs(); } });
  }
  function map(announce = true) {
    cancelSuccess(); stopPlayback(); mode = 'map'; story = false; task = null;
    root.dataset.mode = mode; root.dataset.mood = 'waiting';
    prefs = clone(progress().practice); prefs.target = Math.min(prefs.target, numberLimit());
    const p = progress();
    setGameTitle(root, 'Meseliget');
    root.innerHTML = `<div class="meadow-map">
      <div class="meadow-map-heading"><p>Merre menjünk ma?</p></div>
      <div class="meadow-places">
        <button class="meadow-place meadow-house" id="meadow-house"><span aria-hidden="true">🏡</span><strong>Maciház</strong><small>Öltözzünk fel!</small></button>
        <button class="meadow-place meadow-garden" id="meadow-garden"><span aria-hidden="true">🍎</span><strong>Almáskert</strong><small>Új almaszedés</small></button>
        <button class="meadow-place meadow-picnic" id="meadow-picnic"><span aria-hidden="true">🧺</span><strong>Piknikrét</strong><small>Új terítés</small></button>
        <button class="meadow-place meadow-album" id="meadow-album"><span aria-hidden="true">📖</span><strong>Emlékalbum</strong><small>${p.journeys ? `${p.journeys} közös piknik` : 'Itt őrizzük az emlékeket'}</small></button>
      </div>
      <div class="meadow-map-bear" aria-hidden="true"></div>
      <div class="meadow-plan"><div class="meadow-plan-heading"><strong>${p.adventure ? `A kalandban ${p.adventure.target} barát vár` : 'Hány barát jöjjön?'}</strong><span>${p.adventure ? 'Mennyiség az új szabad játékhoz' : 'Piknik és szabad játék'}</span></div>${quantityButtons(prefs.target)}<button id="meadow-varied" class="meadow-practice-toggle" aria-pressed="${prefs.varied}"><span aria-hidden="true">${prefs.varied ? '✓' : '○'}</span> Váltakozó mennyiségek a szabad játékban</button>${practiceOptions()}</div>
      ${p.free ? `<button id="meadow-free-resume" class="meadow-quiet meadow-resume-free">↶ Szabad játék folytatása: ${stationNames[p.free.kind]}</button>` : ''}
      <button class="meadow-primary meadow-start" id="meadow-start"><span aria-hidden="true">▶</span> ${p.adventure ? 'Folytassuk a kalandot!' : 'Induljunk piknikezni!'}</button>
      ${p.adventure ? `<p class="meadow-resume">${['A maciháznál várunk.', 'Az almaszedés következik.', 'Már csak meg kell terítenünk!'][p.adventure.step]}</p>` : '<p class="meadow-resume">Öltözés · almaszedés · közös terítés</p>'}
    </div>`;
    const mapBear = createDressBear(root.querySelector('.meadow-map-bear')); mapBear.wear('polo');
    bind('meadow-start', startStory); bind('meadow-house', () => startFree('dress'));
    bind('meadow-garden', () => startFree('collect')); bind('meadow-picnic', () => startFree('serve')); bind('meadow-album', () => album());
    bind('meadow-free-resume', resumeFree); bindQuantities(); bindPracticeOptions();
    bind('meadow-varied', () => { if (!alive()) return; prefs.varied = !prefs.varied; rememberPrefs(); map(false); root.querySelector('#meadow-varied')?.focus({ preventScroll: true }); });
    if (announce) { focusTitle(); say('mese_map'); }
  }
  function startStory() {
    if (!alive()) return;
    const p = progress();
    if (!p.adventure) {
      options = normalizeMeadowOptions(prefs); target = effectiveTarget(prefs.target);
      p.adventure = { step: 0, target, guests: meadowGuests(target), options, task: null }; updateProgress(p, false);
    }
    const adventure = p.adventure;
    story = true; target = adventure.target; round = adventure.step; length = 3; options = clone(adventure.options); guestIds = [...adventure.guests];
    question(['dress', 'collect', 'serve'][round], adventure.task);
  }
  function startFree(kind) {
    if (!alive()) return;
    story = false; round = 0; length = kind === 'dress' ? 1 : [1, 3, 5, 10].includes(getOptions().roundLength) ? getOptions().roundLength : 3;
    options = normalizeMeadowOptions(prefs); target = newTarget(); guestIds = meadowGuests(target); question(kind);
  }
  function resumeFree() {
    if (!alive()) return;
    const saved = progress().free; if (!saved) return;
    story = false; round = saved.round; length = saved.length; target = saved.target; guestIds = [...saved.guests]; options = clone(saved.options);
    question(saved.kind, saved.task);
  }
  function title() {
    if (mode === 'dress') return 'Készüljünk a kirándulásra!';
    if (mode === 'serve') return options.serveMode === 'full' ? 'Tányért és poharat a barátoknak!' : options.serveMode === 'named' ? 'Hallgasd meg, ki kér tányért!' : 'Adj mindenkinek egy tányért!';
    if (options.collectMode === 'add') return `Van ${MESE_WORDS[meadowInitialCount(target, options)]} alma. Tegyél hozzá még egyet!`;
    if (options.collectMode === 'remove') return `Van ${MESE_WORDS[meadowInitialCount(target, options)]} alma. Tegyél vissza egyet!`;
    return `Tegyél ${MESE_WORDS[target]} almát a kosárba!${options.collectMode === 'sort' ? ' A körték maradjanak!' : ''}`;
  }
  function shell() {
    root.dataset.mode = mode; root.dataset.mood = 'waiting'; root.dataset.target = target;
    setGameTitle(root, 'Meseliget');
    root.innerHTML = `<div class="meadow-toolbar"><button id="meadow-back" class="meadow-quiet" aria-label="Vissza Meseliget térképére" hidden>↶ Térkép</button><div class="meadow-steps" aria-label="${round + 1}. állomás, összesen ${length}">${Array.from({ length }, (_, i) => `<span class="${i < round ? 'done' : i === round ? 'current' : ''}" aria-hidden="true"></span>`).join('')}</div><button id="meadow-repeat" class="meadow-quiet" aria-label="Kérés újrahallgatása">🔊 Újra</button></div>
      <h2 class="meadow-task-title" tabindex="-1">${title()}</h2>
      ${story || mode === 'dress' ? '' : `<details class="meadow-practice-options"><summary>${mode === 'collect' ? '🍎' : '🍽️'} ${target} · Új feladat más mennyiséggel</summary>${quantityButtons(target)}</details>`}
      <div class="meadow-stage"><div class="meadow-companion"><div id="meadow-bear" aria-hidden="true"></div><p>${story ? 'Maci piknikezni indul' : 'Segítsünk a barátainknak!'}</p></div><div id="meadow-work"></div></div>
      <p id="meadow-status" class="meadow-status" role="status" aria-live="polite"></p>
      <div class="meadow-controls">${mode === 'dress' ? '' : '<div class="meadow-edit-actions"><button id="meadow-undo" class="meadow-quiet" disabled aria-label="Utolsó lépés visszavonása">↶ Visszavonás</button><button id="meadow-reset" class="meadow-quiet" disabled>↺ Újrakezdem</button></div>'}
      <div class="meadow-actions"><button id="meadow-hint" class="meadow-quiet">💡 Segíts!</button><button id="meadow-check" class="meadow-primary">Kész! ✓</button><button id="meadow-next" class="meadow-primary" hidden>Tovább ▶</button></div></div>`;
    bear = createDressBear(root.querySelector('#meadow-bear')); bear.wear('polo');
    if (mode !== 'dress' || task.dressed >= 1) bear.wear('sapka');
    if (mode !== 'dress' || task.dressed === 2) bear.wear('cipo');
    bind('meadow-back', () => map()); bind('meadow-repeat', repeat); bind('meadow-hint', hint); bind('meadow-check', check); bind('meadow-next', next);
    bind('meadow-undo', undo); bind('meadow-reset', resetTask); bindQuantities(true); focusTitle();
  }
  function question(kind, saved = null) {
    cancelSuccess(); stopPlayback(); mode = kind;
    task = saved ? clone(saved) : createMeadowTask(kind, target, guestIds, options);
    shell(); renderTask();
    if (task.solved) { paintWin(); say(successClip()); }
    else { saveTask(); repeat(); }
  }
  function renderTask(focusId, movement) {
    if (mode === 'dress') renderDress();
    else if (mode === 'collect') renderCollect(focusId, movement);
    else renderServe(focusId, movement);
  }
  function renderDress() {
    const item = task.dressed === 0 ? 'sapka' : 'cipo';
    root.querySelector('#meadow-work').innerHTML = '<div class="meadow-clothes" role="group" aria-label="Válassz ruhát"></div>';
    const choices = meadowShuffle(item === 'sapka' ? ['cipo', 'sapka'] : ['cipo', 'sal']);
    for (const id of choices) {
      const button = document.createElement('button'); button.className = 'meadow-clothing'; button.dataset.item = id;
      button.setAttribute('aria-label', { sapka: 'Sapka', cipo: 'Cipő', sal: 'Sál' }[id]); button.append(createDressIcon(id)); button.disabled = task.solved;
      button.addEventListener('click', () => {
        if (!alive() || task.solved) return;
        root.querySelectorAll('.meadow-retry').forEach(choice => choice.classList.remove('meadow-retry'));
        if (id !== item) { effect('retry'); task.helped = true; button.classList.add('meadow-retry'); root.querySelector('#meadow-status').textContent = 'Hallgassuk meg újra, melyik ruhát kéri!'; saveTask(); repeat(); return; }
        effect('fabric'); bear.wear(item); task.dressed += 1; saveTask();
        if (task.dressed === 2) win();
        else { renderDress(); root.querySelector('.meadow-clothing')?.focus({ preventScroll: true }); repeat(); }
      });
      root.querySelector('.meadow-clothes').append(button);
    }
    root.querySelector('#meadow-check').hidden = true;
    root.querySelector('#meadow-status').textContent = task.solved ? successPending ? '' : 'Felöltöztem!' : item === 'sapka' ? 'Kérem a sapkát!' : 'Most jöhet a cipő!';
  }
  function updateEditActions() {
    const undoButton = root.querySelector('#meadow-undo'), resetButton = root.querySelector('#meadow-reset');
    if (undoButton) undoButton.disabled = task.solved || !task.moves.length;
    const initial = mode === 'collect' ? Array.from({ length: meadowInitialCount(target, options) }, (_, i) => i) : [];
    if (resetButton) resetButton.disabled = task.solved || (JSON.stringify([...task.selected].sort((a, b) => a - b)) === JSON.stringify(initial) && !task.plates.length && !task.cups.length);
  }
  function selectionStatus() {
    if (mode === 'collect') root.querySelector('#meadow-status').textContent = options.showCount || task.helped ? `${task.selected.length} alma a kosárban` : 'Számold meg az almákat! Ha elkészültél, koppints a Kész gombra!';
    else root.querySelector('#meadow-status').textContent = options.serveMode === 'all' ? `${task.plates.length} állatnak van tányérja` : requestText();
  }
  function moveApple(id) {
    if (!alive() || task.solved) return;
    const added = !task.selected.includes(id); task = changeMeadowSelection(task, 'selected', id); saveTask();
    effect(added ? 'collect' : 'undo');
    renderCollect(id, { id, added }); selectionStatus();
    if (task.helped && task.selected.length > 0 && task.selected.length <= 10) say(`number_${task.selected.length}`);
  }
  function moveServe(guest, item) {
    if (!alive() || task.solved) return;
    const field = item === 'plate' ? 'plates' : 'cups', removing = task[field].includes(guest), request = servingRequest();
    if (!removing && options.serveMode !== 'all' && request && (request.guest !== guest || request.item !== item)) {
      effect('retry'); task.helped = true; saveTask(); renderServe(`${guest}-${item}`); root.querySelector('#meadow-status').textContent = requestText(); repeat(); return;
    }
    effect(removing ? 'undo' : 'serve');
    task = changeMeadowSelection(task, field, guest); saveTask(); renderServe(`${guest}-${item}`, { guest, item, added: !removing }); selectionStatus();
    if (options.serveMode !== 'all' && servingRequest()) repeat();
    else if (task.helped && options.serveMode === 'all' && task.plates.length > 0) say(`number_${task.plates.length}`);
  }
  function undo() {
    if (!alive() || task.solved || !task.moves.length) return;
    stopPlayback(); effect('undo'); const last = task.moves.pop(); Object.assign(task, last); saveTask(); renderTask(); selectionStatus();
    root.querySelector(task.moves.length ? '#meadow-undo' : mode === 'collect' ? '[data-apple]' : '[data-guest]')?.focus({ preventScroll: true });
  }
  function resetTask() {
    if (!alive() || task.solved) return;
    stopPlayback(); effect('undo'); task.moves.push({ selected: [...task.selected], plates: [...task.plates], cups: [...task.cups] }); task.moves = task.moves.slice(-100);
    task.selected = mode === 'collect' ? Array.from({ length: meadowInitialCount(target, options) }, (_, i) => i) : []; task.plates = []; task.cups = [];
    saveTask(); renderTask(); selectionStatus(); root.querySelector('#meadow-undo')?.focus({ preventScroll: true });
  }
  function countGuide() {
    return `<div class="meadow-help-tray"><span class="meadow-help-label">Egy pötty, egy alma</span><div class="meadow-count-guide" role="img" aria-label="${target} helyre ${Math.min(task.selected.length, target)} alma került">${Array.from({ length: target }, (_, i) => `<span class="meadow-count-place ${i < task.selected.length ? 'filled' : ''}" aria-hidden="true"><span>${i < task.selected.length ? '🍎' : '•'}</span><small>${i + 1}</small></span>`).join('')}</div>${task.selected.length > target ? `<span class="meadow-extra-apples">${task.selected.length - target} almát tegyünk vissza! ↶</span>` : ''}</div>`;
  }
  function renderCollect(focusId, movement) {
    const total = meadowAppleTotal(target), showCount = options.showCount || task.helped || task.solved;
    const apple = (id, inside) => `<button class="meadow-apple ${inside ? 'in-basket' : ''} ${movement?.id === id ? 'meadow-just-moved' : ''}" data-apple="${id}" aria-label="${inside ? 'Alma visszatevése' : 'Alma a kosárba'}, ${id + 1}. alma" ${task.solved ? 'disabled' : ''}><span aria-hidden="true">🍎</span></button>`;
    const orchard = Array.from({ length: total }, (_, i) => `${task.selected.includes(i) ? '' : apple(i, false)}${options.collectMode === 'sort' && i % 3 === 1 ? `<button class="meadow-apple meadow-pear" data-pear="${i}" aria-label="Körte, ${i + 1}. gyümölcs" ${task.solved ? 'disabled' : ''}><span aria-hidden="true">🍐</span></button>` : ''}`).join('');
    root.querySelector('#meadow-work').innerHTML = `<div class="meadow-garden-scene"><div class="meadow-scene-sky" aria-hidden="true"><span>☀</span><span>Almáskert</span><span>🌿</span></div><div class="meadow-orchard" role="group" aria-label="Leszedhető gyümölcsök">${orchard}</div></div><div class="meadow-basket ${movement?.added ? 'meadow-receiving' : ''}" role="group" aria-label="Kosár${showCount ? `, ${task.selected.length} alma` : ''}"><span class="meadow-basket-label">🧺 A kosarad ${showCount ? `<strong>${task.selected.length}</strong>` : ''}</span><div class="meadow-basket-apples">${task.selected.map(id => apple(id, true)).join('') || '<span class="meadow-empty">Koppints egy almára!</span>'}</div></div>${task.helped ? countGuide() : ''}`;
    root.querySelectorAll('[data-apple]').forEach(button => button.addEventListener('click', () => moveApple(Number(button.dataset.apple))));
    root.querySelectorAll('[data-pear]').forEach(button => button.addEventListener('click', () => {
      if (!alive() || task.solved) return; effect('retry'); task.helped = true; button.classList.add('meadow-retry'); saveTask(); root.querySelector('#meadow-status').textContent = 'Ez körte. Most almát gyűjtünk!'; say('mese_only_apples');
    }));
    updateEditActions(); if (focusId !== undefined) root.querySelector(`[data-apple="${focusId}"]`)?.focus({ preventScroll: true });
  }
  function renderServe(focusId, movement) {
    const request = servingRequest();
    const itemButton = (id, item) => {
      const has = (item === 'plate' ? task.plates : task.cups).includes(id), label = item === 'plate' ? 'tányér' : 'pohár';
      const hinted = task.helped && !has && (options.serveMode === 'all' || request?.guest === id && request?.item === item);
      return `<button class="meadow-serve-item ${has ? 'has-item' : ''} ${hinted ? 'meadow-hint' : ''} ${movement?.guest === id && movement?.item === item ? 'meadow-just-served' : ''}" data-guest="${guestIds.indexOf(id)}" data-guest-id="${id}" data-serve-item="${item}" data-focus="${id}-${item}" aria-label="${animal(id).name}: ${label} ${has ? 'visszavétele' : 'adása'}" aria-pressed="${has}" ${task.solved ? 'disabled' : ''}><span aria-hidden="true">${has ? item === 'plate' ? '🍽️' : '🥛' : item === 'plate' ? '◯ +' : '▱ +'}</span><small>${label}</small></button>`;
    };
    root.querySelector('#meadow-work').innerHTML = `<div class="meadow-picnic-scene"><div class="meadow-scene-sky" aria-hidden="true"><span>🌼</span><span>Piknikrét</span><span>🧺</span></div><div class="meadow-guests ${options.serveMode === 'full' ? 'meadow-full-table' : ''}" data-count="${target}" role="group" aria-label="Piknikező állatok">${guestIds.map((id, i) => `<div class="meadow-guest ${task.plates.includes(id) ? 'has-plate' : task.helped ? 'needs-plate' : ''}"><span class="meadow-animal" aria-hidden="true">${animal(id).emoji}</span><span class="meadow-guest-name">${animal(id).name}</span>${task.helped ? `<small class="meadow-guest-number" aria-hidden="true">${i + 1}</small>` : ''}<div class="meadow-place-setting">${itemButton(id, 'plate')}${options.serveMode === 'full' ? itemButton(id, 'cup') : ''}</div></div>`).join('')}</div></div><p class="meadow-serving-label">${successPending ? '' : task.solved ? 'Megterítettünk!' : options.serveMode !== 'all' ? requestText() : 'Koppints az állatok előtt a tányér helyére!'}</p>`;
    root.querySelectorAll('[data-guest]').forEach(button => button.addEventListener('click', () => moveServe(button.dataset.guestId, button.dataset.serveItem)));
    updateEditActions(); if (focusId) root.querySelector(`[data-focus="${focusId}"]`)?.focus({ preventScroll: true });
  }
  function hint() {
    if (!alive() || task.solved) return;
    task.helped = true; saveTask();
    if (mode === 'collect') { renderCollect(); say('mese_count_help'); }
    else if (mode === 'serve') { renderServe(); options.serveMode === 'all' ? say('mese_plate_help') : repeat(); }
    else { root.querySelector(`[data-item="${task.dressed ? 'cipo' : 'sapka'}"]`)?.classList.add('meadow-hint'); repeat(); }
  }
  function check() {
    if (!alive() || task.solved) return;
    if (meadowTaskComplete(task, target, guestIds, options)) { win(); return; }
    task.helped = true; saveTask();
    const result = countFeedback(task.selected.length, target);
    root.querySelector('#meadow-status').textContent = mode === 'serve' ? 'Nézzük meg, mi hiányzik még!' : result === 'more' ? 'Még kell alma a kosárba.' : 'Tegyünk vissza egy almát!';
    renderTask();
    if (mode === 'serve' && options.serveMode !== 'all') repeat(); else say(mode === 'serve' ? 'mese_plate_more' : `mese_${result}`);
  }
  function successClip() { return mode === 'collect' ? `mese_collected_${target}` : mode === 'serve' ? options.serveMode === 'full' ? 'mese_served_full' : 'mese_served' : story ? 'mese_dressed' : 'mese_house_done'; }
  function lockSuccess() {
    root.querySelector('#meadow-check').hidden = true; root.querySelector('#meadow-hint').hidden = true;
    root.querySelector('.meadow-edit-actions')?.setAttribute('hidden', ''); root.querySelector('.meadow-practice-options')?.setAttribute('hidden', '');
  }
  function paintWin() {
    lockSuccess(); root.dataset.mood = 'happy';
    root.querySelector('#meadow-repeat').disabled = false;
    root.querySelector('#meadow-status').textContent = mode === 'collect' ? `Megvan ${target === 1 || target === 5 ? 'az' : 'a'} ${MESE_WORDS[target]} alma!` : mode === 'serve' ? options.serveMode === 'full' ? 'Mindenkinek jutott tányér és pohár!' : 'Mindenkinek jutott tányér!' : 'Felöltöztem! Indulhatunk!';
    if (mode === 'serve') root.querySelector('.meadow-serving-label').textContent = 'Megterítettünk!';
    const nextButton = root.querySelector('#meadow-next'); nextButton.hidden = false;
    nextButton.textContent = round === length - 1 ? story ? 'Kezdődhet a piknik! ▶' : 'Elkészültünk! ▶' : 'Tovább ▶';
    if (!document.querySelector('dialog[open]')) nextButton.focus({ preventScroll: true });
  }
  function win() {
    if (task.solved) return;
    task.solved = true; successPending = true; root.dataset.successPending = 'true'; stopPlayback();
    const result = recordMeadowTask(progress(), mode, task.helped, { story });
    if (!story) result.progress.free = { kind: mode, round, length, target, guests: [...guestIds], options: clone(options), task: clone(task) };
    if (result.finished) lastMemory = result.progress.memories.at(-1);
    updateProgress(result.progress, story ? result.finished : round === length - 1);
    renderTask(); lockSuccess();
    root.querySelector('#meadow-status').textContent = '';
    root.querySelector('#meadow-repeat').disabled = true;
    const completedTask = task;
    successDelay.schedule(() => {
      if (!active || task !== completedTask || !task.solved) return;
      successPending = false; root.dataset.successPending = 'false'; paintWin();
      if (!document.querySelector('dialog[open]')) say(successClip());
    });
  }
  function next() {
    if (!alive() || !task.solved || successPending) return;
    if (round === length - 1) { finish(story); return; }
    if (story) { startStory(); return; }
    round += 1;
    target = prefs.varied ? target >= numberLimit() ? options.collectMode === 'add' ? 2 : 1 : target + 1 : effectiveTarget(prefs.target);
    guestIds = meadowGuests(target); question(mode);
  }
  function memoryScene(memory) {
    const ids = memory.guests;
    return `<div class="meadow-memory" role="img" aria-label="Közös piknik: ${ids.map(id => animal(id).name).join(', ')}. ${memory.target} barát, alma és teríték."><div class="meadow-memory-bear" aria-hidden="true"></div><div class="meadow-memory-friends" aria-hidden="true">${ids.map(id => `<span>${animal(id).emoji}<small>${memory.serveMode === 'full' ? '🍽️ 🥛 🍎' : '🍽️ 🍎'}</small></span>`).join('')}</div></div>`;
  }
  function dressMemory() { const memoryBear = createDressBear(root.querySelector('.meadow-memory-bear')); ['polo', 'sapka', 'cipo'].forEach(id => memoryBear.wear(id)); }
  function finish(wasStory) {
    cancelSuccess(); stopPlayback();
    if (!wasStory) { const p = progress(); p.free = null; updateProgress(p, false); }
    const memory = wasStory ? lastMemory || progress().memories.at(-1) : { target, guests: guestIds, serveMode: options.serveMode };
    mode = 'finish'; task = null; root.dataset.mode = mode; root.dataset.mood = 'happy';
    setGameTitle(root, 'Meseliget');
    root.innerHTML = `<div class="meadow-ending"><h2 tabindex="-1">${wasStory ? 'Elkészült a piknik!' : 'Köszönöm a segítséget!'}</h2>${memoryScene(memory)}<p>${wasStory ? 'Egy új emlék került az albumodba.' : 'Mára szépen megdolgoztunk.'}</p><div class="meadow-actions"><button id="meadow-home" class="meadow-quiet">⌂ Mára vége</button><button id="meadow-map" class="meadow-primary">Vissza a ligetbe ▶</button>${wasStory ? '<button id="meadow-album-open" class="meadow-quiet">📖 Megnézem az emléket</button>' : ''}</div></div>`;
    dressMemory(); bind('meadow-home', () => openScreen('home')); bind('meadow-map', () => map()); bind('meadow-album-open', () => album()); focusTitle(); say(wasStory ? 'mese_finish' : 'mese_free_finish');
  }
  function album(page = 0) {
    cancelSuccess(); stopPlayback(); mode = 'album'; task = null; root.dataset.mode = mode;
    const p = progress(), total = p.memories.length, index = Math.max(0, Math.min(page, Math.max(0, total - 1))), memory = p.memories.at(-(index + 1)), oldCount = Math.max(0, p.journeys - total);
    const date = memory ? new Intl.DateTimeFormat('hu-HU', { year: 'numeric', month: 'long', day: 'numeric' }).format(new Date(memory.date)) : '';
    setGameTitle(root, 'A mi emlékalbumunk');
    root.innerHTML = `<div class="meadow-ending"><button id="meadow-back" class="meadow-quiet" hidden>↶ Térkép</button>${memory ? `<p class="meadow-memory-date">${date} · ${memory.target} barát</p>${memoryScene(memory)}<div class="meadow-album-pages"><button id="meadow-album-newer" class="meadow-quiet" ${index === 0 ? 'disabled' : ''}>← Újabb</button><span>${total - index}. emlék / ${total}</span><button id="meadow-album-older" class="meadow-quiet" ${index === total - 1 ? 'disabled' : ''}>Régebbi →</button></div><button id="meadow-retell" class="meadow-quiet">🔊 Meséld el!</button>` : '<div class="meadow-album-empty" aria-hidden="true">📖</div><p>Az első emlékképünk még ránk vár.</p>'}<p>${p.journeys} közös piknik${oldCount ? ` · ${oldCount} régi piknikhez még nem készült emlékkép.` : ''}</p><button id="meadow-start" class="meadow-primary">${p.adventure ? 'Folytassuk!' : 'Induljunk piknikezni!'} ▶</button></div>`;
    if (memory) dressMemory();
    bind('meadow-back', () => map()); bind('meadow-start', startStory); bind('meadow-album-newer', () => album(index - 1)); bind('meadow-album-older', () => album(index + 1)); bind('meadow-retell', () => say(`mese_memory_${memory.target}`));
    focusTitle(); say(memory ? `mese_memory_${memory.target}` : 'mese_empty_album');
  }
  document.addEventListener('visibilitychange', () => { if (active && document.hidden) stopPlayback(); });
  return { start() { active = true; prefs = clone(progress().practice); map(); }, stop() { active = false; cancelSuccess(); stopPlayback(); }, repeat };
}
