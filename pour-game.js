import { POUR_LEVELS, JUG_CAPACITY, JUG_INTERIOR, JUG_SPOUT, jugLiquid, jugPourAngle, newPourRound, refillPour, advancePour, settlePour, pourFeedback, screenTilt, relativeTilt, tiltPourInput } from './pour-data.js';

export function setupPourGame({ getOptions, setLevel, speak, stopPlayback, onComplete, getAudioContext, onRestart = () => {} }) {
  const root = document.querySelector('#pour');
  const names = ['Maci', 'Nyuszi'];
  let active = false, suspended = false, awarded = false, round = newPourRound(), selected = 0;
  let mode = 'buttons', pending = false, generation = 0, frame, lastFrame = 0, pulseTimer;
  let pointer = null, held = false, heldCup = null, heldStrength = .85, drag = null, keys = new Set(), flowingCup = null;
  let pose = { x: 127, angle: 0 }, emptyNotified = false;
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const cupX = cup => 205 + cup * 230, waterTop = cup => 412 - round.fills[cup] * 158;
  let sensorAt = 0, calibrationAt = null, reference = null, filtered = 0, neutralRequired = true, latchedCup = null;
  let sensorAngle = 0, flowSound = null, noiseBuffer = null;
  let status = '', sensorNote = '';
  const $ = selector => root.querySelector(selector);
  const say = id => { if (active && !suspended && !document.hidden) speak(id); };
  const orientation = () => screen.orientation?.angle ?? window.orientation ?? 0;
  const playable = () => active && !suspended && !awarded && !document.hidden && !document.querySelector('dialog[open]');

  function art() {
    return `<svg class="pour-art" viewBox="0 0 640 430" aria-hidden="true">
      <defs><linearGradient id="pour-water-color" x2="0" y2="1"><stop stop-color="#67d0ea"/><stop offset="1" stop-color="#379ecb"/></linearGradient><clipPath id="pour-jug-clip"><polygon points="${JUG_INTERIOR.map(p => p.join(',')).join(' ')}"/></clipPath>${[0, 1].map(i => `<clipPath id="pour-glass-${i}"><path d="M${133 + i * 230} 254h144l-14 146q-58 24-116 0z"/></clipPath>`).join('')}</defs>
      <circle cx="568" cy="58" r="25" fill="#f8cc67"/><g fill="#b8d5bf"><ellipse cx="45" cy="190" rx="22" ry="50"/><ellipse cx="601" cy="207" rx="22" ry="55"/></g>
      <path d="M0 252q140-40 280 0t360 0v178H0z" fill="#d5e4c1"/>
      <g id="pour-bear"><circle cx="135" cy="181" r="22" fill="#b97d51"/><circle cx="245" cy="181" r="22" fill="#b97d51"/><circle cx="135" cy="181" r="12" fill="#edc59a"/><circle cx="245" cy="181" r="12" fill="#edc59a"/><rect x="136" y="170" width="108" height="95" rx="43" fill="#c99162"/><ellipse cx="164" cy="218" rx="11" ry="7" fill="#e9a17f"/><ellipse cx="216" cy="218" rx="11" ry="7" fill="#e9a17f"/><circle cx="169" cy="204" r="5" fill="#49382d"/><circle cx="211" cy="204" r="5" fill="#49382d"/><ellipse cx="190" cy="231" rx="24" ry="18" fill="#f5d7af"/><path d="M183 224q7-5 14 0q-1 8-7 8t-7-8" fill="#49382d"/><path d="M182 239q8 8 16 0" fill="none" stroke="#49382d" stroke-width="3" stroke-linecap="round"/></g>
      <g id="pour-rabbit"><ellipse cx="404" cy="152" rx="17" ry="42" fill="#eee6d8" transform="rotate(-10 404 152)"/><ellipse cx="461" cy="152" rx="17" ry="42" fill="#eee6d8" transform="rotate(10 461 152)"/><ellipse cx="404" cy="152" rx="8" ry="29" fill="#eeb4aa" transform="rotate(-10 404 152)"/><ellipse cx="461" cy="152" rx="8" ry="29" fill="#eeb4aa" transform="rotate(10 461 152)"/><rect x="381" y="175" width="106" height="86" rx="40" fill="#f7f0e5"/><ellipse cx="404" cy="222" rx="11" ry="7" fill="#eeb4aa"/><ellipse cx="464" cy="222" rx="11" ry="7" fill="#eeb4aa"/><circle cx="413" cy="207" r="5" fill="#49382d"/><circle cx="455" cy="207" r="5" fill="#49382d"/><path d="M427 224q7-5 14 0l-7 7z" fill="#c9867d"/><path d="M425 237q9 9 18 0" fill="none" stroke="#49382d" stroke-width="3" stroke-linecap="round"/></g>
      <path d="M75 272h490l38 156H37z" fill="#fbe0cd" stroke="#dfb89c" stroke-width="3"/><g stroke="#fff7e7" stroke-width="8" opacity=".65"><path d="M68 302h505M57 335h525M150 273l-20 151M251 273l-7 151M389 273l7 151M490 273l20 151"/></g>
      ${[0, 1].map(i => `<g data-pour-scene-cup="${i}">
        <ellipse cx="${cupX(i)}" cy="412" rx="77" ry="10" fill="#bca48a" opacity=".22"/>
        <g id="pour-puddle-${i}" class="pour-puddle" hidden><ellipse cx="${cupX(i)}" cy="415" rx="45" ry="11"/><path d="M${cupX(i) - 22} 413q22-6 44 0" fill="none" stroke="#c9f3fc" stroke-width="3"/></g>
        <rect id="pour-highlight-${i}" class="pour-cup-highlight" x="${122 + i * 230}" y="242" width="166" height="180" rx="23"/>
        <path class="pour-glass" d="M${133 + i * 230} 254h144l-14 146q-58 24-116 0z"/>
        <g clip-path="url(#pour-glass-${i})"><rect id="pour-water-${i}" class="pour-water" x="${131 + i * 230}" y="412" width="148" height="0"/><path id="pour-surface-${i}" class="pour-surface"/><rect id="pour-band-${i}" x="${131 + i * 230}" width="148" height="16" fill="#f8cc67" opacity=".55"/><path d="M${147 + i * 230} 274l9 102" fill="none" stroke="#fff" stroke-width="7" opacity=".55" stroke-linecap="round"/></g>
        <path id="pour-target-${i}" class="pour-target"/><path d="M${133 + i * 230} 254q72-12 144 0" fill="none" stroke="#528394" stroke-width="5" stroke-linecap="round"/>
        <g id="pour-overflow-${i}" class="pour-overflow" hidden><path d="M${135 + i * 230} 254q-11 28-2 54t-3 38M${275 + i * 230} 254q11 28 2 57t4 32"/><path class="pour-drips" d="M${130 + i * 230} 351v58M${281 + i * 230} 349v60"/></g>
        <text id="pour-ready-${i}" class="pour-cup-ready" x="${cupX(i)}" y="364" text-anchor="middle"></text></g>`).join('')}
      <g id="pour-flow" hidden><path id="pour-stream" class="pour-stream"/><path id="pour-stream-glint" class="pour-stream-glint"/><g id="pour-splash"><ellipse rx="16" ry="4" fill="none" stroke="#d0f4fc" stroke-width="3"/><path d="M-17-4l-6-7M16-5l6-9M0-8v-7" fill="none" stroke="#67c8e2" stroke-width="4" stroke-linecap="round"/></g></g>
      <g id="pour-jug" class="pour-jug"><path d="M-57-64q-57-3-48 54q5 29 49 28" fill="none" stroke="#659ba5" stroke-width="15"/><path d="M-58-84h93l10 17 40-8-11 11-9 29-15 9 10 94q-60 29-120 0z" fill="#edf8f5" stroke="#528394" stroke-width="5" stroke-linejoin="round"/>
        <g clip-path="url(#pour-jug-clip)"><polygon id="pour-jug-water" class="pour-water"/><path id="pour-jug-surface" class="pour-surface"/></g>
        <path d="M-58-84h93l10 17 40-8-11 11" fill="none" stroke="#528394" stroke-width="5" stroke-linejoin="round"/>
        <path d="M-39-57v27M-39-12l5 65" stroke="#fff" stroke-width="8" opacity=".7" stroke-linecap="round"/><circle cx="0" cy="27" r="14" fill="#f8cc67"/><path d="M-6 27h12M0 21v12" stroke="#b9903e" stroke-width="3"/></g>
      <text id="pour-jug-note" x="320" y="30" text-anchor="middle" class="pour-jug-note">A kancsót is billentheted: húzd lefelé!</text>
    </svg>`;
  }

  function render() {
    const rule = POUR_LEVELS[round.level - 1];
    root.innerHTML = `<div class="pour-heading"><p><strong>Kínáljuk meg a barátainkat!</strong><br><span id="pour-level-name">${rule.name} · Tölts a jelzésig!</span><small id="pour-jug-amount" class="pour-jug-amount"></small></p><div class="pour-levels" role="group" aria-label="Öntés nehézsége">${POUR_LEVELS.map(level => `<button data-pour-level="${level.id}" aria-label="${level.id}. szint: ${level.name}" aria-pressed="${level.id === round.level}">${level.id}</button>`).join('')}</div></div>
      <div class="pour-layout"><div class="pour-scene">${art()}</div><div class="pour-controls">
        <div class="pour-cups" role="group" aria-label="Válassz poharat">${names.map((name, i) => `<button class="pour-cup" data-pour-cup="${i}" aria-pressed="${selected === i}"><span class="pour-cup-name">${i ? '🐰' : '🧸'} ${name}</span><small id="pour-amount-${i}">Üres pohár</small></button>`).join('')}</div>
        <div class="pour-actions"><button id="pour-hold" class="pour-hold" aria-label="Öntés a kiválasztott pohárba. Tartsd nyomva, majd engedd el!">💧 Tartsd nyomva!</button><button id="pour-empty" class="pour-empty">↶ Kiürítem</button></div>
        <p class="pour-hint" id="pour-hint">Válassz poharat, majd tartsd nyomva az öntést!<br>Húzd lefelé a kancsót, vagy használd a ← → nyilat!</p>
        <p id="pour-status" class="pour-status" role="status"></p>
        <div class="pour-mode" role="group" aria-label="Játék irányítása"><button id="pour-buttons" aria-pressed="${mode === 'buttons'}">☝ Gombokkal</button><button id="pour-tilt" aria-pressed="${mode === 'tilt'}" ${pending ? 'disabled' : ''}>${pending ? 'Egy pillanat…' : mode === 'tilt' ? '↔ Középhelyzet' : '↔ Döntögetéssel'}</button></div>
        <p id="pour-sensor-note" class="pour-sensor-note"></p>
        <div class="pour-footer"><button id="pour-refill" aria-label="Kancsó feltöltése">💧 Feltöltöm</button><button id="pour-restart">↻ Új poharak</button><button id="pour-finish" class="pour-finish" disabled>✓ Kész a piknik!</button></div>
      </div></div>`;
    root.querySelectorAll('[data-pour-level]').forEach(button => button.addEventListener('click', () => {
      const level = Number(button.dataset.pourLevel);
      setLevel(level); restart(level);
    }));
    root.querySelectorAll('[data-pour-cup]').forEach(button => button.addEventListener('click', () => {
      release(); selected = Number(button.dataset.pourCup); update(); startLoop();
    }));
    $('#pour-buttons').addEventListener('click', () => useButtons());
    $('#pour-tilt').addEventListener('click', enableTilt);
    $('#pour-empty').addEventListener('click', () => {
      release(); round.fills[selected] = 0; round.done[selected] = false; round.spills[selected] = 0;
      neutralRequired = true; status = `${names[selected]} pohara üres. Töltsünk újra!`; update();
    });
    $('#pour-refill').addEventListener('click', () => {
      if (!playable()) return;
      release(); round = refillPour(round); emptyNotified = false;
      neutralRequired = true; status = 'Újra tele a kancsó!'; say('pour_refill'); update();
    });
    $('#pour-restart').addEventListener('click', () => restart(round.level));
    $('#pour-finish').addEventListener('click', () => {
      if (!playable() || !round.done.every(Boolean)) return;
      awarded = true; release(); cancelAnimationFrame(frame); detachSensor(); stopPlayback(); onComplete(2);
    });
    const hold = $('#pour-hold');
    hold.addEventListener('pointerdown', event => {
      if (!event.isPrimary || event.button !== 0 || !playable() || mode !== 'buttons') return;
      event.preventDefault(); pointer = event.pointerId; hold.setPointerCapture(pointer); beginHold(selected);
    });
    for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) hold.addEventListener(type, event => {
      if (pointer === event.pointerId) release();
    });
    hold.addEventListener('keydown', event => {
      if (!['Space', 'Enter'].includes(event.code) || mode !== 'buttons') return;
      event.preventDefault(); if (!event.repeat) beginHold(selected);
    });
    hold.addEventListener('keyup', event => { if (['Space', 'Enter'].includes(event.code)) { event.preventDefault(); release(); } });
    // A screen reader or switch can also activate the button in short portions.
    hold.addEventListener('click', event => {
      if (event.detail !== 0 || mode !== 'buttons' || !playable()) return;
      beginHold(selected); pulseTimer = window.setTimeout(release, 400);
    });
    const scene = $('.pour-scene');
    $('#pour-jug').addEventListener('pointerdown', event => {
      if (!event.isPrimary || event.button !== 0 || !playable() || mode !== 'buttons' || !round.remaining) return;
      event.preventDefault(); release(); pointer = event.pointerId;
      drag = { y: event.clientY, scale: $('.pour-art').getScreenCTM().d };
      scene.setPointerCapture(pointer); beginHold(selected, 0);
    });
    scene.addEventListener('pointermove', event => {
      if (!drag || pointer !== event.pointerId) return;
      heldStrength = Math.max(0, Math.min(1, (event.clientY - drag.y - 6) / (84 * drag.scale))); startLoop();
    });
    for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) scene.addEventListener(type, event => {
      if (pointer === event.pointerId) release();
    });
    root.querySelectorAll('[data-pour-scene-cup]').forEach(cup => cup.addEventListener('click', () => {
      if (!playable() || mode !== 'buttons') return;
      release(); selected = Number(cup.dataset.pourSceneCup); update(); startLoop();
    }));
    update();
  }

  function update() {
    if (!$('#pour-status')) return;
    const complete = round.done.every(Boolean);
    for (let i = 0; i < 2; i++) {
      const fill = round.fills[i], top = waterTop(i), target = 412 - round.targets[i] * 158;
      const water = $(`#pour-water-${i}`); water.setAttribute('y', top); water.setAttribute('height', fill * 158); water.dataset.fill = fill;
      $(`#pour-surface-${i}`).setAttribute('d', `M${131 + i * 230} ${top}q37-4 74 0t74 0`);
      $(`#pour-surface-${i}`).toggleAttribute('hidden', !fill);
      $(`#pour-overflow-${i}`).toggleAttribute('hidden', flowingCup !== i || fill < 1);
      const puddle = $(`#pour-puddle-${i}`); puddle.toggleAttribute('hidden', !round.spills[i]);
      puddle.querySelector('ellipse').setAttribute('rx', Math.min(103, 75 + round.spills[i] * 45));
      puddle.dataset.spilled = round.spills[i];
      const tolerance = POUR_LEVELS[round.level - 1].tolerance * 158;
      $(`#pour-band-${i}`).setAttribute('y', target - tolerance);
      $(`#pour-band-${i}`).setAttribute('height', tolerance * 2);
      $(`#pour-target-${i}`).setAttribute('d', `M${129 + i * 230} ${target}h152`);
      $(`#pour-highlight-${i}`).toggleAttribute('hidden', selected !== i);
      const ready = $(`#pour-ready-${i}`), readyText = round.done[i] ? '✓' : '';
      if (ready.textContent !== readyText) ready.textContent = readyText;
      const button = $(`[data-pour-cup="${i}"]`);
      button.setAttribute('aria-pressed', selected === i); button.dataset.done = round.done[i];
      button.setAttribute('aria-label', `${names[i]} pohara: ${Math.round(fill * 100)} százalék. Cél: ${Math.round(round.targets[i] * 100)} százalék.${round.done[i] ? ' Elkészült.' : ''}`);
      const amount = $(`#pour-amount-${i}`), label = round.spills[i] ? 'Kicsordult · ürítsd ki!' : round.done[i] ? '✓ Elkészült!' : pourFeedback(round, i) === 'over' ? 'Sok lett · ürítsd ki!' : `Jel: ${round.level === 3 ? (i ? 'magasabban' : 'fél pohár') : 'ugyanannyi'}`;
      if (amount.textContent !== label) amount.textContent = label;
    }
    const statusText = complete ? 'Mindkét pohár elkészült! Kezdődhet a piknik!' : status;
    if ($('#pour-status').textContent !== statusText) $('#pour-status').textContent = statusText;
    if ($('#pour-sensor-note').textContent !== sensorNote) $('#pour-sensor-note').textContent = sensorNote;
    $('#pour-hold').disabled = mode !== 'buttons' || !round.remaining || awarded;
    $('#pour-hold').dataset.held = held;
    $('#pour-empty').disabled = round.fills[selected] === 0 || awarded;
    $('#pour-empty').textContent = `↶ ${names[selected]} pohara`;
    $('#pour-finish').disabled = !complete || awarded;
    $('#pour-hint').hidden = mode === 'tilt';
    $('#pour-refill').disabled = awarded || round.remaining >= JUG_CAPACITY;
    const remaining = Math.round(round.remaining / JUG_CAPACITY * 100);
    $('#pour-jug-amount').textContent = remaining ? `Kancsó: ${remaining}%` : 'Üres a kancsó';
    $('#pour-jug-water').dataset.remaining = round.remaining;
    $('#pour-jug-note').toggleAttribute('hidden', mode !== 'buttons' || held);
    drawWater();
  }

  function beginHold(cup, strength = .85) {
    if (!playable() || !round.remaining) return;
    held = true; heldCup = cup; heldStrength = strength; selected = cup;
    getAudioContext?.()?.resume().catch(() => {});
    status = 'Lassan tölts a jelzésig!'; startLoop(); update();
  }

  function cupFinished(cup) {
    status = `${names[cup]} pohara elkészült! Most a másik barátunk következik.`;
    say(cup ? 'pour_rabbit_done' : 'pour_bear_done');
    if (round.done.every(Boolean)) say('pour_done');
  }

  function settle(cup) {
    if (cup === null || round.done[cup]) return;
    const before = round.done[cup]; round = settlePour(round, cup);
    if (!before && round.done[cup]) cupFinished(cup);
    else if (round.fills[cup]) {
      const over = pourFeedback(round, cup) === 'over';
      status = over ? 'Kicsit sok lett. Ürítsd ki ezt a poharat, és próbáljuk újra!' : 'Még egy kicsi víz kell a jelzésig.';
      say(over ? 'pour_over' : 'pour_more');
    }
  }

  function release() {
    const cup = flowingCup ?? heldCup;
    held = false; heldCup = null; pointer = null; drag = null; keys.clear(); clearTimeout(pulseTimer);
    flowingCup = null; stopFlowSound(); settle(cup); update(); startLoop();
  }

  function currentInput() {
    if (!playable()) return { cup: null, strength: 0 };
    if (mode === 'buttons') return held && heldCup !== null ? { cup: heldCup, strength: heldStrength } : { cup: null, strength: 0 };
    if (reference === null || calibrationAt !== null || performance.now() - sensorAt > 750 || neutralRequired) return { cup: null, strength: 0 };
    const input = tiltPourInput(filtered);
    return latchedCup !== null && input.cup !== null && input.cup !== latchedCup ? { cup: null, strength: 0 } : input;
  }

  function drawWater() {
    const radians = pose.angle * Math.PI / 180;
    const liquid = jugLiquid(round.remaining / JUG_CAPACITY, pose.angle);
    $('#pour-jug').setAttribute('transform', `translate(${pose.x} 120) rotate(${pose.angle})`);
    $('#pour-jug-water').setAttribute('points', liquid.points.map(p => p.join(',')).join(' '));
    $('#pour-jug-water').toggleAttribute('hidden', !round.remaining);
    $('#pour-jug-surface').toggleAttribute('hidden', !round.remaining);
    $('#pour-jug-surface').setAttribute('d', liquid.surface.length >= 2 ? `M${liquid.surface.map(p => p.join(',')).join('L')}` : '');
    $('#pour-flow').toggleAttribute('hidden', flowingCup === null);
    if (flowingCup === null) return;
    const x = pose.x + JUG_SPOUT[0] * Math.cos(radians) - JUG_SPOUT[1] * Math.sin(radians);
    const y = 120 + JUG_SPOUT[0] * Math.sin(radians) + JUG_SPOUT[1] * Math.cos(radians);
    const top = waterTop(flowingCup), d = `M${x} ${y}Q${x + 6} ${(y + top) / 2} ${x + 2} ${top}`;
    $('#pour-stream').setAttribute('d', d); $('#pour-stream-glint').setAttribute('d', d);
    $('#pour-stream').style.strokeWidth = 7 + currentInput().strength * 8;
    $('#pour-splash').setAttribute('transform', `translate(${x + 2} ${top})`);
  }

  function tick(now) {
    frame = null;
    if (!playable()) { release(); lastFrame = 0; return; }
    const dt = lastFrame ? Math.min(.08, (now - lastFrame) / 1000) : 0; lastFrame = now;
    if (mode === 'tilt' && now - sensorAt > 2500) {
      useButtons('Most nem érkezik mozgásadat. Játsszunk a gombokkal!'); return;
    }
    const input = currentInput(), threshold = jugPourAngle(round.remaining / JUG_CAPACITY);
    if (input.cup !== null) selected = input.cup;
    const targetX = cupX(selected) - 78;
    const targetAngle = input.strength && round.remaining ? Math.min(104, threshold + 7 + input.strength * 20) : 0;
    const ease = reducedMotion.matches ? 1 : 1 - Math.exp(-12 * dt);
    pose.x += (targetX - pose.x) * ease; pose.angle += (targetAngle - pose.angle) * ease;
    const canFlow = input.cup !== null && input.strength > 0 && round.remaining > 0 && Math.abs(pose.x - targetX) < 6 && pose.angle >= threshold;
    if (flowingCup !== null && (!canFlow || input.cup !== flowingCup)) { settle(flowingCup); flowingCup = null; stopFlowSound(); }
    if (canFlow) {
      flowingCup = input.cup;
      const spilledBefore = round.spills[input.cup];
      round = advancePour(round, input.cup, input.strength, dt); setFlowSound(input.strength);
      if (!spilledBefore && round.spills[input.cup]) { status = 'Hopp, kicsordul a víz! Állítsd meg az öntést!'; say('pour_spill'); }
      if (!round.remaining) {
        flowingCup = null; stopFlowSound(); settle(input.cup);
        if (!emptyNotified) { emptyNotified = true; status = 'Üres a kancsó. A Feltöltöm gombbal hozhatsz még vizet!'; say('pour_empty'); }
      }
    }
    update();
    const moving = Math.abs(pose.x - targetX) > .1 || Math.abs(pose.angle - targetAngle) > .1;
    if (mode === 'tilt' || held || moving) frame = requestAnimationFrame(tick);
    else { pose = { x: targetX, angle: targetAngle }; drawWater(); lastFrame = 0; }
  }
  function startLoop() { if (!frame && playable()) { lastFrame = 0; frame = requestAnimationFrame(tick); } }

  function setFlowSound(strength) {
    const context = getAudioContext?.();
    if (!context || context.state !== 'running') return;
    if (!flowSound) {
      if (!noiseBuffer || noiseBuffer.sampleRate !== context.sampleRate) {
        noiseBuffer = context.createBuffer(1, context.sampleRate, context.sampleRate);
        const samples = noiseBuffer.getChannelData(0);
        for (let i = 0; i < samples.length; i++) samples[i] = (Math.random() * 2 - 1) * (.55 + .45 * Math.sin(i / context.sampleRate * Math.PI * 18));
      }
      const source = context.createBufferSource(), filter = context.createBiquadFilter(), gain = context.createGain();
      source.buffer = noiseBuffer; source.loop = true; filter.type = 'lowpass'; filter.frequency.value = 850;
      gain.gain.value = 0; source.connect(filter); filter.connect(gain); gain.connect(context.destination); source.start();
      flowSound = { source, filter, gain };
    }
    flowSound.gain.gain.setTargetAtTime(.025 * strength, context.currentTime, .03);
  }
  function stopFlowSound() {
    if (!flowSound) return;
    flowSound.gain.gain.value = 0; flowSound.source.stop(); flowSound.source.disconnect(); flowSound.filter.disconnect(); flowSound.gain.disconnect(); flowSound = null;
  }

  function resetCalibration() {
    reference = null; calibrationAt = null; filtered = 0; neutralRequired = true; latchedCup = null;
    sensorAngle = orientation(); sensorAt = performance.now();
    sensorNote = 'Tartsd kényelmesen, középen! Felvesszük a kezdőhelyzetet.';
  }
  function sensor(event) {
    if (!playable() || mode !== 'tilt') return;
    const angle = orientation(), value = screenTilt(event.beta, event.gamma, angle);
    if (value === null) return;
    if (angle !== sensorAngle) { release(); resetCalibration(); }
    sensorAt = performance.now();
    if (reference === null) { reference = value; calibrationAt = sensorAt; }
    if (calibrationAt !== null) {
      reference += relativeTilt(value, reference) * .2;
      if (sensorAt - calibrationAt >= 500) {
        calibrationAt = null; neutralRequired = false;
        sensorNote = 'Balra: Maci · jobbra: Nyuszi · középen: megáll.'; status = 'Döntsd finoman a telefont a választott pohár felé!';
      }
      update(); return;
    }
    const difference = relativeTilt(value, reference);
    filtered += (difference - filtered) * .22;
    if (Math.abs(difference) < 5) { filtered = 0; neutralRequired = false; latchedCup = null; }
    const input = tiltPourInput(filtered);
    if (!neutralRequired && input.cup !== null && latchedCup === null) latchedCup = input.cup;
    if (!neutralRequired && latchedCup !== null && input.cup !== null && input.cup !== latchedCup) {
      neutralRequired = true; status = 'Hozd vissza középre, és utána tölts a másik pohárba!'; say('pour_centre');
    }
    startLoop();
  }
  function detachSensor() { window.removeEventListener('deviceorientation', sensor); }

  async function enableTilt() {
    if (!active || pending || awarded) return;
    if (mode === 'tilt') { release(); resetCalibration(); update(); startLoop(); return; }
    release();
    if (!window.isSecureContext || !window.DeviceOrientationEvent) {
      useButtons('Ezen az eszközön a döntés nem érhető el. A gombokkal és a nyilakkal is játszhatsz.'); return;
    }
    const token = ++generation;
    pending = true; sensorNote = 'Engedélyezd a döntögetést, ha a készülék rákérdez!'; render();
    try {
      const request = window.DeviceOrientationEvent.requestPermission;
      const permission = typeof request === 'function' ? await request.call(window.DeviceOrientationEvent) : 'granted';
      if (!active || token !== generation) return;
      if (permission !== 'granted') { useButtons('A döntögetés nem kapott engedélyt. Játsszunk a gombokkal!'); return; }
      pending = false; mode = 'tilt'; resetCalibration();
      window.addEventListener('deviceorientation', sensor); render(); startLoop();
      getAudioContext?.()?.resume().catch(() => {}); say('pour_tilt');
    } catch {
      if (active && token === generation) useButtons('A döntögetést most nem sikerült bekapcsolni. A gombokkal folytathatod.');
    }
  }
  function useButtons(note = '') {
    generation++; pending = false; release(); detachSensor(); mode = 'buttons'; sensorNote = note;
    status = 'Válassz poharat, és tölts a jelzésig!'; render();
  }

  function restart(level) {
    onRestart();
    release(); generation++; pending = false; awarded = false; round = newPourRound(level); selected = 0; pose = { x: 127, angle: 0 }; emptyNotified = false;
    if (mode === 'tilt') resetCalibration();
    status = 'Tölts a jelzésig, majd állítsd meg az öntést!';
    render(); if (mode === 'tilt') startLoop(); repeat();
  }
  function repeat() {
    release();
    say(round.done.every(Boolean) ? 'pour_done' : mode === 'tilt' ? 'pour_tilt' : round.level === 3 ? 'pour_two' : round.level === 2 ? 'pour_manual' : 'pour_start');
    if (mode === 'tilt') neutralRequired = true;
  }
  function suspend() {
    if (!active) return;
    release(); suspended = true; cancelAnimationFrame(frame); frame = null; lastFrame = 0; stopPlayback(); pose.angle = 0; update();
    if (mode === 'tilt') resetCalibration();
  }
  function resume() {
    if (!active || document.hidden) return;
    suspended = false;
    if (mode === 'tilt' && !awarded) { resetCalibration(); update(); startLoop(); }
  }
  document.addEventListener('visibilitychange', () => document.hidden ? suspend() : resume());
  window.addEventListener('blur', suspend); window.addEventListener('focus', resume); window.addEventListener('pagehide', suspend);
  window.addEventListener('keydown', event => {
    if (!playable() || !['ArrowLeft', 'ArrowRight'].includes(event.code) || event.altKey || event.ctrlKey || event.metaKey || event.target.closest('input,select,textarea,[contenteditable="true"]')) return;
    event.preventDefault(); if (event.repeat) return;
    if (mode !== 'buttons' || pending) useButtons();
    keys.add(event.code);
    if (keys.size > 1) { const pressed = new Set(keys); release(); keys = pressed; return; }
    beginHold(event.code === 'ArrowLeft' ? 0 : 1);
  });
  window.addEventListener('keyup', event => {
    if (!active || !keys.has(event.code)) return;
    event.preventDefault(); const pressed = new Set(keys); pressed.delete(event.code); release(); keys = pressed;
    if (keys.size === 1) beginHold(keys.has('ArrowLeft') ? 0 : 1);
  });

  return {
    start() { active = true; suspended = false; mode = 'buttons'; sensorNote = ''; restart(Number(getOptions().pourLevel)); },
    stop() { release(); active = false; generation++; pending = false; detachSensor(); cancelAnimationFrame(frame); frame = null; lastFrame = 0; stopPlayback(); },
    repeat,
  };
}
