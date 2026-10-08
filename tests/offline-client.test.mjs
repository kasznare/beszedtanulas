import test from 'node:test';
import assert from 'node:assert/strict';
import { setupOffline } from '../offline-client.js';

class Events {
  handlers = new Map();
  addEventListener(type, handler) {
    const handlers = this.handlers.get(type) || [];
    handlers.push(handler);
    this.handlers.set(type, handlers);
  }
  emit(type, event = {}) {
    return Promise.all((this.handlers.get(type) || []).map(handler => handler(event)));
  }
}

function worker(state = 'installed') {
  const result = new Events();
  result.state = state;
  result.messages = [];
  result.postMessage = message => result.messages.push(message);
  return result;
}

const flush = () => new Promise(resolve => setImmediate(resolve));

function harness(t, { supported = true, controlled = true, homeElement = true, safe = true } = {}) {
  const elements = Object.fromEntries(['offline-status', 'offline-progress', 'offline-retry', 'offline-update', 'install-game', ...(homeElement ? ['home-update-status'] : [])].map(id => [id, Object.assign(new Events(), { hidden: true, disabled: false, textContent: '' })]));
  const doc = Object.assign(new Events(), { visibilityState: 'visible', querySelector: selector => elements[selector.slice(1)] || null });
  const timers = [];
  const win = Object.assign(new Events(), { isSecureContext: true,
    setTimeout: (callback, delay) => { const timer = { callback, delay }; timers.push(timer); return timer; },
    clearTimeout: timer => { const index = timers.indexOf(timer); if (index !== -1) timers.splice(index, 1); },
  });
  const sw = Object.assign(new Events(), { controller: controlled ? worker('activated') : null });
  const registration = Object.assign(new Events(), { active: sw.controller, waiting: null, installing: null });
  const state = { safe, dialog: false, now: 100_000, registered: 0, updated: 0, reloads: 0, beforeReloads: 0, clears: 0, failRegister: false, failUpdate: false, updatePending: null };
  registration.update = async () => {
    state.updated++;
    if (state.failUpdate) throw new Error('network unavailable');
    if (state.updatePending) await state.updatePending;
  };
  sw.register = async (url, options) => {
    state.registered++;
    assert.equal(url.pathname.endsWith('/sw.js'), true);
    assert.deepEqual(options, { updateViaCache: 'none' });
    if (state.failRegister) throw new Error('register failed');
    return registration;
  };
  const nav = { onLine: true, ...(supported ? { serviceWorker: sw } : {}) };
  const NativeDate = globalThis.Date;
  class Clock extends NativeDate { static now() { return state.now; } }
  const replacements = { document: doc, window: win, navigator: nav, location: { reload: () => state.reloads++ }, Date: Clock, localStorage: { clear: () => state.clears++ } };
  const descriptors = Object.fromEntries(Object.keys(replacements).map(key => [key, Object.getOwnPropertyDescriptor(globalThis, key)]));
  for (const [key, value] of Object.entries(replacements)) Object.defineProperty(globalThis, key, { configurable: true, writable: true, value });
  t.after(() => {
    for (const [key, descriptor] of Object.entries(descriptors)) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor);
      else delete globalThis[key];
    }
  });
  const api = setupOffline({ beforeReload: () => state.beforeReloads++, isSafeToReload: () => {
    if (state.throwSafe) throw new Error('screen not ready');
    return state.safe && !state.dialog;
  } });
  return { elements, doc, win, sw, registration, state, nav, timers, api,
    async boot() { assert.equal(timers[0].delay, 300); timers.shift().callback(); await flush(); },
    async runRetry() { assert.equal(timers[0].delay, 1_000); timers.shift().callback(); await flush(); },
    async message(type, extras = {}) { await sw.emit('message', { data: { type, ...extras } }); await flush(); },
    async control(next = worker('activated')) { sw.controller = next; await sw.emit('controllerchange'); await flush(); },
  };
}

test('a complete waiting update activates at home once and reloads without touching saved data', async t => {
  const h = harness(t);
  const next = worker();
  h.registration.waiting = next;
  await h.boot();
  assert.deepEqual(next.messages, [{ type: 'ACTIVATE_UPDATE' }]);
  assert.equal(h.elements['home-update-status'].textContent, 'Új verzió betöltése…');
  await h.api.notifyScreenChange();
  await h.win.emit('focus');
  assert.equal(next.messages.length, 1);
  await h.control(next);
  await h.control(next);
  await h.api.notifyScreenChange();
  assert.equal(h.state.reloads, 1);
  assert.equal(h.state.beforeReloads, 1);
  assert.equal(h.state.clears, 0);
});

test('partial download and the old worker’s status cannot activate or hide an installing update', async t => {
  const h = harness(t);
  await h.boot();
  const next = worker('installing');
  h.registration.installing = next;
  await h.registration.emit('updatefound');
  await h.message('OFFLINE_PROGRESS', { completed: 1, total: 20 });
  await h.message('OFFLINE_READY');
  assert.equal(h.elements['offline-progress'].hidden, false);
  assert.equal(h.elements['home-update-status'].textContent, 'Új verzió letöltése: 1 / 20');
  await h.message('OFFLINE_DOWNLOADED');
  assert.equal(next.messages.length, 0);
  h.registration.installing = null;
  h.registration.waiting = next;
  next.state = 'installed';
  await next.emit('statechange');
  assert.deepEqual(next.messages, [{ type: 'ACTIVATE_UPDATE' }]);
});

test('games, open dialogs and hidden tabs defer activation; returning home ignores network throttling', async t => {
  const h = harness(t, { safe: false });
  const next = worker();
  h.registration.waiting = next;
  await h.boot();
  await h.message('OFFLINE_DOWNLOADED');
  assert.equal(next.messages.length, 0);
  h.state.safe = true;
  h.state.dialog = true;
  await h.api.notifyScreenChange();
  assert.equal(next.messages.length, 0);
  h.state.dialog = false;
  h.doc.visibilityState = 'hidden';
  await h.api.notifyScreenChange();
  assert.equal(next.messages.length, 0);
  h.doc.visibilityState = 'visible';
  await h.api.notifyScreenChange();
  assert.equal(next.messages.length, 1);
  assert.equal(h.state.updated, 0);
});

test('controller changes during a game defer reload and cleanup until a safe return home', async t => {
  const h = harness(t, { safe: false });
  await h.boot();
  await h.control();
  await h.control();
  assert.equal(h.state.reloads, 0);
  assert.equal(h.state.beforeReloads, 0);
  assert.match(h.elements['home-update-status'].textContent, /főképernyőre/);
  h.state.safe = true;
  h.state.dialog = true;
  await h.api.notifyScreenChange();
  assert.equal(h.state.reloads, 0);
  h.state.dialog = false;
  await h.api.notifyScreenChange();
  await h.api.checkForUpdate({ force: true });
  assert.equal(h.state.reloads, 1);
  assert.equal(h.state.beforeReloads, 1);
});

test('a hidden home tab reloads only when it becomes visible', async t => {
  const h = harness(t);
  await h.boot();
  h.doc.visibilityState = 'hidden';
  await h.control();
  await h.win.emit('focus');
  assert.equal(h.state.reloads, 0);
  h.doc.visibilityState = 'visible';
  await h.doc.emit('visibilitychange');
  assert.equal(h.state.reloads, 1);
});

test('first installation claims the page without an unnecessary reload or home update notice', async t => {
  const h = harness(t, { controlled: false });
  await h.boot();
  await h.message('OFFLINE_PROGRESS', { completed: 1, total: 2 });
  assert.equal(h.elements['home-update-status'].hidden, true);
  const first = worker('activated');
  await h.control(first);
  await h.message('OFFLINE_READY');
  assert.deepEqual(first.messages, [{ type: 'OFFLINE_STATUS' }]);
  assert.equal(h.state.reloads, 0);
  assert.equal(h.elements['home-update-status'].hidden, true);
});

test('another window allows one delayed attempt per event and then stops without a loop', async t => {
  const h = harness(t);
  const next = worker();
  h.registration.waiting = next;
  await h.boot();
  await h.message('UPDATE_CLOSE_WINDOWS');
  assert.equal(next.messages.length, 1);
  assert.match(h.elements['home-update-status'].textContent, /másik ablakát/);
  assert.equal(h.elements['offline-update'].disabled, false);
  await h.message('OFFLINE_READY');
  await h.message('OFFLINE_DOWNLOADED');
  await flush();
  assert.equal(next.messages.length, 1);
  assert.equal(h.timers.length, 1);
  await h.runRetry();
  assert.equal(next.messages.length, 2);
  await h.message('UPDATE_CLOSE_WINDOWS');
  await h.message('OFFLINE_READY');
  await h.message('OFFLINE_DOWNLOADED');
  assert.equal(next.messages.length, 2);
  assert.equal(h.timers.length, 0);
  await h.win.emit('focus');
  assert.equal(next.messages.length, 3);
  await h.message('UPDATE_CLOSE_WINDOWS');
  assert.equal(next.messages.length, 3);
  assert.equal(h.timers.length, 1);
  h.state.safe = false;
  await h.api.notifyScreenChange();
  assert.equal(next.messages.length, 3);
  assert.equal(h.timers.length, 0);
  h.state.safe = true;
  await h.api.notifyScreenChange();
  assert.equal(next.messages.length, 4);
});

test('a briefly stale closed window can clear before the single delayed retry', async t => {
  const h = harness(t);
  const next = worker();
  h.registration.waiting = next;
  await h.boot();
  await h.message('UPDATE_CLOSE_WINDOWS');
  await h.runRetry();
  assert.equal(next.messages.length, 2);
  await h.control(next);
  assert.equal(h.state.reloads, 1);
  assert.equal(h.state.beforeReloads, 1);
  assert.equal(h.timers.length, 0);
});

test('opening a dialog cancels the pending retry and returning home gets a fresh bounded attempt', async t => {
  const h = harness(t);
  const next = worker();
  h.registration.waiting = next;
  await h.boot();
  await h.message('UPDATE_CLOSE_WINDOWS');
  h.state.dialog = true;
  await h.api.notifyScreenChange();
  assert.equal(h.timers.length, 0);
  assert.equal(next.messages.length, 1);
  h.state.dialog = false;
  await h.api.notifyScreenChange();
  await h.message('UPDATE_CLOSE_WINDOWS');
  await h.runRetry();
  await h.message('UPDATE_CLOSE_WINDOWS');
  assert.equal(next.messages.length, 3);
  assert.equal(h.timers.length, 0);
});

test('hidden tabs cancel the pending retry and the delayed callback also rechecks safety', async t => {
  const h = harness(t);
  const next = worker();
  h.registration.waiting = next;
  await h.boot();
  await h.message('UPDATE_CLOSE_WINDOWS');
  h.doc.visibilityState = 'hidden';
  await h.doc.emit('visibilitychange');
  assert.equal(h.timers.length, 0);
  assert.equal(next.messages.length, 1);
  h.doc.visibilityState = 'visible';
  await h.doc.emit('visibilitychange');
  await h.message('UPDATE_CLOSE_WINDOWS');
  h.state.safe = false;
  await h.runRetry();
  assert.equal(next.messages.length, 2);
  assert.equal(h.timers.length, 0);
});

test('controller change and a replacement waiting worker cancel stale delayed attempts', async t => {
  const h = harness(t);
  const old = worker();
  h.registration.waiting = old;
  await h.boot();
  await h.message('UPDATE_CLOSE_WINDOWS');
  assert.equal(h.timers.length, 1);
  const next = worker();
  h.registration.waiting = next;
  await h.message('OFFLINE_DOWNLOADED');
  assert.equal(h.timers.length, 0);
  assert.equal(old.messages.length, 1);
  assert.equal(next.messages.length, 1);
  // This installation event has no retry budget of its own.
  await h.message('UPDATE_CLOSE_WINDOWS');
  assert.equal(h.timers.length, 0);
  await h.win.emit('focus');
  await h.message('UPDATE_CLOSE_WINDOWS');
  assert.equal(h.timers.length, 1);
  h.state.safe = false;
  await h.control(next);
  assert.equal(h.timers.length, 0);
  assert.equal(h.state.reloads, 0);
  h.state.safe = true;
  await h.api.notifyScreenChange();
  assert.equal(h.state.reloads, 1);
});

test('screen, focus, visibility and online checks reuse registration and throttle network updates', async t => {
  const h = harness(t);
  await h.boot();
  await h.api.notifyScreenChange();
  await h.win.emit('focus');
  await h.win.emit('online');
  await h.doc.emit('visibilitychange');
  assert.equal(h.state.registered, 1);
  assert.equal(h.state.updated, 0);
  h.state.now += 60_000;
  await h.win.emit('focus');
  await h.win.emit('online');
  assert.equal(h.state.updated, 1);
  h.state.now += 60_000;
  h.doc.visibilityState = 'hidden';
  await h.win.emit('focus');
  await h.doc.emit('visibilitychange');
  assert.equal(h.state.updated, 1);
  h.doc.visibilityState = 'visible';
  await h.doc.emit('visibilitychange');
  assert.equal(h.state.updated, 2);
  await h.api.checkForUpdate({ force: true });
  assert.equal(h.state.updated, 3);
});

test('overlapping checks share one update and an offline tab does not poll the network', async t => {
  const h = harness(t);
  await h.boot();
  let finish;
  h.state.updatePending = new Promise(resolve => { finish = resolve; });
  h.state.now += 60_000;
  const first = h.api.checkForUpdate();
  const second = h.api.checkForUpdate({ force: true });
  assert.equal(h.state.updated, 1);
  finish();
  await Promise.all([first, second]);
  h.state.updatePending = null;
  h.nav.onLine = false;
  h.state.now += 60_000;
  await h.api.checkForUpdate();
  assert.equal(h.state.updated, 1);
  h.nav.onLine = true;
  await h.win.emit('online');
  assert.equal(h.state.updated, 2);
});

test('reconnecting retries immediately instead of waiting out the last network check', async t => {
  const h = harness(t);
  await h.boot();
  h.nav.onLine = false;
  await h.win.emit('offline');
  await h.api.notifyScreenChange();
  assert.equal(h.state.updated, 0);
  h.nav.onLine = true;
  await h.win.emit('online');
  assert.equal(h.state.updated, 1);
  await h.win.emit('focus');
  assert.equal(h.state.updated, 1);
});

test('update failure retains the old game and a manual retry can force a new check', async t => {
  const h = harness(t);
  await h.boot();
  await h.message('OFFLINE_READY');
  h.state.failUpdate = true;
  await h.api.checkForUpdate({ force: true });
  assert.match(h.elements['offline-status'].textContent, /használható internet nélkül/);
  assert.match(h.elements['home-update-status'].textContent, /korábbi játék tovább használható/);
  assert.equal(h.elements['offline-retry'].disabled, false);
  assert.equal(h.state.reloads, 0);
  assert.equal(h.state.clears, 0);
  h.state.failUpdate = false;
  await h.elements['offline-retry'].emit('click');
  assert.equal(h.state.updated, 2);
  assert.equal(h.elements['home-update-status'].hidden, true);
});

test('a superseded worker becoming redundant cannot hide its newer download', async t => {
  const h = harness(t);
  await h.boot();
  const previous = worker('installing');
  h.registration.installing = previous;
  await h.registration.emit('updatefound');
  const next = worker('installing');
  h.registration.installing = next;
  await h.registration.emit('updatefound');
  await h.message('OFFLINE_PROGRESS', { completed: 3, total: 10 });
  previous.state = 'redundant';
  await previous.emit('statechange');
  assert.equal(h.elements['offline-progress'].hidden, false);
  assert.equal(h.elements['home-update-status'].textContent, 'Új verzió letöltése: 3 / 10');
  next.state = 'redundant';
  h.registration.installing = null;
  await next.emit('statechange');
  assert.equal(h.elements['offline-retry'].hidden, false);
  assert.match(h.elements['home-update-status'].textContent, /korábbi játék tovább használható/);
});

test('incomplete offline files use repair rather than losing the rest of the downloaded game', async t => {
  const h = harness(t);
  await h.boot();
  const active = h.registration.active;
  await h.message('OFFLINE_INCOMPLETE');
  await h.elements['offline-retry'].emit('click');
  assert.deepEqual(active.messages.at(-1), { type: 'REPAIR_OFFLINE' });
  assert.equal(h.elements['offline-retry'].disabled, true);
  await h.message('OFFLINE_READY');
  assert.equal(h.elements['offline-retry'].hidden, true);
  assert.equal(h.state.clears, 0);
});

test('the parent fallback still waits for home and a failing safety callback is conservative', async t => {
  const h = harness(t, { safe: false });
  const next = worker();
  h.registration.waiting = next;
  await h.boot();
  await h.elements['offline-update'].emit('click');
  assert.equal(next.messages.length, 0);
  assert.match(h.elements['offline-status'].textContent, /főképernyőre/);
  h.state.safe = true;
  h.state.throwSafe = true;
  await h.api.notifyScreenChange();
  assert.equal(next.messages.length, 0);
  h.state.throwSafe = false;
  await h.api.notifyScreenChange();
  assert.equal(next.messages.length, 1);
});

test('unsupported service workers and an omitted home status element have safe callable hooks', async t => {
  const h = harness(t, { supported: false, homeElement: false });
  await h.api.notifyScreenChange();
  await h.api.checkForUpdate();
  assert.match(h.elements['offline-status'].textContent, /HTTPS/);
  assert.equal(h.state.registered, 0);
  assert.equal(h.timers.length, 0);
});

test('installation prompt behavior remains independent of automatic updates', async t => {
  const h = harness(t);
  let prevented = 0, prompted = 0;
  await h.win.emit('beforeinstallprompt', { preventDefault: () => prevented++, prompt: async () => prompted++, userChoice: Promise.resolve({ outcome: 'accepted' }) });
  assert.equal(h.elements['install-game'].hidden, false);
  await h.elements['install-game'].emit('click');
  assert.equal(prevented, 1);
  assert.equal(prompted, 1);
  assert.equal(h.elements['install-game'].hidden, true);
});
