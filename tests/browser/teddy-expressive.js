// Run in a disposable playwright-cli session after opening the local portal.
async page => {
  await page.reload();
  if (await page.locator('#home-button').isVisible()) await page.locator('#home-button').click();
  await page.locator('#home [data-open="play-menu"]').click();
  await page.locator('#play-menu [data-open="teddy-game"]').click();
  await page.locator('[data-teddy-mode="expressive"]').click();
  const plates = page.locator('#teddy-answers .teddy-plate');
  if (await plates.count() < 2) throw Error('The child needs a choice of foods');
  if (await page.locator('.teddy-expression-confirm').isEnabled()) throw Error('Speech confirmation must wait for a selected food');
  const food = await plates.first().getAttribute('aria-label');
  await plates.first().click();
  if (!await page.locator('#teddy-status').textContent().then(text => text.includes('Kérek '))) throw Error('Two-word model is missing');
  await page.locator('[data-expression-length="1"]').click();
  if (await page.locator('#teddy-status').textContent() !== `Mondd: ${food}`) throw Error('One-word model is missing');
  await page.locator('.teddy-expression-confirm').click();
  if (!await page.locator('.teddy-expression-give').isEnabled()) throw Error('Giving should follow manual confirmation');
  await page.locator('.teddy-expression-give').click();
  await page.locator('#teddy-next').waitFor({ state: 'visible' });
  await page.waitForFunction(() => !document.querySelector('#teddy-next').disabled);
  if (!await page.locator('#teddy-status').textContent().then(text => text.includes('Maci megkapta'))) throw Error('The consequence is not named');
  if (await page.locator('.teddy-meal > span').count() !== 1) throw Error('The received food must appear in Maci’s scene');
  await page.locator('#teddy-next').click();
  if (await page.locator('.teddy-meal > span').count() !== 1) throw Error('The scene should remember what Maci received this round');
  if (await page.locator('.teddy-expression-confirm').isEnabled()) throw Error('Next round should await a new choice');
  return { passed: true, food };
}
