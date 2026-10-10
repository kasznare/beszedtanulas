// Run via playwright-cli run-code --filename in a disposable headless session.
async page => {
  const checks=[],errors=[],context=page.context();
  const ok=(value,message)=>{if(!value)throw Error(message);checks.push(message);};
  const url=page.url();
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
  await page.waitForFunction(()=>navigator.serviceWorker.controller,{timeout:60000});
  const open=async()=>{
    await page.locator('[data-open="play-menu"]').click();
    await page.locator('[data-open="audiobooks"]').click();
    await page.waitForFunction(()=>document.querySelector('#audiobooks')?.dataset.phase==='ready');
  };
  const current=()=>page.evaluate(()=>storyQA.audios.findLast(audio=>audio.src.includes('/audio/audiobooks/')||audio.src.startsWith('blob:'))?.currentTime);
  const seek=async seconds=>page.locator('#story-seek').evaluate((element,value)=>{element.value=value;element.dispatchEvent(new Event('input',{bubbles:true}));},seconds);
  await open();
  ok(await page.locator('.story-card[data-story]').count()===12,'All twelve stories are available in Mesék és Maci → Mesetár');
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
  ok(await current()>=pausedAt,'Resume continues the same recording');
  await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'));});
  ok(await page.evaluate(()=>document.querySelector('#audiobooks').dataset.phase==='playing'),'Hiding the document does not interrupt a listening session');
  await page.evaluate(()=>{delete document.hidden;document.dispatchEvent(new Event('visibilitychange'));});
  await page.locator('#story-toggle').click();
  await page.locator('#story-download').click();await page.waitForFunction(()=>document.querySelector('#story-download').textContent.includes('Letöltve'));
  ok((await page.locator('#story-offline').innerText()).includes('internet nélkül'),'A verified story can be downloaded separately');
  await page.locator('[data-story="story-02"]').click();await page.waitForFunction(()=>document.querySelector('#audiobooks').dataset.phase==='ready');
  ok(await page.evaluate(()=>storyQA.audios.filter(a=>a.src.includes('story-01')).every(a=>a.paused)),'Choosing another story stops the old audio');
  await page.locator('#story-toggle').click();await page.waitForFunction(()=>document.querySelector('#audiobooks').dataset.phase==='playing');
  await page.locator('#back-button').click();ok(await page.locator('#play-menu').isVisible(),'Back returns to the stories menu');
  ok(await page.evaluate(()=>storyQA.audios.every(a=>a.paused)),'Leaving the library stops playback');
  await page.locator('[data-open="audiobooks"]').click();await page.waitForFunction(()=>document.querySelector('#audiobooks').dataset.phase==='ready');
  ok((await page.locator('#story-title').innerText()).includes('munkagépek'),'The last selected story is restored');
  await page.locator('[data-story="story-01"]').click();await page.waitForFunction(()=>!document.querySelector('#story-seek').disabled);
  ok(await current()>=124,'The first story retains its own bookmark');
  await page.reload();
  await open();await page.waitForFunction(()=>!document.querySelector('#story-seek').disabled);
  ok(await current()>=124,'A reload restores the bookmark without starting playback');
  ok(await page.evaluate(()=>storyQA.audios.every(a=>a.paused)),'Reloading and reopening does not autoplay the story');
  await context.setOffline(true);await page.reload();
  await open();await page.waitForFunction(()=>!document.querySelector('#story-seek').disabled);
  await page.locator('#story-toggle').click();await page.waitForFunction(()=>document.querySelector('#audiobooks').dataset.phase==='playing');
  ok(await page.evaluate(()=>storyQA.audios.some(a=>a.src.startsWith('blob:')&&!a.paused)),'The downloaded MP3 plays with the network disconnected');
  await page.locator('#story-toggle').click();await page.locator('[data-story="story-02"]').click();
  await page.waitForFunction(()=>['ready','error'].includes(document.querySelector('#audiobooks').dataset.phase));
  await page.locator('#story-toggle').click();await page.waitForFunction(()=>document.querySelector('#audiobooks').dataset.phase==='error');
  ok((await page.locator('#story-status').innerText()).includes('próbáld újra'),'An unsaved offline story shows a retry message');
  ok(await page.evaluate(()=>storyQA.browserSpeech===0),'There is no dynamic speech fallback for story playback');
  await context.setOffline(false);await page.locator('#story-toggle').click();
  await page.waitForFunction(()=>document.querySelector('#audiobooks').dataset.phase==='playing');
  ok(true,'Retry starts the fixed recording when the network returns');await page.locator('#story-toggle').click();
  // SW-owned network requests bypass page.route; inject only the download failure.
  await page.evaluate(()=>{window.storyQAFetch=fetch;window.fetch=(input,init)=>String(input).includes('/audio/audiobooks/story-02.mp3')?Promise.resolve(new Response('corrupt',{status:200})):storyQAFetch(input,init);});
  await page.locator('#story-download').click();await page.waitForFunction(()=>document.querySelector('#story-offline').textContent.includes('nem sikerült'));
  ok(!(await page.locator('#story-download').isDisabled()),'A corrupt download is not marked saved and remains retryable');
  await page.evaluate(()=>{window.fetch=storyQAFetch;delete window.storyQAFetch;});await page.locator('#story-download').click();
  await page.waitForFunction(()=>document.querySelector('#story-download').textContent.includes('Letöltve'));ok(true,'Retry stores the full verified story');
  await page.locator('#story-restart').click();await page.waitForFunction(()=>document.querySelector('#audiobooks').dataset.phase==='playing');
  ok(await current()<3,'Restart begins at the start of the story');await page.locator('#story-toggle').click();
  await page.locator('#story-transcript summary').click();ok((await page.locator('#story-text').innerText()).length>4000,'The original story text can also be read');await page.locator('#story-transcript summary').click();
  for(const [width,height] of [[375,667],[932,350],[834,1194],[1194,834]]){
    await page.setViewportSize({width,height});
    ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),`No horizontal overflow at ${width}×${height}`);
    ok(await page.locator('#audiobooks button').evaluateAll(buttons=>buttons.every(button=>button.getBoundingClientRect().height>=44)),`Touch targets are at least 44px at ${width}×${height}`);
    if(width===375||width===834)await page.screenshot({path:`output/playwright/audiobooks-${width}-${context.browser().browserType().name()}.png`,fullPage:true});
  }
  ok(errors.length===0,'No application JavaScript errors');
  return {checks:checks.length,passed:checks,errors};
}
