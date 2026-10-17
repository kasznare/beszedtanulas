import { STORY_SCENES, STORY_CLUES, STORY_FEEDBACK, STORY_CLIPS } from './city-story-data.js';

export function createStoryState() {
  return { nodeId: 'film-stop', route: null, flags: {}, clues: [], ending: null };
}

function matches(state, condition = {}) {
  return Object.entries(condition).every(([key, expected]) => {
    if (key === 'propsIncludes') return Array.isArray(state.flags.props) && state.flags.props.includes(expected);
    const actual = key === 'route' || key === 'ending' ? state[key] : state.flags[key];
    return actual === expected || (expected === false && actual === undefined);
  });
}

function currentScene(state) {
  return STORY_SCENES[state?.nodeId] || STORY_SCENES['film-stop'];
}

function addClue(clues, id) {
  return id && STORY_CLUES[id] && !clues.includes(id) ? [...clues, id] : clues;
}

function activitySolved(state, scene) {
  return !scene.activity || state?.flags?.[`solved:${scene.id}`] === true || (scene.id === 'court-memory' && state?.flags?.chronologyKnown === true);
}

/** Pure view model for the current scene. All narration is backed by STORY_CLIPS. */
export function getStoryScene(state) {
  const scene = currentScene(state);
  const paragraphs = [...scene.paragraphs];
  const voiceIds = [...scene.voiceIds];
  for (const variant of scene.variants) {
    if (matches(state, variant.when)) {
      paragraphs.push(...variant.paragraphs);
      voiceIds.push(...variant.voiceIds);
    }
  }
  const recap = scene.recap.filter((entry) => matches(state, entry.when));
  const activity = scene.activity && !activitySolved(state, scene) ? {
    ...scene.activity,
    items: scene.activity.items.map((item) => ({ ...item })),
  } : undefined;
  return {
    id: scene.id, title: scene.title, chapter: scene.chapter, location: scene.location,
    art: scene.art, paragraphs, voiceIds,
    choices: activity ? [] : scene.choices.filter((choice) => matches(state, choice.when)).map(({ id, label, hint, icon, voiceId }) => ({ id, label, ...(hint ? { hint } : {}), ...(icon ? { icon } : {}), voiceId })),
    ...(activity ? { activity } : {}),
    ...(scene.ending ? { ending: scene.ending } : {}),
    ...(recap.length ? { recap: recap.map((entry) => entry.text), recapVoiceIds: recap.map((entry) => entry.voiceId) } : {}),
  };
}

/** Returns the same object for a choice that is unavailable or unknown. */
export function chooseStoryOption(state, choiceId) {
  const scene = currentScene(state);
  if (activitySolved(state, scene) === false || typeof choiceId !== 'string') return state;
  const choice = scene.choices.find((entry) => entry.id === choiceId && matches(state, entry.when));
  if (!choice) return state;
  if (choice.restart) return createStoryState();
  if (!STORY_SCENES[choice.to]) return state;
  const clues = addClue(Array.isArray(state.clues) ? state.clues : [], choice.clue ? `choice:${choice.id}` : null);
  return {
    ...state,
    nodeId: choice.to,
    route: choice.route || state.route,
    ending: choice.ending || state.ending,
    flags: { ...state.flags, ...(choice.set || {}) },
    clues,
  };
}

function feedback(state, ok, key) {
  const voiceId = STORY_FEEDBACK[key];
  // Feedback is also enumerable for the same audio pipeline as the scene text.
  return { state, ok, message: STORY_CLIPS[voiceId], messageVoiceId: voiceId };
}

function selectedIds(answer) {
  if (Array.isArray(answer)) return answer;
  if (typeof answer === 'string') return [answer];
  return null;
}

/** Validates one activity without mutating its input. Wrong attempts remain retryable. */
export function completeStoryActivity(state, answer) {
  const scene = currentScene(state);
  const activity = scene.activity;
  if (!activity) return feedback(state, false, 'noActivity');
  if (activitySolved(state, scene)) return feedback(state, false, 'alreadyDone');
  const valid = new Set(activity.items.map((item) => item.id));
  const ids = selectedIds(answer);
  const unique = ids && new Set(ids);

  if (activity.type === 'inspect') {
    if (!ids || ids.length !== 1 || unique.size !== 1 || !valid.has(ids[0])) return feedback(state, false, 'inspectInvalid');
    const item = activity.items.find((entry) => entry.id === ids[0]);
    return {
      state: { ...state, flags: { ...state.flags, [`solved:${scene.id}`]: true, inspected: ids[0] }, clues: addClue(state.clues, `inspect:${ids[0]}`) },
      ok: true, message: item.detail, messageVoiceId: item.detailVoiceId,
    };
  }

  if (activity.type === 'order') {
    if (!ids || ids.length !== valid.size || unique.size !== valid.size || ids.some((id) => !valid.has(id))) return feedback(state, false, 'orderInvalid');
    if (ids.join('|') !== 'setup|packing|closing') return feedback(state, false, 'orderWrong');
    return feedback({ ...state, flags: { ...state.flags, [`solved:${scene.id}`]: true, chronologyKnown: true }, clues: addClue(state.clues, `order:${scene.id}`) }, true, 'orderDone');
  }

  if (activity.type === 'layout') {
    if (!ids || ids.length !== 1 || !valid.has(ids[0])) return feedback(state, false, 'layoutInvalid');
    if (ids[0] === 'straight') return feedback(state, false, 'layoutWrongStraight');
    if (ids[0] === 'crosswise') return feedback(state, false, 'layoutWrongCrosswise');
    return feedback({ ...state, flags: { ...state.flags, [`solved:${scene.id}`]: true, passageTested: true, layoutTest: 'turn-clear' }, clues: addClue(state.clues, `layout:${scene.id}`) }, true, 'layoutDone');
  }

  if (activity.type === 'props') {
    if (!ids || ids.length !== 3 || unique.size !== 3 || ids.some((id) => !valid.has(id))) return feedback(state, false, 'propsInvalid');
    return feedback({ ...state, flags: { ...state.flags, [`solved:${scene.id}`]: true, props: [...ids] }, clues: addClue(state.clues, `props:${scene.id}`) }, true, 'propsDone');
  }
  return feedback(state, false, 'noActivity');
}

export function getStoryJournal(state) {
  return (Array.isArray(state?.clues) ? state.clues : []).map((id) => STORY_CLUES[id]).filter(Boolean).map((clue) => ({ ...clue }));
}
