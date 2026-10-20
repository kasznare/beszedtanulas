// Run with playwright-cli run-code --filename in an isolated browser session.
async page => {
  const checks=[],errors=[], ok=(value,message)=>{if(!value)throw Error(message);checks.push(message);};
  const engine=page.context().browser().browserType().name();
  const errorListener=e=>errors.push(e.message);page.on('pageerror',errorListener);
  await page.context().setOffline(false);
  await page.evaluate(async()=>{for(const r of await navigator.serviceWorker.getRegistrations())await r.unregister();for(const k of await caches.keys())await caches.delete(k);localStorage.clear();});
  await page.reload();
  const enter=async()=>{
    await page.locator('#home [data-open="activity-menu"]').click();
    await page.locator('#activity-menu [data-kind="drop"]').click();
    await page.locator('#en-back').dispatchEvent('click');
  };
  await enter();
  await page.locator('[data-en-mode="drop"]').click();
  const dropWhen=async(where)=>{
    await page.waitForFunction(where=>{
      const button=document.querySelector('#en-drop');if(!button||button.disabled)return false;
      const last=document.querySelector('#en-world>g:last-child'),m=last?.getAttribute('transform')?.match(/translate\(([-.\d]+)/);
      if(!m)return false;const x=Number(m[1]);return where==='centre'?Math.abs(x-400)<12:x<150;
    },where);
    await page.locator('#en-drop').click();
    await page.waitForFunction(()=>!document.querySelector('#en-drop').disabled,{},{timeout:15000});
  };
  await dropWhen('centre');
  ok((await page.locator('#en-volume').innerText()).startsWith('4 '),'one settled cube scores four volume units');
  await page.locator('#en-pause').click();await page.waitForTimeout(350);
  const pauseWorld=await page.locator('#en-world').innerHTML();await page.waitForTimeout(350);
  ok(pauseWorld===await page.locator('#en-world').innerHTML(),'pause freezes physics and moving piece');
  ok(await page.locator('#en-drop').isDisabled(),'drop disabled during pause');await page.locator('#en-pause').click();
  await dropWhen('water');
  ok((await page.locator('#en-lives').innerText()).includes('2 csobbanás'),'water consumes one chance');
  ok((await page.locator('#en-volume').innerText()).startsWith('4 '),'water adds no volume');
  await page.locator('#en-undo').click();
  ok((await page.locator('#en-lives').innerText()).includes('3 csobbanás'),'undo restores a lost chance');
  await page.waitForFunction(()=>document.querySelector('#en-volume').textContent.startsWith('4 '));
  await page.locator('#back-button').click();
  ok(await page.locator('[data-en-mode="build"]').isVisible(),'header back returns to the game hub');
  await page.locator('[data-en-mode="build"]').click();
  const stage=page.locator('#en-stage');await stage.focus();await page.keyboard.press('Enter');
  await page.waitForFunction(()=>document.querySelector('#en-volume').textContent.startsWith('4 '));
  ok(true,'keyboard places a block');
  await page.waitForFunction(()=>!document.querySelector('#en-place').disabled);
  await page.locator('[data-en-piece="pillar"]').click();await page.locator('#en-rotate').click();
  await stage.focus();await page.keyboard.press('ArrowLeft');await page.keyboard.press('ArrowLeft');await page.keyboard.press('Enter');
  await page.waitForFunction(()=>document.querySelector('#en-volume').textContent.startsWith('7 '));
  ok(true,'rotated pillar settles on the first block');
  await page.waitForFunction(()=>!document.querySelector('#en-place').disabled);
  await page.locator('#en-undo').click();
  await page.waitForFunction(()=>document.querySelector('#en-volume').textContent.startsWith('4 '));
  ok(true,'undo restores the previous construction and volume');
  const source=await page.locator('[data-en-piece="plank"]').boundingBox(),dest=await stage.boundingBox();
  await page.mouse.move(source.x+source.width/2,source.y+source.height/2);await page.mouse.down();
  await page.mouse.move(dest.x+dest.width*.65,dest.y+dest.height*.45,{steps:10});await page.mouse.up();
  await page.waitForFunction(()=>!document.querySelector('#en-place').disabled);
  ok((await page.locator('#en-volume').innerText()).startsWith('8 '),'mouse drag places exactly one additional beam');
  await page.locator('#back-button').click();await page.locator('[data-en-mode="bridge"]').click();
  await page.locator('#en-test').click();
  ok((await page.locator('#en-status').innerText()).includes('hiányzik'),'incomplete road cannot be tested');
  const connect=async(a,b)=>{await page.locator(`[data-en-node="${a}"]`).click();await page.locator(`[data-en-node="${b}"]`).click();};
  for(let i=0;i<3;i++)await connect('d'+i,'d'+(i+1));
  ok(await page.locator('#en-budget').innerText()==='18','road consumes six units of budget');
  await page.locator('#en-test').click();
  await page.waitForFunction(()=>document.querySelector('#en-status').textContent.startsWith('Itt meghajlott'),{},{timeout:15000});
  ok(true,'unbraced road visibly fails under load');
  await page.screenshot({path:`output/playwright/engineering-bridge-failed-${engine}.png`});
  await page.locator('#en-edit').click();
  for(const pair of [['d1','t1'],['d2','t2'],['t1','t2'],['t1','d2'],['d0','t1'],['t2','d3']])await connect(...pair);
  ok(await page.locator('#en-budget').innerText()==='3','braced bridge fits within the material budget');
  await connect('d0','t0');await connect('t0','t1');
  ok((await page.locator('#en-status').innerText()).includes('Elfogyott'),'cannot exceed the material budget');
  await page.locator('#en-undo').click();
  ok(await page.locator('#en-budget').innerText()==='3','undo refunds the last beam');
  await page.locator('#en-test').click();
  await page.waitForFunction(()=>document.querySelector('#en-status').textContent.startsWith('Átért!'),{},{timeout:20000});
  ok(true,'braced bridge carries the car all the way across');
  await page.setViewportSize({width:390,height:844});
  await page.screenshot({path:`output/playwright/engineering-bridge-mobile-${engine}.png`,fullPage:true});
  const noPersistedEngineering=await page.evaluate(()=>{
    const saved=JSON.parse(localStorage.getItem('speech_game_progress_v1')||'{}');
    return !Object.hasOwn(saved,'engineering');
  });
  ok(noPersistedEngineering,'engineering records and plans are excluded from persistent progress');
  await page.locator('#back-button').click();await page.locator('[data-en-mode="bridge"]').click();
  ok(await page.locator('#en-budget').innerText()==='3','reentering within the session restores the bridge plan');
  await page.setViewportSize({width:1200,height:950});await page.locator('#en-test').click();
  await page.waitForFunction(()=>document.querySelector('#en-status').textContent.startsWith('Átért!'),{},{timeout:20000});
  await page.screenshot({path:`output/playwright/engineering-bridge-desktop-${engine}.png`});
  const connectLevel=async spans=>{
    for(let i=0;i<spans;i++)await connect('d'+i,'d'+(i+1));
    for(let i=1;i<spans;i++)await connect('d'+i,'t'+i);
    for(let i=1;i<spans-1;i++) {await connect('t'+i,'t'+(i+1));await connect('t'+i,'d'+(i+1));}
    await connect('d0','t1');await connect('t'+(spans-1),'d'+spans);
  };
  for(const level of [1,2]) {
    await page.locator(`[data-en-level="${level}"]`).click();
    await connectLevel(4);
    ok(await page.locator('#en-budget').innerText()===String([0,4,0][level]),`bridge ${level+1} fits its material budget`);
    await page.locator('#en-test').click();
    await page.waitForFunction(()=>document.querySelector('#en-status').textContent.startsWith('Átért!'),{},{timeout:20000});
    ok(true,`bridge ${level+1} carries its vehicle to the far bank`);
  }
  for(const size of [{width:390,height:844},{width:768,height:900},{width:932,height:430}]){
    await page.setViewportSize(size);
    ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`no horizontal overflow at ${size.width} × ${size.height}`);
  }
  await page.locator('#home-button').click();await enter();
  ok(await page.locator('[data-en-mode="drop"]').isVisible(),'home navigation leaves no stale active game');
  await page.locator('[data-en-mode="bridge"]').click();
  ok(await page.locator('#en-budget').innerText()==='0','the final bridge plan remains in the same session');
  await page.locator('[data-en-level="1"]').click();
  ok(await page.locator('#en-budget').innerText()==='4','the second bridge plan also remains in the same session');
  await page.reload();await enter();
  await page.locator('[data-en-mode="bridge"]').click();
  ok(await page.locator('#en-budget').innerText()==='24','a reload clears the unsaved bridge plan');
  ok(errors.length===0,'no browser errors: '+errors.join('; '));
  page.off('pageerror',errorListener);
  return checks;
}
