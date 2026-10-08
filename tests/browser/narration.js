// Use only a fresh, disposable playwright-cli session: this clears that session's test storage.
async page => {
 const checks=[],errors=[],ok=(v,m)=>{if(!v)throw Error(m);checks.push(m);};
 page.on('pageerror',e=>errors.push(e.message));
 await page.emulateMedia({reducedMotion:'no-preference'});
 await page.route('https://cdn.jsdelivr.net/**',r=>r.fulfill({contentType:'text/javascript',body:''}));
 const url=page.url();
 await page.evaluate(async()=>{localStorage.clear();for(const r of await navigator.serviceWorker.getRegistrations())await r.unregister();for(const k of await caches.keys())await caches.delete(k);});
 await page.addInitScript(()=>{
  window.narrationEvents=[];
  for(const type of ['narrationstart','narrationword','narrationend'])document.addEventListener(type,e=>narrationEvents.push({type,...e.detail,marks:[...document.querySelectorAll('.is-narrated')].map(n=>({id:n.id,part:n.dataset.narrationPart,example:n.closest('[data-example]')?.dataset.example,classes:n.className?.baseVal||n.className,clip:n.dataset.narrationClip}))}));
  const fetchOriginal=window.fetch;window.fetch=async(...args)=>{
   if(window.holdVoice&&String(args[0]).endsWith(window.holdVoice)) { window.heldVoice=true;await new Promise(resolve=>window.releaseVoice=resolve);window.holdVoice=null; }
   return fetchOriginal(...args);
  };
 });
 await page.goto('about:blank');await page.goto(url);
 await page.waitForFunction(()=>document.querySelector('#offline-status').textContent.startsWith('Letöltve.'));
 const home=async()=>{if(await page.locator('#home-button').isVisible())await page.locator('#home-button').click();};
 const enter=async game=>{await home();await page.locator('#home [data-open="number-menu"]').click();await page.locator('#number-menu [data-open="furfangliget"]').click();await page.locator(`[data-game="${game}"]`).click();};
 const clear=()=>page.evaluate(()=>{narrationEvents.length=0});
 const waitMark=async selector=>page.waitForFunction(s=>!!document.querySelector(s+'.is-narrated'),selector);
 await enter('machine');await clear();await page.locator('[data-example="0"]').click();
 const resultClip='logic_n_'+await page.locator('[data-example="0"] [data-narration-part="output"] b').innerText();
 await page.waitForFunction(id=>narrationEvents.some(e=>e.type==='narrationend'&&e.id===id),resultClip);
 const machine=await page.evaluate(()=>narrationEvents.filter(e=>e.type==='narrationword'));
 ok(machine.some(e=>e.id==='logic_input'&&e.marks.some(m=>m.part==='input'&&m.example==='0')),'Example labels highlight the selected input');
 ok(machine.some(e=>e.id.startsWith('logic_n_')&&e.marks.some(m=>m.part==='input')),'Spoken input number animates the input');
 ok(machine.some(e=>e.id==='logic_output'&&e.marks.some(m=>m.part==='machine')),'Gear animates at the handover');
 ok(machine.some(e=>e.id.startsWith('logic_n_')&&e.marks.some(m=>m.part==='output')),'Spoken result animates the output');
 ok(await page.locator('.is-narrated').count()===0,'Completed sequence clears all highlights');
 await page.locator('[data-example="0"]').click();await waitMark('[data-example="0"] [data-narration-part="input"]');await page.locator('[data-example="1"]').click();await waitMark('[data-example="1"] [data-narration-part="input"]');
 ok(await page.locator('[data-example="0"] .is-narrated').count()===0,'A second example cancels the first example highlights');
 await page.screenshot({path:'output/playwright/narration-machine-input.png'});
 await home();ok(await page.locator('#furfangliget .is-narrated').count()===0,'Home clears speech animations immediately');
 await enter('shop');await clear();await page.locator('#logic-repeat').click();
 await waitMark('.logic-basket');await page.waitForFunction(()=>document.querySelector('[data-delta="1"].is-narrated'));
 ok(await page.locator('[data-delta="-1"].is-narrated').count()===0,'Shop addition words highlight only the plus controls');
 await page.waitForFunction(()=>document.querySelector('[data-delta="-1"].is-narrated'));
 ok(await page.locator('[data-delta="1"].is-narrated').count()===0,'Shop subtraction words move the cue to minus controls');
 await page.waitForFunction(()=>document.querySelector('[data-order="0"].is-narrated'));
 ok(await page.locator('[data-order="1"].is-narrated').count()===0,'Spoken apple order identifies the apple quantity');
 await enter('route');await waitMark('[data-parcel]');ok(await page.locator('[data-destination].is-narrated').count()===0,'Parcel instruction highlights the parcel before the destination');
 await waitMark('[data-destination]');ok(await page.locator('[data-parcel].is-narrated').count()===0,'Home instruction moves to the destination');
 await home();await page.locator('#home [data-open="play-menu"]').click();await page.locator('#play-menu [data-open="meseliget"]').click();await page.locator('#meadow-garden').click();
 await waitMark('.meadow-orchard');await waitMark('.meadow-basket');ok(true,'Apple collection narration moves from orchard to basket');
 await page.locator('#meadow-back').click();await page.locator('#meadow-picnic').click();await waitMark('.meadow-animal');await waitMark('.meadow-plate');ok(true,'Picnic narration moves from animals to plates');
 await home();await page.locator('#home [data-open="number-menu"]').click();await page.locator('#number-menu [data-mode="count"]').click();await page.locator('.counting-object').nth(1).click();await waitMark('[data-counting-index="1"]');
 ok(await page.locator('.counting-object.is-narrated').count()===1,'Only the tapped object moves during counting');
 await home();await page.locator('#home [data-open="practice-menu"]').click();await page.locator('[data-open="two-word"]').click();await clear();await page.locator('#play-phrase').click();
 await waitMark('[data-phrase-part="0"]');await waitMark('[data-phrase-part="1"]');ok(true,'The two phrase pictures are highlighted in spoken order');
 await home();await page.locator('#home [data-open="picture-menu"]').click();await page.locator('#picture-menu [data-open="listening-game"]').click();await page.locator('#listening-replay').click();await waitMark('#listening-replay');
 ok(await page.locator('#listening-answers .is-narrated').count()===0,'Listening game keeps the correct choice hidden');
 await home();await page.locator('#home [data-open="play-menu"]').click();await page.locator('[data-open="teddy-game"]').click();await page.locator('#teddy-replay').click();await waitMark('.teddy-illustration');
 ok(await page.locator('#teddy-answers .is-narrated').count()===0,'Teddy speaks without revealing the requested plate');
 ok(await page.locator('#teddy-game .teddy-hamm').evaluate(n=>getComputedStyle(n).display)!=='none','Teddy mouth visibly moves while speaking');
 await page.screenshot({path:'output/playwright/narration-teddy-speaking.png'});
 await home();await page.locator('#home [data-open="play-menu"]').click();await page.locator('[data-open="dress-game"]').click();await page.locator('#dress-replay').click();await waitMark('#dress-bear .teddy-illustration');
 ok(await page.locator('#dress-answers .is-narrated').count()===0,'Dressing bear speaks without selecting the correct garment');
 await page.emulateMedia({reducedMotion:'reduce'});await enter('machine');await page.locator('[data-example="0"]').click();await waitMark('[data-example="0"] [data-narration-part="input"]');
 ok(await page.locator('[data-example="0"] .is-narrated').evaluate(n=>getComputedStyle(n).animationName)==='none','Reduced motion retains the highlight without movement');
 for(const size of [{width:375,height:667},{width:932,height:350},{width:834,height:1194}]){
  await page.setViewportSize(size);ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`Animated machine fits ${size.width}x${size.height}`);
 }
 await home();await page.reload();await enter('machine');await page.evaluate(()=>{window.holdVoice='logic_input.mp3';window.heldVoice=false;});await page.locator('[data-example="0"]').click();await page.waitForFunction(()=>heldVoice);
 ok(await page.locator('[data-example="0"] .is-narrated').count()===0,'Delayed audio never starts a premature highlight');
 await home();await page.evaluate(()=>releaseVoice());await page.evaluate(()=>new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))));
 ok(await page.locator('#furfangliget .is-narrated').count()===0,'Delayed response after navigation cannot revive old animation');
 await page.context().setOffline(true);await page.reload();await enter('machine');await page.locator('[data-example="0"]').click();await waitMark('[data-example="0"] [data-narration-part="input"]');ok(true,'Recorded timings and speech animation work after offline reload');
 await home();await page.context().setOffline(false);ok(errors.length===0,'No browser script errors');
 return {count:checks.length,checks};
}
