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
  starter: ['AB', 'ABC'],
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
  };
}

export function tokenKey(token) {
  const { shape, color, size, direction } = normalizePatternToken(token);
  return `${shape}:${color}:${size}:${direction}`;
}

export function tokenLabel(token) {
  const { shape, color, size, direction } = normalizePatternToken(token);
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

/**
 * Pure with an explicit string/number seed. No result or preference is saved.
 * The two-element rhythm has three visible repeats, to keep all previews at
 * 6/8/12 elements; every other rhythm has exactly two complete repeats.
 */
export function createPatternRound({ levelId = 'explorer', familyId = 'mixed', seed } = {}) {
  const level = PATTERN_LEVELS.find(item => item.id === levelId) || PATTERN_LEVELS[1];
  const family = PATTERN_FAMILIES.find(item => item.id === familyId) || PATTERN_FAMILIES[0];
  const roundSeed = seed ?? `${Date.now()}:${Math.random()}`;
  const seedHash = hashSeed(`${typeof roundSeed}:${roundSeed}:${level.id}:${family.id}`);
  const rng = seededRandom(seedHash);
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
  const answers = Array.from({ length: 3 }, (_, index) => ({ ...motif[(previewLength + index) % motif.length] }));
  // Sizes have exactly three legal alternatives. A fourth choice would either
  // duplicate a card or change another dimension, so that family uses three.
  const choiceCount = family.id === 'sizes' ? 3 : 4;
  const options = uniqueTokens(answers);
  const answerKeys = new Set(options.map(tokenKey));
  const otherMotifTokens = shuffle(uniqueTokens(motif).filter(token => !answerKeys.has(tokenKey(token))), rng);
  options.push(...otherMotifTokens.slice(0, choiceCount - options.length));

  const optionKeys = new Set(options.map(tokenKey));
  let distractors = shuffle(familyCandidates(family.id, base).filter(token => !optionKeys.has(tokenKey(token))), rng);
  if (family.id === 'mixed') {
    const motifShapes = new Set(motif.map(token => token.shape));
    const motifColors = new Set(motif.map(token => token.color));
    const crossed = distractors.filter(token => motifShapes.has(token.shape) && motifColors.has(token.color));
    const others = distractors.filter(token => !motifShapes.has(token.shape) || !motifColors.has(token.color));
    distractors = [...crossed, ...others];
  }
  options.push(...distractors.slice(0, choiceCount - options.length));

  return {
    id: `pattern-${level.id}-${family.id}-${seedHash.toString(36)}`,
    levelId: level.id,
    familyId: family.id,
    motif,
    preview,
    answers,
    choices: shuffle(options, rng).map(token => ({ ...token })),
    ruleLabel: RULES[structure],
  };
}
