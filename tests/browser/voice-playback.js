// Run with playwright-cli run-code --filename in a fresh, disposable browser session.
// This clears only that session’s local test data; never use a personal browser.
async page => {
  const checks = [], ok = (value, message) => { if (!value) throw Error(message); checks.push(message); };
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  await page.route('https://cdn.jsdelivr.net/**', r => r.fulfill({contentType:'text/javascript',body:''}));
  await page.evaluate(async () => { localStorage.clear(); for (const r of await navigator.serviceWorker.getRegistrations()) await r.unregister(); for (const k of await caches.keys()) await caches.delete(k); });
  await page.addInitScript(() => {
    window.voiceQA = {played:[], fetched:[], fallback:[]};
    const originalFetch = window.fetch;
    window.fetch = async (...args) => { if (String(args[0]).includes('audio/voice/')) voiceQA.fetched.push(String(args[0])); return originalFetch(...args); };
    const start = AudioBufferSourceNode.prototype.start;
    AudioBufferSourceNode.prototype.start = function(...args) {
      const item = { duration:this.buffer.duration, started:performance.now(), ended:null };
      voiceQA.played.push(item);
      this.addEventListener('ended', () => item.ended = performance.now());
      return start.apply(this,args);
    };
    const speak = speechSynthesis.speak.bind(speechSynthesis);
    speechSynthesis.speak = utterance => { voiceQA.fallback.push(utterance.text); speak(utterance); };
  });
  const url=page.url(); await page.goto('about:blank'); await page.goto(url);
  await page.waitForFunction(() => document.querySelector('#offline-status').textContent.startsWith('Letöltve.'));
  await page.locator('#parent-button').click();
  const n=(await page.locator('#parent-gate-question').innerText()).match(/\d+/g).map(Number);
  await page.locator('#parent-gate-answers button').filter({hasText:new RegExp(`^${n[0]+n[1]}$`)}).click();
  await page.locator('#machine-level').selectOption('2');
  await page.locator('#home-button').click();
  await page.locator('#home [data-open="play-menu"]').click();
  await page.locator('#play-menu [data-open="furfangliget"]').click();
  await page.locator('[data-game="machine"]').click();
  await page.waitForFunction(() => voiceQA.played.some(a => a.duration > 13));
  await page.waitForFunction(() => voiceQA.played.some(a => a.duration > 13 && a.ended), undefined, {timeout:20000});
  const played = await page.evaluate(() => voiceQA.played.find(a=>a.duration>13 && a.ended));
  ok(played.ended-played.started > played.duration*1000-500,'Long machine guide plays completely past 12 seconds');
  ok(await page.locator('.logic-heading p').innerText()==='Figyeld meg, rakd össze, majd számolj!','Machine instruction uses simpler wording');
  await page.locator('#logic-repeat').click();
  await page.waitForFunction(() => voiceQA.played.at(-1)?.duration>13 && !voiceQA.played.at(-1).ended);
  await page.locator('#home-button').click();
  await page.waitForFunction(() => voiceQA.played.filter(a=>a.duration>13).at(-1)?.ended);
  const interrupted = await page.evaluate(() => voiceQA.played.filter(a=>a.duration>13).at(-1));
  ok(interrupted.ended-interrupted.started<2000,'Leaving the game promptly cancels long audio');
  await page.locator('#home [data-open="number-menu"]').click();
  await page.locator('#number-menu [data-mode="quiz"]').click();
  await page.waitForFunction(() => voiceQA.fetched.some(f=>f.includes('/question_')));
  const prompt = await page.locator('#number-question').innerText();
  ok(/^Ezen a képen .+ van\. Keresd meg!$/.test(prompt),'Quantity prompt is a statement');
  const quantity = prompt.replace('Ezen a képen ','').replace(' van. Keresd meg!','');
  await page.getByRole('button',{name:quantity,exact:true}).click();
  ok(await page.locator('#number-quiz-next').isEnabled(),'Quantity answer still works');
  await page.locator('#number-quiz-next').click();
  ok(await page.locator('#number-question').innerText()!==prompt,'Next task changes the quantity');
  for(const size of [{width:375,height:667},{width:932,height:350},{width:834,height:1194}]) {
    await page.setViewportSize(size);
    const layout = await page.evaluate(() => {
      const heading=document.querySelector('#number-question').getBoundingClientRect();
      const button=document.querySelector('#number-question-play').getBoundingClientRect();
      return {overflow:document.documentElement.scrollWidth>innerWidth,overlap:heading.right>button.left,small:button.width<44||button.height<44};
    });
    ok(!layout.overflow&&!layout.overlap&&!layout.small,`Quantity statement fits ${size.width}x${size.height} with usable replay button`);
  }
  await page.setViewportSize({width:375,height:667});
  await page.screenshot({path:'output/playwright/voice-quantity-phone.png',fullPage:false});
  ok((await page.evaluate(()=>voiceQA.fallback)).length===0,'Recorded MP3s play without browser speech fallback');
  await page.context().setOffline(true); await page.reload();
  await page.locator('#home [data-open="number-menu"]').click();
  await page.locator('#number-menu [data-mode="quiz"]').click();
  await page.waitForFunction(()=>voiceQA.fetched.some(f=>f.includes('/question_'))&&voiceQA.played.length>0);
  ok((await page.locator('#number-question').innerText()).startsWith('Ezen a képen '),'Updated quantity prompt and audio work offline');
  const all=await page.evaluate(async()=>{
    const {VOICE_CLIPS}=await import('./voice-library.js');
    return {total:Object.keys(VOICE_CLIPS).length, cached:(await Promise.all(Object.values(VOICE_CLIPS).map(c=>caches.match(new URL(c.file,location.href))))).filter(Boolean).length,questions:Object.values(VOICE_CLIPS).filter(c=>c.text.includes('?')).length};
  });
  ok(all.total===256&&all.cached===256&&all.questions===0,'All 256 updated voices cached, no spoken questions remain');
  ok(errors.length===0,'No browser errors');
  await page.context().setOffline(false);
  return {count:checks.length,checks,longAudio:played};
}
