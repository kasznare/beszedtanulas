// Disposable Playwright contexts only. Real tap/keyboard input drives the game;
// evaluate reads visible pattern keys and stages storage/audio observations.
async page => {
  const checks = [], errors = [], layoutAudit = [], context = page.context(), url = page.url();
  const ok = (condition, label) => { if (!condition) throw Error(label); checks.push(label); };
  page.on('pageerror', error => errors.push(error.message));
  await context.setOffline(false);
  await page.evaluate(async () => {
    localStorage.clear();
    for (const registration of await navigator.serviceWorker.getRegistrations()) await registration.unregister();
    for (const name of await caches.keys()) await caches.delete(name);
  });
  await page.goto('about:blank'); await page.goto(url);
  await page.waitForFunction(() => localStorage.getItem('speech_game_progress_v1'));
  await page.evaluate(() => {
    const saved = JSON.parse(localStorage.getItem('speech_game_progress_v1'));
    saved.rewards = 17; saved.settings.spokenGuidance = false; saved.supabase.syncPaused = true;
    localStorage.setItem('speech_game_progress_v1', JSON.stringify(saved));
  });
  await page.reload();
  const saved = () => page.evaluate(() => localStorage.getItem('speech_game_progress_v1'));
  const originalProgress = await saved();
  await page.evaluate(() => { window.patternVoices = []; document.addEventListener('narrationstart', event => patternVoices.push(event.detail.id)); });
  const at = screen => page.waitForFunction(value => document.body.dataset.screen === value, screen);
  const count = () => page.locator('#patterns').getAttribute('data-placed-count').then(Number);
  const waitUnlocked = () => page.waitForFunction(() => document.querySelector('#patterns').dataset.answerLocked === 'false');
  const tap = async locator => {
    if (await page.evaluate(() => navigator.maxTouchPoints > 0)) await locator.tap();
    else await locator.click();
  };
  const home = async () => {
    if (await page.locator('#round-complete').isVisible()) await page.locator('#round-home').click();
    else if (await page.locator('#home-button').isVisible()) await page.locator('#home-button').click();
  };
  const enter = async () => {
    await home();
    await page.locator('#home [data-open="shape-menu"]').click();
    await page.locator('#shape-menu [data-open="patterns"]').click(); await at('patterns');
  };
  const choose = async (levelId, familyId) => {
    await page.locator('#patterns-change').click();
    await page.locator(`[data-pattern-level="${levelId}"]`).click();
    await page.locator(`[data-pattern-family="${familyId}"]`).click();
    await page.locator('#patterns-apply').click();
    await page.waitForFunction(options => {
      const root = document.querySelector('#patterns');
      return root.dataset.levelId === options.levelId && root.dataset.familyId === options.familyId && root.dataset.placedCount === '0';
    }, { levelId, familyId });
  };
  const pattern = () => page.locator('.patterns-preview-cell').evaluateAll(cells => cells.map(cell => cell.dataset.tokenKey));
  const expected = async () => {
    const preview = await pattern(), placed = await count();
    const period = Array.from({ length: Math.floor(preview.length / 2) }, (_, index) => index + 1)
      .find(length => preview.every((key, index) => key === preview[index % length]));
    if (!period) throw Error('The visible preview must demonstrate a repeating pattern');
    return preview[(preview.length + placed) % period];
  };
  const choiceFor = key => page.locator('[data-pattern-choice]').filter({ has: page.locator(`svg[data-pattern-token="${key}"]`) });
  const correct = async () => { await waitUnlocked(); await tap(choiceFor(await expected())); };
  const solveBoard = async () => { while (await count() < 3) await correct(); };
  const finish = async () => { await solveBoard(); await page.waitForSelector('#round-complete[open]'); };
  const scrollTo = async edge => {
    // Mobile WebKit does not expose wheel injection; locator scrolling uses
    // the engine's native scrolling without modifying layout or hit targets.
    if (context.browser().browserType().name() === 'webkit') await page.locator(edge === 'top' ? '.app-bar' : '#patterns-status').scrollIntoViewIfNeeded();
    else {
      await page.mouse.wheel(0, edge === 'top' ? -3000 : 3000);
      await page.waitForFunction(edge => edge === 'top' ? scrollY < 1 : scrollY + innerHeight >= document.documentElement.scrollHeight - 2, edge);
    }
  };
  const fit = async label => {
    await scrollTo('top');
    const result = await page.evaluate(() => {
      const selectors = ['.patterns-preview-cell', '.patterns-answer-slot', '[data-pattern-choice]', '#patterns-progress', '#patterns-status', '#patterns-hint', '#patterns-undo', '#patterns-restart', '#patterns-change', '#home-button', '#back-button'];
      const rects = selectors.flatMap(selector => [...document.querySelectorAll(selector)].map(element => ({ name: element.id || element.className, rect: element.getBoundingClientRect() })));
      const outsideX = rects.filter(({ rect }) => rect.width <= 0 || rect.height <= 0 || rect.left < -1 || rect.right > innerWidth + 1).map(item => item.name);
      const outsideY = rects.filter(({ rect }) => rect.top < -1 || rect.bottom > innerHeight + 1).map(item => item.name);
      const small = [...document.querySelectorAll('#patterns button, #home-button, #back-button, #help-button')].filter(button => {
        if (button.closest('dialog:not([open])')) return false;
        const rect = button.getBoundingClientRect();
        return rect.width > 0 && rect.height > 0 && (rect.width < 43.9 || rect.height < 43.9);
      }).map(button => button.id || button.dataset.patternChoice);
      const cells = [...document.querySelectorAll('.patterns-preview-cell')].map(cell => ({ index: Number(cell.dataset.previewIndex), rect: cell.getBoundingClientRect() }));
      const visualOrder = [...cells].sort((a, b) => Math.abs(a.rect.top - b.rect.top) < 2 ? a.rect.left - b.rect.left : a.rect.top - b.rect.top).map(cell => cell.index);
      return { outsideX, outsideY, small, visualOrder, count: cells.length, overflow: document.documentElement.scrollWidth > innerWidth + 1, scrollAllowed: innerHeight > innerWidth || innerHeight <= 600 };
    });
    ok(!result.outsideX.length && !result.small.length && !result.overflow && (result.scrollAllowed || !result.outsideY.length), `${label}: no horizontal clipping, 44px controls, and required viewport fit (${JSON.stringify(result)})`);
    ok(result.visualOrder.every((index, position) => index === position), `${label}: visual rows preserve the left-to-right sequence order`);
    layoutAudit.push({ label, scrollRequired: result.outsideY.length > 0, ...result });
    if (result.outsideY.length) {
      await page.screenshot({ path: `output/playwright/patterns-${context.browser().browserType().name()}-${label}-top.png`, scale: 'css' });
      await scrollTo('bottom');
      const reachable = await page.evaluate(() => ['[data-pattern-choice]', '#patterns-hint', '#patterns-undo', '#patterns-restart', '#patterns-status'].every(selector => [...document.querySelectorAll(selector)].every(element => { const r = element.getBoundingClientRect(); return r.top >= -1 && r.bottom <= innerHeight + 1; })));
      ok(reachable, `${label}: ordinary vertical scrolling exposes every choice, action, and feedback line`);
      await page.screenshot({ path: `output/playwright/patterns-${context.browser().browserType().name()}-${label}-controls.png`, scale: 'css' });
      await scrollTo('top');
    }
  };

  await enter();
  ok(await page.locator('.patterns-answer-slot').count() === 3, 'The direct game shows three continuation spaces');
  ok(await page.evaluate(() => !patternVoices.includes('patterns_start')), 'Automatic narration respects the disabled guidance setting');
  ok(await page.evaluate(() => JSON.parse(localStorage.getItem('beszedtanulas.playTime.v1')).startedAt !== null), 'Entering the pattern game starts the shared play-time budget');
  for (const levelId of ['starter', 'explorer', 'thinker']) for (const familyId of ['mixed', 'shapes', 'colors', 'sizes', 'directions']) {
    await choose(levelId, familyId);
    ok(await page.locator('[data-pattern-choice]').count() === (familyId === 'sizes' ? 3 : 4), `${levelId}/${familyId}: correct number of distinct choices`);
    await correct();
    ok(await count() === 1 && await page.locator('.patterns-answer-slot.is-filled').count() === 1, `${levelId}/${familyId}: the visible rule accepts its next element`);
  }
  await choose('explorer', 'shapes');
  const choicesBefore = await page.locator('[data-pattern-choice]').evaluateAll(buttons => buttons.map(button => button.dataset.tokenKey));
  const correctKey = await expected();
  const wrong = page.locator('[data-pattern-choice]').filter({ hasNot: page.locator(`svg[data-pattern-token="${correctKey}"]`) }).first();
  await tap(wrong);
  ok(await page.evaluate(() => !patternVoices.includes('patterns_retry')), 'A wrong answer respects disabled automatic spoken guidance');
  ok(await count() === 0 && await page.locator('.patterns-answer-slot.is-filled').count() === 0, 'A wrong tap gives feedback without filling or advancing an answer');
  ok(Boolean((await page.locator('#patterns-status').innerText()).trim()), 'A wrong answer has a readable gentle response');
  await page.locator('#patterns-hint').click();
  ok(await count() === 0 && await page.locator('#patterns').getAttribute('data-hint-stage') === '1' && await page.locator('.patterns-preview-cell.is-motif').count() > 0, 'First help marks the repeating unit without solving the answer');
  ok(await page.locator('.patterns-preview-cell.is-reference').getAttribute('data-token-key') === await expected(), 'The first hint identifies the matching earlier position in the visible sequence');
  await page.locator('#patterns-hint').click();
  ok(await count() === 0 && await page.locator('[data-pattern-choice].is-hint').count() === 1 && await page.locator('[data-pattern-choice].is-hint').getAttribute('data-token-key') === await expected(), 'Second help points to one answer while leaving the child in control');
  await page.locator('#help-button').click();
  await page.waitForFunction(() => patternVoices.includes('patterns_start'));
  ok(true, 'Manually requested spoken help works with automatic guidance disabled');
  await waitUnlocked();
  const target = choiceFor(await expected());
  await target.scrollIntoViewIfNeeded();
  const quickPoint = await target.boundingBox();
  if (await page.evaluate(() => navigator.maxTouchPoints > 0)) {
    await page.touchscreen.tap(quickPoint.x + quickPoint.width / 2, quickPoint.y + quickPoint.height / 2);
    await page.touchscreen.tap(quickPoint.x + quickPoint.width / 2, quickPoint.y + quickPoint.height / 2);
  } else {
    await page.mouse.click(quickPoint.x + quickPoint.width / 2, quickPoint.y + quickPoint.height / 2);
    await page.mouse.click(quickPoint.x + quickPoint.width / 2, quickPoint.y + quickPoint.height / 2);
  }
  ok(await count() === 1, 'A fast repeated tap cannot fill two consecutive positions');
  await waitUnlocked();
  ok(await page.locator('.patterns-answer-slot.is-current').getAttribute('data-answer-index') === '1', 'A correct choice automatically selects the next empty position');
  ok(JSON.stringify(await page.locator('[data-pattern-choice]').evaluateAll(buttons => buttons.map(button => button.dataset.tokenKey))) === JSON.stringify(choicesBefore), 'Choice positions remain stable throughout the round');
  await page.locator('#patterns-undo').click();
  ok(await count() === 0 && await page.locator('.patterns-answer-slot.is-filled').count() === 0, 'Undo removes the last accepted element and returns to that position');
  await page.locator('[data-pattern-choice="0"]').press('ArrowRight');
  ok(await page.evaluate(() => document.activeElement.dataset.patternChoice) === '1', 'Arrow keys move between choice buttons');
  await page.keyboard.press('End');
  ok(await page.evaluate(() => document.activeElement.dataset.patternChoice) === String(await page.locator('[data-pattern-choice]').count() - 1), 'End focuses the final choice');
  await page.keyboard.press('Home'); await page.keyboard.press('ArrowLeft');
  ok(await page.evaluate(() => document.activeElement.dataset.patternChoice) === String(await page.locator('[data-pattern-choice]').count() - 1), 'Home and ArrowLeft support wrapping keyboard navigation');
  await waitUnlocked(); await choiceFor(await expected()).press('Enter');
  ok(await count() === 1, 'Keyboard Enter can place a correct element');
  const beforeCancel = (await pattern()).join('|');
  await page.locator('#patterns-change').click(); await page.locator('[data-pattern-family="directions"]').click();
  await page.keyboard.press('Escape');
  ok(await count() === 1 && (await pattern()).join('|') === beforeCancel && await page.locator('#patterns').getAttribute('data-family-id') === 'shapes', 'Cancelling the chooser preserves the current pattern and placed elements');
  await finish();
  ok(await page.locator('#round-complete-title').innerText() === 'Sikerült folytatnod a mintát!', 'Three correct choices open the shared success dialog');
  ok(await saved() === originalProgress, 'Choices, help, mistakes, undo, and completion preserve all pre-existing saved progress');
  await page.keyboard.press('Escape');
  ok(await count() === 3 && await page.locator('.patterns-answer-slot.is-filled').count() === 3, 'Escape keeps the full completed pattern visible');
  await page.locator('#patterns-restart').click(); await finish();
  const completedPattern = (await pattern()).join('|');
  await page.locator('#round-replay').click();
  ok(await count() === 0 && await page.locator('#patterns').getAttribute('data-level-id') === 'explorer' && await page.locator('#patterns').getAttribute('data-family-id') === 'shapes', 'Még egy ilyen keeps the selected level and family');
  ok((await pattern()).join('|') !== completedPattern, 'Replay changes the actual visible pattern');
  await finish();
  await page.locator('#round-related [data-related-source="patterns"]').click(); await at('workshop');
  ok(true, 'The related activity opens the existing pattern workshop');
  const progressAfterRelated = await saved();
  await enter(); await page.locator('#back-button').click(); await at('shape-menu');
  ok(true, 'Back returns to the shapes and patterns menu');
  await page.locator('#shape-menu [data-open="patterns"]').click(); await page.locator('#home-button').click(); await at('home');
  ok(true, 'Home leaves the new game immediately');
  await enter();

  for (const [width, height] of [[390, 844], [430, 932], [844, 390], [834, 1194], [768, 1024], [375, 667], [667, 375], [568, 320]]) {
    await page.setViewportSize({ width, height });
    await choose('thinker', 'mixed');
    // Find the densest real task using the normal New round control.
    for (let attempt = 0; (await pattern()).length < 12 && attempt < 30; attempt++) await page.locator('#patterns-restart').click();
    ok((await pattern()).length === 12, `${width}×${height}: the advanced mixed family can show its complete twelve-token example`);
    await page.locator('#patterns-hint').click(); await page.locator('#patterns-hint').click();
    await fit(`${width}×${height}`);
    await correct();
    ok(await count() === 1, `${width}×${height}: a touch still places the correct visible token`);
    await page.screenshot({ path: `output/playwright/patterns-${context.browser().browserType().name()}-${width}x${height}.png`, scale: 'css' });
  }

  await choose('starter', 'shapes');
  for (let attempt = 0; new Set(await pattern()).size !== 2 && attempt < 20; attempt++) await page.locator('#patterns-restart').click();
  ok(new Set(await pattern()).size === 2, 'The beginner family includes a two-token alternating task');
  await correct(); await correct(); await waitUnlocked(); await page.locator('#patterns-hint').click();
  ok(await page.locator('.patterns-answer-slot.is-reference').count() === 1 && await page.locator('.patterns-answer-slot.is-reference').getAttribute('data-token-key') === await expected(), 'Late help correctly points to an already placed token from the previous repetition');

  await choose('starter', 'directions'); await solveBoard();
  await page.locator('#patterns-restart').click(); await page.waitForTimeout(1200);
  ok(await count() === 0 && !(await page.locator('#round-complete').isVisible()), 'Restart immediately after completion cancels the pending success dialog');
  await solveBoard(); await page.locator('#home-button').click(); await page.waitForTimeout(1200);
  ok(await page.locator('#home').isVisible() && !(await page.locator('#round-complete').isVisible()), 'Leaving immediately after completion prevents a stale success dialog');

  // SVG rasterization catches accidentally identical drawings whose token keys
  // differ only in metadata, especially size and arrow direction alternatives.
  const artAudit = await page.evaluate(async () => {
    const { createPatternRound } = await import('./patterns-data.js');
    const { patternTokenArt } = await import('./patterns-art.js');
    const raster = async token => {
      const canvas = document.createElement('canvas'); canvas.width = canvas.height = 120;
      const image = new Image(); image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(patternTokenArt(token).replace('<svg ', '<svg width="120" height="120" '))}`;
      await image.decode(); const ctx = canvas.getContext('2d'); ctx.drawImage(image, 0, 0, 120, 120);
      return ctx.getImageData(0, 0, 120, 120).data;
    };
    const results = [];
    for (const levelId of ['starter', 'explorer', 'thinker']) for (const familyId of ['mixed', 'shapes', 'colors', 'sizes', 'directions']) {
      const round = createPatternRound({ levelId, familyId, seed: 123456789 });
      const images = await Promise.all(round.choices.map(raster)); let minimum = Infinity;
      for (let i = 0; i < images.length; i++) for (let j = i + 1; j < images.length; j++) {
        let changed = 0;
        for (let pixel = 0; pixel < images[i].length; pixel += 4) if ([0, 1, 2, 3].some(channel => Math.abs(images[i][pixel + channel] - images[j][pixel + channel]) > 8)) changed++;
        minimum = Math.min(minimum, changed);
      }
      results.push({ levelId, familyId, minimum });
    }
    return results;
  });
  for (const result of artAudit) ok(result.minimum >= 50, `${result.levelId}/${result.familyId}: choices differ in at least ${result.minimum} actual rendered pixels`);

  await page.setViewportSize({ width: 390, height: 844 });
  await page.evaluate(() => localStorage.setItem('beszedtanulas.playTime.v1', JSON.stringify({ version: 1, cycle: 'patterns-qa', startedAt: Date.now() - 1800000 + 10000 })));
  await page.reload(); await enter();
  await page.waitForFunction(() => document.body.dataset.screen === 'play-break', undefined, { timeout: 15000 });
  ok(!(await page.locator('#round-complete').isVisible()), 'The shared time limit interrupts the pattern game cleanly');
  ok(await saved() === progressAfterRelated, 'Navigation and time-limit interruption preserve existing saved progress');
  await page.evaluate(() => localStorage.removeItem('beszedtanulas.playTime.v1')); await page.reload();

  await page.waitForFunction(() => navigator.serviceWorker.controller && document.querySelector('#offline-status')?.textContent.startsWith('Letöltve.'), undefined, { timeout: 60000 });
  await context.setOffline(true);
  try {
    await page.reload(); await enter(); await choose('explorer', 'sizes'); await correct();
    ok(await count() === 1, 'The full game loads and accepts answers after an offline reload');
    const cacheAndAudio = await page.evaluate(async () => {
      const files = ['patterns-data.js', 'patterns-art.js', 'patterns-game.js', 'patterns-voice.js', 'patterns.css', ...['start', 'hint', 'retry', 'done'].map(name => `audio/voice/patterns_${name}.mp3`)];
      const missing = [];
      for (const file of files) if (!(await caches.match(new URL(file, location.href)))) missing.push(file);
      const audio = new (window.AudioContext || window.webkitAudioContext)(), durations = [];
      try { for (const name of ['start', 'hint', 'retry', 'done']) durations.push((await audio.decodeAudioData(await (await fetch(`./audio/voice/patterns_${name}.mp3`)).arrayBuffer())).duration); }
      finally { await audio.close(); }
      return { missing, durations };
    });
    ok(!cacheAndAudio.missing.length && cacheAndAudio.durations.every(duration => duration > .2), 'All runtime files and four real decodable narration clips are cached offline');
    await page.evaluate(() => { window.offlinePatternVoices = []; document.addEventListener('narrationstart', event => offlinePatternVoices.push(event.detail.id)); });
    await page.locator('#help-button').click(); await page.waitForFunction(() => offlinePatternVoices.includes('patterns_start'));
    ok(true, 'Manual spoken pattern guidance starts with the network disabled');
  } finally { await context.setOffline(false); }
  ok(errors.length === 0, `No JavaScript errors: ${errors.join('; ')}`);
  return { count: checks.length, checks, artAudit, layoutAudit };
}
