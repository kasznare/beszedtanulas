// Run after npm run build-offline against a local server, in a disposable browser profile.
async page => {
  const checks = [], errors = [], context = page.context(), url = page.url();
  const ok = (value, label) => { if (!value) throw Error(label); checks.push(label); };
  page.on('pageerror', error => errors.push(error.message));
  await context.setOffline(false);
  await page.evaluate(async () => {
    localStorage.clear();
    for (const registration of await navigator.serviceWorker.getRegistrations()) await registration.unregister();
    for (const name of await caches.keys()) await caches.delete(name);
  });
  await page.goto('about:blank');
  await page.goto(url);
  const ready = await page.waitForFunction(() => navigator.serviceWorker.controller && document.querySelector('#offline-status')?.textContent.startsWith('Letöltve.'), undefined, { timeout: 20000 }).then(() => true, () => false);
  if (!ready) throw Error(`Offline install failed: ${await page.locator('#offline-status').innerText()}`);
  ok(true, 'The complete app installs and controls this page');
  const cached = await page.evaluate(async () => {
    const files = ['city-story-data.js', 'city-story-engine.js', 'city-story-game.js', 'city-story-art.js', 'city-story.css'];
    return Promise.all(files.map(async file => [file, Boolean(await caches.match(new URL(file, location.href)))]));
  });
  ok(cached.every(([, present]) => present), `Story files are cached: ${JSON.stringify(cached)}`);
  const voices = await page.evaluate(async () => {
    const { VOICE_CLIPS } = await import('./voice-library.js');
    const files = Object.entries(VOICE_CLIPS).filter(([id]) => id.startsWith('city_story_')).map(([, clip]) => clip.file);
    return { count: files.length, cached: (await Promise.all(files.map(file => caches.match(new URL(file, location.href))))).filter(Boolean).length };
  });
  ok(voices.count === 243 && voices.cached === voices.count, 'Every story narration clip is included in the offline bundle');
  await context.setOffline(true);
  try {
    await page.reload();
    await page.evaluate(() => {
      window.__offlineStoryNarration = [];
      document.addEventListener('narrationstart', event => window.__offlineStoryNarration.push(event.detail.id));
    });
    await page.locator('#home [data-open="play-menu"]').click();
    await page.locator('#play-menu [data-open="city-story"]').click();
    const root = page.locator('#city-story');
    ok(await root.getAttribute('data-node-id') === 'film-stop', 'Offline story starts on the first frame');
    await page.waitForFunction(() => window.__offlineStoryNarration.includes('city_story_film_stop_p1'), undefined, { timeout: 10000 });
    ok(true, 'The opening narration plays with the browser completely offline');
    await root.locator('[data-story-item="gate"]').click();
    await root.locator('#city-story-check').click();
    await root.locator('[data-story-choice="begin-investigation"]').click();
    await root.locator('[data-story-choice="route-street"]').click();
    ok(await root.getAttribute('data-node-id') === 'street-number' && await root.getAttribute('data-route') === 'street', 'Offline choices and state transitions work');
    ok(await root.locator('.city-story-illustration svg').count() > 0, 'Offline scene illustration renders');
  } finally { await context.setOffline(false); }
  ok(errors.length === 0, `No uncaught browser errors: ${errors.join(', ')}`);
  return { count: checks.length, checks, errors };
}
