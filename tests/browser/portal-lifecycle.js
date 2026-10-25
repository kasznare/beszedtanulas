// Run with playwright-cli run-code --filename tests/browser/portal-lifecycle.js.
// The current page must use the portal server's origin. This only replaces the
// disposable test tab's DOM; it does not read or change saved profiles.
async page => {
  const origin = new URL(page.url()).origin;
  const checks = [];
  const failures = [];
  const check = (condition, label) => {
    (condition ? checks : failures).push(label);
  };
  const fixture = async html => {
    // A same-origin text resource gives us a clean document without app.js.
    await page.goto(`${origin}/number-data.js`);
    await page.setContent(html);
  };

  for (const transition of ['difficulty', 'mode', 'stop']) {
    await fixture('<section id="numbers"></section>');
    const result = await page.evaluate(async transition => {
      const { setupNumberGames } = await import('/number-game.js');
      const { normalizeNumberProgress } = await import('/number-data.js');
      const errors = [];
      const errorHandler = event => { errors.push(String(event.reason)); event.preventDefault(); };
      window.addEventListener('unhandledrejection', errorHandler);
      let progress = normalizeNumberProgress({ sessions: { quiz: {
        mode: 'quiz', limit: 3, length: 3, completed: 0, rewarded: false,
        amount: 1, objectId: 'alma', counted: [], choices: [1, 2, 3],
        solved: false, misses: 0, helped: false,
      } } });
      const options = { numberLimit: 3, roundLength: 3, quizDifficulty: 'close', numberSelf: false, numberLayout: 'rows' };
      let pendingAudio;
      let rewards = 0;
      const stopPlayback = () => { pendingAudio?.(); pendingAudio = null; };
      const game = setupNumberGames({
        getProgress: () => progress,
        setProgress: (value, meta) => { progress = value; if (meta?.reward) rewards++; },
        getOptions: () => options,
        setOptions: value => Object.assign(options, value),
        speak: () => { stopPlayback(); return new Promise(resolve => { pendingAudio = resolve; }); },
        stopPlayback, onComplete() {},
      });
      game.start('quiz');
      document.querySelector('[data-quantity="2"]').click();
      if (transition === 'difficulty') document.querySelector('[data-number-setting="quizDifficulty"][data-value="wide"]').click();
      else if (transition === 'mode') game.start('count');
      else game.stop();
      await new Promise(resolve => setTimeout(resolve, 30));
      const snapshot = {
        errors, rewards, quizSolved: progress.sessions.quiz.solved,
        choices: progress.sessions.quiz.choices,
        counted: progress.sessions.count?.counted.length ?? 0,
      };
      game.stop();
      window.removeEventListener('unhandledrejection', errorHandler);
      return snapshot;
    }, transition);
    check(!result.errors.length, `Number retry survives ${transition} cancellation: ${result.errors.join('; ')}`);
    check(result.rewards === 0 && !result.quizSolved && result.counted === 0, `Cancelled number retry leaves progress untouched (${transition})`);
    if (transition === 'difficulty') check(result.choices.length === 2 && !result.choices.includes(2), 'Difficulty change really removes the old answer button');
  }

  await fixture('<section id="flip"></section>');
  const flip = await page.evaluate(async () => {
    const { setupFlipGame } = await import('/flip-game.js');
    let pendingAudio;
    let completed = 0;
    const stopPlayback = () => { pendingAudio?.(); pendingAudio = null; };
    const game = setupFlipGame({
      getOptions: () => ({ flipMode: 'free', words: [{ id: 'alma', label: 'alma' }, { id: 'viz', label: 'víz' }] }),
      setMode() {}, speak() {}, stopPlayback,
      playWord: () => { stopPlayback(); return new Promise(resolve => { pendingAudio = resolve; }); },
      onComplete: () => { completed++; },
    });
    game.start();
    document.querySelector('[data-flip-index="0"]').click();
    document.querySelector('[data-flip-index="1"]').click();
    await new Promise(resolve => setTimeout(resolve, 20));
    const beforeFinalAudio = completed;
    stopPlayback();
    await new Promise(resolve => setTimeout(resolve, 20));
    const afterFinalAudio = completed;
    game.start();
    document.querySelector('[data-flip-index="0"]').click();
    document.querySelector('[data-flip-index="1"]').click();
    game.stop();
    await new Promise(resolve => setTimeout(resolve, 20));
    return { beforeFinalAudio, afterFinalAudio, afterStop: completed };
  });
  check(flip.beforeFinalAudio === 0, 'Rapid flips do not complete before the final word finishes');
  check(flip.afterFinalAudio === 1, 'Finishing the final word completes the flip round once');
  check(flip.afterStop === 1, 'Leaving during the final flip word cannot finish an abandoned round');

  for (const transition of ['hidden', 'stop', 'restart']) {
    await fixture('<h1 id="screen-title"></h1><section id="listening-game"><div id="listening-answers"></div><div id="listening-progress"></div><p id="listening-status"></p><button id="listening-replay"></button></section>');
    const result = await page.evaluate(async transition => {
      const { setupListeningGame } = await import('/listening-game.js');
      const prompts = [];
      let pendingHelp;
      const stopPlayback = () => { pendingHelp?.(); pendingHelp = null; };
      const game = setupListeningGame({
        getOptions: () => ({ words: [{ id: 'alma', label: 'alma' }, { id: 'viz', label: 'víz' }], length: 3, choiceCount: 2 }),
        setDifficulty() {},
        speak: () => new Promise(resolve => { pendingHelp = resolve; }),
        playPrompt: (word, options) => prompts.push({ id: word.id, hidden: document.hidden, retry: Boolean(options?.retry) }),
        playCorrect() {}, stopPlayback, onComplete() {},
      });
      game.start();
      const target = prompts[0].id;
      const wrong = [...document.querySelectorAll('[data-word]')].find(button => button.dataset.word !== target);
      wrong.click(); wrong.click(); wrong.click();
      const before = prompts.length;
      if (transition === 'hidden') {
        Object.defineProperty(document, 'hidden', { configurable: true, get: () => true });
        document.dispatchEvent(new Event('visibilitychange'));
        // app.js also cancels its audio when the document becomes hidden.
        stopPlayback();
      } else if (transition === 'stop') game.stop();
      else game.start();
      await new Promise(resolve => setTimeout(resolve, 20));
      const after = prompts.slice(before);
      if (transition === 'hidden') delete document.hidden;
      game.stop();
      return after;
    }, transition);
    check(!result.some(prompt => prompt.retry || prompt.hidden), `Listening help cannot restart cancelled audio after ${transition}`);
    check(result.length === (transition === 'restart' ? 1 : 0), `Listening ${transition} produces only its intended prompt`);
  }
  if (failures.length) throw new Error(`Portal lifecycle failures (${failures.length}):\n${failures.join('\n')}`);
  return { count: checks.length, checks };
}
