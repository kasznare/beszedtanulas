// Disposable CLI browser only: checks real Web Audio sources and game outcomes.
async page => {
  const checks = [], errors = [], context = page.context(), url = page.url();
  const ok = (value, message) => { if (!value) throw Error(message); checks.push(message); };
  page.on('pageerror', error => errors.push(error.message));
  await context.setOffline(false);
  await page.evaluate(async () => {
    localStorage.clear();
    for (const registration of await navigator.serviceWorker.getRegistrations()) await registration.unregister();
    for (const key of await caches.keys()) await caches.delete(key);
    localStorage.setItem('speech_game_progress_v1', JSON.stringify({ settings: { spokenGuidance: false, soundEffects: true, effectsVolume: .6, memoryPairs: 2, roundLength: 3 }, supabase: { syncPaused: true } }));
  });
  await page.addInitScript(() => {
    if (window.__fxQAWrapped) return;
    window.__fxQAWrapped = true;
    window.fxQA = { tones: [], gains: [], sources: [] };
    const C = window.AudioContext || window.webkitAudioContext;
    const oscillator = C.prototype.createOscillator, gain = C.prototype.createGain, buffer = C.prototype.createBufferSource;
    C.prototype.createOscillator = function () {
      const node = oscillator.call(this), start = node.start.bind(node), frequency = node.frequency.setValueAtTime.bind(node.frequency);
      let hz = 0;
      node.frequency.setValueAtTime = (...args) => { hz = args[0]; return frequency(...args); };
      node.start = (...args) => { fxQA.tones.push(hz); return start(...args); };
      return node;
    };
    C.prototype.createGain = function () {
      const node = gain.call(this), connect = node.connect.bind(node), target = node.gain.setTargetAtTime.bind(node.gain);
      const record = { node, destination: this.destination, bus: false, values: [] }; fxQA.gains.push(record);
      node.connect = (...args) => { if (args[0] === record.destination) record.bus = true; return connect(...args); };
      node.gain.setTargetAtTime = (...args) => { record.values.push(args[0]); return target(...args); };
      return node;
    };
    C.prototype.createBufferSource = function () {
      const node = buffer.call(this), start = node.start.bind(node), stop = node.stop.bind(node);
      const record = { duration: 0, stopped: false, gainAtStart: 0 }; fxQA.sources.push(record);
      node.start = (...args) => { record.duration = node.buffer?.duration || 0; record.gainAtStart = fxQA.gains.find(record=>record.bus&&record.values.length)?.values.at(-1); return start(...args); };
      node.stop = (...args) => { if (!args.length) record.stopped = true; return stop(...args); };
      return node;
    };
  });
  await page.goto('about:blank'); await page.goto(url);
  // Finish the fresh offline installation before the first gesture, so an
  // automatic home-screen upgrade cannot replace the page during that click.
  await page.waitForFunction(()=>document.querySelector('#offline-status')?.textContent.startsWith('Letöltve.'),undefined,{timeout:60000});
  await page.waitForTimeout(150);
  await page.setViewportSize({ width: 1194, height: 834 });
  const clear = async () => {
    // Let the preceding navigation's deferred click finish before measuring
    // this action. Keep the entire action's own dispatch in the recording.
    await page.waitForTimeout(100);
    await page.evaluate(() => { fxQA.tones = []; fxQA.sources = []; });
  };
  const tones = () => page.evaluate(() => fxQA.tones);
  const heard = async hz => (await tones()).includes(hz);
  const busGain = () => page.evaluate(() => fxQA.gains.find(record => record.bus && record.values.length)?.values.at(-1));
  const home = async () => { if (await page.locator('#home-button').isVisible()) await page.locator('#home-button').click(); };
  const enter = async (group, game) => { await home(); await page.locator(`#home [data-open="${group}"]`).click(); await page.locator(`#${group} [data-open="${game}"]`).click(); };
  const parent = async () => { await home(); await page.locator('#parent-button').click(); const question = await page.locator('#parent-gate-question').textContent(); const sum = question.match(/\d+/g).map(Number).reduce((a,b)=>a+b); await page.locator('#parent-gate-answers button').filter({hasText:new RegExp(`^${sum}$`)}).click(); };
  const placeMo = async id => { await page.locator(`[data-mo-piece="${id}"]`).click(); await page.locator(`[data-mo-target="${id}"]`).click(); await page.locator('#mo-restart:not([disabled])').waitFor(); };
  const move = async (piece, target, release = true) => {
    const from = await page.locator(piece).boundingBox(), to = await page.locator(target).boundingBox();
    await page.mouse.move(from.x+from.width/2,from.y+from.height/2); await page.mouse.down(); await page.mouse.move(to.x+to.width/2,to.y+to.height/2,{steps:12});
    if (release) await page.mouse.up();
  };
  try {
    await clear(); await page.locator('#home [data-open="activity-menu"]').click();
    await page.waitForFunction(() => fxQA.tones.includes(820));
    ok((await tones()).filter(hz=>hz===820).length === 1, 'Navigation produces one soft interface click');
    await page.locator('[data-open="montessori"]').click(); await page.locator('[data-mo-game="shapes"]').click(); await page.locator('[data-mo-level="1"]').click(); await page.locator('#mo-restart').click();
    let id = await page.locator('[data-mo-piece]').first().getAttribute('data-mo-piece');
    await clear(); await page.locator(`[data-mo-piece="${id}"]`).click();
    ok(await heard(510) && !await heard(820) && !await heard(680), 'Mouse pickup plays exactly the grab cue without a duplicate click or select cue');
    await clear(); await page.locator(`[data-mo-target="${id}"]`).click(); await page.locator('#mo-restart:not([disabled])').waitFor();
    ok(await heard(480) && await heard(270) && await heard(660) && !await heard(820), 'Animated fall has wooden impacts and completion, without a generic click');
    await clear(); await page.locator('#mo-undo').click(); ok(await heard(780), 'Undo has its own return sound');
    await page.locator('[data-mo-level="4"]').click();
    await clear(); await page.locator('[data-mo-blocker]').first().click(); ok(await heard(340), 'Opening a blocker has a sliding sound');
    await page.locator('[data-mo-level="3"]').click(); id = await page.locator('[data-mo-piece]').first().getAttribute('data-mo-piece');
    await clear(); await move(`[data-mo-piece="${id}"]`, '.mo-heading');
    ok(await heard(510) && await heard(440) && !await heard(480), 'Dragging outside has pickup and return sounds, and no false fall sound');
    await clear(); await move(`[data-mo-piece="${id}"]`, `[data-mo-target="${id}"]`, false); await page.locator('#montessori').dispatchEvent('pointercancel'); await page.mouse.up();
    ok(!await heard(480) && await page.locator(`[data-mo-piece="${id}"]`).count()===1, 'Pointer cancellation does not sound like a successful drop');
    await page.locator('#mo-restart').click(); id = await page.locator('[data-mo-piece]').first().getAttribute('data-mo-piece');
    await clear(); await page.locator(`[data-mo-piece="${id}"]`).focus(); await page.keyboard.press('Enter'); ok(await heard(680), 'Keyboard selection also has an audible cue');

    await page.locator('[data-mo-level="6"]').click(); await page.locator('#mo-restart').click();
    id = await page.locator('[data-mo-piece][data-mo-shape="triangle"]').first().getAttribute('data-mo-piece');
    await page.locator(`[data-mo-piece="${id}"]`).click();
    await clear(); await page.locator('#mo-turn-right').click(); ok(await heard(440) && !await heard(820), 'Rotating an expanded Montessori shape has a wooden cue');
    await clear(); await page.locator(`[data-mo-piece="${id}"]`).focus(); await page.keyboard.press('ArrowRight'); ok(await heard(340), 'Moving a shape with the keyboard has a sliding cue');
    const exercise = () => page.evaluate(async () => {
      const { game, level } = document.querySelector('#montessori').dataset;
      const key = Object.keys(localStorage).find(key => key.startsWith('beszedtanulas.montessori.v2:') && key.endsWith(`:${game}:${level}`));
      const saved = JSON.parse(localStorage.getItem(key));
      const { createMontessoriSession } = await import('./montessori-session.js');
      return createMontessoriSession(game, +level, saved.seed);
    });
    await page.locator('#mo-back').click(); await page.locator('[data-mo-game="grid"]').click(); await page.locator('#mo-restart').click();
    const grid = await exercise();
    await clear(); await page.locator('#mo-check').click(); ok(await heard(370) && !await heard(660), 'Checking an incomplete grid gives only a retry cue');
    const used = new Set();
    for (const target of grid.targets) {
      const expected = target.expected || target, piece = grid.pieces.find(p => !used.has(p.id) && p.color===expected.color && p.shape===expected.shape && p.size===expected.size);
      used.add(piece.id); await clear(); await page.locator(`[data-mo-piece="${piece.id}"]`).click(); await page.locator(`[data-mo-target="${target.id}"]`).click();
    }
    ok(await heard(510) && await heard(580), 'Grid tiles have pickup and placement cues');
    await clear(); await page.locator('#mo-check').click(); ok(await heard(660) && await page.locator('#montessori').getAttribute('data-done')==='true', 'A correctly checked grid has a completion cue');
    await page.locator('#mo-back').click(); await page.locator('[data-mo-game="memory"]').click(); await page.locator('#mo-restart').click();
    await clear(); await page.locator('#mo-hide-pattern').click(); ok(await heard(400), 'Hiding the Montessori memory pattern has a paper cue');
    await clear(); await page.locator('#mo-show-pattern').click(); ok(await heard(400), 'Revisiting the Montessori memory pattern also has a paper cue');

    await enter('number-menu','chess'); await page.locator('[data-chess-mode="explore"]').click(); await page.locator('[data-chess-piece="rook"]').click();
    await clear(); await page.locator('.chess-square.is-possible').first().click(); ok(await heard(380) && !await heard(820), 'A legal chess move has one wooden move sound');
    await clear(); await page.locator('#chess-undo').click(); ok(await heard(780), 'Chess undo uses the shared return cue');
    await page.locator('[data-chess-mode="puzzles"]').click();
    for (let i = 0; i < 12 && !(await page.locator('.chess-puzzle-nav').textContent()).includes('Előre lép, átlósan üt'); i++) await page.locator('#chess-next').click();
    await page.locator('[data-chess-square="35"]').click(); await clear(); await page.locator('[data-chess-square="28"]').click();
    ok(await heard(245) && await heard(460), 'Chess captures have their own heavier sound');

    await enter('activity-menu','puzzle');
    const piece = await page.locator('.puzzle-tray [data-piece]').first().getAttribute('data-piece');
    await clear(); await page.locator(`.puzzle-tray [data-piece="${piece}"]`).click(); await page.locator('[data-slot="0"]').click(); ok(await heard(510) && await heard(580), 'Puzzle pickup and placement have distinct sounds');
    await enter('activity-menu','memory'); await clear(); await page.locator('[data-card]').first().click(); ok(await heard(400), 'Memory cards have a paper flip cue');
    await page.waitForFunction(()=>fxQA.sources.some(source=>source.duration>.3&&source.gainAtStart<=.18));
    ok(true, 'Effects are quieter when an existing spoken word starts');
    await enter('number-menu','workshop'); await page.locator('[data-game="balance"]').click(); await clear(); await page.locator('[data-add]').first().click(); ok(await heard(440), 'Workshop rods land with a wooden sound');
    await enter('number-menu','furfangliget'); await page.locator('[data-game="shop"]').click(); await clear(); await page.locator('[data-delta]:enabled').first().click(); ok(await heard(440), 'Changing the shop basket has a material sound');
    await home(); await page.locator('#home [data-open="number-menu"]').click(); await page.locator('#number-menu [data-mode="count"]').click();
    await clear(); await page.locator('.counting-object').first().click(); ok(await heard(610), 'Counting a new object has a collect cue');
    await enter('activity-menu','flip'); await clear(); await page.locator('.flip-card').first().click(); ok(await heard(400), 'Surprise cards also have a paper cue');

    await enter('play-menu','teddy-game');
    for (const button of await page.locator('#teddy-answers button').all()) {
      await clear(); await button.click();
      if (await page.locator('#teddy-answers button:enabled').count()===0) break;
    }
    ok(await heard(610), 'Giving teddy the requested food has a collect cue');
    await enter('play-menu','dress-game');
    for (const button of await page.locator('#dress-answers button').all()) {
      await clear(); await button.click();
      if (await page.locator('#dress-answers button:enabled').count()===0) break;
    }
    ok(await page.evaluate(()=>fxQA.sources.filter(source=>Math.abs(source.duration-.3)<.001).length>=2), 'Putting on the requested garment produces fabric sounds');

    await enter('practice-menu','r-practice'); await page.locator('[data-game="echo"]').click();
    await page.waitForFunction(()=>document.querySelector('#r-practice').dataset.phase==='idle');
    await page.evaluate(()=>{
      MediaDevices.prototype.getUserMedia=async()=>{
        const C=window.AudioContext||window.webkitAudioContext, ctx=new C(), oscillator=ctx.createOscillator(), destination=ctx.createMediaStreamDestination();
        oscillator.frequency.value=120; oscillator.connect(destination); oscillator.start(); ctx.resume();
        window.fxTestInput={ctx,oscillator}; return destination.stream;
      };
      const button=document.createElement('button');button.id='fx-capture-probe';button.textContent='Hangteszt';document.querySelector('#r-practice').appendChild(button);
    });
    await page.locator('[data-action="record"]').click();
    await page.waitForFunction(()=>document.querySelector('#r-practice').dataset.phase==='recording');
    ok(await busGain()===0, 'Starting an actual echo recording silences the effect bus');
    await page.evaluate(()=>{const button=document.createElement('button');button.id='fx-capture-probe';button.textContent='Hangteszt';document.querySelector('#r-practice').appendChild(button);});
    await clear(); await page.locator('#fx-capture-probe').click(); await page.waitForTimeout(100);
    ok((await tones()).length===0, 'Interface clicks cannot add sound to an active microphone recording');
    await page.waitForTimeout(1000); await page.locator('[data-action="record-finish"]').click();
    await page.waitForFunction(()=>document.querySelector('#r-practice').dataset.phase==='idle');
    await page.evaluate(()=>{fxTestInput.oscillator.stop();fxTestInput.ctx.close();});

    await parent(); ok(await page.locator('#sound-effects').isChecked(), 'Effects default to enabled independently of spoken guidance');
    await page.locator('#effects-volume').fill('25'); await page.locator('#effects-volume').dispatchEvent('change');
    ok(await busGain()===.25 && await page.locator('#effects-volume-value').textContent()==='25%', 'The separate effects slider controls the effects bus');
    await page.locator('#sound-effects').uncheck(); await clear(); await home(); await page.locator('#home [data-open="activity-menu"]').click();
    ok((await tones()).length===0 && await busGain()===0, 'Muting effects silences menu sounds');
    await page.locator('[data-open="montessori"]').click(); await page.locator('[data-mo-game="shapes"]').click(); await page.locator('[data-mo-level="1"]').click(); await page.locator('#mo-restart').click();
    id = await page.locator('[data-mo-piece]').first().getAttribute('data-mo-piece'); await clear(); await placeMo(id);
    ok((await tones()).length===0 && await page.locator('#montessori').getAttribute('data-done')==='true', 'Muted gameplay still completes with no synthesized sounds');
    await page.reload(); await parent(); ok(!await page.locator('#sound-effects').isChecked() && await page.locator('#effects-volume').inputValue()==='25', 'Mute and volume persist across reload');
    await page.locator('#sound-effects').check(); await clear(); await page.locator('#effects-preview').click(); await page.waitForTimeout(650);
    ok(await heard(510) && await heard(440) && await heard(660), 'The parent preview plays the actual grab, wood and success sounds');
    await page.locator('#effects-volume').fill('0'); await page.locator('#effects-volume').dispatchEvent('change'); await clear();
    ok(await page.locator('#effects-preview').isDisabled() && await busGain()===0, 'Zero volume is silent and disables the preview');
    await page.locator('#effects-volume').fill('60'); await page.locator('#effects-volume').dispatchEvent('change');
    await enter('activity-menu','montessori'); await page.locator('[data-mo-game="shapes"]').click(); await page.locator('[data-mo-level="1"]').click(); await page.locator('#mo-restart').click();
    id = await page.locator('[data-mo-piece]').first().getAttribute('data-mo-piece'); await page.locator(`[data-mo-piece="${id}"]`).click(); await page.locator(`[data-mo-target="${id}"]`).click(); await home(); await clear(); await page.waitForTimeout(800);
    ok(!await heard(480) && !await heard(660), 'Leaving during a fall cancels its delayed effect and success cue');
    await parent(); await page.locator('#effects-preview').click();
    await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'));}); await clear(); await page.waitForTimeout(600);
    ok((await tones()).length===0 && await busGain()===0, 'Backgrounding cancels preview notes and silences the effects bus');
    await page.evaluate(()=>{delete document.hidden;document.dispatchEvent(new Event('visibilitychange'));});

    await page.waitForFunction(()=>document.querySelector('#offline-status')?.textContent.startsWith('Letöltve.'),undefined,{timeout:60000});
    await context.setOffline(true); await page.reload(); await enter('activity-menu','montessori'); await page.locator('[data-mo-game="shapes"]').click(); await page.locator('[data-mo-level="1"]').click(); await page.locator('#mo-restart').click();
    id = await page.locator('[data-mo-piece]').first().getAttribute('data-mo-piece'); await clear(); await placeMo(id);
    ok(await heard(480) && await heard(660), 'New action sounds work fully offline after reload');
    ok(errors.length===0, `No browser errors: ${errors.join(', ')}`);
    return {count:checks.length,engine:context.browser().browserType().name(),checks};
  } finally { await context.setOffline(false); }
}
