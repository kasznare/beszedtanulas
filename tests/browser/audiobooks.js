// Run via playwright-cli run-code --filename in a disposable headless session.
async page => {
  const checks=[],errors=[],context=page.context();
  const ok=(value,message)=>{if(!value)throw Error(message);checks.push(message);};
  const url=page.url();
  try {
  await context.setOffline(false);
  await page.route('https://cdn.jsdelivr.net/**',route=>route.fulfill({contentType:'text/javascript',body:''}));
  // This test is restricted to a disposable local session, never personal progress.
  if (new URL(url).hostname !== '127.0.0.1') throw Error('Use a disposable local QA session');
  await page.evaluate(async()=>{localStorage.clear();for(const registration of await navigator.serviceWorker.getRegistrations())await registration.unregister();for(const key of await caches.keys())await caches.delete(key);});
  await page.addInitScript(()=>{
    const OriginalAudio=window.Audio;
    window.storyQA={audios:[],browserSpeech:0};
    window.Audio=function(...args){const element=new OriginalAudio(...args);storyQA.audios.push(element);return element;};
    window.Audio.prototype=OriginalAudio.prototype;
    const speak=window.speechSynthesis?.speak.bind(window.speechSynthesis);
    if(speak)window.speechSynthesis.speak=(...args)=>{storyQA.browserSpeech++;return speak(...args);};
  });
  page.on('pageerror',error=>errors.push(error.message));
  await page.goto(url);
  await page.evaluate(()=>navigator.serviceWorker.ready);
  await page.waitForFunction(()=>navigator.serviceWorker.controller,undefined,{timeout:120000});
  const open=async()=>{
    await page.locator('[data-open="audiobooks"]').click();
    await page.waitForFunction(()=>document.querySelector('#audiobooks')?.dataset.phase==='ready');
  };
  const choose=async id=>{
    if(await page.locator('#audiobooks').getAttribute('data-view')==='player')await page.locator('#back-button').click();
    await page.locator(`.story-card[data-story="${id}"]`).click();
  };
  const current=()=>page.evaluate(()=>storyQA.audios.findLast(audio=>audio.src.includes('/audio/audiobooks/')||audio.src.startsWith('blob:'))?.currentTime);
  const seek=async seconds=>page.locator('#story-seek').evaluate((element,value)=>{element.value=value;element.dispatchEvent(new Event('input',{bubbles:true}));},seconds);
  await open();
  const publishedCount = await page.evaluate(async () => (await (await fetch('/content/stories/catalog.json')).json()).stories.length);
  ok(await page.locator('.story-card[data-story]').count()===publishedCount && publishedCount>=22,'All public recordings and the original twenty-two are available in Mesetár');
  await page.locator('#story-toggle').click();
  await page.waitForFunction(()=>document.querySelector('#audiobooks').dataset.phase==='playing');
  await page.waitForFunction(()=>!document.querySelector('#story-seek').disabled);
  await page.waitForFunction(()=>storyQA.audios.some(a=>a.src.includes('/audio/audiobooks/')&&!a.paused&&a.currentTime>0));
  ok(await current()>0,'The real fixed MP3 starts playing');
  await seek(125);await page.waitForFunction(()=>storyQA.audios.findLast(a=>a.src.includes('/audio/audiobooks/')).currentTime>=125);
  ok((await page.locator('#story-elapsed').innerText()).startsWith('2:'),'Playback and timeline work after the old one-minute limit');
  await page.locator('#story-toggle').click();const pausedAt=await current();
  await page.waitForFunction(()=>document.querySelector('#audiobooks').dataset.phase==='paused');
  await page.waitForTimeout(250);ok(Math.abs(await current()-pausedAt)<.2,'Pause holds the actual audio position');
  await page.locator('#story-toggle').click();await page.waitForFunction(()=>document.querySelector('#audiobooks').dataset.phase==='playing');
  await page.waitForFunction(position=>storyQA.audios.findLast(a=>a.src.includes('/audio/audiobooks/')||a.src.startsWith('blob:'))?.currentTime>=position-.2,pausedAt);
  ok(await current()>=pausedAt-.2,'Resume continues the same recording within media timestamp precision');
  await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'));});
  ok(await page.evaluate(()=>document.querySelector('#audiobooks').dataset.phase==='playing'),'Hiding the document does not interrupt a listening session');
  await page.evaluate(()=>{delete document.hidden;document.dispatchEvent(new Event('visibilitychange'));});
  await page.locator('#story-toggle').click();
  await page.waitForFunction(()=>document.querySelector('#story-download').textContent.includes('Letöltve'));
  ok((await page.locator('#story-offline').innerText()).includes('internet nélkül'),'Playback automatically stores the verified story');
  await choose('story-02');await page.waitForFunction(()=>document.querySelector('#audiobooks').dataset.phase==='ready');
  ok(await page.evaluate(()=>storyQA.audios.filter(a=>a.src.includes('story-01')).every(a=>a.paused)),'Choosing another story stops the old audio');
  await page.locator('#story-toggle').click();await page.waitForFunction(()=>document.querySelector('#audiobooks').dataset.phase==='playing');
  await page.locator('#home-button').click();ok(await page.locator('#home').isVisible(),'Home leaves Mesetár');
  ok(await page.evaluate(()=>storyQA.audios.every(a=>a.paused)),'Leaving the library stops playback');
  await page.locator('[data-open="audiobooks"]').click();await page.waitForFunction(()=>document.querySelector('#audiobooks').dataset.phase==='ready');
  ok((await page.locator('#story-title').innerText()).includes('munkagépek'),'The last selected story is restored');
  await choose('story-01');await page.waitForFunction(()=>!document.querySelector('#story-seek').disabled);
  await page.waitForFunction(()=>storyQA.audios.findLast(a=>a.src.includes('/audio/audiobooks/')||a.src.startsWith('blob:'))?.currentTime>=124);
  ok(await current()>=124,'The first story retains its own bookmark');
  await page.reload();
  await open();await page.waitForFunction(()=>!document.querySelector('#story-seek').disabled);
  ok(await current()>=124,'A reload restores the bookmark without starting playback');
  ok(await page.evaluate(()=>storyQA.audios.every(a=>a.paused)),'Reloading and reopening does not autoplay the story');
  await context.setOffline(true);await page.reload();
  await open();await page.waitForFunction(()=>!document.querySelector('#story-seek').disabled);
  await page.locator('#story-toggle').click();await page.waitForFunction(()=>document.querySelector('#audiobooks').dataset.phase==='playing');
  ok(await page.evaluate(()=>storyQA.audios.some(a=>a.src.startsWith('blob:')&&!a.paused)),'The downloaded MP3 plays with the network disconnected');
  await page.locator('#story-toggle').click();await choose('story-03');
  await page.waitForFunction(()=>['ready','error'].includes(document.querySelector('#audiobooks').dataset.phase));
  await page.locator('#story-toggle').click();await page.waitForFunction(()=>document.querySelector('#audiobooks').dataset.phase==='error');
  ok(/próbáld újra|Újrapróbálom/i.test(await page.locator('#story-status').innerText()),'An unsaved offline story shows a retry message');
  ok(await page.evaluate(()=>storyQA.browserSpeech===0),'There is no dynamic speech fallback for story playback');
  await context.setOffline(false);await page.locator('#story-toggle').click();
  await page.waitForFunction(()=>document.querySelector('#audiobooks').dataset.phase==='playing');
  ok(true,'Retry starts the fixed recording when the network returns');await page.locator('#story-toggle').click();
  // SW-owned network requests bypass page.route; inject only the download failure.
  await choose('story-04');
  await page.waitForFunction(()=>document.querySelector('#audiobooks').dataset.phase==='ready');
  await page.evaluate(()=>{window.storyQAFetch=fetch;window.fetch=(input,init)=>String(input).includes('/audio/audiobooks/story-04.mp3')?Promise.resolve(new Response('corrupt',{status:200})):storyQAFetch(input,init);});
  await page.locator('#story-download').click();await page.waitForFunction(()=>document.querySelector('#story-offline').textContent.includes('nem sikerült'));
  ok(!(await page.locator('#story-download').isDisabled()),'A corrupt download is not marked saved and remains retryable');
  await page.evaluate(()=>{window.fetch=storyQAFetch;delete window.storyQAFetch;});await page.locator('#story-download').click();
  await page.waitForFunction(()=>document.querySelector('#story-download').textContent.includes('Letöltve'));ok(true,'Retry stores the full verified story');
  await page.locator('#story-restart').click();await page.waitForFunction(()=>document.querySelector('#audiobooks').dataset.phase==='playing');
  ok(await current()<3,'Restart begins at the start of the story');await page.locator('#story-toggle').click();
  await page.locator('#story-transcript summary').click();ok((await page.locator('#story-text').innerText()).length>4000,'The original story text can also be read');await page.locator('#story-transcript summary').click();
  await choose('story-02');
  await page.waitForFunction(()=>!document.querySelector('#story-seek').disabled);
  await context.setOffline(true); await page.reload(); await open();
  await page.waitForFunction(()=>!document.querySelector('#story-seek').disabled);
  const mappedOfflineTime = await page.evaluate(async()=> (await import('/story-playback-timing.js')).storyAnimationTime('story-02',120.1));
  await seek(120); await page.locator('#story-toggle').click();
  await page.waitForFunction(expected=>document.querySelector('#audiobooks').dataset.phase==='playing'&&Number(document.querySelector('#story-visual').dataset.time)>expected,mappedOfflineTime);
  ok(await page.locator('#story-visual').getAttribute('data-story')==='story-02','The new shared SVG library reloads and follows the downloaded second story offline');
  await page.locator('#story-toggle').click(); await context.setOffline(false);
  await page.locator('#back-button').click();
  await page.locator('.rado-volume[data-volume="I"] summary').click();
  await page.locator('[data-rado-story="rado-i-01"]').click();
  await page.locator('#rado-play').click();
  await page.waitForFunction(()=>document.querySelector('#audiobooks').dataset.phase==='ready'&&document.querySelector('#audiobooks').dataset.view==='player');
  ok(await page.evaluate(()=>document.activeElement.id==='story-toggle'&&storyQA.audios.every(audio=>audio.paused)),'Radó selection reveals and focuses the player without asynchronous autoplay');
  await page.locator('#story-toggle').click();
  await page.waitForFunction(()=>document.querySelector('#audiobooks').dataset.phase==='playing');
  ok(true,'A direct second tap starts the selected Radó recording');
  await page.locator('#story-toggle').click();
  for(const [width,height] of [[390,844],[932,430],[768,900],[1024,680]]){
    await page.setViewportSize({width,height});
    ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),`No horizontal overflow at ${width}×${height}`);
    ok(await page.locator('#audiobooks button').evaluateAll(buttons=>buttons.filter(button=>button.getClientRects().length).every(button=>button.getBoundingClientRect().height>=44)),`Touch targets are at least 44px at ${width}×${height}`);
    await page.screenshot({path:`output/playwright/audiobooks-${width}-${context.browser().browserType().name()}.png`,fullPage:true});
  }
  ok(errors.length===0,'No application JavaScript errors');
  return {checks:checks.length,passed:checks,errors};
  } catch (error) {
    const state = await page.evaluate(() => ({ screen: document.body.dataset.screen, phase: document.querySelector('#audiobooks')?.dataset.phase, status: document.querySelector('#story-status')?.textContent, controller: Boolean(navigator.serviceWorker.controller), offline: document.querySelector('#offline-status')?.textContent }));
    throw Error(`${error.message}; after ${checks.length} checks (${checks.at(-1) || 'initialization'}); ${JSON.stringify(state)}`);
  }
}
