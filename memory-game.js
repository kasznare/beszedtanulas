import {
  buildMemoryDeck, buildSoundMemoryDeck, isMemoryPair, memoryStars, nextMemoryPairs, nextSoundMemoryLevel,
  normalizeMemoryTiming, normalizeSoundMemoryLevel, MEMORY_TIMING_KEY, SOUND_MEMORY_KEY, SOUND_MEMORY_LEVELS,
} from './memory-data.js';
import { wordPicture } from './word-art.js';
import { setGameTitle, focusGameTitle } from './game-heading.js';

const TITLES = { classic: 'Képpárok', sound: 'Hang–kép párok' };
const KIND_ICONS = { sound: '🔊', name: '💬' };
const KIND_LABELS = { sound: 'állathang', name: 'állatnév' };

export function setupMemoryGame({ effect = () => {}, getOptions, playWord, playAnimal = async () => false, speak, stopPlayback, onComplete, setPairs, onRestart = () => {}, storage = globalThis.localStorage }) {
  const root = document.querySelector('#memory');
  let active = false, deck = [], open = [], matched = new Set(), preview = false, previewUsed = false, busy = false, finished = false;
  let mode = 'classic', mismatches = 0, pairs = 0, soundLevel = 0, generation = 0, flips = 0, timer, timingOpen = false, statusText = '';
  let timing;
  try { timing = normalizeMemoryTiming(JSON.parse(storage?.getItem(MEMORY_TIMING_KEY))); }
  catch { timing = normalizeMemoryTiming(); }
  const saveTiming = () => { try { storage?.setItem(MEMORY_TIMING_KEY, JSON.stringify(timing)); } catch {} };
  const readSoundLevel = () => { try { return normalizeSoundMemoryLevel(JSON.parse(storage?.getItem(SOUND_MEMORY_KEY) ?? 'null')); } catch { return 0; } };
  const saveSoundLevel = () => { try { storage?.setItem(SOUND_MEMORY_KEY, JSON.stringify({ level: soundLevel })); } catch {} };
  const allowed = () => active && !document.hidden;
  const say = id => allowed() ? speak(id) : undefined;
  const cancel = () => { generation++; clearTimeout(timer); busy = false; preview = false; stopPlayback(); };
  function schedule(fn, delay) {
    const token = generation;
    clearTimeout(timer);
    timer = window.setTimeout(() => { if (active && token === generation && !document.hidden) fn(); }, delay);
  }
  const isMatched = card => matched.has(card.key);

  function faceMarkup(card, found) {
    if (found || card.kind === 'picture') return `${wordPicture(card.word)}<small>${found ? '✓' : ''}</small>`;
    return `<span class="memory-kind-icon">${KIND_ICONS[card.kind]}</span>`;
  }
  function cardLabel(card, index, revealed, found) {
    if (!revealed) return `${index + 1}. kártya, lefordítva`;
    if (found) return `${index + 1}. kártya, ${card.word.label}, a párja megvan`;
    return `${index + 1}. kártya, ${card.kind === 'picture' ? card.word.label : KIND_LABELS[card.kind]}`;
  }
  function currentStatus() {
    if (statusText) return statusText;
    if (finished) return mode === 'sound' ? 'Minden hang megtalálta a párját!' : 'Minden kép megtalálta a párját!';
    if (preview) return 'Jegyezd meg a képek helyét!';
    if (open.length === 2) return 'Ez most nem pár. Jegyezd meg, mi hol van!';
    if (open.length) return mode === 'sound' ? 'Hol van a párja?' : 'Most keresd meg a párját!';
    return 'Válassz egy kártyát!';
  }
  function render(focusKey) {
    setGameTitle(root, TITLES[mode]);
    const found = matched.size / 2;
    const hintButton = mode === 'classic' ? `<button type="button" id="memory-hint" ${finished || busy || (previewUsed && !preview) ? 'disabled' : ''} aria-label="${preview ? 'Folytatom' : previewUsed ? 'A közös nézelődés ebben a körben elfogyott' : 'Nézzük meg együtt, egyszer'}">${preview ? 'Folytatom ▶' : '💡 Nézzük meg!'}</button>` : '';
    root.innerHTML = `<div class="memory-modes" role="group" aria-label="Párosító módja">${Object.entries(TITLES).map(([id, name]) => `<button type="button" data-memory-mode="${id}" aria-pressed="${mode === id}">${name}</button>`).join('')}</div>
      <div class="memory-progress" role="status">${found} / ${pairs} pár <span aria-hidden="true">${'🌼'.repeat(found)}</span></div>
      <div class="memory-board${mode === 'sound' ? ' memory-sound-board' : ''}" style="--memory-cols:${deck.length <= 6 ? 2 : deck.length <= 8 ? 4 : 3}" data-count="${deck.length}" role="group" aria-label="${mode === 'sound' ? 'Hangos memóriakártyák' : 'Képes memóriakártyák'}">${deck.map((card, i) => {
        const done = isMatched(card), revealed = done || preview || open.includes(card.key);
        return `<button type="button" class="memory-card ${revealed ? 'is-open' : ''} ${done ? 'is-matched' : ''}" data-card="${card.key}" data-kind="${revealed ? card.kind : ''}" aria-label="${cardLabel(card, i, revealed, done)}" aria-pressed="${revealed}" ${done || busy || preview || finished ? 'disabled' : ''}><span class="memory-card-back" aria-hidden="true">${mode === 'sound' ? '♪' : '✿'}</span><span class="memory-card-face" aria-hidden="true">${faceMarkup(card, done)}</span></button>`;
      }).join('')}</div>
      <p id="memory-status" class="memory-status" role="status">${currentStatus()}</p>
      <div class="memory-actions">${hintButton}<button type="button" id="memory-restart" aria-label="Új kártyák">↻</button></div>
      <details class="memory-timing" ${timingOpen ? 'open' : ''}><summary>Időzítés</summary><label>Második pillantás <select id="memory-mismatch">${[[1100, 'Rövid'], [2000, 'Közepes'], [3500, 'Hosszú']].map(([ms, label]) => `<option value="${ms}" ${timing.mismatchMs === ms ? 'selected' : ''}>${label}</option>`).join('')}</select></label>${mode === 'classic' ? `<label>Képek megjegyzése <select id="memory-preview">${[[3500, 'Rövid'], [7000, 'Hosszú'], [0, 'Amíg folytatom']].map(([ms, label]) => `<option value="${ms}" ${timing.previewMs === ms ? 'selected' : ''}>${label}</option>`).join('')}</select></label>` : ''}</details>`;
    root.querySelectorAll('[data-memory-mode]').forEach(button => button.addEventListener('click', () => {
      if (!allowed()) return;
      start({ mode: button.dataset.memoryMode }); focusGameTitle(root);
    }));
    root.querySelector('.memory-timing').addEventListener('toggle', event => { timingOpen = event.target.open; });
    root.querySelectorAll('[data-card]').forEach(button => button.addEventListener('click', () => flip(button.dataset.card)));
    root.querySelector('#memory-restart').addEventListener('click', () => { start(); root.querySelector('#memory-restart')?.focus({ preventScroll: true }); });
    root.querySelector('#memory-hint')?.addEventListener('click', hint);
    for (const [id, field] of [['memory-mismatch', 'mismatchMs'], ['memory-preview', 'previewMs']]) root.querySelector(`#${id}`)?.addEventListener('change', event => {
      timing = normalizeMemoryTiming({ ...timing, [field]: Number(event.target.value) }); saveTiming();
      if (field === 'previewMs' && preview && timing.previewMs === 0) clearTimeout(timer);
      if (field === 'previewMs' && preview && timing.previewMs) schedule(endPreview, timing.previewMs);
    });
    if (focusKey) root.querySelector(`[data-card="${focusKey}"]`)?.focus({ preventScroll: true });
  }

  function start({ mode: requestedMode } = {}) {
    onRestart();
    cancel(); active = true; finished = false; open = []; matched = new Set(); mismatches = 0; previewUsed = false; statusText = '';
    if (TITLES[requestedMode]) mode = requestedMode;
    const options = getOptions();
    if (mode === 'sound') {
      soundLevel = readSoundLevel();
      deck = buildSoundMemoryDeck(soundLevel);
    } else deck = buildMemoryDeck(options.words, options.memoryPairs, Math.random, options.allWords || []);
    pairs = deck.length / 2;
    render(); focusGameTitle(root);
    say(mode === 'sound' ? 'memory_sound_start' : 'memory_start');
  }
  function playCard(card) {
    const cue = { target: `.memory-card[data-card="${card.key}"] .memory-card-face` };
    if (mode === 'classic') return playWord(card.word, cue);
    if (card.kind === 'sound') return playAnimal(card.word.id);
    return speak(`abk_name_${card.word.id}`);
  }
  function complete() {
    finished = true; statusText = '';
    const stars = memoryStars(mismatches, pairs);
    if (mode === 'sound') { soundLevel = nextSoundMemoryLevel(soundLevel, mismatches); saveSoundLevel(); }
    else setPairs?.(nextMemoryPairs(pairs, mismatches));
    render(); root.querySelector('#memory-restart').focus({ preventScroll: true });
    // The round dialog says "memory_done"; the game itself stays quiet here.
    onComplete(stars, { mode, mismatches, pairs });
  }
  function flip(key) {
    if (!allowed() || busy || preview || finished || open.includes(key)) return;
    const card = deck.find(c => c.key === key);
    if (!card || isMatched(card)) return;
    effect('card'); open.push(key); statusText = '';
    const flipToken = ++flips;
    const playback = playCard(card);
    render(key);
    if (open.length !== 2) return;
    const first = deck.find(c => c.key === open[0]);
    if (isMatched(first) || !isMemoryPair(first, card)) {
      mismatches++; busy = true; render(key);
      const firstKey = first.key;
      schedule(() => { open = []; busy = false; render(firstKey); }, timing.mismatchMs);
      return;
    }
    effect('collect'); matched.add(first.key); matched.add(card.key); open = [];
    if (matched.size === deck.length) { complete(); return; }
    statusText = mode === 'sound' ? `Megvan a pár: ${card.word.label}!` : 'Egyforma képek! Megvan egy pár.';
    render();
    root.querySelector('[data-card]:not(:disabled)')?.focus({ preventScroll: true });
    // After the card's own sound, a short praise, unless the child has already flipped on.
    const token = generation;
    Promise.resolve(playback).catch(() => {}).then(() => {
      if (token === generation && flipToken === flips && allowed() && !finished) say(mode === 'sound' ? 'abk_well_done' : 'memory_match');
    });
  }
  function endPreview() { preview = false; render(); root.querySelector('#memory-hint')?.focus({ preventScroll: true }); }
  // One shared look per round; the button then stays off until a new round.
  function hint() {
    if (!allowed() || busy || finished || mode !== 'classic') return;
    if (preview) { cancel(); open = []; render(); root.querySelector('#memory-restart')?.focus({ preventScroll: true }); return; }
    if (previewUsed) return;
    open = []; preview = true; previewUsed = true; statusText = ''; render(); say('memory_hint');
    root.querySelector('#memory-hint').focus({ preventScroll: true });
    if (timing.previewMs) schedule(endPreview, timing.previewMs);
  }
  function stop() { active = false; cancel(); open = []; }
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && active) { cancel(); open = []; }
    else if (active) render();
  });
  return {
    start, restart() { start({ mode }); }, getContext() { return { mode }; }, stop,
    getLevel() { return mode === 'sound' ? { mode, ...SOUND_MEMORY_LEVELS[soundLevel] } : { mode, pairs }; },
    repeat() {
      const last = deck.find(card => card.key === open.at(-1));
      if (last && allowed()) { playCard(last); return; }
      if (mode === 'sound') { say(finished ? 'memory_done' : 'memory_sound_start'); return; }
      say(preview ? 'memory_hint' : finished ? 'memory_done' : 'memory_start');
    },
  };
}
