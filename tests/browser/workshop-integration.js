// Run only in a dedicated disposable Playwright CLI browser; test progress is reset.
async page => {
  const checks = [], errors = [], ok = (value, message) => { if (!value) throw Error(message); checks.push(message); };
  page.on('pageerror', e => errors.push(e.message));
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.evaluate(async () => { localStorage.clear(); for (const r of await navigator.serviceWorker.getRegistrations()) await r.unregister(); for (const c of await caches.keys()) await caches.delete(c); });
  const url = page.url(); await page.goto('about:blank'); await page.goto(url);
  const state = () => page.evaluate(() => JSON.parse(localStorage.getItem('speech_game_progress_v1')));
  const home = async () => { if (await page.locator('#home-button').isVisible()) await page.locator('#home-button').click(); };
  const enter = async () => { await home(); await page.locator('#home [data-open="number-menu"]').click(); await page.locator('#number-menu [data-open="workshop"]').click(); };
  const parent = async () => { await home(); await page.locator('#parent-button').click(); const numbers = (await page.locator('#parent-gate-question').innerText()).match(/\d+/g).map(Number); await page.locator('#parent-gate-answers button').filter({hasText:new RegExp(`^${numbers[0]+numbers[1]}$`)}).click(); };
  const task = (kind, level) => page.evaluate(async ({kind,level}) => { const d = await import('./workshop-data.js'), session = JSON.parse(localStorage.getItem('speech_game_progress_v1')).workshop.sessions[kind][level-1]; const task = d.generateWorkshopTask(kind,level,session.seed); return { ...task, destinations: kind === 'sort' ? task.objects.map(object => d.workshopSortTarget(task,object)) : [], solution: kind === 'balance' ? d.workshopBalanceSolutions(task)[0] : [] }; }, {kind,level});
  const solve = async (kind,t) => {
    if (kind === 'sort') for (const [i,bin] of t.destinations.entries()) { await page.locator(`[data-token="${i}"]`).click(); await page.locator(`[data-bin="${bin}"]`).click(); }
    if (kind === 'pattern') for (const [i,position] of t.holes.entries()) { await page.locator(`[data-slot="${i}"]`).click(); await page.locator(`[data-choice="${t.sequence[position]}"]`).click(); }
    if (kind === 'balance') for (const rod of t.solution) await page.locator(`[data-add="${rod}"]`).click();
  };
  await enter();
  for (const level of [1,2,3]) {
    await page.locator(`button[data-level="${level}"]`).click();
    ok((await state()).settings.workshopLevel === level, `L${level}: difficulty persisted through callback`);
    for (const kind of ['sort','pattern','balance']) {
      await page.locator(`[data-game="${kind}"]`).click(); const t = await task(kind,level), before = (await state()).rewards;
      await page.locator('#ws-check').click(); ok((await state()).rewards === before, `${kind} L${level}: unfinished work has no reward`);
      for (let i=0;i<3;i++) await page.locator('#ws-hint').click();
      ok((await state()).workshop.sessions[kind][level-1].help === 3, `${kind} L${level}: three progressive hints`);
      await solve(kind,t);
      const full = (await state()).workshop.sessions[kind][level-1].moves;
      await page.locator('#ws-undo').click(); ok(JSON.stringify((await state()).workshop.sessions[kind][level-1].moves) !== JSON.stringify(full), `${kind} L${level}: last move reverses`);
      if (kind === 'sort') { const index = t.destinations.length-1; await page.locator(`[data-token="${index}"]`).click(); await page.locator(`[data-bin="${t.destinations[index]}"]`).click(); }
      if (kind === 'pattern') { const index=t.holes.length-1; await page.locator(`[data-slot="${index}"]`).click(); await page.locator(`[data-choice="${t.sequence[t.holes[index]]}"]`).click(); }
      if (kind === 'balance') await page.locator(`[data-add="${t.solution.at(-1)}"]`).click();
      const saved = (await state()).workshop.sessions[kind][level-1];
      await page.reload(); await enter(); await page.locator(`[data-game="${kind}"]`).click();
      ok(JSON.stringify((await state()).workshop.sessions[kind][level-1]) === JSON.stringify(saved), `${kind} L${level}: exact work survives reload`);
      await page.locator('#ws-check').evaluate(button => {button.click(); button.click();});
      ok((await state()).rewards === before+1, `${kind} L${level}: exactly one completion reward`);
      ok((await state()).workshop.games[kind][level-1].assisted === 1, `${kind} L${level}: aided result stays in its level`);
      await page.locator('#ws-back').click(); await page.locator(`[data-game="${kind}"]`).click();
      ok(await page.locator('#ws-next').count() === 1 && (await state()).rewards === before+1, `${kind} L${level}: reopening cannot reward twice`);
      await page.locator('#ws-next').click();
      for (const [width,height] of [[375,667],[932,350],[834,1194]]) {
        await page.setViewportSize({width,height});
        const metrics = await page.evaluate(() => ({ overflow:document.documentElement.scrollWidth>innerWidth, small:[...document.querySelectorAll('#workshop button')].filter(b => {const r=b.getBoundingClientRect();return r.width<44||r.height<44;}).map(b=>b.id) }));
        ok(!metrics.overflow && !metrics.small.length, `${kind} L${level}: ${width}×${height} fits, buttons ≥44px`);
      }
      if (level === 3) await page.screenshot({path:`output/playwright/workshop-${kind}-tablet.png`,fullPage:true});
      await page.setViewportSize({width:430,height:932}); await page.locator('#ws-back').click();
    }
  }
  await page.locator('button[data-level="1"]').click(); await page.locator('[data-game="balance"]').click(); await solve('balance',await task('balance',1)); await page.locator('#ws-check').click();
  ok((await state()).workshop.games.balance[0].independent === 1, 'Independent results are distinct from helped results');
  const child = (await state()).workshop;
  await parent(); await page.locator('#supabase-role').selectOption('admin');
  ok(Object.values((await state()).workshop.sessions).flat().every(s=>s===null), 'Parent trial has separate workshop attempts');
  await page.locator('#supabase-role').selectOption('kid'); ok(JSON.stringify((await state()).workshop) === JSON.stringify(child), 'Child workshop returns after profile switch');
  const downloadWait = page.waitForEvent('download'); await page.locator('#export-progress').click(); const download=await downloadWait; await download.saveAs('output/playwright/workshop-progress.json');
  await page.locator('#reset-progress').click(); ok((await page.locator('#preview-workshop').innerText()) === '10', 'Confirmation previews workshop count'); await page.locator('#progress-apply').click();
  ok(Object.values((await state()).workshop.sessions).flat().every(s=>s===null), 'Reset clears workshop work');
  await page.locator('#undo-progress').click(); await page.locator('#progress-apply').click(); ok(JSON.stringify((await state()).workshop)===JSON.stringify(child), 'Undo restores complete workshop state');
  await page.locator('#reset-progress').click(); await page.locator('#progress-apply').click(); await page.locator('#progress-file').setInputFiles('output/playwright/workshop-progress.json'); await page.locator('#progress-apply').click();
  ok(JSON.stringify((await state()).workshop)===JSON.stringify(child), 'Downloaded backup imports all workshop levels');
  ok((await state()).attempts === 0, 'Workshops do not change speech attempts'); ok(errors.length===0, 'No browser errors');
  return {count:checks.length,checks};
}
