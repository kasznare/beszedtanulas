// Deterministic puzzles: the saved seed is enough to reproduce every task.
export const LOGIC_GAMES = ['shop', 'machine', 'route'];
export const LOGIC_NAMES = { shop: 'Erdei bolt', machine: 'Szabálygép', route: 'Csomagösvény' };
export const LEVEL_NAMES = ['Felfedező', 'Gondolkodó', 'Tervező'];
export const OPS = { add1: { label: '+ 1', n: 1 }, sub1: { label: '− 1', n: -1 }, add2: { label: '+ 2', n: 2 }, sub2: { label: '− 2', n: -2 }, double: { label: '× 2', n: 0 }, add3: { label: '+ 3', n: 3 }, sub3: { label: '− 3', n: -3 } };
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
export function generateTask(kind, level, limit, seed) {
  const random = rng(seed), range = n => Math.floor(random() * n);
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
    const program = level < 3 ? [pick(choices,random)] : pick([['double','add1'],['add1','double'],['double','sub1'],['sub1','double'],['add2','double'],['double','sub3']],random);
    const inputs = shuffled(Array.from({length:max+1},(_,i)=>i).filter(n => { let a=n; return program.every(op => { a=applyRule(a,[op]); return integer(a,0,max); }); }),random);
    return {kind,level,limit:max,program,choices,slots:program.length,examples:inputs.slice(0,3).map(n=>[n,applyRule(n,program)]),questions:inputs.slice(3,5)};
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
  const task = generateTask(kind,level,limit,seed);
  return {kind,level,limit,seed,stage:0,help:0,misses:0,done:false,values:kind==='shop'?[...task.initial]:[0,0],program:kind==='machine'?Array(task.slots).fill(null):[],path:kind==='route'?[task.start]:[],history:[]};
}
export function taskSolved(task, session) {
  if (task.kind === 'shop') return session.values.every((n,i)=>n === task.orders[session.stage][i]);
  if (task.kind === 'machine') return session.program.length===task.slots && session.program.every(op=>task.choices.includes(op)) && task.examples.every(([a,b])=>applyRule(a,session.program)===b) && task.questions.every((n,i)=>session.values[i]===applyRule(n,task.program));
  return session.path.length > 1 && session.path.length-1 <= task.maxSteps && session.path[0]===task.start && session.path.at(-1)===task.end && task.parcels.every(c=>session.path.includes(c)) && session.path.every((c,i)=>integer(c,0,task.size**2-1)&&!task.blocked.includes(c)&&(!i||neighbours(session.path[i-1],task.size).includes(c)));
}
export function remember(session) { session.history.push({values:[...session.values],program:[...session.program],path:[...session.path]}); if (session.history.length>60) session.history.shift(); }
export function undoMove(session) { const last=session.history.pop(); if (last && !session.done) Object.assign(session,last); return !!last; }
function validSession(s, kind) {
  if (!s || s.kind!==kind || !integer(s.level,1,3)||![5,10,20].includes(s.limit)||!integer(s.seed,0,0xffffffff)||!integer(s.stage,0,kind==='shop'?1:0)||!integer(s.help,0,3)||!integer(s.misses,0,9999)||typeof s.done!=='boolean') return false;
  const task=generateTask(kind,s.level,s.limit,s.seed);
  const validMove = m => m && Array.isArray(m.values)&&m.values.length===2&&m.values.every(n=>integer(n,0,task.limit??20))&&Array.isArray(m.program)&&m.program.length===(kind==='machine'?task.slots:0)&&m.program.every(op=>op===null||task.choices?.includes(op))&&Array.isArray(m.path)&&m.path.length<50&&(kind==='route'?m.path.length>0&&m.path[0]===task.start&&m.path.length<=task.maxSteps+1&&m.path.every((c,i)=>integer(c,0,task.size**2-1)&&!task.blocked.includes(c)&&(!i||neighbours(m.path[i-1],task.size).includes(c))):m.path.length===0);
  return validMove(s)&&Array.isArray(s.history)&&s.history.length<=60&&s.history.every(validMove)&&(!s.done || ((kind!=='shop'||s.stage===1)&&taskSolved(task,s)));
}
const count=n=>integer(n,0,Number.MAX_SAFE_INTEGER)?n:0;
export function normalizeLogic(value={}) {
  const result={version:1,games:{},sessions:{}};
  for(const kind of LOGIC_GAMES) {
    result.games[kind] = Array.from({length:3},(_,i)=>({independent:count(value?.games?.[kind]?.[i]?.independent),assisted:count(value?.games?.[kind]?.[i]?.assisted)}));
    result.sessions[kind] = validSession(value?.sessions?.[kind],kind)?structuredClone(value.sessions[kind]):null;
  }
  return result;
}
export function validateLogic(value) {
  if(value===undefined)return normalizeLogic();
  const normal=normalizeLogic(value);
  if(!value || value.version!==1 || LOGIC_GAMES.some(k=>!Array.isArray(value.games?.[k])||value.games[k].length!==3||value.games[k].some((v,i)=>!v||v.independent!==normal.games[k][i].independent||v.assisted!==normal.games[k][i].assisted)|| (value.sessions?.[k]!==null&&!validSession(value.sessions?.[k],k)))) throw new Error('A Furfangliget mentése hibás. Nem módosítottam a játékot.');
  return normal;
}
export function completeLogic(value,kind) {
  const next=normalizeLogic(value), s=next.sessions[kind];
  if(!s||s.done||!taskSolved(generateTask(kind,s.level,s.limit,s.seed),s))return {progress:next,reward:false,changed:false};
  if(kind==='shop'&&s.stage===0){s.stage=1;s.history=[];return {progress:next,reward:false,changed:true};}
  s.done=true;s.history=[];next.games[kind][s.level-1][s.help||s.misses?'assisted':'independent']++;
  return {progress:next,reward:true,changed:true};
}
