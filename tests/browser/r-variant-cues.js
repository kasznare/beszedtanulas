// Run with playwright-cli run-code --filename in a disposable browser session.
// A fresh context mounts the real R UI with deterministic words and mock narration.
async parent => {
  const context = await parent.context().browser().newContext({ serviceWorkers: 'block' });
  const page = await context.newPage();
  const checks = [];
  const ok = (condition, label) => { if (!condition) throw Error(label); checks.push(label); };
  try {
    await page.goto(parent.url());
    await page.evaluate(async () => {
      const [{ setupRPractice }, data] = await Promise.all([
        import('./r-practice-game.js'), import('./r-practice-data.js'),
      ]);
      document.querySelector('#r-practice').id = 'r-practice-original';
      const fixture = document.createElement('section');
      fixture.id = 'r-practice';
      fixture.className = 'panel r-practice-panel is-active';
      document.body.append(fixture);
      data.saveRPreferences(localStorage, {
        ...data.normalizeRPreferences(), position: 'final', target: 'phrase',
        speechMode: 'together', roundLength: 3,
      });
      Math.random = () => 0;
      const qa = window.rVariantCueQA = { voices: [], progress: data.normalizeRProgress() };
      qa.api = setupRPractice({
        getProgress: () => qa.progress,
        updateProgress: progress => { qa.progress = progress; },
        speak: async (id, cue) => { qa.voices.push({ id, target: cue?.target }); return true; },
        stopPlayback() {},
        listen: async () => ({ matched: true }),
      });
      qa.api.start();
    });
    const idle = () => page.locator('#r-practice[data-phase="idle"]').waitFor();
    const lastVoice = () => page.evaluate(() => rVariantCueQA.voices.at(-1));

    await page.locator('#r-practice [data-game="post"]').click();
    await idle();
    await page.locator('#r-practice [data-action="advance"]').click();
    await idle();
    await page.locator('#r-practice [data-deliver="fox"]').click();
    await idle();
    const post = await lastVoice();
    ok(post.id.startsWith('r_variant_') && post.target === '.rp-target',
      `Post advance highlights the new phrase target: ${JSON.stringify(post)}`);

    await page.evaluate(() => rVariantCueQA.api.start());
    await page.locator('#r-practice [data-game="workshop"]').click();
    await idle();
    await page.locator('#r-practice [data-action="advance"]').click();
    await idle();
    await page.locator('#r-practice [data-decoration="flower"]').click();
    await page.locator('#r-practice [data-place="0"]').click();
    await idle();
    const workshop = await lastVoice();
    ok(workshop.id.startsWith('r_variant_') && workshop.target === '.rp-target',
      `Workshop advance highlights the new phrase target: ${JSON.stringify(workshop)}`);
    return { count: checks.length, checks };
  } finally {
    await context.close();
  }
}
