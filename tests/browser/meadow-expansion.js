// Run with playwright-cli run-code --filename in a dedicated, disposable browser session.
// This resets only that session's local test progress; never use a personal browser.
async (page) => {
  const checks = [], errors = [];
  const ok = (value, message) => { if (!value) throw Error(message); checks.push(message); };
  page.on('pageerror', error => errors.push(error.message));
  const saved = () => page.evaluate(() => JSON.parse(localStorage.getItem('speech_game_progress_v1')));
  const home = async () => { if (await page.locator('#home-button').isVisible()) await page.locator('#home-button').click(); };
  const enter = async () => { await home(); await page.locator('#home [data-open="play-menu"]').click(); await page.locator('#play-menu [data-open="meseliget"]').click(); };
  const parent = async () => {
    await home(); await page.locator('#parent-button').click();
    const numbers = (await page.locator('#parent-gate-question').innerText()).match(/\d+/g).map(Number);
    await page.locator('#parent-gate-answers button').filter({hasText:new RegExp(`^${numbers[0]+numbers[1]}$`)}).click();
  };
  const quantity = number => page.locator(`[data-quantity="${number}"]`).click();
  const apples = async count => { for (let i=0;i<count;i++) await page.locator(`.meadow-orchard [data-apple="${i}"]`).click(); };
  const plates = async count => { for (let i=0;i<count;i++) await page.locator(`[data-guest="${i}"]`).click(); };
  const finishTask = () => page.locator('#meadow-check').evaluate(button => { button.click(); button.click(); });
  const map = () => page.locator('#meadow-back').click();
  const viewportChecks = async name => {
    for (const [width,height] of [[375,667],[932,350],[834,1194]]) {
      await page.setViewportSize({width,height});
      const metrics = await page.evaluate(() => ({
        overflow: document.documentElement.scrollWidth > innerWidth,
        small: [...document.querySelectorAll('#meseliget button,#meseliget summary')].filter(button => {
          const rect = button.getBoundingClientRect();
          return rect.width > 0 && rect.height > 0 && (rect.width < 43.5 || rect.height < 43.5);
        }).map(button => button.id || button.dataset.quantity || button.className)
      }));
      ok(!metrics.overflow, `${name}: no horizontal overflow at ${width}×${height}`);
      ok(!metrics.small.length, `${name}: touch targets are at least 44px at ${width}×${height}: ${metrics.small.join(', ')}`);
      await page.screenshot({path:`output/playwright/meadow-${name}-${width}.png`,fullPage:true});
    }
  };

  await page.emulateMedia({reducedMotion:'reduce'});
  const url = page.url();
  await page.evaluate(async () => { localStorage.clear(); for (const registration of await navigator.serviceWorker.getRegistrations()) await registration.unregister(); for (const cache of await caches.keys()) await caches.delete(cache); });
  await page.goto('about:blank'); await page.goto(url);
  await parent(); await page.locator('#number-level').selectOption('10'); await page.locator('#round-length').selectOption('3');
  await enter();
  ok(await page.locator('[data-quantity]').count() === 10, 'All ten permitted picnic quantities are selectable');
  await viewportChecks('map'); await quantity(10); await page.locator('#meadow-start').click();
  const speechAttempts = (await saved()).attempts, firstReward = (await saved()).rewards;
  ok((await saved()).meadow.adventure.target === 10, 'New journey saves the selected ten-person target');
  await page.locator('[data-item="sapka"]').click(); await page.locator('[data-item="cipo"]').click();
  ok((await saved()).meadow.adventure.step === 1, 'Clothing advances the saved journey exactly once');
  await page.locator('#meadow-next').click(); await page.locator('#meadow-check').click();
  ok(await page.locator('.meadow-count-place').count() === 10, 'Incomplete collection shows ten one-to-one counting places');
  await apples(11);
  ok(await page.locator('.meadow-count-place.filled').count() === 10, 'Eleven apples fill exactly ten target places');
  ok(await page.locator('.meadow-extra-apples').isVisible(), 'An excess apple has clear return guidance');
  await page.locator('#meadow-reset').click();
  ok(await page.locator('.in-basket').count() === 0, 'Reset clears only the unfinished basket');
  await page.locator('#meadow-undo').click();
  ok(await page.locator('.in-basket').count() === 11, 'Undo restores the entire reset basket');
  await page.locator('.in-basket[data-apple="10"]').click();
  await viewportChecks('collect'); await finishTask();
  ok((await saved()).meadow.collect.assisted === 1 && (await saved()).meadow.adventure.step === 2, 'Fast repeated completion records collection once');
  ok((await saved()).rewards === firstReward, 'Collection does not reward an unfinished story');
  const completed = JSON.stringify((await saved()).meadow);
  await page.locator('#meadow-undo').evaluate(button => button.click()); await page.locator('#meadow-reset').evaluate(button => button.click());
  ok(JSON.stringify((await saved()).meadow) === completed, 'Solved-task undo and reset cannot change saved progress');
  ok(await page.locator('#meadow-next').evaluate(button => button === document.activeElement), 'Completion moves keyboard focus to the next action');
  await page.locator('#meadow-next').click(); await plates(10); await page.locator('#meadow-undo').click(); await page.locator('#meadow-hint').click();
  ok(await page.locator('.has-plate').count() === 9 && await page.locator('.needs-plate').count() === 1, 'Undo and help reveal the one friend still missing a plate');
  await viewportChecks('serve'); await page.locator('[data-guest="9"]').click(); await finishTask();
  ok((await saved()).meadow.journeys === 1 && (await saved()).rewards === firstReward+1, 'Ten-person story adds one journey and one reward');
  await page.locator('#meadow-next').click();
  ok(await page.locator('.meadow-memory-friends > span').count() === 10, 'The completed picnic scene includes all ten friends');
  await page.locator('#meadow-map').click(); await quantity(2); await page.locator('#meadow-garden').click();
  const fixedReward = (await saved()).rewards;
  for (let round=0;round<3;round++) {
    ok((await page.locator('.meadow-task-title').innerText()).includes('két'), `Fixed free practice retains two apples in round ${round+1}`);
    await apples(2); await finishTask(); await page.locator('#meadow-next').click();
  }
  ok((await saved()).rewards === fixedReward+1 && (await saved()).meadow.journeys === 1, 'Fixed free practice rewards once without adding a story journey');
  await page.locator('#meadow-map').click();
  for (let count=1;count<=10;count++) {
    await quantity(count); await page.locator('#meadow-garden').click(); await page.locator('#meadow-hint').click();
    ok(await page.locator('.meadow-count-place').count() === count, `Quantity ${count} has exactly ${count} counting places`);
    await apples(count); await finishTask(); await map();
  }
  await quantity(7); await page.locator('#meadow-start').click(); await page.locator('[data-item="sapka"]').click(); await page.locator('[data-item="cipo"]').click(); await page.locator('#meadow-next').click(); await map();
  const pausedStory = JSON.stringify((await saved()).meadow.adventure);
  await quantity(3); await page.locator('#meadow-picnic').click(); await plates(1);
  await page.locator('.meadow-practice-options summary').click(); await quantity(8);
  ok(await page.locator('[data-guest]').count() === 8 && await page.locator('.has-plate').count() === 0, 'Choosing a free quantity resets only the current unfinished task');
  ok(JSON.stringify((await saved()).meadow.adventure) === pausedStory, 'Free quantity changes preserve the saved story target and checkpoint');
  const freeReward = (await saved()).rewards;
  for (let round=0;round<3;round++) { await plates(8); await finishTask(); await page.locator('#meadow-next').click(); }
  ok((await saved()).rewards === freeReward+1 && JSON.stringify((await saved()).meadow.adventure) === pausedStory, 'A complete free round leaves the paused adventure untouched');
  await parent(); await page.locator('#number-level').selectOption('3'); await enter();
  ok(await page.locator('[data-quantity]').count() === 3, 'New quantity choices respect the parent number limit');
  await page.locator('#meadow-start').click();
  ok((await page.locator('.meadow-task-title').innerText()).includes('hét') && JSON.stringify((await saved()).meadow.adventure) === pausedStory, 'A saved seven-person adventure retains its target when the parent limit becomes three');
  await page.emulateMedia({reducedMotion:'no-preference'}); await page.locator('.meadow-orchard [data-apple="0"]').click();
  ok(await page.locator('.meadow-just-moved > span').evaluate(node => getComputedStyle(node).animationName === 'meadow-apple-arrive'), 'Moving an apple animates the chosen apple');
  await page.emulateMedia({reducedMotion:'reduce'});
  ok(await page.locator('.meadow-just-moved > span').evaluate(node => getComputedStyle(node).animationName === 'none'), 'Reduced motion disables apple animation');
  ok((await saved()).attempts === speechAttempts, 'Meadow practice leaves speech-attempt statistics untouched');
  ok(errors.length === 0, `No browser errors: ${errors.join(', ')}`);
  return {count:checks.length,checks,errors};
}
