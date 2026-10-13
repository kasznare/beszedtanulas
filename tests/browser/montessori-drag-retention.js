// Drag regressions: a parked token can subsequently enter the hole beneath it;
// large boards scroll at the viewport edge while the pointer remains held.
async page => {
  const checks = []; const ok = (value, message) => { if (!value) throw Error(message); checks.push(message); };
  await page.context().setOffline(false); await page.emulateMedia({ reducedMotion: 'reduce' });
  const url = page.url();
  await page.evaluate(async () => { localStorage.clear(); for (const registration of await navigator.serviceWorker.getRegistrations()) await registration.unregister(); for (const key of await caches.keys()) await caches.delete(key); }); await page.goto('about:blank'); await page.goto(url);
  await page.locator('#home [data-open="activity-menu"]').click(); await page.locator('#activity-menu [data-open="montessori"]').click(); await page.locator('[data-mo-game="shapes"]').click();
  await page.setViewportSize({ width: 1194, height: 834 }); await page.locator('[data-mo-level="6"]').click(); await page.locator('#mo-restart').click();
  const id = await page.locator('[data-mo-piece][data-mo-shape="triangle"]').first().getAttribute('data-mo-piece');
  await page.locator('[data-mo-surface]').scrollIntoViewIfNeeded();
  const center = r => ({ x: r.x + r.width / 2, y: r.y + r.height / 2 });
  let from = center(await page.locator(`[data-mo-piece="${id}"]`).boundingBox()), to = center(await page.locator(`[data-mo-target="${id}"]`).boundingBox());
  await page.mouse.move(from.x, from.y); await page.mouse.down(); await page.mouse.move(to.x, to.y, { steps: 8 }); await page.mouse.up();
  ok(await page.locator('.mo-box-window svg').count() === 0 && await page.locator(`[data-mo-piece="${id}"]`).count() === 1, 'Wrongly oriented piece remains where it was released over the hole');
  await page.locator('#mo-turn-left').click();
  from = center(await page.locator(`[data-mo-piece="${id}"]`).boundingBox());
  await page.mouse.move(from.x, from.y); await page.mouse.down(); await page.mouse.move(from.x + 15, from.y, { steps: 3 }); await page.mouse.move(from.x, from.y, { steps: 3 }); await page.mouse.up();
  await page.locator('#mo-restart:not([disabled])').waitFor();
  ok(await page.locator('.mo-box-window svg').count() === 1, 'A parked piece can be turned and dropped into the hole directly underneath');
  await page.setViewportSize({ width: 390, height: 844 }); await page.locator('[data-mo-level="8"]').click(); await page.locator('#mo-restart').click();
  const circle = page.locator('[data-mo-piece][data-mo-shape="circle"]'); await circle.scrollIntoViewIfNeeded();
  await circle.evaluate(b => window.scrollTo(0, b.getBoundingClientRect().top + scrollY - 350));
  const initialScroll = await page.evaluate(() => scrollY), point = center(await circle.boundingBox());
  await page.mouse.move(point.x, point.y); await page.mouse.down(); await page.mouse.move(point.x, 829, { steps: 12 });
  await page.waitForTimeout(250);
  ok(await page.evaluate(start => scrollY > start + 30, initialScroll), 'Holding a dragged piece near the bottom edge scrolls a large board');
  await page.mouse.up(); const stopped = await page.evaluate(() => scrollY); await page.waitForTimeout(150);
  ok(await page.evaluate(start => Math.abs(scrollY - start) < 1, stopped) && await page.locator('.mo-drag-preview').count() === 0, 'Release stops edge scrolling and removes the drag preview');
  return { count: checks.length, checks };
}
