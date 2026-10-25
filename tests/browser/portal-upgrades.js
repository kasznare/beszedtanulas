// Disposable browser only. Audio completion is accelerated here; real MP3/offline playback has its own check.
async page => {
  const checks=[],errors=[],ok=(value,label)=>{if(!value)throw Error(label);checks.push(label);};
  page.on('pageerror',error=>errors.push(error.message));
  await page.context().setOffline(false);
  await page.evaluate(async()=>{localStorage.clear();for(const r of await navigator.serviceWorker.getRegistrations())await r.unregister();for(const k of await caches.keys())await caches.delete(k);});
  await page.addInitScript(()=>{
    window.qaSpoken=[];window.qaMicRequests=0;
    const fetchOriginal=window.fetch;
    window.fetch=(...args)=>{if(String(args[0]).includes('/audio/voice/'))qaSpoken.push(String(args[0]));return fetchOriginal(...args);};
    const start=AudioBufferSourceNode.prototype.start;
    AudioBufferSourceNode.prototype.start=function(...args){start.apply(this,args);setTimeout(()=>{try{this.stop();}catch{}this.dispatchEvent(new Event('ended'));},5);};
    speechSynthesis.speak=utterance=>setTimeout(()=>utterance.onend?.({}),5);
    if(navigator.mediaDevices)MediaDevices.prototype.getUserMedia=async()=>{qaMicRequests++;throw new DOMException('Test microphone unavailable','NotAllowedError');};
  });
  const url=page.url();await page.goto('about:blank');await page.goto(url);
  await page.evaluate(()=>{const s=JSON.parse(localStorage.getItem('speech_game_progress_v1'));s.settings={...s.settings,roundLength:3,listeningChoices:3,spokenGuidance:false};localStorage.setItem('speech_game_progress_v1',JSON.stringify(s));});
  await page.reload();
  const saved=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('speech_game_progress_v1')));
  const home=async()=>{if(await page.locator('#round-complete').isVisible())await page.locator('#round-home').click();else if(await page.locator('#home-button').isVisible())await page.locator('#home-button').click();};
  const enter=async(group,screen)=>{await home();await page.locator(`#home [data-open="${group}"]`).click();await page.locator(`#${group} [data-open="${screen}"]`).click();};
  const number=async mode=>{await home();await page.locator('#home [data-open="number-menu"]').click();await page.locator(`#number-menu [data-mode="${mode}"]`).click();};
  const layout=async label=>{
    for(const [width,height] of [[320,740],[375,812],[740,390],[834,1194]]){
      await page.setViewportSize({width,height});
      const result=await page.evaluate(()=>({overflow:document.documentElement.scrollWidth>innerWidth,small:[...document.querySelectorAll('.panel.is-active button')].filter(b=>{const r=b.getBoundingClientRect();return r.width&&r.height&&(r.width<43.5||r.height<43.5);}).map(b=>b.id||b.className)}));
      ok(!result.overflow,`${label}: fits ${width}×${height}`);
      ok(!result.small.length,`${label}: touch controls ${width}×${height}: ${result.small.join(', ')}`);
    }
  };

  await enter('picture-menu','topics');await page.locator('[data-topic="food"]').click();
  ok(await page.locator('#cards-grid svg.word-picture').count()===5,'Topic cards use clear shared drawings');
  await page.locator('#cards-grid [data-word="viz"]').click();await page.locator('#card-find').click();
  const water=page.locator('#listening-answers [data-word="viz"]');
  await page.locator('#listening-answers button:not([data-word="viz"])').first().click();
  await page.locator('#listening-answers button:not([data-word="viz"])').first().click();
  ok(await page.locator('#listening-answers button:visible').count()===2,'Listening removes a distractor after repeated mistakes');
  await page.locator('#listening-answers button:not([data-word="viz"]):visible').click();
  ok(await water.evaluate(b=>b.classList.contains('is-hint')),'Further listening help highlights the requested picture');
  await water.click();
  ok(await water.evaluate(b=>b.classList.contains('is-correct')),'Selected card becomes the first listening target');
  await enter('picture-menu','topics');await page.locator('[data-topic="food"]').click();
  await page.locator('#cards-grid [data-word="kifli"]').click();await page.locator('#card-say').click();
  ok(await page.locator('#imitate-word').innerText()==='kifli','Selected card opens the same spoken word');
  const allowed=['víz','alma','kifli','tej','kenyér'];
  for(let i=0;i<7;i++){await page.locator('#next-word').click();ok(allowed.includes(await page.locator('#imitate-word').innerText()),'Manual next respects the selected topic');}
  ok(await page.locator('#listen-btn').isHidden(),'Together mode hides the microphone action');
  await page.locator('#imitate details summary').click();
  for(const id of ['viz','alma','cica','auto','labda'])await page.locator(`[data-favorite="${id}"]`).click();
  await page.locator('[data-favorite="apa"]').click();
  ok((await saved()).settings.favoriteWords.length===5,'Favorites stop at five');
  await page.locator('#use-favorites').click();await page.locator('#imitate details summary').click();
  for(let i=0;i<6;i++){await page.locator('#next-word').click();ok(['víz','alma','cica','autó','labda'].includes(await page.locator('#imitate-word').innerText()),'Favorites drive manual practice');}
  const rewardBefore=(await saved()).rewards;await page.locator('#auto-session').click();
  for(let i=0;i<3;i++)await page.locator('#word-confirm').click();
  await page.waitForSelector('#round-complete[open]');
  ok(await page.locator('#round-complete').isVisible()&&(await saved()).rewards===rewardBefore+1,'A together word round finishes once');
  ok(await page.evaluate(()=>qaMicRequests===0),'Together practice never requests the microphone');
  await enter('practice-menu','imitate');await layout('Word practice');await page.screenshot({path:'output/playwright/portal-word-tablet.png',fullPage:true});

  await enter('practice-menu','two-word');await page.locator('#phrase-parts-toggle').click();await page.locator('#phrase-round-start').click();
  const phraseReward=(await saved()).rewards;
  for(let phrase=0;phrase<3;phrase++){
    await page.locator('#phrase-confirm').click();ok(await page.locator('[data-practice-part="1"]').getAttribute('aria-pressed')==='true','First word advances to second word');
    await page.locator('#phrase-confirm').click();ok(await page.locator('[data-practice-part="2"]').getAttribute('aria-pressed')==='true','Second word advances to the complete phrase');
    await page.locator('#phrase-confirm').click();
  }
  await page.waitForSelector('#round-complete[open]');
  ok(await page.locator('#round-complete').isVisible()&&(await saved()).rewards===phraseReward+1,'Short phrase round rewards only after all complete phrases');
  await enter('practice-menu','two-word');await layout('Phrase practice');await page.screenshot({path:'output/playwright/portal-phrase-tablet.png',fullPage:true});
  await page.evaluate(()=>{MediaDevices.prototype.getUserMedia=()=>{qaMicRequests++;return new Promise(resolve=>window.qaLateMicrophone=resolve);};});
  await page.locator('[data-phrase-mode="microphone"]').click();await page.locator('#listen-phrase-btn').click();
  await page.waitForFunction(()=>Boolean(window.qaLateMicrophone));await page.locator('#phrase-stop').click();
  ok(await page.locator('#phrase-stop').isHidden()&&await page.locator('#play-phrase').isEnabled(),'Local phrase stop immediately restores the controls');
  await page.evaluate(()=>qaLateMicrophone({getTracks:()=>[{stop:()=>window.qaLateTrackClosed=true}]}));
  await page.waitForFunction(()=>window.qaLateTrackClosed);
  ok(await page.evaluate(()=>qaLateTrackClosed),'Permission arriving after phrase cancellation closes its microphone');

  await number('count');await page.locator('[data-number-setting="numberSelf"][data-value="true"]').click();
  ok(await page.locator('#number-symbol').innerText()==='?'&&await page.locator('#number-picker').isHidden(),'Independent counting hides the result and selected numeral');
  await page.locator('[data-counting-index="0"]').click();await home();await number('count');
  ok(await page.locator('.counting-object[aria-pressed="true"]').count()===1,'Partial counting survives navigation');
  await page.reload();await number('count');
  ok(await page.locator('.counting-object[aria-pressed="true"]').count()===1,'Partial counting survives reload');
  const countReward=(await saved()).rewards;
  for(let task=0;task<3;task++){
    const indexes=await page.locator('.counting-object[aria-pressed="false"]').evaluateAll(bs=>bs.map(b=>b.dataset.countingIndex));
    for(const index of indexes)await page.locator(`[data-counting-index="${index}"]`).click();
    const total=await page.locator('.counting-object').count();
    ok(await page.locator('#number-total-choices [data-total]').count()===3&&await page.locator('#number-next').isDisabled(),'Self counting asks "Hány van?" before revealing the total, and Tovább waits');
    if(task===0){
      const wrongTotal=await page.locator('#number-total-choices [data-total]').evaluateAll((bs,n)=>bs.map(b=>Number(b.dataset.total)).find(v=>v!==n),total);
      await page.locator(`[data-total="${wrongTotal}"]`).click();
      ok(await page.locator('.counting-object[aria-pressed="true"]').count()===0&&(await page.locator('#number-status').innerText()).startsWith('Próbáld újra'),'A wrong total clears the marks for a fresh count');
      for(let index=0;index<total;index++)await page.locator(`[data-counting-index="${index}"]`).click();
    }
    await page.locator(`[data-total="${total}"]`).click();
    ok((await page.locator('#number-status').innerText()).startsWith('Összesen'),'Counting shows the final total');
    if(task<2)await page.locator('#number-next').click();
  }
  await page.waitForSelector('#round-complete[open]');
  ok((await saved()).rewards===countReward+1,'Completed number round is rewarded exactly once');
  ok(Object.values((await saved()).numbers.stats.count).reduce((n,s)=>n+s.independent,0)===2&&Object.values((await saved()).numbers.stats.count).reduce((n,s)=>n+s.helped,0)===1,'Parent stats retain independent and recounted results by quantity');
  await home();await number('count');ok((await saved()).rewards===countReward+1,'Returning to a completed count never duplicates reward');
  await page.locator('[data-number-setting="numberLayout"][data-value="scattered"]').click();await layout('Scattered counting');
  await number('quiz');ok(await page.locator('[data-quantity]').count()===2,'Beginner quantity quiz has two choices');
  await page.locator('[data-number-setting="quizDifficulty"][data-value="close"]').click();ok(await page.locator('[data-quantity]').count()===3,'Harder quiz has three nearby choices');
  let task=(await saved()).numbers.sessions.quiz;const wrong=task.choices.find(n=>n!==task.amount);
  await page.locator(`[data-quantity="${wrong}"]`).click();
  await page.waitForFunction(()=>!document.querySelector('.is-counting'));await page.waitForTimeout(300);
  await page.locator(`[data-quantity="${wrong}"]`).click();
  await page.waitForSelector('#number-comparison .number-comparison');
  ok(await page.locator('.number-comparison > div').count()===2,'Repeated wrong quantities get a paired comparison');
  await page.waitForTimeout(300);await page.locator(`[data-quantity="${task.amount}"]`).click();
  ok((await saved()).numbers.stats.quiz[task.amount].helped===1,'Quiz retry is recorded as assisted');
  await layout('Quantity comparison');await page.screenshot({path:'output/playwright/portal-number-tablet.png',fullPage:true});

  await enter('picture-menu','flip');await page.locator('[data-flip-mode="find"]').click();
  ok(await page.locator('#flip-grid .is-open').count()===await page.locator('#flip-grid button').count(),'Find mode starts with a full picture preview');
  await page.locator('#flip-hide').click();
  const deck=await page.locator('[data-flip-index]').evaluateAll(bs=>bs.map(b=>({index:b.dataset.flipIndex,label:b.querySelector('.card-word').textContent})));
  for(let i=0;i<deck.length;i++){
    const request=await page.locator('#flip-status').innerText();
    const item=deck.find(item=>request===`Keresd meg: ${item.label}!`);
    if(!item)throw Error('Missing spoken-picture request');
    await page.locator(`[data-flip-index="${item.index}"]`).click();
  }
  await page.waitForSelector('#round-complete[open]');
  ok(await page.locator('#round-complete').isVisible(),'Find mode completes after finding each requested picture');
  await enter('picture-menu','flip');await page.locator('[data-flip-mode="missing"]').click();
  for(let question=0;question<5;question++){
    const shown=await page.locator('[data-flip-index]').evaluateAll(bs=>bs.map(b=>b.dataset.word));
    await page.locator('#flip-hide').click();await page.waitForSelector('[data-missing-answer]');
    const remaining=await page.locator('[data-flip-index]').evaluateAll(bs=>bs.map(b=>b.dataset.word));
    ok(remaining.length<shown.length&&remaining.every(id=>shown.includes(id)),'The hidden picture leaves the board and the rest stay');
    const options=await page.locator('[data-missing-answer]').evaluateAll(bs=>bs.map(b=>b.dataset.missingAnswer));
    ok(!options.some(id=>remaining.includes(id)),'Answers never include a picture that is still visible');
    if(question===0)await layout('Missing picture');
    for(const id of shown.filter(id=>!remaining.includes(id)))await page.locator(`[data-missing-answer="${id}"]`).click();
    if(question<4)await page.waitForSelector('#flip-hide');
  }
  await page.waitForSelector('#round-complete[open]');
  ok(await page.locator('#complete-stars').innerText()==='⭐⭐⭐⭐⭐','Five first-try answers give five stars');
  await enter('picture-menu','topics');await page.locator('[data-topic="food"]').click();
  await page.setViewportSize({width:1000,height:1000});await page.screenshot({path:'output/playwright/portal-food-pictures.png',fullPage:true});
  ok(errors.length===0,`No uncaught errors: ${errors.join(', ')}`);
  return {count:checks.length,checks};
}
