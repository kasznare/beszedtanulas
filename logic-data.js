// Deterministic puzzles: the saved seed is enough to reproduce every task.
// Task version 3 adds market days, order-sensitive machines and programmable routes.
// Versions 1 and 2 stay reproducible so older saves and backups still validate.
export const LOGIC_GAMES = ['shop', 'machine', 'route'];
export const LOGIC_NAMES = { shop: 'Erdei bolt', machine: 'Szabálygép', route: 'Csomagösvény' };
export const LEVEL_NAMES = ['Felfedező', 'Gondolkodó', 'Tervező'];
export const LOGIC_TASK_VERSION = 3;
export const OPS = { add1: { label: '+ 1', n: 1 }, sub1: { label: '− 1', n: -1 }, add2: { label: '+ 2', n: 2 }, sub2: { label: '− 2', n: -2 }, double: { label: '× 2', n: 0 }, add3: { label: '+ 3', n: 3 }, sub3: { label: '− 3', n: -3 } };
// Route programs store directions: 0 up, 1 right, 2 down, 3 left.
export const ROUTE_DIRECTIONS = ['up', 'right', 'down', 'left'];
export const SHOP_ANIMALS = ['🐰', '🐿️', '🦔', '🦊', '🐻', '🦉', '🐭', '🐸'];
const integer = (n, min, max) => Number.isSafeInteger(n) && n >= min && n <= max;
export function randomSeed() { return Math.floor(Math.random() * 0x100000000); }
function rng(seed) { let s = seed >>> 0; return () => { s += 0x6D2B79F5; let t = Math.imul(s ^ s >>> 15, 1 | s); t ^= t + Math.imul(t ^ t >>> 7, 61 | t); return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const pick = (items, random) => items[Math.floor(random() * items.length)];
function shuffled(items, random) { const result = [...items]; for (let i = result.length - 1; i > 0; i--) { const j = Math.floor(random() * (i + 1)); [result[i], result[j]] = [result[j], result[i]]; } return result; }
export function applyRule(input, program) { return program.reduce((n, op) => !OPS[op] || !Number.isFinite(n) ? NaN : op === 'double' ? n * 2 : n + OPS[op].n, input); }
export function neighbours(cell, size) { const x = cell % size, y = Math.floor(cell / size); return [x > 0 ? cell - 1 : -1, x < size - 1 ? cell + 1 : -1, y > 0 ? cell - size : -1, y < size - 1 ? cell + size : -1].filter(n => n >= 0); }
// Breadth-first search includes the collected-parcel mask, so help works from any legal position.
export function routeSolution(task, prefix = [task.start]) {
  if (!prefix.length || prefix[0] !== task.start || prefix.some((c,i) => task.blocked.includes(c) || !integer(c,0,task.size**2-1) || (i && !neighbours(prefix[i-1],task.size).includes(c)))) return null;
  let mask = 0;
  prefix.forEach(c => { const k = task.parcels.indexOf(c); if (k >= 0) mask |= 1 << k; });
  const queue = [[prefix.at(-1), mask, []]], visited = new Set([`${prefix.at(-1)}:${mask}`]), full = (1 << task.parcels.length) - 1;
  for (let at = 0; at < queue.length; at++) {
    const [cell, collected, tail] = queue[at];
    if (cell === task.end && collected === full) return [...prefix, ...tail];
    for (const next of neighbours(cell,task.size)) {
      if (task.blocked.includes(next)) continue;
      const index = task.parcels.indexOf(next), nextMask = index < 0 ? collected : collected | 1 << index, key = `${next}:${nextMask}`;
      if (!visited.has(key)) { visited.add(key); queue.push([next, nextMask, [...tail,next]]); }
    }
  }
  return null;
}
// One cell further in a direction, or -1 when the step leaves the board.
export function routeStep(cell, direction, size) {
  const x = cell % size + [0, 1, 0, -1][direction], y = Math.floor(cell / size) + [-1, 0, 1, 0][direction];
  return x < 0 || y < 0 || x >= size || y >= size ? -1 : y * size + x;
}
export const routeDirection = (from, to, size) => ({ [-size]: 0, 1: 1, [size]: 2, [-1]: 3 })[to - from];
export const routeCap = task => task.maxSteps + 4;
// Plays a program exactly as the fox would: it stops at a rock, the board edge,
// the end of its step budget, or on arriving home with every parcel.
// A free walk only follows the drawn plan: it ignores the budget and the arrival.
export function routeWalk(task, steps, { free = false } = {}) {
  const cells = [task.start];
  let crash = -1, reason = '', arrived = -1;
  for (let i = 0; i < steps.length; i++) {
    if (!free && i >= task.maxSteps) { crash = i; reason = 'tired'; break; }
    const next = routeStep(cells.at(-1), steps[i], task.size);
    if (next < 0) { crash = i; reason = 'edge'; break; }
    if (task.blocked.includes(next)) { crash = i; reason = 'rock'; break; }
    cells.push(next);
    if (!free && next === task.end && task.parcels.every(c => cells.includes(c))) { arrived = i + 1; break; }
  }
  return { cells, crash, reason, arrived, target: crash >= 0 && reason !== 'tired' ? routeStep(cells.at(-1), steps[crash], task.size) : -1 };
}
export function routeStepsFromPath(path, size) { return path.slice(1).map((cell, i) => routeDirection(path[i], cell, size)); }

const SHOP_FORMATS = [['plain', 'plain', 'plain', 'plain'], ['plain', 'change', 'change', 'plain', 'change'], ['plain', 'change', 'sum', 'change', 'sum']];
function shopTask(level, limit, random) {
  const range = n => Math.floor(random() * n), max = level === 3 ? Math.max(10, limit) : limit, formats = SHOP_FORMATS[level - 1];
  const animals = shuffled(SHOP_ANIMALS, random).slice(0, formats.length);
  // Small, nearby changes keep the baskets worth adjusting instead of refilling.
  const shift = value => { const near = Array.from({ length: max }, (_, i) => i + 1).filter(n => n !== value && Math.abs(n - value) <= 3); return pick(near, random); };
  const initial = [range(Math.min(max, 5) + 1), range(Math.min(max, 5) + 1)];
  let previous = initial;
  const customers = formats.map((format, index) => {
    let order;
    if (format === 'sum') {
      const options = [];
      for (let a = 1; a < max; a++) for (let n = 1; n <= a && a + n <= max; n++) if (a !== previous[0] || n !== previous[1]) options.push([a, n]);
      order = pick(options, random);
    } else {
      const which = range(3); order = [...previous];
      for (const i of [0, 1]) if (which === 2 || which === i || order[i] === 0) order[i] = shift(previous[i]);
    }
    previous = order;
    return { animal: animals[index], format, order };
  });
  return { kind: 'shop', level, limit: max, initial, customers, orders: customers.map(c => c.order) };
}
const ADDITIVE = ['add1', 'add2', 'add3', 'sub1', 'sub2', 'sub3'];
function machineAnswers(n, program, max, count, random) {
  const right = applyRule(n, program), list = [right];
  const add = v => { if (Number.isInteger(v) && v >= 0 && v <= max && !list.includes(v)) list.push(v); };
  const near = random() < .5 ? [right + 1, right - 1] : [right - 1, right + 1];
  if (program.length === 2) {
    add(applyRule(n, [...program].reverse()));
    add(near[0]);
    add(applyRule(n, [program.find(op => op !== 'double')]));
  } else {
    const op = program[0];
    add(op === 'double' ? n + 2 : n - OPS[op].n);
    add(near[0]);
  }
  [near[1], n, right + 2, right - 2, right + 3, right - 3].forEach(add);
  return list.slice(0, count).sort((a, b) => a - b);
}
function machineTask(level, random) {
  const max = [10, 10, 20][level - 1];
  const choices = level === 1 ? ['add1', 'sub1', 'add2', 'sub2'] : level === 2 ? ['add1', 'sub1', 'add2', 'sub2', 'double', 'add3', 'sub3'] : Object.keys(OPS);
  // Level 3 only uses pairs whose order changes the result.
  const programs = level < 3 ? choices.map(op => [op]) : ADDITIVE.flatMap(op => [['double', op], [op, 'double']]);
  const program = pick(programs, random), reversed = [...program].reverse();
  const valid = n => { let a = n; return program.every(op => { a = applyRule(a, [op]); return integer(a, 0, max); }); };
  const pool = Array.from({ length: max + 1 }, (_, i) => i).filter(valid);
  const cuts = [0, Math.ceil(pool.length / 3), Math.ceil(pool.length * 2 / 3), pool.length];
  const examples = [0, 1, 2].map(i => pick(pool.slice(cuts[i], cuts[i + 1]), random));
  const rest = pool.filter(n => !examples.includes(n)), telling = rest.filter(n => integer(applyRule(n, reversed), 0, max));
  const questions = shuffled(program.length === 2 && telling.length >= 2 ? telling : rest, random).slice(0, 2);
  const answers = questions.map(n => machineAnswers(n, program, max, level === 3 ? 4 : 3, random));
  return { kind: 'machine', level, limit: max, program, choices, slots: program.length, examples: examples.map(n => [n, applyRule(n, program)]), questions, answers };
}
const ROUTE_LEVELS = [
  { sizes: [4], parcels: 1, rocks: [2], slack: 3, min: 4, max: 8 },
  { sizes: [5], parcels: 2, rocks: [4], slack: 2, min: 7, max: 14 },
  { sizes: [5, 6], parcels: 2, rocks: [5, 7], slack: 1, min: 9, max: 18 },
];
function routeTask(level, random) {
  const config = ROUTE_LEVELS[level - 1];
  let fallback = null;
  for (let attempt = 0; attempt < 240; attempt++) {
    const sizeIndex = Math.floor(random() * config.sizes.length), size = config.sizes[sizeIndex], rocks = config.rocks[sizeIndex];
    const all = Array.from({ length: size * size }, (_, i) => i), perimeter = all.filter(c => c < size || c >= size * (size - 1) || c % size === 0 || c % size === size - 1);
    const distance = (a, b) => Math.abs(a % size - b % size) + Math.abs(Math.floor(a / size) - Math.floor(b / size));
    const start = pick(perimeter, random), end = pick(perimeter.filter(c => c !== start && distance(c, start) >= size - 1), random);
    const cells = shuffled(all.filter(c => c !== start && c !== end), random), parcels = cells.slice(0, config.parcels);
    const task = { kind: 'route', level, size, start, end, parcels, blocked: [] };
    const open = routeSolution(task);
    // The first rock tries to sit on the obvious shortest way, so rocks change the plan.
    const onWay = open.slice(1, -1).filter(c => !parcels.includes(c)), candidates = [...shuffled(onWay, random).slice(0, 1), ...cells.slice(parcels.length)];
    for (const c of candidates) {
      if (task.blocked.length >= rocks) break;
      if (task.blocked.includes(c) || parcels.includes(c)) continue;
      task.blocked.push(c);
      if (!routeSolution(task)) task.blocked.pop();
    }
    const solution = routeSolution(task), steps = solution ? solution.length - 1 : 0;
    if (!solution || task.blocked.length !== rocks) continue;
    task.shortest = steps; task.maxSteps = steps + config.slack;
    fallback ??= task;
    if (steps >= config.min && steps <= config.max && (level === 1 || steps > open.length - 1)) return task;
  }
  return fallback;
}
export function generateTask(kind, level, limit, seed, version = LOGIC_TASK_VERSION) {
  const random = rng(seed), range = n => Math.floor(random() * n);
  if (version >= 3) return kind === 'shop' ? shopTask(level, limit, random) : kind === 'machine' ? machineTask(level, random) : routeTask(level, random);
  if (kind === 'shop') {
    // Both requests are nonempty; at level 3 their SUM remains in the selected number range.
    const first = level === 3 ? [2 + range(Math.max(1,limit-3)),1] : [1 + range(limit),1 + range(limit)];
    if (level === 3) first[1] = 1 + range(Math.min(first[0]-1, limit-first[0]));
    let item = range(2); const second = [...first];
    const possible = i => Array.from({length:limit},(_,n)=>n+1).filter(n=>n!==first[i] && (level!==3 || (n+first[1-i]<=limit && (i===0?n>first[1]:n<first[0]))));
    if (!possible(item).length) item=1-item;
    const candidates = possible(item);
    second[item] = pick(candidates,random);
    const initial = first.map(n => { const delta=1+range(Math.min(4,limit)); return n+delta<=limit?n+delta:Math.max(0,n-delta); });
    return {kind,level,limit,initial,orders:[first,second],changed:item};
  }
  if (kind === 'machine') {
    const max = [5,10,20][level-1];
    const choices = level === 1 ? ['add1','sub1'] : level === 2 ? ['add1','sub1','add2','sub2','double'] : Object.keys(OPS);
    const oldPrograms = [['double','add1'],['add1','double'],['double','sub1'],['sub1','double'],['add2','double'],['double','sub3']];
    const programs = version < 2 ? oldPrograms : [
      ...['add1','add2','add3','sub1','sub2','sub3'].map(op=>['double',op]),
      ['add3','double'],['sub3','double'],['add1','sub1'],['add2','sub1'],['sub2','add1'],['sub3','add1']
    ];
    const program = level < 3 ? [pick(choices,random)] : pick(programs,random);
    const valid = n => { let a=n; return program.every(op => { a=applyRule(a,[op]); return integer(a,0,max); }); };
    const pool = Array.from({length:max+1},(_,i)=>i).filter(valid);
    const cuts=[0,Math.ceil(pool.length/3),Math.ceil(pool.length*2/3),pool.length];
    const examples = version<2 ? [] : [0,1,2].map(i=>pick(pool.slice(cuts[i],cuts[i+1]),random));
    const inputs = version < 2 ? shuffled(pool,random) : [...examples,...shuffled(pool.filter(n=>!examples.includes(n)),random)];
    return {kind,level,limit:max,program,choices,slots:program.length,examples:inputs.slice(0,3).map(n=>[n,applyRule(n,program)]),questions:inputs.slice(3,5)};
  }
  if (version >= 2) {
    const size = level+2, perimeter = Array.from({length:size*size},(_,i)=>i).filter(c=>c<size||c>=size*(size-1)||c%size===0||c%size===size-1);
    const distance = (a,b)=>Math.abs(a%size-b%size)+Math.abs(Math.floor(a/size)-Math.floor(b/size));
    const minSteps = [2,5,8][level-1], maxRoute = [6,10,15][level-1];
    for (let attempt=0;attempt<160;attempt++) {
      const start=pick(perimeter,random), end=pick(perimeter.filter(c=>c!==start&&distance(c,start)>=[2,3,4][level-1]),random);
      const cells=shuffled(Array.from({length:size*size},(_,i)=>i).filter(c=>c!==start&&c!==end),random);
      const parcels=cells.slice(0,level===3?2:1), blocked=[];
      const task={kind:'route',level,size,start,end,parcels,blocked};
      const targetBlocks=[0,2,4][level-1]+(level>1?Math.floor(random()*2):0);
      for(const c of cells.slice(parcels.length)) {
        if(blocked.length>=targetBlocks)break;
        blocked.push(c);
        if(!routeSolution(task))blocked.pop();
      }
      const solution=routeSolution(task), steps=solution?.length-1;
      if(steps>=minSteps&&steps<=maxRoute) {task.maxSteps=steps+[2,3,4][level-1];return task;}
    }
    return generateTask(kind,level,limit,seed,1);
  }
  const size = level+2, start = 0, end = size*size-1;
  const cells = shuffled(Array.from({length:size*size-2},(_,i)=>i+1),random);
  const parcels = cells.slice(0,level===3?2:1), blocked = [];
  const task = {kind:'route',level,size,start,end,parcels,blocked};
  for (const c of cells.slice(parcels.length)) {
    if (blocked.length >= [0,3,6][level-1]) break;
    blocked.push(c); if (!routeSolution(task)) blocked.pop();
  }
  task.maxSteps = routeSolution(task).length - 1 + [2,3,4][level-1];
  return task;
}
export function newSession(kind, level=1, limit=5, seed=randomSeed()) {
  const task = generateTask(kind,level,limit,seed,LOGIC_TASK_VERSION);
  const session = {kind,level,limit,seed,taskVersion:LOGIC_TASK_VERSION,stage:0,help:0,misses:0,done:false,values:kind==='shop'?[...task.initial]:kind==='machine'?[null,null]:[0,0],program:kind==='machine'?Array(task.slots).fill(null):[],path:[],history:[]};
  if (kind === 'shop') Object.assign(session, { marks: [], clean: true });
  if (kind === 'machine') Object.assign(session, { trials: 0, verified: false });
  if (kind === 'route') session.steps = [];
  return session;
}
export const logicTaskForSession = session => generateTask(session.kind,session.level,session.limit,session.seed,session.taskVersion??1);
export const isCurrentSession = session => session?.taskVersion === LOGIC_TASK_VERSION;
export const machineFits = (task, program) => program.length === task.slots && program.every(op => task.choices.includes(op)) && task.examples.every(([a,b]) => applyRule(a, program) === b);
export function taskSolved(task, session) {
  if (task.kind === 'shop') return session.values.every((n,i)=>n === task.orders[session.stage][i]);
  if (task.kind === 'machine') return machineFits(task, session.program) && task.questions.every((n,i)=>session.values[i]===applyRule(n,task.program));
  if (Array.isArray(session.steps)) { const walk = routeWalk(task, session.steps); return walk.crash < 0 && walk.arrived > 0 && walk.arrived === session.steps.length; }
  return session.path.length > 1 && session.path.length-1 <= task.maxSteps && session.path[0]===task.start && session.path.at(-1)===task.end && task.parcels.every(c=>session.path.includes(c)) && session.path.every((c,i)=>integer(c,0,task.size**2-1)&&!task.blocked.includes(c)&&(!i||neighbours(session.path[i-1],task.size).includes(c)));
}
export const shortestRoute = task => task.shortest ?? routeSolution(task).length - 1;
// One to three stars for the machine and the route; one star per cleanly served customer in the shop.
export function logicStars(task, session) {
  const assisted = session.help > 0 || session.misses > 0;
  if (task.kind === 'shop') return Array.isArray(session.marks) ? Math.max(1, session.marks.reduce((a, b) => a + b, 0)) : assisted ? 1 : 2;
  if (task.kind === 'machine') return Math.max(1, 3 - ((session.trials ?? 0) > 2 ? 1 : 0) - (assisted ? 1 : 0));
  const used = Array.isArray(session.steps) ? session.steps.length : session.path.length - 1;
  return Math.max(1, 3 - (used > shortestRoute(task) ? 1 : 0) - (assisted ? 1 : 0));
}
export function recordMiss(session) { session.misses = Math.min(9999, session.misses + 1); if (session.kind === 'shop' && 'clean' in session) session.clean = false; }
export function recordHint(session) { session.help = Math.min(3, session.help + 1); if (session.kind === 'shop' && 'clean' in session) session.clean = false; return session.help; }
// A machine trial counts toward the stars; predictions unlock only after a fitting trial.
export function recordTrial(session, task) { session.trials = Math.min(9999, (session.trials ?? 0) + 1); session.verified = machineFits(task, session.program); return session.verified; }
export function remember(session) {
  const move = {values:[...session.values],program:[...session.program],path:[...session.path]};
  if (Array.isArray(session.steps)) move.steps = [...session.steps];
  if (typeof session.verified === 'boolean') move.verified = session.verified;
  session.history.push(move); if (session.history.length>60) session.history.shift();
}
export function undoMove(session) { const last=session.history.pop(); if (last && !session.done) Object.assign(session,last); return !!last; }
function validCurrentSession(s, kind, task) {
  const last = kind === 'shop' ? task.customers.length - 1 : 0;
  if (!integer(s.stage, 0, last)) return false;
  const validMove = m => {
    if (!m || !Array.isArray(m.values) || m.values.length !== 2 || !Array.isArray(m.program) || !Array.isArray(m.path) || m.path.length) return false;
    if (kind === 'shop') return m.program.length === 0 && m.values.every(n => integer(n, 0, task.limit));
    if (kind === 'machine') return m.program.length === task.slots && m.program.every(op => op === null || task.choices.includes(op)) && m.values.every((n, i) => n === null || task.answers[i].includes(n)) && (m.verified === undefined || typeof m.verified === 'boolean');
    return m.program.length === 0 && m.values.every(n => n === 0) && Array.isArray(m.steps) && m.steps.length <= routeCap(task) && m.steps.every(d => integer(d, 0, 3));
  };
  if (kind === 'shop' && !(Array.isArray(s.marks) && s.marks.length === s.stage + (s.done ? 1 : 0) && s.marks.every(n => n === 0 || n === 1) && typeof s.clean === 'boolean')) return false;
  if (kind === 'machine' && !(integer(s.trials, 0, 9999) && typeof s.verified === 'boolean')) return false;
  return validMove(s) && Array.isArray(s.history) && s.history.length <= 60 && s.history.every(validMove) && (!s.done || (s.stage === last && taskSolved(task, s)));
}
function validSession(s, kind) {
  if (!s || s.kind!==kind || !integer(s.level,1,3)||![5,10,20].includes(s.limit)||!integer(s.seed,0,0xffffffff)||![1,2,3].includes(s.taskVersion??1)||!integer(s.help,0,3)||!integer(s.misses,0,9999)||typeof s.done!=='boolean') return false;
  const task=logicTaskForSession(s);
  if (s.taskVersion === 3) return validCurrentSession(s, kind, task);
  if (!integer(s.stage,0,kind==='shop'?1:0)) return false;
  const validMove = m => m && Array.isArray(m.values)&&m.values.length===2&&m.values.every(n=>integer(n,0,task.limit??20))&&Array.isArray(m.program)&&m.program.length===(kind==='machine'?task.slots:0)&&m.program.every(op=>op===null||task.choices?.includes(op))&&Array.isArray(m.path)&&m.path.length<50&&(kind==='route'?m.path.length>0&&m.path[0]===task.start&&m.path.length<=task.maxSteps+1&&m.path.every((c,i)=>integer(c,0,task.size**2-1)&&!task.blocked.includes(c)&&(!i||neighbours(m.path[i-1],task.size).includes(c))):m.path.length===0);
  return validMove(s)&&Array.isArray(s.history)&&s.history.length<=60&&s.history.every(validMove)&&(!s.done || ((kind!=='shop'||s.stage===1)&&taskSolved(task,s)));
}
const count=n=>integer(n,0,Number.MAX_SAFE_INTEGER)?n:0;
export function normalizeLogic(value={}) {
  // Keep the active-session shape readable by existing profile and backup clients.
  // The optional archive adds independent resume slots without changing old saves.
  const result={version:1,games:{},sessions:{},levelSessions:{}};
  for(const kind of LOGIC_GAMES) {
    result.games[kind] = Array.from({length:3},(_,i)=>({independent:count(value?.games?.[kind]?.[i]?.independent),assisted:count(value?.games?.[kind]?.[i]?.assisted)}));
    result.sessions[kind] = validSession(value?.sessions?.[kind],kind)?structuredClone(value.sessions[kind]):null;
    result.levelSessions[kind] = Array.from({length:3},(_,i)=>{
      const saved=value?.levelSessions?.[kind]?.[i];
      return validSession(saved,kind)&&saved.level===i+1?structuredClone(saved):null;
    });
  }
  return result;
}
export function validateLogic(value) {
  if(value===undefined)return normalizeLogic();
  const normal=normalizeLogic(value);
  if(!value || value.version!==1 || LOGIC_GAMES.some(k=>!Array.isArray(value.games?.[k])||value.games[k].length!==3||value.games[k].some((v,i)=>!v||v.independent!==normal.games[k][i].independent||v.assisted!==normal.games[k][i].assisted)|| (value.sessions?.[k]!==null&&!validSession(value.sessions?.[k],k)) || (value.levelSessions!==undefined && (!Array.isArray(value.levelSessions?.[k]) || value.levelSessions[k].length!==3 || value.levelSessions[k].some((s,i)=>s!==null&&(!validSession(s,k)||s.level!==i+1)))))) throw new Error('A Furfangliget mentése hibás. Nem módosítottam a játékot.');
  return normal;
}
export function logicSessionForLevel(progress, kind, level) {
  const current=progress.sessions[kind];
  return current?.level===level?current:progress.levelSessions?.[kind]?.[level-1]??null;
}
export function storeLogicSession(progress, session) {
  const previous=progress.sessions[session.kind];
  if(previous&&previous.level!==session.level) progress.levelSessions[session.kind][previous.level-1]=structuredClone(previous);
  progress.sessions[session.kind]=structuredClone(session);
  // The active copy is authoritative; leave only inactive levels in the archive.
  progress.levelSessions[session.kind][session.level-1]=null;
}
export function completeLogic(value,kind) {
  const next=normalizeLogic(value), s=next.sessions[kind];
  if(!s||s.done)return {progress:next,reward:false,changed:false};
  const task=logicTaskForSession(s);
  if(!taskSolved(task,s))return {progress:next,reward:false,changed:false};
  if(kind==='shop'&&s.taskVersion===3){
    // Each customer leaves with a copy; the baskets stay on the counter for the next one.
    s.marks.push(s.clean?1:0);
    if(s.stage<task.customers.length-1){s.stage++;s.clean=true;s.help=0;s.history=[];return {progress:next,reward:false,changed:true};}
  } else if(kind==='shop'&&s.stage===0){s.stage=1;s.history=[];return {progress:next,reward:false,changed:true};}
  s.done=true;s.history=[];const bucket=next.games[kind][s.level-1], key=s.help||s.misses||s.marks?.includes(0)?'assisted':'independent';bucket[key]=Math.min(Number.MAX_SAFE_INTEGER,bucket[key]+1);
  return {progress:next,reward:true,changed:true,stars:logicStars(task,s)};
}
