import { CHESS_PIECES, CHESS_CLIPS, CHESS_PUZZLES, normalizeChessOptions, squareName, legalMoves, moveChessPiece, buildChessLesson, buildChessPuzzle } from './chess-data.js';
import { chessArt } from './chess-art.js';

const STORAGE_KEY = 'beszedtanulas.chess.v1';
export function setupChessGame({ speak, stopPlayback, onComplete, onRestart = () => {} }) {
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
  const primary = () => options.mode === 'puzzles' ? puzzle.from : board.find(piece => piece.color === 'white')?.square;
  const instruction = () => options.mode === 'puzzles' ? CHESS_CLIPS[puzzle.voice]
    : options.mode === 'stars' ? 'Vidd a figurát a csillagra! Több lépéssel is eljuthatsz oda.' : 'Koppints a figurára, aztán egy pöttyös mezőre!';

  function reset(focusSelector) {
    onRestart(); stopPlayback();
    const lesson = buildChessLesson(options.piece);
    puzzle = buildChessPuzzle(puzzleIndex);
    board = options.mode === 'puzzles' ? puzzle.board : lesson.board;
    goals = lesson.goals; collected = 0; solved = false; history = []; lastMove = null;
    selected = options.mode === 'explore' ? primary() : null;
    hint = options.mode === 'explore'; message = instruction();
    render(focusSelector);
    say(options.mode === 'puzzles' ? puzzle.voice : options.mode === 'stars' ? 'chess_stars' : `chess_${options.piece}`);
  }

  function render(focusSelector) {
    const type = options.mode === 'puzzles' ? puzzle.piece : board.find(piece => piece.color === 'white')?.type || options.piece;
    const moves = selected === null ? [] : legalMoves(board, selected);
    const target = options.mode === 'explore' || solved ? null : goal();
    const focusSquare = selected ?? primary() ?? 0;
    root.innerHTML = `<div class="chess-intro"><span class="chess-badge" aria-hidden="true">♟</span><div><h2>Sakkliget</h2><p>Figurák, kis lépések, nagy felfedezések.</p></div></div>
      <div class="chess-modes" role="group" aria-label="Sakkjáték módja">${[['explore', 'Lépések'], ['stars', 'Csillagok'], ['puzzles', 'Kis feladatok']].map(([mode, label]) => `<button data-chess-mode="${mode}" aria-pressed="${options.mode === mode}">${label}</button>`).join('')}</div>
      ${options.mode !== 'puzzles' ? `<div class="chess-picker" role="group" aria-label="Válassz sakkfigurát">${CHESS_PIECES.map(piece => `<button data-chess-piece="${piece.id}" aria-label="${piece.name}" aria-pressed="${options.piece === piece.id}">${chessArt(piece.id)}<span>${piece.name}</span></button>`).join('')}</div>` : `<div class="chess-puzzle-nav"><button id="chess-prev" aria-label="Előző sakkfeladat">←</button><span>${puzzleIndex + 1} / ${CHESS_PUZZLES.length} · ${puzzle.title}</span><button id="chess-next" aria-label="Következő sakkfeladat">→</button></div>`}
      <div class="chess-workspace"><div class="chess-board-wrap"><div class="chess-board ${solved ? 'is-complete' : ''}" role="group" aria-label="Sakktábla, nyolcszor nyolc mező" aria-describedby="chess-task">${Array.from({ length: 64 }, (_, square) => {
        const piece = board.find(item => item.square === square), possible = hint && moves.includes(square);
        const label = `${squareName(square)}${piece ? `, ${piece.color === 'white' ? 'világos' : 'sötét'} ${pieceName(piece.type).toLowerCase()}` : ', üres'}${square === target ? ', cél' : ''}${possible ? piece ? ', üthető' : ', ide léphetsz' : ''}`;
        return `<button class="chess-square ${(Math.floor(square / 8) + square % 8) % 2 ? 'is-dark' : 'is-light'} ${square === selected ? 'is-selected' : ''} ${possible ? piece ? 'is-capture' : 'is-possible' : ''} ${square === target ? 'is-goal' : ''} ${square === lastMove?.to ? 'is-arrival' : ''}" data-chess-square="${square}" aria-label="${label}" aria-pressed="${square === selected}" tabindex="${square === focusSquare ? 0 : -1}">${piece ? chessArt(piece.type, piece.color) : ''}${square === target ? `<span class="chess-goal" aria-hidden="true">${puzzle?.capture && options.mode === 'puzzles' ? '◎' : '★'}</span>` : ''}${square % 8 === 0 ? `<span class="chess-rank" aria-hidden="true">${8 - Math.floor(square / 8)}</span>` : ''}${square >= 56 ? `<span class="chess-file" aria-hidden="true">${'abcdefgh'[square % 8]}</span>` : ''}</button>`;
      }).join('')}</div><div class="chess-legend"><span><i class="chess-dot"></i> Ide léphetsz</span><span><i class="chess-ring"></i> Itt üthetsz</span></div></div>
      <div class="chess-guide"><div class="chess-rule"><span class="chess-eyebrow">${options.mode === 'puzzles' ? 'EGY LÉPÉSES FELADAT' : 'ISMERKEDJ A FIGURÁVAL'}</span><h3>${pieceName(type)}</h3><p>${CHESS_PIECES.find(piece => piece.id === type).rule}</p><button id="chess-listen">🔊 Hallgasd meg!</button></div>
      <div class="chess-task-card"><p id="chess-task">${instruction()}</p>${options.mode === 'stars' ? `<div class="chess-stars" aria-label="${collected} csillag a háromból">${[0, 1, 2].map(index => `<span class="${index < collected ? 'is-earned' : ''}" aria-hidden="true">★</span>`).join('')}</div>` : ''}${options.mode === 'puzzles' ? '<p class="chess-colors"><span class="chess-white-mark"></span> Te lépsz a világossal.<br>A sötét figurák a helyükön maradnak.</p>' : ''}</div>
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
    const piece = board.find(item => item.square === square);
    if (piece?.color === 'white') {
      if (options.mode === 'puzzles' && square !== puzzle.from) { status('Ebben a feladatban a megnevezett figurával lépj!'); return; }
      selected = square;
      message = 'Most válassz egy mezőt!';
      render(`[data-chess-square="${square}"]`); return;
    }
    if (selected === null) { status('Előbb koppints a világos figurára!', 'chess_select'); return; }
    const next = moveChessPiece(board, selected, square);
    if (!next) { status('Ide most nem léphet. Válassz másik mezőt, vagy koppints a Segíts! gombra!', 'chess_retry'); return; }
    if (options.mode === 'puzzles' && square !== puzzle.goal) {
      status('Ez szabályos lépés lenne. Most a megjelölt célhoz keress egy lépést!'); return;
    }
    history.push({ board, selected, collected, lastMove });
    if (history.length > 64) history.shift();
    const promoted = board.find(item => item.square === selected)?.type === 'pawn' && next.find(item => item.square === square)?.type === 'queen';
    lastMove = { from: selected, to: square }; board = next; selected = square;
    message = promoted ? CHESS_CLIPS.chess_promote : `Szép lépés! ${squareName(lastMove.from)} → ${squareName(square)}.`;
    if (options.mode === 'stars' && square === goal()) {
      collected++; solved = collected === goals.length;
      message = solved ? 'Mind a három csillag a helyén.' : 'Megvan a csillag! Keresd meg a következőt!';
    } else if (options.mode === 'puzzles') { solved = true; message = 'A figura a célba ért.'; }
    render(solved ? '#chess-restart' : `[data-chess-square="${square}"]`);
    if (solved) onComplete(options.mode === 'stars' ? 3 : 1);
    else if (promoted) say('chess_promote');
    else if (options.mode === 'stars' && square === goals[collected - 1]) say('chess_star');
  }

  function repeat() {
    stopPlayback();
    say(solved ? options.mode === 'stars' ? 'chess_done' : 'chess_solved' : options.mode === 'puzzles' ? puzzle.voice : `chess_${board.find(piece => piece.color === 'white')?.type || options.piece}`, true);
  }
  root.addEventListener('click', event => {
    if (!active || document.hidden) return;
    const button = event.target.closest('button');
    if (!button || button.disabled) return;
    if (button.dataset.chessSquare !== undefined) choose(Number(button.dataset.chessSquare));
    else if (button.dataset.chessMode) { options.mode = button.dataset.chessMode; remember(); reset(`[data-chess-mode="${options.mode}"]`); }
    else if (button.dataset.chessPiece) { options.piece = button.dataset.chessPiece; remember(); reset(`[data-chess-piece="${options.piece}"]`); }
    else if (button.id === 'chess-listen') repeat();
    else if (button.id === 'chess-restart') reset('#chess-restart');
    else if (['chess-prev', 'chess-next', 'chess-another'].includes(button.id)) {
      puzzleIndex = (puzzleIndex + (button.id === 'chess-prev' ? -1 : 1) + CHESS_PUZZLES.length) % CHESS_PUZZLES.length;
      reset(button.id === 'chess-another' ? '#chess-next' : `#${button.id}`);
    } else if (button.id === 'chess-hint' && playable()) {
      hint = !hint;
      if (hint && selected === null) selected = primary();
      message = hint ? 'A pöttyös mezőkre léphetsz. A karikás mezőn üthetsz.' : instruction();
      render('#chess-hint'); if (hint) say('chess_hint'); else stopPlayback();
    } else if (button.id === 'chess-undo' && playable() && history.length) {
      stopPlayback();
      ({ board, selected, collected, lastMove } = history.pop());
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
  return { start() { active = true; reset(); }, stop() { active = false; stopPlayback(); }, repeat };
}
