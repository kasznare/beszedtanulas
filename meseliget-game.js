import { normalizeMeadow, recordMeadowTask, countFeedback, MESE_WORDS } from './meseliget-data.js';
import { createDressBear, createDressIcon } from './dress-art.js';

const animals = ['🐰', '🐱', '🐶', '🐼', '🦊', '🐨', '🐸', '🐯', '🐷', '🐵'];
const names = ['nyuszi', 'cica', 'kutya', 'panda', 'róka', 'koala', 'béka', 'tigris', 'malac', 'majom'];
export function setupMeadow({ getProgress, updateProgress, getOptions, speak, stopPlayback, openScreen }) {
  const root = document.querySelector('#meseliget');
  let active = false, mode = 'map', story = false, solved = false, helped = false;
  let target = 3, round = 0, length = 3, selected = new Set(), dressed = 0, bear, lastClip = 'mese_map';
  let chosenTarget = 3, variedPractice = true, moves = [];
  const progress = () => normalizeMeadow(getProgress());
  const numberLimit = () => Math.max(1, Math.min(10, Math.floor(Number(getOptions().numberLimit) || 3)));
  function say(id) { lastClip = id; if (active && !document.hidden) speak(id); }
  function repeat() {
    if (!active) return;
    if (!solved && mode === 'collect') say(`mese_collect_${target}`);
    else if (!solved && mode === 'serve') say('mese_serve');
    else if (!solved && mode === 'dress') say(`dress_request_${dressed ? 'cipo' : 'sapka'}`);
    else say(lastClip);
  }
  function bind(id, fn) { root.querySelector(`#${id}`)?.addEventListener('click', fn); }
  function focusTitle() { root.querySelector('h2')?.focus({ preventScroll: true }); }
  function quantityButtons(value) {
    return `<div class="meadow-quantities" role="group" aria-label="Válassz mennyiséget">${Array.from({length:numberLimit()},(_,i)=>`<button class="meadow-quantity" data-quantity="${i+1}" aria-label="${MESE_WORDS[i+1]} barát" aria-pressed="${value===i+1}"><strong>${i+1}</strong><span class="meadow-quantity-dots" aria-hidden="true">${'<i></i>'.repeat(i+1)}</span></button>`).join('')}</div>`;
  }
  function bindQuantities(inTask = false) {
    root.querySelectorAll('[data-quantity]').forEach(button=>button.addEventListener('click',()=>{
      if (!active || document.hidden || (inTask && solved)) return;
      chosenTarget = Number(button.dataset.quantity); variedPractice = false;
      if (inTask) { target = chosenTarget; question(mode); }
      else { map(false); root.querySelector(`[data-quantity="${chosenTarget}"]`)?.focus({preventScroll:true}); say(`number_${chosenTarget}`); }
    }));
  }
  function map(announce = true) {
    stopPlayback(); mode = 'map'; story = false; root.dataset.mode = mode; root.dataset.mood = 'waiting';
    chosenTarget = Math.min(chosenTarget, numberLimit());
    const p = progress();
    root.innerHTML = `<div class="meadow-map">
      <div class="meadow-map-heading"><span class="meadow-eyebrow">EGYÜTT A MACIVAL</span><h2 tabindex="-1">Irány a piknik!</h2><p>Merre menjünk ma?</p></div>
      <div class="meadow-places">
        <button class="meadow-place meadow-house" id="meadow-house"><span aria-hidden="true">🏡</span><strong>Maciház</strong><small>Készüljünk együtt!</small></button>
        <button class="meadow-place meadow-garden" id="meadow-garden"><span aria-hidden="true">🍎</span><strong>Almáskert</strong><small>Almát a kosárba!</small></button>
        <button class="meadow-place meadow-picnic" id="meadow-picnic"><span aria-hidden="true">🧺</span><strong>Piknikrét</strong><small>Mindenkinek egyet!</small></button>
        <button class="meadow-place meadow-album" id="meadow-album"><span aria-hidden="true">📖</span><strong>Emlékalbum</strong><small>${p.journeys ? `${p.journeys} közös piknik` : 'Itt őrizzük az emlékeket'}</small></button>
      </div>
      <div class="meadow-map-bear" aria-hidden="true"></div>
      <div class="meadow-plan"><div class="meadow-plan-heading"><strong>${p.adventure ? `A kalandban ${p.adventure.target} barát vár` : 'Hány barát jöjjön?'}</strong><span>${p.adventure ? 'Mennyiség a szabad játékhoz' : 'Piknik és szabad játék'}</span></div>${quantityButtons(chosenTarget)}<button id="meadow-varied" class="meadow-practice-toggle" aria-pressed="${variedPractice}"><span aria-hidden="true">${variedPractice?'✓':'○'}</span> Váltakozó mennyiségek a szabad játékban</button></div>
      <button class="meadow-primary meadow-start" id="meadow-start"><span aria-hidden="true">▶</span> ${p.adventure ? 'Folytassuk a kalandot!' : 'Induljunk piknikezni!'}</button>
      ${p.adventure ? `<p class="meadow-resume">${['A maciháznál várunk.', 'Az almaszedés következik.', 'Már csak meg kell terítenünk!'][p.adventure.step]}</p>` : '<p class="meadow-resume">Öltözés · almaszedés · közös terítés</p>'}
    </div>`;
    const b = createDressBear(root.querySelector('.meadow-map-bear')); b.wear('polo');
    bind('meadow-start', startStory); bind('meadow-house', startStory);
    bind('meadow-garden', () => startFree('collect')); bind('meadow-picnic', () => startFree('serve')); bind('meadow-album', album);
    bindQuantities(); bind('meadow-varied',()=>{
      if (!active || document.hidden) return;
      variedPractice = !variedPractice; map(false); root.querySelector('#meadow-varied')?.focus({preventScroll:true});
    });
    if (announce) { focusTitle(); say('mese_map'); }
  }
  function startStory() {
    if (!active || document.hidden) return;
    let p = progress();
    if (!p.adventure) { p.adventure = { step: 0, target: Math.min(chosenTarget, numberLimit()) }; updateProgress(p, false); }
    story = true; target = p.adventure.target; round = p.adventure.step; length = 3;
    question(['dress', 'collect', 'serve'][round]);
  }
  function startFree(kind) {
    if (!active || document.hidden) return;
    story = false; round = 0; length = getOptions().roundLength;
    target = variedPractice ? 1 + Math.floor(Math.random() * numberLimit()) : Math.min(chosenTarget, numberLimit());
    question(kind);
  }
  function shell(title) {
    root.dataset.mode = mode;
    root.dataset.mood = 'waiting';
    root.dataset.target = target;
    root.innerHTML = `<div class="meadow-toolbar"><button id="meadow-back" class="meadow-quiet" aria-label="Vissza Meseliget térképére">↶ Térkép</button><div class="meadow-steps" aria-label="${round + 1}. állomás, összesen ${length}">${Array.from({length}, (_, i) => `<span class="${i < round ? 'done' : i === round ? 'current' : ''}" aria-hidden="true"></span>`).join('')}</div><button id="meadow-repeat" class="meadow-quiet" aria-label="Kérés újrahallgatása">🔊 Újra</button></div>
      <h2 class="meadow-task-title" tabindex="-1">${title}</h2>
      ${story || mode === 'dress' ? '' : `<details class="meadow-practice-options"><summary>${mode==='collect'?'🍎':'🍽️'} ${target} · Mennyiség választása</summary>${quantityButtons(target)}</details>`}
      <div class="meadow-stage"><div class="meadow-companion"><div id="meadow-bear" aria-hidden="true"></div><p>${story ? 'Maci piknikezni indul' : 'Segítsünk a barátainknak!'}</p></div><div id="meadow-work"></div></div>
      <p id="meadow-status" class="meadow-status" role="status" aria-live="polite"></p>
      <div class="meadow-controls">${mode==='dress'?'':'<div class="meadow-edit-actions"><button id="meadow-undo" class="meadow-quiet" disabled aria-label="Utolsó lépés visszavonása">↶ Visszavonás</button><button id="meadow-reset" class="meadow-quiet" disabled>↺ Újrakezdem</button></div>'}
      <div class="meadow-actions"><button id="meadow-hint" class="meadow-quiet">💡 Segíts!</button><button id="meadow-check" class="meadow-primary">Kész! ✓</button><button id="meadow-next" class="meadow-primary" hidden>Tovább ▶</button></div></div>`;
    bear = createDressBear(root.querySelector('#meadow-bear')); bear.wear('polo');
    if (mode !== 'dress') { bear.wear('sapka'); bear.wear('cipo'); }
    bind('meadow-back', map); bind('meadow-repeat', repeat); bind('meadow-hint', hint); bind('meadow-check', check); bind('meadow-next', next);
    bind('meadow-undo',undo); bind('meadow-reset',resetTask); bindQuantities(true);
    focusTitle();
  }
  function question(kind) {
    stopPlayback(); mode = kind; solved = false; helped = false; selected = new Set(); dressed = 0; moves = [];
    const title = kind === 'dress' ? 'Készüljünk a kirándulásra!' : kind === 'collect' ? `Tegyél ${MESE_WORDS[target]} almát a kosárba!` : 'Adj mindenkinek egy tányért!';
    shell(title);
    if (kind === 'dress') { renderDress(); say('dress_request_sapka'); }
    if (kind === 'collect') { renderCollect(); say(`mese_collect_${target}`); }
    if (kind === 'serve') { renderServe(); say('mese_serve'); }
  }
  function renderDress() {
    const item = dressed === 0 ? 'sapka' : 'cipo';
    root.querySelector('#meadow-work').innerHTML = '<div class="meadow-clothes" role="group" aria-label="Válassz ruhát"></div>';
    const choices = item === 'sapka' ? ['cipo', 'sapka'] : ['cipo', 'sal'];
    for (const id of choices) {
      const button = document.createElement('button'); button.className = 'meadow-clothing'; button.dataset.item = id;
      button.setAttribute('aria-label', {sapka:'Sapka', cipo:'Cipő', sal:'Sál'}[id]); button.append(createDressIcon(id));
      button.addEventListener('click', () => {
        if (!active || solved || document.hidden) return;
        if (id !== item) { helped = true; button.classList.add('meadow-try'); say(`dress_request_${item}`); return; }
        bear.wear(item); dressed++;
        if (dressed === 2) win(); else { renderDress(); root.querySelector('[data-item="cipo"]')?.focus({preventScroll:true}); say('dress_request_cipo'); }
      }); root.querySelector('.meadow-clothes').append(button);
    }
    root.querySelector('#meadow-check').hidden = true;
    root.querySelector('#meadow-status').textContent = item === 'sapka' ? 'Kérem a sapkát!' : 'Most jöhet a cipő!';
  }
  function updateEditActions() {
    const undoButton = root.querySelector('#meadow-undo'), resetButton = root.querySelector('#meadow-reset');
    if (undoButton) undoButton.disabled = solved || moves.length === 0;
    if (resetButton) resetButton.disabled = solved || selected.size === 0;
  }
  function selectionStatus() {
    root.querySelector('#meadow-status').textContent = mode === 'collect' ? `${selected.size} alma a kosárban` : `${selected.size} állatnak van tányérja`;
  }
  function moveItem(id) {
    if (!active || solved || document.hidden) return;
    moves.push([...selected]);
    const added = !selected.has(id);
    if (added) selected.add(id); else selected.delete(id);
    if (mode === 'collect') renderCollect(id, {id,added}); else renderServe(id, {id,added});
    selectionStatus();
    if (helped && selected.size > 0 && selected.size <= 10) say(`number_${selected.size}`);
  }
  function undo() {
    if (!active || solved || document.hidden || !moves.length) return;
    stopPlayback(); selected = new Set(moves.pop());
    if (mode === 'collect') renderCollect(); else renderServe();
    selectionStatus();
    if (!moves.length) root.querySelector(mode === 'collect' ? '[data-apple]' : '[data-guest]')?.focus({preventScroll:true});
  }
  function resetTask() {
    if (!active || solved || document.hidden || !selected.size) return;
    stopPlayback(); moves.push([...selected]); selected.clear();
    if (mode === 'collect') renderCollect(); else renderServe();
    selectionStatus(); root.querySelector('#meadow-undo')?.focus({preventScroll:true});
  }
  function countGuide() {
    return `<div class="meadow-help-tray"><span class="meadow-help-label">Egy pötty, egy alma</span><div class="meadow-count-guide" role="img" aria-label="${target} helyre ${Math.min(selected.size,target)} alma került">${Array.from({length:target},(_,i)=>`<span class="meadow-count-place ${i<selected.size?'filled':''}" aria-hidden="true"><span>${i<selected.size?'🍎':'•'}</span><small>${i+1}</small></span>`).join('')}</div>${selected.size>target?`<span class="meadow-extra-apples">${selected.size-target} almát tegyünk vissza! ↶</span>`:''}</div>`;
  }
  function renderCollect(focusId, movement) {
    const total = Math.min(12, Math.max(target + 2, 4));
    const apple = (i, inside) => `<button class="meadow-apple ${inside ? 'in-basket' : ''} ${movement?.id===i?'meadow-just-moved':''}" data-apple="${i}" aria-label="${inside ? 'Alma visszatevése' : 'Alma a kosárba'}, ${i + 1}. alma" ${solved ? 'disabled' : ''}><span aria-hidden="true">🍎</span></button>`;
    root.querySelector('#meadow-work').innerHTML = `<div class="meadow-garden-scene"><div class="meadow-scene-sky" aria-hidden="true"><span>☀</span><span>Almáskert</span><span>🌿</span></div><div class="meadow-orchard" role="group" aria-label="Leszedhető almák">${Array.from({length:total},(_,i)=>selected.has(i)?'':apple(i,false)).join('')}</div></div><div class="meadow-basket ${movement?.added?'meadow-receiving':''}" role="group" aria-label="Kosár, ${selected.size} alma"><span class="meadow-basket-label">🧺 A kosarad <strong>${selected.size}</strong></span><div class="meadow-basket-apples">${[...selected].map(i=>apple(i,true)).join('') || '<span class="meadow-empty">Koppints egy almára!</span>'}</div></div>${helped ? countGuide() : ''}`;
    root.querySelectorAll('[data-apple]').forEach(button => button.addEventListener('click', () => {
      moveItem(Number(button.dataset.apple));
    }));
    updateEditActions();
    if (focusId !== undefined) root.querySelector(`[data-apple="${focusId}"]`)?.focus({preventScroll:true});
  }
  function renderServe(focusId, movement) {
    root.querySelector('#meadow-work').innerHTML = `<div class="meadow-picnic-scene"><div class="meadow-scene-sky" aria-hidden="true"><span>🌼</span><span>Piknikrét</span><span>🧺</span></div><div class="meadow-guests" data-count="${target}" role="group" aria-label="Piknikező állatok">${Array.from({length:target},(_,i)=>`<button class="meadow-guest ${selected.has(i)?'has-plate':''} ${helped&&!selected.has(i)?'needs-plate':''} ${movement?.id===i?'meadow-just-served':''}" data-guest="${i}" aria-label="${names[i]}: ${selected.has(i)?'tányér visszavétele':'adj egy tányért'}" aria-pressed="${selected.has(i)}" ${solved?'disabled':''}><span class="meadow-animal" aria-hidden="true">${animals[i]}</span>${helped?`<small class="meadow-guest-number" aria-hidden="true">${i+1}</small>`:''}<span class="meadow-plate" aria-hidden="true">${selected.has(i)?'🍽️':'＋'}</span>${helped?`<span class="meadow-pairing-dot ${selected.has(i)?'filled':''}" aria-hidden="true">${selected.has(i)?'✓':'•'}</span>`:''}</button>`).join('')}</div></div><p class="meadow-serving-label">${solved?'Megterítettünk!':helped?'Egy barát, egy tányér.':'Koppints az állatok elé!'}</p>`;
    root.querySelectorAll('[data-guest]').forEach(button => button.addEventListener('click', () => {
      moveItem(Number(button.dataset.guest));
    }));
    updateEditActions();
    if (focusId !== undefined) root.querySelector(`[data-guest="${focusId}"]`)?.focus({preventScroll:true});
  }
  function hint() {
    if (solved || !active || document.hidden) return;
    helped = true;
    if (mode === 'collect') { renderCollect(); say('mese_count_help'); }
    else if (mode === 'serve') { renderServe(); say('mese_plate_help'); }
    else { root.querySelector(`[data-item="${dressed ? 'cipo':'sapka'}"]`)?.classList.add('meadow-try'); say(`dress_request_${dressed?'cipo':'sapka'}`); }
  }
  function check() {
    if (solved || !active || document.hidden) return;
    const result = countFeedback(selected.size, target);
    if (result === 'correct') { win(); return; }
    helped = true;
    root.querySelector('#meadow-status').textContent = mode === 'serve' ? 'Nézd, kinek nincs még tányérja!' : result === 'more' ? 'Még kell alma a kosárba.' : 'Tegyünk vissza egy almát!';
    if (mode === 'collect') renderCollect(); else renderServe();
    say(mode === 'serve' ? 'mese_plate_more' : `mese_${result}`);
  }
  function win() {
    if (solved) return; solved = true; stopPlayback();
    const p = progress();
    // Free play must never advance a saved story.
    const adventure = p.adventure;
    if (!story) p.adventure = null;
    const result = recordMeadowTask(p, mode, helped);
    if (!story) result.progress.adventure = adventure;
    const reward = story ? result.finished : round === length - 1;
    updateProgress(result.progress, reward);
    root.dataset.mood = 'happy';
    if (mode === 'collect') renderCollect();
    else if (mode === 'serve') renderServe();
    else root.querySelectorAll('.meadow-clothing').forEach(b=>b.disabled=true);
    root.querySelector('#meadow-status').textContent = mode === 'collect' ? `Megvan ${target === 1 ? 'az' : 'a'} ${MESE_WORDS[target]} alma!` : mode === 'serve' ? 'Mindenkinek jutott tányér!' : 'Felöltöztem! Indulhatunk!';
    root.querySelector('#meadow-check').hidden = true; root.querySelector('#meadow-hint').hidden = true;
    root.querySelector('.meadow-edit-actions')?.setAttribute('hidden','');
    root.querySelector('.meadow-practice-options')?.setAttribute('hidden','');
    const nextButton = root.querySelector('#meadow-next'); nextButton.hidden = false;
    nextButton.textContent = round === length - 1 ? (story ? 'Kezdődhet a piknik! ▶' : 'Elkészültünk! ▶') : 'Tovább ▶';
    nextButton.focus({preventScroll:true});
    say(mode === 'collect' ? `mese_collected_${target}` : mode === 'serve' ? 'mese_served' : 'mese_dressed');
  }
  function next() {
    if (!active || !solved || document.hidden) return;
    solved = false;
    if (round === length - 1) { finish(story); return; }
    if (story) { startStory(); return; }
    round++; target = variedPractice ? target % numberLimit() + 1 : Math.min(chosenTarget, numberLimit()); question(mode);
  }
  function memoryScene() {
    return `<div class="meadow-memory"><div class="meadow-memory-bear" aria-hidden="true"></div><div class="meadow-memory-friends" aria-hidden="true">${Array.from({length:Math.min(target,10)},(_,i)=>`<span>${animals[i]}<small>🍽️ 🍎</small></span>`).join('')}</div></div>`;
  }
  function dressMemory() { const b = createDressBear(root.querySelector('.meadow-memory-bear')); ['polo','sapka','cipo'].forEach(id=>b.wear(id)); }
  function finish(wasStory) {
    stopPlayback(); mode = 'finish'; root.dataset.mode = mode; root.dataset.mood = 'happy';
    root.innerHTML = `<div class="meadow-ending"><span class="meadow-eyebrow">DE JÓ VOLT EGYÜTT!</span><h2 tabindex="-1">${wasStory?'Elkészült a piknik!':'Köszönöm a segítséget!'}</h2>${memoryScene()}<p>${wasStory?'Egy új emlék került az albumodba.':'Mára szépen megdolgoztunk.'}</p><div class="meadow-actions"><button id="meadow-home" class="meadow-quiet">⌂ Mára vége</button><button id="meadow-map" class="meadow-primary">Vissza a ligetbe ▶</button></div></div>`;
    dressMemory(); bind('meadow-home',()=>openScreen('home')); bind('meadow-map',map); focusTitle(); say(wasStory?'mese_finish':'mese_free_finish');
  }
  function album() {
    stopPlayback(); mode = 'album'; root.dataset.mode = mode; const total = progress().journeys;
    root.innerHTML = `<div class="meadow-ending"><button id="meadow-back" class="meadow-quiet">↶ Térkép</button><h2 tabindex="-1">A mi emlékalbumunk</h2>${total?memoryScene():'<div class="meadow-album-empty" aria-hidden="true">📖</div>'}<p>${total?`${total} közös piknik emléke`:'Az első emlékképünk még ránk vár.'}</p><button id="meadow-start" class="meadow-primary">${progress().adventure?'Folytassuk!':'Induljunk piknikezni!'} ▶</button></div>`;
    if(total)dressMemory(); bind('meadow-back',map);bind('meadow-start',startStory);focusTitle();say(total?'mese_album':'mese_empty_album');
  }
  return { start(){active=true;map();},stop(){active=false;stopPlayback();},repeat };
}
