// Run through playwright-cli run-code --filename in a disposable browser session.
// This fixture only changes this dedicated browser's local test profile.
async (page) => {
  const checks = [], errors = [];
  const ok = (value, message) => { if (!value) throw Error(`${message} (after ${checks.length} passing checks)`); checks.push(message); };
  page.on('pageerror', error => errors.push(error.message));
  const state = () => page.evaluate(() => JSON.parse(localStorage.getItem('speech_game_progress_v1')));
  const home = async () => {
    if (await page.locator('#round-complete').isVisible()) await page.locator('#round-home').click();
    else if (await page.locator('#home-button').isVisible()) await page.locator('#home-button').click();
  };
  const enter = async id => { await home(); await page.locator('#home [data-open="play-menu"]').click(); await page.locator(`#play-menu [data-open="${id}"]`).click(); };
  const map = () => page.locator('#meadow-back').dispatchEvent('click');
  const pick = value => page.locator(`[data-quantity="${value}"]`).click();
  const settings = async (collectMode, serveMode = 'all', showCount = true) => {
    if (!await page.locator('#meadow-collect-mode').isVisible()) await page.locator('.meadow-mode-options summary').click();
    await page.locator('#meadow-collect-mode').selectOption(collectMode);
    await page.locator('#meadow-serve-mode').selectOption(serveMode);
    await page.locator('#meadow-show-count').selectOption(showCount ? 'always' : 'never');
  };
  const apple = id => page.locator(`[data-apple="${id}"]`).click();
  const served = async (guest, item = 'plate') => page.locator(`[data-guest-id="${guest}"][data-serve-item="${item}"]`).click();
  const check = () => page.locator('#meadow-check').click();
  // Maciház dresses a random weather outfit: read the asked garment from the saved task.
  const dressStep = async story => {
    const task = (await state()).meadow[story ? 'adventure' : 'free'].task;
    const steps = await page.evaluate(async weather => (await import('./meseliget-data.js')).meadowDressSteps(weather), task.weather);
    return steps[task.dressed];
  };
  const dressAll = async story => {
    for (let step = 0; step < 4; step++) {
      const saved = (await state()).meadow[story ? 'adventure' : 'free'];
      if (!saved?.task || saved.task.kind !== 'dress' || saved.task.solved) break;
      await page.locator(`[data-item="${await dressStep(story)}"]`).click();
    }
  };
  const continueStory = async () => { await page.reload(); await enter('meseliget'); await page.locator('#meadow-start').click(); };
  const task = async () => { const p = (await state()).meadow; return p.free?.task; };
  const fillTable = async story => {
    let saved = (await state()).meadow[story ? 'adventure' : 'free'];
    for (const guest of saved.task.requestOrder) {
      if (!saved.task.plates.includes(guest)) await served(guest);
      if (saved.options.serveMode === 'full' && !saved.task.cups.includes(guest)) await served(guest, 'cup');
    }
  };
  const layout = async label => {
    for (const [width, height] of [[375, 667], [932, 350], [834, 1194]]) {
      await page.setViewportSize({ width, height });
      const metrics = await page.evaluate(() => ({ overflow: document.documentElement.scrollWidth > innerWidth,
        small: [...document.querySelectorAll('#meseliget button,#meseliget summary')].filter(button => { const r = button.getBoundingClientRect(); return r.width && r.height && (r.width < 43.5 || r.height < 43.5); }).map(button => button.id || button.className) }));
      ok(!metrics.overflow, `${label}: no overflow at ${width}`); ok(!metrics.small.length, `${label}: touch targets at ${width}: ${metrics.small.join(', ')}`);
    }
  };
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.evaluate(async () => { localStorage.clear(); for (const r of await navigator.serviceWorker.getRegistrations()) await r.unregister(); for (const key of await caches.keys()) await caches.delete(key); });
  await page.reload(); await enter('meseliget'); await page.locator('[data-quantity="3"]').click();
  await page.evaluate(() => { const s = JSON.parse(localStorage.getItem('speech_game_progress_v1')); s.settings.numberLimit = 10; s.settings.roundLength = 3; localStorage.setItem('speech_game_progress_v1', JSON.stringify(s)); });
  await page.reload(); await enter('meseliget'); await layout('map'); await pick(3); await page.locator('#meadow-start').click();
  ok((await state()).meadow.adventure.weather, 'A new adventure chooses the weather for Maci');
  const asked = await dressStep(true);
  const other = await page.locator('.meadow-clothing').evaluateAll((buttons, asked) => buttons.map(button => button.dataset.item).find(id => id !== asked), asked);
  await page.locator(`[data-item="${other}"]`).click(); await page.locator('#meadow-hint').click();
  ok(await page.locator(`[data-item="${other}"]`).evaluate(node => node.classList.contains('meadow-retry') && !node.classList.contains('meadow-hint')), 'Wrong clothes retain a distinct retry cue');
  ok(await page.locator(`[data-item="${asked}"].meadow-hint`).count() === 1, 'Help marks only the requested garment');
  await page.locator(`[data-item="${asked}"]`).click(); await map(); const savedStory = JSON.stringify((await state()).meadow.adventure);
  await page.locator('#meadow-house').click();
  ok((await state()).meadow.free.kind === 'dress' && (await state()).meadow.free.task.dressed === 0, 'Maciház starts independent dressing');
  await dressAll(false);
  ok(JSON.stringify((await state()).meadow.adventure) === savedStory, 'Standalone dressing preserves the paused story');
  await page.locator('#meadow-next').click(); await page.locator('#meadow-map').click(); await page.locator('#meadow-start').click();
  ok(await page.locator(`#meadow-bear [data-garment="${asked}"].is-worn`).count() >= 1, 'Story resumes with the previously worn garment');
  await dressAll(true); await page.locator('#meadow-next').click(); await apple(0); await apple(1);
  await continueStory();
  ok(await page.locator('.in-basket').count() === 2, 'Two collected apples survive a reload');
  await page.locator('#meadow-undo').click(); ok(await page.locator('.in-basket').count() === 1, 'Undo history survives reload');
  await apple(1); await apple(2); await check(); await page.locator('#meadow-next').click();
  const initialGuests = [...(await state()).meadow.adventure.guests]; await served(initialGuests[0]); await continueStory();
  ok((await state()).meadow.adventure.task.plates.includes(initialGuests[0]), 'Partial table survives reload');
  ok(JSON.stringify((await state()).meadow.adventure.guests) === JSON.stringify(initialGuests), 'Story guests remain stable');
  await fillTable(true); await check(); const firstMemory = (await state()).meadow.memories[0];
  ok(firstMemory.target === 3 && JSON.stringify(firstMemory.guests) === JSON.stringify(initialGuests), 'Album saves actual guests and count');
  ok((await state()).meadow.practice.target === 4 && (await state()).meadow.practice.serveMode === 'named', 'A finished picnic invites one more friend and asks for named serving next time');
  const reward = (await state()).rewards; await page.locator('#meadow-check').evaluate(button => button.click()); ok((await state()).rewards === reward, 'Repeated completion does not duplicate rewards');
  await page.locator('#meadow-next').click(); await page.locator('#meadow-map').click();
  await settings('sort'); await pick(3); await page.locator('#meadow-garden').click();
  await page.locator('[data-pear]').first().click(); ok((await task()).selected.length === 0 && (await task()).helped, 'Pears are not accepted as apples and assistance is recorded');
  await apple(0); await apple(1); await map(); await page.reload(); await enter('meseliget'); await page.locator('#meadow-free-resume').click();
  ok(await page.locator('.in-basket').count() === 2 && await page.locator('[data-pear]').count() > 0, 'Free sorting resumes its basket and variant');
  await page.locator('#meadow-reset').click(); ok(await page.locator('.in-basket').count() === 0, 'Count reset clears basket');
  await page.locator('#meadow-undo').click(); ok(await page.locator('.in-basket').count() === 2, 'Reset is undoable'); await map();
  await settings('add'); await page.locator('#meadow-garden').click(); ok(await page.locator('.in-basket').count() === 2, 'Addition starts from two apples');
  await apple(2); await check(); await page.locator('#meadow-next').waitFor({ state: 'visible' }); ok(await page.locator('#meadow-next').isVisible(), 'One added apple solves addition'); await map();
  await settings('remove'); await page.locator('#meadow-garden').click(); ok(await page.locator('.in-basket').count() === 4, 'Removal starts from four apples');
  await apple(3); await check(); await page.locator('#meadow-next').waitFor({ state: 'visible' }); ok(await page.locator('#meadow-next').isVisible(), 'One removed apple solves subtraction'); await map();
  await settings('count', 'named', false); await page.locator('#meadow-garden').click(); await apple(0);
  ok(await page.locator('.meadow-basket-label strong').count() === 0, 'Independent counting hides the running quantity');
  await page.locator('#meadow-hint').click(); ok(await page.locator('.meadow-basket-label strong').innerText() === '1', 'Requested help restores the counter'); await map();
  await page.locator('#meadow-picnic').click(); let free = (await state()).meadow.free;
  const first = free.task.requestOrder[0], wrong = free.guests.find(id => id !== first);
  await served(wrong); ok((await task()).plates.length === 0, 'Named request rejects a different guest');
  await served(first); ok((await task()).plates.includes(first), 'Named request accepts the named guest'); await fillTable(false); await check(); await map();
  await settings('count', 'full'); await pick(10); await page.locator('#meadow-picnic').click(); await layout('full-table');
  free = (await state()).meadow.free; const firstFull = free.task.requestOrder[0];
  await served(firstFull, 'cup'); ok((await task()).cups.length === 0, 'Full setting respects plate-before-cup instruction');
  await served(firstFull); await map(); await page.reload(); await enter('meseliget'); await page.locator('#meadow-free-resume').click();
  ok((await task()).plates.length === 1 && (await task()).cups.length === 0, 'Partial full setting resumes without losing a plate');
  await fillTable(false); await check(); await page.locator('#meadow-next').waitFor({ state: 'visible' }); ok(await page.locator('#meadow-next').isVisible(), 'Ten guests can receive both items'); await map();
  await pick(2); await page.locator('#meadow-start').click(); await dressAll(true); await page.locator('#meadow-next').click();
  await apple(0); await apple(1); await check(); await page.locator('#meadow-next').click(); await fillTable(true); await check(); await page.locator('#meadow-next').click(); await page.locator('#meadow-album-open').click();
  ok(await page.locator('.meadow-memory-friends > span').count() === 2, 'Newest album page shows the actual two-person picnic');
  await page.locator('#meadow-album-older').click(); ok(await page.locator('.meadow-memory-friends > span').count() === 3, 'Previous album page retains three original guests');
  ok(JSON.stringify((await state()).meadow.memories[0]) === JSON.stringify(firstMemory), 'Later free play and stories cannot rewrite older memories');
  await layout('album'); await page.screenshot({ path: 'output/playwright/story-album.png', fullPage: true });

  await enter('teddy-game');
  await page.evaluate(() => { window.teddyVoices = []; document.addEventListener('narrationstart', event => teddyVoices.push(event.detail.id)); });
  await page.locator('[data-teddy-mode="sequence"]').click();
  ok(await page.locator('#teddy-answers .word-picture').count() >= 3, 'Teddy uses original food illustrations, with a plate that is not asked for');
  ok(await page.locator('.teddy-order .teddy-order-blank').count() === 2, 'The ordered foods stay hidden until Maci eats them');
  await page.waitForFunction(() => teddyVoices.some(id => /^teddy_sequence_[a-z]+_[a-z]+$/.test(id)), undefined, { timeout: 15000 });
  const labels = (await page.evaluate(() => teddyVoices.filter(id => /^teddy_sequence_[a-z]+_[a-z]+$/.test(id)).at(-1))).split('_').slice(2);
  await page.locator(`#teddy-answers [data-word="${labels[1]}"]`).click();
  ok(await page.locator('.teddy-order .is-done').count() === 0, 'Second food cannot satisfy the first request');
  await page.locator(`#teddy-answers [data-word="${labels[0]}"]`).click();
  ok(await page.locator('#teddy-next').isDisabled() && await page.locator('.teddy-order .is-done').count() === 1, 'First food advances only the sequence step');
  await page.locator(`#teddy-answers [data-word="${labels[1]}"]`).click();
  ok(await page.locator('#teddy-next').isEnabled() && await page.locator('.teddy-order .is-done').count() === 2, 'Both foods complete the ordered request');
  await page.screenshot({ path: 'output/playwright/story-teddy.png', fullPage: true });
  await page.locator('[data-teddy-mode="single"]').click(); ok(await page.locator('.teddy-order').isHidden(), 'Beginner mode keeps a single request');

  await enter('dress-game');
  for (const [outfit, count] of [['classic', 4], ['rain', 3], ['summer', 4]]) {
    await page.locator(`[data-dress-mode="${outfit}"]`).click(); const before = (await state()).rewards;
    for (let i = 0; i < count; i++) {
      for (const id of await page.locator('#dress-answers button').evaluateAll(buttons => buttons.map(button => button.dataset.item))) {
        if (await page.locator('#dress-next').isEnabled()) break;
        await page.locator(`#dress-answers [data-item="${id}"]`).click();
      }
      await page.locator('#dress-next').click();
    }
    await page.locator('#round-complete').waitFor({ state: 'visible' });
    ok(await page.locator('#round-complete').isVisible() && (await state()).rewards === before + 1, `${outfit} outfit completes once`);
    await page.locator('#round-home').click(); await enter('dress-game');
  }
  await page.locator('[data-dress-mode="free"]').click();
  await page.locator('#dress-answers [data-item="sapka"]').click(); await page.locator('#dress-answers [data-item="napkalap"]').click();
  ok(await page.locator('#dress-bear [data-garment="sapka"].is-worn').count() === 0 && await page.locator('#dress-bear [data-garment="napkalap"].is-worn').count() === 1, 'Wardrobe replaces garments in the same place');
  await page.locator('#dress-answers [data-item="napkalap"]').click(); ok(await page.locator('#dress-bear [data-garment="napkalap"].is-worn').count() === 0, 'Second tap removes a garment');
  for (const id of ['polo', 'esokabat', 'gumicsizma']) await page.locator(`#dress-answers [data-item="${id}"]`).click();
  await page.screenshot({ path: 'output/playwright/story-wardrobe.png', fullPage: true });
  ok(errors.length === 0, `No uncaught browser errors: ${errors.join(', ')}`);
  return { count: checks.length, checks, errors };
}
