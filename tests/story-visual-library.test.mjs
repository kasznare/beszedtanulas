import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { AUDIOBOOKS } from '../audiobook-data.js';
import { STORY_VISUAL_LIBRARY, storySceneAt, storyCaptionAt } from '../story-visual-library.js';
import { createBaseArt } from '../story-art/base.js';

test('every recording has ordered playback captions and an original animation timeline', () => {
  assert.deepEqual(STORY_VISUAL_LIBRARY.map(story => story.id), AUDIOBOOKS.map(story => story.id));
  for (const story of STORY_VISUAL_LIBRARY) {
    assert.ok(story.scenes.length >= 12, story.id);
    assert.equal(story.scenes[0].time, 0, story.id);
    assert.equal(new Set(story.scenes.map(scene => scene.id)).size, story.scenes.length, story.id);
    for (const [cues, duration] of [[story.scenes, story.visualDuration], [story.captions, story.duration]]) {
      assert.ok(cues.every((cue, index) => Number.isFinite(cue.time) && cue.time >= 0 && cue.time < duration && (!index || cue.time > cues[index - 1].time)), story.id);
    }
    assert.deepEqual(story.captions.map(caption => caption.text), story.text.split('\n'));
    assert.equal(storyCaptionAt(story.id, story.duration), story.text.split('\n').at(-1));
    assert.equal(storySceneAt(story.id, story.visualDuration), story.scenes.at(-1));
    for (let index = 1; index < story.scenes.length; index++) {
      const cue = story.scenes[index];
      assert.equal(storySceneAt(story.id, cue.time), cue);
      assert.equal(storySceneAt(story.id, cue.time - .001), story.scenes[index - 1]);
    }
  }
});

test('every new scene renders with the shared models and locally resolved SVG paints', () => {
  const art = createBaseArt('sharedcheck');
  for (const story of STORY_VISUAL_LIBRARY.filter(story => !story.legacy)) for (const scene of story.scenes) {
    const frame = story.frame(scene, art);
    assert.match(frame, /viewBox="0 0 1280 720"/, `${story.id}/${scene.id}`);
    assert.doesNotMatch(frame, /NaN|undefined|Infinity|<script|<animate\b/, `${story.id}/${scene.id}`);
    const ids = [...frame.matchAll(/\bid="([^"]+)"/g)].map(match => match[1]);
    assert.equal(new Set(ids).size, ids.length, `${story.id}/${scene.id}: duplicate SVG ids`);
    for (const [, id] of frame.matchAll(/url\(#([^\)]+)\)/g)) assert.ok(ids.includes(id), `${story.id}/${scene.id}: missing ${id}`);
    assert.match(frame, /data-actor=/, `${story.id}/${scene.id}: missing cast`);
  }
});

test('shared art and story modules are included in the offline and publication manifest', async () => {
  const worker = await readFile(new URL('../sw.js', import.meta.url), 'utf8');
  const assets = JSON.parse(worker.match(/const ASSETS = (\[[\s\S]*?\]);/)[1]).map(asset => asset.file);
  for (const file of ['story-visual-player.js', 'story-visual-library.js', 'story-caption-timing.js', 'story-playback-maps.js', 'story-playback-timing.js',
    'story-art/base.js', 'story-art/vehicles.js', 'story-art/animate.js', 'story-art/workshop.js', 'story-art/routes.js', 'story-art/seasons.js',
    'story-scenes/workshop.js', 'story-scenes/routes.js', 'story-scenes/seasons.js']) assert.ok(assets.includes(file), file);
});
