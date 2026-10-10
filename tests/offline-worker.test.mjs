import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash, webcrypto } from 'node:crypto';
import vm from 'node:vm';

const runtime = await readFile(new URL('../service-worker-runtime.js', import.meta.url), 'utf8');
const scope = 'https://game.test/child/';
const prefix = `beszedtanulas:${scope}:`;
const content = { 'index.html': '<h1>Játék</h1>', 'audio/word.mp3': '0123456789' };

test('game activation preserves separately downloaded audiobooks', async () => {
  const h = harness();
  const audiobookCache = `beszedtanulas-audiobooks:${scope}:v1`;
  h.stores.set(audiobookCache, new Map([['story-01', new Response('saved story')]]));
  h.stores.set(prefix + 'old', new Map());
  await h.emit('install'); await h.emit('activate');
  assert.equal(await h.stores.get(audiobookCache).get('story-01').text(), 'saved story');
  assert.equal(h.stores.has(prefix + 'old'), false);
});

function harness({ includeRefresh = false } = {}) {
  const stores = new Map();
  const listeners = new Map();
  const messages = [];
  const network = [];
  const networkOptions = [];
  const resourceContent = { ...content, 'refresh.html': '<h1>Latest refresh page</h1>' };
  const assets = includeRefresh ? resourceContent : content;
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
        put: async (key, response) => { store.set(typeof key === 'string' ? key : key.url, response.clone()); },
        keys: async () => [...store.keys()],
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
    return new Response(changed.has(file) ? 'unexpected bytes' : resourceContent[file], {headers:{'Content-Type':file.endsWith('.mp3')?'audio/mpeg':'text/html'}});
  };
  vm.runInNewContext(runtime, {
    CACHE_VERSION: 'new',
    ASSETS: Object.entries(assets).map(([file, text]) => ({file, sha256:createHash('sha256').update(text).digest('hex')})),
    self: {
      registration: {scope},
      clients: {matchAll:async()=>clients, claim:async()=>{claimed++;}},
      skipWaiting: async()=>{skipped++;},
      addEventListener: (type, handler)=>listeners.set(type,handler),
    },
    caches: cacheApi, fetch, crypto:webcrypto, URL, Request, Response, Headers, Uint8Array, AbortController, setTimeout, clearTimeout,
  });
  const emit = (type, extras={}) => {
    let pending;
    listeners.get(type)({ ...extras, waitUntil:promise=>{pending=promise;}, respondWith:promise=>{pending=promise;} });
    return pending;
  };
  return { stores, messages, network, networkOptions, emit, cacheApi,
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
