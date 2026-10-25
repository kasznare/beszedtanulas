// Run with playwright-cli run-code --filename in a named, headless test session.
// Repeat with Chromium and WebKit. Audio is disabled in this disposable context.
async page => {
  const browserName = page.context().browser().browserType().name();
  const context = await page.context().browser().newContext({
    viewport: { width: 768, height: 900 }, hasTouch: true, isMobile: true, serviceWorkers: 'block',
  });
  const rows = [], errors = [];
  try {
    const p = await context.newPage();
    p.on('pageerror', error => errors.push(error.message));
    await p.route('https://cdn.jsdelivr.net/**', route => route.fulfill({ contentType: 'text/javascript', body: '' }));
    await p.addInitScript(() => {
      localStorage.setItem('speech_game_progress_v1', JSON.stringify({
        settings: { spokenGuidance: false, numberLimit: 10, phrasePracticeMode: 'together' },
        supabase: { syncPaused: true },
      }));
      HTMLMediaElement.prototype.play = function () {
        setTimeout(() => this.dispatchEvent(new Event('ended')), 10);
        return Promise.resolve();
      };
      if (window.AudioBufferSourceNode) {
        AudioBufferSourceNode.prototype.start = function () {
          setTimeout(() => this.onended?.(new Event('ended')), 10);
        };
        AudioBufferSourceNode.prototype.stop = function () {};
      }
    });
    await p.goto(new URL('/', page.url()).href);
    await p.emulateMedia({ reducedMotion: 'reduce' });
    const click = selector => p.locator(selector).click();
    const title = async (expected, focused = false) => {
      const actual = await p.locator('#screen-title').innerText();
      if (actual !== expected) throw Error(`Wrong title: ${actual}, expected ${expected}`);
      if (focused && await p.evaluate(() => document.activeElement?.id) !== 'screen-title') throw Error(`Unfocused visible title: ${expected}`);
    };
    const enter = async (menu, game) => {
      if (await p.locator('body').getAttribute('data-screen') !== 'home') await click('#home-button');
      await click(`#home [data-open="${menu}"]`);
      await click(`#${menu} [data-open="${game}"]`);
    };
    const check = async (name, width, height) => {
      const result = await p.evaluate(() => {
        const panel = document.querySelector('.panel.is-active');
        const visible = el => Boolean(el.getClientRects().length) && getComputedStyle(el).visibility !== 'hidden' && !el.closest('details:not([open]) > :not(summary)');
        const controls = [...panel.querySelectorAll('button,select,summary')].filter(visible);
        const touchRect = el => (el.tagName==='SELECT' && el.closest('label') ? el.closest('label') : el).getBoundingClientRect();
        const title = document.querySelector('#screen-title').textContent.trim();
        return {
          title, panel: panel.id,
          x: Math.max(0, document.documentElement.scrollWidth - innerWidth),
          y: Math.max(0, document.documentElement.scrollHeight - innerHeight),
          secondaryHeight: Math.ceil(panel.querySelector('.rp-settings')?.getBoundingClientRect().height || 0),
          mainBelowViewport: controls.filter(el=>!el.closest('.rp-settings')).filter(el=>el.getBoundingClientRect().bottom>innerHeight+1).map(el=>el.id||el.textContent.trim()),
          small: controls.filter(el => { const r=touchRect(el); return r.width<43.5 || r.height<43.5; }).map(el=>el.id||el.textContent.trim()),
          inaccessible: controls.filter(el => { const r=el.getBoundingClientRect(); return r.left < -1 || r.right > innerWidth+1 || r.top+scrollY<0 || r.bottom+scrollY>document.documentElement.scrollHeight+1; }).map(el=>el.id||el.textContent.trim()),
          repeated: [...panel.querySelectorAll('h1,h2,h3')].filter(el=>visible(el)&&el.textContent.trim()===title).length,
          selected: getComputedStyle(document.querySelector('.app')).webkitUserSelect || getComputedStyle(document.querySelector('.app')).userSelect,
          editableSelectionBlocked: controls.filter(el=>el.tagName==='SELECT' && (getComputedStyle(el).webkitUserSelect || getComputedStyle(el).userSelect)==='none').map(el=>el.id||el.outerHTML.slice(0,80)),
          contextPrevented: !panel.dispatchEvent(new MouseEvent('contextmenu', { bubbles:true, cancelable:true })),
        };
      });
      rows.push({ browserName, name, width, height, ...result });
      const tablet = width===768||width===1024;
      rows.at(-1).layoutFailure = Boolean(result.x>1 || (tablet&&(result.y>Math.max(1,result.secondaryHeight+30)||result.mainBelowViewport.length)) || result.small.length || result.inaccessible.length || result.repeated || result.selected!=='none' || result.editableSelectionBlocked.length || !result.contextPrevented);
    };
    const shot = async (name,width,height) => {
      await p.evaluate(() => window.scrollTo(0,0));
      await p.screenshot({ path:`output/playwright/voice-text-${browserName}-${width}x${height}-${name}.png`,fullPage:true,animations:'disabled' });
    };
    const idle = () => p.waitForFunction(() => document.querySelector('#r-practice').dataset.phase === 'idle');
    for (const [width,height] of [[768,900],[1024,680],[390,844],[932,430]]) {
      await p.setViewportSize({width,height});
      await enter('play-menu','meseliget');
      await click('[data-quantity="5"]');
      await click('#meadow-garden');
      await title('Meseliget');
      await click('#meadow-check');
      await check('meadow-wrong',width,height);
      await shot('meadow-wrong',width,height);
      for (let i=0;i<5;i++) await click(`[data-apple="${i}"]`);
      await click('#meadow-check');
      await p.waitForFunction(() => document.querySelector('#meadow-status').textContent === 'Megvan az öt alma!');
      await check('meadow-success',width,height);
      await shot('meadow-success',width,height);
      await click('#back-button'); await title('Meseliget',true);
      await click('[data-quantity="10"]'); await click('#meadow-garden');
      await click('#meadow-check');
      await check('meadow-ten-wrong',width,height); await shot('meadow-ten-wrong',width,height);
      for (let i=0;i<10;i++) await click(`[data-apple="${i}"]`);
      await click('#meadow-check');
      await p.waitForFunction(() => document.querySelector('#meadow-status').textContent === 'Megvan a tíz alma!');
      await check('meadow-ten-success',width,height); await shot('meadow-ten-success',width,height);
      await click('#back-button'); await title('Meseliget',true);
      await click('#back-button'); await title('Játék Macival');

      await enter('practice-menu','r-practice');
      await click('[data-game="rhyme"]'); await idle(); await title('Mondókaliget',true);
      await click('[data-rhyme="2"]'); await idle();
      await p.locator('[data-rhyme-short]').uncheck(); await idle();
      await p.locator('[data-rhyme-practice]').selectOption('say'); await idle();
      const fullLine = p.locator('[data-line="1"]');
      if (!(await fullLine.innerText()).includes('Erdő mellett sátrat állítunk.')) throw Error('Corrected full rhyme line missing');
      await fullLine.click(); await idle();
      await check('rhyme-full',width,height); await shot('rhyme-full',width,height);
      await p.locator('[data-rhyme-short]').check(); await idle();
      await p.locator('[data-rhyme-practice]').selectOption('repeat'); await idle();
      for (let i=0;i<3;i++) { await click('[data-action="rhyme-repeat-next"]'); await idle(); }
      if (!(await p.locator('.rp-rhyme-current h3').innerText()).includes('sátrat állítunk.')) throw Error('Corrected short rhyme part missing');
      await check('rhyme-short',width,height); await shot('rhyme-short',width,height);
      await click('#back-button'); await title('Róka R-kalandja',true);
      await click('#back-button'); await title('Mondd utánam');

      await enter('practice-menu','two-word'); await title('Két szó');
      await p.locator('#phrase-topic').selectOption('family');
      for (let i=0;i<30&&await p.locator('#phrase-text').innerText()!=='anya, gyere';i++) await click('#next-phrase');
      if (await p.locator('#phrase-text').innerText()!=='anya, gyere') throw Error('Corrected phrase missing');
      await check('phrase',width,height); await shot('phrase',width,height);
      if (await p.locator('#phrase-parts-toggle').getAttribute('aria-pressed')!=='true') await click('#phrase-parts-toggle');
      if (!(await p.locator('[data-practice-part="0"]').innerText()).includes('anya,')) throw Error('Comma missing in phrase part');
      await check('phrase-parts',width,height);
      await click('#back-button'); await title('Mondd utánam');
    }
    if (errors.length) throw Error(errors.join('; '));
    const failures = rows.filter(row=>row.layoutFailure);
    if (failures.length) throw Error(JSON.stringify({ browserName, failures }));
    return { browserName, checks:rows.length, rows, errors, failures };
  } finally {
    await context.close();
  }
}
