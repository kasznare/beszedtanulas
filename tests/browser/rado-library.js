// Run with playwright-cli run-code --filename in a disposable localhost session.
async page => {
  if (new URL(page.url()).hostname !== '127.0.0.1') throw Error('Use a disposable local QA session');
  const checks = [], errors = [], context = page.context();
  const ok = (value, message) => { if (!value) throw Error(message); checks.push(message); };
  await context.setOffline(false);
  await page.route('https://cdn.jsdelivr.net/**', route => route.fulfill({ contentType: 'text/javascript', body: '' }));
  await page.goto(new URL('/', page.url()).href);
  await page.evaluate(async () => {
    localStorage.clear();
    for (const registration of await navigator.serviceWorker.getRegistrations()) await registration.unregister();
    for (const key of await caches.keys()) await caches.delete(key);
  });
  await page.addInitScript(() => {
    const Original = window.Audio;
    window.radoQA = { audios: [], browserSpeech: 0 };
    window.Audio = function(...args) { const audio = new Original(...args); radoQA.audios.push(audio); return audio; };
    window.Audio.prototype = Original.prototype;
    const speak = speechSynthesis.speak.bind(speechSynthesis);
    speechSynthesis.speak = (...args) => { radoQA.browserSpeech++; return speak(...args); };
  });
  page.on('pageerror', error => errors.push(error.message));
  await page.reload();
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.waitForFunction(() => navigator.serviceWorker.controller, { timeout: 60000 });
  const open = async () => {
    await page.locator('[data-open="audiobooks"]').click();
    await page.waitForFunction(() => document.querySelector('#audiobooks')?.dataset.phase === 'ready');
  };
  await open();
  const stories = await page.evaluate(async () => (await import('/rado-stories.js')).RADO_STORIES);
  const ready = await page.evaluate(async () => (await import('/audiobook-data.js')).AUDIOBOOKS.filter(s => s.id.startsWith('rado-')));
  ok(stories.length === 50 && await page.locator('[data-rado-story]').count() === 50, 'Both volumes: all 50 source tales listed');
  const publicCount = await page.evaluate(async () => (await (await fetch('/content/stories/catalog.json')).json()).stories.length);
  ok(await page.locator('.story-card[data-story]').count() === publicCount && publicCount >= 22 + stories.length, 'All original recordings and newly published collections preserved alongside all Radó tales');
  for (const story of stories) {
    await page.locator(`.rado-volume[data-volume="${story.volume}"]`).evaluate(element => { element.open = true; });
    await page.locator(`[data-rado-story="${story.id}"]`).click();
    ok(await page.locator('#rado-reader-text').textContent() === story.text, `${story.id}: entire text through the source ending`);
    ok(await page.locator('#rado-reader-title').innerText() === `${story.title} · ${story.volume}. kötet`, `${story.id}: exact title and volume`);
    ok(await page.locator('#rado-reader-source a').first().getAttribute('href') === story.sourceUrl, `${story.id}: exact source anchor`);
    ok((await page.locator('#rado-reader-source').innerText()).includes('CC BY-SA 3.0'), `${story.id}: attribution and license visible`);
    for (const note of story.footnotes) ok((await page.locator('#rado-reader-notes').innerText()).includes(note.text), `${story.id}: complete source note`);
    ok(await page.locator('#rado-play').isHidden() === (story.audioStatus === 'pending'), `${story.id}: honest audio availability`);
  }
  await page.locator('#rado-search').fill('Pancimanci');
  ok(await page.locator('[data-rado-story]:visible').count() === 1, 'Search spans both volumes');
  await page.locator('#rado-search').fill('nincs ilyen mesecím');
  ok(await page.locator('[data-rado-story]:visible').count() === 0 && (await page.locator('#rado-search-status').innerText()).includes('0'), 'Empty search result is visible');
  await page.locator('#rado-search').fill('');
  await page.locator('#story-search').fill('ozike');
  ok(await page.locator('.story-card:visible').count() === 1 && await page.locator('.story-card:visible').getAttribute('data-story') === 'rado-i-31', 'The shared accentless Mesetár search includes pending Radó tales');
  await page.locator('#story-search').fill('');
  for (const story of ready) {
    await page.locator(`[data-story="${story.id}"]`).click();
    await page.locator('#story-toggle').click();
    await page.waitForFunction(() => document.querySelector('#audiobooks').dataset.phase === 'playing');
    await page.waitForFunction(() => document.querySelector('#story-seek')?.disabled === false);
    ok(await page.locator('#story-visual-wrap').isHidden(), `${story.id}: clears the prior SVG without fabricated illustrations`);
    await page.waitForFunction(() => document.querySelector('#audiobooks').dataset.phase === 'playing');
    ok(await page.evaluate(id => radoQA.audios.some(a => a.src.includes(id) && !a.paused && a.readyState >= 2), story.id), `${story.id}: real MP3 decoded and plays`);
    const cue = await page.evaluate(async id => (await import('/story-caption-timing.js')).STORY_CAPTION_TIMES[id].at(-1), story.id);
    await page.locator('#story-seek').evaluate((element, seconds) => { element.value = seconds; element.dispatchEvent(new Event('input', { bubbles: true })); }, cue + .1);
    const lastLine = story.text.split('\n').filter(s => s.trim()).at(-1);
    await page.waitForFunction(text => document.querySelector('#rado-caption-text').textContent === text, lastLine);
    ok(true, `${story.id}: final original line follows the actual audio timestamps`);
    await page.locator('#story-toggle').click();
    await page.locator('#story-seek').evaluate((element, seconds) => { element.value = seconds; element.dispatchEvent(new Event('input', { bubbles: true })); }, Math.floor(story.duration / 2));
    await page.waitForFunction(() => document.querySelector('#story-download').textContent.includes('Letöltve'), { timeout: 120000 });
    ok(true, `${story.id}: automatic hash-verified offline save after playback`);
  }
  await context.setOffline(true);
  for (const story of ready) {
    await page.locator(`[data-story="${story.id}"]`).click();
    await page.waitForFunction(() => document.querySelector('#story-seek')?.disabled === false);
    ok(Number(await page.locator('#story-seek').inputValue()) >= Math.floor(story.duration / 2) - 1, `${story.id}: own offline bookmark`);
    await page.locator('#story-toggle').click();
    await page.waitForFunction(() => document.querySelector('#audiobooks').dataset.phase === 'playing');
    ok(await page.evaluate(() => radoQA.audios.some(a => a.src.startsWith('blob:') && !a.paused)), `${story.id}: network-free cached MP3 playback`);
    await page.locator('#story-seek').evaluate(element => { element.value = Number(element.max) - 1; element.dispatchEvent(new Event('input', { bubbles: true })); });
    await page.waitForFunction(() => document.querySelector('#audiobooks').dataset.phase === 'ended');
    ok(true, `${story.id}: natural audio ending`);
  }
  // Read every pending ending while all network requests are disabled.
  for (const story of stories.filter(s => s.audioStatus === 'pending')) {
    await page.locator(`.rado-volume[data-volume="${story.volume}"]`).evaluate(element => { element.open = true; });
    await page.locator(`[data-rado-story="${story.id}"]`).click();
    ok(await page.locator('#rado-reader-text').textContent() === story.text, `${story.id}: full pending text also available offline`);
    await page.locator(`[data-story="${story.id}"]`).click();
    await page.waitForFunction(() => document.querySelector('#audiobooks').dataset.phase === 'text');
    ok(await page.locator('#story-text').textContent() === story.text, `${story.id}: the common player also retains the full offline source`);
    ok(await page.locator('#story-toggle').isDisabled() && await page.locator('#story-download').isHidden(), `${story.id}: the shared library cannot fabricate pending audio`);
  }
  ok(await page.evaluate(() => radoQA.browserSpeech === 0), 'No browser voice fallback');
  await context.setOffline(false);
  for (const [width, height] of [[430, 932], [932, 350], [834, 1194], [1194, 834]]) {
    await page.setViewportSize({ width, height });
    ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `No horizontal overflow at ${width}×${height}`);
    ok(await page.locator('.rado-card:visible').evaluateAll(buttons => buttons.every(b => b.getBoundingClientRect().height >= 44)), `Large collection buttons at ${width}×${height}`);
    if (width === 430 || width === 834) {
      await page.locator('.rado-library').screenshot({ path: `output/playwright/rado-library-${width}-${context.browser().browserType().name()}.png` });
      await page.locator('.rado-reader').screenshot({ path: `output/playwright/rado-reader-${width}-${context.browser().browserType().name()}.png` });
    }
  }
  ok(errors.length === 0, 'No application JavaScript errors');
  return { checks: checks.length, ready: ready.length, pending: 50 - ready.length, errors };
}
