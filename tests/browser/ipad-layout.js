// Run with playwright-cli run-code --filename. The caller's named CLI session is an isolated test profile.
async page => {
  const context = await page.context().browser().newContext({
    viewport: { width: 1024, height: 680 }, hasTouch: true, isMobile: true, serviceWorkers: 'block',
  });
  try {
    const p = await context.newPage();
    const errors = [], rows = [];
    p.on('pageerror', error => errors.push(error.message));
    await p.route('https://cdn.jsdelivr.net/**', route => route.fulfill({ contentType: 'text/javascript', body: '' }));
    await p.addInitScript(() => localStorage.setItem('speech_game_progress_v1', JSON.stringify({
      settings: { spokenGuidance: false }, supabase: { syncPaused: true },
    })));
    await p.goto('http://127.0.0.1:5189/');
    const click = async selector => p.locator(selector).click();
    const enter = async () => {
      if (await p.locator('body').getAttribute('data-screen') !== 'home') await click('#home-button');
      await click('#home [data-open="big-menu"]');
      await click('#big-menu [data-open="chess"]');
    };
    const measure = async (name, tablet) => {
      const result = await p.evaluate(name => {
        const active = document.querySelector('#chess');
        const board = active.querySelector('.chess-board').getBoundingClientRect();
        const controls = [...active.querySelectorAll('button:not(.chess-square),select,summary')]
          .filter(element => element.checkVisibility())
          .map(element => ({ name: element.id || element.textContent.trim().slice(0, 25), rect: element.getBoundingClientRect() }));
        return {
          name, title: document.querySelector('#screen-title').textContent,
          x: Math.max(0, document.documentElement.scrollWidth - innerWidth),
          y: Math.max(0, document.documentElement.scrollHeight - innerHeight),
          boardRatio: board.width / board.height,
          square: active.querySelector('.chess-square').getBoundingClientRect().width,
          smallControls: controls.filter(({ rect }) => rect.width < 43.5 || rect.height < 43.5).map(({ name }) => name),
          inaccessible: controls.filter(({ rect }) => rect.right > innerWidth + 1 || rect.left < -1 || rect.bottom > document.documentElement.scrollHeight + 1).map(({ name }) => name),
        };
      }, name);
      rows.push(result);
      if (result.title !== 'Sakkliget' || result.x > 1 || Math.abs(result.boardRatio - 1) > .02
        || result.smallControls.length || result.inaccessible.length || (tablet && result.y > 1) || result.square < 43.5) {
        throw Error(JSON.stringify(result));
      }
    };
    const titleFocused = async () => {
      if (await p.evaluate(() => document.activeElement?.id) !== 'screen-title') throw Error('View change missed the visible title');
    };
    for (const [width, height] of [[768, 900], [1024, 680], [390, 844], [932, 430]]) {
      const tablet = width === 768 || width === 1024;
      await p.setViewportSize({ width, height });
      await enter();
      await measure(`${width}x${height}:explore`, tablet);
      await click('[data-chess-mode="stars"]');
      await titleFocused();
      await measure(`${width}x${height}:stars`, tablet);
      await click('[data-chess-mode="puzzles"]');
      await titleFocused();
      for (const level of ['easy', 'planning', 'challenge', 'master']) {
        await click(`[data-chess-level="${level}"]`);
        await titleFocused();
        await measure(`${width}x${height}:${level}`, tablet);
      }
      await click('.chess-jump summary');
      await p.locator('#chess-jump-select').selectOption('11');
      await titleFocused();
      if (!(await p.locator('.chess-puzzle-nav').innerText()).includes('12 / 12')) throw Error('Puzzle jump failed');
      await measure(`${width}x${height}:master-last`, tablet);
      await click('#chess-hint');
      await measure(`${width}x${height}:master-hint`, tablet);
      const firstMover = p.locator('.chess-square[aria-label*="ezzel léphetsz"]').first();
      await firstMover.click();
      await click('[data-chess-square="0"]');
      if (!(await p.locator('#chess-status').innerText()).includes('Ide most nem')) throw Error('Wrong move feedback missing');
      await measure(`${width}x${height}:wrong-move`, tablet);
      await click('[data-chess-level="easy"]');
      await click('[data-chess-square="49"]');
      await click('[data-chess-square="17"]');
      if (!(await p.locator('.chess-board').getAttribute('class')).includes('is-complete')) throw Error('Success state missing');
      await measure(`${width}x${height}:success`, tablet);
      if (tablet && width === 1024) await p.screenshot({ path: 'output/playwright/chess-ipad-layout.png', animations: 'disabled' });
      await click('#back-button');
      if (await p.locator('#screen-title').innerText() !== 'Nagyoknak') throw Error('Back title did not restore');
    }
    await enter();
    const touch = await p.evaluate(() => ({
      selection: getComputedStyle(document.querySelector('#chess')).userSelect,
      editable: getComputedStyle(document.querySelector('#chess-jump-select')).userSelect,
      contextPrevented: !document.querySelector('.chess-square').dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true })),
    }));
    if (touch.selection !== 'none' || touch.editable === 'none' || !touch.contextPrevented) throw Error(JSON.stringify(touch));

    // Every menu and game: one visible title, no repeated heading, and on tablets no page scroll.
    // Mesetár is a long library by design; Róka's folded settings may sit below the fold.
    const views = [];
    const check = async (name, { allowY = 0 } = {}) => {
      const result = await p.evaluate(() => {
        const panel = document.querySelector('.panel.is-active');
        const title = document.querySelector('#screen-title').textContent.trim();
        const kicker = document.querySelector('#screen-kicker');
        const repeated = [...panel.querySelectorAll('h1,h2,h3,[class*="eyebrow"]')]
          .filter(element => element.checkVisibility() && element.textContent.trim() === title).length;
        const settings = panel.querySelector('.rp-settings');
        return {
          title, repeated, panel: panel.id,
          kickerRepeats: !kicker.hidden && kicker.textContent.trim() === title,
          x: Math.max(0, document.documentElement.scrollWidth - innerWidth),
          y: Math.max(0, document.documentElement.scrollHeight - innerHeight),
          settings: settings ? Math.ceil(settings.getBoundingClientRect().height) : 0,
        };
      });
      views.push(name);
      if (!result.title || result.repeated || result.kickerRepeats || result.x > 1
        || result.y > Math.max(1, allowY, result.settings + 30)) throw Error(`${name}: ${JSON.stringify(result)}`);
    };
    const open = async (menu, game) => {
      if (await p.locator('body').getAttribute('data-screen') !== 'home') await click('#home-button');
      await click(`#home [data-open="${menu}"]`);
      if (game) await click(`#${menu} [data-open="${game}"]`);
    };
    const menus = ['picture-menu', 'practice-menu', 'number-menu', 'play-menu', 'activity-menu', 'big-menu'];
    for (const [width, height] of [[768, 900], [1024, 680]]) {
      await p.setViewportSize({ width, height });
      const size = `${width}x${height}`;
      await open(); await click('#home-button'); await check(`${size}:home`);
      for (const menu of menus) {
        await open(menu); await check(`${size}:${menu}`);
        for (const game of await p.locator(`#${menu} [data-open]`).evaluateAll(buttons => buttons.map(button => button.dataset.open))) {
          await open(menu, game);
          await check(`${size}:${game}`, { allowY: game === 'audiobooks' ? Infinity : 0 });
        }
      }
      await open('activity-menu', 'memory');
      for (const mode of ['classic', 'sound']) {
        await click(`[data-memory-mode="${mode}"]`); await click('[data-pairs="6"]');
        await check(`${size}:memory-${mode}-6`);
      }
      await click('[data-memory-mode="classic"]');
      const cards = await p.locator('[data-card]').evaluateAll(buttons => buttons.map(button => button.dataset.card));
      await click(`[data-card="${cards[0]}"]`); await click(`[data-card="${cards.find(key => key.split(':')[0] !== cards[0].split(':')[0]) || cards[1]}"]`);
      await check(`${size}:memory-mismatch`);
      await click('[data-pairs="3"]');
      for (const game of ['shapes', 'colors', 'tower', 'grid', 'memory']) {
        await open('activity-menu', 'montessori');
        await click(`[data-mo-game="${game}"]`); await titleFocused();
        const levels = await p.locator('[data-mo-level]').count();
        for (let level = 1; level <= levels; level++) { await click(`[data-mo-level="${level}"]`); await check(`${size}:montessori-${game}-${level}`); }
        await click('[data-mo-level="1"]');
        await click('#back-button');
        if (await p.locator('#screen-title').innerText() !== 'Montessori műhely') throw Error('Montessori back did not restore its menu title');
      }
      await open('picture-menu', 'animal-book');
      for (const mode of ['abk-sound', 'abk-search', 'abk-browse']) { await click(`#${mode}`); await check(`${size}:${mode}`); }
      for (const game of ['hunter', 'post', 'workshop', 'rhyme', 'echo']) {
        await open('practice-menu', 'r-practice'); await click(`[data-game="${game}"]`); await check(`${size}:r-${game}`);
      }
      await open('number-menu', 'patterns');
      await click('#patterns-change'); await click('[data-pattern-level="thinker"]'); await click('#patterns-apply');
      await check(`${size}:patterns-thinker`);
      await click('#patterns-change'); await click('[data-pattern-level="explorer"]'); await click('#patterns-apply');
      await open('play-menu', 'meseliget'); await click('#meadow-garden'); await check(`${size}:meseliget-task`);
      await click('#back-button');
      if (await p.locator('#screen-title').innerText() !== 'Meseliget') throw Error('Meseliget back did not return to its map');
      if (width === 1024) await p.screenshot({ path: 'output/playwright/montessori-ipad-layout.png', animations: 'disabled' });
    }

    if (errors.length) throw Error(errors.join('; '));
    return `${rows.length} chess views and ${views.length} game views passed tablet/phone layout, title, navigation and touch checks.`;
  } finally {
    await context.close();
  }
}
