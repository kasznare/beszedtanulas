import { PUZZLE_IMAGES, PUZZLE_SIZES, normalizePuzzleOptions, buildPuzzle, placePuzzlePiece, removePuzzlePiece, isPuzzleComplete } from './puzzle-data.js';

export function setupPuzzleGame({ getOptions, setOptions, speak, stopPlayback, onComplete, onRestart = () => {} }) {
  const root = document.querySelector('#puzzle');
  let active = false, puzzle, picture, placed, selected = null, hint = false, finished = false;
  let drag = null, blockClickUntil = 0, blockedClick = null;
  const playable = () => active && !finished && !document.hidden;
  const say = id => { if (active && !document.hidden) speak(id); };
  const crop = piece => `background-image:url('${picture.image}');background-size:${puzzle.columns * 100}% ${puzzle.rows * 100}%;background-position:${piece.x}% ${piece.y}%;`;

  function status(message) { root.querySelector('#puzzle-status').textContent = message; }
  function focus(selector) { root.querySelector(selector)?.focus({ preventScroll: true }); }
  function syncSelection() {
    root.querySelectorAll('[data-piece]').forEach(button => {
      const chosen = Number(button.dataset.piece) === selected;
      button.classList.toggle('is-selected', chosen);
      button.setAttribute('aria-pressed', String(chosen));
    });
    root.querySelector('.puzzle-board').classList.toggle('has-selection', selected !== null);
    root.querySelector('#puzzle-return').disabled = selected === null || ![...placed.values()].includes(selected);
  }

  function render(focusSelector) {
    root.innerHTML = `<div class="puzzle-heading"><h2>${picture.name}</h2><p id="puzzle-instructions">Koppints egy darabra, majd egy mezőre — vagy húzd oda! Később is átteheted.</p></div>
      <div class="puzzle-pictures" role="group" aria-label="Válassz puzzle képet">${PUZZLE_IMAGES.map(image => `<button data-puzzle-image="${image.id}" aria-pressed="${image.id === picture.id}" aria-label="${image.name} kirakó"><img src="${image.image}" alt="" draggable="false" width="1536" height="1024"><span>${image.name}</span></button>`).join('')}</div>
      <div class="puzzle-toolbar"><div class="puzzle-sizes" role="group" aria-label="Képdarabok száma">${PUZZLE_SIZES.map(count => `<button data-puzzle-size="${count}" aria-pressed="${count === puzzle.pieces.length}">${count} darab</button>`).join('')}</div><span class="puzzle-progress" role="status">${placed.size} / ${puzzle.pieces.length} lerakva</span></div>
      <div class="puzzle-workspace" style="--puzzle-cols:${puzzle.columns};--piece-ratio:${3 / puzzle.columns}">
        <div class="puzzle-board ${hint ? 'has-hint' : ''} ${finished ? 'is-complete' : ''} ${selected !== null ? 'has-selection' : ''}" role="group" aria-label="${picture.name}, ide kerülnek a képdarabok" aria-describedby="puzzle-instructions"><img class="puzzle-reference" src="${picture.image}" alt="" draggable="false">${puzzle.pieces.map(slot => {
          const id = placed.get(slot.id), occupied = id !== undefined;
          return `<button class="puzzle-slot ${occupied ? `is-placed puzzle-piece ${selected === id ? 'is-selected' : ''}` : ''}" data-slot="${slot.id}" ${occupied && !finished ? `data-piece="${id}" aria-pressed="${selected === id}"` : ''} aria-label="${slot.row + 1}. sor, ${slot.column + 1}. hely${occupied ? `, ${id + 1}. képdarab${finished ? ', kész' : ', áthelyezhető'}` : ', üres'}" ${finished ? 'disabled' : ''} ${occupied ? `style="${crop(puzzle.pieces[id])}" draggable="false"` : ''}><span aria-hidden="true">${occupied ? '' : '✧'}</span></button>`;
        }).join('')}</div>
        <div class="puzzle-tray-wrap"><h3>${finished ? 'Minden darab a helyén!' : 'Képdarabok'}</h3><div class="puzzle-tray" role="group" aria-label="Válassz egy képdarabot">${puzzle.order.filter(id => ![...placed.values()].includes(id)).map((id, index) => `<button class="puzzle-piece ${selected === id ? 'is-selected' : ''}" data-piece="${id}" aria-label="${id + 1}. képdarab, a tálcán" aria-pressed="${selected === id}" style="${crop(puzzle.pieces[id])}" draggable="false"></button>`).join('')}${finished ? '<span class="puzzle-finished" aria-hidden="true">🌟</span>' : ''}</div></div>
      </div>
      <p id="puzzle-status" class="puzzle-status" role="status" aria-live="polite">${finished ? 'Elkészült a kép! Szép munka!' : selected !== null ? 'Válassz egy mezőt! A foglalt helyen a darabok cserélődnek.' : 'Válassz egy képdarabot!'}</p>
      <div class="puzzle-actions"><button id="puzzle-return" ${selected === null || ![...placed.values()].includes(selected) || finished ? 'disabled' : ''}>↶ Vissza a tálcára</button><button id="puzzle-hint" aria-pressed="${hint}" ${finished ? 'disabled' : ''}>${hint ? '🙈 Minta elrejtése' : '👀 Mutasd a képet!'}</button><button id="puzzle-restart">↻ Újrakezdem</button></div>`;
    if (focusSelector) focus(focusSelector);
  }

  function start() {
    onRestart(); cleanupDrag(); stopPlayback();
    const options = normalizePuzzleOptions(getOptions());
    picture = PUZZLE_IMAGES.find(image => image.id === options.puzzleImage);
    puzzle = buildPuzzle(options.puzzlePieces);
    active = true; placed = new Map(); selected = null; hint = false; finished = false; blockClickUntil = 0;
    render(); say('puzzle_start');
  }
  function select(id) {
    if (!playable() || !puzzle.pieces.some(piece => piece.id === id)) return;
    selected = selected === id ? null : id;
    syncSelection();
    status(selected === null ? 'Válassz egy képdarabot!' : 'Válassz egy mezőt! A foglalt helyen a darabok cserélődnek.');
  }
  function place(id) {
    if (!playable()) return;
    if (selected === null) { status('Előbb válassz egy képdarabot!'); return; }
    const pieceId = selected;
    if (!placePuzzlePiece(puzzle, placed, pieceId, id)) {
      selected = null; syncSelection(); status('Válassz egy képdarabot!'); return;
    }
    selected = null;
    finished = isPuzzleComplete(puzzle, placed);
    render(finished ? '#puzzle-restart' : `[data-piece="${pieceId}"]`);
    if (finished) onComplete(puzzle.pieces.length);
    else {
      status(placed.size === puzzle.pieces.length ? 'Minden darab a táblán van. Nézd meg a képet, és cseréld meg, amit szeretnél!' : 'Letetted a darabot. Bármikor átteheted máshová!');
      // This recording describes a correct position, so only play it there.
      if (pieceId === id) say('puzzle_place'); else stopPlayback();
    }
  }
  function returnToTray() {
    if (!playable() || selected === null) return;
    const id = selected;
    if (!removePuzzlePiece(puzzle, placed, id)) return;
    selected = null; stopPlayback(); render(`[data-piece="${id}"]`);
    status('A darab újra a tálcán van. Válassz neki egy másik helyet!');
  }
  function activatePiece(button) {
    const id = Number(button.dataset.piece);
    if (button.dataset.slot !== undefined && selected !== null && selected !== id) place(Number(button.dataset.slot));
    else select(id);
  }

  function cleanupDrag() {
    if (!drag) return;
    const previous = drag; drag = null;
    previous.ghost?.remove();
    previous.button.classList.remove('is-dragging');
    root.querySelector('.is-drop-target')?.classList.remove('is-drop-target');
    if (root.hasPointerCapture(previous.pointerId)) root.releasePointerCapture(previous.pointerId);
  }
  root.addEventListener('pointerdown', event => {
    const button = event.target.closest('[data-piece]');
    if (!button || !playable() || !event.isPrimary || event.button !== 0) return;
    cleanupDrag(); blockClickUntil = 0;
    drag = { button, id: Number(button.dataset.piece), pointerId: event.pointerId, x: event.clientX, y: event.clientY };
    root.setPointerCapture(event.pointerId);
  });
  root.addEventListener('pointermove', event => {
    if (!drag || drag.pointerId !== event.pointerId || !playable()) return;
    if (!drag.ghost && Math.hypot(event.clientX - drag.x, event.clientY - drag.y) < 8) return;
    if (!drag.ghost) {
      selected = drag.id; syncSelection();
      const rect = drag.button.getBoundingClientRect();
      drag.ghost = document.createElement('div');
      drag.ghost.className = 'puzzle-drag-preview';
      drag.ghost.setAttribute('aria-hidden', 'true');
      drag.ghost.style.cssText = `${crop(puzzle.pieces[drag.id])}width:${rect.width}px;height:${rect.height}px;`;
      document.body.appendChild(drag.ghost);
      drag.width = rect.width; drag.height = rect.height;
      drag.button.classList.add('is-dragging');
    }
    event.preventDefault();
    drag.ghost.style.left = `${event.clientX - drag.width / 2}px`;
    drag.ghost.style.top = `${event.clientY - drag.height / 2}px`;
    root.querySelector('.is-drop-target')?.classList.remove('is-drop-target');
    const target = document.elementFromPoint(event.clientX, event.clientY)?.closest('[data-slot]:not(:disabled), .puzzle-tray');
    if (target && root.contains(target)) target.classList.add('is-drop-target');
  });
  root.addEventListener('pointerup', event => {
    if (!drag || drag.pointerId !== event.pointerId) return;
    const wasDragged = Boolean(drag.ghost), pieceId = drag.id, button = drag.button;
    const target = document.elementFromPoint(event.clientX, event.clientY);
    const slot = document.elementFromPoint(event.clientX, event.clientY)?.closest('[data-slot]');
    cleanupDrag();
    // Capturing on the stable root also routes ordinary taps here.
    blockClickUntil = performance.now() + 350; blockedClick = { pieceId, slotId: button.dataset.slot };
    if (!playable()) return;
    if (wasDragged) {
      if (slot && root.contains(slot)) place(Number(slot.dataset.slot));
      else if (target?.closest('.puzzle-tray') && root.contains(target)) returnToTray();
      else { status('A darab itt vár. Koppints a helyére, vagy húzd oda!'); focus(`[data-piece="${pieceId}"]`); }
    } else { activatePiece(button); focus(`[data-piece="${pieceId}"]`); }
  });
  root.addEventListener('pointercancel', cleanupDrag);
  root.addEventListener('lostpointercapture', cleanupDrag);
  root.addEventListener('click', event => {
    if (!active || document.hidden) return;
    const button = event.target.closest('button');
    if (!button || button.disabled) return;
    if (blockedClick && performance.now() < blockClickUntil && event.detail > 0 && (Number(button.dataset.piece) === blockedClick.pieceId || (blockedClick.slotId !== undefined && button.dataset.slot === blockedClick.slotId))) return;
    if (button.dataset.piece !== undefined) activatePiece(button);
    else if (button.dataset.slot !== undefined) place(Number(button.dataset.slot));
    else if (button.dataset.puzzleImage) {
      setOptions({ ...normalizePuzzleOptions(getOptions()), puzzleImage: button.dataset.puzzleImage });
      start(); focus(`[data-puzzle-image="${button.dataset.puzzleImage}"]`);
    } else if (button.dataset.puzzleSize) {
      setOptions({ ...normalizePuzzleOptions(getOptions()), puzzlePieces: Number(button.dataset.puzzleSize) });
      start(); focus(`[data-puzzle-size="${button.dataset.puzzleSize}"]`);
    } else if (button.id === 'puzzle-restart') { start(); focus('#puzzle-restart'); }
    else if (button.id === 'puzzle-return') returnToTray();
    else if (button.id === 'puzzle-hint' && !finished) {
      hint = !hint; render('#puzzle-hint');
      if (hint) { status('A halvány kép segít megtalálni a darabok helyét.'); say('puzzle_hint'); }
      else stopPlayback();
    }
  });
  root.addEventListener('keydown', event => {
    if (event.key === 'Escape' && playable()) {
      const id = selected; cleanupDrag(); selected = null; syncSelection();
      status('Válassz egy képdarabot!'); focus(`[data-piece="${id}"]`);
    }
  });
  document.addEventListener('visibilitychange', () => {
    if (active && document.hidden) { cleanupDrag(); stopPlayback(); }
  });
  return { start, stop() { active = false; cleanupDrag(); stopPlayback(); }, repeat() { say(finished ? 'puzzle_done' : hint ? 'puzzle_hint' : 'puzzle_start'); } };
}
