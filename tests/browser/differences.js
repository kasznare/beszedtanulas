// Run against the served portal in a disposable Playwright browser context.
// Input uses click/tap/keyboard; evaluate reads state, stages the shared timer,
// and rasterizes authored SVG variants for the independent pixel-area audit.
async page => {
  const checks = [], errors = [], context = page.context(), url = page.url();
  const ok = (condition, label) => { if (!condition) throw Error(label); checks.push(label); };
  page.on('pageerror', error => errors.push(error.message));
  await context.setOffline(false);
  await page.evaluate(async () => { localStorage.clear(); for (const registration of await navigator.serviceWorker.getRegistrations()) await registration.unregister(); for (const cache of await caches.keys()) await caches.delete(cache); });
  await page.goto('about:blank'); await page.goto(url);
  await page.waitForFunction(() => localStorage.getItem('speech_game_progress_v1'));
  await page.evaluate(() => {
    const saved = JSON.parse(localStorage.getItem('speech_game_progress_v1'));
    saved.rewards = 17;
    saved.settings.spokenGuidance = false;
    saved.supabase.syncPaused = true;
    localStorage.setItem('speech_game_progress_v1', JSON.stringify(saved));
  });
  await page.reload();
  const progress = () => page.evaluate(() => localStorage.getItem('speech_game_progress_v1'));
  const originalProgress = await progress();
  await page.evaluate(() => { window.differenceVoices = []; document.addEventListener('narrationstart', event => differenceVoices.push(event.detail.id)); });
  const at = screen => page.waitForFunction(value => document.body.dataset.screen === value, screen);
  const found = () => page.locator('#differences').getAttribute('data-found-count').then(Number);
  const home = async () => {
    if (await page.locator('#round-complete').isVisible()) await page.locator('#round-home').click();
    else if (await page.locator('#home-button').isVisible()) await page.locator('#home-button').click();
  };
  const enter = async () => {
    await home();
    await page.locator('#home [data-open="activity-menu"]').click();
    await page.locator('#activity-menu [data-open="differences"]').click();
    await at('differences');
  };
  const choose = async (sceneId, levelId) => {
    await page.locator('#differences-change').click();
    await page.locator(`[data-difference-scene="${sceneId}"]`).click();
    await page.locator(`[data-difference-level="${levelId}"]`).click();
    await page.locator('#differences-apply').click();
    await page.waitForFunction(({ sceneId, levelId }) => {
      const root = document.querySelector('#differences');
      return root.dataset.sceneId === sceneId && root.dataset.levelId === levelId;
    }, { sceneId, levelId });
  };
  const active = () => page.evaluate(async () => {
    const { DIFFERENCE_SCENES } = await import('./differences-data.js');
    const root = document.querySelector('#differences');
    const scene = DIFFERENCE_SCENES.find(item => item.id === root.dataset.sceneId);
    const left = root.querySelector('[data-side="left"] .differences-art');
    const right = root.querySelector('[data-side="right"] .differences-art');
    const normalize = markup => markup.replace(/(?:url\(#|(?:id|href)=["']#?)[^"')\s]+/g, 'REF');
    return scene.differences.filter(item => normalize(left.querySelector(`[data-difference-id="${item.id}"]`).outerHTML) !== normalize(right.querySelector(`[data-difference-id="${item.id}"]`).outerHTML));
  });
  const tapPoint = async (side, x, y) => {
    const point = await page.locator(`.differences-picture[data-side="${side}"] .differences-art > svg`).evaluate((svg, point) => {
      const position = svg.createSVGPoint();
      position.x = point.x * 8; position.y = point.y * 5.2;
      const screen = position.matrixTransform(svg.getScreenCTM());
      return { x: screen.x, y: screen.y };
    }, { x, y });
    if (await page.evaluate(() => navigator.maxTouchPoints > 0)) await page.touchscreen.tap(point.x, point.y);
    else await page.mouse.click(point.x, point.y);
  };
  const tapDifference = (item, side = 'left') => tapPoint(side, item.area.x, item.area.y);
  const solveBoard = async () => {
    const details = await active();
    for (const [index, item] of details.entries()) await tapDifference(item, index % 2 ? 'right' : 'left');
  };
  const finish = async () => { await solveBoard(); await page.waitForSelector('#round-complete[open]'); };

  await enter();
  ok(await page.evaluate(() => !differenceVoices.includes('differences_start')), 'Disabled spoken guidance prevents automatic game narration');
  ok(await page.locator('.differences-picture').count() === 2, 'Both authored pictures are present');
  ok(await page.evaluate(() => JSON.parse(localStorage.getItem('beszedtanulas.playTime.v1')).startedAt !== null), 'Entering the new game starts the shared play-time budget');
  for (const sceneId of ['picnic', 'harbor', 'workshop', 'greenhouse']) {
    for (const [levelId, count] of [['starter', 3], ['explorer', 5], ['observer', 7], ['detective', 10]]) {
      await choose(sceneId, levelId);
      ok((await active()).length === count && await found() === 0, `${sceneId}/${levelId}: exact selected difference count and fresh board`);
    }
  }
  await choose('picnic', 'observer');
  let details = await active();
  await tapDifference(details[0], 'left');
  ok(await found() === 1, 'A difference accepts a tap on the left image');
  ok(await page.locator(`[data-found-id="${details[0].id}"]`).count() === 2, 'Found detail remains marked on both images');
  await tapDifference(details[0], 'right');
  ok(await found() === 1, 'Tapping the same detail on the other image cannot count twice');
  await tapDifference(details[1], 'right');
  ok(await found() === 2, 'A new difference accepts a tap on the right image');
  await tapPoint('left', 1, 1);
  ok(await found() === 2, 'A miss leaves the found count and round unchanged');
  await tapPoint('left', 1, 2); await tapPoint('left', 2, 1);
  ok(await page.locator('#differences.is-resting').count() === 1, 'Three quick misses start a short look-first pause');
  await tapDifference(details[2], 'left');
  ok(await found() === 2, 'Taps during the look-first pause are ignored');
  await page.waitForFunction(() => !document.querySelector('#differences').classList.contains('is-resting'), null, { timeout: 5000 });
  await page.locator('#differences-hint').click();
  ok(await found() === 2, 'Text help does not automatically solve a difference');
  await page.locator('#differences-hint').click();
  ok(await found() === 2 && await page.locator('[data-hint-stage]').count() > 0, 'Repeated help gently highlights an unresolved area');
  await page.locator('#help-button').click();
  await page.waitForFunction(() => differenceVoices.includes('differences_start'));
  ok(true, 'Manually requested narration works even with automatic guidance disabled');
  ok(await found() === 2, 'The shared help control also preserves the round');

  // Moving from a difference is a drag/scroll gesture, never a hit.
  const dragBox = await page.locator('.differences-picture[data-side="left"]').boundingBox();
  await page.mouse.move(dragBox.x + dragBox.width / 2, dragBox.y + dragBox.height / 2);
  await page.mouse.down(); await page.mouse.move(dragBox.x + dragBox.width / 2, dragBox.y + dragBox.height / 2 - 55, { steps: 5 }); await page.mouse.up();
  ok(await found() === 2, 'Dragging across a picture cannot produce an accidental find');

  if (context.browser().browserType().name() === 'chromium') {
    const touchTarget = await page.locator('.differences-picture[data-side="left"] .differences-art > svg').evaluate((svg, area) => {
      const point = svg.createSVGPoint(); point.x = area.x * 8; point.y = area.y * 5.2;
      const screen = point.matrixTransform(svg.getScreenCTM()); return { x: screen.x, y: screen.y };
    }, details[2].area);
    const cdp = await context.newCDPSession(page);
    const offset = details[2].area.y > 75 ? -35 : 35;
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: touchTarget.x, y: touchTarget.y + offset }] });
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: touchTarget.x, y: touchTarget.y + offset / 2 }] });
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: touchTarget.x, y: touchTarget.y }] });
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await cdp.detach();
    ok(await found() === 2, 'A real touch-drag ending on an unresolved detail does not count as a tap');
  }

  await finish();
  ok(await page.locator('#round-complete-title').innerText() === 'Minden különbséget megtaláltál!', 'Completing the board opens the shared success dialog');
  ok(await page.locator('#complete-stars').innerText() === '⭐⭐', 'Three misses and two hints leave two stars');
  ok(await progress() === originalProgress, 'Selection, help, misses, and completing a game preserve all existing saved progress');
  const completedIds = details.map(item => item.id).sort().join('|');
  await page.locator('#round-replay').click();
  ok(await found() === 0 && await page.locator('#differences').getAttribute('data-level-id') === 'observer', 'Még egy ilyen keeps the chosen difficulty and clears all found marks');
  ok((await active()).map(item => item.id).sort().join('|') !== completedIds, 'Replay changes the actual visible differences');
  await finish();
  ok(await page.locator('#complete-stars').innerText() === '⭐⭐⭐⭐⭐', 'A clean round earns five stars');
  await page.keyboard.press('Escape');
  ok(await found() === 7 && await page.locator('[data-found-id]').count() === 14 && await page.locator('.differences-picture').count() === 2, 'Escape closes the success dialog while keeping the complete marked picture pair');
  await page.locator('#differences-restart').click();
  await finish();
  await page.locator('#round-related [data-related-source="differences"]').click();
  await at('puzzle');
  const progressAfterRelated = await progress();
  ok(true, 'The related-game control opens the picture puzzle');
  await enter();
  await page.locator('#back-button').click(); await at('activity-menu');
  ok(true, 'Back returns to the containing game menu');
  await page.locator('#activity-menu [data-open="differences"]').click();
  await page.locator('#home-button').click(); await at('home');
  ok(true, 'Home leaves the round immediately');
  await enter();

  for (const [width, height] of [[390, 844], [430, 932], [844, 390], [834, 1194], [768, 1024], [375, 667]]) {
    await page.setViewportSize({ width, height });
    await choose('greenhouse', 'detective');
    await page.locator('#differences-hint').click();
    await page.locator('#differences-hint').click();
    const fit = await page.evaluate(() => {
      const selectors = ['.differences-picture[data-side="left"]', '.differences-picture[data-side="right"]', '#differences-progress', '#differences-status', '#differences-instruction', '.differences-zoom-help', '#differences-hint', '#differences-zoom', '#differences-change', '#differences-restart', '#back-button', '#home-button'];
      const outside = selectors.filter(selector => {
        const element = document.querySelector(selector);
        if (['#differences-instruction', '.differences-zoom-help'].includes(selector) && (element.hidden || getComputedStyle(element).display === 'none')) return false;
        const rect = element.getBoundingClientRect();
        return rect.width <= 0 || rect.height <= 0 || rect.left < -1 || rect.top < -1 || rect.right > innerWidth + 1 || rect.bottom > innerHeight + 1;
      });
      const small = [...document.querySelectorAll('#differences button, #back-button, #home-button')].filter(button => {
        if (button.closest('dialog:not([open])')) return false;
        const rect = button.getBoundingClientRect();
        return rect.width > 0 && rect.height > 0 && (rect.width < 43.9 || rect.height < 43.9);
      }).map(button => button.id);
      return { outside, small, overflow: document.documentElement.scrollWidth > innerWidth + 1 };
    });
    ok(!fit.overflow && !fit.outside.length && !fit.small.length, `${width}×${height}: full board/status/essential controls fit, all controls at least 44px (${JSON.stringify(fit)})`);
    details = await active();
    await tapDifference(details[0], 'right');
    ok(await found() === 1, `${width}×${height}: scaled coordinates still match the drawing`);
    await page.screenshot({ path: `output/playwright/differences-${context.browser().browserType().name()}-${width}x${height}.png`, scale: 'css' });
    await page.locator('#differences-zoom').click();
    const magnifierFit = await page.evaluate(() => ['.differences-picture[data-side="left"]', '.differences-picture[data-side="right"]', '#differences-status', '.differences-zoom-help'].filter(selector => {
      const rect = document.querySelector(selector).getBoundingClientRect();
      return rect.width <= 0 || rect.height <= 0 || rect.top < -1 || rect.bottom > innerHeight + 1 || rect.left < -1 || rect.right > innerWidth + 1;
    }));
    ok(!magnifierFit.length, `${width}×${height}: magnified pair, status, and pan guidance fit (${magnifierFit.join(', ')})`);
    await page.screenshot({ path: `output/playwright/differences-${context.browser().browserType().name()}-${width}x${height}-zoom.png`, scale: 'css' });
    await page.locator('#differences-zoom').click();
  }

  await choose('workshop', 'observer');
  details = await active();
  const keyboardTarget = details.reduce((best, item) => Math.hypot(item.area.x - 50, item.area.y - 50) < Math.hypot(best.area.x - 50, best.area.y - 50) ? item : best);
  for (const [delta, positive, negative] of [[keyboardTarget.area.x - 50, 'ArrowRight', 'ArrowLeft'], [keyboardTarget.area.y - 50, 'ArrowDown', 'ArrowUp']]) {
    for (let step = 0; step < Math.abs(Math.round(delta / 2.5)); step++) await page.keyboard.press(delta > 0 ? positive : negative);
  }
  await page.keyboard.press('Enter');
  ok(await found() === 1, 'Arrow keys and Enter can find an actual detail without pointer input');
  await page.keyboard.press('Space');
  ok(await found() === 1, 'Space on an already found keyboard target cannot double-count');
  const preservedIds = (await active()).map(item => item.id).sort().join('|');
  await page.locator('#differences-change').click();
  await page.locator('[data-difference-scene="harbor"]').click();
  await page.keyboard.press('Escape');
  ok(await found() === 1 && await page.locator('#differences').getAttribute('data-scene-id') === 'workshop', 'Cancelling scene selection preserves the current board and found marks');
  await page.locator('#differences-restart').click();
  ok(await found() === 0 && (await active()).map(item => item.id).sort().join('|') !== preservedIds, 'New round changes the visible details while retaining the chosen scene and level');
  await choose('greenhouse', 'detective');
  await page.locator('#differences-zoom').click();
  const zoomFit = await page.locator('.differences-zoom-help').evaluate(element => { const r = element.getBoundingClientRect(); return r.width > 0 && r.top >= 0 && r.bottom <= innerHeight && r.right <= innerWidth; });
  ok(zoomFit, 'Magnifier guidance remains visible with the full picture pair');
  const zoomBefore = await page.locator('.differences-art > svg').first().getAttribute('viewBox');
  ok(zoomBefore.split(' ').slice(2).join(' ') === '400 260', 'The magnifier doubles the authored picture scale');
  const zoomedBox = await page.locator('.differences-picture[data-side="right"]').boundingBox();
  await page.mouse.move(zoomedBox.x + zoomedBox.width / 2, zoomedBox.y + zoomedBox.height / 2);
  await page.mouse.down(); await page.mouse.move(zoomedBox.x + zoomedBox.width / 2 - 65, zoomedBox.y + zoomedBox.height / 2, { steps: 5 }); await page.mouse.up();
  const views = await page.locator('.differences-art > svg, .differences-overlay').evaluateAll(svgs => svgs.map(svg => svg.getAttribute('viewBox')));
  ok(new Set(views).size === 1 && views[0] !== zoomBefore && await found() === 0, 'Dragging magnified art pans both pictures and marks together without a find');
  const [vx, vy, vw, vh] = views[0].split(' ').map(Number);
  const zoomTarget = (await active()).find(item => item.area.x * 8 > vx + 15 && item.area.x * 8 < vx + vw - 15 && item.area.y * 5.2 > vy + 15 && item.area.y * 5.2 < vy + vh - 15);
  ok(Boolean(zoomTarget), 'The magnified test view contains an unresolved detail');
  await tapDifference(zoomTarget, 'right');
  ok(await found() === 1, 'A magnified tap maps back to the same authored hit area');
  await page.keyboard.press('Escape');
  ok(await page.locator('#differences-zoom').getAttribute('aria-pressed') === 'false' && await found() === 1, 'Escape restores the whole picture while retaining found marks');
  await page.screenshot({ path: `output/playwright/differences-${context.browser().browserType().name()}-keyboard-zoom.png`, scale: 'css' });

  await choose('picnic', 'explorer');
  await solveBoard();
  await page.locator('#differences-restart').click();
  await page.waitForTimeout(1200);
  ok(await found() === 0 && !(await page.locator('#round-complete').isVisible()), 'Restarting immediately after completion cancels the pending success dialog');
  await solveBoard();
  await page.locator('#home-button').click();
  await page.waitForTimeout(1200);
  ok(await page.locator('#home').isVisible() && !(await page.locator('#round-complete').isVisible()), 'Leaving immediately after completion cancels the pending success dialog');
  await enter();

  // Raster comparison checks pixels, not merely variant attributes or markup.
  const pixelAudit = await page.evaluate(async () => {
    const { DIFFERENCE_SCENES } = await import('./differences-data.js');
    const { renderDifferenceScene } = await import('./differences-art.js');
    const raster = async markup => {
      const canvas = document.createElement('canvas'); canvas.width = 800; canvas.height = 520;
      const image = new Image();
      image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(markup.replace('<svg ', '<svg width="800" height="520" '))}`;
      await image.decode();
      const ctx = canvas.getContext('2d', { willReadFrequently: true }); ctx.drawImage(image, 0, 0, 800, 520);
      return ctx.getImageData(0, 0, 800, 520).data;
    };
    const results = [];
    for (const scene of DIFFERENCE_SCENES) {
      const base = await raster(renderDifferenceScene(scene.id, [], 'pixels'));
      for (const item of scene.differences) {
        const variant = await raster(renderDifferenceScene(scene.id, [item.id], 'pixels'));
        let changed = 0, outside = 0, minX = 800, minY = 520, maxX = 0, maxY = 0;
        for (let i = 0; i < base.length; i += 4) {
          if (Math.max(...[0, 1, 2, 3].map(channel => Math.abs(base[i + channel] - variant[i + channel]))) < 8) continue;
          const x = (i / 4) % 800, y = Math.floor(i / 4 / 800), area = item.area;
          changed++; minX = Math.min(minX, x); minY = Math.min(minY, y); maxX = Math.max(maxX, x); maxY = Math.max(maxY, y);
          if (((((x + .5) / 8) - area.x) / area.rx) ** 2 + (((((y + .5) / 5.2) - area.y) / area.ry) ** 2) > 1.03) outside++;
        }
        results.push({ scene: scene.id, id: item.id, changed, outside, bounds: [minX, minY, maxX, maxY] });
      }
    }
    return results;
  });
  for (const result of pixelAudit) ok(result.changed >= 20 && result.outside === 0, `${result.scene}/${result.id}: ${result.changed} actual changed pixels are inside the accepted hit area (${result.outside} outside)`);

  await page.setViewportSize({ width: 390, height: 844 });
  await home();
  await page.evaluate(() => localStorage.setItem('beszedtanulas.playTime.v1', JSON.stringify({ version: 1, cycle: 'differences-qa', startedAt: Date.now() - 1800000 + 10000 })));
  await page.reload(); await enter();
  await page.waitForFunction(() => document.body.dataset.screen === 'play-break', undefined, { timeout: 15000 });
  ok(!(await page.locator('#round-complete').isVisible()), 'The shared deadline interrupts the difference game without a stale completion dialog');
  ok(await progress() === progressAfterRelated, 'Timer interruption and navigation do not alter pre-existing progress');
  await page.evaluate(() => localStorage.removeItem('beszedtanulas.playTime.v1'));
  await page.reload();

  // The parent build must finish the current offline manifest before this phase.
  await page.waitForFunction(() => navigator.serviceWorker.controller && document.querySelector('#offline-status')?.textContent.startsWith('Letöltve.'), undefined, { timeout: 60000 });
  await context.setOffline(true);
  try {
    await page.reload(); await enter();
    await choose('harbor', 'explorer');
    details = await active(); await tapDifference(details[0], 'right');
    ok(await found() === 1, 'The complete game, drawings, and interaction load and work offline');
    const cached = await page.evaluate(async () => {
      const files = ['differences-data.js', 'differences-art.js', 'differences-game.js', 'differences-voice.js', 'differences.css', ...['start', 'hint', 'closer', 'done'].map(name => `audio/voice/differences_${name}.mp3`)];
      return Promise.all(files.map(async file => ({ file, ok: Boolean(await caches.match(new URL(file, location.href))) })));
    });
    ok(cached.every(item => item.ok), 'All difference-game runtime files and four narration clips are in the offline cache');
    await page.evaluate(() => { window.offlineDifferenceVoices = []; document.addEventListener('narrationstart', event => offlineDifferenceVoices.push(event.detail.id)); });
    await page.locator('#help-button').click();
    await page.waitForFunction(() => offlineDifferenceVoices.includes('differences_start'));
    ok(true, 'Manually requested difference-game narration starts with the network disabled');
    const offlineDurations = await page.evaluate(async () => {
      const audio = new (window.AudioContext || window.webkitAudioContext)(), durations = [];
      try {
        for (const name of ['start', 'hint', 'closer', 'done']) {
          const response = await fetch(`./audio/voice/differences_${name}.mp3`);
          durations.push((await audio.decodeAudioData(await response.arrayBuffer())).duration);
        }
      } finally { await audio.close(); }
      return durations;
    });
    ok(offlineDurations.every(duration => duration > .2), 'All four offline MP3 narration clips decode as real playable audio');
  } finally { await context.setOffline(false); }
  ok(errors.length === 0, `No JavaScript errors: ${errors.join('; ')}`);
  return { count: checks.length, checks, pixelAudit };
}
