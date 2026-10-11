import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { AUDIOBOOKS } from '../audiobook-data.js';
import { storyVisualFor } from '../story-visual-library.js';
import { STORY_PLAYBACK_MAPS } from '../story-playback-maps.js';

test('five complete public-domain classics have sources, authors and fixed recordings without scene requirements', async () => {
  const catalog = JSON.parse(await readFile(new URL('../content/stories/catalog.json', import.meta.url)));
  const classics = catalog.stories.filter(story => story.collection === 'Magyar klasszikusok');
  assert.equal(classics.length, 5);
  assert.deepEqual(classics.map(story => story.kind).sort(), ['Mese', 'Mese', 'Mese', 'Vers', 'Vers']);
  for (const entry of classics) {
    const story = AUDIOBOOKS.find(story => story.id === entry.id);
    assert.ok(story, entry.id);
    assert.equal(story.author, entry.author);
    assert.equal(story.kind, entry.kind);
    assert.equal(story.sourceUrl, entry.sourceUrl);
    assert.equal(new URL(story.sourceUrl).hostname, 'mek.oszk.hu');
    assert.equal(story.illustrated, false);
    assert.equal(storyVisualFor(entry.id), undefined);
    assert.equal(STORY_PLAYBACK_MAPS[entry.id], undefined);
    assert.equal(entry.rights.status, 'public-domain');
    assert.ok(entry.rights.authorDiedYear + 71 <= 2026);
    assert.deepEqual(entry.ageRange, [5, 8]);
    assert.ok(story.duration > 0 && story.duration < 480);
    assert.equal(story.text.includes('gal lyat'), false);
    assert.equal(story.text.includes('kir álykisasszony'), false);
    const lines = story.text.split('\n').filter(line => line.trim());
    assert.ok(lines.length > 5);
    assert.notEqual(lines[0], story.title);
    if (entry.kind === 'Vers') assert.ok(story.text.includes('\n\n'), 'Stanza breaks remain in poems');
  }
});
