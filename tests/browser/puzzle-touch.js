// Run through playwright-cli in a disposable browser; uses a fresh touch context.
async page => {
  const context = await page.context().browser().newContext({hasTouch:true, viewport:{width:390,height:844}});
  const touch = await context.newPage(), checks = [], errors = [];
  const ok = (value, message) => { if (!value) throw Error(message); checks.push(message); };
  touch.on('pageerror', error => errors.push(error.message));
  try {
    await touch.goto(page.url());
    await touch.locator('#home [data-open="activity-menu"]').tap();
    await touch.locator('#activity-menu [data-open="puzzle"]').tap();
    await touch.locator('[data-piece="0"]').tap(); await touch.locator('[data-slot="1"]').tap();
    ok(await touch.locator('[data-slot="1"]').getAttribute('data-piece') === '0', 'Touch places a piece on a different slot');
    await touch.locator('[data-slot="1"]').tap(); await touch.locator('[data-slot="0"]').tap();
    ok(await touch.locator('[data-slot="0"]').getAttribute('data-piece') === '0' && await touch.locator('[data-slot="1"]').getAttribute('data-piece') === null, 'Touch selects and moves a board piece');
    await touch.locator('[data-piece="1"]').tap(); await touch.locator('[data-slot="1"]').tap();
    await touch.locator('[data-slot="0"]').tap(); await touch.locator('[data-slot="1"]').tap();
    ok(await touch.locator('[data-slot="0"]').getAttribute('data-piece') === '1' && await touch.locator('[data-slot="1"]').getAttribute('data-piece') === '0', 'Touch swaps two occupied slots without double activation');
    await touch.locator('[data-slot="0"]').tap(); await touch.locator('#puzzle-return').tap();
    ok(await touch.locator('.puzzle-tray [data-piece="1"]').count() === 1, 'Touch returns the selected piece to its tray');
    ok(await touch.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'Touch layout fits the phone screen');
    ok(!errors.length, 'No touch browser errors: '+errors.join('; '));
    return {count:checks.length,checks,engine:context.browser().browserType().name()};
  } finally { await context.close(); }
}
