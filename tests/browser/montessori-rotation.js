// Run through playwright-cli run-code --filename in a disposable browser session.
async page => {
  const checks = [];
  const ok = (value, message) => { if (!value) throw Error(message); checks.push(message); };
  const url = page.url();
  await page.evaluate(async () => { for (const registration of await navigator.serviceWorker.getRegistrations()) await registration.unregister(); for (const key of await caches.keys()) await caches.delete(key); });
  await page.goto('about:blank'); await page.goto(url);
  const menu = async () => {
    if (await page.locator('#mo-back').isVisible()) await page.locator('#mo-back').click();
    if (!await page.locator('.mo-menu').isVisible()) {
      if (await page.locator('#home-button').isVisible()) await page.locator('#home-button').click();
      await page.locator('#home [data-open="activity-menu"]').click();
      await page.locator('#activity-menu [data-open="montessori"]').click();
    }
  };
  const saved = () => page.evaluate(() => {
    const game = document.querySelector('#montessori');
    const key = Object.keys(localStorage).find(key => key.startsWith('beszedtanulas.montessori.v2:') && key.endsWith(`:${game.dataset.game}:${game.dataset.level}`));
    return JSON.parse(localStorage.getItem(key));
  });
  const metrics = () => page.evaluate(() => {
    const board = document.querySelector('[data-mo-surface]').getBoundingClientRect();
    const toolbar = document.querySelector('.mo-turn-toolbar');
    const rect = toolbar.getBoundingClientRect();
    const selected = document.querySelector('[data-mo-piece][aria-pressed="true"]').getBoundingClientRect();
    const overlap = (a, b) => Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left)) * Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top));
    const blockedCenters = [...document.querySelectorAll('[data-mo-surface] [data-mo-piece]:not([aria-pressed="true"]), [data-mo-surface] [data-mo-target]:not(:disabled), [data-mo-surface] [data-mo-blocker]')].filter(button => { const r = button.getBoundingClientRect(), x = r.left + r.width / 2, y = r.top + r.height / 2; return x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom; }).length;
    return { hidden: toolbar.hidden, side: toolbar.dataset.side, toolbar: { left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom }, board: { left: board.left, right: board.right, top: board.top, bottom: board.bottom }, selectedOverlap: overlap(rect, selected), blockedCenters, distance: Math.hypot(rect.left + rect.width / 2 - (selected.left + selected.width / 2), rect.top + rect.height / 2 - (selected.top + selected.height / 2)), width: rect.width, height: rect.height, overflow: document.documentElement.scrollWidth > innerWidth + 2 };
  });
  await menu();
  await page.locator('[data-mo-game="shapes"]').click();
  await page.locator('[data-mo-level="6"]').click();
  await page.locator('#mo-restart').click();
  const triangle = page.locator('[data-mo-piece][data-mo-shape="triangle"]').first();
  const id = await triangle.getAttribute('data-mo-piece');
  const target = page.locator(`[data-mo-target="${id}"]`);
  ok(await page.locator('.mo-turn-toolbar:visible').count() === 0, 'Arrows are hidden before selection');
  await triangle.click();
  let m = await metrics();
  ok(!m.hidden && m.width >= 48 && m.height >= 48 && m.selectedOverlap === 0, 'Arrows appear beside the selected shape without covering it');
  await page.locator('[data-mo-target][data-mo-shape="hexagon"]').first().click();
  ok(!(await page.locator('#mo-status').textContent()).includes('Fordítsd el'), 'A different shape keeps the general mismatch hint');
  await target.click();
  ok((await page.locator('#mo-status').textContent()).includes('Fordítsd el'), 'A matching shape with wrong orientation receives a turn hint');
  const before = await saved();
  await page.locator('#mo-turn-right').click();
  const after = await saved();
  ok(after.rotations[id] !== before.rotations[id] && JSON.stringify(after.positions) === JSON.stringify(before.positions), 'One tap rotates 90 degrees while retaining position');
  ok(await triangle.locator('svg').evaluate(svg => getComputedStyle(svg).animationName.includes('mo-turn-right')), 'The visible shape animates through the turn');
  ok(await triangle.getAttribute('aria-pressed') === 'true' && await page.locator('.mo-turn-toolbar:visible').count() === 1, 'The piece stays selected and the arrows remain usable');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.locator('#mo-turn-left').click();
  ok(await triangle.locator('svg').evaluate(svg => getComputedStyle(svg).animationName === 'none'), 'Reduced motion turns immediately without animation');
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.keyboard.press('Escape');
  ok(await page.locator('.mo-turn-toolbar:visible').count() === 0, 'Escape dismisses the arrows');
  await triangle.click();
  await page.locator('[data-mo-surface]').click({ position: { x: 3, y: 3 } });
  ok(await page.locator('.mo-turn-toolbar:visible').count() === 0, 'An empty-board tap dismisses the arrows');
  for (const size of [{ width: 320, height: 740 }, { width: 390, height: 844 }, { width: 834, height: 1112 }, { width: 932, height: 430 }]) {
    await page.setViewportSize(size);
    await menu(); await page.locator('[data-mo-game="shapes"]').click(); await page.locator('[data-mo-level="8"]').click(); await page.locator('#mo-restart').click();
    let captured = false;
    for (const piece of await page.locator('[data-mo-piece]').evaluateAll(buttons => buttons.filter(button => ['triangle', 'hexagon'].includes(button.dataset.moShape)).map(button => button.dataset.moPiece))) {
      const button = page.locator(`[data-mo-piece="${piece}"]`);
      await button.scrollIntoViewIfNeeded(); await button.click();
      m = await metrics();
      if (m.hidden || m.width < 48 || m.height < 48 || m.selectedOverlap || m.blockedCenters || m.distance > 190 || m.toolbar.left < m.board.left - 1 || m.toolbar.right > m.board.right + 1 || m.toolbar.top < m.board.top - 1 || m.toolbar.bottom > m.board.bottom + 1 || m.toolbar.top < -1 || m.toolbar.bottom > size.height + 1 || m.overflow) throw Error(`${size.width}px: controls misplaced beside ${piece}: ${JSON.stringify(m)}`);
      checks.push(`${size.width}px: controls stay nearby without blocking another tap target beside ${piece}`);
      if (size.width === 320 && !captured) { await page.screenshot({ path: 'output/playwright/montessori-rotation-320.png', fullPage: true, animations: 'disabled' }); captured = true; }
    }
    await page.locator('[data-mo-piece][data-mo-shape="square"]').first().click();
    ok(await page.locator('.mo-turn-toolbar:visible').count() === 0, `${size.width}px: symmetric shapes do not show rotation controls`);
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.locator('[data-mo-level="6"]').click(); await page.locator('#mo-restart').click();
  const moving = page.locator('[data-mo-piece][data-mo-shape="triangle"]').first();
  const movingId = await moving.getAttribute('data-mo-piece');
  await moving.click();
  const from = await moving.boundingBox(), board = await page.locator('[data-mo-surface]').boundingBox();
  await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2); await page.mouse.down();
  await page.mouse.move(board.x + board.width * .42, board.y + board.height * .39, { steps: 10 });
  ok(await page.locator('.mo-turn-toolbar:visible').count() === 0, 'Arrows hide during an actual drag');
  await page.mouse.up();
  ok((await saved()).positions[movingId] && await page.locator('.mo-turn-toolbar:visible').count() === 1, 'The rotated piece remains draggable and arrows return after parking');
  await page.locator('#mo-turn-left').click();
  const parked = await saved();
  ok(parked.positions[movingId] && parked.rotations[movingId] !== undefined, 'Rotation after parking keeps the free position');
  await menu(); await page.locator('[data-mo-game="shapes"]').click();
  ok(JSON.stringify((await saved()).positions) === JSON.stringify(parked.positions) && JSON.stringify((await saved()).rotations) === JSON.stringify(parked.rotations), 'A saved round restores the parked and rotated shape');
  if (page.context().browser().browserType().name() === 'chromium') {
    await page.setViewportSize({ width: 320, height: 740 });
    await page.locator('[data-mo-level="6"]').click(); await page.locator('#mo-restart').click();
    const client = await page.context().newCDPSession(page);
    await client.send('Emulation.setTouchEmulationEnabled', { enabled: true });
    const point = (x, y) => [{ x, y, radiusX: 6, radiusY: 6, force: 1, id: 0 }];
    const center = rect => ({ x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 });
    const touch = async (from, to = from) => {
      await client.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: point(from.x, from.y) });
      if (to !== from) for (let i = 1; i <= 10; i++) await client.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: point(from.x + (to.x - from.x) * i / 10, from.y + (to.y - from.y) * i / 10) });
      await client.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    };
    const touchPiece = page.locator('[data-mo-piece][data-mo-shape="triangle"]').first();
    const touchId = await touchPiece.getAttribute('data-mo-piece');
    await touchPiece.scrollIntoViewIfNeeded();
    await touch(center(await touchPiece.boundingBox()));
    ok(await page.locator('.mo-turn-toolbar:visible').count() === 1, 'Native touch selects a shape and reveals nearby arrows');
    const touchBefore = await saved();
    await touch(center(await page.locator('#mo-turn-right').boundingBox()));
    ok((await saved()).rotations[touchId] !== touchBefore.rotations[touchId], 'A native touch tap rotates the selected shape');
    const touchBoard = await page.locator('[data-mo-surface]').boundingBox();
    await touch(center(await touchPiece.boundingBox()), { x: touchBoard.x + touchBoard.width * .4, y: touchBoard.y + touchBoard.height * .39 });
    ok((await saved()).positions[touchId] && await page.locator('.mo-turn-toolbar:visible').count() === 1, 'Native touch can drag the shape after rotating it');
    await client.send('Emulation.setTouchEmulationEnabled', { enabled: false }); await client.detach();
  }
  return { count: checks.length, checks };
}
