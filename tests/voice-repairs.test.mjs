import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { compileVoiceManifest } from '../scripts/build-voice-manifest.mjs';
import { validateVoiceRepairs, applyBoundedExcerpts } from '../scripts/voice-repairs.mjs';

const config = JSON.parse(await readFile(new URL('../voice-config.json', import.meta.url)));
const empty = () => ({ version: 1, model_id: config.model_id, language_code: config.language_code,
  clips: {}, boundedExcerpts: [] });
const original = await compileVoiceManifest({ repairs: empty() });
const clip = id => original.clips.find(clip => clip.id === id);

test('exact orthographic repair overrides common IPA and leaves displayed text unchanged', async () => {
  const source = original.clips.find(clip => clip.text === 'víz');
  const repairs = empty();
  repairs.clips[source.id] = { text: source.text, spokenTarget: 'vííz' };
  const actual = (await compileVoiceManifest({ repairs })).clips.find(clip => clip.id === source.id);
  assert.equal(actual.text, 'víz');
  assert.equal(actual.spokenTarget, 'vííz');
  assert.equal(actual.spokenText, 'Mondjuk együtt: vííz.');
  assert.equal(actual.spokenText.slice(actual.extract.from, actual.extract.to), 'vííz');
  assert.equal(original.clips.find(clip => clip.id === source.id).spokenTarget, source.spokenTarget);
});

test('full-model repairs propagate through rhyme parts and exact part overrides win', async () => {
  const repairs = empty();
  const id = 'r_rhyme_roka_1';
  repairs.clips[id] = { text: clip(id).text, spokenTarget: 'Robot őőrzi a répát.' };
  let compiled = await compileVoiceManifest({ repairs });
  let part = compiled.clips.find(clip => clip.id === 'r_rhyme_part_roka_1_0');
  assert.equal(part.spokenTarget, 'Robot őőrzi');
  assert.equal(part.spokenText, 'Mondjuk együtt: Robot őőrzi a répát.');
  repairs.clips[part.id] = { text: part.text, spokenTarget: 'Roobot őrzi' };
  compiled = await compileVoiceManifest({ repairs });
  part = compiled.clips.find(clip => clip.id === part.id);
  assert.equal(part.spokenTarget, 'Roobot őrzi');
  assert.equal(part.spokenText, 'Mondjuk együtt: Roobot őrzi.');
});

test('exact phrase repair survives later paid-source aliasing', async () => {
  const repairs = empty(), id = 'phrase_kerek_almat';
  repairs.clips[id] = { text: clip(id).text, spokenTarget: 'kéérek almát' };
  const actual = (await compileVoiceManifest({ repairs })).clips.find(clip => clip.id === id);
  assert.equal(actual.spokenTarget, 'kéérek almát');
  assert.equal(actual.spokenText, 'Mondjuk együtt: kéérek almát.');
});

test('reject stale IDs/text, invalid mappings, malformed IPA and incompatible model/language', () => {
  const source = clip('word_alma');
  for (const mutate of [
    r => { r.clips.unknown_clip = { text: 'alma', spokenTarget: 'alma' }; },
    r => { r.clips[source.id] = { text: 'stale alma', spokenTarget: 'alma' }; },
    r => { r.clips[source.id] = { text: source.text, spokenTarget: 'egy alma' }; },
    r => { r.clips[source.id] = { text: source.text, spokenTarget: '/ɒlmɒ' }; },
    r => { r.model_id = 'wrong-model'; },
    r => { r.language_code = 'en'; },
    r => { r.clips[source.id] = { text: source.text, spokenTarget: 'alma', accepted: true }; },
  ]) {
    const repairs = empty(); mutate(repairs);
    assert.throws(() => validateVoiceRepairs(repairs, config, original.clips), /Invalid voice repairs/);
  }
});

test('bounds require unique existing excerpts and survive compiler derivation', async () => {
  const repairs = empty(), id = 'r_rhyme_part_roka_1_0';
  repairs.boundedExcerpts = [id];
  const compiled = await compileVoiceManifest({ repairs });
  assert.equal(compiled.clips.find(clip => clip.id === id).extract.boundToAdjacentWords, true);
  assert.equal(compiled.clips.find(clip => clip.id === 'r_rhyme_part_roka_1_1').extract.boundToAdjacentWords, undefined);
  repairs.boundedExcerpts = [id, id];
  assert.throws(() => validateVoiceRepairs(repairs, config, original.clips), /repeated/);
  repairs.boundedExcerpts = ['unknown_clip'];
  assert.throws(() => validateVoiceRepairs(repairs, config, original.clips), /unknown bounded/);
  repairs.boundedExcerpts = ['plain'];
  assert.throws(() => applyBoundedExcerpts(repairs, [{ id: 'plain', text: 'alma' }]), /invalid bounded/);
});

test('in-memory and sandbox compiler are deterministic and leave production artifacts untouched', async () => {
  const production = new URL('../audio/voice/manifest.json', import.meta.url);
  const before = await readFile(production);
  assert.deepEqual(await compileVoiceManifest({ repairs: empty() }), original);
  assert.deepEqual(await readFile(production), before);
  const sandbox = await mkdtemp(join(tmpdir(), 'voice-manifest-'));
  try {
    const compiler = new URL('../scripts/build-voice-manifest.mjs', import.meta.url);
    const run = () => execFileSync(process.execPath, [compiler.pathname, '--output-dir', sandbox]);
    run();
    const first = await readFile(join(sandbox, 'audio/voice/manifest.json'));
    run();
    assert.deepEqual(await readFile(join(sandbox, 'audio/voice/manifest.json')), first);
    assert.deepEqual(await readFile(production), before);
  } finally { await rm(sandbox, { recursive: true, force: true }); }
});
