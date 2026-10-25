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
    await p.addInitScript(() => {
      localStorage.setItem('speech_game_progress_v1', JSON.stringify({
        settings: { spokenGuidance: false, memoryPairs: 6 }, supabase: { syncPaused: true },
      }));
      localStorage.setItem('beszedtanulas.memorySound.v1', JSON.stringify({ level: 5 }));
      localStorage.setItem('beszedtanulas.listeningLevels.v1', JSON.stringify({ base: 2, choices: 4, phraseChoices: 3, bingoSize: 3 }));
      localStorage.setItem('beszedtanulas.flipLevels.v1', JSON.stringify({ kimStart: 2, findSize: 8 }));
    });
    await p.goto(new URL('/', page.url()).href);
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
      await p.locator('#chess-jump-select').selectOption('7');
      await titleFocused();
      if (!(await p.locator('.chess-puzzle-nav').innerText()).includes('8 / 8')) throw Error('Puzzle jump failed');
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
      await click('[data-chess-mode="pawns"]');
      await click('[data-chess-battle="full"]');
      await measure(`${width}x${height}:pawn-battle`, tablet);
      await click('#back-button');
      if (await p.locator('#screen-title').innerText() !== 'Fejtörők') throw Error('Back title did not restore');
    }
    await enter();
    const touch = await p.evaluate(() => ({
      selection: getComputedStyle(document.querySelector('#chess')).userSelect,
      editable: getComputedStyle(document.querySelector('#chess-jump-select')).userSelect,
      contextPrevented: !document.querySelector('.chess-square').dispatchEvent(new MouseEvent('contextmenu', { bubbles: true, cancelable: true })),
    }));
    if (touch.selection !== 'none' || touch.editable === 'none' || !touch.contextPrevented) throw Error(JSON.stringify(touch));
    const engineeringRows = [];
    const engineeringTitle = { hub:'Építőliget', drop:'Pottyanó torony', build:'Szabad építés', bridge:'Hídműhely' };
    const measureEngineering = async (name, mode, tablet) => {
      const result = await p.evaluate(({ name }) => {
        const active = document.querySelector('#engineering');
        const stage = active.querySelector('#en-stage')?.getBoundingClientRect();
        const controls = [...active.querySelectorAll('button,summary')]
          .filter(element => element.checkVisibility())
          .map(element => ({ name:element.id || element.getAttribute('data-en-node') || element.textContent.trim().slice(0, 20), rect:element.getBoundingClientRect() }));
        return {
          name, title:document.querySelector('#screen-title').textContent,
          x:Math.max(0, document.documentElement.scrollWidth-innerWidth),
          y:Math.max(0, document.documentElement.scrollHeight-innerHeight),
          stageRatio:stage ? stage.width/stage.height : null,
          smallControls:controls.filter(({rect}) => rect.width<43.5 || rect.height<43.5).map(({name}) => name),
          inaccessible:controls.filter(({rect}) => rect.left<-1 || rect.right>innerWidth+1 || rect.bottom>document.documentElement.scrollHeight+1).map(({name}) => name),
        };
      }, { name });
      engineeringRows.push(result);
      if (result.title!==engineeringTitle[mode] || result.x>1 || (tablet && result.y>1)
        || result.smallControls.length || result.inaccessible.length
        || (result.stageRatio && Math.abs(result.stageRatio-4/3)>.02)) throw Error(JSON.stringify(result));
    };
    const connect = async (a,b) => {
      await click(`[data-en-node="${a}"]`);
      await click(`[data-en-node="${b}"]`);
    };
    for (const [width,height] of [[768,900],[1024,680],[390,844],[932,430]]) {
      const tablet = width===768 || width===1024;
      await p.setViewportSize({ width,height });
      await click('#home-button');
      await click('#home [data-open="activity-menu"]');
      await click('#activity-menu [data-kind="drop"]');
      await p.locator('#en-back').dispatchEvent('click');
      await measureEngineering(`${width}x${height}:hub`,'hub',tablet);
      for (const mode of ['drop','build']) {
        await click(`[data-en-mode="${mode}"]`);
        await titleFocused();
        await measureEngineering(`${width}x${height}:${mode}`,mode,tablet);
        if (mode==='drop') await click('#en-drop');
        else {
          const box = await p.locator('#en-stage').boundingBox();
          await p.locator('#en-stage').click({position:{x:box.width*.5,y:box.height*.08}});
        }
        await p.waitForFunction(mode => !document.querySelector(mode==='drop'?'#en-drop':'#en-place').disabled,mode,{timeout:15000});
        await measureEngineering(`${width}x${height}:${mode}-feedback`,mode,tablet);
        await click('#back-button');
        await titleFocused();
        await measureEngineering(`${width}x${height}:back`,'hub',tablet);
      }
      await click('[data-en-mode="bridge"]');
      await titleFocused();
      for (const level of [0,1,2]) {
        await click(`[data-en-level="${level}"]`);
        await titleFocused();
        await measureEngineering(`${width}x${height}:bridge-${level}`,'bridge',tablet);
      }
      await p.screenshot({path:`output/playwright/engineering-layout-${width}x${height}.png`,animations:'disabled'});
      if (width===932) await p.screenshot({path:'output/playwright/engineering-layout-932x430-full.png',fullPage:true,animations:'disabled'});
      await click('[data-en-level="0"]');
      await click('#en-restart');
      await click('#en-test');
      if (!(await p.locator('#en-status').innerText()).includes('hiányzik')) throw Error('Bridge error feedback missing');
      await measureEngineering(`${width}x${height}:bridge-error`,'bridge',tablet);
      for (let i=0;i<3;i++) await connect(`d${i}`,`d${i+1}`);
      await click('#en-test');
      await p.waitForFunction(() => document.querySelector('#en-status').textContent.startsWith('Itt meghajlott'),{},{timeout:15000});
      await measureEngineering(`${width}x${height}:bridge-failed`,'bridge',tablet);
      await click('#en-edit');
      for (const [a,b] of [['d1','t1'],['d2','t2'],['t1','t2'],['t1','d2'],['d0','t1'],['t2','d3']]) await connect(a,b);
      await click('#en-test');
      await p.waitForFunction(() => document.querySelector('#en-status').textContent.startsWith('Átért!'),{},{timeout:20000});
      await measureEngineering(`${width}x${height}:bridge-success`,'bridge',tablet);
      if (tablet && width===1024) await p.screenshot({path:'output/playwright/engineering-ipad-layout.png',animations:'disabled'});
      await click('#back-button');
      await titleFocused();
      await measureEngineering(`${width}x${height}:hub-return`,'hub',tablet);
      await click('#back-button');
      if (await p.locator('#screen-title').innerText()!=='Kirakók és építés') throw Error('Engineering menu title did not restore');
    }
    const engineeringTouch = await p.evaluate(() => ({
      selection:getComputedStyle(document.querySelector('#engineering')).userSelect,
      contextPrevented:!document.querySelector('#engineering .en-game-card').dispatchEvent(new MouseEvent('contextmenu',{bubbles:true,cancelable:true})),
    }));
    if (engineeringTouch.selection!=='none' || !engineeringTouch.contextPrevented) throw Error(JSON.stringify(engineeringTouch));

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
      if (!menu) return;
      await click(`#home [data-open="${menu}"]`);
      if (game) await click(`#${menu} [data-open="${game}"]`);
    };
    const menus = ['picture-menu', 'practice-menu', 'play-menu', 'shape-menu', 'number-menu', 'activity-menu', 'big-menu'];
    for (const [width, height] of [[768, 900], [1024, 680]]) {
      await p.setViewportSize({ width, height });
      const size = `${width}x${height}`;
      await open(); await check(`${size}:home`);
      await click('#home [data-open="audiobooks"]'); await check(`${size}:audiobooks`, { allowY: Infinity });
      for (const menu of menus) {
        await open(menu); await check(`${size}:${menu}`);
        // One game can have several cards (one per exercise), so cards are opened by position.
        const count = await p.locator(`#${menu} .game-menu-card`).count();
        for (let index = 0; index < count; index++) {
          await open(menu);
          const cardButton = p.locator(`#${menu} .game-menu-card`).nth(index);
          const label = await cardButton.getAttribute('aria-label');
          await cardButton.click();
          await check(`${size}:${menu}:${label}`);
          await click('#back-button');
          if (await p.locator('body').getAttribute('data-screen') !== menu) throw Error(`${label}: back did not return to ${menu}`);
        }
      }
      // Densest levels come from the saved progress set in the init script (12 cards, 4 pictures, 3×3 bingo, 8 flip cards).
      await open('activity-menu', 'memory');
      await check(`${size}:memory-classic-6`);
      const cards = await p.locator('[data-card]').evaluateAll(buttons => buttons.map(button => button.dataset.card));
      await click(`[data-card="${cards[0]}"]`); await click(`[data-card="${cards.find(key => key.slice(0, key.lastIndexOf('-')) !== cards[0].slice(0, cards[0].lastIndexOf('-')))}"]`);
      await check(`${size}:memory-mismatch`);
      await click('[data-memory-mode="sound"]'); await titleFocused();
      await check(`${size}:memory-sound-6`);
      const soundCards = await p.locator('[data-card]').evaluateAll(buttons => buttons.map(button => button.dataset.card));
      await click(`[data-card="${soundCards[0]}"]`); await click(`[data-card="${soundCards[1]}"]`);
      await check(`${size}:memory-sound-open`);
      await click('[data-memory-mode="classic"]');
      await open('picture-menu', 'listening-game');
      for (const mode of ['bingo', 'phrase', 'classic']) {
        await click(`[data-listening-mode="${mode}"]`); await titleFocused();
        await check(`${size}:listening-${mode}`);
      }
      if (await p.locator('.listening-answer').count() !== 4) throw Error('Densest Hol van? level should show four pictures');
      for (const answer of await p.locator('.listening-answer').all()) {
        await answer.click();
        if (await answer.evaluate(button => button.classList.contains('is-correct'))) { await check(`${size}:listening-correct`); break; }
        await check(`${size}:listening-retry`);
      }
      await click('[data-listening-mode="bingo"]');
      if (await p.locator('.listening-bingo-tile').count() !== 9) throw Error('Densest bingo should be 3×3');
      await click('#listening-none'); await check(`${size}:bingo-feedback`);
      await open('picture-menu', 'flip');
      await click('[data-flip-mode="find"]'); await titleFocused();
      if (await p.locator('[data-flip-index]').count() !== 8) throw Error('Densest find round should have eight cards');
      await check(`${size}:flip-find-preview`);
      await click('#flip-hide'); await check(`${size}:flip-find-hidden`);
      await click('[data-flip-mode="missing"]'); await titleFocused();
      await check(`${size}:flip-missing-preview`);
      await click('#flip-hide'); await p.waitForSelector('[data-missing-answer]');
      await check(`${size}:flip-missing-guess`);
      await p.locator('[data-missing-answer]').first().click(); await check(`${size}:flip-missing-answer`);
      await click('[data-flip-mode="free"]');
      await click('#back-button');
      if (await p.locator('body').getAttribute('data-screen') !== 'picture-menu') throw Error('Mi bújt el? back did not return to its menu');
      for (const game of ['shapes', 'colors', 'tower', 'grid', 'memory']) {
        const menu = game === 'grid' ? 'big-menu' : 'shape-menu';
        await open(menu);
        await click(`#${menu} [data-kind="${game}"]`);
        const levels = await p.locator('[data-mo-level]').count();
        for (let level = 1; level <= levels; level++) { await click(`[data-mo-level="${level}"]`); await check(`${size}:montessori-${game}-${level}`); }
        await click('[data-mo-level="1"]');
        await click('#back-button');
        if (await p.locator('body').getAttribute('data-screen') !== menu) throw Error(`Montessori ${game}: back did not return to ${menu}`);
      }
      await open('picture-menu', 'animal-book');
      for (const mode of ['abk-sound', 'abk-search', 'abk-quiz', 'abk-browse']) { await click(`#${mode}`); await check(`${size}:${mode}`); }
      for (const topic of ['animals', 'food', 'clothes']) { await open('picture-menu', 'topics'); await click(`[data-topic="${topic}"]`); await check(`${size}:cards-${topic}`); }
      for (const game of ['hunter', 'post', 'workshop', 'rhyme', 'echo']) {
        await open('practice-menu', 'r-practice'); await click(`[data-game="${game}"]`); await check(`${size}:r-${game}`);
      }
      await open('shape-menu', 'patterns');
      await click('#patterns-change'); await click('[data-pattern-level="thinker"]'); await click('#patterns-apply');
      await check(`${size}:patterns-thinker`);
      await click('#patterns-change'); await click('[data-pattern-level="explorer"]'); await click('#patterns-apply');
      await open('play-menu', 'meseliget'); await click('#meadow-garden'); await check(`${size}:meseliget-task`);
      await click('#back-button');
      if (await p.locator('#screen-title').innerText() !== 'Meseliget') throw Error('Meseliget back did not return to its map');
      if (width === 1024) await p.screenshot({ path: 'output/playwright/montessori-ipad-layout.png', animations: 'disabled' });
    }

    if (errors.length) throw Error(errors.join('; '));
    return `${rows.length} chess, ${engineeringRows.length} engineering and ${views.length} game views passed tablet/phone layout, title, navigation and touch checks.`;
  } finally {
    await context.close();
  }
}
