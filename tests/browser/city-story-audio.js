// Run with playwright-cli run-code --filename after the city story voice manifest
// and MP3s have been installed. Use a disposable browser profile on the app server.
async page => {
  const checks = [], errors = [], root = page.locator('#city-story');
  const ok = (value, label) => { if (!value) throw Error(`${label} (${checks.length} checks passed)`); checks.push(label); };
  page.on('pageerror', error => errors.push(error.message));
  const url = page.url();
  await page.evaluate(async () => {
    for (const registration of await navigator.serviceWorker.getRegistrations()) await registration.unregister();
    for (const key of await caches.keys()) await caches.delete(key);
  });
  await page.goto('about:blank');
  await page.goto(url);
  await page.evaluate(() => {
    window.__cityStoryAudioEvents = [];
    for (const type of ['narrationstart', 'narrationend']) {
      document.addEventListener(type, event => {
        window.__cityStoryAudioEvents.push({ type, id: event.detail?.id, reason: event.detail?.reason, at: performance.now() });
      });
    }
  });
  const events = () => page.evaluate(() => window.__cityStoryAudioEvents.slice());
  const count = async () => (await events()).length;
  const waitEvent = (type, id, after) => page.waitForFunction(
    ({ type, id, after }) => window.__cityStoryAudioEvents.slice(after).some(event => event.type === type && event.id === id),
    { type, id, after }, { timeout: 20000 },
  );
  const storyId = id => `city_story_${id}`;
  const first = storyId('film_stop_p1');
  const itemVoice = storyId('film_stop_activity_item_gate');
  const detailVoice = storyId('film_stop_activity_detail_gate');
  const choiceVoice = storyId('film_stop_choice_begin_investigation');

  const registration = await page.evaluate(async ids => {
    const [{ VOICE_CLIPS }, { STORY_CLIPS }] = await Promise.all([import('/voice-library.js'), import('/city-story-data.js')]);
    const entries = ids.map(id => ({ id, recorded: VOICE_CLIPS[id], authored: STORY_CLIPS[id] }));
    const file = entries[0].recorded?.file;
    const response = file ? await fetch(new URL(file, location.href), { cache: 'no-store' }) : null;
    return { entries, fileOk: Boolean(response?.ok), bytes: response?.ok ? (await response.arrayBuffer()).byteLength : 0 };
  }, [first, itemVoice, detailVoice, choiceVoice]);
  ok(registration.entries.every(entry => entry.recorded?.text === entry.authored && entry.recorded?.file?.includes('/city_story_')), 'Authored city story lines are registered to their own MP3 files');
  ok(registration.fileOk && registration.bytes > 1000, 'A registered city story MP3 contains real audio bytes');

  await page.locator('#home [data-open="big-menu"]').click();
  const beforeEnter = await count();
  await page.locator('#big-menu [data-open="city-story"]').click();
  await page.waitForFunction(() => document.body.dataset.screen === 'city-story');
  await waitEvent('narrationstart', first, beforeEnter);
  ok(await root.locator('#city-story-listen').isVisible(), 'The opening scene offers real recorded narration');
  ok(await root.getAttribute('data-node-id') === 'film-stop', 'The spoken opening remains on the correct scene');

  let at = await count();
  await root.locator(`[data-story-voice="${itemVoice}"]`).click();
  await waitEvent('narrationstart', itemVoice, at);
  ok(true, 'The inspection item reads its own recorded label');
  at = await count();
  await root.locator('[data-story-item="gate"]').click();
  await waitEvent('narrationstart', detailVoice, at);
  ok(await root.locator('.city-story-detail').innerText() !== '', 'Selecting a clue reveals and reads its evidence before submission');
  await root.locator('#city-story-check').click();
  at = await count();
  await root.locator(`[data-story-voice="${choiceVoice}"]`).click();
  await waitEvent('narrationstart', choiceVoice, at);
  ok(true, 'The unlocked choice has its own recorded speech');

  at = await count();
  await root.locator('[data-story-choice="begin-investigation"]').click();
  const routeIntro = storyId('route_choice_p1');
  await waitEvent('narrationstart', routeIntro, at);
  at = await count();
  await root.locator('[data-story-choice="route-street"]').click();
  const streetIntro = storyId('street_number_p1');
  await waitEvent('narrationstart', streetIntro, at);
  const rapidEvents = (await events()).slice(at);
  ok(rapidEvents.some(event => event.type === 'narrationend' && event.id === routeIntro), 'A rapid scene change cancels the previous scene narration');
  ok(!await root.locator(`[data-narration-clip="${routeIntro}"]`).count(), 'No old route narration highlight leaks into the new scene');

  const originalGuidance = await page.locator('#spoken-guidance').isChecked();
  await page.locator('#spoken-guidance').evaluate(input => { input.checked = false; input.dispatchEvent(new Event('change', { bubbles: true })); });
  at = await count();
  await root.locator('[data-story-choice="street-pattern"]').click();
  await page.waitForFunction(() => document.querySelector('#city-story')?.dataset.nodeId === 'street-view');
  await page.waitForTimeout(450);
  const streetView = storyId('street_view_p1');
  ok(!(await events()).slice(at).some(event => event.type === 'narrationstart' && event.id === streetView), 'Spoken guidance off suppresses automatic scene narration');
  ok(await root.locator('#city-story-listen').isVisible(), 'Muting guidance keeps the explicit Listen control available');
  at = await count();
  await root.locator('#city-story-listen').click();
  await waitEvent('narrationstart', streetView, at);
  ok(true, 'Explicit Listen still plays a real city story clip while guidance is muted');

  at = await count();
  const beforeLeave = at;
  await page.locator('#back-button').click();
  await page.waitForFunction(() => document.body.dataset.screen === 'big-menu');
  const afterLeave = (await events()).slice(at);
  ok(afterLeave.some(event => event.type === 'narrationend' && event.id === streetView), 'Leaving the story stops active speech');
  ok(!await root.locator('.is-narrated').count() && !await page.evaluate(() => document.querySelector('#city-story')?.contains(document.activeElement)), 'Leaving clears story highlight and keyboard focus');

  await page.locator('#big-menu [data-open="city-story"]').click();
  await page.waitForFunction(() => document.querySelector('#city-story')?.dataset.nodeId === 'street-view');
  await root.locator('[data-story-choice="street-cart"]').click();
  await page.waitForFunction(() => document.querySelector('#city-story')?.dataset.nodeId === 'street-eszter');
  const failedId = storyId('street_eszter_p1');
  const failedFile = await page.evaluate(async id => (await import('/voice-library.js')).VOICE_CLIPS[id]?.file, failedId);
  ok(Boolean(failedFile), 'The failure case uses a registered, not-yet-played city story clip');
  // Fail only this MP3 at the browser media boundary. This also works when a
  // controlling service worker would bypass Playwright's network routing.
  await page.evaluate(file => {
    const nativeFetch = window.fetch, NativeAudio = window.Audio;
    window.__cityStoryAudioFailure = { nativeFetch, NativeAudio, blocked: 0 };
    window.fetch = (input, init) => {
      if (String(input).includes(file)) {
        window.__cityStoryAudioFailure.blocked++;
        return Promise.reject(new TypeError('Fixture: this one story MP3 is unavailable'));
      }
      return nativeFetch.call(window, input, init);
    };
    window.Audio = function(src) {
      if (String(src).includes(file)) {
        window.__cityStoryAudioFailure.blocked++;
        return new NativeAudio('data:audio/mpeg;base64,AA==');
      }
      return new NativeAudio(src);
    };
  }, failedFile);
  await root.locator('#city-story-listen').click();
  await page.locator('#voice-status:not([hidden])').waitFor({ state: 'visible', timeout: 20000 });
  const blocked = await page.evaluate(() => window.__cityStoryAudioFailure.blocked);
  ok(blocked > 0 && /hang most nem indul/i.test(await page.locator('#voice-status').innerText()), 'A failed MP3 reports playback trouble without claiming success');
  ok(await root.getAttribute('data-node-id') === 'street-eszter' && await root.locator('.city-story-prose p').count() > 0, 'Text and current scene remain available after audio failure');
  await root.locator('[data-story-choice="eszter-actor"]').click();
  ok(await root.getAttribute('data-node-id') === 'street-arrive', 'Choices still advance after audio failure');
  await page.evaluate(() => {
    window.fetch = window.__cityStoryAudioFailure.nativeFetch;
    window.Audio = window.__cityStoryAudioFailure.NativeAudio;
    delete window.__cityStoryAudioFailure;
  });
  await page.locator('#spoken-guidance').evaluate((input, checked) => { input.checked = checked; input.dispatchEvent(new Event('change', { bubbles: true })); }, originalGuidance);

  const allEvents = await events();
  const firstStoryEvent = allEvents.findIndex(event => event.type === 'narrationstart' && event.id === first);
  const startedInStory = allEvents.slice(firstStoryEvent, beforeLeave).filter(event => event.type === 'narrationstart');
  ok(startedInStory.every(event => event.id?.startsWith('city_story_')), 'Story interactions never autoplay unrelated game narration');
  ok(errors.length === 0, `No uncaught browser errors: ${errors.join('; ')}`);
  return { count: checks.length, checks, blocked, errors };
}
