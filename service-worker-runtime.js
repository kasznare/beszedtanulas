/* CACHE_VERSION and ASSETS are supplied by scripts/build-offline.mjs. */
const SCOPE = new URL(self.registration.scope);
const CACHE_PREFIX = `beszedtanulas:${SCOPE.href}:`;
const CACHE_NAME = CACHE_PREFIX + CACHE_VERSION;
const INDEX_URL = new URL("index.html", SCOPE).href;
const REFRESH_URL = new URL("refresh.html", SCOPE).href;
const ASSET_URLS = new Set(ASSETS.map(asset => new URL(asset.file, SCOPE).href));
const AUDIOBOOK_CACHE_NAME = `beszedtanulas-audiobooks:${SCOPE.href}:v1`;
const AUDIOBOOK_ASSETS = new Map((typeof OPTIONAL_ASSETS === 'undefined' ? [] : OPTIONAL_ASSETS)
  .map(asset => [new URL(asset.file, SCOPE).href, asset]));
const audiobookDownloads = new Map();

async function tellClients(message) {
  const clients = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
  for (const client of clients) {
    if (client.url.startsWith(SCOPE.href)) client.postMessage({ ...message, version: CACHE_VERSION });
  }
}

async function installOffline(repair = false) {
  const cache = await caches.open(CACHE_NAME);
  let completed = 0;
  let next = 0;
  let failure;
  await tellClients({ type: "OFFLINE_PROGRESS", completed, total: ASSETS.length });
  const download = async () => {
    while (next < ASSETS.length && !failure) {
      const asset = ASSETS[next++];
      const abort = new AbortController();
      const timer = setTimeout(() => abort.abort(), 15000);
      try {
        const url = new URL(asset.file, SCOPE).href;
        if (repair && await cache.match(url)) {
          completed += 1;
          await tellClients({ type: "OFFLINE_PROGRESS", completed, total: ASSETS.length });
          continue;
        }
        const response = await fetch(new Request(url, { cache: "reload", credentials: "same-origin", signal: abort.signal }));
        if (response.status !== 200) throw new Error(`Download failed: ${asset.file}`);
        const data = await response.clone().arrayBuffer();
        const digest = await crypto.subtle.digest("SHA-256", data);
        const hash = Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, "0")).join("");
        if (hash !== asset.sha256) throw new Error(`File changed: ${asset.file}`);
        await cache.put(url, response);
        completed += 1;
        await tellClients({ type: "OFFLINE_PROGRESS", completed, total: ASSETS.length });
      } catch (error) {
        failure = error;
      } finally {
        clearTimeout(timer);
      }
    }
  };
  // Let in-flight writes finish before removing an incomplete new cache.
  await Promise.all(Array.from({ length: 6 }, download));
  if (failure) {
    if (!repair) await caches.delete(CACHE_NAME);
    await tellClients({ type: "OFFLINE_ERROR" });
    throw failure;
  }
  await tellClients({ type: repair ? "OFFLINE_READY" : "OFFLINE_DOWNLOADED", total: ASSETS.length });
  // Activation is requested at a safe screen or explicitly from the refresh page.
}

self.addEventListener("install", event => event.waitUntil(installOffline()));

self.addEventListener("activate", event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(key => key.startsWith(CACHE_PREFIX) && key !== CACHE_NAME).map(key => caches.delete(key)));
    await self.clients.claim();
    await tellClients({ type: "OFFLINE_READY", total: ASSETS.length });
  })());
});

async function rangeResponse(response, range) {
  const match = /^bytes=(\d*)-(\d*)$/.exec(range || "");
  // Unsupported multipart/invalid ranges may be ignored with a full 200 response.
  if (!match || (!match[1] && !match[2])) return response;
  const data = await response.arrayBuffer();
  const length = data.byteLength;
  const start = match[1] ? Number(match[1]) : Math.max(0, length - Number(match[2]));
  const end = match[1] && match[2] ? Math.min(Number(match[2]), length - 1) : length - 1;
  if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start > end || start >= length || (!match[1] && Number(match[2]) === 0)) {
    return new Response(null, { status: 416, headers: { "Content-Range": `bytes */${length}` } });
  }
  const headers = new Headers(response.headers);
  headers.delete("Content-Encoding");
  headers.set("Content-Range", `bytes ${start}-${end}/${length}`);
  headers.set("Content-Length", String(end - start + 1));
  headers.set("Accept-Ranges", "bytes");
  return new Response(data.slice(start, end + 1), { status: 206, headers });
}

// Keep a single full download alive while media elements request byte ranges.
// Each listener can start playing before verification/storage of the full MP3.
function streamingRangeResponse(response, range, length) {
  const match = /^bytes=(\d*)-(\d*)$/.exec(range || '');
  if (!match || (!match[1] && !match[2])) return response;
  if (!response.body) return response;
  if (!Number.isSafeInteger(length) || length <= 0) return rangeResponse(response, range);
  const start = match[1] ? Number(match[1]) : Math.max(0, length - Number(match[2]));
  const end = match[1] && match[2] ? Math.min(Number(match[2]), length - 1) : length - 1;
  if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start > end || start >= length || (!match[1] && Number(match[2]) === 0)) {
    void response.body?.cancel().catch(() => {});
    return new Response(null, { status: 416, headers: { 'Content-Range': `bytes */${length}` } });
  }
  const headers = new Headers(response.headers);
  headers.delete('Content-Encoding');
  headers.set('Content-Range', `bytes ${start}-${end}/${length}`);
  headers.set('Content-Length', String(end - start + 1));
  headers.set('Accept-Ranges', 'bytes');
  const reader = response.body.getReader();
  let offset = 0, cancelled = false;
  const cancel = () => { cancelled = true; void reader.cancel().catch(() => {}); };
  const body = new ReadableStream({
    async pull(controller) {
      try {
        while (offset <= end && !cancelled) {
          const { value, done } = await reader.read();
          if (cancelled) return;
          if (done) { controller.error(new Error('Incomplete audio range')); return; }
          const from = Math.max(0, start - offset), to = Math.min(value.length, end + 1 - offset);
          offset += value.length;
          if (to > from) controller.enqueue(value.slice(from, to));
          if (offset > end) { controller.close(); cancel(); return; }
          if (to > from) return;
        }
      } catch (error) { if (!cancelled) controller.error(error); }
    },
    cancel,
  });
  return new Response(body, { status: 206, headers });
}

function downloadAudiobook(asset, url) {
  if (audiobookDownloads.has(url)) return audiobookDownloads.get(url);
  const abort = new AbortController();
  const timer = setTimeout(() => abort.abort(), 120000);
  const ready = fetch(new Request(url, { cache: 'reload', credentials: 'same-origin', signal: abort.signal }))
    .then(response => {
      if (response.status !== 200) throw new Error('Audio download failed');
      return response;
    });
  const done = (async () => {
    await tellClients({ type: 'AUDIOBOOK_SAVING', file: asset.file, sha256: asset.sha256 });
    try {
      const response = await ready;
      const bytes = await response.clone().arrayBuffer();
      const digest = await crypto.subtle.digest('SHA-256', bytes);
      const hash = Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');
      if (hash !== asset.sha256) throw new Error('Incomplete audio download');
      const cache = await caches.open(AUDIOBOOK_CACHE_NAME);
      const headers = new Headers(response.headers);
      headers.delete('Content-Encoding');
      headers.set('Content-Length', String(bytes.byteLength));
      await cache.put(url, new Response(bytes, { headers }));
      // An older worker finishing late must not delete a newer recording.
      if ((await caches.keys()).includes(CACHE_NAME)) {
        const pathname = new URL(url).pathname;
        for (const key of await cache.keys()) {
          if (new URL(key.url).pathname === pathname && key.url !== url) await cache.delete(key);
        }
      }
      await tellClients({ type: 'AUDIOBOOK_SAVED', file: asset.file, sha256: asset.sha256 });
    } catch {
      await tellClients({ type: 'AUDIOBOOK_SAVE_ERROR', file: asset.file, sha256: asset.sha256 });
    } finally {
      clearTimeout(timer);
      // Cancel unused tees without waiting for the listener's stream to finish.
      void ready.then(response => response.body?.cancel()).catch(() => {});
      audiobookDownloads.delete(url);
    }
  })();
  const download = { ready, done };
  audiobookDownloads.set(url, download);
  return download;
}

async function serveAudiobook(event, asset, url) {
  let cached;
  try { cached = await (await caches.open(AUDIOBOOK_CACHE_NAME)).match(url); } catch { /* Playback can still use the network. */ }
  const range = event.request.headers.get('Range');
  if (cached) return range ? rangeResponse(cached, range) : cached;
  const download = downloadAudiobook(asset, url);
  event.waitUntil(download.done);
  let response;
  try { response = (await download.ready).clone(); }
  catch { return new Response(null, { status: 503 }); }
  const length = response.headers.has('Content-Encoding') ? asset.bytes : Number(response.headers.get('Content-Length')) || asset.bytes;
  return range ? streamingRangeResponse(response, range, length) : response;
}

async function serveOffline(request, key) {
  const cache = await caches.open(CACHE_NAME);
  const response = await cache.match(key);
  if (!response) return fetch(request);
  return request.headers.has("Range") ? rangeResponse(response, request.headers.get("Range")) : response;
}

self.addEventListener("fetch", event => {
  if (event.request.method !== "GET") return;
  const url = new URL(event.request.url);
  if (url.origin !== SCOPE.origin) return;
  const key = url.origin + url.pathname;
  if (key === REFRESH_URL) {
    // A recovery page must bypass both the offline cache and HTTP cache.
    event.respondWith(fetch(event.request, { cache: "no-store" }));
    return;
  }
  const audiobook = AUDIOBOOK_ASSETS.get(key);
  // A page with an older catalogue must never receive a different recording
  // under its old fingerprint (captions and bookmarks belong to that audio).
  if (audiobook && url.searchParams.get('v') === audiobook.sha256) {
    event.respondWith(serveAudiobook(event, audiobook, url.href));
    return;
  }
  const isHome = event.request.mode === "navigate" && (key === SCOPE.href || key === INDEX_URL);
  if (isHome || ASSET_URLS.has(key)) {
    event.respondWith(serveOffline(event.request, isHome ? INDEX_URL : key));
  }
});

let repairInFlight;
self.addEventListener("message", event => {
  if (event.data?.type === "REPAIR_OFFLINE") {
    repairInFlight ||= installOffline(true).finally(() => { repairInFlight = null; });
    event.waitUntil(repairInFlight);
  }
  if (event.data?.type === "OFFLINE_STATUS") {
    event.waitUntil((async () => {
      const cache = await caches.open(CACHE_NAME);
      const complete = (await cache.keys()).length === ASSETS.length;
      event.source?.postMessage({ type: complete ? "OFFLINE_READY" : "OFFLINE_INCOMPLETE", version: CACHE_VERSION, total: ASSETS.length });
    })());
  }
  if (event.data?.type === "ACTIVATE_UPDATE") {
    event.waitUntil((async () => {
      const clients = (await self.clients.matchAll({ type: "window", includeUncontrolled: true })).filter(client => client.url.startsWith(SCOPE.href));
      const sourceClient = event.source?.id && clients.find(client => client.id === event.source.id);
      if (!sourceClient) return;
      const isRefreshPage = value => {
        try {
          const url = new URL(value);
          return url.origin + url.pathname === REFRESH_URL;
        } catch { return false; }
      };
      const manualRefresh = event.data.manual === true && isRefreshPage(sourceClient.url) && isRefreshPage(event.source.url);
      if (!manualRefresh && clients.some(client => client.id !== sourceClient.id)) {
        event.source?.postMessage({ type: "UPDATE_CLOSE_WINDOWS" });
        return;
      }
      await self.skipWaiting();
    })());
  }
});
