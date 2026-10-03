// Narration follows the playback clock, including pauses, decoding delays and cancellation.
const normalized = text => text.toLocaleLowerCase('hu-HU').replace(/[^\p{L}\p{N}]+/gu, ' ').trim();

export function buildCuePlan(text, words = [], parts = []) {
  const tokens = words.map(word => normalized(word[2]));
  const lower = text.toLocaleLowerCase('hu-HU');
  return parts.flatMap(part => {
    const phrase = normalized(part.at).split(' ');
    const start = tokens.findIndex((_, i) => phrase.every((token, j) => tokens[i + j] === token));
    const charStart = lower.indexOf(part.at.toLocaleLowerCase('hu-HU'));
    if (start < 0 || charStart < 0) return [];
    return [{ ...part, time: words[start][0], charStart }];
  }).sort((a,b) => a.time - b.time);
}

export function cueAt(plan, position, key = 'time') {
  return plan.findLast(cue => cue[key] <= position);
}

export function createNarration({ getRoot, getWords, requestFrame = requestAnimationFrame, cancelFrame = cancelAnimationFrame }) {
  let active;
  function prepare(id, text, spec = {}) {
    const root = getRoot();
    const plan = buildCuePlan(text, getWords(id), spec.parts);
    let marked = new Set(), frame = null, started = false, lastWord = -1;
    const words = getWords(id) || [];
    const emit = (type, extra = {}) => document.dispatchEvent(new CustomEvent(type, {detail:{id, text, ...extra}}));
    function paint(cue = spec) {
      const target = cue?.target || spec.target;
      const nodes = root?.isConnected && target ? [...root.querySelectorAll(target)].filter(node => node.getClientRects().length) : [];
      const next = new Set(nodes);
      for (const node of marked) if (!next.has(node)) {
        node.classList.remove('is-narrated');
        delete node.dataset.narrationMotion;
        delete node.dataset.narrationClip;
      }
      for (const node of next) {
        node.classList.add('is-narrated');
        node.dataset.narrationMotion = cue?.motion || spec.motion || 'pulse';
        node.dataset.narrationClip = id;
      }
      marked = next;
    }
    const handle = {
      start(clock) {
        active?.stop('replaced');
        active = handle; started = true; lastWord = -1;
        emit('narrationstart');
        if (!clock) { paint(); return; }
        const tick = () => {
          if (!started || active !== handle) return;
          const time = clock();
          paint(cueAt(plan, time));
          const index = words.findLastIndex(word => word[0] <= time);
          if (index >= 0 && index !== lastWord) {
            lastWord = index;
            emit('narrationword', {word:words[index][2], time:words[index][0], index});
          }
          frame = requestFrame(tick);
        };
        tick();
      },
      boundary(charIndex) {
        if (started && active === handle) paint(cueAt(plan, charIndex, 'charStart'));
      },
      stop(reason = 'ended') {
        if (frame !== null) cancelFrame(frame);
        frame = null;
        for (const node of marked) {
          node.classList.remove('is-narrated');
          delete node.dataset.narrationMotion;
          delete node.dataset.narrationClip;
        }
        marked.clear();
        if (started) emit('narrationend', {reason});
        started = false;
        if (active === handle) active = null;
      },
    };
    return handle;
  }
  return {prepare, stop(reason = 'cancelled') {active?.stop(reason);}};
}
