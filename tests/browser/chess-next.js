// Run only in a disposable playwright-cli session.
async page => {
  const context = page.context(), checks = [], errors = [];
  const ok = (value, label) => { if (!value) throw Error(label); checks.push(label); };
  const listener = error => errors.push(error.message); page.on('pageerror', listener);
  const base = new URL('/', page.url()).href;
  const cell = name => page.locator(`[data-chess-square="${(8-Number(name[1]))*8+'abcdefgh'.indexOf(name[0])}"]`);
  const move = async (from,to) => { await cell(from).click(); await cell(to).click(); };
  const saved = () => page.evaluate(() => JSON.parse(localStorage.getItem('speech_game_progress_v1')));
  const enter = async () => { await page.locator('#home [data-open="big-menu"]').click(); await page.locator('#big-menu [data-open="chess"]').click(); };
  const finish = async route => { for (const [from,to] of route) await move(from,to); await page.waitForSelector('#round-complete[open]'); };
  const routes = {
    easy: { count:10, first:[['b2','b6']], last:[['d4','b6']] },
    planning: { count:12, first:[['d4','d5'],['d5','g5'],['g5','g4']], last:[['e2','e8'],['e8','h8'],['h8','h5']] },
    challenge: { count:12, first:[['a2','b3'],['a1','a4']], last:[['a1','d1'],['d1','d8'],['b2','c3'],['c3','d4'],['d4','e5']] },
  };
  try {
    await context.setOffline(false);
    await page.evaluate(async () => {
      localStorage.clear();
      for (const registration of await navigator.serviceWorker.getRegistrations()) await registration.unregister();
      for (const key of await caches.keys()) await caches.delete(key);
    });
    await page.goto('about:blank'); await page.goto(base); await page.setViewportSize({width:1194,height:834});
    await page.waitForFunction(() => document.querySelector('#offline-status')?.textContent.startsWith('Letöltve.'), undefined, {timeout:60000});
    await enter(); await page.locator('[data-chess-mode="puzzles"]').click();
    for (const [level, { count, first, last }] of Object.entries(routes)) {
      await page.locator(`[data-chess-level="${level}"]`).click();
      const before = await saved();
      await finish(first);
      const button = page.locator('#round-replay');
      ok(await button.getAttribute('aria-label') === 'Következő feladat' && await button.innerText() === 'Következő feladat' && await button.locator('use').getAttribute('href') === '#i-next', `${level}: clear next-task label and arrow`);
      ok(await button.evaluate(element => element === document.activeElement), `${level}: primary next action receives keyboard focus`);
      const after = await saved();
      ok(after.rewards === before.rewards+1, `${level}: solution saves exactly one reward`);
      if (level === 'challenge') {
        for (const [width,height] of [[320,568],[375,667],[430,932],[932,350],[834,1194],[1194,834]]) {
          await page.setViewportSize({width,height});
          const fits = await page.locator('#round-complete').evaluate(dialog => {
            const rect=dialog.getBoundingClientRect();
            return dialog.scrollHeight<=dialog.clientHeight+1 && rect.top>=0 && rect.bottom<=innerHeight && rect.left>=0 && rect.right<=innerWidth && [...dialog.querySelectorAll('button')].every(button => { const r=button.getBoundingClientRect(); return r.width>=44&&r.height>=44&&r.left>=0&&r.right<=innerWidth&&r.top>=0&&r.bottom<=innerHeight; });
          });
          ok(fits, `Next-task dialog fits ${width}×${height} with large controls and no internal scroll`);
        }
        await page.setViewportSize({width:430,height:932});
        await page.screenshot({path:`output/playwright/chess-next-${context.browser().browserType().name()}-phone.png`,fullPage:true,animations:'disabled'});
        await page.setViewportSize({width:932,height:350});
        await page.screenshot({path:`output/playwright/chess-next-${context.browser().browserType().name()}-landscape.png`,fullPage:true,animations:'disabled'});
        await page.setViewportSize({width:1194,height:834});
      }
      if (level === 'easy') await page.keyboard.press('Enter'); else await button.click();
      ok(!(await page.locator('#round-complete').isVisible()) && (await page.locator('.chess-puzzle-nav').innerText()).includes(`2 / ${count}`), `${level}: success action opens the next position`);
      ok(await page.locator(`[data-chess-level="${level}"]`).getAttribute('aria-pressed') === 'true' && await page.locator('.chess-board.is-complete').count() === 0, `${level}: fresh position keeps the chosen difficulty`);
      ok((await saved()).rewards === after.rewards && (await saved()).attempts === after.attempts, `${level}: continuing adds no reward or speech attempt`);
      await page.locator(`[data-chess-level="${level}"]`).click(); await page.locator('#chess-prev').click();
      ok((await page.locator('.chess-puzzle-nav').innerText()).includes(`${count} / ${count}`), `${level}: last task selected`);
      await finish(last); await page.locator('#round-replay').click();
      ok((await page.locator('.chess-puzzle-nav').innerText()).includes(`1 / ${count}`), `${level}: success on the last task wraps to the first`);
    }
    await page.locator('[data-chess-mode="stars"]').click(); await page.locator('[data-chess-piece="rook"]').click();
    await finish([['d4','a4'],['a4','a7'],['a7','g7']]);
    ok(await page.locator('#round-replay').getAttribute('aria-label') === 'Még egy ilyen' && await page.locator('#round-replay').innerText() === 'Még egy ilyen' && await page.locator('#round-replay use').getAttribute('href') === '#i-repeat', 'Star rounds retain their repeat action');
    await page.locator('#round-replay').click();
    ok(await cell('d4').locator('.chess-piece-rook').count() === 1 && await page.locator('.chess-stars .is-earned').count() === 0, 'Star repeat starts a fresh collection round');
    await page.locator('#home-button').click(); await page.locator('#home [data-open="activity-menu"]').click(); await page.locator('#activity-menu [data-open="flip"]').click();
    for (const button of await page.locator('#flip-grid button').all()) await button.click();
    await page.waitForSelector('#round-complete[open]');
    ok(await page.locator('#round-replay').getAttribute('aria-label') === 'Még egy ilyen' && await page.locator('#round-replay').innerText() === 'Még egy ilyen' && await page.locator('#round-replay use').getAttribute('href') === '#i-repeat', 'The shared dialog resets its label and icon for another game');
    await page.locator('#round-home').click(); await enter();
    await page.locator('[data-chess-mode="puzzles"]').click(); await page.locator('[data-chess-level="planning"]').click();
    await page.locator('#home-button').click(); await context.setOffline(true); await page.reload(); await enter();
    await finish(routes.planning.first);
    await page.evaluate(() => { window.chessNextNarrations=[]; document.addEventListener('narrationstart', event => window.chessNextNarrations.push(event.detail.id)); });
    await page.locator('#round-replay').click();
    ok((await page.locator('.chess-puzzle-nav').innerText()).includes('2 / 12') && await page.locator('#chess-move-count').innerText() === 'Lépések: 0 / 3', 'Next-task action works entirely offline');
    await page.waitForFunction(() => window.chessNextNarrations.includes('chess_bishop_detour'));
    ok(true, 'The next task plays its own Hungarian narration offline');
    await page.locator('#back-button').click(); ok(await page.locator('#big-menu').isVisible(), 'Continuing preserves the normal back destination');
    ok(errors.length === 0, `No browser errors: ${errors.join(', ')}`);
    return { count:checks.length, engine:context.browser().browserType().name(), checks };
  } finally { await context.setOffline(false); page.off('pageerror',listener); }
}
