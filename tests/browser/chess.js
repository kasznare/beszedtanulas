// Run in a disposable headless playwright-cli session only.
async page => {
  const checks = [], errors = [], context = page.context();
  const ok = (condition, label) => { if (!condition) throw Error(label); checks.push(label); };
  const listener = error => errors.push(error.message); page.on('pageerror', listener);
  const base = new URL('/', page.url()).href;
  const saved = async () => await page.evaluate(() => JSON.parse(localStorage.getItem('speech_game_progress_v1')) || { rewards: 0, attempts: 0, plays: 0, words: {} });
  const home = async () => {
    if (await page.locator('#round-complete').isVisible()) await page.locator('#round-home').click();
    else if (await page.locator('#home-button').isVisible()) await page.locator('#home-button').click();
  };
  const enter = async () => { await home(); await page.locator('#home [data-open="number-menu"]').click(); await page.locator('#number-menu [data-open="chess"]').click(); };
  const square = name => (8 - Number(name[1])) * 8 + 'abcdefgh'.indexOf(name[0]);
  const cell = name => page.locator(`[data-chess-square="${square(name)}"]`);
  const move = async (from, to) => { await cell(from).click(); await cell(to).click(); };
  try {
    await context.setOffline(false);
    await page.evaluate(async () => {
      localStorage.clear();
      for (const registration of await navigator.serviceWorker.getRegistrations()) await registration.unregister();
      for (const key of await caches.keys()) await caches.delete(key);
    });
    await page.goto('about:blank'); await page.goto(base); await page.setViewportSize({ width: 1194, height: 834 });
    await page.waitForFunction(() => document.querySelector('#offline-status')?.textContent.startsWith('Letöltve.'), undefined, { timeout: 60000 });
    await enter();
    ok(await page.locator('[data-chess-square]').count() === 64, 'Authentic 8×8 board');
    ok(await page.locator('[data-chess-piece]').count() === 6, 'All six pieces');
    ok(await page.locator('#screen-kicker').innerText() === 'Számok és logika', 'Correct menu group');
    await page.locator('#back-button').click(); ok(await page.locator('#number-menu').isVisible(), 'Back returns to group');
    await page.locator('#number-menu [data-open="chess"]').click();
    for (const [piece, count] of [['rook',14],['bishop',13],['knight',8],['queen',27],['king',8],['pawn',2]]) {
      await page.locator(`[data-chess-piece="${piece}"]`).click();
      ok(await page.locator('.is-possible').count() === count, `${piece}: correct teaching dots`);
    }
    await page.locator('[data-chess-piece="rook"]').click();
    await move('d4','e5'); ok(await cell('d4').locator('.chess-piece').count() === 1, 'Illegal move stays retryable');
    await move('d4','a4'); ok(await cell('a4').locator('.chess-piece').count() === 1, 'Legal move works after mistake');
    await page.locator('#chess-undo').click(); ok(await cell('d4').locator('.chess-piece').count() === 1, 'Undo restores the piece');
    await cell('d4').focus(); await page.keyboard.press('ArrowLeft');
    ok(await cell('c4').evaluate(element => element === document.activeElement), 'Arrow keys move board focus');
    await page.keyboard.press('Enter'); ok(await cell('c4').locator('.chess-piece').count() === 1, 'Enter makes the move');
    await page.keyboard.press('Escape'); ok(await page.locator('.chess-square.is-selected').count() === 0, 'Escape clears selection');
    const beforeStars = await saved();
    const routes = {
      rook: [['d4','a4'],['a4','a7'],['a7','g7']], bishop: [['d4','b6'],['b6','g1'],['g1','h2']],
      knight: [['d4','e6'],['e6','g5'],['g5','h7']], queen: [['d4','g7'],['g7','b7'],['b7','e4']],
      king: [['d4','e5'],['e5','f5'],['f5','g6']], pawn: [['d2','d3'],['d3','d4'],['d4','d5'],['d5','d6']],
    };
    await page.locator('[data-chess-mode="stars"]').click();
    for (const [piece, steps] of Object.entries(routes)) {
      await page.locator(`[data-chess-piece="${piece}"]`).click();
      const before = await saved();
      await page.locator('#chess-hint').click(); ok(await page.locator('.is-possible').count() > 0, `${piece}: help shows legal squares`);
      await page.locator('#chess-hint').click();
      for (const [from,to] of steps) await move(from,to);
      await page.waitForSelector('#round-complete[open]');
      ok((await saved()).rewards === before.rewards + 1, `${piece}: three stars reward once`);
      ok((await saved()).attempts === before.attempts, `${piece}: speech counters preserved`);
      await page.keyboard.press('Escape'); await page.locator('#help-button').click();
      ok((await saved()).rewards === before.rewards + 1 && await page.locator('#chess-undo').isDisabled(), `${piece}: finished round cannot reward again`);
    }
    ok((await saved()).rewards === beforeStars.rewards + 6, 'Six different star rounds complete');
    await page.locator('[data-chess-mode="puzzles"]').click();
    const positions = await page.evaluate(async () => {
      const { CHESS_PUZZLES } = await import('./chess-data.js'); return CHESS_PUZZLES.map(({from,goal,id}) => ({from,goal,id}));
    });
    for (let index=0; index<positions.length; index++) {
      const { from,goal,id } = positions[index], before = await saved();
      await cell(goal).click(); ok((await page.locator('#chess-status').innerText()).includes('Előbb'), `${id}: asks for a piece first`);
      if (id === 'rook-capture') {
        await move(from,'c2'); ok(await cell(from).locator('.chess-piece').count() === 1, 'Legal off-target move gives guidance without losing the task');
      }
      if (id === 'king-safe') { await move(from,'d4'); ok(await cell(from).locator('.chess-piece').count() === 1, 'King cannot move into rook attack'); }
      if (id === 'king-distance') { await move(from,'e4'); ok(await cell(from).locator('.chess-piece').count() === 1, 'King cannot approach the other king'); }
      await move(from,goal); await page.waitForSelector('#round-complete[open]');
      ok((await saved()).rewards === before.rewards + 1, `${id}: one-move solution rewards once`);
      await page.keyboard.press('Escape');
      if (index < positions.length - 1) await page.locator('#chess-another').click();
    }
    await page.locator('#chess-restart').click();
    ok(await page.locator('.chess-board.is-complete').count() === 0, 'New round resets completion');
    await page.locator('[data-chess-mode="explore"]').click();
    await page.locator('[data-chess-piece="pawn"]').click();
    for (const [from,to] of [['d2','d4'],['d4','d5'],['d5','d6'],['d6','d7'],['d7','d8']]) await move(from,to);
    ok(await cell('d8').locator('.chess-piece-queen').count() === 1 && (await page.locator('.chess-rule h3').innerText()) === 'Vezér', 'Pawn promotion changes the figure and rule');
    for (const mode of ['explore','stars','puzzles']) {
      await page.locator(`[data-chess-mode="${mode}"]`).click();
      for (const [width,height] of [[320,568],[375,667],[430,932],[932,350],[834,1194],[1194,834]]) {
        await page.setViewportSize({width,height});
        const layout = await page.evaluate(() => {
          const board=document.querySelector('.chess-board').getBoundingClientRect();
          return { overflow:document.documentElement.scrollWidth>innerWidth,
            small:[...document.querySelectorAll('#chess button:not(.chess-square)')].filter(button=>{const r=button.getBoundingClientRect();return r.width<43.5||r.height<43.5;}).length,
            ratio:board.width/board.height };
        });
        ok(!layout.overflow && !layout.small && Math.abs(layout.ratio-1)<.02, `${mode}/${width}×${height}: square board, no overflow, large controls (${JSON.stringify(layout)})`);
      }
    }
    await page.setViewportSize({width:1194,height:834});
    await page.locator('[data-chess-mode="explore"]').click(); await page.locator('[data-chess-piece="knight"]').click();
    await page.screenshot({path:'output/playwright/chess-desktop.png', fullPage:true, animations:'disabled'});
    await page.setViewportSize({width:430,height:932});
    await page.screenshot({path:'output/playwright/chess-phone.png', fullPage:true, animations:'disabled'});
    await page.setViewportSize({width:932,height:350});
    await page.screenshot({path:'output/playwright/chess-landscape.png', fullPage:true, animations:'disabled'});
    await page.setViewportSize({width:1194,height:834});
    await page.emulateMedia({reducedMotion:'reduce'});
    await move('d4','e6');
    ok(await cell('e6').locator('.chess-piece').evaluate(element=>getComputedStyle(element).animationName) === 'none', 'Reduced motion respected');
    await page.emulateMedia({reducedMotion:'no-preference'});
    await page.reload(); await enter();
    ok(await page.locator('[data-chess-piece="knight"]').getAttribute('aria-pressed') === 'true' && await cell('d4').locator('.chess-piece').count() === 1, 'Preferences survive reload with a fresh lesson');
    await context.setOffline(true); await page.reload(); await enter();
    const cacheState = await page.evaluate(async () => {
      const files=['chess-data.js','chess-game.js','chess-art.js','chess.css','audio/voice/chess_knight.mp3','audio/voice/chess_done.mp3'];
      return Promise.all(files.map(async file => Boolean(await caches.match(new URL(file,location.href)))));
    });
    ok(cacheState.every(Boolean), 'Game and Hungarian audio are cached offline');
    await page.locator('[data-chess-mode="puzzles"]').click(); await move('b2','b6'); await page.waitForSelector('#round-complete[open]');
    ok(true, 'Puzzle completes entirely offline');
    await page.locator('#round-back').click(); ok(await page.locator('#number-menu').isVisible(), 'Celebration back returns to group');
    await page.locator('#number-menu [data-open="chess"]').click();
    await move('b2','b6'); await page.waitForSelector('#round-complete[open]'); await page.locator('#round-replay').click();
    ok(await cell('b2').locator('.chess-piece').count() === 1, 'Celebration replay starts a new chess task');
    ok(errors.length === 0, `No browser errors: ${errors.join(', ')}`);
    return {count:checks.length, engine:context.browser().browserType().name(), checks};
  } finally { await context.setOffline(false); page.off('pageerror', listener); }
}
