import { CHESS_PIECES, CHESS_CLIPS, CHESS_LEVELS, PAWN_BATTLES, chessPuzzlesForLevel, chessPuzzleMovers, evaluateChessPuzzle, moveChessPuzzlePiece, normalizeChessOptions, squareName, legalMoves, moveChessPiece, buildChessLesson, buildChessPuzzle, playChessTactic, chooseChessReply, buildPawnBattle, pawnBattleResult, inCheck } from './chess-data.js';
import { chessArt } from './chess-art.js';
import { setGameTitle, focusGameTitle } from './game-heading.js';

const STORAGE_KEY = 'beszedtanulas.chess.v1';
const ACCUSATIVE = { rook: 'bástyát', bishop: 'futót', knight: 'huszárt', queen: 'vezért', king: 'királyt', pawn: 'gyalogot' };
const REPLY_DELAY = 750;

export function setupChessGame({ effect = () => {}, speak, stopPlayback, onComplete, onRestart = () => {} }) {
  const root = document.querySelector('#chess');
  let options;
  try { options = normalizeChessOptions(JSON.parse(localStorage.getItem(STORAGE_KEY))); }
  catch { options = normalizeChessOptions(); }
  let active = false, board = [], selected = null, goals = [], collected = 0, puzzleIndex = 0, puzzle;
  let hint = false, solved = false, failed = false, busy = false, winner = null, timer = 0;
  let history = [], message = '', lastMove = null, replyMove = null;
  const tactic = () => options.mode === 'puzzles' && !!puzzle?.tactic;
  const answers = () => tactic() || options.mode === 'pawns';
  const playable = () => active && !document.hidden && !solved && !failed && !busy && !winner;
  const pieceName = type => CHESS_PIECES.find(piece => piece.id === type)?.name || '';
  const say = (id, force = false) => { if (active && !document.hidden) speak(id, force); };
  const remember = () => { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(options)); } catch { /* Memory-only play remains available. */ } };
  const goal = () => options.mode === 'puzzles' && !tactic() ? puzzle.goal : options.mode === 'stars' ? goals[collected] : null;
  const primary = () => options.mode === 'puzzles' && !tactic() ? board.find(piece => piece.id === puzzle.from)?.square : null;
  const puzzleState = () => evaluateChessPuzzle(puzzle, board, history.length);
  const movable = () => options.mode === 'puzzles' && !tactic() ? chessPuzzleMovers(puzzle, board) : board.filter(piece => piece.color === 'white');
  const describe = move => `${pieceName(board.find(piece => piece.square === move.to)?.type)} ${squareName(move.from)} → ${squareName(move.to)}`;
  const instruction = () => {
    if (options.mode === 'pawns') return 'Juttasd át egy gyalogodat a tábla túlsó végére, mielőtt a sötét odaér!';
    if (options.mode === 'explore') return 'Koppints a figurára, majd egy mezőre!';
    if (options.mode === 'stars') return 'Gyűjtsd össze a három csillagot!';
    if (tactic()) return puzzle.task;
    const actor = ACCUSATIVE[puzzle.piece];
    return `Vidd a ${actor} a csillagra!${puzzle.requiredCaptures.length ? ' Üsd le a karikával jelölt figurát!' : ''}`;
  };

  function cancelReply() { clearTimeout(timer); timer = 0; busy = false; }

  function reset(focusSelector) {
    onRestart(); stopPlayback(); cancelReply();
    const lesson = buildChessLesson(options.piece);
    puzzle = buildChessPuzzle(puzzleIndex, options.level);
    board = options.mode === 'puzzles' ? puzzle.board : options.mode === 'pawns' ? buildPawnBattle(options.battle) : lesson.board;
    goals = lesson.goals; collected = 0; solved = false; failed = false; winner = null;
    history = []; lastMove = null; replyMove = null;
    selected = options.mode === 'explore' ? board.find(piece => piece.color === 'white')?.square ?? null : null;
    hint = options.mode === 'explore';
    message = answers() ? 'Te lépsz a világossal, utána a sötét válaszol.' : '';
    render(focusSelector);
    if (options.mode === 'explore') say(`chess_${options.piece}`);
    else if (options.mode === 'stars') say('chess_stars');
    else if (options.mode === 'puzzles' && !tactic()) say(puzzle.voice);
  }

  function render(focusSelector) {
    const easyPuzzle = options.mode === 'puzzles' && !tactic();
    const type = board.find(piece => piece.square === selected)?.type || (easyPuzzle ? puzzle.piece : options.mode === 'pawns' ? 'pawn' : tactic() ? board.find(piece => piece.color === 'white' && piece.type !== 'king')?.type || 'king' : options.piece);
    const progress = easyPuzzle ? puzzleState() : null;
    const canMove = movable();
    const moves = selected === null ? [] : legalMoves(board, selected);
    const target = solved ? null : goal();
    const markedTargets = easyPuzzle && !solved ? progress.capturesRemaining : tactic() && !solved ? puzzle.targets.filter(id => board.some(piece => piece.id === id)) : [];
    const checkedKing = answers() ? board.find(piece => piece.type === 'king' && inCheck(board, piece.color)) : null;
    const focusSquare = selected ?? primary() ?? board.find(piece => piece.color === 'white')?.square ?? 0;
    const levelPuzzles = options.mode === 'puzzles' ? chessPuzzlesForLevel(options.level) : [];
    setGameTitle(root, 'Sakkliget');
    root.innerHTML = `<div class="chess-workspace">
      <div class="chess-board-wrap"><div class="chess-board ${solved ? 'is-complete' : ''} ${busy ? 'is-waiting' : ''}" role="group" aria-label="Sakktábla, nyolcszor nyolc mező" aria-describedby="chess-task">${Array.from({ length: 64 }, (_, square) => {
        const piece = board.find(item => item.square === square);
        const possible = hint && moves.includes(square) && !(easyPuzzle && progress.exhausted);
        const marked = markedTargets.includes(piece?.id ?? -1) && piece?.color === 'black';
        const mine = canMove.includes(piece);
        const label = `${squareName(square)}${piece ? `, ${piece.color === 'white' ? 'világos' : 'sötét'} ${pieceName(piece.type).toLowerCase()}${piece.color === 'white' ? mine ? ', ezzel léphetsz' : ', helyén marad' : ''}` : ', üres'}${square === target ? ', cél' : ''}${marked ? ', ezt nyerd meg' : ''}${possible ? piece ? ', üthető' : ', ide léphetsz' : ''}${piece === checkedKing ? ', sakkban áll' : ''}`;
        const classes = ['chess-square', (Math.floor(square / 8) + square % 8) % 2 ? 'is-dark' : 'is-light',
          square === selected && 'is-selected', hint && mine && canMove.length > 1 && !answers() && 'is-movable',
          possible && (piece ? 'is-capture' : 'is-possible'), (square === target || marked) && 'is-goal',
          square === lastMove?.to && 'is-arrival', square === lastMove?.from && 'is-departure',
          replyMove && (square === replyMove.from || square === replyMove.to) && 'is-reply', piece && piece === checkedKing && 'is-check'].filter(Boolean).join(' ');
        return `<button class="${classes}" data-chess-square="${square}" aria-label="${label}" aria-pressed="${square === selected}" tabindex="${square === focusSquare ? 0 : -1}">${piece ? chessArt(piece.type, piece.color) : ''}${square === target ? '<span class="chess-goal" aria-hidden="true">★</span>' : ''}${marked ? '<span class="chess-capture-goal" aria-hidden="true">◎</span>' : ''}${square % 8 === 0 ? `<span class="chess-rank" aria-hidden="true">${8 - Math.floor(square / 8)}</span>` : ''}${square >= 56 ? `<span class="chess-file" aria-hidden="true">${'abcdefgh'[square % 8]}</span>` : ''}</button>`;
      }).join('')}</div>
      <div class="chess-legend"><span><i class="chess-dot"></i> Ide léphetsz</span><span><i class="chess-ring"></i> Itt üthetsz</span>${goal() !== null ? '<span>★ Cél</span>' : ''}${markedTargets.length ? '<span>◎ Ezt nyerd meg</span>' : ''}${answers() ? '<span><i class="chess-reply-key"></i> A sötét lépése</span>' : ''}</div></div>
      <div class="chess-guide">
        <div class="chess-modes" role="group" aria-label="Sakkjáték módja">${[['explore', 'Lépések'], ['stars', 'Csillagok'], ['puzzles', 'Feladatok'], ['pawns', 'Gyalogcsata']].map(([mode, label]) => `<button data-chess-mode="${mode}" aria-pressed="${options.mode === mode}">${label}</button>`).join('')}</div>
        ${options.mode === 'puzzles'
          ? `<div class="chess-levels" role="group" aria-label="Sakkfeladat nehézsége">${CHESS_LEVELS.map(level => `<button data-chess-level="${level.id}" aria-pressed="${options.level === level.id}">${level.label}</button>`).join('')}</div>
            <div class="chess-puzzle-nav"><button id="chess-prev" aria-label="Előző sakkfeladat">←</button><span>${puzzleIndex + 1} / ${levelPuzzles.length} · ${puzzle.title}</span><button id="chess-next" aria-label="Következő sakkfeladat">→</button></div>
            <details class="chess-jump"><summary>Másik feladat</summary><label for="chess-jump-select">Válassz feladatot</label><select id="chess-jump-select">${levelPuzzles.map((item, index) => `<option value="${index}" ${index === puzzleIndex ? 'selected' : ''}>${index + 1}. ${item.title}</option>`).join('')}</select></details>`
          : options.mode === 'pawns'
            ? `<div class="chess-levels chess-battles" role="group" aria-label="Hány gyaloggal játszunk?">${PAWN_BATTLES.map(battle => `<button data-chess-battle="${battle.id}" aria-pressed="${options.battle === battle.id}">${battle.label}</button>`).join('')}</div>`
            : `<div class="chess-picker" role="group" aria-label="Válassz sakkfigurát">${CHESS_PIECES.map(piece => `<button data-chess-piece="${piece.id}" aria-label="${piece.name}" aria-pressed="${options.piece === piece.id}">${chessArt(piece.id)}<span>${piece.name}</span></button>`).join('')}</div>`}
        <div class="chess-task-card"><p id="chess-task">${instruction()}</p>${options.mode === 'stars' ? `<div class="chess-stars" aria-label="${collected} csillag a háromból">${[0, 1, 2].map(index => `<span class="${index < collected ? 'is-earned' : ''}" aria-hidden="true">★</span>`).join('')}</div>` : ''}${tactic() && puzzle.maxMoves > 1 ? `<div class="chess-progress"><span id="chess-move-count">Lépéseid: ${history.length} / ${puzzle.maxMoves}</span><span class="chess-step-dots" aria-hidden="true">${Array.from({ length: puzzle.maxMoves }, (_, index) => `<i class="${index < history.length ? 'is-used' : ''}"></i>`).join('')}</span></div>` : ''}${tactic() && hint ? `<p class="chess-tip">${puzzle.tip}</p>` : ''}</div>
        <p id="chess-status" class="chess-status ${failed ? 'is-failed' : solved || winner === 'white' ? 'is-solved' : ''}" role="status" aria-live="polite">${message}</p>
        <div class="chess-actions"><button id="chess-hint" aria-pressed="${hint}" ${solved || winner ? 'disabled' : ''}>${hint ? '🙈 Pöttyök elrejtése' : '👀 Segíts!'}</button><button id="chess-undo" ${history.length && !solved && !busy ? '' : 'disabled'}>↶ Visszavonom</button><button id="chess-restart">↻ ${solved || winner ? 'Új kör' : 'Újrakezdem'}</button>${solved && options.mode === 'puzzles' ? '<button id="chess-another">Következő feladat →</button>' : ''}</div>
        <div class="chess-rule"><h3>${pieceName(type)}</h3><details><summary>Hogyan lép?</summary><p>${CHESS_PIECES.find(piece => piece.id === type).rule}</p><p class="chess-colors">${answers() ? 'Te lépsz a világossal, utána a sötét válaszol.' : 'Te lépsz a világossal. A sötét figurák a helyükön maradnak.'}</p></details></div>
      </div></div>`;
    if (focusSelector === 'title') focusGameTitle(root);
    else if (focusSelector) root.querySelector(focusSelector)?.focus({ preventScroll: true });
  }

  function status(text, voice) {
    message = text;
    root.querySelector('#chess-status').textContent = text;
    if (voice) say(voice);
  }

  // The light move is shown at once; the dark answer follows after a short pause.
  function answerWith(after, reply, finish) {
    board = after; selected = null;
    if (!reply) { finish(); return; }
    busy = true; message = 'A sötét gondolkodik…';
    render();
    timer = setTimeout(() => {
      busy = false; timer = 0;
      const captured = board.find(piece => piece.square === reply.to);
      board = moveChessPiece(board, reply.from, reply.to) || board; replyMove = reply;
      effect(captured ? 'chessCapture' : 'chess');
      finish(captured);
    }, REPLY_DELAY);
  }

  function playTactic(from, to, captured) {
    const turn = playChessTactic(puzzle, board, from, to, history.length);
    if (!turn) { effect('retry'); status('Ide most nem léphet. Válassz másik mezőt!', 'chess_retry'); return; }
    effect(captured ? 'chessCapture' : 'chess');
    history.push({ board, lastMove, replyMove });
    lastMove = { from, to }; replyMove = null;
    answerWith(moveChessPiece(board, from, to), turn.reply, lost => {
      board = turn.board;
      if (turn.outcome === 'solved') {
        solved = true;
        message = puzzle.goal === 'mate' ? 'Matt! A sötét király nem tud elmenekülni.'
          : puzzle.goal === 'safe' ? `Biztonságban vagy!${turn.reply ? ` A sötét ezt lépte: ${describe(turn.reply)}.` : ''}`
          : 'Megnyerted a figurát! Szép lépés.';
        render('#chess-restart'); onComplete(1); return;
      }
      if (turn.outcome === 'failed') {
        failed = true; effect('retry');
        message = turn.reason === 'stalemate' ? 'Patt! A sötét király nem tud lépni, de sakkban sincs, így döntetlen lett. Vond vissza, és keress mattot!'
          : lost ? `A sötét ${pieceName(board.find(piece => piece.square === turn.reply.to)?.type).toLowerCase()} leütötte a ${ACCUSATIVE[lost.type]}. Vond vissza, és keress jobb lépést!`
          : puzzle.goal === 'mate' ? 'Ez még nem matt: a sötét király el tudott lépni. Vond vissza, és keress másik lépést!'
          : 'Ezzel nem nyertél figurát. Vond vissza, és próbálj másik lépést!';
        render('#chess-undo'); return;
      }
      message = `A sötét lépett: ${describe(turn.reply)}. Most újra te jössz!`;
      render(`[data-chess-square="${to}"]`);
    });
  }

  function playPawn(from, to, captured) {
    effect(captured ? 'chessCapture' : 'chess');
    history.push({ board, lastMove, replyMove });
    lastMove = { from, to }; replyMove = null;
    const after = moveChessPiece(board, from, to);
    let result = pawnBattleResult(after, 'black');
    const reply = result ? null : chooseChessReply(after, 'black', { pawnRace: true, gentle: options.battle === 'small' });
    answerWith(after, reply, () => {
      result ||= pawnBattleResult(board, 'white');
      winner = result?.winner ?? null;
      const blocked = result?.reason === 'blocked' ? 'Elakadtak a gyalogok. ' : '';
      if (winner === 'white') { solved = true; message = blocked ? `${blocked}A te gyalogjaid jutottak messzebbre, így te nyertél!` : result.reason === 'captured' ? 'Győztél! Minden sötét gyalogot leütöttél.' : 'Győztél! A gyalogod átért a túloldalra, és vezér lett belőle.'; render('#chess-restart'); onComplete(3); return; }
      if (winner === 'black') { effect('retry'); message = blocked ? `${blocked}A sötét gyalogok jutottak messzebbre. Vond vissza, vagy kezdj új kört!` : 'A sötét nyert. Vond vissza a lépést, vagy kezdj új kört!'; render('#chess-undo'); return; }
      if (winner === 'draw') { message = `${blocked}Ugyanannyit haladtatok: döntetlen!`; render('#chess-restart'); return; }
      message = `A sötét lépett: ${squareName(reply.from)} → ${squareName(reply.to)}. Te jössz!`;
      render(`[data-chess-square="${to}"]`);
    });
  }

  function choose(square) {
    if (failed) { status('Vond vissza az utolsó lépést, vagy kezdd újra!'); return; }
    if (!playable()) return;
    if (options.mode === 'puzzles' && !tactic() && puzzleState().exhausted) { status(CHESS_CLIPS.chess_steps_used, 'chess_steps_used'); return; }
    const piece = board.find(item => item.square === square);
    if (piece?.color === 'white') {
      if (!movable().includes(piece)) { status('Ez a figura most a helyén marad. A feladatban megnevezett figurával lépj!'); return; }
      selected = square; effect('grab');
      message = 'Most válassz egy mezőt!';
      render(`[data-chess-square="${square}"]`); return;
    }
    if (selected === null) { status('Előbb koppints a világos figurára!', 'chess_select'); return; }
    if (!legalMoves(board, selected).includes(square)) {
      effect('retry');
      status(inCheck(board, 'white') ? 'Sakkban állsz! Előbb a királyodat kell megvédened.' : 'Ide most nem léphet. Válassz másik mezőt, vagy koppints a Segíts! gombra!', 'chess_retry'); return;
    }
    if (tactic()) { playTactic(selected, square, piece); return; }
    if (options.mode === 'pawns') { playPawn(selected, square, piece); return; }
    const next = options.mode === 'puzzles' ? moveChessPuzzlePiece(puzzle, board, selected, square, history.length) : moveChessPiece(board, selected, square);
    if (!next) { effect('retry'); status('Ez szabályos lépés lenne. Most a megjelölt célhoz keress egy lépést!'); return; }
    effect(piece ? 'chessCapture' : 'chess');
    history.push({ board, selected, collected, lastMove, replyMove });
    if (history.length > 64) history.shift();
    const promoted = board.find(item => item.square === selected)?.type === 'pawn' && next.find(item => item.square === square)?.type === 'queen';
    lastMove = { from: selected, to: square }; board = next; selected = square;
    message = promoted ? CHESS_CLIPS.chess_promote : `Szép lépés! ${squareName(lastMove.from)} → ${squareName(square)}.`;
    if (options.mode === 'stars' && square === goal()) {
      collected++; solved = collected === goals.length;
      message = solved ? 'Mind a három csillag a helyén.' : 'Megvan a csillag! Keresd meg a következőt!';
    } else if (options.mode === 'puzzles') {
      solved = puzzleState().solved;
      message = solved ? 'A figura a célba ért.' : CHESS_CLIPS.chess_steps_used;
    }
    render(solved ? '#chess-restart' : `[data-chess-square="${square}"]`);
    if (solved) onComplete(options.mode === 'stars' ? 3 : 1);
    else if (promoted) say('chess_promote');
    else if (options.mode === 'stars' && square === goals[collected - 1]) say('chess_star');
  }

  function undo() {
    if (!history.length || solved) return;
    stopPlayback(); cancelReply(); effect('undo');
    const entry = history.pop();
    ({ board, lastMove, replyMove } = entry);
    if ('collected' in entry) ({ selected, collected } = entry); else selected = null;
    failed = false; winner = null;
    message = 'Visszavontuk az utolsó lépést. Próbálj ki egy másikat!'; render('#chess-undo');
  }

  function repeat() {
    stopPlayback();
    if (solved) say(options.mode === 'stars' ? 'chess_done' : 'chess_solved', true);
    else if (options.mode === 'puzzles' && !tactic()) say(puzzle.voice, true);
    else if (options.mode === 'explore' || options.mode === 'stars') say(`chess_${board.find(piece => piece.color === 'white')?.type || options.piece}`, true);
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
    else if (button.dataset.chessMode) { options.mode = button.dataset.chessMode; remember(); reset('title'); }
    else if (button.dataset.chessPiece) { options.piece = button.dataset.chessPiece; remember(); reset(`[data-chess-piece="${options.piece}"]`); }
    else if (button.dataset.chessLevel) { options.level = button.dataset.chessLevel; puzzleIndex = 0; remember(); reset('title'); }
    else if (button.dataset.chessBattle) { options.battle = button.dataset.chessBattle; remember(); reset(`[data-chess-battle="${options.battle}"]`); }
    else if (button.id === 'chess-restart') reset('#chess-restart');
    else if (['chess-prev', 'chess-next', 'chess-another'].includes(button.id)) changePuzzle(button.id === 'chess-prev' ? -1 : 1, 'title');
    else if (button.id === 'chess-hint' && !solved && !winner) {
      hint = !hint;
      if (hint && selected === null) selected = primary() ?? null;
      message = hint ? answers() ? 'Koppints egy figurára: a pöttyök mutatják, hová léphet.' : 'A pöttyös mezőkre léphetsz. A karikás mezőn üthetsz.' : '';
      render('#chess-hint'); if (hint) say('chess_hint'); else stopPlayback();
    } else if (button.id === 'chess-undo') undo();
  });
  root.addEventListener('change', event => {
    if (!active || document.hidden || event.target.id !== 'chess-jump-select') return;
    const index = Number(event.target.value);
    if (!Number.isInteger(index) || index < 0 || index >= chessPuzzlesForLevel(options.level).length) return;
    puzzleIndex = index;
    reset('title');
  });
  root.addEventListener('contextmenu', event => {
    if (matchMedia('(pointer: coarse)').matches && !event.target.closest('select')) event.preventDefault();
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
  return { start() { active = true; reset(); }, stop() { active = false; cancelReply(); stopPlayback(); }, repeat, canAdvance,
    nextPuzzle() {
      if (!canAdvance()) return false;
      changePuzzle(1, 'title');
      return true;
    } };
}
