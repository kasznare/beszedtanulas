import { AUDIOBOOKS } from './audiobook-data.js';
import { createAudiobookPlayer, resolveAudiobookSource, isAudiobookSaved, saveAudiobookOffline, loadAudiobookPreferences, saveAudiobookPreferences } from './audiobook-player.js';

const escape = value => String(value).replace(/[&<>"']/g, character => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[character]));
export const formatStoryTime = seconds => `${Math.floor(Math.max(0, seconds) / 60)}:${String(Math.floor(Math.max(0, seconds) % 60)).padStart(2, '0')}`;

export function setupAudiobooks({ stopPlayback }) {
  const root = document.querySelector('#audiobooks');
  let storage;
  try { storage = localStorage; } catch { storage = null; }
  let active = false, saving = new Set(), downloaded = new Set(), notices = new Map(), session = 0, bookmarkWarning = false;
  const $ = selector => root.querySelector(selector);
  const player = createAudiobookPlayer({
    preferences: loadAudiobookPreferences(storage), resolveSource: resolveAudiobookSource,
    persist: value => { if (!saveAudiobookPreferences(storage, value)) bookmarkWarning = true; },
    beforePlay: stopPlayback, onChange: update,
  });
  function update(state = player.getState()) {
    if (!active) return;
    const story = AUDIOBOOKS.find(story => story.id === state.storyId);
    if (!story) return;
    const playing = ['playing', 'buffering'].includes(state.phase);
    $('#story-title').textContent = story.title;
    $('#story-cover').textContent = story.emoji;
    root.dataset.phase = state.phase;
    $('#story-toggle').disabled = ['idle', 'loading'].includes(state.phase);
    $('#story-toggle').setAttribute('aria-label', playing ? 'Mese szüneteltetése' : state.position && state.phase !== 'ended' ? 'Mese folytatása' : 'Mese lejátszása');
    $('#story-toggle').innerHTML = `<span aria-hidden="true">${playing ? 'Ⅱ' : '▶'}</span><strong>${playing ? 'Szünet' : state.phase === 'error' ? 'Újrapróbálom' : state.position && state.phase !== 'ended' ? 'Folytatom' : 'Meghallgatom'}</strong>`;
    $('#story-restart').disabled = ['idle', 'loading'].includes(state.phase);
    const seek = $('#story-seek');
    seek.max = state.duration; seek.disabled = !state.metadata;
    if (document.activeElement !== seek) seek.value = state.position;
    seek.setAttribute('aria-valuetext', `${formatStoryTime(state.position)} / ${formatStoryTime(state.duration)}`);
    $('#story-elapsed').textContent = formatStoryTime(state.position);
    $('#story-duration').textContent = formatStoryTime(state.duration);
    const status = state.phase === 'error' ? 'A mese most nem indult el. Ellenőrizd az internetet, és próbáld újra!' : state.phase === 'loading' ? 'Előkészítjük a mesét…' : state.phase === 'buffering' ? 'A mese betöltődik…' : state.phase === 'playing' ? 'Szól a mese.' : state.phase === 'ended' ? 'Vége a mesének. Újra meghallgathatod, vagy választhatsz egy másikat.' : state.phase === 'paused' ? 'Itt tartunk. Folytassuk, amikor szeretnéd!' : 'A nagy gombbal indul a mese.';
    if ($('#story-status').textContent !== status) $('#story-status').textContent = status;
    const download = $('#story-download');
    download.disabled = saving.has(story.id) || downloaded.has(story.id);
    download.textContent = saving.has(story.id) ? 'Letöltés…' : downloaded.has(story.id) ? '✓ Letöltve' : '↓ Letöltés';
    $('#story-offline').textContent = notices.get(story.id) || (downloaded.has(story.id) ? 'Ez a mese internet nélkül is hallgatható ezen az eszközön.' : `Internet nélkül is szeretnétek? Töltsd le ezt a mesét! (${(story.bytes / 1e6).toFixed(1).replace('.', ',')} MB)`);
    if ($('#story-text').dataset.story !== story.id) {
      $('#story-text').textContent = story.text; $('#story-text').dataset.story = story.id;
      $('#story-transcript').open = false;
    }
    $('#story-bookmark-warning').hidden = !bookmarkWarning;
    for (const button of root.querySelectorAll('.story-card[data-story]')) {
      const selected = button.dataset.story === story.id;
      button.setAttribute('aria-pressed', String(selected));
      button.classList.toggle('is-selected', selected);
      const seconds = player.getPreferences().positions[button.dataset.story]?.seconds || 0;
      button.querySelector('.story-card-note').textContent = downloaded.has(button.dataset.story) ? '✓ Letöltve' : seconds >= 1 ? `Folytatás: ${formatStoryTime(seconds)}` : `${Math.ceil(AUDIOBOOKS.find(s => s.id === button.dataset.story).duration / 60)} perc`;
    }
  }
  function render() {
    root.innerHTML = `<div class="story-library"><p class="story-intro">Válassz egy mesét, és kuckózzunk be!</p><article class="story-player" aria-labelledby="story-title"><div id="story-cover" class="story-cover" aria-hidden="true"></div><div class="story-player-main"><span class="story-eyebrow">HANGOS MESE</span><h2 id="story-title"></h2><div class="story-actions"><button id="story-toggle" class="story-toggle"></button><button id="story-restart" class="story-restart" aria-label="Mese újrakezdése"><span aria-hidden="true">↺</span><span>Elölről</span></button></div><label class="sr-only" for="story-seek">Hol tartunk a mesében?</label><input id="story-seek" class="story-seek" type="range" min="0" step="1" value="0"><div class="story-times" aria-hidden="true"><span id="story-elapsed"></span><span id="story-duration"></span></div><p id="story-status" class="story-status" role="status"></p></div><div class="story-download-row"><button id="story-download" class="story-download"></button><p id="story-offline" role="status"></p></div><p id="story-bookmark-warning" class="story-status" role="status" hidden>A böngésző most nem tudja megjegyezni, hol tartunk.</p><details id="story-transcript" class="story-transcript"><summary>Mese szövege</summary><div id="story-text"></div></details></article><h3 class="story-list-title">Melyiket hallgassuk?</h3><div class="story-grid" role="group" aria-label="Mesék">${AUDIOBOOKS.map(story => `<button class="story-card" data-story="${story.id}" aria-label="${escape(story.title)} kiválasztása"><span class="story-card-cover" aria-hidden="true">${story.emoji}</span><strong>${escape(story.title)}</strong><small class="story-card-note">${Math.ceil(story.duration / 60)} perc</small></button>`).join('')}</div></div>`;
    $('#story-toggle').addEventListener('click', () => ['playing', 'buffering'].includes(player.getState().phase) ? player.pause() : void player.play());
    $('#story-restart').addEventListener('click', () => void player.restart());
    $('#story-seek').addEventListener('input', event => { player.seek(Number(event.target.value)); });
    root.querySelectorAll('.story-card[data-story]').forEach(button => button.addEventListener('click', () => {
      void player.select(button.dataset.story).then(selected => { if (selected && active && player.getState().storyId === button.dataset.story) $('#story-toggle').focus({ preventScroll: true }); });
      $('#story-title').scrollIntoView({ block: 'nearest', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
    }));
    $('#story-download').addEventListener('click', async () => {
      const story = AUDIOBOOKS.find(s => s.id === player.getState().storyId);
      if (!story || saving.has(story.id) || downloaded.has(story.id)) return;
      saving.add(story.id); notices.delete(story.id); update();
      const abort = new AbortController(), timer = setTimeout(() => abort.abort(), 120000);
      try { await saveAudiobookOffline(story, { signal: abort.signal }); downloaded.add(story.id); }
      catch { notices.set(story.id, 'A letöltés nem sikerült. Ellenőrizd a kapcsolatot vagy a szabad tárhelyet, és próbáld újra!'); }
      finally { clearTimeout(timer); saving.delete(story.id); update(); }
    });
  }
  window.addEventListener('pagehide', () => player.pause());
  return {
    async start() {
      active = true; const token = ++session; render();
      void player.select(player.getPreferences().selected);
      for (const story of AUDIOBOOKS) {
        const exists = await isAudiobookSaved(story);
        if (!active || token !== session) return;
        if (exists) downloaded.add(story.id); else downloaded.delete(story.id);
      }
      update();
    },
    pause: player.pause,
    stop() { player.stop(); active = false; session++; },
    repeat() { if (active) $('#story-status').textContent = 'Válassz egy mesét! A nagy gombbal elindíthatod vagy szüneteltetheted.'; },
  };
}
