import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash, webcrypto } from 'node:crypto';
import vm from 'node:vm';

const runtime = await readFile(new URL('../service-worker-runtime.js', import.meta.url), 'utf8');
const scope = 'https://game.test/child/';
const prefix = `beszedtanulas:${scope}:`;
const content = { 'index.html': '<h1>Játék</h1>', 'audio/word.mp3': '0123456789' };
const bookCache = `beszedtanulas-audiobooks:${scope}:v1`;
const bookUrl = h => scope + h.audiobook.file + '?v=' + h.audiobook.sha256;

test('range playback starts before completion and concurrent listeners share one verified download', async () => {
  const h = harness({ includeAudiobook: true });
  await h.emit('install'); h.network.length = 0;
  let tail;
  h.networkOverride(() => new Response(new ReadableStream({ start(controller) {
    controller.enqueue(new TextEncoder().encode('0123'));
    tail = () => { controller.enqueue(new TextEncoder().encode('456789')); controller.close(); };
  } }), { headers: { 'Content-Type': 'audio/mpeg', 'Content-Length': '10' } }));
  const first = await h.request(bookUrl(h), { Range: 'bytes=0-1' });
  assert.equal(first.status, 206); assert.equal(await first.text(), '01');
  assert.equal(h.stores.get(bookCache).size, 0, 'Incomplete audio cannot be marked saved');
  const second = await h.request(bookUrl(h), { Range: 'bytes=4-' });
  const full = await h.request(bookUrl(h));
  tail();
  assert.equal(await second.text(), '456789'); assert.equal(await full.text(), '0123456789');
  await h.finish();
  assert.deepEqual(h.network, [h.audiobook.file]);
  assert.equal(await h.stores.get(bookCache).get(bookUrl(h)).clone().text(), '0123456789');
  assert.equal(h.messages.at(-1).type, 'AUDIOBOOK_SAVED');
  h.offline(true);
  const replay = await h.request(bookUrl(h), { Range: 'bytes=-3' });
  assert.equal(await replay.text(), '789'); assert.equal(h.network.length, 1);
});

test('a corrupt updated recording preserves the old copy; a verified retry replaces it', async () => {
  const h = harness({ includeAudiobook: true });
  await h.emit('install'); h.network.length = 0;
  const oldUrl = scope + h.audiobook.file + '?v=old';
  h.stores.set(bookCache, new Map([[oldUrl, new Response('previous recording')]]));
  h.change([h.audiobook.file]);
  const invalid = await h.request(bookUrl(h)); await invalid.text(); await h.finish();
  assert.equal(h.stores.get(bookCache).size, 1);
  assert.equal(await h.stores.get(bookCache).get(oldUrl).clone().text(), 'previous recording');
  assert.equal(h.messages.at(-1).type, 'AUDIOBOOK_SAVE_ERROR');
  h.change([]);
  const valid = await h.request(bookUrl(h)); await valid.text(); await h.finish();
  assert.equal(h.stores.get(bookCache).size, 1);
  assert.ok(h.stores.get(bookCache).has(bookUrl(h)));
  await h.emit('activate'); h.offline(true);
  assert.equal(await (await h.request(bookUrl(h))).text(), '0123456789');
});

test('a storage failure leaves streaming available and never reports an offline save', async () => {
  const h = harness({ includeAudiobook: true });
  await h.emit('install'); h.storageFailure(bookCache);
  assert.equal(await (await h.request(bookUrl(h), { Range: 'bytes=0-2' })).text(), '012');
  await h.finish();
  assert.equal(h.messages.at(-1).type, 'AUDIOBOOK_SAVE_ERROR');
  assert.equal(h.stores.get(bookCache).size, 0);
});

test('an older worker finishing late cannot delete the newer verified recording', async () => {
  const old = harness({ includeAudiobook: true, version: 'old' });
  await old.emit('install');
  let finishOld;
  old.networkOverride(() => new Response(new ReadableStream({ start(controller) {
    controller.enqueue(new TextEncoder().encode('0123'));
    finishOld = () => { controller.enqueue(new TextEncoder().encode('456789')); controller.close(); };
  } }), { headers: { 'Content-Length': '10' } }));
  assert.equal(await (await old.request(bookUrl(old), { Range: 'bytes=0-1' })).text(), '01');
  const current = harness({ includeAudiobook: true, audiobookText: 'abcdefghij', sharedStores: old.stores });
  await current.emit('install'); await current.emit('activate');
  assert.equal(await (await current.request(bookUrl(current))).text(), 'abcdefghij'); await current.finish();
  finishOld(); await old.finish();
  assert.equal(await current.stores.get(bookCache).get(bookUrl(current)).clone().text(), 'abcdefghij');
  assert.ok(!current.stores.has(prefix + 'old'));
  assert.equal(current.request(bookUrl(old)), undefined, 'An old hash is never served the new recording');
});

test('game activation preserves separately downloaded audiobooks', async () => {
  const h = harness();
  const audiobookCache = `beszedtanulas-audiobooks:${scope}:v1`;
  h.stores.set(audiobookCache, new Map([['story-01', new Response('saved story')]]));
  h.stores.set(prefix + 'old', new Map());
  await h.emit('install'); await h.emit('activate');
  assert.equal(await h.stores.get(audiobookCache).get('story-01').text(), 'saved story');
  assert.equal(h.stores.has(prefix + 'old'), false);
});

function harness({ includeRefresh = false, includeAudiobook = false, audiobookText = '0123456789', version = 'new', sharedStores } = {}) {
  const stores = sharedStores || new Map();
  const listeners = new Map();
  const messages = [];
  const network = [];
  const networkOptions = [];
  const audiobook = { file: 'audio/audiobooks/test.mp3', sha256: createHash('sha256').update(audiobookText).digest('hex'), bytes: audiobookText.length };
  const resourceContent = { ...content, 'refresh.html': '<h1>Latest refresh page</h1>', [audiobook.file]: audiobookText };
  const assets = includeRefresh ? { ...content, 'refresh.html': resourceContent['refresh.html'] } : content;
  const lifetimes = new Set();
  let networkOverride;
  let storageFailure;
  let offline = false;
  let failures = new Set();
  let changed = new Set();
  let clients = [{ id: 'parent', url: scope, postMessage: message => messages.push(message) }];
  let claimed = 0, skipped = 0;
  const cacheApi = {
    async open(name) {
      if (!stores.has(name)) stores.set(name, new Map());
      const store = stores.get(name);
      return {
        match: async key => store.get(typeof key === 'string' ? key : key.url)?.clone(),
        put: async (key, response) => { if (storageFailure === name) throw Error('QuotaExceededError'); store.set(typeof key === 'string' ? key : key.url, response.clone()); },
        keys: async () => [...store.keys()].map(url => ({ url })),
        delete: async key => store.delete(typeof key === 'string' ? key : key.url),
      };
    },
    keys: async () => [...stores.keys()],
    delete: async name => stores.delete(name),
  };
  const fetch = async (request, options) => {
    const file = new URL(request.url).pathname.replace('/child/', '');
    network.push(file);
    networkOptions.push({ url: request.url, cache: options?.cache || request.cache });
    if (offline) throw new Error('network offline');
    if (failures.has(file)) return new Response('unavailable', {status:503});
    if (networkOverride && file === audiobook.file) return networkOverride();
    return new Response(changed.has(file) ? 'unexpected bytes' : resourceContent[file], {headers:{'Content-Type':file.endsWith('.mp3')?'audio/mpeg':'text/html'}});
  };
  vm.runInNewContext(runtime, {
    CACHE_VERSION: version,
    OPTIONAL_ASSETS: includeAudiobook ? [audiobook] : [],
    ASSETS: Object.entries(assets).map(([file, text]) => ({file, sha256:createHash('sha256').update(text).digest('hex')})),
    self: {
      registration: {scope},
      clients: {matchAll:async()=>clients, claim:async()=>{claimed++;}},
      skipWaiting: async()=>{skipped++;},
      addEventListener: (type, handler)=>listeners.set(type,handler),
    },
    caches: cacheApi, fetch, crypto:webcrypto, URL, Request, Response, Headers, ReadableStream, Uint8Array, AbortController, setTimeout, clearTimeout,
  });
  const emit = (type, extras={}) => {
    let pending;
    listeners.get(type)({ ...extras, waitUntil:promise=>{
      pending ||= promise; lifetimes.add(promise);
      promise.then(() => lifetimes.delete(promise), () => lifetimes.delete(promise));
    }, respondWith:promise=>{pending=promise;} });
    return pending;
  };
  return { stores, messages, network, networkOptions, emit, cacheApi, audiobook,
    finish: async () => { while (lifetimes.size) await Promise.all([...lifetimes]); },
    networkOverride: value => { networkOverride = value; },
    storageFailure: value => { storageFailure = value; },
    fail:files=>{failures=new Set(files);}, change:files=>{changed=new Set(files);},
    clients:value=>{clients=value;}, skipped:()=>skipped, claimed:()=>claimed,
    offline:value=>{offline=value;},
    request:(url,headers={},mode='cors')=>emit('fetch',{request:{url,method:'GET',mode,headers:new Headers(headers)}}),
  };
}

test('a complete install waits; activation only removes this game’s previous caches', async () => {
  const h=harness();
  await h.cacheApi.open(prefix+'old');
  await h.cacheApi.open('another-game');
  await h.emit('install');
  assert.equal(h.stores.get(prefix+'new').size,2);
  assert.equal(h.skipped(),0);
  assert.ok(h.stores.has(prefix+'old'));
  await h.emit('activate');
  assert.equal(h.claimed(),1);
  assert.ok(!h.stores.has(prefix+'old'));
  assert.ok(h.stores.has('another-game'));
});

test('a failed download cannot replace or damage the previous offline game', async () => {
  const h=harness();
  await h.cacheApi.open(prefix+'old');
  h.fail(['audio/word.mp3']);
  await assert.rejects(h.emit('install'));
  assert.ok(!h.stores.has(prefix+'new'));
  assert.ok(h.stores.has(prefix+'old'));
  assert.equal(h.messages.at(-1).type,'OFFLINE_ERROR');
  h.fail([]);
  await h.emit('install');
  assert.equal(h.stores.get(prefix+'new').size,2);
});

test('a 200 response with stale or mixed-version bytes is rejected', async () => {
  const h=harness();
  h.change(['index.html']);
  await assert.rejects(h.emit('install'));
  assert.ok(!h.stores.has(prefix+'new'));
});

test('cached navigation and audio work without a network request', async () => {
  const h=harness();
  await h.emit('install');
  h.network.length=0;
  assert.equal(await (await h.request(scope+'?from=home',{},'navigate')).text(),content['index.html']);
  assert.equal(await (await h.request(scope+'audio/word.mp3')).text(),'0123456789');
  assert.equal(h.network.length,0);
  assert.equal(h.request('https://project.supabase.co/rest/v1/profiles'),undefined);
  assert.equal(h.request(scope+'private-data.json'),undefined);
});

test('cached audio handles the byte ranges used by media playback', async () => {
  const h=harness();
  await h.emit('install');
  for (const [range, expected, contentRange] of [
    ['bytes=0-2','012','bytes 0-2/10'], ['bytes=7-','789','bytes 7-9/10'],
    ['bytes=-3','789','bytes 7-9/10'], ['bytes=8-100','89','bytes 8-9/10'],
  ]) {
    const response=await h.request(scope+'audio/word.mp3',{Range:range});
    assert.equal(response.status,206);
    assert.equal(response.headers.get('Content-Range'),contentRange);
    assert.equal(response.headers.get('Content-Length'),String(expected.length));
    assert.equal(await response.text(),expected);
  }
  for (const range of ['bytes=10-','bytes=4-2','bytes=-0']) {
    const response=await h.request(scope+'audio/word.mp3',{Range:range});
    assert.equal(response.status,416);
    assert.equal(response.headers.get('Content-Range'),'bytes */10');
  }
  assert.equal((await h.request(scope+'audio/word.mp3',{Range:'bytes=0-2,5-7'})).status,200);
});

test('a missing cached file can be repaired; failed repair preserves the remaining files', async () => {
  const h=harness();
  await h.emit('install');
  h.stores.get(prefix+'new').delete(scope+'audio/word.mp3');
  h.fail(['audio/word.mp3']);
  await assert.rejects(h.emit('message',{data:{type:'REPAIR_OFFLINE'}}));
  assert.equal(h.stores.get(prefix+'new').size,1);
  h.fail([]);
  await h.emit('message',{data:{type:'REPAIR_OFFLINE'}});
  assert.equal(h.stores.get(prefix+'new').size,2);
  assert.equal(h.messages.at(-1).type,'OFFLINE_READY');
});

test('a parent cannot activate an update while another game window is open', async () => {
  const h=harness();
  const replies=[];
  const source={id:'parent',postMessage:message=>replies.push(message)};
  h.clients([{id:'parent',url:scope},{id:'child',url:scope}]);
  await h.emit('message',{data:{type:'ACTIVATE_UPDATE'},source});
  assert.equal(h.skipped(),0);
  assert.equal(replies[0].type,'UPDATE_CLOSE_WINDOWS');
  h.clients([{id:'parent',url:scope}]);
  await h.emit('message',{data:{type:'ACTIVATE_UPDATE'},source});
  assert.equal(h.skipped(),1);
});

test('the listed exact refresh page can explicitly activate despite another same-scope window', async () => {
  const h = harness();
  await h.emit('install');
  const replies = [];
  const source = { id: 'refresh', url: scope + 'refresh.html?reload=1', postMessage: message => replies.push(message) };
  h.clients([{ id: 'refresh', url: source.url }, { id: 'game', url: scope }]);
  await h.emit('message', { data: { type: 'ACTIVATE_UPDATE', manual: true }, source });
  assert.equal(h.skipped(), 1);
  assert.equal(replies.length, 0);
});

test('manual payloads do not bypass the guard for home, similar paths or unlisted clients', async () => {
  for (const url of [scope, scope + 'refresh.html/extra', scope + 'nested/refresh.html', 'https://other.test/child/refresh.html']) {
    const h = harness();
    const replies = [];
    // The actual clients list, rather than a claimed source URL, establishes identity.
    const source = { id: 'requester', url: scope + 'refresh.html', postMessage: message => replies.push(message) };
    h.clients([{ id: source.id, url }, { id: 'game', url: scope }]);
    await h.emit('message', { data: { type: 'ACTIVATE_UPDATE', manual: true }, source });
    assert.equal(h.skipped(), 0, url);
    if (url.startsWith(scope)) assert.equal(replies[0].type, 'UPDATE_CLOSE_WINDOWS');
  }
  const h = harness();
  h.clients([{ id: 'game', url: scope }]);
  await h.emit('message', { data: { type: 'ACTIVATE_UPDATE', manual: true }, source: { id: 'unlisted', url: scope + 'refresh.html' } });
  assert.equal(h.skipped(), 0);
});

test('a missing source cannot activate even when no windows remain', async () => {
  const h = harness();
  h.clients([]);
  for (const manual of [false, true]) {
    await h.emit('message', { data: { type: 'ACTIVATE_UPDATE', manual } });
    assert.equal(h.skipped(), 0);
  }
});

test('manual activation also requires the message source URL itself to be the refresh page', async () => {
  const h = harness();
  const replies = [];
  h.clients([{ id: 'refresh', url: scope + 'refresh.html' }, { id: 'game', url: scope }]);
  for (const url of [undefined, scope, scope + 'refresh.html/other', 'not a URL']) {
    const source = { id: 'refresh', url, postMessage: message => replies.push(message) };
    await h.emit('message', { data: { type: 'ACTIVATE_UPDATE', manual: true }, source });
    assert.equal(h.skipped(), 0);
    assert.equal(replies.at(-1).type, 'UPDATE_CLOSE_WINDOWS');
  }
});

test('automatic refresh-page requests and nonboolean manual flags preserve the other-window guard', async () => {
  const h = harness();
  const replies = [];
  const source = { id: 'refresh', postMessage: message => replies.push(message) };
  h.clients([{ id: source.id, url: scope + 'refresh.html' }, { id: 'game', url: scope }]);
  for (const manual of [undefined, false, 'true', 1]) {
    await h.emit('message', { data: { type: 'ACTIVATE_UPDATE', manual }, source });
    assert.equal(h.skipped(), 0);
    assert.equal(replies.at(-1).type, 'UPDATE_CLOSE_WINDOWS');
  }
});

test('refresh page always uses the network with no-store even when its receipt is cached', async () => {
  const h = harness({ includeRefresh: true });
  await h.emit('install');
  const cache = await h.cacheApi.open(prefix + 'new');
  await cache.put(scope + 'refresh.html', new Response('stale refresh page'));
  h.network.length = 0;
  h.networkOptions.length = 0;
  const response = await h.request(scope + 'refresh.html?check=latest', {}, 'navigate');
  assert.equal(await response.text(), '<h1>Latest refresh page</h1>');
  assert.deepEqual(h.network, ['refresh.html']);
  assert.deepEqual(h.networkOptions, [{ url: scope + 'refresh.html?check=latest', cache: 'no-store' }]);
  assert.equal(await (await cache.match(scope + 'refresh.html')).text(), 'stale refresh page');
  // Ordinary game navigation still serves the complete offline package.
  assert.equal(await (await h.request(scope, {}, 'navigate')).text(), content['index.html']);
  assert.equal(h.network.length, 1);
  h.offline(true);
  await assert.rejects(h.request(scope + 'refresh.html', {}, 'navigate'), /network offline/);
  assert.equal(await (await h.request(scope, {}, 'navigate')).text(), content['index.html']);
});
