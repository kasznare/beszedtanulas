// Disposable headless profile; fixture on localhost:5192/5193 with --legacy.
async page=>{
 const context=page.context(),base=new URL(page.url()).origin,checks=[],errors=[];
 if(!/^http:\/\/localhost:519[23]$/.test(base))throw Error('Use the disposable --legacy fixture');
 const ok=(value,text)=>{if(!value)throw Error(text);checks.push(text);};
 await page.route('https://cdn.jsdelivr.net/**',r=>r.fulfill({contentType:'text/javascript',body:''}));page.on('pageerror',e=>errors.push(e.message));
 const version=async(value,fail=[])=>{await context.request.post(base+'/__qa/version',{data:{version:value,fail}});};
 const at=async value=>page.waitForFunction(v=>document.body.dataset.updateTest===v&&Boolean(navigator.serviceWorker.controller),value,{timeout:120000});
 const progress=()=>page.evaluate(()=>{const p=JSON.parse(localStorage.getItem('speech_game_progress_v1'));return{plays:p.plays,attempts:p.attempts,rewards:p.rewards,wordStats:p.wordStats,meadow:p.meadow,logic:p.logic,workshop:p.workshop};});
 await version('A');await page.goto(base);await at('A');
 ok(await page.locator('#home [data-open]').count()===4,'Fixture starts on the actual b009234 release');
 await page.evaluate(()=>{const p=JSON.parse(localStorage.getItem('speech_game_progress_v1'));p.plays=13;p.rewards=7;p.settings.spokenGuidance=false;p.supabase.syncPaused=true;localStorage.setItem('speech_game_progress_v1',JSON.stringify(p));});await page.reload();await at('A');const saved=await progress();
 const other=await context.newPage();await other.route('https://cdn.jsdelivr.net/**',r=>r.fulfill({contentType:'text/javascript',body:''}));await other.goto(base);await other.waitForFunction(()=>Boolean(navigator.serviceWorker.controller));
 await version('B');await page.goto(base+'/refresh.html?t=legacy');await at('B');
 ok(await page.locator('#home-refresh').isVisible(),'Legacy recovery reaches the five-group version with the refresh button');
 await other.waitForFunction(()=>document.body.dataset.updateTest==='B',{},{timeout:120000});ok(true,'Manual recovery succeeds with another legacy window still open');
 ok(JSON.stringify(await progress())===JSON.stringify(saved),'Legacy recovery preserves saved progress');ok(!page.url().includes('b009234')&&new URL(page.url()).pathname==='/', 'Recovery returns to the canonical home URL');
 for(const viewport of [{width:375,height:667},{width:932,height:350},{width:834,height:1194}]){
  await page.setViewportSize(viewport);const metrics=await page.locator('#home-refresh').evaluate(button=>{const r=button.getBoundingClientRect();return{width:r.width,height:r.height,top:r.top,bottom:r.bottom,overflow:document.documentElement.scrollWidth>innerWidth+2};});
  ok(metrics.width>=44&&metrics.height>=44&&metrics.top>=0&&metrics.bottom<=viewport.height&&!metrics.overflow,`Refresh button is visible and ≥44px at ${viewport.width}×${viewport.height}`);
 }
 await page.setViewportSize({width:390,height:844});await context.setOffline(true);await page.locator('#home-refresh').click();
 ok(new URL(page.url()).pathname==='/'&&await page.locator('#home-update-status').innerText().then(t=>t.includes('internetkapcsolat')),'Offline refresh keeps the playable home and explains the connection requirement');await context.setOffline(false);
 await version('C');await page.evaluate(async()=>{await(await navigator.serviceWorker.getRegistration()).update();});await page.waitForFunction(()=>document.querySelector('#home-update-status').textContent.includes('másik'),{},{timeout:120000});
 ok(await page.locator('body').getAttribute('data-update-test')==='B','Automatic updates still wait while another window is open');
 await page.locator('#home-refresh').click();await at('C');ok(true,'Visible home button manually applies a waiting update without parent mode');
 ok(JSON.stringify(await progress())===JSON.stringify(saved),'Manual home refresh preserves saved progress');await other.close();
 await version('D',['audio/voice/guide_menu_activity.mp3']);await page.locator('#home-refresh').click();await page.locator('#retry').waitFor({state:'visible',timeout:120000});
 ok(await page.locator('#status').innerText().then(t=>t.includes('nem sikerült')),'A failed download shows a retry instead of applying incomplete files');
 await page.locator('.actions a').click();await at('C');ok(JSON.stringify(await progress())===JSON.stringify(saved),'Failed refresh returns to the complete old game with progress intact');
 await version('D');await page.locator('#home-refresh').click();await at('D');ok(true,'A complete retry updates successfully');
 await page.locator('#home-refresh').click();await at('D');ok(true,'Refresh also returns home when the latest version is already active');
 await page.setViewportSize({width:834,height:1194});await page.screenshot({path:`output/playwright/manual-refresh-${context.browser().browserType().name()}.png`,animations:'disabled'});
 ok(!errors.length,'No recovery page errors: '+errors.join('; '));return{count:checks.length,checks,engine:context.browser().browserType().name()};
}
