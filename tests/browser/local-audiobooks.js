// Run with playwright-cli run-code --filename in a disposable localhost session.
async page => {
  if (new URL(page.url()).hostname !== '127.0.0.1') throw Error('Use a disposable local QA session');
  const checks = [], errors = [], context = page.context();
  const ok = (value, message) => { if (!value) throw Error(message); checks.push(message); };
  await context.setOffline(false);
  await page.route('https://cdn.jsdelivr.net/**', route => route.fulfill({ contentType: 'text/javascript', body: '' }));
  await page.evaluate(async () => {
    for (const registration of await navigator.serviceWorker.getRegistrations()) await registration.unregister();
    for (const name of await caches.keys()) await caches.delete(name);
    localStorage.clear();
    await new Promise((resolve, reject) => {
      const request = indexedDB.deleteDatabase('beszedtanulas.private-audiobooks.v1');
      request.onsuccess = resolve; request.onerror = reject;
    });
  });
  await page.addInitScript(() => {
    const OriginalAudio = window.Audio;
    window.localStoryQA = { audios: [] };
    window.Audio = function (...args) { const audio = new OriginalAudio(...args); localStoryQA.audios.push(audio); return audio; };
    window.Audio.prototype = OriginalAudio.prototype;
  });
  page.on('pageerror', error => errors.push(error.message));
  await page.reload();
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.waitForFunction(() => navigator.serviceWorker.controller, { timeout: 60000 });
  const open = async () => {
    await page.locator('[data-open="play-menu"]').click();
    await page.locator('[data-open="audiobooks"]').click();
    await page.waitForFunction(() => document.querySelector('#audiobooks').dataset.phase === 'ready');
  };
  await open();
  // The fixture uses an existing verified recording and an independent test title.
  const bundle = await page.evaluate(async () => {
    const story = (await import('/audiobook-data.js')).AUDIOBOOKS[0];
    const bytes = new Uint8Array(await (await fetch(story.file)).arrayBuffer());
    let binary = '';
    for (let at = 0; at < bytes.length; at += 8192) binary += String.fromCharCode(...bytes.subarray(at, at + 8192));
    return { format: 'beszedtanulas-private-audiobook', version: 1,
      story: { ...story, title: 'Saját tesztmese <b>szöveg</b>', text: 'Első sor.\nMásodik sor.' },
      audio: { mime: 'audio/mpeg', base64: btoa(binary) } };
  });
  const input = value => ({ name: 'teszt.mese.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(value)) });
  await page.locator('#story-import-file').setInputFiles(input(bundle));
  await page.waitForFunction(() => document.querySelector('#story-title').textContent.startsWith('Saját tesztmese'));
  await page.waitForFunction(() => document.querySelector('#story-seek')?.disabled === false);
  ok(await page.locator('.story-card').count() === 18, 'A private story joins the seventeen public stories');
  ok(await page.locator('#story-visual-wrap').isHidden(), 'The private audiobook has no generated illustrations');
  ok(await page.locator('#story-visual').innerHTML() === '', 'The previous animation is destroyed');
  ok((await page.locator('#story-title').innerText()).includes('<b>'), 'Imported titles render as plain text');
  ok(await page.locator('#story-download').isHidden(), 'An imported story is already stored locally');
  await page.locator('#story-toggle').click();
  await page.waitForFunction(() => document.querySelector('#audiobooks').dataset.phase === 'playing');
  ok(await page.evaluate(() => localStoryQA.audios.some(audio => audio.src.startsWith('blob:') && !audio.paused)), 'The local MP3 plays from a blob');
  await page.locator('#story-seek').evaluate(element => { element.value = 65; element.dispatchEvent(new Event('input', { bubbles: true })); });
  await page.locator('#story-toggle').click();
  await page.locator('#back-button').click();
  await page.locator('[data-open="audiobooks"]').click();
  await page.waitForFunction(() => document.querySelector('#story-seek')?.disabled === false);
  ok((await page.locator('#story-title').innerText()).startsWith('Saját tesztmese'), 'Reopening restores the local selection');
  ok(Number(await page.locator('#story-seek').inputValue()) >= 65, 'Local bookmarks survive reopening');
  await context.setOffline(true); await page.reload(); await open();
  await page.waitForFunction(() => document.querySelector('#story-seek')?.disabled === false);
  ok((await page.locator('#story-title').innerText()).startsWith('Saját tesztmese'), 'An offline reload retains the private story');
  ok(Number(await page.locator('#story-seek').inputValue()) >= 65, 'An offline reload retains its bookmark');
  await page.locator('#story-toggle').click();
  await page.waitForFunction(() => document.querySelector('#audiobooks').dataset.phase === 'playing');
  ok(true, 'The private recording plays with the network disconnected');
  await page.locator('#story-toggle').click();
  await context.setOffline(false);
  await page.locator('#story-import-file').setInputFiles(input(bundle));
  await page.waitForFunction(() => document.querySelector('#story-import-status').textContent.includes('elkészült') && !document.querySelector('#story-import').disabled);
  ok(await page.locator('.story-card').count() === 18, 'Importing the same recording does not duplicate it');
  const corrupt = { ...bundle, audio: { ...bundle.audio, base64: 'dHJ1bmNhdGVk' } };
  await page.locator('#story-import-file').setInputFiles(input(corrupt));
  await page.waitForFunction(() => document.querySelector('#story-import-status').textContent.includes('sérült'));
  ok(await page.locator('.story-card').count() === 18, 'A corrupt import preserves the stored recording');
  for (const [width, height] of [[375, 667], [834, 1194]]) {
    await page.setViewportSize({ width, height });
    ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `Local story layout fits ${width}px`);
  }
  await page.locator('[data-story="story-02"]').click();
  await page.waitForFunction(() => document.querySelector('#audiobooks').dataset.phase === 'ready');
  ok(await page.locator('#story-visual-wrap').isVisible(), 'Switching back restores the public story animation');
  await page.locator('[data-story^="local-"]').click();
  await page.waitForFunction(() => document.querySelector('#audiobooks').dataset.phase === 'ready');
  await page.locator('#story-remove').click();
  await page.waitForFunction(() => document.querySelectorAll('.story-card').length === 17);
  ok(await page.evaluate(async () => (await (await import('/local-audiobooks.js')).loadLocalAudiobooks()).length === 0), 'Removal deletes the local recording');
  ok(errors.length === 0, 'No application JavaScript errors');
  return { checks: checks.length, passed: checks, errors };
}
