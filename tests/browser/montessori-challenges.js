// Run using playwright-cli in a disposable session. Exercises every level and saved moves.
async page => {
  const checks = [], errors = []; const ok = (value, message) => { if (!value) throw Error(message); checks.push(message); };
  page.on('pageerror', error => errors.push(error.message));
  await page.context().setOffline(false); await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.evaluate(async () => { localStorage.clear(); for (const registration of await navigator.serviceWorker.getRegistrations()) await registration.unregister(); for (const key of await caches.keys()) await caches.delete(key); });
  await page.reload();
  const menu = async () => {
    if (await page.locator('#mo-back').isVisible()) await page.locator('#mo-back').click();
    if (!await page.locator('.mo-menu').isVisible()) { if (await page.locator('#home-button').isVisible()) await page.locator('#home-button').click(); await page.locator('#home [data-open="activity-menu"]').click(); await page.locator('#activity-menu [data-open="montessori"]').click(); }
  };
  const choose = async id => { const piece = page.locator(`[data-mo-piece="${id}"]`); if (await piece.getAttribute('aria-pressed') !== 'true') await piece.click(); };
  const ready = () => page.locator('#mo-restart:not([disabled])').waitFor();
  const move = async (id, target) => { await choose(id); await page.locator(`[data-mo-target="${target}"]`).click(); await ready(); };
  const saved = () => page.evaluate(() => { const kind = document.querySelector('#montessori').dataset.game, level = document.querySelector('#montessori').dataset.level; const key = Object.keys(localStorage).find(key => key.startsWith('beszedtanulas.montessori.v2:') && key.endsWith(`:${kind}:${level}`)); return JSON.parse(localStorage.getItem(key)); });
  const exercise = async () => { const record = await saved(); return page.evaluate(async ({ record, kind, level }) => { const { createMontessoriSession } = await import('./montessori-session.js'); return createMontessoriSession(kind, +level, record.seed); }, { record, kind: await page.locator('#montessori').getAttribute('data-game'), level: await page.locator('#montessori').getAttribute('data-level') }); };
  const rewards = () => page.evaluate(() => JSON.parse(localStorage.getItem('speech_game_progress_v1')).rewards);
  await page.setViewportSize({ width: 1194, height: 834 }); await menu();
  ok(await page.locator('[data-mo-game]').count() === 5, 'Five games and 26 levels are reachable');
  for (const [kind, levels] of [['shapes', 8], ['colors', 5], ['tower', 5], ['grid', 4], ['memory', 4]]) {
    await page.locator(`[data-mo-game="${kind}"]`).click();
    for (let level = 1; level <= levels; level++) {
      await page.locator(`[data-mo-level="${level}"]`).click(); await page.locator('#mo-restart').click(); const round = await exercise(), before = await rewards();
      if (kind === 'memory') { ok(await page.locator('.mo-memory-pattern svg').count() === round.total, `memory/${level}: sample visible before hiding`); await page.locator('#mo-hide-pattern').click(); ok(await page.locator('.mo-memory-pattern').count() === 0, `memory/${level}: sample hidden during reconstruction`); }
      for (const id of round.blockers) await page.locator(`[data-mo-blocker="${id}"]`).click();
      if (kind === 'grid' || kind === 'memory') {
        const a = round.pieces[0]; await move(a.id, round.targets[0].id); await page.locator('#mo-check').click();
        ok(await page.locator('#montessori').getAttribute('data-done') === 'false' && await rewards() === before, `${kind}/${level}: incomplete check keeps editable pieces and no reward`);
        await page.locator('#mo-undo').click(); await page.locator('#mo-undo').click();
      }
      const order = kind === 'tower' ? [...round.pieces].sort((a, b) => b.size - a.size) : round.pieces; const occupied = new Set(), amounts = {};
      for (const piece of order) {
        const target = round.targets.find(t => kind === 'tower' || (kind === 'colors' ? t.color === piece.color && t.shade === piece.shade && (amounts[t.id] || 0) < t.count : kind === 'shapes' ? t.id === piece.id : !occupied.has(t.id) && (t.expected || t).color === piece.color && (t.expected || t).shape === piece.shape && (t.expected || t).size === piece.size));
        if (!target) continue;
        if (kind === 'shapes' && level >= 6 && piece.rotation !== target.rotation) { await choose(piece.id); for (let i = 0; i < 4; i++) { if (+(await page.locator(`[data-mo-piece="${piece.id}"]`).getAttribute('data-mo-rotation')) === target.rotation) break; await page.locator('#mo-turn-right').click(); } }
        await move(piece.id, target.id); occupied.add(target.id); amounts[target.id] = (amounts[target.id] || 0) + 1;
      }
      if (kind === 'grid' || kind === 'memory') { ok(await page.locator('#montessori').getAttribute('data-done') === 'false', `${kind}/${level}: waits for explicit check`); await page.locator('#mo-check').click(); }
      ok(await page.locator('#montessori').getAttribute('data-done') === 'true' && await rewards() === before + 1, `${kind}/${level}: solves and awards once`);
      if (level === levels) { await page.reload(); await menu(); await page.locator(`[data-mo-game="${kind}"]`).click(); ok(await page.locator('#montessori').getAttribute('data-done') === 'true' && await rewards() === before + 1, `${kind}: completed exercise resumes without a second reward`); }
    }
    await menu();
  }
  await page.locator('[data-mo-game="shapes"]').click(); await page.locator('[data-mo-level="6"]').click(); await page.locator('#mo-restart').click();
  const id = await page.locator('[data-mo-piece][data-mo-shape="triangle"]').first().getAttribute('data-mo-piece');
  await page.locator('[data-mo-surface]').scrollIntoViewIfNeeded();
  const from = await page.locator(`[data-mo-piece="${id}"]`).boundingBox(), board = await page.locator('[data-mo-surface]').boundingBox();
  await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2); await page.mouse.down(); await page.mouse.move(board.x + board.width * .42, board.y + board.height * .39, { steps: 10 }); await page.mouse.up();
  const moved = await saved(); ok(Math.abs(moved.positions[id][0] - 42) < 1 && Math.abs(moved.positions[id][1] - 39) < 1, 'Actual free drag parks at the release location');
  await page.locator('#mo-turn-right').click(); const turned = await saved();
  ok(JSON.stringify(turned.positions) === JSON.stringify(moved.positions), 'Rotation keeps all free positions');
  await menu(); await page.locator('[data-mo-game="shapes"]').click(); ok(JSON.stringify((await saved()).positions) === JSON.stringify(moved.positions), 'Menu return keeps piece positions');
  await page.reload(); await menu(); await page.locator('[data-mo-game="shapes"]').click(); ok(JSON.stringify((await saved()).positions) === JSON.stringify(moved.positions) && JSON.stringify((await saved()).rotations) === JSON.stringify(turned.rotations), 'Reload keeps positions and turns');
  await page.locator('[data-mo-level="5"]').click(); await page.locator('[data-mo-level="6"]').click(); ok(JSON.stringify((await saved()).positions) === JSON.stringify(moved.positions), 'Changing difficulty and returning preserves the earlier board');
  await choose(id); await page.locator(`[data-mo-piece="${id}"]`).focus(); await page.keyboard.press('ArrowRight'); ok((await saved()).positions[id][0] > moved.positions[id][0], 'Keyboard arrow moves the selected piece');
  await page.locator('#mo-undo').click(); ok(JSON.stringify((await saved()).positions) === JSON.stringify(moved.positions), 'Undo restores the previous free position');
  for (const kind of ['grid', 'memory']) {
    await menu(); await page.locator(`[data-mo-game="${kind}"]`).click(); await page.locator('[data-mo-level="1"]').click(); await page.locator('#mo-restart').click();
    const round = await exercise(); if (kind === 'memory') await page.locator('#mo-hide-pattern').click();
    const same = (p, t) => p.color === (t.expected || t).color && p.shape === (t.expected || t).shape && p.size === (t.expected || t).size;
    const used = new Set(); const solution = round.targets.map(t => { const p = round.pieces.find(p => !used.has(p.id) && same(p, t)); used.add(p.id); return p.id; });
    const a = 0, b = round.targets.findIndex(t => !same(round.pieces.find(p => p.id === solution[0]), t));
    for (let i = 0; i < round.targets.length; i++) await move(solution[i === a ? b : i === b ? a : i], round.targets[i].id);
    await page.locator('#mo-check').click(); ok(await page.locator('#montessori').getAttribute('data-done') === 'false' && await page.locator('.mo-slot[data-mo-piece]').count() === round.total, `${kind}: fully filled wrong arrangement stays editable`);
    if (kind === 'memory') { const placements = (await saved()).placements; await page.locator('#mo-show-pattern').click(); await page.locator('#mo-hide-pattern').click(); ok(JSON.stringify((await saved()).placements) === JSON.stringify(placements), 'Revisiting the sample preserves the attempted arrangement'); }
    await choose(solution[a]); await page.locator(`[data-mo-target="${round.targets[a].id}"]`).click();
    await page.locator('#mo-check').click(); ok(await page.locator('#montessori').getAttribute('data-done') === 'true', `${kind}: a two-tap swap corrects the filled arrangement`);
  }
  for (const size of [{ width: 320, height: 740 }, { width: 390, height: 844 }, { width: 932, height: 430 }, { width: 1194, height: 834 }]) {
    await page.setViewportSize(size);
    for (const [kind, level] of [['shapes', 8], ['colors', 5], ['tower', 5], ['grid', 4], ['memory', 4]]) {
      await menu(); await page.locator(`[data-mo-game="${kind}"]`).click(); await page.locator(`[data-mo-level="${level}"]`).click(); await page.locator('#mo-restart').click();
      for (const blocker of await page.locator('[data-mo-blocker]').evaluateAll(buttons => buttons.map(b => b.dataset.moBlocker))) await page.locator(`[data-mo-blocker="${blocker}"]`).click();
      const metrics = await page.evaluate(() => ({ overflow: document.documentElement.scrollWidth > innerWidth + 2, small: [...document.querySelectorAll('#montessori button')].filter(b => !b.disabled && b.getClientRects().length && (b.getBoundingClientRect().width < 43 || b.getBoundingClientRect().height < 43)).map(b => b.id || b.dataset.moTarget), outside: [...document.querySelectorAll('[data-mo-blocker], .mo-board-pieces .mo-piece')].filter(b => { const r = b.getBoundingClientRect(), board = document.querySelector('[data-mo-surface]').getBoundingClientRect(); return r.left < board.left - 1 || r.right > board.right + 1 || r.top < board.top - 1 || r.bottom > board.bottom + 1; }).length }));
      ok(!metrics.overflow && !metrics.small.length && !metrics.outside, `${kind}/${size.width}: fits, targets >=44px, pieces and blockers inside board: ${JSON.stringify(metrics)}`);
      if (size.width === 390) await page.screenshot({ path: `output/playwright/challenges-${kind}-${page.context().browser().browserType().name()}-${size.width}.png`, fullPage: true, animations: 'disabled' });
    }
  }
  await page.waitForFunction(() => document.querySelector('#offline-status')?.textContent.startsWith('Letöltve.'), undefined, { timeout: 60000 });
  await page.context().setOffline(true); await page.reload(); await menu();
  for (const kind of ['grid', 'memory']) {
    await page.locator(`[data-mo-game="${kind}"]`).click(); await page.locator('[data-mo-level="1"]').click(); await page.locator('#mo-restart').click();
    const round = await exercise(); if (kind === 'memory') await page.locator('#mo-hide-pattern').click();
    const used = new Set();
    for (const target of round.targets) { const t = target.expected || target, piece = round.pieces.find(p => !used.has(p.id) && p.color === t.color && p.shape === t.shape && p.size === t.size); used.add(piece.id); await move(piece.id, target.id); }
    await page.locator('#mo-check').click(); ok(await page.locator('#montessori').getAttribute('data-done') === 'true', `${kind}: new game is playable offline after reload`); await menu();
  }
  const decoded = await page.evaluate(async () => { const audio = new AudioContext(); try { return (await Promise.all(['montessori_shapes_size', 'montessori_shapes_turn', 'montessori_colors_shades', 'montessori_colors_count', 'montessori_grid', 'montessori_grid_size', 'montessori_grid_done', 'montessori_grid_retry', 'montessori_memory', 'montessori_memory_done', 'montessori_memory_retry'].map(async id => (await audio.decodeAudioData(await (await fetch(`./audio/voice/${id}.mp3`)).arrayBuffer())).duration))).every(n => n > 1); } finally { await audio.close(); } });
  ok(decoded, 'All 11 new Jessa instructions and feedback decode offline'); await page.context().setOffline(false);
  ok(!errors.length, `No browser exceptions: ${errors.join('; ')}`); return { checks: checks.length, results: checks };
}
