// Run with playwright-cli run-code --filename in a disposable named browser session.
async page => {
  const context = await page.context().browser().newContext({
    viewport: { width: 768, height: 900 }, hasTouch: true, isMobile: true,
    serviceWorkers: 'block', reducedMotion: 'reduce',
  });
  const checks = [];
  const ok = (condition, label) => { if (!condition) throw Error(label); checks.push(label); };
  try {
    const p = await context.newPage(), errors = [];
    p.on('pageerror', error => errors.push(error.message));
    await p.route('https://cdn.jsdelivr.net/**', route => route.fulfill({ contentType: 'text/javascript', body: '' }));
    await p.addInitScript(() => {
      localStorage.setItem('speech_game_progress_v1', JSON.stringify({ settings: { spokenGuidance: false }, supabase: { syncPaused: true } }));
      window.stepsAudio = { narration: [], starts: 0, stops: 0 };
      document.addEventListener('narrationstart', event => window.stepsAudio.narration.push(event.detail.id));
      if (window.AudioBufferSourceNode) for (const method of ['start', 'stop']) {
        const original = AudioBufferSourceNode.prototype[method];
        AudioBufferSourceNode.prototype[method] = function (...args) {
          window.stepsAudio[method === 'start' ? 'starts' : 'stops']++;
          return original.apply(this, args);
        };
      }
    });
    const base = new URL('/', page.url()).href;
    await p.goto(base);
    const click = selector => p.locator(selector).click();
    const enter = async () => {
      if (await p.locator('body').getAttribute('data-screen') !== 'home') await click('#home-button');
      await click('#home [data-open="number-menu"]');
      await click('#number-menu [data-open="number-steps"]');
      await p.waitForFunction(() => document.querySelector('#number-steps').dataset.busy === 'false');
    };
    const step = () => p.locator('#number-steps').getAttribute('data-step');
    const idle = () => p.waitForFunction(() => document.querySelector('#number-steps').dataset.busy === 'false', undefined, { timeout: 15000 });
    const audio = () => p.evaluate(() => structuredClone(window.stepsAudio));
    await enter();
    ok(await step() === '0', 'Entry starts at zero');
    ok(await p.locator('#screen-title').innerText() === 'Számlépcső', 'Shared title is Számlépcső');
    ok(await p.evaluate(() => document.activeElement.id) === 'screen-title', 'Entry focuses the shared title');
    await p.evaluate(() => { window.stepsAudio.narration = []; window.stepsAudio.starts = 0; });
    for (const expected of [1, 2, 3]) {
      // Same-task bursts bypass disabled-button actionability waits and model queued touch events.
      await p.locator('#number-steps-advance').evaluate(button => { for (let i = 0; i < 12; i++) button.click(); });
      ok(await step() === String(expected), `Rapid taps advance exactly once to ${expected}`);
      await idle();
      ok(await step() === String(expected), `No queued advance after narration ${expected}`);
    }
    const played = await audio();
    ok(JSON.stringify(played.narration.filter(id => /^number_[123]$/.test(id))) === JSON.stringify(['number_1', 'number_2', 'number_3']), 'Existing one/two/three narration starts once in order');
    ok(played.starts >= 3, 'Actual decoded audio sources start for the three numbers');
    ok(!(await p.locator('#round-complete').isVisible()), 'Completion keeps the scene without a round overlay');
    const beforeRepeat = await step();
    await click('#help-button'); await idle();
    ok(await step() === beforeRepeat, 'Shared sound help repeats without advancing');
    await click('#number-steps-advance'); await idle();
    ok(await step() === '0', 'Completion restart returns to zero');
    await click('#number-steps-advance');
    await click('#back-button');
    ok(await p.locator('body').getAttribute('data-screen') === 'number-menu', 'Back returns to number menu during narration');
    await enter();
    ok(await step() === '0', 'Leaving and reentering discards partial progress');
    const cancelBefore = await audio();
    await click('#number-steps-advance');
    await p.waitForFunction(value => window.stepsAudio.starts > value, cancelBefore.starts);
    await p.evaluate(() => {
      Object.defineProperty(document, 'hidden', { configurable: true, get: () => true });
      document.dispatchEvent(new Event('visibilitychange'));
    });
    await idle();
    ok((await audio()).stops > cancelBefore.stops, 'Backgrounding stops the active audio source');
    await p.evaluate(() => { delete document.hidden; document.dispatchEvent(new Event('visibilitychange')); });
    await click('#help-button'); await idle();
    ok(await step() === '1', 'Returning from background allows replay of the current number');
    await click('#number-steps-advance'); await idle();
    ok(await step() === '2', 'Reduced motion and return from background remain playable without leaving');
    // Reload clears decoded audio caches, so both playback paths face a real network failure.
    await p.route('**/audio/voice/number_*.mp3', route => route.abort('failed'));
    await p.reload(); await enter();
    await click('#number-steps-advance'); await idle();
    ok(await step() === '1', 'Unavailable audio releases the input lock');
    await click('#number-steps-advance'); await idle();
    ok(await step() === '2', 'Another step remains available after audio failure');
    ok(!errors.length, `No uncaught browser errors: ${errors.join('; ')}`);
    return checks;
  } finally { await context.close(); }
}
