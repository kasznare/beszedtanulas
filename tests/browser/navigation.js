// Run only in a disposable HEADLESS playwright-cli profile.
async page => {
 const checks=[],errors=[],context=page.context(),ok=(value,text)=>{if(!value)throw Error(text);checks.push(text);};
 await context.setOffline(false);page.on('pageerror',error=>errors.push(error.message));
 await page.route('https://cdn.jsdelivr.net/**',route=>route.fulfill({contentType:'text/javascript',body:''}));
 await page.evaluate(async()=>{localStorage.clear();for(const r of await navigator.serviceWorker.getRegistrations())await r.unregister();for(const k of await caches.keys())await caches.delete(k);});
 await page.reload();
 await page.evaluate(()=>{const saved=JSON.parse(localStorage.getItem('speech_game_progress_v1'))||{};saved.settings={...saved.settings,spokenGuidance:false};saved.supabase={...saved.supabase,syncPaused:true};localStorage.setItem('speech_game_progress_v1',JSON.stringify(saved));});
 await page.reload();
 const at=async screen=>page.waitForFunction(value=>document.body.dataset.screen===value,screen),home=async()=>{if(await page.locator('body').getAttribute('data-screen')!=='home'){await page.locator('#home-button').click();await at('home');}};
 const group=async screen=>{await home();await page.locator(`#home [data-open="${screen}"]`).click();await at(screen);};
 const enter=async(groupId,screen)=>{await group(groupId);await page.locator(`#${groupId} [data-open="${screen}"]`).click();await at(screen);};
 const back=async screen=>{await page.locator('#back-button').click();await at(screen);};
 const data=await page.evaluate(async()=>{const {GROUPS}=await import('./navigation.js');return GROUPS;});
 ok(await page.locator('#home [data-open]').count()===5,'Home has five clear groups');
 const targets=[];
 for(const {screen,screens} of data){
  await group(screen);const destinations=await page.locator(`#${screen} .game-menu-card`).evaluateAll(buttons=>buttons.map(button=>button.dataset.open||'numbers'));
  ok(screens.every(value=>destinations.includes(value)),`${screen}: every assigned game is present`);targets.push(...new Set(destinations));
  for(const viewport of [{width:375,height:667},{width:932,height:350},{width:834,height:1194}]){
   await page.setViewportSize(viewport);const metrics=await page.evaluate(()=>({overflow:document.documentElement.scrollWidth>innerWidth+2,small:[...document.querySelectorAll('.app-bar button,.panel.is-active .game-menu-card')].filter(button=>button.getClientRects().length&&(button.getBoundingClientRect().width<43||button.getBoundingClientRect().height<43)).map(button=>button.getAttribute('aria-label'))}));
   ok(!metrics.overflow&&!metrics.small.length,`${screen}: ${viewport.width}×${viewport.height} fits with ≥44px controls`);
  }
  await back('home');ok(await page.locator('#back-button').isHidden(),`${screen}: back reaches home and hides there`);
 }
 ok(new Set(targets).size===targets.length,'Games have one menu location');
 for(const viewport of [{width:375,height:667},{width:932,height:350},{width:834,height:1194}]){
  await page.setViewportSize(viewport);ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2),`Home fits ${viewport.width}×${viewport.height}`);await page.screenshot({path:`output/playwright/navigation-home-${context.browser().browserType().name()}-${viewport.width}.png`,fullPage:viewport.height>400,animations:'disabled'});
 }
 await page.setViewportSize({width:390,height:844});
 for(const {screen,screens} of data){for(const game of screens.filter(value=>value!=='numbers')){
  await enter(screen,game);ok((await page.locator('#screen-kicker').innerText())===(data.find(value=>value.screen===screen).title),`${game}: header identifies its group`);
  const backLabel=await page.locator('#back-button').getAttribute('aria-label');ok(backLabel.includes(data.find(value=>value.screen===screen).title),`${game}: back names the destination`);
  await back(screen);await back('home');
 }}
 await group('picture-menu');await page.locator('#picture-menu [data-open="topics"]').click();await at('topics');await page.locator('[data-topic="food"]').click();await at('cards');
 ok((await page.locator('#screen-title').innerText()).includes('Finomság'),'Topic opens the chosen food cards');await back('topics');await page.goForward();await at('cards');
 ok((await page.locator('#screen-title').innerText()).includes('Finomság'),'Browser forward restores the card topic');await back('topics');await back('picture-menu');
 await group('number-menu');await page.locator('[data-mode="quiz"]').click();await at('numbers');ok(await page.locator('#number-quiz-view').isVisible(),'Number quiz opens the quiz view');await back('number-menu');await page.goForward();await at('numbers');
 ok(await page.locator('#number-quiz-view').isVisible()&&await page.locator('[data-mode="quiz"]').getAttribute('aria-pressed')==='true','Browser forward restores the number mode');
 await enter('practice-menu','imitate');await page.locator('#word-recovery').evaluate(node=>node.hidden=false);await page.locator('#word-recovery [data-open="listening-game"]').click();await at('listening-game');await back('imitate');ok(true,'Recovery game returns to the actual speech screen it came from');
 const nested=[['practice-menu','r-practice','[data-game="hunter"]','[data-game="hub"]'],['number-menu','furfangliget','[data-game="shop"]','[data-game="menu"]'],['number-menu','workshop','[data-game="pattern"]','[data-game="menu"]'],['play-menu','meseliget','#meadow-start','[data-mode="map"]']];
 for(const [parent,screen,selector,hub] of nested){
  await enter(parent,screen);await page.locator(`#${screen} ${selector}`).click();
  const savedBefore=await page.evaluate(()=>JSON.parse(localStorage.getItem('speech_game_progress_v1')));
  await page.locator('#back-button').click();await page.locator(`#${screen}${hub}`).waitFor();ok(await page.locator('body').getAttribute('data-screen')===screen,`${screen}: first back opens its own chooser`);
  const savedAfter=await page.evaluate(()=>JSON.parse(localStorage.getItem('speech_game_progress_v1')));
  ok(JSON.stringify(savedBefore.logic?.sessions)===JSON.stringify(savedAfter.logic?.sessions)&&JSON.stringify(savedBefore.workshop?.sessions)===JSON.stringify(savedAfter.workshop?.sessions)&&JSON.stringify(savedBefore.meadow?.adventure)===JSON.stringify(savedAfter.meadow?.adventure),`${screen}: back preserves saved work`);
  await back(parent);
 }
 await enter('activity-menu','puzzle');await page.locator('[data-puzzle-size="6"]').click();const before=await page.evaluate(()=>JSON.parse(localStorage.getItem('speech_game_progress_v1')).rewards);
 for(let i=0;i<6;i++){await page.locator(`[data-piece="${i}"]`).click();await page.locator(`[data-slot="${i}"]`).click();}
 await page.locator('#round-complete[open]').waitFor();
 for(const viewport of [{width:375,height:667},{width:932,height:350}]){
  await page.setViewportSize(viewport);const fits=await page.locator('#round-complete').evaluate(dialog=>[...dialog.querySelectorAll('.actions button')].every(button=>{const r=button.getBoundingClientRect();return r.width>=44&&r.height>=44&&r.top>=0&&r.bottom<=innerHeight&&r.left>=0&&r.right<=innerWidth;}));
  ok(fits,`Round dialog has three visible ≥44px actions at ${viewport.width}×${viewport.height}`);
 }
 await page.setViewportSize({width:390,height:844});await page.locator('#round-back').click();await at('activity-menu');
 ok(await page.evaluate(()=>JSON.parse(localStorage.getItem('speech_game_progress_v1')).rewards)===before+1,'Round dialog returns to its game group with its reward preserved');
 await enter('practice-menu','r-practice');await page.locator('[data-game="post"]').click();await page.locator('#home-button').click();await at('home');ok(true,'House button goes straight home from a nested game');
 await page.waitForFunction(async()=>Boolean((await navigator.serviceWorker.ready).active));
 await page.waitForFunction(async()=>{for(const key of await caches.keys())if((await(await caches.open(key)).keys()).some(r=>r.url.endsWith('/navigation.css')))return true;return false;});
 const saved=await page.evaluate(()=>localStorage.getItem('speech_game_progress_v1'));await context.setOffline(true);await page.reload();
 ok(await page.locator('#home [data-open]').count()===5,'Five groups survive an offline reload');
 for(const {screen} of data){await group(screen);ok(await page.locator(`#${screen} .game-menu-card`).count()>0,`${screen} works offline`);}
 ok(await page.evaluate(()=>localStorage.getItem('speech_game_progress_v1'))===saved,'Offline navigation preserves the progress backup');
 await context.setOffline(false);ok(!errors.length,'No page errors: '+errors.join('; '));
 return{count:checks.length,checks,engine:context.browser().browserType().name()};
}
