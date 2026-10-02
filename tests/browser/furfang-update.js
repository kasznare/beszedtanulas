async(page)=>{
 const checks=[],ok=(v,m)=>{if(!v)throw Error(m);checks.push(m)};
 if(await page.locator('#round-complete').isVisible())await page.locator('#round-home').click();else if(await page.locator('#home-button').isVisible())await page.locator('#home-button').click();
 const before=await page.evaluate(()=>JSON.parse(localStorage.getItem('speech_game_progress_v1')));
 await page.evaluate(async()=>{const r=await navigator.serviceWorker.getRegistration();await r.update();});
 await page.waitForFunction(async()=>!!(await navigator.serviceWorker.getRegistration())?.waiting);
 await page.locator('#parent-button').click();const n=(await page.locator('#parent-gate-question').innerText()).match(/\d+/g).map(Number);await page.locator('#parent-gate-answers button').filter({hasText:new RegExp(`^${n[0]+n[1]}$`)}).click();
 const update=page.getByRole('button',{name:'Új verzió betöltése'});await update.click();await page.waitForFunction(()=>document.body.dataset.screen==='home');
 const after=await page.evaluate(()=>JSON.parse(localStorage.getItem('speech_game_progress_v1')));ok(JSON.stringify(after.logic)===JSON.stringify(before.logic),'Parent update preserves math progress');ok(after.rewards===before.rewards,'Parent update preserves rewards');
 await page.locator('#home [data-open="play-menu"]').click();await page.locator('#play-menu [data-open="furfangliget"]').click();await page.locator('[data-game="route"]').click();
 const s=after.logic.sessions.route;if(s?.done)ok(await page.locator(`[data-cell="${(s.level+2)**2-1}"] .logic-fox`).count()===1,'Solved route reopens with fox at destination');
 for(const [width,height] of [[375,667],[430,932],[932,350],[834,1194],[1194,834]]){
  await page.setViewportSize({width,height});const m=await page.evaluate(()=>({overflow:document.documentElement.scrollWidth>innerWidth,small:[...document.querySelectorAll('#furfangliget button')].filter(b=>{const r=b.getBoundingClientRect();return r.width<43.5||r.height<43.5}).map(b=>b.id||b.getAttribute('aria-label'))}));ok(!m.overflow,`Final route fits ${width}×${height}`);ok(!m.small.length,`Final route touch controls 44px ${width}×${height}`);
 }
 await page.setViewportSize({width:430,height:932});await page.screenshot({path:'output/playwright/logic-final-route-phone.png',fullPage:true});
 return {count:checks.length,checks};
}
