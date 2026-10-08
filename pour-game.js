import { POUR_LEVELS, newPourRound, advancePour, settlePour, pourFeedback, screenTilt, relativeTilt, tiltPourInput } from './pour-data.js';

export function setupPourGame({ getOptions, setLevel, speak, stopPlayback, onComplete, getAudioContext }) {
  const root = document.querySelector('#pour');
  const names = ['Maci', 'Nyuszi'];
  let active = false, suspended = false, awarded = false, round = newPourRound(), selected = 0;
  let mode = 'buttons', pending = false, generation = 0, frame, lastFrame = 0, pulseTimer;
  let pointer = null, held = false, heldCup = null, keys = new Set(), flowingCup = null;
  let sensorAt = 0, calibrationAt = null, reference = null, filtered = 0, neutralRequired = true, latchedCup = null;
  let sensorAngle = 0, flowSound = null, noiseBuffer = null;
  let status = '', sensorNote = '';
  const $ = selector => root.querySelector(selector);
  const say = id => { if (active && !suspended && !document.hidden) speak(id); };
  const orientation = () => screen.orientation?.angle ?? window.orientation ?? 0;
  const playable = () => active && !suspended && !awarded && !document.hidden && !document.querySelector('dialog[open]');

  function art() {
    return `<svg class="pour-art" viewBox="0 0 640 400" aria-hidden="true">
      <defs><clipPath id="pour-glass-0"><path d="M155 240h100l-12 113q-38 16-76 0z"/></clipPath><clipPath id="pour-glass-1"><path d="M385 240h100l-12 113q-38 16-76 0z"/></clipPath></defs>
      <circle cx="568" cy="58" r="25" fill="#f8cc67"/><g fill="#b8d5bf"><ellipse cx="45" cy="190" rx="22" ry="50"/><ellipse cx="601" cy="207" rx="22" ry="55"/></g>
      <path d="M0 252q140-40 280 0t360 0v148H0z" fill="#d5e4c1"/>
      <g id="pour-bear"><circle cx="135" cy="181" r="22" fill="#b97d51"/><circle cx="245" cy="181" r="22" fill="#b97d51"/><circle cx="135" cy="181" r="12" fill="#edc59a"/><circle cx="245" cy="181" r="12" fill="#edc59a"/><rect x="136" y="170" width="108" height="95" rx="43" fill="#c99162"/><ellipse cx="164" cy="218" rx="11" ry="7" fill="#e9a17f"/><ellipse cx="216" cy="218" rx="11" ry="7" fill="#e9a17f"/><circle cx="169" cy="204" r="5" fill="#49382d"/><circle cx="211" cy="204" r="5" fill="#49382d"/><ellipse cx="190" cy="231" rx="24" ry="18" fill="#f5d7af"/><path d="M183 224q7-5 14 0q-1 8-7 8t-7-8" fill="#49382d"/><path d="M182 239q8 8 16 0" fill="none" stroke="#49382d" stroke-width="3" stroke-linecap="round"/></g>
      <g id="pour-rabbit"><ellipse cx="404" cy="152" rx="17" ry="42" fill="#eee6d8" transform="rotate(-10 404 152)"/><ellipse cx="461" cy="152" rx="17" ry="42" fill="#eee6d8" transform="rotate(10 461 152)"/><ellipse cx="404" cy="152" rx="8" ry="29" fill="#eeb4aa" transform="rotate(-10 404 152)"/><ellipse cx="461" cy="152" rx="8" ry="29" fill="#eeb4aa" transform="rotate(10 461 152)"/><rect x="381" y="175" width="106" height="86" rx="40" fill="#f7f0e5"/><ellipse cx="404" cy="222" rx="11" ry="7" fill="#eeb4aa"/><ellipse cx="464" cy="222" rx="11" ry="7" fill="#eeb4aa"/><circle cx="413" cy="207" r="5" fill="#49382d"/><circle cx="455" cy="207" r="5" fill="#49382d"/><path d="M427 224q7-5 14 0l-7 7z" fill="#c9867d"/><path d="M425 237q9 9 18 0" fill="none" stroke="#49382d" stroke-width="3" stroke-linecap="round"/></g>
      <path d="M75 272h490l30 107H45z" fill="#fbe0cd" stroke="#dfb89c" stroke-width="3"/><g stroke="#fff7e7" stroke-width="8" opacity=".65"><path d="M68 302h505M57 335h525M150 273l-13 104M251 273l-5 104M389 273l5 104M490 273l13 104"/></g>
      ${[0, 1].map(i => `<g><ellipse cx="${205 + i * 230}" cy="365" rx="62" ry="9" fill="#bca48a" opacity=".25"/><rect id="pour-highlight-${i}" class="pour-cup-highlight" x="${143 + i * 230}" y="230" width="124" height="135" rx="20"/><path class="pour-glass" d="M${155 + i * 230} 240h100l-12 113q-38 16-76 0z"/><g clip-path="url(#pour-glass-${i})"><rect id="pour-water-${i}" class="pour-water" x="${153 + i * 230}" y="354" width="104" height="0"/><rect id="pour-band-${i}" x="${153 + i * 230}" width="104" height="14" fill="#f8cc67" opacity=".55"/></g><path id="pour-target-${i}" class="pour-target"/><path d="M${160 + i * 230} 242h90" stroke="#528394" stroke-width="5" stroke-linecap="round"/><text id="pour-ready-${i}" class="pour-cup-ready" x="${205 + i * 230}" y="320" text-anchor="middle"></text></g>`).join('')}
      <path id="pour-stream" class="pour-stream" hidden/>
      <g id="pour-jug"><path d="M-42-43q-48 3-36 42q7 20 34 9" fill="none" stroke="#659ba5" stroke-width="12"/><path d="M-44-54h74l14 13 28-9-16 28-12 5 7 62q-46 21-93 0z" fill="#edf8f5" stroke="#528394" stroke-width="5" stroke-linejoin="round"/><path d="M-41-8q38 7 80 0l7 50q-42 16-84 0z" fill="#80c7df"/><path d="M-29-37v26" stroke="#fff" stroke-width="7" stroke-linecap="round"/><path d="M-43-54h73" stroke="#528394" stroke-width="6" stroke-linecap="round"/><circle cx="0" cy="19" r="10" fill="#f8cc67"/><path d="M-4 19h8M0 15v8" stroke="#b9903e" stroke-width="2"/></g>
      <g id="pour-splash" hidden fill="#69b8d5"><circle cx="195" cy="236" r="4"/><circle cx="215" cy="232" r="3"/><circle cx="205" cy="228" r="3"/></g>
    </svg>`;
  }

  function render() {
    const rule = POUR_LEVELS[round.level - 1];
    root.innerHTML = `<div class="pour-heading"><p><strong>Kínáljuk meg a barátainkat!</strong><br><span id="pour-level-name">${rule.name} · Tölts a jelzésig!</span></p><div class="pour-levels" role="group" aria-label="Öntés nehézsége">${POUR_LEVELS.map(level => `<button data-pour-level="${level.id}" aria-label="${level.id}. szint: ${level.name}" aria-pressed="${level.id === round.level}">${level.id}</button>`).join('')}</div></div>
      <div class="pour-layout"><div class="pour-scene">${art()}</div><div class="pour-controls">
        <div class="pour-cups" role="group" aria-label="Válassz poharat">${names.map((name, i) => `<button class="pour-cup" data-pour-cup="${i}" aria-pressed="${selected === i}"><span class="pour-cup-name">${i ? '🐰' : '🧸'} ${name}</span><small id="pour-amount-${i}">Üres pohár</small></button>`).join('')}</div>
        <div class="pour-actions"><button id="pour-hold" class="pour-hold" aria-label="Öntés a kiválasztott pohárba. Tartsd nyomva, majd engedd el!">💧 Tartsd nyomva!</button><button id="pour-empty" class="pour-empty">↶ Kiürítem</button></div>
        <p class="pour-hint" id="pour-hint">Válassz poharat, majd tartsd nyomva az öntést!<br>Gépen a ← és → nyíllal is tölthetsz.</p>
        <p id="pour-status" class="pour-status" role="status"></p>
        <div class="pour-mode" role="group" aria-label="Játék irányítása"><button id="pour-buttons" aria-pressed="${mode === 'buttons'}">☝ Gombokkal</button><button id="pour-tilt" aria-pressed="${mode === 'tilt'}" ${pending ? 'disabled' : ''}>${pending ? 'Egy pillanat…' : mode === 'tilt' ? '↔ Középhelyzet' : '↔ Döntögetéssel'}</button></div>
        <p id="pour-sensor-note" class="pour-sensor-note"></p>
        <div class="pour-footer"><button id="pour-restart">↻ Új poharak</button><button id="pour-finish" class="pour-finish" disabled>✓ Kész a piknik!</button></div>
      </div></div>`;
    root.querySelectorAll('[data-pour-level]').forEach(button => button.addEventListener('click', () => {
      const level = Number(button.dataset.pourLevel);
      setLevel(level); restart(level);
    }));
    root.querySelectorAll('[data-pour-cup]').forEach(button => button.addEventListener('click', () => {
      release(); selected = Number(button.dataset.pourCup); update();
    }));
    $('#pour-buttons').addEventListener('click', () => useButtons());
    $('#pour-tilt').addEventListener('click', enableTilt);
    $('#pour-empty').addEventListener('click', () => {
      release(); round.fills[selected] = 0; round.done[selected] = false;
      neutralRequired = true; status = `${names[selected]} pohara üres. Töltsünk újra!`; update();
    });
    $('#pour-restart').addEventListener('click', () => restart(round.level));
    $('#pour-finish').addEventListener('click', () => {
      if (!playable() || !round.done.every(Boolean)) return;
      awarded = true; release(); cancelAnimationFrame(frame); detachSensor(); stopPlayback(); onComplete(2);
    });
    const hold = $('#pour-hold');
    hold.addEventListener('pointerdown', event => {
      if (!event.isPrimary || event.button !== 0 || !playable() || mode !== 'buttons' || round.done[selected]) return;
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
    update();
  }

  function update() {
    if (!$('#pour-status')) return;
    const complete = round.done.every(Boolean);
    for (let i = 0; i < 2; i++) {
      const fill = round.fills[i], top = 354 - fill * 110, target = 354 - round.targets[i] * 110;
      const water = $(`#pour-water-${i}`); water.setAttribute('y', top); water.setAttribute('height', fill * 110);
      $(`#pour-band-${i}`).setAttribute('y', target - 7);
      $(`#pour-target-${i}`).setAttribute('d', `M${151 + i * 230} ${target}h108`);
      $(`#pour-highlight-${i}`).toggleAttribute('hidden', selected !== i);
      const ready = $(`#pour-ready-${i}`), readyText = round.done[i] ? '✓' : '';
      if (ready.textContent !== readyText) ready.textContent = readyText;
      const button = $(`[data-pour-cup="${i}"]`);
      button.setAttribute('aria-pressed', selected === i); button.dataset.done = round.done[i];
      button.setAttribute('aria-label', `${names[i]} pohara: ${Math.round(fill * 100)} százalék. Cél: ${Math.round(round.targets[i] * 100)} százalék.${round.done[i] ? ' Elkészült.' : ''}`);
      const amount = $(`#pour-amount-${i}`), label = round.done[i] ? '✓ Elkészült!' : pourFeedback(round, i) === 'over' ? 'Sok lett · ürítsd ki!' : `Jel: ${round.level === 3 ? (i ? 'magasabban' : 'fél pohár') : 'ugyanannyi'}`;
      if (amount.textContent !== label) amount.textContent = label;
    }
    const statusText = complete ? 'Mindkét pohár elkészült! Kezdődhet a piknik!' : status;
    if ($('#pour-status').textContent !== statusText) $('#pour-status').textContent = statusText;
    if ($('#pour-sensor-note').textContent !== sensorNote) $('#pour-sensor-note').textContent = sensorNote;
    $('#pour-hold').disabled = mode !== 'buttons' || round.done[selected] || awarded;
    $('#pour-hold').dataset.held = held;
    $('#pour-empty').disabled = round.fills[selected] === 0 || awarded;
    $('#pour-empty').textContent = `↶ ${names[selected]} pohara`;
    $('#pour-finish').disabled = !complete || awarded;
    $('#pour-hint').hidden = mode === 'tilt';
    const cup = flowingCup ?? selected, strength = currentInput().strength;
    const degrees = flowingCup === null ? 0 : 18 + strength * 18;
    const radians = degrees * Math.PI / 180;
    const spoutX = 70 * Math.cos(radians) + 50 * Math.sin(radians);
    const spoutY = 70 * Math.sin(radians) - 50 * Math.cos(radians);
    const jugX = flowingCup === null ? 320 : 205 + cup * 230 - spoutX;
    $('#pour-jug').setAttribute('transform', `translate(${jugX} 104) rotate(${degrees})`);
    $('#pour-stream').toggleAttribute('hidden', flowingCup === null);
    $('#pour-stream').setAttribute('d', `M${jugX + spoutX} ${104 + spoutY} Q${205 + cup * 230 - 5} 183 ${205 + cup * 230} ${354 - round.fills[cup] * 110}`);
    $('#pour-splash').toggleAttribute('hidden', flowingCup === null || !POUR_LEVELS[round.level - 1].automatic && round.fills[cup] < 1);
    $('#pour-splash').setAttribute('transform', `translate(${cup * 230} ${354 - round.fills[cup] * 110 - 232})`);
  }

  function beginHold(cup) {
    if (!playable() || round.done[cup]) return;
    held = true; heldCup = cup; selected = cup;
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
    held = false; heldCup = null; pointer = null; keys.clear(); clearTimeout(pulseTimer);
    flowingCup = null; stopFlowSound(); settle(cup); update();
  }

  function currentInput() {
    if (!playable()) return { cup: null, strength: 0 };
    if (mode === 'buttons') return held && heldCup !== null ? { cup: heldCup, strength: .85 } : { cup: null, strength: 0 };
    if (reference === null || calibrationAt !== null || performance.now() - sensorAt > 750 || neutralRequired) return { cup: null, strength: 0 };
    const input = tiltPourInput(filtered);
    return latchedCup !== null && input.cup !== null && input.cup !== latchedCup ? { cup: null, strength: 0 } : input;
  }

  function tick(now) {
    frame = null;
    if (!playable()) { release(); lastFrame = 0; return; }
    const dt = lastFrame ? (now - lastFrame) / 1000 : 0; lastFrame = now;
    if (mode === 'tilt' && now - sensorAt > 2500) {
      useButtons('Most nem érkezik mozgásadat. Játsszunk a gombokkal!'); return;
    }
    const input = currentInput();
    if (flowingCup !== null && (input.cup !== flowingCup || !input.strength)) { settle(flowingCup); flowingCup = null; stopFlowSound(); }
    if (input.cup !== null && input.strength && !round.done[input.cup]) {
      selected = input.cup; flowingCup = input.cup;
      const before = round.done[input.cup]; round = advancePour(round, input.cup, input.strength, dt);
      setFlowSound(input.strength);
      if (!before && round.done[input.cup]) {
        flowingCup = null; stopFlowSound(); cupFinished(input.cup); neutralRequired = true;
      }
      update();
    } else if (flowingCup === null) { stopFlowSound(); update(); }
    if (mode === 'tilt' || held) frame = requestAnimationFrame(tick);
    else lastFrame = 0;
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
    release(); generation++; pending = false; awarded = false; round = newPourRound(level); selected = 0;
    if (mode === 'tilt') resetCalibration();
    status = round.level === 1 ? 'Tölts a jelzésig! Ott magától megáll a víz.' : 'Tölts a jelzésig, majd állítsd meg az öntést!';
    render(); if (mode === 'tilt') startLoop(); repeat();
  }
  function repeat() {
    release();
    say(round.done.every(Boolean) ? 'pour_done' : mode === 'tilt' ? 'pour_tilt' : round.level === 3 ? 'pour_two' : round.level === 2 ? 'pour_manual' : 'pour_start');
    if (mode === 'tilt') neutralRequired = true;
  }
  function suspend() {
    if (!active) return;
    release(); suspended = true; cancelAnimationFrame(frame); frame = null; lastFrame = 0; stopPlayback();
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
