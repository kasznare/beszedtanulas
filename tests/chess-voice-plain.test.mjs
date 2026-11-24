import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { CHESS_CLIPS } from '../chess-data.js';
import { compileVoiceManifest } from '../scripts/build-voice-manifest.mjs';

// The user rejected every chess line recorded from IPA or doubled vowels ("galogcsata").
// Chess speaks its displayed Hungarian spelling; other games keep their scoped inputs.
test('every chess line is sent to the voice model as its plain displayed Hungarian text', async () => {
  const { clips } = await compileVoiceManifest();
  const chess = clips.filter(clip => clip.group === 'chess');
  assert.equal(chess.length, Object.keys(CHESS_CLIPS).length);
  for (const clip of chess) {
    assert.equal(clip.text, CHESS_CLIPS[clip.id]);
    assert.equal(clip.spokenText, undefined, clip.id);
    assert.equal(clip.spokenTarget, undefined, clip.id);
    assert.equal(clip.extract, undefined, clip.id);
  }
});

test('no voice repair or rejection-free override reintroduces phonetic chess input', async () => {
  const repairs = JSON.parse(await readFile(new URL('../voice-repairs.json', import.meta.url), 'utf8'));
  assert.deepEqual(Object.keys(repairs.clips).filter(id => id.startsWith('chess_')), []);
  const rejected = JSON.parse(await readFile(new URL('../voice-rejections.json', import.meta.url), 'utf8')).recordings;
  assert.ok(rejected.some(entry => entry.id === 'chess_pawns_intro' && entry.status === 'rejected-by-user'));
});
