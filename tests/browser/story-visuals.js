async page => {
  const checks=[],errors=[];
  const ok=(condition,label)=>{if(!condition)throw Error(label);checks.push(label);};
  page.on('pageerror',error=>errors.push(error.message));
  await page.goto('http://127.0.0.1:5187/output/story-svg-full/');
  await page.waitForFunction(()=>window.fullStoryPreview?.ready);
  ok(await page.locator('#scene option').count()===14,'All fourteen narrated scenes are available');
  await page.locator('#play').click();
  await page.waitForFunction(()=>document.querySelector('#audio').currentTime>.2&&!document.querySelector('#audio').paused);
  await page.locator('#play').click();await page.waitForTimeout(80);
  const frozen=await page.locator('#visual').innerHTML();
  await page.waitForTimeout(200);
  ok(await page.locator('#visual').innerHTML()===frozen,'Pausing freezes every animated SVG pose');
  for(const [time,id] of [[0,'garden'],[35,'chase'],[55,'bend'],[70,'excavator'],[85,'dig'],[95,'fire-arrival'],[101,'water'],[119,'ambulance'],[139,'crane'],[156,'thanks'],[178,'team'],[199,'annipanni'],[220,'finish'],[240,'together']]){
    await page.evaluate(t=>window.fullStoryPreview.seek(t),time);await page.waitForTimeout(40);
    ok(await page.locator('#visual').getAttribute('data-scene')===id,`Seeking selects ${id} at ${time}s`);
    ok(await page.locator('#visual svg').evaluate(svg=>!/(?:NaN|undefined)/.test(svg.outerHTML)),`No invalid pose in ${id}`);
  }
  await page.evaluate(()=>window.fullStoryPreview.seek(101));await page.waitForTimeout(40);
  const original=await page.locator('#visual [data-actor="race"]').getAttribute('transform');
  ok(await page.locator('#visual [data-actor="race"] .sv-driver').getAttribute('opacity')==='0','The fox is outside the racing car after the accident');
  await page.evaluate(()=>window.fullStoryPreview.seek(35));await page.evaluate(()=>window.fullStoryPreview.seek(101));await page.waitForTimeout(40);
  ok(await page.locator('#visual [data-actor="race"]').getAttribute('transform')===original,'Forward/backward seeking restores the same vehicle pose');
  await page.locator('#motion').uncheck();const still=await page.locator('#visual').innerHTML();
  await page.evaluate(()=>window.fullStoryPreview.seek(102));await page.waitForTimeout(40);
  ok(await page.locator('#visual').innerHTML()===still,'Motion off uses a stable scene illustration');
  await page.locator('#motion').check();
  await page.evaluate(()=>window.fullStoryPreview.seek(246.05));await page.locator('#play').click();
  await page.waitForFunction(()=>document.querySelector('#audio').ended);
  ok(await page.locator('#visual').getAttribute('data-scene')==='together','The real recording finishes in the final scene');
  const finalPose=await page.locator('#visual').innerHTML();await page.waitForTimeout(150);
  ok(await page.locator('#visual').innerHTML()===finalPose,'The final scene holds after the recording ends');
  for(const width of [375,834,1280]){
    await page.setViewportSize({width,height:900});
    ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`No horizontal overflow at ${width}px`);
    ok(await page.locator('button').evaluateAll(buttons=>buttons.every(button=>button.getBoundingClientRect().height>=44)),`Touch buttons at least 44px at ${width}px`);
  }
  await page.emulateMedia({reducedMotion:'reduce'});await page.reload();await page.waitForFunction(()=>window.fullStoryPreview?.ready);
  ok(!await page.locator('#motion').isChecked(),'The system reduced-motion preference is respected');
  await page.emulateMedia({reducedMotion:'no-preference'});
  ok(errors.length===0,'No JavaScript errors');
  return {count:checks.length,checks,errors};
}
