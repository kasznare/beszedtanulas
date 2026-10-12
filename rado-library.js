import { RADO_STORIES } from './rado-stories.js';
import { RADO_WORD_TIMING } from './rado-word-timing.js';
import { STORY_CAPTION_TIMES } from './story-caption-timing.js';
import { matchesStorySearch } from './audiobook-library.js';

const escape = text => String(text).replace(/[&<>"']/g, char => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[char]));

export function radoCaption(story, seconds) {
  const times = STORY_CAPTION_TIMES[story.id];
  if (!times || !RADO_WORD_TIMING[story.id]) return '';
  const lines = story.text.split('\n').filter(line => line.trim());
  let index = -1;
  for (let i = 0; i < times.length && times[i] <= seconds; i++) index = i;
  return index < 0 ? story.title : lines[index];
}

export function setupRadoLibrary(host, { readyStories, onRead, onPlay }) {
  const ready = new Set(readyStories.map(story => story.id));
  host.innerHTML = `<h3 id="rado-title">Radó Vilmos mesegyűjteménye</h3><p>Mind az 50 mese teljes szövege, az eredeti két kötet sorrendjében. A kész felolvasások külön letölthetők.</p><label class="rado-search-label" for="rado-search">Mese keresése</label><input id="rado-search" class="rado-search" type="search" placeholder="A mese címe"><article id="rado-reader" class="rado-reader" hidden tabindex="-1" aria-labelledby="rado-reader-title"><h4 id="rado-reader-title"></h4><p id="rado-reader-status" role="status"></p><button id="rado-play" class="story-download" hidden>Meghallgatom</button><div id="rado-reader-text" class="rado-text"></div><div id="rado-reader-notes"></div><p id="rado-reader-source" class="story-source"></p></article><p id="rado-search-status" role="status"></p>${['I', 'II'].map(volume => `<details class="rado-volume" data-volume="${volume}"><summary>${volume}. kötet · ${RADO_STORIES.filter(story => story.volume === volume).length} teljes mese</summary><div class="rado-grid">${RADO_STORIES.filter(story => story.volume === volume).map(story => `<button class="rado-card" data-rado-story="${story.id}" aria-label="${escape(story.title)} – ${volume}. kötet"><strong>${story.sourceIndex}. ${escape(story.title)}</strong><small>${ready.has(story.id) ? 'Jessa-felolvasás és teljes szöveg' : 'Teljes szöveg · felolvasásra vár'}</small></button>`).join('')}</div></details>`).join('')}`;
  const reader = host.querySelector('#rado-reader');
  let selected;
  function show(id) {
    selected = RADO_STORIES.find(story => story.id === id);
    if (!selected) return;
    onRead();
    reader.hidden = false;
    host.querySelector('#rado-reader-title').textContent = `${selected.title} · ${selected.volume}. kötet`;
    host.querySelector('#rado-reader-text').textContent = selected.text;
    host.querySelector('#rado-reader-status').textContent = ready.has(id) ? 'Teljes mese Jessa magyar felolvasásával.' : 'A teljes szöveget már olvashatjátok. Ehhez a meséhez a felolvasás még nem készült el.';
    host.querySelector('#rado-play').hidden = !ready.has(id);
    const notes = host.querySelector('#rado-reader-notes');
    notes.replaceChildren();
    if (selected.footnotes.length) {
      const heading = document.createElement('h5'); heading.textContent = 'Eredeti jegyzetek'; notes.append(heading);
      for (const note of selected.footnotes) {
        const p = document.createElement('p'); p.textContent = `${note.marker} ${note.text} (${note.paragraph + 1}. bekezdés)`; notes.append(p);
      }
    }
    host.querySelector('#rado-reader-source').innerHTML = `<a href="${escape(selected.sourceUrl)}" target="_blank" rel="noopener noreferrer">Eredeti szöveg: OSZK MEK</a><br>${escape(selected.rights.attribution)}<br><a href="${escape(selected.rights.licenseUrl)}" target="_blank" rel="noopener noreferrer">CC BY-SA 3.0</a> · A szöveg bekezdéseit és verssorait megtartottuk; a HTML tördelési szóközeit összevontuk. A jegyzetek külön szerepelnek.`;
    for (const button of host.querySelectorAll('[data-rado-story]')) button.setAttribute('aria-pressed', String(button.dataset.radoStory === id));
    reader.focus({ preventScroll: true }); reader.scrollIntoView({ block: 'start', behavior: 'auto' });
  }
  for (const button of host.querySelectorAll('[data-rado-story]')) button.addEventListener('click', () => show(button.dataset.radoStory));
  host.querySelector('#rado-play').addEventListener('click', () => onPlay(selected.id));
  function setQuery(value) {
    const query = value.trim();
    host.querySelector('#rado-search').value = value;
    let visible = 0;
    for (const button of host.querySelectorAll('[data-rado-story]')) {
      button.hidden = !matchesStorySearch(RADO_STORIES.find(story => story.id === button.dataset.radoStory), query);
      if (!button.hidden) visible++;
    }
    for (const volume of host.querySelectorAll('.rado-volume')) {
      volume.hidden = ![...volume.querySelectorAll('[data-rado-story]')].some(button => !button.hidden);
      if (query && !volume.hidden) volume.open = true;
    }
    host.querySelector('#rado-search-status').textContent = query ? `${visible} mese található.` : '';
  }
  host.querySelector('#rado-search').addEventListener('input', event => setQuery(event.target.value));
  host.querySelector('#rado-search').addEventListener('keydown', event => { if (event.key === 'Escape') { event.preventDefault(); setQuery(''); } });
  return { setQuery };
}
