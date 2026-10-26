// Run with playwright-cli run-code --filename in an isolated local browser session.
// Inject one rejected native play attempt; each retry must then play the real MP3.
async page => {
  if (new URL(page.url()).hostname !== '127.0.0.1') throw Error('Use a disposable local QA session');
  const context = await page.context().browser().newContext({ viewport: { width: 768, height: 900 }, hasTouch: true, isMobile: true, serviceWorkers: 'block' });
  const checks = [], errors = [];
  const ok = (value, label) => { if (!value) throw Error(label); checks.push(label); };
  try {
    const p = await context.newPage();
    p.on('pageerror', error => errors.push(error.message));
    await p.route('https://cdn.jsdelivr.net/**', route => route.fulfill({ contentType: 'text/javascript', body: '' }));
    await p.addInitScript(() => {
      localStorage.setItem('speech_game_progress_v1', JSON.stringify({ settings: { spokenGuidance: false }, supabase: { syncPaused: true } }));
      const Original = Audio;
      window.recoveryQA = { audios: [], nextError: '', attempts: [], browserSpeech: 0, narration: [] };
      window.Audio = function (...args) { const audio = new Original(...args); recoveryQA.audios.push(audio); return audio; };
      window.Audio.prototype = Original.prototype;
      document.addEventListener('narrationstart', event => recoveryQA.narration.push(event.detail));
      const play = HTMLMediaElement.prototype.play;
      HTMLMediaElement.prototype.play = function (...args) {
        recoveryQA.attempts.push(this.src);
        if (recoveryQA.nextError) { const name = recoveryQA.nextError; recoveryQA.nextError = ''; return Promise.reject(new DOMException('Controlled browser rejection', name)); }
        return play.apply(this, args);
      };
      if (window.speechSynthesis) { const speak = speechSynthesis.speak.bind(speechSynthesis); speechSynthesis.speak = (...args) => { recoveryQA.browserSpeech++; return speak(...args); }; }
    });
    await p.goto(new URL('/', page.url()).href);
    await p.locator('#home [data-open="audiobooks"]').click();
    await p.waitForFunction(() => document.querySelector('#audiobooks').dataset.phase === 'ready');
    await p.locator('.story-card[data-story="story-01"]').click();
    await p.waitForFunction(() => document.querySelector('#audiobooks').dataset.phase === 'ready');
    for (const [name, kind] of [['NotAllowedError', 'not-allowed'], ['NotSupportedError', 'unsupported']]) {
      await p.evaluate(name => { recoveryQA.nextError = name; }, name);
      await p.locator('#story-toggle').click();
      await p.waitForFunction(kind => document.querySelector('#audiobooks').dataset.errorKind === kind, kind);
      const before = await p.evaluate(() => recoveryQA.attempts.at(-1));
      const message = await p.locator('#story-status').innerText();
      ok(!message.includes('internetet'), `${kind} does not blame the internet`);
      if (kind === 'not-allowed') ok(message.includes('koppintást'), 'A gesture rejection asks for a new tap');
      await p.locator('#story-toggle').click();
      await p.waitForFunction(() => document.querySelector('#audiobooks').dataset.phase === 'playing' && recoveryQA.audios.some(audio => !audio.paused && audio.currentTime > 0), undefined, { timeout: 30000 });
      const after = await p.evaluate(() => recoveryQA.attempts.at(-1));
      ok(kind === 'not-allowed' ? after === before : after.includes('?playback='), `${kind} retry uses the expected source and plays the real recording`);
      ok(await p.locator('#audiobooks').getAttribute('data-error-kind') === '', 'Successful retry clears the error classification');
      await p.locator('#story-toggle').click();
    }
    await p.locator('#story-toggle').click();
    await p.waitForFunction(() => document.querySelector('#audiobooks').dataset.phase === 'playing');
    await p.evaluate(() => { Object.defineProperty(document, 'hidden', { configurable: true, value: true }); document.dispatchEvent(new Event('visibilitychange')); });
    ok(await p.evaluate(() => document.querySelector('#audiobooks').dataset.phase === 'playing' && recoveryQA.audios.some(audio => !audio.paused)), 'Inactive listening game does not pause Mesetár when hidden');
    await p.evaluate(() => { delete document.hidden; document.dispatchEvent(new Event('visibilitychange')); });
    await p.locator('#home-button').click();
    await p.locator('#home [data-open="picture-menu"]').click();
    await p.locator('#picture-menu [data-open="listening-game"]').click();
    await p.evaluate(() => { recoveryQA.narration = []; });
    await p.locator('#help-button').click();
    await p.waitForFunction(() => recoveryQA.narration.length > 0);
    await p.evaluate(() => { Object.defineProperty(document, 'hidden', { configurable: true, value: true }); document.dispatchEvent(new Event('visibilitychange')); });
    ok(await p.locator('#listening-game .is-narrated').count() === 0, 'The active listening game still cancels its own narration when hidden');
    await p.evaluate(() => { delete document.hidden; document.dispatchEvent(new Event('visibilitychange')); });
    ok(await p.evaluate(() => recoveryQA.browserSpeech === 0), 'Recovery never uses browser speech synthesis');
    ok(!errors.length, `No browser errors: ${errors.join('; ')}`);
    return { count: checks.length, checks, engine: context.browser().browserType().name() };
  } finally { await context.close(); }
}
