// Run in a disposable playwright-cli session. Uses the real module and native
// recorder in a routed fixture; the narration adapter is observable/deterministic.
async page => {
  const checks=[],errors=[],ok=(value,text)=>{if(!value)throw Error(text);checks.push(text);};
  page.on('pageerror',error=>errors.push(error.message));
  const origin=new URL(page.url()).origin;
  await page.route('**/r-practice-upgrades-fixture',route=>route.fulfill({contentType:'text/html',body:'<!doctype html><html lang="hu"><head><meta name="viewport" content="width=device-width, initial-scale=1"><link rel="stylesheet" href="/r-practice.css"><style>body{margin:0;padding:12px;font-family:Arial,sans-serif}*{box-sizing:border-box}button,select{font:inherit}</style></head><body><section id="r-practice"></section></body></html>'}));
  await page.goto(origin+'/r-practice-upgrades-fixture');
  await page.evaluate(async()=>{
    localStorage.removeItem('beszedtanulas.rPractice.v1');
    const {setupRPractice}=await import('/r-practice-game.js');
    const {normalizeRProgress}=await import('/r-practice-data.js');
    window.qa={clips:[],progress:normalizeRProgress(),media:'normal',streams:0,closed:0,quiet:0,restarts:0,effects:[],roundAt:{},held:[],hold:false,urls:0,revoked:0};
    const originalCreate=URL.createObjectURL.bind(URL),originalRevoke=URL.revokeObjectURL.bind(URL);
    URL.createObjectURL=blob=>{qa.urls++;return originalCreate(blob);};
    URL.revokeObjectURL=url=>{qa.revoked++;originalRevoke(url);};
    const nativeStop=MediaStreamTrack.prototype.stop, tracks=new Map();
    Object.defineProperty(MediaStreamTrack.prototype,'stop',{configurable:true,value:function(){const owned=tracks.get(this.id);if(owned){tracks.delete(this.id);qa.closed++;owned.osc.stop();owned.context.close().catch(()=>{});}nativeStop.call(this);}});
    Object.defineProperty(MediaDevices.prototype,'getUserMedia',{configurable:true,value:async()=>{
      if(qa.media==='denied')throw new DOMException('denied','NotAllowedError');
      const context=new AudioContext(),osc=context.createOscillator(),dest=context.createMediaStreamDestination();
      osc.connect(dest);osc.start();await context.resume();qa.streams++;
      for(const track of dest.stream.getTracks())tracks.set(track.id,{osc,context});
      return dest.stream;
    }});
    let generation=0;
    qa.game=setupRPractice({effect:id=>qa.effects.push(id),quietEffects:()=>qa.quiet++,onRestart:()=>qa.restarts++,getProgress:()=>qa.progress,updateProgress:value=>{for(const id of Object.keys(value.games))if(value.games[id].rounds>qa.progress.games[id].rounds)qa.roundAt[id]=performance.now();qa.progress=value;},
      stopPlayback:()=>{generation++;qa.held.splice(0).forEach(resolve=>resolve(false));},
      speak:async(id,cue)=>{const token=generation;qa.clips.push({id,target:cue?.target,highlighted:Boolean(cue?.target&&document.querySelector(cue.target)?.classList.contains('rp-audio-focus'))});if(qa.hold)return new Promise(resolve=>qa.held.push(resolve));await new Promise(resolve=>setTimeout(resolve,15));return generation===token;},
      listen:async({onStart})=>{onStart();return{matched:true,transcript:'róka'};}});
    qa.game.start();
  });
  const root=page.locator('#r-practice');
  const idle=()=>page.waitForFunction(()=>{const data=document.querySelector('#r-practice').dataset;return data.phase==='idle'&&data.successPending==='false';});
  const action=name=>page.locator(`[data-action="${name}"]`).first();
  const click=async name=>{await action(name).click();await idle();};
  const enter=async id=>{if(await root.getAttribute('data-game')!=='hub')await click('hub');await page.locator(`[data-game="${id}"]`).click();await idle();};
  const pref=async(key,value)=>{await page.locator('.rp-settings').evaluate(node=>node.open=true);await page.locator(`[data-pref="${key}"]`).selectOption(String(value));await idle();await page.locator('.rp-settings').evaluate(node=>node.open=false);};
  const resetClips=()=>page.evaluate(()=>{qa.clips=[];});
  await enter('hunter');
  const target=await page.evaluate(()=>qa.clips.filter(c=>c.id.startsWith('r_word_')).at(-1).id.replace('r_word_',''));
  const wrong=await page.locator(`[data-choice]:not([data-choice="${target}"])`).first().getAttribute('data-choice');
  await resetClips();await page.locator(`[data-choice="${wrong}"]`).click();await idle();
  ok(await page.evaluate(()=>qa.clips.some(c=>c.id==='r_retry')&&qa.clips.some(c=>c.id.startsWith('r_word_'))),'First wrong choice actually replays the prompt');
  await resetClips();await page.locator(`[data-choice="${wrong}"]`).click();await idle();
  ok(await page.evaluate(()=>qa.clips[0].id==='r_compare'&&new Set(qa.clips.filter(c=>c.id.startsWith('r_word_')).map(c=>c.id)).size===2&&qa.clips.filter(c=>c.id.startsWith('r_word_')).every(c=>c.highlighted)),'Repeated error compares two candidate recordings with their pictures highlighted');
  await action('model').focus();await action('model').press('Enter');await idle();
  ok(await action('model').evaluate(node=>document.activeElement===node),'Keyboard focus returns to the model button after playback rerenders');
  await pref('hunterKind','sound');await resetClips();
  const soundWrong=await page.locator('[data-choice]').evaluateAll(nodes=>nodes.find(node=>!node.textContent.includes('r')).dataset.choice);
  for(let i=0;i<2;i++){await page.locator(`[data-choice="${soundWrong}"]`).click();await idle();}
  ok(await page.evaluate(()=>qa.clips.some(c=>c.id==='r_compare')),'R-sound hunting also gives the guided comparison after repeated errors');
  await page.locator('[data-hunter-kind="position"]').click();await idle();
  const previous=[];
  for(let i=0;i<3;i++){
    const id=await page.locator('.rp-target').getAttribute('data-word');previous.push(id);
    const positions=await page.evaluate(async id=>{const m=await import('/r-practice-data.js');return m.rSoundPositions(m.R_WORDS.find(w=>w.id===id).text);},id);
    await page.locator(`[data-r-location="${positions[0]}"]`).click();await idle();
    ok(await page.locator('.rp-position-train .is-found').count()===positions.length,'Every valid R position remains accepted');
    await click('hunter-next');
  }
  await click('restart');ok(!previous.includes(await page.locator('.rp-target').getAttribute('data-word')),'Main fresh-word selection survives restart');
  await enter('post');
  // Each house wishes for one parcel; the parcel must reach the friend who asked for it.
  const wished=()=>page.evaluate(async()=>{const m=await import('/r-practice-data.js');const id=document.querySelector('#r-practice .rp-target').dataset.word,text=m.R_WORDS.find(w=>w.id===id).text;return [...document.querySelectorAll('#r-practice [data-deliver]')].find(b=>b.getAttribute('aria-label').includes(`ezt kéri: ${text}`)).dataset.deliver;});
  const deliverAll=async()=>{const total=await page.locator('.rp-mission-items span').count();for(let i=0;i<total;i++){await click('advance');await page.locator(`[data-deliver="${await wished()}"]`).click();if(i<total-1)await idle();}return total;};
  ok(await page.locator('.rp-mission-items span').count()===2&&await page.locator('.rp-wish:not(.is-empty)').count()===2,'Post opens a two-parcel mission and two houses show their wishes');
  await click('advance');ok(await page.locator('[data-deliver]').count()===3&&await page.locator('.rp-parcel').count()===0,'Speaking prepares the parcel without delivering it automatically');
  const house=await wished(),wrongHouse=['fox','bear','rabbit'].find(id=>id!==house);
  await page.locator(`[data-deliver="${wrongHouse}"]`).click();await idle();
  ok(await page.locator('.rp-parcel').count()===0&&await page.locator(`[data-deliver="${wrongHouse}"].is-try`).count()===1,'A parcel taken to the wrong house stays with Robot');
  await page.locator(`[data-deliver="${house}"]`).focus();await page.locator(`[data-deliver="${house}"]`).press('Enter');await idle();
  ok(await page.locator('.rp-parcel').count()===1,'Keyboard delivery sends the parcel to the friend who asked for it');
  await click('advance');await page.locator(`[data-deliver="${await wished()}"]`).click();await idle();
  ok(await page.locator('.rp-finish').count()===1&&await page.locator('.rp-parcel').count()===2,'Both delivered parcels remain visible in the finished mission');
  ok(await page.evaluate(()=>performance.now()-qa.roundAt.post>=1000),'Final post display waits for the full one-second success delay');
  await click('restart');await deliverAll();
  ok(await root.getAttribute('data-success-pending')==='true'&&await page.locator('.rp-finish').count()===0,'The last delivered parcel remains on screen before completion');
  await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:true});Object.defineProperty(document,'visibilityState',{configurable:true,value:'hidden'});document.dispatchEvent(new Event('visibilitychange'));});
  await page.waitForTimeout(1100);ok(await root.getAttribute('data-success-pending')==='true','Hidden time does not consume the success delay');
  await page.evaluate(()=>{delete document.hidden;delete document.visibilityState;document.dispatchEvent(new Event('visibilitychange'));});await idle();
  await click('restart');ok(await deliverAll()===3&&await page.locator('.rp-wish:not(.is-empty)').count()===3,'After two missions Robot carries three parcels for three wishes');
  await click('hub');await resetClips();await page.waitForTimeout(1100);
  ok(await root.getAttribute('data-game')==='hub'&&!await page.evaluate(()=>qa.clips.some(c=>c.id==='r_round_done')),'Leaving cancels the delayed completion sound');
  await enter('workshop');await page.locator('[data-stamp="star"]').click();await click('advance');await page.locator('[data-decoration="heart"]').click();
  await page.locator('[data-place="4"]').press('Enter');await idle();
  ok((await page.locator('[data-place="4"]').getAttribute('aria-label')).includes('szív'),'Child chooses a heart and places it with the keyboard');
  ok(await page.locator('[data-place="4"]').evaluate(node=>node.classList.contains('rp-stamp-star')),'Main stamp style is retained on the child-placed decoration');
  await page.locator('[data-position="final"]').click();await idle();
  ok((await page.locator('[data-place="4"]').getAttribute('aria-label')).includes('szív'),'Changing word groups preserves placed decorations');
  await click('advance');await page.locator('[data-decoration="flower"]').click();await page.locator('[data-place="4"]').click();await idle();
  ok((await page.locator('[data-place="4"]').getAttribute('aria-label')).includes('virág'),'A chosen occupied decoration slot can be changed');
  await enter('rhyme');await page.locator('[data-rhyme="3"]').click();await idle();
  await page.locator('[data-rhyme-practice]').selectOption('repeat');await idle();await page.locator('[data-rhyme-short]').check();await idle();
  await resetClips();await click('model');
  ok(await page.evaluate(()=>qa.clips.some(c=>c.id==='r_rhyme_part_robot_0_0')),'Short rhyme units use their own static clip');
  const before=await page.locator('.rp-rhyme-current h3').innerText();await page.waitForTimeout(150);
  ok(await page.locator('.rp-rhyme-current h3').innerText()===before&&await action('listen').count()===0,'Listen-repeat waits for manual continuation without requiring a microphone');
  for(let i=0;i<8;i++)await click('rhyme-repeat-next');
  ok(await page.locator('.rp-rhyme-complete').count()===1,'Eight short parts complete the four-line rhyme');
  await click('story-open');
  await page.setViewportSize({width:375,height:844});
  ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+2),'Rhyme picture story fits a phone screen');
  await page.screenshot({path:'output/playwright/r-upgrade-story.png',fullPage:true,animations:'disabled'});
  for(const id of [1,0,2,3]){await page.locator(`[data-story="${id}"]`).click();await idle();}
  ok((await page.locator('#rp-status').innerText()).includes('más sorrendben'),'Wrong picture order offers a retry');
  await click('story-restart');
  for(const id of [0,1,2,3]){await page.locator(`[data-story="${id}"]`).click();await idle();}
  ok((await page.locator('.rp-rhyme-complete').innerText()).includes('Sorba'),'Picture story can be completed in the correct order');
  await enter('rhyme');await page.locator('[data-rhyme-mode="missing"]').click();await idle();
  for(let r=0;r<4;r++){
    await page.locator(`[data-rhyme="${r}"]`).click();await idle();
    for(let line=0;line<4;line++){
      const gap=await page.evaluate(async({r,line})=>{const m=await import('/r-practice-data.js');return m.rhymeGap(m.R_RHYMES[r].id,line);},{r,line});
      await page.locator(`[data-gap-choice="${gap.word.id}"]`).click();await idle();
      ok(await page.locator('.rp-gap-blank').innerText()===gap.missing,'Main missing-word puzzle restores the inflected word');
      await click('rhyme-next');
    }
  }
  await click('story-open');ok(await page.locator('.rp-story').count()===1,'Story ordering also opens after a missing-word rhyme');
  await page.locator('[data-rhyme-mode="say"]').click();await idle();
  await enter('echo');await action('record').click();await page.waitForFunction(()=>document.querySelector('#r-practice').dataset.phase==='recording');await page.waitForTimeout(450);await click('record-finish');
  ok(await action('replay').isEnabled(),'Native recorder produces a playable local recording');
  await page.evaluate(()=>qa.media='denied');await click('record');
  ok(await action('replay').isEnabled()&&(await page.locator('#rp-status').innerText()).includes('korábbi'),'Failed replacement retains the prior recording and explains it');
  await page.evaluate(()=>qa.media='normal');await action('record').click();await page.waitForFunction(()=>document.querySelector('#r-practice').dataset.phase==='recording');await click('stop');
  ok(await action('replay').isEnabled(),'Cancelled replacement retains the prior recording');
  await resetClips();await action('compare').click();await idle();
  ok(await page.evaluate(()=>qa.clips[0].id==='r_echo_compare'&&qa.clips.some(c=>c.id.startsWith('r_word_'))&&qa.clips.at(-1).id==='r_echo_yours'&&qa.urls===qa.revoked),'One-button comparison plays model then own native audio and releases its URL');
  await page.evaluate(()=>qa.hold=true);await action('compare').click();
  await page.waitForFunction(()=>qa.held.length===1);const urls=await page.evaluate(()=>qa.urls);
  await click('hub');await page.evaluate(()=>qa.hold=false);
  ok(await page.evaluate(()=>qa.urls)===urls,'Leaving during comparison never starts a stale replay');
  await enter('echo');ok(!await action('replay').isEnabled(),'Leaving the game discards the ephemeral recording');
  await action('record').click();await page.waitForFunction(()=>document.querySelector('#r-practice').dataset.phase==='recording');await page.waitForTimeout(350);await click('record-finish');
  await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'));});
  ok(!await action('replay').isEnabled(),'Hiding the page clears the local recording');
  await page.evaluate(()=>{delete document.hidden;document.dispatchEvent(new Event('visibilitychange'));});
  ok(await page.evaluate(()=>qa.streams===qa.closed),'All owned native microphone streams were stopped');
  ok(await page.evaluate(()=>qa.quiet>=3&&qa.restarts>0&&['collect','serve','snap','success'].every(id=>qa.effects.includes(id))),'Main quiet microphone, game effects, and restart hooks remain integrated');
  const checkLayout=async(label)=>{
    const sizes=await root.evaluate(node=>({overflow:document.documentElement.scrollWidth>innerWidth+2,small:[...node.querySelectorAll('button')].filter(b=>b.getClientRects().length&&!b.closest('details:not([open])')&&(b.getBoundingClientRect().width<44||b.getBoundingClientRect().height<44)).map(b=>b.textContent.trim())}));
    ok(!sizes.overflow&&!sizes.small.length,label+' has no horizontal overflow and controls ≥44px '+JSON.stringify(sizes));
  };
  for(const width of [375,834]){
    await page.setViewportSize({width,height:844});
    for(const game of ['hunter','post','workshop','rhyme','echo']){await enter(game);if(game==='post'||game==='workshop')await click('advance');await checkLayout(game+' '+width);if(width===375)await page.screenshot({path:`output/playwright/r-upgrade-${game}.png`,fullPage:true,animations:'disabled'});}
  }
  ok(!errors.length,'No browser page errors: '+errors.join('; '));
  return {count:checks.length,checks};
}
