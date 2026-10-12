// Full inventory + representative module playback in a disposable localhost browser.
async parent => {
  const context = await parent.context().browser().newContext();
  const page = await context.newPage(), checks = [], errors = [];
  const ok = (value, label) => { if (!value) throw Error(label); checks.push(label); };
  page.on('pageerror', error => errors.push(error.message));
  await context.route('https://cdn.jsdelivr.net/**', route => route.fulfill({contentType:'text/javascript',body:''}));
  await context.addInitScript(() => {
    window.jessaQA = {starts:[],browserSpeech:[],apiRequests:[]};
    document.addEventListener('narrationstart', event => jessaQA.starts.push(event.detail.id));
    speechSynthesis.speak = utterance => jessaQA.browserSpeech.push(utterance.text);
    const original = window.fetch;
    window.fetch = (...args) => { if (/api\.elevenlabs\.io/.test(String(args[0]))) jessaQA.apiRequests.push(String(args[0])); return original(...args); };
  });
  try {
    await page.goto(new URL('/', parent.url()).href);
    await page.waitForFunction(() => document.querySelector('#offline-status').textContent.startsWith('Letöltve.'), undefined, {timeout:60000});
    await context.setOffline(true); await page.reload();
    const before = () => page.evaluate(() => jessaQA.starts.length);
    const heard = async (start, prefix) => {
      await page.waitForFunction(({start,prefix}) => jessaQA.starts.slice(start).some(id=>id.startsWith(prefix)), {start,prefix});
      ok(true, `Offline Jessa playback starts: ${prefix}`);
    };
    const home = async () => { if (await page.locator('#home-button').isVisible()) await page.locator('#home-button').click(); };
    const enter = async name => {
      await home();
      const group = await page.evaluate(async name => (await import('./navigation.js')).parentScreen(name), name);
      await page.locator(`#home [data-open="${group}"]`).click();
      await page.locator(`#${group} [data-open="${name}"]`).click();
    };
    for (const [menu,id] of [['picture-menu','guide_menu_pictures'],['practice-menu','guide_menu_speech'],['number-menu','guide_menu_thinking'],['play-menu','guide_menu_stories'],['activity-menu','guide_menu_activity']]) {
      await home(); const start=await before(); await page.locator(`#home [data-open="${menu}"]`).click(); await heard(start,id);
    }
    for (const [screen,prefix] of [['listening-game','word_'],['teddy-game','teddy_'],['dress-game','dress_request_'],['memory','memory_start'],['puzzle','puzzle_start'],['pour','pour_start'],['chess','chess_'],['meseliget','mese_map']]) {
      const start=await before(); await enter(screen); await heard(start,prefix);
      await home(); ok(await page.locator(`#${screen} .is-narrated`).count()===0, `${screen}: navigation cancels its cues`);
    }
    await enter('furfangliget');
    for (const game of ['shop','machine','route']) {
      if (await page.locator('#logic-back').count()) await page.locator('#logic-back').click();
      const start=await before(); await page.locator(`[data-game="${game}"]`).click(); await heard(start,`logic_${game}_`);
      const hint=await before(); await page.locator('#logic-hint').click(); await heard(hint,`logic_${game}_hint`);
    }
    await enter('workshop');
    for (const game of ['sort','pattern','balance']) {
      if (await page.locator('#ws-back').count()) await page.locator('#ws-back').click();
      const start=await before(); await page.locator(`[data-game="${game}"]`).click(); await heard(start,`workshop_${game}_`);
    }
    await enter('r-practice');
    for (const game of ['hunter','post','workshop','rhyme','echo']) {
      if (await page.locator('#r-practice [data-action="hub"]').count()) await page.locator('#r-practice [data-action="hub"]').first().click();
      const start=await before(); await page.locator(`#r-practice [data-game="${game}"]`).click();
      await heard(start,`r_${game}`);
      await page.locator('#r-practice[data-phase="idle"]').waitFor({timeout:40000});
      ok(await page.evaluate(start=>jessaQA.starts.slice(start).some(id=>/^r_(word|rhyme)_/.test(id)),start), `${game}: actual practice sample finishes offline`);
    }
    await home();
    const inventory = await page.evaluate(async () => {
      const manifest=await (await fetch('./audio/voice/manifest.json')).json();
      const generated=await (await fetch('./audio/voice/generated.json')).json();
      const audioContext=new AudioContext(), failures=[];
      let cursor=0;
      const workers=Array.from({length:4},async()=>{
        while(cursor<manifest.clips.length){
          const clip=manifest.clips[cursor++],receipt=generated.clips[clip.id];
          try{
            const response=await caches.match(new URL(clip.file,location.href));
            if(!response?.ok)throw Error('not cached');
            const bytes=await response.arrayBuffer();
            const hash=[...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))].map(n=>n.toString(16).padStart(2,'0')).join('');
            if(hash!==receipt.sha256)throw Error('wrong audio hash');
            const decoded=await audioContext.decodeAudioData(bytes);
            if(Math.abs(decoded.duration-receipt.duration)>.15)throw Error('incomplete audio duration');
          }catch(error){failures.push(`${clip.id}: ${error.message}`);}
        }
      });
      await Promise.all(workers);await audioContext.close();
      return {count:manifest.clips.length,provider:manifest.provider,voice:manifest.voice_id,failures};
    });
    ok(inventory.provider==='ElevenLabs'&&inventory.voice==='yj30vwTGJxSHezdAGsv9', 'Complete offline inventory selects Jessa');
    ok(inventory.count>=472&&!inventory.failures.length, `All ${inventory.count} offline MP3s match their receipts and decode fully: ${inventory.failures.join('; ')}`);
    ok(await page.evaluate(()=>!jessaQA.browserSpeech.length&&!jessaQA.apiRequests.length), 'All module playback uses fixed audio without synthesis or paid API requests');
    ok(errors.length===0, `No browser script errors: ${errors.join('; ')}`);
    return {count:checks.length,checks};
  } finally { await context.close(); }
}
