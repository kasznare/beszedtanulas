const count = value => Number.isSafeInteger(value) && value >= 0 ? value : 0;
const quantity = value => Number.isInteger(value) && value >= 1 && value <= 10;
const copy = value => JSON.parse(JSON.stringify(value));
export const MESE_WORDS = ['nulla', 'egy', 'két', 'három', 'négy', 'öt', 'hat', 'hét', 'nyolc', 'kilenc', 'tíz', 'tizenegy', 'tizenkét'];
export const MESE_ANIMALS = [
  { id: 'nyuszi', name: 'nyuszi', to: 'nyuszinak', emoji: '🐰' },
  { id: 'cica', name: 'cica', to: 'cicának', emoji: '🐱' },
  { id: 'kutya', name: 'kutya', to: 'kutyának', emoji: '🐶' },
  { id: 'panda', name: 'panda', to: 'pandának', emoji: '🐼' },
  { id: 'roka', name: 'róka', to: 'rókának', emoji: '🦊' },
  { id: 'koala', name: 'koala', to: 'koalának', emoji: '🐨' },
  { id: 'beka', name: 'béka', to: 'békának', emoji: '🐸' },
  { id: 'tigris', name: 'tigris', to: 'tigrisnek', emoji: '🐯' },
  { id: 'malac', name: 'malac', to: 'malacnak', emoji: '🐷' },
  { id: 'majom', name: 'majom', to: 'majomnak', emoji: '🐵' },
];
const animalIds = MESE_ANIMALS.map(animal => animal.id);
const kinds = ['dress', 'collect', 'serve'];
export function meadowShuffle(values, random = Math.random) {
  const result = [...values];
  for (let i = result.length - 1; i > 0; i--) { const j = Math.floor(random() * (i + 1)); [result[i], result[j]] = [result[j], result[i]]; }
  return result;
}
export const meadowGuests = (target, random = Math.random) => meadowShuffle(animalIds, random).slice(0, quantity(target) ? target : 3);
function guests(value, target) {
  return Array.isArray(value) && value.length === target && new Set(value).size === target && value.every(id => animalIds.includes(id)) ? [...value] : animalIds.slice(0, target);
}
export function normalizeMeadowOptions(value = {}) {
  return {
    collectMode: ['count', 'sort', 'add', 'remove'].includes(value?.collectMode) ? value.collectMode : 'count',
    serveMode: ['all', 'named', 'full'].includes(value?.serveMode) ? value.serveMode : 'all',
    showCount: value?.showCount !== false,
  };
}
function practice(value = {}) {
  return { target: quantity(value?.target) ? value.target : 3, varied: value?.varied !== false, ...normalizeMeadowOptions(value) };
}
export const meadowAppleTotal = target => Math.min(12, Math.max(target + 2, 4));
export function meadowInitialCount(target, options) {
  return options.collectMode === 'add' ? Math.max(1, target - 1) : options.collectMode === 'remove' ? target + 1 : 0;
}
const list = (value, accept) => Array.isArray(value) ? [...new Set(value.filter(accept))] : [];
function normalizeSelection(value, target, guestIds, options) {
  return {
    selected: list(value?.selected, id => Number.isInteger(id) && id >= 0 && id < meadowAppleTotal(target)),
    plates: list(value?.plates, id => guestIds.includes(id)),
    cups: options.serveMode === 'full' ? list(value?.cups, id => guestIds.includes(id)) : [],
  };
}
export function createMeadowTask(kind, target, guestIds, options = {}, random = Math.random) {
  const settings = normalizeMeadowOptions(options);
  return {
    kind, selected: kind === 'collect' ? Array.from({ length: meadowInitialCount(target, settings) }, (_, i) => i) : [],
    plates: [], cups: [], dressed: 0, helped: false, solved: false, moves: [],
    requestOrder: meadowShuffle(guestIds, random),
  };
}
function normalizeTask(value, kind, target, guestIds, options) {
  if (!value || value.kind !== kind) return null;
  const selection = normalizeSelection(value, target, guestIds, options);
  return {
    kind, ...selection, dressed: [0, 1, 2].includes(value.dressed) ? value.dressed : 0,
    helped: value.helped === true, solved: value.solved === true && meadowTaskComplete({ kind, ...selection, dressed: value.dressed }, target, guestIds, options),
    moves: Array.isArray(value.moves) ? value.moves.slice(-100).map(move => normalizeSelection(move, target, guestIds, options)) : [],
    requestOrder: guests(value.requestOrder, target).every(id => guestIds.includes(id)) ? guests(value.requestOrder, target) : [...guestIds],
  };
}
function normalizeAdventure(value) {
  if (!value || ![0, 1, 2].includes(value.step) || !quantity(value.target)) return null;
  const guestIds = guests(value.guests, value.target), options = normalizeMeadowOptions(value.options);
  if (options.collectMode === 'add' && value.target === 1) options.collectMode = 'count';
  const task = normalizeTask(value.task, kinds[value.step], value.target, guestIds, options);
  return { step: value.step, target: value.target, guests: guestIds, options, task: task?.solved ? null : task };
}
function normalizeFree(value) {
  if (!value || !kinds.includes(value.kind) || !quantity(value.target) || ![1, 3, 5, 10].includes(value.length) || !Number.isInteger(value.round) || value.round < 0 || value.round >= value.length) return null;
  const guestIds = guests(value.guests, value.target), options = normalizeMeadowOptions(value.options);
  if (options.collectMode === 'add' && value.target === 1) options.collectMode = 'count';
  return { kind: value.kind, target: value.target, round: value.round, length: value.length, guests: guestIds, options, task: normalizeTask(value.task, value.kind, value.target, guestIds, options) };
}
const isoDate = value => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(value) && value.length < 40 && Number.isFinite(Date.parse(value));
function normalizeMemories(value) {
  if (!Array.isArray(value)) return [];
  const seen = new Set();
  return value.filter(item => item && typeof item.id === 'string' && /^piknik-\d+$/.test(item.id) && quantity(item.target) && isoDate(item.date) && !seen.has(item.id) && seen.add(item.id)).map(item => ({
    id: item.id, date: new Date(item.date).toISOString(), target: item.target, guests: guests(item.guests, item.target), serveMode: ['all', 'named', 'full'].includes(item.serveMode) ? item.serveMode : 'all',
  }));
}
export function normalizeMeadow(value = {}) {
  const skill = key => ({ independent: count(value?.[key]?.independent), assisted: count(value?.[key]?.assisted) });
  const memories = normalizeMemories(value?.memories);
  return { version: 2, journeys: Math.max(count(value?.journeys), memories.length), collect: skill('collect'), serve: skill('serve'),
    adventure: normalizeAdventure(value?.adventure), practice: practice(value?.practice), free: normalizeFree(value?.free), memories };
}
const canonical = value => JSON.stringify(value, function (_key, item) { return item && typeof item === 'object' && !Array.isArray(item) ? Object.fromEntries(Object.keys(item).sort().map(key => [key, item[key]])) : item; });
export function validateMeadow(value) {
  if (value === undefined) return normalizeMeadow();
  const normal = normalizeMeadow(value);
  const fail = () => { throw new Error('A Meseliget mentése hibás. Nem módosítottam a játékot.'); };
  if (!value || ![1, 2].includes(value.version)) fail();
  if (value.version === 1) {
    // Version 1 saved totals and story checkpoints, but no actual album pictures.
    if (value.journeys !== normal.journeys || ['collect', 'serve'].some(key => !value[key] || canonical(value[key]) !== canonical(normal[key])) ||
      (value.adventure !== null && (!normal.adventure || value.adventure.step !== normal.adventure.step || value.adventure.target !== normal.adventure.target))) fail();
  } else if (canonical(value) !== canonical(normal)) fail();
  return normal;
}
export function meadowServingRequest(task, guestIds, options = {}) {
  const order = task.requestOrder || guestIds;
  for (const id of order) {
    if (!task.plates.includes(id)) return { guest: id, item: 'plate' };
    if (options.serveMode === 'full' && !task.cups.includes(id)) return { guest: id, item: 'cup' };
  }
  return null;
}
export function meadowTaskComplete(task, target, guestIds, options = {}) {
  if (task.kind === 'dress') return task.dressed === 2;
  if (task.kind === 'collect') return task.selected.length === target;
  return guestIds.every(id => task.plates.includes(id) && (options.serveMode !== 'full' || task.cups.includes(id)));
}
export function changeMeadowSelection(task, field, id) {
  const next = copy(task);
  if (!['selected', 'plates', 'cups'].includes(field) || task.solved) return next;
  next.moves.push({ selected: [...task.selected], plates: [...task.plates], cups: [...task.cups] });
  next.moves = next.moves.slice(-100);
  const index = next[field].indexOf(id);
  if (index < 0) next[field].push(id); else next[field].splice(index, 1);
  return next;
}
export function recordMeadowTask(value, kind, assisted, details = {}) {
  const next = normalizeMeadow(value);
  if (kind === 'collect' || kind === 'serve') next[kind][assisted ? 'assisted' : 'independent'] += 1;
  const inStory = details.story ?? Boolean(next.adventure);
  if (inStory && next.adventure && kinds[next.adventure.step] === kind) { next.adventure.step += 1; next.adventure.task = null; }
  const finished = inStory && next.adventure?.step === 3;
  if (finished) {
    next.journeys += 1;
    const adventure = next.adventure;
    next.memories.push({ id: `piknik-${next.journeys}`, date: isoDate(details.date) ? new Date(details.date).toISOString() : new Date().toISOString(), target: adventure.target, guests: [...adventure.guests], serveMode: adventure.options.serveMode });
    next.adventure = null;
  }
  return { progress: next, finished: Boolean(finished) };
}
export function countFeedback(actual, target) { return actual === target ? 'correct' : actual < target ? 'more' : 'less'; }
export const MESE_CLIPS = {
  mese_map: 'Szia! Ez itt Meseliget. Szedjünk almát, terítsünk meg, vagy induljunk együtt piknikezni!',
  mese_start: 'Piknikezni indulunk! Először adjuk fel a maci sapkáját és cipőjét!',
  mese_dressed: 'Felöltöztem! Most szedjünk almát a barátainknak!',
  mese_house_done: 'Felöltöztem! Köszönöm a segítséget!',
  mese_serve: 'Adj minden állatnak egy tányért! Koppints az állatok elé!',
  mese_serve_full: 'Adj a barátainknak tányért és poharat! Figyeld meg, ki következik!',
  mese_served: 'Mindenkinek jutott tányér! Kezdődhet a piknik!',
  mese_served_full: 'Mindenkinek jutott tányér és pohár! Kezdődhet a piknik!',
  mese_more: 'Még kell alma a kosárba. Tegyél bele még!',
  mese_less: 'Kicsit sok lett! Koppints a kosárban egy almára, és tedd vissza!',
  mese_only_apples: 'Ez körte. Most almát gyűjtünk! Keresd az almákat!',
  mese_count_help: 'Számoljunk együtt! A pöttyök mutatják, hány alma kell a kosárba.',
  mese_plate_help: 'Nézd, kinek nincs még tányérja! Koppints elé, és adj neki egyet!',
  mese_plate_more: 'Valakinek még nincs tányérja. Nézzük meg együtt!',
  mese_table_more: 'Valami még hiányzik a terítékről. Nézzük meg együtt!',
  mese_named_retry: 'Hallgassuk meg, melyik barátunknak adjuk!',
  mese_finish: 'Elkészült a piknik! Köszönöm a segítséget! Ezt a képet eltesszük emlékbe.',
  mese_free_finish: 'Ügyesen segítettél! Pihenjünk meg, vagy játsszunk még!',
  mese_album: 'Ezek a közös piknikjeink emlékei!',
  mese_empty_album: 'Itt lesz a közös piknikünk képe. Induljunk el egy kalandra!',
  mese_play_menu: 'Etessük meg a macit, öltöztessük fel, keressünk képeket, vagy kiránduljunk Meseligetben!',
};
for (let n = 1; n <= 10; n++) {
  MESE_CLIPS[`mese_collect_${n}`] = `Tegyél ${MESE_WORDS[n]} almát a kosárba!`;
  MESE_CLIPS[`mese_collected_${n}`] = `Megvan ${n === 1 || n === 5 ? 'az' : 'a'} ${MESE_WORDS[n]} alma! Köszönöm!`;
  MESE_CLIPS[`mese_sort_${n}`] = `Tegyél ${MESE_WORDS[n]} almát a kosárba! A körtéket hagyd a kertben!`;
  if (n >= 2) MESE_CLIPS[`mese_add_${n}`] = `Van ${MESE_WORDS[n - 1]} alma a kosárban. Tegyél hozzá még egy almát!`;
  MESE_CLIPS[`mese_remove_${n}`] = `Van ${MESE_WORDS[n + 1]} alma a kosárban. Tegyél vissza egy almát!`;
  MESE_CLIPS[`mese_memory_${n}`] = `${MESE_WORDS[n][0].toLocaleUpperCase('hu-HU') + MESE_WORDS[n].slice(1)} baráttal piknikeztünk. Almát szedtünk, és megterítettünk együtt!`;
}
for (const animal of MESE_ANIMALS) {
  MESE_CLIPS[`mese_guest_${animal.id}_plate`] = `Adj a ${animal.to} egy tányért!`;
  MESE_CLIPS[`mese_guest_${animal.id}_cup`] = `Adj a ${animal.to} egy poharat!`;
}
