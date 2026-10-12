// Disposable real-browser QA, including actual MP3s and an IndexedDB import.
async page => {
  if(new URL(page.url()).hostname!=='127.0.0.1'||!['5192','5193'].includes(new URL(page.url()).port))throw Error('Use an isolated Mesetár QA fixture on port 5192 or 5193');
  const context=page.context(),checks=[],errors=[],leaks=[];
  const ok=(condition,message)=>{if(!condition)throw Error(message);checks.push(message);};
  await context.setOffline(false);
  await page.route('https://cdn.jsdelivr.net/**',route=>route.fulfill({contentType:'text/javascript',body:''}));
  await page.goto(new URL('/',page.url()).href);
  await page.evaluate(async()=>{localStorage.clear();for(const r of await navigator.serviceWorker.getRegistrations())await r.unregister();for(const key of await caches.keys())await caches.delete(key);await new Promise(resolve=>{const r=indexedDB.deleteDatabase('beszedtanulas.private-audiobooks.v1');r.onsuccess=r.onerror=r.onblocked=resolve;});});
  await page.addInitScript(()=>{const OriginalAudio=window.Audio;window.storySearchQA={audios:[]};window.Audio=function(...args){const audio=new OriginalAudio(...args);storySearchQA.audios.push(audio);return audio;};window.Audio.prototype=OriginalAudio.prototype;});
  page.on('pageerror',error=>errors.push(error.message));
  page.on('request',request=>{if((request.postData()||'').includes('QA_PRIVATE_STORY_TEXT')||request.url().includes('QA_PRIVATE_STORY_TEXT'))leaks.push(request.url());});
  await page.reload();await page.evaluate(()=>navigator.serviceWorker.ready);await page.waitForFunction(()=>navigator.serviceWorker.controller,{timeout:60000});
  const open=async()=>{await page.locator('[data-open="play-menu"]').click();await page.locator('[data-open="audiobooks"]').click();await page.waitForFunction(()=>document.querySelector('#audiobooks').dataset.phase==='ready');};
  const search=async query=>page.getByLabel('Keresés cím vagy szerző alapján',{exact:true}).fill(query);
  const visible=()=>page.locator('.story-card:visible');
  await open();
  const total=await page.locator('.story-card').count();ok(total>=28,'All current collection entries are listed');
  const rado=await page.evaluate(async()=>(await import('/rado-stories.js')).RADO_STORIES);
  await search('  RADO   VILMOS  ');ok(await visible().count()===rado.length&&rado.length===50,'All actual Radó entries found by accentless author');
  ok(await page.locator('#rado-search').inputValue()==='  RADO   VILMOS  ','Global query also filters the collection reader');
  const waiting=rado.find(story=>story.audioStatus==='pending');
  await search(waiting.title);await page.locator(`.story-card[data-story="${waiting.id}"]`).click();
  ok(await page.locator('#story-toggle').isDisabled()&&(await page.locator('#story-toggle').innerText()).includes('Hangra vár'),'Pending recording is explicitly labelled');
  const required=await page.evaluate(async id=>(await import('/story-audio-requirements.js')).STORY_AUDIO_REQUIREMENTS[id],waiting.id);
  ok((await page.locator('#story-offline').textContent()).includes(String(required)),'Pending credit estimate comes from the generated plan');
  await page.locator('#story-transcript summary').click();ok(await page.locator('#story-text').textContent()===waiting.text,'Pending Radó work retains its full source text');
  await search('');
  for(const [query,id] of [['GYONGYVIRAG   Palko','classic-palko'],['arany JANOS fulemule','classic-fulemile'],['fülemile','classic-fulemile'],['PeToFi   sAnDoR  lacinak','classic-arany-lacinak']]){
    await search(query);ok(await visible().count()===1&&await visible().first().getAttribute('data-story')===id,`Real ${query} search`);
  }
  await search('szekely furfangos');ok(await visible().count()===3,'Only the explicitly catalogued Székely selection matches');
  await visible().first().click();ok(await page.locator('#story-toggle').isDisabled(),'Unverified edition has no fake playback');
  ok((await page.locator('#story-status').textContent()).includes('forrásellenőrzés'),'Edition status is visible');
  await search('nincs-ilyen-cim');ok(await visible().count()===0&&await page.locator('#story-search-empty').isVisible(),'Understandable empty results');
  ok(await page.locator('.rado-card:visible').count()===0,'No unrelated collection cards remain in empty results');
  await page.getByRole('button',{name:'Keresés törlése',exact:true}).click();ok(await visible().count()===total,'Clear restores every entry');
  ok(await page.locator('#story-search').evaluate(element=>element===document.activeElement),'Clear returns keyboard focus to search');
  await search('palko');await page.locator('#story-search').press('Escape');ok(await page.locator('#story-search').inputValue()===''&&await visible().count()===total,'Escape clears the query');
  await search('arany lacinak');await visible().first().focus();await page.keyboard.press('Enter');
  ok(await page.locator('#story-title').textContent()==='Arany Lacinak','Keyboard selects a search result');
  await page.locator('#story-toggle').click();await page.waitForFunction(()=>document.querySelector('#audiobooks').dataset.phase==='playing');
  await page.waitForFunction(()=>!document.querySelector('#story-seek').disabled);
  await page.locator('#story-seek').evaluate(element=>{element.value=42;element.dispatchEvent(new Event('input',{bubbles:true}));});
  const before=Number(await page.locator('#story-seek').inputValue());
  await search('nincs-ilyen-cim');await page.waitForTimeout(700);
  ok(await page.locator('#story-title').textContent()==='Arany Lacinak','Filtering preserves selected work outside results');
  ok(await page.locator('#audiobooks').getAttribute('data-phase')==='playing'&&Number(await page.locator('#story-seek').inputValue())>=before,'Filtering preserves position and running playback');
  await search('fulemule');await visible().first().click();await page.waitForFunction(()=>document.querySelector('#audiobooks').dataset.phase==='ready');
  ok(await page.locator('#audiobooks').getAttribute('data-phase')==='ready','Choosing another result follows the normal stopped state');
  ok(await page.evaluate(()=>storySearchQA.audios.every(audio=>audio.paused)),'Previous recording stopped after choosing another result');
  const classics=await page.evaluate(async()=>(await import('/audiobook-data.js')).AUDIOBOOKS.filter(story=>story.id.startsWith('classic-')));
  await search('');
  for(const story of classics){
    await page.locator(`.story-card[data-story="${story.id}"]`).click();
    await page.locator('#story-toggle').click();await page.waitForFunction(()=>document.querySelector('#audiobooks').dataset.phase==='playing');
    await page.waitForFunction(()=>!document.querySelector('#story-seek').disabled);
    await page.locator('#story-transcript summary').click();ok(await page.locator('#story-text').textContent()===story.text,`${story.id}: full original text and stanza breaks`);
    await page.locator('#story-transcript summary').click();ok(await page.locator('#story-visual-wrap').isVisible(),`${story.id}: illustrated SVG view`);
    const sample=await page.evaluate(async id=>{const visual=(await import('/story-visual-library.js')).storyVisualFor(id);return visual.scenes[Math.floor(visual.scenes.length/2)];},story.id);
    await page.locator('#story-seek').evaluate((element,time)=>{element.value=Math.ceil(time);element.dispatchEvent(new Event('input',{bubbles:true}));},sample.time);
    ok(await page.locator('#story-visual').getAttribute('data-scene')===sample.id,`${story.id}: seeking restores an actual caption-anchored scene`);
    await page.waitForFunction(()=>document.querySelector('#audiobooks').dataset.phase==='playing');
    ok(true,`${story.id}: real fixed Jessa MP3 plays`);await page.locator('#story-toggle').click();
    await page.waitForFunction(()=>document.querySelector('#story-download').textContent.includes('Letöltve'));
    ok(true,`${story.id}: playback automatically stores verified offline audio`);
  }
  await page.evaluate(async()=>{
    const story=(await import('/audiobook-data.js')).AUDIOBOOKS.find(story=>story.id==='story-16');
    const bytes=new Uint8Array(await (await fetch(story.file)).arrayBuffer());let binary='';for(const byte of bytes)binary+=String.fromCharCode(byte);
    const bundle={format:'beszedtanulas-private-audiobook',version:1,story:{title:'Őzike saját története',author:'Éva Néni',text:'QA_PRIVATE_STORY_TEXT csak ebben a böngészőben.',duration:story.duration,bytes:story.bytes,sha256:story.sha256},audio:{mime:'audio/mpeg',base64:btoa(binary)}};
    const file=new File([JSON.stringify(bundle)],'qa.mese.json',{type:'application/json'}),transfer=new DataTransfer();transfer.items.add(file);
    const input=document.querySelector('#story-import-file');input.files=transfer.files;input.dispatchEvent(new Event('change',{bubbles:true}));
  });
  await page.waitForFunction(()=>document.querySelector('#story-title').textContent==='Őzike saját története');
  await search('OZIKE');ok(await visible().filter({hasText:'Őzike saját története'}).count()===1,'Private imported title remains searchable alongside the Radó title');
  await search('  eva   neni  ');ok(await visible().count()===1,'Private imported author is searchable');
  ok((await page.locator('#story-byline').textContent()).includes('Éva Néni'),'Private author metadata is retained');
  const localId=await visible().first().getAttribute('data-story');
  await context.setOffline(true);await page.reload();await open();
  await search('eva neni');ok(await visible().count()===1,'Private author search survives an offline reload');
  await page.locator(`.story-card[data-story="${localId}"]`).click();await page.waitForFunction(()=>!document.querySelector('#story-seek').disabled);
  await page.locator('#story-toggle').click();await page.waitForFunction(()=>document.querySelector('#audiobooks').dataset.phase==='playing');ok(true,'Private IndexedDB audio plays offline');await page.locator('#story-toggle').click();
  for(const story of classics){
    await search(story.title);ok(await visible().count()===1,`${story.id}: offline title search`);await visible().first().click();await page.waitForFunction(()=>!document.querySelector('#story-seek').disabled);
    await page.locator('#story-toggle').click();await page.waitForFunction(()=>document.querySelector('#audiobooks').dataset.phase==='playing');
    ok(await page.evaluate(()=>storySearchQA.audios.some(audio=>audio.src.startsWith('blob:')&&!audio.paused)),`${story.id}: actual offline blob playback`);await page.locator('#story-toggle').click();
  }
  await search('rado vilmos');ok(await visible().count()===50,'All fifty Radó works searchable offline');
  await search('fulemule');ok(await visible().count()===1,'Offline title alias works');
  for(const [width,height] of [[320,640],[375,667],[834,1194]]){
    await page.setViewportSize({width,height});ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),`No overflow at ${width}px`);
    ok(await page.locator('.story-search input,.story-search button').evaluateAll(elements=>elements.filter(e=>e.getClientRects().length).every(e=>e.getBoundingClientRect().height>=44)),`Search touch targets at ${width}px`);
  }
  await page.locator('#story-search').scrollIntoViewIfNeeded();await page.screenshot({path:'output/playwright/story-search-834.png',fullPage:true});
  await page.setViewportSize({width:375,height:667});await page.locator('#story-search').scrollIntoViewIfNeeded();await page.screenshot({path:'output/playwright/story-search-375.png',fullPage:true});
  ok(leaks.length===0,'No private contents sent over the network');ok(errors.length===0,'No application errors');
  await context.setOffline(false);return {checks:checks.length,passed:checks,errors,leaks};
}
