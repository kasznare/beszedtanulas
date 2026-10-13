// Run in a disposable playwright-cli session after opening the local portal.
async page => {
  const checks = [], ok = (value, message) => { if (!value) throw Error(message); checks.push(message); };
  await page.reload();
  if (await page.locator('#home-button').isVisible()) await page.locator('#home-button').click();
  await page.locator('#home [data-open="play-menu"]').click(); await page.locator('#play-menu [data-open="teddy-game"]').click();
  await page.locator('[data-teddy-mode="sequence"]').click(); await page.emulateMedia({ reducedMotion: 'no-preference' });
  const labels = () => page.locator('.teddy-order li > span:last-child').allTextContents().then(values => values.map(value => value.replace(/^\d\. /, '').replace(/ ✓$/, '')));
  let foods = await labels();
  // Trigger two rapid taps without waiting for the first feeding animation.
  await page.locator(`#teddy-answers button[aria-label="${foods[0]}"]`).evaluate(button => { button.click(); button.click(); });
  ok(await page.locator('.teddy-morsel').count() === 1, 'Rapid taps create only one feeding animation');
  await page.locator('[data-teddy-mode="single"]').click();
  ok(await page.locator('.teddy-morsel').count() === 0 && await page.locator('#teddy-next').isDisabled(), 'Changing modes cancels the old flight without completing the new task');
  await page.locator('[data-teddy-mode="sequence"]').click(); foods = await labels();
  await page.locator(`#teddy-answers button[aria-label="${foods[0]}"]`).click();
  await page.evaluate(() => { Object.defineProperty(document, 'hidden', { configurable: true, get: () => true }); document.dispatchEvent(new Event('visibilitychange')); delete document.hidden; document.dispatchEvent(new Event('visibilitychange')); });
  ok(await page.locator('.teddy-morsel').count() === 0 && await page.locator('.teddy-order .is-done').count() === 1, 'Interrupted first flight preserves exactly one completed step');
  ok(await page.locator('#teddy-replay').isEnabled() && await page.locator('#teddy-next').isDisabled(), 'Interrupted first step leaves the remaining request playable');
  await page.locator(`#teddy-answers button[aria-label="${foods[1]}"]`).click();
  await page.evaluate(() => { Object.defineProperty(document, 'hidden', { configurable: true, get: () => true }); document.dispatchEvent(new Event('visibilitychange')); delete document.hidden; document.dispatchEvent(new Event('visibilitychange')); });
  ok(await page.locator('#teddy-next').isEnabled() && await page.locator('.teddy-order .is-done').count() === 2, 'Interrupted final flight finishes both ordered indicators and enables Next');
  await page.locator('#teddy-next').click();
  ok(await page.locator('.teddy-order .is-done').count() === 0 && await page.locator('#teddy-next').isDisabled(), 'Following request starts cleanly after interrupted animation');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  return { count: checks.length, checks };
}
