import { createIllustratedStory } from '../../story-visual-player.js';
import { STORY_VISUAL_LIBRARY, storyVisualFor, storySceneAt, storyCaptionAt } from '../../story-visual-library.js';
import { storyAnimationTime, storyPlaybackTime } from '../../story-playback-timing.js';

const $ = selector => document.querySelector(selector), audio = $('#audio');
const format = time => `${Math.floor(time / 60)}:${String(Math.floor(time % 60)).padStart(2, '0')}`;
const requested = new URLSearchParams(location.search).get('story');
let story = storyVisualFor(requested) || storyVisualFor('story-13'), ready = false, switching = false;
const visual = createIllustratedStory($('#visual'), { storyId: story.id, readTime: () => audio.currentTime,
  onScene: scene => { $('#scene').value = String(storyPlaybackTime(story.id, scene.time)); } });

for (const book of STORY_VISUAL_LIBRARY) {
  const button = document.createElement('button'); button.dataset.story = book.id;
  const emoji = document.createElement('span'); emoji.textContent = book.emoji; emoji.setAttribute('aria-hidden', 'true');
  const title = document.createElement('strong'); title.textContent = book.title;
  const duration = document.createElement('small'); duration.textContent = `${format(book.duration)} · ${book.scenes.length} jelenet`;
  button.append(emoji, title, duration); button.addEventListener('click', () => select(book.id)); $('#books').append(button);
}
function sync() {
  if (switching) return;
  const playing = !audio.paused && !audio.ended;
  visual.sync(audio.currentTime, playing);
  $('#play').textContent = playing ? 'Ⅱ Szünet' : audio.ended ? '▶ Újra meghallgatom' : audio.currentTime > .1 ? '▶ Folytatom' : '▶ Meghallgatom';
  $('#elapsed').textContent = format(audio.currentTime);
  if (document.activeElement !== $('#seek')) $('#seek').value = audio.currentTime;
  $('#scene').value = String(storyPlaybackTime(story.id, storySceneAt(story.id, storyAnimationTime(story.id, audio.currentTime)).time));
  $('#caption').textContent = storyCaptionAt(story.id, audio.currentTime);
  $('#status').textContent = audio.ended ? 'Vége a mesének. Válasszunk egy másikat!' : playing ? 'Szól a mese.' : ready ? 'A nagy gombbal indul a mese.' : 'A hang betöltődik…';
}
function select(id) {
  const next = storyVisualFor(id); if (!next) return false;
  switching = true; audio.pause(); ready = false; $('#play').disabled = true; story = next;
  audio.src = '../../' + story.file.replace(/^\.\//, '') + '?v=' + story.sha256; audio.load();
  $('#title').textContent = story.title; document.title = `${story.title} · Képes mesetár`;
  $('#description').textContent = `Teljes képes mű · ${format(story.duration)} · ${story.scenes.length} jelenet`;
  $('#duration').textContent = format(story.duration); $('#seek').max = story.duration;
  $('#scene').replaceChildren(...story.scenes.map((scene, index) => {
    const option = document.createElement('option'); option.value = storyPlaybackTime(story.id, scene.time); option.textContent = `${index + 1}. ${scene.title}`; return option;
  }));
  for (const button of $('#books').children) button.setAttribute('aria-pressed', String(button.dataset.story === id));
  visual.select(id, 0, false); $('#motion').checked = visual.motion;
  history.replaceState(null, '', `?story=${id}`);
  switching = false; sync(); return true;
}
function seek(time) {
  const value = Math.max(0, Math.min(audio.duration || story.duration, time));
  audio.currentTime = value; sync();
}
async function toggle() {
  if (!ready) return;
  if (!audio.paused) { audio.pause(); sync(); return; }
  if (audio.ended) audio.currentTime = 0;
  try { await audio.play(); } catch { $('#status').textContent = 'A hang nem indult el. Próbáld meg újra!'; }
}
$('#play').addEventListener('click', toggle);
$('#restart').addEventListener('click', () => { seek(0); if (audio.paused) void toggle(); });
$('#seek').addEventListener('input', event => seek(Number(event.target.value)));
$('#scene').addEventListener('change', event => seek(Number(event.target.value)));
$('#motion').addEventListener('change', event => visual.setMotion(event.target.checked));
for (const [id, delta] of [['previous', -1], ['next', 1]]) $('#' + id).addEventListener('click', () => {
  const index = story.scenes.indexOf(storySceneAt(story.id, storyAnimationTime(story.id, audio.currentTime)));
  seek(storyPlaybackTime(story.id, story.scenes[Math.max(0, Math.min(story.scenes.length - 1, index + delta))].time));
});
$('#fullscreen').disabled = !$('#visual').requestFullscreen;
$('#fullscreen').addEventListener('click', () => $('#visual').requestFullscreen?.().catch(() => {}));
for (const event of ['playing', 'pause', 'ended', 'timeupdate', 'seeked', 'seeking']) audio.addEventListener(event, sync);
audio.addEventListener('loadedmetadata', () => { $('#seek').max = audio.duration; });
audio.addEventListener('canplay', () => { ready = true; $('#play').disabled = false; sync(); });
audio.addEventListener('error', () => { $('#status').textContent = 'A hangfájl nem töltődött be. Töltsd újra az oldalt!'; });
window.addEventListener('pagehide', () => audio.pause());
window.storyLibraryPreview = { select, seek, render: visual.render, stories: STORY_VISUAL_LIBRARY, visual,
  animationTime: storyAnimationTime, playbackTime: storyPlaybackTime,
  get ready() { return ready; }, get story() { return story; } };
select(story.id);
