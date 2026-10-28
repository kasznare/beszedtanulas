import { PUZZLE_IMAGES, PUZZLE_SIZES, normalizePuzzleOptions, normalizePuzzleBoard, buildPuzzle, placePuzzlePiece, removePuzzlePiece, isPuzzleComplete, puzzlePieceOutline, puzzlePieceCrop, puzzleFits, puzzleStars, nextPuzzleChoice } from './puzzle-data.js';

export function setupPuzzleGame({ effect = () => {}, getOptions, setOptions, getProgress, setProgress, speak, stopPlayback, onComplete, onRestart = () => {} }) {
  const root = document.querySelector('#puzzle');
  let active = false, puzzle, picture, placed, selected = null, hint = false, finished = false;
  let strict = false, wrong = 0, hinted = false, bounced = null, reviewing = false;
  let drag = null, blockClickUntil = 0, blockedClick = null;
  let chooserOpen = false, localBoards = {};
  const boardKey = () => `${picture.id}:${puzzle.pieces.length}`;
  const boards = () => getProgress?.() ?? localBoards;
  function savedBoard() { return normalizePuzzleBoard(boards()?.[boardKey()], picture.id, puzzle.pieces.length); }
  function saveBoard(rewarded = false, solved = savedBoard()?.solved ?? 0) {
    const current = boards();
    const next = { ...(current && typeof current === 'object' ? current : {}), [boardKey()]: {
      imageId: picture.id, pieceCount: puzzle.pieces.length, order: [...puzzle.order], placed: [...placed].map(([slot, piece]) => [slot, piece]), rewarded, solved,
    } };
    if (setProgress) setProgress(next); else localBoards = next;
  }
  const solvedAt = (imageId, count) => normalizePuzzleBoard(boards()?.[`${imageId}:${count}`], imageId, count)?.solved ?? 0;
  const playable = () => active && !finished && !document.hidden;
  const say = id => { if (active && !document.hidden) speak(id); };
  // Pieces and empty sockets share one jigsaw outline; flat sides mark the picture's edges and corners.
  const shape = (piece, socket = false) => `<span class="puzzle-shape-wrap" aria-hidden="true"><span class="${socket ? `puzzle-socket ${(piece.row + piece.column) % 2 ? 'is-alt' : ''}` : 'puzzle-shape'}" style="clip-path:${puzzlePieceOutline(piece)};-webkit-clip-path:${puzzlePieceOutline(piece)};${socket ? '' : `background-image:url('${picture.image}');${puzzlePieceCrop(puzzle, piece)}`}"></span></span>`;
  const wrongIds = () => new Set([...placed].filter(([slot, piece]) => slot !== piece).map(([, piece]) => piece));

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
    const count = puzzle.pieces.length, more = nextPuzzleChoice(picture.id, count, 'more'), marked = reviewing ? wrongIds() : new Set();
    root.dataset.pieces = count; root.dataset.strict = String(strict);
    root.innerHTML = `<div class="puzzle-heading"><p id="puzzle-instructions">${strict ? 'Minden darabnak egy helye van. Figyeld a széleket!' : 'Koppints egy darabra, majd egy mezőre — vagy húzd oda!'}</p></div>
      <div class="puzzle-chooser"><div class="puzzle-toolbar"><button id="puzzle-choose" aria-expanded="${chooserOpen}" aria-controls="puzzle-choices">🖼️ ${picture.name}, ${count} darab</button><span class="puzzle-progress" role="status">${placed.size} / ${count} lerakva</span><button id="puzzle-strict" aria-pressed="${strict}" ${finished ? 'disabled' : ''}><span aria-hidden="true">🎯</span> Csak a jó helyre</button></div><div id="puzzle-choices" ${chooserOpen ? '' : 'hidden'}><div class="puzzle-pictures" role="group" aria-label="Válassz puzzle képet">${PUZZLE_IMAGES.map(image => { const done = solvedAt(image.id, count) > 0; return `<button data-puzzle-image="${image.id}" aria-pressed="${image.id === picture.id}" aria-label="${image.name} kirakó${done ? `, ${count} darabbal már kész` : ''}"><img src="${image.image}" alt="" draggable="false" width="600" height="400"><span>${image.name}</span>${done ? '<b class="puzzle-solved" aria-hidden="true">✓</b>' : ''}</button>`; }).join('')}</div><div class="puzzle-sizes" role="group" aria-label="Képdarabok száma">${PUZZLE_SIZES.map(size => `<button data-puzzle-size="${size}" aria-pressed="${size === count}">${size} darab</button>`).join('')}</div></div></div>
      <div class="puzzle-workspace" style="--puzzle-cols:${puzzle.columns};--puzzle-rows:${puzzle.rows};--piece-ratio:${3 * puzzle.rows / (2 * puzzle.columns)}">
        <div class="puzzle-board ${hint ? 'has-hint' : ''} ${finished ? 'is-complete' : ''} ${selected !== null ? 'has-selection' : ''}" role="group" aria-label="${picture.name}, ide kerülnek a képdarabok" aria-describedby="puzzle-instructions"><img class="puzzle-reference" src="${picture.image}" alt="" draggable="false">${puzzle.pieces.map(slot => {
          const id = placed.get(slot.id), occupied = id !== undefined, movable = occupied && !finished && !strict;
          return `<button class="puzzle-slot ${occupied ? `is-placed ${movable ? 'puzzle-piece' : ''} ${selected === id ? 'is-selected' : ''} ${marked.has(id) ? 'is-wrong' : ''}` : ''}" data-slot="${slot.id}" ${movable ? `data-piece="${id}" aria-pressed="${selected === id}"` : ''} aria-label="${slot.row + 1}. sor, ${slot.column + 1}. hely${occupied ? `, ${id + 1}. képdarab${finished ? ', kész' : movable ? ', áthelyezhető' : ', a helyén'}` : ', üres'}" ${finished ? 'disabled' : ''} draggable="false">${occupied ? shape(puzzle.pieces[id]) : shape(slot, true)}</button>`;
        }).join('')}</div>
        <div class="puzzle-tray-wrap"><h3>${finished ? 'Minden darab a helyén!' : 'Képdarabok'}</h3><div class="puzzle-tray" role="group" aria-label="Válassz egy képdarabot">${puzzle.order.filter(id => ![...placed.values()].includes(id)).map(id => `<button class="puzzle-piece ${selected === id ? 'is-selected' : ''} ${bounced === id ? 'is-bounced' : ''}" data-piece="${id}" aria-label="${id + 1}. képdarab, a tálcán" aria-pressed="${selected === id}" draggable="false">${shape(puzzle.pieces[id])}</button>`).join('')}${finished ? '<span class="puzzle-finished" aria-hidden="true">🌟</span>' : ''}</div></div>
      </div>
      <p id="puzzle-status" class="puzzle-status" role="status" aria-live="polite">${finished ? 'Elkészült a kép! Szép munka!' : selected !== null ? 'Válassz egy mezőt! A foglalt helyen a darabok cserélődnek.' : 'Válassz egy képdarabot!'}</p>
      <div class="puzzle-actions">${finished ? `<button id="puzzle-next-image" class="puzzle-primary">Következő kép →</button>${more ? `<button id="puzzle-more">➕ Több darab (${more.puzzlePieces})</button>` : ''}` : `<button id="puzzle-return" ${selected === null || ![...placed.values()].includes(selected) ? 'disabled' : ''}>↶ Vissza a tálcára</button><button id="puzzle-hint" aria-pressed="${hint}">${hint ? '🙈 Minta elrejtése' : '👀 Mutasd a képet!'}</button>`}<button id="puzzle-restart">↻ Újrakezdem</button></div>`;
    if (focusSelector) focus(focusSelector);
  }

  function start() {
    onRestart(); cleanupDrag(); stopPlayback();
    const options = normalizePuzzleOptions(getOptions());
    picture = PUZZLE_IMAGES.find(image => image.id === options.puzzleImage);
    puzzle = buildPuzzle(options.puzzlePieces);
    strict = options.puzzleStrict;
    active = true; selected = null; hint = false; blockClickUntil = 0; wrong = 0; hinted = false; bounced = null; reviewing = false;
    const saved = savedBoard();
    placed = new Map(saved?.placed ?? []);
    // A finished picture is not shown again as finished: coming back means a fresh shuffle of the same picture.
    const resume = Boolean(saved) && !isPuzzleComplete(puzzle, placed);
    if (resume) puzzle.order = saved.order;
    else placed = new Map();
    if (strict) for (const [slot, piece] of [...placed]) if (slot !== piece) placed.delete(slot);
    finished = false;
    saveBoard(resume && saved.rewarded, saved?.solved ?? 0);
    render(); say('puzzle_start');
  }
  function restart() {
    if (!puzzle || !picture) { start(); return; }
    puzzle.order = buildPuzzle(puzzle.pieces.length).order;
    placed = new Map(); finished = false; saveBoard(false);
    start();
  }
  // Moves on after a finished picture: the next picture at this size, or the same picture in more pieces.
  function choose(mode = 'image') {
    const options = normalizePuzzleOptions(getOptions()), next = nextPuzzleChoice(options.puzzleImage, options.puzzlePieces, mode);
    if (!next) return false;
    setOptions({ ...options, ...next });
    return true;
  }
  function moreButton() {
    const options = normalizePuzzleOptions(getOptions()), more = nextPuzzleChoice(options.puzzleImage, options.puzzlePieces, 'more');
    return more ? `<button id="round-puzzle-more" class="secondary round-puzzle-more">➕ Több darab (${more.puzzlePieces})</button>` : '';
  }
  function select(id, audible = true) {
    if (!playable() || !puzzle.pieces.some(piece => piece.id === id)) return;
    selected = selected === id ? null : id; if (audible) effect('grab');
    if (bounced !== null) { bounced = null; root.querySelector('.is-bounced')?.classList.remove('is-bounced'); }
    syncSelection();
    status(selected === null ? 'Válassz egy képdarabot!' : 'Válassz egy mezőt! A foglalt helyen a darabok cserélődnek.');
  }
  function place(id) {
    if (!playable()) return;
    if (selected === null) { status('Előbb válassz egy képdarabot!'); return; }
    const pieceId = selected;
    if (!puzzleFits(strict, pieceId, id)) {
      // "Csak a jó helyre": the piece bounces back to where it was and the child hears why.
      wrong++; selected = null; bounced = [...placed.values()].includes(pieceId) ? null : pieceId;
      effect('retry'); stopPlayback(); render(`[data-piece="${pieceId}"]`);
      status('Ez a darab másik helyre illik. Figyeld a széleit és a képet!'); say('puzzle_retry');
      return;
    }
    if (!placePuzzlePiece(puzzle, placed, pieceId, id)) {
      selected = null; syncSelection(); status('Válassz egy képdarabot!'); return;
    }
    if (pieceId !== id) wrong++;
    effect('snap');
    selected = null; bounced = null;
    finished = isPuzzleComplete(puzzle, placed);
    const previous = savedBoard(), wasRewarded = Boolean(previous?.rewarded);
    const full = placed.size === puzzle.pieces.length, becameFull = full && !reviewing;
    reviewing = full && !finished;
    saveBoard(finished || wasRewarded, (previous?.solved ?? 0) + (finished && !wasRewarded ? 1 : 0));
    render(finished ? '#puzzle-next-image' : `[data-slot="${id}"]`);
    if (finished && !wasRewarded) onComplete(puzzleStars({ pieces: puzzle.pieces.length, wrong, hinted }));
    else if (reviewing) {
      // A full but wrong board is no longer silent: the misplaced pieces are marked and can be swapped.
      status('Minden darab a táblán van, de néhány máshová illik. A szaggatott szélűeket cseréld meg!');
      if (becameFull) say('puzzle_retry'); else stopPlayback();
    } else {
      status(strict ? 'A darab a helyén van!' : 'Letetted a darabot. Bármikor átteheted máshová!');
      // This recording describes a correct position, so only play it there.
      if (pieceId === id) say('puzzle_place'); else stopPlayback();
    }
  }
  function returnToTray() {
    if (!playable() || selected === null) return;
    const id = selected;
    if (!removePuzzlePiece(puzzle, placed, id)) return;
    effect('card'); reviewing = false;
    saveBoard(Boolean(savedBoard()?.rewarded));
    selected = null; stopPlayback(); render(`[data-piece="${id}"]`);
    status('A darab újra a tálcán van. Válassz neki egy másik helyet!');
  }
  function activatePiece(button, audible = true) {
    const id = Number(button.dataset.piece);
    if (button.dataset.slot !== undefined && selected !== null && selected !== id) place(Number(button.dataset.slot));
    else select(id, audible);
  }
  function toggleStrict() {
    if (!playable()) return;
    strict = !strict;
    setOptions?.({ ...normalizePuzzleOptions(getOptions()), puzzleStrict: strict });
    if (strict) for (const [slot, piece] of [...placed]) if (slot !== piece) placed.delete(slot);
    selected = null; reviewing = false; bounced = null; saveBoard(Boolean(savedBoard()?.rewarded));
    stopPlayback(); render('#puzzle-strict');
    status(strict ? 'Most csak a jó helyre kerülhet darab. A rossz helyről visszaugrik.' : 'Most bárhová leteheted a darabokat, és később átrendezheted.');
    if (strict) say('puzzle_strict_on');
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
    root.setPointerCapture(event.pointerId); effect('grab');
  });
  root.addEventListener('pointermove', event => {
    if (!drag || drag.pointerId !== event.pointerId || !playable()) return;
    if (!drag.ghost && Math.hypot(event.clientX - drag.x, event.clientY - drag.y) < 8) return;
    if (!drag.ghost) {
      selected = drag.id; syncSelection();
      const rect = drag.button.getBoundingClientRect();
      drag.ghost = document.createElement('div');
      // A board piece's outline reaches beyond its cell, exactly as it does on the board.
      drag.ghost.className = `puzzle-drag-preview ${drag.button.dataset.slot !== undefined ? 'from-board' : ''}`;
      drag.ghost.setAttribute('aria-hidden', 'true');
      drag.ghost.style.cssText = `width:${rect.width}px;height:${rect.height}px;`;
      drag.ghost.innerHTML = shape(puzzle.pieces[drag.id]);
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
    const slot = target?.closest('[data-slot]');
    cleanupDrag();
    // Capturing on the stable root also routes ordinary taps here.
    blockClickUntil = performance.now() + 350; blockedClick = { pieceId, slotId: button.dataset.slot };
    if (!playable()) return;
    if (wasDragged) {
      if (slot && root.contains(slot)) place(Number(slot.dataset.slot));
      else if (target?.closest('.puzzle-tray') && root.contains(target)) returnToTray();
      else { effect('card'); status('A darab itt vár. Koppints a helyére, vagy húzd oda!'); focus(`[data-piece="${pieceId}"]`); }
    } else { activatePiece(button, false); focus(`[data-piece="${pieceId}"]`); }
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
    else if (button.id === 'puzzle-choose') { chooserOpen = !chooserOpen; render('#puzzle-choose'); }
    else if (button.dataset.puzzleImage) {
      setOptions({ ...normalizePuzzleOptions(getOptions()), puzzleImage: button.dataset.puzzleImage });
      start(); focus(`[data-puzzle-image="${button.dataset.puzzleImage}"]`);
    } else if (button.dataset.puzzleSize) {
      setOptions({ ...normalizePuzzleOptions(getOptions()), puzzlePieces: Number(button.dataset.puzzleSize) });
      start(); focus(`[data-puzzle-size="${button.dataset.puzzleSize}"]`);
    } else if (button.id === 'puzzle-restart') { restart(); focus('#puzzle-restart'); }
    else if (button.id === 'puzzle-next-image' || button.id === 'puzzle-more') {
      if (choose(button.id === 'puzzle-more' ? 'more' : 'image')) { start(); focus('#puzzle-choose'); }
    } else if (button.id === 'puzzle-strict') toggleStrict();
    else if (button.id === 'puzzle-return') returnToTray();
    else if (button.id === 'puzzle-hint' && !finished) {
      hint = !hint; if (hint) hinted = true; render('#puzzle-hint');
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
  return { start, restart, choose, moreButton, stop() { active = false; cleanupDrag(); stopPlayback(); }, repeat() { say(finished ? 'puzzle_done' : hint ? 'puzzle_hint' : 'puzzle_start'); } };
}
