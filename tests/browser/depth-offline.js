// Fresh browser context, real decoded MP3s and unmodified playback.
async parent => {
  const context=await parent.context().browser().newContext(),page=await context.newPage(),checks=[],errors=[];
  const ok=(value,label)=>{if(!value)throw Error(label);checks.push(label);};
  page.on('pageerror',error=>errors.push(error.message));
  try {
    await page.goto(new URL('/',parent.url()).href);
    await page.waitForFunction(()=>navigator.serviceWorker.controller&&document.querySelector('#offline-status')?.textContent.startsWith('Letöltve.'),undefined,{timeout:60000});
    await page.evaluate(()=>{const s=JSON.parse(localStorage.getItem('speech_game_progress_v1'));s.settings.spokenGuidance=false;s.supabase.syncPaused=true;localStorage.setItem('speech_game_progress_v1',JSON.stringify(s));});
    await context.setOffline(true);await page.reload();
    ok(await page.locator('#home').isVisible(),'Fresh installation reloads fully offline');
    const cached=await page.evaluate(async()=>{
      const manifest=await (await fetch('./audio/voice/manifest.json')).json(),missing=[];
      for(const clip of manifest.clips){const r=await caches.match(new URL(clip.file,location.href));if(!r?.ok)missing.push(clip.id);}
      return {count:manifest.clips.length,missing};
    });
    ok(cached.count===845&&!cached.missing.length,'All 845 Jessa clips are cached offline');
    const decoded=await page.evaluate(async()=>{
      const ids=['listening_bingo_start','memory_sound_start','montessori_shape_turn_retry','phrase_kerek_almat','phrase_part_kerek_almat_1','phrase_apa_auto','phrase_part_apa_auto_1','phrase_meg_alma','phrase_part_meg_alma_1','r_variant_roka_fut','r_variant_teli_kosar','r_mission_kert','r_mission_vacsora','workshop_sort_rule_shape_size','workshop_only_circle'];
      const audio=new (window.AudioContext||window.webkitAudioContext)(),result=[];
      for(const id of ids){const r=await fetch(`./audio/voice/${id}.mp3`),b=await audio.decodeAudioData(await r.arrayBuffer());result.push({id,duration:b.duration});}
      await audio.close();return result;
    });
    for(const {id,duration} of decoded)ok(duration>.2,`${id}: actual offline MP3 decodes`);
    await page.evaluate(()=>{window.depthOfflineVoices=[];document.addEventListener('narrationstart',e=>depthOfflineVoices.push(e.detail.id));});
    const home=async()=>{if(await page.locator('#home-button').isVisible())await page.locator('#home-button').click();};
    const enter=async(group,screen)=>{await home();await page.locator(`#home [data-open="${group}"]`).click();await page.locator(`#${group} [data-open="${screen}"]`).click();};
    await enter('picture-menu','listening-game');await page.locator('[data-listening-mode="bingo"]').click();
    await page.waitForFunction(()=>depthOfflineVoices.includes('listening_bingo_start')&&depthOfflineVoices.some(id=>id.startsWith('word_')),undefined,{timeout:15000});
    ok(await page.locator('.listening-bingo-tile').count()>=2,'Offline bingo plays its guide and target with its fixed board');
    await enter('activity-menu','memory');await page.locator('[data-memory-mode="sound"]').click();
    await page.waitForFunction(()=>depthOfflineVoices.includes('memory_sound_start'),undefined,{timeout:15000});
    const card=await page.locator('.memory-sound-card').first().getAttribute('data-card');
    await page.locator(`[data-card="${card}"]`).click();await page.locator(`[data-card="${card.replace('sound-','picture-')}"]`).click();
    ok(await page.locator('.memory-sound-card.is-matched').count()===1,'Offline sound-to-picture matching accepts a real pair');
    await enter('play-menu','teddy-game');await page.locator('[data-teddy-mode="expressive"]').click();
    const food=await page.locator('#teddy-answers .teddy-plate').first().getAttribute('data-word');
    await page.locator('#teddy-answers .teddy-plate').first().click();
    await page.waitForFunction(id=>depthOfflineVoices.includes(`teddy_${id}`),food,{timeout:15000});
    await page.locator('.teddy-expression-confirm').click();await page.locator('[data-teddy-offer="more"]').waitFor({state:'visible'});
    ok(await page.locator('.teddy-meal > span').count()===1,'Offline expressive Maci plays the model and passes the chosen food to the child');
    await enter('practice-menu','two-word');await page.locator('#phrase-group').selectOption('person_action');
    ok((await page.locator('#phrase-content-count').innerText()).startsWith('8 '),'Expanded phrase bank and filters load offline');
    ok(!errors.length,`No offline JavaScript errors: ${errors.join('; ')}`);
    return {count:checks.length,checks};
  } finally {await context.setOffline(false);await context.close();}
}
