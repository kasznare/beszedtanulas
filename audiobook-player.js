import { AUDIOBOOKS } from './audiobook-data.js';

const STORAGE_KEY = 'beszedtanulas.audiobooks.v1';
const cacheName = `beszedtanulas-audiobooks:${new URL('.', import.meta.url).href}:v1`;
const cacheKey = story => new URL(`${story.file}?v=${story.sha256}`, import.meta.url).href;
const finite = value => typeof value === 'number' && Number.isFinite(value);

export function normalizeAudiobookState(value, stories = AUDIOBOOKS) {
  const source = value && typeof value === 'object' ? value : {};
  const positions = {};
  for (const story of stories) {
    const entry = source.positions?.[story.id];
    if (entry?.sha256 === story.sha256 && finite(entry.seconds) && entry.seconds >= 0 && entry.seconds < story.duration - 1) {
      positions[story.id] = { seconds: entry.seconds, sha256: story.sha256 };
    }
  }
  return { selected: stories.some(story => story.id === source.selected) ? source.selected : stories[0]?.id, positions };
}

export function createAudiobookPlayer({ stories = AUDIOBOOKS, audioFactory = () => new Audio(), resolveSource = async story => ({ url: cacheKey(story) }), releaseSource = source => { if (source?.blob) URL.revokeObjectURL(source.url); }, preferences = {}, persist = () => {}, beforePlay = () => {}, onChange = () => {} } = {}) {
  let saved = normalizeAudiobookState(preferences, stories);
  let audio, source, generation = 0, playGeneration = 0, wantsPlayback = false, saveBucket = -1;
  let state = { storyId: saved.selected, phase: 'idle', position: saved.positions[saved.selected]?.seconds || 0, duration: stories.find(story => story.id === saved.selected)?.duration || 0, metadata: false };
  const story = () => stories.find(entry => entry.id === state.storyId);
  const emit = () => onChange({ ...state });
  function remember(completed = false) {
    const current = story();
    if (!current) return;
    saved.selected = current.id;
    saved.positions[current.id] = { seconds: completed ? 0 : state.position, sha256: current.sha256 };
    persist(structuredClone(saved));
  }
  function pause() {
    wantsPlayback = false; playGeneration++;
    audio?.pause();
    if (audio && state.metadata) state.position = Math.max(0, audio.currentTime || 0);
    if (['playing', 'buffering'].includes(state.phase)) state.phase = 'paused';
    if (audio || state.phase !== 'idle') remember(state.phase === 'ended');
    emit();
  }
  function release() {
    if (audio) { audio.pause(); audio.removeAttribute('src'); audio.load(); }
    releaseSource(source); source = null; audio = null;
  }
  async function select(id) {
    const current = stories.find(entry => entry.id === id);
    if (!current) return false;
    pause(); generation++; release();
    const token = generation;
    saved.selected = id;
    state = { storyId: id, phase: 'loading', position: saved.positions[id]?.seconds || 0, duration: current.duration, metadata: false };
    remember(); emit();
    let resolved;
    try { resolved = await resolveSource(current); }
    catch { if (token === generation) { state.phase = 'error'; emit(); } return false; }
    if (token !== generation) { releaseSource(resolved); return false; }
    source = resolved;
    const element = audioFactory(); audio = element;
    element.preload = 'metadata'; element.setAttribute('playsinline', '');
    const active = () => token === generation && element === audio;
    element.addEventListener('loadedmetadata', () => {
      if (!active()) return;
      if (finite(element.duration) && element.duration > 0) state.duration = element.duration;
      state.position = Math.min(state.position, Math.max(0, state.duration - .1));
      if (state.position) element.currentTime = state.position;
      state.metadata = true; emit();
    });
    element.addEventListener('playing', () => {
      if (!active()) return;
      if (!wantsPlayback) { element.pause(); return; }
      state.phase = 'playing'; emit();
    });
    element.addEventListener('waiting', () => { if (active() && wantsPlayback) { state.phase = 'buffering'; emit(); } });
    element.addEventListener('pause', () => {
      if (!active() || element.ended || !['playing', 'buffering'].includes(state.phase)) return;
      if (state.metadata) state.position = Math.max(0, element.currentTime || 0);
      wantsPlayback = false; state.phase = 'paused'; remember(); emit();
    });
    element.addEventListener('timeupdate', () => {
      if (!active() || !state.metadata) return;
      state.position = Math.max(0, element.currentTime || 0);
      const bucket = Math.floor(state.position / 5);
      if (bucket !== saveBucket) { saveBucket = bucket; remember(); }
      emit();
    });
    element.addEventListener('ended', () => {
      if (!active()) return;
      wantsPlayback = false; state.phase = 'ended'; state.position = state.duration;
      remember(true); emit();
    });
    element.addEventListener('error', () => { if (active()) { wantsPlayback = false; state.phase = 'error'; remember(); emit(); } });
    element.src = resolved.url;
    state.phase = 'ready'; saveBucket = -1; emit();
    return true;
  }
  async function play() {
    if (!audio || state.phase === 'loading') return false;
    beforePlay();
    const token = generation, attempt = ++playGeneration, element = audio;
    wantsPlayback = true;
    if (state.phase === 'ended') { state.position = 0; element.currentTime = 0; }
    if (state.phase === 'error') element.load();
    state.phase = 'buffering'; emit();
    try { await element.play(); }
    catch { if (token === generation && attempt === playGeneration) { wantsPlayback = false; state.phase = 'error'; emit(); } return false; }
    return token === generation && attempt === playGeneration && wantsPlayback;
  }
  function seek(seconds) {
    if (!audio || !state.metadata || !finite(seconds)) return false;
    audio.currentTime = Math.max(0, Math.min(seconds, state.duration));
    state.position = audio.currentTime;
    if (state.phase === 'ended') state.phase = 'paused';
    remember(); emit(); return true;
  }
  return {
    select, play, pause, seek,
    restart() { if (!audio) return; state.position = 0; if (state.metadata) audio.currentTime = 0; remember(); return play(); },
    stop() { pause(); generation++; release(); state.phase = 'idle'; state.metadata = false; emit(); },
    getState: () => ({ ...state }), getPreferences: () => structuredClone(saved),
  };
}

async function openCache() { return 'caches' in globalThis ? caches.open(cacheName) : null; }
export async function isAudiobookSaved(story) {
  try { return Boolean(await (await openCache())?.match(cacheKey(story))); } catch { return false; }
}
export async function resolveAudiobookSource(story) {
  try {
    const cached = await (await openCache())?.match(cacheKey(story));
    if (cached) return { url: URL.createObjectURL(await cached.blob()), blob: true };
  } catch { /* Streaming remains available if local storage is unavailable. */ }
  return { url: cacheKey(story) };
}
export async function saveAudiobookOffline(story, { signal } = {}) {
  const cache = await openCache();
  if (!cache) throw Error('offline-storage');
  const response = await fetch(cacheKey(story), { cache: 'reload', signal });
  if (response.status !== 200) throw Error('download');
  const bytes = await response.clone().arrayBuffer();
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  const hash = [...new Uint8Array(digest)].map(byte => byte.toString(16).padStart(2, '0')).join('');
  if (hash !== story.sha256) throw Error('incomplete-download');
  await cache.put(cacheKey(story), response);
  // Remove earlier recordings of this same story only after the new one is saved.
  const pathname = new URL(cacheKey(story)).pathname;
  for (const key of await cache.keys()) if (new URL(key.url).pathname === pathname && key.url !== cacheKey(story)) await cache.delete(key);
}

export function loadAudiobookPreferences(storage) {
  try { return normalizeAudiobookState(JSON.parse(storage?.getItem(STORAGE_KEY) || 'null')); }
  catch { return normalizeAudiobookState(null); }
}
export function saveAudiobookPreferences(storage, value) {
  try { storage?.setItem(STORAGE_KEY, JSON.stringify(value)); return Boolean(storage); } catch { return false; }
}
