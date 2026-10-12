// Visual QA: capture every scene on desktop and phone; screenshots remain local.
async page => {
  const summaries=[], errors=[];
  page.on('pageerror', error=>errors.push(error.message));
  await page.emulateMedia({reducedMotion:'no-preference'});
  await page.goto('http://127.0.0.1:5187/output/story-library/?story=story-13');
  await page.waitForFunction(()=>storyLibraryPreview?.ready);
  const stories=await page.evaluate(()=>storyLibraryPreview.stories.filter(s=>Number(s.id.slice(6))>=13).map(({id,duration,scenes})=>({id,duration,scenes})));
  for(const width of [1280,375]) {
    await page.setViewportSize({width,height:900});
    for(const story of stories) {
      await page.evaluate(id=>storyLibraryPreview.select(id),story.id);
      await page.waitForFunction(()=>storyLibraryPreview.ready);
      for(let i=0;i<story.scenes.length;i++) {
        const scene=story.scenes[i],end=story.scenes[i+1]?.time??story.duration;
        const t=scene.stillTime??scene.time+(end-scene.time)*.6;
        await page.evaluate(t=>{storyLibraryPreview.visual.setMotion(true);storyLibraryPreview.seek(t);},t);
        await page.waitForFunction(()=>!document.querySelector('#audio').seeking);
        await page.locator('#visual').screenshot({path:`output/playwright/${story.id}-${width}-${String(i+1).padStart(2,'0')}-${scene.id}.png`});
        const layout=await page.evaluate(()=>({overflow:document.documentElement.scrollWidth>innerWidth+1,svg:document.querySelector('#visual svg')?.getBoundingClientRect().width,invalid:/NaN|undefined|Infinity/.test(document.querySelector('#visual').innerHTML)}));
        if(layout.overflow||layout.invalid||layout.svg<300)throw Error(`${story.id}/${scene.id}/${width}: invalid layout`);
      }
      summaries.push({id:story.id,width,scenes:story.scenes.length});
    }
  }
  if(errors.length)throw Error(errors.join(', '));
  return {summaries,errors};
}
