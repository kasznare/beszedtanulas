// Use a disposable playwright-cli browser session; no personal storage is touched.
async page => {
  const context = page.context(), checks = [], errors = [];
  const ok = (value, label) => { if (!value) throw Error(label); checks.push(label); };
  const listener = error => errors.push(error.message); page.on('pageerror', listener);
  const base = new URL('/', page.url()).href;
  const square = name => (8 - Number(name[1])) * 8 + 'abcdefgh'.indexOf(name[0]);
  const cell = name => page.locator(`[data-chess-square="${square(name)}"]`);
  const move = async (from, to) => { await cell(from).click(); await cell(to).click(); };
  const saved = () => page.evaluate(() => JSON.parse(localStorage.getItem('speech_game_progress_v1')));
  const enter = async () => {
    await page.locator('#home [data-open="big-menu"]').click();
    await page.locator('#big-menu [data-open="chess"]').click();
  };
  const routes = {
    planning: [
      [['d4','d5'],['d5','g5'],['g5','g4']],
      [['c1','b2'],['b2','f6'],['f6','g5']],
      [['b1','a3'],['a3','c4']],
      [['b2','d2'],['d2','g5']],
      [['c2','d2'],['d2','e3'],['e3','e4']],
      [['d4','e5'],['e5','f6'],['f6','f7']],
    ],
    challenge: [
      [['a2','b3'],['a1','a4']],
      [['d2','f3'],['c1','h6']],
      [['e2','e8'],['e8','h8']],
      [['b1','c3'],['c3','e4'],['e4','f6']],
      [['d6','e7'],['e7','e8'],['e8','h8']],
      [['a1','a8'],['a8','d8'],['c2','d3'],['d3','e4']],
    ],
  };
  try {
    await context.setOffline(false);
    await page.evaluate(async () => {
      localStorage.clear();
      for (const registration of await navigator.serviceWorker.getRegistrations()) await registration.unregister();
      for (const key of await caches.keys()) await caches.delete(key);
      localStorage.setItem('beszedtanulas.chess.v1', JSON.stringify({ mode:'puzzles', piece:'rook' }));
    });
    await page.goto('about:blank'); await page.goto(base); await page.setViewportSize({width:1194,height:834});
    await page.waitForFunction(() => document.querySelector('#offline-status')?.textContent.startsWith('Letöltve.'), undefined, {timeout:60000});
    await enter();
    ok(await page.locator('[data-chess-level="easy"]').getAttribute('aria-pressed') === 'true', 'Old settings migrate to the beginner level');
    ok((await page.locator('.chess-puzzle-nav').innerText()).includes('1 / 10'), 'Ten beginner tasks remain');
    await page.locator('[data-chess-level="planning"]').click();
    await cell('e4').click(); ok((await page.locator('#chess-status').innerText()).includes('helyén marad'), 'The blocker remains fixed');
    await move('d4','e5');
    ok(await page.locator('#chess-move-count').innerText() === 'Lépések: 0 / 3', 'Illegal moves do not consume the budget');
    await page.locator('#chess-hint').click();
    ok(await page.locator('.chess-tip').isVisible() && await page.locator('.is-possible').count() > 0, 'Help gives a clue and legal moves');
    await page.locator('#chess-hint').click();
    ok(await page.locator('.chess-tip').count() === 0, 'Clue can be hidden');
    const initial = await saved();
    for (const [from,to] of [['d4','d3'],['d3','d2'],['d2','d1']]) await move(from,to);
    ok((await page.locator('#chess-status').innerText()).includes('Elfogytak'), 'Exhaustion explains how to retry');
    await move('d1','g1');
    ok(await cell('d1').locator('.chess-piece').count() === 1 && await page.locator('#chess-move-count').innerText() === 'Lépések: 3 / 3', 'An exhausted task accepts no extra move');
    ok((await saved()).rewards === initial.rewards && !(await page.locator('#round-complete').isVisible()), 'Unfinished tasks do not reward');
    await page.locator('#chess-undo').click();
    ok(await cell('d2').locator('.chess-piece').count() === 1 && await page.locator('#chess-move-count').innerText() === 'Lépések: 2 / 3', 'Undo restores the move budget');
    await page.locator('#chess-restart').click();
    for (const [level, positions] of Object.entries(routes)) {
      await page.locator(`[data-chess-level="${level}"]`).click();
      for (let index = 0; index < positions.length; index++) {
        const route = positions[index], before = await saved();
        ok((await page.locator('.chess-puzzle-nav').innerText()).includes(`${index+1} / 12`), `${level}/${index}: correct navigation`);
        if (level === 'planning' && index === 4) {
          await move('c2','c3'); ok(await cell('c2').locator('.chess-piece').count() === 1, 'King avoids a pawn attack');
        }
        if (level === 'challenge' && index === 2) {
          await move('e2','d2'); ok(await cell('e2').locator('.chess-piece').count() === 1, 'Pinned rook cannot expose its king');
        }
        for (let step = 0; step < route.length; step++) {
          const [from,to] = route[step]; await move(from,to);
          ok(await page.locator('#chess-move-count').innerText() === `Lépések: ${step+1} / ${route.length}`, `${level}/${index}/${step}: move counted`);
          if (step < route.length - 1) ok((await saved()).rewards === before.rewards, `${level}/${index}/${step}: no partial reward`);
          if (level === 'challenge' && index === 0 && step === 0) {
            ok(await page.locator('#chess-capture-count').innerText() === '◎ Ütések: 1 / 1', 'Helper capture counts toward the shared objective');
            await page.locator('#chess-undo').click();
            ok(await cell('b3').locator('.chess-piece-black').count() === 1 && await page.locator('#chess-capture-count').innerText() === '◎ Ütések: 0 / 1', 'Undo restores a captured target and its counter');
            await move(from,to);
          }
          if (level === 'challenge' && index === 4 && step === 1) {
            ok(await cell('e8').locator('.chess-piece-queen').count() === 1 && await page.locator('.chess-rule h3').innerText() === 'Vezér', 'Promotion changes both the actor and teaching rule');
            await page.locator('#chess-undo').click();
            ok(await cell('e7').locator('.chess-piece-pawn').count() === 1 && await page.locator('.chess-rule h3').innerText() === 'Gyalog', 'Undo reverses promotion');
            await move(from,to);
          }
        }
        await page.waitForSelector('#round-complete[open]');
        ok((await saved()).rewards === before.rewards + 1 && (await saved()).attempts === before.attempts, `${level}/${index}: complete task rewards once without speech attempts`);
        await page.keyboard.press('Escape'); await page.locator('#help-button').click();
        ok((await saved()).rewards === before.rewards + 1 && await page.locator('#chess-undo').isDisabled(), `${level}/${index}: completed task cannot reward again`);
        if (index < positions.length-1) await page.locator('#chess-another').click();
      }
    }
    await page.locator('.chess-jump > summary').click();
    await page.locator('#chess-jump-select').selectOption('11');
    await page.locator('#chess-next').click();
    ok((await page.locator('.chess-puzzle-nav').innerText()).includes('1 / 12'), 'Next wraps within the selected level');
    await page.locator('#chess-prev').click();
    ok((await page.locator('.chess-puzzle-nav').innerText()).includes('12 / 12'), 'Previous wraps within the selected level');
    // Complete a task, then switch level during the one-second celebration delay.
    await page.locator('[data-chess-level="planning"]').click();
    for (const [from,to] of routes.planning[0]) await move(from,to);
    await page.locator('[data-chess-level="challenge"]').click(); await page.waitForTimeout(1200);
    ok(!(await page.locator('#round-complete').isVisible()) && await page.locator('.chess-board.is-complete').count() === 0, 'Level switch cancels a pending celebration');
    await page.locator('#chess-hint').click();
    ok(await page.locator('.is-movable').count() === 2, 'Help identifies both usable pieces');
    for (const [width,height] of [[320,568],[375,667],[430,932],[932,350],[834,1194],[1194,834]]) {
      await page.setViewportSize({width,height});
      const layout = await page.evaluate(() => {
        const board = document.querySelector('.chess-board').getBoundingClientRect();
        return { overflow:document.documentElement.scrollWidth > innerWidth,
          small:[...document.querySelectorAll('#chess button:not(.chess-square)')].some(element => { const r=element.getBoundingClientRect(); return r.width<43.5||r.height<43.5; }), ratio:board.width/board.height };
      });
      ok(!layout.overflow && !layout.small && Math.abs(layout.ratio-1)<.02, `Advanced ${width}×${height}: large controls, square board, no overflow`);
    }
    await page.setViewportSize({width:430,height:932});
    await page.screenshot({path:'output/playwright/chess-complex-phone.png',fullPage:true,animations:'disabled'});
    await page.setViewportSize({width:1194,height:834});
    await page.screenshot({path:'output/playwright/chess-complex-tablet.png',fullPage:true,animations:'disabled'});
    await page.locator('#home-button').click(); await page.reload(); await enter();
    ok(await page.locator('[data-chess-level="challenge"]').getAttribute('aria-pressed') === 'true' && await page.locator('#chess-move-count').innerText() === 'Lépések: 0 / 2', 'Difficulty survives reload with a fresh task');
    await context.setOffline(true); await page.reload(); await enter();
    await page.evaluate(() => { window.chessNarrations=[]; document.addEventListener('narrationstart',event => window.chessNarrations.push(event.detail.id)); });
    await page.locator('#help-button').click();
    await page.waitForFunction(() => window.chessNarrations.includes('chess_rook_team'));
    ok(true, 'New Hungarian task narration actually starts offline');
    const audioCached = await page.evaluate(async () => {
      const { CHESS_CLIPS } = await import('./chess-data.js');
      const ids = Object.keys(CHESS_CLIPS).filter(id => ['detour','route','collect','team','pin','steps_used'].some(part => id.includes(part)));
      return (await Promise.all(ids.map(id => caches.match(new URL(`audio/voice/${id}.mp3`,location.href))))).every(Boolean);
    });
    ok(audioCached, 'All new task and retry recordings are cached');
    const beforeOffline = await saved();
    for (const [from,to] of routes.challenge[0]) await move(from,to);
    await page.waitForSelector('#round-complete[open]');
    ok((await saved()).rewards === beforeOffline.rewards+1, 'Cooperative task finishes completely offline');
    await page.locator('#round-replay').click();
    ok(await page.locator('#chess-move-count').innerText() === 'Lépések: 0 / 2' && await cell('c1').locator('.chess-piece-bishop').count() === 1 && (await page.locator('.chess-puzzle-nav').innerText()).includes('2 / 12'), 'Celebration continues to the next cooperative task');
    ok(errors.length === 0, `No browser errors: ${errors.join(', ')}`);
    return { count:checks.length, engine:context.browser().browserType().name(), checks };
  } finally { await context.setOffline(false); page.off('pageerror',listener); }
}
