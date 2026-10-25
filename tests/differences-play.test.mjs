import test from 'node:test';
import assert from 'node:assert/strict';
import { DIFFERENCE_SCENES, DIFFERENCE_LEVELS, DIFFERENCE_VARIANTS, differenceVariants, createDifferenceRound, findDifferenceAt, differenceStars, differenceHint } from '../differences-data.js';
import { renderDifferenceScene } from '../differences-art.js';
import { DIFFERENCE_CLIPS } from '../differences-voice.js';

const rng = seed => () => ((seed = (1664525 * seed + 1013904223) >>> 0) / 2 ** 32);
const groupFor = (svg, id) => {
  const start = svg.indexOf(`<g data-difference-id="${id}"`), tags = /<g(?:\s[^>]*)?>|<\/g>/g;
  tags.lastIndex = start;
  let depth = 0;
  for (let match; (match = tags.exec(svg));) { depth += match[0] === '</g>' ? -1 : 1; if (!depth) return svg.slice(start, tags.lastIndex); }
  throw Error(id);
};

test('Kezdő is an easier entry level with three obvious changes and larger tap areas', () => {
  const [starter, ...rest] = DIFFERENCE_LEVELS;
  assert.equal(starter.id, 'starter'); assert.equal(starter.count, 3); assert.ok(starter.hitScale > 1.4);
  assert.deepEqual(starter.variants, ['missing', 'extra']);
  assert.ok(rest.every(level => level.count > starter.count && level.hitScale <= starter.hitScale));
  for (const scene of DIFFERENCE_SCENES) for (let seed = 1; seed < 30; seed++) {
    const round = createDifferenceRound(scene.id, 'starter', rng(seed));
    assert.equal(round.ids.length, 3);
    assert.ok(round.ids.every(id => ['missing', 'extra'].includes(round.variants[id])));
    assert.ok(round.ids.every(id => scene.differences.find(item => item.id === id).difficulty === 1));
  }
});

test('every round chooses a variant per difference, so replays of the same detail differ', () => {
  for (const scene of DIFFERENCE_SCENES) for (const level of DIFFERENCE_LEVELS) {
    const seen = new Map();
    for (let seed = 1; seed <= 60; seed++) {
      const round = createDifferenceRound(scene.id, level.id, rng(seed));
      assert.deepEqual(Object.keys(round.variants).sort(), [...round.ids].sort());
      for (const id of round.ids) {
        const variant = round.variants[id];
        assert.ok(level.variants.includes(variant) && differenceVariants(id).includes(variant), `${scene.id}/${level.id}/${id}: ${variant}`);
        seen.set(id, new Set([...(seen.get(id) || []), variant]));
      }
    }
    const varied = [...seen.values()].filter(kinds => kinds.size >= 2).length;
    assert.ok(varied >= Math.min(3, seen.size), `${scene.id}/${level.id}: details come in several variants`);
  }
  assert.ok(!differenceVariants('sun').includes('mirror'), 'symmetric drawings are never "mirrored"');
  assert.ok(differenceVariants('teapot').includes('mirror'));
});

test('each variant changes only its own detail and is drawn differently from the original', () => {
  for (const scene of DIFFERENCE_SCENES) {
    const base = renderDifferenceScene(scene.id, [], 'qa');
    for (const difference of scene.differences) for (const variant of differenceVariants(difference.id)) {
      const changed = renderDifferenceScene(scene.id, { [difference.id]: variant }, 'qa');
      const before = groupFor(base, difference.id), after = groupFor(changed, difference.id);
      assert.notEqual(after, before, `${scene.id}/${difference.id}/${variant}`);
      assert.equal(changed.replace(after, ''), base.replace(before, ''), `${scene.id}/${difference.id}/${variant}: nothing else moves`);
      if (variant === 'authored') assert.equal(changed, renderDifferenceScene(scene.id, [difference.id], 'qa'));
      if (variant === 'color') assert.match(after, /filter="url\(#qa-recolour\)"/);
      if (variant === 'missing') assert.match(after, /clip-path="url\(#qa-area-[^"]+\)"><\/g><\/g>$/);
      if (variant === 'mirror') assert.match(after, /scale\(-1 1\)/);
    }
    assert.match(base, /<filter id="qa-recolour"/);
  }
});

test('larger tap areas reach further, and overlapping areas choose the nearer detail', () => {
  const scene = DIFFERENCE_SCENES[0], sun = scene.differences.find(item => item.id === 'sun');
  const x = sun.area.x + sun.area.rx * 1.4, y = sun.area.y;
  assert.equal(findDifferenceAt(scene, ['sun'], x, y), undefined);
  assert.equal(findDifferenceAt(scene, ['sun'], x, y, [], 1.6)?.id, 'sun');
  assert.equal(findDifferenceAt(scene, ['sun'], sun.area.x, sun.area.y, [], 0.2)?.id, 'sun', 'a scale below one is ignored');
  for (const [a, b] of [['kite', 'sun'], ['birdhouse', 'bunting']]) {
    const first = scene.differences.find(item => item.id === a);
    assert.equal(findDifferenceAt(scene, [a, b], first.area.x, first.area.y, [], 3)?.id, a);
  }
});

test('stars drop for scattered tapping and hints; hints for variants keep only the location', () => {
  assert.equal(differenceStars({}), 5);
  assert.equal(differenceStars({ misses: 2 }), 5);
  assert.equal(differenceStars({ misses: 3 }), 4);
  assert.equal(differenceStars({ misses: 7, hints: 1 }), 2);
  assert.equal(differenceStars({ misses: 50, hints: 9 }), 1);
  const birdhouse = DIFFERENCE_SCENES[0].differences.find(item => item.id === 'birdhouse');
  assert.equal(differenceHint(birdhouse), birdhouse.hint);
  assert.equal(differenceHint(birdhouse, 'missing'), 'Az almafán kis madárodú lóg.');
  for (const scene of DIFFERENCE_SCENES) for (const item of scene.differences) assert.ok(differenceHint(item, 'color').length > 5);
  assert.deepEqual(DIFFERENCE_VARIANTS, ['authored', 'color', 'missing', 'extra', 'mirror']);
  assert.ok(DIFFERENCE_CLIPS.differences_hint);
});
