async page => {
  const checks=[],errors=[];
  const ok=(condition,label)=>{if(!condition)throw Error(label);checks.push(label);};
  page.on('pageerror',error=>errors.push(error.message));
  await page.route('https://cdn.jsdelivr.net/**',route=>route.fulfill({contentType:'text/javascript',body:''}));
  await page.goto('http://127.0.0.1:5187/');
  await page.evaluate(async()=>{localStorage.clear();for(const r of await navigator.serviceWorker.getRegistrations())await r.unregister();for(const key of await caches.keys())await caches.delete(key);});
  await page.reload();
  const clock = await page.evaluate(async () => {
    const timing = await import('/story-playback-timing.js');
    window.storyIntegrationTiming = timing;
    return { crane: timing.storyPlaybackTime('story-01', 139) };
  });
  await page.locator('[data-open="audiobooks"]').click();
  await page.waitForFunction(()=>document.querySelector('#audiobooks').dataset.phase==='ready');
  await page.waitForFunction(()=>!document.querySelector('#story-seek').disabled);
  ok(await page.locator('#story-visual-wrap').isVisible(),'The full animation is shown with the first audiobook');
  await page.locator('#story-toggle').click();
  await page.waitForFunction(()=>document.querySelector('#audiobooks').dataset.phase==='playing');
  await page.waitForFunction(()=>Number(document.querySelector('#story-visual').dataset.time)>.2);
  ok(true,'The existing player drives the animation using actual MP3 time');
  await page.locator('#story-toggle').click();await page.waitForTimeout(80);const frozen=await page.locator('#story-visual').innerHTML();await page.waitForTimeout(200);
  ok(await page.locator('#story-visual').innerHTML()===frozen,'Pausing the audiobook freezes the stage');
  await page.locator('#story-seek').evaluate((input,time)=>{input.value=time;input.dispatchEvent(new Event('input',{bubbles:true}));},clock.crane);
  await page.waitForFunction(()=>document.querySelector('#story-visual').dataset.scene==='crane');
  ok(true,'The existing seek control updates the narrated rescue scene');
  await page.locator('[data-story="story-02"]').click();await page.waitForFunction(()=>document.querySelector('#audiobooks').dataset.phase==='ready');
  ok(await page.locator('#story-visual-wrap').isVisible() && await page.locator('#story-visual').getAttribute('data-story')==='story-02','Switching recordings loads its complete animation');
  for(let number=3;number<=12;number++){
    const id=`story-${String(number).padStart(2,'0')}`;
    await page.locator(`[data-story="${id}"]`).click();
    await page.waitForFunction(id=>document.querySelector('#story-visual').dataset.story===id&&document.querySelector('#audiobooks').dataset.phase==='ready',id);
    await page.waitForFunction(()=>!document.querySelector('#story-seek').disabled);
    const time=await page.locator('#story-seek').evaluate(input=>Math.floor(Number(input.max)*.6));
    await page.locator('#story-seek').evaluate((input,time)=>{input.value=time;input.dispatchEvent(new Event('input',{bubbles:true}));},time);
    await page.waitForFunction(({id,time})=>Math.abs(Number(document.querySelector('#story-visual').dataset.time)-storyIntegrationTiming.storyAnimationTime(id,time))<.1,{id,time});
    ok(await page.locator('#story-visual svg').count()===1,`${id}: switching and seeking through the existing audiobook player`);
  }
  await page.locator('[data-story="story-01"]').click();await page.waitForFunction(()=>!document.querySelector('#story-seek').disabled);
  await page.waitForFunction(()=>document.querySelector('#story-visual').dataset.scene==='crane');
  ok(true,'The saved audio bookmark restores the matching illustration');
  for(const width of [375,834,1280]){
    await page.setViewportSize({width,height:950});
    ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),`Mesetár has no overflow at ${width}px`);
  }
  await page.locator('#home-button').click();await page.locator('[data-open="audiobooks"]').click();
  await page.waitForFunction(()=>document.querySelector('#story-visual').dataset.scene==='crane');
  ok(true,'Leaving and reopening restores a single working animation');
  ok(errors.length===0,'No application JavaScript errors');
  return {count:checks.length,checks,errors};
}
