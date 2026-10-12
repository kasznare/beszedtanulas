import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { RADO_STORIES } from '../rado-stories.js';
import { RADO_WORD_TIMING } from '../rado-word-timing.js';
import { AUDIOBOOKS } from '../audiobook-data.js';
import { STORY_CAPTION_TIMES } from '../story-caption-timing.js';
import { radoCaption } from '../rado-library.js';

const read = file => readFile(new URL(`../${file}`, import.meta.url));
const hash = value => createHash('sha256').update(value).digest('hex');

test('both source tables of contents are covered completely and in source order', async () => {
  const source = JSON.parse(await read('content/stories/rado-sources.json'));
  const catalog = JSON.parse(await read('content/stories/catalog.json'));
  assert.equal(RADO_STORIES.length, 50);
  assert.equal(new Set(RADO_STORIES.map(s => s.id)).size, 50);
  for (const [volume, count] of [['I', 31], ['II', 19]]) {
    const stories = RADO_STORIES.filter(s => s.volume === volume);
    const provenance = source.volumes.find(v => v.volume === volume);
    assert.equal(stories.length, count);
    assert.deepEqual(stories.map(s => s.sourceIndex), Array.from({length: count}, (_, i) => i + 1));
    assert.deepEqual(stories.map(s => s.title), provenance.toc.map(s => s.title));
    assert.deepEqual(provenance.images, []);
    assert.ok(provenance.resources.every(r => r.bytes > 0 && /^[a-f0-9]{64}$/.test(r.sha256)));
    assert.ok(provenance.resources.filter(r => r.role === 'embedded').every(r => r.mimeType.includes('javascript')));
    for (const story of stories) {
      const bytes = await read(`content/stories/${story.file}`);
      assert.equal(hash(bytes), story.sha256);
      assert.equal(bytes.toString().trimEnd(), story.text);
      assert.equal(story.characters, Array.from(story.text).length);
      assert.ok(story.text.split('\n').filter(s => s.trim()).length >= story.paragraphs, 'Intentional verse br breaks remain within HTML paragraphs');
      assert.ok(story.text.startsWith(story.opening) && story.text.endsWith(story.ending), story.id);
      assert.deepEqual(catalog.stories.find(s => s.id === story.id).footnotes, story.footnotes);
      assert.equal(story.rights.license, 'CC BY-SA 3.0');
      assert.equal(new URL(story.sourceUrl).hash, `#${story.sourceIndex}`);
      assert.equal(story.illustrated, false);
    }
  }
  assert.ok(RADO_STORIES.at(-1).text.endsWith('Gallér híján köpönyeg,\nHazudtam, mert volt kinek.'));
  assert.ok(RADO_STORIES.find(s => s.id === 'rado-i-31').text.endsWith('hogy keresni kellett a párját.'));
  assert.equal(RADO_STORIES.reduce((n, s) => n + s.footnotes.length, 0), 5);
  assert.deepEqual(RADO_STORIES.find(s => s.id === 'rado-i-01').sameTitleAs, ['story-14']);
  assert.deepEqual(RADO_STORIES.find(s => s.id === 'rado-i-06').sameTitleAs, ['story-18']);
});

test('all 50 provider plans retain the source, use Jessa and include full costs', async () => {
  const plan = JSON.parse(await read('content/stories/rado-plan.json'));
  const config = JSON.parse(await read('voice-config.json'));
  assert.deepEqual(plan.config, config);
  assert.equal(plan.stories.length, 50);
  assert.equal(plan.providerCharacters, plan.stories.reduce((n, s) => n + s.providerCharacters, 0));
  assert.equal(plan.pendingCharacters, plan.stories.filter(s => s.audioStatus === 'pending').reduce((n, s) => n + s.providerCharacters, 0));
  for (const row of plan.stories) {
    const story = RADO_STORIES.find(s => s.id === row.id);
    assert.equal(row.title, story.title);
    assert.equal(row.displayCharacters, Array.from(`${story.title}\n\n${story.text}`).length);
    assert.equal(row.partCharacters.reduce((n, x) => n + x, 0), row.providerCharacters);
    assert.ok(row.partCharacters.every(x => x > 0 && x <= 10000));
    assert.equal(row.partInputSha256.length, row.parts);
    assert.equal(row.conservativeCredits, row.providerCharacters);
  }
});

test('long recordings remain optional and are not downloaded with the basic games', async () => {
  const worker = (await read('sw.js')).toString();
  const required = JSON.parse(worker.match(/const ASSETS = (\[[\s\S]*?\]);/)[1]);
  const optional = JSON.parse(worker.match(/const OPTIONAL_ASSETS = (\[[\s\S]*?\]);/)[1]);
  assert.ok(required.some(a => a.file === 'rado-stories.js'), 'Every complete text is readable with the offline games');
  assert.ok(required.every(a => !a.file.startsWith('audio/audiobooks/')), 'No long audiobook is eagerly installed');
  assert.deepEqual(optional.map(a => a.file), AUDIOBOOKS.map(s => s.file));
});

test('pending tales cannot look playable; real recordings cover every displayed word and paragraph', async () => {
  const receipts = JSON.parse(await read('audio/audiobooks/generated.json'));
  for (const story of RADO_STORIES) {
    const audio = AUDIOBOOKS.find(s => s.id === story.id);
    if (story.audioStatus === 'pending') {
      assert.equal(audio, undefined);
      assert.equal(RADO_WORD_TIMING[story.id], undefined);
      assert.equal(STORY_CAPTION_TIMES[story.id], undefined);
      assert.equal(radoCaption(story, 100), '');
      continue;
    }
    assert.ok(audio);
    const words = RADO_WORD_TIMING[story.id];
    assert.deepEqual(words.map(w => w[2]), `${story.title}\n\n${story.text}`.match(/[\p{L}\p{N}_]+(?:[-’'][\p{L}\p{N}_]+)*/gu));
    assert.ok(words.every(([start, end]) => start >= 0 && end >= start && end <= audio.duration + .05));
    assert.ok(words.every((w, i) => !i || w[0] >= words[i - 1][0]));
    const captions = STORY_CAPTION_TIMES[story.id];
    const lines = story.text.split('\n').filter(line => line.trim());
    assert.equal(captions.length, lines.length);
    assert.ok(captions.every((time, i) => time < audio.duration && (!i || time > captions[i - 1])));
    assert.equal(radoCaption(story, 0), story.title);
    for (let i = 0; i < lines.length; i++) assert.equal(radoCaption(story, captions[i] + .00001), lines[i]);
    assert.equal(radoCaption(story, audio.duration), lines.at(-1));
    assert.ok(Number.isFinite(receipts.stories[story.id].credits));
    assert.equal(receipts.stories[story.id].schemaVersion, 3);
    assert.equal(audio.illustrated, false);
  }
});
