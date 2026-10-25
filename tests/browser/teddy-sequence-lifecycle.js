// Run in a disposable playwright-cli session after opening the local portal.
async page => {
  const checks = [], ok = (value, message) => { if (!value) throw Error(message); checks.push(message); };
  await page.reload();
  await page.evaluate(() => { window.teddyVoices = []; document.addEventListener('narrationstart', event => teddyVoices.push(event.detail.id)); });
  if (await page.locator('#home-button').isVisible()) await page.locator('#home-button').click();
  await page.locator('#home [data-open="play-menu"]').click(); await page.locator('#play-menu [data-open="teddy-game"]').click();
  // The order is only heard: read it from the spoken two-food request.
  const heardOrder = async () => {
    await page.waitForFunction(() => teddyVoices.some(id => /^teddy_sequence_[a-z]+_[a-z]+$/.test(id)), undefined, { timeout: 15000 });
    const id = await page.evaluate(() => teddyVoices.filter(id => /^teddy_sequence_[a-z]+_[a-z]+$/.test(id)).at(-1));
    await page.evaluate(() => { teddyVoices.length = 0; });
    return id.split('_').slice(2);
  };
  await page.evaluate(() => { teddyVoices.length = 0; });
  await page.locator('[data-teddy-mode="sequence"]').click(); await page.emulateMedia({ reducedMotion: 'no-preference' });
  ok(await page.locator('.teddy-order li').count() === 2 && await page.locator('.teddy-order .teddy-order-blank').count() === 2, 'The order strip hides both foods before feeding');
  ok(await page.locator('#teddy-answers .teddy-plate').count() > 2, 'An ordered request always has a plate that is not asked for');
  let foods = await heardOrder();
  // Trigger two rapid taps without waiting for the first feeding animation.
  await page.locator(`#teddy-answers [data-word="${foods[0]}"]`).evaluate(button => { button.click(); button.click(); });
  ok(await page.locator('.teddy-morsel').count() === 1, 'Rapid taps create only one feeding animation');
  await page.locator('[data-teddy-mode="single"]').click();
  ok(await page.locator('.teddy-morsel').count() === 0 && await page.locator('#teddy-next').isDisabled(), 'Changing modes cancels the old flight without completing the new task');
  await page.evaluate(() => { teddyVoices.length = 0; });
  await page.locator('[data-teddy-mode="sequence"]').click(); foods = await heardOrder();
  const wrong = await page.locator('#teddy-answers .teddy-plate').evaluateAll((plates, wanted) => plates.map(plate => plate.dataset.word).find(id => !wanted.includes(id)), foods);
  await page.locator(`#teddy-answers [data-word="${wrong}"]`).click();
  ok(await page.locator('.teddy-order .is-done').count() === 0 && (await page.locator('#teddy-status').textContent()).startsWith('Nem kérem'), 'A food that was not asked for is refused');
  await page.locator(`#teddy-answers [data-word="${foods[1]}"]`).click();
  ok(await page.locator('.teddy-order .is-done').count() === 0, 'Second food cannot satisfy the first request');
  await page.locator(`#teddy-answers [data-word="${foods[0]}"]`).click();
  await page.evaluate(() => { Object.defineProperty(document, 'hidden', { configurable: true, get: () => true }); document.dispatchEvent(new Event('visibilitychange')); delete document.hidden; document.dispatchEvent(new Event('visibilitychange')); });
  ok(await page.locator('.teddy-morsel').count() === 0 && await page.locator('.teddy-order .is-done').count() === 1, 'Interrupted first flight preserves exactly one completed step');
  ok(await page.locator('.teddy-order .is-done img, .teddy-order .is-done svg').count() === 1 && await page.locator('.teddy-order .teddy-order-blank').count() === 1, 'Only the fed food is revealed in the order strip');
  ok(await page.locator('#teddy-replay').isEnabled() && await page.locator('#teddy-next').isDisabled(), 'Interrupted first step leaves the remaining request playable');
  await page.locator(`#teddy-answers [data-word="${foods[1]}"]`).click();
  await page.evaluate(() => { Object.defineProperty(document, 'hidden', { configurable: true, get: () => true }); document.dispatchEvent(new Event('visibilitychange')); delete document.hidden; document.dispatchEvent(new Event('visibilitychange')); });
  ok(await page.locator('#teddy-next').isEnabled() && await page.locator('.teddy-order .is-done').count() === 2, 'Interrupted final flight finishes both ordered indicators and enables Next');
  await page.locator('#teddy-next').evaluate(button => button.click());
  ok(await page.locator('.teddy-order .is-done').count() === 0 && await page.locator('#teddy-next').isDisabled(), 'Following request starts cleanly after interrupted animation');
  // A clean request continues by itself after Maci's thanks.
  await page.emulateMedia({ reducedMotion: 'reduce' });
  foods = await heardOrder();
  for (const food of foods) await page.locator(`#teddy-answers [data-word="${food}"]`).click();
  await page.waitForFunction(() => document.querySelectorAll('#teddy-progress .is-done').length === 2 && !document.querySelector('.teddy-order .is-done'), undefined, { timeout: 10000 });
  ok(true, 'A finished order advances to the next request without a tap');
  return { count: checks.length, checks };
}
