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
  const program = async () => (await saved()).logic.sessions.route.steps;
  const home = async () => { if (await page.locator('#home-button').isVisible()) await page.locator('#home-button').click(); };
  const enter = async () => { await home(); await page.locator('#home [data-open="big-menu"]').click(); await page.locator('#big-menu [data-kind="machine"]').click();await page.locator('#logic-back').dispatchEvent('click'); await page.locator('[data-game="route"]').click(); };
  const parent = async () => { await home(); await page.locator('#parent-button').click(); const n = (await page.locator('#parent-gate-question').innerText()).match(/\d+/g).map(Number); await page.locator('#parent-gate-answers button').filter({ hasText: new RegExp(`^${n[0] + n[1]}$`) }).click(); };
  // The puzzle, its shortest solution, the matching program and a first step that leaves the board.
  const puzzle = () => page.evaluate(async () => {
    const d = await import('./logic-data.js'), s = JSON.parse(localStorage.getItem('speech_game_progress_v1')).logic.sessions.route, t = d.logicTaskForSession(s), solution = d.routeSolution(t);
    return { ...t, solution, steps: d.routeStepsFromPath(solution, t.size), offBoard: [0, 1, 2, 3].find(direction => d.routeStep(t.start, direction, t.size) < 0) };
  });
  const foxPosition = () => page.locator('.logic-traveller').evaluate(el => Number(el.dataset.position));
  const boardState = () => page.locator('.logic-board-wrap').evaluate(el => {
    const fox = el.querySelector('.logic-traveller');
    return JSON.stringify({ position: fox.dataset.position, transform: fox.style.transform, cells: [...el.querySelectorAll('[data-cell]')].map(cell => ({ label: cell.getAttribute('aria-label'), text: cell.textContent, markings: ['on-path', 'path-end', 'hint-cell', 'next-cell'].filter(name => cell.classList.contains(name)) })) });
  });
  const names = ['up', 'right', 'down', 'left'], keys = ['ArrowUp', 'ArrowRight', 'ArrowDown', 'ArrowLeft'];
  const plan = async (steps, keyboard = false) => {
    if (keyboard) await page.locator('#logic-directions').focus();
    for (const d of steps) {
      if (keyboard) await page.keyboard.press(keys[d]);
      else await page.locator(`[data-direction="${names[d]}"]`).click();
    }
  };
  await enter();
  ok(await page.locator('.logic-board').count() === 1 && await page.locator('#logic-route-view').inputValue() === 'map', 'Existing players start level 1 with a visible map and immediate movement');
  await page.locator('#logic-route-view').selectOption('steps');
  await parent(); ok(await page.locator('#route-view').inputValue() === 'steps', 'In-game movement choice updates parent setting');
  await page.locator('#route-view').selectOption('map'); await enter();
  ok(await page.locator('#logic-route-view').inputValue() === 'map', 'Parent movement choice updates the game');
  for (const level of [1, 2, 3]) {
    if (level > 1) await page.locator('#logic-level').selectOption(String(level));
    const t = await puzzle(), rewards = (await saved()).rewards;
    const parcelIndex = t.solution.findIndex(cell => t.parcels.includes(cell));
    let partial;
    if (level === 1) {
      ok(t.size === 4 && t.blocked.length === 2 && t.parcels.length === 1, 'Level 1: 4×4 map with two rocks and one parcel');
      await plan(t.steps.slice(0, 1));
      ok(await foxPosition() === t.solution[1], 'Level 1: immediate mode moves the fox after choosing a direction');
      ok(await page.locator(`#logic-cell-${t.solution[1]}`).evaluate(el => el.classList.contains('path-end')), 'Level 1: map highlights the current position');
      await page.locator('#logic-undo').click();
      ok(await foxPosition() === t.start, 'Level 1: undo also restores the visible fox');
      await plan(t.steps.slice(0, parcelIndex));
      ok(await page.locator('.logic-parcels .is-planned').count() >= 1 && await page.locator(`#logic-cell-${t.solution[parcelIndex]} > span`).innerText() === '✓', 'Level 1: immediate mode previews parcel pickup');
      partial = (await saved()).logic.sessions.route;
      await page.locator('#logic-route-view').selectOption('steps');
      ok(JSON.stringify((await saved()).logic.sessions.route) === JSON.stringify(partial) && await foxPosition() === t.start, 'Level 1: deferred mode preserves the program and returns the fox to the start');
    } else {
      ok(await page.locator('#logic-route-view').count() === 0, `Level ${level}: the route is always a program`);
      ok(t.parcels.length === 2 && (level === 2 ? t.size === 5 : [5, 6].includes(t.size)), `Level ${level}: board size and two parcels`);
      await plan(t.steps.slice(0, parcelIndex));
      partial = (await saved()).logic.sessions.route;
    }
    ok(await page.locator('[data-cell]').count() === t.size ** 2 && await page.locator('.logic-traveller img').count() === 1, `Level ${level}: deferred mode keeps the entire map and fox visible`);
    ok(await page.locator('.logic-cell.on-path').count() === 1 && await page.locator('.logic-cell.next-cell, .logic-cell small, .logic-parcels .is-planned').count() === 0, `Level ${level}: deferred mode reveals no planned position, route or parcel pickup`);
    ok(!/[📦🏡]/u.test(await page.locator('.logic-path-plan').innerText()), `Level ${level}: deferred program contains only numbered directions`);
    await page.reload(); await enter();
    ok((level > 1 || await page.locator('#logic-route-view').inputValue() === 'steps') && await foxPosition() === t.start && JSON.stringify((await saved()).logic.sessions.route) === JSON.stringify(partial), `Level ${level}: saved movement choice and partial program survive reload`);
    await page.locator('#logic-clear').click();
    ok((await program()).length === 0, `Level ${level}: restart clears the program`);
    const initialBoard = await boardState();
    ok(await page.locator('[data-direction]:enabled').count() === 4, `Level ${level}: arrows do not reveal rocks or edges`);
    // A step off the board is a legal plan; the fox shows the mistake when the program runs.
    await page.locator('#logic-directions').focus(); await page.keyboard.press(keys[t.offBoard]);
    ok((await program()).length === 1 && await boardState() === initialBoard, `Level ${level}: the program accepts a step off the board without revealing it`);
    const misses = (await saved()).logic.sessions.route.misses;
    await page.locator('#logic-check').click(); await page.waitForSelector('#logic-replan-confirm');
    ok(await page.locator('.logic-path-plan li.is-bad').count() === 1 && await page.locator('.logic-traveller.is-bumping').count() === 1 && await page.locator('#logic-check').isDisabled(), `Level ${level}: the fox bumps, stops and marks the bad step`);
    ok((await saved()).logic.sessions.route.misses === misses + 1, `Level ${level}: a bump counts as a corrected attempt`);
    await page.locator('#logic-replan-confirm').click();
    ok((await program()).length === 0 && await foxPosition() === t.start, `Level ${level}: replanning continues before the bad step`);
    await plan(t.steps.slice(0, 2), true);
    ok(await boardState() === initialBoard && await page.locator('[data-plan-step]').count() === 2, `Level ${level}: choosing directions only changes the program, keeping the map fixed`);
    await page.locator('#logic-undo').click();
    ok((await program()).length === 1 && await boardState() === initialBoard, `Level ${level}: undo changes only the deferred program`);
    await page.locator('#logic-clear').click();
    await page.locator('#logic-hint').click(); await page.locator('#logic-hint').click();
    ok(/Fel|Le|Balra|Jobbra/.test(await page.locator('.logic-hint-route').innerText()) && await page.locator('.logic-cell.hint-cell').count() === 0, `Level ${level}: next-direction hint keeps the map fixed`);
    await page.locator('#logic-hint').click();
    ok(await page.locator('.logic-hint-route > span').count() === t.solution.length - 1, `Level ${level}: final hint lists a full solution`);
    await plan(t.steps, true);
    ok(JSON.stringify(await program()) === JSON.stringify(t.steps) && await foxPosition() === t.start, `Level ${level}: full program works with keyboard focus preserved and the fox waiting`);
    if (level === 2) {
      await page.locator('#logic-repeat').click();
      await page.waitForFunction(() => new Set(routeNarration).size === 7);
      ok(await page.evaluate(() => new Set(routeNarration).size === 7), 'Spoken instructions highlight the map, parcels, rocks, house, directions, program and trial');
      for (const [width, height] of [[375, 667], [932, 350], [834, 1194], [768, 900], [1024, 680]]) {
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
          window.routeExecution = { position: Number(document.querySelector('.logic-traveller').dataset.position), cells: document.querySelectorAll('.logic-cell.on-path').length, disabled: document.querySelector('#logic-level').disabled };
          observer.disconnect();
          document.querySelector('#home-button').click();
        });
        observer.observe(document.querySelector('#furfangliget'), { subtree: true, attributes: true, attributeFilter: ['aria-current'] });
      });
      await page.locator('#logic-check').click();
      await page.waitForFunction(() => window.routeExecution);
      const execution = await page.evaluate(() => window.routeExecution);
      ok(execution.position === t.solution[1] && execution.cells === 2, 'Starting the program executes and reveals one step at a time');
      ok(execution.disabled, 'Difficulty cannot change during execution');
      ok((await saved()).rewards === rewards && !(await saved()).logic.sessions.route.done, 'Leaving an execution cancels completion');
      await page.emulateMedia({ reducedMotion: 'reduce' }); await enter();
      ok(await foxPosition() === t.start && await page.locator('#logic-check').isEnabled(), 'Cancelled program returns to the waiting fox and can be retried');
    }
    await page.locator('#logic-check').evaluate(button => { button.click(); button.click(); }); await page.waitForSelector('#logic-next');
    ok((await saved()).rewards === rewards + 1 && await foxPosition() === t.end, `Level ${level}: completed execution shows the destination and earns exactly one reward`);
    ok((await saved()).logic.games.route[level - 1].assisted === 1, `Level ${level}: hints and bumps are tracked as assisted`);
    ok((await page.locator('.logic-heading').innerText()).includes(`A legrövidebb út ${t.shortest} lépés volt.`), `Level ${level}: success names the shortest route`);
    if (level === 1) {
      await page.locator('#logic-route-view').selectOption('map');
      ok(await foxPosition() === t.end && await page.locator('#logic-next').count() === 1, 'Level 1: changing mode preserves completed execution');
    }
  }
  await page.waitForFunction(() => document.querySelector('#offline-status').textContent.startsWith('Letöltve.'));
  await page.context().setOffline(true);
  try {
    await page.reload(); await enter(); await page.locator('#logic-next').click();
    const t = await puzzle(), rewards = (await saved()).rewards;
    await plan(t.steps); await page.locator('#logic-check').click(); await page.waitForSelector('#logic-next');
    ok((await saved()).rewards === rewards + 1 && await foxPosition() === t.end, 'Deferred program completes with the visible map offline');
    const duration = await page.evaluate(async () => { const audio = new AudioContext(); try { return (await audio.decodeAudioData(await (await fetch('./audio/voice/logic_route_steps.mp3')).arrayBuffer())).duration; } finally { await audio.close(); } });
    ok(duration > 5, 'Updated program instructions are available offline');
  } finally { await page.context().setOffline(false); }
  ok(errors.length === 0, 'No runtime errors');
  return { count: checks.length, checks, errors };
}
