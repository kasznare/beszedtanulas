// Use a fresh disposable playwright-cli browser after the final offline build.
async page => {
  const checks = [], errors = [], context = page.context();
  const ok = (value, label) => { if (!value) throw Error(`${label} (${checks.length} checks passed)`); checks.push(label); };
  page.on('pageerror', error => errors.push(error.message));
  const base = page.url();
  await page.evaluate(async () => {
    localStorage.clear();
    for (const worker of await navigator.serviceWorker.getRegistrations()) await worker.unregister();
    for (const key of await caches.keys()) await caches.delete(key);
  });
  await page.goto('about:blank'); await page.goto(base);
  await page.setViewportSize({ width: 1024, height: 680 });
  const definitions = await page.evaluate(async () => {
    const { chessExpansionSolutions } = await import('./tests/fixtures/chess-solutions.mjs');
    const { chessPuzzlesForLevel, CHESS_CLIPS } = await import('./chess-data.js');
    return chessExpansionSolutions.map(solution => {
      const list = chessPuzzlesForLevel(solution.level), index = list.findIndex(puzzle => puzzle.id === solution.id);
      return { ...solution, index, count: list.length, ...list[index], text: CHESS_CLIPS[list[index].voice] };
    });
  });
  const root = page.locator('#chess');
  const enter = async () => {
    await page.locator('#home [data-open="number-menu"]').click();
    await page.locator('#number-menu [data-open="chess"]').click();
  };
  const square = name => (8 - Number(name[1])) * 8 + 'abcdefgh'.indexOf(name[0]);
  const cell = name => root.locator(`[data-chess-square="${square(name)}"]`);
  const move = async (from, to) => { await cell(from).click(); await cell(to).click(); };
  const saved = () => page.evaluate(() => JSON.parse(localStorage.getItem('speech_game_progress_v1')));
  const jump = async puzzle => {
    await root.locator(`[data-chess-level="${puzzle.level}"]`).click();
    await root.locator('.chess-jump > summary').click();
    await root.locator('#chess-jump-select').selectOption(String(puzzle.index));
  };
  await enter();
  await root.locator('[data-chess-mode="puzzles"]').click();
  ok(await root.locator('[data-chess-level]').count() === 4, 'Four difficulty levels are available');
  ok(definitions.length === 24, 'The expansion has 24 distinct authored solutions');
  for (const puzzle of definitions) {
    await jump(puzzle);
    ok((await root.locator('.chess-puzzle-nav').innerText()).includes(`${puzzle.index + 1} / ${puzzle.count}`), `${puzzle.id}: direct selection opens the requested task`);
    const task = await root.locator('#chess-task').innerText();
    const actor = { rook: 'bástyát', bishop: 'futót', knight: 'huszárt', queen: 'vezért', king: 'királyt', pawn: 'gyalogot' }[puzzle.piece];
    ok(task.includes(actor) && (!puzzle.goalType || task.includes('vezérré')) && (!puzzle.requiredCaptures?.length || task.includes('jelölt figurákat')), `${puzzle.id}: the short instruction states the actor, promotion and capture goals`);
    const before = await saved();
    for (const [step, { from, to }] of puzzle.moves.entries()) {
      await move(from, to);
      ok(await root.locator('#chess-move-count').innerText() === `Lépések: ${step + 1} / ${puzzle.moves.length}`, `${puzzle.id}/${step + 1}: legal move is counted`);
      if (step < puzzle.moves.length - 1) ok((await saved()).rewards === before.rewards, `${puzzle.id}/${step + 1}: an unfinished position does not reward`);
      if (step === 0 && ['rook-pawn-master', 'king-master'].includes(puzzle.id)) {
        const captured = await root.locator('#chess-capture-count').innerText();
        await root.locator('#chess-undo').click();
        ok(await root.locator('#chess-move-count').innerText() === `Lépések: 0 / ${puzzle.moves.length}` && await cell(to).locator('.chess-piece-black').count() === 1, `${puzzle.id}: undo restores the helper capture and budget`);
        await move(from, to);
        ok(await root.locator('#chess-capture-count').innerText() === captured, `${puzzle.id}: replaying a helper capture counts once`);
      }
    }
    await page.locator('#round-complete[open]').waitFor();
    ok(await root.locator('.chess-board.is-complete').count() === 1 && (await saved()).rewards === before.rewards + 1, `${puzzle.id}: the full plan finishes and rewards once`);
    if (puzzle.goalType) ok(await cell(puzzle.goal).locator(`.chess-piece-${puzzle.goalType}`).count() === 1, `${puzzle.id}: the promoted piece reaches its goal`);
    await page.locator('#round-replay').click();
    const nextIndex = (puzzle.index + 1) % puzzle.count;
    ok((await root.locator('.chess-puzzle-nav').innerText()).includes(`${nextIndex + 1} / ${puzzle.count}`) && await root.locator(`[data-chess-level="${puzzle.level}"]`).getAttribute('aria-pressed') === 'true', `${puzzle.id}: continuation keeps difficulty and wraps correctly`);
  }

  const master = definitions.find(puzzle => puzzle.id === 'rook-master');
  await jump(master);
  // A legal detour uses a move without capturing; the exact budget then matters.
  const miss = await page.evaluate(async () => {
    const { buildChessPuzzle, legalMoves, squareName, chessPuzzlesForLevel } = await import('./chess-data.js');
    const p = buildChessPuzzle(chessPuzzlesForLevel('master').findIndex(p => p.id === 'rook-master'), 'master');
    return { from: squareName(p.from), to: squareName(legalMoves(p.board, p.from).find(to => !p.board.some(piece => piece.square === to))) };
  });
  for (let step = 0; step < master.maxMoves; step++) await move(step % 2 ? miss.to : miss.from, step % 2 ? miss.from : miss.to);
  ok((await root.locator('#chess-status').innerText()).includes('Elfogytak'), 'Master tasks stop at their advertised budget');
  await root.locator('#chess-undo').click();
  ok(await root.locator('#chess-move-count').innerText() === `Lépések: ${master.maxMoves - 1} / ${master.maxMoves}`, 'Undo makes an exhausted master task playable again');
  await root.locator('#chess-hint').click();
  ok(await root.locator('.chess-tip').isVisible(), 'Master hints remain available after a failed plan');
  await root.locator('#chess-restart').click();
  ok(await root.locator('#chess-move-count').innerText() === `Lépések: 0 / ${master.maxMoves}`, 'Restart restores the entire master task');

  await page.locator('#home-button').click(); await page.reload(); await enter();
  ok(await root.locator('[data-chess-level="master"]').getAttribute('aria-pressed') === 'true', 'The new difficulty uses the existing preference storage');
  await page.waitForFunction(() => navigator.serviceWorker.controller && document.querySelector('#offline-status')?.textContent.startsWith('Letöltve.'), undefined, { timeout: 30000 });
  const audio = await page.evaluate(async ids => {
    const { VOICE_CLIPS } = await import('./voice-library.js');
    return (await Promise.all(ids.map(id => caches.match(new URL(VOICE_CLIPS[id].file, location.href))))).every(Boolean);
  }, definitions.map(puzzle => puzzle.voice));
  ok(audio, 'All 24 new Hungarian instructions are cached for offline use');
  await context.setOffline(true);
  try {
    await page.reload(); await enter();
    await page.evaluate(() => {
      window.__chessExpansionVoices = [];
      document.addEventListener('narrationstart', event => window.__chessExpansionVoices.push(event.detail.id));
    });
    await page.locator('#help-button').click();
    await page.waitForFunction(id => window.__chessExpansionVoices.includes(id), master.voice);
    ok(true, 'The master instruction plays through the common Help control offline');
    for (const { from, to } of master.moves) await move(from, to);
    await page.locator('#round-complete[open]').waitFor();
    ok(true, 'A master puzzle can be completed entirely offline');
  } finally { await context.setOffline(false); }
  ok(errors.length === 0, `No uncaught browser errors: ${errors.join(', ')}`);
  return { count: checks.length, checks, errors };
}
