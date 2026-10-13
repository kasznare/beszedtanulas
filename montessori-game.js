import { MONTESSORI_GAMES, MONTESSORI_SHAPES, MONTESSORI_COLORS, normalizeMontessoriOptions, newMontessoriRound, placeMontessoriPiece, setMontessoriBlocker, montessoriBoardLayout, montessoriComplete } from './montessori-data.js';

const shapePaths = {
  circle: '<circle cx="50" cy="50" r="38"/>',
  square: '<rect x="14" y="14" width="72" height="72" rx="7"/>',
  triangle: '<path d="M50 9 93 85H7Z" stroke-linejoin="round"/>',
  hexagon: '<path d="M28 12H72L94 50 72 88H28L6 50Z" stroke-linejoin="round"/>',
};
const holeClips = { circle: 'circle(38%)', square: 'inset(14% round 7%)', triangle: 'polygon(50% 9%, 93% 85%, 7% 85%)', hexagon: 'polygon(28% 12%, 72% 12%, 94% 50%, 72% 88%, 28% 88%, 6% 50%)' };
const colorOf = id => MONTESSORI_COLORS.find(color => color.id === id);
const shapeArt = (shape, hole = false, color = 'coral') => `<svg class="mo-shape-art ${hole ? 'mo-hole-art' : ''}" viewBox="0 0 100 100" aria-hidden="true" fill="${hole ? '#624b36' : colorOf(color).hex}" stroke="${hole ? colorOf(color).hex : '#00000026'}" stroke-width="${hole ? 8 : 4}">${shapePaths[shape]}</svg>`;
const pieceName = (piece, kind) => kind === 'shapes' ? `${colorOf(piece.color).name.toLowerCase()} ${MONTESSORI_SHAPES[piece.shape]}` : kind === 'colors' ? `${colorOf(piece.color).name.toLowerCase()} golyó` : `${piece.size}. méretű korong`;
const pieceArt = (piece, kind) => kind === 'shapes' ? shapeArt(piece.shape, false, piece.color) : kind === 'colors' ? `<span class="mo-ball" style="--mo-color:${colorOf(piece.color).hex}" aria-hidden="true"></span>` : `<span class="mo-disc" style="--mo-size:${piece.size}" aria-hidden="true"></span>`;

export function setupMontessoriGame({ getOptions, setOptions, speak, stopPlayback, onComplete }) {
  const root = document.querySelector('#montessori');
  let active = false, kind = null, round = null, selected = null, busy = false, awarded = false;
  let drag = null, history = [], timer = null, animations = [], floating = null, suppressed = null, suppressUntil = 0;
  const $ = selector => root.querySelector(selector);
  const playable = () => active && !document.hidden && round && !busy && !montessoriComplete(round);
  const say = (id, force = false) => { if (active && !document.hidden) speak(id, force); };
  const setStatus = message => { if ($('#mo-status')) $('#mo-status').textContent = message; };
  const focus = selector => $(selector)?.focus({ preventScroll: true });
  const levelKey = game => `montessori${game[0].toUpperCase()}${game.slice(1)}Level`;
  const instructions = () => kind === 'shapes' ? round.level === 4 ? 'Told félre az akadályokat! A forma és a keret színe is egyezzen.' : round.level === 1 ? 'Húzd a formát a színes keretű lyukba!' : 'A forma alakja és a lyuk keretének színe is egyezzen!' : kind === 'colors' ? 'Minden golyót az ugyanolyan színű tálkába!' : 'A legnagyobbal kezdj, aztán egyre kisebb korongokat tegyél rá!';

  function cleanupDrag() {
    if (!drag) return;
    const previous = drag; drag = null;
    previous.ghost?.remove(); previous.button?.classList.remove('is-dragging');
    root.querySelectorAll('.is-drop-target').forEach(element => element.classList.remove('is-drop-target'));
    if (previous.type === 'blocker') previous.button.style.setProperty('--mo-slide', round.cleared.includes(previous.id) ? '1' : '0');
    if (root.hasPointerCapture(previous.pointerId)) root.releasePointerCapture(previous.pointerId);
  }
  function cleanupAnimation() {
    clearTimeout(timer); timer = null;
    animations.forEach(animation => animation.cancel()); animations = [];
    floating?.remove(); floating = null; busy = false;
  }
  function menu(focusSelector) {
    cleanupDrag(); cleanupAnimation(); stopPlayback(); kind = null; round = null; selected = null; history = [];
    root.classList.remove('has-selection');
    root.dataset.game = 'menu'; root.dataset.done = 'false';
    root.innerHTML = `<div class="mo-intro"><span class="mo-eyebrow">KIS KEZEK · NAGY FELFEDEZÉSEK</span><h2 tabindex="-1">Montessori műhely</h2><p>Nézd meg, fogd meg, találd meg a helyét.</p></div>
      <div class="mo-menu">${Object.entries(MONTESSORI_GAMES).map(([game, info]) => `<button class="mo-card mo-card-${game}" data-mo-game="${game}"><span class="mo-card-art" aria-hidden="true">${game === 'shapes' ? `<span class="mo-mini-box">${shapeArt('circle', true)}${shapeArt('triangle', true)}</span><span class="mo-mini-token">${shapeArt('triangle')}</span>` : game === 'colors' ? '<span class="mo-mini-bowls"><i></i><i></i><i></i></span><span class="mo-mini-balls"><i></i><i></i><i></i></span>' : '<span class="mo-mini-tower"><i></i><i></i><i></i><i></i></span>'}</span><strong>${info.name}</strong><span>${info.description}</span><small>${info.levels.length} felfedezhető szint <b aria-hidden="true">→</b></small></button>`).join('')}</div>
      <p class="mo-menu-note">Saját tempóban. Húzással vagy két koppintással.</p>`;
    focus(focusSelector || 'h2');
  }
  function startGame(game, level = normalizeMontessoriOptions(getOptions())[levelKey(game)]) {
    if (!Object.hasOwn(MONTESSORI_GAMES, game)) return;
    cleanupDrag(); cleanupAnimation(); stopPlayback();
    kind = game; round = newMontessoriRound(kind, level); selected = null; history = []; awarded = false;
    setOptions({ ...normalizeMontessoriOptions(getOptions()), [levelKey(kind)]: round.level });
    render('h2'); repeat();
  }
  function repeat(force = false) {
    if (!active) return;
    say(!kind ? 'montessori_menu' : montessoriComplete(round) ? `montessori_${kind}_done` : kind === 'shapes' ? `montessori_shapes_${round.level}` : `montessori_${kind}`, force);
  }
  function render(focusSelector, message) {
    const done = montessoriComplete(round), info = MONTESSORI_GAMES[kind];
    root.dataset.game = kind; root.dataset.done = String(done); root.dataset.level = round.level;
    root.classList.toggle('has-selection', selected !== null);
    const remaining = round.pieces.filter(piece => !round.placements.some(placement => placement.piece === piece.id));
    root.innerHTML = `<div class="mo-game-top"><button id="mo-back" class="mo-soft-button" aria-label="Vissza a Montessori műhelybe">← Műhely</button><span class="mo-progress" aria-label="${round.placements.length} a ${round.total} elemből a helyén">${Array.from({ length: round.total }, (_, i) => `<i class="${i < round.placements.length ? 'is-filled' : ''}"></i>`).join('')}</span></div>
      <div class="mo-heading"><span class="mo-eyebrow">${kind === 'shapes' ? 'FORMÁK ÉS HELYEK' : kind === 'colors' ? 'AZONOS SZÍNEK' : 'NAGYTÓL KICSIIG'}</span><h2 tabindex="-1">${info.name}</h2><p id="mo-instructions">${instructions()}</p></div>
      <div class="mo-levels" role="group" aria-label="${info.name} nehézsége">${info.levels.map((name, i) => `<button data-mo-level="${i + 1}" aria-pressed="${round.level === i + 1}"><span>${i + 1}</span>${name}</button>`).join('')}</div>
      <div class="mo-workspace">${kind === 'shapes' ? shapeBoard() : kind === 'colors' ? colorBoard() : towerBoard()}
        ${kind === 'shapes' ? '' : `<div class="mo-tray-wrap"><p class="mo-tray-label">${done ? 'Minden a helyére került.' : 'Válassz egyet, majd koppints a helyére — vagy húzd oda!'}</p><div class="mo-tray" role="group" aria-label="Mozgatható ${kind === 'colors' ? 'golyók' : 'korongok'}">${remaining.map(piece => `<button class="mo-piece ${selected === piece.id ? 'is-selected' : ''}" data-mo-piece="${piece.id}" aria-label="${pieceName(piece, kind)}" aria-pressed="${selected === piece.id}" ${done ? 'disabled' : ''} draggable="false">${pieceArt(piece, kind)}</button>`).join('')}${!remaining.length ? '<span class="mo-empty-tray" aria-hidden="true">✧</span>' : ''}</div></div>`}
      </div><p id="mo-status" class="mo-status ${done ? 'is-done' : ''}" role="status" aria-live="polite">${message || (done ? { shapes: 'Minden forma átpottyant!', colors: 'Minden szín a helyén!', tower: 'Elkészült a tornyod!' }[kind] : 'Itt minden mozdulatot kipróbálhatsz.')}</p>
      <div class="mo-actions"><button id="mo-undo" class="mo-soft-button" ${history.length ? '' : 'disabled'}>↶ Visszavonom</button><button id="mo-restart" class="mo-soft-button">↻ Új játék</button>${done && round.level < info.levels.length ? '<button id="mo-next" class="mo-next">Következő szint →</button>' : ''}</div>`;
    if (focusSelector) focus(focusSelector);
  }
  function shapeBoard() {
    const layout = montessoriBoardLayout(round), done = montessoriComplete(round);
    const position = ([x, y]) => `--mo-x:${x}%;--mo-y:${y}%;`;
    return `<div class="mo-box mo-surface-box" aria-label="Fa formadoboz"><div class="mo-box-lid"><div class="mo-shape-surface" data-mo-surface><div class="mo-holes" role="group" aria-label="Színes keretű lyukak">${round.targets.map(target => {
      const placed = round.placements.some(placement => placement.target === target.id), blocked = round.blockers.includes(target.id), cleared = round.cleared.includes(target.id);
      return `<div class="mo-hole-cell" style="${position(layout.targets[target.id])}"><button class="mo-hole ${placed ? 'is-placed' : ''}" data-mo-target="${target.id}" data-mo-shape="${target.shape}" data-mo-color="${target.color}" aria-label="${colorOf(target.color).name} keretű ${MONTESSORI_SHAPES[target.shape]} alakú lyuk${placed ? ', kész' : blocked && !cleared ? ', akadály takarja' : ''}" aria-describedby="mo-instructions" ${placed ? 'disabled' : ''}>${shapeArt(target.shape, true, target.color)}${placed ? '<span class="mo-hole-check" aria-hidden="true">✓</span>' : ''}</button>${blocked ? `<button class="mo-blocker ${cleared ? 'is-cleared' : ''}" data-mo-blocker="${target.id}" style="--mo-slide:${cleared ? 1 : 0}" aria-pressed="${cleared}" aria-label="Akadály a ${pieceName(target, 'shapes')} lyukánál. ${cleared ? 'Húzd balra, vagy koppints a visszatolásához!' : 'Húzd jobbra, vagy koppints a félretolásához!'}" ${done ? 'disabled' : ''}><span aria-hidden="true">⋮⋮ <b>${cleared ? '←' : '→'}</b></span></button>` : ''}</div>`;
    }).join('')}</div><div class="mo-board-pieces" role="group" aria-label="A deszkán fekvő, mozgatható formák">${round.pieces.filter(piece => !round.placements.some(placement => placement.piece === piece.id)).map(piece => `<button class="mo-piece ${selected === piece.id ? 'is-selected' : ''}" data-mo-piece="${piece.id}" data-mo-shape="${piece.shape}" data-mo-color="${piece.color}" style="${position(layout.pieces[piece.id])}" aria-label="${pieceName(piece, 'shapes')}" aria-pressed="${selected === piece.id}" ${done ? 'disabled' : ''} draggable="false">${pieceArt(piece, 'shapes')}</button>`).join('')}</div></div></div><div class="mo-box-front"><span class="mo-box-label">FORMADOBOZ</span><div class="mo-box-window" aria-label="A bedobott formák">${round.placements.map(placement => `<span>${pieceArt(round.pieces.find(piece => piece.id === placement.piece), 'shapes')}</span>`).join('')}</div></div></div>`;
  }
  function colorBoard() {
    return `<div class="mo-color-board" role="group" aria-label="Színes tálkák">${round.targets.map(target => {
      const color = colorOf(target.color), placed = round.placements.filter(placement => placement.target === target.id);
      return `<button class="mo-bowl-target" data-mo-target="${target.id}" aria-label="${color.name} tálka, ${placed.length} golyó" style="--mo-color:${color.hex}" ${montessoriComplete(round) ? 'disabled' : ''}><span class="mo-bowl"><span class="mo-bowl-inside">${placed.map(() => '<i class="mo-ball"></i>').join('')}</span></span><span class="mo-color-label">${color.name}</span></button>`;
    }).join('')}</div>`;
  }
  function towerBoard() {
    return `<div class="mo-tower-board"><span class="mo-tower-guide" aria-hidden="true">${[...round.pieces].sort((a, b) => a.size - b.size).map(piece => `<i style="--mo-size:${piece.size}"></i>`).join('')}</span><button class="mo-tower-target" data-mo-target="tower" aria-label="Torony helye, ${round.placements.length} korong. Tedd ide a következő legnagyobb korongot!" ${montessoriComplete(round) ? 'disabled' : ''}><span class="mo-tower-stack">${[...round.placements].reverse().map(placement => pieceArt(round.pieces.find(piece => piece.id === placement.piece), 'tower')).join('')}</span><span class="mo-tower-base"><span aria-hidden="true">${round.placements.length ? '' : '↓'}</span></span></button><span class="mo-tower-caption">Nagy alul · kicsi felül</span></div>`;
  }
  function syncSelection() {
    root.querySelectorAll('[data-mo-piece]').forEach(button => {
      const chosen = selected === button.dataset.moPiece;
      button.classList.toggle('is-selected', chosen); button.setAttribute('aria-pressed', String(chosen));
    });
    root.classList.toggle('has-selection', selected !== null);
  }
  function select(id) {
    if (!playable() || !round.pieces.some(piece => piece.id === id) || round.placements.some(placement => placement.piece === id)) return;
    selected = selected === id ? null : id; syncSelection();
    setStatus(selected ? 'Hová illik? Koppints a helyére!' : 'Válassz egy elemet a tálcáról!');
  }
  function moveBlocker(id, cleared = !round.cleared.includes(id)) {
    if (!playable()) return;
    const next = setMontessoriBlocker(round, id, cleared);
    if (next === round) return;
    history.push(round); round = next;
    render(`[data-mo-blocker="${id}"]`, cleared ? 'Szabad a lyuk! Az akadály mellette maradt a deszkán.' : 'Visszatoltuk az akadályt a lyuk elé.'); syncSelection(); if (cleared) say('montessori_clear');
  }
  function place(targetId) {
    if (!playable()) return;
    if (!selected) { setStatus('Előbb válassz egy elemet a tálcáról!'); return; }
    const result = placeMontessoriPiece(round, selected, targetId);
    if (!result.accepted) {
      if (result.reason === 'invalid') return;
      const blocked = result.reason === 'blocked';
      const text = blocked ? 'Előbb csúsztasd félre az akadályt!' : kind === 'shapes' ? 'A forma és a keret színe is egyezzen! Nézd meg mindkettőt.' : kind === 'colors' ? 'Keress ugyanilyen színű tálkát!' : 'Előbb a legnagyobb megmaradt korong következik.';
      setStatus(text); say(blocked ? 'montessori_blocked' : { shapes: 'montessori_shape_retry', colors: 'montessori_color_retry', tower: 'montessori_tower_retry' }[kind]);
      const target = $(`[data-mo-target="${targetId}"]`); target?.classList.remove('is-retry'); if (target) { void target.offsetWidth; target.classList.add('is-retry'); }
      return;
    }
    const pieceId = selected, button = $(`[data-mo-piece="${pieceId}"]`), target = $(`[data-mo-target="${targetId}"]`);
    history.push(round); round = result.round; selected = null; busy = true; root.classList.remove('has-selection'); stopPlayback();
    if (montessoriComplete(round) && !awarded) { awarded = true; onComplete(round.total); }
    root.querySelectorAll('button').forEach(element => { element.disabled = true; });
    setStatus(kind === 'shapes' ? 'Hopp, átpottyan!' : kind === 'colors' ? 'A golyó a tálkába gurul.' : 'A korong a toronyra kerül.');
    animatePlacement(button, target, () => {
      cleanupAnimation();
      if (!active || document.hidden) return;
      render(montessoriComplete(round) ? '#mo-restart' : '[data-mo-piece]');
      if (montessoriComplete(round)) { focus(round.level < MONTESSORI_GAMES[kind].levels.length ? '#mo-next' : '#mo-restart'); say(`montessori_${kind}_done`); }
      else setStatus(kind === 'shapes' ? 'A forma bent van. Jöhet a következő!' : 'A helyén van. Válassz egy másikat!');
    });
  }
  function animatePlacement(button, target, finish) {
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced || !button || !target) { timer = setTimeout(finish, 0); return; }
    const from = button.getBoundingClientRect(), to = target.getBoundingClientRect();
    const art = button.firstElementChild.getBoundingClientRect();
    floating = document.createElement('div'); floating.className = 'mo-flying-piece'; floating.setAttribute('aria-hidden', 'true');
    floating.innerHTML = button.innerHTML;
    floating.firstElementChild.style.width = `${art.width}px`; floating.firstElementChild.style.height = `${art.height}px`;
    floating.style.cssText = `left:${from.left + from.width / 2 - art.width / 2}px;top:${from.top + from.height / 2 - art.height / 2}px;width:${art.width}px;height:${art.height}px;`;
    document.body.appendChild(floating); button.classList.add('is-dragging');
    const dx = to.left + to.width / 2 - (from.left + from.width / 2), dy = to.top + to.height / 2 - (from.top + from.height / 2);
    animations.push(floating.animate([{ transform: 'translate(0,0) scale(1)' }, { transform: `translate(${dx}px,${dy}px) scale(.95)` }], { duration: 260, easing: 'ease-out', fill: 'forwards' }));
    timer = setTimeout(() => {
      animations.forEach(animation => animation.cancel()); animations = []; floating.remove();
      floating.className = `mo-arriving-piece mo-arriving-${kind}`;
      floating.style.cssText = `width:${art.width}px;height:${art.height}px;`;
      const chute = document.createElement('span'); chute.className = 'mo-drop-chute'; chute.setAttribute('aria-hidden', 'true'); chute.appendChild(floating); target.appendChild(chute);
      if (kind === 'shapes') {
        const hole = target.querySelector('svg').getBoundingClientRect();
        chute.style.cssText = `left:${hole.left - to.left}px;top:${hole.top - to.top}px;width:${hole.width}px;height:${hole.height}px;clip-path:${holeClips[target.dataset.moShape]};`;
      }
      animations.push(floating.animate(kind === 'shapes' ? [{ transform: 'translateY(0) scale(.95)', opacity: 1 }, { transform: 'translateY(28px) scale(.8)', opacity: 1, offset: .45 }, { transform: 'translateY(95px) scale(.5)', opacity: 0 }] : [{ transform: 'translateY(-20px) scale(.95)', opacity: 1 }, { transform: 'translateY(12px) scale(.85)', opacity: 1 }, { transform: 'translateY(8px) scale(.85)', opacity: 1 }], { duration: 420, easing: 'ease-in', fill: 'forwards' }));
      timer = setTimeout(finish, 440);
    }, 270);
  }

  root.addEventListener('pointerdown', event => {
    const button = event.target.closest('[data-mo-piece], [data-mo-blocker]');
    if (!button || button.disabled || !playable() || !event.isPrimary || event.button !== 0) return;
    cleanupDrag();
    const blocker = button.dataset.moBlocker;
    const initialSlide = blocker && round.cleared.includes(blocker) ? 1 : 0;
    drag = { type: blocker ? 'blocker' : 'piece', id: blocker || button.dataset.moPiece, button, pointerId: event.pointerId, x: event.clientX, y: event.clientY, moved: false, slide: initialSlide, initialSlide };
    root.setPointerCapture(event.pointerId);
  });
  root.addEventListener('pointermove', event => {
    if (!drag || drag.pointerId !== event.pointerId || !playable()) return;
    if (!drag.moved && Math.hypot(event.clientX - drag.x, event.clientY - drag.y) < 8) return;
    drag.moved = true; event.preventDefault();
    if (drag.type === 'blocker') {
      const distance = drag.button.offsetWidth + 8;
      drag.slide = Math.max(0, Math.min(1, drag.initialSlide + (event.clientX - drag.x) / distance));
      drag.button.style.setProperty('--mo-slide', String(drag.slide)); return;
    }
    if (!drag.ghost) {
      selected = drag.id; syncSelection();
      const rect = drag.button.getBoundingClientRect();
      drag.ghost = document.createElement('div'); drag.ghost.className = 'mo-drag-preview'; drag.ghost.setAttribute('aria-hidden', 'true'); drag.ghost.innerHTML = drag.button.innerHTML;
      const art = drag.button.firstElementChild.getBoundingClientRect();
      drag.ghost.firstElementChild.style.width = `${art.width}px`; drag.ghost.firstElementChild.style.height = `${art.height}px`;
      drag.ghost.style.width = `${rect.width}px`; drag.ghost.style.height = `${rect.height}px`;
      drag.width = rect.width; drag.height = rect.height; document.body.appendChild(drag.ghost); drag.button.classList.add('is-dragging');
    }
    drag.ghost.style.left = `${event.clientX - drag.width / 2}px`; drag.ghost.style.top = `${event.clientY - drag.height / 2}px`;
    root.querySelectorAll('.is-drop-target').forEach(element => element.classList.remove('is-drop-target'));
    const target = document.elementFromPoint(event.clientX, event.clientY)?.closest('[data-mo-target]:not(:disabled)');
    if (target && root.contains(target)) target.classList.add('is-drop-target');
  });
  root.addEventListener('pointerup', event => {
    if (!drag || drag.pointerId !== event.pointerId) return;
    const previous = drag, target = document.elementFromPoint(event.clientX, event.clientY)?.closest('[data-mo-target]');
    cleanupDrag(); suppressed = previous.id; suppressUntil = performance.now() + 400;
    if (!playable()) return;
    if (previous.type === 'blocker') {
      if (!previous.moved) moveBlocker(previous.id);
      else if (previous.slide >= .8) moveBlocker(previous.id, true);
      else if (previous.slide <= .2) moveBlocker(previous.id, false);
      else setStatus('Csúsztasd az akadályt teljesen félre, vagy koppints rá!');
    } else if (previous.moved) {
      if (target && root.contains(target)) place(target.dataset.moTarget);
      else { setStatus('Az elem itt vár. Húzd a helyére, vagy koppints oda!'); focus(`[data-mo-piece="${previous.id}"]`); }
    } else { select(previous.id); focus(`[data-mo-piece="${previous.id}"]`); }
  });
  root.addEventListener('pointercancel', cleanupDrag);
  root.addEventListener('lostpointercapture', cleanupDrag);
  root.addEventListener('click', event => {
    if (!active || document.hidden || busy) return;
    const button = event.target.closest('button'); if (!button || button.disabled) return;
    const id = button.dataset.moPiece || button.dataset.moBlocker;
    if (id && id === suppressed && event.detail > 0 && performance.now() < suppressUntil) return;
    if (button.dataset.moGame) startGame(button.dataset.moGame);
    else if (button.dataset.moLevel) startGame(kind, Number(button.dataset.moLevel));
    else if (button.dataset.moPiece) select(button.dataset.moPiece);
    else if (button.dataset.moBlocker) moveBlocker(button.dataset.moBlocker);
    else if (button.dataset.moTarget) place(button.dataset.moTarget);
    else if (button.id === 'mo-back') { menu(`[data-mo-game="${kind}"]`); say('montessori_menu'); }
    else if (button.id === 'mo-restart') startGame(kind, round.level);
    else if (button.id === 'mo-next') startGame(kind, round.level + 1);
    else if (button.id === 'mo-undo' && history.length) { cleanupDrag(); stopPlayback(); round = history.pop(); selected = null; render('#mo-undo', 'Visszatettük. Próbáld ki újra!'); syncSelection(); }
  });
  root.addEventListener('keydown', event => {
    if (event.key === 'Escape' && round && !busy) { cleanupDrag(); selected = null; syncSelection(); setStatus('Válassz egy elemet a tálcáról!'); }
  });
  document.addEventListener('visibilitychange', () => {
    if (!active) return;
    if (document.hidden) { cleanupDrag(); cleanupAnimation(); stopPlayback(); }
    else if (round) { render(undefined, montessoriComplete(round) ? undefined : 'Folytathatod a játékot.'); syncSelection(); }
  });
  return {
    start() { active = true; root.classList.remove('has-selection'); menu(); say('montessori_menu'); },
    stop() { active = false; cleanupDrag(); cleanupAnimation(); stopPlayback(); root.classList.remove('has-selection'); },
    repeat() { repeat(true); },
  };
}
