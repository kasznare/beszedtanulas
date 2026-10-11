import test from 'node:test';
import assert from 'node:assert/strict';
import { STORY_PLAYBACK_MAPS } from '../story-playback-maps.js';

test('the illustration boundary maps seeks, frame clocks and motion changes exactly once', async () => {
  const originalMaps = { first: STORY_PLAYBACK_MAPS['story-01'], second: STORY_PLAYBACK_MAPS['story-02'] };
  const originalGlobals = { matchMedia: globalThis.matchMedia, requestAnimationFrame: globalThis.requestAnimationFrame, cancelAnimationFrame: globalThis.cancelAnimationFrame };
  STORY_PLAYBACK_MAPS['story-01'] = { points: [[0, 0], [50, 100], [100, 246.168]], originalDuration: 246.168 };
  delete STORY_PLAYBACK_MAPS['story-02'];
  let tick, time = 0, cancellations = 0, visual;
  globalThis.matchMedia = () => ({ matches: false, addEventListener() {}, removeEventListener() {} });
  globalThis.requestAnimationFrame = callback => { tick = callback; return 1; };
  globalThis.cancelAnimationFrame = () => { cancellations++; };
  // Scene callbacks and the clock do not require an SVG layout engine.
  const host = { dataset: {}, innerHTML: '', setAttribute() {}, querySelectorAll() { return []; }, querySelector() { return null; }, replaceChildren() { this.innerHTML = ''; } };
  try {
    const { createIllustratedStory } = await import('../story-visual-player.js');
    visual = createIllustratedStory(host, { readTime: () => time });
    visual.render(50);
    assert.equal(host.dataset.scene, 'water');
    assert.equal(host.dataset.time, '100.000');
    time = 80; visual.setMotion(false);
    assert.equal(host.dataset.scene, 'team');
    assert.equal(host.dataset.time, '187.701');
    visual.setMotion(true); visual.sync(80, true); time = 90; tick();
    assert.equal(host.dataset.scene, 'finish');
    assert.equal(host.dataset.time, '216.934');
    visual.sync(90, false);
    assert.ok(cancellations > 0);
    visual.select('story-02', 20);
    assert.equal(host.dataset.time, '20.000');
    visual.destroy();
    assert.equal(host.innerHTML, '');
  } finally {
    visual?.destroy();
    for (const [key, value] of Object.entries(originalGlobals)) if (value === undefined) delete globalThis[key]; else globalThis[key] = value;
    for (const [id, value] of [['story-01', originalMaps.first], ['story-02', originalMaps.second]]) if (value === undefined) delete STORY_PLAYBACK_MAPS[id]; else STORY_PLAYBACK_MAPS[id] = value;
  }
});
