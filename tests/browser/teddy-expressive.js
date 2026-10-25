// Run in a disposable playwright-cli session after opening the local portal.
async page => {
  await page.reload();
  await page.evaluate(() => { window.teddyVoices = []; document.addEventListener('narrationstart', event => teddyVoices.push(event.detail.id)); });
  if (await page.locator('#home-button').isVisible()) await page.locator('#home-button').click();
  await page.locator('#home [data-open="play-menu"]').click();
  await page.locator('#play-menu [data-open="teddy-game"]').click();
  await page.locator('[data-teddy-mode="expressive"]').click();
  await page.waitForFunction(() => teddyVoices.includes('guide_listening'), undefined, { timeout: 15000 });
  const plates = page.locator('#teddy-answers .teddy-plate');
  if (await plates.count() < 2) throw Error('The child needs a choice of foods');
  if (await page.locator('.teddy-expression-confirm').isEnabled()) throw Error('Speech confirmation must wait for a selected food');
  const food = await plates.first().getAttribute('aria-label');
  await plates.first().click();
  if (!await page.locator('#teddy-status').textContent().then(text => text.includes('Kérek '))) throw Error('Two-word model is missing');
  await page.locator('[data-expression-length="1"]').click();
  if (await page.locator('#teddy-status').textContent() !== `Mondd: ${food}`) throw Error('One-word model is missing');
  await page.locator('.teddy-expression-confirm').click();
  // Maci passes the requested food to the child's plate; there is no separate "give" tap any more.
  if (await page.locator('.teddy-expression-give').count()) throw Error('The old give-to-Maci step is back');
  await page.locator('[data-teddy-offer="more"]').waitFor({ state: 'visible' });
  if (await page.locator('.teddy-meal > span').count() !== 1) throw Error('The requested food must land on the child’s plate');
  await page.locator('[data-teddy-offer="more"]').click();
  await page.waitForFunction(() => document.querySelectorAll('.teddy-meal > span').length === 2);
  await page.locator('[data-teddy-offer="enough"]').click();
  await page.waitForFunction(() => document.querySelectorAll('#teddy-progress .is-done').length === 1 && !document.querySelector('.teddy-expression-confirm').hidden, undefined, { timeout: 10000 });
  if (await page.locator('.teddy-meal > span').count() !== 2) throw Error('The child’s plate should keep this round’s food');
  if (await page.locator('.teddy-expression-confirm').isEnabled()) throw Error('Next request should await a new choice');
  return { passed: true, food };
}
