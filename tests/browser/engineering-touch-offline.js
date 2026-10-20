// Run with playwright-cli run-code --filename; owns a disposable touch context.
async page => {
  const context=await page.context().browser().newContext({viewport:{width:390,height:844},hasTouch:true,isMobile:true});
  const p=await context.newPage(),checks=[],errors=[];
  const ok=(v,m)=>{if(!v)throw Error(m);checks.push(m);};p.on('pageerror',e=>errors.push(e.message));
  try {
    await p.goto(new URL('/',page.url()).href);await p.bringToFront();
    await p.waitForFunction(()=>!!navigator.serviceWorker.controller);
    const cached=await p.evaluate(async()=>{const cache=await caches.open((await caches.keys()).find(k=>k.startsWith('beszedtanulas:')));return (await cache.keys()).map(r=>new URL(r.url).pathname);});
    ok(cached.some(x=>x.endsWith('/vendor/matter.js'))&&cached.some(x=>x.endsWith('/audio/voice/engineering_build.mp3')),'physics engine and spoken guidance are in the offline cache');
    await context.setOffline(true);await p.reload();
    await p.locator('#home [data-open="activity-menu"]').tap();await p.locator('#activity-menu [data-kind="drop"]').tap();await p.locator('#en-back').dispatchEvent('click');
    await p.locator('[data-en-mode="build"]').tap();
    await p.locator('[data-en-piece="block"]').tap();
    const stage=p.locator('#en-stage'),r=await stage.boundingBox();
    await p.touchscreen.tap(r.x+r.width*.5,r.y+r.height*.4);
    await p.waitForFunction(()=>document.querySelector('#en-volume').textContent.startsWith('4 '));
    ok(true,'touch selection and placement work fully offline');
    await p.waitForFunction(()=>!document.querySelector('#en-place').disabled);
    await p.locator('#en-pause').tap();
    ok(await p.locator('#en-place').isDisabled(),'touch pause blocks new placements');
    await p.locator('#en-pause').tap();
    // The automation browser keeps all tabs visible; drive the standard
    // visibility lifecycle explicitly to verify suspension and resume behavior.
    await p.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,get:()=>true});document.dispatchEvent(new Event('visibilitychange'));});
    const frozen=await p.locator('#en-world').innerHTML();await p.waitForTimeout(250);
    ok(frozen===await p.locator('#en-world').innerHTML(),'hidden-document lifecycle stops rendering');
    await p.evaluate(()=>{delete document.hidden;document.dispatchEvent(new Event('visibilitychange'));});
    await p.waitForFunction(()=>document.querySelector('#en-pause').getAttribute('aria-pressed')==='true');
    ok(true,'visible-document lifecycle waits for explicit continuation');
    await p.locator('#en-pause').tap();
    await p.evaluate(()=>window.dispatchEvent(new PageTransitionEvent('pagehide',{persisted:true})));
    const parked=await p.locator('#en-world').innerHTML();await p.waitForTimeout(250);
    ok(parked===await p.locator('#en-world').innerHTML(),'pagehide stops an active physics loop');
    await p.evaluate(()=>window.dispatchEvent(new PageTransitionEvent('pageshow',{persisted:true})));
    await p.waitForFunction(()=>document.querySelector('#en-pause').getAttribute('aria-pressed')==='true');
    ok(true,'restored page waits for explicit continuation');
    await p.locator('#en-pause').tap();await p.locator('#back-button').tap();await p.locator('[data-en-mode="bridge"]').tap();
    await p.locator('[data-en-node="d0"]').tap();await p.locator('[data-en-node="d1"]').tap();
    ok(await p.locator('#en-budget').innerText()==='22','two real touch taps create one beam offline');
    await p.locator('#en-undo').tap();ok(await p.locator('#en-budget').innerText()==='24','touch undo refunds the beam');
    await p.locator('#back-button').tap();await p.locator('[data-en-mode="drop"]').tap();
    await p.locator('#en-drop').tap();
    await p.locator('#home-button').tap();await p.waitForTimeout(500);
    ok(await p.locator('body').getAttribute('data-screen')==='home','leaving during a fall safely stops the game offline');
    ok(errors.length===0,'no touch/offline browser errors: '+errors.join('; '));
    return checks;
  } catch(error) { throw Error(`${error.message}; completed: ${checks.join(' | ')}; state: ${await p.locator('#engineering').innerText()}`); } finally {await context.close();}
}
