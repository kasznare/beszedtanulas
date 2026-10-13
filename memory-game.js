import { buildMemoryDeck, MEMORY_TIMING_KEY, normalizeMemoryTiming } from './memory-data.js';
import { wordPicture } from './word-art.js';

export function setupMemoryGame({ effect = () => {}, getOptions, playWord, speak, stopPlayback, onComplete, setPairs, onRestart = () => {} }) {
  const root = document.querySelector('#memory');
  let active = false, deck = [], open = [], matched = new Set(), preview = false, busy = false, finished = false;
  let generation = 0, timer;
  let timing;
  try { timing = normalizeMemoryTiming(JSON.parse(window.localStorage.getItem(MEMORY_TIMING_KEY))); }
  catch { timing = normalizeMemoryTiming(); }
  function saveTiming() { try { window.localStorage.setItem(MEMORY_TIMING_KEY, JSON.stringify(timing)); } catch {} }
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
      <div class="memory-timing"><label>Második pillantás <select id="memory-mismatch">${[[1100,'Rövid'],[2000,'Közepes'],[3500,'Hosszú']].map(([ms,label]) => `<option value="${ms}" ${timing.mismatchMs === ms ? 'selected' : ''}>${label}</option>`).join('')}</select></label><label>Képek megjegyzése <select id="memory-preview">${[[3500,'Rövid'],[7000,'Hosszú'],[0,'Amíg folytatom']].map(([ms,label]) => `<option value="${ms}" ${timing.previewMs === ms ? 'selected' : ''}>${label}</option>`).join('')}</select></label></div>
      <div class="memory-progress" role="status">${matched.size} / ${deck.length / 2} pár megvan <span aria-hidden="true">${'🌼'.repeat(matched.size)}</span></div>
      <div class="memory-board" style="--memory-cols:${deck.length <= 6 ? 2 : 3}" role="group" aria-label="Képes memóriakártyák">${deck.map((card, i) => {
        const found = matched.has(card.word.id), revealed = found || preview || open.includes(card.key);
        return `<button class="memory-card ${revealed ? 'is-open' : ''} ${found ? 'is-matched' : ''}" data-card="${card.key}" aria-label="${i + 1}. kártya, ${revealed ? card.word.label + (found ? ', a párja megvan' : '') : 'lefordítva'}" aria-pressed="${revealed}" ${found || busy || preview || finished ? 'disabled' : ''}><span class="memory-card-back" aria-hidden="true">✿</span><span class="memory-card-face" aria-hidden="true">${wordPicture(card.word)}<small>${found ? '✓' : ''}</small></span></button>`;
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
    for (const [id, field] of [['memory-mismatch','mismatchMs'], ['memory-preview','previewMs']]) root.querySelector(`#${id}`).addEventListener('change', event => {
      timing = normalizeMemoryTiming({ ...timing, [field]: Number(event.target.value) }); saveTiming();
      if (field === 'previewMs' && preview && timing.previewMs === 0) clearTimeout(timer);
      if (field === 'previewMs' && preview && timing.previewMs) schedule(() => { preview = false; render(); root.querySelector('#memory-hint').focus(); }, timing.previewMs);
    });
    if (focusKey) root.querySelector(`[data-card="${focusKey}"]`)?.focus({ preventScroll: true });
  }
  function start() {
    onRestart();
    cancel(); active = true; finished = false; open = []; matched = new Set();
    const options = getOptions(); deck = buildMemoryDeck(options.words, options.memoryPairs);
    render(); root.querySelector('h2').focus({ preventScroll: true }); say('memory_start');
  }
  function flip(key) {
    if (!active || busy || preview || finished || document.hidden || open.includes(key)) return;
    const card = deck.find(c => c.key === key);
    if (!card || matched.has(card.word.id)) return;
    effect('card'); open.push(key); playWord(card.word, { target: `.memory-card[data-card="${key}"] .memory-card-face` }); render(key);
    if (open.length !== 2) return;
    const first = deck.find(c => c.key === open[0]);
    if (first.word.id === card.word.id) {
      effect('collect'); matched.add(card.word.id); open = []; render();
      root.querySelector('#memory-status').textContent = 'Egyforma képek! Megvan egy pár.';
      if (matched.size === deck.length / 2) {
        finished = true; render(); root.querySelector('#memory-restart').focus({ preventScroll: true }); say('memory_done'); onComplete(matched.size);
      } else root.querySelector('[data-card]:not(:disabled)')?.focus({ preventScroll: true });
    } else {
      busy = true; render(key);
      const firstKey = first.key;
      schedule(() => { open = []; busy = false; render(firstKey); }, timing.mismatchMs);
    }
  }
  function hint() {
    if (!active || busy || finished || document.hidden) return;
    if (preview) { cancel(); open = []; render(); root.querySelector('#memory-hint').focus(); return; }
    open = []; preview = true; render(); say('memory_hint');
    root.querySelector('#memory-hint').focus();
    if (timing.previewMs) schedule(() => { preview = false; render(); root.querySelector('#memory-hint').focus(); }, timing.previewMs);
  }
  function stop() { active = false; cancel(); open = []; }
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && active) {
      cancel(); open = [];
    } else if (active) render();
  });
  return { start, stop, repeat() { say(preview ? 'memory_hint' : finished ? 'memory_done' : 'memory_start'); } };
}
