// Run in a fresh disposable Playwright CLI session; this resets its test progress.
async page => {
  const checks = [], errors = [], ok = (value, message) => { if (!value) throw Error(message); checks.push(message); };
  page.on('pageerror', error => errors.push(error.message));
  await page.route('https://cdn.jsdelivr.net/**', route => route.fulfill({ contentType: 'text/javascript', body: '' }));
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.evaluate(async () => { localStorage.clear(); for (const r of await navigator.serviceWorker.getRegistrations()) await r.unregister(); for (const k of await caches.keys()) await caches.delete(k); });
  await page.addInitScript(() => {
    window.narrationEvents = [];
    for (const type of ['narrationword', 'narrationend']) document.addEventListener(type, event => narrationEvents.push({ type, ...event.detail, marks: [...document.querySelectorAll('.is-narrated')].map(node => ({ classes: node.className?.baseVal || node.className, card: node.closest('[data-card]')?.dataset.card })) }));
  });
  const url = page.url(); await page.goto('about:blank'); await page.goto(url);
  await page.waitForFunction(() => document.querySelector('#offline-status').textContent.startsWith('Letöltve.'));
  const home = async () => { if (await page.locator('#home-button').isVisible()) await page.locator('#home-button').click(); };
  const enter = async name => { await home(); const group = await page.evaluate(async name => (await import('./navigation.js')).parentScreen(name), name); await page.locator(`#home [data-open="${group}"]`).click(); await page.locator(`#${group} [data-open="${name}"]`).click(); };
  const waitMark = selector => page.waitForFunction(selector => !!document.querySelector(selector + '.is-narrated'), selector);
  const clear = () => page.evaluate(() => { narrationEvents.length = 0; });

  await enter('workshop'); await waitMark('[data-game="sort"]');
  ok(await page.locator('[data-game="balance"].is-narrated').count() === 0, 'Workshop introduction highlights games in spoken order');
  await page.locator('[data-game="balance"]').click(); await clear();
  await waitMark('.ws-balance-reference'); await waitMark('.ws-balance-tray');
  ok(await page.locator('.ws-balance-reference.is-narrated').count() === 0, 'Balance explanation moves from reference to the child tray');
  const target = await page.locator('.ws-balance-heading b').innerText();
  await page.waitForFunction(id => narrationEvents.some(event => event.type === 'narrationend' && event.id === id), 'workshop_n_' + target);
  ok(await page.evaluate(id => narrationEvents.some(event => event.id === id && event.marks.some(mark => mark.classes.includes('ws-balance-reference')) && event.marks.some(mark => mark.classes.includes('is-narrated'))), 'workshop_n_' + target), 'Spoken target number identifies the reference quantity');
  ok(await page.locator('#workshop .is-narrated').count() === 0, 'Completed balance sequence clears its cues');
  for (let i = 0; i < 3; i++) await page.locator('#ws-hint').click();
  await page.waitForFunction(() => narrationEvents.some(event => event.id.startsWith('workshop_n_') && event.marks.some(mark => mark.classes.includes('ws-hint-focus'))));
  ok(await page.locator('.ws-hint-focus.is-narrated').count() === 1, 'Third hint number highlights exactly the recommended rod');
  await page.locator('#ws-back').click(); await page.locator('[data-level="2"]').click(); await page.locator('[data-game="pattern"]').click();
  await waitMark('.ws-pattern-fixed'); await waitMark('.ws-pattern-slot'); await waitMark('.ws-pattern-choices');
  ok(await page.locator('.ws-pattern-slot.is-narrated').count() === 0, 'Pattern explanation moves from repeating unit to gaps and choices');
  await home(); ok(await page.locator('#workshop .is-narrated').count() === 0, 'Leaving a workshop cancels its current cue');

  await enter('memory'); await waitMark('.memory-board'); await clear();
  const card = await page.locator('[data-card]').first().getAttribute('data-card');
  await page.locator(`[data-card="${card}"]`).click(); await waitMark(`[data-card="${card}"] .memory-card-face`);
  ok(await page.locator('.memory-card-face.is-narrated').count() === 1, 'Only the newly turned memory picture is narrated');
  ok(await page.locator('.memory-card:not(.is-open) .is-narrated').count() === 0, 'Memory narration leaves concealed pictures hidden');
  await page.locator('#memory-hint').click(); await waitMark('.memory-card.is-open');
  ok(await page.locator('.memory-card.is-narrated').count() === await page.locator('.memory-card').count(), 'Memory preview narration includes every revealed picture');
  await page.locator('#memory-hint').click();
  ok(await page.locator('#memory .is-narrated').count() === 0, 'Ending the preview immediately clears memory cues');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.locator(`[data-card="${card}"]`).click(); await waitMark(`[data-card="${card}"] .memory-card-face`);
  ok(await page.locator('.memory-card-face.is-narrated').evaluate(node => getComputedStyle(node).animationName) === 'none', 'Memory cues honor reduced motion');
  await home(); ok(await page.locator('#memory .is-narrated').count() === 0, 'Leaving memory cancels the word animation');

  await page.context().setOffline(true); await page.reload(); await enter('workshop');
  await page.locator('[data-level="1"]').click(); await page.locator('[data-game="balance"]').click(); await waitMark('.ws-balance-reference');
  ok(true, 'Workshop timings and voice cues work after an offline reload');
  await enter('memory'); await page.locator('[data-card]').first().click(); await waitMark('.memory-card-face');
  ok(true, 'Memory picture voice and its cue work offline');
  await home(); await page.context().setOffline(false);
  ok(errors.length === 0, 'New game narration has no browser script errors');
  return { count: checks.length, checks };
}
