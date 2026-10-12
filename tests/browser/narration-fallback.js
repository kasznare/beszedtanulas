// Isolated contexts verify HTML audio clocks and a recoverable missing MP3.
async page => {
  const checks = [], ok = (value, message) => { if (!value) throw Error(message); checks.push(message); };
  for (const mode of ['element', 'missing']) {
    const context = await page.context().browser().newContext({serviceWorkers:'block'});
    try {
      await context.route('https://cdn.jsdelivr.net/**', route => route.fulfill({contentType:'text/javascript',body:''}));
      await context.addInitScript(mode => {
        window.AudioContext = undefined; window.webkitAudioContext = undefined; window.events = []; window.browserSpeeches = [];
        for (const type of ['narrationword', 'narrationend']) document.addEventListener(type, event => events.push({type,...event.detail,parts:[...document.querySelectorAll('.is-narrated')].map(node=>node.dataset.narrationPart)}));
        speechSynthesis.speak = utterance => browserSpeeches.push(utterance.text);
        if (mode === 'missing') {
          const play = HTMLMediaElement.prototype.play;
          window.audioMissing = true;
          HTMLMediaElement.prototype.play = function(...args) { return audioMissing ? Promise.reject(Error('Test missing audio')) : play.apply(this,args); };
        }
      }, mode);
      const p = await context.newPage(); await p.goto(page.url());
      await p.locator('#home [data-open="number-menu"]').click();
      await p.locator('#number-menu [data-open="furfangliget"]').click();
      await p.locator('[data-game="machine"]').click();
      if (mode === 'element') {
        await p.locator('[data-example="0"]').click();
        const output = 'logic_n_' + await p.locator('[data-example="0"] [data-narration-part="output"] b').innerText();
        await p.waitForFunction(id => events.some(event => event.type === 'narrationend' && event.id === id), output);
        ok(await p.evaluate(() => events.some(event=>event.parts.includes('input')) && events.some(event=>event.parts.includes('output'))), 'HTML audio clock synchronizes input and output cues');
      } else {
        await p.locator('#voice-status').waitFor({state:'visible'});
        ok(await p.evaluate(() => browserSpeeches.length === 0), 'A missing factory MP3 never switches to another browser voice');
        ok(await p.locator('#furfangliget .is-narrated').count() === 0, 'Failed audio leaves no premature cues');
        await p.evaluate(() => audioMissing = false);
        await p.locator('#logic-repeat').click();
        await p.waitForFunction(() => !!document.querySelector('#furfangliget .is-narrated'));
        ok(await p.locator('#voice-status').isHidden(), 'Replay clears the error and starts the recovered local Jessa audio');
      }
      await p.locator('#home-button').click();
      ok(await p.locator('#furfangliget .is-narrated').count() === 0, `${mode}: navigation clears narration cues`);
    } finally { await context.close(); }
  }
  return {count:checks.length,checks};
}
