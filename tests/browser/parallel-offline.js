// Dedicated disposable browser only. Requires the current offline package to finish installing.
async page => {
  const checks=[],ok=(value,message)=>{if(!value)throw Error(message);checks.push(message)};
  await page.context().setOffline(false);
  await page.waitForFunction(()=>!!navigator.serviceWorker.controller);
  await page.waitForFunction(async()=>{
    for(const name of await caches.keys()){
      const files=(await(await caches.open(name)).keys()).map(r=>r.url);
      if(files.some(f=>f.endsWith('/workshop-game.js'))&&files.filter(f=>/\/workshop_.*\.mp3$/.test(f)).length===50)return true;
    }
    return false;
  });
  const files=await page.evaluate(async()=>{
    for(const name of await caches.keys()){
      const urls=(await(await caches.open(name)).keys()).map(r=>r.url);
      if(urls.some(f=>f.endsWith('/workshop-game.js')))return urls;
    }
  });
  ok(files.filter(f=>/\/memory_.*\.mp3$/.test(f)).length===4,'All memory sounds are cached');
  ok(files.filter(f=>/\/workshop_.*\.mp3$/.test(f)).length===50,'All 50 workshop sounds are cached');
  const saved=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('speech_game_progress_v1')));
  const enter=async screen=>{if(await page.locator('#home-button').isVisible())await page.locator('#home-button').click();const group=await page.evaluate(async screen=>(await import('./navigation.js')).parentScreen(screen),screen);await page.locator(`#home [data-open="${group}"]`).click();await page.locator(`#${group} [data-open="${screen}"]`).click();};
  await page.context().setOffline(true);
  try{
    await page.reload();await enter('workshop');
    await page.locator('button[data-level="3"]').click();
    for(const kind of ['sort','pattern','balance']){
      await page.locator(`[data-game="${kind}"]`).click();
      if(await page.locator('#ws-next').count())await page.locator('#ws-next').click();
      ok(await page.locator('#ws-work').isVisible(),`${kind}: hardest task opens offline`);
      await page.locator('#ws-hint').click();
      if(kind==='balance'){
        const before=(await saved()).rewards,rods=await page.evaluate(async()=>{const d=await import('./workshop-data.js'),s=JSON.parse(localStorage.getItem('speech_game_progress_v1')).workshop.sessions.balance[2];return d.workshopBalanceSolutions(d.generateWorkshopTask('balance',3,s.seed))[0];});
        for(const rod of rods)await page.locator(`[data-add="${rod}"]`).click();await page.locator('#ws-check').click();
        ok((await saved()).rewards===before+1,'A full three-rod balance task completes offline');
      }
      await page.locator('#ws-back').click();
    }
    await enter('memory');ok(await page.locator('[data-card]').count()>=4,'Memory opens offline');await page.locator('[data-card]').first().click();
    for(const clip of ['memory_start','workshop_balance_3']){
      const duration=await page.evaluate(async id=>{const context=new AudioContext();try{return(await context.decodeAudioData(await(await fetch(`./audio/voice/${id}.mp3`)).arrayBuffer())).duration;}finally{await context.close();}},clip);
      ok(duration>1,`${clip}: audio decodes offline`);
    }
    await enter('furfangliget');await page.locator('[data-game="machine"]').click();ok(await page.locator('#logic-work').isVisible(),'Enhanced machine opens offline');
    await enter('meseliget');ok(await page.locator('#meadow-start').isVisible(),'Enhanced picnic map opens offline');
  }finally{await page.context().setOffline(false);}
  return{count:checks.length,checks,cacheFiles:files.length};
}
