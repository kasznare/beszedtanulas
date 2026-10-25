// Run in a disposable playwright-cli session after opening the local portal.
async page => {
  if (await page.locator('#home-button').isVisible()) await page.locator('#home-button').click();
  return page.evaluate(async () => {
    const { setupMemoryGame } = await import(`/memory-game.js?test=${Date.now()}`);
    const root = document.querySelector('#memory');
    root.replaceChildren();
    let completed = 0, guideId;
    const pending = [], heard = new Map();
    const storage = { data: new Map(), getItem(key) { return this.data.get(key) ?? null; }, setItem(key, value) { this.data.set(key, value); } };
    const game = setupMemoryGame({
      getOptions: () => ({ words: [], memoryPairs: 2 }),
      playWord: () => Promise.resolve(),
      // Sounds stay unresolved, like a long animal call that is still playing.
      playAnimal: id => { heard.set(document.activeElement?.dataset.card, { id, kind: 'sound' }); return new Promise(resolve => pending.push(resolve)); },
      speak: id => { if (id.startsWith('abk_name_')) heard.set(document.activeElement?.dataset.card, { id: id.slice(9), kind: 'picture' }); else guideId = id; return Promise.resolve(); },
      stopPlayback: () => {}, setPairs: () => {}, storage,
      onComplete: (count, context) => { if (context.mode !== 'sound' || count < 1 || count > 5) throw Error('Wrong completion'); completed++; },
    });
    game.start({ mode: 'sound' });
    if (guideId !== 'memory_sound_start') throw Error('Wrong sound-memory guide');
    const cards = () => [...root.querySelectorAll('.memory-card')];
    if (cards().length !== 6 || cards().some(card => card.classList.contains('is-open'))) throw Error('Sound memory must start with six face-down cards');
    if (cards().some(card => /cow|horse|sheep|dog|cat|chicken|duck|frog|goose|owl|cuckoo|wolf/.test(card.dataset.card + card.getAttribute('aria-label')))) throw Error('Markup names an animal');
    const flipCard = key => { const button = root.querySelector(`[data-card="${key}"]`); button.focus(); button.click(); };
    const waitUnlocked = () => new Promise(resolve => { const check = () => root.querySelector('.memory-card:not(:disabled)') ? resolve() : setTimeout(check, 50); check(); });
    // Learn every card by flipping pairs, then match what was heard.
    const keys = cards().map(card => card.dataset.card);
    for (let i = 0; i + 1 < keys.length; i += 2) {
      flipCard(keys[i]); flipCard(keys[i + 1]);
      if (!root.querySelector(`[data-card="${keys[i + 1]}"]`).classList.contains('is-matched')) await waitUnlocked();
    }
    for (const key of keys) {
      if (completed || root.querySelector(`[data-card="${key}"]`).classList.contains('is-matched')) continue;
      const partner = keys.find(other => other !== key && heard.get(other)?.id === heard.get(key)?.id);
      flipCard(key); flipCard(partner);
      if (!completed && !root.querySelector(`[data-card="${partner}"]`).classList.contains('is-matched')) throw Error('A heard pair did not match');
    }
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
