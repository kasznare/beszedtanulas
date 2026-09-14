import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash, webcrypto } from 'node:crypto';
import vm from 'node:vm';

const runtime = await readFile(new URL('../service-worker-runtime.js', import.meta.url), 'utf8');
const scope = 'https://game.test/child/';
const prefix = `beszedtanulas:${scope}:`;
const content = { 'index.html': '<h1>Játék</h1>', 'audio/word.mp3': '0123456789' };

function harness() {
  const stores = new Map();
  const listeners = new Map();
  const messages = [];
  const network = [];
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
  const fetch = async request => {
    const file = new URL(request.url).pathname.replace('/child/', '');
    network.push(file);
    if (failures.has(file)) return new Response('unavailable', {status:503});
    return new Response(changed.has(file) ? 'unexpected bytes' : content[file], {headers:{'Content-Type':file.endsWith('.mp3')?'audio/mpeg':'text/html'}});
  };
  vm.runInNewContext(runtime, {
    CACHE_VERSION: 'new',
    ASSETS: Object.entries(content).map(([file, text]) => ({file, sha256:createHash('sha256').update(text).digest('hex')})),
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
  return { stores, messages, network, emit, cacheApi,
    fail:files=>{failures=new Set(files);}, change:files=>{changed=new Set(files);},
    clients:value=>{clients=value;}, skipped:()=>skipped, claimed:()=>claimed,
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
