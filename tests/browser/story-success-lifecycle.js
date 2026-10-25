// Disposable Playwright CLI helper. Uses real game modules with local callbacks,
// without loading app.js or touching stored profiles.
async page => {
  const checks = [], errors = [];
  const ok = (value, label) => { if (!value) throw Error(`${label} (${checks.length} checks passed)`); checks.push(label); };
  page.on('pageerror', error => errors.push(error.message));
  const origin = new URL(page.url()).origin;
  await page.goto(`${origin}/number-data.js`);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.evaluate(async () => {
    const html = new DOMParser().parseFromString(await (await fetch('/index.html')).text(), 'text/html');
    html.querySelectorAll('script').forEach(script => script.remove());
    document.body.innerHTML = html.body.innerHTML;
    html.querySelectorAll('link[rel="stylesheet"]').forEach(link => document.head.append(link.cloneNode()));
    const [{ setupMeadow }, md, { setupTeddyGame }, { setupDressGame }] = await Promise.all([
      import('/meseliget-game.js'), import('/meseliget-data.js'), import('/teddy-game.js'), import('/dress-game.js'),
    ]);
    const qa = window.storySuccess = { voice: [], effects: [], updates: [], restarts: [], completions: [], hidden: false,
      meadow: md.normalizeMeadow({ practice: { target: 3, varied: false } }), options: { numberLimit: 3, roundLength: 1 } };
    const stopPlayback = () => { qa.pendingVoice?.(); qa.pendingVoice = null; };
    const speak = id => {
      stopPlayback(); qa.voice.push(id);
      return qa.holdVoice ? new Promise(resolve => { qa.pendingVoice = resolve; }) : Promise.resolve();
    };
    const effect = id => qa.effects.push(id);
    qa.api = {
      meadow: setupMeadow({ effect, getProgress: () => qa.meadow, updateProgress: (state, reward) => { qa.meadow = structuredClone(state); qa.updates.push({ reward }); }, getOptions: () => qa.options, speak, stopPlayback, openScreen() {} }),
      teddy: setupTeddyGame({ effect, getOptions: () => ({ length: 3, choiceCount: 2 }), playPrompt: food => { qa.food = food.id; return speak(`food_${food.id}`); }, playThanks: () => speak('teddy-thanks'), speak, stopPlayback, onComplete: count => qa.completions.push({ game: 'teddy', count }), onRestart: () => qa.restarts.push('teddy') }),
      dress: setupDressGame({ effect, getChoiceCount: () => 2, playPrompt: item => { qa.garment = item.id; return speak(`garment_${item.id}`); }, playThanks: item => speak(`thanks_${item.id}`), speak, stopPlayback, onComplete: count => qa.completions.push({ game: 'dress', count }), onRestart: () => qa.restarts.push('dress') }),
    };
    qa.open = game => {
      for (const api of Object.values(qa.api)) api.stop();
      const id = game === 'meadow' ? 'meseliget' : `${game}-game`;
      document.body.dataset.screen = id;
      document.querySelectorAll('.panel').forEach(panel => { panel.hidden = panel.id !== id; panel.classList.toggle('is-active', panel.id === id); });
      qa.api[game].start();
    };
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => qa.hidden });
    Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => qa.hidden ? 'hidden' : 'visible' });
    qa.setHidden = hidden => { qa.hidden = hidden; document.dispatchEvent(new Event('visibilitychange')); };
    qa.open('meadow');
  });
  const snapshot = () => page.evaluate(() => ({ meadow: storySuccess.meadow, voice: storySuccess.voice, effects: storySuccess.effects, updates: storySuccess.updates, restarts: storySuccess.restarts, completions: storySuccess.completions }));
  const narration = async id => (await snapshot()).voice.filter(value => value === id).length;
  const collect = async () => { for (const id of [0, 1, 2]) await page.locator(`[data-apple="${id}"]`).click(); };
  await page.locator('#meadow-garden').click(); await collect();
  await page.locator('#meadow-check').evaluate(button => { button.click(); button.click(); });
  let state = await snapshot();
  ok(state.meadow.collect.independent === 1 && state.updates.filter(update => update.reward).length === 1, 'A completed one-task basket saves exactly once before the ending');
  ok(await page.locator('#meseliget').getAttribute('data-success-pending') === 'true' && await page.locator('#meadow-next').isHidden(), 'The completed basket remains visible without an early Next action');
  ok(await page.locator('.in-basket').count() === 3 && await page.locator('[data-apple]').first().isDisabled(), 'Completed basket contents stay visible and cannot change');
  await page.waitForTimeout(180); await page.evaluate(() => storySuccess.setHidden(true)); await page.waitForTimeout(1100);
  ok(await page.locator('#meadow-next').isHidden() && await narration('mese_collected_3') === 0, 'Background time never consumes the visible success interval');
  await page.evaluate(() => storySuccess.setHidden(false)); await page.waitForTimeout(450);
  ok(await page.locator('#meadow-next').isHidden(), 'Returning keeps the remainder of the visible interval');
  await page.locator('#meadow-next').waitFor({ state: 'visible' });
  ok(await narration('mese_collected_3') === 1, 'Basket completion narration starts once after the delay');
  await page.locator('#meadow-next').click();
  ok(await page.locator('.meadow-ending').count() === 1, 'A one-task round reaches its final scene');

  await page.evaluate(() => storySuccess.api.meadow.start()); await page.locator('#meadow-garden').click(); await collect(); await page.locator('#meadow-check').click();
  const beforeLeave = await narration('mese_collected_3');
  await page.locator('#meadow-back').dispatchEvent('click'); await page.waitForTimeout(1100);
  ok(await page.locator('.meadow-map').count() === 1 && await narration('mese_collected_3') === beforeLeave, 'Leaving a completed task cancels its stale ending and voice');
  await page.locator('#meadow-free-resume').click();
  ok(await page.locator('#meadow-next').isVisible() && (await snapshot()).meadow.collect.independent === 2, 'Resuming an already saved completion does not record it twice');
  await page.locator('#meadow-back').dispatchEvent('click');
  await page.locator('.meadow-mode-options summary').click(); await page.locator('#meadow-serve-mode').selectOption('full');
  await page.locator('#meadow-picnic').click();
  for (const guest of (await snapshot()).meadow.free.task.requestOrder) {
    for (const item of ['plate', 'cup']) await page.locator(`[data-guest-id="${guest}"][data-serve-item="${item}"]`).click();
  }
  await page.locator('#meadow-check').click();
  ok(await page.locator('.has-item').count() === 6 && await page.locator('#meadow-next').isHidden(), 'Advanced completed table preserves all plates and cups during its delay');
  await page.evaluate(() => document.querySelector('#parent-gate').showModal()); await page.waitForTimeout(1100);
  ok(await page.locator('#meadow-next').isVisible() && await narration('mese_served_full') === 0, 'A parent dialog suppresses delayed table narration');
  await page.evaluate(() => document.querySelector('#parent-gate').close());
  await page.locator('#meadow-back').dispatchEvent('click'); await page.locator('#meadow-house').click();
  await page.locator('[data-item="cipo"]').click(); await page.locator('#meadow-hint').click();
  ok(await page.locator('[data-item="cipo"].meadow-retry').count() === 1 && await page.locator('[data-item="sapka"].meadow-hint').count() === 1, 'Dressing retry and requested help remain distinct static cues');
  await page.locator('[data-item="sapka"]').click(); await page.locator('[data-item="cipo"]').click();
  ok(await page.locator('#meadow-next').isHidden(), 'Standalone Maciház also preserves its completed outfit before the ending');
  await page.locator('#meadow-next').waitFor({ state: 'visible' });
  ok(await narration('mese_house_done') === 1, 'Standalone dressing uses its own delayed ending voice');

  await page.locator('#meadow-back').dispatchEvent('click'); await page.locator('#meadow-garden').click(); await collect(); await page.locator('#meadow-check').click();
  const beforeSnapshot = await narration('mese_collected_3');
  const freshSnapshot = await page.evaluate(async () => {
    const { normalizeMeadow } = await import('/meseliget-data.js');
    storySuccess.api.meadow.stop();
    storySuccess.meadow = normalizeMeadow({ practice: { target: 2, varied: false } });
    storySuccess.holdVoice = true; storySuccess.api.meadow.start();
    return JSON.stringify(storySuccess.meadow);
  });
  await page.waitForTimeout(1100);
  ok(await page.locator('.meadow-map').count() === 1 && JSON.stringify((await snapshot()).meadow) === freshSnapshot, 'A replacement profile snapshot survives the old pending completion unchanged');
  ok(await narration('mese_collected_3') === beforeSnapshot, 'A replaced snapshot cannot speak the old successful quantity');
  await page.evaluate(() => { storySuccess.api.meadow.stop(); storySuccess.holdVoice = false; });
  ok(await page.evaluate(() => storySuccess.pendingVoice === null), 'Stopping a profile releases its pending narration callback');

  await page.evaluate(() => storySuccess.open('teddy')); await page.locator('[data-teddy-mode="sequence"]').click();
  // The order is secret on screen; it is read back from the spoken request.
  const heardFoods = async () => [...(await snapshot()).voice].reverse().flat().find(id => /^teddy_sequence_[a-z]+_[a-z]+$/.test(id)).split('_').slice(2);
  const foods = await heardFoods();
  await page.locator(`#teddy-answers [data-word="${foods[1]}"]`).click();
  await page.locator(`#teddy-answers [data-word="${foods[0]}"]`).click();
  await page.locator(`#teddy-answers [data-word="${foods[1]}"]`).click();
  ok(await page.locator('.teddy-order .is-done').count() === 2, 'Teddy ordered requests still complete both distinct steps');
  ok((await snapshot()).restarts.filter(game => game === 'teddy').length === 2, 'Teddy start and mode switch notify the root to cancel a stale round ending');
  await page.locator('#teddy-next').click(); await page.emulateMedia({ reducedMotion: 'no-preference' });
  const [firstFood] = await heardFoods();
  const thanksBeforeRestart = await narration('teddy-thanks');
  await page.locator(`#teddy-answers [data-word="${firstFood}"]`).click();
  ok(await page.locator('.teddy-morsel').count() === 1, 'A real feeding flight is pending before the restart test');
  await page.evaluate(() => { storySuccess.api.teddy.stop(); storySuccess.api.teddy.start(); });
  await page.waitForTimeout(750);
  ok(await page.locator('.teddy-morsel').count() === 0 && await page.locator('.teddy-order .is-done').count() === 0 && await page.locator('#teddy-next').isDisabled(), 'Stopping and restarting during flight cannot finish the replacement request');
  ok(await narration('teddy-thanks') === thanksBeforeRestart, 'A cancelled feeding animation cannot speak late thanks');
  await page.emulateMedia({ reducedMotion: 'reduce' });

  await page.evaluate(() => storySuccess.open('dress')); await page.locator('[data-dress-mode="rain"]').click();
  for (let item = 0; item < 3; item++) {
    const id = await page.evaluate(() => storySuccess.garment);
    await page.locator(`#dress-answers [data-item="${id}"]`).click(); await page.locator('#dress-next').click();
  }
  ok((await snapshot()).completions.some(value => value.game === 'dress' && value.count === 5), 'A clean rain outfit completes through the root completion callback with full stars');
  await page.locator('[data-dress-mode="free"]').click();
  await page.locator('#dress-answers [data-item="esokabat"]').click(); await page.locator('#dress-answers [data-item="esokabat"]').click();
  state = await snapshot();
  ok(state.voice.filter(id => id === 'dress_name_esokabat').length === 2, 'Adding and removing a new wardrobe garment both speak its name');
  ok(state.restarts.filter(game => game === 'dress').length === 3, 'Every wardrobe or outfit restart cancels any pending root completion');
  await page.evaluate(() => { storySuccess.holdVoice = true; });
  for (const id of ['polo', 'napkalap', 'rovidnadrag']) await page.locator(`#dress-answers [data-item="${id}"]`).click();
  ok(await page.locator('#dress-next').isDisabled(), 'An outfit that fits no weather card earns no star yet');
  await page.locator('#dress-answers [data-item="szandal"]').click();
  ok(await page.locator('.dress-weather-card.is-match').getAttribute('data-weather') === 'summer', 'A complete summer outfit lights up its weather card');
  await page.locator('#dress-next').click();
  ok(await page.locator('#dress-answers button:enabled').count() === 0 && await page.evaluate(() => storySuccess.pendingVoice === null), 'Completing a free outfit locks its garments and cancels pending garment narration');
  for (const effect of ['collect', 'serve', 'fabric', 'retry', 'undo']) ok(state.effects.includes(effect), `Preserved interaction audio callback: ${effect}`);
  ok(errors.length === 0, `No uncaught errors: ${errors.join('; ')}`);
  await page.evaluate(() => { for (const api of Object.values(storySuccess.api)) api.stop(); });
  return { count: checks.length, checks };
}
