// Run in a disposable Playwright session; this resets only that session's storage.
async page => {
  const checks = [], errors = [];
  const ok = (condition, label) => { if (!condition) throw Error(label); checks.push(label); };
  page.on('pageerror', error => errors.push(error.message));
  await page.evaluate(async () => {
    localStorage.clear();
    for (const registration of await navigator.serviceWorker.getRegistrations()) await registration.unregister();
    for (const key of await caches.keys()) await caches.delete(key);
  });
  const url = page.url(); await page.goto('about:blank'); await page.goto(url);
  const saved = () => page.evaluate(() => JSON.parse(localStorage.getItem('speech_game_progress_v1')));
  const home = async () => { if (await page.locator('#round-complete').isVisible()) await page.locator('#round-home').click(); else if (await page.locator('#home-button').isVisible()) await page.locator('#home-button').click(); };
  const activity = async id => { await home(); await page.locator('#home [data-open="activity-menu"]').click(); await page.locator(`#activity-menu [data-open="${id}"]`).click(); };

  await activity('memory');
  await page.locator('.memory-timing summary').click();
  await page.locator('#memory-preview').selectOption('0');
  await page.locator('#memory-hint').click();
  await page.waitForTimeout(3800);
  ok(await page.locator('.memory-card.is-open').count() === await page.locator('[data-card]').count(), 'Manual preview remains visible until continued');
  await page.locator('#memory-hint').click();
  ok(await page.locator('.memory-card.is-open').count() === 0, 'Preview closes on request');

  await activity('puzzle');
  await page.locator('#puzzle-choose').click();
  await page.locator('[data-puzzle-image="sun"]').click();
  await page.locator('[data-puzzle-size="2"]').click();
  await page.locator('[data-piece="0"]').click(); await page.locator('[data-slot="0"]').click();
  await home(); await activity('puzzle');
  ok(await page.locator('.puzzle-slot.is-placed').count() === 1, 'Unfinished beginner board resumes after navigation');
  const rewards = (await saved()).rewards;
  await page.locator('[data-piece="1"]').click(); await page.locator('[data-slot="1"]').click();
  await page.waitForSelector('#round-complete[open]');
  ok((await saved()).rewards === rewards + 1, 'First completion gives one reward');
  await page.locator('#round-home').click(); await activity('puzzle');
  ok(await page.locator('.puzzle-slot.is-placed').count() === 0 && await page.locator('.puzzle-tray [data-piece]').count() === 2, 'A finished picture comes back as a fresh board');
  await page.locator('#puzzle-restart').click();
  for (const id of [0, 1]) { await page.locator(`[data-piece="${id}"]`).click(); await page.locator(`[data-slot="${id}"]`).click(); }
  await page.waitForSelector('#round-complete[open]');
  ok((await saved()).rewards === rewards + 2, 'A restarted puzzle is a fresh board with one reward');
  await page.locator('#round-home').click(); await activity('puzzle');
  await page.locator('[data-puzzle-image="ball"]').click();
  await page.locator('[data-puzzle-size="2"]').click();
  for (const id of [0, 1]) { await page.locator(`[data-piece="${id}"]`).click(); await page.locator(`[data-slot="${id}"]`).click(); }
  await page.waitForSelector('#round-complete[open]');
  await page.locator('#round-replay').click();
  ok(await page.locator('[data-piece]').count() === 2 && await page.locator('.puzzle-slot.is-placed').count() === 0, 'Completion dialog continues with the next picture on a fresh board');

  await activity('pour');
  await page.locator('[data-pour-level="3"]').click();
  const first = await page.locator('#pour-target-0').getAttribute('d');
  await page.locator('#pour-restart').click();
  const second = await page.locator('#pour-target-0').getAttribute('d');
  ok(first !== second, 'Advanced rounds change the friends’ targets');
  ok(await page.locator('#pour-correct').count() === 1, 'Small pour-back control is available');

  await home(); await page.locator('#home [data-open="picture-menu"]').click(); await page.locator('#picture-menu [data-open="animal-book"]').click();
  await page.locator('#abk-sound').click();
  ok(!(await page.locator('#abk-task-title').innerText()).includes('Tehén') && await page.locator('#animal-book .is-playing').count() === 0, 'Sound question does not visually reveal its answer');
  for (const id of ['cow', 'horse', 'sheep']) { await page.locator(`#abk-animal-${id}`).click(); if (await page.locator('#abk-next-task').isVisible()) break; }
  ok(await page.locator('#abk-next-task').isVisible(), 'A sound question accepts the pictured animal');
  await page.locator('#abk-search').click();
  ok(await page.locator('.abk-animals').isVisible() === false, 'Scene search uses the pictured animals');
  await page.locator('#abk-browse').click();
  ok(await page.locator('.abk-animals').isVisible(), 'Free browsing remains available');
  const layout = async (selector, label) => {
    const result = await page.evaluate(root => ({
      overflow: document.documentElement.scrollWidth > innerWidth,
      small: [...document.querySelectorAll(`${root} button, ${root} select`)].filter(element => {
        const box = element.getBoundingClientRect();
        return box.width > 0 && box.height > 0 && (box.width < 43.9 || box.height < 43.9);
      }).map(element => element.id || element.className),
    }), selector);
    ok(!result.overflow && !result.small.length, `${label}: no horizontal overflow and 44px controls (${result.small.join(', ')})`);
  };
  for (const [width, height] of [[320, 740], [375, 812], [740, 390]]) {
    await page.setViewportSize({ width, height });
    await activity('memory'); await layout('#memory', `Memory ${width}×${height}`);
    await activity('puzzle'); await layout('#puzzle', `Puzzle ${width}×${height}`);
    await activity('pour'); await layout('#pour', `Pour ${width}×${height}`);
    await home(); await page.locator('#home [data-open="picture-menu"]').click(); await page.locator('#picture-menu [data-open="animal-book"]').click();
    await layout('#animal-book', `Animal book ${width}×${height}`);
  }
  ok(errors.length === 0, `No browser errors: ${errors.join(', ')}`);
  return { count: checks.length, checks };
}
