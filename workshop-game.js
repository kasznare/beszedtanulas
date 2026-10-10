import { WORKSHOP_GAMES, WORKSHOP_NAMES, WORKSHOP_LEVEL_NAMES, WORKSHOP_COLORS, WORKSHOP_SHAPES, workshopObjectName, generateWorkshopTask, newWorkshopSession, normalizeWorkshop, workshopSortTarget, workshopHint, completeWorkshop, rememberWorkshop, undoWorkshop } from './workshop-data.js';
import { createSuccessDelay } from './success-delay.js';

export function setupWorkshop({ getProgress, updateProgress, getOptions, speak, stopPlayback, setLevel }) {
  const root = document.querySelector('#workshop');
  if (!root) return { start() {}, stop() {}, repeat() {} };
  root.classList.add('workshop-panel');
  let active = false, kind = null, level = 1, session = null, task = null, selected = null, slot = 0, status = '', arrived = null, tried = false;
  let successPending = false;
  const successDelay = createSuccessDelay();
  const finished = () => session?.done && !successPending;
  function cancelSuccess() { successDelay.cancel(); successPending = false; }
  const $ = selector => root.querySelector(selector);
  const bind = (selector, fn) => $(selector)?.addEventListener('click', fn);
  const say = (...ids) => { if (active && !document.hidden) speak(ids.flat()); };
  const allowed = () => active && !document.hidden && session && !session.done;
  const configuredLevel = () => [1, 2, 3].includes(getOptions()?.workshopLevel) ? getOptions().workshopLevel : 1;
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
    cancelSuccess(); stopPlayback(); kind = null; session = null; selected = null; status = ''; arrived = null;
    delete root.dataset.successPending;
    root.dataset.game = 'menu'; root.dataset.done = 'false'; root.dataset.level = level;
    const progress = normalizeWorkshop(getProgress());
    root.innerHTML = `<div class="ws-intro"><span class="ws-eyebrow">FIGYELJ · RENDEZD · PRÓBÁLD KI</span><h2 tabindex="-1">Műhelyliget</h2><p>Formák, minták és egyensúly a liget kis műhelyében.</p></div><div class="ws-levels" role="group" aria-label="Nehézség">${WORKSHOP_LEVEL_NAMES.map((name, i) => `<button id="ws-level-${i + 1}" data-level="${i + 1}" aria-pressed="${level === i + 1}"><span aria-hidden="true">${'◆'.repeat(i + 1)}</span>${name}</button>`).join('')}</div><div class="ws-places">${WORKSHOP_GAMES.map(game => {
      const saved = progress.sessions[game][level - 1], total = progress.games[game][level - 1].independent + progress.games[game][level - 1].assisted;
      return `<button id="ws-place-${game}" class="ws-place ws-place-${game}" data-game="${game}">${icons[game]}<strong>${WORKSHOP_NAMES[game]}</strong><span>${{ sort: 'Minden tárgynak saját helye van.', pattern: 'Fűzd tovább a színes mintát!', balance: 'Hozd egyensúlyba a két oldalt!' }[game]}</span><small>${saved && !saved.done ? '↶ Folytatható' : total ? `✿ ${total} elkészült feladat` : 'Egy új felfedezés vár.'}</small></button>`;
    }).join('')}</div><p class="ws-footer">Koppintással is mozgathatsz. Minden lépés visszavonható.</p>`;
    root.querySelectorAll('[data-game]').forEach(button => button.addEventListener('click', () => { if (active) startGame(button.dataset.game); }));
    root.querySelectorAll('[data-level]').forEach(button => button.addEventListener('click', () => {
      if (!active) return;
      level = Number(button.dataset.level); setLevel?.(level); menu(button.id);
      say(`workshop_level_${level}`);
    }));
    if (focus) $(`#${focus}`)?.focus({ preventScroll: true }); else $('h2')?.focus({ preventScroll: true });
  }
  function startGame(game, fresh = false) {
    cancelSuccess(); stopPlayback(); kind = game;
    const previous = normalizeWorkshop(getProgress()).sessions[kind][level - 1];
    session = !fresh && previous ? previous : newWorkshopSession(kind, level);
    task = generateWorkshopTask(kind, level, session.seed);
    selected = null; slot = Math.max(0, session.moves.answers.indexOf(null)); status = ''; arrived = null; tried = false;
    save(); render(); $('h2')?.focus({ preventScroll: true }); repeat();
  }
  function repeat() {
    if (!active || successPending) return;
    if (!kind) { say('workshop_menu'); return; }
    if (session.done) { say(`workshop_${kind}_done`); return; }
    const ids = [`workshop_${kind}_${level}`];
    if (kind === 'sort' && level === 3) ids.push(task.wantedSize ? 'workshop_only_big' : 'workshop_only_small');
    if (kind === 'balance') ids.push('workshop_target', { id: `workshop_n_${task.target}`, cue: { target: '.ws-balance-reference, .ws-balance-heading span:first-child' } });
    say(ids);
  }
  function render(focus) {
    const previousFocus = focus || (root.contains(document.activeElement) ? document.activeElement.id : null);
    root.dataset.game = kind; root.dataset.done = finished(); root.dataset.successPending = successPending; root.dataset.level = level;
    const instructions = kind === 'sort' ? (level === 1 ? 'Válassz egy tárgyat, majd a hozzá illő színes tálcát!' : level === 2 ? 'A szín és a forma együtt mutatja a helyet.' : `A ${task.wantedSize ? 'nagy' : 'kis'} tárgyakat szín és forma szerint válogasd. A többi a levélre kerül.`) : kind === 'pattern' ? (level === 3 ? 'Két szín váltakozik. A forma hármasával ismétlődik.' : 'Figyeld a mintát! Töltsd ki az üres helyeket!') : (level === 1 ? 'A rudakkal rakj ugyanannyit a jobb oldalra!' : `${task.countRequired} különböző hosszúságú rúddal legyen ugyanannyi mindkét oldalon!`);
    root.innerHTML = `<div class="ws-toolbar"><button id="ws-back">↶ Liget</button><span>${WORKSHOP_LEVEL_NAMES[level - 1]} <span aria-hidden="true">${'◆'.repeat(level)}</span></span><button id="ws-repeat" aria-label="Feladat meghallgatása">🔊 Újra</button></div><div class="ws-heading"><h2 tabindex="-1">${WORKSHOP_NAMES[kind]}</h2><p>${finished() ? 'Elkészült! A kis műhelyben új feladat vár.' : instructions}</p></div>${finished() ? '<div class="ws-celebration" role="img" aria-label="Elkészült a feladat"><span aria-hidden="true">✿</span><strong>Szép munka!</strong><span aria-hidden="true">✿</span></div>' : ''}<div id="ws-work"></div><p id="ws-status" class="ws-status" role="status" aria-live="polite">${status}</p><div class="ws-actions"><button id="ws-undo" ${session.done || !session.history.length ? 'disabled' : ''}>↶ Visszavonás</button><button id="ws-hint" ${session.done ? 'disabled' : ''}>☀ Segítség${session.help ? ` ${session.help}/3` : ''}</button>${finished() ? '<button id="ws-next" class="ws-primary">Új feladat →</button>' : `<button id="ws-check" class="ws-primary" ${session.done ? 'disabled' : ''}>Kész! ✓</button>`}</div>`;
    bind('#ws-back', () => { if (active) { menu(); say('workshop_menu'); } }); bind('#ws-repeat', repeat);
    bind('#ws-undo', () => { if (!allowed()) return; undoWorkshop(session); selected = null; status = 'Visszavontad az utolsó lépést. Folytathatod.'; arrived = null; tried = false; save(); render('ws-undo'); });
    bind('#ws-hint', hint); bind('#ws-check', check); bind('#ws-next', () => { if (active) startGame(kind, true); });
    if (kind === 'sort') renderSort(); else if (kind === 'pattern') renderPattern(); else renderBalance();
    if (successPending) $('#ws-repeat').disabled = true;
    if (previousFocus) $(`#${previousFocus}`)?.focus({ preventScroll: true });
  }
  function correction() { return session.help ? workshopHint(task, session) : null; }
  function binLabel(bin) {
    if (bin.other) return `Más méretű tárgyak: ${task.wantedSize ? 'kis' : 'nagy'} tárgyak`;
    return `${WORKSHOP_COLORS[bin.color].name}${bin.shape ? ` ${WORKSHOP_SHAPES[bin.shape]}` : ' tárgyak'}`;
  }
  function sortToken(index, tip) {
    const object = task.objects[index], wrong = tried && session.moves.placements[index] !== workshopSortTarget(task, object);
    return `<button id="ws-token-${index}" data-token="${index}" class="ws-token ${selected === index ? 'ws-selected' : ''} ${session.help >= 2 && tip?.index === index ? 'ws-hint-focus' : ''} ${arrived === index ? 'ws-arrived' : ''} ${wrong ? 'ws-review' : ''}" aria-label="${index + 1}. tárgy: ${workshopObjectName(object)}${session.moves.placements[index] >= 0 ? `, helye: ${binLabel(task.bins[session.moves.placements[index]])}` : ', az asztalon'}" aria-pressed="${selected === index}" ${session.done ? 'disabled' : ''}>${objectArt(object, level === 3)}${level === 3 ? `<small aria-hidden="true">${object.size ? 'nagy' : 'kis'}</small>` : ''}</button>`;
  }
  function renderSort() {
    const tip = correction(), remaining = session.moves.placements.filter(n => n < 0).length;
    $('#ws-work').innerHTML = `<div class="ws-sort-layout"><section class="ws-table"><div class="ws-section-title"><h3>Asztal</h3><span>${remaining} tárgy</span></div><div class="ws-token-pool">${task.objects.map((_, i) => session.moves.placements[i] < 0 ? sortToken(i, tip) : '').join('') || '<span class="ws-empty">✿ Minden tárgy tálcán van.</span>'}</div><p class="ws-selection">${selected === null ? 'Koppints egy tárgyra!' : `${workshopObjectName(task.objects[selected])} · Válassz tálcát!`}</p><button id="ws-return" ${selected === null || session.done || session.moves.placements[selected] < 0 ? 'disabled' : ''}>↶ Vissza az asztalra</button></section><div class="ws-bins">${task.bins.map((bin, index) => `<section class="ws-bin ${bin.other ? 'ws-leaf-bin' : ''} ${session.help >= 3 && tip?.target === index ? 'ws-hint-focus' : ''}"><button id="ws-bin-${index}" class="ws-bin-target" data-bin="${index}" aria-label="Tedd a kijelölt tárgyat ide: ${binLabel(bin)}" ${selected === null || session.done ? 'disabled' : ''}>${bin.other ? '<span class="ws-leaf" aria-hidden="true">❧</span>' : objectArt({ color: bin.color, shape: bin.shape || 'circle' })}<span>${binLabel(bin)}</span></button><div class="ws-bin-tokens">${task.objects.map((_, i) => session.moves.placements[i] === index ? sortToken(i, tip) : '').join('')}${session.help >= 3 && tip?.target === index ? `<span class="ws-ghost" aria-label="Ide illő tárgy mintája">${objectArt(task.objects[tip.index], level === 3)}</span>` : ''}</div></section>`).join('')}</div></div>${session.help ? `<p class="ws-hint-note">${session.help === 1 ? 'A tárgy és a tálca színjele megegyezik.' + (level > 1 ? ' A formát is figyeld!' : '') : session.help === 2 ? 'A napocskával jelölt tárgynak keress helyet!' : 'A jelölt tárgy a napocskával jelölt tálcára illik.'}</p>` : ''}`;
    root.querySelectorAll('[data-token]').forEach(button => button.addEventListener('click', () => {
      if (!allowed()) return; selected = selected === Number(button.dataset.token) ? null : Number(button.dataset.token); arrived = null; render(button.id);
    }));
    root.querySelectorAll('[data-bin]').forEach(button => button.addEventListener('click', () => moveObject(Number(button.dataset.bin))));
    bind('#ws-return', () => moveObject(-1));
  }
  function moveObject(destination) {
    if (!allowed() || selected === null || session.moves.placements[selected] === destination) return;
    rememberWorkshop(session); const index = selected; session.moves.placements[index] = destination; selected = null; arrived = index; status = ''; tried = false; save(); render(`ws-token-${index}`);
  }
  function renderPattern() {
    const tip = correction();
    $('#ws-work').innerHTML = `<section class="ws-pattern-panel"><div class="ws-pattern-thread" aria-label="Az ismétlődő minta">${task.sequence.map((value, index) => {
      const hole = task.holes.indexOf(index), answer = hole < 0 ? value : session.moves.answers[hole];
      return hole < 0 ? `<span class="ws-pattern-fixed ${session.help && index < task.motif.length ? 'ws-motif-glow' : ''}">${objectArt(task.palette[value])}<small>${index + 1}.</small></span>` : `<button id="ws-slot-${hole}" class="ws-pattern-slot ${slot === hole ? 'ws-selected' : ''} ${session.help >= 2 && tip?.index === hole ? 'ws-hint-focus' : ''} ${tried && answer !== value ? 'ws-review' : ''}" data-slot="${hole}" aria-label="${index + 1}. hely: ${answer === null ? 'üres' : workshopObjectName(task.palette[answer])}" aria-pressed="${slot === hole}" ${session.done ? 'disabled' : ''}>${answer === null ? (session.help >= 3 && tip?.index === hole ? `<span class="ws-ghost">${objectArt(task.palette[tip.target])}</span>` : '<span class="ws-slot-empty" aria-hidden="true">＋</span>') : objectArt(task.palette[answer])}<small>${index + 1}.</small></button>`;
    }).join('')}</div><p class="ws-slot-label">${finished() ? 'A minta végig összeillik.' : `${task.holes[slot] + 1}. hely kijelölve · Válassz rá formát!`}</p></section><section class="ws-pattern-toolbox"><h3>Formakészlet</h3><div class="ws-pattern-choices">${task.palette.map((object, index) => `<button id="ws-choice-${index}" data-choice="${index}" class="ws-choice ${session.help >= 3 && tip?.target === index ? 'ws-hint-focus' : ''}" aria-label="Tedd a kijelölt helyre: ${workshopObjectName(object)}" ${session.done ? 'disabled' : ''}>${objectArt(object)}<small>${WORKSHOP_COLORS[object.color].name}<br>${WORKSHOP_SHAPES[object.shape]}</small></button>`).join('')}</div><button id="ws-clear-slot" ${session.done || session.moves.answers[slot] === null ? 'disabled' : ''}>↶ Hely kiürítése</button></section>${session.help >= 2 ? `<div class="ws-pattern-key"><span>Ismétlődő egység</span><div>${task.motif.map(index => objectArt(task.palette[index])).join('')}</div></div>` : session.help === 1 ? '<p class="ws-hint-note">A kiemelt elemek mutatják az ismétlődő egységet.</p>' : ''}`;
    root.querySelectorAll('[data-slot]').forEach(button => button.addEventListener('click', () => { if (!allowed()) return; slot = Number(button.dataset.slot); render(button.id); }));
    root.querySelectorAll('[data-choice]').forEach(button => button.addEventListener('click', () => {
      if (!allowed() || session.moves.answers[slot] === Number(button.dataset.choice)) return;
      rememberWorkshop(session); session.moves.answers[slot] = Number(button.dataset.choice); const next = session.moves.answers.findIndex((answer, i) => answer === null && i > slot); const any = session.moves.answers.indexOf(null); slot = next >= 0 ? next : any >= 0 ? any : slot; status = ''; tried = false; save(); render(button.id);
    }));
    bind('#ws-clear-slot', () => { if (!allowed() || session.moves.answers[slot] === null) return; rememberWorkshop(session); session.moves.answers[slot] = null; status = ''; tried = false; save(); render(`ws-slot-${slot}`); });
  }
  function scaleArt(sum) {
    const tilt = Math.max(-14, Math.min(14, (sum - task.target) * 3));
    return `<svg class="ws-scale" viewBox="0 0 340 150" aria-hidden="true"><path d="M142 138 L170 48 L198 138 Z" fill="#a5beb1" stroke="#567865" stroke-width="3"/><rect x="128" y="134" width="84" height="10" rx="5" fill="#567865"/><g class="ws-scale-beam" style="transform:rotate(${tilt}deg)"><path d="M43 47 L297 47" stroke="#88623c" stroke-width="9" stroke-linecap="round"/><path d="M57 47 L34 105 M57 47 L80 105 M283 47 L260 105 M283 47 L306 105" stroke="#9d815f" stroke-width="3"/><path d="M27 103 Q57 139 87 103 Z" fill="#edba8a" stroke="#9d6a3e" stroke-width="3"/><path d="M253 103 Q283 139 313 103 Z" fill="#83b5b2" stroke="#417e80" stroke-width="3"/><circle cx="57" cy="88" r="16" fill="#fff9ed"/><circle cx="283" cy="88" r="16" fill="#fff9ed"/><text x="57" y="94" text-anchor="middle">${task.target}</text><text x="283" y="94" text-anchor="middle">${sum}</text></g><circle cx="170" cy="47" r="9" fill="#fff9ed" stroke="#88623c" stroke-width="3"/></svg>`;
  }
  function renderBalance() {
    const sum = session.moves.rods.reduce((total, value) => total + value, 0), tip = correction();
    const balanceText = sum < task.target ? 'A jobb oldal még könnyebb.' : sum > task.target ? 'A jobb oldal most nehezebb.' : 'A két oldalon ugyanannyi van.';
    $('#ws-work').innerHTML = `<div class="ws-balance-layout"><section class="ws-balance-scene"><div class="ws-balance-heading"><span>Mintaoldal <b>${task.target}</b></span><span>Te oldalad <output>${sum}</output></span></div>${scaleArt(sum)}<p class="ws-balance-description">${balanceText}</p><div class="ws-balance-reference" aria-label="A mintaoldalon ${task.target} egység">${Array.from({ length: task.target }, (_, index) => `<i class="${index % 5 === 0 ? 'ws-unit-start' : ''}" aria-hidden="true"></i>`).join('')}</div>${task.countRequired ? `<p class="ws-count-rule"><span aria-hidden="true">${Array.from({ length: task.countRequired }, () => '▰').join(' + ')} = ${task.target}</span><span>${task.countRequired} különböző rúd · most ${session.moves.rods.length} rúd</span></p>` : ''}<div class="ws-balance-tray" aria-label="Rudak a jobb oldalon">${session.moves.rods.map((value, index) => `<button id="ws-take-${index}" data-take="${index}" class="ws-placed-rod ${session.help >= 3 && tip?.action === 'remove' && tip.index === index ? 'ws-hint-focus' : ''}" aria-label="${index + 1}. rúd: ${value} egység. Vedd vissza az asztalra!" ${session.done ? 'disabled' : ''}>${rodArt(value)}<b>${value}</b><span aria-hidden="true">×</span></button>`).join('') || '<span class="ws-empty">Ide kerülnek a választott rudak.</span>'}</div><p class="ws-footnote">A rúdra koppintva visszaveheted.</p></section><section class="ws-rods-toolbox"><h3>Rúdkészlet</h3><div class="ws-rods">${task.choices.map(value => {
      const remaining = task.stock - session.moves.rods.filter(n => n === value).length;
      return `<button id="ws-add-${value}" data-add="${value}" class="ws-rod-choice ${session.help >= 3 && tip?.action === 'add' && tip.value === value ? 'ws-hint-focus' : ''}" aria-label="Tegyél egy ${value} egységnyi rudat a jobb oldalra${level === 3 ? `, ${remaining} maradt` : ''}" ${session.done || remaining === 0 || session.moves.rods.length >= task.maxPieces ? 'disabled' : ''}>${rodArt(value)}<span><b>${value}</b>${level === 3 ? `<small>${remaining} db</small>` : ''}</span></button>`;
    }).join('')}</div>${session.help >= 2 ? `<p class="ws-hint-note">${sum < task.target ? `Még ${task.target - sum} egység hiányzik.` : sum > task.target ? `${sum - task.target} egységgel több van a jobb oldalon.` : task.countRequired && (session.moves.rods.length !== task.countRequired || new Set(session.moves.rods).size !== session.moves.rods.length) ? 'A mennyiség egyezik. A rudak száma és különböző hossza is számít.' : 'A két oldal egyensúlyban van.'}${session.help >= 3 && tip?.action !== 'ready' ? `<br>${tip?.action === 'remove' ? `A jelölt ${tip.value} egységnyi rudat vedd vissza!` : `Tegyél be egy ${tip.value} egységnyi rudat!`}` : ''}</p>` : session.help === 1 ? '<p class="ws-hint-note">Egy pötty egy egység. Hasonlítsd össze a két oldalt!</p>' : ''}</section></div>`;
    root.querySelectorAll('[data-add]').forEach(button => button.addEventListener('click', () => {
      const value = Number(button.dataset.add); if (!allowed() || session.moves.rods.length >= task.maxPieces || session.moves.rods.filter(n => n === value).length >= task.stock) return;
      rememberWorkshop(session); session.moves.rods.push(value); status = ''; tried = false; save(); render(button.id);
    }));
    root.querySelectorAll('[data-take]').forEach(button => button.addEventListener('click', () => {
      if (!allowed()) return; const index = Number(button.dataset.take), value = session.moves.rods[index]; rememberWorkshop(session); session.moves.rods.splice(index, 1); status = ''; tried = false; save(); render(`ws-add-${value}`);
    }));
  }
  function hint() {
    if (!allowed()) return;
    session.help = Math.min(3, session.help + 1);
    const tip = workshopHint(task, session);
    if (tip.action === 'ready') { status = 'Minden a helyén van. Koppints a Kész gombra!'; say('workshop_ready'); }
    else {
      status = session.help === 1 ? 'Figyeld a mintát és a jeleket. A tárgyakat átrendezheted.' : session.help === 2 ? 'Egy kis részletet kiemeltünk. Haladj egy lépéssel tovább!' : 'A napocskás jelölés egy következő lépést mutat.';
      if (session.help >= 2 && kind === 'pattern') slot = tip.index;
      const ids = [`workshop_${kind}_hint${session.help}`];
      if (kind === 'balance' && session.help >= 3) ids.push(tip.action === 'remove' ? 'workshop_take_rod' : 'workshop_add_rod', { id: `workshop_n_${tip.value}`, cue: { target: '.ws-hint-focus' } });
      say(ids);
    }
    arrived = null; save(); render('ws-hint');
  }
  function check() {
    if (!allowed()) return;
    const progress = normalizeWorkshop(getProgress()); progress.sessions[kind][level - 1] = structuredClone(session);
    const result = completeWorkshop(progress, kind, level);
    if (result.reward) {
      session = result.progress.sessions[kind][level - 1]; selected = null; status = ''; arrived = null; successPending = true;
      const completedSession = session, completedKind = kind;
      stopPlayback(); updateProgress(result.progress, true); render();
      successDelay.schedule(() => {
        if (!active || session !== completedSession || kind !== completedKind) return;
        successPending = false; status = '✓ Elkészült a feladat!'; render();
        if (!document.querySelector('dialog[open]')) { $('#ws-next')?.focus({ preventScroll: true }); say(`workshop_${kind}_done`); }
      });
      return;
    }
    session.misses = Math.min(9999, session.misses + 1); tried = true;
    if (kind === 'sort') status = session.moves.placements.some(n => n < 0) ? 'Még van tárgy az asztalon. Mindegyiknek keress helyet!' : 'Néhány tárgy másik helyre illik. A pontozott szél segít megkeresni.';
    else if (kind === 'pattern') status = session.moves.answers.includes(null) ? 'Még van üres hely. A mintából válassz rá formát!' : 'Néhány elem még máshogy folytatja a mintát. Átcserélheted őket.';
    else status = 'Hasonlítsd össze a két oldalt, és rendezd át a rudakat!' + (task.countRequired ? ` ${task.countRequired} különböző hosszúságú rúd kell.` : '');
    say(`workshop_${kind}_retry`); save(); render('ws-check');
  }
  document.addEventListener('visibilitychange', () => { if (document.hidden && active) stopPlayback(); });
  return {
    start() { active = true; level = configuredLevel(); menu(); say('workshop_menu'); },
    stop() { active = false; cancelSuccess(); selected = null; stopPlayback(); },
    repeat,
  };
}
