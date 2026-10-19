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
      if (event.detail.id === 'logic_route_steps') routeNarration.push(...['.logic-board', '[data-parcel]', '.logic-cell.blocked', '[data-destination]', '.logic-directions', '.logic-path-plan', '#logic-check'].filter(selector => document.querySelector(`${selector}.is-narrated`)));
    });
  });
  await page.goto('about:blank'); await page.goto(url);
  const saved = () => page.evaluate(() => JSON.parse(localStorage.getItem('speech_game_progress_v1')));
  const home = async () => { if (await page.locator('#home-button').isVisible()) await page.locator('#home-button').click(); };
  const enter = async () => { await home(); await page.locator('#home [data-open="big-menu"]').click(); await page.locator('#big-menu [data-open="furfangliget"]').click(); await page.locator('[data-game="route"]').click(); };
  const parent = async () => { await home(); await page.locator('#parent-button').click(); const n = (await page.locator('#parent-gate-question').innerText()).match(/\d+/g).map(Number); await page.locator('#parent-gate-answers button').filter({ hasText: new RegExp(`^${n[0] + n[1]}$`) }).click(); };
  const puzzle = () => page.evaluate(async () => { const d = await import('./logic-data.js'), s = JSON.parse(localStorage.getItem('speech_game_progress_v1')).logic.sessions.route, t = d.generateTask('route', s.level, s.limit, s.seed); return { ...t, solution: d.routeSolution(t) }; });
  const foxPosition = () => page.locator('.logic-traveller').evaluate(el => Number(el.dataset.position));
  const boardState = () => page.locator('.logic-board-wrap').evaluate(el => {
    const fox = el.querySelector('.logic-traveller');
    return JSON.stringify({ position: fox.dataset.position, transform: fox.style.transform, cells: [...el.querySelectorAll('[data-cell]')].map(cell => ({ label: cell.getAttribute('aria-label'), text: cell.textContent, markings: ['on-path', 'path-end', 'hint-cell', 'next-cell'].filter(name => cell.classList.contains(name)) })) });
  });
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
  ok(await page.locator('.logic-board').count() === 1 && await page.locator('#logic-route-view').inputValue() === 'map', 'Existing players start with a visible map and immediate movement');
  await page.locator('#logic-route-view').selectOption('steps');
  await parent(); ok(await page.locator('#route-view').inputValue() === 'steps', 'In-game movement choice updates parent setting');
  await page.locator('#route-view').selectOption('map'); await enter();
  ok(await page.locator('#logic-route-view').inputValue() === 'map', 'Parent movement choice updates the game');
  for (const level of [1, 2, 3]) {
    if (level > 1) await page.locator('#logic-level').selectOption(String(level));
    const t = await puzzle(), rewards = (await saved()).rewards;
    await plan(t.solution.slice(0, 2), t.size);
    ok(await foxPosition() === t.solution[1], `Level ${level}: immediate mode moves the fox after choosing a direction`);
    ok(await page.locator(`#logic-cell-${t.solution[1]}`).evaluate(el => el.classList.contains('path-end')), `Level ${level}: map highlights the current position`);
    await page.locator('#logic-undo').click();
    ok(await foxPosition() === t.start, `Level ${level}: undo also restores the visible fox`);
    const parcelIndex = t.solution.findIndex(cell => t.parcels.includes(cell));
    await plan(t.solution.slice(0, parcelIndex + 1), t.size);
    ok(await page.locator('.logic-parcels .is-planned').count() >= 1 && await page.locator(`#logic-cell-${t.solution[parcelIndex]} > span`).innerText() === '✓', `Level ${level}: immediate mode previews parcel pickup`);
    const partial = (await saved()).logic.sessions.route;
    await page.locator('#logic-route-view').selectOption('steps');
    ok(JSON.stringify((await saved()).logic.sessions.route) === JSON.stringify(partial) && await foxPosition() === t.start, `Level ${level}: deferred mode preserves the program and returns the fox to the start`);
    ok(await page.locator('[data-cell]').count() === t.size ** 2 && await page.locator('.logic-traveller img').count() === 1, `Level ${level}: deferred mode keeps the entire map and fox visible`);
    ok(await page.locator('.logic-cell.on-path').count() === 1 && await page.locator('.logic-cell.next-cell, .logic-cell small, .logic-parcels .is-planned').count() === 0, `Level ${level}: deferred mode reveals no planned position, route or parcel pickup`);
    ok(!/[📦🏡]/u.test(await page.locator('.logic-path-plan').innerText()), `Level ${level}: deferred program contains only numbered directions`);
    await page.reload(); await enter();
    ok(await page.locator('#logic-route-view').inputValue() === 'steps' && await foxPosition() === t.start && JSON.stringify((await saved()).logic.sessions.route) === JSON.stringify(partial), `Level ${level}: saved movement choice and partial program survive reload`);
    await page.locator('#logic-clear').click();
    ok((await saved()).logic.sessions.route.path.length === 1, `Level ${level}: restart clears the program`);
    const initialBoard = await boardState();
    await page.locator('#logic-directions').focus(); await page.keyboard.press('ArrowUp');
    ok((await saved()).logic.sessions.route.path.length === 1, `Level ${level}: keyboard cannot leave the board`);
    await plan(t.solution.slice(0, 3), t.size, true);
    ok(await boardState() === initialBoard && await page.locator('[data-plan-step]').count() === 2, `Level ${level}: choosing directions only changes the program, keeping the map fixed`);
    await page.locator('#logic-undo').click();
    ok((await saved()).logic.sessions.route.path.length === 2 && await boardState() === initialBoard, `Level ${level}: undo changes only the deferred program`);
    await page.locator('#logic-clear').click();
    await page.locator('#logic-hint').click(); await page.locator('#logic-hint').click();
    ok(/Fel|Le|Balra|Jobbra/.test(await page.locator('.logic-hint-route').innerText()) && await page.locator('.logic-cell.hint-cell').count() === 0, `Level ${level}: next-direction hint keeps the map fixed`);
    await page.locator('#logic-hint').click();
    ok(await page.locator('.logic-hint-route > span').count() === t.solution.length - 1, `Level ${level}: final hint lists a full solution`);
    await plan(t.solution, t.size, true);
    ok(JSON.stringify((await saved()).logic.sessions.route.path) === JSON.stringify(t.solution) && await foxPosition() === t.start, `Level ${level}: full program works with keyboard focus preserved and the fox waiting`);
    if (level === 3) {
      await page.locator('#logic-repeat').click();
      await page.waitForFunction(() => new Set(routeNarration).size === 7);
      ok(await page.evaluate(() => new Set(routeNarration).size === 7), 'Spoken instructions highlight the map, parcels, rocks, house, directions, program and trial');
      for (const [width, height] of [[375, 667], [932, 350], [834, 1194]]) {
        await page.setViewportSize({ width, height });
        ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `Always-visible map fits ${width}×${height}`);
        await page.screenshot({ path: `output/playwright/route-program-${width}.png`, fullPage: true });
      }
      await page.emulateMedia({ reducedMotion: 'no-preference' });
      await page.waitForFunction(() => !matchMedia('(prefers-reduced-motion: reduce)').matches);
      await page.evaluate(() => {
        window.routeExecution = null;
        const observer = new MutationObserver(() => {
          const current = document.querySelector('[data-plan-step="1"][aria-current="step"]');
          if (!current) return;
          window.routeExecution = { position: Number(document.querySelector('.logic-traveller').dataset.position), cells: document.querySelectorAll('.logic-cell.on-path').length, disabled: document.querySelector('#logic-route-view').disabled };
          observer.disconnect();
          document.querySelector('#home-button').click();
        });
        observer.observe(document.querySelector('#furfangliget'), { subtree: true, attributes: true, attributeFilter: ['aria-current'] });
      });
      await page.locator('#logic-check').click();
      await page.waitForFunction(() => window.routeExecution);
      const execution = await page.evaluate(() => window.routeExecution);
      ok(execution.position === t.solution[1] && execution.cells === 2, 'Starting the program executes and reveals one step at a time');
      ok(execution.disabled, 'Movement mode cannot change during execution');
      ok((await saved()).rewards === rewards && !(await saved()).logic.sessions.route.done, 'Leaving an execution cancels completion');
      await page.emulateMedia({ reducedMotion: 'reduce' }); await enter();
      ok(await foxPosition() === t.start && await page.locator('#logic-check').isEnabled(), 'Cancelled program returns to the waiting fox and can be retried');
    }
    await page.locator('#logic-check').evaluate(button => { button.click(); button.click(); }); await page.waitForSelector('#logic-next');
    ok((await saved()).rewards === rewards + 1 && await foxPosition() === t.end, `Level ${level}: completed execution shows the destination and earns exactly one reward`);
    ok((await saved()).logic.games.route[level - 1].assisted === 1, `Level ${level}: hints are tracked as assisted`);
    await page.locator('#logic-route-view').selectOption('map');
    ok(await foxPosition() === t.end && await page.locator('#logic-next').count() === 1, `Level ${level}: changing mode preserves completed execution`);
  }
  await page.locator('#logic-route-view').selectOption('steps');
  await page.waitForFunction(() => document.querySelector('#offline-status').textContent.startsWith('Letöltve.'));
  await page.context().setOffline(true);
  try {
    await page.reload(); await enter(); await page.locator('#logic-next').click();
    const t = await puzzle(), rewards = (await saved()).rewards;
    await plan(t.solution, t.size); await page.locator('#logic-check').click(); await page.waitForSelector('#logic-next');
    ok((await saved()).rewards === rewards + 1 && await foxPosition() === t.end, 'Deferred program completes with the visible map offline');
    const duration = await page.evaluate(async () => { const audio = new AudioContext(); try { return (await audio.decodeAudioData(await (await fetch('./audio/voice/logic_route_steps.mp3')).arrayBuffer())).duration; } finally { await audio.close(); } });
    ok(duration > 5, 'Updated program instructions are available offline');
  } finally { await page.context().setOffline(false); }
  ok(errors.length === 0, 'No runtime errors');
  return { count: checks.length, checks, errors };
}
