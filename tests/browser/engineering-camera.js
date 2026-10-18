// Regression for drop-triggered zoom; runs in a disposable uncached context.
async page => {
  const context=await page.context().browser().newContext({serviceWorkers:'block'});
  const p=await context.newPage(), checks=[];
  const ok=(value,message)=>{if(!value)throw Error(message);checks.push(message);};
  try {
    await p.goto(new URL('/',page.url()).href);
    await p.locator('#home [data-open="activity-menu"]').click();await p.locator('#activity-menu [data-open="engineering"]').click();
    const observe=()=>p.evaluate(()=>{
      window.cameraChanges=[];
      const world=document.querySelector('#en-world');let previous=world.getAttribute('viewBox');
      window.cameraObserver=new MutationObserver(()=>{
        const next=world.getAttribute('viewBox');if(next===previous)return;
        window.cameraChanges.push({before:previous,after:next,falling:document.querySelector('#en-drop, #en-place').disabled});previous=next;
      });window.cameraObserver.observe(world,{attributes:true,attributeFilter:['viewBox']});
    });
    await p.locator('[data-en-mode="drop"]').click();await observe();
    const initial=await p.locator('#en-world').getAttribute('viewBox');
    await p.locator('#en-drop').click();await p.waitForFunction(()=>!document.querySelector('#en-drop').disabled);
    ok(await p.locator('#en-world').getAttribute('viewBox')===initial,'first drop leaves the camera unchanged');
    ok((await p.evaluate(()=>window.cameraChanges)).length===0,'no temporary zoom at any point during the first fall');
    await p.locator('#back-button').click();await p.locator('[data-en-mode="build"]').click();await observe();
    for(let i=0;i<6;i++){
      const stage=p.locator('#en-stage'),rect=await stage.boundingBox();
      await stage.click({position:{x:rect.width/2,y:rect.height*.08}});
      await p.waitForFunction(()=>!document.querySelector('#en-place').disabled);
    }
    ok((await p.locator('#en-count').innerText())==='6 elem','six blocks form a settled tower');
    const changes=await p.evaluate(()=>window.cameraChanges);
    ok(changes.length>0,'camera still fits a tall settled tower');
    ok(!changes.some(change=>change.falling),'camera never zooms while a piece is falling');
    const box=(await p.locator('#en-world').getAttribute('viewBox')).split(' ').map(Number);
    ok(box[1]<0&&box[3]>600,'tall tower receives extra room above');
    await p.locator('#en-restart').click();
    ok(await p.locator('#en-world').getAttribute('viewBox')==='0 0 800 600','restart restores the initial framing');
    return checks;
  } finally {await context.close();}
}
