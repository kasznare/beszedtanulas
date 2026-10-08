import { PUZZLE_IMAGES, PUZZLE_SIZES, normalizePuzzleOptions, buildPuzzle, placePuzzlePiece } from './puzzle-data.js';

export function setupPuzzleGame({ getOptions, setOptions, speak, stopPlayback, onComplete }) {
  const root = document.querySelector('#puzzle');
  let active = false, puzzle, picture, placed, selected = null, hint = false, finished = false;
  let drag = null, blockClickUntil = 0, blockedPieceId = null;
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
  }

  function render(focusSelector) {
    root.innerHTML = `<div class="puzzle-heading"><h2>${picture.name}</h2><p id="puzzle-instructions">Koppints egy darabra, majd a helyére — vagy húzd oda!</p></div>
      <div class="puzzle-pictures" role="group" aria-label="Válassz puzzle képet">${PUZZLE_IMAGES.map(image => `<button data-puzzle-image="${image.id}" aria-pressed="${image.id === picture.id}" aria-label="${image.name} kirakó"><img src="${image.image}" alt="" draggable="false" width="1536" height="1024"><span>${image.name}</span></button>`).join('')}</div>
      <div class="puzzle-toolbar"><div class="puzzle-sizes" role="group" aria-label="Képdarabok száma">${PUZZLE_SIZES.map(count => `<button data-puzzle-size="${count}" aria-pressed="${count === puzzle.pieces.length}">${count} darab</button>`).join('')}</div><span class="puzzle-progress" role="status">${placed.size} / ${puzzle.pieces.length} a helyén</span></div>
      <div class="puzzle-workspace" style="--puzzle-cols:${puzzle.columns};--piece-ratio:${3 / puzzle.columns}">
        <div class="puzzle-board ${hint ? 'has-hint' : ''} ${finished ? 'is-complete' : ''} ${selected !== null ? 'has-selection' : ''}" role="group" aria-label="${picture.name}, ide kerülnek a képdarabok" aria-describedby="puzzle-instructions"><img class="puzzle-reference" src="${picture.image}" alt="" draggable="false">${puzzle.pieces.map(piece => `<button class="puzzle-slot ${placed.has(piece.id) ? 'is-placed' : ''}" data-slot="${piece.id}" aria-label="${piece.row + 1}. sor, ${piece.column + 1}. hely${placed.has(piece.id) ? ', kész' : ', üres'}" ${placed.has(piece.id) ? `disabled style="${crop(piece)}"` : ''}><span aria-hidden="true">${placed.has(piece.id) ? '' : '✧'}</span></button>`).join('')}</div>
        <div class="puzzle-tray-wrap"><h3>${finished ? 'Minden darab a helyén!' : 'Képdarabok'}</h3><div class="puzzle-tray" role="group" aria-label="Válassz egy képdarabot">${puzzle.order.filter(id => !placed.has(id)).map((id, index) => `<button class="puzzle-piece ${selected === id ? 'is-selected' : ''}" data-piece="${id}" aria-label="${index + 1}. képdarab" aria-pressed="${selected === id}" style="${crop(puzzle.pieces[id])}" draggable="false"></button>`).join('')}${finished ? '<span class="puzzle-finished" aria-hidden="true">🌟</span>' : ''}</div></div>
      </div>
      <p id="puzzle-status" class="puzzle-status" role="status" aria-live="polite">${finished ? 'Elkészült a kép! Szép munka!' : selected !== null ? 'Hová illik ez a darab? Koppints egy üres helyre!' : 'Válassz egy képdarabot!'}</p>
      <div class="puzzle-actions"><button id="puzzle-hint" aria-pressed="${hint}" ${finished ? 'disabled' : ''}>${hint ? '🙈 Minta elrejtése' : '👀 Mutasd a képet!'}</button><button id="puzzle-restart">↻ Újrakezdem</button></div>`;
    if (focusSelector) focus(focusSelector);
  }

  function start() {
    cleanupDrag(); stopPlayback();
    const options = normalizePuzzleOptions(getOptions());
    picture = PUZZLE_IMAGES.find(image => image.id === options.puzzleImage);
    puzzle = buildPuzzle(options.puzzlePieces);
    active = true; placed = new Set(); selected = null; hint = false; finished = false; blockClickUntil = 0;
    render(); say('puzzle_start');
  }
  function select(id) {
    if (!playable() || !puzzle.pieces.some(piece => piece.id === id) || placed.has(id)) return;
    selected = selected === id ? null : id;
    syncSelection();
    status(selected === null ? 'Válassz egy képdarabot!' : 'Hová illik ez a darab? Koppints egy üres helyre!');
  }
  function place(id) {
    if (!playable()) return;
    if (selected === null) { status('Előbb válassz egy képdarabot!'); return; }
    if (placed.has(id)) return;
    if (!placePuzzlePiece(puzzle, placed, selected, id)) {
      status('Ez a darab máshová illik. Próbáld egy másik helyen!');
      const slot = root.querySelector(`[data-slot="${id}"]`);
      slot?.classList.remove('is-retry');
      if (slot) { void slot.offsetWidth; slot.classList.add('is-retry'); }
      say('puzzle_retry'); return;
    }
    selected = null;
    finished = placed.size === puzzle.pieces.length;
    render(finished ? '#puzzle-restart' : '[data-piece]');
    if (finished) onComplete(puzzle.pieces.length);
    else { status('A darab a helyén van! Válassz egy másikat!'); say('puzzle_place'); }
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
    const slot = document.elementFromPoint(event.clientX, event.clientY)?.closest('[data-slot]:not(:disabled)');
    if (slot && root.contains(slot)) slot.classList.add('is-drop-target');
  });
  root.addEventListener('pointerup', event => {
    if (!drag || drag.pointerId !== event.pointerId) return;
    const wasDragged = Boolean(drag.ghost), pieceId = drag.id;
    const slot = document.elementFromPoint(event.clientX, event.clientY)?.closest('[data-slot]');
    cleanupDrag();
    // Capturing on the stable root also routes ordinary taps here.
    blockClickUntil = performance.now() + 350; blockedPieceId = pieceId;
    if (!playable()) return;
    if (wasDragged) {
      if (slot && root.contains(slot)) place(Number(slot.dataset.slot));
      else { status('A darab itt vár. Koppints a helyére, vagy húzd oda!'); focus(`[data-piece="${pieceId}"]`); }
    } else { select(pieceId); focus(`[data-piece="${pieceId}"]`); }
  });
  root.addEventListener('pointercancel', cleanupDrag);
  root.addEventListener('lostpointercapture', cleanupDrag);
  root.addEventListener('click', event => {
    if (!active || document.hidden) return;
    const button = event.target.closest('button');
    if (!button || button.disabled) return;
    if (button.dataset.piece !== undefined && Number(button.dataset.piece) === blockedPieceId && performance.now() < blockClickUntil && event.detail > 0) return;
    if (button.dataset.piece !== undefined) select(Number(button.dataset.piece));
    else if (button.dataset.slot !== undefined) place(Number(button.dataset.slot));
    else if (button.dataset.puzzleImage) {
      setOptions({ ...normalizePuzzleOptions(getOptions()), puzzleImage: button.dataset.puzzleImage });
      start(); focus(`[data-puzzle-image="${button.dataset.puzzleImage}"]`);
    } else if (button.dataset.puzzleSize) {
      setOptions({ ...normalizePuzzleOptions(getOptions()), puzzlePieces: Number(button.dataset.puzzleSize) });
      start(); focus(`[data-puzzle-size="${button.dataset.puzzleSize}"]`);
    } else if (button.id === 'puzzle-restart') { start(); focus('#puzzle-restart'); }
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
