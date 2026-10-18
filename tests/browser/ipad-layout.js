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
    await p.goto(new URL('/', page.url()).href);
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
      await click('#activity-menu [data-open="engineering"]');
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
      if (await p.locator('#screen-title').innerText()!=='Kirakók és ügyesség') throw Error('Engineering menu title did not restore');
    }
    const engineeringTouch = await p.evaluate(() => ({
      selection:getComputedStyle(document.querySelector('#engineering')).userSelect,
      contextPrevented:!document.querySelector('#engineering .en-game-card').dispatchEvent(new MouseEvent('contextmenu',{bubbles:true,cancelable:true})),
    }));
    if (engineeringTouch.selection!=='none' || !engineeringTouch.contextPrevented) throw Error(JSON.stringify(engineeringTouch));
    if (errors.length) throw Error(errors.join('; '));
    return `${rows.length} chess and ${engineeringRows.length} engineering views passed tablet/phone layout, title, navigation and touch checks.`;
  } finally {
    await context.close();
  }
}
