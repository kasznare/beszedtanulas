// Run in a disposable playwright-cli session after opening the local portal.
async page => {
  await page.reload();
  if (await page.locator('#home-button').isVisible()) await page.locator('#home-button').click();
  await page.locator('#home [data-open="play-menu"]').click();
  await page.locator('#play-menu [data-open="teddy-game"]').click();
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.locator('[data-teddy-mode="expressive"]').click();
  const choose = async () => { await page.locator('#teddy-answers .teddy-plate').first().click(); await page.locator('.teddy-expression-confirm').click(); };
  await choose();
  await page.locator('[data-teddy-mode="sequence"]').click();
  if (await page.locator('.teddy-chosen-food').isVisible() || await page.locator('.teddy-meal > span').count()) throw Error('Switching away from expressive kept old food');
  await page.locator('[data-teddy-mode="expressive"]').click();
  await choose();
  await page.evaluate(() => {
    document.querySelector('.teddy-expression-give').click();
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => true });
    document.dispatchEvent(new Event('visibilitychange'));
    window.dispatchEvent(new Event('pagehide'));
    delete document.hidden;
    document.dispatchEvent(new Event('visibilitychange'));
  });
  if (await page.locator('.teddy-morsel').count() || await page.locator('.teddy-meal > span').count() !== 1 || await page.locator('#teddy-next').isDisabled()) throw Error('Interrupted feed did not finish exactly once');
  await page.locator('#teddy-next').click();
  await choose();
  await page.evaluate(() => { document.querySelector('.teddy-expression-give').click(); document.querySelector('#home-button').click(); });
  if (await page.locator('.teddy-morsel').count()) throw Error('Leaving during flight kept an animated morsel');
  await page.locator('#home [data-open="play-menu"]').click();
  await page.locator('#play-menu [data-open="teddy-game"]').click();
  if (await page.locator('#teddy-next').isEnabled() || await page.locator('.teddy-meal > span').count()) throw Error('Reopened teddy game kept a stopped round');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  return { passed: true, checks: 3 };
}
