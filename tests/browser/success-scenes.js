// Playwright CLI run-code helper. Run only in a fresh disposable browser session.
// Real module UIs are mounted with deterministic tasks and immediate mock narration;
// this isolates the inline finished-scene delay from the app's separate reward dialog.
async page => {
  const checks = [], errors = [];
  const ok = (condition, message) => { if (!condition) throw Error(message); checks.push(message); };
  page.on('pageerror', error => errors.push(error.stack || error.message));
  const url = page.url(); await page.goto('about:blank'); await page.goto(url);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.setViewportSize({ width: 932, height: 700 });
  await page.evaluate(async () => {
    const [logic, ld, workshop, wd, meadow, md, r, rd] = await Promise.all([
      import('./logic-game.js'), import('./logic-data.js'), import('./workshop-game.js'), import('./workshop-data.js'),
      import('./meseliget-game.js'), import('./meseliget-data.js'), import('./r-practice-game.js'), import('./r-practice-data.js'),
    ]);
    for (const id of ['furfangliget', 'workshop', 'meseliget', 'r-practice']) document.getElementById(id).id = `qa-original-${id}`;
    for (const panel of document.querySelectorAll('.panel')) panel.hidden = true;
    const fixture = document.createElement('main'); fixture.className = 'app';
    fixture.innerHTML = '<section id="furfangliget" class="panel logic-panel is-active" hidden></section><section id="workshop" class="panel workshop-panel is-active" hidden></section><section id="meseliget" class="panel meadow-panel is-active" hidden></section><section id="r-practice" class="panel r-practice-panel is-active" hidden></section>';
    document.body.append(fixture);
    rd.saveRPreferences(localStorage, { roundLength: 3, speechMode: 'together' });
    const qa = window.successScenes = {
      voice: [], updates: [], hidden: false,
      lp: ld.normalizeLogic(), wp: wd.normalizeWorkshop(), mp: md.normalizeMeadow(), rp: rd.normalizeRProgress(),
      options: { machineLevel: 1, shopLevel: 1, routeLevel: 1, mathLimit: 5, routeView: 'map', workshopLevel: 1, numberLimit: 3, roundLength: 1 },
    };
    const speak = name => ids => {
      for (const clip of [ids].flat(Infinity)) qa.voice.push({ name, id: typeof clip === 'string' ? clip : clip.id, at: performance.now() });
      return Promise.resolve(true);
    };
    const update = (name, key) => (progress, reward = false) => { qa[key] = structuredClone(progress); qa.updates.push({ name, reward, at: performance.now() }); };
    qa.api = {
      logic: logic.setupLogic({ getProgress: () => qa.lp, updateProgress: update('logic', 'lp'), getOptions: () => qa.options, speak: speak('logic'), stopPlayback() {} }),
      workshop: workshop.setupWorkshop({ getProgress: () => qa.wp, updateProgress: update('workshop', 'wp'), getOptions: () => qa.options, speak: speak('workshop'), stopPlayback() {} }),
      meadow: meadow.setupMeadow({ getProgress: () => qa.mp, updateProgress: update('meadow', 'mp'), getOptions: () => qa.options, speak: speak('meadow'), stopPlayback() {}, openScreen() { qa.api.meadow.stop(); } }),
      r: r.setupRPractice({ getProgress: () => qa.rp, updateProgress: update('r', 'rp'), speak: speak('r'), stopPlayback() {}, listen: async () => ({ matched: true }) }),
    };
    const ids = { logic: 'furfangliget', workshop: 'workshop', meadow: 'meseliget', r: 'r-practice' };
    qa.open = name => {
      for (const [key, api] of Object.entries(qa.api)) { api.stop(); document.getElementById(ids[key]).hidden = key !== name; }
      qa.api[name].start();
    };
    qa.logicTask = kind => {
      qa.options[`${kind}Level`] = 1; qa.lp = ld.normalizeLogic(); qa.lp.sessions[kind] = ld.newSession(kind, 1, 5, 4);
      const task = ld.generateTask(kind, 1, 5, 4);
      qa.logicSolution = kind === 'machine' ? { program: task.program, values: task.questions.map(n => ld.applyRule(n, task.program)) } : kind === 'shop' ? task.orders : ld.routeSolution(task);
      qa.open('logic');
    };
    qa.workshopTask = () => {
      qa.wp = wd.normalizeWorkshop(); qa.wp.sessions.balance[0] = wd.newWorkshopSession('balance', 1, 4);
      qa.rods = wd.workshopBalanceSolutions(wd.generateWorkshopTask('balance', 1, 4))[0]; qa.open('workshop');
    };
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => qa.hidden });
    Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => qa.hidden ? 'hidden' : 'visible' });
    qa.setHidden = hidden => { qa.hidden = hidden; document.dispatchEvent(new Event('visibilitychange')); };
  });
  const snapshot = () => page.evaluate(() => ({ lp: successScenes.lp, wp: successScenes.wp, mp: successScenes.mp, rp: successScenes.rp, updates: successScenes.updates, voice: successScenes.voice }));
  const rewards = (state, name) => state.updates.filter(update => update.name === name && update.reward).length;
  const narration = (state, id) => state.voice.filter(clip => clip.id === id).length;
  const checkQuietInterval = async (root, ending, message) => {
    ok(await page.locator(`${root}[data-success-pending="true"]`).count() === 1 && await page.locator(ending).count() === 0, `${message}: prepared scene remains immediately`);
    await page.waitForTimeout(650);
    ok(await page.locator(ending).count() === 0, `${message}: celebration is still absent before one visible second`);
    await page.waitForFunction(selector => document.querySelector(selector), ending);
    ok(await page.locator(`${root}[data-success-pending="false"]`).count() === 1, `${message}: ending appears after the delay`);
  };
  const fillAmounts = async values => {
    for (const [index, value] of values.entries()) { await page.locator(`#logic-value-${index}`).fill(String(value)); await page.locator(`#logic-value-${index}`).press('Tab'); }
  };
  const enterMachine = async () => {
    await page.evaluate(() => successScenes.logicTask('machine')); await page.locator('#furfangliget [data-game="machine"]').click();
    const solution = await page.evaluate(() => successScenes.logicSolution);
    for (const op of solution.program) await page.locator(`[data-op="${op}"]`).click();
    await fillAmounts(solution.values);
  };
  await enterMachine();
  const machineBefore = await snapshot();
  await page.locator('#logic-check').evaluate(button => { button.click(); button.click(); });
  ok(rewards(await snapshot(), 'logic') === rewards(machineBefore, 'logic') + 1 && (await snapshot()).lp.sessions.machine.done, 'Logic: progress and exactly one reward are immediate');
  ok(await page.locator('#logic-value-0').isDisabled() && await page.locator('#logic-undo').isDisabled(), 'Logic: completed machine cannot be edited during the delay');
  ok(narration(await snapshot(), 'logic_machine_done') === 0, 'Logic: final narration has not started early');
  await checkQuietInterval('#furfangliget', '#logic-next', 'Logic machine');
  ok(narration(await snapshot(), 'logic_machine_done') === 1, 'Logic: final narration starts once');

  await enterMachine(); await page.locator('#logic-check').click();
  const configBefore = narration(await snapshot(), 'logic_machine_done');
  await page.locator('#logic-level').selectOption('2'); await page.waitForTimeout(1100);
  ok(await page.locator('#furfangliget[data-level="2"] #logic-check').count() === 1 && await page.locator('#logic-next').count() === 0 && narration(await snapshot(), 'logic_machine_done') === configBefore, 'Logic: a new difficulty cancels the old ending and narration');

  await page.evaluate(() => successScenes.logicTask('shop')); await page.locator('#furfangliget [data-game="shop"]').click();
  const orders = await page.evaluate(() => successScenes.logicSolution), shopBefore = rewards(await snapshot(), 'logic');
  await fillAmounts(orders[0]); await page.locator('#logic-check').click();
  await page.waitForFunction(() => successScenes.lp.sessions.shop.stage === 1);
  ok(rewards(await snapshot(), 'logic') === shopBefore, 'Shop: first order remains an ordinary intermediate transition');
  await fillAmounts(orders[1]); await page.locator('#logic-check').click();
  ok(rewards(await snapshot(), 'logic') === shopBefore + 1 && (await snapshot()).lp.sessions.shop.done, 'Shop: final order is saved before its delivery/ending interval');
  await checkQuietInterval('#furfangliget', '#logic-next', 'Final shop order');

  await page.evaluate(() => successScenes.logicTask('route')); await page.locator('#furfangliget [data-game="route"]').click();
  for (const cell of (await page.evaluate(() => successScenes.logicSolution)).slice(1)) await page.locator(`[data-cell="${cell}"]`).click();
  await page.locator('#logic-check').click(); await page.waitForFunction(() => successScenes.lp.sessions.route.done);
  ok(await page.locator('.logic-traveller').count() === 1, 'Route: the fox stays on the completed map during its ending interval');
  await checkQuietInterval('#furfangliget', '#logic-next', 'Completed route');

  const enterBalance = async () => {
    await page.evaluate(() => successScenes.workshopTask()); await page.locator('#workshop [data-game="balance"]').click();
    for (const rod of await page.evaluate(() => successScenes.rods)) await page.locator(`[data-add="${rod}"]`).click();
  };
  await enterBalance();
  const workshopBefore = rewards(await snapshot(), 'workshop');
  await page.locator('#ws-check').evaluate(button => { button.click(); button.click(); });
  ok((await snapshot()).wp.sessions.balance[0].done && rewards(await snapshot(), 'workshop') === workshopBefore + 1, 'Workshop: exactly one saved completion and reward before celebration');
  ok(await page.locator('[data-take]').first().isDisabled(), 'Workshop: the balanced rods are locked while still visible');
  await checkQuietInterval('#workshop', '.ws-celebration', 'Balanced rods');
  await enterBalance(); await page.locator('#ws-check').click();
  const leaveBefore = narration(await snapshot(), 'workshop_balance_done'); await page.locator('#ws-back').click();
  await page.locator('#workshop [data-game="pattern"]').click(); await page.waitForTimeout(1100);
  ok(await page.locator('.ws-celebration').count() === 0 && narration(await snapshot(), 'workshop_balance_done') === leaveBefore, 'Workshop: leave plus another task cancels late celebration and narration');

  await page.evaluate(() => { successScenes.mp = { version: 1, journeys: 0, collect: { independent: 0, assisted: 0 }, serve: { independent: 0, assisted: 0 }, adventure: null }; successScenes.open('meadow'); });
  await page.locator('#meadow-varied').click(); await page.locator('#meadow-garden').click();
  await page.locator('#meadow-check').click();
  ok(await page.locator('#meseliget[data-success-pending="true"]').count() === 0 && (await page.locator('#meadow-status').innerText()).includes('Még kell'), 'Meadow: an incorrect count keeps its immediate gentle feedback');
  for (const apple of [0, 1, 2]) await page.locator(`[data-apple="${apple}"]`).click();
  const meadowBefore = rewards(await snapshot(), 'meadow'); await page.locator('#meadow-check').evaluate(button => { button.click(); button.click(); });
  ok(rewards(await snapshot(), 'meadow') === meadowBefore + 1 && (await snapshot()).mp.collect.assisted === 1, 'Meadow: one complete basket is recorded immediately');
  ok(await page.locator('.meadow-basket [data-apple]').count() === 3 && await page.locator('#meadow-next').isHidden(), 'Meadow: the completed basket is visible before the next action');
  await page.waitForTimeout(200); await page.evaluate(() => successScenes.setHidden(true)); await page.waitForTimeout(1100);
  ok(await page.locator('#meadow-next').isHidden(), 'Meadow: hidden time does not consume the viewing interval');
  await page.evaluate(() => successScenes.setHidden(false)); await page.waitForTimeout(500);
  ok(await page.locator('#meadow-next').isHidden(), 'Meadow: the remaining visible time is preserved after returning');
  await page.locator('#meadow-next').waitFor({ state: 'visible' });
  ok(narration(await snapshot(), 'mese_collected_3') === 1, 'Meadow: completion narration plays once after visible time');
  await page.locator('#meadow-next').click(); ok(await page.locator('.meadow-ending').count() === 1, 'Meadow: final card opens from the already delayed finished task');

  await page.evaluate(() => successScenes.open('meadow')); await page.locator('#meadow-picnic').click();
  for (const guest of [0, 1, 2]) await page.locator(`[data-guest="${guest}"]`).click();
  await page.locator('#meadow-check').click(); const dialogBefore = narration(await snapshot(), 'mese_served');
  await page.evaluate(() => document.querySelector('#parent-gate').showModal()); await page.waitForTimeout(1100);
  ok(narration(await snapshot(), 'mese_served') === dialogBefore && await page.locator('#meadow-next').isVisible(), 'Meadow: ending may render behind the adult dialog but narration does not start');
  await page.evaluate(() => document.querySelector('#parent-gate').close());

  const enterR = async game => { await page.evaluate(() => successScenes.open('r')); await page.locator(`#r-practice [data-game="${game}"]`).click(); await page.waitForFunction(() => document.querySelector('#r-practice').dataset.phase === 'idle'); };
  const finishSpeech = async count => { for (let i = 0; i < count; i++) { await page.locator('#r-practice [data-action="advance"]').click(); await page.waitForFunction(() => document.querySelector('#r-practice').dataset.phase === 'idle'); } };
  await enterR('post'); const postBefore = (await snapshot()).rp.games.post.rounds; await finishSpeech(3);
  ok((await snapshot()).rp.games.post.rounds === postBefore + 1 && await page.locator('.rp-parcel').count() === 3, 'R post: complete parcel scene and round count are immediate');
  ok(await page.locator('#r-practice [data-action="advance"]').isDisabled(), 'R post: the completed round cannot advance again');
  await checkQuietInterval('#r-practice', '.rp-finish', 'R parcel round');
  await enterR('post'); await finishSpeech(3); await page.waitForTimeout(200);
  await page.evaluate(() => successScenes.setHidden(true)); await page.waitForTimeout(1100);
  ok(await page.locator('.rp-finish').count() === 0, 'R post: hidden time pauses the final scene interval');
  await page.evaluate(() => { successScenes.setHidden(false); document.querySelector('#parent-gate').showModal(); }); await page.waitForTimeout(500);
  ok(await page.locator('.rp-finish').count() === 0, 'R post: return preserves the remaining viewing time');
  await page.locator('.rp-finish').waitFor({ state: 'visible' });
  ok(!(await page.locator('#rp-status').innerText()).includes('megállt'), 'R post: the resumed final card has no stale stopped message');
  await page.evaluate(() => document.querySelector('#parent-gate').close());
  await enterR('post'); await finishSpeech(3); const restartBefore = narration(await snapshot(), 'r_round_done');
  await page.locator('#r-practice [data-action="restart"]').click(); await page.waitForTimeout(1100);
  ok(await page.locator('.rp-finish').count() === 0 && narration(await snapshot(), 'r_round_done') === restartBefore, 'R post: restart cancels the old card and final voice');
  await enterR('workshop'); await finishSpeech(3);
  ok(await page.locator('.rp-decoration.is-decorated').count() === 3, 'R workshop: all final decorations remain visible');
  await checkQuietInterval('#r-practice', '.rp-finish', 'R decorated workshop');
  await enterR('rhyme'); await finishSpeech(4);
  ok(await page.locator('.rp-rhyme-line.is-practiced').count() === 4 && await page.locator('[data-line="3"]').isDisabled(), 'R rhyme: all practiced lines remain visible and locked');
  await checkQuietInterval('#r-practice', '.rp-rhyme-complete', 'R complete rhyme');
  await enterR('hunter');
  for (let i = 0; i < 3; i++) {
    const id = await page.evaluate(() => successScenes.voice.filter(clip => clip.name === 'r' && clip.id.startsWith('r_word_')).at(-1).id.replace('r_word_', ''));
    await page.locator(`[data-choice="${id}"]`).click(); await page.waitForFunction(() => document.querySelector('#r-practice').dataset.phase === 'idle');
    await page.locator('[data-action="hunter-next"]').click(); await page.waitForFunction(() => document.querySelector('#r-practice').dataset.phase === 'idle');
  }
  ok(await page.locator('.rp-option.is-found').count() === 1, 'R hunter: the final found picture stays visible');
  await checkQuietInterval('#r-practice', '.rp-finish', 'R hunter round');
  ok(errors.length === 0, `Inline completion flows have no browser errors: ${errors.join('; ')}`);
  await page.evaluate(() => { for (const api of Object.values(successScenes.api)) api.stop(); });
  return { count: checks.length, checks };
}
