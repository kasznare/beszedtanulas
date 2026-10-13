import { CHESS_PIECES, CHESS_CLIPS, CHESS_LEVELS, chessPuzzlesForLevel, chessPuzzleMovers, evaluateChessPuzzle, moveChessPuzzlePiece, normalizeChessOptions, squareName, legalMoves, moveChessPiece, buildChessLesson, buildChessPuzzle } from './chess-data.js';
import { chessArt } from './chess-art.js';

const STORAGE_KEY = 'beszedtanulas.chess.v1';
export function setupChessGame({ effect = () => {}, speak, stopPlayback, onComplete, onRestart = () => {} }) {
  const root = document.querySelector('#chess');
  let options;
  try { options = normalizeChessOptions(JSON.parse(localStorage.getItem(STORAGE_KEY))); }
  catch { options = normalizeChessOptions(); }
  let active = false, board = [], selected = null, goals = [], collected = 0, puzzleIndex = 0, puzzle;
  let hint = false, solved = false, history = [], message = '', lastMove = null;
  const playable = () => active && !document.hidden && !solved;
  const pieceName = type => CHESS_PIECES.find(piece => piece.id === type)?.name || '';
  const say = (id, force = false) => { if (active && !document.hidden) speak(id, force); };
  const remember = () => { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(options)); } catch { /* Memory-only play remains available. */ } };
  const goal = () => options.mode === 'puzzles' ? puzzle.goal : goals[collected];
  const primary = () => options.mode === 'puzzles' ? board.find(piece => piece.id === puzzle.from)?.square : board.find(piece => piece.color === 'white')?.square;
  const puzzleState = () => evaluateChessPuzzle(puzzle, board, history.length);
  const instruction = () => options.mode === 'puzzles' ? CHESS_CLIPS[puzzle.voice]
    : options.mode === 'stars' ? 'Vidd a figurát a csillagra! Több lépéssel is eljuthatsz oda.' : 'Koppints a figurára, aztán egy pöttyös mezőre!';

  function reset(focusSelector) {
    onRestart(); stopPlayback();
    const lesson = buildChessLesson(options.piece);
    puzzle = buildChessPuzzle(puzzleIndex, options.level);
    board = options.mode === 'puzzles' ? puzzle.board : lesson.board;
    goals = lesson.goals; collected = 0; solved = false; history = []; lastMove = null;
    selected = options.mode === 'explore' ? primary() : null;
    hint = options.mode === 'explore'; message = instruction();
    render(focusSelector);
    say(options.mode === 'puzzles' ? puzzle.voice : options.mode === 'stars' ? 'chess_stars' : `chess_${options.piece}`);
  }

  function render(focusSelector) {
    const type = options.mode === 'puzzles' ? board.find(piece => piece.square === (selected ?? primary()))?.type || puzzle.piece : board.find(piece => piece.color === 'white')?.type || options.piece;
    const progress = puzzleState();
    const movable = options.mode === 'puzzles' ? chessPuzzleMovers(puzzle, board) : board.filter(piece => piece.color === 'white');
    const moves = selected === null ? [] : legalMoves(board, selected);
    const target = options.mode === 'explore' || solved ? null : goal();
    const captureTargets = options.mode === 'puzzles' && !solved ? progress.capturesRemaining : [];
    const focusSquare = selected ?? primary() ?? 0;
    root.innerHTML = `<div class="chess-intro"><span class="chess-badge" aria-hidden="true">♟</span><div><h2>Sakkliget</h2><p>Figurák, kis lépések, nagy felfedezések.</p></div></div>
      <div class="chess-modes" role="group" aria-label="Sakkjáték módja">${[['explore', 'Lépések'], ['stars', 'Csillagok'], ['puzzles', 'Feladatok']].map(([mode, label]) => `<button data-chess-mode="${mode}" aria-pressed="${options.mode === mode}">${label}</button>`).join('')}</div>
      ${options.mode !== 'puzzles' ? `<div class="chess-picker" role="group" aria-label="Válassz sakkfigurát">${CHESS_PIECES.map(piece => `<button data-chess-piece="${piece.id}" aria-label="${piece.name}" aria-pressed="${options.piece === piece.id}">${chessArt(piece.id)}<span>${piece.name}</span></button>`).join('')}</div>` : `<div class="chess-levels" role="group" aria-label="Sakkfeladat nehézsége">${CHESS_LEVELS.map(level => `<button data-chess-level="${level.id}" aria-pressed="${options.level === level.id}">${level.label}</button>`).join('')}</div><div class="chess-puzzle-nav"><button id="chess-prev" aria-label="Előző sakkfeladat">←</button><span>${puzzleIndex + 1} / ${chessPuzzlesForLevel(options.level).length} · ${puzzle.title}</span><button id="chess-next" aria-label="Következő sakkfeladat">→</button></div>`}
      <div class="chess-workspace"><div class="chess-board-wrap"><div class="chess-board ${solved ? 'is-complete' : ''}" role="group" aria-label="Sakktábla, nyolcszor nyolc mező" aria-describedby="chess-task">${Array.from({ length: 64 }, (_, square) => {
        const piece = board.find(item => item.square === square), possible = hint && moves.includes(square) && !(options.mode === 'puzzles' && progress.exhausted);
        const captureTarget = captureTargets.includes(square), canMove = movable.includes(piece);
        const label = `${squareName(square)}${piece ? `, ${piece.color === 'white' ? 'világos' : 'sötét'} ${pieceName(piece.type).toLowerCase()}${piece.color === 'white' ? canMove ? ', ezzel léphetsz' : ', helyén marad' : ''}` : ', üres'}${square === target ? ', cél' : ''}${captureTarget ? ', leütendő figura' : ''}${possible ? piece ? ', üthető' : ', ide léphetsz' : ''}`;
        return `<button class="chess-square ${(Math.floor(square / 8) + square % 8) % 2 ? 'is-dark' : 'is-light'} ${square === selected ? 'is-selected' : ''} ${hint && canMove && movable.length > 1 ? 'is-movable' : ''} ${possible ? piece ? 'is-capture' : 'is-possible' : ''} ${square === target || captureTarget ? 'is-goal' : ''} ${square === lastMove?.to ? 'is-arrival' : ''}" data-chess-square="${square}" aria-label="${label}" aria-pressed="${square === selected}" tabindex="${square === focusSquare ? 0 : -1}">${piece ? chessArt(piece.type, piece.color) : ''}${square === target || captureTarget ? `<span class="chess-goal" aria-hidden="true">${captureTarget && (puzzle.maxMoves === 1 || square !== target) ? '◎' : '★'}</span>` : ''}${square % 8 === 0 ? `<span class="chess-rank" aria-hidden="true">${8 - Math.floor(square / 8)}</span>` : ''}${square >= 56 ? `<span class="chess-file" aria-hidden="true">${'abcdefgh'[square % 8]}</span>` : ''}</button>`;
      }).join('')}</div><div class="chess-legend"><span><i class="chess-dot"></i> Ide léphetsz</span><span><i class="chess-ring"></i> Itt üthetsz</span>${options.mode === 'puzzles' && puzzle.maxMoves > 1 ? '<span>★ Cél</span>' + (puzzle.requiredCaptures.length ? '<span>◎ Leütendő</span>' : '') : ''}</div></div>
      <div class="chess-guide"><div class="chess-rule"><span class="chess-eyebrow">${options.mode === 'puzzles' ? puzzle.maxMoves === 1 ? 'EGY LÉPÉSES FELADAT' : `TERVEZZ ELŐRE · LEGFELJEBB ${puzzle.maxMoves} LÉPÉS` : 'ISMERKEDJ A FIGURÁVAL'}</span><h3>${pieceName(type)}</h3><p>${CHESS_PIECES.find(piece => piece.id === type).rule}</p><button id="chess-listen">🔊 Hallgasd meg!</button></div>
      <div class="chess-task-card"><p id="chess-task">${instruction()}</p>${options.mode === 'stars' ? `<div class="chess-stars" aria-label="${collected} csillag a háromból">${[0, 1, 2].map(index => `<span class="${index < collected ? 'is-earned' : ''}" aria-hidden="true">★</span>`).join('')}</div>` : ''}${options.mode === 'puzzles' ? `${puzzle.maxMoves > 1 ? `<div class="chess-progress"><span id="chess-move-count">Lépések: ${history.length} / ${puzzle.maxMoves}</span><span class="chess-step-dots" aria-hidden="true">${Array.from({ length: puzzle.maxMoves }, (_, index) => `<i class="${index < history.length ? 'is-used' : ''}"></i>`).join('')}</span>${puzzle.requiredCaptures.length ? `<span id="chess-capture-count">◎ Ütések: ${puzzle.requiredCaptures.length - progress.capturesRemaining.length} / ${puzzle.requiredCaptures.length}</span>` : ''}</div><p class="chess-movers">Léphetsz: ${puzzle.movers.map(id => pieceName(puzzle.board.find(piece => piece.id === id).type).toLowerCase()).join(' és ')}.</p>${hint ? `<p class="chess-tip">${puzzle.tip}</p>` : ''}` : ''}<p class="chess-colors"><span class="chess-white-mark"></span> Te lépsz a világossal.<br>A sötét figurák a helyükön maradnak.</p>` : ''}</div>
      <p id="chess-status" class="chess-status" role="status" aria-live="polite">${message}</p>
      <div class="chess-actions"><button id="chess-hint" aria-pressed="${hint}" ${solved ? 'disabled' : ''}>${hint ? '🙈 Pöttyök elrejtése' : '👀 Segíts!'}</button><button id="chess-undo" ${history.length && !solved ? '' : 'disabled'}>↶ Visszavonom</button><button id="chess-restart">↻ ${solved ? 'Új kör' : 'Újrakezdem'}</button>${solved && options.mode === 'puzzles' ? '<button id="chess-another">Következő feladat →</button>' : ''}</div>
      </div></div>`;
    if (focusSelector) root.querySelector(focusSelector)?.focus({ preventScroll: true });
  }

  function status(text, voice) {
    message = text;
    root.querySelector('#chess-status').textContent = text;
    if (voice) say(voice);
  }

  function choose(square) {
    if (!playable()) return;
    if (options.mode === 'puzzles' && puzzleState().exhausted) { status(CHESS_CLIPS.chess_steps_used, 'chess_steps_used'); return; }
    const piece = board.find(item => item.square === square);
    if (piece?.color === 'white') {
      if (options.mode === 'puzzles' && !chessPuzzleMovers(puzzle, board).includes(piece)) { status('Ez a figura most a helyén marad. A feladatban megnevezett figurával lépj!'); return; }
      selected = square; effect('grab');
      message = 'Most válassz egy mezőt!';
      render(`[data-chess-square="${square}"]`); return;
    }
    if (selected === null) { status('Előbb koppints a világos figurára!', 'chess_select'); return; }
    const legal = moveChessPiece(board, selected, square);
    if (!legal) { effect('retry'); status('Ide most nem léphet. Válassz másik mezőt, vagy koppints a Segíts! gombra!', 'chess_retry'); return; }
    const next = options.mode === 'puzzles' ? moveChessPuzzlePiece(puzzle, board, selected, square, history.length) : legal;
    if (!next) {
      effect('retry'); status('Ez szabályos lépés lenne. Most a megjelölt célhoz keress egy lépést!'); return;
    }
    effect(piece ? 'chessCapture' : 'chess');
    history.push({ board, selected, collected, lastMove });
    if (history.length > 64) history.shift();
    const promoted = board.find(item => item.square === selected)?.type === 'pawn' && next.find(item => item.square === square)?.type === 'queen';
    lastMove = { from: selected, to: square }; board = next; selected = square;
    message = promoted ? CHESS_CLIPS.chess_promote : `Szép lépés! ${squareName(lastMove.from)} → ${squareName(square)}.`;
    if (options.mode === 'stars' && square === goal()) {
      collected++; solved = collected === goals.length;
      message = solved ? 'Mind a három csillag a helyén.' : 'Megvan a csillag! Keresd meg a következőt!';
    } else if (options.mode === 'puzzles') {
      const progress = puzzleState(); solved = progress.solved;
      message = solved ? 'A figura a célba ért.' : progress.exhausted ? CHESS_CLIPS.chess_steps_used
        : progress.atGoal && progress.capturesRemaining.length ? 'A csillag megvan, de még le kell ütni a többi megjelölt figurát.'
        : `${promoted ? CHESS_CLIPS.chess_promote + ' ' : ''}Még ${puzzle.maxMoves - history.length} lépésed van. Gondold át a következőt!`;
    }
    render(solved ? '#chess-restart' : `[data-chess-square="${square}"]`);
    if (solved) onComplete(options.mode === 'stars' ? 3 : 1);
    else if (options.mode === 'puzzles' && puzzleState().exhausted) say('chess_steps_used');
    else if (promoted) say('chess_promote');
    else if (options.mode === 'stars' && square === goals[collected - 1]) say('chess_star');
  }

  function repeat() {
    stopPlayback();
    say(solved ? options.mode === 'stars' ? 'chess_done' : 'chess_solved' : options.mode === 'puzzles' ? puzzle.voice : `chess_${board.find(piece => piece.color === 'white')?.type || options.piece}`, true);
  }
  function changePuzzle(direction, focusSelector) {
    const count = chessPuzzlesForLevel(options.level).length;
    puzzleIndex = (puzzleIndex + direction + count) % count;
    reset(focusSelector);
  }
  const canAdvance = () => active && solved && options.mode === 'puzzles';
  root.addEventListener('click', event => {
    if (!active || document.hidden) return;
    const button = event.target.closest('button');
    if (!button || button.disabled) return;
    if (button.dataset.chessSquare !== undefined) choose(Number(button.dataset.chessSquare));
    else if (button.dataset.chessMode) { options.mode = button.dataset.chessMode; remember(); reset(`[data-chess-mode="${options.mode}"]`); }
    else if (button.dataset.chessPiece) { options.piece = button.dataset.chessPiece; remember(); reset(`[data-chess-piece="${options.piece}"]`); }
    else if (button.dataset.chessLevel) { options.level = button.dataset.chessLevel; puzzleIndex = 0; remember(); reset(`[data-chess-level="${options.level}"]`); }
    else if (button.id === 'chess-listen') repeat();
    else if (button.id === 'chess-restart') reset('#chess-restart');
    else if (['chess-prev', 'chess-next', 'chess-another'].includes(button.id)) {
      changePuzzle(button.id === 'chess-prev' ? -1 : 1, button.id === 'chess-another' ? '#chess-next' : `#${button.id}`);
    } else if (button.id === 'chess-hint' && playable()) {
      hint = !hint;
      if (hint && selected === null) selected = primary();
      message = options.mode === 'puzzles' && puzzleState().exhausted ? CHESS_CLIPS.chess_steps_used : hint ? 'A pöttyös mezőkre léphetsz. A karikás mezőn üthetsz.' : instruction();
      render('#chess-hint'); if (hint) say('chess_hint'); else stopPlayback();
    } else if (button.id === 'chess-undo' && playable() && history.length) {
      stopPlayback();
      effect('undo'); ({ board, selected, collected, lastMove } = history.pop());
      message = 'Visszavontuk az utolsó lépést. Próbálj ki egy másikat!'; render('#chess-undo');
    }
  });
  root.addEventListener('keydown', event => {
    if (!active) return;
    const squareButton = event.target.closest('[data-chess-square]');
    if (!squareButton) return;
    const square = Number(squareButton.dataset.chessSquare), row = Math.floor(square / 8), col = square % 8;
    const next = event.key === 'ArrowUp' ? Math.max(0, row - 1) * 8 + col
      : event.key === 'ArrowDown' ? Math.min(7, row + 1) * 8 + col
      : event.key === 'ArrowLeft' ? row * 8 + Math.max(0, col - 1)
      : event.key === 'ArrowRight' ? row * 8 + Math.min(7, col + 1)
      : event.key === 'Home' ? row * 8 : event.key === 'End' ? row * 8 + 7 : null;
    if (next !== null) {
      event.preventDefault(); squareButton.tabIndex = -1;
      const target = root.querySelector(`[data-chess-square="${next}"]`); target.tabIndex = 0; target.focus({ preventScroll: true });
    } else if (event.key === 'Escape' && playable()) {
      selected = null; message = 'Koppints a világos figurára!'; render(`[data-chess-square="${square}"]`);
    }
  });
  document.addEventListener('visibilitychange', () => { if (active && document.hidden) stopPlayback(); });
  return { start() { active = true; reset(); }, stop() { active = false; stopPlayback(); }, repeat, canAdvance,
    nextPuzzle() {
      if (!canAdvance()) return false;
      changePuzzle(1, '#chess-next');
      return true;
    } };
}
