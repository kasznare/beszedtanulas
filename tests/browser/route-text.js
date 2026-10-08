// Run only in a dedicated disposable playwright-cli session: clears its test storage.
async page => {
  const checks = [], errors = [], ok = (value, message) => { if (!value) throw Error(message); checks.push(message); };
  page.on('pageerror', error => errors.push(error.message));
  await page.route('https://cdn.jsdelivr.net/**', route => route.fulfill({ contentType: 'text/javascript', body: '' }));
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const url = page.url();
  await page.evaluate(async () => { localStorage.clear(); for (const r of await navigator.serviceWorker.getRegistrations()) await r.unregister(); for (const c of await caches.keys()) await caches.delete(c); });
  await page.addInitScript(() => {
    window.routeNarration = [];
    document.addEventListener('narrationword', event => {
      if (event.detail.id === 'logic_route_steps') routeNarration.push(...['.logic-route-briefing', '[data-parcel]', '[data-blocked]', '[data-destination]', '.logic-directions', '.logic-path-plan', '#logic-check'].filter(selector => document.querySelector(`${selector}.is-narrated`)));
    });
  });
  await page.goto('about:blank'); await page.goto(url);
  const saved = () => page.evaluate(() => JSON.parse(localStorage.getItem('speech_game_progress_v1')));
  const home = async () => { if (await page.locator('#home-button').isVisible()) await page.locator('#home-button').click(); };
  const enter = async () => { await home(); await page.locator('#home [data-open="number-menu"]').click(); await page.locator('#number-menu [data-open="furfangliget"]').click(); await page.locator('[data-game="route"]').click(); };
  const parent = async () => { await home(); await page.locator('#parent-button').click(); const n = (await page.locator('#parent-gate-question').innerText()).match(/\d+/g).map(Number); await page.locator('#parent-gate-answers button').filter({ hasText: new RegExp(`^${n[0] + n[1]}$`) }).click(); };
  const puzzle = () => page.evaluate(async () => { const d = await import('./logic-data.js'), s = JSON.parse(localStorage.getItem('speech_game_progress_v1')).logic.sessions.route, t = d.generateTask('route', s.level, s.limit, s.seed); return { ...t, solution: d.routeSolution(t) }; });
  const direction = (delta, size) => ({ [-size]: 'up', [size]: 'down', [-1]: 'left', [1]: 'right' })[delta];
  const plan = async (path, size, keyboard = false) => {
    if (keyboard) await page.locator('#logic-directions').focus();
    for (let i = 1; i < path.length; i++) {
      const d = direction(path[i] - path[i - 1], size);
      if (keyboard) await page.keyboard.press({ up: 'ArrowUp', down: 'ArrowDown', left: 'ArrowLeft', right: 'ArrowRight' }[d]);
      else await page.locator(`[data-direction="${d}"]`).click();
    }
  };
  await enter();
  ok(await page.locator('.logic-board').count() === 1 && await page.locator('#logic-route-view').inputValue() === 'map', 'Existing players start in map mode');
  await page.locator('#logic-route-view').selectOption('steps');
  await page.waitForFunction(() => new Set(routeNarration).size === 7);
  ok(await page.evaluate(() => new Set(routeNarration).size === 7), 'Spoken instructions highlight the matching text, directions, list and trial button');
  await parent(); ok(await page.locator('#route-view').inputValue() === 'steps', 'In-game choice updates parent setting');
  await page.locator('#route-view').selectOption('map'); await enter();
  ok(await page.locator('.logic-board').count() === 1, 'Parent choice updates the game');
  await page.locator('#logic-route-view').selectOption('steps');
  for (const level of [1, 2, 3]) {
    if (level > 1) await page.locator('#logic-level').selectOption(String(level));
    const t = await puzzle(), rewards = (await saved()).rewards;
    ok(await page.locator('.logic-board, .logic-traveller, #logic-work img, .logic-parcels').count() === 0, `Level ${level}: no map, fox or automatic parcel progress`);
    const briefing = await page.locator('.logic-route-briefing').innerText();
    ok([t.start, t.end, ...t.parcels, ...t.blocked].every(c => briefing.includes(`${Math.floor(c / t.size) + 1}. sor, ${c % t.size + 1}. oszlop`)), `Level ${level}: all required positions are described`);
    await page.locator('#logic-check').click(); await page.waitForFunction(() => document.querySelector('#furfangliget').dataset.busy === 'false');
    ok((await saved()).rewards === rewards, `Level ${level}: empty plan earns no reward`);
    await page.locator('#logic-directions').focus(); await page.keyboard.press('ArrowUp');
    ok((await saved()).logic.sessions.route.path.length === 1, `Level ${level}: keyboard cannot leave the board`);
    await plan(t.solution.slice(0, 2), t.size);
    const partial = (await saved()).logic.sessions.route;
    await page.locator('#logic-route-view').selectOption('map');
    ok(await page.locator('[data-cell]').count() === t.size ** 2, `Level ${level}: map is still available`);
    await page.locator('#logic-route-view').selectOption('steps');
    ok(JSON.stringify((await saved()).logic.sessions.route) === JSON.stringify(partial), `Level ${level}: changing view preserves the attempt`);
    await page.reload(); await enter();
    ok(await page.locator('.logic-board').count() === 0 && JSON.stringify((await saved()).logic.sessions.route) === JSON.stringify(partial), `Level ${level}: view and partial plan survive reload`);
    await page.locator('#logic-undo').click();
    ok((await saved()).logic.sessions.route.path.length === 1, `Level ${level}: undo restores the previous plan`);
    await plan(t.solution.slice(0, 3), t.size); await page.locator('#logic-clear').click();
    ok((await saved()).logic.sessions.route.path.length === 1, `Level ${level}: restart clears the plan`);
    await page.locator('#logic-hint').click(); await page.locator('#logic-hint').click();
    ok(/Fel|Le|Balra|Jobbra/.test(await page.locator('.logic-hint-route').innerText()), `Level ${level}: second hint names a direction`);
    await page.locator('#logic-hint').click();
    ok(await page.locator('.logic-hint-route > span').count() === t.solution.length - 1, `Level ${level}: final hint lists a full solution`);
    await plan(t.solution, t.size, true);
    ok(JSON.stringify((await saved()).logic.sessions.route.path) === JSON.stringify(t.solution), `Level ${level}: full plan works with keyboard focus preserved`);
    ok(await page.locator('[data-plan-step]').count() === t.solution.length - 1 && !/[📦🏡]/u.test(await page.locator('.logic-path-plan').innerText()), `Level ${level}: step list does not reveal parcel pickups`);
    if (level === 3) {
      for (const [width, height] of [[375, 667], [932, 350], [834, 1194]]) {
        await page.setViewportSize({ width, height });
        ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `Text mode fits ${width}×${height}`);
        await page.screenshot({ path: `output/playwright/route-text-${width}.png`, fullPage: true });
      }
      await page.emulateMedia({ reducedMotion: 'no-preference' }); await page.locator('#logic-check').click();
      await page.waitForSelector('[data-plan-step][aria-current="step"]');
      ok(await page.locator('#logic-route-view').isDisabled(), 'View cannot change during the trial');
      await home();
      ok((await saved()).rewards === rewards && !(await saved()).logic.sessions.route.done, 'Leaving a trial cancels completion');
      await page.emulateMedia({ reducedMotion: 'reduce' }); await enter();
      ok(await page.locator('#logic-check').isEnabled(), 'Cancelled trial can be retried');
    }
    await page.locator('#logic-check').evaluate(button => { button.click(); button.click(); }); await page.waitForSelector('#logic-next');
    ok((await saved()).rewards === rewards + 1, `Level ${level}: full trial earns exactly one reward`);
    ok((await saved()).logic.games.route[level - 1].assisted === 1, `Level ${level}: hints are tracked as assisted`);
    await page.locator('#logic-route-view').selectOption('map');
    ok(await page.locator('.logic-traveller img').count() === 1 && await page.locator('#logic-next').count() === 1, `Level ${level}: completed route also renders on the map`);
    await page.locator('#logic-route-view').selectOption('steps');
  }
  await page.waitForFunction(() => document.querySelector('#offline-status').textContent.startsWith('Letöltve.'));
  await page.context().setOffline(true);
  try {
    await page.reload(); await enter(); await page.locator('#logic-next').click();
    const t = await puzzle(), rewards = (await saved()).rewards;
    await plan(t.solution, t.size); await page.locator('#logic-check').click(); await page.waitForSelector('#logic-next');
    ok((await saved()).rewards === rewards + 1, 'Text-only route completes offline');
    const duration = await page.evaluate(async () => { const audio = new AudioContext(); try { return (await audio.decodeAudioData(await (await fetch('./audio/voice/logic_route_steps.mp3')).arrayBuffer())).duration; } finally { await audio.close(); } });
    ok(duration > 5, 'New text-mode instructions are available offline');
  } finally { await page.context().setOffline(false); }
  ok(errors.length === 0, 'No runtime errors');
  return { count: checks.length, checks, errors };
}
