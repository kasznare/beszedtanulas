// Chromium touch input and final layout verification, in an isolated CLI session.
async page => {
  const checks = [], errors = [], context = page.context(), url = page.url();
  const ok = (value, message) => { if (!value) throw Error(message); checks.push(message); };
  page.on('pageerror', error => errors.push(error.message));
  await page.evaluate(async () => {
    for (const registration of await navigator.serviceWorker.getRegistrations()) await registration.unregister();
    for (const key of await caches.keys()) await caches.delete(key);
    const saved = JSON.parse(localStorage.getItem('speech_game_progress_v1')) || {};
    saved.settings = { ...saved.settings, spokenGuidance: false };
    localStorage.setItem('speech_game_progress_v1', JSON.stringify(saved));
  });
  await page.goto('about:blank'); await page.goto(url);
  await page.locator('#home [data-open="activity-menu"]').click();
  await page.locator('#activity-menu [data-open="montessori"]').click();
  ok(await page.evaluate(() => JSON.parse(localStorage.getItem('beszedtanulas.playTime.v1')).startedAt !== null), 'Montessori starts the shared play-time budget');
  const ready = () => page.locator('#mo-restart:not([disabled])').waitFor();
  for (const size of [{ width: 1194, height: 834 }, { width: 320, height: 740 }, { width: 390, height: 844 }, { width: 932, height: 430 }]) {
    await page.setViewportSize(size);
    for (const kind of ['shapes', 'colors', 'tower']) {
      await page.locator(`[data-mo-game="${kind}"]`).click();
      await page.locator(`[data-mo-level="${kind === 'shapes' ? 4 : 3}"]`).click();
      ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 2), `${kind}: final layout has no overflow at ${size.width}×${size.height}`);
      await page.screenshot({ path: `output/playwright/montessori-final-${kind}-${size.width}.png`, fullPage: true, animations: 'disabled' });
      await page.locator('#mo-back').click();
    }
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.locator('[data-mo-game="shapes"]').click(); await page.locator('[data-mo-level="3"]').click();
  const client = await context.newCDPSession(page);
  await client.send('Emulation.setTouchEmulationEnabled', { enabled: true });
  const dragTouch = async (from, to, release = true) => {
    const point = (x, y) => [{ x, y, radiusX: 6, radiusY: 6, force: 1, id: 0 }];
    await client.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: point(from.x, from.y) });
    for (let i = 1; i <= 10; i++) await client.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: point(from.x + (to.x - from.x) * i / 10, from.y + (to.y - from.y) * i / 10) });
    if (release) await client.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  };
  const center = rect => ({ x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 });
  const id = await page.locator('[data-mo-piece]').first().getAttribute('data-mo-piece');
  await page.locator(`[data-mo-piece="${id}"]`).scrollIntoViewIfNeeded();
  await dragTouch(center(await page.locator(`[data-mo-piece="${id}"]`).boundingBox()), center(await page.locator(`[data-mo-target="${id}"]`).boundingBox()));
  await ready();
  ok(await page.locator('.mo-box-window svg').count() === 1, 'Native touch drag places and animates a shape');
  await page.locator('[data-mo-level="4"]').click();
  const blocker = page.locator('[data-mo-blocker]').first(), blockerId = await blocker.getAttribute('data-mo-blocker');
  const start = center(await blocker.boundingBox());
  await dragTouch(start, { x: start.x + 85, y: start.y });
  ok(await page.locator(`[data-mo-blocker="${blockerId}"].is-cleared`).count() === 1, 'Native touch drag clears an obstacle');
  await page.locator('[data-mo-level="3"]').click();
  const hiddenId = await page.locator('[data-mo-piece]').first().getAttribute('data-mo-piece');
  await page.locator(`[data-mo-piece="${hiddenId}"]`).click(); await page.locator(`[data-mo-target="${hiddenId}"]`).click();
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', { configurable: true, value: true }); document.dispatchEvent(new Event('visibilitychange'));
  });
  ok(await page.locator('.mo-flying-piece,.mo-arriving-piece').count() === 0, 'Hiding the page cancels a pending animation');
  await page.evaluate(() => { delete document.hidden; document.dispatchEvent(new Event('visibilitychange')); });
  ok(await page.locator('.mo-box-window svg').count() === 1 && !await page.locator('#mo-restart').isDisabled(), 'Returning after interruption preserves the accepted move and unlocks the game');
  await page.locator('#mo-restart').click();
  await page.evaluate(() => {
    const originalFetch = window.fetch, originalStart = AudioBufferSourceNode.prototype.start;
    window.moTestRequested = []; window.moTestStarted = [];
    window.fetch = function (src, ...args) { window.moTestRequested.push(String(src)); return originalFetch.call(this, src, ...args); };
    AudioBufferSourceNode.prototype.start = function (...args) { window.moTestStarted.push(this.buffer?.duration || 0); return originalStart.apply(this, args); };
  });
  await page.locator('#help-button').click();
  await page.waitForFunction(() => window.moTestRequested.some(src => src.includes('montessori_shapes_3')) && window.moTestStarted.some(duration => duration > 1));
  ok(true, 'Explicit help plays even when automatic spoken guidance is disabled');
  await page.evaluate(() => {
    const key = 'beszedtanulas.playTime.v1';
    localStorage.setItem(key, JSON.stringify({ version: 1, cycle: 'montessori-qa-expired', startedAt: Date.now() - 1800000 - 1000 }));
    window.dispatchEvent(new StorageEvent('storage', { key }));
  });
  await page.waitForFunction(() => document.body.dataset.screen === 'play-break');
  ok(await page.locator('.mo-drag-preview,.mo-flying-piece,.mo-arriving-piece').count() === 0, 'Expiring play-time leaves Montessori and cleans up its activity');
  await client.send('Emulation.setTouchEmulationEnabled', { enabled: false }); await client.detach();
  ok(errors.length === 0, `No browser errors: ${errors.join(', ')}`);
  return { count: checks.length, checks };
}
