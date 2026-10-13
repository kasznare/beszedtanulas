// Short, local action sounds. Speech and story audio use their own destination.
const tone = (frequency, length = .08, peak = .12, at = 0, type = 'sine', endFrequency = frequency) => ({ frequency, length, peak, at, type, endFrequency });
const noise = (frequency, length = .07, peak = .12, at = 0, filter = 'bandpass') => ({ noise: true, frequency, length, peak, at, filter });
const wood = (frequency = 440, at = 0) => [tone(frequency, .095, .18, at, 'sine', frequency * .65), tone(frequency * 2.6, .035, .045, at), noise(1500, .026, .12, at)];
export const ACTION_SOUNDS = Object.freeze({
  click: [tone(820, .038, .07), noise(2200, .025, .04)],
  select: [tone(680, .065, .08, 0, 'sine', 900)],
  grab: [noise(1100, .055, .09), tone(510, .06, .08, 0, 'sine', 750)],
  wood: wood(),
  fall: [...wood(480), ...wood(270, .13), tone(180, .15, .05, .17)],
  slide: [noise(650, .16, .12, 0, 'lowpass'), ...wood(340, .12)],
  ball: [tone(980, .12, .07), tone(1450, .075, .03), tone(730, .09, .04, .07)],
  card: [noise(2500, .1, .09), tone(400, .035, .03, .08)],
  snap: [noise(1800, .04, .1), tone(580, .075, .12, .02, 'sine', 410)],
  chess: [...wood(380), tone(790, .04, .035, .055)],
  chessCapture: [...wood(245), ...wood(460, .075)],
  fabric: [noise(3400, .15, .1), noise(1600, .07, .04, .09)],
  serve: [tone(1150, .14, .06), tone(1710, .085, .025), ...wood(350, .025)],
  collect: [tone(610, .085, .09, 0, 'sine', 800), tone(1020, .08, .035, .055)],
  step: [noise(650, .055, .13, 0, 'lowpass'), tone(190, .055, .1)],
  machine: [noise(1900, .045, .1), tone(320, .15, .06, .025, 'triangle', 450)],
  undo: [noise(2100, .08, .06), tone(780, .09, .055, 0, 'sine', 460)],
  retry: [tone(440, .07, .055), tone(370, .085, .04, .07)],
  success: [tone(660, .12, .1), tone(830, .12, .085, .075), tone(990, .2, .075, .15)],
  listen: [tone(520, .07, .006), tone(620, .075, .005, .08)],
});

export function normalizeEffectOptions(source = {}) {
  if (!source || typeof source !== 'object') source = {};
  return { soundEffects: source.soundEffects !== false, effectsVolume: typeof source.effectsVolume === 'number' && Number.isFinite(source.effectsVolume) ? Math.max(0, Math.min(1, source.effectsVolume)) : .6 };
}

export function createInteractionAudio({ getContext, getOptions, isCapturing = () => false, isNarrating = () => false, isHidden = () => false, now = () => performance.now(), onPlay = () => {} }) {
  let bus = null, context = null, noiseBuffer = null, generation = 0, pendingPlay = 0, lastAction = -Infinity;
  const voices = new Set(), timers = new Set(), recent = new Map();
  const options = () => normalizeEffectOptions(getOptions());
  const allowed = kind => { const value = options(); return value.soundEffects && value.effectsVolume > 0 && !isHidden() && (kind === 'listen' || !isCapturing()); };

  function sync() {
    if (!bus) return;
    const value = options();
    const gain = value.soundEffects && !isHidden() && !isCapturing() ? value.effectsVolume * (isNarrating() ? .3 : 1) : 0;
    bus.gain.setTargetAtTime(gain, context.currentTime, .008);
  }
  function destination() {
    let next;
    try { next = getContext(); } catch { return null; }
    if (!next || next.state === 'closed') return null;
    if (context !== next) {
      stop(); bus?.disconnect(); context = next; noiseBuffer = null;
      bus = context.createGain(); bus.gain.value = 0; bus.connect(context.destination);
    }
    sync(); return bus;
  }
  function makeNoise() {
    if (noiseBuffer) return noiseBuffer;
    noiseBuffer = context.createBuffer(1, Math.ceil(context.sampleRate * .3), context.sampleRate);
    const samples = noiseBuffer.getChannelData(0);
    for (let i = 0; i < samples.length; i++) samples[i] = Math.random() * 2 - 1;
    return noiseBuffer;
  }
  function release(voice) {
    if (!voices.delete(voice)) return;
    clearTimeout(voice.timer);
    for (const node of voice.nodes) {
      try { node.stop?.(); } catch { /* An ended source is already silent. */ }
      try { node.disconnect(); } catch { /* A disconnected source needs no cleanup. */ }
    }
  }
  function synthesize(kind) {
    if (!allowed(kind) || !bus || context.state !== 'running') return false;
    // A microphone's start cue is brief and finishes before speech collection.
    sync();
    if (kind === 'listen' && isCapturing()) bus.gain.setTargetAtTime(options().effectsVolume, context.currentTime, .008);
    if (voices.size >= 4) release(voices.values().next().value);
    const voice = { nodes: [], timer: null }; voices.add(voice);
    const started = context.currentTime;
    for (const part of ACTION_SOUNDS[kind]) {
      const gain = context.createGain(), source = part.noise ? context.createBufferSource() : context.createOscillator();
      const at = started + part.at;
      gain.gain.setValueAtTime(.0001, at);
      gain.gain.exponentialRampToValueAtTime(part.peak, at + .003);
      gain.gain.exponentialRampToValueAtTime(.0001, at + part.length);
      gain.connect(bus); voice.nodes.push(source, gain);
      if (part.noise) {
        source.buffer = makeNoise();
        const filter = context.createBiquadFilter(); filter.type = part.filter; filter.frequency.value = part.frequency; filter.Q.value = .8;
        source.connect(filter); filter.connect(gain); voice.nodes.push(filter);
      } else {
        source.type = part.type; source.frequency.setValueAtTime(part.frequency, at); source.frequency.exponentialRampToValueAtTime(part.endFrequency, at + part.length); source.connect(gain);
      }
      source.start(at); source.stop(at + part.length + .01);
    }
    const length = Math.max(...ACTION_SOUNDS[kind].map(part => part.at + part.length));
    voice.timer = setTimeout(() => { release(voice); sync(); }, (length + .04) * 1000);
    onPlay(kind); return true;
  }
  function play(kind = 'click') {
    if (!Object.hasOwn(ACTION_SOUNDS, kind)) return false;
    const time = now();
    if (kind !== 'click') lastAction = time;
    if (!allowed(kind) || time - (recent.get(kind) ?? -Infinity) < 45) return false;
    recent.set(kind, time);
    const request = ++pendingPlay;
    if (!destination()) return false;
    if (context.state !== 'running') {
      const token = generation;
      context.resume().then(() => { if (token === generation && request === pendingPlay && now() - time < 1000) synthesize(kind); }).catch(() => {});
      return false;
    }
    return synthesize(kind);
  }
  function stop() {
    generation++;
    for (const timer of timers) clearTimeout(timer); timers.clear();
    for (const voice of [...voices]) release(voice);
    sync();
  }
  function unlock() {
    if (!destination()) return;
    if (context.state !== 'running') {
      context.resume().catch(() => {});
      // iOS needs an active source during the gesture to wake its audio graph.
      // One zero sample unlocks playback without an audible sound.
      const source = context.createBufferSource();
      source.buffer = context.createBuffer(1, 1, context.sampleRate);
      source.connect(context.destination); source.onended = () => source.disconnect(); source.start();
    }
  }
  function preview() {
    stop();
    for (const [kind, delay] of [['grab', 0], ['wood', 220], ['success', 480]]) {
      if (!delay) play(kind);
      else { const timer = setTimeout(() => { timers.delete(timer); play(kind); }, delay); timers.add(timer); }
    }
  }
  return { play, stop, sync, preview, destination, unlock, hasActionSince: time => lastAction >= time };
}

export function setupInterfaceEffects({ audio, root = document, skipSelector = '', now = () => performance.now() }) {
  const unlock = event => { if (event.target.closest?.('button, a[href], input, select')) audio.unlock(); };
  const click = event => {
    const target = event.target.closest?.('button, a[href], input[type="checkbox"]');
    if (!target || target.disabled || target.closest('[inert]') || target.dataset.effect === 'none' || skipSelector && target.matches(skipSelector)) return;
    const at = now();
    // Game handlers first decide what happened. Their material sound replaces
    // the generic click, including when rendering removes the original button.
    // A microtask can run between native event listeners in Safari. Wait for
    // the entire click dispatch, so navigation cannot cancel the click cue.
    setTimeout(() => { if (!event.defaultPrevented && !audio.hasActionSince(at)) audio.play('click'); }, 0);
  };
  const change = event => { if (event.target.matches?.('select')) audio.play('select'); };
  root.addEventListener('click', click, true); root.addEventListener('change', change);
  root.addEventListener('pointerdown', unlock, true); root.addEventListener('keydown', unlock, true);
  return () => { root.removeEventListener('click', click, true); root.removeEventListener('change', change); root.removeEventListener('pointerdown', unlock, true); root.removeEventListener('keydown', unlock, true); };
}
