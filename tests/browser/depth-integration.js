// Disposable browser: real app and audio files, accelerated playback completion.
async page => {
  const checks=[],errors=[];const ok=(value,label)=>{if(!value)throw Error(label);checks.push(label);};
  page.on('pageerror',error=>errors.push(error.message));
  const origin=new URL(page.url()).origin;
  await page.context().setOffline(false);
  await page.evaluate(async()=>{localStorage.clear();for(const r of await navigator.serviceWorker.getRegistrations())await r.unregister();for(const k of await caches.keys())await caches.delete(k);});
  await page.addInitScript(()=>{
    const play=AudioBufferSourceNode.prototype.start;
    AudioBufferSourceNode.prototype.start=function(...args){play.apply(this,args);setTimeout(()=>{try{this.stop();}catch{}this.dispatchEvent(new Event('ended'));},5);};
  });
  await page.goto('about:blank');await page.goto(origin);
  await page.evaluate(()=>{const s=JSON.parse(localStorage.getItem('speech_game_progress_v1'));s.settings={...s.settings,roundLength:3,spokenGuidance:false,memoryPairs:3,listeningChoices:3};localStorage.setItem('speech_game_progress_v1',JSON.stringify(s));});await page.reload();
  const saved=()=>page.evaluate(()=>localStorage.getItem('speech_game_progress_v1'));
  const home=async()=>{if(await page.locator('#round-complete').isVisible())await page.locator('#round-home').click();else if(await page.locator('#home-button').isVisible())await page.locator('#home-button').click();};
  const enter=async(group,screen)=>{await home();await page.locator(`#home [data-open="${group}"]`).click();await page.locator(`#${group} [data-open="${screen}"]`).click();};
  const layouts=async label=>{
    for(const [width,height] of [[320,740],[390,844],[932,430],[834,1194]]){
      await page.setViewportSize({width,height});
      ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),`${label} fits ${width}`);
      ok(await page.locator('.panel.is-active button, .panel.is-active select').evaluateAll(nodes=>nodes.every(n=>{const r=n.getBoundingClientRect();return !r.width||!r.height||r.width>=43.5&&r.height>=43.5;})),`${label} touch controls ${width}`);
    }
  };
  await enter('practice-menu','two-word');
  const beforeFilter=await saved();
  for(const group of ['request','person_action','attribute_object','more_stop']){
    await page.locator('#phrase-group').selectOption(group);
    const allowed=await page.evaluate(async group=>(await import('/game-data.js')).twoWordPhrases.filter(p=>p.group===group).map(p=>p.text),group);
    const seen=[];for(let i=0;i<allowed.length;i++){const text=await page.locator('#phrase-text').innerText();ok(allowed.includes(text),`Filtered ${group} phrase is valid`);seen.push(text);if(i<allowed.length-1)await page.locator('#next-phrase').click();}
    ok(new Set(seen).size===allowed.length,`${group} covers every phrase before repeating`);
  }
  ok(await saved()===beforeFilter,'Phrase filters and next selections do not persist results or preferences');
  await page.locator('#phrase-group').selectOption('request');await page.locator('#phrase-topic').selectOption('food');
  await layouts('Phrase bank');await page.screenshot({path:'output/playwright/depth-phrases.png',fullPage:true});
  await page.locator('#phrase-round-start').click();const round=[];
  for(let i=0;i<3;i++){round.push(await page.locator('#phrase-text').innerText());await page.locator('#phrase-confirm').click();}
  ok(new Set(round).size===3,'Short phrase round uses distinct authored food requests');
  await page.waitForSelector('#round-complete[open]');
  ok(await page.locator('#round-replay').innerText()==='Még egy ilyen','Round end has a visible same-level replay label');
  ok(await page.locator('#round-related [data-related-source="two-word"]').count()===1,'Phrase round recommends the expressive Maci scene');
  await page.locator('#round-related button').click();
  ok(await page.locator('[data-teddy-mode="expressive"]').getAttribute('aria-pressed')==='true','Related launch opens expressive mode directly');
  const beforeTeddy=await saved();
  for(let i=0;i<3;i++){
    await page.locator('#teddy-answers .teddy-plate').first().click();await page.locator('.teddy-expression-confirm').click();await page.locator('.teddy-expression-give').click();
    await page.waitForFunction(()=>!document.querySelector('#teddy-next').disabled);await page.locator('#teddy-next').click();
  }
  await page.waitForSelector('#round-complete[open]');
  ok(await saved()===beforeTeddy,'An expressive round adds no saved play or reward results');
  await page.locator('#round-replay').click();
  ok(await page.locator('[data-teddy-mode="expressive"]').getAttribute('aria-pressed')==='true','Replay preserves expressive mode');
  await layouts('Expressive Maci');await page.screenshot({path:'output/playwright/depth-teddy.png',fullPage:true});
  await page.evaluate(()=>{window.depthHeard=[];document.addEventListener('narrationstart',e=>depthHeard.push(e.detail.id));});
  const rewards=async()=>JSON.parse(await saved()).rewards,plays=async()=>JSON.parse(await saved()).plays;
  // Sound memory has no visible answer: pair cards by trying, as a child would.
  const solveMemory=async()=>{
    for(let guard=0;guard<60&&!(await page.locator('#round-complete').isVisible());guard++){
      const keys=await page.locator('.memory-card:not(.is-matched)').evaluateAll(bs=>bs.map(b=>b.dataset.card));
      if(keys.length<2)break;
      for(const key of keys.slice(1)){
        await page.locator(`[data-card="${keys[0]}"]`).click();await page.locator(`[data-card="${key}"]`).click();
        if(await page.locator(`[data-card="${key}"].is-matched`).count())break;
        await page.waitForFunction(()=>document.querySelectorAll('.memory-card:not(:disabled)').length>0);
      }
    }
    await page.waitForSelector('#round-complete[open]');
  };
  await enter('activity-menu','memory');await page.locator('[data-memory-mode="sound"]').click();
  const beforeSound={rewards:await rewards(),plays:await plays()};
  const sounds=await page.locator('.memory-card').evaluateAll(bs=>bs.map(b=>({key:b.dataset.card,label:b.getAttribute('aria-label')})));
  ok(sounds.length===6&&sounds.every(c=>/^\d+\. kártya, lefordítva$/.test(c.label)&&/^card-\d+$/.test(c.key)),'Sound memory starts face down and its markup names no animal');
  await layouts('Sound picture pairs');await page.screenshot({path:'output/playwright/depth-sound-pairs.png',fullPage:true});
  await solveMemory();
  ok(await rewards()===beforeSound.rewards+1&&await plays()===beforeSound.plays,'A sound memory round earns one reward and counts no word plays');
  await page.locator('#round-replay').click();ok(await page.locator('[data-memory-mode="sound"]').getAttribute('aria-pressed')==='true','Replay preserves sound pairs');
  // Finish again and use the curated related activity, without a player history.
  await solveMemory();await page.locator('#round-related button').click();
  ok(await page.locator('[data-listening-mode="bingo"]').getAttribute('aria-pressed')==='true','Related launch opens bingo directly');
  const beforeBingo=await rewards(),board=await page.locator('.listening-bingo-tile').evaluateAll(bs=>bs.map(b=>b.dataset.word));
  ok(board.length===4,'Bingo starts on a 2×2 board');
  await layouts('Bingo');await page.screenshot({path:'output/playwright/depth-bingo.png',fullPage:true});
  let decisions=0;
  for(let step=0;step<12&&!(await page.locator('#round-complete').isVisible());step++){
    await page.waitForFunction(n=>depthHeard.filter(id=>id.startsWith('word_')).length>n,step);
    const id=await page.evaluate(()=>depthHeard.filter(i=>i.startsWith('word_')).at(-1).slice(5));
    if(board.includes(id))await page.locator(`.listening-bingo-tile[data-word="${id}"]`).click();else{decisions++;await page.locator('#listening-none').click();}
    ok((await page.locator('.listening-bingo-tile').evaluateAll(bs=>bs.map(b=>b.dataset.word))).join()===board.join(),'Bingo keeps the same pictures in the same positions');
    await page.waitForFunction(n=>depthHeard.filter(id=>id.startsWith('word_')).length>n+1||document.querySelector('#round-complete[open]'),step,{timeout:5000});
  }
  await page.waitForSelector('#round-complete[open]');
  ok(decisions>=1,'Bingo asked at least once for a picture that is not on the board');
  ok(await rewards()===beforeBingo+1,'A won bingo earns one reward');
  await page.locator('#round-replay').click();ok(await page.locator('[data-listening-mode="bingo"]').getAttribute('aria-pressed')==='true','Replay preserves bingo');
  const count=JSON.parse(await saved()).settings;ok(count.memoryPairs===3&&count.listeningChoices===3&&count.roundLength===3,'Recommendations do not change configured difficulty');
  await page.reload();await enter('practice-menu','two-word');ok(await page.locator('#phrase-group').inputValue()==='all'&&await page.locator('#phrase-topic').inputValue()==='all','Content filters reset on reload without storing history');
  ok(!errors.length,`No runtime errors: ${errors.join(', ')}`);
  return {count:checks.length,checks};
}
