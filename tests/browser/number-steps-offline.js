// Fresh isolated profile: install the real service worker, then reload and play fully offline.
async page => {
  const context = await page.context().browser().newContext({ viewport: { width: 768, height: 900 }, hasTouch: true, isMobile: true });
  const checks = [];
  let stage = 'loading the page';
  const ok = (condition, label) => { if (!condition) throw Error(label); checks.push(label); };
  try {
    const p = await context.newPage(), errors = [];
    p.on('pageerror', error => errors.push(error.message));
    await p.route('https://cdn.jsdelivr.net/**', route => route.fulfill({ contentType: 'text/javascript', body: '' }));
    await p.addInitScript(() => {
      localStorage.setItem('speech_game_progress_v1', JSON.stringify({ settings: { spokenGuidance: false }, supabase: { syncPaused: true } }));
      window.stepsOffline = { starts: [], ends: [], sources: [], tts: 0 };
      document.addEventListener('narrationstart', event => window.stepsOffline.starts.push(event.detail.id));
      document.addEventListener('narrationend', event => window.stepsOffline.ends.push(event.detail));
      if (window.AudioBufferSourceNode) {
        const start = AudioBufferSourceNode.prototype.start;
        AudioBufferSourceNode.prototype.start = function (...args) {
          const played = { duration: this.buffer?.duration || 0, started: performance.now(), ended: null };
          window.stepsOffline.sources.push(played);
          this.addEventListener('ended', () => { played.ended = performance.now(); });
          return start.apply(this, args);
        };
      }
      if (window.speechSynthesis) {
        const speak = speechSynthesis.speak.bind(speechSynthesis);
        speechSynthesis.speak = function (...args) { window.stepsOffline.tts++; return speak(...args); };
      }
    });
    await p.goto(new URL('/', page.url()).href);
    stage = 'installing the service worker';
    await p.waitForFunction(() => document.querySelector('#offline-status')?.textContent.startsWith('Letöltve.'), undefined, { timeout: 120000 });
    await p.waitForFunction(() => Boolean(navigator.serviceWorker.controller), undefined, { timeout: 30000 });
    stage = 'reading cached assets';
    const assets = await p.evaluate(async () => {
      const paths = ['number-steps-game.js', 'number-steps.css', 'play-layout.css', 'audio/voice/number_1.mp3', 'audio/voice/number_2.mp3', 'audio/voice/number_3.mp3'];
      return Promise.all(paths.map(async path => {
        const response = await caches.match(new URL(path, location.href).href);
        return { path, bytes: response ? (await response.arrayBuffer()).byteLength : 0 };
      }));
    });
    ok(assets.every(asset => asset.bytes > 0), `Fresh service-worker cache contains module, layout and number audio: ${JSON.stringify(assets)}`);
    stage = 'reloading offline';
    await context.setOffline(true);
    await p.reload();
    ok(await p.evaluate(() => Boolean(navigator.serviceWorker.controller)), 'Offline reload is controlled by the service worker');
    await p.locator('#home [data-open="number-menu"]').click();
    await p.locator('#number-menu [data-open="number-steps"]').click();
    stage = 'playing offline';
    for (const expected of [1, 2, 3]) {
      await p.locator('#number-steps-advance').click();
      await p.waitForFunction(() => document.querySelector('#number-steps').dataset.busy === 'false', undefined, { timeout: 15000 });
      ok(await p.locator('#number-steps').getAttribute('data-step') === String(expected), `Offline step ${expected} completes`);
    }
    const audio = await p.evaluate(() => window.stepsOffline);
    ok(JSON.stringify(audio.starts.filter(id => /^number_[123]$/.test(id))) === JSON.stringify(['number_1', 'number_2', 'number_3']), 'Offline prerecorded narrations start in order');
    const complete = audio.sources.filter(source => source.duration > .2 && source.ended !== null
      && source.ended - source.started >= source.duration * 1000 - 120);
    ok(complete.length >= 3, 'All three offline number recordings play to the end');
    ok(audio.tts === 0, 'Offline play never falls back to browser speech synthesis');
    ok(!errors.length, `No uncaught errors offline: ${errors.join('; ')}`);
    return checks;
  } catch (error) {
    throw Error(`${stage}: ${error.message}; passed: ${checks.join(' | ')}`);
  } finally { await context.setOffline(false); await context.close(); }
}
