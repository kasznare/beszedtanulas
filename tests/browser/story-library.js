async page => {
  const errors = [], summaries = [];
  let checks = 0;
  const ok = (value, label) => { if (!value) throw Error(label); checks++; };
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('http://127.0.0.1:5187/output/story-library/');
  await page.waitForFunction(() => window.storyLibraryPreview?.ready);
  const stories = await page.evaluate(() => storyLibraryPreview.stories.map(({ id, duration, visualDuration, scenes }) => ({ id, duration, visualDuration, scenes: scenes.map(({ id, time }) => ({ id, time })) })));
  ok(stories.length === 12, 'Twelve stories');
  for (const story of stories) {
    await page.evaluate(id => storyLibraryPreview.select(id), story.id);
    await page.waitForFunction(() => storyLibraryPreview.ready);
    const result = await page.evaluate(story => {
      const visual = storyLibraryPreview.visual, host = document.querySelector('#visual');
      const render = time => visual.render(storyLibraryPreview.playbackTime(story.id, time));
      visual.setMotion(true);
      let poses = 0;
      for (let i = 0; i < story.scenes.length; i++) {
        const scene = story.scenes[i], end = story.scenes[i + 1]?.time ?? story.visualDuration;
        for (const t of [scene.time, scene.time + (end - scene.time) * .6, end - .001]) {
          render(t + (t === scene.time && t > 0 ? .00001 : 0)); poses++;
          if (host.dataset.scene !== scene.id || /NaN|undefined|Infinity/.test(host.innerHTML)) throw Error(`${story.id}/${scene.id}: invalid pose at ${t}`);
          if (new Set([...host.querySelectorAll('[data-actor]')].map(node => node.dataset.actor)).size !== host.querySelectorAll('[data-actor]').length) throw Error(`${story.id}/${scene.id}: duplicate actors`);
          const state = host.innerHTML;
          render(0); render(t + (t === scene.time && t > 0 ? .00001 : 0));
          if (host.innerHTML !== state) throw Error(`${story.id}/${scene.id}: seek depends on playback history`);
        }
        visual.setMotion(false); render(scene.time + .1);
        const still = host.innerHTML;
        render(end - .001);
        if (host.innerHTML !== still) throw Error(`${story.id}/${scene.id}: reduced motion moves`);
        visual.setMotion(true);
      }
      return { poses, scenes: story.scenes.length };
    }, story);
    ok(result.scenes === story.scenes.length, `${story.id}: complete deterministic scene coverage`);
    summaries.push({ id: story.id, ...result });
    await page.evaluate(() => storyLibraryPreview.seek(5));
    await page.waitForFunction(() => !document.querySelector('#audio').seeking);
    await page.locator('#play').click();
    await page.waitForFunction(id => !document.querySelector('#audio').paused && document.querySelector('#audio').currentTime > 5.1
      && Math.abs(Number(document.querySelector('#visual').dataset.time) - storyLibraryPreview.animationTime(id, document.querySelector('#audio').currentTime)) < .15, story.id);
    ok(true, `${story.id}: actual fixed audio drives animation`);
    await page.locator('#play').click();
    // WebKit can report one final device-clock correction after pause.
    await page.waitForFunction(() => {
      const audio = document.querySelector('#audio'), now = performance.now();
      if (!audio.paused) return false;
      const previous = window.storyPauseClock;
      if (!previous || previous.time !== audio.currentTime) { window.storyPauseClock = { time: audio.currentTime, since: now }; return false; }
      return now - previous.since > 800;
    });
    await page.evaluate(() => { delete window.storyPauseClock; });
    const frozen = await page.locator('#visual').innerHTML();
    await page.waitForTimeout(100);
    ok(frozen === await page.locator('#visual').innerHTML(), `${story.id}: pause freezes motion`);
  }
  for (const width of [375, 834, 1280]) {
    await page.setViewportSize({ width, height: 950 });
    ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `No overflow at ${width}px`);
  }
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.reload(); await page.waitForFunction(() => storyLibraryPreview?.ready);
  ok(!await page.locator('#motion').isChecked(), 'System reduced-motion preference');
  ok(!errors.length, `No JavaScript errors: ${errors.join(', ')}`);
  return { checks, summaries, errors };
}
