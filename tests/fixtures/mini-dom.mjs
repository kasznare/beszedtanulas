// A very small DOM for driving game modules in node:test. It understands the well-formed markup the
// games render (innerHTML and createElement), simple selectors, click bubbling and focus.
const VOID = new Set(['area', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'source', 'track', 'wbr']);
const camelToData = key => `data-${key.replace(/[A-Z]/g, c => `-${c.toLowerCase()}`)}`;
const unescape = text => text.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&');

class Text {
  constructor(text) { this.nodeType = 3; this.textContent = text; this.parentNode = null; }
}

function splitTop(text, separator) {
  const parts = []; let depth = 0, quote = null, current = '';
  for (const char of text) {
    if (quote) { if (char === quote) quote = null; current += char; continue; }
    if (char === '"' || char === "'") quote = char;
    if (char === '(' || char === '[') depth++;
    if (char === ')' || char === ']') depth--;
    if (char === separator && depth === 0) { parts.push(current); current = ''; continue; }
    current += char;
  }
  parts.push(current);
  return parts.map(part => part.trim()).filter(Boolean);
}
function parseCompound(text) {
  const tests = []; let rest = text;
  while (rest) {
    let m;
    if ((m = rest.match(/^[a-zA-Z][\w-]*/))) { const tag = m[0].toLowerCase(); tests.push(el => el.localName === tag); }
    else if ((m = rest.match(/^#([\w-]+)/))) { const id = m[1]; tests.push(el => el.getAttribute('id') === id); }
    else if ((m = rest.match(/^\.([\w-]+)/))) { const name = m[1]; tests.push(el => el.classList.contains(name)); }
    else if ((m = rest.match(/^\[([\w-]+)(?:=(?:"([^"]*)"|'([^']*)'|([^\]]*)))?\]/))) {
      const [, name, a, b, c] = m, value = a ?? b ?? c;
      tests.push(el => el.hasAttribute(name) && (value === undefined || el.getAttribute(name) === value));
    } else if ((m = rest.match(/^:not\((.*?)\)/))) { const inner = parseCompound(m[1]); tests.push(el => !inner(el)); }
    else if ((m = rest.match(/^:disabled/))) tests.push(el => el.disabled);
    else if ((m = rest.match(/^:enabled/))) tests.push(el => !el.disabled);
    else throw new Error(`mini-dom: unsupported selector "${text}"`);
    rest = rest.slice(m[0].length);
  }
  return el => tests.every(t => t(el));
}
function parseComplex(text) {
  const tokens = text.replace(/\s*>\s*/g, ' > ').split(/\s+/);
  const steps = [];
  for (let i = 0; i < tokens.length; i++) {
    if (tokens[i] === '>') continue;
    steps.push({ match: parseCompound(tokens[i]), child: tokens[i - 1] === '>' });
  }
  return el => {
    const matchFrom = (node, index) => {
      if (!steps[index].match(node)) return false;
      if (index === 0) return true;
      let parent = node.parentNode;
      if (steps[index].child) return parent?.nodeType === 1 && matchFrom(parent, index - 1);
      for (; parent && parent.nodeType === 1; parent = parent.parentNode) if (matchFrom(parent, index - 1)) return true;
      return false;
    };
    return matchFrom(el, steps.length - 1);
  };
}
const selectorCache = new Map();
function compile(selector) {
  if (!selectorCache.has(selector)) {
    const list = splitTop(selector, ',').map(parseComplex);
    selectorCache.set(selector, el => list.some(test => test(el)));
  }
  return selectorCache.get(selector);
}

export class Element {
  constructor(tag, document) {
    this.nodeType = 1; this.localName = tag.toLowerCase(); this.tagName = tag.toUpperCase();
    this.ownerDocument = document; this.attributes = new Map(); this.childNodes = []; this.parentNode = null; this.listeners = {};
    const self = this;
    this.dataset = new Proxy({}, {
      get: (_, key) => typeof key === 'string' ? self.getAttribute(camelToData(key)) ?? undefined : undefined,
      set: (_, key, value) => { self.setAttribute(camelToData(key), String(value)); return true; },
      deleteProperty: (_, key) => { self.removeAttribute(camelToData(key)); return true; },
      has: (_, key) => self.hasAttribute(camelToData(key)),
    });
    const props = new Map();
    this.style = { setProperty: (k, v) => props.set(k, String(v)), removeProperty: k => props.delete(k), getPropertyValue: k => props.get(k) ?? '' };
    this.classList = {
      contains: name => (self.getAttribute('class') || '').split(/\s+/).includes(name),
      add: (...names) => { const set = new Set((self.getAttribute('class') || '').split(/\s+/).filter(Boolean)); names.forEach(n => set.add(n)); self.setAttribute('class', [...set].join(' ')); },
      remove: (...names) => { const set = new Set((self.getAttribute('class') || '').split(/\s+/).filter(Boolean)); names.forEach(n => set.delete(n)); self.setAttribute('class', [...set].join(' ')); },
      toggle: (name, force) => { const on = force ?? !self.classList.contains(name); if (on) self.classList.add(name); else self.classList.remove(name); return on; },
    };
  }
  getAttribute(name) { return this.attributes.has(name) ? this.attributes.get(name) : null; }
  setAttribute(name, value) { this.attributes.set(name, String(value)); }
  hasAttribute(name) { return this.attributes.has(name); }
  removeAttribute(name) { this.attributes.delete(name); }
  toggleBool(name, value) { if (value) this.setAttribute(name, ''); else this.removeAttribute(name); }
  get id() { return this.getAttribute('id') || ''; } set id(v) { this.setAttribute('id', v); }
  get className() { return this.getAttribute('class') || ''; } set className(v) { this.setAttribute('class', v); }
  get hidden() { return this.hasAttribute('hidden'); } set hidden(v) { this.toggleBool('hidden', v); }
  get disabled() { return this.hasAttribute('disabled'); } set disabled(v) { this.toggleBool('disabled', v); }
  get open() { return this.hasAttribute('open'); } set open(v) { this.toggleBool('open', v); }
  get type() { return this.getAttribute('type') || ''; } set type(v) { this.setAttribute('type', v); }
  get value() { return this.getAttribute('value') ?? ''; } set value(v) { this.setAttribute('value', v); }
  get tabIndex() { return Number(this.getAttribute('tabindex') ?? -1); } set tabIndex(v) { this.setAttribute('tabindex', v); }
  get children() { return this.childNodes.filter(node => node.nodeType === 1); }
  get firstElementChild() { return this.children[0] || null; }
  get isConnected() { let node = this; while (node.parentNode) node = node.parentNode; return node === this.ownerDocument.documentElement; }
  get textContent() { return this.childNodes.map(node => node.textContent).join(''); }
  set textContent(text) { this.replaceChildren(); if (text !== '' && text != null) this.appendChild(new Text(String(text))); }
  set innerHTML(html) { this.replaceChildren(...parseHTML(String(html), this.ownerDocument)); }
  get innerHTML() { return this.childNodes.map(node => node.nodeType === 3 ? node.textContent : node.outerHTML).join(''); }
  get outerHTML() { const attrs = [...this.attributes].map(([k, v]) => v === '' ? ` ${k}` : ` ${k}="${v}"`).join(''); return `<${this.localName}${attrs}>${this.innerHTML}</${this.localName}>`; }
  adopt(node) { if (typeof node === 'string') node = new Text(node); node.parentNode?.removeChild?.(node); node.parentNode = this; return node; }
  removeChild(node) { const i = this.childNodes.indexOf(node); if (i >= 0) this.childNodes.splice(i, 1); node.parentNode = null; return node; }
  appendChild(node) { this.childNodes.push(this.adopt(node)); return node; }
  append(...nodes) { nodes.forEach(node => this.appendChild(node)); }
  prepend(...nodes) { this.childNodes.unshift(...nodes.map(node => this.adopt(node))); }
  replaceChildren(...nodes) { this.childNodes.forEach(node => { node.parentNode = null; }); this.childNodes = []; this.append(...nodes); }
  remove() { this.parentNode?.removeChild(this); }
  before(...nodes) { const parent = this.parentNode; const adopted = nodes.map(node => parent.adopt(node)); parent.childNodes.splice(parent.childNodes.indexOf(this), 0, ...adopted); }
  after(...nodes) { const parent = this.parentNode; const adopted = nodes.map(node => parent.adopt(node)); parent.childNodes.splice(parent.childNodes.indexOf(this) + 1, 0, ...adopted); }
  *descendants() { for (const node of this.children) { yield node; yield* node.descendants(); } }
  matches(selector) { return compile(selector)(this); }
  querySelectorAll(selector) { const test = compile(selector); return [...this.descendants()].filter(test); }
  querySelector(selector) { const test = compile(selector); for (const node of this.descendants()) if (test(node)) return node; return null; }
  closest(selector) { const test = compile(selector); for (let node = this; node && node.nodeType === 1; node = node.parentNode) if (test(node)) return node; return null; }
  addEventListener(type, fn) { (this.listeners[type] ||= []).push(fn); }
  removeEventListener(type, fn) { this.listeners[type] = (this.listeners[type] || []).filter(f => f !== fn); }
  dispatchEvent(event) {
    event.target ??= this;
    for (let node = this; node; node = node.parentNode) {
      event.currentTarget = node;
      for (const fn of [...(node.listeners?.[event.type] || [])]) { if (typeof fn !== "function") throw new Error(`bad listener on ${node.localName}#${node.id}: ${typeof fn} ${String(fn)}`); fn.call(node, event); }
      if (!event.bubbles || event.stopped) break;
    }
    return true;
  }
  click() { if (this.disabled) return; this.dispatchEvent({ type: 'click', bubbles: true, stopPropagation() { this.stopped = true; } }); }
  focus() { this.ownerDocument.activeElement = this; }
  getBoundingClientRect() { return { width: 100, height: 100, top: 0, left: 0, right: 100, bottom: 100 }; }
}

function parseHTML(html, document) {
  const root = new Element('template', document);
  const stack = [root];
  const pattern = /<!--[\s\S]*?-->|<\/([a-zA-Z][\w:-]*)\s*>|<([a-zA-Z][\w:-]*)((?:\s+[^\s=>/]+(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+))?)*)\s*(\/?)>|[^<]+/g;
  for (const m of html.matchAll(pattern)) {
    const top = stack.at(-1);
    if (m[0].startsWith('<!--')) continue;
    if (m[1]) { const tag = m[1].toLowerCase(); const index = stack.findLastIndex(node => node.localName === tag); if (index > 0) stack.length = index; continue; }
    if (m[2]) {
      const el = new Element(m[2], document);
      for (const a of (m[3] || '').matchAll(/([^\s=>/]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g)) el.setAttribute(a[1].toLowerCase(), unescape(a[2] ?? a[3] ?? a[4] ?? ''));
      top.appendChild(el);
      if (!m[4] && !VOID.has(el.localName)) stack.push(el);
      continue;
    }
    top.appendChild(new Text(unescape(m[0])));
  }
  return [...root.childNodes];
}

// Installs document/window globals with the given body markup; returns helpers and a restore().
export function installDom(bodyHTML = '') {
  const saved = { document: globalThis.document, window: globalThis.window };
  const listeners = {};
  const document = {
    hidden: false, activeElement: null, listeners,
    createElement: tag => new Element(tag, document),
    createTextNode: text => new Text(text),
    addEventListener: (type, fn) => (listeners[type] ||= []).push(fn),
    removeEventListener: (type, fn) => { listeners[type] = (listeners[type] || []).filter(f => f !== fn); },
    dispatchEvent: event => { (listeners[event.type] || []).forEach(fn => fn(event)); return true; },
    querySelector: selector => document.documentElement.querySelector(selector),
    querySelectorAll: selector => document.documentElement.querySelectorAll(selector),
    getElementById: id => document.documentElement.querySelector(`#${id}`),
  };
  document.documentElement = new Element('html', document);
  document.body = new Element('body', document);
  document.documentElement.appendChild(document.body);
  document.body.innerHTML = bodyHTML;
  const windowListeners = {};
  const window = {
    document, setTimeout: (...args) => globalThis.setTimeout(...args), clearTimeout: id => globalThis.clearTimeout(id),
    addEventListener: (type, fn) => (windowListeners[type] ||= []).push(fn),
    dispatchEvent: event => { (windowListeners[event.type] || []).forEach(fn => fn(event)); return true; },
    localStorage: null,
  };
  globalThis.document = document; globalThis.window = window;
  return {
    document, window,
    setHidden(hidden) { document.hidden = hidden; document.dispatchEvent({ type: 'visibilitychange' }); },
    restore() { globalThis.document = saved.document; globalThis.window = saved.window; },
  };
}

export function memoryStorage(initial = {}) {
  const data = new Map(Object.entries(initial));
  return { getItem: key => data.has(key) ? data.get(key) : null, setItem: (key, value) => data.set(key, String(value)), removeItem: key => data.delete(key), data };
}
// Lets pending promise callbacks run.
export const flush = async (rounds = 5) => { for (let i = 0; i < rounds; i++) await new Promise(resolve => setImmediate(resolve)); };
