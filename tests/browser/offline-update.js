// Disposable headless profile; requires offline-update-fixture.py on localhost:5190.
async page=>{
 const checks=[],errors=[],context=page.context(),base=new URL(page.url()).origin,ok=(value,text)=>{if(!value)throw Error(text);checks.push(text);};
 if(!/^http:\/\/localhost:519[01]$/.test(base))throw Error('Use a disposable localhost update fixture.');
 page.on('pageerror',error=>errors.push(error.message));await context.setOffline(false);await page.route('https://cdn.jsdelivr.net/**',r=>r.fulfill({contentType:'text/javascript',body:''}));
 const version=async(value,fail=[])=>{const response=await context.request.post(base+'/__qa/version',{data:{version:value,fail}});if(!response.ok())throw Error('Fixture switch failed');};
 const update=async()=>page.evaluate(async()=>{await(await navigator.serviceWorker.getRegistration()).update();});
 const waiting=()=>page.waitForFunction(async()=>{const r=await navigator.serviceWorker.getRegistration();return r?.waiting?.state==='installed';},{},{timeout:120000});
 const at=async value=>page.waitForFunction(v=>document.body.dataset.updateTest===v&&Boolean(navigator.serviceWorker.controller),value,{timeout:120000});
 const snapshot=()=>page.evaluate(async()=>{const {snapshotProgress}=await import('./progress-data.js');return snapshotProgress(JSON.parse(localStorage.getItem('speech_game_progress_v1')));});
 await version('A');await page.goto(base);await at('A');
 await page.evaluate(()=>{const saved=JSON.parse(localStorage.getItem('speech_game_progress_v1'))||{};saved.settings={...saved.settings,spokenGuidance:false};saved.supabase={...saved.supabase,syncPaused:true};saved.rewards=7;localStorage.setItem('speech_game_progress_v1',JSON.stringify(saved));});await page.reload();await at('A');
 const saved=await snapshot();
 await page.locator('#home [data-open="practice-menu"]').click();await page.locator('#practice-menu [data-open="r-practice"]').click();await page.locator('[data-game="post"]').click();
 await version('B');await update();await waiting();
 ok(await page.locator('body').getAttribute('data-update-test')==='A'&&await page.locator('body').getAttribute('data-screen')==='r-practice','Downloaded update waits while a game is open');
 await page.waitForTimeout(500);ok(await page.locator('body').getAttribute('data-update-test')==='A','Ready update does not reload a running game');
 await page.locator('#home-button').click();await at('B');ok(await page.locator('body').getAttribute('data-screen')==='home','Returning home activates and reloads the update automatically');ok(JSON.stringify(await snapshot())===JSON.stringify(saved),'Automatic update preserves saved progress');
 ok(await page.locator('#parent-gate[open]').count()===0,'Automatic update needs no parent gate');
 await page.locator('#parent-button').click();await page.locator('#parent-gate[open]').waitFor();await version('C');await update();await waiting();
 ok(await page.locator('body').getAttribute('data-update-test')==='B'&&await page.locator('#parent-gate[open]').count()===1,'An open dialog delays automatic activation');
 await page.locator('#close-parent-gate').click();await at('C');ok(true,'Closing the dialog on home applies the waiting update');
 const other=await context.newPage();await other.route('https://cdn.jsdelivr.net/**',r=>r.fulfill({contentType:'text/javascript',body:''}));await other.goto(base);await other.waitForFunction(()=>Boolean(navigator.serviceWorker.controller));
 await version('D');await update();await waiting();await page.waitForFunction(()=>document.querySelector('#home-update-status').textContent.includes('másik'));
 ok(await page.locator('body').getAttribute('data-update-test')==='C'&&await other.locator('body').getAttribute('data-update-test')==='C','A second game window blocks activation and reload');
 await other.close();await page.evaluate(()=>window.dispatchEvent(new Event('focus')));await at('D');ok(true,'Closing the other window and returning focus resumes the update');
 await version('E',['audio/voice/guide_menu_activity.mp3']);await update();await page.waitForFunction(()=>document.querySelector('#home-update-status').textContent.includes('nem sikerült'),{},{timeout:120000});
 ok(await page.locator('body').getAttribute('data-update-test')==='D','A failed asset download leaves the previous version active');
 const cached=await page.evaluate(()=>caches.keys());ok(!cached.some(key=>key.endsWith('qa-E'))&&cached.some(key=>key.endsWith('qa-D')),'An incomplete update cache is removed; the valid old cache remains');
 await context.setOffline(true);await page.reload();await at('D');ok(await page.locator('#home [data-open]').count()===5,'The old version remains usable offline after a failed update');
 ok(JSON.stringify(await snapshot())===JSON.stringify(saved),'Failed update and offline reload preserve progress');
 await context.setOffline(false);await version('E');await update();await at('E');ok(true,'A retry with complete files updates successfully');
 ok(JSON.stringify(await snapshot())===JSON.stringify(saved),'Retry also preserves progress');
 await context.setOffline(true);await page.reload();await at('E');await page.locator('#home [data-open="activity-menu"]').click();await page.locator('#back-button').click();await page.waitForFunction(()=>document.body.dataset.screen==='home');
 ok(true,'New navigation works offline after activation');await context.setOffline(false);ok(!errors.length,'No update lifecycle page errors: '+errors.join('; '));
 return{count:checks.length,checks,engine:context.browser().browserType().name()};
}
