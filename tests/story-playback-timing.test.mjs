import test from 'node:test';
import assert from 'node:assert/strict';
import { createStoryPlaybackClock, storyAnimationTime, storyPlaybackTime } from '../story-playback-timing.js';
import { STORY_PLAYBACK_MAPS } from '../story-playback-maps.js';
import { AUDIOBOOKS } from '../audiobook-data.js';
import { STORY_VISUAL_LIBRARY, storySceneAt } from '../story-visual-library.js';

test('word anchors follow changes in narration pace rather than scaling the whole story', () => {
  const clock = createStoryPlaybackClock([[0, 0], [2, 6], [8, 9], [10, 18]]);
  assert.equal(clock.animationTime(1), 3);
  assert.equal(clock.animationTime(5), 7.5);
  assert.equal(clock.animationTime(9), 13.5);
  assert.equal(clock.animationTime(-2), 0);
  assert.equal(clock.animationTime(NaN), 0);
  assert.equal(clock.animationTime(999), 18);
  for (const seconds of [0, 1, 2, 3.25, 8, 9.8, 10]) assert.ok(Math.abs(clock.playbackTime(clock.animationTime(seconds)) - seconds) < 1e-10);
});

test('a longer pause holds the original pose while seeking stays deterministic', () => {
  const clock = createStoryPlaybackClock([[0, 0], [2, 4], [5, 4], [8, 9]]);
  assert.equal(clock.animationTime(3), 4);
  assert.equal(clock.animationTime(4.5), 4);
  assert.equal(clock.playbackTime(4), 5);
  assert.ok(clock.animationTime(5.001) > 4);
});

test('recordings without word anchors retain their playback clock', () => {
  const clock = createStoryPlaybackClock();
  assert.equal(clock.animationTime(139), 139);
  assert.equal(clock.playbackTime(139), 139);
  assert.equal(storyAnimationTime('unknown', 139), 139);
  assert.equal(storyPlaybackTime('unknown', 139), 139);
});

test('bad anchors cannot create reverse animation or invalid SVG times', () => {
  for (const points of [[[1, 0], [2, 3]], [[0, 0]], [[0, 0], [1, NaN]], [[0, 0], [1, -1]],
    [[0, 0], [1, 2], [1, 3]], [[0, 0], [1, 3], [2, 2]]]) assert.throws(() => createStoryPlaybackClock(points));
});

test('published word anchors cover each new recording and all original animation scenes', () => {
  for (const [id, mapping] of Object.entries(STORY_PLAYBACK_MAPS)) {
    const recording = AUDIOBOOKS.find(story => story.id === id), visual = STORY_VISUAL_LIBRARY.find(story => story.id === id);
    assert.ok(recording && visual, id);
    assert.equal(mapping.duration, recording.duration, id);
    assert.equal(mapping.originalDuration, visual.visualDuration, id);
    assert.deepEqual(mapping.points[0], [0, 0], id);
    assert.deepEqual(mapping.points.at(-1), [recording.duration, visual.visualDuration], id);
    let previous = -1;
    for (const [seconds, original] of mapping.points) {
      const mapped = storyAnimationTime(id, seconds);
      assert.ok(Math.abs(mapped - original) < 1e-7 && mapped >= previous, `${id}: word at ${seconds}`);
      previous = mapped;
    }
    for (let index = 1; index < visual.scenes.length; index++) {
      const scene = visual.scenes[index], seconds = storyPlaybackTime(id, scene.time);
      assert.equal(storySceneAt(id, storyAnimationTime(id, seconds + .0001)).id, scene.id, `${id}: after ${scene.id}`);
      assert.equal(storySceneAt(id, storyAnimationTime(id, seconds - .0001)).id, visual.scenes[index - 1].id, `${id}: before ${scene.id}`);
    }
    assert.equal(storySceneAt(id, storyAnimationTime(id, recording.duration)).id, visual.scenes.at(-1).id, `${id}: final scene`);
  }
});
