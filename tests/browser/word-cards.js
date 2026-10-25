// Disposable browser only (playwright-cli run-code). Audio completion is accelerated;
// it checks larger picture topics, reused recordings and the Kukucs "Hol van?" payoff.
async page => {
  const checks=[],errors=[],ok=(value,label)=>{if(!value)throw Error(label);checks.push(label);};
  page.on('pageerror',error=>errors.push(error.message));
  await page.context().setOffline(false);
  await page.evaluate(async()=>{localStorage.clear();for(const r of await navigator.serviceWorker.getRegistrations())await r.unregister();for(const k of await caches.keys())await caches.delete(k);});
  await page.addInitScript(()=>{
    window.qaFetched=[];
    const fetchOriginal=window.fetch;
    window.fetch=(...args)=>{const url=String(args[0]?.url||args[0]);if(url.includes('/audio/'))qaFetched.push(url);return fetchOriginal(...args);};
    const start=AudioBufferSourceNode.prototype.start;
    AudioBufferSourceNode.prototype.start=function(...args){start.apply(this,args);setTimeout(()=>{try{this.stop();}catch{}this.dispatchEvent(new Event('ended'));},5);};
  });
  const url=page.url();await page.goto('about:blank');await page.goto(url);
  const open=async topic=>{if(await page.locator('#round-complete').isVisible())await page.locator('#round-home').click();if(await page.locator('#home-button').isVisible())await page.locator('#home-button').click();await page.locator('#home [data-open="picture-menu"]').click();await page.locator('#picture-menu [data-open="topics"]').click();await page.locator(`[data-topic="${topic}"]`).click();};
  const fits=async label=>{
    for(const [width,height] of [[768,900],[1024,680],[390,844],[932,430]]){
      await page.setViewportSize({width,height});
      const result=await page.evaluate(()=>({overflow:document.documentElement.scrollWidth>innerWidth,tall:document.documentElement.scrollHeight>innerHeight+1,small:[...document.querySelectorAll('.panel.is-active button')].filter(b=>{const r=b.getBoundingClientRect();return r.width&&r.height&&(r.width<43.5||r.height<43.5);}).map(b=>b.id||b.className)}));
      ok(!result.overflow&&!result.small.length,`${label}: ${width}×${height} has no sideways scroll and ≥44px buttons ${result.small.join(', ')}`);
      if(width>=768)ok(!result.tall,`${label}: ${width}×${height} fits the tablet height`);
    }
    await page.setViewportSize({width:1024,height:680});
  };
  ok(await page.locator('#topic-grid [data-topic]').count()===7,'Seven picture topics including Ruhák');
  await fits('topics');
  await open('animals');
  ok(await page.locator('#cards-grid .card').count()===12,'Animals shows the twelve animal-book animals');
  await fits('dense animal cards');
  ok(await page.locator('#card-peek-start').isHidden(),'Kukucs waits until every card was heard');
  const ids=await page.locator('#cards-grid .card').evaluateAll(cards=>cards.map(card=>card.dataset.word));
  await page.locator('[data-word="abk_cow"]').click();
  await page.waitForFunction(()=>qaFetched.some(url=>url.includes('/audio/animals/cow.mp3')));
  ok(await page.evaluate(()=>qaFetched.some(url=>url.includes('abk_name_cow'))),'A book animal says its recorded name, then its own sound');
  ok(await page.locator('#card-followup').isHidden(),'Cards without a practice word do not offer word practice');
  await page.locator('[data-word="abk_cat"]').click();
  ok(await page.locator('#card-followup').isVisible(),'The book cat still opens the cica word practice');
  for(const id of ids)await page.locator(`#cards-grid [data-word="${id}"]`).click();
  ok(await page.locator('#card-peek-start').isVisible(),'Kukucs appears once every animal was heard');
  await page.locator('#card-peek-start').click();
  ok(await page.locator('#cards-grid').isHidden()&&await page.locator('.card-peek-choice').count()===3,'Kukucs asks with three pictures from the topic');
  await fits('Kukucs');
  let firstTry=0;
  for(let question=0;question<3;question++){
    await page.waitForFunction(done=>document.querySelectorAll('.card-peek-dots .is-done').length===done&&document.querySelectorAll('.card-peek-choice').length===3&&!document.querySelector('.card-peek-choice.is-found'),question,{timeout:15000});
    const choices=await page.locator('.card-peek-choice').evaluateAll(buttons=>buttons.map(button=>button.dataset.peekChoice));
    let misses=0;
    for(const id of choices){
      await page.locator(`[data-peek-choice="${id}"]`).click();
      if(await page.locator('.card-peek-choice.is-found').count())break;
      misses++;ok(await page.locator('.card-peek-choice.is-try').count()===1,'A wrong picture is marked and the asked word is repeated');
    }
    ok(await page.locator('.card-peek-choice.is-found').count()===1,'The heard picture is found');
    if(!misses)firstTry++;
  }
  await page.locator('#round-complete').waitFor({state:'visible',timeout:15000});
  ok((await page.locator('#complete-stars').innerText())==='⭐'.repeat(Math.max(1,firstTry)),'Stars count the first-try answers');
  await page.locator('#round-replay').click();
  ok(await page.locator('.card-peek-choice').count()===3,'Még egy ilyen starts a new Kukucs');
  await page.locator('[data-peek="close"]').click();
  ok(await page.locator('#cards-grid .card.is-seen').count()===12,'Back to the cards, heard cards stay marked');
  await open('clothes');
  ok(await page.locator('#screen-title').innerText()==='👕 Ruhák'&&await page.locator('#cards-grid .card').count()>=8,'Ruhák lists the dress-game clothes');
  await page.locator('[data-word="dress_polo"]').click();
  await page.waitForFunction(()=>qaFetched.some(url=>url.includes('dress_name_polo')));
  await open('food');
  ok(await page.locator('[data-word="r_korte"]').count()===1&&await page.locator('#cards-grid .card').count()===11,'Food adds recorded R-words');
  await fits('food cards');
  await page.locator('#back-button').click();
  ok(await page.locator('body').getAttribute('data-screen')==='topics','Back returns from the cards to the topics');
  if(errors.length)throw Error(errors.join('; '));
  return checks;
}
