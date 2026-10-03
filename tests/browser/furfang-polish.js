// Playwright browser helper; call runFurfangPolishChecks(page, servedProjectUrl).
// Uses the real controller with deterministic tasks and in-memory callbacks.
export async function runFurfangPolishChecks(page, baseURL) {
  const ensure = (value, message) => { if (!value) throw new Error(message); };
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.goto(baseURL);
  await page.setContent(`<html lang="hu"><head><base href="${baseURL}/"><link rel="stylesheet" href="styles.css"><link rel="stylesheet" href="child-ui.css"><link rel="stylesheet" href="logic.css"></head><body><main class="app"><section id="furfangliget" class="logic-panel"></section></main></body></html>`);
  await page.evaluate(async url => {
    const { setupLogic } = await import(`${url}/logic-game.js`);
    const data = await import(`${url}/logic-data.js`);
    const fixture = window.furfangFixture = { progress: data.normalizeLogic(), rewards: 0, options: { mathLimit: 20, shopLevel: 1, machineLevel: 3, routeLevel: 3 }, spoken: [], levelChanges: [], data };
    for (const game of data.LOGIC_GAMES) fixture.progress.sessions[game] = data.newSession(game, fixture.options[`${game}Level`], 20, 23);
    fixture.controller = setupLogic({
      getProgress: () => fixture.progress, getOptions: () => fixture.options,
      updateProgress: (progress, reward) => { fixture.progress = progress; if (reward) fixture.rewards++; },
      speak: ids => fixture.spoken.push(ids), stopPlayback() {},
      setLevel: (kind, level) => { fixture.options[`${kind}Level`] = level; fixture.levelChanges.push([kind, level]); },
    });
    fixture.controller.start();
  }, baseURL.replace(/\/$/, ''));
  await page.setViewportSize({ width: 375, height: 667 });
  await page.locator('[data-game="shop"]').click();
  const taskFor = kind => page.evaluate(k => {
    const f = window.furfangFixture, s = f.progress.sessions[k]; return f.data.generateTask(k, s.level, s.limit, s.seed);
  }, kind);
  const assertLayout = async label => {
    const result = await page.evaluate(() => ({
      overflow: document.documentElement.scrollWidth > innerWidth,
      small: [...document.querySelectorAll('#furfangliget button, #furfangliget input, #furfangliget select')].filter(el => !el.disabled && el.getBoundingClientRect().height < 44).map(el => el.id || el.textContent),
    }));
    ensure(!result.overflow, `${label}: horizontal overflow`); ensure(!result.small.length, `${label}: small controls ${result.small}`);
  };
  await assertLayout('shop mobile');
  let task = await taskFor('shop');
  await page.locator('#logic-value-0').fill('21'); await page.locator('#logic-value-0').press('Tab');
  ensure((await page.locator('#logic-status').textContent()).includes('egész szám'), 'invalid quantity is rejected');
  const original = await page.evaluate(() => window.furfangFixture.progress.sessions.shop.values[0]);
  const changed = (original + 1) % 21;
  await page.locator('#logic-value-0').fill(String(changed)); await page.locator('#logic-value-0').press('Tab');
  await page.locator('#logic-undo').click();
  ensure(Number(await page.locator('#logic-value-0').inputValue()) === original, 'numeric entry undo');
  for (let stage = 0; stage < 2; stage++) {
    for (let i = 0; i < 2; i++) await page.locator(`#logic-value-${i}`).fill(String(task.orders[stage][i]));
    await page.locator('#logic-check').click();
    ensure(await page.locator('.is-delivering').count() === 1, 'shop delivers baskets');
    await page.waitForFunction(() => document.querySelector('#furfangliget').dataset.busy === 'false');
    ensure(await page.evaluate(() => window.furfangFixture.rewards) === stage, 'shop reward only after both orders');
  }
  ensure(await page.locator('.is-delivered').count() === 1, 'completed delivery remains visible');
  await page.locator('#logic-back').click(); await page.locator('[data-game="shop"]').click();
  ensure(await page.evaluate(() => window.furfangFixture.rewards) === 1, 'reopening does not duplicate reward');
  await page.locator('#logic-level').selectOption('2');
  ensure(await page.evaluate(() => window.furfangFixture.levelChanges.at(-1).join()) === 'shop,2', 'difficulty callback persists');
  await page.locator('#logic-back').click(); await page.locator('[data-game="machine"]').click();
  await assertLayout('machine mobile'); task = await taskFor('machine');
  await page.locator('#logic-trial').click();
  ensure((await page.locator('#logic-status').textContent()).includes('üres'), 'machine needs all slots');
  for (const op of task.program) await page.locator(`#logic-op-${op}`).click();
  await page.locator('#logic-trial').click();
  ensure(await page.locator('.logic-machine-run.is-running').count() === 1, 'machine trial has visual trace');
  await page.waitForFunction(() => !!document.querySelector('.is-operating'));
  ensure(await page.locator('[data-op]:enabled').count() === 0, 'trial locks edits');
  await page.waitForFunction(() => document.querySelector('#furfangliget').dataset.busy === 'false');
  ensure((await page.locator('#logic-status').textContent()).includes('Minden példa illik'), 'machine trial validates examples');
  ensure(await page.evaluate(() => window.furfangFixture.rewards) === 1, 'machine trial earns no reward');
  await page.locator('#logic-counters').click(); ensure(await page.locator('.logic-input .logic-dots').count() > 0, 'higher-level counters are optional');
  const answers = await page.evaluate(t => t.questions.map(n => window.furfangFixture.data.applyRule(n, t.program)), task);
  for (let i = 0; i < 2; i++) { await page.locator(`#logic-value-${i}`).fill(String(answers[i])); await page.locator(`#logic-value-${i}`).press('Tab'); }
  await page.locator('#logic-check').click(); ensure(await page.locator('#logic-next').count() === 1, 'correct machine completes');
  await page.locator('#logic-back').click(); await page.locator('[data-game="route"]').click();
  await assertLayout('route mobile'); task = await taskFor('route');
  const path = await page.evaluate(t => window.furfangFixture.data.routeSolution(t), task);
  for (const cell of path.slice(1)) await page.locator(`#logic-cell-${cell}`).click();
  ensure(await page.locator('[data-plan-step]').count() === path.length - 1, 'route plan is numbered');
  const initialTransform = await page.locator('.logic-traveller').evaluate(el => el.style.transform);
  await page.locator('#logic-check').click();
  await page.waitForFunction(initial => document.querySelector('.logic-traveller').style.transform !== initial, initialTransform);
  await page.waitForFunction(() => !!document.querySelector('#logic-next'), null, { timeout: 15000 });
  ensure(await page.evaluate(() => window.furfangFixture.rewards) === 3, 'route completes once');
  await page.evaluate(() => { Object.defineProperty(document, 'hidden', { configurable: true, value: true }); document.dispatchEvent(new Event('visibilitychange')); Object.defineProperty(document, 'hidden', { configurable: true, value: false }); document.dispatchEvent(new Event('visibilitychange')); });
  const foxAtHome = await page.locator('.logic-traveller').evaluate(el => {
    const home = document.querySelector(`[data-cell="${window.furfangFixture.data.generateTask('route', 3, 20, 23).end}"]`);
    const a = el.getBoundingClientRect(), b = home.getBoundingClientRect(); return Math.abs(a.left - b.left) < 3 && Math.abs(a.top - b.top) < 3;
  });
  ensure(foxAtHome, 'completed route keeps fox at home after visibility change');
  await page.locator('#logic-next').click();
  for (let hint = 0; hint < 3; hint++) await page.locator('#logic-hint').click();
  ensure((await page.locator('#logic-hint').textContent()).includes('3/3'), 'three help levels');
  task = await taskFor('route');
  const nextPath = await page.evaluate(t => window.furfangFixture.data.routeSolution(t), task);
  for (const cell of nextPath.slice(1)) await page.locator(`#logic-cell-${cell}`).click();
  await page.setViewportSize({ width: 932, height: 350 }); await assertLayout('route landscape');
  await page.locator('#logic-check').click();
  await page.evaluate(() => { Object.defineProperty(document, 'hidden', { configurable: true, value: true }); document.dispatchEvent(new Event('visibilitychange')); Object.defineProperty(document, 'hidden', { configurable: true, value: false }); document.dispatchEvent(new Event('visibilitychange')); });
  await page.waitForTimeout(800);
  ensure(await page.evaluate(() => window.furfangFixture.rewards) === 3, 'visibility cancels a valid route without reward');
  await page.locator('#logic-check').click(); await page.evaluate(() => window.furfangFixture.controller.stop());
  await page.waitForTimeout(800);
  ensure(await page.evaluate(() => window.furfangFixture.rewards) === 3, 'stopping cancels completion');
  await page.evaluate(() => window.furfangFixture.controller.start());
  await page.locator('[data-game="shop"]').click(); await assertLayout('shop landscape');
  await page.locator('#logic-back').click(); await page.locator('[data-game="machine"]').click(); await assertLayout('machine landscape');
  if (await page.locator('#logic-next').count()) await page.locator('#logic-next').click();
  await page.emulateMedia({ reducedMotion: 'reduce' });
  task = await taskFor('machine'); for (const op of task.program) await page.locator(`#logic-op-${op}`).click();
  await page.locator('#logic-trial').click(); await page.waitForFunction(() => document.querySelector('#furfangliget').dataset.busy === 'false');
  ensure(await page.locator('.logic-match').count() === 3, 'reduced motion keeps machine trial result');
  ensure(!errors.length, `browser errors: ${errors.join('; ')}`);
  return { checked: ['shop orders/delivery/undo/reward', 'difficulty callback', 'machine trace/validation/counters', 'route walking/numbered plan', 'visibility/stop/reduced motion', '375×667 and 932×350 layouts'], rewards: 3 };
}
