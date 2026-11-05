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
    const piece = id => touch.locator(`#puzzle .puzzle-tray [data-piece="${id}"]`), slot = id => touch.locator(`#puzzle [data-slot="${id}"]`);
    // "Csak a jó helyre" is the default: a piece tapped onto the wrong slot stays off the board.
    ok(await touch.locator('#puzzle-strict').getAttribute('aria-pressed') === 'true', 'Puzzle starts with "Csak a jó helyre"');
    await piece(0).tap(); await slot(1).tap();
    ok(await slot(1).getAttribute('data-piece') === null && await piece(0).count() === 1, 'Strict touch refuses the wrong slot');
    // Free placement keeps every touch move available.
    await touch.locator('#puzzle-strict').tap();
    ok(await touch.locator('#puzzle-strict').getAttribute('aria-pressed') === 'false', 'Free placement can be switched on by touch');
    await piece(0).tap(); await slot(1).tap();
    ok(await slot(1).getAttribute('data-piece') === '0', 'Touch places a piece on a different slot');
    await slot(1).tap(); await slot(0).tap();
    ok(await slot(0).getAttribute('data-piece') === '0' && await slot(1).getAttribute('data-piece') === null, 'Touch selects and moves a board piece');
    await piece(1).tap(); await slot(1).tap();
    await slot(0).tap(); await slot(1).tap();
    ok(await slot(0).getAttribute('data-piece') === '1' && await slot(1).getAttribute('data-piece') === '0', 'Touch swaps two occupied slots without double activation');
    await slot(0).tap(); await touch.locator('#puzzle-return').tap();
    ok(await piece(1).count() === 1, 'Touch returns the selected piece to its tray');
    ok(await touch.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'Touch layout fits the phone screen');
    ok(!errors.length, 'No touch browser errors: '+errors.join('; '));
    return {count:checks.length,checks,engine:context.browser().browserType().name()};
  } finally { await context.close(); }
}
