import { LOGIC_GAMES, LOGIC_NAMES, LEVEL_NAMES, OPS, logicTaskForSession, newSession, normalizeLogic, completeLogic, taskSolved, applyRule, neighbours, routeSolution, remember, undoMove, logicSessionForLevel, storeLogicSession } from './logic-data.js';
import { createSuccessDelay } from './success-delay.js';
import { relatedTaskMarkup } from './next-task.js';
import { setGameTitle, focusGameTitle } from './game-heading.js';

export function setupLogic({ effect = () => {}, getProgress, updateProgress, getOptions, speak, stopPlayback, setLevel, setRouteView }) {
  const root = document.querySelector('#furfangliget');
  let active = false, kind = null, session = null, task = null, slot = 0, trial = false, busy = false;
  let animation = 0, status = '', ghost = [], fox = null, walked = 0, machineRun = null, delivering = false, counters = true;
  let dragging = false, dragged = false, dragStart = null;
  let localRouteView, routeSpeed = 600, routePaused = false, routeTimer = null, replanAt = null;
  let predictionChecked = false, predictionHelp = [0, 0], experimentInput = 2, experimentShown = false;
  let successPending = false;
  const successDelay = createSuccessDelay();
  const finished = () => session?.done && !successPending;
  function cancelSuccess() { successDelay.cancel(); successPending = false; }
  const timers = new Set(), localLevels = {};
  const foxArt = '<img class="logic-fox" src="./assets/furfang-fox.png" alt="" draggable="false">';
  const $ = selector => root.querySelector(selector);
  const say = (...ids) => { if (active && !document.hidden) speak(ids.flat()); };
  const bind = (selector, fn) => $(selector)?.addEventListener('click', fn);
  const allowed = () => active && !document.hidden && !busy && session && !session.done;
  const reducedMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
  const deferredRoute = () => (typeof setRouteView === 'function' ? getOptions().routeView : localRouteView ?? getOptions().routeView) === 'steps';
  const routePosition = () => fox ?? (session.done ? task.end : deferredRoute() ? task.start : session.path.at(-1));
  const levelFor = game => (typeof setLevel === 'function' ? getOptions()[`${game}Level`] : localLevels[game] || getOptions()[`${game}Level`]) || 1;
  function save(reward = false) {
    const p = normalizeLogic(getProgress());
    storeLogicSession(p, session);
    updateProgress(p, reward);
  }
  function cancelAnimation() {
    animation++;
    timers.forEach(timer => window.clearTimeout(timer));
    timers.clear();
    routePaused = false; routeTimer = null; replanAt = null; busy = false; delivering = false; machineRun = null; dragging = false; dragged = false; dragStart = null; fox = null; walked = 0;
  }
  function later(token, fn, delay) {
    const timer = window.setTimeout(() => {
      timers.delete(timer);
      if (active && token === animation && !document.hidden) fn();
    }, reducedMotion() ? 0 : delay);
    timers.add(timer);
  }
  function stop() { active = false; cancelSuccess(); cancelAnimation(); stopPlayback(); }
  function menu() {
    cancelSuccess(); cancelAnimation(); stopPlayback(); kind = null; root.dataset.game = 'menu'; delete root.dataset.done; delete root.dataset.successPending;
    const p = normalizeLogic(getProgress());
    setGameTitle(root, 'Furfangliget');
    root.innerHTML = `<p class="logic-intro">Ma melyik fejtörőt választod?</p><div class="logic-places">${LOGIC_GAMES.map((game, i) => {
      const level = levelFor(game), saved = logicSessionForLevel(p, game, level), resume = saved && !saved.done && saved.level === level && (game !== 'shop' || saved.limit === getOptions().mathLimit);
      const completed = p.games[game].reduce((n, v) => n + v.independent + v.assisted, 0);
      return `<button class="logic-place" data-game="${game}"><span class="logic-place-icon" aria-hidden="true">${i === 2 ? foxArt : ['🧺', '⚙️'][i]}</span><strong>${LOGIC_NAMES[game]}</strong><span>${['Két rendelés, két kosár', 'Találd ki, építsd meg!', 'Előbb tervezz, aztán indulj!'][i]}</span><small>${LEVEL_NAMES[level - 1]}${resume ? ' · Folytatható' : ''}${completed ? ` · ${completed} kész` : ''}</small></button>`;
    }).join('')}</div><p class="logic-footer">Minden játékban három nehézséget próbálhatsz ki. A megkezdett feladatot elmentjük.</p>`;
    root.querySelectorAll('[data-game]').forEach(button => button.addEventListener('click', () => startGame(button.dataset.game)));
    focusGameTitle(root); say('logic_menu');
  }
  function startGame(game, fresh = false) {
    cancelSuccess(); cancelAnimation(); stopPlayback(); kind = game;
    const level = levelFor(kind), limit = getOptions().mathLimit || 5, previous = logicSessionForLevel(normalizeLogic(getProgress()), kind, level);
    session = !fresh && previous && previous.level === level && (kind !== 'shop' || previous.limit === limit) ? previous : newSession(kind, level, limit);
    task = logicTaskForSession(session);
    slot = 0; trial = false; predictionChecked = false; predictionHelp = [0, 0]; experimentInput = 2; experimentShown = false; ghost = []; fox = session.done && kind === 'route' ? task.end : null; status = ''; counters = session.level === 1;
    save(); render(); focusGameTitle(root); repeat();
  }
  function repeat() {
    if (successPending) return;
    if (!kind) { say('logic_menu'); return; }
    if (session.done) { say(`logic_${kind}_done`); return; }
    if (kind === 'shop') {
      const target = task.orders[session.stage], base = session.stage ? task.orders[0] : task.initial;
      const ids = [session.stage ? 'logic_change' : `logic_shop_${session.level}`];
      if (session.level === 3) {
        for (const [name, n] of [['total', target[0] + target[1]], ['difference', target[0] - target[1]]]) {
          const cue = { target: `[data-order="${name}"]` };
          ids.push({ id: `logic_${name}`, cue }, { id: `logic_n_${n}`, cue });
        }
      } else for (let i = 0; i < 2; i++) {
        const cue = { target: `[data-order="${i}"]` }, itemIds = [i ? 'logic_nut' : 'logic_apple'];
        if (session.level === 2) itemIds.push(`logic_n_${base[i]}`, target[i] >= base[i] ? 'logic_plus' : 'logic_minus', `logic_n_${Math.abs(target[i] - base[i])}`);
        else itemIds.push(`logic_n_${target[i]}`);
        ids.push(...itemIds.map(id => ({ id, cue })));
      }
      say(ids);
    } else say(kind === 'route' && deferredRoute() ? 'logic_route_steps' : `logic_${kind}_${session.level}`);
  }
  const dots = (n, emoji = '●') => `<span class="logic-dots" aria-hidden="true">${n ? Array.from({ length: Math.ceil(n / 5) }, (_, group) => `<span class="logic-dot-group">${Array.from({ length: Math.min(5, n - group * 5) }, () => `<i>${emoji}</i>`).join('')}</span>`).join('') : '<i>∅</i>'}</span>`;
  const quantity = (n, role = '') => `<span class="logic-quantity ${role}" data-value="${n}" data-narration-part="${role === 'logic-input' ? 'input' : role === 'logic-output' ? 'output' : ''}"><b>${n}</b>${counters ? dots(n) : ''}</span>`;
  function render(focus) {
    const hadFocus = focus || (root.contains(document.activeElement) ? document.activeElement.id : '');
    root.dataset.game = kind; root.dataset.done = finished(); root.dataset.successPending = successPending; root.dataset.level = session.level; root.dataset.busy = busy;
    setGameTitle(root, LOGIC_NAMES[kind]);
    root.innerHTML = `<div class="logic-toolbar"><button id="logic-back" hidden>↶ Liget</button><label class="logic-level-control"><span>Nehézség</span><select id="logic-level" ${busy ? 'disabled' : ''}>${LEVEL_NAMES.map((name, index) => `<option value="${index + 1}" ${session.level === index + 1 ? 'selected' : ''}>${index + 1}. ${name}</option>`).join('')}</select></label><button id="logic-repeat" aria-label="Feladat meghallgatása">🔊 Újra</button></div><div class="logic-heading"><p>${finished() ? 'Elkészült! Új fejtörő vár rád.' : kind === 'shop' ? (session.stage ? 'Változott a rendelés. Rendezd át a kosarakat!' : 'Tedd a terméseket a két kosárba!') : kind === 'machine' ? 'Figyeld meg, rakd össze, majd számolj!' : 'Csomagok felvétele, aztán irány a ház!'}</p></div><div id="logic-work"></div><p id="logic-status" class="logic-status" role="status" aria-live="polite">${status}</p><div class="logic-actions"><button id="logic-undo" ${session.done || busy || !session.history.length ? 'disabled' : ''}>↶ Visszavonás</button><button id="logic-hint" ${session.done || busy ? 'disabled' : ''}>💡 Segíts! <small>${session.help}/3</small></button>${finished() ? '<button id="logic-next" class="logic-primary">Új feladat</button>' : `<button id="logic-check" class="logic-primary" ${session.done || busy ? 'disabled' : ''}>${busy ? (kind === 'shop' ? 'Szállítás…' : 'Próba…') : kind === 'route' ? '▶ Kipróbálom' : 'Kész! ✓'}</button>`}</div>${finished()?relatedTaskMarkup('furfangliget',kind):''}`;
    bind('#logic-back', menu); bind('#logic-repeat', repeat);
    $('#logic-level').addEventListener('change', event => {
      if (busy) return;
      const level = Number(event.target.value);
      if (![1, 2, 3].includes(level) || level === session.level) return;
      localLevels[kind] = level; setLevel?.(kind, level); startGame(kind);
    });
    bind('#logic-undo', () => { if (!allowed()) return; effect('undo'); undoMove(session); trial = false; predictionChecked=false;predictionHelp=[0,0];experimentShown=false;replanAt=null; ghost = []; fox = null; walked = 0; status = ''; save(); render('logic-undo'); });
    bind('#logic-hint', hint); bind('#logic-check', check); bind('#logic-next', () => startGame(kind, true));
    if (kind === 'shop') renderShop(); else if (kind === 'machine') renderMachine(); else renderRoute();
    if (successPending) root.querySelectorAll('[data-example], [data-question], #logic-counters, #logic-route-view, #logic-repeat, #logic-experiment-input, #logic-experiment-run, #logic-route-speed').forEach(button => { button.disabled = true; });
    if (hadFocus) {
      const target = root.querySelector(`#${hadFocus}`);
      (kind === 'route' && target?.disabled ? $('.logic-directions') : target)?.focus({ preventScroll: true });
    }
  }
  function stepper(index, label) {
    return `<div class="logic-stepper"><button id="logic-minus-${index}" data-amount="${index}" data-delta="-1" aria-label="${label}: egy visszavétele" ${session.values[index] === 0 || session.done || busy ? 'disabled' : ''}>−</button><input id="logic-value-${index}" data-number="${index}" type="number" inputmode="numeric" min="0" max="${task.limit}" step="1" value="${session.values[index]}" aria-label="${label} mennyisége, 0 és ${task.limit} között" ${session.done || busy ? 'disabled' : ''}><button id="logic-plus-${index}" data-amount="${index}" data-delta="1" aria-label="${label}: egy hozzáadása" ${session.values[index] >= task.limit || session.done || busy ? 'disabled' : ''}>+</button></div>`;
  }
  function changeAmount(index, value, focus, repaint = true) {
    if (!allowed() || value === session.values[index]) return;
    effect('wood'); remember(session); session.values[index] = value; status = ''; save();
    if (repaint) { render(focus); return; }
    // Keep the clicked button in place when a numeric field commits on blur.
    $('#logic-status').textContent = ''; $('#logic-undo').disabled = false;
    $(`#logic-minus-${index}`).disabled = value === 0; $(`#logic-plus-${index}`).disabled = value >= task.limit;
    root.querySelectorAll('.logic-attention').forEach(basket => basket.classList.remove('logic-attention'));
    if (kind === 'shop') {
      const fruit = root.querySelectorAll('.logic-fruit')[index];
      fruit.innerHTML = basketItems(index);
      bindBasketItems(fruit);
      $(`#logic-add-fruit-${index}`).disabled = value >= task.limit;
      fruit.setAttribute('aria-label', `${value} ${index ? 'gesztenye' : 'alma'} a kosárban`);
    } else if (kind === 'machine') {
      if (counters) root.querySelectorAll('.logic-prediction > .logic-dots')[index].outerHTML = dots(value);
      const result = $(`#logic-result-${index}`); if (result) result.textContent = predictionFeedback(index);
    }
  }
  function bindAmounts() {
    root.querySelectorAll('[data-amount]').forEach(button => button.addEventListener('click', () => {
      if (!allowed()) return;
      const index = Number(button.dataset.amount), value = session.values[index] + Number(button.dataset.delta);
      if (value >= 0 && value <= task.limit) changeAmount(index, value, button.id);
    }));
    root.querySelectorAll('[data-number]').forEach(input => {
      input.addEventListener('focus', () => input.select());
      input.addEventListener('change', () => {
        if (!allowed()) return;
        const value = input.valueAsNumber;
        if (!Number.isInteger(value) || value < 0 || value > task.limit) {
          status = `0 és ${task.limit} közötti egész számot írj be!`; input.value = session.values[Number(input.dataset.number)];
          $('#logic-status').textContent = status; return;
        }
        changeAmount(Number(input.dataset.number), value, input.id, false);
      });
      input.addEventListener('keydown', event => { if (event.key === 'Enter') { event.preventDefault(); input.blur(); } });
    });
  }
  function basketItems(index) {
    const emoji = index ? '🌰' : '🍎', label = index ? 'gesztenye' : 'alma';
    return session.values[index] ? Array.from({length:session.values[index]},(_,item)=>`<button id="logic-fruit-${index}-${item}" data-fruit="${index}" aria-label="Egy ${label} visszavétele" ${session.done || busy ? 'disabled' : ''}>${emoji}</button>`).join('') : '<span class="logic-empty-basket">Üres kosár</span>';
  }
  function bindBasketItems(scope = root) {
    scope.querySelectorAll('[data-fruit]').forEach(button=>button.addEventListener('click',()=>{
      const index=Number(button.dataset.fruit);
      if(allowed()&&session.values[index]>0) changeAmount(index,session.values[index]-1,`logic-add-fruit-${index}`);
    }));
  }
  function renderShop() {
    const targets = task.orders[session.stage], base = session.stage ? task.orders[0] : task.initial;
    const changed = session.stage === 1 ? `<p class="logic-order-change" role="status"><strong>${task.changed ? '🌰 A gesztenyés rendelés' : '🍎 Az almás rendelés'} változott:</strong> <span>${session.level===3?`Összesen: ${task.orders[0][0]+task.orders[0][1]} → ${targets[0]+targets[1]} · Különbség: ${task.orders[0][0]-task.orders[0][1]} → ${targets[0]-targets[1]}`:`${task.orders[0][task.changed]} → ${targets[task.changed]}`}</span><small>A másik kosár mennyisége ugyanannyi maradt.</small></p>` : '';
    $('#logic-work').innerHTML = `<div class="logic-market-scene ${delivering ? 'is-delivering' : ''} ${session.done ? 'is-delivered' : ''}" aria-label="${session.done ? 'A nyuszi és a mókus átvette a kosarakat' : 'Erdei vásárlók várják a rendelést'}"><span class="logic-customer" aria-hidden="true">🐰</span><div class="logic-market-sign"><b>${session.done ? '✓ Átvették!' : delivering ? 'Indulnak a kosarak!' : 'Friss erdei termések'}</b><span>${session.stage + 1}. rendelés · két kosár</span></div><span class="logic-customer" aria-hidden="true">🐿️</span><span class="logic-delivery-basket delivery-apple" aria-hidden="true">🧺<i>🍎</i></span><span class="logic-delivery-basket delivery-nut" aria-hidden="true">🧺<i>🌰</i></span></div>${changed}<div class="logic-order" aria-label="Rendelés">${session.level === 3 ? `<div data-order="total"><strong>🍎 + 🌰 = ${targets[0] + targets[1]}</strong><span>Összesen</span></div><div data-order="difference"><strong>🍎 = 🌰 + ${targets[0] - targets[1]}</strong><span>Ennyivel több alma</span></div>` : targets.map((n, i) => `<div data-order="${i}" class="${session.stage && task.changed === i ? 'logic-changed-order' : ''}"><span>${i ? '🌰 Gesztenye' : '🍎 Alma'}</span><strong>${session.level === 2 ? `${base[i]} ${n >= base[i] ? '+' : '−'} ${Math.abs(n - base[i])} = ?` : n}</strong>${session.level === 1 ? dots(n, i ? '🌰' : '🍎') : ''}</div>`).join('')}</div><div class="logic-baskets">${targets.map((n, i) => `<section class="logic-basket ${status && !busy && session.values[i] !== n ? 'logic-attention' : ''}"><h3>${i ? '🌰 Gesztenyés kosár' : '🍎 Almás kosár'}</h3><button id="logic-add-fruit-${i}" class="logic-add-fruit" data-amount="${i}" data-delta="1" aria-label="Egy ${i ? 'gesztenye' : 'alma'} betétele a kosárba" ${session.done || busy || session.values[i] >= task.limit ? 'disabled' : ''}>${i ? '🌰' : '🍎'} ↘ 🧺 <span>Beteszem</span></button><div class="logic-fruit" aria-label="${session.values[i]} ${i ? 'gesztenye' : 'alma'} a kosárban">${basketItems(i)}</div>${stepper(i, i ? 'Gesztenye' : 'Alma')}<small class="logic-range">A kosárban lévő termésre koppintva visszaveheted. 0–${task.limit} termés.</small>${session.help >= 3 ? `<p class="logic-hint-text">Ennyi kell: ${n} ${i ? '🌰' : '🍎'}</p>` : ''}</section>`).join('')}</div>${session.help === 2 ? `<p class="logic-hint-text">${session.level === 3 ? 'Készíts egyenlő párokat, majd tedd hozzá a különbséget!' : 'Számolj a kosárban lévő termésekkel!'}</p>` : ''}`;
    bindAmounts(); bindBasketItems();
  }
  function machineTrace(input, program) {
    let n = input;
    return [n, ...program.map(op => { n = applyRule(n, [op]); return n; })];
  }
  function machineFits() { return session.program.every(Boolean) && task.examples.every(([a,b])=>applyRule(a,session.program)===b); }
  function predictionFeedback(index) {
    if (!predictionChecked && !session.done) return '';
    return session.values[index] === applyRule(task.questions[index], task.program) ? '✓ Ez az eredmény jó.' : '↻ Ezt még számold át!';
  }
  function predictionSteps(index) {
    const revealed = predictionHelp[index];
    if(!revealed) return '';
    const trace=machineTrace(task.questions[index],session.program);
    return `<p class="logic-prediction-help" id="logic-prediction-help-${index}">${trace.slice(0,revealed+1).map((n,i)=>`${i ? ` ${OPS[session.program[i-1]].label} → ` : ''}<b>${n}</b>`).join('')}${revealed<task.program.length?' → ?':''}</p>`;
  }
  function experimentResults() {
    if(!experimentShown) return '<p>Adj meg egy saját számot, és indítsd el a gépedet!</p>';
    if(!session.program.every(Boolean)) return '<p>Előbb válassz műveletet minden helyre!</p>';
    const programs=task.slots===2?[session.program,[...session.program].reverse()]:[session.program];
    return programs.map((program,index)=>{
      const trace=machineTrace(experimentInput,program), outside=trace.some(n=>n<0||n>task.limit);
      return `<div class="logic-experiment-trace"><strong>${index?'Fordított sorrend':'A te sorrended'}</strong><p>${trace.map((n,i)=>`${i?` <span>${OPS[program[i-1]].label} →</span> `:''}<b>${n}</b>`).join('')}</p>${outside?`<small>Ez a próba a 0–${task.limit} számkörön túl vezet.</small>`:''}</div>`;
    }).join('')+(task.slots===2?`<p>${applyRule(experimentInput,programs[0])===applyRule(experimentInput,programs[1])?'Ezzel a számmal ugyanaz lett az eredmény.':'Más lett az eredmény. A sorrend is számít!'}</p>`:'');
  }
  function renderMachine() {
    const run = machineRun, sequence = run ? machineTrace(task.examples[run.example][0], session.program) : [];
    $('#logic-work').innerHTML = `<div class="logic-workshop-sign"><span aria-hidden="true">⚙️</span><span>A példákból keresd a szabályt!</span><button id="logic-counters" aria-pressed="${counters}">${counters ? '● Korongok elrejtése' : '● Korongok mutatása'}</button></div><div class="logic-machine-layout"><section class="logic-examples"><h3>Így dolgozik a titkos gép</h3>${task.examples.map(([a, b], i) => `<button class="logic-example ${run?.example === i ? 'is-running' : ''}" data-example="${i}" aria-label="Példa meghallgatása: ${a} bemenet, ${b} kimenet">${quantity(a, 'logic-input')}<span class="logic-machine-core" aria-hidden="true"><span class="logic-machine-arrow">⇢</span> <span class="logic-machine-gear" data-narration-part="machine">⚙️</span> <span class="logic-machine-arrow">⇢</span></span>${quantity(b, 'logic-output')}${trial ? `<small class="${applyRule(a, session.program) === b ? 'logic-match' : 'logic-mismatch'}">A te géped: ${Number.isFinite(applyRule(a, session.program)) ? applyRule(a, session.program) : '?'} ${applyRule(a, session.program) === b ? '✓' : '≠'}</small>` : ''}</button>`).join('')}</section><section class="logic-build"><h3>Az én gépem</h3><div class="logic-slots">${session.program.map((op, i) => `<button id="logic-slot-${i}" data-slot="${i}" class="${slot === i ? 'selected' : ''} ${run?.step === i + 1 ? 'is-operating' : ''}" aria-label="${i + 1}. művelet: ${OPS[op]?.label || 'üres'}" aria-pressed="${slot === i}" ${session.done || busy ? 'disabled' : ''}><small>${i + 1}.</small> ${OPS[op]?.label || '?'}</button>`).join('<span aria-hidden="true">⇢</span>')}</div><div class="logic-ops">${task.choices.map(op => `<button id="logic-op-${op}" data-op="${op}" ${session.done || busy ? 'disabled' : ''}>${OPS[op].label}</button>`).join('')}</div><div class="logic-machine-run ${run ? 'is-running' : ''}" aria-live="off">${run ? `<span>${run.example + 1}. próba</span><div class="logic-machine-trace">${sequence.slice(0, run.step + 1).map((n, i) => `${i ? `<span class="logic-trace-op">${OPS[session.program[i - 1]].label} →</span>` : ''}<b class="${i === run.step ? 'is-current' : ''}">${n}</b>`).join('')}</div>` : '<span>Válassz műveletet, aztán próbáld ki!</span>'}</div><button id="logic-trial" class="logic-test" ${session.done || busy ? 'disabled' : ''}>⚙️ ${busy ? 'Dolgozik a géped…' : 'Géppróba'}</button>${session.help >= 2 ? `<p class="logic-hint-text">${session.help === 2 ? 'Az első művelet: ' + OPS[task.program[0]].label : 'Egy jó szabály: ' + task.program.map(op => OPS[op].label).join(' ⇢ ')}</p>` : ''}</section></div><section class="logic-predictions"><h3>${finished() ? '⚙️ ✓ Működik a géped!' : 'Most te számolj!'}</h3><div class="logic-prediction-pair">${task.questions.map((n, i) => `<div class="logic-prediction"><button data-question="${i}" aria-label="${n} megy a gépbe. Add meg a kijövő számot!">${quantity(n, 'logic-input')} <span class="logic-machine-core" aria-hidden="true"><span class="logic-machine-arrow">⇢</span> <span class="logic-machine-gear" data-narration-part="machine">⚙️</span> <span class="logic-machine-arrow">⇢</span></span> <span data-narration-part="output">? 🔊</span></button>${stepper(i, `${i + 1}. eredmény`)}${counters ? dots(session.values[i]) : ''}<p class="logic-prediction-result" id="logic-result-${i}" role="status">${predictionFeedback(i)}</p>${predictionSteps(i)}<button id="logic-help-result-${i}" data-result-help="${i}" class="logic-result-help" ${session.done || busy ? 'disabled' : ''}>☀ Ezzel számoljunk!</button></div>`).join('')}</div></section><details class="logic-experiment" ${experimentShown?'open':''}><summary>Saját számot próbálok ⚙️</summary><label for="logic-experiment-input">Mi menjen a gépbe? (0–${task.limit})</label><input id="logic-experiment-input" type="number" inputmode="numeric" min="0" max="${task.limit}" value="${experimentInput}"><button id="logic-experiment-run" ${busy?'disabled':''}>Kipróbálom${task.slots===2?' mindkét sorrendet':''}</button><div id="logic-experiment-result" role="status">${experimentResults()}</div></details>`;
    root.querySelectorAll('[data-slot]').forEach(button => button.addEventListener('click', () => { if (!allowed()) return; slot = Number(button.dataset.slot); render(button.id); }));
    root.querySelectorAll('[data-op]').forEach(button => button.addEventListener('click', () => {
      if (!allowed()) return;
      const changedSlot = slot;
      effect('machine'); remember(session); session.program[slot] = button.dataset.op; slot = (slot + 1) % task.slots; trial = false; predictionChecked = false; predictionHelp = [0,0]; experimentShown = false; status = ''; save(); render(button.id);
      say({ id: `logic_op_${button.dataset.op}`, cue: { target: `#logic-slot-${changedSlot}` } });
    }));
    root.querySelectorAll('[data-example]').forEach(button => button.addEventListener('click', () => {
      const [a, b] = task.examples[Number(button.dataset.example)], row = `[data-example="${button.dataset.example}"]`;
      const inputCue = { target: `${row} [data-narration-part="input"]` };
      say({ id: 'logic_input', cue: inputCue }, { id: `logic_n_${a}`, cue: inputCue },
        { id: 'logic_output', cue: { target: `${row} [data-narration-part="machine"]` } },
        { id: `logic_n_${b}`, cue: { target: `${row} [data-narration-part="output"]` } });
    }));
    root.querySelectorAll('[data-question]').forEach(button => button.addEventListener('click', () => {
      const row = `[data-question="${button.dataset.question}"]`, inputCue = { target: `${row} [data-narration-part="input"]` };
      say({ id: 'logic_input', cue: inputCue }, { id: `logic_n_${task.questions[Number(button.dataset.question)]}`, cue: inputCue },
        { id: 'logic_predict', cue: { target: `${row} [data-narration-part="output"]` } });
    }));
    root.querySelectorAll('[data-result-help]').forEach(button=>button.addEventListener('click',()=>{
      if(!allowed())return;
      const index=Number(button.dataset.resultHelp);
      if(!machineFits()){status='Előbb a géped szabályát próbáld ki!';render(button.id);say('logic_machine_help_rule');return;}
      predictionHelp[index]=Math.min(task.program.length,predictionHelp[index]+1);
      session.help=Math.max(1,session.help);save();render(button.id);
      const trace=machineTrace(task.questions[index],session.program), step=predictionHelp[index], cue={target:`#logic-prediction-help-${index}`};
      say({id:`logic_n_${trace[step-1]}`,cue},{id:`logic_op_${session.program[step-1]}`,cue},{id:`logic_n_${trace[step]}`,cue});
    }));
    bind('#logic-experiment-run',()=>{
      if(!active||document.hidden||busy||successPending)return;
      const value=$('#logic-experiment-input').valueAsNumber;
      if(!Number.isInteger(value)||value<0||value>task.limit){$('#logic-experiment-result').textContent=`0 és ${task.limit} közötti egész számot válassz!`;return;}
      effect('machine');experimentInput=value;experimentShown=true;$('#logic-experiment-result').innerHTML=experimentResults();
      say(session.program.every(Boolean)?'logic_machine_experiment':'logic_machine_empty');
    });
    $('#logic-experiment-input').addEventListener('keydown',event=>{if(event.key==='Enter'){event.preventDefault();$('#logic-experiment-run').click();}});
    bind('#logic-counters', () => { counters = !counters; render('logic-counters'); }); bind('#logic-trial', tryMachine); bindAmounts();
  }
  function tryMachine() {
    if (!allowed()) return;
    if (!session.program.every(Boolean)) { effect('retry'); status = 'Tegyél műveletet minden üres helyre!'; say('logic_machine_empty'); render('logic-trial'); return; }
    busy = true; trial = false; stopPlayback(); const token = ++animation;
    effect('machine'); machineRun = { example: 0, step: 0 }; status = 'A te géped sorban kipróbálja a három példát.';
    const tick = () => {
      render();
      later(token, () => {
        if (machineRun.step < session.program.length) { machineRun.step++; tick(); }
        else if (machineRun.example < task.examples.length - 1) { machineRun = { example: machineRun.example + 1, step: 0 }; tick(); }
        else {
          const fits = task.examples.every(([a, b]) => applyRule(a, session.program) === b);
          busy = false; machineRun = null; trial = true;
          status = fits ? 'Minden példa illik! Mi lesz a két új eredmény?' : 'Hasonlítsd össze a példák kimenetét a te gépeddel!';
          render('logic-trial'); say(fits ? 'logic_machine_fit' : 'logic_machine_retry');
        }
      }, 430);
    };
    tick();
  }
  const direction = delta => ({ [-task.size]: ['↑', 'Fel'], [task.size]: ['↓', 'Le'], [-1]: ['←', 'Balra'], [1]: ['→', 'Jobbra'] })[delta];
  const routeCellLabel = (cell, indexes) => `${Math.floor(cell / task.size) + 1}. sor, ${cell % task.size + 1}. oszlop${cell === task.start ? ', indulás' : ''}${cell === task.end ? ', ház' : ''}${task.parcels.includes(cell) ? ', csomag' : ''}${task.blocked.includes(cell) ? ', kő' : ''}${indexes.length ? `, az út lépései: ${indexes.join(', ')}` : ''}`;
  function renderRoute() {
    const deferred = deferredRoute(), end = session.path.at(-1), visited = session.path;
    const shown = session.done ? visited : fox !== null ? visited.slice(0, walked + 1) : deferred ? [task.start] : visited;
    const position = routePosition(), planned = task.parcels.filter(cell => shown.includes(cell)).length;
    const nextCells = neighbours(end, task.size).filter(cell => !task.blocked.includes(cell));
    const board = `<div class="logic-board-wrap"><div class="logic-board" role="group" aria-label="Csomagösvény, ${task.size} sor és ${task.size} oszlop" style="--size:${task.size}">${Array.from({ length: task.size ** 2 }, (_, cell) => {
      const indexes = shown.map((v, i) => v === cell ? i : -1).filter(i => i >= 0), hintIndex = deferred ? -1 : ghost.indexOf(cell), parcel = task.parcels.indexOf(cell);
      const collected = shown.includes(cell);
      return `<button id="logic-cell-${cell}" data-cell="${cell}" ${parcel >= 0 ? 'data-parcel' : ''} ${cell === task.end ? 'data-destination' : ''} class="logic-cell ${task.blocked.includes(cell) ? 'blocked' : ''} ${indexes.length ? 'on-path' : ''} ${cell === position ? 'path-end' : ''} ${hintIndex >= 0 ? 'hint-cell' : ''} ${!deferred && !busy && !session.done && nextCells.includes(cell) ? 'next-cell' : ''}" aria-label="${routeCellLabel(cell, indexes)}" ${deferred || busy || session.done ? 'disabled' : ''}><span aria-hidden="true">${task.blocked.includes(cell) ? '🪨' : cell === task.end ? '🏡' : parcel >= 0 ? (collected ? '✓' : '📦') : cell === task.start ? '🏁' : indexes.length ? '·' : ''}</span>${indexes.some(i => i > 0) ? `<small>${indexes.filter(i => i > 0).join('·')}</small>` : hintIndex > 0 ? `<small>${hintIndex}</small>` : ''}</button>`;
    }).join('')}</div><div class="logic-traveller ${busy && !routePaused ? 'is-walking' : ''}" aria-hidden="true">${foxArt}</div></div>`;
    $('#logic-work').innerHTML = `<div class="logic-route-view"><label for="logic-route-view">Róka mozgása</label><select id="logic-route-view" ${busy ? 'disabled' : ''}><option value="map" ${!deferred ? 'selected' : ''}>Lépésenként mutassa</option><option value="steps" ${deferred ? 'selected' : ''}>Csak indításkor mutassa</option></select></div>
      <div class="logic-playback"><label for="logic-route-speed">Tempó</label><select id="logic-route-speed">${[[1000,'Lassan'],[600,'Nyugodtan'],[300,'Gyorsan']].map(([value,name])=>`<option value="${value}" ${routeSpeed===value?'selected':''}>${name}</option>`).join('')}</select><button id="logic-route-pause" ${!busy?'disabled':''}>${routePaused?'▶ Folytatom':'Ⅱ Megállítom'}</button><button id="logic-route-step" ${session.done || session.path.length<2 || busy&&!routePaused?'disabled':''}>Egy lépés →</button>${busy?'<button id="logic-route-edit">Útiterv javítása</button>':''}</div>
      <div class="logic-route-layout">${board}<div class="logic-route-plan">
        <div class="logic-route-meter"><strong class="logic-step-count">${visited.length - 1} / ${task.maxSteps} lépés</strong><span>Még ${task.maxSteps - visited.length + 1} lépést tervezhetsz</span></div>
        <div class="logic-parcels" aria-label="${planned} a ${task.parcels.length} csomagból felvéve">${task.parcels.map((cell, i) => `<span class="${shown.includes(cell) ? 'is-planned' : ''}"><b>📦 ${i + 1}.</b><small>${session.done ? 'Megérkezett' : shown.includes(cell) ? 'Felvéve ✓' : 'Keresd meg!'}</small></span>`).join('')}</div>
        <p>${session.done ? 'Minden csomag megérkezett!' : deferred ? 'Nézd a térképet, és a nyilakkal állítsd össze a lépéseket! A róka az indulásnál vár. A Kipróbálom gombbal indítsd el a programodat!' : 'A róka minden lépés után mutatja, hol jársz. Használd a nyilakat, vagy koppints szomszédos mezőkre! Az út végét megérintve visszaléphetsz.'}</p>
        <div id="logic-directions" class="logic-directions" role="group" tabindex="0" aria-label="Útvonal építése nyilakkal">${[['up', '↑', 'Fel'], ['left', '←', 'Balra'], ['down', '↓', 'Le'], ['right', '→', 'Jobbra']].map(([d, symbol, label]) => {
          const next = end + ({ up: -task.size, down: task.size, left: -1, right: 1 }[d]);
          return `<button id="logic-direction-${d}" data-direction="${d}" aria-label="${label}" ${busy || session.done || !nextCells.includes(next) || visited.length > task.maxSteps ? 'disabled' : ''}>${symbol}</button>`;
        }).join('')}</div><button id="logic-clear" ${busy || session.done || visited.length === 1 ? 'disabled' : ''}>↺ Újratervezés</button>
      </div></div>
      <div class="logic-path-plan"><strong>Lépések</strong><ol aria-label="A tervezett lépések">${visited.length === 1 ? '<li class="logic-plan-empty">Még nincs lépés.</li>' : visited.slice(1).map((cell, i) => `<li class="${busy && walked === i + 1 ? 'is-current' : ''}" data-plan-step="${i + 1}" ${busy&&walked===i+1?'aria-current="step"':''} aria-label="${i + 1}. lépés: ${direction(cell - visited[i])[1]}"><button id="logic-plan-${i+1}" data-replan="${i+1}" aria-label="${i+1}. lépés: ${direction(cell-visited[i])[1]}. Innen tervezhetsz újra." aria-pressed="${replanAt===i+1}" ${busy||session.done?'disabled':''}><small>${i + 1}.</small><b aria-hidden="true">${direction(cell - visited[i])[0]}</b>${!deferred && task.parcels.includes(cell) ? '<span aria-hidden="true">📦</span>' : !deferred && cell === task.end ? '<span aria-hidden="true">🏡</span>' : ''}</button></li>`).join('')}</ol>${replanAt!==null&&!busy&&!session.done?`<button id="logic-replan-confirm">Innen újratervezem (${replanAt}. lépés után)</button>`:''}</div>
      ${ghost.length > 1 ? `<div class="logic-hint-route" aria-label="Segítő útvonal">${ghost.length === 2 ? '<strong>Következő lehetséges lépés:</strong>' : '<strong>Egy lehetséges teljes út:</strong>'}${ghost.slice(1).map((cell, i) => `<span>${i + 1}. ${direction(cell - ghost[i])[deferred ? 1 : 0]}</span>`).join('')}</div>` : ''}`;
    positionFox(position, false);
    $('#logic-route-speed').addEventListener('change',event=>{
      const value=Number(event.target.value);if(![300,600,1000].includes(value))return;routeSpeed=value;
      if(busy&&!routePaused){clearRouteTimer();scheduleRouteStep();}
    });
    bind('#logic-route-pause',()=>{
      if(!active||!busy)return;routePaused=!routePaused;clearRouteTimer();
      status=routePaused?'A róka vár. Egyesével is léphetsz.':'A róka továbbindul.';render('logic-route-pause');
      if(!routePaused)scheduleRouteStep();
    });
    bind('#logic-route-step',()=>{
      if(!active||session.done||busy&&!routePaused)return;
      if(!busy)beginRouteRun(true);advanceRouteStep();
    });
    bind('#logic-route-edit',()=>{if(!active)return;cancelAnimation();status='Javíthatod az útitervedet.';render('logic-directions');});
    root.querySelectorAll('[data-replan]').forEach(button=>button.addEventListener('click',()=>{if(!allowed())return;replanAt=Number(button.dataset.replan);render('logic-replan-confirm');}));
    bind('#logic-replan-confirm',()=>{
      if(!allowed()||replanAt===null)return;
      effect('undo');remember(session);session.path=session.path.slice(0,replanAt+1);replanAt=null;ghost=[];fox=null;walked=0;status='Innen folytathatod az útitervedet.';save();render('logic-directions');say('logic_route_replan');
    });

    $('#logic-route-view').addEventListener('change', event => {
      if (busy) return;
      localRouteView = event.target.value === 'steps' ? 'steps' : 'map';
      setRouteView?.(localRouteView); stopPlayback(); ghost = []; fox = null; walked = 0; status = ''; render('logic-route-view'); repeat();
    });
    root.querySelectorAll('[data-cell]').forEach(button => button.addEventListener('click', () => { if (dragged) { dragged = false; return; } move(Number(button.dataset.cell)); }));
    root.querySelectorAll('[data-direction]').forEach(button => button.addEventListener('click', () => move(end + ({ up: -task.size, down: task.size, left: -1, right: 1 }[button.dataset.direction]), false, button.id)));
    bind('#logic-clear', () => { if (!allowed()) return; remember(session); session.path = [task.start]; ghost = []; fox = null; walked = 0; status = ''; save(); render('logic-clear'); });
  }
  function positionFox(cell, animate = true) {
    const target = $(`#logic-cell-${cell}`), traveller = $('.logic-traveller');
    if (!target || !traveller) return;
    traveller.dataset.position = cell;
    traveller.style.transitionDuration = animate && !reducedMotion() ? '260ms' : '0ms';
    const position = target.getBoundingClientRect(), board = $('.logic-board-wrap').getBoundingClientRect();
    traveller.style.width = `${position.width}px`; traveller.style.height = `${position.height}px`;
    traveller.style.transform = `translate(${position.left - board.left}px, ${position.top - board.top}px)`;
  }
  function move(cell, drag = false, focus = '') {
    if (!allowed()) return;
    const last = session.path.at(-1);
    if (cell === last) { if (drag || session.path.length === 1) return; effect('undo'); remember(session); session.path.pop(); }
    else if (neighbours(last, task.size).includes(cell) && !task.blocked.includes(cell)) {
      if (session.path.length > task.maxSteps) { status = 'Megtelt az útiterv. Vonj vissza egy lépést!'; if (!drag) say('logic_route_full'); render(); return; }
      effect('step'); remember(session); session.path.push(cell);
    } else {
      if (!drag) { effect('retry'); status = 'Csak szomszédos, szabad mezőre léphetsz.'; say('logic_route_adjacent'); render(); }
      return;
    }
    ghost = []; replanAt = null; fox = null; walked = 0; status = ''; save(); render(focus || (deferredRoute() ? 'logic-directions' : `logic-cell-${cell}`));
  }
  // Delegated pointer listeners survive rendering. Buttons and arrow keys provide the same actions.
  root.addEventListener('pointerdown', event => {
    const cell = event.target.closest('[data-cell]');
    if (kind !== 'route' || deferredRoute() || !allowed() || !cell) return;
    dragging = true; dragged = false; dragStart = { cell: Number(cell.dataset.cell), x: event.clientX, y: event.clientY, id: event.pointerId }; root.setPointerCapture(event.pointerId);
  });
  root.addEventListener('pointermove', event => {
    if (!dragging || !allowed()) return;
    const cell = document.elementFromPoint(event.clientX, event.clientY)?.closest('[data-cell]');
    if (cell && Math.hypot(event.clientX - dragStart.x, event.clientY - dragStart.y) > 8 && Number(cell.dataset.cell) !== session.path.at(-1)) { dragged = true; move(Number(cell.dataset.cell), true); }
  });
  root.addEventListener('pointerup', event => {
    if (!dragging || dragStart?.id !== event.pointerId) return;
    dragging = false; const wasDragged = dragged;
    if (root.hasPointerCapture(event.pointerId)) root.releasePointerCapture(event.pointerId);
    if (!wasDragged) move(dragStart.cell); dragged = true;
  });
  window.addEventListener('pointercancel', () => { dragging = false; dragged = false; });
  root.addEventListener('keydown', event => {
    if (kind !== 'route' || !allowed() || !event.target.closest('.logic-board, .logic-directions')) return;
    const delta = { ArrowUp: -task.size, ArrowDown: task.size, ArrowLeft: -1, ArrowRight: 1 }[event.key];
    if (delta !== undefined) { event.preventDefault(); move(session.path.at(-1) + delta, false, event.target.id); }
  });
  window.addEventListener('resize', () => { if (active && kind === 'route') positionFox(routePosition(), false); });
  function hint() {
    if (!allowed()) return;
    session.help = Math.min(3, session.help + 1); const h = session.help;
    if (kind === 'route' && h >= 2) {
      const solution = routeSolution(task, session.path);
      if (!solution || solution.length - 1 > task.maxSteps) { ghost = routeSolution(task); status = 'Érdemes rövidebb utat tervezni. Vonj vissza, vagy kezdd újra!'; say(deferredRoute() ? 'logic_route_steps_restart' : 'logic_route_restart_hint'); }
      else { ghost = h === 2 ? [session.path.at(-1), solution[session.path.length]].filter(cell => cell !== undefined) : solution; status = h === 2 ? (ghost.length < 2 ? 'Az útiterved már célba ér. Próbáld ki!' : deferredRoute() ? 'Lent egy lehetséges következő irányt találsz.' : 'A kiemelt mező felé még célba érhetsz.') : 'Ez egy lehetséges út. Más jó út is lehet.'; say(deferredRoute() ? `logic_route_steps_hint${h}` : `logic_route_hint${h}`); }
    } else {
      status = kind === 'shop' ? (h === 3 ? 'A kosarak alatt megmutattuk a célmennyiségeket.' : h === 2 ? 'Számold meg a terméseket, és változtass a kosarakon!' : 'Nézd meg külön az almás és a gesztenyés rendelést!') : kind === 'machine' ? (h === 1 ? 'Ugyanaz a szabály illik mindhárom példára.' : h === 2 ? 'Segítség az első művelethez lent, a géped alatt.' : 'A műveleteket megmutattuk. A két eredményt te számold ki!') : 'Előbb csomag, aztán ház. Tervezd meg az egész utat!';
      say(`logic_${kind}_hint${h}`);
    }
    save(); render('logic-hint');
  }
  function resolve() {
    const p = normalizeLogic(getProgress()); storeLogicSession(p, session); const result = completeLogic(p, kind);
    if (result.changed) {
      session = result.progress.sessions[kind]; trial = false; ghost = [];
      successPending = result.reward;
      updateProgress(result.progress, result.reward);
      status = result.reward ? '' : '✓ Az első kosarak készek. Most változott a rendelés!';
      if (result.reward) {
        stopPlayback(); const completedSession = session, completedKind = kind;
        render();
        successDelay.schedule(() => {
          if (!active || session !== completedSession || kind !== completedKind) return;
          successPending = false; delivering = false; status = '✓ Sikerült! Szép munka.';
          render();
          if (!document.querySelector('dialog[open]')) { $('#logic-next')?.focus({ preventScroll: true }); say(`logic_${kind}_done`); }
        });
      } else { render(); repeat(); }
      return;
    }
    effect('retry'); session.misses = Math.min(9999, session.misses + 1);
    if (kind === 'shop') {
      const i = session.values.findIndex((n, j) => n !== task.orders[session.stage][j]), more = session.values[i] < task.orders[session.stage][i];
      status = `${i ? 'A gesztenyés' : 'Az almás'} kosárban ${more ? 'még kevés' : 'most sok'} a termés. Módosíthatsz rajta.`; say(more ? 'logic_shop_more' : 'logic_shop_less');
    } else if (kind === 'machine') {
      const ready = session.program.every(Boolean), fits = machineFits(); trial = ready; predictionChecked = fits;
      status = !ready ? 'Előbb töltsd ki a gép üres helyeit!' : fits ? 'A géped jó. Nézd meg újra a két új eredményt!' : 'Próbálj más műveletet! A példák segítenek.'; say(!ready ? 'logic_machine_empty' : fits ? 'logic_machine_guess' : 'logic_machine_retry');
    } else {
      const missing = task.parcels.some(cell => !session.path.includes(cell)); status = missing ? 'Még maradt csomag. Javíts az útiterven!' : 'Még el kell jutni a házhoz. Folytasd az útitervet!'; say(missing ? 'logic_route_missing' : 'logic_route_home');
    }
    save(); render('logic-check');
  }
  function check() {
    if (!allowed()) return;
    if (kind === 'shop' && taskSolved(task, session)) {
      effect('serve');
      if (session.stage === task.orders.length - 1) { delivering = true; resolve(); return; }
      busy = true; delivering = true; stopPlayback(); const token = ++animation; status = 'A vásárlókhoz indulnak a kosarak.'; render();
      later(token, () => { busy = false; delivering = false; resolve(); }, 850); return;
    }
    if (kind !== 'route') { resolve(); return; }
    beginRouteRun(false);
  }
  function clearRouteTimer() {
    if(routeTimer!==null){window.clearTimeout(routeTimer);timers.delete(routeTimer);routeTimer=null;}
  }
  function scheduleRouteStep() {
    if(!active||!busy||routePaused||document.hidden)return;
    const token=animation;
    routeTimer=window.setTimeout(()=>{
      timers.delete(routeTimer);routeTimer=null;
      if(active&&kind==='route'&&busy&&!routePaused&&token===animation&&!document.hidden)advanceRouteStep();
    },routeSpeed);
    timers.add(routeTimer);
  }
  function beginRouteRun(manual) {
    if(!allowed())return;
    busy=true;routePaused=manual;replanAt=null;stopPlayback();animation++;fox=task.start;walked=0;
    status=manual?'Egyesével követjük az útitervet.':'A róka kipróbálja az útitervedet.';render(manual?'logic-route-step':'logic-route-pause');
    if(!manual)scheduleRouteStep();
  }
  function advanceRouteStep() {
    if(!active||kind!=='route'||!busy||document.hidden)return;
    clearRouteTimer();
    if(walked<session.path.length-1)walked++;
    fox=session.path[walked]; if(walked)effect('step');
    if(walked===session.path.length-1){busy=false;routePaused=false;resolve();return;}
    status=`${walked}. lépés: ${direction(session.path[walked]-session.path[walked-1])[1]}.`;
    // Keep the map and playback buttons mounted while walking. This preserves
    // the fox transition, keyboard focus and live step announcements.
    positionFox(fox);
    $('#logic-status').textContent=status;
    const shown=session.path.slice(0,walked+1);
    root.querySelectorAll('[data-cell]').forEach(button=>{
      const cell=Number(button.dataset.cell),indexes=shown.map((value,i)=>value===cell?i:-1).filter(i=>i>=0);
      button.classList.toggle('on-path',indexes.length>0);button.classList.toggle('path-end',cell===fox);
      button.setAttribute('aria-label',routeCellLabel(cell,indexes));
      const steps=indexes.filter(i=>i>0);
      if(steps.length){const label=button.querySelector('small')||button.appendChild(document.createElement('small'));label.textContent=steps.join('·');}
      else button.querySelector('small')?.remove();
    });
    root.querySelectorAll('[data-plan-step]').forEach(step=>{
      const current=Number(step.dataset.planStep)===walked;step.classList.toggle('is-current',current);
      if(current)step.setAttribute('aria-current','step');else step.removeAttribute('aria-current');
    });
    task.parcels.forEach(cell=>{if(shown.includes(cell))$(`#logic-cell-${cell} > span`).textContent='✓';});
    $('.logic-parcels').setAttribute('aria-label',`${task.parcels.filter(cell=>shown.includes(cell)).length} a ${task.parcels.length} csomagból felvéve`);
    root.querySelectorAll('.logic-parcels > span').forEach((parcel,i)=>{
      const collected=shown.includes(task.parcels[i]);parcel.classList.toggle('is-planned',collected);parcel.querySelector('small').textContent=collected?'Felvéve ✓':'Keresd meg!';
    });
    if(!routePaused)scheduleRouteStep();
  }
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && active) { cancelAnimation(); stopPlayback(); }
    else if (active && kind) { status = ''; render(); }
  });
  return { start({kind:requestedKind}={}) {
    active = true;
    if(LOGIC_GAMES.includes(requestedKind)) {
      const saved=logicSessionForLevel(normalizeLogic(getProgress()),requestedKind,levelFor(requestedKind));
      startGame(requestedKind,Boolean(saved?.done));
    } else menu();
  }, stop, repeat };
}
