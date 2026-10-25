import { WORKSHOP_GAMES, WORKSHOP_NAMES, WORKSHOP_LEVEL_NAMES, WORKSHOP_COLORS, WORKSHOP_SHAPES, workshopObjectName, generateWorkshopTask, newWorkshopSession, normalizeWorkshop, workshopSortTarget, workshopHint, completeWorkshop, rememberWorkshop, undoWorkshop, workshopTaskForSession, remainingWorkshopSolutions, beginWorkshopAlternative, workshopFixedSum, workshopBalanceStars, workshopLevelFor, newWorkshopDesign, workshopDesignUnit, workshopDesignReady, workshopDesignSequence, weaveWorkshopDesign, workshopDesignSolved } from './workshop-data.js';
import { createSuccessDelay } from './success-delay.js';
import { relatedTaskMarkup } from './next-task.js';
import { setGameTitle, focusGameTitle } from './game-heading.js';

export function setupWorkshop({ effect = () => {}, getProgress, updateProgress, getOptions, speak, stopPlayback, setLevel }) {
  const root = document.querySelector('#workshop');
  if (!root) return { start() {}, stop() {}, repeat() {} };
  root.classList.add('workshop-panel');
  let active = false, kind = null, level = 1, session = null, task = null, selected = null, slot = 0, status = '', arrived = null, tried = false, bounced = null, design = null, designSlot = 0;
  const levels = { sort: 1, pattern: 1, balance: 1 };
  let successPending = false;
  const successDelay = createSuccessDelay();
  const finished = () => session?.done && !successPending;
  function cancelSuccess() { successDelay.cancel(); successPending = false; }
  const $ = selector => root.querySelector(selector);
  const bind = (selector, fn) => $(selector)?.addEventListener('click', fn);
  const say = (...ids) => { if (active && !document.hidden) speak(ids.flat()); };
  const allowed = () => active && !document.hidden && session && !session.done;
  const loadLevels = () => { for (const game of WORKSHOP_GAMES) levels[game] = workshopLevelFor(getOptions?.(), game); };
  function save(reward = false) {
    const progress = normalizeWorkshop(getProgress());
    progress.sessions[kind][level - 1] = structuredClone(session);
    updateProgress(progress, reward);
  }
  const objectArt = (object, showSize = false) => `<span class="ws-object ${showSize ? (object.size ? 'ws-large' : 'ws-small') : ''}" style="--object-color:${WORKSHOP_COLORS[object.color].hex}" aria-hidden="true"><span class="ws-shape ws-${object.shape}"><span class="ws-mark">${WORKSHOP_COLORS[object.color].mark}</span></span></span>`;
  const rodArt = value => `<span class="ws-rod ws-rod-${value}" style="--units:${value}" aria-hidden="true">${Array.from({ length: value }, () => '<i></i>').join('')}</span>`;
  const icons = {
    sort: '<span class="ws-menu-sort" aria-hidden="true"><i>●</i><i>■</i><i>▲</i></span>',
    pattern: '<span class="ws-menu-pattern" aria-hidden="true">● ◇ ● <b>◇</b></span>',
    balance: '<span class="ws-menu-balance" aria-hidden="true">⚖</span>',
  };
  function menu(focus) {
    cancelSuccess(); stopPlayback(); kind = null; session = null; selected = null; status = ''; arrived = null; bounced = null; design = null;
    delete root.dataset.successPending;
    const shared = WORKSHOP_GAMES.every(game => levels[game] === levels.sort) ? levels.sort : 0;
    level = shared || level;
    root.dataset.game = 'menu'; root.dataset.done = 'false'; root.dataset.level = shared;
    const progress = normalizeWorkshop(getProgress());
    setGameTitle(root, 'Műhelyliget');
    // The menu strip sets all three workshops at once; each game also has its own strip.
    root.innerHTML = `<div class="ws-levels" role="group" aria-label="Nehézség mindhárom műhelyben">${WORKSHOP_LEVEL_NAMES.map((name, i) => `<button id="ws-level-${i + 1}" data-level="${i + 1}" aria-pressed="${shared === i + 1}"><span aria-hidden="true">${'◆'.repeat(i + 1)}</span>${name}</button>`).join('')}</div><div class="ws-places">${WORKSHOP_GAMES.map(game => {
      const own = levels[game], saved = progress.sessions[game][own - 1], total = progress.games[game][own - 1].independent + progress.games[game][own - 1].assisted;
      return `<button id="ws-place-${game}" class="ws-place ws-place-${game}" data-game="${game}">${icons[game]}<strong>${WORKSHOP_NAMES[game]}</strong><span>${{ sort: 'Minden tárgynak saját helye van.', pattern: 'Fűzd tovább a színes mintát!', balance: 'Hozd egyensúlyba a két oldalt!' }[game]}</span><small>${shared ? '' : `${WORKSHOP_LEVEL_NAMES[own - 1]} · `}${saved && !saved.done ? '↶ Folytatható' : total ? `✿ ${total} elkészült feladat` : 'Egy új felfedezés vár.'}</small></button>`;
    }).join('')}</div><p class="ws-footer">Koppintással is mozgathatsz. Minden lépés visszavonható.</p>`;
    root.querySelectorAll('[data-game]').forEach(button => button.addEventListener('click', () => { if (active) startGame(button.dataset.game); }));
    root.querySelectorAll('[data-level]').forEach(button => button.addEventListener('click', () => {
      if (!active) return;
      level = Number(button.dataset.level); for (const game of WORKSHOP_GAMES) levels[game] = level;
      setLevel?.(level); menu(button.id);
      say(`workshop_level_${level}`);
    }));
    if (focus) $(`#${focus}`)?.focus({ preventScroll: true }); else focusGameTitle(root);
  }
  function startGame(game, fresh = false, lead = []) {
    cancelSuccess(); stopPlayback(); kind = game; level = levels[game]; design = null;
    const previous = normalizeWorkshop(getProgress()).sessions[kind][level - 1];
    session = !fresh && previous ? previous : newWorkshopSession(kind, level);
    task = workshopTaskForSession(session);
    selected = null; slot = Math.max(0, session.moves.answers.indexOf(null)); status = ''; arrived = null; tried = false; bounced = null;
    save(); render(); focusGameTitle(root); repeat(lead);
  }
  // In-game strip: changes only this workshop's level and opens that level's own saved task.
  function changeLevel(next) {
    if (!active || !kind || successPending || next === level || ![1, 2, 3].includes(next)) return;
    levels[kind] = next; setLevel?.(next, kind);
    const saved = normalizeWorkshop(getProgress()).sessions[kind][next - 1];
    startGame(kind, Boolean(saved?.done), [`workshop_level_${next}`]);
  }
  function repeat(lead = []) {
    if (!active || successPending) return;
    lead = Array.isArray(lead) ? lead : [];
    if (!kind) { say('workshop_menu'); return; }
    if (session.done) { say(...lead, `workshop_${kind}_done`); return; }
    const ids = [`workshop_${kind}_${level}`];
    if (kind === 'sort' && session.taskVersion>=3) {
      ids.splice(0,1,task.round?'workshop_sort_again_new':'workshop_sort_new',`workshop_sort_rule_${task.ruleKeys.join('_')}`);
      if(task.filter) ids.push(task.filter.key==='size'?(task.filter.value?'workshop_only_big':'workshop_only_small'):`workshop_only_${task.filter.value}`);
    } else {
      if (kind === 'sort' && task.round === 1) ids.splice(0,1,`workshop_sort_again_${level}`);
      if (kind === 'sort' && level === 3) ids.push(task.wantedSize ? 'workshop_only_big' : 'workshop_only_small');
    }
    if(kind==='pattern'&&level===3&&session.taskVersion>=3) ids.splice(0,1,'workshop_pattern_2');
    if (kind === 'balance') ids.push('workshop_target', { id: `workshop_n_${task.target}`, cue: { target: '.ws-balance-reference, .ws-balance-heading span:first-child' } });
    // The missing-rod task also names the rod that is already in place.
    if (kind === 'balance' && task.mode === 'missing') ids.push({ id: `workshop_n_${task.fixed[0]}`, cue: { target: '.ws-fixed-rod' } });
    say(...lead, ids);
  }
  // "Tervezd meg!" side game inside Mintaszövő: build a unit, watch it repeat, then mend the gaps. Not saved.
  function startDesign() {
    if (!active || kind !== 'pattern' || successPending) return;
    stopPlayback(); effect('grab'); design = newWorkshopDesign(); designSlot = 0; status = '';
    renderDesign(); focusGameTitle(root);
  }
  function leaveDesign() {
    if (!design) return;
    stopPlayback(); design = null; status = ''; render(); focusGameTitle(root); repeat();
  }
  function renderDesign(focus) {
    const previousFocus = focus || (root.contains(document.activeElement) ? document.activeElement.id : null);
    const build = design.phase === 'build', solved = workshopDesignSolved(design), sequence = build ? [] : workshopDesignSequence(design);
    root.dataset.game = 'design'; root.dataset.done = String(solved);
    const bead = (value, index, extra = '') => `<span class="ws-pattern-fixed ${extra}" role="img" aria-label="${index + 1}. hely: ${workshopObjectName(design.palette[value])}">${objectArt(design.palette[value])}<small>${index + 1}.</small></span>`;
    const thread = build
      ? design.slots.map((value, i) => `<button id="ws-design-slot-${i}" data-design-slot="${i}" class="ws-pattern-slot ${designSlot === i ? 'ws-selected' : ''}" aria-pressed="${designSlot === i}" aria-label="Az egység ${i + 1}. helye: ${value === null ? 'üres' : workshopObjectName(design.palette[value])}">${value === null ? '<span class="ws-slot-empty" aria-hidden="true">＋</span>' : objectArt(design.palette[value])}<small>${i + 1}.</small></button>`).join('')
      : sequence.map((value, index) => {
        const hole = design.holes.indexOf(index);
        if (hole < 0) return bead(value, index, index < workshopDesignUnit(design).length ? 'ws-motif-glow' : '');
        const answer = design.answers[hole];
        return `<button id="ws-design-gap-${hole}" data-design-gap="${hole}" class="ws-pattern-slot ${designSlot === hole ? 'ws-selected' : ''} ${tried && answer !== value ? 'ws-review' : ''}" aria-pressed="${designSlot === hole}" aria-label="${index + 1}. hely: ${answer === null ? 'üres' : workshopObjectName(design.palette[answer])}" ${solved ? 'disabled' : ''}>${answer === null ? '<span class="ws-slot-empty" aria-hidden="true">＋</span>' : objectArt(design.palette[answer])}<small>${index + 1}.</small></button>`;
      }).join('');
    const current = build ? design.slots[designSlot] : design.answers[designSlot];
    root.innerHTML = `<div class="ws-toolbar"><button id="ws-back" hidden>↶ Liget</button><button id="ws-design-leave">↶ Vissza a mintához</button>${solved ? '<div class="ws-celebration" role="img" aria-label="Elkészült a saját minta"><span aria-hidden="true">✿</span><strong>Saját minta!</strong><span aria-hidden="true">✿</span></div>' : ''}</div><div class="ws-heading"><p>${build ? 'Tervezd meg! Rakj ki 2 vagy 3 formát. A fonal ezt fogja ismételni.' : solved ? 'A te mintád végigfut a fonalon.' : 'A fonal a te mintádat ismétli. Két helyről leesett egy forma: tedd vissza őket!'}</p></div><div id="ws-work"><section class="ws-pattern-panel ws-design-panel"><div class="ws-pattern-thread ${build ? 'ws-design-unit' : ''}" aria-label="${build ? 'A tervezett egység' : 'A szőtt minta'}">${thread}</div></section><section class="ws-pattern-toolbox"><h3>Formakészlet</h3><div class="ws-pattern-choices">${design.palette.map((object, index) => `<button id="ws-design-choice-${index}" data-design-choice="${index}" class="ws-choice" aria-label="Tedd a kijelölt helyre: ${workshopObjectName(object)}" ${solved ? 'disabled' : ''}>${objectArt(object)}<small>${WORKSHOP_COLORS[object.color].name}<br>${WORKSHOP_SHAPES[object.shape]}</small></button>`).join('')}</div><button id="ws-design-clear" ${solved || current === null ? 'disabled' : ''}>↶ Hely kiürítése</button></section></div><p id="ws-status" class="ws-status" role="status" aria-live="polite">${status}</p><div class="ws-actions">${solved ? '<button id="ws-design-again" class="ws-primary">Új terv →</button>' : `<button id="ws-design-check" class="ws-primary">${build ? 'Szőjük! →' : 'Kész! ✓'}</button>`}</div>`;
    bind('#ws-design-leave', leaveDesign);
    bind('#ws-back', () => { if (active) { design = null; menu(); say('workshop_menu'); } });
    bind('#ws-design-again', startDesign);
    bind('#ws-design-check', checkDesign);
    bind('#ws-design-clear', () => {
      if (!active || !design || solved) return;
      if (build) design.slots[designSlot] = null; else design.answers[designSlot] = null;
      effect('undo'); status = ''; tried = false; renderDesign(`ws-design-${build ? 'slot' : 'gap'}-${designSlot}`);
    });
    root.querySelectorAll('[data-design-slot], [data-design-gap]').forEach(button => button.addEventListener('click', () => {
      if (!active || !design) return; designSlot = Number(button.dataset.designSlot ?? button.dataset.designGap); renderDesign(button.id);
    }));
    root.querySelectorAll('[data-design-choice]').forEach(button => button.addEventListener('click', () => {
      if (!active || !design || workshopDesignSolved(design)) return;
      const value = Number(button.dataset.designChoice), list = design.phase === 'build' ? design.slots : design.answers;
      list[designSlot] = value; effect('snap'); status = ''; tried = false;
      const next = list.findIndex((item, i) => item === null && i > designSlot), any = list.indexOf(null);
      designSlot = next >= 0 ? next : any >= 0 ? any : designSlot;
      renderDesign(button.id);
    }));
    if (previousFocus) $(`#${previousFocus}`)?.focus({ preventScroll: true });
  }
  function checkDesign() {
    if (!active || !design) return;
    stopPlayback();
    if (design.phase === 'build') {
      const ready = workshopDesignReady(design);
      if (!ready.ok) { effect('retry'); status = ready.reason === 'short' ? 'Legalább két formát tegyél az egységbe!' : 'Válassz legalább két különböző formát, hogy legyen mit ismételni!'; renderDesign('ws-design-check'); return; }
      design = weaveWorkshopDesign(design); designSlot = 0; tried = false; effect('wood');
      status = ''; renderDesign('ws-design-gap-0'); say('workshop_pattern_1');
      return;
    }
    if (workshopDesignSolved(design)) { effect('success'); status = '✓ Megjavítottad a saját mintádat!'; tried = false; renderDesign(); $('#ws-design-again')?.focus({ preventScroll: true }); return; }
    effect('retry'); tried = true;
    status = design.answers.includes(null) ? 'Még van üres hely. Nézd meg az első egységet!' : 'Az egyik forma máshogy folytatja a mintát. Nézd meg az első egységet!';
    renderDesign('ws-design-check'); say('workshop_pattern_retry');
  }
  function render(focus) {
    if (design && kind === 'pattern') { renderDesign(focus); return; }
    const previousFocus = focus || (root.contains(document.activeElement) ? document.activeElement.id : null);
    root.dataset.game = kind; root.dataset.done = finished(); root.dataset.successPending = successPending; root.dataset.level = level;
    const instructions = kind === 'sort' ? (session.taskVersion>=3 ? `${task.round?'Most új szabály szerint rendezd át ugyanazokat a tárgyakat! ':''}${sortRuleDescription(task)}` : task.round===1&&level<3 ? (level===1?'Most csak a forma számít! Ugyanazokat a tárgyakat rendezd át.':'Most a forma és a méret együtt számít. A színt most nem kell figyelned.') : level === 1 ? 'Válassz egy tárgyat, majd a hozzá illő színes tálcát!' : level === 2 ? 'A szín és a forma együtt mutatja a helyet.' : `A ${task.wantedSize ? 'nagy' : 'kis'} tárgyakat szín és forma szerint válogasd. A többi a levélre kerül.`) : kind === 'pattern' ? (level === 3 && session.taskVersion<3 ? 'Két szín váltakozik. A forma hármasával ismétlődik.' : 'Figyeld a mintát! Töltsd ki az üres helyeket!') : (task.mode === 'missing' ? 'Egy rúd hiányzik. Melyik illik mellé?' : task.mode === 'fewest' ? 'Rakd ki minél kevesebb rúddal!' : level === 1 ? 'A rudakkal rakj ugyanannyit a jobb oldalra!' : `${task.countRequired} különböző hosszúságú rúddal legyen ugyanannyi mindkét oldalon!`);
    const stars = kind === 'balance' && session.done ? workshopBalanceStars(task, session.moves.rods) : null;
    setGameTitle(root, WORKSHOP_NAMES[kind]);
    root.innerHTML = `<div class="ws-toolbar"><button id="ws-back" hidden>↶ Liget</button><div class="ws-level-strip" role="group" aria-label="${WORKSHOP_NAMES[kind]} nehézsége">${WORKSHOP_LEVEL_NAMES.map((name, i) => `<button id="ws-game-level-${i + 1}" data-ws-level="${i + 1}" aria-pressed="${level === i + 1}" aria-label="${name}" ${successPending ? 'disabled' : ''}><span aria-hidden="true">${'◆'.repeat(i + 1)}</span><span class="ws-level-name">${name}</span></button>`).join('')}</div>${finished() ? `<div class="ws-celebration" role="img" aria-label="Elkészült a feladat${stars ? `, ${stars} csillag a 3-ból` : ''}"><span aria-hidden="true">✿</span><strong>Szép munka!</strong>${stars ? `<span class="ws-stars" aria-hidden="true">${'★'.repeat(stars)}${'☆'.repeat(3 - stars)}</span>` : ''}<span aria-hidden="true">✿</span></div>` : ''}<button id="ws-repeat" aria-label="Feladat meghallgatása">🔊 Újra</button></div><div class="ws-heading"><p>${finished() ? 'Elkészült! A kis műhelyben új feladat vár.' : instructions}</p></div><div id="ws-work"></div><p id="ws-status" class="ws-status" role="status" aria-live="polite">${status}</p><div class="ws-actions"><button id="ws-undo" ${session.done || !session.history.length ? 'disabled' : ''}>↶ Visszavonás</button><button id="ws-hint" ${session.done ? 'disabled' : ''}>☀ Segítség${session.help ? ` ${session.help}/3` : ''}</button>${finished() ? `${kind==='balance'&&remainingWorkshopSolutions(task,session).length?`<button id="ws-another-solution">${stars && stars < 3 ? 'Kevesebb rúddal?' : 'Másképp is kirakom'}</button>`:''}<button id="ws-next" class="ws-primary">Új feladat →</button>` : `<button id="ws-check" class="ws-primary" ${session.done ? 'disabled' : ''}>Kész! ✓</button>`}</div>${finished()?relatedTaskMarkup('workshop',kind):''}`;
    bind('#ws-back', () => { if (active) { menu(); say('workshop_menu'); } }); bind('#ws-repeat', repeat);
    root.querySelectorAll('[data-ws-level]').forEach(button => button.addEventListener('click', () => changeLevel(Number(button.dataset.wsLevel))));
    bind('#ws-undo', () => { if (!allowed()) return; stopPlayback(); effect('undo'); undoWorkshop(session); selected = null; status = 'Visszavontad az utolsó lépést. Folytathatod.'; arrived = null; tried = false; save(); render('ws-undo'); });
    bind('#ws-hint', hint); bind('#ws-check', check); bind('#ws-next', () => { if (active) startGame(kind, true); });
    bind('#ws-another-solution',()=>{
      if(!active||document.hidden||successPending||kind!=='balance')return;
      const result=beginWorkshopAlternative(getProgress(),level);if(!result.changed)return;
      cancelSuccess();stopPlayback();session=result.progress.sessions.balance[level-1];updateProgress(result.progress,false);selected=null;tried=false;status=task.mode==='fewest'?`Most próbáld ${task.minRods} rúddal!`:'Ugyanannyit rakj ki más rudakkal!';render();say('workshop_balance_another');
    });
    if (kind === 'sort') renderSort(); else if (kind === 'pattern') renderPattern(); else renderBalance();
    if (successPending) root.querySelectorAll('#ws-repeat, #ws-pattern-listen').forEach(button => { button.disabled = true; });
    if (previousFocus) $(`#${previousFocus}`)?.focus({ preventScroll: true });
  }
  function correction() { return session.help ? (session.done ? {action:'ready'} : workshopHint(task, session)) : null; }
  function sortRuleDescription(t) {
    const names={color:'szín',shape:'forma',size:'méret'}, keys=t.ruleKeys.map(key=>names[key]).join(' és ');
    if(!t.filter)return `A ${keys} mutatja a tárgy helyét.`;
    const wanted=t.filter.key==='size'?(t.filter.value?'nagy':'kis'):`${WORKSHOP_SHAPES[t.filter.value]} alakú`;
    return `Csak a ${wanted} tárgyakat válogasd ${keys} szerint a tálcákra. A többi a levélre kerül.`;
  }
  function binLabel(bin) {
    if (bin.other) return task.filter ? `Más ${task.filter.key==='size'?'méretű':'formájú'} tárgyak` : `Más méretű tárgyak: ${task.wantedSize ? 'kis' : 'nagy'} tárgyak`;
    return [bin.size===undefined?'':bin.size?'nagy':'kis',bin.color?WORKSHOP_COLORS[bin.color].name:'',bin.shape?WORKSHOP_SHAPES[bin.shape]:'tárgyak'].filter(Boolean).join(' ');
  }
  function sortToken(index, tip) {
    const object = task.objects[index], wrong = tried && session.moves.placements[index] !== workshopSortTarget(task, object);
    return `<button id="ws-token-${index}" data-token="${index}" class="ws-token ${selected === index ? 'ws-selected' : ''} ${session.help >= 2 && tip?.index === index ? 'ws-hint-focus' : ''} ${arrived === index ? 'ws-arrived' : ''} ${bounced === index ? 'ws-bounced' : ''} ${wrong ? 'ws-review' : ''}" aria-label="${index + 1}. tárgy: ${workshopObjectName(object)}${session.moves.placements[index] >= 0 ? `, helye: ${binLabel(task.bins[session.moves.placements[index]])}` : ', az asztalon'}" aria-pressed="${selected === index}" ${session.done ? 'disabled' : ''}>${objectArt(object, level === 3 || task.ruleKeys?.includes('size') || task.round===1&&level===2)}${level === 3 || task.ruleKeys?.includes('size') || task.round===1&&level===2 ? `<small aria-hidden="true">${object.size ? 'nagy' : 'kis'}</small>` : ''}</button>`;
  }
  function binArt(bin) {
    if(bin.other)return '<span class="ws-leaf" aria-hidden="true">❧</span>';
    if(!bin.color&&!bin.shape)return `<span class="ws-size-swatch ${bin.size?'ws-large':'ws-small'}" aria-hidden="true">${bin.size?'●':'·'}</span>`;
    if(bin.color&&!bin.shape&&bin.size!==undefined)return `<span class="ws-color-size" style="--object-color:${WORKSHOP_COLORS[bin.color].hex}" aria-hidden="true"><span>${WORKSHOP_COLORS[bin.color].mark}</span><small>${bin.size?'nagy':'kis'}</small></span>`;
    if(!bin.shape)return `<span class="ws-color-swatch" style="--object-color:${WORKSHOP_COLORS[bin.color].hex}" aria-hidden="true">${WORKSHOP_COLORS[bin.color].mark}</span>`;
    if(!bin.color)return `<span class="ws-object ${bin.size===undefined?'':bin.size?'ws-large':'ws-small'}" style="--object-color:#75857c" aria-hidden="true"><span class="ws-shape ws-${bin.shape}"></span></span>`;
    return objectArt({color:bin.color,shape:bin.shape});
  }
  function renderSort() {
    const tip = correction(), remaining = session.moves.placements.filter(n => n < 0).length;
    $('#ws-work').innerHTML = `${session.taskVersion>=2?`<p class="ws-rule-card"><strong>${(session.round||0)+1}. kör a kettőből</strong> · ${task.round===1?'Új szabály, ugyanazok a tárgyak!':'Először ezt a szabályt követjük.'}</p>`:''}<div class="ws-sort-layout"><section class="ws-table"><div class="ws-section-title"><h3>Asztal</h3><span>${remaining} tárgy</span></div><div class="ws-token-pool">${task.objects.map((_, i) => session.moves.placements[i] < 0 ? sortToken(i, tip) : '').join('') || '<span class="ws-empty">✿ Minden tárgy tálcán van.</span>'}</div><p class="ws-selection">${selected === null ? 'Koppints egy tárgyra!' : `${workshopObjectName(task.objects[selected])} · Válassz tálcát!`}</p><button id="ws-return" ${selected === null || session.done || session.moves.placements[selected] < 0 ? 'disabled' : ''}>↶ Vissza az asztalra</button></section><div class="ws-bins">${selected!==null?`<div class="ws-selected-preview">${objectArt(task.objects[selected],level===3||task.ruleKeys?.includes('size')||task.round===1&&level===2)}<span>${workshopObjectName(task.objects[selected])}<small>Válassz neki tálcát!</small></span></div>`:''}${task.bins.map((bin, index) => `<section class="ws-bin ${bin.other ? 'ws-leaf-bin' : ''} ${session.help >= 3 && tip?.target === index ? 'ws-hint-focus' : ''}"><button id="ws-bin-${index}" class="ws-bin-target" data-bin="${index}" aria-label="Tedd a kijelölt tárgyat ide: ${binLabel(bin)}" ${selected === null || session.done ? 'disabled' : ''}>${binArt(bin)}<span>${binLabel(bin)}</span></button><div class="ws-bin-tokens">${task.objects.map((_, i) => session.moves.placements[i] === index ? sortToken(i, tip) : '').join('')}${session.help >= 3 && tip?.target === index ? `<span class="ws-ghost" aria-label="Ide illő tárgy mintája">${objectArt(task.objects[tip.index], level === 3 || task.ruleKeys?.includes('size') || task.round===1&&level===2)}</span>` : ''}</div></section>`).join('')}</div></div>${session.help ? `<p class="ws-hint-note">${session.help === 1 ? (session.taskVersion>=3?sortRuleDescription(task):task.round===1&&level<3?'A tálca formája'+(level===2?' és mérete':'')+' mutatja a tárgy helyét.':'A tárgy és a tálca színjele megegyezik.' + (level > 1 ? ' A formát is figyeld!' : '')) : session.help === 2 ? 'A napocskával jelölt tárgynak keress helyet!' : 'A jelölt tárgy a napocskával jelölt tálcára illik.'}</p>` : ''}`;
    root.querySelectorAll('[data-token]').forEach(button => button.addEventListener('click', () => {
      if (!allowed()) return; stopPlayback(); selected = selected === Number(button.dataset.token) ? null : Number(button.dataset.token); arrived = null; bounced = null; effect('grab'); render(button.id);
    }));
    root.querySelectorAll('[data-bin]').forEach(button => button.addEventListener('click', () => moveObject(Number(button.dataset.bin))));
    bind('#ws-return', () => moveObject(-1));
  }
  function moveObject(destination) {
    if (!allowed() || selected === null || session.moves.placements[selected] === destination) return;
    // Felfedező: a wrong tray sends the object straight back, so the youngest players learn the rule on the spot.
    if (level === 1 && destination >= 0 && destination !== workshopSortTarget(task, task.objects[selected])) {
      stopPlayback(); effect('retry');
      const index = selected, rule = task.ruleKeys?.[0] ?? (task.bins[0]?.shape ? 'shape' : 'color');
      session.misses = Math.min(9999, session.misses + 1); selected = null; arrived = null; bounced = index; tried = false;
      status = { color: 'Ez a tárgy másik tálcára illik. A színjel segít!', shape: 'Ez a tárgy másik tálcára illik. Figyeld a formáját!', size: 'Ez a tárgy másik tálcára illik. Figyeld a méretét!' }[rule];
      save(); render(`ws-token-${index}`);
      say(rule === 'color' ? 'workshop_sort_hint1' : `workshop_sort_rule_${rule}`);
      return;
    }
    bounced = null;
    stopPlayback(); effect(destination < 0 ? 'undo' : 'wood'); rememberWorkshop(session); const index = selected; session.moves.placements[index] = destination; selected = null; arrived = index; status = ''; tried = false; save(); render(`ws-token-${index}`);
  }
  function renderPattern() {
    const tip = correction();
    $('#ws-work').innerHTML = `<section class="ws-pattern-panel"><div class="ws-pattern-top"><button id="ws-pattern-listen">🔊 Hallgasd a mintát</button><button id="ws-design-start">✎ Tervezd meg!</button></div><div class="ws-pattern-thread" aria-label="Az ismétlődő minta">${task.sequence.map((value, index) => {
      const hole = task.holes.indexOf(index), answer = hole < 0 ? value : session.moves.answers[hole];
      return hole < 0 ? `<span data-pattern-index="${index}" role="img" aria-label="${index+1}. hely: ${workshopObjectName(task.palette[value])}" class="ws-pattern-fixed ${session.help && index < task.motif.length ? 'ws-motif-glow' : ''}">${objectArt(task.palette[value])}<small>${index + 1}.</small></span>` : `<button id="ws-slot-${hole}" data-pattern-index="${index}" class="ws-pattern-slot ${slot === hole ? 'ws-selected' : ''} ${session.help >= 2 && tip?.index === hole ? 'ws-hint-focus' : ''} ${tried && answer !== value ? 'ws-review' : ''}" data-slot="${hole}" aria-label="${index + 1}. hely: ${answer === null ? 'üres' : workshopObjectName(task.palette[answer])}" aria-pressed="${slot === hole}" ${session.done ? 'disabled' : ''}>${answer === null ? (session.help >= 3 && tip?.index === hole ? `<span class="ws-ghost">${objectArt(task.palette[tip.target])}</span>` : '<span class="ws-slot-empty" aria-hidden="true">＋</span>') : objectArt(task.palette[answer])}<small>${index + 1}.</small></button>`;
    }).join('')}</div><p class="ws-slot-label">${finished() ? 'A minta végig összeillik.' : `${task.holes[slot] + 1}. hely kijelölve · Válassz rá formát!`}</p></section><section class="ws-pattern-toolbox"><h3>Formakészlet</h3><div class="ws-pattern-choices">${task.palette.map((object, index) => `<button id="ws-choice-${index}" data-choice="${index}" class="ws-choice ${session.help >= 3 && tip?.target === index ? 'ws-hint-focus' : ''}" aria-label="Tedd a kijelölt helyre: ${workshopObjectName(object)}" ${session.done ? 'disabled' : ''}>${objectArt(object)}<small>${WORKSHOP_COLORS[object.color].name}<br>${WORKSHOP_SHAPES[object.shape]}</small></button>`).join('')}</div><button id="ws-clear-slot" ${session.done || session.moves.answers[slot] === null ? 'disabled' : ''}>↶ Hely kiürítése</button></section>${session.help >= 2 ? `<div class="ws-pattern-key"><span>Ismétlődő egység</span><div>${task.motif.map(index => `<span role="img" aria-label="${workshopObjectName(task.palette[index])}">${objectArt(task.palette[index])}</span>`).join('')}</div></div>` : session.help === 1 ? '<p class="ws-hint-note">A kiemelt elemek mutatják az ismétlődő egységet.</p>' : ''}`;
    bind('#ws-design-start', startDesign);
    bind('#ws-pattern-listen',()=>{
      if(!active||document.hidden||successPending)return;
      const ids=task.sequence.map((value,index)=>{
        const hole=task.holes.indexOf(index),answer=hole<0?value:session.moves.answers[hole],object=answer===null?null:task.palette[answer];
        return {id:object?`workshop_object_${object.color}_${object.shape}`:'workshop_pattern_gap',cue:{target:`[data-pattern-index="${index}"]`}};
      });say(ids);
    });
    root.querySelectorAll('[data-slot]').forEach(button => button.addEventListener('click', () => { if (!allowed()) return; stopPlayback(); slot = Number(button.dataset.slot); render(button.id); }));
    root.querySelectorAll('[data-choice]').forEach(button => button.addEventListener('click', () => {
      if (!allowed() || session.moves.answers[slot] === Number(button.dataset.choice)) return;
      stopPlayback(); effect('snap'); rememberWorkshop(session); session.moves.answers[slot] = Number(button.dataset.choice); const next = session.moves.answers.findIndex((answer, i) => answer === null && i > slot); const any = session.moves.answers.indexOf(null); slot = next >= 0 ? next : any >= 0 ? any : slot; status = ''; tried = false; save(); render(button.id);
    }));
    bind('#ws-clear-slot', () => { if (!allowed() || session.moves.answers[slot] === null) return; stopPlayback(); effect('undo'); rememberWorkshop(session); session.moves.answers[slot] = null; status = ''; tried = false; save(); render(`ws-slot-${slot}`); });
  }
  function scaleArt(sum) {
    const tilt = Math.max(-14, Math.min(14, (sum - task.target) * 3));
    return `<svg class="ws-scale" viewBox="0 0 340 150" aria-hidden="true"><path d="M142 138 L170 48 L198 138 Z" fill="#a5beb1" stroke="#567865" stroke-width="3"/><rect x="128" y="134" width="84" height="10" rx="5" fill="#567865"/><g class="ws-scale-beam" style="transform:rotate(${tilt}deg)"><path d="M43 47 L297 47" stroke="#88623c" stroke-width="9" stroke-linecap="round"/><path d="M57 47 L34 105 M57 47 L80 105 M283 47 L260 105 M283 47 L306 105" stroke="#9d815f" stroke-width="3"/><path d="M27 103 Q57 139 87 103 Z" fill="#edba8a" stroke="#9d6a3e" stroke-width="3"/><path d="M253 103 Q283 139 313 103 Z" fill="#83b5b2" stroke="#417e80" stroke-width="3"/><circle cx="57" cy="88" r="16" fill="#fff9ed"/><circle cx="283" cy="88" r="16" fill="#fff9ed"/><text x="57" y="94" text-anchor="middle">${task.target}</text><text x="283" y="94" text-anchor="middle">${sum}</text></g><circle cx="170" cy="47" r="9" fill="#fff9ed" stroke="#88623c" stroke-width="3"/></svg>`;
  }
  function renderBalance() {
    const fixed = task.fixed || [], sum = workshopFixedSum(task) + session.moves.rods.reduce((total, value) => total + value, 0), tip = correction();
    const rodCount = session.moves.rods.length, distinctMet = rodCount > 0 && new Set(session.moves.rods).size === rodCount, showStock = level === 3 || task.mode === 'fewest';
    const balanceText = sum < task.target ? 'A jobb oldal még könnyebb.' : sum > task.target ? 'A jobb oldal most nehezebb.' : 'A két oldalon ugyanannyi van.';
    $('#ws-work').innerHTML = `<div class="ws-balance-layout"><section class="ws-balance-scene"><div class="ws-balance-heading"><span>Mintaoldal <b>${task.target}</b></span><span>Te oldalad <output>${sum}</output></span></div>${scaleArt(sum)}<p class="ws-balance-description">${balanceText}</p><ul class="ws-balance-checks" aria-label="Mire figyelj?" aria-live="polite"><li data-criterion="sum" data-met="${sum===task.target}">${sum===task.target?'✓':'○'} Mennyiség: ${sum} / ${task.target}</li>${task.countRequired?`<li data-criterion="count" data-met="${rodCount===task.countRequired}">${rodCount===task.countRequired?'✓':'○'} ${task.mode==='missing'?'Új rúd':'Rudak száma'}: ${rodCount} / ${task.countRequired}</li>`:''}${task.distinct?`<li data-criterion="distinct" data-met="${distinctMet}">${distinctMet?'✓':'○'} Különböző hosszúságok</li>`:''}${task.mode==='fewest'?`<li data-criterion="fewest" data-met="${sum===task.target&&rodCount<=task.minRods}">${sum===task.target&&rodCount<=task.minRods?'★':'☆'} Legkevesebb: ${task.minRods} rúd · most ${rodCount}</li>`:''}</ul><div class="ws-balance-reference" aria-label="A mintaoldalon ${task.target} egység">${Array.from({ length: task.target }, (_, index) => `<i class="${index % 5 === 0 ? 'ws-unit-start' : ''}" aria-hidden="true"></i>`).join('')}</div>${task.mode === 'missing' ? `<p class="ws-count-rule"><span aria-hidden="true">${fixed[0]} + ? = ${task.target}</span><span>Egy rúd hiányzik</span></p>` : task.countRequired ? `<p class="ws-count-rule"><span aria-hidden="true">${Array.from({ length: task.countRequired }, () => '▰').join(' + ')} = ${task.target}</span><span>${task.countRequired} különböző rúd · most ${session.moves.rods.length} rúd</span></p>` : ''}<div class="ws-unit-comparison" aria-label="Egységek összehasonlítása"><div aria-label="Minta: ${task.target} egység">${Array.from({length:task.target},()=>'<i></i>').join('')}</div><div aria-label="A te rudjaid: ${sum} egység">${[...fixed.map(n=>[n,'#8a8f86']),...session.moves.rods.map((n,i)=>[n,i%2?'#b9841d':'#4e829c'])].map(([n,tone])=>`<span class="ws-unit-rod" style="--rod-tone:${tone}">${Array.from({length:n},()=>'<i></i>').join('')}</span>`).join('')}</div></div><div class="ws-balance-tray" aria-label="Rudak a jobb oldalon">${fixed.map(value => `<span class="ws-fixed-rod" role="img" aria-label="Ez a rúd a helyén marad: ${value} egység">${rodArt(value)}<b>${value}</b><span aria-hidden="true">📌</span></span>`).join('')}${session.moves.rods.map((value, index) => `<button id="ws-take-${index}" data-take="${index}" class="ws-placed-rod ${session.help >= 3 && tip?.action === 'remove' && tip.index === index ? 'ws-hint-focus' : ''}" aria-label="${index + 1}. rúd: ${value} egység. Vedd vissza az asztalra!" ${session.done ? 'disabled' : ''}>${rodArt(value)}<b>${value}</b><span aria-hidden="true">×</span></button>`).join('') || (fixed.length ? '' : '<span class="ws-empty">Ide kerülnek a választott rudak.</span>')}</div>${session.done ? '' : '<p class="ws-footnote">A rúdra koppintva visszaveheted.</p>'}${session.found?.length?`<div class="ws-found-solutions"><strong>Ezt már kiraktad:</strong>${session.found.map(rods=>`<span>${rods.join(' + ')} = ${task.target}</span>`).join('')}</div>`:''}</section><section class="ws-rods-toolbox"><h3>Rúdkészlet</h3><div class="ws-rods">${task.choices.map(value => {
      const remaining = task.stock - session.moves.rods.filter(n => n === value).length;
      return `<button id="ws-add-${value}" data-add="${value}" class="ws-rod-choice ${session.help >= 3 && tip?.action === 'add' && tip.value === value ? 'ws-hint-focus' : ''}" aria-label="Tegyél egy ${value} egységnyi rudat a jobb oldalra${showStock ? `, ${remaining} maradt` : ''}" ${session.done || remaining === 0 || session.moves.rods.length >= task.maxPieces ? 'disabled' : ''}>${rodArt(value)}<span><b>${value}</b>${showStock ? `<small>${remaining} db</small>` : ''}</span></button>`;
    }).join('')}</div>${session.help >= 2 ? `<p class="ws-hint-note">${sum < task.target ? `Még ${task.target - sum} egység hiányzik.` : sum > task.target ? `${sum - task.target} egységgel több van a jobb oldalon.` : task.countRequired && (session.moves.rods.length !== task.countRequired || new Set(session.moves.rods).size !== session.moves.rods.length) ? 'A mennyiség egyezik. A rudak száma és különböző hossza is számít.' : 'A két oldal egyensúlyban van.'}${session.help >= 3 && tip?.action !== 'ready' ? `<br>${tip?.action === 'remove' ? `A jelölt ${tip.value} egységnyi rudat vedd vissza!` : `Tegyél be egy ${tip.value} egységnyi rudat!`}` : ''}</p>` : session.help === 1 ? '<p class="ws-hint-note">Egy pötty egy egység. Hasonlítsd össze a két oldalt!</p>' : ''}</section></div>`;
    root.querySelectorAll('[data-add]').forEach(button => button.addEventListener('click', () => {
      const value = Number(button.dataset.add); if (!allowed() || session.moves.rods.length >= task.maxPieces || session.moves.rods.filter(n => n === value).length >= task.stock) return;
      effect('wood'); rememberWorkshop(session); session.moves.rods.push(value); status = ''; tried = false; save(); render(button.id);
    }));
    root.querySelectorAll('[data-take]').forEach(button => button.addEventListener('click', () => {
      if (!allowed()) return; const index = Number(button.dataset.take), value = session.moves.rods[index]; effect('undo'); rememberWorkshop(session); session.moves.rods.splice(index, 1); status = ''; tried = false; save(); render(`ws-add-${value}`);
    }));
  }
  function hint() {
    if (!allowed()) return;
    stopPlayback();
    session.help = Math.min(3, session.help + 1);
    const tip = workshopHint(task, session);
    if (tip.action === 'ready') { status = 'Minden a helyén van. Koppints a Kész gombra!'; say('workshop_ready'); }
    else {
      status = session.help === 1 ? 'Figyeld a mintát és a jeleket. A tárgyakat átrendezheted.' : session.help === 2 ? 'Egy kis részletet kiemeltünk. Haladj egy lépéssel tovább!' : 'A napocskás jelölés egy következő lépést mutat.';
      if (session.help >= 2 && kind === 'pattern') slot = tip.index;
      const ids = [kind==='sort'&&session.taskVersion>=3?(session.help===1?'workshop_sort_rule_hint':session.help===2?'workshop_sort_again_hint2':'workshop_sort_hint3'):kind==='sort'&&task.round===1&&session.help<3?(session.help===1?`workshop_sort_again_${level}`:'workshop_sort_again_hint2'):`workshop_${kind}_hint${session.help}`];
      if (kind === 'balance' && session.help >= 3) ids.push(tip.action === 'remove' ? 'workshop_take_rod' : 'workshop_add_rod', { id: `workshop_n_${tip.value}`, cue: { target: '.ws-hint-focus' } });
      say(ids);
    }
    arrived = null; save(); render('ws-hint');
  }
  function check() {
    if (!allowed()) return;
    stopPlayback();
    const progress = normalizeWorkshop(getProgress()); progress.sessions[kind][level - 1] = structuredClone(session);
    const result = completeWorkshop(progress, kind, level);
    if (result.changed) {
      session = result.progress.sessions[kind][level - 1]; task = workshopTaskForSession(session); selected = null; arrived = null; tried = false;
      if (!session.done) {
        status = 'Az első válogatás kész. Most új szabály szerint rendezd ugyanazokat a tárgyakat!';
        updateProgress(result.progress, result.reward); render(); focusGameTitle(root); repeat(); return;
      }
      status = ''; successPending = true;
      const completedSession = session, completedKind = kind;
      stopPlayback(); updateProgress(result.progress, result.reward); render();
      successDelay.schedule(() => {
        if (!active || session !== completedSession || kind !== completedKind) return;
        successPending = false; const stars = kind === 'balance' ? workshopBalanceStars(task, session.moves.rods) : null;
        status = stars && stars < 3 ? `✓ Egyensúly! ${task.minRods} rúddal is kirakható.` : '✓ Elkészült a feladat!'; render();
        if (!document.querySelector('dialog[open]')) { $('#ws-next')?.focus({ preventScroll: true }); say(`workshop_${kind}_done`); }
      });
      return;
    }
    effect('retry');
    if(result.duplicate){status='Ezt már kiraktad. Most próbálj más összeállítást!';render('ws-check');say('workshop_balance_duplicate');return;}
    session.misses = Math.min(9999, session.misses + 1); tried = true;
    if (kind === 'sort') status = session.moves.placements.some(n => n < 0) ? 'Még van tárgy az asztalon. Mindegyiknek keress helyet!' : 'Néhány tárgy másik helyre illik. A pontozott szél segít megkeresni.';
    else if (kind === 'pattern') status = session.moves.answers.includes(null) ? 'Még van üres hely. A mintából válassz rá formát!' : 'Néhány elem még máshogy folytatja a mintát. Átcserélheted őket.';
    else status = task.mode === 'missing' ? (session.moves.rods.length ? 'Ez a rúd nem illik. Vedd vissza, és próbálj másikat!' : 'Válassz egy rudat a készletből!') : 'Hasonlítsd össze a két oldalt, és rendezd át a rudakat!' + (task.distinct ? ` ${task.countRequired} különböző hosszúságú rúd kell.` : '');
    say(`workshop_${kind}_retry`); save(); render('ws-check');
  }
  document.addEventListener('visibilitychange', () => { if (document.hidden && active) stopPlayback(); });
  return {
    start({kind:requestedKind}={}) {
      active = true; loadLevels();
      if(WORKSHOP_GAMES.includes(requestedKind)) {
        const saved=normalizeWorkshop(getProgress()).sessions[requestedKind][levels[requestedKind]-1];
        startGame(requestedKind,Boolean(saved?.done));
      } else {menu(); say('workshop_menu');}
    },
    stop() { active = false; cancelSuccess(); selected = null; stopPlayback(); },
    repeat,
  };
}
