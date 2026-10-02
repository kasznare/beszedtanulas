import { normalizeMeadow, recordMeadowTask, countFeedback, MESE_WORDS } from './meseliget-data.js';
import { createDressBear, createDressIcon } from './dress-art.js';

const animals = ['🐰', '🐱', '🐶', '🐼', '🦊', '🐨', '🐸', '🐯', '🐷', '🐵'];
const names = ['nyuszi', 'cica', 'kutya', 'panda', 'róka', 'koala', 'béka', 'tigris', 'malac', 'majom'];
export function setupMeadow({ getProgress, updateProgress, getOptions, speak, stopPlayback, openScreen }) {
  const root = document.querySelector('#meseliget');
  let active = false, mode = 'map', story = false, solved = false, helped = false, misses = 0;
  let target = 3, round = 0, length = 3, selected = new Set(), dressed = 0, bear, lastClip = 'mese_map';
  const progress = () => normalizeMeadow(getProgress());
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
  function map() {
    stopPlayback(); mode = 'map'; story = false;
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
      <button class="meadow-primary meadow-start" id="meadow-start"><span aria-hidden="true">▶</span> ${p.adventure ? 'Folytassuk a kalandot!' : 'Induljunk piknikezni!'}</button>
      ${p.adventure ? `<p class="meadow-resume">${['A maciháznál várunk.', 'Az almaszedés következik.', 'Már csak meg kell terítenünk!'][p.adventure.step]}</p>` : '<p class="meadow-resume">Öltözés · almaszedés · közös terítés</p>'}
    </div>`;
    const b = createDressBear(root.querySelector('.meadow-map-bear')); b.wear('polo');
    bind('meadow-start', startStory); bind('meadow-house', startStory);
    bind('meadow-garden', () => startFree('collect')); bind('meadow-picnic', () => startFree('serve')); bind('meadow-album', album);
    focusTitle(); say('mese_map');
  }
  function startStory() {
    let p = progress();
    if (!p.adventure) { p.adventure = { step: 0, target: Math.min(3, getOptions().numberLimit) }; updateProgress(p, false); }
    story = true; target = p.adventure.target; round = p.adventure.step; length = 3;
    question(['dress', 'collect', 'serve'][round]);
  }
  function startFree(kind) {
    story = false; round = 0; length = getOptions().roundLength;
    target = 1 + Math.floor(Math.random() * getOptions().numberLimit);
    question(kind);
  }
  function shell(title) {
    root.dataset.mode = mode;
    root.dataset.mood = 'waiting';
    root.innerHTML = `<div class="meadow-toolbar"><button id="meadow-back" class="meadow-quiet" aria-label="Vissza Meseliget térképére">↶ Térkép</button><div class="meadow-steps" aria-label="${round + 1}. állomás, összesen ${length}">${Array.from({length}, (_, i) => `<span class="${i < round ? 'done' : i === round ? 'current' : ''}" aria-hidden="true"></span>`).join('')}</div><button id="meadow-repeat" class="meadow-quiet" aria-label="Kérés újrahallgatása">🔊 Újra</button></div>
      <h2 class="meadow-task-title" tabindex="-1">${title}</h2>
      <div class="meadow-stage"><div class="meadow-companion"><div id="meadow-bear" aria-hidden="true"></div><p>${story ? 'Maci piknikezni indul' : 'Segítsünk a barátainknak!'}</p></div><div id="meadow-work"></div></div>
      <p id="meadow-status" class="meadow-status" role="status" aria-live="polite"></p>
      <div class="meadow-actions"><button id="meadow-hint" class="meadow-quiet">💡 Segíts!</button><button id="meadow-check" class="meadow-primary">Kész! ✓</button><button id="meadow-next" class="meadow-primary" hidden>Tovább ▶</button></div>`;
    bear = createDressBear(root.querySelector('#meadow-bear')); bear.wear('polo');
    if (mode !== 'dress') { bear.wear('sapka'); bear.wear('cipo'); }
    bind('meadow-back', map); bind('meadow-repeat', repeat); bind('meadow-hint', hint); bind('meadow-check', check); bind('meadow-next', next);
    focusTitle();
  }
  function question(kind) {
    stopPlayback(); mode = kind; solved = false; helped = false; misses = 0; selected = new Set(); dressed = 0;
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
        if (dressed === 2) win(); else { renderDress(); say('dress_request_cipo'); }
      }); root.querySelector('.meadow-clothes').append(button);
    }
    root.querySelector('#meadow-check').hidden = true;
    root.querySelector('#meadow-status').textContent = item === 'sapka' ? 'Kérem a sapkát!' : 'Most jöhet a cipő!';
  }
  function renderCollect(focusId) {
    const total = Math.min(12, Math.max(target + 2, 4));
    const apple = (i, inside) => `<button class="meadow-apple ${inside ? 'in-basket' : ''}" data-apple="${i}" aria-label="${inside ? 'Alma visszatevése' : 'Alma a kosárba'}, ${i + 1}. alma" ${solved ? 'disabled' : ''}><span aria-hidden="true">🍎</span></button>`;
    root.querySelector('#meadow-work').innerHTML = `<div class="meadow-orchard" role="group" aria-label="Leszedhető almák">${Array.from({length:total},(_,i)=>selected.has(i)?'':apple(i,false)).join('')}</div><div class="meadow-basket" role="group" aria-label="Kosár, ${selected.size} alma"><span class="meadow-basket-label">🧺 A kosarad</span><div class="meadow-basket-apples">${[...selected].map(i=>apple(i,true)).join('') || '<span class="meadow-empty">Koppints egy almára!</span>'}</div></div>${helped ? `<div class="meadow-count-guide" aria-label="${target} alma kell">${Array.from({length:target},(_,i)=>`<span class="${i<selected.size?'filled':''}">${i+1}</span>`).join('')}</div>` : ''}`;
    root.querySelectorAll('[data-apple]').forEach(button => button.addEventListener('click', () => {
      if (!active || solved || document.hidden) return;
      const id = Number(button.dataset.apple); if (selected.has(id)) selected.delete(id); else selected.add(id);
      renderCollect(id); root.querySelector('#meadow-status').textContent = `${selected.size} alma a kosárban`;
      if (helped && selected.size > 0 && selected.size <= 10) say(`number_${selected.size}`);
    }));
    if (focusId !== undefined) root.querySelector(`[data-apple="${focusId}"]`)?.focus({preventScroll:true});
  }
  function renderServe(focusId) {
    root.querySelector('#meadow-work').innerHTML = `<div class="meadow-guests" data-count="${target}" role="group" aria-label="Piknikező állatok">${Array.from({length:target},(_,i)=>`<button class="meadow-guest ${selected.has(i)?'has-plate':''} ${helped&&!selected.has(i)?'needs-plate':''}" data-guest="${i}" aria-label="${names[i]}: ${selected.has(i)?'tányér visszavétele':'adj egy tányért'}" aria-pressed="${selected.has(i)}" ${solved?'disabled':''}><span class="meadow-animal" aria-hidden="true">${animals[i]}</span><span class="meadow-plate" aria-hidden="true">${selected.has(i)?'🍽️':'＋'}</span></button>`).join('')}</div><p class="meadow-serving-label">${solved?'Megterítettünk!':'Koppints az állatok elé!'}</p>`;
    root.querySelectorAll('[data-guest]').forEach(button => button.addEventListener('click', () => {
      if (!active || solved || document.hidden) return;
      const i = Number(button.dataset.guest); if (selected.has(i)) selected.delete(i); else selected.add(i);
      renderServe(i); root.querySelector('#meadow-status').textContent = `${selected.size} állatnak van tányérja`;
    }));
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
    helped = true; misses++;
    root.querySelector('#meadow-status').textContent = mode === 'serve' ? 'Nézd, kinek nincs még tányérja!' : result === 'more' ? 'Még kell alma a kosárba.' : 'Tegyünk vissza egy almát!';
    if (misses >= 2) { if (mode === 'collect') renderCollect(); else renderServe(); }
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
    const nextButton = root.querySelector('#meadow-next'); nextButton.hidden = false;
    nextButton.textContent = round === length - 1 ? (story ? 'Kezdődhet a piknik! ▶' : 'Elkészültünk! ▶') : 'Tovább ▶';
    say(mode === 'collect' ? `mese_collected_${target}` : mode === 'serve' ? 'mese_served' : 'mese_dressed');
  }
  function next() {
    if (!active || !solved || document.hidden) return;
    solved = false;
    if (round === length - 1) { finish(story); return; }
    if (story) { startStory(); return; }
    round++; target = target % getOptions().numberLimit + 1; question(mode);
  }
  function memoryScene() {
    return `<div class="meadow-memory"><div class="meadow-memory-bear" aria-hidden="true"></div><div class="meadow-memory-friends" aria-hidden="true">🐰 🐱 🐶<br>🍽️ 🍎 🍽️</div></div>`;
  }
  function dressMemory() { const b = createDressBear(root.querySelector('.meadow-memory-bear')); ['polo','sapka','cipo'].forEach(id=>b.wear(id)); }
  function finish(wasStory) {
    stopPlayback(); mode = 'finish'; root.dataset.mode = mode; root.dataset.mood = 'happy';
    root.innerHTML = `<div class="meadow-ending"><span class="meadow-eyebrow">DE JÓ VOLT EGYÜTT!</span><h2 tabindex="-1">${wasStory?'Elkészült a piknik!':'Köszönöm a segítséget!'}</h2>${memoryScene()}<p>${wasStory?'Egy új emlék került az albumodba.':'Mára szépen megdolgoztunk.'}</p><div class="meadow-actions"><button id="meadow-home" class="meadow-quiet">⌂ Mára vége</button><button id="meadow-map" class="meadow-primary">Vissza a ligetbe ▶</button></div></div>`;
    dressMemory(); bind('meadow-home',()=>openScreen('home')); bind('meadow-map',map); focusTitle(); say(wasStory?'mese_finish':'mese_free_finish');
  }
  function album() {
    mode = 'album'; const total = progress().journeys;
    root.innerHTML = `<div class="meadow-ending"><button id="meadow-back" class="meadow-quiet">↶ Térkép</button><h2 tabindex="-1">A mi emlékalbumunk</h2>${total?memoryScene():'<div class="meadow-album-empty" aria-hidden="true">📖</div>'}<p>${total?`${total} közös piknik emléke`:'Az első emlékképünk még ránk vár.'}</p><button id="meadow-start" class="meadow-primary">${progress().adventure?'Folytassuk!':'Induljunk piknikezni!'} ▶</button></div>`;
    if(total)dressMemory(); bind('meadow-back',map);bind('meadow-start',startStory);focusTitle();say(total?'mese_album':'mese_empty_album');
  }
  return { start(){active=true;map();},stop(){active=false;stopPlayback();},repeat };
}
