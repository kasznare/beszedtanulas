import test from 'node:test';
import assert from 'node:assert/strict';
import { STORY_SCENES, STORY_CLIPS, STORY_ROUTES, STORY_ENDINGS, STORY_CLUES } from '../city-story-data.js';
import { createStoryState, getStoryScene, chooseStoryOption, completeStoryActivity, getStoryJournal, suggestedRoute, getInspectedClue, storyStamp, normalizeStoryStamps, loadStoryStamps, saveStoryStamps, STORY_STAMP_PREFIX, STORY_STAMP_TOTAL } from '../city-story-engine.js';

const routeChoices = { street: 'route-street', workshop: 'route-workshop', archive: 'route-archive' };
const endingChoices = { film: 'ending-film', theatre: 'ending-theatre', walk: 'ending-walk' };
const defaultChoices = {
  'film-stop': 'begin-investigation',
  'street-number': 'street-pattern', 'street-view': 'street-cart', 'street-eszter': 'eszter-actor', 'street-arrive': 'street-to-court',
  'workshop-red': 'bench-under', 'workshop-use': 'bench-seat', 'workshop-carry': 'carry-now', 'workshop-arrive': 'workshop-to-court',
  'archive-envelope': 'archive-details', 'archive-last': 'archive-plan', 'archive-share': 'archive-map', 'archive-arrive': 'archive-to-court',
  'court-arrival': 'court-discuss', 'court-memory': 'memory-enact', 'court-practice': 'practice-plan', 'court-layout-choice': 'layout-wall',
  'film-prep': 'film-angle-shift', 'film-eszter': 'film-eszter-live', 'film-direct': 'film-sequence', 'film-props': 'film-show',
  'theatre-prep': 'theatre-puppets', 'theatre-direct': 'theatre-rethink',
  'walk-prep': 'walk-short', 'walk-workshop': 'walk-from-workshop', 'walk-door': 'walk-wide',
};
const answers = {
  'film-stop': ['gate'],
  'archive-envelope': ['setup', 'packing', 'closing'],
  'court-memory': ['setup', 'packing', 'closing'],
  'court-practice': 'turn-clear',
  'film-props': ['pillow', 'board', 'puppet'],
};

// Defaults may be locked by earlier decisions; then the first open choice is taken.
// Overrides are strict: a locked override fails the test.
function play(route, ending, overrides = {}, inspect = 'gate') {
  let state = createStoryState();
  const visited = [];
  for (let turns = 0; turns < 50; turns += 1) {
    visited.push(state.nodeId);
    if (state.nodeId === `${ending}-ending`) return { state, visited, scene: getStoryScene(state) };
    const scene = getStoryScene(state);
    if (scene.activity) {
      const result = completeStoryActivity(state, state.nodeId === 'film-stop' ? [inspect] : answers[state.nodeId]);
      assert.equal(result.ok, true, `activity ${state.nodeId}`);
      state = result.state;
    }
    const open = getStoryScene(state).choices.filter((entry) => !entry.locked).map((entry) => entry.id);
    let choice = overrides[state.nodeId] || (state.nodeId === 'route-choice' ? routeChoices[route] : state.nodeId === 'ending-choice' ? endingChoices[ending] : defaultChoices[state.nodeId]);
    if (!overrides[state.nodeId] && !open.includes(choice)) choice = open[0];
    assert.ok(choice, `choice missing at ${state.nodeId}`);
    const next = chooseStoryOption(state, choice);
    assert.notStrictEqual(next, state, `choice unavailable at ${state.nodeId}: ${choice}`);
    state = next;
  }
  assert.fail(`did not finish ${route}/${ending}`);
}

test('every authored scene is reachable and all nine route and ending combinations finish', () => {
  const reachable = new Set(['film-stop']);
  const queue = ['film-stop'];
  while (queue.length) {
    const id = queue.shift();
    for (const choice of STORY_SCENES[id].choices) {
      if (choice.restart || reachable.has(choice.to)) continue;
      assert.ok(STORY_SCENES[choice.to], `missing destination ${choice.to}`);
      reachable.add(choice.to);
      queue.push(choice.to);
    }
  }
  assert.deepEqual([...reachable].sort(), Object.keys(STORY_SCENES).sort());
  assert.ok(Object.keys(STORY_SCENES).length >= 30);
  for (const route of STORY_ROUTES) for (const ending of STORY_ENDINGS) {
    const { state, scene } = play(route, ending);
    assert.equal(state.route, route);
    assert.equal(state.ending, ending);
    assert.equal(scene.ending, ending);
    assert.ok(state.flags.passageTested);
    assert.equal(state.flags.chronologyKnown, true);
  }
});

test('intro inspection, chronology, layout, and prop tasks are gated and retryable', () => {
  let state = createStoryState();
  assert.deepEqual(getStoryScene(state).choices, []);
  assert.strictEqual(chooseStoryOption(state, 'begin-investigation'), state);
  assert.equal(completeStoryActivity(state, ['unknown']).ok, false);
  const inspect = completeStoryActivity(state, ['bench']);
  assert.equal(inspect.ok, true);
  assert.match(inspect.message, /fecskefarkú/);
  assert.ok(inspect.messageVoiceId);
  state = chooseStoryOption(inspect.state, 'begin-investigation');
  state = chooseStoryOption(state, 'route-archive');
  assert.equal(state.nodeId, 'archive-envelope');
  assert.equal(completeStoryActivity(state, ['closing', 'packing', 'setup']).ok, false);
  assert.strictEqual(completeStoryActivity(state, ['setup', 'setup', 'closing']).state, state);
  assert.strictEqual(chooseStoryOption(state, 'archive-details'), state);
  state = completeStoryActivity(state, ['setup', 'packing', 'closing']).state;
  assert.equal(getStoryScene(state).activity, undefined);
  assert.ok(getStoryJournal(state).some((entry) => entry.id === 'order:archive-envelope'));

  const court = play('street', 'film').visited;
  assert.ok(court.includes('court-practice'));
  let layoutState = createStoryState();
  layoutState = completeStoryActivity(layoutState, ['gate']).state;
  const path = ['begin-investigation', 'route-street', 'street-pattern', 'street-cart', 'eszter-actor', 'street-to-court', 'court-discuss'];
  for (const choice of path) layoutState = chooseStoryOption(layoutState, choice);
  assert.equal(layoutState.nodeId, 'court-memory');
  assert.strictEqual(chooseStoryOption(layoutState, 'memory-enact'), layoutState);
  layoutState = completeStoryActivity(layoutState, ['setup', 'packing', 'closing']).state;
  layoutState = chooseStoryOption(layoutState, 'memory-enact');
  assert.equal(layoutState.nodeId, 'court-practice');
  assert.match(completeStoryActivity(layoutState, 'straight').message, /kanyarnál/);
  assert.match(completeStoryActivity(layoutState, 'crosswise').message, /elzárja/);
  assert.strictEqual(chooseStoryOption(layoutState, 'practice-plan'), layoutState);
  assert.equal(completeStoryActivity(layoutState, 'turn-clear').ok, true);

  let propsState = play('street', 'film').state;
  // Reconstruct the immediate preceding state through immutable node navigation.
  propsState = { ...propsState, nodeId: 'film-props', flags: { ...propsState.flags, 'solved:film-props': false } };
  assert.equal(completeStoryActivity(propsState, ['pillow', 'pillow', 'book']).ok, false);
  assert.equal(completeStoryActivity(propsState, ['pillow', 'book']).ok, false);
  assert.equal(completeStoryActivity(propsState, ['pillow', 'book', 'bread']).ok, true);
});

test('route preparations and choices survive into the relevant finales', () => {
  const streetCamera = play('street', 'film').scene.paragraphs.join(' ');
  const streetMap = play('street', 'film', { 'street-number': 'street-map', 'street-view': 'street-frame', 'street-eszter': 'eszter-schedule', 'film-prep': 'film-angle-inside', 'film-eszter': 'film-eszter-voice', 'film-direct': 'film-together' }).scene.paragraphs.join(' ');
  assert.match(streetCamera, /régi képkivágásból/);
  assert.match(streetMap, /Eszter felvett mondata/);
  assert.match(streetMap, /együtt néznek/);
  assert.notEqual(streetCamera, streetMap);

  const puppets = play('workshop', 'theatre', { 'workshop-use': 'bench-puppet', 'workshop-carry': 'carry-cart', 'theatre-direct': 'theatre-voices' });
  assert.equal(puppets.state.flags.benchUse, 'puppet');
  assert.equal(puppets.state.flags.sceneDrawing, true);
  assert.match(puppets.scene.paragraphs.join(' '), /külön mondatot/);
  const archiveWalk = play('archive', 'walk', { 'archive-share': 'archive-map', 'walk-prep': 'walk-short', 'walk-door': 'walk-wide' });
  assert.equal(archiveWalk.state.flags.mapReady, true);
  assert.match(archiveWalk.scene.paragraphs.join(' '), /könyvtári térképet/);
  const workshopWalk = play('workshop', 'walk', { 'walk-prep': 'walk-long', 'walk-door': 'walk-small' });
  assert.equal(workshopWalk.state.flags.walkWorkshopChecked, true);
  assert.match(workshopWalk.scene.paragraphs.join(' '), /műhelyben Dani/);
  assert.match(workshopWalk.scene.paragraphs.join(' '), /néhányan lépnek közelebb/);
});

test('missing preparation is explained and current filming uses the green courtyard', () => {
  const workshop = play('workshop', 'film').state;
  const unscheduled = getStoryScene({ ...workshop, nodeId: 'film-eszter' }).paragraphs.join(' ');
  assert.match(unscheduled, /még nem egyeztettétek/);
  const street = play('street', 'theatre').state;
  const theatre = getStoryScene({ ...street, nodeId: 'theatre-prep' }).paragraphs.join(' ');
  assert.match(theatre, /még nem próbáltátok/);
  const walk = getStoryScene({ ...street, nodeId: 'walk-prep' }).paragraphs.join(' ');
  assert.match(walk, /Térkép még nincs/);
  for (const id of ['film-prep', 'film-eszter', 'film-direct', 'film-props']) {
    assert.equal(STORY_SCENES[id].art, 'courtyard');
  }
  const photos = STORY_SCENES['archive-envelope'].activity.items.map((item) => item.id);
  assert.notDeepEqual(photos, ['setup', 'packing', 'closing']);
});

test('finales are distinct, show only chosen props, and preserve the fixed historical truth', () => {
  const endings = STORY_ENDINGS.map((ending) => play('workshop', ending));
  const texts = endings.map(({ scene }) => scene.paragraphs.join(' '));
  assert.equal(new Set(texts).size, 3);
  assert.match(texts[0], /Ezt a folytatást ma készítettük/);
  assert.match(texts[1], /nézők/);
  assert.match(texts[2], /könyvtárban/);
  const film = endings[0];
  assert.deepEqual(film.state.flags.props, ['pillow', 'board', 'puppet']);
  assert.doesNotMatch(film.scene.paragraphs.join(' '), /Biciklipumpa|kenyérkosár a közös asztalra/);
  for (const { state } of endings) {
    assert.ok(getStoryJournal(state).some((clue) => /esti|délután/.test(clue.text)));
  }
});

test('recorded Eszter does not add an unchosen basket, and boards do not perform puppet actions', () => {
  const recorded = play('street', 'film', { 'film-eszter': 'film-eszter-voice' });
  assert.equal(recorded.state.flags.filmEszter, 'voice');
  assert.equal(recorded.state.flags.props.includes('bread'), false);
  assert.match(recorded.scene.paragraphs.join(' '), /Mira a régi helyére áll/);
  assert.doesNotMatch(recorded.scene.paragraphs.join(' '), /kosár|kosarat/);

  const boards = play('workshop', 'theatre', { 'workshop-use': 'bench-puppet', 'theatre-prep': 'theatre-boards' });
  assert.equal(boards.state.flags.puppetReady, true);
  assert.equal(boards.state.flags.theatreForm, 'boards');
  assert.doesNotMatch(boards.scene.paragraphs.join(' '), /begyakorolt mozdulattal/);
  assert.match(boards.scene.paragraphs.join(' '), /képtáblák/);
});

test('invalid calls are no-ops, all state is JSON serializable, and restart begins cleanly', () => {
  const initial = createStoryState();
  const saved = structuredClone(initial);
  assert.strictEqual(chooseStoryOption(initial, 'made-up'), initial);
  assert.strictEqual(completeStoryActivity(initial, null).state, initial);
  assert.deepEqual(initial, saved);
  let state = completeStoryActivity(initial, ['gate']).state;
  const oldState = structuredClone(state);
  state = chooseStoryOption(state, 'begin-investigation');
  assert.deepEqual(oldState, completeStoryActivity(initial, ['gate']).state);
  assert.notStrictEqual(state.flags, initial.flags);
  assert.deepEqual(JSON.parse(JSON.stringify(state)), state);
  const finished = play('archive', 'walk').state;
  const epilogue = chooseStoryOption(finished, 'walk-epilogue');
  assert.equal(epilogue.nodeId, 'epilogue');
  const restarted = createStoryState();
  assert.deepEqual(restarted, createStoryState());
  assert.deepEqual(getStoryJournal(restarted), []);
});

test('all playable speech IDs resolve to static Hungarian clips', () => {
  const used = new Set();
  for (const scene of Object.values(STORY_SCENES)) {
    for (const id of scene.voiceIds) used.add(id);
    for (const choice of scene.choices) used.add(choice.voiceId);
    for (const variant of scene.variants) for (const id of variant.voiceIds) used.add(id);
    for (const entry of scene.recap) used.add(entry.voiceId);
    if (scene.activity) {
      used.add(scene.activity.promptVoiceId);
      for (const item of scene.activity.items) {
        used.add(item.voiceId);
        if (item.detailVoiceId) used.add(item.detailVoiceId);
      }
    }
  }
  for (const id of used) {
    assert.match(id, /^city_story_/);
    assert.ok(STORY_CLIPS[id], id);
  }
  assert.ok(used.size > 160);
  assert.ok(Object.keys(STORY_CLUES).length > 30);
});

function stateAt(route, ending, nodeId, overrides = {}) {
  let state = createStoryState();
  state = completeStoryActivity(state, ['gate']).state;
  for (let turns = 0; turns < 50 && state.nodeId !== nodeId; turns += 1) {
    if (getStoryScene(state).activity) state = completeStoryActivity(state, answers[state.nodeId]).state;
    const open = getStoryScene(state).choices.filter((entry) => !entry.locked).map((entry) => entry.id);
    let choice = overrides[state.nodeId] || (state.nodeId === 'route-choice' ? routeChoices[route] : state.nodeId === 'ending-choice' ? endingChoices[ending] : defaultChoices[state.nodeId]);
    if (!open.includes(choice)) choice = open[0];
    state = chooseStoryOption(state, choice);
  }
  assert.equal(state.nodeId, nodeId);
  if (getStoryScene(state).activity && nodeId !== 'film-props') state = completeStoryActivity(state, answers[nodeId]).state;
  return state;
}
const lockedIds = (state) => getStoryScene(state).choices.filter((choice) => choice.locked).map((choice) => choice.id);

test('earlier finds open later choices; every scene keeps at least one open choice', () => {
  assert.deepEqual(lockedIds(stateAt('workshop', 'film', 'film-prep')), ['film-angle-shift'], 'no camera position without the street route');
  assert.deepEqual(lockedIds(stateAt('street', 'film', 'film-prep')), [], 'the street route found the old camera position');
  assert.deepEqual(lockedIds(stateAt('street', 'theatre', 'theatre-prep')), ['theatre-puppets']);
  assert.deepEqual(lockedIds(stateAt('workshop', 'theatre', 'theatre-prep', { 'workshop-use': 'bench-puppet' })), []);
  assert.deepEqual(lockedIds(stateAt('archive', 'walk', 'walk-prep')), ['walk-long'], 'the long walk needs a workshop visit');
  assert.deepEqual(lockedIds(stateAt('workshop', 'walk', 'walk-prep')), []);
  assert.deepEqual(lockedIds(stateAt('street', 'walk', 'walk-door')), ['walk-small'], 'no picture board yet');
  assert.deepEqual(lockedIds(stateAt('archive', 'walk', 'walk-door', { 'archive-share': 'archive-strip' })), [], 'the picture strip is a board');
  assert.deepEqual(lockedIds(stateAt('workshop', 'film', 'court-memory')), ['memory-frame'], 'the hidden turn is unknown without a frame or scale find');
  assert.deepEqual(lockedIds(stateAt('workshop', 'film', 'court-memory', { 'workshop-red': 'bench-rehearse' })), [], 'the stage rehearsal revealed the missing space');
  assert.deepEqual(lockedIds(stateAt('archive', 'film', 'court-memory', { 'archive-last': 'archive-plan' })), []);
  // A locked choice is shown with a reason but cannot be taken.
  const filmPrep = stateAt('archive', 'film', 'film-prep');
  const locked = getStoryScene(filmPrep).choices.find((choice) => choice.id === 'film-angle-shift');
  assert.ok(locked.locked && locked.lockHint);
  assert.strictEqual(chooseStoryOption(filmPrep, 'film-angle-shift'), filmPrep);
  for (const route of STORY_ROUTES) for (const ending of STORY_ENDINGS) {
    const { visited, state } = play(route, ending);
    for (const id of visited) {
      const scene = getStoryScene({ ...state, nodeId: id, flags: { ...state.flags } });
      if (scene.choices.length) assert.ok(scene.choices.some((choice) => !choice.locked), `${route}/${ending}: ${id} keeps an open choice`);
    }
  }
});

test('the first close look highlights its route and is recalled in the epilogue', () => {
  for (const [clue, route] of [['gate', 'street'], ['bench', 'workshop'], ['notebook', 'archive']]) {
    let state = completeStoryActivity(createStoryState(), [clue]).state;
    assert.equal(suggestedRoute(state), route);
    state = chooseStoryOption(state, 'begin-investigation');
    const choices = getStoryScene(state).choices;
    assert.deepEqual(choices.filter((choice) => choice.followsClue).map((choice) => choice.id), [routeChoices[route]]);
  }
  assert.equal(suggestedRoute(createStoryState()), null);
  const followed = play('workshop', 'theatre', {}, 'bench').state;
  const recall = getInspectedClue(followed);
  assert.equal(recall.followed, true);
  assert.equal(recall.voiceId, STORY_SCENES['film-stop'].activity.items[1].detailVoiceId);
  assert.ok(STORY_CLIPS[recall.voiceId], 'the recalled detail reuses its recorded line');
  assert.equal(getInspectedClue(play('archive', 'theatre', {}, 'gate').state).followed, false);
});

test('each route and finale pair earns one saved stamp; recap pages are not new finales', () => {
  const stamps = new Set();
  for (const route of STORY_ROUTES) for (const ending of STORY_ENDINGS) {
    const { state } = play(route, ending);
    stamps.add(storyStamp(state));
    const epilogue = chooseStoryOption(state, `${ending}-epilogue`);
    assert.equal(storyStamp(epilogue), null, 'the epilogue does not stamp again');
  }
  assert.equal(stamps.size, STORY_STAMP_TOTAL);
  assert.equal(storyStamp(createStoryState()), null);
  for (const id of ['epilogue', 'recall-clue', 'recall-help']) assert.ok(!STORY_ENDINGS.includes(STORY_SCENES[id].ending), `${id} is a recap, not a finale`);
  assert.deepEqual(normalizeStoryStamps(['street:film', 'street:film', 'bogus', 3, 'archive:walk']), ['street:film', 'archive:walk']);
  assert.deepEqual(normalizeStoryStamps(null), []);
  const data = new Map(), storage = { getItem: (key) => data.get(key) ?? null, setItem: (key, value) => data.set(key, value) };
  assert.equal(saveStoryStamps(storage, 'anna', ['street:film']), true);
  assert.deepEqual(loadStoryStamps(storage, 'anna'), ['street:film']);
  assert.deepEqual(loadStoryStamps(storage, 'bence'), [], 'stamps are per profile');
  data.set(`${STORY_STAMP_PREFIX}broken`, '{');
  assert.deepEqual(loadStoryStamps(storage, 'broken'), []);
});
