// Keyboard and shared-timer checks in a disposable Playwright browser profile.
// The only staged state is the browser's visibility and clock, as in play-time.js.
async page => {
  const checks = [], errors = [];
  const ok = (value, label) => { if (!value) throw Error(label); checks.push(label); };
  page.on('pageerror', error => errors.push(error.message));
  await page.clock.install({ time: new Date('2026-10-16T10:00:00Z') });
  const url = page.url();
  await page.evaluate(async () => {
    localStorage.clear();
    for (const registration of await navigator.serviceWorker.getRegistrations()) await registration.unregister();
    for (const key of await caches.keys()) await caches.delete(key);
  });
  await page.goto('about:blank');
  await page.goto(url);
  await page.locator('#home [data-open="big-menu"]').click();
  await page.locator('#big-menu [data-open="city-story"]').click();
  const root = page.locator('#city-story');
  const node = () => root.getAttribute('data-node-id');
  const at = value => page.waitForFunction(expected => document.body.dataset.screen === expected, value);
  ok(await node() === 'film-stop', 'Story opens on the first frame');
  ok(await page.evaluate(() => JSON.parse(localStorage.getItem('beszedtanulas.playTime.v1')).startedAt !== null), 'Entering the city story starts the shared play timer');
  if (await root.locator('#city-story-listen').count()) {
    await page.evaluate(() => {
      window.__cityStoryHelpVoice = [];
      document.addEventListener('narrationstart', event => window.__cityStoryHelpVoice.push(event.detail?.id));
    });
    await page.locator('#help-button').click();
    await page.waitForFunction(() => window.__cityStoryHelpVoice.includes('city_story_film_stop_p1'));
    ok(true, 'Help restarts the opening city story recording when voice is installed');
  } else {
    await page.locator('#help-button').click();
    ok(await page.evaluate(() => document.activeElement?.id === 'city-story-task-title'), 'Help focuses the current activity heading when no story voice is installed');
  }

  await root.locator('[data-story-item="gate"]').focus();
  await page.keyboard.press('Enter');
  ok(await root.locator('[data-story-item="gate"]').getAttribute('aria-pressed') === 'true', 'Enter selects an inspection item');
  await root.locator('#city-story-check').focus();
  await page.keyboard.press('Space');
  ok(await root.locator('[data-story-choice="begin-investigation"]').isVisible(), 'Space submits the selected clue');
  await root.locator('#city-story-journal').focus();
  await page.keyboard.press('Enter');
  ok(await root.locator('#city-story-notebook').isVisible(), 'Keyboard opens the clues dialog');
  await page.keyboard.press('Escape');
  ok(!await root.locator('#city-story-notebook').isVisible(), 'Escape closes the native clues dialog');
  await root.locator('[data-story-choice="begin-investigation"]').focus();
  await page.keyboard.press('Enter');
  ok(await node() === 'route-choice', 'Enter advances a narrative choice');
  await root.locator('[data-story-choice="route-workshop"]').focus();
  await page.keyboard.press('Space');
  ok(await node() === 'workshop-red' && await root.getAttribute('data-route') === 'workshop', 'Space chooses the workshop route once');
  await page.keyboard.press('Space');
  ok(await node() === 'workshop-red', 'A repeated keypress after render does not advance another scene');

  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => true });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await root.locator('[data-story-choice="bench-under"]').click();
  ok(await node() === 'workshop-red', 'A backgrounded page ignores story choices');
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => false });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await root.locator('[data-story-choice="bench-under"]').click();
  ok(await node() === 'workshop-use', 'The same visible choice works when the page returns');
  await root.locator('[data-story-choice="bench-seat"]').click();
  await root.locator('[data-story-choice="carry-now"]').click();
  await root.locator('[data-story-choice="workshop-to-court"]').click();
  await root.locator('[data-story-choice="court-discuss"]').click();
  ok(await node() === 'court-memory', 'Workshop route reaches the shared photo-order task');
  await root.locator('[data-story-item="setup"]').click();
  await root.locator('[data-story-item="packing"]').click();
  ok((await root.locator('[data-story-item="setup"]').getAttribute('aria-label')).includes('A sorrendben: 1.'), 'First chosen photo announces position one');
  ok((await root.locator('[data-story-item="packing"]').getAttribute('aria-label')).includes('A sorrendben: 2.'), 'Second chosen photo announces position two');
  ok((await root.locator('[data-story-item="closing"]').getAttribute('aria-label')).includes('Még nincs a sorrendben.'), 'Unselected photo announces that it is outside the sequence');

  const beforeBreak = await node();
  await page.clock.fastForward(1800001);
  await at('play-break');
  ok(await node() === beforeBreak, 'Shared time expiry leaves story state intact');
  ok(!await root.locator('[data-story-item="closing"]').isVisible(), 'The break hides story controls');
  await page.keyboard.press('Enter');
  ok(await node() === beforeBreak && await page.locator('body').getAttribute('data-screen') === 'play-break', 'Keyboard cannot advance a story during the break');
  ok(errors.length === 0, `No uncaught browser errors: ${errors.join(', ')}`);
  return { count: checks.length, checks, errors };
}
