// Run with playwright-cli run-code --filename in a dedicated disposable HEADLESS session.
// This clears only that session's test storage; use the same URL as the local game server.
async page => {
  const checks = [], errors = [], timings = [], context = page.context();
  const ok = (value, message) => { if (!value) throw Error(message); checks.push(message); };
  const errorListener = error => errors.push(error.message);
  page.on('pageerror', errorListener);
  await context.setOffline(false);
  await page.route('https://cdn.jsdelivr.net/**', route => route.fulfill({ contentType: 'text/javascript', body: '' }));
  const url = page.url();
  await page.evaluate(async () => {
    localStorage.clear();
    for (const registration of await navigator.serviceWorker.getRegistrations()) await registration.unregister();
    for (const key of await caches.keys()) await caches.delete(key);
  });
  await page.goto('about:blank'); await page.goto(url);
  await page.evaluate(() => {
    const state = JSON.parse(localStorage.getItem('speech_game_progress_v1'));
    state.settings = { ...state.settings, roundLength: 3, memoryPairs: 2, pourLevel: 1, spokenGuidance: false };
    state.supabase = { ...state.supabase, syncPaused: true };
    localStorage.setItem('speech_game_progress_v1', JSON.stringify(state));
  });
  await page.reload();
  await page.setViewportSize({ width: 1194, height: 834 });
  await page.evaluate(() => document.addEventListener('narrationstart', event => {
    const current = window.roundSuccessQA;
    if (current) current.narrations.push({ id: event.detail.id, at: performance.now() });
  }));
  const saved = () => page.evaluate(() => JSON.parse(localStorage.getItem('speech_game_progress_v1')));
  const home = async () => {
    if (await page.locator('#round-complete').isVisible()) await page.locator('#round-home').click();
    else if (await page.locator('body').getAttribute('data-screen') !== 'home') await page.locator('#home-button').click();
    await page.waitForFunction(() => document.body.dataset.screen === 'home');
  };
  const enter = async (group, game) => {
    await home();
    await page.locator(`#home [data-open="${group}"]`).click();
    await page.locator(`#${group} [data-open="${game}"]`).click();
    await page.waitForFunction(id => document.body.dataset.screen === id, game);
  };
  const markAndClick = selector => page.evaluate(selector => {
    window.roundSuccessObserver?.disconnect();
    const snapshot = window.roundSuccessQA = { completedAt: performance.now(), openedAt: null, confettiAt: null, narrations: [] };
    const dialog = document.querySelector('#round-complete');
    const confetti = document.querySelector('#confetti-layer');
    window.roundSuccessObserver = new MutationObserver(() => {
      if (dialog.open && snapshot.openedAt === null) snapshot.openedAt = performance.now();
      if (confetti?.classList.contains('is-active') && snapshot.confettiAt === null) snapshot.confettiAt = performance.now();
    });
    window.roundSuccessObserver.observe(dialog, { attributes: true, attributeFilter: ['open'] });
    if (confetti) window.roundSuccessObserver.observe(confetti, { attributes: true, attributeFilter: ['class'] });
    document.querySelector(selector).click();
    return {
      rewards: JSON.parse(localStorage.getItem('speech_game_progress_v1')).rewards,
      modal: dialog.open,
      confetti: Boolean(confetti?.classList.contains('is-active')),
    };
  }, selector);
  const completeScene = game => page.evaluate(game => {
    if (document.body.dataset.screen !== game) return false;
    if (game === 'memory') return [...document.querySelectorAll('.memory-card')].every(card => card.classList.contains('is-matched'));
    if (game === 'pour') return [...document.querySelectorAll('[data-pour-cup]')].every(cup => cup.dataset.done === 'true') && !document.querySelector('#pour-finish').matches(':enabled');
    const prefix = game === 'listening-game' ? 'listening' : game.split('-')[0];
    return document.querySelector(`#${prefix}-next`).disabled && [...document.querySelectorAll(`#${prefix}-answers button`)].every(button => button.disabled);
  }, game);
  const waitCelebration = async (game, before) => {
    ok(await completeScene(game) && !(await page.locator('#round-complete').isVisible()), `${game}: completed scene stays visible before celebration`);
    await page.waitForTimeout(500);
    ok(await completeScene(game) && !(await page.locator('#round-complete').isVisible()), `${game}: no success window after only half a second`);
    await page.waitForSelector('#round-complete[open]');
    const snapshot = await page.evaluate(() => window.roundSuccessQA);
    const elapsed = snapshot.openedAt - snapshot.completedAt;
    timings.push({ game, elapsed });
    ok(elapsed >= 900, `${game}: success window waits at least 900 ms (${Math.round(elapsed)} ms)`);
    ok(snapshot.confettiAt === null || snapshot.confettiAt - snapshot.completedAt >= 900, `${game}: confetti also waits for the finished scene`);
    const finalVoices = new Set(['memory_done', 'pour_done', 'guide_finished', 'guide_teddy_finished', 'guide_dress_finished']);
    ok(snapshot.narrations.filter(event => finalVoices.has(event.id)).every(event => event.at - snapshot.completedAt >= 900), `${game}: completion narration never starts early`);
    const after = await saved();
    ok(after.rewards === before.rewards + 1 && after.attempts === before.attempts, `${game}: celebration preserves the one immediate reward and speech attempts`);
  };
  const memoryToLast = async () => {
    const keys = await page.locator('[data-card]').evaluateAll(cards => cards.map(card => card.dataset.card));
    const ordered = [...new Set(keys.map(key => key.slice(0, -2)))].flatMap(id => keys.filter(key => key.slice(0, -2) === id));
    for (const key of ordered.slice(0, -1)) await page.locator(`[data-card="${key}"]`).click();
    return `[data-card="${ordered.at(-1)}"]`;
  };
  const finishMemory = async () => {
    const before = await saved();
    const last = await memoryToLast();
    const immediate = await markAndClick(last);
    ok(immediate.rewards === before.rewards + 1 && !immediate.modal && !immediate.confetti, 'memory: final match saves the reward before any round celebration');
    return before;
  };
  try {
    await enter('activity-menu', 'memory');
    const memoryBefore = await finishMemory();
    await waitCelebration('memory', memoryBefore);
    await page.screenshot({ path: `output/playwright/round-success-memory-${context.browser().browserType().name()}.png`, fullPage: true });
    await page.locator('#round-replay').click();
    ok(await page.locator('.memory-card.is-open').count() === 0, 'memory: replay starts a fresh board');

    const restartBefore = await finishMemory();
    await page.locator('#memory-restart').click();
    await page.waitForTimeout(1200);
    ok(!(await page.locator('#round-complete').isVisible()) && await page.locator('.memory-card.is-open').count() === 0, 'memory: restart during the delay cancels the stale success window');
    ok((await saved()).rewards === restartBefore.rewards + 1, 'memory: restarting preserves the immediately saved reward');

    const parentBefore = await finishMemory();
    // The entry is hidden in games. Dispatch its real handler directly to test
    // the defensive parent-dialog cancellation path without changing game state.
    await page.locator('#parent-button').evaluate(button => button.click());
    await page.waitForTimeout(1200);
    ok(await page.locator('#parent-gate').isVisible() && !(await page.locator('#round-complete').isVisible()), 'memory: parent gate cancels the pending success without opening overlapping dialogs');
    await page.locator('#close-parent-gate').click();
    await page.waitForTimeout(200);
    ok(!(await page.locator('#round-complete').isVisible()) && (await saved()).rewards === parentBefore.rewards + 1, 'memory: closing the gate never restores the cancelled window or removes the reward');
    await page.locator('#memory-restart').click();

    const exitBefore = await finishMemory();
    await page.locator('#home-button').click();
    await page.waitForTimeout(1200);
    ok(await page.locator('#home').isVisible() && !(await page.locator('#round-complete').isVisible()), 'memory: leaving cannot open the previous round success on the home screen');
    ok((await saved()).rewards === exitBefore.rewards + 1, 'memory: leaving preserves its earned reward');

    await enter('activity-menu', 'pour');
    const pourBefore = await saved();
    for (const [key, cup] of [['ArrowLeft', 0], ['ArrowRight', 1]]) {
      await page.keyboard.down(key);
      await page.waitForFunction(cup => Number(document.querySelector(`#pour-water-${cup}`).dataset.fill) >= .7, cup);
      await page.keyboard.up(key);
    }
    ok((await saved()).rewards === pourBefore.rewards, 'pour: two complete glasses wait for the explicit finish action');
    const immediatePour = await markAndClick('#pour-finish');
    ok(immediatePour.rewards === pourBefore.rewards + 1 && !immediatePour.modal && !immediatePour.confetti, 'pour: explicit finish saves its reward immediately with both glasses still visible');
    await waitCelebration('pour', pourBefore);
    await page.locator('#round-replay').click();
    const pourRestartBefore = await saved();
    for (const [key, cup] of [['ArrowLeft', 0], ['ArrowRight', 1]]) {
      await page.keyboard.down(key);
      await page.waitForFunction(cup => Number(document.querySelector(`#pour-water-${cup}`).dataset.fill) >= .7, cup);
      await page.keyboard.up(key);
    }
    await markAndClick('#pour-finish');
    await page.locator('#pour-restart').click();
    await page.waitForTimeout(1200);
    ok(!(await page.locator('#round-complete').isVisible()) && await page.locator('#pour-water-0').getAttribute('data-fill') === '0', 'pour: new glasses cancel the pending success and open an empty round');
    ok((await saved()).rewards === pourRestartBefore.rewards + 1, 'pour: restart preserves the single already earned reward');


    for (const [group, game, prefix] of [['picture-menu', 'listening-game', 'listening'], ['play-menu', 'teddy-game', 'teddy'], ['play-menu', 'dress-game', 'dress']]) {
      await enter(group, game);
      const before = await saved();
      const total = game === 'dress-game' ? 4 : before.settings.roundLength;
      for (let index = 0; index < total; index++) {
        const keys = await page.locator(`#${prefix}-answers button`).evaluateAll(buttons => buttons.map(button => button.dataset.item || button.dataset.word));
        const attribute = prefix === 'dress' ? 'item' : 'word';
        for (const key of keys) {
          const choice = page.locator(`#${prefix}-answers [data-${attribute}="${key}"]`);
          if (await choice.isEnabled()) await choice.click();
          if (await page.locator(`#${prefix}-answers button:enabled`).count() === 0) break;
        }
        await page.waitForFunction(prefix => !document.querySelector(`#${prefix}-next`).disabled, prefix);
        if (index < total - 1) await page.locator(`#${prefix}-next`).click();
      }
      const immediate = await markAndClick(`#${prefix}-next`);
      ok(immediate.rewards === before.rewards + 1 && !immediate.modal && !immediate.confetti, `${game}: finishing saves one reward immediately without hiding the completed request`);
      await waitCelebration(game, before);
    }
    ok(errors.length === 0, `No browser script errors: ${errors.join(', ')}`);
    return { count: checks.length, engine: context.browser().browserType().name(), timings, checks };
  } finally {
    await page.evaluate(() => window.roundSuccessObserver?.disconnect());
    page.off('pageerror', errorListener);
    await context.setOffline(false);
  }
}
