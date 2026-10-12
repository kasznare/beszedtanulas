import { AUDIOBOOKS } from './audiobook-data.js';
import { REQUESTED_CLASSICS } from './requested-classics.js';
import { KRIZA_REQUESTED } from './kriza-requested.js';
import { mergeStoryLibrary, matchesStorySearch } from './audiobook-library.js';
import { createAudiobookPlayer, resolveAudiobookSource, isAudiobookSaved, saveAudiobookOffline, loadAudiobookPreferences, saveAudiobookPreferences } from './audiobook-player.js';
import { createIllustratedStory } from './story-visual-player.js';
import { importPrivateAudiobook, loadLocalAudiobooks, resolveLocalAudiobookSource, deleteLocalAudiobook } from './local-audiobooks.js';

const escape = value => String(value).replace(/[&<>"']/g, character => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[character]));
export const formatStoryTime = seconds => `${Math.floor(Math.max(0, seconds) / 60)}:${String(Math.floor(Math.max(0, seconds) % 60)).padStart(2, '0')}`;

export function setupAudiobooks({ stopPlayback }) {
  const root = document.querySelector('#audiobooks');
  let storage;
  try { storage = localStorage; } catch { storage = null; }
  let active = false, saving = new Set(), downloaded = new Set(), notices = new Map(), session = 0, bookmarkWarning = false, visual;
  const publicStories = mergeStoryLibrary(AUDIOBOOKS, REQUESTED_CLASSICS, KRIZA_REQUESTED);
  let stories = [...publicStories], player, importMessage = '', importing = false, search = '';
  const $ = selector => root.querySelector(selector);
  const makePlayer = () => createAudiobookPlayer({
    stories, preferences: loadAudiobookPreferences(storage, stories),
    resolveSource: story => story.local ? resolveLocalAudiobookSource(story) : resolveAudiobookSource(story),
    persist: value => { if (!saveAudiobookPreferences(storage, value)) bookmarkWarning = true; },
    beforePlay: stopPlayback, onChange: update,
  });
  function update(state = player.getState()) {
    if (!active) return;
    const story = stories.find(story => story.id === state.storyId);
    if (!story) return;
    const playing = ['playing', 'buffering'].includes(state.phase);
    const pending = Boolean(story.audioStatus && story.audioStatus !== 'ready');
    const illustrated = visual?.select(story.id, player.getPosition(), state.phase === 'playing') === true;
    root.dataset.illustrated = String(illustrated);
    $('#story-visual-wrap').hidden = !illustrated;
    $('#story-title').textContent = story.title;
    $('#story-byline').hidden = !story.author;
    $('#story-byline').textContent = story.author ? `${story.author} · ${story.kind}` : '';
    $('#story-source').hidden = !story.sourceUrl;
    if (story.sourceUrl && $('#story-source').dataset.story !== story.id) {
      const link = document.createElement('a');
      link.href = story.sourceUrl; link.target = '_blank'; link.rel = 'noopener noreferrer';
      link.textContent = 'Szöveg forrása: OSZK Magyar Elektronikus Könyvtár';
      $('#story-source').replaceChildren(link); $('#story-source').dataset.story = story.id;
    }
    $('#story-cover').textContent = story.emoji;
    root.dataset.phase = state.phase;
    $('#story-toggle').disabled = pending || ['idle', 'loading'].includes(state.phase);
    $('#story-toggle').setAttribute('aria-label', playing ? 'Mese szüneteltetése' : state.position && state.phase !== 'ended' ? 'Mese folytatása' : 'Mese lejátszása');
    $('#story-toggle').innerHTML = `<span aria-hidden="true">${playing ? 'Ⅱ' : '▶'}</span><strong>${playing ? 'Szünet' : state.phase === 'error' ? 'Újrapróbálom' : state.position && state.phase !== 'ended' ? 'Folytatom' : 'Meghallgatom'}</strong>`;
    $('#story-restart').disabled = pending || ['idle', 'loading'].includes(state.phase);
    const seek = $('#story-seek');
    seek.max = state.duration; seek.disabled = !state.metadata;
    if (document.activeElement !== seek) seek.value = state.position;
    seek.setAttribute('aria-valuetext', `${formatStoryTime(state.position)} / ${formatStoryTime(state.duration)}`);
    $('#story-elapsed').textContent = formatStoryTime(state.position);
    $('#story-duration').textContent = formatStoryTime(state.duration);
    const status = story.audioStatus === 'rights-pending' ? 'A mű még forrásellenőrzésre vár. A megadott kiadás modern átdolgozását nem közöljük újra.' : pending ? 'A teljes szöveg már olvasható. A hang az előfizetési keret felszabadulására vár.' : state.phase === 'error' ? 'A mese most nem indult el. Ellenőrizd az internetet, és próbáld újra!' : state.phase === 'loading' ? 'Előkészítjük a mesét…' : state.phase === 'buffering' ? 'A mese betöltődik…' : state.phase === 'playing' ? 'Szól a mese.' : state.phase === 'ended' ? 'Vége a mesének. Újra meghallgathatod, vagy választhatsz egy másikat.' : state.phase === 'paused' ? 'Itt tartunk. Folytassuk, amikor szeretnéd!' : 'A nagy gombbal indul a mese.';
    if ($('#story-status').textContent !== status) $('#story-status').textContent = status;
    const download = $('#story-download');
    download.hidden = Boolean(story.local) || pending;
    $('#story-remove').hidden = !story.local;
    download.disabled = saving.has(story.id) || downloaded.has(story.id);
    download.textContent = saving.has(story.id) ? 'Letöltés…' : downloaded.has(story.id) ? '✓ Letöltve' : '↓ Letöltés';
    $('#story-offline').textContent = notices.get(story.id) || (story.audioStatus === 'rights-pending' ? 'Eredeti közkincs szövegre vagy publikálási jogengedélyre vár.' : pending ? `A hang még nem készült el. Teljes áras becslése: ${story.providerCharacters ?? '?'} kredit. A teljes szöveg internet nélkül is olvasható.` : story.local ? 'Saját mese: ezen az eszközön, internet nélkül is hallgatható.' : downloaded.has(story.id) ? 'Ez a mese internet nélkül is hallgatható ezen az eszközön.' : `Internet nélkül is szeretnétek? Töltsd le ezt a mesét! (${(story.bytes / 1e6).toFixed(1).replace('.', ',')} MB)`);
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
      const entry = stories.find(s => s.id === button.dataset.story);
      button.querySelector('.story-card-note').textContent = entry.audioStatus === 'rights-pending' ? 'Forrásellenőrzésre vár' : entry.audioStatus === 'pending' ? 'Teljes szöveg • hangra vár' : seconds >= 1 ? `Folytatás: ${formatStoryTime(seconds)}` : entry.local ? `Saját mese • ${Math.ceil(entry.duration / 60)} perc` : downloaded.has(entry.id) ? '✓ Letöltve' : `${Math.ceil(entry.duration / 60)} perc`;
    }
  }
  function filterStories() {
    let count = 0;
    for (const button of root.querySelectorAll('.story-card[data-story]')) {
      const story = stories.find(entry => entry.id === button.dataset.story);
      button.hidden = !matchesStorySearch(story, search);
      if (!button.hidden) count++;
    }
    $('#story-search-clear').hidden = !search;
    $('#story-search-count').textContent = `${count} találat • ${stories.length} mű a Mesetárban`;
    $('#story-search-empty').hidden = count !== 0;
  }
  function render() {
    visual?.destroy();
    root.innerHTML = `<div class="story-library"><p class="story-intro">Válassz egy mesét, és kuckózzunk be!</p><article class="story-player" aria-labelledby="story-title"><div id="story-cover" class="story-cover" aria-hidden="true"></div><div class="story-player-main"><span class="story-eyebrow">HANGOS MESE</span><h2 id="story-title"></h2><p id="story-byline" class="story-byline" hidden></p><div class="story-actions"><button id="story-toggle" class="story-toggle"></button><button id="story-restart" class="story-restart" aria-label="Mese újrakezdése"><span aria-hidden="true">↺</span><span>Elölről</span></button></div><label class="sr-only" for="story-seek">Hol tartunk a mesében?</label><input id="story-seek" class="story-seek" type="range" min="0" step="1" value="0"><div class="story-times" aria-hidden="true"><span id="story-elapsed"></span><span id="story-duration"></span></div><p id="story-status" class="story-status" role="status"></p></div><div class="story-download-row"><button id="story-download" class="story-download"></button><button id="story-remove" class="story-download" hidden>Eltávolítás</button><p id="story-offline" role="status"></p></div><p id="story-bookmark-warning" class="story-status" role="status" hidden>A böngésző most nem tudja megjegyezni, hol tartunk.</p><details id="story-transcript" class="story-transcript"><summary>Mese szövege</summary><div id="story-text"></div><p id="story-source" class="story-source" hidden></p></details></article><h3 class="story-list-title">Melyiket hallgassuk?</h3><div class="story-search"><label for="story-search">Keresés cím vagy szerző alapján</label><div class="story-search-row"><input id="story-search" type="search" autocomplete="off" placeholder="Például: Petőfi vagy Gyöngyvirág" aria-describedby="story-search-count"><button id="story-search-clear" type="button" aria-label="Keresés törlése">Törlés</button></div><p id="story-search-count" role="status" aria-live="polite" aria-atomic="true"></p></div><p id="story-search-empty" hidden>Nincs találat. Próbálj másik címet vagy szerzőt, vagy töröld a keresést!</p><div class="story-grid" role="group" aria-label="Mesék">${stories.map(story => `<button class="story-card" data-story="${escape(story.id)}" aria-label="${escape(story.title)} kiválasztása"><span class="story-card-cover" aria-hidden="true">${story.emoji}</span><strong>${escape(story.title)}</strong>${story.author ? `<small class="story-card-author">${escape(story.author)} · ${escape(story.kind)}</small>` : ''}<small class="story-card-note">${Math.ceil(story.duration / 60)} perc</small></button>`).join('')}</div><section class="story-local-import" aria-labelledby="story-local-title"><h3 id="story-local-title">Saját mesék</h3><p>A hozzáadott mesék ezen a böngészőn maradnak. Másik eszközön ugyanebből a fájlból adhatod hozzá őket.</p><button id="story-import" class="story-download">Saját mese hozzáadása</button><input id="story-import-file" type="file" accept=".json,.mese.json,application/json" hidden aria-label="Saját mesefájl kiválasztása"><p id="story-import-status" role="status"></p></section></div>`;
    $('#story-search').value = search;
    $('#story-search').addEventListener('input', event => { search = event.target.value; filterStories(); });
    const clearSearch = () => { search = ''; $('#story-search').value = ''; filterStories(); $('#story-search').focus({ preventScroll: true }); };
    $('#story-search-clear').addEventListener('click', clearSearch);
    $('#story-search').addEventListener('keydown', event => { if (event.key === 'Escape' && search) { event.preventDefault(); clearSearch(); } });
    filterStories();
    $('#story-toggle').addEventListener('click', () => ['playing', 'buffering'].includes(player.getState().phase) ? player.pause() : void player.play());
    const visualWrap = document.createElement('div');
    visualWrap.id = 'story-visual-wrap'; visualWrap.className = 'story-visual-wrap';
    visualWrap.innerHTML = '<div id="story-visual" class="story-visual"></div><div class="story-visual-footer"><p id="story-scene-title"></p><label class="story-motion-label"><input id="story-motion" type="checkbox"> Mozgás</label></div>';
    root.querySelector('.story-download-row').before(visualWrap);
    visual = createIllustratedStory($('#story-visual'), { storyId: player.getPreferences().selected, readTime: player.getPosition, onScene: scene => { $('#story-scene-title').textContent = scene.title; } });
    $('#story-motion').checked = visual.motion;
    $('#story-motion').addEventListener('change', event => visual.setMotion(event.target.checked));
    $('#story-restart').addEventListener('click', () => void player.restart());
    $('#story-seek').addEventListener('input', event => { player.seek(Number(event.target.value)); });
    root.querySelectorAll('.story-card[data-story]').forEach(button => button.addEventListener('click', () => {
      void player.select(button.dataset.story).then(selected => { if (selected && active && player.getState().storyId === button.dataset.story) ($('#story-toggle').disabled ? $('#story-transcript summary') : $('#story-toggle')).focus({ preventScroll: true }); });
      $('#story-title').scrollIntoView({ block: 'nearest', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
    }));
    $('#story-download').addEventListener('click', async () => {
      const story = stories.find(s => s.id === player.getState().storyId);
      if (!story || saving.has(story.id) || downloaded.has(story.id)) return;
      saving.add(story.id); notices.delete(story.id); update();
      const abort = new AbortController(), timer = setTimeout(() => abort.abort(), 120000);
      try { await saveAudiobookOffline(story, { signal: abort.signal }); downloaded.add(story.id); }
      catch { notices.set(story.id, 'A letöltés nem sikerült. Ellenőrizd a kapcsolatot vagy a szabad tárhelyet, és próbáld újra!'); }
      finally { clearTimeout(timer); saving.delete(story.id); update(); }
    });
    $('#story-import-status').textContent = importMessage;
    $('#story-import').disabled = importing;
    $('#story-import').addEventListener('click', () => $('#story-import-file').click());
    $('#story-import-file').addEventListener('change', async event => {
      const file = event.target.files[0], token = session;
      if (!file || importing) return;
      importing = true; $('#story-import').disabled = true;
      $('#story-import-status').textContent = 'Előkészítjük és mentjük a saját mesét…';
      try {
        const story = await importPrivateAudiobook(file);
        importMessage = 'A saját mese elkészült. A nagy gombbal meghallgathatod.';
        if (!active || token !== session) return;
        const index = stories.findIndex(entry => entry.id === story.id);
        if (index >= 0) stories[index] = story; else stories.push(story);
        downloaded.add(story.id); player.pause(); render();
        await player.select(story.id);
        if (active && token === session) $('#story-toggle').focus({ preventScroll: true });
      } catch (error) {
        importMessage = error.message || 'A saját mesét nem sikerült hozzáadni.';
      } finally {
        importing = false;
        if (active && token === session) {
          $('#story-import').disabled = false;
          $('#story-import-status').textContent = importMessage;
          $('#story-import-file').value = '';
        }
      }
    });
    $('#story-remove').addEventListener('click', async () => {
      const story = stories.find(entry => entry.id === player.getState().storyId), token = session;
      if (!story?.local) return;
      $('#story-remove').disabled = true;
      try {
        await deleteLocalAudiobook(story.id);
        if (!active || token !== session) return;
        player.stop(); stories.splice(stories.findIndex(entry => entry.id === story.id), 1);
        downloaded.delete(story.id); importMessage = 'A saját mesét eltávolítottuk erről az eszközről. A fájlból bármikor visszateheted.';
        render(); await player.select(stories[0].id);
      } catch (error) {
        if (active && token === session) {
          notices.set(story.id, error.message); $('#story-remove').disabled = false; update();
        }
      }
    });
  }
  window.addEventListener('pagehide', () => player?.pause());
  return {
    async start() {
      active = false; player?.stop(); visual?.destroy(); visual = null;
      active = true; const token = ++session;
      root.dataset.phase = 'loading';
      root.innerHTML = '<p class="story-intro" role="status">Előkészítjük a Mesetárat…</p>';
      let local = [];
      try { local = await loadLocalAudiobooks(); }
      catch (error) { importMessage = error.message; }
      if (!active || token !== session) return;
      stories = [...publicStories, ...local];
      player = makePlayer(); render();
      void player.select(player.getPreferences().selected);
      for (const story of stories) {
        const exists = story.local || ((!story.audioStatus || story.audioStatus === 'ready') && await isAudiobookSaved(story));
        if (!active || token !== session) return;
        if (exists) downloaded.add(story.id); else downloaded.delete(story.id);
      }
      update();
    },
    pause() { player?.pause(); },
    stop() { active = false; player?.stop(); session++; visual?.destroy(); visual = null; },
    repeat() { const status = $('#story-status'); if (active && status) status.textContent = 'Válassz egy mesét! A nagy gombbal elindíthatod vagy szüneteltetheted.'; },
  };
}
