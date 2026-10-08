// Runs in isolated contexts; synthetic browser speech checks only fallback cue lifecycle.
async page=>{
 const checks=[];const ok=(v,m)=>{if(!v)throw Error(m);checks.push(m)};
 for(const mode of ['element','browser']){
  const context=await page.context().browser().newContext({serviceWorkers:'block'});
  try{
   await context.route('https://cdn.jsdelivr.net/**',r=>r.fulfill({contentType:'text/javascript',body:''}));
   await context.addInitScript(mode=>{
    window.AudioContext=undefined;window.webkitAudioContext=undefined;window.events=[];
    for(const type of ['narrationword','narrationend'])document.addEventListener(type,e=>events.push({type,...e.detail,parts:[...document.querySelectorAll('.is-narrated')].map(n=>n.dataset.narrationPart)}));
    if(mode==='browser'){
     HTMLMediaElement.prototype.play=()=>Promise.reject(new Error('Test missing audio'));
     speechSynthesis.speak=utterance=>{window.testUtterance=utterance;queueMicrotask(()=>utterance.onstart?.());};
    }
   },mode);
   const p=await context.newPage();await p.goto(page.url());await p.locator('#home [data-open="number-menu"]').click();await p.locator('#number-menu [data-open="furfangliget"]').click();await p.locator('[data-game="machine"]').click();
   if(mode==='element'){
    await p.locator('[data-example="0"]').click();const output='logic_n_'+await p.locator('[data-example="0"] [data-narration-part="output"] b').innerText();
    await p.waitForFunction(id=>events.some(e=>e.type==='narrationend'&&e.id===id),output);
    ok(await p.evaluate(()=>events.some(e=>e.parts.includes('input'))&&events.some(e=>e.parts.includes('output'))),'HTML audio clock synchronizes input and output cues');
   }else{
    await p.waitForFunction(()=>testUtterance?.text.includes('A példák'));
    await p.evaluate(()=>testUtterance.onboundary({charIndex:testUtterance.text.indexOf('műveletet')}));
    ok(await p.locator('.logic-ops.is-narrated').count()===1,'Browser word boundary selects operations cue');
    await p.evaluate(()=>testUtterance.onboundary({charIndex:testUtterance.text.indexOf('próbáld ki')}));
    ok(await p.locator('#logic-trial.is-narrated').count()===1&&await p.locator('.logic-ops.is-narrated').count()===0,'Browser word boundary advances cue without a guessed timer');
    await p.locator('#home-button').click();ok(await p.locator('#furfangliget .is-narrated').count()===0,'Browser fallback cancellation clears all cues');
   }
  }finally{await context.close();}
 }
 return {count:checks.length,checks};
}
