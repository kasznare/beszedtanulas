// Run only in a disposable playwright-cli session. Real positions: the dark side answers every move.
async page => {
  const context = page.context(), checks = [], errors = [];
  const ok = (value, label) => { if (!value) throw Error(label); checks.push(label); };
  const listener = error => errors.push(error.message); page.on('pageerror', listener);
  const base = new URL('/', page.url()).href;
  const cell = name => page.locator(`[data-chess-square="${(8 - Number(name[1])) * 8 + 'abcdefgh'.indexOf(name[0])}"]`);
  const move = async (from, to) => { await cell(from).click(); await cell(to).click(); };
  const status = () => page.locator('#chess-status').innerText();
  const waitStatus = text => page.waitForFunction(value => document.querySelector('#chess-status')?.textContent.includes(value), text, { timeout: 5000 });
  const enter = async () => { await page.locator('#home [data-open="big-menu"]').click(); await page.locator('#big-menu [data-open="chess"]').click(); };
  const open = async (level, title) => {
    await page.locator(`[data-chess-level="${level}"]`).click();
    await page.locator('.chess-jump summary').click();
    const index = await page.locator('#chess-jump-select option').evaluateAll((options, name) => options.findIndex(option => option.textContent.includes(name)), title);
    ok(index >= 0, `${title}: listed under ${level}`);
    await page.locator('#chess-jump-select').selectOption(String(index));
  };
  const closeCelebration = async () => { await page.waitForSelector('#round-complete[open]'); await page.locator('#round-replay').click(); };
  try {
    await context.setOffline(false);
    await page.evaluate(async () => {
      localStorage.clear();
      for (const registration of await navigator.serviceWorker.getRegistrations()) await registration.unregister();
      for (const key of await caches.keys()) await caches.delete(key);
    });
    await page.goto('about:blank'); await page.goto(base); await page.setViewportSize({ width: 1194, height: 834 });
    await enter(); await page.locator('[data-chess-mode="puzzles"]').click();

    await open('planning', 'A védtelen futó');
    await move('d1', 'd6');
    await waitStatus('leütötte');
    ok((await status()).includes('bástyát'), 'A protected capture is answered by the recapture');
    ok(await page.locator('.chess-square.is-reply').count() === 2, 'The dark move is highlighted');
    await page.locator('#chess-undo').click();
    ok(await cell('d1').locator('.chess-piece').count() === 1, 'Undo restores the position before the light move');
    await move('d1', 'a1');
    await waitStatus('Megnyerted');
    await closeCelebration();

    await open('challenge', 'Huszárvilla');
    await move('b5', 'c7');
    await waitStatus('A sötét lépett');
    ok((await page.locator('#chess-move-count').innerText()).includes('1 / 2'), 'Two-move tactics count the light moves');
    await move('c7', 'a8');
    await waitStatus('Megnyerted');
    await closeCelebration();

    await open('master', 'Az alsó sor');
    await move('a1', 'a8');
    await waitStatus('Matt!');
    ok(await page.locator('.chess-square.is-check').count() === 1, 'The mated king is marked');
    await closeCelebration();

    await open('master', 'Bástya a sarokban');
    await move('a1', 'h1');
    await waitStatus('Ez még nem matt');
    ok(await page.locator('#chess-undo').isEnabled(), 'A failed attempt can be taken back');

    await page.locator('[data-chess-mode="pawns"]').click();
    ok(await page.locator('.chess-piece').count() === 8, 'The small pawn battle starts with four pawns each');
    await move('d2', 'd4');
    await waitStatus('Te jössz');
    ok(await page.locator('.chess-square.is-reply').count() === 2, 'The dark pawn answers');

    // En passant: with the gentle randomness fixed, the dark pawn steps d7–d5 beside e5.
    await page.locator('#chess-restart').click();
    await page.evaluate(() => { Math.random = () => 0.99; });
    for (const [from, to, reply] of [['c2', 'c3', 'c7 → c5'], ['e2', 'e4', 'c5 → c4'], ['e4', 'e5', 'd7 → d5']]) {
      await move(from, to); await waitStatus(`${reply}. Te jössz`);
    }
    await page.locator('#chess-hint').click(); await cell('e5').click();
    ok(await cell('d6').evaluate(element => element.classList.contains('is-capture') && element.getAttribute('aria-label').includes('menet közben üthető')), 'En passant square is marked as a capture');
    await cell('d6').click();
    // The light move is drawn at once; the dark answer follows after a pause.
    ok(await cell('d5').getAttribute('aria-label') === 'd5, üres', 'The passed pawn is taken; an empty square never reads as in check');
    ok((await cell('d6').getAttribute('aria-label')).startsWith('d6, világos gyalog'), 'The light pawn lands behind it');
    await waitStatus('Te jössz');
    ok(errors.length === 0, `No page errors: ${errors.join('; ')}`);
    return { checks: checks.length, labels: checks };
  } finally { page.off('pageerror', listener); }
}
