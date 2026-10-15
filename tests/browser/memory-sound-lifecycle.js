// Run in a disposable playwright-cli session after opening the local portal.
async page => {
  if (await page.locator('#home-button').isVisible()) await page.locator('#home-button').click();
  return page.evaluate(async () => {
    const { setupMemoryGame } = await import(`/memory-game.js?test=${Date.now()}`);
    const root = document.querySelector('#memory');
    root.replaceChildren();
    let completed = 0, guideId;
    const pending = [];
    const game = setupMemoryGame({
      getOptions: () => ({ words: [{ id: 'alma', label: 'alma', emoji: '🍎' }, { id: 'viz', label: 'víz', emoji: '💧' }], memoryPairs: 2 }),
      playWord: () => new Promise(resolve => pending.push(resolve)),
      speak: id => { guideId = id; return Promise.resolve(); },
      stopPlayback: () => {},
      setPairs: () => {},
      onComplete: (count, context) => { if (count !== 2 || context.mode !== 'sound') throw Error('Wrong completion'); completed++; },
    });
    game.start({ mode: 'sound' });
    if (guideId !== 'memory_sound_start') throw Error('Wrong sound-memory guide');
    const soundButtons = () => [...root.querySelectorAll('.memory-sound-card:not(:disabled)')];
    const pictureButtons = () => [...root.querySelectorAll('.memory-picture-card:not(:disabled)')];
    // Discover the first pair by ordinary guesses; no target is exposed by sound-card markup.
    for (const key of pictureButtons().map(button => button.dataset.card)) {
      soundButtons()[0].click();
      root.querySelector(`[data-card="${key}"]`).click();
      if (root.querySelectorAll('.memory-sound-card.is-matched').length) break;
    }
    if (root.querySelectorAll('.memory-sound-card.is-matched').length !== 1) throw Error('First pair did not match');
    // The last action is a sound. Its playback promise remains unresolved.
    pictureButtons()[0].click();
    soundButtons()[0].click();
    if (completed !== 1) throw Error('Final match did not complete immediately');
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => true });
    document.dispatchEvent(new Event('visibilitychange'));
    pending.forEach(resolve => resolve());
    await Promise.resolve();
    delete document.hidden;
    document.dispatchEvent(new Event('visibilitychange'));
    if (completed !== 1) throw Error('Completion was lost or duplicated across visibility change');
    game.stop();
    return { completed };
  });
}
