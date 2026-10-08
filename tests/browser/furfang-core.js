// Run with playwright-cli run-code --filename in a dedicated, disposable browser session.
// These checks modify only that session’s local test progress; never use a personal browser.
async (page) => {
 const checks=[],errors=[];const ok=(v,m)=>{if(!v)throw Error(m);checks.push(m)};page.on('pageerror',e=>errors.push(e.message));
 const saved=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('speech_game_progress_v1')));
 const enter=async()=>{if(await page.locator('#home-button').isVisible())await page.locator('#home-button').click();await page.locator('#home [data-open="number-menu"]').click();await page.locator('#number-menu [data-open="furfangliget"]').click();};
 const parent=async()=>{if(await page.locator('#home-button').isVisible())await page.locator('#home-button').click();await page.locator('#parent-button').click();const text=await page.locator('#parent-gate-question').innerText(),n=text.match(/\d+/g).map(Number);await page.locator('#parent-gate-answers button').filter({hasText:new RegExp(`^${n[0]+n[1]}$`)}).click();};
 const task=async kind=>page.evaluate(async k=>{const {generateTask}=await import('./logic-data.js'),s=JSON.parse(localStorage.getItem('speech_game_progress_v1')).logic.sessions[k];return generateTask(k,s.level,s.limit,s.seed)},kind);
 const fill=async values=>{for(let i=0;i<values.length;i++){const input=page.locator(`#logic-value-${i}`);await input.fill(String(values[i]));await input.press('Tab');}};
 await page.emulateMedia({reducedMotion:'reduce'});
 await page.evaluate(async()=>{localStorage.clear();for(const r of await navigator.serviceWorker.getRegistrations())await r.unregister();for(const c of await caches.keys())await caches.delete(c);});const url=page.url();await page.goto('about:blank');await page.goto(url);await enter();
 const original=(await saved())?.attempts||0;
 for(const level of [1,2,3]){
  await parent();for(const id of ['shop-level','machine-level','route-level'])await page.locator('#'+id).selectOption(String(level));await page.locator('#math-limit').selectOption(String([5,10,20][level-1]));await enter();
  for(const kind of ['shop','machine','route']){
   await page.locator(`[data-game="${kind}"]`).click();const t=await task(kind);const before=(await saved()).rewards;
   await page.locator('#logic-check').click();await page.waitForFunction(()=>!document.querySelector('#logic-check')?.disabled);
   ok((await saved()).rewards===before,`${kind} ${level}: incomplete task has no reward`);
   await page.locator('#logic-hint').click();await page.locator('#logic-hint').click();await page.locator('#logic-hint').click();
   ok((await saved()).logic.sessions[kind].help===3,`${kind} ${level}: progressive hint saved`);
   if(kind==='shop'){
    await fill(t.orders[0]);await page.locator('#logic-check').click();await page.waitForFunction(()=>document.querySelector('#furfangliget').dataset.busy==='false');ok((await saved()).logic.sessions.shop.stage===1,`Shop ${level}: second order follows`);ok((await saved()).rewards===before,`Shop ${level}: first order not rewarded`);
    await fill(t.orders[1]);
   }else if(kind==='machine'){
    for(let i=0;i<t.program.length;i++){await page.locator(`#logic-slot-${i}`).click();await page.locator(`[data-op="${t.program[i]}"]`).click();}
    await page.locator('#logic-trial').click();await page.waitForFunction(()=>document.querySelector('#furfangliget').dataset.busy==='false');ok((await page.locator('.logic-match').count())===3,`Machine ${level}: trial runs examples`);
    const values=await page.evaluate(async t=>{const {applyRule}=await import('./logic-data.js');return t.questions.map(n=>applyRule(n,t.program));},t);await fill(values);
   }else{
    const path=await page.evaluate(async t=>(await import('./logic-data.js')).routeSolution(t),t);
    for(const cell of path.slice(1))await page.locator(`[data-cell="${cell}"]`).click();
   }
   const preUndo=(await saved()).logic.sessions[kind];await page.locator('#logic-undo').click();const postUndo=(await saved()).logic.sessions[kind];ok(JSON.stringify(preUndo)!==JSON.stringify(postUndo),`${kind} ${level}: undo changes plan`);
   // Restore the final move through the same visible control.
   if(kind==='route')await page.locator(`[data-cell="${preUndo.path.at(-1)}"]`).click();else await fill(preUndo.values);
   const resume=(await saved()).logic.sessions[kind];await page.reload();await enter();await page.locator(`[data-game="${kind}"]`).click();ok(JSON.stringify((await saved()).logic.sessions[kind])===JSON.stringify(resume),`${kind} ${level}: reload restores complete attempt`);
   await page.locator('#logic-check').evaluate(b=>{b.click();b.click()});await page.waitForSelector('#logic-next');
   ok((await saved()).rewards===before+1,`${kind} ${level}: exactly one reward`);ok((await saved()).logic.games[kind][level-1].assisted===1,`${kind} ${level}: assisted result separated`);
   await page.locator('#logic-back').click();await page.locator(`[data-game="${kind}"]`).click();ok(await page.locator('#logic-next').count()===1,`${kind} ${level}: solved task stays solved`);
   await page.locator('#logic-next').click();ok(!(await saved()).logic.sessions[kind].done,`${kind} ${level}: new replayable task`);
   for(const [width,height] of [[430,932],[932,430],[834,1194],[1194,834],[430,740],[932,350],[375,667]]){
    await page.setViewportSize({width,height});const metrics=await page.evaluate(()=>({overflow:document.documentElement.scrollWidth>innerWidth,small:[...document.querySelectorAll('#furfangliget button')].filter(b=>{const r=b.getBoundingClientRect();return r.width<43||r.height<43}).map(b=>b.id)}));ok(!metrics.overflow,`${kind} ${level}: width ${width}×${height}`);
    if((width===430&&height===932)||(width===1194&&height===834))await page.screenshot({path:`output/playwright/logic-${kind}-L${level}-${width}.png`,fullPage:true});
   }
   await page.setViewportSize({width:430,height:932});await page.locator('#logic-back').click();
  }
 }
 ok((await saved()).attempts===original,'Math leaves speech attempts untouched');ok(errors.length===0,'No page errors');
 return {count:checks.length,checks,errors};
}
