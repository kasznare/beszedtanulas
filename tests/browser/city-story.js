// Run through playwright-cli run-code --filename in a disposable browser profile.
// All story changes below use visible controls. evaluate only reads browser state.
async page => {
  const checks = [], errors = [], context = page.context(), url = page.url();
  const ok = (condition, label) => {
    if (!condition) throw Error(`${label} (after ${checks.length} passing checks)`);
    checks.push(label);
  };
  page.on('pageerror', error => errors.push(error.message));
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await context.setOffline(false);
  await page.evaluate(async () => {
    localStorage.clear();
    for (const registration of await navigator.serviceWorker.getRegistrations()) await registration.unregister();
    for (const key of await caches.keys()) await caches.delete(key);
  });
  await page.goto('about:blank');
  await page.goto(url);

  const root = page.locator('#city-story');
  const node = () => root.getAttribute('data-node-id');
  const at = async id => {
    await page.waitForFunction(expected => document.querySelector('#city-story')?.dataset.nodeId === expected, id);
    ok(await node() === id, `Reached ${id}`);
  };
  const enter = async () => {
    if (await page.locator('#home-button').isVisible()) await page.locator('#home-button').click();
    await page.locator('#home [data-open="play-menu"]').click();
    await page.locator('#play-menu [data-open="city-story"]').click();
    await page.waitForFunction(() => document.body.dataset.screen === 'city-story');
  };
  const choose = async (id, destination) => {
    const button = root.locator(`[data-story-choice="${id}"]`);
    ok(await button.isVisible(), `${id} is available`);
    await button.click();
    if (destination) await at(destination);
  };
  const item = id => root.locator(`[data-story-item="${id}"]`).click();
  const check = () => root.locator('#city-story-check').click();
  const reset = async () => {
    await root.locator('#city-story-restart').click();
    ok(await root.locator('#city-story-restart-dialog').isVisible(), 'Restart asks for confirmation');
    await root.locator('#city-story-confirm-restart').click();
    await at('film-stop');
    ok(await root.getAttribute('data-route') === '' && await root.getAttribute('data-ending') === '', 'Restart clears route and ending');
  };
  const routeCases = [
    { id: 'street', first: 'route-street', choices: [
      ['street-pattern', 'street-view'], ['street-cart', 'street-eszter'],
      ['eszter-actor', 'street-arrive'], ['street-to-court', 'court-arrival'],
    ] },
    { id: 'workshop', first: 'route-workshop', choices: [
      ['bench-under', 'workshop-use'], ['bench-puppet', 'workshop-carry'],
      ['carry-now', 'workshop-arrive'], ['workshop-to-court', 'court-arrival'],
    ] },
    { id: 'archive', first: 'route-archive', choices: [
      ['archive-details', 'archive-last'], ['archive-plan', 'archive-share'],
      ['archive-map', 'archive-arrive'], ['archive-to-court', 'court-arrival'],
    ] },
  ];
  const endingCases = [
    { id: 'film', first: 'ending-film', choices: [
      ['film-angle-shift', 'film-eszter'], ['film-eszter-live', 'film-direct'],
      ['film-sequence', 'film-props'],
    ] },
    { id: 'theatre', first: 'ending-theatre', choices: [
      ['theatre-puppets', 'theatre-direct'], ['theatre-rethink', 'theatre-ending'],
    ] },
    { id: 'walk', first: 'ending-walk', choices: [
      ['walk-long', 'walk-workshop'], ['walk-from-workshop', 'walk-door'],
      ['walk-wide', 'walk-ending'],
    ] },
  ];

  await enter();
  await at('film-stop');
  const progress = () => page.evaluate(() => localStorage.getItem('speech_game_progress_v1'));
  const originalProgress = await progress();
  const routeNarrations = new Set();
  for (const [routeIndex, route] of routeCases.entries()) {
    for (const [endingIndex, ending] of endingCases.entries()) {
      const firstRun = routeIndex === 0 && endingIndex === 0;
      if (!firstRun) await reset();
      await item(['gate', 'bench', 'notebook'][routeIndex]);
      ok(await root.locator('#city-story-check').isEnabled(), 'Inspect choice enables confirmation');
      await check();
      ok(await root.locator('#city-story-journal b').innerText() === '1', 'Investigated clue reaches the journal');
      await choose('begin-investigation', 'route-choice');
      await choose(route.first, route.id === 'street' ? 'street-number' : route.id === 'workshop' ? 'workshop-red' : 'archive-envelope');
      ok(await root.getAttribute('data-route') === route.id, `${route.id} route is recorded`);
      if (route.id === 'archive') {
        if (endingIndex === 0) {
          for (const id of ['closing', 'packing', 'setup']) await item(id);
          await check();
          ok(await node() === 'archive-envelope' && await root.locator('#city-story-status').innerText() !== '', 'Wrong photo order gives feedback and remains retryable');
          await root.locator('#city-story-clear').click();
        }
        for (const id of ['setup', 'packing', 'closing']) await item(id);
        await check();
        ok(await root.locator('[data-story-choice="archive-details"]').isVisible(), 'Correct chronology unlocks the archive');
      }
      for (const [choice, destination] of route.choices) await choose(choice, destination);
      routeNarrations.add((await root.locator('.city-story-prose').innerText()).trim());
      await choose('court-discuss', 'court-memory');
      if (route.id !== 'archive') {
        ok(await root.locator('.city-story-activity[data-activity="order"]').isVisible(), 'The courtyard asks for chronology when it was not proved earlier');
        for (const id of ['setup', 'packing', 'closing']) await item(id);
        await check();
        ok(await root.locator('[data-story-choice="memory-enact"]').isVisible(), 'Correct courtyard chronology unlocks the retelling');
      } else {
        ok(await root.locator('.city-story-activity').count() === 0, 'Archive evidence avoids repeating the chronology task');
      }
      await choose('memory-enact', 'court-practice');
      if (firstRun) {
        await item('straight'); await check();
        ok(await node() === 'court-practice' && await root.locator('#city-story-status').innerText() !== '', 'Straight path fails at the cart turn');
        await item('crosswise'); await check();
        ok(await node() === 'court-practice' && await root.locator('#city-story-status').innerText() !== '', 'Crosswise stage still blocks the passage');
      }
      await item('turn-clear'); await check();
      ok(await root.locator('[data-story-choice="practice-plan"]').isVisible(), 'Clear turning space completes the physical trial');
      await choose('practice-plan', 'court-layout-choice');
      await choose(['layout-wall', 'layout-later', 'layout-library'][endingIndex], 'ending-choice');
      await choose(ending.first, ending.id === 'film' ? 'film-prep' : ending.id === 'theatre' ? 'theatre-prep' : 'walk-prep');
      ok(await root.getAttribute('data-ending') === ending.id, `${ending.id} plan is recorded`);
      for (const [choice, destination] of ending.choices) await choose(choice, destination);
      if (ending.id === 'film') {
        for (const id of ['pillow', 'board', 'bread']) await item(id);
        ok(await root.locator('[data-story-item][aria-pressed="true"]').count() === 3, 'Exactly three film props are selected');
        await check();
        await choose('film-show', 'film-ending');
      }
      const endingNode = `${ending.id}-ending`;
      await at(endingNode);
      ok(await root.locator('#city-story-scene-title').innerText() !== '', `${route.id}/${ending.id}: ending is rendered`);
      await choose(`${ending.id}-epilogue`, 'epilogue');
      ok(await root.getAttribute('data-route') === route.id && await root.getAttribute('data-ending') === ending.id, `${route.id}/${ending.id}: route and ending survive the epilogue`);
      ok(await root.locator('.city-story-recap li').count() >= 2, `${route.id}/${ending.id}: ending recap has route and outcome`);
      if (firstRun) {
        await root.locator('#city-story-journal').click();
        ok(await root.locator('#city-story-notebook').isVisible() && await root.locator('.city-story-journal-list article').count() > 3, 'Journal lists real collected clues');
        await root.locator('#city-story-notebook [data-story-close]').first().click();
        await root.locator('#city-story-rewind').click();
        await at('film-ending');
        await choose('film-epilogue', 'epilogue');
        await root.locator('#city-story-restart').click();
        await root.locator('#city-story-restart-dialog [data-story-close]').click();
        ok(await node() === 'epilogue', 'Cancel restart keeps the current story');
      }
      ok(await progress() === originalProgress, `${route.id}/${ending.id}: story does not change saved game progress`);
    }
  }
  ok(routeNarrations.size === 3, 'The three investigations produce distinct courtyard narration');

  for (const [width, height] of [[390, 844], [844, 390], [834, 1194]]) {
    await page.setViewportSize({ width, height });
    const metrics = await page.evaluate(() => {
      const root = document.querySelector('#city-story');
      const targets = [...root.querySelectorAll('button')].filter(button => {
        if (button.closest('dialog:not([open])')) return false;
        const box = button.getBoundingClientRect();
        return box.width > 0 && box.height > 0;
      }).map(button => ({ id: button.id || button.dataset.storyChoice || button.dataset.storyItem || button.className, height: button.getBoundingClientRect().height }));
      return { overflow: document.documentElement.scrollWidth > innerWidth + 1, small: targets.filter(button => button.height < 43.5) };
    });
    ok(!metrics.overflow, `No horizontal overflow at ${width} px`);
    ok(!metrics.small.length, `Touch targets at ${width} px: ${metrics.small.map(button => button.id).join(', ')}`);
  }

  await reset();
  for (const width of [320, 390]) {
    await page.setViewportSize({ width, height: 844 });
    const covered = await root.locator('.city-story-items-inspect .city-story-item-wrap').evaluateAll(cards => cards.filter(card => {
      const sound = card.querySelector('.city-story-sound');
      if (!sound) return false;
      const range = document.createRange();
      range.selectNodeContents(card.querySelector('strong'));
      const button = sound.getBoundingClientRect();
      return [...range.getClientRects()].some(text => text.left < button.right && text.right > button.left && text.top < button.bottom && text.bottom > button.top);
    }).map(card => card.querySelector('strong').textContent));
    ok(!covered.length, `Narration buttons leave clue text readable at ${width} px: ${covered.join(', ')}`);
    ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `Clue cards fit a ${width} px screen`);
  }
  await item('gate'); await check();
  await choose('begin-investigation', 'route-choice');
  await page.locator('#back-button').click();
  ok(await page.evaluate(() => document.body.dataset.screen === 'play-menu'), 'Back leaves the story for its menu');
  await page.locator('#play-menu [data-open="city-story"]').click();
  await at('route-choice');
  ok(await root.locator('#city-story-journal b').innerText() === '1', 'Returning from the menu resumes this page session');
  await page.reload();
  await enter();
  await at('film-stop');
  ok(await root.locator('#city-story-journal b').innerText() === '0', 'Reload begins a new session without writing story progress');
  ok(JSON.parse(await progress()).rewards === JSON.parse(originalProgress).rewards, 'Reload preserves earned rewards');

  const workerReady = await page.waitForFunction(() => navigator.serviceWorker.controller && document.querySelector('#offline-status')?.textContent.startsWith('Letöltve.'), undefined, { timeout: 20000 }).then(() => true, () => false);
  if (!workerReady) {
    const status = await page.locator('#offline-status').innerText();
    throw Error(`Offline service worker did not finish installing: ${status}`);
  }
  await context.setOffline(true);
  try {
    await page.reload();
    await enter();
    await at('film-stop');
    ok(await root.locator('[data-story-item]').count() === 3, 'Offline reload keeps the story and its first investigation playable');
  } finally { await context.setOffline(false); }
  ok(errors.length === 0, `No uncaught browser errors: ${errors.join(', ')}`);
  return { count: checks.length, checks, errors };
}
