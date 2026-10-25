export const PATTERN_LEVELS = [
  { id: 'starter', name: 'Kezdő', description: 'Két vagy három elem ismétlődő rendje.' },
  { id: 'explorer', name: 'Felfedező', description: 'Párok, ismétlődések és háromféle elem.' },
  { id: 'thinker', name: 'Gondolkodó', description: 'Visszatérő elemek és két külön ismétlődő szabály.' },
];

export const PATTERN_FAMILIES = [
  { id: 'mixed', name: 'Vegyes', description: 'Figyeld együtt a színeket és a formákat!' },
  { id: 'shapes', name: 'Formák', description: 'Csak a forma változik.' },
  { id: 'colors', name: 'Színek', description: 'Csak a szín változik.' },
  { id: 'sizes', name: 'Méretek', description: 'Kicsi, közepes és nagy elemek.' },
  { id: 'directions', name: 'Irányok', description: 'Figyeld, merre mutat a nyíl!' },
];

export const PATTERN_COLOR_STYLES = {
  red: { name: 'piros', fill: '#df6f68', stroke: '#a84145', light: '#f5b3a5' },
  blue: { name: 'kék', fill: '#659bc2', stroke: '#3f709c', light: '#b2d4e6' },
  yellow: { name: 'sárga', fill: '#eec65a', stroke: '#a18432', light: '#ffe8a3' },
  green: { name: 'zöld', fill: '#83ad72', stroke: '#527d4c', light: '#c0dba8' },
  purple: { name: 'lila', fill: '#ab8bc6', stroke: '#795d9c', light: '#dcc5ec' },
  orange: { name: 'narancssárga', fill: '#eaa16b', stroke: '#b77442', light: '#fbd2ab' },
};

const SHAPES = ['circle', 'square', 'triangle', 'star', 'diamond'];
const COLORS = Object.keys(PATTERN_COLOR_STYLES);
const SIZES = ['small', 'medium', 'large'];
const DIRECTIONS = ['up', 'right', 'down', 'left'];
const SHAPE_NAMES = { circle: 'kör', square: 'négyzet', triangle: 'háromszög', star: 'csillag', diamond: 'rombusz', arrow: 'nyíl' };
const SIZE_NAMES = { small: 'kis', medium: 'közepes', large: 'nagy' };
const DIRECTION_NAMES = { up: 'felfelé', right: 'jobbra', down: 'lefelé', left: 'balra' };

const STRUCTURES = {
  // Alternation is the easiest rule, so beginners meet it twice as often.
  starter: ['AB', 'AB', 'ABC'],
  explorer: ['AAB', 'ABB', 'AABB', 'ABC'],
  thinker: ['ABAC', 'ABCB', 'AABC'],
};
const RULES = {
  AB: 'Két különböző elem váltakozik.',
  ABC: 'Három különböző elem ismétlődik ugyanabban a sorrendben.',
  AAB: 'Két egyforma elem után egy másik következik.',
  ABB: 'Egy elem után két egyforma következik.',
  AABB: 'Két egyforma után két másik egyforma következik.',
  ABAC: 'Az első elem minden második helyen visszatér; közben két másik váltakozik.',
  ABCB: 'A második elem minden második helyen visszatér; közben két másik váltakozik.',
  AABC: 'Két egyforma elem után két különböző következik.',
  independent: 'A két szín és a három forma külön rendben ismétlődik; az egész minta hat elemből áll.',
};

export function normalizePatternToken(token = {}) {
  const input = token || {};
  return {
    shape: Object.hasOwn(SHAPE_NAMES, input.shape) ? input.shape : 'circle',
    color: Object.hasOwn(PATTERN_COLOR_STYLES, input.color) ? input.color : 'blue',
    size: SIZES.includes(input.size) ? input.size : 'medium',
    direction: DIRECTIONS.includes(input.direction) ? input.direction : 'up',
    // Growing patterns: a group of 1–10 dots.
    ...(Number.isInteger(input.count) && input.count >= 1 && input.count <= 10 ? { count: input.count } : {}),
  };
}

export function tokenKey(token) {
  const { shape, color, size, direction, count } = normalizePatternToken(token);
  return `${shape}:${color}:${size}:${direction}${count ? `:n${count}` : ''}`;
}

export function tokenLabel(token) {
  const { shape, color, size, direction, count } = normalizePatternToken(token);
  if (count) return `${count} ${PATTERN_COLOR_STYLES[color].name} pötty`;
  const directionLabel = shape === 'arrow' ? ` ${DIRECTION_NAMES[direction]} mutató` : '';
  return `${SIZE_NAMES[size]} ${PATTERN_COLOR_STYLES[color].name}${directionLabel} ${SHAPE_NAMES[shape]}`;
}

function hashSeed(value) {
  const text = String(value);
  let hash = 2166136261;
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function seededRandom(seed) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffle(values, rng) {
  const result = [...values];
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

function uniqueTokens(tokens) {
  return [...new Map(tokens.map(token => [tokenKey(token), token])).values()];
}

function minimalMotif(tokens) {
  for (let period = 1; period <= tokens.length; period += 1) {
    if (tokens.length % period !== 0) continue;
    if (tokens.every((token, index) => tokenKey(token) === tokenKey(tokens[index % period]))) {
      return tokens.slice(0, period);
    }
  }
  return tokens;
}

function familyCandidates(familyId, base) {
  switch (familyId) {
    case 'shapes': return SHAPES.map(shape => ({ ...base, shape }));
    case 'colors': return COLORS.map(color => ({ ...base, color }));
    case 'sizes': return SIZES.map(size => ({ ...base, size }));
    case 'directions': return DIRECTIONS.map(direction => ({ ...base, shape: 'arrow', direction }));
    default: return SHAPES.flatMap(shape => COLORS.map(color => ({ ...base, shape, color })));
  }
}

export const PATTERN_ROUND_TYPES = ['next', 'gap', 'odd', 'grow'];
export const PATTERN_SESSION_ROUNDS = 5;
const keysOf = tokens => tokens.map(tokenKey);
// A row is a pattern when a shorter motif repeats through all of it at least twice.
export function isPeriodicRow(tokens) {
  const keys = keysOf(tokens);
  for (let period = 1; period * 2 <= keys.length; period += 1) {
    if (keys.every((key, index) => key === keys[index % period])) return true;
  }
  return false;
}

function buildMotif(level, family, rng) {
  const structures = [...STRUCTURES[level.id]];
  if (level.id === 'thinker' && family.id === 'mixed') structures.push('independent');
  const structure = structures[Math.floor(rng() * structures.length)];
  const shapes = shuffle(SHAPES, rng);
  const colors = shuffle(COLORS, rng);
  const base = { shape: shapes[0], color: colors[0], size: 'medium', direction: 'up' };

  let authoredMotif;
  if (structure === 'independent') {
    // Coprime cycles: two colours × three shapes give a true six-token period.
    authoredMotif = Array.from({ length: 6 }, (_, index) => ({
      ...base, color: colors[index % 2], shape: shapes[index % 3],
    }));
  } else {
    const symbols = [...new Set(structure)];
    let symbolsAsTokens;
    if (family.id === 'mixed') {
      // Both dimensions vary; crossed colour/shape pairs become plausible
      // distractors, rather than introducing a conspicuously unrelated shape.
      symbolsAsTokens = symbols.map((_, index) => ({ ...base, shape: shapes[index], color: colors[index] }));
    } else {
      symbolsAsTokens = shuffle(familyCandidates(family.id, base), rng).slice(0, symbols.length);
    }
    authoredMotif = [...structure].map(symbol => symbolsAsTokens[symbols.indexOf(symbol)]);
  }
  const motif = minimalMotif(authoredMotif).map(token => ({ ...token }));
  const previewLength = motif.length === 2 ? 6 : motif.length * 2;
  const preview = Array.from({ length: previewLength }, (_, index) => ({ ...motif[index % motif.length] }));
  return { structure, base, motif, preview };
}

// Answers first, then other motif tokens, then plausible look-alikes.
function buildChoices(family, base, motif, answers, rng, exclude = []) {
  // Sizes have exactly three legal alternatives. A fourth choice would either
  // duplicate a card or change another dimension, so that family uses three.
  const choiceCount = family.id === 'sizes' ? 3 : 4;
  const excluded = new Set(exclude.map(tokenKey));
  const options = uniqueTokens(answers);
  const answerKeys = new Set(options.map(tokenKey));
  const otherMotifTokens = shuffle(uniqueTokens(motif).filter(token => !answerKeys.has(tokenKey(token)) && !excluded.has(tokenKey(token))), rng);
  options.push(...otherMotifTokens.slice(0, choiceCount - options.length));

  const optionKeys = new Set(options.map(tokenKey));
  let distractors = shuffle(familyCandidates(family.id, base).filter(token => !optionKeys.has(tokenKey(token)) && !excluded.has(tokenKey(token))), rng);
  if (family.id === 'mixed') {
    const motifShapes = new Set(motif.map(token => token.shape));
    const motifColors = new Set(motif.map(token => token.color));
    const crossed = distractors.filter(token => motifShapes.has(token.shape) && motifColors.has(token.color));
    const others = distractors.filter(token => !motifShapes.has(token.shape) || !motifColors.has(token.color));
    distractors = [...crossed, ...others];
  }
  options.push(...distractors.slice(0, choiceCount - options.length));
  return shuffle(options, rng).map(token => ({ ...token }));
}

/**
 * Pure with an explicit string/number seed. No result or preference is saved.
 * Round types:
 * - next: continue the row (three places);
 * - gap:  one place inside the row is empty;
 * - odd:  "Melyik a hibás?" – one token breaks the rule: tap it, then fix it;
 * - grow: groups of dots grow by the same step (1, 2, 3 → 4).
 * The two-element rhythm has three visible repeats, to keep all previews at
 * 6/8/12 elements; every other rhythm has exactly two complete repeats.
 */
export function createPatternRound({ levelId = 'explorer', familyId = 'mixed', seed, type = 'next' } = {}) {
  const level = PATTERN_LEVELS.find(item => item.id === levelId) || PATTERN_LEVELS[1];
  const family = PATTERN_FAMILIES.find(item => item.id === familyId) || PATTERN_FAMILIES[0];
  const kind = PATTERN_ROUND_TYPES.includes(type) ? type : 'next';
  const roundSeed = seed ?? `${Date.now()}:${Math.random()}`;
  const seedHash = hashSeed(`${typeof roundSeed}:${roundSeed}:${level.id}:${family.id}${kind === 'next' ? '' : `:${kind}`}`);
  const rng = seededRandom(seedHash);
  const id = `pattern-${level.id}-${family.id}-${kind === 'next' ? '' : `${kind}-`}${seedHash.toString(36)}`;
  const common = { id, levelId: level.id, familyId: family.id, type: kind };

  if (kind === 'grow') {
    // Starter: 1, 2, 3 → 4. Explorer: four steps of one. Thinker: steps of two.
    const step = level.id === 'thinker' ? 2 : 1;
    const start = level.id === 'starter' ? 1 : 1 + Math.floor(rng() * 2);
    const shown = level.id === 'explorer' ? 4 : 3;
    const color = shuffle(COLORS, rng)[0];
    const dots = count => ({ shape: 'circle', color, size: 'small', direction: 'up', count });
    const counts = Array.from({ length: shown }, (_, index) => start + index * step);
    const answer = start + shown * step;
    // The last visible amount (a copy) and near misses are the distractors.
    const near = [answer - step, answer + 1, answer - 1, answer + step, answer + 2].filter((n, i, all) => n >= 1 && n <= 10 && n !== answer && all.indexOf(n) === i);
    return {
      ...common, motif: [], preview: counts.map(dots), answers: [dots(answer)], step,
      choices: shuffle([answer, ...near.slice(0, 3)], rng).map(dots),
      ruleLabel: step === 1 ? 'Mindig eggyel több pötty jön.' : 'Mindig kettővel több pötty jön.',
    };
  }

  let { structure, base, motif, preview } = buildMotif(level, family, rng);
  if (kind === 'odd') {
    // With only two copies nobody can tell which copy is wrong, so this row
    // shows the motif three times (6, 9 or 12 tokens); six-token motifs are too long.
    for (let attempt = 0; motif.length > 4 && attempt < 20; attempt++) ({ structure, base, motif, preview } = buildMotif(level, family, rng));
    if (motif.length <= 4) preview = Array.from({ length: motif.length * 3 }, (_, index) => ({ ...motif[index % motif.length] }));
  }
  if (kind === 'next') {
    const answers = Array.from({ length: 3 }, (_, index) => ({ ...motif[(preview.length + index) % motif.length] }));
    return { ...common, motif, preview, answers, choices: buildChoices(family, base, motif, answers, rng), ruleLabel: RULES[structure] };
  }

  const vocabulary = uniqueTokens([...motif, ...familyCandidates(family.id, base)]);
  if (kind === 'gap') {
    // Any place may be empty, as long as only one token makes the row a pattern again.
    const positions = shuffle(preview.map((_, index) => index), rng);
    for (const gapIndex of positions) {
      const answer = preview[gapIndex];
      const unique = vocabulary.every(token => tokenKey(token) === tokenKey(answer) || !isPeriodicRow(preview.map((item, index) => index === gapIndex ? token : item)));
      if (!unique) continue;
      return { ...common, motif, preview, gapIndex, answers: [{ ...answer }], choices: buildChoices(family, base, motif, [answer], rng), ruleLabel: RULES[structure] };
    }
  }
  // odd: the first full motif is always right, so the rule can be read from it.
  const positions = shuffle(preview.map((_, index) => index).filter(index => index >= motif.length), rng);
  for (const oddIndex of positions) {
    const correct = preview[oddIndex];
    // Prefer other motif tokens: they look like they belong in the row.
    const wrongTokens = [...shuffle(uniqueTokens(motif), rng), ...shuffle(vocabulary, rng)].filter(token => tokenKey(token) !== tokenKey(correct));
    for (const wrong of wrongTokens) {
      const row = preview.map((item, index) => index === oddIndex ? { ...wrong } : { ...item });
      // Exactly one cell can be repaired: no other single change makes the row a pattern.
      const ambiguous = row.some((_, index) => index !== oddIndex && vocabulary.some(token => isPeriodicRow(row.map((item, j) => j === index ? token : item))));
      if (ambiguous) continue;
      return { ...common, motif, preview: row, oddIndex, wrong: { ...wrong }, answers: [{ ...correct }], choices: buildChoices(family, base, motif, [correct], rng, [wrong]), ruleLabel: RULES[structure] };
    }
  }
  // Unreachable in practice; a plain continuation is always valid.
  return createPatternRound({ levelId: level.id, familyId: family.id, seed: roundSeed, type: 'next' });
}

// Five rounds: continue, then a gap or growing row, "Melyik a hibás?", continue, and one more mixed task.
export function patternSessionPlan(seed = Date.now()) {
  const rng = seededRandom(hashSeed(`plan:${seed}`));
  const pick = values => values[Math.floor(rng() * values.length)];
  return ['next', pick(['gap', 'grow']), 'odd', 'next', pick(['gap', 'grow', 'odd'])];
}

// One star for each round solved without a wrong tap and without the strong hint.
export function patternSessionStars(results) {
  return Math.max(1, results.filter(result => result.wrong === 0 && result.hint < 2).length);
}

// Two clean rounds in a row move up; two struggling rounds in a row move down.
export function adaptPatternLevel(levelId, streak = {}, { wrong = 0, hint = 0 } = {}) {
  const index = Math.max(0, PATTERN_LEVELS.findIndex(level => level.id === levelId));
  const clean = wrong === 0 && hint === 0, struggling = wrong >= 2 || hint >= 2;
  let cleanRun = clean ? (streak.clean || 0) + 1 : 0, struggleRun = struggling ? (streak.struggle || 0) + 1 : 0, next = index;
  if (cleanRun >= 2 && index < PATTERN_LEVELS.length - 1) { next = index + 1; cleanRun = 0; }
  if (struggleRun >= 2 && index > 0) { next = index - 1; struggleRun = 0; }
  return { levelId: PATTERN_LEVELS[next].id, streak: { clean: cleanRun, struggle: struggleRun }, changed: next - index };
}

// The level is remembered per child profile; a new child starts at Kezdő.
export const patternLevelKey = scope => `beszedtanulas.patterns.v1:${scope}`;
export function loadPatternLevel(storage, scope) {
  try {
    const levelId = JSON.parse(storage.getItem(patternLevelKey(scope)))?.levelId;
    return PATTERN_LEVELS.some(level => level.id === levelId) ? levelId : 'starter';
  } catch { return 'starter'; }
}
export function savePatternLevel(storage, scope, levelId) {
  if (!PATTERN_LEVELS.some(level => level.id === levelId)) return false;
  try { storage.setItem(patternLevelKey(scope), JSON.stringify({ levelId })); return true; }
  catch { return false; }
}
