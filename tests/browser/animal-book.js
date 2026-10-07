// Run with playwright-cli run-code --filename in a new disposable HEADLESS session.
// Pass an explicit --config with browser.launchOptions.headless=true when opening it.
// Build the complete offline bundle first and create output/playwright before running.
// This clears only the dedicated browser session's storage, never personal progress.
async page => {
  const checks = [], errors = [], context = page.context();
  const ok = (value, message) => { if (!value) throw Error(message); checks.push(message); };
  const errorListener = error => errors.push(error.message);
  page.on('pageerror', errorListener);
  await context.setOffline(false);
  await page.route('https://cdn.jsdelivr.net/**', route => route.fulfill({contentType:'text/javascript',body:''}));
  const url = page.url(), origin = new URL(url).origin;
  await page.evaluate(async () => {
    localStorage.clear();
    for (const registration of await navigator.serviceWorker.getRegistrations()) await registration.unregister();
    for (const key of await caches.keys()) await caches.delete(key);
  });
  await page.addInitScript(() => {
    const rawBuffers = new WeakMap(), decodedBuffers = new WeakMap();
    window.animalBookQA = {fetched:[],started:[]};
    const slice = ArrayBuffer.prototype.slice;
    ArrayBuffer.prototype.slice = function(...args) {
      const result=slice.apply(this,args), id=rawBuffers.get(this);
      if(id)rawBuffers.set(result,id);
      return result;
    };
    const originalFetch = window.fetch;
    window.fetch = async (...args) => {
      const response = await originalFetch(...args);
      const id = String(args[0]?.url || args[0]).match(/\/audio\/animals\/([a-z]+)\.mp3(?:\?|$)/)?.[1];
      if (id) {
        animalBookQA.fetched.push(id);
        const originalArrayBuffer = response.arrayBuffer.bind(response);
        response.arrayBuffer = async () => { const buffer = await originalArrayBuffer(); rawBuffers.set(buffer,id); return buffer; };
      }
      return response;
    };
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (AudioContextClass) {
      const decode = AudioContextClass.prototype.decodeAudioData;
      AudioContextClass.prototype.decodeAudioData = function(bytes,...args) {
        const id=rawBuffers.get(bytes), success=args[0];
        if(id && typeof success==='function')args[0]=buffer=>{decodedBuffers.set(buffer,id);success(buffer);};
        const result = decode.call(this,bytes,...args);
        result?.then?.(buffer => { if (id) decodedBuffers.set(buffer,id); }, () => {});
        return result;
      };
    }
    if (window.AudioBufferSourceNode) {
      const start = AudioBufferSourceNode.prototype.start;
      AudioBufferSourceNode.prototype.start = function(...args) {
        const result = start.apply(this,args), id = decodedBuffers.get(this.buffer);
        if (id) animalBookQA.started.push({id,kind:'buffer'});
        return result;
      };
    }
    const play = HTMLMediaElement.prototype.play;
    HTMLMediaElement.prototype.play = function(...args) {
      const id = this.src.match(/\/audio\/animals\/([a-z]+)\.mp3(?:\?|$)/)?.[1];
      if (id) this.addEventListener('playing', () => animalBookQA.started.push({id,kind:'element'}), {once:true});
      return play.apply(this,args);
    };
  });
  await page.goto('about:blank'); await page.goto(url);
  const enter = async () => {
    if (await page.locator('#home-button').isVisible()) await page.locator('#home-button').click();
    await page.locator('#home [data-open="play-menu"]').click();
    await page.locator('#play-menu [data-open="animal-book"]').click();
  };
  const currentPage = () => page.locator('#animal-book').getAttribute('data-page');
  const preferences = () => page.evaluate(() => JSON.parse(localStorage.getItem('beszedtanulas.animalBook.v1')));
  const results = () => page.evaluate(async () => JSON.stringify((await import('./progress-data.js')).snapshotProgress(JSON.parse(localStorage.getItem('speech_game_progress_v1') || '{}'))));
  const playAnimal = async (id, hotspot = false, finish = true) => {
    const before = await page.evaluate(() => animalBookQA.started.length);
    await page.locator(`#abk-${hotspot?'hotspot':'animal'}-${id}`).click();
    await page.waitForFunction(id => [...document.querySelectorAll(`#animal-book [data-animal="${id}"]`)].every(button => button.classList.contains('is-playing')),id,{timeout:10000});
    const states = await page.locator('#animal-book .is-playing').evaluateAll(buttons => buttons.map(button => button.dataset.animal));
    ok(states.length === 2 && states.every(value => value === id), `${id}: picture and symbol share only the playing animal's glow`);
    ok(await page.evaluate(({before,id}) => animalBookQA.started.slice(before).some(sound => sound.id === id),{before,id}), `${id}: playing glow follows actual MP3 audio onset`);
    if (finish) {
      await page.waitForFunction(() => !document.querySelector('#animal-book .is-playing,#animal-book .is-loading'),undefined,{timeout:15000});
      ok((await page.locator('#abk-status').innerText()).includes('hallottad'), `${id}: natural audio completion clears the glow and finishes the sound promise`);
    }
  };
  let harness;
  try {
    await enter();
    const pages = await page.evaluate(async () => (await import('./animal-book-data.js')).ANIMAL_BOOK_PAGES.map(page => ({id:page.id,title:page.title,animals:page.animals.map(animal => animal.id)})));
    ok(pages.length === 4 && new Set(pages.flatMap(value => value.animals)).size === 12, 'Four book pages expose twelve different animals');
    const progressBefore = await results();
    const engine = context.browser()?.browserType().name() || 'browser';
    for (const bookPage of pages) {
      await page.locator(`#abk-page-${bookPage.id}`).click();
      ok(await currentPage() === bookPage.id, `${bookPage.id}: page index opens the requested place`);
      ok(await page.locator('.abk-hotspot').count() === 3 && await page.locator('.abk-animal').count() === 3, `${bookPage.id}: three native picture hotspots and three matching symbol controls`);
      await page.waitForFunction(() => { const image=document.querySelector('.abk-image'); return image?.complete && image.naturalWidth>0; });
      for (const [width,height] of [[375,667],[390,844],[932,350],[834,1194],[1194,834]]) {
        await page.setViewportSize({width,height});
        const metrics = await page.evaluate(() => {
          const scene = document.querySelector('.abk-scene').getBoundingClientRect();
          const buttons = [...document.querySelectorAll('#animal-book button')];
          const small = buttons.filter(button => { const rect=button.getBoundingClientRect(); return rect.width<43.5 || rect.height<43.5; }).map(button=>button.id);
          const outside = [...document.querySelectorAll('.abk-hotspot')].filter(button => { const rect=button.getBoundingClientRect(); return rect.left<scene.left-.5 || rect.top<scene.top-.5 || rect.right>scene.right+.5 || rect.bottom>scene.bottom+.5; }).map(button=>button.id);
          const image = document.querySelector('.abk-image').getBoundingClientRect();
          return {overflow:document.documentElement.scrollWidth>innerWidth,small,outside,distorted:Math.abs(image.width/image.height-1.5)>.02};
        });
        ok(!metrics.overflow && !metrics.small.length && !metrics.outside.length && !metrics.distorted, `${bookPage.id}: ${width}×${height} preserves the whole picture, contained hotspots and ≥44px buttons (${JSON.stringify(metrics)})`);
        await page.evaluate(()=>window.scrollTo(0,0));
        await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
        await page.screenshot({path:`output/playwright/animal-book-${engine}-${bookPage.id}-${width}.png`,fullPage:height>540,animations:'disabled'});
      }
      await page.setViewportSize({width:390,height:844});
      for (const id of bookPage.animals) {
        await playAnimal(id,true,false); await playAnimal(id,false,true);
      }
    }
    ok(await page.locator('#abk-next').isDisabled(), 'The final page disables its next arrow');
    await page.locator('#abk-prev').click(); ok(await currentPage() === 'pond', 'Previous arrow turns back one page');
    await page.locator('#abk-title').focus(); await page.keyboard.press('ArrowLeft'); ok(await currentPage() === 'garden', 'Left keyboard arrow turns one page');
    await page.keyboard.press('ArrowRight'); ok(await currentPage() === 'pond', 'Right keyboard arrow turns one page');
    await page.locator('#abk-page-farm').click(); ok(await page.locator('#abk-prev').isDisabled(), 'The first page disables its previous arrow');
    await page.locator('#abk-title').focus(); await page.keyboard.press('ArrowLeft'); ok(await currentPage() === 'farm', 'Keyboard navigation stops at the first page');
    await page.locator('#abk-next').click(); ok(await page.locator('#abk-next').evaluate(button => button===document.activeElement), 'Arrow navigation retains usable keyboard focus');
    await page.locator('#abk-page-forest').click();
    const box = await page.locator('.abk-scene').boundingBox();
    await page.mouse.move(box.x+box.width*.3,box.y+box.height*.45); await page.mouse.down();
    await page.mouse.move(box.x+box.width*.8,box.y+box.height*.45,{steps:8}); await page.mouse.up();
    ok(await currentPage() === 'pond' && await page.locator('#animal-book .is-playing,#animal-book .is-loading').count() === 0, 'Real scene drag turns one page without playing an animal under the gesture');
    await page.locator('#abk-page-farm').click();
    await page.locator('#help-button').click();
    ok((await page.locator('#abk-status').innerText()).startsWith('Válassz egy állatot'), 'Header help guides selection before an animal has been chosen');
    await playAnimal('cow',false,true); await page.locator('#help-button').click();
    await page.waitForFunction(() => document.querySelector('#abk-animal-cow')?.classList.contains('is-playing'));
    ok((await page.locator('#abk-status').innerText()).includes('Tehén'), 'Header help repeats the last animal sound');
    await page.locator('#abk-page-garden').click();
    ok(await page.locator('#animal-book .is-playing,#animal-book .is-loading').count() === 0, 'Changing page cancels both sound indications immediately');
    await page.locator('#help-button').click(); ok((await page.locator('#abk-status').innerText()).startsWith('Válassz egy állatot'), 'A new page does not repeat an animal from the old page');
    await playAnimal('dog',false,false); await page.locator('#home-button').click();
    ok(await page.locator('#animal-book .is-playing,#animal-book .is-loading').count() === 0, 'Leaving the book clears active playback');
    await enter(); await page.locator('#abk-page-forest').click(); await page.locator('#abk-markers').click();
    ok(JSON.stringify(await preferences()) === JSON.stringify({pageId:'forest',markersVisible:false}), 'Page and hidden-marker choice are saved together in the book-specific storage key');
    await page.reload(); await enter();
    ok(await currentPage() === 'forest' && await page.locator('#abk-markers').getAttribute('aria-pressed') === 'false', 'Reload restores the chosen page and marker visibility');
    ok(await page.locator('.abk-sound-marker').evaluateAll(markers => markers.every(marker=>getComputedStyle(marker).opacity==='0')), 'Hidden markers remain visually hidden after reload');
    await playAnimal('owl',true,true);
    ok(await results() === progressBefore, 'Exploration does not change speech results, rewards or other games');

    // Exercise DOM and pointer races against the real controller with controlled audio.
    // No fake sound replaces the real MP3 checks above or the offline checks below.
    harness = await context.newPage(); harness.on('pageerror', errorListener);
    const harnessUrl = `${origin}/__animal-book-browser-qa__`;
    await harness.route(harnessUrl, route => route.fulfill({contentType:'text/html',body:`<!doctype html><html><head><base href="${origin}/"><link rel="stylesheet" href="animal-book.css"></head><body><section id="animal-book"></section><script type="module">import {setupAnimalBook} from './animal-book-game.js';localStorage.setItem('beszedtanulas.animalBook.v1',JSON.stringify({pageId:'farm',markersVisible:true}));window.bookControl={requests:[],stops:0};bookControl.api=setupAnimalBook({playSound(id,{onStart}){return new Promise((resolve,reject)=>bookControl.requests.push({id,onStart,resolve,reject}));},stopPlayback(){bookControl.stops++;}});bookControl.api.start();window.bookControlReady=true;</script></body></html>`}));
    await harness.goto(harnessUrl); await harness.bringToFront(); await harness.waitForFunction(()=>window.bookControlReady);
    await harness.locator('#abk-hotspot-cow').click();
    ok(await harness.locator('.is-loading').count() === 2 && await harness.locator('.is-playing').count() === 0, 'A pending sound shows loading without a premature playing glow');
    await harness.evaluate(()=>bookControl.requests[0].onStart());
    ok(await harness.locator('.is-playing').count() === 2 && await harness.locator('.is-loading').count() === 0, 'Actual onStart activates the matching native hotspot and symbol');
    await harness.locator('#abk-animal-horse').click();
    await harness.evaluate(async()=>{bookControl.requests[0].onStart();bookControl.requests[0].reject(Error('cancelled old request'));await Promise.resolve();});
    ok(await harness.locator('.is-playing').count() === 0 && await harness.locator('.is-loading[data-animal="horse"]').count() === 2 && (await harness.locator('#abk-status').innerText()).includes('Ló'), 'Late old starts and failures cannot replace the newer animal status');
    await harness.evaluate(()=>bookControl.requests[1].onStart()); await harness.locator('#abk-next').click();
    const nextStatus = await harness.locator('#abk-status').innerText();
    await harness.evaluate(async()=>{bookControl.requests[1].onStart();bookControl.requests[1].resolve(false);await Promise.resolve();});
    ok(await harness.locator('.is-playing,.is-loading').count() === 0 && await harness.locator('#abk-status').innerText() === nextStatus, 'Late completion after page change cannot restore an old label or glow');
    await harness.locator('#abk-animal-dog').click(); await harness.evaluate(async()=>{bookControl.requests[2].resolve(false);await Promise.resolve();});
    ok((await harness.locator('#abk-status').innerText()).includes('nem indult el') && await harness.locator('.is-loading,.is-playing').count() === 0, 'Failed sound ends loading and gives recoverable retry feedback');
    await harness.locator('#abk-animal-dog').click(); await harness.evaluate(async()=>{bookControl.requests[3].onStart();bookControl.requests[3].resolve(true);await Promise.resolve();bookControl.requests[3].onStart();});
    ok(await harness.locator('.is-playing,.is-loading').count() === 0 && (await harness.locator('#abk-status').innerText()).includes('hallottad'), 'Retry succeeds and an onset arriving after completion cannot restart the glow');
    await harness.locator('#abk-page-farm').click();
    const touch = async (dx,dy=0,cancel=false) => harness.evaluate(({dx,dy,cancel})=>{
      const target=document.querySelector('#abk-hotspot-cow');
      const pointer=(type,x,y)=>new PointerEvent(type,{bubbles:true,cancelable:true,pointerId:17,pointerType:'touch',isPrimary:true,button:0,clientX:x,clientY:y});
      target.dispatchEvent(pointer('pointerdown',220,150));
      if(cancel)target.dispatchEvent(pointer('pointercancel',220,150));
      target.dispatchEvent(pointer('pointerup',220+dx,150+dy));
    },{dx,dy,cancel});
    await touch(-90);
    const requestsBefore = await harness.evaluate(()=>bookControl.requests.length);
    await harness.locator('#abk-hotspot-dog').dispatchEvent('click',{detail:1,bubbles:true,cancelable:true});
    ok(await harness.locator('#animal-book').getAttribute('data-page') === 'garden' && await harness.evaluate(()=>bookControl.requests.length) === requestsBefore, 'Touch swipe suppresses its trailing native animal click on the replacement page');
    await harness.locator('#abk-animal-dog').evaluate(button=>button.click());
    ok(await harness.evaluate(()=>bookControl.requests.length) === requestsBefore+1, 'Keyboard activation remains usable after a touch swipe');
    await harness.locator('#abk-page-farm').click(); await touch(-10,120);
    ok(await harness.locator('#animal-book').getAttribute('data-page') === 'farm', 'A vertical touch gesture does not turn the book page');
    await touch(-90,0,true); ok(await harness.locator('#animal-book').getAttribute('data-page') === 'farm', 'A cancelled touch gesture cannot turn a page later');
    await harness.locator('#abk-animal-cow').click();
    await harness.evaluate(()=>bookControl.requests.at(-1).onStart());
    await harness.emulateMedia({reducedMotion:'reduce'});
    ok(await harness.locator('#abk-animal-cow .abk-animal-symbol').evaluate(symbol=>getComputedStyle(symbol).animationName==='none'), 'Reduced motion disables the listening animation');
    await harness.evaluate(async()=>{const request=bookControl.requests.at(-1);bookControl.api.stop();request.onStart();request.resolve(true);await Promise.resolve();});
    ok(await harness.locator('.is-playing,.is-loading').count() === 0, 'Stopping the controller invalidates all pending audio indications');
    await harness.close(); harness=null; await page.bringToFront();

    await page.waitForFunction(()=>document.querySelector('#offline-status')?.textContent.startsWith('Letöltve.'),undefined,{timeout:60000});
    const cache = await page.evaluate(async()=>{
      const {ANIMAL_BOOK_PAGES}=await import('./animal-book-data.js');
      const files=['animal-book-audio.json',...ANIMAL_BOOK_PAGES.flatMap(page=>[page.image,...page.animals.map(animal=>`audio/animals/${animal.id}.mp3`)])];
      return {total:files.length,missing:(await Promise.all(files.map(async file=>await caches.match(new URL(file,location.href))?null:file))).filter(Boolean)};
    });
    ok(cache.total === 17 && !cache.missing.length, `Four images, twelve sounds and the source/license manifest are cached (${cache.missing.join(', ')})`);
    await context.setOffline(true); await page.reload(); await enter();
    for (const bookPage of pages) {
      await page.locator(`#abk-page-${bookPage.id}`).click();
      await page.waitForFunction(()=>document.querySelector('.abk-image')?.complete && document.querySelector('.abk-image').naturalWidth>0);
      await playAnimal(bookPage.animals[0],true,false);
      ok(await currentPage() === bookPage.id, `${bookPage.id}: cached full-page picture and real sound work after offline reload`);
    }
    await page.locator('#abk-credits').click();
    await page.waitForFunction(()=>document.querySelectorAll('#animal-book-credit-list article').length===12);
    const credits = await page.locator('#animal-book-credit-list article').evaluateAll(articles=>articles.map(article=>({label:article.querySelector('h3')?.textContent,source:article.querySelector('p')?.textContent,license:article.querySelectorAll('p')[1]?.textContent,changes:article.querySelectorAll('p')[2]?.textContent,url:article.querySelector('a')?.href})));
    ok(credits.length === 12 && credits.every(item=>item.label && item.source && item.license?.startsWith('Licenc: ') && item.changes && item.url?.startsWith('https://')), 'Offline source dialog includes all twelve recording credits, licenses, source links and processing changes');
    ok(await page.locator('#animal-book .is-playing,#animal-book .is-loading').count() === 0, 'Opening sources cancels the previous animal sound');
    await page.getByRole('button',{name:'Források bezárása'}).click();
    ok(!await page.locator('#animal-book-credits').isVisible(), 'Source dialog closes with its labelled control');
    ok(errors.length === 0, `No browser page errors: ${errors.join('; ')}`);
    return {count:checks.length,checks,engine,credits:credits.length};
  } finally {
    if(harness)await harness.close();
    await context.setOffline(false);
    page.off('pageerror',errorListener);
  }
}
