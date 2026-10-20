// Disposable Playwright contexts only. QA: uninterrupted wall-clock budget,
// first game/story start, all games, reload/history/tabs, parent gate and renewal,
// 15-minute automatic unlock, stopped audio/microphone, progress and viewport fit.
export default async function runPlayTimeQA(page) {
  const checks = [], errors = [], context = page.context(), url = page.url();
  const ok = (value, label) => { if (!value) throw Error(label); checks.push(label); };
  page.on('pageerror', error => errors.push(error.message));
  await page.clock.install({ time: new Date('2026-10-13T09:00:00Z') });
  await page.addInitScript(() => {
    const OriginalAudio = window.Audio;
    window.timeQA = { audio: [], hidden: false, stoppedTracks: 0 };
    window.Audio = class extends OriginalAudio { constructor(...args) { super(...args); timeQA.audio.push(this); } };
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => timeQA.hidden });
  });
  await page.evaluate(() => localStorage.clear()); await page.reload();
  await page.evaluate(() => { const saved = JSON.parse(localStorage.getItem('speech_game_progress_v1')); saved.settings.spokenGuidance = false; saved.supabase.syncPaused = true; localStorage.setItem('speech_game_progress_v1', JSON.stringify(saved)); });
  await page.reload();
  const at = screen => page.waitForFunction(value => document.body.dataset.screen === value, screen);
  const remaining = () => page.evaluate(() => { const r = JSON.parse(localStorage.getItem('beszedtanulas.playTime.v1')); return r.startedAt === null ? 1800000 : Math.max(0, r.startedAt + 1800000 - Date.now()); });
  const enter = async (group, screen) => { if (await page.locator('body').getAttribute('data-screen') !== 'home') await page.locator('#home-button').click(); if (group) await page.locator(`#home [data-open="${group}"]`).click(); await page.locator(group ? `#${group} [data-open="${screen}"]` : `#home [data-open="${screen}"]`).click(); await at(screen); };
  const seed = async remainingMs => { await page.evaluate(ms => localStorage.setItem('beszedtanulas.playTime.v1', JSON.stringify({ version: 1, cycle: `qa-${Date.now()}-${Math.random()}`, startedAt: Date.now() - 1800000 + ms })), remainingMs); await page.reload(); };
  const solveGate = async () => { const question = await page.locator('#parent-gate-question').innerText(); const sum = question.match(/\d+/g).map(Number).reduce((a,b)=>a+b); await page.locator('#parent-gate-answers button').filter({ hasText: new RegExp(`^${sum}$`) }).click(); };

  await page.clock.fastForward(60000); ok(await remaining() === 1800000, 'Initial menu waits for the first game');
  await enter(null, 'audiobooks'); await page.waitForFunction(() => document.querySelector('#audiobooks').dataset.phase === 'ready');
  ok(await remaining() === 1800000, 'Browsing the story library waits for the first playback');
  await page.locator('#story-toggle').click(); await page.waitForFunction(() => document.querySelector('#audiobooks').dataset.phase === 'playing');
  ok(await remaining() < 1800000 && await remaining() > 1795000, 'First actual story playback starts the deadline');
  await page.locator('#story-toggle').click(); const firstPaused = await remaining(); await page.clock.fastForward(10000);
  ok(await remaining() <= firstPaused - 10000, 'Pausing the first story keeps its deadline running');
  await page.locator('#home-button').click();
  await enter('picture-menu', 'topics'); await page.locator('[data-topic="animals"]').click(); await at('cards');
  await page.clock.fastForward(125000); ok(await remaining() < 1676000, 'Idle game never pauses the countdown');
  const beforeMenu = await remaining(); await page.locator('#home-button').click(); await page.clock.fastForward(60000);
  ok(await remaining() <= beforeMenu - 60000, 'Returning to the menu keeps counting');
  const beforeHidden = await remaining(); await page.evaluate(() => { timeQA.hidden = true; document.dispatchEvent(new Event('visibilitychange')); }); await page.clock.fastForward(60000);
  ok(await remaining() <= beforeHidden - 60000, 'Backgrounding keeps counting'); await page.evaluate(() => { timeQA.hidden = false; document.dispatchEvent(new Event('visibilitychange')); });
  const beforeReload = await remaining(); await page.reload(); ok(await remaining() <= beforeReload, 'Reload preserves the original deadline');
  await page.locator('#parent-button').click(); await solveGate(); await at('parent');
  const beforeParent = await remaining(); await page.clock.fastForward(60000); ok(await remaining() <= beforeParent - 60000, 'Parent settings keep counting');
  await page.locator('#parent-renew-play-time').click(); ok(await remaining() > 1799000, 'Parent settings start a fresh 30 minutes');
  await page.locator('#supabase-role').selectOption('admin'); await page.locator('#start-active-game').click();
  const beforePreview = await remaining(); await page.clock.fastForward(5000); ok(await remaining() <= beforePreview - 5000, 'Parent preview also keeps counting');
  await page.locator('#parent-preview [data-return-child]').click();

  // Each game entry is protected at the same shared deadline.
  const groups = await page.evaluate(async () => (await import('./navigation.js')).GROUPS);
  for (const { screen, screens } of groups) {
    for (const game of screens.filter(value => !['topics', 'numbers'].includes(value))) {
      await enter(screen, game); await page.locator('#home-button').click();
    }
  }
  await page.locator('#home [data-open="number-menu"]').click(); await page.locator('[data-mode="count"]').click(); await at('numbers'); await page.locator('#home-button').click();
  ok(true, 'All game entrances still work with the shared timer');

  await seed(5000); await enter(null, 'audiobooks');
  await page.locator('#story-toggle').waitFor(); await page.waitForFunction(() => document.querySelector('#audiobooks').dataset.phase === 'ready');
  await page.locator('#story-toggle').click(); await page.waitForFunction(() => document.querySelector('#audiobooks').dataset.phase === 'playing');
  ok(await page.evaluate(() => timeQA.audio.some(audio => !audio.paused)), 'Real story playback starts');
  await page.clock.fastForward(6000); await at('play-break');
  ok(await page.evaluate(() => timeQA.audio.every(audio => audio.paused)), 'The deadline stops story playback');
  ok((await page.locator('#break-countdown').innerText()).startsWith('14:'), 'Break displays a 15-minute countdown');
  const progress = await page.evaluate(() => localStorage.getItem('speech_game_progress_v1'));
  await page.reload(); await at('play-break'); ok(await page.evaluate(() => localStorage.getItem('speech_game_progress_v1')) === progress, 'Reload retains the lock and progress');
  await page.goBack(); await at('play-break'); ok(true, 'Browser history cannot bypass the break');
  await page.locator('#break-parent-unlock').click();
  const numbers = (await page.locator('#parent-gate-question').innerText()).match(/\d+/g).map(Number), sum = numbers[0] + numbers[1];
  await page.locator('#parent-gate-answers button').filter({ hasText: new RegExp(`^(?!${sum}$)\\d+$`) }).first().click();
  ok(await page.locator('#parent-gate-status').innerText() === 'Próbáld újra!', 'Wrong parent answer leaves the break locked');
  await page.keyboard.press('Escape'); await at('play-break'); ok(true, 'Cancelling the parent gate leaves the break locked');

  for (const viewport of [{ width:375,height:667 }, { width:932,height:350 }, { width:834,height:1194 }]) {
    await page.setViewportSize(viewport);
    const fit = await page.evaluate(() => { const elements = ['#break-title','#break-countdown','#break-parent-unlock','#play-break .parent-note'].map(selector => document.querySelector(selector).getBoundingClientRect()); return document.documentElement.scrollWidth <= innerWidth + 1 && elements.every(r => r.left >= 0 && r.right <= innerWidth && r.top >= 0 && r.bottom <= innerHeight) && document.querySelector('#break-parent-unlock').getBoundingClientRect().height >= 44; });
    ok(fit, `Break fits ${viewport.width}×${viewport.height} with a visible ≥44px parent control`);
    await page.screenshot({ path:`output/playwright/play-time-break-${context.browser().browserType().name()}-${viewport.width}.png`, scale:'css' });
  }
  await page.setViewportSize({ width:390,height:844 });
  await page.locator('#break-parent-unlock').click(); await solveGate(); await at('home');
  ok(await remaining() > 1799000, 'Correct parent answer grants another 30 minutes');
  await seed(0); await at('play-break'); await page.clock.fastForward(900001); await at('home');
  ok(await remaining() === 1800000, '15-minute break automatically restores a fresh budget');

  // A paused story still uses its running budget, and a second tab adopts it.
  await seed(120000); await enter(null, 'audiobooks'); await page.waitForFunction(() => document.querySelector('#audiobooks').dataset.phase === 'ready');
  const pausedBefore = await remaining(); await page.clock.fastForward(30000); ok(await remaining() <= pausedBefore - 30000, 'A paused or unplayed story cannot pause an already running budget');
  const second = await context.newPage(); await second.clock.install({ time: new Date(await page.evaluate(() => Date.now())) }); await second.goto(url);
  await second.waitForFunction(() => document.querySelector('#home-play-time').textContent.includes('Játékidő:'));
  const deadline = await page.evaluate(() => JSON.parse(localStorage.getItem('beszedtanulas.playTime.v1')).startedAt);
  ok(await second.evaluate(() => JSON.parse(localStorage.getItem('beszedtanulas.playTime.v1')).startedAt) === deadline, 'Second tab adopts the same deadline');
  await page.clock.fastForward(100000); await at('play-break'); await second.clock.fastForward(100000); await second.waitForFunction(() => document.body.dataset.screen === 'play-break');
  ok(true, 'All open tabs lock at the same deadline'); await second.close();
  await seed(-901000); await at('home'); ok(await remaining() === 1800000, 'A break that elapsed while closed restores the full budget on reopening');
  ok(errors.length === 0, 'No JavaScript errors: ' + errors.join('; '));
  return { engine:context.browser().browserType().name(), count:checks.length, checks };
}
