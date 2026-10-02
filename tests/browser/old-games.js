// Run with playwright-cli run-code --filename in a dedicated, disposable browser session.
// These checks modify only that session’s local test progress; never use a personal browser.
async(page)=>{
 const checks=[],ok=(v,m)=>{if(!v)throw Error(m);checks.push(m)};
 await page.reload();
 const state=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('speech_game_progress_v1')));
 const home=async()=>{if(await page.locator('#round-complete').isVisible())await page.locator('#round-home').click();else if(await page.locator('#home-button').isVisible())await page.locator('#home-button').click();};
 const logic=JSON.stringify((await state())?.logic);
 for(const game of ['dress','teddy']){
  await home();await page.locator('#home [data-open="play-menu"]').click();await page.locator(`#play-menu [data-open="${game}-game"]`).click();const before=(await state()).rewards;
  const count=game==='dress'?4:(await state()).settings.roundLength;
  for(let i=0;i<count;i++){
   // Try existing choices until the request locks; no internal game state is changed.
   const ids=await page.locator(`#${game}-answers button`).evaluateAll(bs=>bs.map(b=>({key:b.dataset.item||b.dataset.word})));
   for(const {key} of ids){const b=page.locator(`#${game}-answers [data-${game==='dress'?'item':'word'}="${key}"]`);if(await b.isEnabled())await b.click();if(await page.locator(`#${game}-answers button:enabled`).count()===0)break;}
   await page.waitForFunction(id=>!document.querySelector('#'+id+'-next').disabled,game);await page.locator(`#${game}-next`).click();
  }
  ok(await page.locator('#round-complete').isVisible(),`${game}: full round finishes`);ok((await state()).rewards===before+1,`${game}: one reward`);
 }
 await home();await page.locator('#home [data-open="picture-menu"]').click();await page.locator('[data-open="listening-game"]').first().click();
 ok(await page.locator('#listening-game').isVisible(),'Listening game still opens');await home();
 await page.locator('#home [data-open="number-menu"]').click();ok(await page.locator('#number-menu').isVisible(),'Original counting menu still opens');await home();
 await page.locator('#home [data-open="play-menu"]').click();await page.locator('#play-menu [data-open="flip"]').click();const before=(await state()).rewards;
 for(const button of await page.locator('#flip-grid button').all())await button.click();await page.waitForSelector('#round-complete[open]');ok((await state()).rewards===before+1,'Original six-card surprise round rewards once');
 ok(JSON.stringify((await state()).logic)===logic,'Old games preserve new math progress');return {count:checks.length,checks};
}
