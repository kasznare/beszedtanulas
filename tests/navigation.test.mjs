import test from 'node:test';
import assert from 'node:assert/strict';
import {
  GROUPS, parentScreen, normalizeRoute, canonicalTrail, normalizeTrail,
  transitionTrail, createHistoryState, restoreHistoryState,
} from '../navigation.js';

const route = (screen, category = 'all', numberMode = 'count') => ({ screen, category, numberMode });
const screenPath = trail => trail.map(entry => entry.screen);

test('the five menu groups contain every game exactly once and cards stay below topics', () => {
  assert.deepEqual(GROUPS.map(group => group.screen), ['picture-menu', 'practice-menu', 'number-menu', 'play-menu', 'activity-menu']);
  const games = GROUPS.flatMap(group => group.screens);
  assert.equal(new Set(games).size, games.length);
  assert.equal(games.length, 17);
  for (const group of GROUPS) {
    assert.equal(parentScreen(group.screen), 'home');
    for (const screen of group.screens) assert.equal(parentScreen(screen), group.screen);
  }
  assert.equal(parentScreen('cards'), 'topics');
  assert.equal(parentScreen('parent'), 'home');
  assert.equal(parentScreen('home'), 'home');
  assert.equal(parentScreen('not-a-screen'), 'home');
});

test('canonical paths preserve the selected category and number mode for restoration', () => {
  assert.deepEqual(screenPath(canonicalTrail(route('cards', 'animals'))), ['home', 'picture-menu', 'topics', 'cards']);
  const trail = canonicalTrail(route('numbers', 'food', 'quiz'));
  assert.deepEqual(screenPath(trail), ['home', 'number-menu', 'numbers']);
  assert.ok(trail.every(entry => entry.category === 'food' && entry.numberMode === 'quiz'));
  assert.deepEqual(screenPath(canonicalTrail(route('parent'))), ['home', 'parent']);
});

test('real navigation order survives cross-group recovery instead of jumping to a canonical parent', () => {
  let trail = canonicalTrail(route('home'));
  for (const screen of ['practice-menu', 'imitate', 'listening-game']) trail = transitionTrail(trail, route(screen, 'animals'));
  assert.deepEqual(screenPath(trail), ['home', 'practice-menu', 'imitate', 'listening-game']);
  const restored = restoreHistoryState(JSON.parse(JSON.stringify(createHistoryState(trail, 3))));
  assert.deepEqual(restored.trail, trail);
  assert.equal(restored.trail.at(-2).screen, 'imitate');
  assert.equal(restored.ownedDepth, 3);
  const earlierEntry = restoreHistoryState(createHistoryState(trail.slice(0, -1), 2));
  assert.equal(earlierEntry.route.screen, 'imitate');
  assert.equal(earlierEntry.route.category, 'animals');
});

test('same-screen changes replace only the current route and home starts a fresh trail', () => {
  const original = canonicalTrail(route('numbers'));
  const before = structuredClone(original);
  const changed = transitionTrail(original, route('numbers', 'nature', 'quiz'));
  assert.equal(changed.length, original.length);
  assert.deepEqual(changed.at(-1), route('numbers', 'nature', 'quiz'));
  assert.deepEqual(original, before);
  assert.deepEqual(transitionTrail(changed, route('home', 'nature', 'quiz')), [route('home', 'nature', 'quiz')]);
  assert.equal(createHistoryState(transitionTrail(changed, route('home')), 99).ownedDepth, 0);
});

test('different visits to the same game remain distinct and keep each visit settings', () => {
  let trail = canonicalTrail(route('numbers', 'food', 'quiz'));
  trail = transitionTrail(trail, route('number-menu', 'food', 'quiz'));
  trail = transitionTrail(trail, route('numbers', 'nature', 'count'));
  assert.deepEqual(screenPath(trail), ['home', 'number-menu', 'numbers', 'number-menu', 'numbers']);
  const restored = restoreHistoryState(createHistoryState(trail, 4));
  assert.equal(restored.trail[2].numberMode, 'quiz');
  assert.equal(restored.route.numberMode, 'count');
  assert.equal(restored.route.category, 'nature');
});

test('unknown route fields are normalized to known values and extra data is removed', () => {
  assert.deepEqual(normalizeRoute({ screen: 'injected', category: 'bad', numberMode: 'bad', secret: 'ignored' }), route('home'));
  assert.deepEqual(normalizeRoute({ screen: 'numbers' }, route('home', 'animals', 'quiz')), route('numbers', 'animals', 'quiz'));
  assert.deepEqual(normalizeRoute(null), route('home'));
});

test('corrupt, legacy and unrelated history states use canonical routes without claiming a real previous entry', () => {
  const fallback = route('cards', 'animals');
  const valid = createHistoryState(canonicalTrail(fallback), 3);
  const states = [
    null,
    { screen: 'cards', category: 'animals' },
    { ...valid, navigationVersion: 2 },
    { ...valid, trail: [route('cards', 'animals')] },
    { ...valid, trail: [route('home'), route('unknown')] },
    { ...valid, trail: [route('home'), route('cards', 'unknown')] },
    { ...valid, trail: [route('home'), route('cards', 'animals', 'unknown')] },
    { ...valid, trail: [route('home'), route('home'), fallback] },
    { ...valid, trail: [route('home'), fallback, fallback] },
    { ...valid, ownedDepth: -1 },
    { ...valid, ownedDepth: 4 },
    { ...valid, ownedDepth: 1.5 },
    { ...valid, screen: 'numbers' },
  ];
  for (const state of states) {
    const restored = restoreHistoryState(state, fallback);
    const screen = state?.screen === 'numbers' ? 'numbers' : 'cards';
    assert.deepEqual(restored.trail, canonicalTrail(route(screen, 'animals')));
    assert.equal(restored.route.screen, screen);
    assert.equal(restored.ownedDepth, 0);
  }
});

test('a repaired deep route and a real browser history have different back behavior', () => {
  const trail = canonicalTrail(route('puzzle'));
  assert.equal(restoreHistoryState(createHistoryState(trail)).ownedDepth, 0);
  assert.equal(restoreHistoryState(createHistoryState(trail, 2)).ownedDepth, 2);
  const moved = transitionTrail(trail, route('memory'));
  const restored = restoreHistoryState(createHistoryState(moved, 1));
  assert.equal(restored.ownedDepth, 1);
  assert.equal(restored.trail.at(-2).screen, 'puzzle');
  assert.deepEqual(normalizeTrail('broken', route('memory')), canonicalTrail(route('memory')));
});

test('browser-state restoration and normalization create fresh objects', () => {
  const trail = canonicalTrail(route('r-practice', 'play'));
  const state = createHistoryState(trail, 2);
  const restored = restoreHistoryState(state);
  restored.trail[1].category = 'food';
  restored.route.category = 'nature';
  assert.equal(state.trail[1].category, 'play');
  assert.equal(state.trail.at(-1).category, 'play');
  assert.equal(trail[1].category, 'play');
});
