import { PATTERN_LEVELS, PATTERN_FAMILIES, createPatternRound, patternSessionPlan, patternSessionStars, adaptPatternLevel, loadPatternLevel, savePatternLevel, tokenKey, tokenLabel } from './patterns-data.js';
import { patternTokenArt } from './patterns-art.js';

const escapeHtml = value => String(value).replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character]));
const roundSignature = round => `${round.type}:${round.levelId}:${round.familyId}:${round.preview.map(tokenKey).join('|')}`;
const symbol = token => `<span class="patterns-token" aria-hidden="true">${patternTokenArt(token)}</span>`;
const INSTRUCTIONS = {
  next: 'Mi jön ezután?',
  gap: 'Mi hiányzik a sorból?',
  find: 'Melyik nem illik a sorba? Koppints rá!',
  fix: 'Mi illik a helyére?',
  grow: 'Hány pötty jön ezután?',
};
const ADVANCE_DELAY = 1500;

/**
 * A session is five short rounds of mixed tasks. The level adapts after each
 * round and is remembered per child profile; stars count first-try rounds.
 */
export function setupPatternsGame({ effect = () => {}, speak = () => {}, stopPlayback = () => {}, onComplete = () => {}, onRestart = () => {}, getScope = () => 'default', storage = globalThis.localStorage } = {}) {
  const root = document.querySelector('#patterns');
  let levelId = 'starter', familyId = 'mixed', round = null, placed = [];
  let plan = [], results = [], streak = {}, roundIndex = 0, wrong = 0, roundHint = 0, phase = null, eliminated = new Set();
  let active = false, finished = false, roundDone = false, hintStage = 0, answerLocked = false, mistake = null;
  let pending = null, listeners = null, feedbackTimer = null, advanceTimer = null, generation = 0;
  let lastSignature = '', nextSeed = Date.now() >>> 0;
  const playable = () => active && !finished && !roundDone && !document.hidden && !document.querySelector('dialog[open]');
  const status = message => { const element = root.querySelector('#patterns-status'); if (element) element.textContent = message; };
  const focus = selector => root.querySelector(selector)?.focus({ preventScroll: true });
  const say = (id, force = false) => { if (active && !document.hidden) speak(id, force); };
  const choosing = () => round && (round.type !== 'odd' || phase === 'fix');
  const currentAnswer = () => round.answers[round.type === 'next' ? placed.length : 0];
  const numberClip = count => `number_${count}`;

  function clearFeedback() {
    clearTimeout(feedbackTimer); feedbackTimer = null; answerLocked = false; mistake = null;
  }

  // The earlier place in the row that holds the same token as the asked place.
  function referenceIndex() {
    if (!round.motif.length) return -1;
    if (round.type === 'next') return round.preview.length + placed.length - round.motif.length;
    if (round.type === 'gap') return round.gapIndex >= round.motif.length ? round.gapIndex - round.motif.length : round.gapIndex + round.motif.length;
    if (round.type === 'odd' && phase === 'fix') return round.oddIndex - round.motif.length;
    return -1;
  }

  function previewCell(token, index) {
    const length = round.preview.length;
    const mobileRow = length === 12 ? 4 : length === 9 ? 3 : length <= 4 ? length : length / 2;
    const mobileBreak = index > 0 && index % mobileRow === 0;
    const tabletBreak = length === 12 && index === 6;
    const hidden = round.type === 'gap' && index === round.gapIndex && !roundDone;
    const fixed = round.type === 'odd' && index === round.oddIndex && roundDone;
    const shown = fixed ? round.answers[0] : token;
    const tappable = round.type === 'odd' && phase === 'find' || round.type === 'grow';
    const label = `${index + 1}. elem: ${hidden ? 'hiányzik' : escapeHtml(tokenLabel(shown))}`;
    // Growing rows show the amount (only after a hint), not the position.
    const number = round.type === 'grow' ? `<span class="patterns-cell-number patterns-count-number" aria-hidden="true">${token.count}</span>` : `<span class="patterns-cell-number" aria-hidden="true">${index + 1}</span>`;
    const content = `${number}${hidden ? '<span class="patterns-empty" aria-hidden="true">?</span>' : symbol(shown)}`;
    const classes = ['patterns-preview-cell', hidden ? 'is-gap is-current' : '', round.type === 'odd' && phase === 'fix' && index === round.oddIndex ? 'is-odd is-current' : '', fixed ? 'is-fixed' : ''].filter(Boolean).join(' ');
    return `${mobileBreak || tabletBreak ? `<li class="patterns-row-break patterns-row-break--${mobileBreak ? 'mobile' : 'tablet'}" aria-hidden="true"><span>↳</span> ${index + 1}. elemtől →</li>` : ''}<li class="${classes}" data-preview-index="${index}"${hidden ? '' : ` data-token-key="${escapeHtml(tokenKey(shown))}"`}${tappable ? '' : ` aria-label="${label}"`}>${tappable ? `<button class="patterns-cell-button" data-pattern-cell="${index}" aria-label="${label}">${content}</button>` : content}<span class="patterns-step-arrow" aria-hidden="true">→</span></li>`;
  }

  function render() {
    const level = PATTERN_LEVELS.find(item => item.id === levelId);
    const family = PATTERN_FAMILIES.find(item => item.id === familyId);
    const length = round.preview.length;
    const instruction = round.type === 'odd' ? INSTRUCTIONS[phase] : INSTRUCTIONS[round.type];
    const answerRow = round.type === 'next' || round.type === 'grow';
    root.dataset.levelId = levelId; root.dataset.familyId = familyId; root.dataset.roundId = round.id;
    root.dataset.roundType = round.type; root.dataset.roundIndex = String(roundIndex); root.dataset.phase = phase || '';
    root.dataset.previewCount = String(length);
    root.style.setProperty('--pattern-preview-count', length);
    root.style.setProperty('--pattern-mobile-columns', length === 12 ? 4 : length === 9 ? 3 : length <= 4 ? length : length / 2);
    root.style.setProperty('--pattern-choice-count', round.choices.length);
    root.style.setProperty('--pattern-answer-count', round.answers.length);
    root.innerHTML = `<div class="patterns-toolbar"><button id="patterns-change" aria-haspopup="dialog" aria-controls="patterns-chooser"><strong>${escapeHtml(level.name)}</strong><span>${escapeHtml(family.name)} <span aria-hidden="true">⌄</span></span></button><span id="patterns-progress" role="img"></span></div>
      <p class="patterns-instruction" id="patterns-instruction">${instruction}</p>
      <section class="patterns-observation" aria-labelledby="patterns-preview-heading"><div class="patterns-section-heading"><h2 id="patterns-preview-heading" tabindex="-1">${round.type === 'next' ? 'Így kezdődik a sor' : round.type === 'grow' ? 'Így nő a sor' : 'A sor'}</h2><span class="patterns-direction" aria-hidden="true">Balról jobbra →</span></div>
        <ol class="patterns-preview" aria-label="A minta elemei sorrendben">${round.preview.map(previewCell).join('')}</ol>
        <p id="patterns-rule" class="patterns-rule" hidden></p>
      </section>
      ${answerRow ? `<section class="patterns-continuation" aria-labelledby="patterns-answer-heading"><div class="patterns-section-heading"><h2 id="patterns-answer-heading">${round.type === 'grow' ? 'Ennyi jön' : 'Folytasd innen'} <span aria-hidden="true">→</span></h2><span id="patterns-next-position"></span></div><ol class="patterns-answer-row" aria-label="${round.type === 'grow' ? 'A következő hely' : 'A következő három hely'}"></ol></section>` : ''}
      <section class="patterns-choice-section" aria-labelledby="patterns-choice-heading"${choosing() ? '' : ' hidden'}><h2 id="patterns-choice-heading">Melyik illik a jelölt helyre?</h2><div class="patterns-choices" role="group" aria-label="Választható alakzatok">${round.choices.map((token, index) => `<button class="patterns-choice" data-pattern-choice="${index}" data-token-key="${escapeHtml(tokenKey(token))}" aria-label="${index + 1}. választás: ${escapeHtml(tokenLabel(token))}" aria-describedby="patterns-instruction">${symbol(token)}<span class="patterns-choice-number" aria-hidden="true">${index + 1}</span></button>`).join('')}</div></section>
      <div class="patterns-actions"><button id="patterns-hint"><span aria-hidden="true">☀</span> Segítség</button>${round.type === 'next' ? '<button id="patterns-undo" disabled><span aria-hidden="true">↶</span> Vissza</button>' : ''}<button id="patterns-restart"><span aria-hidden="true">↻</span> Újrakezdés</button></div>
      <p id="patterns-status" class="patterns-status" role="status" aria-live="polite" aria-atomic="true"></p>
      <dialog id="patterns-chooser" class="patterns-chooser" aria-labelledby="patterns-chooser-title"></dialog>`;
    root.querySelectorAll('.patterns-token svg').forEach(svg => { svg.setAttribute('focusable', 'false'); svg.setAttribute('aria-hidden', 'true'); });
    update();
  }

  function update() {
    if (!round) return;
    root.dataset.placedCount = String(placed.length); root.dataset.totalCount = String(round.answers.length);
    root.dataset.hintStage = String(hintStage); root.dataset.answerLocked = String(answerLocked);
    root.dataset.roundDone = String(roundDone); root.dataset.wrongCount = String(wrong);
    root.classList.toggle('is-complete', finished);
    // Session progress: a star for each first-try round, a dot for the others.
    const progress = root.querySelector('#patterns-progress');
    progress.setAttribute('aria-label', `${Math.min(results.length + (finished ? 0 : 1), plan.length)}. feladat az ${plan.length}-ből`);
    progress.innerHTML = plan.map((_, index) => {
      const result = results[index];
      return `<i class="patterns-round-dot${result ? result.wrong === 0 && result.hint < 2 ? ' is-star' : ' is-done' : index === roundIndex && !finished ? ' is-current' : ''}" aria-hidden="true">${result && result.wrong === 0 && result.hint < 2 ? '★' : ''}</i>`;
    }).join('');
    const row = root.querySelector('.patterns-answer-row');
    if (row) {
      root.querySelector('#patterns-next-position').textContent = roundDone ? '✓' : `${round.preview.length + placed.length + 1}. hely`;
      row.innerHTML = round.answers.map((_, index) => {
        const token = placed[index], current = !roundDone && index === placed.length, position = round.preview.length + index + 1;
        return `<li class="patterns-answer-slot${token ? ' is-filled' : ''}${current ? ' is-current' : ''}" data-answer-index="${index}"${token ? ` data-token-key="${escapeHtml(tokenKey(token))}"` : ''}${current ? ' aria-current="step"' : ''} aria-label="${position}. hely: ${token ? escapeHtml(tokenLabel(token)) : current ? 'most ezt folytasd' : 'még üres'}"><span class="patterns-cell-number" aria-hidden="true">${position}</span>${token ? symbol(token) : `<span class="patterns-empty" aria-hidden="true">${current ? '?' : '·'}</span>`}<span class="patterns-slot-mark" aria-hidden="true">${token ? '✓' : current ? 'Ide jön' : ''}</span></li>`;
      }).join('');
    }
    const reference = hintStage > 0 ? referenceIndex() : -1;
    root.querySelectorAll('[data-preview-index]').forEach(cell => {
      const index = Number(cell.dataset.previewIndex);
      cell.classList.toggle('is-motif', hintStage > 0 && index < round.motif.length);
      cell.classList.toggle('is-reference', index === reference);
    });
    root.classList.toggle('shows-counts', hintStage > 0 && round.type === 'grow');
    root.querySelectorAll('[data-answer-index]').forEach(cell => cell.classList.toggle('is-reference', reference >= 0 && round.preview.length + Number(cell.dataset.answerIndex) === reference));
    root.querySelectorAll('[data-pattern-choice]').forEach(button => {
      const index = Number(button.dataset.patternChoice), out = eliminated.has(index);
      button.disabled = finished || roundDone;
      button.setAttribute('aria-disabled', String(finished || roundDone || answerLocked || out));
      button.classList.toggle('is-eliminated', out);
      button.classList.toggle('is-retry', mistake === index);
    });
    root.querySelector('#patterns-hint').disabled = finished || roundDone || round.type === 'odd' && phase === 'find' && hintStage >= 1 || hintStage >= 2;
    const undo = root.querySelector('#patterns-undo');
    if (undo) undo.disabled = finished || roundDone || !placed.length;
    const rule = root.querySelector('#patterns-rule'); rule.hidden = hintStage === 0;
    rule.textContent = hintStage ? `${round.motif.length ? 'A keretezett rész ismétlődik. ' : ''}${round.ruleLabel}` : '';
  }

  function roundIntro() {
    status(round.type === 'next' ? 'Nézd végig a sort, aztán válassz!' : round.type === 'gap' ? 'Az egyik hely üres. Mi illik bele?' : round.type === 'odd' ? 'Egy elem elrontja a mintát. Keresd meg!' : 'Számold meg a pöttyöket!');
    // Growing rows are counted aloud, group by group.
    if (round.type === 'grow') say(['patterns_grow', ...round.preview.map(token => numberClip(token.count))]);
    else if (round.type === 'gap') say('patterns_gap');
    else if (round.type === 'odd') say('patterns_odd');
  }

  function newRound() {
    clearTimeout(advanceTimer); advanceTimer = null; clearFeedback();
    for (let attempt = 0; attempt < 20; attempt++) {
      nextSeed = (nextSeed + 0x9e3779b9) >>> 0;
      round = createPatternRound({ levelId, familyId, seed: nextSeed, type: plan[roundIndex] });
      if (roundSignature(round) !== lastSignature) break;
    }
    lastSignature = roundSignature(round);
    placed = []; hintStage = 0; roundHint = 0; wrong = 0; eliminated = new Set(); roundDone = false;
    phase = round.type === 'odd' ? 'find' : null;
    render();
  }

  function finishRound() {
    const result = { type: round.type, wrong, hint: roundHint };
    results.push(result); roundDone = true; clearFeedback(); stopPlayback();
    const adapted = adaptPatternLevel(levelId, streak, result);
    streak = adapted.streak;
    if (adapted.changed) { levelId = adapted.levelId; savePatternLevel(storage, getScope(), levelId); }
    finished = results.length === plan.length;
    render();
    const praise = result.wrong === 0 && result.hint < 2 ? 'Elsőre sikerült! ⭐' : 'Megvan!';
    const levelNote = adapted.changed > 0 ? ' Jönnek a nehezebb minták.' : adapted.changed < 0 ? ' Most egy kicsit könnyebb jön.' : '';
    if (finished) {
      const stars = patternSessionStars(results);
      status(`${praise} ${stars} csillagot gyűjtöttél.${levelNote}`);
      focus('#patterns-restart');
      onComplete({ count: stars, levelId, familyId, roundId: round.id });
      return;
    }
    status(`${praise}${levelNote}`);
    const roundGeneration = generation;
    advanceTimer = setTimeout(() => {
      advanceTimer = null;
      if (!active || roundGeneration !== generation) return;
      roundIndex += 1; newRound(); roundIntro(); focus('#patterns-preview-heading');
    }, ADVANCE_DELAY);
  }

  function choose(index) {
    if (!playable() || answerLocked || !choosing() || !Number.isInteger(index) || !round.choices[index] || eliminated.has(index)) return;
    const token = round.choices[index];
    if (tokenKey(token) !== tokenKey(currentAnswer())) {
      // A wrong tap costs this round's star; the card is set aside for this place.
      wrong += 1; mistake = index; eliminated.add(index); update(); effect('retry');
      status('Ez most nem illik ide. Nézd meg újra, mi ismétlődik!'); say('patterns_retry'); return;
    }
    clearFeedback(); stopPlayback(); effect('snap');
    eliminated = new Set();
    if (round.type === 'next') {
      placed.push(token); hintStage = 0;
      if (placed.length < round.answers.length) {
        answerLocked = true; update();
        status(`Jó helyre került! Most a ${round.preview.length + placed.length + 1}. hely következik.`);
        // One tap places one token, even if the next position needs the same token.
        const tokenGeneration = generation;
        feedbackTimer = setTimeout(() => {
          feedbackTimer = null;
          if (!active || tokenGeneration !== generation) return;
          answerLocked = false; update();
        }, 250);
        return;
      }
    } else if (round.type === 'grow') {
      // The new group is counted aloud once it is in place.
      placed.push(token); finishRound(); say(numberClip(token.count)); return;
    }
    finishRound();
  }

  function tapCell(index) {
    if (!playable() || !round.preview[index]) return;
    if (round.type === 'grow') { say(numberClip(round.preview[index].count), true); status(`${round.preview[index].count} pötty.`); return; }
    if (round.type !== 'odd' || phase !== 'find') return;
    if (index !== round.oddIndex) {
      wrong += 1; effect('retry'); say('patterns_retry');
      status('Ez illik a mintába. Keresd tovább!');
      const cell = root.querySelector(`[data-preview-index="${index}"]`);
      cell?.classList.remove('is-retry'); if (cell) { void cell.offsetWidth; cell.classList.add('is-retry'); }
      root.dataset.wrongCount = String(wrong);
      return;
    }
    effect('snap'); phase = 'fix'; hintStage = 0; render();
    status('Megtaláltad! Mi illik a helyére?'); say('patterns_odd_fix');
    focus('[data-pattern-choice]:not([aria-disabled="true"])');
  }

  function hint() {
    if (!playable() || answerLocked) return;
    const max = round.type === 'odd' && phase === 'find' ? 1 : 2;
    if (hintStage >= max) return;
    mistake = null; hintStage += 1; roundHint = Math.max(roundHint, hintStage);
    if (hintStage === 2) {
      // The strong hint leaves only two cards: the answer and one other.
      const keep = round.choices.map((token, index) => index).filter(index => tokenKey(round.choices[index]) !== tokenKey(currentAnswer()) && !eliminated.has(index));
      keep.slice(1).forEach(index => eliminated.add(index));
    }
    update();
    if (round.type === 'grow') {
      status(hintStage === 1 ? `${round.preview.map(token => token.count).join(', ')} … ${round.ruleLabel}` : 'Már csak két lehetőség maradt.');
      say(round.preview.map(token => numberClip(token.count)), true);
      return;
    }
    status(hintStage === 1 ? round.type === 'odd' && phase === 'find' ? 'A zöld keret az ismétlődő részt mutatja. Hasonlítsd hozzá a többit!' : 'A zöld keret az ismétlődő részt mutatja. A pontozott jelölésnél láthatod, mi volt korábban ugyanitt.' : 'Már csak két lehetőség maradt. Te válassz!');
    say('patterns_hint', true);
  }

  function undo() {
    if (!playable() || round.type !== 'next' || !placed.length) return;
    clearFeedback(); stopPlayback(); placed.pop(); hintStage = 0; eliminated = new Set(); update(); effect('undo');
    status('Visszavettük az utolsó alakzatot. Ugyanonnan folytathatod a sort.');
    if (!placed.length && document.activeElement?.id === 'patterns-undo') focus('[data-pattern-choice="0"]');
  }

  function openChooser() {
    if (!active || document.hidden) return;
    clearFeedback(); update(); stopPlayback(); pending = { levelId, familyId };
    const dialog = root.querySelector('#patterns-chooser');
    dialog.innerHTML = `<div class="patterns-chooser-heading"><div><p>Új minták</p><h2 id="patterns-chooser-title">Milyen sort folytassunk?</h2></div><button id="patterns-close" aria-label="Vissza a játékhoz">×</button></div><h3>Nehézség</h3><div class="patterns-levels" role="group" aria-label="Nehézség">${PATTERN_LEVELS.map(item => `<button data-pattern-level="${item.id}" aria-pressed="${item.id === levelId}"><strong>${escapeHtml(item.name)}</strong><small>${escapeHtml(item.description)}</small></button>`).join('')}</div><h3>Mit figyeljünk meg?</h3><div class="patterns-families" role="group" aria-label="A minta fajtája">${PATTERN_FAMILIES.map(item => `<button data-pattern-family="${item.id}" aria-pressed="${item.id === familyId}"><strong>${escapeHtml(item.name)}</strong><small>${escapeHtml(item.description)}</small></button>`).join('')}</div><p class="patterns-chooser-note">A nehézség magától is igazodik: két hibátlan kör után nehezebb, két nehéz kör után könnyebb jön.</p><button id="patterns-apply">Kezdjük!</button>`;
    dialog.showModal();
  }

  function onClick(event) {
    if (!active || document.hidden) return;
    const button = event.target.closest('button');
    if (!button) return;
    if (button.dataset.patternChoice !== undefined) choose(Number(button.dataset.patternChoice));
    else if (button.dataset.patternCell !== undefined) tapCell(Number(button.dataset.patternCell));
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
      const options = { ...pending }; root.querySelector('#patterns-chooser').close();
      // A parent's explicit choice becomes the remembered level.
      if (options.levelId !== levelId) savePatternLevel(storage, getScope(), options.levelId);
      start(options); focus('#patterns-preview-heading');
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
    generation++; clearFeedback(); clearTimeout(advanceTimer); advanceTimer = null;
    root.querySelector('dialog[open]')?.close(); stopPlayback(); onRestart();
    levelId = PATTERN_LEVELS.some(item => item.id === options.levelId) ? options.levelId : loadPatternLevel(storage, getScope());
    if (PATTERN_FAMILIES.some(item => item.id === options.familyId)) familyId = options.familyId;
    nextSeed = (nextSeed + 0x7f4a7c15) >>> 0;
    plan = patternSessionPlan(nextSeed); results = []; streak = {}; roundIndex = 0; pending = null;
    active = true; finished = false; newRound(); attachListeners(); window.scrollTo(0, 0);
    roundIntro();
    if (options.announce !== false) say('patterns_start');
  }
  function restart() { start({ levelId, familyId }); }
  function stop() {
    active = false; generation++; clearFeedback(); clearTimeout(advanceTimer); advanceTimer = null; root.querySelector('dialog[open]')?.close();
    listeners?.abort(); listeners = null; stopPlayback();
  }
  return { start, restart, stop, hint, repeat() { say('patterns_start', true); }, getContext() { return { levelId, familyId }; } };
}
