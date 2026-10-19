// Run with playwright-cli run-code --filename; uses a disposable browser context.
async page => {
  const context = await page.context().browser().newContext();
  const p = await context.newPage(), checks = [];
  const ok = (value, message) => { if (!value) throw Error(message); checks.push(message); };
  let stage = 'loading the online page';
  await p.addInitScript(() => {
    window.voiceQA = { played: [], fallback: [] };
    const start = AudioBufferSourceNode.prototype.start;
    AudioBufferSourceNode.prototype.start = function (...args) {
      const item = {duration: this.buffer.duration, started: performance.now(), ended: null};
      voiceQA.played.push(item);
      this.addEventListener('ended', () => { item.ended = performance.now(); });
      return start.apply(this, args);
    };
    speechSynthesis.speak = utterance => voiceQA.fallback.push(utterance.text);
  });
  try {
    await p.goto(new URL('/', page.url()).href);
    await p.waitForFunction(() => document.querySelector('#offline-status')?.textContent.startsWith('Letöltve.'), undefined, {timeout:120000});
    stage = 'waiting for the offline service worker';
    await p.waitForFunction(() => !!navigator.serviceWorker.controller, undefined, {timeout:120000});
    stage = 'checking the voice receipt';
    const expected = await p.evaluate(async () => {
      const r = await (await fetch('/audio/voice/generated.json')).json();
      return { ...r.clips.engineering_hub, config: r.config };
    });
    ok(expected.config?.provider === 'ElevenLabs', 'intro receipt identifies ElevenLabs');
    stage = 'reading the recording offline';
    await context.setOffline(true);
    await p.reload();
    const hash = await p.evaluate(async () => {
      const bytes = await (await fetch('/audio/voice/engineering_hub.mp3')).arrayBuffer();
      return [...new Uint8Array(await crypto.subtle.digest('SHA-256', bytes))].map(b => b.toString(16).padStart(2, '0')).join('');
    });
    ok(hash === expected.sha256, 'offline cache serves the verified Jessa recording');
    stage = 'playing the cached introduction';
    await p.locator('#home [data-open="big-menu"]').click();
    await p.locator('#big-menu [data-open="engineering"]').click();
    await p.waitForFunction(duration => voiceQA.played.some(a => Math.abs(a.duration - duration) < .1 && a.ended), expected.duration);
    const result = await p.evaluate(duration => ({
      audio: voiceQA.played.find(a => Math.abs(a.duration - duration) < .1 && a.ended),
      fallback: voiceQA.fallback
    }), expected.duration);
    ok(result.audio.ended - result.audio.started > (expected.duration - .2) * 1000, 'Jessa introduction plays to the end offline');
    ok(result.fallback.length === 0, 'no browser speech fallback');
    return checks;
  } catch (error) {
    throw Error(`${stage}: ${error.message}; passed: ${checks.join(' | ')}`);
  } finally {
    await context.close();
  }
}
