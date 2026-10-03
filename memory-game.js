import { buildMemoryDeck } from './memory-data.js';

export function setupMemoryGame({ getOptions, playWord, speak, stopPlayback, onComplete, setPairs }) {
  const root = document.querySelector('#memory');
  let active = false, deck = [], open = [], matched = new Set(), preview = false, busy = false, finished = false;
  let generation = 0, timer;
  const say = id => { if (active && !document.hidden) speak(id); };
  const cancel = () => { generation++; clearTimeout(timer); busy = false; preview = false; stopPlayback(); };
  function schedule(fn, delay) {
    const token = generation;
    clearTimeout(timer);
    timer = window.setTimeout(() => { if (active && token === generation && !document.hidden) fn(); }, delay);
  }
  function render(focusKey) {
    root.innerHTML = `<div class="memory-heading"><span class="memory-eyebrow">FIGYELJ · EMLÉKEZZ · TALÁLJ PÁRT</span><h2 tabindex="-1">Képpárok</h2><p>Fordíts fel két kártyát!</p></div>
      <div class="memory-options" role="group" aria-label="Párok száma">${[2, 3, 4, 6].map(n => `<button data-pairs="${n}" aria-pressed="${getOptions().memoryPairs === n}" ${busy ? 'disabled' : ''}>${n} pár</button>`).join('')}</div>
      <div class="memory-progress" role="status">${matched.size} / ${deck.length / 2} pár megvan <span aria-hidden="true">${'🌼'.repeat(matched.size)}</span></div>
      <div class="memory-board" style="--memory-cols:${deck.length <= 6 ? 2 : 3}" role="group" aria-label="Képes memóriakártyák">${deck.map((card, i) => {
        const found = matched.has(card.word.id), revealed = found || preview || open.includes(card.key);
        return `<button class="memory-card ${revealed ? 'is-open' : ''} ${found ? 'is-matched' : ''}" data-card="${card.key}" aria-label="${i + 1}. kártya, ${revealed ? card.word.label + (found ? ', a párja megvan' : '') : 'lefordítva'}" aria-pressed="${revealed}" ${found || busy || preview || finished ? 'disabled' : ''}><span class="memory-card-back" aria-hidden="true">✿</span><span class="memory-card-face" aria-hidden="true"><span>${card.word.emoji}</span><small>${found ? '✓' : ''}</small></span></button>`;
      }).join('')}</div>
      <p id="memory-status" class="memory-status" role="status">${finished ? 'Minden kép megtalálta a párját!' : preview ? 'Jegyezd meg a képek helyét!' : open.length === 2 ? 'Nézd meg a két képet! Próbálhatod újra.' : open.length ? 'Most keresd meg a párját!' : 'Válassz egy kártyát!'}</p>
      <div class="memory-actions"><button id="memory-hint" ${finished || busy ? 'disabled' : ''}>${preview ? 'Folytatom ▶' : '💡 Nézzük meg!'}</button><button id="memory-restart">↻ Új képek</button></div>`;
    root.querySelectorAll('[data-card]').forEach(button => button.addEventListener('click', () => flip(button.dataset.card)));
    root.querySelectorAll('[data-pairs]').forEach(button => button.addEventListener('click', () => {
      if (!active || busy || !setPairs) return;
      setPairs(Number(button.dataset.pairs)); start();
    }));
    root.querySelector('#memory-restart').addEventListener('click', start);
    root.querySelector('#memory-hint').addEventListener('click', hint);
    if (focusKey) root.querySelector(`[data-card="${focusKey}"]`)?.focus({ preventScroll: true });
  }
  function start() {
    cancel(); active = true; finished = false; open = []; matched = new Set();
    const options = getOptions(); deck = buildMemoryDeck(options.words, options.memoryPairs);
    render(); root.querySelector('h2').focus({ preventScroll: true }); say('memory_start');
  }
  function flip(key) {
    if (!active || busy || preview || finished || document.hidden || open.includes(key)) return;
    const card = deck.find(c => c.key === key);
    if (!card || matched.has(card.word.id)) return;
    open.push(key); playWord(card.word); render(key);
    if (open.length !== 2) return;
    const first = deck.find(c => c.key === open[0]);
    if (first.word.id === card.word.id) {
      matched.add(card.word.id); open = []; render();
      root.querySelector('#memory-status').textContent = 'Egyforma képek! Megvan egy pár.';
      if (matched.size === deck.length / 2) {
        finished = true; render(); say('memory_done'); onComplete(matched.size);
      }
    } else {
      busy = true; render(key);
      schedule(() => { open = []; busy = false; render(key); }, 1100);
    }
  }
  function hint() {
    if (!active || busy || finished || document.hidden) return;
    if (preview) { cancel(); open = []; render(); root.querySelector('#memory-hint').focus(); return; }
    open = []; preview = true; render(); say('memory_hint');
    root.querySelector('#memory-hint').focus();
    schedule(() => { preview = false; render(); root.querySelector('#memory-hint').focus(); }, 3500);
  }
  function stop() { active = false; cancel(); open = []; }
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && active) {
      cancel(); open = [];
    } else if (active) render();
  });
  return { start, stop, repeat() { say(preview ? 'memory_hint' : finished ? 'memory_done' : 'memory_start'); } };
}
