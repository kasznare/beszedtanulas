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
      await click('#home [data-open="number-menu"]');
      await click('#number-menu [data-open="chess"]');
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
      if (await p.locator('#screen-title').innerText() !== 'Számok és logika') throw Error('Back title did not restore');
    }
    await enter();
    const touch = await p.evaluate(() => ({
      selection: getComputedStyle(document.querySelector('#chess')).userSelect,
      editable: getComputedStyle(document.querySelector('#chess-jump-select')).userSelect,
      contextPrevented: !document.querySelector('.chess-square').dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true })),
    }));
    if (touch.selection !== 'none' || touch.editable === 'none' || !touch.contextPrevented) throw Error(JSON.stringify(touch));
    if (errors.length) throw Error(errors.join('; '));
    return `${rows.length} chess views passed tablet/phone layout, title, navigation and touch checks.`;
  } finally {
    await context.close();
  }
}
