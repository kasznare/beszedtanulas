// Additional real UI checks; use only a disposable test-browser session.
async page => {
  const checks = [], context = page.context(), timings = [];
  const ok = (value, label) => { if (!value) throw Error(label); checks.push(label); };
  const saved = () => page.evaluate(() => JSON.parse(localStorage.getItem('speech_game_progress_v1')));
  const home = async () => {
    if (await page.locator('#round-complete').isVisible()) await page.locator('#round-home').click();
    else if (await page.locator('#home-button').isVisible()) await page.locator('#home-button').click();
  };
  const enter = async () => {
    await home(); await page.locator('#home [data-open="number-menu"]').click();
    await page.locator('#number-menu [data-open="chess"]').click();
    await page.locator('[data-chess-mode="puzzles"]').click();
  };
  const finish = async () => {
    await page.locator('[data-chess-square="49"]').click();
    return page.locator('[data-chess-square="17"]').evaluate(button => {
      const start = performance.now(); button.click();
      return { start, modal:document.querySelector('#round-complete').open, complete:document.querySelector('.chess-board').classList.contains('is-complete') };
    });
  };
  const openParent = async () => {
    await home(); await page.locator('#parent-button').click();
    const values = (await page.locator('#parent-gate-question').innerText()).match(/\d+/g).map(Number);
    await page.locator('#parent-gate-answers').getByRole('button',{ name:String(values[0]+values[1]),exact:true }).click();
  };
  await context.setOffline(false); await page.setViewportSize({width:1194,height:834});
  const base = new URL('/', page.url()).href;
  await page.evaluate(async () => {
    for (const registration of await navigator.serviceWorker.getRegistrations()) await registration.unregister();
    for (const key of await caches.keys()) await caches.delete(key);
  });
  await page.goto('about:blank'); await page.goto(base);
  await page.waitForFunction(()=>document.querySelector('#offline-status')?.textContent.startsWith('Letöltve.'),undefined,{timeout:60000});
  await enter();
  const before = await saved(), immediate = await finish();
  ok(immediate.complete && !immediate.modal && (await saved()).rewards === before.rewards+1, 'Finished board remains visible with an immediate saved reward');
  await page.waitForTimeout(500);
  ok(!(await page.locator('#round-complete').isVisible()), 'No celebration at half a second');
  await page.waitForSelector('#round-complete[open]');
  const elapsed = await page.evaluate(start => performance.now()-start, immediate.start); timings.push(elapsed);
  ok(elapsed>=1000, 'Celebration follows at least one second of visible play');
  await page.locator('#round-replay').click(); await finish();
  await page.locator('#chess-restart').click(); await page.waitForTimeout(1200);
  ok(!(await page.locator('#round-complete').isVisible()) && await page.locator('[data-chess-square="49"] .chess-piece').count()===1, 'Restart cancels the pending celebration');
  await finish(); await page.locator('[data-chess-mode="explore"]').click(); await page.waitForTimeout(1200);
  ok(!(await page.locator('#round-complete').isVisible()), 'Mode switch cancels the pending celebration');
  await page.locator('[data-chess-mode="puzzles"]').click(); await finish(); await page.locator('#home-button').click(); await page.waitForTimeout(1200);
  ok(!(await page.locator('#round-complete').isVisible()) && await page.locator('#home').isVisible(), 'Leaving cancels the pending celebration');
  await openParent();
  const child = await saved();
  await page.locator('#supabase-role').selectOption('admin'); await page.locator('#start-active-game').click();
  await enter(); const adult = await saved(); await finish(); await page.waitForSelector('#round-complete[open]');
  ok((await saved()).rewards===adult.rewards+1, 'Parent trial receives its own reward');
  await page.locator('#round-home').click(); await page.locator('#parent-preview [data-return-child]').click();
  const after = await saved();
  ok(after.rewards===child.rewards && after.attempts===child.attempts, 'Child results remain unchanged by parent trial');
  await enter(); await page.locator('[data-chess-mode="explore"]').click(); await page.locator('[data-chess-piece="rook"]').click();
  await page.evaluate(() => { window.chessNarrations=[]; document.addEventListener('narrationstart',event=>window.chessNarrations.push(event.detail.id)); });
  await context.setOffline(true); await page.locator('#chess-listen').click();
  await page.waitForFunction(()=>window.chessNarrations.includes('chess_rook'));
  ok(true, 'Hungarian rook narration actually starts offline');
  await page.locator('#home-button').click();
  ok(await page.locator('#chess .is-narrated').count()===0, 'Leaving clears narration indication');
  await context.setOffline(false);
  const touchContext = await context.browser().newContext({viewport:{width:430,height:932},hasTouch:true,isMobile:true,serviceWorkers:'block'});
  try {
    const touch = await touchContext.newPage(); await touch.goto(base);
    await touch.locator('#home [data-open="number-menu"]').tap(); await touch.locator('#number-menu [data-open="chess"]').tap();
    await touch.locator('[data-chess-mode="stars"]').tap();
    await touch.locator('[data-chess-square="35"]').tap(); await touch.locator('[data-chess-square="32"]').tap();
    ok(await touch.locator('[data-chess-square="32"] .chess-piece').count()===1, 'Touchscreen taps select and move to a star');
    await touch.locator('#chess-undo').tap();
    ok(await touch.locator('[data-chess-square="35"] .chess-piece').count()===1, 'Touchscreen undo restores a collected star');
    await touch.locator('[data-chess-mode="puzzles"]').tap();
    await touch.locator('[data-chess-square="49"]').tap(); await touch.locator('[data-chess-square="17"]').tap();
    await touch.waitForSelector('#round-complete[open]');
    ok(await touch.locator('.chess-board.is-complete').count()===1, 'Touchscreen capture finishes a small position');
  } finally { await touchContext.close(); }
  return {count:checks.length, engine:context.browser().browserType().name(), timings, checks};
}
