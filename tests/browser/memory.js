// Dedicated disposable Playwright CLI session only; this resets test-browser storage.
async page => {
  const checks = [], errors = [], ok = (value, message) => { if (!value) throw Error(message); checks.push(message); };
  page.on('pageerror', error => errors.push(error.message));
  await page.evaluate(async () => { localStorage.clear(); for (const r of await navigator.serviceWorker.getRegistrations()) await r.unregister(); for (const c of await caches.keys()) await caches.delete(c); });
  const url = page.url(); await page.goto('about:blank'); await page.goto(url);
  const saved = () => page.evaluate(() => JSON.parse(localStorage.getItem('speech_game_progress_v1')));
  const enter = async () => { if (await page.locator('#round-complete').isVisible()) await page.locator('#round-home').click(); else if (await page.locator('#home-button').isVisible()) await page.locator('#home-button').click(); await page.locator('#home [data-open="activity-menu"]').click(); await page.locator('#activity-menu [data-open="memory"]').click(); };
  await enter();
  ok(await page.locator('[data-pairs]').count() === 0, 'No pair-count menu on the child screen');
  // Classic keys are "<word>-<copy>", so the test can play a perfect memory after one deliberate mismatch.
  for (const pairs of [3, 4, 6]) {
    ok(await page.locator('[data-card]').count() === pairs * 2, `${pairs}: board size follows the saved level`);
    await page.locator('#memory-hint').click();
    ok(await page.locator('.memory-card.is-open').count() === pairs * 2, `${pairs}: the one shared look reveals the cards`);
    await page.locator('#memory-hint').click();
    ok(await page.locator('.memory-card.is-open').count() === 0, `${pairs}: the look can be ended`);
    ok(await page.locator('#memory-hint').isDisabled(), `${pairs}: only one look per round`);
    const keys = await page.locator('[data-card]').evaluateAll(cards => cards.map(card => card.dataset.card));
    const word = key => key.slice(0, key.lastIndexOf('-'));
    const first = keys[0], wrong = keys.find(key => word(key) !== word(first));
    await page.locator(`[data-card="${first}"]`).click(); await page.locator(`[data-card="${wrong}"]`).click();
    ok(await page.locator('[data-card]:enabled').count() === 0, `${pairs}: mismatch locks until visible feedback finishes`);
    await page.waitForFunction(() => !document.querySelector('.memory-card.is-open'));
    const before = (await saved()).rewards;
    for (const id of new Set(keys.map(word))) for (const key of keys.filter(key => word(key) === id)) await page.locator(`[data-card="${key}"]`).click();
    await page.waitForSelector('#round-complete[open]');
    ok(await page.locator('#complete-stars').innerText() === '⭐⭐⭐⭐⭐', `${pairs}: one mismatch still earns five stars`);
    ok((await saved()).rewards === before + 1, `${pairs}: whole board rewards exactly once`);
    ok((await saved()).settings.memoryPairs === { 3: 4, 4: 6, 6: 6 }[pairs], `${pairs}: a good round saves the next size`);
    await page.locator('#round-replay').click();
    ok(await page.locator('.memory-card.is-open').count() === 0, `${pairs}: replay starts a fresh board`);
    ok(!(await page.locator('#memory-hint').isDisabled()), `${pairs}: a new round has a new look`);
  }
  for (const [width, height] of [[375,667],[932,350],[768,900],[1024,680],[834,1194],[1194,834]]) {
    await page.setViewportSize({width,height});
    const layout = await page.evaluate(() => ({ overflow: document.documentElement.scrollWidth > innerWidth, small: [...document.querySelectorAll('#memory button')].filter(b => { const r = b.getBoundingClientRect(); return r.width < 44 || r.height < 44; }).length }));
    ok(!layout.overflow && layout.small === 0, `${width}×${height}: fits and has 44px controls`);
  }
  await page.setViewportSize({width:375,height:667});
  await page.screenshot({path:'output/playwright/memory-phone.png',fullPage:true});
  await page.locator('#memory-hint').click(); await page.locator('#home-button').click();
  ok(await page.locator('#home').isVisible(), 'Leaving preview cancels the round');
  await page.reload(); await enter();
  ok(await page.locator('[data-card]').count() === 12, 'The reached level survives reload');
  ok(errors.length === 0, 'No browser errors');
  return {count:checks.length,checks};
}
