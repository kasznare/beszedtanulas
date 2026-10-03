// Dedicated disposable Playwright CLI session only; this resets test-browser storage.
async page => {
  const checks = [], errors = [], ok = (value, message) => { if (!value) throw Error(message); checks.push(message); };
  page.on('pageerror', error => errors.push(error.message));
  await page.evaluate(async () => { localStorage.clear(); for (const r of await navigator.serviceWorker.getRegistrations()) await r.unregister(); for (const c of await caches.keys()) await caches.delete(c); });
  const url = page.url(); await page.goto('about:blank'); await page.goto(url);
  const saved = () => page.evaluate(() => JSON.parse(localStorage.getItem('speech_game_progress_v1')));
  const enter = async () => { if (await page.locator('#round-complete').isVisible()) await page.locator('#round-home').click(); else if (await page.locator('#home-button').isVisible()) await page.locator('#home-button').click(); await page.locator('#home [data-open="play-menu"]').click(); await page.locator('#play-menu [data-open="memory"]').click(); };
  await enter();
  for (const pairs of [2, 3, 4, 6]) {
    await page.locator(`[data-pairs="${pairs}"]`).click();
    ok(await page.locator('[data-card]').count() === pairs * 2, `${pairs}: correct board size`);
    ok((await saved()).settings.memoryPairs === pairs, `${pairs}: option saved`);
    await page.locator('#memory-hint').click();
    ok(await page.locator('.memory-card.is-open').count() === pairs * 2, `${pairs}: visual preview reveals cards`);
    await page.locator('#memory-hint').click();
    ok(await page.locator('.memory-card.is-open').count() === 0, `${pairs}: preview can be dismissed`);
    const keys = await page.locator('[data-card]').evaluateAll(cards => cards.map(card => card.dataset.card));
    const first = keys[0], wrong = keys.find(key => key.slice(0, -2) !== first.slice(0, -2));
    await page.locator(`[data-card="${first}"]`).click(); await page.locator(`[data-card="${wrong}"]`).click();
    ok(await page.locator('[data-card]:enabled').count() === 0, `${pairs}: mismatch locks until visible feedback finishes`);
    await page.waitForFunction(() => !document.querySelector('.memory-card.is-open'));
    ok(await page.locator('[data-card]:enabled').count() === pairs * 2, `${pairs}: mismatch remains retryable`);
    const before = (await saved()).rewards;
    for (const id of new Set(keys.map(key => key.slice(0, -2)))) for (const key of keys.filter(key => key.slice(0, -2) === id)) await page.locator(`[data-card="${key}"]`).click();
    await page.waitForSelector('#round-complete[open]');
    ok((await saved()).rewards === before + 1, `${pairs}: whole board rewards exactly once`);
    ok((await saved()).attempts === 0, `${pairs}: speech attempts unaffected`);
    await page.locator('#round-replay').click();
    ok(await page.locator('.memory-card.is-open').count() === 0, `${pairs}: replay starts a fresh board`);
  }
  for (const [width, height] of [[375,667],[932,350],[834,1194],[1194,834]]) {
    await page.setViewportSize({width,height});
    const layout = await page.evaluate(() => ({ overflow: document.documentElement.scrollWidth > innerWidth, small: [...document.querySelectorAll('#memory button')].filter(b => { const r = b.getBoundingClientRect(); return r.width < 44 || r.height < 44; }).length }));
    ok(!layout.overflow && layout.small === 0, `${width}×${height}: fits and has 44px controls`);
  }
  await page.setViewportSize({width:375,height:667});
  await page.screenshot({path:'output/playwright/memory-phone.png',fullPage:true});
  await page.locator('#memory-hint').click(); await page.locator('#home-button').click();
  ok(await page.locator('#home').isVisible(), 'Leaving preview cancels the round');
  await page.reload(); await enter();
  ok(await page.locator('[data-card]').count() === 12, 'Pair count survives reload');
  ok(errors.length === 0, 'No browser errors');
  return {count:checks.length,checks};
}
