// Run with playwright-cli run-code --filename in a disposable browser session.
// A separate context owns all test progress; personal storage is never cleared.
async page => {
  const context = await page.context().browser().newContext({ serviceWorkers: 'block', viewport: { width: 1194, height: 834 } });
  const checks = [], screens = [], errors = [];
  let testedMarks = 0;
  const ok = (value, message) => { if (!value) throw Error(message); checks.push(message); };
  const p = await context.newPage();
  p.on('pageerror', error => errors.push(error.message));
  await context.route('https://cdn.jsdelivr.net/**', route => route.fulfill({ contentType: 'text/javascript', body: '' }));
  await context.addInitScript(() => {
    localStorage.setItem('speech_game_progress_v1', JSON.stringify({ settings: { spokenGuidance: false }, supabase: { syncPaused: true } }));
    window.calmSamples = [];
    window.calmViolations = [];
    window.calmActive = false;
    window.calmEndedAt = 0;
    const sample = () => {
      for (const node of document.querySelectorAll('.is-narrated')) {
        const style = getComputedStyle(node), teddy = node.matches('.teddy-illustration') && !matchMedia('(prefers-reduced-motion:reduce)').matches;
        const entry = { clip: node.dataset.narrationClip, motion: node.dataset.narrationMotion, screen: document.body.dataset.screen, animation: style.animationName, outline: style.outlineColor, width: style.outlineWidth, teddy };
        if (entry.animation !== 'none' || (teddy ? style.outlineStyle !== 'none' : entry.outline !== 'rgb(120, 149, 127)' || entry.width !== '2px')) window.calmViolations.push(entry);
        if (!window.calmSamples.some(old => old.clip === entry.clip && old.motion === entry.motion && old.screen === entry.screen)) window.calmSamples.push(entry);
      }
      if (window.calmActive) requestAnimationFrame(sample);
    };
    document.addEventListener('narrationstart', () => { window.calmActive = true; requestAnimationFrame(sample); });
    document.addEventListener('narrationend', () => { window.calmActive = false; window.calmEndedAt = performance.now(); });
  });
  try {
    await p.emulateMedia({ reducedMotion: 'no-preference' });
    await p.goto(page.url());
    await p.waitForFunction(() => document.body.dataset.screen === 'home');
    const at = id => p.waitForFunction(value => document.body.dataset.screen === value, id);
    const home = async () => { if (await p.locator('body').getAttribute('data-screen') !== 'home') { await p.locator('#home-button').click(); await at('home'); } };
    const group = async id => { await home(); await p.locator(`#home [data-open="${id}"]`).click(); await at(id); };
    const enter = async (id, mode = 'count') => {
      const parent = await p.evaluate(async id => (await import('./navigation.js')).parentScreen(id), id);
      await group(parent);
      await p.locator(id === 'numbers' ? `#number-menu [data-mode="${mode}"]` : `#${parent} [data-open="${id}"]`).click();
      await at(id);
    };
    const quiet = async () => {
      if (await p.locator('#r-practice[data-phase="model"]').isVisible()) await p.locator('#r-practice[data-phase="idle"]').waitFor({ timeout: 40000 });
      await p.waitForFunction(() => !window.calmActive && !document.querySelector('.is-narrated') && performance.now() - window.calmEndedAt > 100, undefined, { timeout: 40000 });
    };
    // Exercise the shared class against every visible descendant and motion value,
    // rather than duplicating its CSS in a fixture. Preserve memory's flip transform.
    const sweep = async (id, label = id, motions = ['pulse']) => {
      await quiet();
      await p.mouse.move(0, 0);
      await p.evaluate(async id => {
        await document.fonts.ready;
        await Promise.allSettled([...document.getElementById(id).querySelectorAll('img')].map(image => image.decode()));
        // Finish entry and hover transitions before measuring the narration cue.
        await new Promise(resolve => requestAnimationFrame(resolve));
        await Promise.allSettled(document.getAnimations().filter(animation => Number.isFinite(animation.effect?.getComputedTiming().endTime)).map(animation => animation.finished));
      }, id);
      const result = await p.evaluate(async ({ id, motions }) => {
        const { createNarration } = await import('./narration.js');
        const root = document.getElementById(id), controller = createNarration({ getRoot: () => root, getWords: () => [] });
        const faults = [], counts = [];
        const rect = node => { const r = node.getBoundingClientRect(); return [r.x, r.y, r.width, r.height]; };
        const frame = () => new Promise(resolve => requestAnimationFrame(resolve));
        for (const motion of motions) {
          const layout = [...root.querySelectorAll('button,input,select,img,svg')].filter(node => node.getClientRects().length);
          const before = layout.map(rect);
          const handle = controller.prepare('calm-cascade-test', '', { target: '*', motion });
          handle.start();
          await frame();
          const marked = [...root.querySelectorAll('.is-narrated')]; counts.push(marked.length);
          for (let sample = 0; sample < 3; sample++) {
            await frame();
            for (const node of marked) {
              const s = getComputedStyle(node), teddy = node.matches('.teddy-illustration') && !matchMedia('(prefers-reduced-motion:reduce)').matches;
              if (s.animationName !== 'none' || (teddy ? s.outlineStyle !== 'none' : s.outlineColor !== 'rgb(120, 149, 127)' || s.outlineWidth !== '2px')) faults.push({ node: node.tagName + '.' + (node.getAttribute('class') || ''), motion, animation: s.animationName, outline: s.outline });
            }
          }
          const after = layout.map(rect);
          for (let i = 0; i < before.length; i++) if (before[i].some((n, j) => Math.abs(n - after[i][j]) > .75)) faults.push({ motion, problem: 'Narration changed control/image geometry', node: layout[i].tagName + '.' + layout[i].getAttribute('class'), before: before[i], after: after[i] });
          handle.stop();
        }
        return { counts, faults };
      }, { id, motions });
      ok(result.counts.every(count => count > 0) && !result.faults.length, `${label}: static green narration and stable layout ${JSON.stringify(result.faults.slice(0, 3))}`);
      testedMarks += result.counts.reduce((sum, n) => sum + n, 0); screens.push(label);
    };
    const staticGreen = async (selector, property, expected) => {
      const value = await p.locator(selector).first().evaluate((node, property) => ({ animation: getComputedStyle(node).animationName, colour: getComputedStyle(node)[property] }), property);
      ok(value.animation === 'none' && value.colour === expected, `${selector}: static green ${property} ${JSON.stringify(value)}`);
    };
    const focus = async id => {
      const button = p.locator(`#${id} button:not(:disabled)`).first();
      if (!await button.count()) return;
      await p.keyboard.press('Tab'); await button.focus();
      const state = await button.evaluate(node => { const s = getComputedStyle(node); return { visible: node.matches(':focus-visible'), colour: s.outlineColor, width: parseFloat(s.outlineWidth), style: s.outlineStyle }; });
      const rgb = state.colour.match(/\d+/g)?.map(Number);
      ok(state.visible && state.width >= 2 && state.style !== 'none' && rgb && (rgb[1] > rgb[0] || rgb[2] > rgb[0]), `${id}: keyboard focus remains visible without orange`);
    };
    // The broad CSS sweep uses one short recording so long automatic guides
    // do not dominate it. Reload afterwards before testing original audio.
    await context.route('**/audio/voice/*.mp3', route => route.fulfill({ path: 'audio/voice/number_1.mp3', contentType: 'audio/mpeg' }));
    const groups = await p.evaluate(async () => (await import('./navigation.js')).GROUPS);
    await sweep('home');
    for (const { screen, screens: games } of groups) {
      await group(screen); await sweep(screen);
      for (const game of games) { await enter(game); await sweep(game); await focus(game); }
    }
    await enter('topics'); await p.locator('[data-topic="food"]').click(); await at('cards'); await sweep('cards');
    await enter('numbers', 'quiz'); await sweep('numbers', 'numbers:quiz');
    for (const game of ['shop', 'machine', 'route']) {
      await enter('furfangliget'); await p.locator(`#furfangliget [data-game="${game}"]`).click();
      await sweep('furfangliget', `furfangliget:${game}`, game === 'machine' ? ['pulse', 'input', 'output', 'machine'] : ['pulse']);
    }
    for (const game of ['sort', 'pattern', 'balance']) {
      await enter('workshop'); await p.locator(`#workshop [data-game="${game}"]`).click(); await sweep('workshop', `workshop:${game}`);
    }
    for (const place of ['house', 'garden', 'picnic', 'album']) {
      await enter('meseliget'); await p.locator(`#meadow-${place}`).click(); await sweep('meseliget', `meseliget:${place}`);
    }
    for (const mode of ['explore', 'stars', 'puzzles']) {
      await enter('chess'); await p.locator(`[data-chess-mode="${mode}"]`).click(); await sweep('chess', `chess:${mode}`);
    }
    await context.unroute('**/audio/voice/*.mp3');
    await home(); await p.reload(); await at('home');
    // Real recorded narration still selects the correct input, gear and output.
    await enter('furfangliget'); await p.locator('[data-game="machine"]').click(); await quiet();
    await p.evaluate(() => { window.calmSamples = []; }); await p.locator('[data-example="0"]').click();
    await p.waitForFunction(() => ['input', 'machine', 'output'].every(motion => window.calmSamples.some(sample => sample.screen === 'furfangliget' && sample.motion === motion)), undefined, { timeout: 40000 });
    const machineMotions = await p.evaluate(() => [...new Set(window.calmSamples.map(sample => sample.motion))]);
    ok(machineMotions.includes('input') && machineMotions.includes('output') && machineMotions.includes('machine'), 'Actual machine audio produces all three calm motion variants');
    for (const game of ['hunter', 'post', 'workshop', 'rhyme', 'echo']) {
      await enter('r-practice'); await p.locator(`#r-practice [data-game="${game}"]`).click();
      await sweep('r-practice', `r-practice:${game}`, ['pulse', 'sway']);
      await p.evaluate(() => { window.calmSamples = []; }); await p.locator('#help-button').click();
      await p.waitForFunction(() => window.calmSamples.some(sample => sample.screen === 'r-practice' && sample.clip.startsWith('r_')), undefined, { timeout: 15000 });
      ok(true, `${game}: real R repeat audio keeps its calm cue`);
      if (game === 'echo') {
        await quiet();
        await p.locator('.rp-echo-rings').evaluate(node => node.classList.add('is-active'));
        await staticGreen('.rp-echo-rings.is-active', 'borderTopColor', 'rgb(120, 149, 127)');
        await p.locator('.rp-echo-rings').evaluate(node => node.classList.remove('is-active'));
      }
      if (game === 'post') {
        await quiet(); await p.locator('#r-practice').evaluate(node => node.dataset.phase = 'listening');
        const shadow = await p.locator('.rp-target').evaluate(node => getComputedStyle(node).boxShadow);
        ok(shadow.includes('rgb(120, 149, 127)'), 'R microphone target uses a static green ring');
        await p.locator('#r-practice').evaluate(node => node.dataset.phase = 'idle');
      }
    }
    await enter('memory'); await quiet(); await p.evaluate(() => { window.calmSamples = []; });
    await p.locator('[data-card]').first().click();
    await p.waitForFunction(() => window.calmSamples.some(sample => sample.screen === 'memory'), undefined, { timeout: 15000 });
    ok(true, 'Actual memory picture voice uses the calm cue');
    await enter('puzzle'); await quiet(); await p.evaluate(() => { window.calmSamples = []; });
    await p.locator('#puzzle-hint').click();
    await p.waitForFunction(() => window.calmSamples.some(sample => sample.screen === 'puzzle'), undefined, { timeout: 15000 });
    ok(true, 'Actual puzzle hint voice uses the calm cue');
    await quiet(); await p.locator('[data-piece="0"]').focus(); await p.keyboard.press('Enter');
    await staticGreen('.puzzle-piece.is-selected', 'outlineColor', 'rgb(72, 114, 77)');
    const from = await p.locator('#puzzle [data-piece="0"]').boundingBox(), to = await p.locator('#puzzle [data-slot="0"]').boundingBox();
    await p.mouse.move(from.x + from.width / 2, from.y + from.height / 2); await p.mouse.down();
    await p.mouse.move(to.x + to.width / 2, to.y + to.height / 2, { steps: 12 });
    await staticGreen('.puzzle-drag-preview', 'outlineColor', 'rgb(72, 114, 77)');
    const dropShadow = await p.locator('.puzzle-slot.is-drop-target').evaluate(node => getComputedStyle(node).boxShadow);
    ok(dropShadow.includes('rgb(72, 114, 77)'), 'Actual puzzle drop target uses a static green inset');
    await p.mouse.up();
    await enter('animal-book'); await p.locator('#abk-animal-cow').click();
    await p.locator('#abk-hotspot-cow.is-playing').waitFor();
    await staticGreen('#abk-hotspot-cow .abk-sound-marker', 'backgroundColor', 'rgb(229, 237, 223)');
    await staticGreen('#abk-hotspot-cow', 'borderTopColor', 'rgb(120, 149, 127)');
    await p.emulateMedia({ reducedMotion: 'reduce' }); await enter('teddy-game');
    await sweep('teddy-game', 'teddy:reduced-motion'); await p.locator('#teddy-replay').click();
    await p.locator('.teddy-illustration.is-narrated').waitFor();
    await staticGreen('.teddy-illustration.is-narrated', 'outlineColor', 'rgb(120, 149, 127)');
    await p.emulateMedia({ reducedMotion: 'no-preference' });
    for (const id of ['imitate', 'two-word']) {
      await enter(id); await quiet();
      await p.locator(`#${id} .${id === 'imitate' ? 'imitate' : 'phrase'}-wrap`).evaluate(node => node.classList.add('is-listening'));
      await staticGreen(`#${id} .listening-indicator .dot`, 'backgroundColor', 'rgb(128, 171, 139)');
      await p.locator(`#${id} .${id === 'imitate' ? 'imitate' : 'phrase'}-wrap`).evaluate(node => node.classList.remove('is-listening'));
    }
    await home(); await p.locator('#parent-button').click();
    const numbers = (await p.locator('#parent-gate-question').innerText()).match(/\d+/g).map(Number);
    await p.locator('#parent-gate-answers').getByRole('button', { name: String(numbers[0] + numbers[1]), exact: true }).click();
    await at('parent'); await sweep('parent');
    const violations = await p.evaluate(() => window.calmViolations);
    ok(!violations.length, `All actual audio cue samples remain static green ${JSON.stringify(violations.slice(0, 3))}`);
    ok(!errors.length, `No browser script errors ${JSON.stringify(errors)}`);
    return { count: checks.length, screens: screens.length, testedMarks, machineMotions, engine: context.browser().browserType().name(), checks };
  } catch (error) {
    throw Error(`${error.message}; last view: ${screens.at(-1)}, completed checks: ${checks.length}`);
  } finally { await context.close(); }
}
