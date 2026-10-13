import { MONTESSORI_GAMES, MONTESSORI_SHAPES, normalizeMontessoriOptions, montessoriCurrentPiece, moveMontessoriPiece, rotateMontessoriPiece, checkMontessoriRound, montessoriColorHex, placeMontessoriPiece, setMontessoriBlocker, montessoriBoardLayout, montessoriComplete } from './montessori-data.js';

import { colorOf, shapeArt, pieceArt, pieceName, holeClip, challengeBoard } from './montessori-art.js';
import { createMontessoriSession, loadMontessoriSession, saveMontessoriSession } from './montessori-session.js';

export function setupMontessoriGame({ getOptions, setOptions, speak, stopPlayback, onComplete, getScope = () => 'default' }) {
  const root = document.querySelector('#montessori');
  let active = false, kind = null, round = null, selected = null, busy = false, awarded = false;
  let scope = null;
  const save = () => { if (round && scope !== null) saveMontessoriSession(localStorage, scope, round, awarded); };
  const remember = next => { history.push(round); if (history.length > 40) history.shift(); round = next; save(); };
  let drag = null, history = [], timer = null, animations = [], floating = null, suppressed = null, suppressUntil = 0;
  const $ = selector => root.querySelector(selector);
  const playable = () => active && !document.hidden && round && !busy && !montessoriComplete(round);
  const say = (id, force = false) => { if (active && !document.hidden) speak(id, force); };
  const setStatus = message => { if ($('#mo-status')) $('#mo-status').textContent = message; };
  const focus = selector => $(selector)?.focus({ preventScroll: true });
  const levelKey = game => `montessori${game[0].toUpperCase()}${game.slice(1)}Level`;
  const instructions = () => kind === 'shapes' ? round.level >= 6 ? 'A szín, az alak, a méret és az elfordítás is egyezzen! A bábukat arrébb tolhatod.' : round.level === 5 ? 'A kicsi forma a kicsi lyukba illik. A szín és az alak is egyezzen!' : round.level === 4 ? 'Told félre az akadályokat! A forma és a keret színe is egyezzen.' : round.level === 1 ? 'Húzd a formát a színes keretű lyukba!' : 'A forma alakja és a lyuk keretének színe is egyezzen!' : kind === 'colors' ? round.level === 5 ? 'Az árnyalat is egyezzen! Annyi golyót tegyél bele, amennyit a pöttyök mutatnak.' : round.level === 4 ? 'A világos és a sötét golyóknak külön tálkájuk van.' : 'Minden golyót az ugyanolyan színű tálkába!' : kind === 'tower' ? 'A legnagyobbal kezdj, aztán egyre kisebb korongokat tegyél rá!' : kind === 'grid' ? 'A sor alakja és az oszlop színe együtt mutatja a helyet.' + (round.level === 4 ? ' A méret is számít!' : '') : 'Figyeld meg, rejtsd el, majd rakd ki emlékezetből!';
  const doneMessage = () => ({ shapes: 'Minden forma átpottyant!', colors: 'Minden tálkában pontosan annyi van, amennyi kell!', tower: 'Elkészült a tornyod!', grid: 'Minden sor és oszlop rendben!', memory: 'Kiraktad a megfigyelt mintát!' })[kind];
  function award() { if (montessoriComplete(round) && !awarded) { awarded = true; save(); onComplete(round.total); } }


  function cleanupDrag() {
    if (!drag) return;
    const previous = drag; drag = null;
    cancelAnimationFrame(previous.scrollFrame);
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
    save(); cleanupDrag(); cleanupAnimation(); stopPlayback(); kind = null; round = null; selected = null; history = [];
    root.classList.remove('has-selection');
    root.dataset.game = 'menu'; root.dataset.done = 'false';
    root.innerHTML = `<div class="mo-intro"><span class="mo-eyebrow">KIS KEZEK · NAGY FELFEDEZÉSEK</span><h2 tabindex="-1">Montessori műhely</h2><p>Nézd meg, fogd meg, találd meg a helyét.</p></div>
      <div class="mo-menu">${Object.entries(MONTESSORI_GAMES).map(([game, info]) => `<button class="mo-card mo-card-${game}" data-mo-game="${game}"><span class="mo-card-art" aria-hidden="true">${game === 'shapes' ? `<span class="mo-mini-box">${shapeArt('circle', true)}${shapeArt('triangle', true)}</span><span class="mo-mini-token">${shapeArt('triangle')}</span>` : game === 'colors' ? '<span class="mo-mini-bowls"><i></i><i></i><i></i></span><span class="mo-mini-balls"><i></i><i></i><i></i></span>' : game === 'grid' ? '<span class="mo-mini-grid">▦</span>' : game === 'memory' ? '<span class="mo-mini-memory">● ▲ ● ▲</span>' : '<span class="mo-mini-tower"><i></i><i></i><i></i><i></i></span>'}</span><strong>${info.name}</strong><span>${info.description}</span><small>${info.levels.length} felfedezhető szint <b aria-hidden="true">→</b></small></button>`).join('')}</div>
      <p class="mo-menu-note">Saját tempóban. Húzással vagy két koppintással.</p>`;
    focus(focusSelector || 'h2');
  }
  function startGame(game, level = normalizeMontessoriOptions(getOptions())[levelKey(game)], fresh = false) {
    if (!Object.hasOwn(MONTESSORI_GAMES, game)) return;
    save(); cleanupDrag(); cleanupAnimation(); stopPlayback();
    kind = game; scope = getScope();
    const restored = fresh ? null : loadMontessoriSession(localStorage, scope, kind, level);
    round = restored?.round || createMontessoriSession(kind, level); selected = null; history = []; awarded = restored?.awarded || false; save();
    setOptions({ ...normalizeMontessoriOptions(getOptions()), [levelKey(kind)]: round.level });
    render('h2'); repeat();
  }
  function repeat(force = false) {
    if (!active) return;
    say(!kind ? 'montessori_menu' : montessoriComplete(round) ? `montessori_${kind}_done` : kind === 'shapes' ? round.level >= 6 ? 'montessori_shapes_turn' : round.level === 5 ? 'montessori_shapes_size' : `montessori_shapes_${round.level}` : kind === 'colors' && round.level >= 4 ? round.level === 4 ? 'montessori_colors_shades' : 'montessori_colors_count' : kind === 'grid' && round.level === 4 ? 'montessori_grid_size' : `montessori_${kind}`, force);
  }
  function render(focusSelector, message) {
    const done = montessoriComplete(round), info = MONTESSORI_GAMES[kind];
    root.dataset.game = kind; root.dataset.done = String(done); root.dataset.level = round.level;
    root.classList.toggle('has-selection', selected !== null);
    const remaining = round.pieces.filter(piece => !round.placements.some(placement => placement.piece === piece.id));
    root.innerHTML = `<div class="mo-game-top"><button id="mo-back" class="mo-soft-button" aria-label="Vissza a Montessori műhelybe">← Műhely</button><span class="mo-progress" aria-label="${round.placements.length} a ${round.total} elemből a helyén">${Array.from({ length: round.total }, (_, i) => `<i class="${i < round.placements.length ? 'is-filled' : ''}"></i>`).join('')}</span></div>
      <div class="mo-heading"><span class="mo-eyebrow">${kind === 'shapes' ? 'FORMÁK ÉS HELYEK' : kind === 'colors' ? 'SZÍNEK ÉS ÁRNYALATOK' : kind === 'grid' ? 'SOR ÉS OSZLOP' : kind === 'memory' ? 'FIGYELEM ÉS EMLÉKEZET' : 'NAGYTÓL KICSIIG'}</span><h2 tabindex="-1">${info.name}</h2><p id="mo-instructions">${instructions()}</p></div>
      <div class="mo-levels" role="group" aria-label="${info.name} nehézsége">${info.levels.map((name, i) => `<button data-mo-level="${i + 1}" aria-pressed="${round.level === i + 1}"><span>${i + 1}</span>${name}</button>`).join('')}</div>
      <div class="mo-workspace">${kind === 'shapes' ? shapeBoard() : kind === 'colors' ? colorBoard() : kind === 'tower' ? towerBoard() : challengeBoard(round, selected)}
        ${kind === 'shapes' || kind === 'memory' && round.phase === 'preview' ? '' : `<div class="mo-tray-wrap"><p class="mo-tray-label">${done ? 'Elkészült a feladat.' : 'Válassz egyet, majd koppints a helyére — vagy húzd oda!'}</p><div class="mo-tray" role="group" aria-label="Mozgatható ${kind === 'colors' ? 'golyók' : kind === 'tower' ? 'korongok' : 'elemek'}">${remaining.map(piece => `<button class="mo-piece ${selected === piece.id ? 'is-selected' : ''}" data-mo-piece="${piece.id}" aria-label="${pieceName(piece, kind)}" aria-pressed="${selected === piece.id}" ${done ? 'disabled' : ''} draggable="false">${pieceArt(piece, kind)}</button>`).join('')}${!remaining.length ? '<span class="mo-empty-tray" aria-hidden="true">✧</span>' : ''}</div></div>`}
      </div><p id="mo-status" class="mo-status ${done ? 'is-done' : ''}" role="status" aria-live="polite">${message || (done ? doneMessage() : 'Itt minden mozdulatot kipróbálhatsz.')}</p>
      <div class="mo-actions">${kind === 'shapes' && round.level >= 6 ? '<button id="mo-turn-left" class="mo-soft-button" aria-label="Kijelölt forma forgatása balra">↶ Forgatás</button><button id="mo-turn-right" class="mo-soft-button" aria-label="Kijelölt forma forgatása jobbra">↷ Forgatás</button>' : ''}${['grid', 'memory'].includes(kind) && !done && (kind !== 'memory' || round.phase === 'play') ? '<button id="mo-check" class="mo-next">✓ Ellenőrzés</button>' : ''}<button id="mo-undo" class="mo-soft-button" ${history.length ? '' : 'disabled'}>↶ Visszavonom</button><button id="mo-restart" class="mo-soft-button">↻ Új játék</button>${done && round.level < info.levels.length ? '<button id="mo-next" class="mo-next">Következő szint →</button>' : ''}</div>`;
    if (focusSelector) focus(focusSelector);
  }
  function shapeBoard() {
    const layout = montessoriBoardLayout(round), done = montessoriComplete(round);
    const position = ([x, y]) => `--mo-x:${x}%;--mo-y:${y}%;`;
    return `<div class="mo-box mo-surface-box" aria-label="Fa formadoboz"><div class="mo-box-lid"><div class="mo-shape-surface" data-mo-surface><div class="mo-holes" role="group" aria-label="Színes keretű lyukak">${round.targets.map(target => {
      const placed = round.placements.some(placement => placement.target === target.id), blocked = round.blockers.includes(target.id), cleared = round.cleared.includes(target.id);
      return `<div class="mo-hole-cell" style="${position(layout.targets[target.id])}--mo-park:calc(-1cqh * ${layout.targets[target.id][1] - (20 + 14 * round.blockers.indexOf(target.id))});"><button class="mo-hole ${placed ? 'is-placed' : ''}" data-mo-target="${target.id}" data-mo-shape="${target.shape}" data-mo-color="${target.color}" data-mo-size="${target.size}" data-mo-rotation="${target.rotation}" aria-label="${pieceName(target, 'shapes')} alakú, azonos színű keretes lyuk${placed ? ', kész' : blocked && !cleared ? ', akadály takarja' : ''}" aria-describedby="mo-instructions" ${placed ? 'disabled' : ''}>${shapeArt(target.shape, true, target.color, target.size, target.rotation)}${placed ? '<span class="mo-hole-check" aria-hidden="true">✓</span>' : ''}</button>${blocked ? `<button class="mo-blocker ${cleared ? 'is-cleared' : ''}" data-mo-blocker="${target.id}" style="--mo-slide:${cleared ? 1 : 0}" aria-pressed="${cleared}" aria-label="Akadály a ${pieceName(target, 'shapes')} lyukánál. ${cleared ? round.level >= 7 ? 'Húzd lefelé, vagy koppints a visszatolásához!' : 'Húzd balra, vagy koppints a visszatolásához!' : round.level >= 7 ? 'Húzd felfelé, vagy koppints a félretolásához!' : 'Húzd jobbra, vagy koppints a félretolásához!'}" ${done ? 'disabled' : ''}><span aria-hidden="true">⋮⋮ <b>${round.level >= 7 ? cleared ? '↓' : '↑' : cleared ? '←' : '→'}</b></span></button>` : ''}</div>`;
    }).join('')}</div><div class="mo-board-pieces" role="group" aria-label="A deszkán fekvő, mozgatható formák">${round.pieces.filter(piece => !round.placements.some(placement => placement.piece === piece.id)).map(original => { const piece = montessoriCurrentPiece(round, original.id); return `<button class="mo-piece ${selected === piece.id ? 'is-selected' : ''}" data-mo-piece="${piece.id}" data-mo-shape="${piece.shape}" data-mo-color="${piece.color}" data-mo-size="${piece.size}" data-mo-rotation="${piece.rotation}" style="${position(layout.pieces[piece.id])}" aria-label="${pieceName(piece, 'shapes')}" aria-pressed="${selected === piece.id}" ${done ? 'disabled' : ''} draggable="false">${pieceArt(piece, 'shapes')}</button>`; }).join('')}</div></div></div><div class="mo-box-front"><span class="mo-box-label">FORMADOBOZ</span><div class="mo-box-window" aria-label="A bedobott formák">${round.placements.map(placement => `<span>${pieceArt(montessoriCurrentPiece(round, placement.piece), 'shapes')}</span>`).join('')}</div></div></div>`;
  }
  function colorBoard() {
    return `<div class="mo-color-board" role="group" aria-label="Színes tálkák">${round.targets.map(target => {
      const color = colorOf(target.color), shade = target.shade === null ? '' : target.shade === 0 ? 'Világos ' : 'Sötét ', placed = round.placements.filter(placement => placement.target === target.id);
      return `<button class="mo-bowl-target" data-mo-target="${target.id}" aria-label="${shade}${color.name} tálka, ${placed.length} a ${target.count} golyóból" style="--mo-color:${montessoriColorHex(target.color, target.shade)}" ${montessoriComplete(round) ? 'disabled' : ''}><span class="mo-bowl"><span class="mo-bowl-inside">${placed.map(() => '<i class="mo-ball"></i>').join('')}</span></span><span class="mo-color-label">${shade}${color.name}</span><span class="mo-capacity" aria-label="${target.count} golyó helye">${Array.from({ length: target.count }, (_, i) => `<i class="${i < placed.length ? 'is-filled' : ''}"></i>`).join('')}</span></button>`;
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
    if (!playable() || !round.pieces.some(piece => piece.id === id) || !['grid', 'memory'].includes(kind) && round.placements.some(placement => placement.piece === id)) return;
    selected = selected === id ? null : id; syncSelection();
    setStatus(selected ? 'Hová illik? Koppints a helyére!' : 'Válassz egy elemet a tálcáról!');
  }
  function moveBlocker(id, cleared = !round.cleared.includes(id)) {
    if (!playable()) return;
    const next = setMontessoriBlocker(round, id, cleared);
    if (next === round) return;
    remember(next);
    render(`[data-mo-blocker="${id}"]`, cleared ? 'Szabad a lyuk! Az akadály mellette maradt a deszkán.' : 'Visszatoltuk az akadályt a lyuk elé.'); syncSelection(); if (cleared) say('montessori_clear');
  }
  function place(targetId) {
    if (!playable()) return;
    if (!selected) { setStatus('Előbb válassz egy elemet a tálcáról!'); return; }
    const result = placeMontessoriPiece(round, selected, targetId);
    if (!result.accepted) {
      if (result.reason === 'invalid') return;
      const blocked = result.reason === 'blocked';
      const text = result.reason === 'full' ? 'Ebben a tálkában már elég golyó van.' : blocked ? 'Előbb csúsztasd félre az akadályt!' : kind === 'shapes' ? round.level >= 5 ? 'Nézd meg az alakot, a színt, a méretet és az elfordítást!' : 'A forma és a keret színe is egyezzen! Nézd meg mindkettőt.' : kind === 'colors' ? 'Keress ugyanilyen színű tálkát!' : 'Előbb a legnagyobb megmaradt korong következik.';
      setStatus(text); say(blocked ? 'montessori_blocked' : { shapes: 'montessori_shape_retry', colors: 'montessori_color_retry', tower: 'montessori_tower_retry' }[kind]);
      const target = $(`[data-mo-target="${targetId}"]`); target?.classList.remove('is-retry'); if (target) { void target.offsetWidth; target.classList.add('is-retry'); }
      return;
    }
    const pieceId = selected, button = $(`[data-mo-piece="${pieceId}"]`), target = $(`[data-mo-target="${targetId}"]`);
    remember(result.round); selected = null;
    if (['grid', 'memory'].includes(kind)) { render(`[data-mo-target="${targetId}"]`, 'Leraktad. A helyükre tett elemeket is átcserélheted.'); return; }
     busy = true; root.classList.remove('has-selection'); stopPlayback();
    award();
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
  function parkPiece(id, x, y) {
    const board = $('[data-mo-surface]'); if (!board) return;
    const rect = board.getBoundingClientRect();
    if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) return;
    const next = moveMontessoriPiece(round, id, 100 * (x - rect.left) / rect.width, 100 * (y - rect.top) / rect.height);
    if (next === round) return;
    remember(next); render(undefined, 'Itt marad a bábu. Később is folytathatod innen.');
  }
  function turn(step) {
    if (!playable() || !selected) { setStatus('Előbb válassz ki egy forgatható formát!'); return; }
    const next = rotateMontessoriPiece(round, selected, step);
    if (next === round) { setStatus('Ennek a formának minden iránya ugyanaz.'); return; }
    remember(next); render(`[data-mo-piece="${selected}"]`, 'Elfordítottuk a formát.');
  }
  function check() {
    if (!playable()) return;
    remember(checkMontessoriRound(round)); award(); render(montessoriComplete(round) ? '#mo-restart' : '#mo-check', montessoriComplete(round) ? doneMessage() : round.placements.length < round.total ? 'Még vannak üres helyek. Próbáld teletenni!' : 'Nézd meg újra a szabályt! Az elemeket átcserélheted.');
    say(`montessori_${kind}_${montessoriComplete(round) ? 'done' : 'retry'}`);
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
        chute.style.cssText = `left:${hole.left - to.left}px;top:${hole.top - to.top}px;width:${hole.width}px;height:${hole.height}px;clip-path:${holeClip(target.dataset.moShape, Number(target.dataset.moRotation))};`;
      }
      animations.push(floating.animate(kind === 'shapes' ? [{ transform: 'translateY(0) scale(.95)', opacity: 1 }, { transform: 'translateY(28px) scale(.8)', opacity: 1, offset: .45 }, { transform: 'translateY(95px) scale(.5)', opacity: 0 }] : [{ transform: 'translateY(-20px) scale(.95)', opacity: 1 }, { transform: 'translateY(12px) scale(.85)', opacity: 1 }, { transform: 'translateY(8px) scale(.85)', opacity: 1 }], { duration: 420, easing: 'ease-in', fill: 'forwards' }));
      timer = setTimeout(finish, 440);
    }, 270);
  }

  function scrollDragAtEdge(y) {
    if (!drag || drag.type !== 'piece') return;
    drag.scrollSpeed = y < 64 ? -10 : y > innerHeight - 64 ? 10 : 0;
    if (drag.scrollFrame || !drag.scrollSpeed) return;
    const step = () => {
      if (!drag) return;
      drag.scrollFrame = null;
      if (!drag.scrollSpeed || !playable()) return;
      window.scrollBy(0, drag.scrollSpeed);
      drag.scrollFrame = requestAnimationFrame(step);
    };
    drag.scrollFrame = requestAnimationFrame(step);
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
    drag.moved = true; event.preventDefault(); scrollDragAtEdge(event.clientY);
    if (drag.type === 'blocker') {
      const vertical = kind === 'shapes' && round.level >= 7;
      const distance = vertical ? $('[data-mo-surface]').getBoundingClientRect().height * (montessoriBoardLayout(round).targets[drag.id][1] - (20 + 14 * round.blockers.indexOf(drag.id))) / 100 : drag.button.offsetWidth + 8;
      drag.slide = Math.max(0, Math.min(1, drag.initialSlide + (vertical ? drag.y - event.clientY : event.clientX - drag.x) / distance));
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
      const targetId = target && root.contains(target) ? target.dataset.moTarget : null;
      if (kind === 'shapes' && (!targetId || !placeMontessoriPiece(round, previous.id, targetId).accepted)) parkPiece(previous.id, event.clientX, event.clientY);
      if (targetId) place(targetId);
      else { setStatus('Az elem itt vár. Húzd a helyére, vagy koppints oda!'); focus(`[data-mo-piece="${previous.id}"]`); }
    } else { if (previous.button.dataset.moTarget && selected && selected !== previous.id) place(previous.button.dataset.moTarget); else select(previous.id); focus(`[data-mo-piece="${previous.id}"]`); }
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
    else if (button.dataset.moPiece && button.dataset.moTarget && selected && selected !== button.dataset.moPiece) place(button.dataset.moTarget);
    else if (button.dataset.moPiece) select(button.dataset.moPiece);
    else if (button.dataset.moBlocker) moveBlocker(button.dataset.moBlocker);
    else if (button.dataset.moTarget) place(button.dataset.moTarget);
    else if (button.id === 'mo-back') { menu(`[data-mo-game="${kind}"]`); say('montessori_menu'); }
    else if (button.id === 'mo-restart') startGame(kind, round.level, true);
    else if (button.id === 'mo-next') startGame(kind, round.level + 1, true);
    else if (button.id === 'mo-turn-left' || button.id === 'mo-turn-right') turn(button.id === 'mo-turn-left' ? -1 : 1);
    else if (button.id === 'mo-hide-pattern') { remember({ ...round, phase: 'play' }); render('[data-mo-piece]'); }
    else if (button.id === 'mo-show-pattern') { remember({ ...round, phase: 'preview', assisted: true }); render('#mo-hide-pattern'); }
    else if (button.id === 'mo-check') check();
    else if (button.id === 'mo-undo' && history.length) { cleanupDrag(); stopPlayback(); round = history.pop(); selected = null; save(); render('#mo-undo', 'Visszatettük. Próbáld ki újra!'); syncSelection(); }
  });
  root.addEventListener('keydown', event => {
    if (selected && kind === 'shapes' && playable() && ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) { event.preventDefault(); const xy = montessoriBoardLayout(round).pieces[selected]; remember(moveMontessoriPiece(round, selected, xy[0] + (event.key === 'ArrowLeft' ? -5 : event.key === 'ArrowRight' ? 5 : 0), xy[1] + (event.key === 'ArrowUp' ? -5 : event.key === 'ArrowDown' ? 5 : 0))); render(`[data-mo-piece="${selected}"]`, 'Itt marad a bábu.'); }

    if (event.key === 'Escape' && round && !busy) { cleanupDrag(); selected = null; syncSelection(); setStatus('Válassz egy elemet a tálcáról!'); }
  });
  document.addEventListener('visibilitychange', () => {
    if (!active) return;
    if (document.hidden) { cleanupDrag(); cleanupAnimation(); stopPlayback(); }
    else if (round) { render(undefined, montessoriComplete(round) ? undefined : 'Folytathatod a játékot.'); syncSelection(); }
  });
  return {
    start() { active = true; root.classList.remove('has-selection'); menu(); say('montessori_menu'); },
    stop() { save(); active = false; cleanupDrag(); cleanupAnimation(); stopPlayback(); root.classList.remove('has-selection'); },
    repeat() { repeat(true); },
  };
}
