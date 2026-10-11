// Disposable Playwright CLI context. Check the inner feedback borders separately
// from .is-narrated: a green outer outline can hide an amber selection underneath.
async page => {
  const context = await page.context().browser().newContext({ serviceWorkers: 'block', viewport: { width: 1194, height: 834 } });
  const p = await context.newPage(), checks = [], errors = [];
  const ok = (value, label) => { if (!value) throw Error(label); checks.push(label); };
  const sage = 'rgb(120, 149, 127)', green = 'rgb(72, 114, 77)', slate = 'rgb(123, 146, 159)';
  await context.route('https://cdn.jsdelivr.net/**', r => r.fulfill({ contentType: 'text/javascript', body: '' }));
  // Short recording fixture keeps this colour walkthrough independent of guide length.
  await context.route('**/audio/voice/*.mp3', r => r.fulfill({ path: 'audio/voice/number_1.mp3', contentType: 'audio/mpeg' }));
  await context.addInitScript(() => {
    localStorage.setItem('speech_game_progress_v1', JSON.stringify({ settings: { spokenGuidance: false }, supabase: { syncPaused: true } }));
    window.feedbackVoices = [];
    document.addEventListener('narrationstart', event => feedbackVoices.push({ screen: document.body.dataset.screen, ...event.detail }));
  });
  p.on('pageerror', error => errors.push(error.message));
  const base = page.url();
  const at = id => p.waitForFunction(id => document.body.dataset.screen === id, id);
  const home = async () => { if (await p.locator('body').getAttribute('data-screen') !== 'home') { await p.locator('#home-button').click(); await at('home'); } };
  const enter = async id => {
    await home();
    const parent = await p.evaluate(async id => (await import('./navigation.js')).parentScreen(id), id);
    await p.locator(`#home [data-open="${parent}"]`).click(); await at(parent);
    await p.locator(`#${parent} [data-open="${id}"]`).click(); await at(id);
  };
  const colour = async (selector, property, expected, pseudo = null) => {
    const found = await p.locator(selector).first().evaluate((node, { property, pseudo }) => getComputedStyle(node, pseudo)[property], { property, pseudo });
    ok(found === expected, `${selector}${pseudo || ''}: ${property} = ${found}, expected ${expected}`);
  };
  const shadow = async (selector, expected) => {
    const value = await p.locator(selector).first().evaluate(node => getComputedStyle(node).boxShadow);
    ok(value.includes(expected), `${selector}: feedback ring is ${expected} (${value})`);
  };
  const rGame = async game => {
    await enter('r-practice'); await p.locator(`#r-practice [data-game="${game}"]`).click();
    await p.locator('#r-practice[data-phase="idle"]').waitFor({ timeout: 15000 });
  };
  try {
    await p.goto(base); await at('home');
    // Compatibility portal cards have a more specific focus selector than buttons.
    await p.locator('#home .home-grid').evaluate(node => node.classList.add('game-worlds'));
    await p.locator('#home [data-open="picture-menu"]').evaluate(node => node.classList.add('logic-portal-link'));
    await p.keyboard.press('Tab'); await p.locator('#home .logic-portal-link').focus();
    await colour('#home .logic-portal-link:focus-visible', 'outlineColor', green);
    await rGame('rhyme');
    for (const viewport of [{ width: 375, height: 667 }, { width: 932, height: 350 }, { width: 1194, height: 834 }]) {
      await p.setViewportSize(viewport);
      await colour('.rp-rhyme-picker [aria-pressed="true"]', 'borderTopColor', sage);
      await colour('.rp-rhyme-line.is-current', 'borderTopColor', sage);
      // Reproduce the reported double border while real model audio is playing.
      await p.locator('#r-practice [data-action="model"]').click();
      await p.locator('.rp-rhyme-line.is-current.is-narrated').waitFor();
      await colour('.rp-rhyme-line.is-current.is-narrated', 'borderTopColor', sage);
      await colour('.rp-rhyme-line.is-current.is-narrated', 'outlineColor', sage);
      await p.locator('#r-practice[data-phase="idle"]').waitFor();
    }
    await p.locator('[data-rhyme="1"]').click(); await p.locator('#r-practice[data-phase="idle"]').waitFor();
    await colour('[data-rhyme="1"]', 'borderTopColor', sage);
    await p.locator('[data-line="2"]').click(); await p.locator('#r-practice[data-phase="idle"]').waitFor();
    await colour('[data-line="2"].is-current', 'borderTopColor', sage);
    await rGame('workshop'); await p.locator('[data-position="initial"]').click(); await p.locator('#r-practice[data-phase="idle"]').waitFor();
    await colour('[data-position="initial"][aria-pressed="true"]', 'borderTopColor', sage);
    await colour('.rp-dots .is-current', 'color', green);

    await enter('listening-game');
    await p.waitForFunction(() => feedbackVoices.some(v => v.screen === 'listening-game' && v.id.startsWith('word_')));
    const target = await p.evaluate(() => feedbackVoices.filter(v => v.screen === 'listening-game' && v.id.startsWith('word_')).at(-1).id.slice(5));
    await p.locator(`.listening-answer:not([data-word="${target}"])`).first().click();
    await colour('.listening-answer.is-retry', 'borderTopColor', slate);
    await colour('.progress-dot.is-current', 'backgroundColor', green);
    await shadow('.progress-dot.is-current', 'rgb(229, 237, 223)');

    await enter('animal-book');
    for (let index = 0; index < 4; index++) {
      await p.locator(`.abk-page-index [data-page="${index}"]`).click();
      await colour('.abk-page-index [aria-current="page"]', 'borderTopColor', sage);
      await p.locator('.abk-animal').first().hover();
      await colour('.abk-animal:hover', 'borderTopColor', sage);
    }

    await enter('workshop'); await p.locator('#workshop [data-game="pattern"]').click();
    await colour('.ws-pattern-slot:not(.ws-selected)', 'borderTopColor', sage);
    await p.locator('#ws-hint').click(); await shadow('.ws-motif-glow', sage);
    await p.locator('#ws-check').click();
    await colour('.ws-review', 'borderTopColor', slate);

    await enter('furfangliget'); await p.locator('#furfangliget [data-game="route"]').click();
    await p.locator('.logic-cell.next-cell').first().click();
    await colour('.logic-cell.on-path', 'borderTopColor', sage);

    await enter('chess');
    await shadow('.chess-square.is-selected', green);
    await p.locator('[data-chess-mode="puzzles"]').click();
    const capture = await p.evaluate(async () => {
      const { CHESS_PUZZLES } = await import('./chess-data.js');
      return CHESS_PUZZLES.findIndex(item => item.id === 'rook-capture');
    });
    for (let index = 0; index < capture; index++) await p.locator('#chess-another').click();
    const task = await p.evaluate(async index => (await import('./chess-data.js')).CHESS_PUZZLES[index], capture);
    const square = name => (8 - Number(name[1])) * 8 + 'abcdefgh'.indexOf(name[0]);
    await p.locator(`[data-chess-square="${square(task.from)}"]`).click();
    await p.locator('#chess-hint').click();
    await colour('.chess-square.is-capture', 'borderTopColor', green, '::after');
    await shadow('.chess-square.is-goal', sage);
    await colour('.chess-ring', 'borderTopColor', green);
    await p.locator(`[data-chess-square="${square(task.goal)}"]`).click();
    await colour('.chess-board.is-complete', 'borderTopColor', green);
    await p.locator('#round-complete[open]').waitFor(); await p.locator('#round-home').click();

    await enter('pour');
    await colour('.pour-cup[aria-pressed="true"]', 'borderTopColor', sage);
    await colour('.pour-cup-highlight', 'stroke', sage);
    await colour('.pour-target', 'stroke', green);
    await p.locator('[data-pour-cup="1"]').click();
    await colour('[data-pour-cup="1"][aria-pressed="true"]', 'borderTopColor', sage);
    await colour('#pour-finish', 'borderTopColor', sage);

    await enter('meseliget'); await p.locator('#meadow-start').click();
    await colour('.meadow-steps .current', 'backgroundColor', green);
    await shadow('.meadow-steps .current', 'rgb(229, 237, 223)');

    // The standalone recovery page has its own inline CSS and must be checked too.
    await p.addInitScript(() => Object.defineProperty(navigator, 'onLine', { get: () => false }));
    await p.goto(new URL('refresh.html', base).href); await p.locator('#retry').waitFor();
    await p.keyboard.press('Tab'); await p.locator('#retry').focus();
    await colour('#retry:focus-visible', 'outlineColor', green);
    await p.locator('.actions a').focus(); await colour('.actions a:focus-visible', 'outlineColor', green);
    ok(!errors.length, `No script errors: ${errors.join('; ')}`);
    return { count: checks.length, engine: context.browser().browserType().name(), checks };
  } catch (error) {
    throw Error(`${error.message}; completed feedback checks: ${checks.length}`);
  } finally { await context.close(); }
}
