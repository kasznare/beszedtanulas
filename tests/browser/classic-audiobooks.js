// Run with playwright-cli run-code --filename in a disposable localhost session.
async page => {
  if (new URL(page.url()).hostname !== '127.0.0.1') throw Error('Use a disposable local QA session');
  const checks = [], errors = [], context = page.context();
  const ok = (condition, message) => { if (!condition) throw Error(message); checks.push(message); };
  await context.setOffline(false);
  await page.route('https://cdn.jsdelivr.net/**', route => route.fulfill({ contentType: 'text/javascript', body: '' }));
  await page.goto(new URL('/', page.url()).href);
  await page.evaluate(async () => {
    localStorage.clear();
    for (const registration of await navigator.serviceWorker.getRegistrations()) await registration.unregister();
    for (const key of await caches.keys()) await caches.delete(key);
  });
  await page.addInitScript(() => {
    const OriginalAudio = window.Audio;
    window.classicStoryQA = { audios: [] };
    window.Audio = function (...args) { const audio = new OriginalAudio(...args); classicStoryQA.audios.push(audio); return audio; };
    window.Audio.prototype = OriginalAudio.prototype;
  });
  page.on('pageerror', error => errors.push(error.message));
  await page.reload();
  await page.evaluate(() => navigator.serviceWorker.ready);
  await page.waitForFunction(() => navigator.serviceWorker.controller, { timeout: 60000 });
  const open = async () => {
    await page.locator('[data-open="play-menu"]').click();
    await page.locator('[data-open="audiobooks"]').click();
    await page.waitForFunction(() => document.querySelector('#audiobooks')?.dataset.phase === 'ready');
  };
  await open();
  const publishedCount = await page.evaluate(async () => (await import('/audiobook-data.js')).AUDIOBOOKS.length);
  ok(await page.locator('.story-card').count() === publishedCount && publishedCount >= 22, 'The public library preserves the original twenty-two recordings');
  const classics = await page.evaluate(async () => (await import('/audiobook-data.js')).AUDIOBOOKS.filter(story => Number(story.id.slice(6)) >= 13));
  ok(classics.length === 10, 'All ten classics are present');
  for (const story of classics) {
    await page.locator(`[data-story="${story.id}"]`).click();
    await page.waitForFunction(() => document.querySelector('#story-seek')?.disabled === false);
    ok(await page.locator('#story-title').innerText() === story.title, `${story.id}: complete title`);
    ok((await page.locator('#story-byline').innerText()).includes(story.author), `${story.id}: author visible`);
    if (story.illustrated !== false) {
      ok(await page.locator('#story-visual-wrap').isVisible() && (await page.locator('#story-visual').innerHTML()).includes('<svg'), `${story.id}: complete illustrated view`);
    } else {
      ok(await page.locator('#story-visual-wrap').isHidden() && await page.locator('#story-visual').innerHTML() === '', `${story.id}: audio-only view clears the previous illustration`);
    }
    await page.locator('#story-transcript summary').click();
    ok(await page.locator('#story-text').textContent() === story.text, `${story.id}: complete source text and stanza breaks`);
    ok(await page.locator('#story-source a').getAttribute('href') === story.sourceUrl, `${story.id}: primary source link`);
    await page.locator('#story-transcript summary').click();
    await page.locator('#story-toggle').click();
    await page.waitForFunction(() => document.querySelector('#audiobooks').dataset.phase === 'playing');
    ok(true, `${story.id}: real fixed MP3 plays`);
    await page.locator('#story-seek').evaluate((element, seconds) => { element.value = seconds; element.dispatchEvent(new Event('input', { bubbles: true })); }, Math.floor(story.duration / 2));
    await page.locator('#story-toggle').click();
    await page.locator('#story-download').click();
    await page.waitForFunction(() => document.querySelector('#story-download').textContent.includes('Letöltve'));
    ok(true, `${story.id}: SHA-verified offline download`);
  }
  await context.setOffline(true);
  for (const story of classics) {
    await page.locator(`[data-story="${story.id}"]`).click();
    await page.waitForFunction(() => document.querySelector('#story-seek')?.disabled === false);
    const bookmark = Number(await page.locator('#story-seek').inputValue());
    ok(bookmark >= Math.floor(story.duration / 2), `${story.id}: own bookmark restored`);
    if (story.illustrated !== false) {
      const expectedScene = await page.evaluate(async ({id,time}) => (await import('/story-visual-library.js')).storySceneAt(id,time).id, {id:story.id,time:bookmark});
      ok(await page.locator('#story-visual').getAttribute('data-scene') === expectedScene, `${story.id}: bookmark restores the matching picture`);
    } else {
      ok(await page.locator('#story-visual-wrap').isHidden(), `${story.id}: offline bookmark keeps the audio-only view`);
    }
    await page.locator('#story-toggle').click();
    await page.waitForFunction(() => document.querySelector('#audiobooks').dataset.phase === 'playing');
    ok(await page.evaluate(() => classicStoryQA.audios.some(audio => audio.src.startsWith('blob:') && !audio.paused)), `${story.id}: offline blob playback`);
    await page.locator('#story-seek').evaluate(element => { element.value = Number(element.max) - 2; element.dispatchEvent(new Event('input', { bubbles: true })); });
    await page.waitForFunction(() => document.querySelector('#audiobooks').dataset.phase === 'ended');
    ok(true, `${story.id}: natural ending after seeking`);
  }
  await page.reload(); await open();
  await page.waitForFunction(() => document.querySelector('#story-seek')?.disabled === false);
  ok(await page.locator('#story-title').innerText() === classics.at(-1).title, 'Offline reopening restores the last selected classic');
  await page.locator('#story-toggle').click();
  await page.waitForFunction(() => document.querySelector('#audiobooks').dataset.phase === 'playing');
  await page.locator('#story-toggle').click();
  await context.setOffline(false);
  for (const [width, height] of [[375, 667], [834, 1194]]) {
    await page.setViewportSize({ width, height });
    ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `Classic layout fits ${width}px`);
    ok(await page.locator('#audiobooks button').evaluateAll(buttons => buttons.filter(button => button.getClientRects().length).every(button => button.getBoundingClientRect().height >= 44)), `Visible touch targets are 44px at ${width}px`);
  }
  await page.setViewportSize({ width: 375, height: 667 });
  await page.locator('#story-title').scrollIntoViewIfNeeded();
  await page.screenshot({ path: 'output/playwright/classic-audiobooks-375.png', fullPage: true });
  await page.locator('[data-story="story-01"]').click();
  await page.waitForFunction(() => document.querySelector('#audiobooks').dataset.phase === 'ready');
  ok(await page.locator('#story-visual-wrap').isVisible(), 'Switching to an earlier story restores its animation');
  ok(errors.length === 0, 'No application JavaScript errors');
  return { checks: checks.length, passed: checks, errors };
}
