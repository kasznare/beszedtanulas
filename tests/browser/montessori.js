// Run with playwright-cli run-code --filename in an isolated browser session.
async page => {
  const checks = [], errors = [], context = page.context(), url = page.url();
  const ok = (value, message) => { if (!value) throw Error(message); checks.push(message); };
  const errorListener = error => errors.push(error.message);
  page.on('pageerror', errorListener);
  await context.setOffline(false);
  await page.evaluate(async () => {
    localStorage.clear();
    for (const registration of await navigator.serviceWorker.getRegistrations()) await registration.unregister();
    for (const key of await caches.keys()) await caches.delete(key);
  });
  await page.goto('about:blank'); await page.goto(url);
  const saved = () => page.evaluate(() => JSON.parse(localStorage.getItem('speech_game_progress_v1')));
  const ready = () => page.locator('#mo-restart:not([disabled])').waitFor();
  const menu = async () => {
    if (await page.locator('#mo-back').isVisible()) await page.locator('#mo-back').click();
    if (!await page.locator('.mo-menu').isVisible()) {
      if (await page.locator('#home-button').isVisible()) await page.locator('#home-button').click();
      await page.locator('#home [data-open="activity-menu"]').click();
      await page.locator('#activity-menu [data-open="montessori"]').click();
    }
  };
  const choose = async id => {
    const piece = page.locator(`[data-mo-piece="${id}"]`);
    if (await piece.getAttribute('aria-pressed') !== 'true') await piece.click();
  };
  const place = async (id, target) => {
    await choose(id); await page.locator(`[data-mo-target="${target}"]`).click(); await ready();
  };
  const move = async (id, target, release = true) => {
    const piece = page.locator(`[data-mo-piece="${id}"]`), destination = page.locator(target);
    await piece.scrollIntoViewIfNeeded();
    const from = await piece.boundingBox(), to = await destination.boundingBox();
    await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2); await page.mouse.down();
    await page.mouse.move(to.x + to.width / 2, to.y + to.height / 2, { steps: 12 });
    if (release) { await page.mouse.up(); await ready(); }
  };
  try {
    await page.setViewportSize({ width: 1194, height: 834 }); await menu();
    ok(await page.locator('[data-mo-game]').count() === 3, 'Three games are reachable from the activity menu');
    for (const [kind, levels] of [['shapes', 4], ['colors', 3], ['tower', 3]]) {
      await page.locator(`[data-mo-game="${kind}"]`).click();
      for (let level = 1; level <= levels; level++) {
        await page.locator(`[data-mo-level="${level}"]`).click();
        const before = (await saved()).rewards;
        const ids = await page.locator('[data-mo-piece]').evaluateAll(buttons => buttons.map(button => button.dataset.moPiece));
        const targets = await page.locator('[data-mo-target]').evaluateAll(buttons => buttons.map(button => button.dataset.moTarget));
        const key = `montessori${kind[0].toUpperCase()}${kind.slice(1)}Level`;
        ok((await saved()).settings[key] === level, `${kind}/${level}: difficulty is saved`);
        if (kind === 'shapes' && level === 4) {
          const id = await page.locator('[data-mo-blocker]').first().getAttribute('data-mo-blocker');
          await choose(id); await page.locator(`[data-mo-target="${id}"]`).focus(); await page.keyboard.press('Enter');
          ok((await page.locator('#mo-status').textContent()).includes('akadályt') && await page.locator('.mo-box-window svg').count() === 0, 'Covered holes refuse even a matching shape');
          for (const blocker of await page.locator('[data-mo-blocker]').evaluateAll(buttons => buttons.map(button => button.dataset.moBlocker))) await page.locator(`[data-mo-blocker="${blocker}"]`).click();
        } else if (ids.length > 1) {
          const wrongId = kind === 'shapes' ? ids.find(id => id !== targets[0]) : kind === 'tower' ? 'disc-0' : ids.find(id => !id.startsWith(`${targets[0]}-`));
          await choose(wrongId); await page.locator(`[data-mo-target="${targets[0]}"]`).click();
          ok(await page.locator('[data-mo-piece]').count() === ids.length && (await saved()).rewards === before, `${kind}/${level}: wrong choice stays retryable`);
        }
        const order = kind === 'tower' ? ids.sort((a, b) => Number(b.split('-')[1]) - Number(a.split('-')[1])) : ids;
        for (const id of order) {
          const target = kind === 'shapes' ? id : kind === 'colors' ? id.split('-')[0] : 'tower';
          if (targets.includes(target)) await place(id, target);
        }
        ok(await page.locator('#montessori').getAttribute('data-done') === 'true', `${kind}/${level}: full round completes`);
        ok((await saved()).rewards === before + 1, `${kind}/${level}: reward exactly once`);
        await page.locator('#mo-undo').click();
        const restored = kind === 'shapes' && level === 2 ? targets[0] : await page.locator('[data-mo-piece]:not([disabled])').first().getAttribute('data-mo-piece');
        await place(restored, kind === 'shapes' ? restored : kind === 'colors' ? restored.split('-')[0] : 'tower');
        ok((await saved()).rewards === before + 1, `${kind}/${level}: undo and re-completion do not award twice`);
        if (level === 1) {
          await page.locator('#mo-next').click();
          ok(await page.locator('#montessori').getAttribute('data-level') === '2', `${kind}: next level opens on demand`);
        }
      }
      await menu();
    }
    await page.locator('[data-mo-game="shapes"]').click(); await page.locator('[data-mo-level="3"]').click();
    let id = await page.locator('[data-mo-piece]').first().getAttribute('data-mo-piece');
    await move(id, `[data-mo-target="${id}"]`);
    ok(await page.locator('.mo-box-window svg').count() === 1 && await page.locator('.mo-drag-preview').count() === 0, 'Actual mouse drag animates one drop and removes the preview');
    id = await page.locator('[data-mo-piece]').first().getAttribute('data-mo-piece');
    await move(id, '.mo-heading');
    ok(await page.locator(`[data-mo-piece="${id}"]`).count() === 1, 'Dropping outside leaves the piece available');
    await page.locator(`[data-mo-target="${id}"]`).click(); await ready();
    ok(await page.locator('.mo-box-window svg').count() === 2, 'Outside drop can immediately be corrected with a tap');
    id = await page.locator('[data-mo-piece]').first().getAttribute('data-mo-piece');
    await move(id, `[data-mo-target="${id}"]`, false); await page.locator('#montessori').dispatchEvent('pointercancel'); await page.mouse.up();
    ok(await page.locator('.mo-drag-preview').count() === 0 && await page.locator(`[data-mo-piece="${id}"]`).count() === 1, 'Pointer cancellation cleans up without placing');
    await page.locator('#mo-restart').click();
    id = await page.locator('[data-mo-piece]').first().getAttribute('data-mo-piece');
    await page.locator(`[data-mo-piece="${id}"]`).focus(); await page.keyboard.press('Enter'); await page.keyboard.press('Escape');
    ok(await page.locator('[aria-pressed="true"][data-mo-piece]').count() === 0, 'Keyboard can select and Escape clears selection');
    await page.locator(`[data-mo-piece="${id}"]`).focus(); await page.keyboard.press('Space');
    await page.locator(`[data-mo-target="${id}"]`).focus(); await page.keyboard.press('Enter'); await ready();
    ok(await page.locator('.mo-box-window svg').count() === 1, 'Keyboard alone places a piece');

    await page.locator('[data-mo-level="4"]').click();
    const blocker = page.locator('[data-mo-blocker]').first(), blockerId = await blocker.getAttribute('data-mo-blocker');
    let rect = await blocker.boundingBox();
    await page.mouse.move(rect.x + rect.width / 2, rect.y + rect.height / 2); await page.mouse.down(); await page.mouse.move(rect.x + rect.width / 2 + 20, rect.y + rect.height / 2, { steps: 5 }); await page.mouse.up();
    ok(!await blocker.isDisabled(), 'Short obstacle drag returns to its original position');
    rect = await blocker.boundingBox();
    await page.mouse.move(rect.x + rect.width / 2, rect.y + rect.height / 2); await page.mouse.down(); await page.mouse.move(rect.x + rect.width / 2 + 125, rect.y + rect.height / 2, { steps: 12 }); await page.mouse.up();
    ok(await page.locator(`[data-mo-blocker="${blockerId}"].is-cleared`).count() === 1, 'Obstacle slides out of the way with an actual drag');
    await page.locator('#mo-undo').click();
    ok(await page.locator(`[data-mo-blocker="${blockerId}"]:not(.is-cleared)`).count() === 1, 'Undo restores an obstacle');

    for (const size of [{ width: 320, height: 740 }, { width: 390, height: 844 }, { width: 932, height: 430 }]) {
      await page.setViewportSize(size);
      for (const kind of ['shapes', 'colors', 'tower']) {
        await menu(); await page.locator(`[data-mo-game="${kind}"]`).click();
        const metrics = await page.evaluate(() => ({ overflow: document.documentElement.scrollWidth > innerWidth + 2, small: [...document.querySelectorAll('#montessori button')].filter(button => !button.disabled && button.getClientRects().length && (button.getBoundingClientRect().width < 43 || button.getBoundingClientRect().height < 43)).map(button => button.getAttribute('aria-label') || button.textContent) }));
        ok(!metrics.overflow && !metrics.small.length, `${kind}: ${size.width}×${size.height} fits with large touch targets (${metrics.small.join(',')})`);
        await page.screenshot({ path: `output/playwright/montessori-${kind}-${context.browser().browserType().name()}-${size.width}.png`, fullPage: true, animations: 'disabled' });
      }
    }
    await page.setViewportSize({ width: 1194, height: 834 }); await menu();
    await page.locator('[data-mo-game="shapes"]').click(); await page.locator('[data-mo-level="1"]').click();
    await page.emulateMedia({ reducedMotion: 'reduce' });
    id = await page.locator('[data-mo-piece]').first().getAttribute('data-mo-piece');
    await place(id, id);
    ok(await page.locator('#montessori').getAttribute('data-done') === 'true', 'Reduced motion completes without a falling animation');
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.locator('#mo-restart').click();
    id = await page.locator('[data-mo-piece]').first().getAttribute('data-mo-piece');
    await choose(id); await page.locator(`[data-mo-target="${id}"]`).click();
    await page.locator('#home-button').click(); await page.waitForTimeout(800);
    ok(await page.locator('.mo-flying-piece,.mo-arriving-piece,.mo-drag-preview').count() === 0, 'Leaving during animation removes pending visuals');
    await menu();
    await page.locator('#back-button').click();
    await page.waitForFunction(() => document.body.dataset.screen === 'activity-menu');
    ok(true, 'App back leaves the workshop for its parent menu');

    if (context._options?.hasTouch) {
      await menu(); await page.locator('[data-mo-game="shapes"]').click(); await page.locator('[data-mo-level="1"]').click();
      id = await page.locator('[data-mo-piece]').first().getAttribute('data-mo-piece');
      await page.locator(`[data-mo-piece="${id}"]`).tap(); await page.locator(`[data-mo-target="${id}"]`).tap(); await ready();
      ok(await page.locator('#montessori').getAttribute('data-done') === 'true', 'Native touchscreen taps select and place');
    }
    await page.waitForFunction(() => document.querySelector('#offline-status')?.textContent.startsWith('Letöltve.'), undefined, { timeout: 60000 });
    await context.setOffline(true); await page.reload(); await menu();
    for (const kind of ['shapes', 'colors', 'tower']) {
      await page.locator(`[data-mo-game="${kind}"]`).click(); await page.locator('[data-mo-level="1"]').click();
      const ids = await page.locator('[data-mo-piece]').evaluateAll(buttons => buttons.map(button => button.dataset.moPiece));
      if (kind === 'tower') ids.sort((a, b) => Number(b.split('-')[1]) - Number(a.split('-')[1]));
      for (const id of ids) await place(id, kind === 'shapes' ? id : kind === 'colors' ? id.split('-')[0] : 'tower');
      ok(await page.locator('#montessori').getAttribute('data-done') === 'true', `${kind}: full game works offline after reload`);
      await menu();
    }
    const sounds = await page.evaluate(async () => {
      const audio = new AudioContext();
      try {
        const buffers = await Promise.all(['montessori_shapes_4', 'montessori_colors', 'montessori_tower'].map(async id => audio.decodeAudioData(await (await fetch(`./audio/voice/${id}.mp3`)).arrayBuffer())));
        return buffers.every(buffer => buffer.duration > 1);
      } finally { await audio.close(); }
    });
    ok(sounds, 'All three game instructions decode from offline audio files');
    ok(errors.length === 0, `No browser errors: ${errors.join(', ')}`);
    return { count: checks.length, engine: context.browser().browserType().name(), checks };
  } finally { await context.setOffline(false); await page.emulateMedia({ reducedMotion: 'no-preference' }); page.off('pageerror', errorListener); }
}
