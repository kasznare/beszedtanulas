import { PATTERN_LEVELS, PATTERN_FAMILIES, createPatternRound, tokenKey, tokenLabel } from './patterns-data.js';
import { patternTokenArt } from './patterns-art.js';

const escapeHtml = value => String(value).replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character]));
const roundSignature = round => `${round.levelId}:${round.familyId}:${round.preview.map(tokenKey).join('|')}`;
const symbol = token => `<span class="patterns-token" aria-hidden="true">${patternTokenArt(token)}</span>`;

/** Round choices and answers are deliberately kept in memory, without saved results. */
export function setupPatternsGame({ effect = () => {}, speak = () => {}, stopPlayback = () => {}, onComplete = () => {}, onRestart = () => {} } = {}) {
  const root = document.querySelector('#patterns');
  let levelId = 'explorer', familyId = 'mixed', round = null, placed = [];
  let active = false, finished = false, hintStage = 0, answerLocked = false, mistake = null;
  let pending = null, listeners = null, feedbackTimer = null, generation = 0;
  let lastSignature = '', nextSeed = Date.now() >>> 0;
  const playable = () => active && !finished && !document.hidden && !document.querySelector('dialog[open]');
  const status = message => { const element = root.querySelector('#patterns-status'); if (element) element.textContent = message; };
  const focus = selector => root.querySelector(selector)?.focus({ preventScroll: true });
  const say = (id, force = false) => { if (active && !document.hidden) speak(id, force); };

  function clearFeedback() {
    clearTimeout(feedbackTimer); feedbackTimer = null; answerLocked = false; mistake = null;
  }

  function render() {
    const level = PATTERN_LEVELS.find(item => item.id === levelId);
    const family = PATTERN_FAMILIES.find(item => item.id === familyId);
    root.dataset.levelId = levelId; root.dataset.familyId = familyId; root.dataset.roundId = round.id;
    root.dataset.previewCount = String(round.preview.length);
    root.style.setProperty('--pattern-preview-count', round.preview.length);
    root.style.setProperty('--pattern-mobile-columns', round.preview.length === 12 ? 4 : round.preview.length / 2);
    root.style.setProperty('--pattern-choice-count', round.choices.length);
    root.innerHTML = `<div class="patterns-toolbar"><button id="patterns-change" aria-haspopup="dialog" aria-controls="patterns-chooser"><strong>${escapeHtml(level.name)}</strong><span>${escapeHtml(family.name)} <span aria-hidden="true">⌄</span></span></button><strong id="patterns-progress" aria-live="off">0 / ${round.answers.length} kész</strong></div>
      <p class="patterns-instruction" id="patterns-instruction">Figyeld meg az ismétlődést! Melyik alakzat következik?</p>
      <section class="patterns-observation" aria-labelledby="patterns-preview-heading"><div class="patterns-section-heading"><h2 id="patterns-preview-heading" tabindex="-1">Így kezdődik a sor</h2><span class="patterns-direction" aria-hidden="true">Balról jobbra →</span></div>
        <ol class="patterns-preview" aria-label="A minta elemei sorrendben">${round.preview.map((token, index) => {
          const mobileBreak = round.preview.length === 12 ? index === 4 || index === 8 : index === round.preview.length / 2;
          const tabletBreak = round.preview.length === 12 && index === 6;
          return `${mobileBreak || tabletBreak ? `<li class="patterns-row-break patterns-row-break--${mobileBreak ? 'mobile' : 'tablet'}" aria-hidden="true"><span>↳</span> Folytatás: ${index + 1}. elemtől →</li>` : ''}<li class="patterns-preview-cell" data-preview-index="${index}" data-token-key="${escapeHtml(tokenKey(token))}" aria-label="${index + 1}. elem: ${escapeHtml(tokenLabel(token))}"><span class="patterns-cell-number" aria-hidden="true">${index + 1}</span>${symbol(token)}<span class="patterns-step-arrow" aria-hidden="true">→</span></li>`;
        }).join('')}</ol>
        <p id="patterns-rule" class="patterns-rule" hidden></p>
      </section>
      <section class="patterns-continuation" aria-labelledby="patterns-answer-heading"><div class="patterns-section-heading"><h2 id="patterns-answer-heading">Folytasd innen <span aria-hidden="true">→</span></h2><span id="patterns-next-position"></span></div><ol class="patterns-answer-row" aria-label="A következő három hely"></ol></section>
      <section class="patterns-choice-section" aria-labelledby="patterns-choice-heading"><h2 id="patterns-choice-heading">Melyik illik a jelölt helyre?</h2><div class="patterns-choices" role="group" aria-label="Választható alakzatok">${round.choices.map((token, index) => `<button class="patterns-choice" data-pattern-choice="${index}" data-token-key="${escapeHtml(tokenKey(token))}" aria-label="${index + 1}. választás: ${escapeHtml(tokenLabel(token))}" aria-describedby="patterns-instruction">${symbol(token)}<span class="patterns-choice-number" aria-hidden="true">${index + 1}</span><span class="patterns-choice-hint" aria-hidden="true">✓</span></button>`).join('')}</div></section>
      <div class="patterns-actions"><button id="patterns-hint"><span aria-hidden="true">☀</span> Segítség</button><button id="patterns-undo" disabled><span aria-hidden="true">↶</span> Vissza</button><button id="patterns-restart"><span aria-hidden="true">↻</span> Új sor</button></div>
      <p id="patterns-status" class="patterns-status" role="status" aria-live="polite" aria-atomic="true"></p>
      <dialog id="patterns-chooser" class="patterns-chooser" aria-labelledby="patterns-chooser-title"></dialog>`;
    root.querySelectorAll('.patterns-token svg').forEach(svg => { svg.setAttribute('focusable', 'false'); svg.setAttribute('aria-hidden', 'true'); });
    update(); status('Nézd végig a sort, aztán válassz egy alakzatot!');
  }

  function update() {
    if (!round) return;
    root.dataset.placedCount = String(placed.length); root.dataset.totalCount = String(round.answers.length);
    root.dataset.hintStage = String(hintStage); root.dataset.answerLocked = String(answerLocked);
    root.classList.toggle('is-complete', finished);
    root.querySelector('#patterns-progress').textContent = `${placed.length} / ${round.answers.length} kész`;
    root.querySelector('#patterns-next-position').textContent = finished ? 'Teljes a sor!' : `${round.preview.length + placed.length + 1}. hely`;
    root.querySelector('.patterns-answer-row').innerHTML = round.answers.map((_, index) => {
      const token = placed[index], current = !finished && index === placed.length, position = round.preview.length + index + 1;
      return `<li class="patterns-answer-slot${token ? ' is-filled' : ''}${current ? ' is-current' : ''}" data-answer-index="${index}"${token ? ` data-token-key="${escapeHtml(tokenKey(token))}"` : ''}${current ? ' aria-current="step"' : ''} aria-label="${position}. hely: ${token ? escapeHtml(tokenLabel(token)) : current ? 'most ezt folytasd' : 'még üres'}"><span class="patterns-cell-number" aria-hidden="true">${position}</span>${token ? symbol(token) : `<span class="patterns-empty" aria-hidden="true">${current ? '?' : '·'}</span>`}<span class="patterns-slot-mark" aria-hidden="true">${token ? '✓' : current ? 'Ide jön' : ''}</span></li>`;
    }).join('');
    // The previous occurrence can already be one of the child's placed tokens.
    const reference = round.preview.length + placed.length - round.motif.length;
    root.querySelectorAll('[data-preview-index]').forEach(cell => {
      const index = Number(cell.dataset.previewIndex);
      cell.classList.toggle('is-motif', hintStage > 0 && index < round.motif.length);
      cell.classList.toggle('is-reference', hintStage > 0 && index === reference);
    });
    root.querySelectorAll('[data-answer-index]').forEach(cell => cell.classList.toggle('is-reference', hintStage > 0 && round.preview.length + Number(cell.dataset.answerIndex) === reference));
    const answerKey = finished ? '' : tokenKey(round.answers[placed.length]);
    root.querySelectorAll('[data-pattern-choice]').forEach(button => {
      const index = Number(button.dataset.patternChoice);
      button.disabled = finished;
      button.setAttribute('aria-disabled', String(finished || answerLocked));
      button.classList.toggle('is-hint', hintStage >= 2 && tokenKey(round.choices[index]) === answerKey);
      button.classList.toggle('is-retry', mistake === index);
    });
    root.querySelector('#patterns-hint').disabled = finished;
    root.querySelector('#patterns-undo').disabled = finished || !placed.length;
    const rule = root.querySelector('#patterns-rule'); rule.hidden = hintStage === 0;
    rule.textContent = hintStage ? `A keretezett rész ismétlődik. ${round.ruleLabel}` : '';
  }

  function choose(index) {
    if (!playable() || answerLocked || !Number.isInteger(index) || !round.choices[index]) return;
    const token = round.choices[index];
    if (tokenKey(token) !== tokenKey(round.answers[placed.length])) {
      mistake = index; update(); effect('retry');
      status('Ez most nem folytatja a mintát. Nézd meg újra, mi ismétlődik!'); say('patterns_retry'); return;
    }
    clearFeedback(); stopPlayback(); placed.push(token); hintStage = 0; effect('snap');
    finished = placed.length === round.answers.length;
    answerLocked = !finished;
    update();
    status(finished ? 'Végig folytattad a mintát. Szép munka!' : `Jó helyre került! Most a ${round.preview.length + placed.length + 1}. hely következik.`);
    if (finished) {
      focus('#patterns-restart'); onComplete({ count: round.answers.length, levelId, familyId, roundId: round.id }); return;
    }
    // One tap places one token, even if the next position needs the same token.
    const tokenGeneration = generation;
    feedbackTimer = setTimeout(() => {
      feedbackTimer = null;
      if (!active || tokenGeneration !== generation) return;
      answerLocked = false; update();
    }, 250);
  }

  function hint() {
    if (!playable() || answerLocked) return;
    mistake = null; hintStage = Math.min(2, hintStage + 1); update();
    status(hintStage === 1 ? 'A zöld keret az ismétlődő részt mutatja. A pontozott jelölésnél láthatod, mi volt korábban ugyanitt.' : 'A jelölt alakzat következik. Te válaszd ki, és folytasd a sort!');
    say('patterns_hint', true);
  }

  function undo() {
    if (!playable() || !placed.length) return;
    clearFeedback(); stopPlayback(); placed.pop(); hintStage = 0; update(); effect('undo');
    status('Visszavettük az utolsó alakzatot. Ugyanonnan folytathatod a sort.');
    if (!placed.length && document.activeElement?.id === 'patterns-undo') focus('[data-pattern-choice="0"]');
  }

  function openChooser() {
    if (!active || document.hidden) return;
    clearFeedback(); update(); stopPlayback(); pending = { levelId, familyId };
    const dialog = root.querySelector('#patterns-chooser');
    dialog.innerHTML = `<div class="patterns-chooser-heading"><div><p>Új minták</p><h2 id="patterns-chooser-title">Milyen sort folytassunk?</h2></div><button id="patterns-close" aria-label="Vissza a játékhoz">×</button></div><h3>Nehézség</h3><div class="patterns-levels" role="group" aria-label="Nehézség">${PATTERN_LEVELS.map(item => `<button data-pattern-level="${item.id}" aria-pressed="${item.id === levelId}"><strong>${escapeHtml(item.name)}</strong><small>${escapeHtml(item.description)}</small></button>`).join('')}</div><h3>Mit figyeljünk meg?</h3><div class="patterns-families" role="group" aria-label="A minta fajtája">${PATTERN_FAMILIES.map(item => `<button data-pattern-family="${item.id}" aria-pressed="${item.id === familyId}"><strong>${escapeHtml(item.name)}</strong><small>${escapeHtml(item.description)}</small></button>`).join('')}</div><p class="patterns-chooser-note">Az új sor ugyanezen a nehézségen is más mintát ad.</p><button id="patterns-apply">Kezdjük!</button>`;
    dialog.showModal();
  }

  function onClick(event) {
    if (!active || document.hidden) return;
    const button = event.target.closest('button');
    if (!button) return;
    if (button.dataset.patternChoice !== undefined) choose(Number(button.dataset.patternChoice));
    else if (button.id === 'patterns-hint') hint();
    else if (button.id === 'patterns-undo') undo();
    else if (button.id === 'patterns-restart') { restart(); focus('#patterns-preview-heading'); }
    else if (button.id === 'patterns-change') openChooser();
    else if (button.id === 'patterns-close') root.querySelector('#patterns-chooser').close();
    else if (button.dataset.patternLevel) {
      pending.levelId = button.dataset.patternLevel;
      root.querySelectorAll('[data-pattern-level]').forEach(item => item.setAttribute('aria-pressed', String(item.dataset.patternLevel === pending.levelId)));
    } else if (button.dataset.patternFamily) {
      pending.familyId = button.dataset.patternFamily;
      root.querySelectorAll('[data-pattern-family]').forEach(item => item.setAttribute('aria-pressed', String(item.dataset.patternFamily === pending.familyId)));
    } else if (button.id === 'patterns-apply') {
      const options = { ...pending }; root.querySelector('#patterns-chooser').close(); start(options); focus('#patterns-preview-heading');
    }
  }

  function onKeyDown(event) {
    const button = event.target.closest('[data-pattern-choice]');
    if (!button || !playable()) return;
    if ((event.key === 'Enter' || event.key === ' ') && event.repeat) { event.preventDefault(); return; }
    const index = Number(button.dataset.patternChoice), count = round.choices.length;
    let next;
    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') next = (index + 1) % count;
    else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') next = (index + count - 1) % count;
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = count - 1;
    if (next !== undefined) { event.preventDefault(); focus(`[data-pattern-choice="${next}"]`); }
  }

  function suspend() {
    clearFeedback(); stopPlayback(); if (active) update();
  }
  function attachListeners() {
    listeners?.abort(); listeners = new AbortController();
    const options = { signal: listeners.signal };
    root.addEventListener('click', onClick, options);
    root.addEventListener('keydown', onKeyDown, options);
    document.addEventListener('visibilitychange', () => { if (document.hidden) suspend(); }, options);
    window.addEventListener('pagehide', suspend, options);
  }

  function start(options = {}) {
    generation++; clearFeedback(); root.querySelector('dialog[open]')?.close(); stopPlayback(); onRestart();
    if (PATTERN_LEVELS.some(item => item.id === options.levelId)) levelId = options.levelId;
    if (PATTERN_FAMILIES.some(item => item.id === options.familyId)) familyId = options.familyId;
    for (let attempt = 0; attempt < 20; attempt++) {
      nextSeed = (nextSeed + 0x9e3779b9) >>> 0;
      round = createPatternRound({ levelId, familyId, seed: nextSeed });
      if (roundSignature(round) !== lastSignature) break;
    }
    lastSignature = roundSignature(round); placed = []; hintStage = 0; pending = null;
    active = true; finished = false; render(); attachListeners(); window.scrollTo(0, 0);
    if (options.announce !== false) say('patterns_start');
  }
  function restart() { start({ levelId, familyId }); }
  function stop() {
    active = false; generation++; clearFeedback(); root.querySelector('dialog[open]')?.close();
    listeners?.abort(); listeners = null; stopPlayback();
  }
  return { start, restart, stop, hint, repeat() { say('patterns_start', true); }, getContext() { return { levelId, familyId }; } };
}
