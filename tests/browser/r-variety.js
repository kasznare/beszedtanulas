// Exercise the new choices with real offline MP3s and a synthetic local microphone.
// Run only in a disposable playwright-cli session. No personal storage or microphone.
async parent => {
  const context=await parent.context().browser().newContext(),page=await context.newPage(),checks=[],errors=[];
  const ok=(value,label)=>{if(!value)throw Error(label);checks.push(label);};
  page.on('pageerror',error=>errors.push(error.message));
  await context.route('https://cdn.jsdelivr.net/**',r=>r.fulfill({contentType:'text/javascript',body:''}));
  await context.addInitScript(()=>{
    window.rVarietyQA={starts:[],played:[],events:[],streams:[],revoked:[],uploads:[]};
    document.addEventListener('narrationstart',e=>{rVarietyQA.starts.push(e.detail.id);rVarietyQA.events.push({kind:'model',id:e.detail.id});});
    const play=HTMLMediaElement.prototype.play;
    HTMLMediaElement.prototype.play=function(){rVarietyQA.played.push(this.src);if(this.src.startsWith('blob:'))rVarietyQA.events.push({kind:'recording',url:this.src});return play.call(this);};
    const revoke=URL.revokeObjectURL.bind(URL);
    URL.revokeObjectURL=url=>{rVarietyQA.revoked.push(url);revoke(url);};
    const fetch=window.fetch;
    window.fetch=(...args)=>{if(args[1]?.method&&args[1].method!=='GET')rVarietyQA.uploads.push(String(args[0]));return fetch(...args);};
    const stop=MediaStreamTrack.prototype.stop,oscillators=new Map();
    MediaStreamTrack.prototype.stop=function(){const record=oscillators.get(this.id);if(record){oscillators.delete(this.id);record.osc.stop();record.audioContext.close().catch(()=>{});}stop.call(this);};
    Object.defineProperty(MediaDevices.prototype,'getUserMedia',{configurable:true,value:async()=>{
      const audioContext=new AudioContext(),destination=audioContext.createMediaStreamDestination(),osc=audioContext.createOscillator();
      osc.connect(destination);osc.start();await audioContext.resume();
      for(const track of destination.stream.getTracks())oscillators.set(track.id,{osc,audioContext});
      rVarietyQA.streams.push(destination.stream);return destination.stream;
    }});
  });
  try {
    await page.goto(parent.url());
    await page.waitForFunction(()=>document.querySelector('#offline-status').textContent.startsWith('Letöltve.'),undefined,{timeout:60000});
    const data=await page.evaluate(async()=>{const m=await import('./r-practice-data.js');return {words:m.R_WORDS,rhymes:m.R_RHYMES,gaps:m.R_RHYMES.map(r=>r.lines.map((_,i)=>m.rhymeGap(r.id,i)))};});
    const root=page.locator('#r-practice'),idle=()=>page.locator('#r-practice[data-phase="idle"][data-success-pending="false"]').waitFor({timeout:40000});
    const hub=async()=>{if(await root.getAttribute('data-game')!=='hub')await page.locator('#r-practice [data-action="hub"]').first().click();};
    const enter=async id=>{await hub();await page.locator(`#r-practice [data-game="${id}"]`).click();await idle();};
    const target=()=>page.locator('.rp-target').getAttribute('data-word');
    const rounds=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('speech_game_progress_v1')).rPractice.games);
    const shots=async name=>{
      for(const view of [{width:375,height:667},{width:932,height:350},{width:834,height:1194},{width:1194,height:834}]){
        await page.setViewportSize(view);
        const metrics=await root.evaluate(node=>({overflow:document.documentElement.scrollWidth>innerWidth+2,small:[...node.querySelectorAll('button')].filter(b=>b.getClientRects().length&&!b.closest('details:not([open])')&&(b.getBoundingClientRect().width<43||b.getBoundingClientRect().height<43)).map(b=>b.textContent.trim())}));
        ok(!metrics.overflow&&!metrics.small.length,`${name}: ${view.width}×${view.height} fits with ≥44px controls ${JSON.stringify(metrics)}`);
        await page.evaluate(()=>scrollTo(0,0));await page.screenshot({path:`output/playwright/r-variety-${name}-${view.width}.png`,fullPage:true,animations:'disabled'});
      }
      await page.setViewportSize({width:390,height:844});
    };
    await page.locator('#home [data-open="practice-menu"]').click();await page.locator('#practice-menu [data-open="r-practice"]').click();
    ok(await page.locator('[data-action="surprise"]').isVisible(),'The hub offers a surprise adventure');
    await enter('hunter');
    ok(await page.locator('[data-hunter-kind]').count()===3,'All three hunter modes are available to the child');
    await page.locator('[data-hunter-kind="position"]').click();await idle();await shots('position');
    const oldTargets=[];
    for(let i=0;i<3;i++){
      const id=await target();oldTargets.push(id);
      const positions=await page.evaluate(async id=>{const m=await import('./r-practice-data.js');return m.rSoundPositions(m.R_WORDS.find(w=>w.id===id).text);},id);
      ok(await page.locator('[data-action="hunter-next"]').isDisabled(),'Position task waits for a found R location');
      if(i===0){
        const wrong=['initial','medial','final'].find(p=>!positions.includes(p));
        await page.locator(`[data-r-location="${wrong}"]`).click();await idle();
        ok(await page.locator('.rp-position-train .is-try').count()===1&&await page.locator('[data-action="hunter-next"]').isDisabled(),'A different R location can be tried again');
      }
      await page.locator(`[data-r-location="${positions[0]}"]`).click();await idle();
      ok(await page.locator('.rp-position-train .is-found').count()===positions.length,'All valid locations are shown, including words with multiple Rs');
      await page.locator('[data-action="hunter-next"]').click();await idle();
    }
    ok(await page.locator('.rp-finish').isVisible(),'The position hunt completes a round');
    await page.locator('[data-action="restart"]').click();await idle();
    ok(!oldTargets.includes(await target()),'Restart brings a word outside the previous round');
    await page.locator('[data-hunter-kind="sound"]').click();await idle();
    ok(await page.locator('[data-sound]').count()===2,'R sound choices still have their own listening buttons');
    await enter('post');await shots('recipients');
    const sent=[];
    ok(await page.locator('[data-house]').count()===2,'Two houses show the parcel their friend wishes for');
    const houseLabel=text=>page.evaluate(text=>[...document.querySelectorAll('#r-practice .rp-recipient-picker button')].find(b=>b.getAttribute('aria-label').includes(`ezt kéri: ${text}`)).getAttribute('aria-label'),text);
    for(let parcel=0;parcel<2;parcel++){
      const id=await target(),word=data.words.find(w=>w.id===id);sent.push(id);
      await page.locator('[data-action="advance"]').evaluate(button=>{button.click();button.click();});await idle();
      const friend=await page.evaluate(text=>[...document.querySelectorAll('[data-deliver]')].find(b=>b.getAttribute('aria-label').includes(`ezt kéri: ${text}`)).dataset.deliver,word.text);
      await page.locator(`[data-deliver="${friend}"]`).evaluate(button=>{button.click();button.click();});await idle();
      const label=await houseLabel(word.text);
      ok(label.includes(`megkapta: ${word.text}`)&&label.split(word.text).length===3,'The parcel reaches the friend who wished for it, once');
    }
    ok((await rounds()).post.rounds===1&&await page.locator('.rp-mailbox small').count()===2,'Two linked deliveries complete exactly one round and stay visible');
    await page.locator('[data-action="restart"]').click();await idle();ok(!sent.includes(await target()),'The next post round brings fresh words');
    await page.locator('[data-action="advance"]').click();await hub();const beforeCancel=await page.evaluate(()=>rVarietyQA.starts.length);
    await page.waitForTimeout(1100);ok(await root.getAttribute('data-game')==='hub'&&await page.evaluate(n=>rVarietyQA.starts.length===n,beforeCancel),'Leaving during delivery cancels its delayed next sample');
    await enter('workshop');await shots('stamps');
    for(const [index,stamp] of ['flower','star','leaf'].entries()){
      await page.locator(`[data-stamp="${stamp}"]`).click();await page.locator('[data-action="advance"]').click();await idle();
      await page.locator('[data-decoration="heart"]').click();await page.locator(`[data-place="${index}"]`).click();await idle();
      ok(await page.locator(`.rp-decoration.is-decorated.rp-stamp-${stamp}`).count()===1,`${stamp} decoration keeps its chosen shape`);
    }
    ok(await page.locator('.rp-finish').isVisible()&&await page.locator('.rp-decoration.is-decorated').count()===3,'The finished workshop keeps all chosen decorations');
    await enter('rhyme');await page.locator('[data-rhyme-mode="missing"]').click();await idle();await shots('missing');
    for(let r=0;r<4;r++){
      let mark=await page.evaluate(()=>rVarietyQA.starts.length);
      await page.locator(`[data-rhyme="${r}"]`).click();await idle();
      for(let i=0;i<4;i++){
        const gap=data.gaps[r][i];
        ok((await page.locator('.rp-gap-blank').innerText())==='…'&&await page.locator('[data-action="rhyme-next"]').isDisabled(),`${data.rhymes[r].id} line ${i+1} hides its missing word`);
        ok(await page.locator('[data-gap-choice]').count()===3,'Each missing word offers three picture choices');
        if(r===0&&i===0){
          await page.locator(`[data-gap-choice]:not([data-gap-choice="${gap.word.id}"])`).first().click();await idle();
          ok(await page.locator('.rp-gap-choices .is-try').count()===1&&await page.locator('[data-action="rhyme-next"]').isDisabled(),'A wrong missing word offers another try');
        }
        const start=await page.evaluate(()=>rVarietyQA.starts.length);
        await page.locator(`[data-gap-choice="${gap.word.id}"]`).click();await idle();
        ok((await page.locator('.rp-gap-blank').innerText())===gap.missing&&await page.locator('.rp-gap-choices .is-found').count()===1,'The chosen image restores the inflected word in its sentence');
        ok(await page.evaluate(({start,voice})=>rVarietyQA.starts.slice(start).includes(voice),{start,voice:gap.voice}),'The found word has its own Jessa sample before the complete line');
        ok(await page.evaluate(({mark,start,line,model})=>{const heard=rVarietyQA.starts.slice(mark,start);return !heard.includes(line)&&heard.includes(model);},{mark,start,line:gap.lineClip,model:gap.modelClip})&&await page.evaluate(({start,line})=>rVarietyQA.starts.slice(start).includes(line),{start,line:gap.lineClip}),'The model plays the other half of the line; the full line with the hidden word follows only after it was found');
        mark=await page.evaluate(()=>rVarietyQA.starts.length);
        await page.locator('[data-action="rhyme-next"]').click();await idle();
      }
      ok(await page.locator('.rp-rhyme-complete').isVisible(),`${data.rhymes[r].id}: all four gaps finish`);
    }
    ok((await rounds()).rhyme.rounds===4,'All four puzzles report exactly one completed round each');
    await page.locator('[data-rhyme-mode="say"]').click();await idle();ok(await page.locator('[data-line]').count()===4,'Full-line practice remains available');
    await enter('echo');await shots('compare');
    ok(await page.locator('[data-action="compare"]').isDisabled(),'Comparison waits for a recording');
    await page.locator('[data-action="record"]').click();await page.locator('#r-practice[data-phase="recording"]').waitFor();await page.waitForTimeout(900);
    await page.locator('[data-action="record-finish"]').click();await idle();
    ok(await page.locator('[data-action="compare"]').isEnabled()&&await page.evaluate(()=>rVarietyQA.streams.every(s=>s.getTracks().every(t=>t.readyState==='ended'))),'A real local recording enables comparison and releases the microphone');
    const played=await page.evaluate(()=>rVarietyQA.events.length);
    await page.locator('[data-action="compare"]').click();await page.locator('#r-practice[data-phase="replay"]').waitFor();await idle();
    const pair=await page.evaluate(n=>rVarietyQA.events.slice(n),played);
    ok(pair.length===4&&pair[0].id==='r_echo_compare'&&pair[1].kind==='model'&&pair[1].id.startsWith('r_word_')&&pair[2].id==='r_echo_yours'&&pair[3].kind==='recording','Comparison plays Jessa first, then the native recording');
    ok(await page.evaluate(url=>rVarietyQA.revoked.includes(url),pair.at(-1).url),'Comparison releases its Blob URL when finished');
    const beforeStop=await page.evaluate(()=>rVarietyQA.played.length);
    await page.locator('[data-action="compare"]').click();await page.locator('[data-action="stop"]').click();await page.waitForTimeout(2000);
    ok(await root.getAttribute('data-phase')==='idle'&&await page.evaluate(n=>!rVarietyQA.played.slice(n).some(url=>url.startsWith('blob:')),beforeStop),'Stopping the model prevents a delayed recording replay');
    await page.locator('[data-action="echo-next"]').click();await idle();ok(await page.locator('[data-action="compare"]').isDisabled(),'Changing the sample discards the previous recording');
    await hub();await page.locator('[data-action="surprise"]').click();await idle();ok(await root.getAttribute('data-game')!=='echo','Surprise chooses another adventure');
    await hub();await page.locator('[data-action="surprise"]').click();await idle();ok(await root.getAttribute('data-game')!=='hub','Surprise continues directly into a game');
    await context.setOffline(true);
    await enter('hunter');await page.locator('[data-hunter-kind="position"]').click();await idle();ok(await page.locator('#voice-status').isVisible()===false,'New position prompts work offline');
    await enter('rhyme');await page.locator('[data-rhyme-mode="missing"]').click();await idle();ok(await page.locator('.rp-gap-choices').isVisible()&&!await page.locator('#voice-status').isVisible(),'Missing-word puzzles work offline');
    await context.setOffline(false);
    ok(await page.evaluate(()=>!rVarietyQA.uploads.length),'The new game choices and recording comparison send no upload');
    ok(!errors.length,'No browser script errors: '+errors.join('; '));
    return {count:checks.length,checks};
  } catch(error) {
    const state=await page.evaluate(()=>({game:document.querySelector('#r-practice')?.dataset,status:document.querySelector('#rp-status')?.textContent,hidden:document.hidden,visibility:document.visibilityState})).catch(()=>({closed:true}));
    await page.screenshot({path:'output/playwright/r-variety-failure.png',fullPage:true}).catch(()=>{});
    throw Error(`${error.message}; after ${checks.length} checks, last: ${checks.at(-1)}; ${JSON.stringify(state)}`);
  } finally {await context.close();}
}
