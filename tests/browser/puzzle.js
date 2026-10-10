// Run with playwright-cli run-code --filename in a disposable session.
// Build first; create output/playwright. This clears only test-browser storage.
async page => {
  const checks = [], errors = [], context = page.context();
  const ok = (value, message) => { if (!value) throw Error(message); checks.push(message); };
  const errorListener = error => errors.push(error.message);
  page.on('pageerror', errorListener);
  await context.setOffline(false);
  const url = page.url();
  await page.evaluate(async () => {
    localStorage.clear();
    for (const registration of await navigator.serviceWorker.getRegistrations()) await registration.unregister();
    for (const key of await caches.keys()) await caches.delete(key);
  });
  await page.goto('about:blank'); await page.goto(url);
  const saved = () => page.evaluate(() => JSON.parse(localStorage.getItem('speech_game_progress_v1')));
  const enter = async () => {
    if (await page.locator('#round-complete').isVisible()) await page.locator('#round-home').click();
    else if (await page.locator('#home-button').isVisible()) await page.locator('#home-button').click();
    await page.locator('#home [data-open="activity-menu"]').click();
    await page.locator('#activity-menu [data-open="puzzle"]').click();
  };
  const move = async (piece, target, finish = true) => {
    await page.locator(`[data-piece="${piece}"]`).scrollIntoViewIfNeeded();
    const from = await page.locator(`[data-piece="${piece}"]`).boundingBox();
    // Keep the board and tray in view together for a real pointer gesture.
    const to = await page.locator(target).boundingBox();
    await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2);
    await page.mouse.down();
    await page.mouse.move(to.x + to.width / 2, to.y + to.height / 2, { steps: 12 });
    if (finish) await page.mouse.up();
  };
  try {
    await page.setViewportSize({ width: 1194, height: 834 });
    await enter();
    ok(await page.locator('[data-puzzle-image]').count() === 4, 'Four illustrated puzzles are available');
    await page.locator('[data-slot="0"]').click();
    ok((await page.locator('#puzzle-status').innerText()).includes('Előbb'), 'An empty slot asks for a piece first');
    await page.locator('[data-piece="0"]').focus(); await page.keyboard.press('Enter');
    ok(await page.locator('[data-piece="0"]').getAttribute('aria-pressed') === 'true', 'Keyboard selects a piece');
    await page.keyboard.press('Escape');
    ok(await page.locator('.puzzle-piece.is-selected').count() === 0, 'Escape cancels selection');
    await page.keyboard.press('Space');
    await page.locator('[data-slot="0"]').focus(); await page.keyboard.press('Enter');
    ok(await page.locator('.puzzle-slot.is-placed').count() === 1, 'Keyboard places a piece');
    await move(1, '[data-slot="2"]');
    ok(await page.locator('[data-slot="2"]').getAttribute('data-piece') === '1' && await page.locator('.puzzle-slot.is-placed').count() === 2, 'A wrong destination accepts the piece without marking completion');
    await move(1, '[data-slot="1"]');
    ok(await page.locator('[data-slot="1"]').getAttribute('data-piece') === '1' && await page.locator('.puzzle-drag-preview').count() === 0, 'A board piece can be dragged again to another slot');
    await move(2, '[data-slot="0"]');
    ok(await page.locator('[data-slot="0"]').getAttribute('data-piece') === '2' && await page.locator('.puzzle-tray [data-piece="0"]').count() === 1, 'Tray to occupied slot returns the displaced piece to the tray');
    await page.locator('[data-piece="0"]').click(); await page.locator('[data-slot="2"]').click();
    await page.locator('[data-slot="0"]').click(); await page.locator('[data-slot="2"]').click();
    ok(await page.locator('[data-slot="0"]').getAttribute('data-piece') === '0' && await page.locator('[data-slot="2"]').getAttribute('data-piece') === '2', 'Tapping two board pieces swaps their positions');
    await page.locator('[data-slot="1"]').focus(); await page.keyboard.press('Enter');
    await page.locator('#puzzle-return').focus(); await page.keyboard.press('Enter');
    ok(await page.locator('.puzzle-tray [data-piece="1"]').count() === 1 && await page.locator('[data-slot="1"]').getAttribute('data-piece') === null, 'Keyboard can return a placed piece to the tray');
    await move(1, '[data-slot="1"]');
    await move(1, '.puzzle-tray');
    ok(await page.locator('.puzzle-tray [data-piece="1"]').count() === 1, 'Dropping a board piece onto the tray returns it');
    await move(1, '[data-slot="1"]');
    await move(3, '.puzzle-heading');
    ok(await page.locator('.puzzle-tray [data-piece="3"]').count() === 1 && await page.locator('.puzzle-drag-preview').count() === 0, 'Dropping outside board and tray preserves the piece');
    await page.locator('[data-slot="3"]').click();
    ok(await page.locator('.puzzle-slot.is-placed').count() === 4, 'An outside drop can immediately be corrected by tapping');
    await move(4, '[data-slot="4"]', false);
    await page.locator('#puzzle').dispatchEvent('pointercancel'); await page.mouse.up();
    ok(await page.locator('.puzzle-drag-preview').count() === 0 && await page.locator('.puzzle-tray [data-piece="4"]').count() === 1, 'Interrupted gesture cleans up without moving a piece');
    await page.locator('#puzzle-restart').click();
    ok(await page.locator('.puzzle-slot.is-placed').count() === 0, 'Restart clears placed pieces');

    for (const image of ['farm', 'garden', 'pond', 'forest']) for (const size of [6, 8, 10]) {
      await page.locator(`[data-puzzle-image="${image}"]`).click();
      await page.locator(`[data-puzzle-size="${size}"]`).click();
      await page.waitForFunction(() => [...document.querySelectorAll('#puzzle img')].every(image => image.complete && image.naturalWidth === 1536));
      ok(await page.locator('[data-piece]').count() === size && await page.locator('[data-slot]').count() === size, `${image}/${size}: full board and tray`);
      ok((await saved()).settings.puzzleImage === image && (await saved()).settings.puzzlePieces === size, `${image}/${size}: settings saved`);
      await page.locator('#puzzle-hint').click();
      ok(await page.locator('.puzzle-board.has-hint').count() === 1, `${image}/${size}: visible picture guide`);
      await page.locator('#puzzle-hint').click();
      ok(await page.locator('.puzzle-board.has-hint').count() === 0, `${image}/${size}: picture guide dismisses`);
      const before = await saved();
      for (let id = 0; id < size; id++) {
        await page.locator(`[data-piece="${id}"]`).click(); await page.locator(`[data-slot="${(id + 1) % size}"]`).click();
      }
      ok(await page.locator('.puzzle-slot.is-placed').count() === size && await page.locator('.puzzle-tray [data-piece]').count() === 0 && !(await page.locator('#round-complete').isVisible()) && (await saved()).rewards === before.rewards, `${image}/${size}: a full incorrectly arranged board stays movable and earns no reward`);
      let completedAt;
      for (let id = 0; id < size; id++) {
        if (await page.locator('.puzzle-board.is-complete').count()) break;
        if (await page.locator(`[data-slot="${id}"]`).getAttribute('data-piece') === String(id)) continue;
        await page.locator(`[data-piece="${id}"]`).click();
        await page.locator(`[data-slot="${id}"]`).click();
        completedAt = Date.now();
      }
      ok(await page.locator('.puzzle-board.is-complete').count() === 1 && !(await page.locator('#round-complete').isVisible()), `${image}/${size}: the finished picture is visible before the success window`);
      if (image === 'farm' && size === 6) await page.screenshot({path:`output/playwright/puzzle-finished-${context.browser().browserType().name()}.png`, fullPage:true, animations:'disabled'});
      await page.waitForSelector('#round-complete[open]');
      ok(Date.now() - completedAt >= 900, `${image}/${size}: success waits about one second`);
      ok((await saved()).rewards === before.rewards + 1, `${image}/${size}: one complete picture gives exactly one reward`);
      ok((await saved()).attempts === before.attempts, `${image}/${size}: speech attempts unaffected`);
      ok(await page.locator('#round-complete-title').innerText() === 'Elkészült a kép!', `${image}/${size}: puzzle celebration`);
      await page.keyboard.press('Escape');
      ok(await page.locator('.puzzle-slot.is-placed:disabled').count() === size && await page.locator('[data-piece]').count() === 0, `${image}/${size}: finished image stays complete`);
      await page.locator('#help-button').click();
      ok((await saved()).rewards === before.rewards + 1, `${image}/${size}: revisiting completion cannot reward twice`);
      await page.locator('#puzzle-restart').click();
    }

    await page.locator('[data-puzzle-size="6"]').click();
    const solve = async () => {
      for (let id = 0; id < 6; id++) {
        await page.locator(`[data-piece="${id}"]`).click(); await page.locator(`[data-slot="${id}"]`).click();
      }
    };
    const beforeRestart = (await saved()).rewards;
    await solve(); await page.locator('#puzzle-restart').click();
    await page.waitForTimeout(1200);
    ok(!(await page.locator('#round-complete').isVisible()) && await page.locator('.puzzle-slot.is-placed').count() === 0 && (await saved()).rewards === beforeRestart + 1, 'Restart during success delay cancels the window and preserves the earned reward');
    await solve(); await page.locator('#home-button').click();
    await page.waitForTimeout(1200);
    ok(!(await page.locator('#round-complete').isVisible()) && await page.locator('#home').isVisible() && (await saved()).rewards === beforeRestart + 2, 'Leaving during success delay cannot open a window on the home screen');
    await enter(); await page.locator('[data-puzzle-size="10"]').click();

    for (const [width, height] of [[320,568],[375,667],[390,844],[932,350],[834,1194],[1194,834]]) {
      await page.setViewportSize({ width, height });
      const layout = await page.evaluate(() => ({
        overflow: document.documentElement.scrollWidth > innerWidth,
        small: [...document.querySelectorAll('#puzzle button')].filter(button => { const r = button.getBoundingClientRect(); return r.width < 43.5 || r.height < 43.5; }).map(button => button.outerHTML.slice(0,100)),
        ratio: document.querySelector('.puzzle-board').getBoundingClientRect().width / document.querySelector('.puzzle-board').getBoundingClientRect().height,
      }));
      ok(!layout.overflow && !layout.small.length && Math.abs(layout.ratio - 1.5) < .02, `${width}×${height}: whole image, no overflow and ≥44px controls (${JSON.stringify(layout)})`);
      await page.screenshot({ path: `output/playwright/puzzle-${context.browser().browserType().name()}-${width}.png`, fullPage: true, animations: 'disabled' });
    }
    await page.setViewportSize({ width: 1194, height: 834 });
    await move(0, '[data-slot="0"]', false);
    await page.evaluate(() => document.querySelector('#home-button').click()); await page.mouse.up();
    ok(await page.locator('.puzzle-drag-preview').count() === 0 && await page.locator('#home').isVisible(), 'Leaving during a drag removes its preview');
    await page.reload(); await enter();
    ok(await page.locator('[data-piece]').count() === 10 && await page.locator('[data-puzzle-image="forest"]').getAttribute('aria-pressed') === 'true', 'Picture/size survive reload with a fresh board');
    if (await page.evaluate(() => navigator.maxTouchPoints > 0)) {
      await page.locator('[data-piece="0"]').tap(); await page.locator('[data-slot="0"]').tap();
      ok(await page.locator('.puzzle-slot.is-placed').count() === 1, 'Actual touchscreen taps select and place');
      await page.locator('#puzzle-restart').click();
    }
    await page.waitForFunction(() => document.querySelector('#offline-status')?.textContent.startsWith('Letöltve.'), undefined, { timeout: 60000 });
    await context.setOffline(true); await page.reload(); await enter();
    await page.locator('[data-puzzle-image="pond"]').click();
    await page.locator('[data-puzzle-size="6"]').click();
    await page.waitForFunction(() => document.querySelector('.puzzle-reference').naturalWidth === 1536);
    for (let id = 0; id < 6; id++) {
      await page.locator(`[data-piece="${id}"]`).click(); await page.locator(`[data-slot="${id}"]`).click();
    }
    await page.waitForSelector('#round-complete[open]');
    ok(true, 'A different puzzle loads and finishes entirely offline');
    await page.locator('#round-replay').click();
    ok(await page.locator('[data-piece]').count() === 6 && await page.locator('.puzzle-slot.is-placed').count() === 0, 'Celebration replay starts a fresh puzzle');
    ok(errors.length === 0, `No browser errors: ${errors.join(', ')}`);
    return { count: checks.length, pictures: 4, sizes: [6,8,10], engine: context.browser().browserType().name(), checks };
  } finally {
    await context.setOffline(false);
    page.off('pageerror', errorListener);
  }
}
