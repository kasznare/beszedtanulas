// Run on audiobook-storage-fixture.py in a disposable browser profile.
async page => {
  const context = page.context(), base = new URL(page.url()).origin, checks = [], errors = [];
  if (!/^http:\/\/127\.0\.0\.1:529[23]$/.test(base)) throw Error('Use a disposable storage fixture');
  const ok = (condition, message) => { if (!condition) throw Error(message); checks.push(message); };
  page.on('pageerror', error => errors.push(error.message));
  await context.route('https://cdn.jsdelivr.net/**', route => route.fulfill({ contentType: 'text/javascript', body: '' }));
  await page.addInitScript(() => {
    const Original = window.Audio; window.storageQA = [];
    window.Audio = function (...args) { const audio = new Original(...args); storageQA.push(audio); return audio; };
    window.Audio.prototype = Original.prototype;
  });
  const switchTo = async (version, corrupt = false, reset = false) => {
    const response = await context.request.post(base + '/__qa/state', { data: { version, corrupt, reset } });
    if (!response.ok()) throw Error('Fixture update failed');
  };
  const at = version => page.waitForFunction(version => document.body.dataset.storageTest === version && Boolean(navigator.serviceWorker.controller), version, { timeout: 120000 });
  const open = async () => {
    await page.locator('#home [data-open="audiobooks"]').click();
    await page.waitForFunction(() => document.querySelector('#audiobooks').dataset.phase === 'ready');
    await page.locator('.story-card[data-story="classic-arany-lacinak"]').click();
    await page.waitForFunction(() => document.querySelector('#story-title').textContent.startsWith('Arany Lacinak') && document.querySelector('#audiobooks').dataset.phase === 'ready');
  };
  const selected = () => page.evaluate(async () => (await import('./audiobook-data.js')).AUDIOBOOKS.find(story => story.id === 'classic-arany-lacinak'));
  const stored = () => page.evaluate(async () => {
    const name = `beszedtanulas-audiobooks:${new URL('.', location.href).href}:v1`;
    const cache = await caches.open(name), result = [];
    for (const key of await cache.keys()) result.push({ url: key.url, hash: new URL(key.url).searchParams.get('v') });
    return result;
  });
  const requests = async () => (await context.request.get(base + '/__qa/requests')).json();
  const play = async () => {
    await page.locator('#story-toggle').click();
    await page.waitForFunction(() => document.querySelector('#audiobooks').dataset.phase === 'playing');
    await page.waitForFunction(() => storageQA.some(audio => !audio.paused && audio.currentTime > 0));
  };
  const saved = () => page.waitForFunction(() => document.querySelector('#story-download').textContent.includes('Letöltve'), undefined, { timeout: 120000 });
  const pause = () => page.locator('#story-toggle').click();
  const update = async version => {
    await page.locator('#home-button').click();
    await page.evaluate(async () => (await navigator.serviceWorker.getRegistration()).update());
    await at(version);
  };
  await context.setOffline(false);
  await page.evaluate(async () => {
    localStorage.clear();
    for (const registration of await navigator.serviceWorker.getRegistrations()) await registration.unregister();
    for (const name of await caches.keys()) await caches.delete(name);
  });
  await page.goto('about:blank');
  await switchTo('A', false, true); await page.goto(base); await at('A'); await open();
  ok((await stored()).length === 0, 'Installation and choosing a story do not store any unplayed MP3');
  ok((await requests()).length === 0, 'Choosing alone sends no audiobook network request');
  const a = await selected();
  await play(); await saved(); await pause();
  ok((await stored()).length === 1 && (await stored())[0].hash === a.sha256, 'First playback saves only the selected verified recording');
  const downloadsA = (await requests()).filter(request => request.version === 'A');
  ok(downloadsA.length === 1 && downloadsA[0].range === null, 'Media byte ranges share exactly one full upstream download');
  await page.locator('#story-seek').evaluate(element => { element.value = 13; element.dispatchEvent(new Event('input', { bubbles: true })); });
  await context.setOffline(true); await page.reload(); await at('A'); await open();
  await page.waitForFunction(() => !document.querySelector('#story-seek').disabled);
  ok(Number(await page.locator('#story-seek').inputValue()) >= 12, 'The saved recording restores its own bookmark');
  await play(); await pause();
  ok(await page.evaluate(() => storageQA.some(audio => audio.src.startsWith('blob:'))), 'Automatically saved audio plays after an offline reload');
  ok((await requests()).length === 1, 'Offline replay never downloads the MP3 again');
  await context.setOffline(false); await switchTo('B'); await update('B'); await open();
  const b = await selected();
  ok(b.sha256 !== a.sha256, 'A catalogue update identifies the new recording by its content hash');
  ok((await stored()).some(entry => entry.hash === a.sha256), 'The earlier verified recording survives the application update');
  ok(!(await stored()).some(entry => entry.hash === b.sha256), 'The new recording is deferred until playback');
  await play(); await saved(); await pause();
  ok((await stored()).length === 1 && (await stored())[0].hash === b.sha256, 'A verified new version replaces the previous cached recording');
  ok((await requests()).filter(request => request.version === 'B').length === 1, 'Updating downloads only the newly played recording once');
  await switchTo('C', true); await update('C'); await open();
  await page.locator('#story-toggle').click();
  await page.waitForFunction(() => document.querySelector('#story-offline').textContent.includes('nem sikerült elmenteni'));
  ok(!(await page.locator('#story-download').isDisabled()), 'A corrupt update is visibly retryable and never marked saved');
  ok((await stored()).length === 1 && (await stored())[0].hash === b.sha256, 'A corrupt updated response preserves the older valid recording');
  await switchTo('C');
  await page.waitForFunction(() => document.querySelector('#audiobooks').dataset.phase === 'error');
  await play(); await saved(); await pause();
  const c = await selected();
  ok((await stored()).length === 1 && (await stored())[0].hash === c.sha256, 'Retry installs the complete corrected update');
  await page.locator('#story-seek').evaluate(element => { element.value = 17; element.dispatchEvent(new Event('input', { bubbles: true })); });
  await switchTo('D'); await update('D'); await open();
  await page.waitForFunction(() => !document.querySelector('#story-seek').disabled);
  ok((await selected()).sha256 === c.sha256 && (await page.locator('#story-title').textContent()).includes('címjavítás'), 'A text-only correction uses the existing audio version');
  ok(Number(await page.locator('#story-seek').inputValue()) >= 16, 'A text-only update preserves the existing bookmark');
  await play(); await pause();
  ok((await requests()).filter(request => request.version === 'D').length === 0, 'Text-only updates and replay cause zero audiobook network requests');
  ok((await stored()).length === 1, 'Other stories are still not downloaded in the background');
  ok(errors.length === 0, `No browser script errors: ${errors.join('; ')}`);
  return { count: checks.length, checks, engine: context.browser().browserType().name() };
}
