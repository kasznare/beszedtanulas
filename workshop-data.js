// The seed and editable moves reproduce a task; no generated answer is trusted from a save.
export const WORKSHOP_GAMES = ['sort', 'pattern', 'balance'];
export const WORKSHOP_NAMES = { sort: 'Válogatókert', pattern: 'Mintaszövő', balance: 'Egyensúlyműhely' };
export const WORKSHOP_LEVEL_NAMES = ['Felfedező', 'Gondolkodó', 'Tervező'];
export const WORKSHOP_COLORS = {
  coral: { name: 'piros', mark: '●', hex: '#cb624e' },
  blue: { name: 'kék', mark: '≋', hex: '#4e829c' },
  gold: { name: 'sárga', mark: '⋮', hex: '#b9841d' },
  green: { name: 'zöld', mark: '╱', hex: '#55816b' },
};
export const WORKSHOP_SHAPES = { circle: 'kör', square: 'négyzet', triangle: 'háromszög' };
const integer = (n, min, max) => Number.isSafeInteger(n) && n >= min && n <= max;
const record = value => !!value && typeof value === 'object' && !Array.isArray(value);
const count = n => integer(n, 0, Number.MAX_SAFE_INTEGER) ? n : 0;
export function workshopSeed() { return Math.floor(Math.random() * 0x100000000); }
function randomSource(seed) {
  let s = seed >>> 0;
  return () => { s += 0x6D2B79F5; let t = Math.imul(s ^ s >>> 15, 1 | s); t ^= t + Math.imul(t ^ t >>> 7, 61 | t); return ((t ^ t >>> 14) >>> 0) / 4294967296; };
}
function shuffle(items, random) {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) { const j = Math.floor(random() * (i + 1)); [result[i], result[j]] = [result[j], result[i]]; }
  return result;
}
export function workshopObjectName(object) {
  return [object.size === 0 ? 'kis' : object.size === 1 ? 'nagy' : '', WORKSHOP_COLORS[object.color].name, WORKSHOP_SHAPES[object.shape]].filter(Boolean).join(' ');
}
export function generateWorkshopTask(kind, level, seed, version = 2, round = 0) {
  if (!WORKSHOP_GAMES.includes(kind) || !integer(level, 1, 3) || !integer(seed, 0, 0xffffffff)) throw new Error('Érvénytelen műhelyfeladat.');
  const random = randomSource(seed), colors = shuffle(Object.keys(WORKSHOP_COLORS), random).slice(0, 2);
  const shapes = shuffle(Object.keys(WORKSHOP_SHAPES), random);
  if (kind === 'sort') {
    let wantedSize = Math.floor(random() * 2), bins = level === 1 ? colors.map(color => ({ color })) : colors.flatMap(color => shapes.slice(0, 2).map(shape => ({ color, shape })));
    if (level === 3) bins.push({ other: true });
    let objects = level === 1 ? colors.flatMap(color => shapes.map((shape, i) => ({ color, shape, size: i % 2 }))) : colors.flatMap(color => shapes.slice(0, 2).flatMap(shape => [0, 1].map(size => ({ color, shape, size }))));
    if (level === 3) objects.push(...colors.flatMap(color => shapes.slice(0, 2).map(shape => ({ color, shape, size: wantedSize }))));
    const shuffledObjects = shuffle(objects, random);
    if (version >= 2 && round === 1) {
      if (level === 1) bins = shapes.map(shape => ({ shape }));
      else if (level === 2) bins = shapes.slice(0, 2).flatMap(shape => [0, 1].map(size => ({ shape, size })));
      else wantedSize = 1 - wantedSize;
    }
    return { kind, level, colors, bins, wantedSize, objects: shuffledObjects, version, round };
  }
  if (kind === 'pattern') {
    const a = { color: colors[0], shape: shapes[0] }, b = { color: colors[1], shape: shapes[1] }, c = { color: colors[0], shape: shapes[2] };
    const motifs = [[a, a, b], [a, b, b], [a, b, c]];
    const motif = level === 1 ? [a, b] : level === 2 ? motifs[Math.floor(random() * motifs.length)] : Array.from({ length: 6 }, (_, i) => ({ color: colors[i % 2], shape: shapes[i % 3] }));
    const palette = shuffle(motif.filter((o, i) => motif.findIndex(p => p.color === o.color && p.shape === o.shape) === i), random);
    const sequence = Array.from({ length: level === 1 ? 8 : level === 2 ? 9 : 12 }, (_, i) => palette.findIndex(o => o.color === motif[i % motif.length].color && o.shape === motif[i % motif.length].shape));
    // Preserve old seed meanings. New tasks keep a full visible repeating unit,
    // while the remaining gaps vary and still have one answer under that rule.
    const holes = version < 2 ? (level === 1 ? [6, 7] : level === 2 ? [4, 7, 8] : [3, 7, 10, 11]) : shuffle(Array.from({length:sequence.length-motif.length},(_,i)=>i+motif.length),random).slice(0,[2,3,4][level-1]).sort((a,b)=>a-b);
    return { kind, level, palette, motif: motif.map(o => palette.findIndex(p => p.color === o.color && p.shape === o.shape)), sequence, holes };
  }
  const choices = Array.from({ length: level === 1 ? 3 : level === 2 ? 5 : 6 }, (_, i) => i + 1);
  const countRequired = level === 1 ? null : level, distinct = level > 1;
  const possibleTargets = level === 1 ? [3, 4, 5, 6] : level === 2 ? [6, 7, 8, 9] : [9, 10, 11, 12, 13, 14, 15];
  return { kind, level, choices, target: possibleTargets[Math.floor(random() * possibleTargets.length)], countRequired, distinct, stock: level === 1 ? 6 : level === 2 ? 2 : 1, maxPieces: level === 1 ? 6 : 4 };
}
export function workshopSortTarget(task, object) {
  if (task.level === 3 && object.size !== task.wantedSize) return task.bins.length - 1;
  return task.bins.findIndex(bin => !bin.other && (!bin.color || bin.color === object.color) && (!bin.shape || bin.shape === object.shape) && (bin.size === undefined || bin.size === object.size));
}
export function workshopTaskForSession(session) {
  return generateWorkshopTask(session.kind, session.level, session.seed, session.taskVersion ?? 1, session.round ?? 0);
}
export function newWorkshopSession(kind, level = 1, seed = workshopSeed()) {
  const task = generateWorkshopTask(kind, level, seed);
  return { kind, level, seed, taskVersion: 2, round: 0, rewarded: false, found: [], help: 0, misses: 0, done: false, moves: { placements: kind === 'sort' ? task.objects.map(() => -1) : [], answers: kind === 'pattern' ? task.holes.map(() => null) : [], rods: [] }, history: [] };
}
function validMoves(task, moves) {
  return record(moves) && Array.isArray(moves.placements) && Array.isArray(moves.answers) && Array.isArray(moves.rods)
    && moves.placements.length === (task.kind === 'sort' ? task.objects.length : 0) && moves.placements.every(n => integer(n, -1, task.bins?.length - 1))
    && moves.answers.length === (task.kind === 'pattern' ? task.holes.length : 0) && moves.answers.every(n => n === null || integer(n, 0, task.palette?.length - 1))
    && (task.kind !== 'balance' ? moves.rods.length === 0 : moves.rods.length <= task.maxPieces && moves.rods.every(n => task.choices.includes(n)) && task.choices.every(n => moves.rods.filter(value => value === n).length <= task.stock));
}
export function workshopSolved(task, session) {
  if (!validMoves(task, session?.moves)) return false;
  const moves = session.moves;
  if (task.kind === 'sort') return moves.placements.every((bin, i) => bin === workshopSortTarget(task, task.objects[i]));
  if (task.kind === 'pattern') return moves.answers.every((answer, i) => answer === task.sequence[task.holes[i]]);
  return moves.rods.reduce((sum, n) => sum + n, 0) === task.target && (!task.countRequired || moves.rods.length === task.countRequired) && (!task.distinct || new Set(moves.rods).size === moves.rods.length);
}
export function rememberWorkshop(session) {
  if (session.done) return;
  session.history.push(structuredClone(session.moves));
  if (session.history.length > 60) session.history.shift();
}
export function undoWorkshop(session) {
  if (session.done || !session.history.length) return false;
  session.moves = session.history.pop();
  return true;
}
export function workshopBalanceSolutions(task) {
  if (task.kind !== 'balance') return [];
  const solutions = [];
  function visit(rods, start, sum) {
    if (sum === task.target) { if (workshopSolved(task, { moves: { placements: [], answers: [], rods } })) solutions.push(rods); return; }
    if (rods.length >= (task.countRequired || task.maxPieces)) return;
    for (let i = start; i < task.choices.length; i++) {
      const value = task.choices[i];
      if (sum + value <= task.target && rods.filter(n => n === value).length < (task.distinct ? 1 : task.stock)) visit([...rods, value], i, sum + value);
    }
  }
  visit([], 0, 0);
  return solutions;
}
export const workshopSolutionKey = rods => [...rods].sort((a,b)=>a-b).join(',');
export function remainingWorkshopSolutions(task, session) {
  const found = new Set((session.found || []).map(workshopSolutionKey));
  if(session.done) found.add(workshopSolutionKey(session.moves.rods));
  return workshopBalanceSolutions(task).filter(rods => !found.has(workshopSolutionKey(rods)));
}
// Help offers a legal next correction, including removing a rod if the current attempt cannot be extended.
export function workshopHint(task, session) {
  if (workshopSolved(task, session) && (task.kind !== 'balance' || !(session.found || []).some(rods => workshopSolutionKey(rods) === workshopSolutionKey(session.moves.rods)))) return { action: 'ready' };
  const moves = session.moves;
  if (task.kind === 'sort') {
    const index = moves.placements.findIndex((bin, i) => bin !== workshopSortTarget(task, task.objects[i]));
    return { action: 'place', index, target: workshopSortTarget(task, task.objects[index]) };
  }
  if (task.kind === 'pattern') {
    const index = moves.answers.findIndex((n, i) => n !== task.sequence[task.holes[i]]);
    return { action: 'answer', index, target: task.sequence[task.holes[index]] };
  }
  const current = moves.rods;
  const distance = rods => {
    const remaining = [...rods]; let shared = 0;
    for (const value of current) { const index = remaining.indexOf(value); if (index >= 0) { remaining.splice(index, 1); shared++; } }
    return { score: (current.length - shared) * 10 + remaining.length, remaining };
  };
  const solutions = remainingWorkshopSolutions(task, session).sort((a, b) => distance(a).score - distance(b).score);
  if (!solutions.length) return { action: 'ready' };
  const remaining = [...solutions[0]];
  for (let index = 0; index < current.length; index++) {
    const found = remaining.indexOf(current[index]);
    if (found < 0) return { action: 'remove', index, value: current[index] };
    remaining.splice(found, 1);
  }
  return { action: 'add', value: remaining[0] };
}
function validSession(session, kind, level) {
  if (!record(session) || session.kind !== kind || session.level !== level || !integer(session.seed, 0, 0xffffffff) || !integer(session.help, 0, 3) || !integer(session.misses, 0, 9999) || typeof session.done !== 'boolean') return false;
  const version = session.taskVersion ?? 1, round = session.round ?? 0;
  if (![1,2].includes(version) || !integer(round,0,version===2&&kind==='sort'?1:0) || (session.rewarded!==undefined&&typeof session.rewarded!=='boolean')) return false;
  const task = workshopTaskForSession(session), found = session.found ?? [];
  if (!Array.isArray(found) || (kind!=='balance' && found.length) || found.length>30 || found.some(rods=>!Array.isArray(rods)||!workshopSolved(task,{moves:{placements:[],answers:[],rods}})) || new Set(found.map(workshopSolutionKey)).size!==found.length) return false;
  if (kind==='balance' && (found.length>0 && !session.rewarded || session.rewarded && !found.length)) return false;
  if (session.done && version===2 && kind==='sort' && round!==1) return false;
  if (session.done && kind==='balance' && session.rewarded===true && !found.some(rods=>workshopSolutionKey(rods)===workshopSolutionKey(session.moves.rods))) return false;
  return validMoves(task, session.moves) && Array.isArray(session.history) && session.history.length <= 60 && session.history.every(moves => validMoves(task, moves)) && (!session.done || workshopSolved(task, session));
}
export function normalizeWorkshop(value) {
  const result = { version: 1, games: {}, sessions: {} };
  for (const kind of WORKSHOP_GAMES) {
    result.games[kind] = Array.from({ length: 3 }, (_, i) => ({ independent: count(value?.games?.[kind]?.[i]?.independent), assisted: count(value?.games?.[kind]?.[i]?.assisted) }));
    result.sessions[kind] = Array.from({ length: 3 }, (_, i) => validSession(value?.sessions?.[kind]?.[i], kind, i + 1) ? structuredClone(value.sessions[kind][i]) : null);
  }
  return result;
}
export function validateWorkshop(value) {
  if (value === undefined) return normalizeWorkshop();
  const normal = normalizeWorkshop(value);
  if (!record(value) || value.version !== 1 || !record(value.games) || !record(value.sessions) || WORKSHOP_GAMES.some(kind => !Array.isArray(value.games[kind]) || value.games[kind].length !== 3 || value.games[kind].some((counts, i) => !record(counts) || counts.independent !== normal.games[kind][i].independent || counts.assisted !== normal.games[kind][i].assisted) || !Array.isArray(value.sessions[kind]) || value.sessions[kind].length !== 3 || value.sessions[kind].some((session, i) => session !== null && !validSession(session, kind, i + 1)))) throw new Error('A Műhelyliget mentése hibás. Nem módosítottam a játékot.');
  return normal;
}
export function completeWorkshop(value, kind, level) {
  const next = normalizeWorkshop(value), session = next.sessions[kind]?.[level - 1];
  if (!session || session.done || !workshopSolved(workshopTaskForSession(session), session)) return { progress: next, reward: false, changed: false };
  if (kind==='sort' && session.taskVersion===2 && session.round===0) {
    session.round=1; session.moves.placements.fill(-1); session.history=[];
    return {progress:next,reward:false,changed:true};
  }
  if (kind==='balance') {
    const key=workshopSolutionKey(session.moves.rods);
    if ((session.found||[]).some(rods=>workshopSolutionKey(rods)===key)) return {progress:next,reward:false,changed:false,duplicate:true};
    session.found=[...(session.found||[]),[...session.moves.rods].sort((a,b)=>a-b)];
  }
  const reward=!session.rewarded;
  session.rewarded=true;
  session.done = true; session.history = [];
  const bucket = next.games[kind][level - 1], key = session.help || session.misses ? 'assisted' : 'independent';
  if(reward) bucket[key] = Math.min(Number.MAX_SAFE_INTEGER, bucket[key] + 1);
  return { progress: next, reward, changed: true };
}
export function beginWorkshopAlternative(value, level) {
  const next=normalizeWorkshop(value), session=next.sessions.balance[level-1];
  if(!session?.done) return {progress:next,changed:false};
  // Older completed saves did not carry a list of already rewarded solutions.
  session.found ||= [[...session.moves.rods].sort((a,b)=>a-b)];
  if(!session.found.length) session.found=[[...session.moves.rods].sort((a,b)=>a-b)];
  session.rewarded=true;
  if(!remainingWorkshopSolutions(workshopTaskForSession(session),session).length) return {progress:next,changed:false};
  session.done=false;session.moves.rods=[];session.history=[];
  return {progress:next,changed:true};
}
