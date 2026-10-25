import { wordPicture } from './word-art.js';
import { createDressIcon } from './dress-art.js';
import { buildCardPeek, cardPeekReady, cardPeekStars, CARD_PEEK_LENGTH } from './word-cards.js';

// Beszélő képek: every tapped card is remembered for this visit; when all cards of
// a topic were heard, "Kukucs!" offers three "Hol van?" questions on that topic.
const escape = text => String(text ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export function cardPicture(card) {
  if (card.dressIcon && typeof document !== 'undefined') return createDressIcon(card.dressIcon).outerHTML;
  return wordPicture({ id: card.pictureId || card.id, emoji: card.emoji });
}
const nameOnly = card => ({ ...card, sound: null });

export function setupWordCards({ playCard, speak, effect = () => {}, stopPlayback, onPick = () => {}, onComplete = () => {}, onRestart = () => {} }) {
  const root = document.querySelector('#cards');
  const grid = document.querySelector('#cards-grid'), panel = document.querySelector('#card-peek'), start = document.querySelector('#card-peek-start'), count = document.querySelector('#cards-count');
  const heardByTopic = new Map();
  let topic = null, peek = null, token = 0, timer = null;
  const heard = () => { if (!heardByTopic.has(topic.id)) heardByTopic.set(topic.id, new Set()); return heardByTopic.get(topic.id); };
  const active = () => root?.classList.contains('is-active') && !document.hidden;
  const cue = card => ({ target: `[data-word="${card.id}"] .card-emoji` });
  const byId = id => topic.cards.find(card => card.id === id);
  function cancel() { token++; clearTimeout(timer); timer = null; }
  async function sequence(steps) {
    const own = ++token;
    for (const step of steps) {
      if (own !== token || !active()) return false;
      try { await step(); } catch {}
    }
    return own === token && active();
  }
  function syncToolbar() {
    const total = topic.cards.length, done = topic.cards.filter(card => heard().has(card.id)).length;
    count.textContent = done ? `👀 ${done} / ${total}` : `${total} szó`;
    count.setAttribute('aria-label', done ? `${done} kép meghallgatva, összesen ${total}` : `${total} szó`);
    const ready = !peek && cardPeekReady(topic.cards, heard());
    if (start) { start.hidden = !ready; start.classList.toggle('is-new', ready && start.dataset.topic !== topic.id); start.dataset.topic = ready ? topic.id : ''; }
  }
  function renderGrid() {
    panel.hidden = true; grid.hidden = false;
    grid.innerHTML = '';
    grid.dataset.density = topic.cards.length > 8 ? 'dense' : '';
    for (const card of topic.cards) {
      const button = document.createElement('button');
      button.className = `card${heard().has(card.id) ? ' is-seen' : ''}`;
      button.dataset.word = card.id;
      button.innerHTML = `<div class="card-emoji">${cardPicture(card)}</div><div class="card-word">${escape(card.label)}</div>`;
      button.setAttribute('aria-label', `${card.label} meghallgatása`);
      button.addEventListener('click', async () => {
        cancel();
        const wasReady = cardPeekReady(topic.cards, heard());
        heard().add(card.id); button.classList.add('is-seen');
        onPick(card);
        syncToolbar();
        if (!wasReady && cardPeekReady(topic.cards, heard())) effect('success');
        grid.querySelectorAll('.card').forEach(item => item.classList.remove('is-speaking'));
        button.classList.add('is-speaking');
        const own = token;
        await playCard(card, cue(card));
        if (own === token) button.classList.remove('is-speaking');
      });
      grid.appendChild(button);
    }
    syncToolbar();
  }
  function renderPeek(focus = '') {
    grid.hidden = true; grid.innerHTML = ''; panel.hidden = false;
    const followup = document.querySelector('#card-followup'); if (followup) followup.hidden = true;
    const question = peek.questions[Math.min(peek.step, peek.questions.length - 1)];
    const firstTry = peek.results.filter(result => result === 'first').length;
    const dots = `<div class="card-peek-dots" aria-label="${Math.min(peek.step + 1, CARD_PEEK_LENGTH)}. kérdés, összesen ${CARD_PEEK_LENGTH}">${peek.questions.map((_, i) => `<span class="${peek.results[i] ? 'is-done' : i === peek.step ? 'is-current' : ''}" aria-hidden="true">${peek.results[i] === 'first' ? '⭐' : peek.results[i] ? '✓' : '•'}</span>`).join('')}</div>`;
    const close = '<button class="card-peek-close" data-peek="close">🖼️ Képek</button>';
    panel.innerHTML = peek.done
      ? `${dots}<p class="card-peek-result"><span aria-hidden="true">🏆</span> ${firstTry} / ${CARD_PEEK_LENGTH} elsőre</p><div class="card-peek-actions"><button class="card-peek-listen" data-peek="again">↻ Új Kukucs</button>${close}</div>`
      : `${dots}<div class="card-peek-actions"><button class="card-peek-listen" data-peek="listen" ${peek.solved ? 'disabled' : ''}>🔊 Hol van?</button>${close}</div><div class="card-peek-choices" role="group" aria-label="Hol van?">${question.choices.map(byId).map(card => `<button class="card card-peek-choice ${peek.solved && card.id === question.targetId ? 'is-found' : ''} ${peek.wrong === card.id ? 'is-try' : ''}" data-word="${card.id}" data-peek-choice="${card.id}" aria-label="${escape(card.label)}"><div class="card-emoji">${cardPicture(card)}</div><div class="card-word">${escape(card.label)}</div></button>`).join('')}</div><p class="card-peek-status" role="status">${escape(peek.message)}</p>`;
    syncToolbar();
    if (focus) panel.querySelector(focus)?.focus({ preventScroll: true });
  }
  async function prompt(intro = false) {
    if (!peek || peek.done || !active()) return;
    const target = byId(peek.questions[peek.step].targetId);
    await sequence([...(intro ? [() => speak('guide_listening_game')] : []), () => playCard(nameOnly(target))]);
  }
  function startPeek() {
    if (!topic || !active()) return;
    cancel(); stopPlayback(); onRestart();
    const previous = peek?.questions[0]?.targetId;
    let questions = buildCardPeek(topic.cards);
    if (questions[0].targetId === previous && questions.length > 1) questions = [...questions.slice(1), questions[0]];
    peek = { questions, step: 0, misses: 0, results: [], solved: false, done: false, wrong: '', message: 'Hallgasd meg, és koppints a képre!' };
    renderPeek('[data-peek="listen"]');
    void prompt(true);
  }
  function choose(id) {
    if (!peek || peek.done || peek.solved || !active()) return;
    const question = peek.questions[peek.step], chosen = byId(id), target = byId(question.targetId);
    if (!chosen) return;
    if (id !== target.id) {
      peek.misses++; peek.wrong = id; peek.message = `Ez ${/^[aáeéiíoóöőuúüű]/i.test(chosen.label) ? 'az' : 'a'} ${chosen.label}. Figyeld újra!`; effect('retry');
      renderPeek();
      void sequence([() => playCard(nameOnly(chosen), cue(chosen)), () => playCard(nameOnly(target))]);
      return;
    }
    peek.solved = true; peek.wrong = ''; peek.results[peek.step] = peek.misses ? 'later' : 'first'; peek.message = `Megvan: ${target.label}!`;
    effect('collect'); renderPeek();
    void sequence([() => playCard(target, cue(target))]).then(finished => {
      if (!finished || !peek?.solved) return;
      const own = token;
      timer = setTimeout(() => { if (own === token && active()) next(); }, 600);
    });
  }
  function next() {
    if (!peek || !peek.solved || peek.done) return;
    cancel();
    if (peek.step >= peek.questions.length - 1) {
      peek.done = true; peek.message = '';
      renderPeek('[data-peek="again"]');
      onComplete(cardPeekStars(peek.results.filter(result => result === 'first').length));
      return;
    }
    peek.step++; peek.misses = 0; peek.solved = false; peek.wrong = ''; peek.message = 'Hallgasd meg, és koppints a képre!';
    renderPeek('[data-peek="listen"]');
    void prompt();
  }
  function closePeek() { cancel(); stopPlayback(); peek = null; renderGrid(); start?.focus({ preventScroll: true }); }
  start?.addEventListener('click', () => { start.classList.remove('is-new'); startPeek(); });
  panel?.addEventListener('click', event => {
    const button = event.target.closest('button'); if (!button || button.disabled || !active()) return;
    if (button.dataset.peekChoice) choose(button.dataset.peekChoice);
    else if (button.dataset.peek === 'listen') { cancel(); void prompt(); }
    else if (button.dataset.peek === 'again') startPeek();
    else if (button.dataset.peek === 'close') closePeek();
  });
  document.addEventListener('visibilitychange', () => { if (document.hidden) cancel(); });
  return {
    render(nextTopic) {
      if (!root || !nextTopic) return;
      if (topic?.id !== nextTopic.id) { cancel(); peek = null; }
      topic = nextTopic;
      if (peek) renderPeek(); else renderGrid();
    },
    startPeek,
    isPeeking: () => Boolean(peek && !peek.done),
    repeat() { if (peek && !peek.done && !peek.solved) { cancel(); void prompt(); } },
    stop() { cancel(); peek = null; },
  };
}
