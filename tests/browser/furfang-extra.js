// Run with playwright-cli run-code --filename in a dedicated, disposable browser session.
// These checks modify only that session’s local test progress; never use a personal browser.
async(page)=>{
 const checks=[],ok=(v,m)=>{if(!v)throw Error(m);checks.push(m)};
 await page.context().setOffline(false);
 await page.evaluate(async()=>{for(const r of await navigator.serviceWorker.getRegistrations())await r.unregister();for(const c of await caches.keys())await caches.delete(c);});const url=page.url();await page.goto('about:blank');await page.goto(url);
 await page.waitForFunction(()=>!!navigator.serviceWorker.controller);
 const state=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('speech_game_progress_v1')));
 const home=async()=>{if(await page.locator('#home-button').isVisible())await page.locator('#home-button').click();};
 const enter=async()=>{await home();await page.locator('#home [data-open="play-menu"]').click();await page.locator('#play-menu [data-open="furfangliget"]').click();};
 const parent=async()=>{await home();await page.locator('#parent-button').click();const n=(await page.locator('#parent-gate-question').innerText()).match(/\d+/g).map(Number);await page.locator('#parent-gate-answers button').filter({hasText:new RegExp(`^${n[0]+n[1]}$`)}).click();};
 await parent();await page.locator('#route-level').selectOption('1');await enter();await page.locator('[data-game="route"]').click();if(await page.locator('#logic-next').count())await page.locator('#logic-next').click();
 await page.setViewportSize({width:834,height:1194});
 const a=await page.locator('[data-cell="0"]').boundingBox(),b=await page.locator('[data-cell="1"]').boundingBox(),c=await page.locator('[data-cell="2"]').boundingBox();
 await page.mouse.move(a.x+a.width/2,a.y+a.height/2);await page.mouse.down();await page.mouse.move(b.x+b.width/2,b.y+b.height/2,{steps:10});await page.mouse.move(c.x+c.width/2,c.y+c.height/2,{steps:10});await page.mouse.up();
 ok(JSON.stringify((await state()).logic.sessions.route.path)==='[0,1,2]','Continuous drag builds two steps');
 await page.locator('#logic-undo').click();ok(JSON.stringify((await state()).logic.sessions.route.path)==='[0,1]','Dragged step can be undone');
 await page.locator('[data-cell="1"]').click();ok(JSON.stringify((await state()).logic.sessions.route.path)==='[0]','Tap on final cell undoes step');
 await page.locator('[data-direction="down"]').focus();await page.keyboard.press('Enter');ok(JSON.stringify((await state()).logic.sessions.route.path)==='[0,3]','Keyboard alternative builds route');
 await page.locator('#logic-clear').click();await page.locator('[data-cell="8"]').click();ok((await state()).logic.sessions.route.path.length===1,'Diagonal jump rejected');
 await page.locator('#logic-check').click();await home();await page.waitForTimeout(500);ok(await page.locator('#home').isVisible(),'Exit cancels route playback');
 // Profile isolation is exercised via parent UI.
 const child=(await state()).logic;await parent();await page.locator('#supabase-role').selectOption('admin');
 ok((await state()).logic.sessions.route===null,'Parent trial has a separate unfinished puzzle');
 await page.locator('#supabase-role').selectOption('kid');ok(JSON.stringify((await state()).logic)===JSON.stringify(child),'Returning child restores all puzzles');
 const downloadWait=page.waitForEvent('download');await page.locator('#export-progress').click();const download=await downloadWait;await download.saveAs('output/playwright/furfang-qa-backup.json');
 await page.locator('#reset-progress').click();ok(await page.locator('#preview-logic').innerText()!=='','Backup preview has separate math count');await page.locator('#progress-apply').click();ok((await state()).logic.sessions.route===null,'Reset removes math attempt');
 await page.locator('#undo-progress').click();await page.locator('#progress-apply').click();ok(JSON.stringify((await state()).logic)===JSON.stringify(child),'Undo restores math attempts');
 await page.locator('#reset-progress').click();await page.locator('#progress-apply').click();await page.locator('#progress-file').setInputFiles('output/playwright/furfang-qa-backup.json');await page.locator('#progress-apply').click();ok(JSON.stringify((await state()).logic)===JSON.stringify(child),'Actual downloaded JSON imports math attempts');
 const cache=await page.evaluate(async()=>{for(const name of await caches.keys()){const c=await caches.open(name),files=(await c.keys()).map(r=>r.url);if(files.some(f=>f.endsWith('/logic-game.js')))return {count:files.length,audio:files.filter(f=>f.includes('/logic_')&&f.endsWith('.mp3')).length,fox:files.some(f=>f.endsWith('/assets/furfang-fox.png'))};}});
 ok(cache.audio===74&&cache.fox,'All 74 new sounds and fox are cached');
 await page.context().setOffline(true);
 try{
  await page.reload();await enter();
  for(const kind of ['shop','machine','route']){await page.locator(`[data-game="${kind}"]`).click();ok(await page.locator('#logic-work').isVisible(),`${kind} opens offline after reload`);await page.locator('#logic-hint').click();await page.locator('#logic-back').click();}
  const duration=await page.evaluate(async()=>{const ctx=new AudioContext();try{const a=await ctx.decodeAudioData(await (await fetch('./audio/voice/logic_shop_3.mp3')).arrayBuffer());return a.duration;}finally{await ctx.close();}});ok(duration>1,'New Hungarian audio decodes offline');
  await page.locator('[data-game="route"]').click();const path=await page.evaluate(async()=>{const d=await import('./logic-data.js'),s=JSON.parse(localStorage.getItem('speech_game_progress_v1')).logic.sessions.route;return d.routeSolution(d.generateTask('route',s.level,s.limit,s.seed));});
  if(await page.locator('#logic-clear').isEnabled())await page.locator('#logic-clear').click();for(const c of path.slice(1))await page.locator(`[data-cell="${c}"]`).click();await page.locator('#logic-check').click();await page.waitForSelector('#logic-next');ok((await state()).logic.sessions.route.done,'Full route can finish offline');
  await page.screenshot({path:'output/playwright/logic-fox-delivered.png',fullPage:true});
 }finally{await page.context().setOffline(false);}
 // Read-only layout review at enlarged text and small-phone widths.
 await enter();await page.locator('[data-game="machine"]').click();await page.setViewportSize({width:375,height:667});
 await page.addStyleTag({content:'html {font-size:200% !important}'});
 ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'Machine supports 200 percent text without sideways scrolling');
 return {count:checks.length,checks,cache};
}
