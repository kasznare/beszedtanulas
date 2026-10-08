// Run in a disposable browser session with existing Furfangliget test progress.
// Automatic safe-home activation, failed downloads and multiple windows are
// covered by offline-update.js with offline-update-fixture.py. This companion
// checks route reopening, saved math progress and layout after a home reload.
async(page)=>{
 const checks=[],ok=(v,m)=>{if(!v)throw Error(m);checks.push(m)};
 if(await page.locator('#round-complete').isVisible())await page.locator('#round-home').click();else if(await page.locator('#home-button').isVisible())await page.locator('#home-button').click();
 const before=await page.evaluate(()=>JSON.parse(localStorage.getItem('speech_game_progress_v1')));
 await page.reload();await page.waitForFunction(()=>document.body.dataset.screen==='home');
 const after=await page.evaluate(()=>JSON.parse(localStorage.getItem('speech_game_progress_v1')));ok(JSON.stringify(after.logic)===JSON.stringify(before.logic),'Home reload preserves math progress');ok(after.rewards===before.rewards,'Home reload preserves rewards');
 await page.locator('#home [data-open="number-menu"]').click();await page.locator('#number-menu [data-open="furfangliget"]').click();await page.locator('[data-game="route"]').click();
 const s=after.logic.sessions.route;if(s?.done)ok(await page.locator(`[data-cell="${(s.level+2)**2-1}"] .logic-fox`).count()===1,'Solved route reopens with fox at destination');
 for(const [width,height] of [[375,667],[430,932],[932,350],[834,1194],[1194,834]]){
  await page.setViewportSize({width,height});const m=await page.evaluate(()=>({overflow:document.documentElement.scrollWidth>innerWidth,small:[...document.querySelectorAll('#furfangliget button')].filter(b=>{const r=b.getBoundingClientRect();return r.width<43.5||r.height<43.5}).map(b=>b.id||b.getAttribute('aria-label'))}));ok(!m.overflow,`Final route fits ${width}×${height}`);ok(!m.small.length,`Final route touch controls 44px ${width}×${height}`);
 }
 await page.setViewportSize({width:430,height:932});await page.screenshot({path:'output/playwright/logic-final-route-phone.png',fullPage:true});
 return {count:checks.length,checks};
}
