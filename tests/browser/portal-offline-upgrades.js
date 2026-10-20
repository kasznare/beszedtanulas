async page => {
  const context=page.context(),url=page.url(),checks=[],errors=[];
  const ok=(condition,label)=>{if(!condition)throw Error(label);checks.push(label);};
  page.on('pageerror',e=>errors.push(e.message));
  await context.setOffline(false);
  await page.waitForFunction(()=>navigator.serviceWorker.controller&&document.querySelector('#offline-status')?.textContent.startsWith('Letöltve.'),undefined,{timeout:60000});
  await page.evaluate(()=>{const s=JSON.parse(localStorage.getItem('speech_game_progress_v1'));s.settings.spokenGuidance=false;s.supabase.syncPaused=true;localStorage.setItem('speech_game_progress_v1',JSON.stringify(s));});
  await context.setOffline(true);await page.reload();
  ok(await page.locator('#home').isVisible(),'Portal reloads fully offline');
  const files=await page.evaluate(async()=>{const manifest=await (await fetch('./audio/voice/manifest.json')).json();const missing=[];for(const c of manifest.clips){const r=await caches.match(new URL(c.file,location.href));if(!r||!r.ok)missing.push(c.id);}return{count:manifest.clips.length,missing};});
  ok(files.count>=743&&!files.missing.length,`All ${files.count} Jessa clips are available offline`);
  const audio=await page.evaluate(async()=>{
    const ids=['practice_together','counting_compare','flip_find','teddy_sequence_alma_viz','dress_weather_rain','abk_sound_guide','logic_machine_experiment','workshop_sort_again_2','r_mission_piknik','r_rhyme_part_roka_2_1','phrase_part_kerek_vizet_1','mese_guest_roka_cup','mese_sort_10'];
    const ctx=new (window.AudioContext||window.webkitAudioContext)(),durations=[];
    for(const id of ids){const r=await fetch(`./audio/voice/${id}.mp3`);const b=await ctx.decodeAudioData(await r.arrayBuffer());durations.push({id,duration:b.duration});}await ctx.close();return durations;
  });
  for(const clip of audio)ok(clip.duration>.2,`${clip.id}: actual offline MP3 decodes`);
  const home=async()=>{if(await page.locator('#home-button').isVisible())await page.locator('#home-button').click();};
  const enter=async(group,screen)=>{await home();await page.locator(`#home [data-open="${group}"]`).click();await page.locator(`#${group} [data-open="${screen}"]`).click();};
  await page.evaluate(()=>{window.offlineVoices=[];document.addEventListener('narrationstart',e=>offlineVoices.push(e.detail.id));});
  await enter('picture-menu','flip');await page.locator('[data-flip-mode="find"]').click();await page.locator('#flip-hide').click();
  await page.waitForFunction(()=>offlineVoices.includes('flip_find')&&offlineVoices.some(id=>id.startsWith('word_')),undefined,{timeout:15000});
  ok(true,'Offline picture search really plays its guide followed by its requested word');
  await enter('picture-menu','topics');await page.locator('[data-topic="food"]').click();ok(await page.locator('#cards svg.word-picture').count()===5,'Shared word drawings load offline');
  await enter('activity-menu','puzzle');
  ok(await page.locator('#puzzle').isVisible(),'Puzzle module loads offline');
  await enter('play-menu','meseliget');ok(await page.locator('#meadow-house').isVisible(),'Expanded story map loads offline');
  ok(errors.length===0,`No offline JavaScript errors: ${errors.join('; ')}`);
  await context.setOffline(false);await home();return{count:checks.length,checks};
}
