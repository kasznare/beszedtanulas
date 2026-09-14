/* CACHE_VERSION and ASSETS are supplied by scripts/build-offline.mjs. */
const SCOPE = new URL(self.registration.scope);
const CACHE_PREFIX = `beszedtanulas:${SCOPE.href}:`;
const CACHE_NAME = CACHE_PREFIX + CACHE_VERSION;
const INDEX_URL = new URL("index.html", SCOPE).href;
const ASSET_URLS = new Set(ASSETS.map(asset => new URL(asset.file, SCOPE).href));

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
  // Updates wait until all existing windows close or a parent requests activation.
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
      if (clients.some(client => client.id !== event.source?.id)) {
        event.source?.postMessage({ type: "UPDATE_CLOSE_WINDOWS" });
        return;
      }
      await self.skipWaiting();
    })());
  }
});
