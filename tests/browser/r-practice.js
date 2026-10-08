// Disposable HEADLESS playwright-cli session; never runs against personal browser storage.
async page => {
  const checks=[],errors=[],context=page.context(),ok=(value,text)=>{if(!value)throw Error(text);checks.push(text);};
  page.on('pageerror',error=>errors.push(error.message));
  await context.setOffline(false);
  await page.route('https://cdn.jsdelivr.net/**',r=>r.fulfill({contentType:'text/javascript',body:''}));
  await page.evaluate(async()=>{localStorage.clear();for(const r of await navigator.serviceWorker.getRegistrations())await r.unregister();for(const k of await caches.keys())await caches.delete(k);});
  await page.addInitScript(()=>{
    window.rQA={speech:'',scenario:'normal',media:'normal',requests:0,stops:0,instances:[],urls:[],revoked:[],pending:[],mediaTracks:new Map()};
    class Recognition {
      constructor(){rQA.instances.push(this);this.timers=[];}
      start(){this.timers.push(setTimeout(()=>{this.onstart?.();if(rQA.scenario==='pending')return;this.timers.push(setTimeout(()=>{
        if(rQA.scenario==='network'){this.onerror?.({error:'network'});return;}
        const result=[{transcript:rQA.speech,confidence:.9}];result.isFinal=true;
        this.onresult?.({results:[result]});this.onend?.();
      },500));},120));}
      abort(){this.timers.forEach(clearTimeout);}
      stop(){this.onend?.();}
    }
    window.SpeechRecognition=Recognition;window.webkitSpeechRecognition=Recognition;
    // WebKit can recreate native wrappers; observe cleanup through the prototype and track id.
    const stopTrack=MediaStreamTrack.prototype.stop;
    Object.defineProperty(MediaStreamTrack.prototype,'stop',{configurable:true,value:function(){
      const record=rQA.mediaTracks.get(this.id);
      if(record&&!record.closed){record.closed=true;rQA.stops++;record.osc.stop();record.context.close().catch(()=>{});}
      stopTrack.call(this);
    }});
    const makeStream=()=>{
      const C=window.AudioContext||window.webkitAudioContext,c=new C(),destination=c.createMediaStreamDestination(),osc=c.createOscillator(),gain=c.createGain();
      gain.gain.value=.25;osc.connect(gain);gain.connect(destination);osc.start();
      c.resume().catch(error=>{if(c.state!=='closed')throw error;});
      const stream=destination.stream,record={closed:false,osc,context:c};
      for(const track of stream.getTracks())rQA.mediaTracks.set(track.id,record);
      return stream;
    };
    Object.defineProperty(MediaDevices.prototype,'getUserMedia',{configurable:true,value:async()=>{
      rQA.requests++;if(rQA.media==='denied')throw new DOMException('denied','NotAllowedError');
      if(rQA.media==='pending')return new Promise(resolve=>rQA.pending.push(()=>resolve(makeStream())));
      return makeStream();
    }});
    const create=URL.createObjectURL.bind(URL),revoke=URL.revokeObjectURL.bind(URL);
    URL.createObjectURL=blob=>{const url=create(blob);rQA.urls.push(url);return url;};
    URL.revokeObjectURL=url=>{rQA.revoked.push(url);revoke(url);};
  });
  await page.reload();
  const root=page.locator('#r-practice'),idle=()=>page.locator('#r-practice[data-phase="idle"]').waitFor({timeout:40000});
  const status=()=>page.locator('#rp-status').innerText();
  const hub=async()=>{if(await root.getAttribute('data-game')!=='hub')await page.locator('#r-practice [data-action="hub"]').first().click();};
  const enter=async id=>{await hub();await page.locator(`[data-game="${id}"]`).click();await idle();};
  const prefs=async(key,value)=>{await page.locator('.rp-settings').evaluate(node=>node.open=true);await page.locator(`[data-pref="${key}"]`).selectOption(String(value));await idle();await page.locator('.rp-settings').evaluate(node=>node.open=false);};
  const open=async()=>{await page.getByRole('button',{name:'Mondd utánam',exact:true}).click();await page.locator('#practice-menu [data-open="r-practice"]').click();};
  await open();ok(await page.locator('.rp-game-card').count()===5,'Five complete games are reachable from Mondd utánam');
  const words=await page.evaluate(async()=>{const m=await import('./r-practice-data.js');return m.R_WORDS;});
  const views=[{width:375,height:667},{width:932,height:350},{width:834,height:1194},{width:1194,height:834}];
  for(const game of ['hunter','post','workshop','rhyme','echo']){
    await enter(game);
    for(const view of views){
      await page.setViewportSize(view);
      const metrics=await root.evaluate(node=>({overflow:document.documentElement.scrollWidth>window.innerWidth+2,small:[...node.querySelectorAll('button')].filter(b=>b.getClientRects().length&&!b.closest('details:not([open])')&&(b.getBoundingClientRect().width<43||b.getBoundingClientRect().height<43)).map(b=>b.textContent.trim())}));
      ok(!metrics.overflow&&!metrics.small.length,`${game}: ${view.width}×${view.height} has no horizontal overflow and ≥44px controls ${JSON.stringify(metrics)}`);
      await page.evaluate(()=>window.scrollTo(0,0));await page.screenshot({path:`output/playwright/r-${game}-${view.width}.png`,fullPage:view.height>400,animations:'disabled'});
    }
  }
  await page.setViewportSize({width:390,height:844});
  await enter('hunter');
  let sawRetry=false;
  for(let i=0;i<3;i++){
    for(const choice of await page.locator('[data-choice]').all()){
      await choice.click();if(await page.locator('.is-found').count())break;
      sawRetry=true;ok((await status()).includes('újra'),'Wrong picture gives another listening opportunity');
    }
    await idle();ok(await page.locator('.is-found').count()===1,`Hunter picture ${i+1} completes`);
    await page.locator('[data-action="hunter-next"]').click();await idle();
  }
  ok(await page.locator('.rp-finish').count()===1,'Hunter round has a finished state');
  await hub();await prefs('hunterKind','sound');await prefs('choices',3);await prefs('position','final');await prefs('roundLength',5);await enter('hunter');
  ok(await page.locator('[data-choice]').count()===3,'Sound hunting offers three pictures');
  const labels=await page.locator('[data-choice]').allTextContents(),rIndex=labels.findIndex(text=>text.includes('r'));
  ok(labels.filter(text=>text.includes('r')).length===1,'Only one sound-hunting word contains R');
  await page.locator('[data-choice]').nth(rIndex).click();await idle();ok(await page.locator('.is-found').count()===1,'Sound hunting accepts the R word');
  await hub();await prefs('position','all');await prefs('roundLength',3);await enter('post');
  ok(await page.locator('[data-action="listen"]').count()===0,'Together mode requests no microphone');
  for(let i=0;i<3;i++){await page.locator('[data-action="advance"]').click();await idle();}
  ok(await page.locator('.rp-finish').count()===1,'Robotpostás delivers all parcels');
  await hub();await enter('workshop');
  for(const position of ['initial','medial','final']){
    await page.locator(`[data-position="${position}"]`).click();await idle();
    const id=await page.locator('.rp-target').getAttribute('data-word');
    ok(words.find(word=>word.id===id).position===position,`Workshop uses the selected ${position} word group`);
  }
  for(let i=0;i<3;i++){await page.locator('[data-action="advance"]').click();await idle();}
  ok(await page.locator('.rp-decoration.is-decorated').count()===3,'Workshop visibly keeps all three decorations');
  ok(await page.locator('.rp-finish').count()===1,'Perecműhely completes');
  await hub();await enter('rhyme');
  ok(await page.locator('[data-rhyme]').count()===4&&await page.locator('[data-line]').count()===4,'Four original rhymes have four selectable lines');
  await page.locator('[data-action="rhyme-all"]').click();await idle();ok((await status()).includes('sort'),'Whole rhyme plays through and returns to line practice');
  for(let i=0;i<4;i++){await page.locator('[data-action="advance"]').click();await idle();}
  ok(await page.locator('.rp-rhyme-line.is-practiced').count()===4,'All rhyme lines marked as practiced');
  ok(await page.locator('.rp-rhyme-complete').count()===1,'Rhyme reaches its completed state');
  const beforeRepeat=await page.evaluate(()=>JSON.parse(localStorage.getItem('speech_game_progress_v1')).rPractice.games.rhyme.rounds);
  await page.locator('[data-line="0"]').click();await idle();await page.locator('[data-action="advance"]').click();await idle();
  ok(await page.evaluate(()=>JSON.parse(localStorage.getItem('speech_game_progress_v1')).rPractice.games.rhyme.rounds)===beforeRepeat,'Revisiting a completed rhyme line does not duplicate the round');
  // Actual shared recognition adapter with a controlled engine, no microphone or cloud request.
  await hub();await prefs('speechMode','words');await prefs('target','phrase');await enter('post');
  let target=await page.locator('.rp-target h3').innerText();
  await page.evaluate(text=>{rQA.speech=text;rQA.scenario='normal';},target);
  await page.locator('[data-action="listen"]').click();await page.locator('#r-practice[data-phase="listening"]').waitFor();await idle();
  ok((await status()).includes('felismerte')&&await page.locator('[data-action="advance"]').isEnabled(),'Recognized full phrase enables the next step without an articulation score');
  ok((await page.locator('.rp-transcript').innerText()).includes(target),'Transcript is displayed');
  await page.locator('[data-action="advance"]').click();await idle();
  await page.evaluate(()=>{rQA.speech='banán';});await page.locator('[data-action="listen"]').click();await idle();
  ok(!await page.locator('[data-action="advance"]').isEnabled()&&(await status()).includes('Más szót'),'Unrelated recognized word does not automatically advance');
  await page.locator('[data-action="confirm"]').click();await idle();ok(await page.locator('.rp-parcel').count()===2,'Adult can continue after uncertain recognition');
  await page.evaluate(()=>{rQA.scenario='network';});await page.locator('[data-action="listen"]').click();await idle();
  ok((await status()).includes('internetkapcsolat')&&await page.locator('[data-action="confirm"]').isEnabled(),'Recognition network error has a together-mode recovery');
  await page.evaluate(()=>{rQA.scenario='pending';});await page.locator('[data-action="listen"]').click();await page.locator('#r-practice[data-phase="listening"]').waitFor();
  const lateStart=await page.evaluate(()=>{const r=rQA.instances.at(-1);window.savedRStart=r.onstart;return true;});
  await page.locator('[data-action="stop"]').click();await idle();await page.evaluate(()=>savedRStart?.());
  ok(await root.getAttribute('data-phase')==='idle','Late recognition start cannot restart a stopped attempt');
  await page.evaluate(()=>{window.SpeechRecognition=undefined;window.webkitSpeechRecognition=undefined;});await page.locator('[data-action="listen"]').click();await idle();
  ok((await status()).includes('nincs beszédfelismerés'),'Unsupported speech engine gives an explicit fallback');
  await hub();await prefs('speechMode','encouraging');await prefs('target','word');await enter('workshop');
  await page.locator('[data-action="listen"]').click();await page.locator('#r-practice[data-phase="listening"]').waitFor();await idle();
  ok((await status()).includes('Hangot hallottam'),'Encouraging mode detects the synthetic local sound without assigning R correctness');
  ok(await page.evaluate(()=>rQA.stops===rQA.requests),'Voice activity detector releases its own stream');
  await hub();await enter('echo');
  ok(await page.locator('[data-action="record"]').isEnabled(),'Native MediaRecorder is available');
  await page.locator('[data-action="record"]').click();await page.locator('#r-practice[data-phase="recording"]').waitFor();
  await page.waitForTimeout(1000);await page.screenshot({path:'output/playwright/r-echo-recording.png',fullPage:true,animations:'disabled'});
  await page.locator('[data-action="record-finish"]').click();await idle();
  ok(await page.locator('[data-action="replay"]').isEnabled(),'Recorded native audio is available for local playback');
  ok(await page.evaluate(()=>rQA.stops===rQA.requests),'Recording finish turns off the microphone');
  await page.locator('[data-action="replay"]').click();await page.locator('#r-practice[data-phase="replay"]').waitFor();await idle();
  ok((await status()).includes('Visszahallgattuk'),'Native recorded audio plays and finishes');
  ok(await page.evaluate(()=>rQA.urls.length===rQA.revoked.length),'Completed replay revokes its object URL');
  await page.locator('[data-action="record"]').click();await page.locator('#r-practice[data-phase="recording"]').waitFor();await idle();
  ok((await page.locator('.rp-record-timer').innerText()).includes('8,0'),'Eight-second automatic cap ends recording');
  await page.locator('[data-action="echo-next"]').click();await idle();ok(!await page.locator('[data-action="replay"]').isEnabled(),'Changing word discards previous audio');
  await page.evaluate(()=>{rQA.media='denied';});await page.locator('[data-action="record"]').click();await idle();
  ok((await status()).includes('engedély')&&await page.locator('[data-action="echo-confirm"]').isEnabled(),'Denied recording permission keeps manual practice available');
  await page.evaluate(()=>{rQA.media='pending';});await page.locator('[data-action="record"]').click();await page.locator('#r-practice[data-phase="preparing"]').waitFor();await page.locator('[data-action="stop"]').click();await idle();
  await page.evaluate(()=>{rQA.pending.forEach(resolve=>resolve());rQA.pending=[];});await page.waitForTimeout(100);
  ok(await page.evaluate(()=>rQA.stops===rQA.requests-1),'Late recording permission after cancel closes its stream (denied request has no stream)');
  await page.evaluate(()=>{rQA.media='normal';});await page.locator('[data-action="record"]').click();await page.locator('#r-practice[data-phase="recording"]').waitFor();await hub();
  ok(await page.evaluate(()=>rQA.stops===rQA.requests-1),'Leaving a recording game releases the microphone');
  await enter('echo');await page.locator('[data-action="record"]').click();await page.locator('#r-practice[data-phase="recording"]').waitFor();
  await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'));});
  ok(await root.getAttribute('data-phase')==='idle'&&!await page.locator('[data-action="replay"]').isEnabled(),'Hidden document cancels recording and discards audio');
  await page.evaluate(()=>{delete document.hidden;document.dispatchEvent(new Event('visibilitychange'));});
  await page.emulateMedia({reducedMotion:'reduce'});
  ok(await page.locator('.rp-echo-rings').evaluate(node=>getComputedStyle(node).animationName)==='none','Reduced motion removes animation');
  const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('speech_game_progress_v1')));
  ok(Object.values(saved.rPractice.games).every(game=>game.rounds>=1),'Every game records a completed round');
  ok(saved.rPractice.games.post.recognized===1&&saved.rPractice.games.workshop.recognized===0,'Word recognition and local sound activity stay distinct');
  ok(saved.attempts===0&&saved.rewards===0&&saved.wordStats.alma.attempts===0,'R games do not modify old speech scores or rewards');
  ok(!JSON.stringify(saved).includes('blob:')&&!JSON.stringify(saved.rPractice).includes('transcript'),'Recorded audio and transcripts are not persisted');
  await hub();await prefs('speechMode','together');await prefs('position','medial');
  await page.getByRole('button',{name:'Vissza a főképernyőre',exact:true}).click();await page.reload();await open();
  await page.locator('.rp-settings').evaluate(node=>node.open=true);
  ok(await page.locator('[data-pref="position"]').inputValue()==='medial','Reload retains the module word-group preference');
  await page.locator('.rp-settings').evaluate(node=>node.open=false);
  await page.waitForFunction(async()=>{const r=await navigator.serviceWorker.ready;return Boolean(r.active);});
  const cached=await page.evaluate(async()=>{const keys=await caches.keys(),urls=[];for(const key of keys){const cache=await caches.open(key);urls.push(...(await cache.keys()).map(r=>new URL(r.url).pathname));}return urls;});
  ok(cached.some(url=>url.endsWith('/r-practice-game.js'))&&cached.some(url=>url.endsWith('/audio/voice/r_word_repa.mp3'))&&cached.some(url=>url.endsWith('/audio/voice/r_rhyme_roka_0.mp3')),'Module and representative word/rhyme audio are cached');
  await context.setOffline(true);await page.reload();await open();
  for(const game of ['hunter','post','workshop','rhyme','echo']){await enter(game);ok(await root.getAttribute('data-phase')==='idle',`${game} loads its sample audio offline`);}
  await context.setOffline(false);
  ok(!errors.length,'No browser page errors: '+errors.join('; '));
  return {count:checks.length,checks,engine:context.browser().browserType().name(),retrySeen:sawRetry};
}
