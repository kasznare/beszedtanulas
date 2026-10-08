// Run through Playwright CLI in its own disposable session; never resets a user's browser.
async page => {
  const checks = [], errors = [], ok = (value, message) => { if (!value) throw Error(message); checks.push(message); };
  page.on('pageerror', error => errors.push(error.message));
  const url = page.url();
  await page.evaluate(async () => {
    localStorage.clear();
    for (const r of await navigator.serviceWorker.getRegistrations()) await r.unregister();
    for (const key of await caches.keys()) await caches.delete(key);
  });
  await page.goto('about:blank'); await page.goto(url);
  await page.setViewportSize({ width: 430, height: 932 });
  const enter = async () => {
    if (await page.locator('#round-complete').isVisible()) await page.locator('#round-home').click();
    else if (await page.locator('#home-button').isVisible()) await page.locator('#home-button').click();
    await page.locator('#home [data-open="activity-menu"]').click();
    await page.locator('#activity-menu [data-open="pour"]').click();
  };
  const saved = () => page.evaluate(() => JSON.parse(localStorage.getItem('speech_game_progress_v1')));
  const fill = cup => page.locator(`#pour-water-${cup}`).evaluate(node => Number(node.getAttribute('height')) / 110);
  const done = cup => page.locator(`[data-pour-cup="${cup}"]`).getAttribute('data-done');
  const waitFill = (cup, amount) => page.waitForFunction(({ cup, amount }) => Number(document.querySelector(`#pour-water-${cup}`).getAttribute('height')) / 110 >= amount, { cup, amount });
  const sensor = (beta, gamma, milliseconds = 700) => page.evaluate(({ beta, gamma, milliseconds }) => new Promise(resolve => {
    const until = performance.now() + milliseconds;
    const timer = setInterval(() => {
      const event = new Event('deviceorientation');
      Object.defineProperties(event, { beta: { value: beta }, gamma: { value: gamma } });
      window.dispatchEvent(event);
      if (performance.now() >= until) { clearInterval(timer); resolve(); }
    }, 40);
  }), { beta, gamma, milliseconds });

  await enter();
  const before = (await saved()).rewards;
  await page.keyboard.down('ArrowLeft');
  await page.waitForFunction(() => document.querySelector('[data-pour-cup="0"]').dataset.done === 'true');
  await page.keyboard.up('ArrowLeft');
  ok(Math.abs(await fill(0) - .72) < .0001 && await fill(1) === 0, 'Beginner control stops exactly at the mark in the selected glass');
  await page.keyboard.down('ArrowRight');
  await page.waitForFunction(() => document.querySelector('[data-pour-cup="1"]').dataset.done === 'true');
  await page.keyboard.up('ArrowRight');
  ok((await saved()).rewards === before, 'Two glasses await the explicit finish button');
  await page.locator('#pour-finish').evaluate(button => { button.click(); button.click(); });
  ok((await saved()).rewards === before + 1, 'The complete picnic rewards once even on duplicate activation');
  ok((await saved()).attempts === 0, 'Pouring does not add speech attempts');
  await page.locator('#round-replay').click();
  ok(await fill(0) === 0 && await fill(1) === 0, 'Replay opens a fresh pouring game');

  const hold = await page.locator('#pour-hold').boundingBox();
  await page.mouse.move(hold.x + hold.width / 2, hold.y + hold.height / 2); await page.mouse.down();
  await waitFill(0, .08); await page.mouse.up();
  const stopped = await fill(0); await page.waitForTimeout(250);
  ok(await fill(0) === stopped && stopped > 0, 'Mouse release stops the flow');
  await page.mouse.down(); await waitFill(0, stopped + .04);
  await page.evaluate(() => window.dispatchEvent(new Event('blur')));
  const blurred = await fill(0); await page.waitForTimeout(200); await page.mouse.up();
  ok(await fill(0) === blurred, 'Losing window focus stops a held pour');
  await page.evaluate(() => window.dispatchEvent(new Event('focus')));

  await page.locator('[data-pour-level="2"]').click();
  await page.keyboard.down('ArrowLeft'); await waitFill(0, .69); await page.keyboard.up('ArrowLeft');
  ok(await done(0) === 'true', 'Manual level accepts the target band on release');
  await page.keyboard.down('ArrowRight'); await waitFill(1, .9); await page.keyboard.up('ArrowRight');
  ok(await done(1) === 'false' && (await page.locator('#pour-status').innerText()).includes('sok'), 'Excess water is explained and remains retryable');
  await page.locator('#pour-empty').click();
  ok(await fill(1) === 0 && await done(0) === 'true', 'Emptying retries one glass and preserves the finished friend');
  await page.locator('[data-pour-level="3"]').click();
  const targetLines = await page.locator('.pour-target').evaluateAll(nodes => nodes.map(node => node.getAttribute('d')));
  ok(targetLines[0] !== targetLines[1], 'Advanced level visibly shows two different target heights');
  await page.reload(); await enter();
  ok(await page.locator('[data-pour-level="3"]').getAttribute('aria-pressed') === 'true', 'Difficulty survives reload');

  await page.locator('[data-pour-level="1"]').click();
  await page.evaluate(() => { window.DeviceOrientationEvent.requestPermission = async () => 'granted'; });
  await page.locator('#pour-tilt').click(); await sensor(45, 11);
  ok(await fill(0) === 0 && await fill(1) === 0, 'Comfortable starting posture calibrates without pouring');
  await sensor(45, -9, 600);
  ok(await fill(0) > .03 && await fill(1) === 0, 'Relative left tilt pours for Maci');
  await sensor(45, 31, 400);
  ok(await fill(1) === 0, 'Switching sides requires returning to neutral');
  await sensor(45, 11, 200); await sensor(45, 31, 500);
  ok(await fill(1) > .02, 'Neutral then right tilt pours for Nyuszi');
  await page.waitForFunction(() => document.querySelector('#pour-buttons').getAttribute('aria-pressed') === 'true');
  ok((await page.locator('#pour-sensor-note').innerText()).includes('mozgásadat'), 'Missing fresh sensor data stops motion control and offers buttons');

  await page.evaluate(() => { window.DeviceOrientationEvent.requestPermission = async () => 'denied'; });
  await page.locator('#pour-tilt').click();
  ok(await page.locator('#pour-buttons').getAttribute('aria-pressed') === 'true' && (await page.locator('#pour-sensor-note').innerText()).includes('engedélyt'), 'Denied permission leaves the game playable');
  await page.evaluate(() => { window.DeviceOrientationEvent.requestPermission = () => new Promise(resolve => { window.resolvePourPermission = resolve; }); });
  await page.locator('#pour-tilt').click(); await page.locator('#home-button').click();
  await page.evaluate(() => window.resolvePourPermission('granted'));
  ok(await page.locator('#home').isVisible(), 'A late sensor permission cannot restart a game after leaving');
  await enter();
  await page.keyboard.down('ArrowLeft'); await waitFill(0, .05); await page.locator('#home-button').click(); await page.keyboard.up('ArrowLeft');
  const departed = await fill(0); await page.waitForTimeout(200);
  ok(await fill(0) === departed, 'Leaving a game cancels the animation and all held controls');
  await enter();

  for (const [width, height] of [[375,667],[430,740],[430,932],[932,350],[932,430],[834,1194],[1194,834],[1440,900]]) {
    await page.setViewportSize({ width, height });
    const layout = await page.evaluate(() => ({
      fits: document.documentElement.scrollWidth <= innerWidth && document.documentElement.scrollHeight <= innerHeight,
      small: [...document.querySelectorAll('#pour button')].some(button => { const r = button.getBoundingClientRect(); return r.width < 44 || r.height < 44; }),
    }));
    ok(layout.fits && !layout.small, `${width}×${height}: game fits and every control is at least 44px`);
  }
  await page.setViewportSize({ width:430, height:932 });
  await page.screenshot({ path:'output/playwright/pour-phone.png', fullPage:true });
  await page.keyboard.down('ArrowLeft'); await waitFill(0, .3);
  await page.screenshot({ path:'output/playwright/pour-flow.png', fullPage:true }); await page.keyboard.up('ArrowLeft');
  await page.setViewportSize({ width:932, height:350 });
  await page.screenshot({ path:'output/playwright/pour-landscape.png', fullPage:true });
  await page.setViewportSize({ width:1440, height:900 });
  await page.screenshot({ path:'output/playwright/pour-desktop.png', fullPage:true });
  await page.emulateMedia({ reducedMotion:'reduce' });
  ok(await page.locator('.pour-stream').evaluate(node => getComputedStyle(node).animationName) === 'none', 'Reduced motion keeps the water state and removes ornamental animation');

  await page.waitForFunction(() => document.querySelector('#offline-status').textContent.startsWith('Letöltve.'));
  await page.context().setOffline(true); await page.reload(); await enter();
  await page.keyboard.down('ArrowLeft'); await waitFill(0, .06); await page.keyboard.up('ArrowLeft');
  ok(await fill(0) > 0, 'An offline reload retains the game, graphics and controls');
  ok(await page.evaluate(async () => (await (await caches.match(new URL('audio/voice/pour_tilt.mp3', location.href))).arrayBuffer()).byteLength > 1000), 'New Hungarian voice clips are cached offline');
  await page.context().setOffline(false);
  ok(errors.length === 0, `No browser script errors: ${errors.join(', ')}`);
  return { count: checks.length, checks };
}
