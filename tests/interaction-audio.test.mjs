import test from 'node:test';
import assert from 'node:assert/strict';
import { ACTION_SOUNDS, normalizeEffectOptions, createInteractionAudio, setupInterfaceEffects } from '../interaction-audio.js';

function fixture(state = 'running') {
  const nodes = [], played = [], controls = { options: {}, hidden: false, capturing: false, narrating: false, time: 100 };
  const param = () => ({ value: 0, setValueAtTime(value) { this.value = value; }, exponentialRampToValueAtTime(value) { this.value = value; }, setTargetAtTime(value) { this.value = value; } });
  const node = () => { const value = { gain: param(), frequency: param(), Q: param(), starts: [], stops: [], connected: null, disconnected: false, connect(destination) { this.connected = destination; }, disconnect() { this.disconnected = true; }, start(at) { this.starts.push(at); }, stop(at) { this.stops.push(at); } }; nodes.push(value); return value; };
  let finishResume;
  const context = { state, currentTime: 2, sampleRate: 44100, destination: {}, createGain: node, createOscillator: node, createBufferSource: node, createBiquadFilter: node,
    createBuffer(channels, count) { return { getChannelData: () => new Float32Array(count) }; },
    resume() { return new Promise(resolve => { finishResume = () => { context.state = 'running'; resolve(); }; }); },
  };
  const audio = createInteractionAudio({ getContext: () => context, getOptions: () => controls.options, isHidden: () => controls.hidden, isCapturing: () => controls.capturing, isNarrating: () => controls.narrating, now: () => controls.time, onPlay: kind => played.push(kind) });
  return { audio, nodes, played, controls, context, resume: () => finishResume() };
}

test('effect preferences have independent defaults and bounded finite volume', () => {
  assert.deepEqual(normalizeEffectOptions(null), { soundEffects: true, effectsVolume: .6 });
  assert.deepEqual(normalizeEffectOptions({ spokenGuidance: false }), { soundEffects: true, effectsVolume: .6 });
  assert.deepEqual(normalizeEffectOptions({ soundEffects: false, effectsVolume: 2 }), { soundEffects: false, effectsVolume: 1 });
  assert.equal(normalizeEffectOptions({ effectsVolume: -3 }).effectsVolume, 0);
  assert.equal(normalizeEffectOptions({ effectsVolume: NaN }).effectsVolume, .6);
});

test('every sound is short and connects to the effects bus, with separate capture and move sounds', () => {
  const f = fixture();
  for (const [kind, parts] of Object.entries(ACTION_SOUNDS)) {
    assert.ok(parts.every(part => part.at >= 0 && part.length > 0 && part.at + part.length <= .4 && part.peak > 0 && part.peak < .25));
    f.controls.time += 100; assert.equal(f.audio.play(kind), true);
  }
  assert.equal(f.played.length, Object.keys(ACTION_SOUNDS).length);
  const bus = f.audio.destination();
  assert.strictEqual(bus.connected, f.context.destination);
  assert.ok(f.nodes.filter(node => node.starts.length).every(node => node.connected));
  assert.notDeepEqual(ACTION_SOUNDS.chess, ACTION_SOUNDS.chessCapture);
  f.audio.stop();
  assert.ok(f.nodes.filter(node => node.starts.length).every(node => node.disconnected));
});

test('mute and zero volume stop short effects and silence the destination used by water', () => {
  const f = fixture(), bus = f.audio.destination();
  f.audio.play('fall');
  f.controls.options = { soundEffects: false }; f.audio.stop();
  assert.equal(bus.gain.value, 0); assert.equal(f.audio.play('wood'), false);
  f.controls.options = { effectsVolume: 0 }; f.audio.sync();
  assert.equal(bus.gain.value, 0); assert.equal(f.audio.play('chess'), false);
  f.controls.options = { effectsVolume: .25 }; f.audio.sync();
  assert.equal(bus.gain.value, .25);
});

test('narration ducks effects, capture blocks them, and visibility silences every effect', () => {
  const f = fixture(), bus = f.audio.destination();
  f.controls.narrating = true; f.audio.sync(); assert.equal(bus.gain.value, .18);
  f.controls.capturing = true; f.audio.sync(); assert.equal(bus.gain.value, 0); assert.equal(f.audio.play('card'), false);
  assert.equal(f.audio.play('listen'), true, 'the existing short start cue is allowed');
  f.controls.hidden = true; f.audio.stop(); assert.equal(bus.gain.value, 0); assert.equal(f.audio.play('listen'), false);
  f.controls.hidden = false; f.controls.capturing = false; f.controls.narrating = false; f.audio.sync(); assert.equal(bus.gain.value, .6);
  f.audio.stop();
});

test('a delayed audio unlock never replays a sound after navigation or after a stale gesture', async () => {
  for (const invalidation of ['stop', 'stale']) {
    const f = fixture('suspended'); f.audio.play('grab');
    if (invalidation === 'stop') f.audio.stop(); else f.controls.time += 1500;
    f.resume(); await Promise.resolve(); assert.equal(f.played.length, 0);
  }
});

test('a throttled duplicate cannot cancel the pending first sound during audio unlock', async () => {
  const f = fixture('suspended'); f.audio.play('click'); f.audio.play('click'); f.resume(); await Promise.resolve();
  assert.deepEqual(f.played, ['click']); f.audio.stop();
});

test('an interrupted audio context can resume its current gesture just like a suspended context', async () => {
  const f = fixture('interrupted'); f.audio.play('wood'); f.resume(); await Promise.resolve();
  assert.deepEqual(f.played, ['wood']); f.audio.stop();
});

test('pointer storms are throttled and a material sound replaces the generic interface click', async () => {
  const f = fixture(); f.audio.play('slide'); f.audio.play('slide'); assert.deepEqual(f.played, ['slide']);
  const handlers = new Map(), root = { addEventListener(type, handler) { handlers.set(type, handler); }, removeEventListener(type) { handlers.delete(type); } };
  setupInterfaceEffects({ audio: f.audio, root, now: () => f.controls.time });
  const target = { disabled: false, dataset: {}, closest: () => null, matches: () => false }, event = { target: { closest: () => target }, defaultPrevented: false };
  f.controls.time += 100; handlers.get('click')(event); f.audio.play('chess'); await new Promise(resolve => setTimeout(resolve, 5));
  assert.equal(f.played.includes('click'), false);
  f.controls.time += 100; handlers.get('click')(event); await new Promise(resolve => setTimeout(resolve, 5)); assert.equal(f.played.at(-1), 'click');
  f.audio.stop();
});

test('cancelling the preview clears all delayed notes', async () => {
  const f = fixture(); f.audio.preview(); f.audio.stop();
  await new Promise(resolve => setTimeout(resolve, 520));
  assert.deepEqual(f.played, ['grab']);
});
