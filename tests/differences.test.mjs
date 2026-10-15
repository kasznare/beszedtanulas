import test from 'node:test';
import assert from 'node:assert/strict';
import { DIFFERENCE_SCENES, DIFFERENCE_LEVELS, createDifferenceRound, findDifferenceAt } from '../differences-data.js';
import { renderDifferenceScene } from '../differences-art.js';
import { GROUPS, canonicalTrail } from '../navigation.js';
import { nextTask } from '../next-task.js';

const rng = seed => () => ((seed = (1664525 * seed + 1013904223) >>> 0) / 2 ** 32);
const groupFor = (svg, id) => {
  const start = svg.indexOf(`<g data-difference-id="${id}"`);
  assert.notEqual(start, -1, `visible drawing group for ${id}`);
  const tags = /<g(?:\s[^>]*)?>|<\/g>/g;
  tags.lastIndex = start;
  let depth = 0;
  for (let match; (match = tags.exec(svg));) {
    depth += match[0] === '</g>' ? -1 : 1;
    if (!depth) return svg.slice(start, tags.lastIndex);
  }
  throw Error(`Unclosed drawing group: ${id}`);
};

test('four authored scenes have unique, labelled differences and bounded hit ellipses', () => {
  assert.equal(DIFFERENCE_SCENES.length, 4);
  assert.equal(new Set(DIFFERENCE_SCENES.map(scene => scene.id)).size, 4);
  assert.deepEqual(DIFFERENCE_LEVELS.map(level => level.count), [5, 7, 10]);
  for (const scene of DIFFERENCE_SCENES) {
    assert.ok(scene.name && scene.subtitle);
    assert.ok(scene.differences.length > 10, `${scene.id} has spare differences for replay`);
    assert.equal(new Set(scene.differences.map(item => item.id)).size, scene.differences.length);
    for (const item of scene.differences) {
      assert.ok(item.label && item.hint, `${scene.id}/${item.id}: meaningful visual help`);
      assert.ok([1, 2, 3].includes(item.difficulty));
      const { x, y, rx, ry } = item.area;
      assert.ok([x, y, rx, ry].every(Number.isFinite));
      assert.ok(rx > 0 && ry > 0 && x - rx >= 0 && x + rx <= 100 && y - ry >= 0 && y + ry <= 100, `${scene.id}/${item.id}: bounded ellipse`);
    }
  }
});

test('all scene and level rounds are reproducible, varied, unique, and leave source data intact', () => {
  const original = JSON.stringify(DIFFERENCE_SCENES);
  for (const scene of DIFFERENCE_SCENES) for (const [index, level] of DIFFERENCE_LEVELS.entries()) {
    const variants = new Set();
    for (let seed = 1; seed <= 24; seed++) {
      const round = createDifferenceRound(scene.id, level.id, rng(Math.imul(seed, 0x9e3779b9) >>> 0));
      assert.deepEqual(round, createDifferenceRound(scene.id, level.id, rng(Math.imul(seed, 0x9e3779b9) >>> 0)));
      assert.equal(round.sceneId, scene.id);
      assert.equal(round.levelId, level.id);
      assert.equal(round.ids.length, level.count);
      assert.equal(new Set(round.ids).size, level.count);
      assert.ok(round.ids.every(id => scene.differences.some(item => item.id === id && item.difficulty <= index + 1)));
      variants.add([...round.ids].sort().join('|'));
    }
    assert.ok(variants.size >= 3, `${scene.id}/${level.id}: genuinely different detail sets`);
  }
  assert.equal(JSON.stringify(DIFFERENCE_SCENES), original);
});

test('invalid selections and random-source edge values still produce a playable round', () => {
  for (const value of [0, 1, -1, 2, NaN, Infinity, undefined]) {
    const round = createDifferenceRound('unknown', 'unknown', () => value);
    assert.equal(round.sceneId, DIFFERENCE_SCENES[0].id);
    assert.equal(round.levelId, 'observer');
    assert.equal(round.ids.length, 7);
    assert.equal(new Set(round.ids).size, 7);
  }
});

test('hit testing accepts each ellipse and excludes inactive, found, out-of-bounds, and corner points', () => {
  for (const scene of DIFFERENCE_SCENES) for (const item of scene.differences) {
    const { x, y, rx, ry } = item.area;
    for (const [dx, dy] of [[0, 0], [.999, 0], [-.999, 0], [0, .999], [0, -.999], [.7, .7]]) {
      assert.equal(findDifferenceAt(scene.id, [item.id], x + dx * rx, y + dy * ry)?.id, item.id);
    }
    for (const [dx, dy] of [[1.01, 0], [-1.01, 0], [0, 1.01], [0, -1.01], [.8, .8]]) {
      assert.equal(findDifferenceAt(scene, [item.id], x + dx * rx, y + dy * ry), undefined);
    }
    assert.equal(findDifferenceAt(scene, [], x, y), undefined);
    assert.equal(findDifferenceAt(scene, [item.id], x, y, [item.id]), undefined);
  }
  for (const [x, y] of [[NaN, 50], [50, Infinity], [-1, 0], [101, 50], [50, -1], [50, 101]]) {
    assert.equal(findDifferenceAt(DIFFERENCE_SCENES[0], ['sun'], x, y), undefined);
  }
  assert.equal(findDifferenceAt('unknown', [], 50, 50), undefined);
});

test('each SVG variant alters only its own authored detail; inactive differences remain identical', () => {
  for (const scene of DIFFERENCE_SCENES) {
    const base = renderDifferenceScene(scene.id, [], 'qa');
    assert.match(base, /^<svg\b/);
    assert.match(base, /viewBox="0 0 800 520"/);
    assert.doesNotMatch(base, /<script\b|<foreignObject\b|<image\b|https?:\/\/(?!www\.w3\.org)/i);
    for (const difference of scene.differences) {
      const changed = renderDifferenceScene(scene.id, [difference.id], 'qa');
      const originalGroup = groupFor(base, difference.id), changedGroup = groupFor(changed, difference.id);
      assert.notEqual(changedGroup, originalGroup, `${scene.id}/${difference.id}: variant changes its drawing`);
      assert.equal(changed.replace(changedGroup, ''), base.replace(originalGroup, ''), `${scene.id}/${difference.id}: all unrelated art stays identical`);
      for (const inactive of scene.differences.filter(item => item.id !== difference.id)) {
        assert.equal(groupFor(changed, inactive.id), groupFor(base, inactive.id));
      }
    }
    const selected = scene.differences.filter((_, index) => index % 2).map(item => item.id);
    const multiple = renderDifferenceScene(scene.id, selected, 'qa');
    for (const difference of scene.differences) {
      assert.equal(groupFor(multiple, difference.id), groupFor(renderDifferenceScene(scene.id, selected.includes(difference.id) ? [difference.id] : [], 'qa'), difference.id));
    }
    assert.equal(renderDifferenceScene(scene.id, ['not-a-difference'], 'qa'), base);
  }
});

test('paired illustrations namespace their SVG definitions to prevent cross-image references', () => {
  for (const scene of DIFFERENCE_SCENES) {
    const ids = prefix => [...renderDifferenceScene(scene.id, [], prefix).matchAll(/\sid="([^"]+)"/g)].map(match => match[1]);
    const left = ids('left'), right = ids('right');
    assert.ok(left.length > 0);
    assert.equal(new Set([...left, ...right]).size, left.length + right.length);
  }
});

test('the game has one menu home and a related picture activity', () => {
  assert.deepEqual(GROUPS.filter(group => group.screens.includes('differences')).map(group => group.screen), ['activity-menu']);
  assert.deepEqual(canonicalTrail({ screen: 'differences' }).map(route => route.screen), ['home', 'activity-menu', 'differences']);
  assert.equal(nextTask('differences').screen, 'puzzle');
});
