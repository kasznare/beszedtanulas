import test from 'node:test';
import assert from 'node:assert/strict';
import {LOGIC_GAMES,OPS,generateTask,newSession,routeSolution,routeWalk,routeStepsFromPath,routeCap,taskSolved,applyRule,normalizeLogic,validateLogic,completeLogic,remember,undoMove,logicStars,recordMiss,recordHint,recordTrial,machineFits,logicTaskForSession} from '../logic-data.js';
import {snapshotProgress,createProgressBackup,parseProgressBackup,replaceProgress} from '../progress-data.js';
import {switchProgressProfile} from '../progress-profiles.js';

// Serves every customer of a market day and returns the final completion result.
function serveDay(progress,kind='shop'){
 let p=progress,result;
 for(;;){const s=p.sessions[kind],t=logicTaskForSession(s);s.values=[...t.orders[s.stage]];result=completeLogic(p,kind);p=result.progress;if(result.reward||!result.changed)return result;}
}
const solveMachine=(s,t)=>{s.program=[...t.program];s.verified=true;s.values=t.questions.map(n=>applyRule(n,t.program));};
const solveRoute=(s,t)=>{s.steps=routeStepsFromPath(routeSolution(t),t.size);};

test('market days serve 4–5 customers whose orders keep changing within bounds',()=>{
 for(const level of [1,2,3])for(const limit of [5,10,20])for(let seed=0;seed<300;seed++){
  const t=generateTask('shop',level,limit,seed);
  assert.equal(t.customers.length,level===1?4:5);
  assert.equal(new Set(t.customers.map(c=>c.animal)).size,t.customers.length,'every customer is a different animal');
  assert.equal(t.limit,level===3?Math.max(10,limit):limit);
  assert.ok(t.initial.every(n=>Number.isInteger(n)&&n>=0&&n<=t.limit));
  let previous=t.initial;
  for(const c of t.customers){
   assert.ok(c.order.every(n=>Number.isInteger(n)&&n>=1&&n<=t.limit));
   assert.notDeepEqual(c.order,previous,'every customer changes the baskets');
   if(c.format==='sum'){assert.ok(c.order[0]>=c.order[1]);assert.ok(c.order[0]+c.order[1]<=t.limit);}
   previous=c.order;
  }
  const formats=t.customers.map(c=>c.format);
  if(level===1)assert.ok(formats.every(f=>f==='plain'));
  else{assert.equal(formats[0],'plain');assert.ok(formats.includes('change'));}
  if(level===3)assert.ok(formats.includes('sum'));
 }
});
test('level-3 market orders cover equal baskets, the (limit−1, 1) split and many first orders',()=>{
 for(const limit of [5,10,20]){
  const sums=new Set(),firsts=new Set();
  for(let seed=0;seed<600;seed++){const t=generateTask('shop',3,limit,seed);firsts.add(t.orders[0].join());t.customers.filter(c=>c.format==='sum').forEach(c=>sums.add(c.order.join()));}
  const max=Math.max(10,limit);
  assert.ok(sums.has(`${max-1},1`),`${limit}: (limit−1, 1) is generated`);
  assert.ok([...sums].some(o=>{const [a,n]=o.split(',').map(Number);return a===n;}),`${limit}: equal baskets are generated`);
  assert.ok(firsts.size>=10,`${limit}: varied first orders`);
 }
});
test('legacy two-order shop tasks are still reproducible',()=>{
 for(const level of [1,2,3])for(const limit of [5,10,20])for(let seed=0;seed<100;seed++){
  const t=generateTask('shop',level,limit,seed,2);
  assert.notDeepEqual(t.orders[0],t.orders[1]);
  for(const order of t.orders){assert.ok(order.every(n=>Number.isInteger(n)&&n>=1&&n<=limit));if(level===3){assert.ok(order[0]>order[1]);assert.ok(order[0]+order[1]<=limit);}}
 }
});
test('machine levels widen the rule set; level 3 uses only order-sensitive pairs',()=>{
 const rules=[new Set(),new Set(),new Set()];
 for(const level of [1,2,3])for(let seed=0;seed<400;seed++){
  const t=generateTask('machine',level,5,seed);rules[level-1].add(t.program.join(','));
  assert.equal(t.examples.length,3);assert.equal(t.questions.length,2);assert.equal(new Set([...t.examples.map(e=>e[0]),...t.questions]).size,5);
  assert.ok([...t.examples.flat(),...t.questions.map(n=>applyRule(n,t.program))].every(n=>Number.isInteger(n)&&n>=0&&n<=t.limit));
  if(level===3){
   const reversed=[...t.program].reverse();
   assert.ok([...t.examples.map(e=>e[0]),...t.questions].every(n=>applyRule(n,reversed)!==applyRule(n,t.program)),`${seed}: order matters for every input`);
  }
  const s=newSession('machine',level,5,seed);solveMachine(s,t);assert.ok(taskSolved(t,s));
  s.values[0]=t.answers[0].find(v=>v!==s.values[0]);assert.equal(taskSolved(t,s),false);
 }
 assert.deepEqual([...rules[0]].sort(),['add1','add2','sub1','sub2']);
 assert.deepEqual([...rules[1]].sort(),['add1','add2','add3','double','sub1','sub2','sub3']);
 assert.equal(rules[2].size,12);
 assert.ok([...rules[2]].every(r=>r.split(',').includes('double')));
});
test('machine predictions offer 3–4 distinct candidates with the right answer and telling mistakes',()=>{
 let reversedShown=0,total=0;
 for(const level of [1,2,3])for(let seed=0;seed<300;seed++){
  const t=generateTask('machine',level,5,seed);
  t.questions.forEach((n,i)=>{
   const options=t.answers[i],right=applyRule(n,t.program);total+=level===3;
   assert.equal(options.length,level===3?4:3);assert.equal(new Set(options).size,options.length);
   assert.ok(options.includes(right));assert.ok(options.every(v=>Number.isInteger(v)&&v>=0&&v<=t.limit));
   assert.deepEqual(options,[...options].sort((a,b)=>a-b));
   if(level===3&&options.includes(applyRule(n,[...t.program].reverse())))reversedShown++;
  });
 }
 assert.equal(reversedShown,total,'level 3 always offers the reversed-order result');
});
test('machine trials are counted; three stars need at most two trials and no help',()=>{
 const t=generateTask('machine',3,5,8),s=newSession('machine',3,5,8);
 s.program=[t.choices.find(op=>op!==t.program[0]),t.program[1]];assert.equal(recordTrial(s,t),false);assert.equal(s.verified,false);
 s.program=[...t.program];assert.equal(recordTrial(s,t),true);assert.equal(s.trials,2);
 s.values=t.questions.map(n=>applyRule(n,t.program));assert.equal(logicStars(t,s),3);
 recordTrial(s,t);assert.equal(logicStars(t,s),2);recordHint(s);assert.equal(logicStars(t,s),1);
 assert.ok(machineFits(t,s.program));
});
test('route levels: 4×4 map, 5×5 two parcels, 5–6 board with a tight budget',()=>{
 const sizes=new Set();
 for(const level of [1,2,3])for(let seed=0;seed<300;seed++){
  const t=generateTask('route',level,5,seed),path=routeSolution(t),s=newSession('route',level,5,seed);
  assert.ok(path);assert.equal(path.length-1,t.shortest);assert.equal(t.maxSteps,t.shortest+[3,2,1][level-1]);
  assert.equal(t.parcels.length,level===1?1:2);
  if(level===3){assert.ok([5,6].includes(t.size));sizes.add(t.size);assert.equal(t.blocked.length,t.size===5?5:7);}
  else{assert.equal(t.size,level===1?4:5);assert.equal(t.blocked.length,level===1?2:4);}
  assert.ok(t.blocked.every(c=>c!==t.start&&c!==t.end&&!t.parcels.includes(c)));
  solveRoute(s,t);assert.ok(taskSolved(t,s));
  for(let i=1;i<path.length;i++)assert.ok(routeSolution(t,path.slice(0,i)));
  s.steps=s.steps.slice(0,-1);assert.equal(taskSolved(t,s),false);
 }
 assert.deepEqual([...sizes].sort(),[5,6]);
});
test('route programs may hit rocks or edges; the fox stops at the first bad step',()=>{
 const t={kind:'route',size:3,start:0,end:8,blocked:[4],parcels:[2],maxSteps:5,shortest:4};
 let walk=routeWalk(t,[1,2,2]);assert.equal(walk.crash,1);assert.equal(walk.reason,'rock');assert.equal(walk.target,4);assert.deepEqual(walk.cells,[0,1]);
 walk=routeWalk(t,[0]);assert.equal(walk.crash,0);assert.equal(walk.reason,'edge');assert.equal(walk.target,-1);
 walk=routeWalk(t,[1,3,1,3,1,3]);assert.equal(walk.crash,5);assert.equal(walk.reason,'tired');
 walk=routeWalk(t,[1,1,2,2,0]);assert.equal(walk.arrived,4);assert.equal(taskSolved(t,{steps:[1,1,2,2,0]}),false);assert.ok(taskSolved(t,{steps:[1,1,2,2]}));
 assert.equal(routeWalk(t,[1,1,2,2,0],{free:true}).cells.length,6,'a drawn plan continues past the house');
 // Edge steps never wrap to the next row.
 assert.equal(routeWalk(t,[1,1,1]).reason,'edge');
});
test('route stars compare the program with the shortest route',()=>{
 const t={kind:'route',size:3,start:0,end:8,blocked:[],parcels:[4],maxSteps:6,shortest:4},s=newSession('route',1,5,1);
 s.steps=[1,2,1,2];assert.equal(logicStars(t,s),3);
 s.steps=[2,1,1,3,2,1];assert.ok(taskSolved(t,s));assert.equal(logicStars(t,s),2);
 recordMiss(s);assert.equal(logicStars(t,s),1);
});
test('alternative routes and equivalent machine programs are accepted',()=>{
 const t={kind:'route',size:3,start:0,end:8,blocked:[],parcels:[4],maxSteps:6};
 for(const path of [[0,1,4,5,8],[0,3,4,7,8]])assert.ok(taskSolved(t,{path}));
 assert.equal(taskSolved(t,{path:[0,1,2,5,8]}),false);
 for(const steps of [[1,2,1,2],[2,1,2,1]])assert.ok(taskSolved(t,{steps}));
 const machine={kind:'machine',slots:2,choices:['add1','add2'],examples:[[0,3],[1,4],[2,5]],questions:[3,4],program:['add1','add2']};
 assert.ok(taskSolved(machine,{program:['add2','add1'],values:[6,7]}));
});
test('a market day rewards once after the last customer, with one star per clean customer',()=>{
 for(const level of [1,2,3]){
  let p=normalizeLogic();const s=newSession('shop',level,10,9),t=logicTaskForSession(s);p.sessions.shop=s;
  assert.equal(completeLogic(p,'shop').reward,false);
  for(let i=0;i<t.customers.length-1;i++){
   const current=p.sessions.shop;current.values=[...t.orders[current.stage]];if(i===1)recordMiss(current);if(i===2)recordHint(current);
   const step=completeLogic(p,'shop');assert.equal(step.reward,false);assert.equal(step.changed,true);p=step.progress;
   assert.equal(p.sessions.shop.stage,i+1);assert.equal(p.sessions.shop.help,0);assert.equal(p.sessions.shop.clean,true);
   assert.deepEqual(validateLogic(p),p);
  }
  p.sessions.shop.values=[...t.orders.at(-1)];const done=completeLogic(p,'shop');
  assert.equal(done.reward,true);assert.deepEqual(done.progress.sessions.shop.marks,t.customers.map((_,i)=>i===1||i===2?0:1));
  assert.equal(done.stars,t.customers.length-2);assert.equal(done.progress.games.shop[level-1].assisted,1);
  assert.equal(completeLogic(done.progress,'shop').reward,false);assert.deepEqual(validateLogic(done.progress),done.progress);
 }
 const clean=normalizeLogic();clean.sessions.shop=newSession('shop',2,5,4);const result=serveDay(clean);
 assert.equal(result.stars,5);assert.equal(result.progress.games.shop[1].independent,1);
});
test('machine and route reward once, and completion and reopening cannot reward again',()=>{
 for(const kind of ['machine','route']){let p=normalizeLogic();const s=newSession(kind,2,10,9),t=generateTask(kind,2,10,9);p.sessions[kind]=s;
  assert.equal(completeLogic(p,kind).reward,false);
  if(kind==='machine')solveMachine(s,t);else solveRoute(s,t);
  const done=completeLogic(p,kind);assert.equal(done.reward,true);assert.equal(done.stars,3);assert.equal(done.progress.games[kind][1].independent,1);assert.equal(completeLogic(done.progress,kind).reward,false);
  assert.deepEqual(validateLogic(done.progress),done.progress);
 }
});
test('undo restores a move, preserves assistance, and work survives backup/profile/reset/undo',()=>{
 let p=normalizeLogic();const s=newSession('shop',3,20,23);s.help=2;remember(s);s.values[0]++;undoMove(s);assert.equal(s.help,2);assert.deepEqual(s.values,generateTask('shop',3,20,23).initial);p.sessions.shop=s;
 const r=newSession('route',2,5,3);remember(r);r.steps.push(1);undoMove(r);assert.deepEqual(r.steps,[]);
 const m=newSession('machine',1,5,3),mt=logicTaskForSession(m);m.program=[...mt.program];m.verified=true;remember(m);m.program=[mt.choices.find(op=>op!==mt.program[0])];m.verified=false;undoMove(m);assert.equal(m.verified,true);
 const kid={url:'',activeRole:'kid',profileCode:'local'},admin={...kid,activeRole:'admin'};
 let state={...snapshotProgress({logic:p}),supabase:kid};state=switchProgressProfile(state,kid);const other=switchProgressProfile(state,admin);assert.equal(other.logic.sessions.shop,null);state=switchProgressProfile(other,kid);assert.deepEqual(state.logic,p);
 const backup=parseProgressBackup(JSON.stringify(createProgressBackup(state)));assert.deepEqual(backup.progress.logic,p);
 const reset=replaceProgress(state,snapshotProgress(),'reset');assert.equal(reset.logic.sessions.shop,null);assert.deepEqual(replaceProgress(reset,reset.undoProgress.progress,'undo').logic,p);
 assert.equal(state.attempts,0);assert.equal(state.plays,0);assert.ok(Object.values(state.wordStats).every(s=>s.attempts===0));
});
test('old backups gain empty logic data, corrupt puzzles and claimed completions are rejected',()=>{
 const old=snapshotProgress();delete old.logic;assert.deepEqual(parseProgressBackup(JSON.stringify(createProgressBackup(old))).progress.logic,normalizeLogic());
 const p=normalizeLogic();p.sessions.route=newSession('route',3,20,5);p.sessions.machine=newSession('machine',2,5,5);p.sessions.shop=newSession('shop',2,5,5);
 const t=generateTask('route',3,20,5);
 for(const mutate of [p=>p.version=2,p=>p.games.shop[0].assisted=-1,p=>p.sessions.route.seed=-1,p=>p.sessions.route.path.push(24),p=>p.sessions.route.done=true,p=>p.sessions.route.history=[{}],p=>p.sessions.route.help=20,
  p=>p.sessions.route.steps.push(4),p=>{p.sessions.route.steps=Array(routeCap(t)+1).fill(1);},p=>p.sessions.machine.values[0]=999,p=>p.sessions.machine.trials=-1,p=>p.sessions.shop.marks=[1],p=>p.sessions.shop.stage=7,p=>delete p.sessions.shop.clean]){const bad=structuredClone(p);mutate(bad);assert.throws(()=>validateLogic(bad),/Furfangliget/);}
 const program=structuredClone(p);program.sessions.route.steps=[0,0,0];assert.deepEqual(validateLogic(program),program,'a program into the edge is a valid unfinished plan');
});
test('help and corrected wrong attempts count separately from independent tasks',()=>{
 for(const field of ['help','misses']){const p=normalizeLogic(),s=newSession('machine',1,5,2),t=generateTask('machine',1,5,2);s[field]=1;solveMachine(s,t);p.sessions.machine=s;const done=completeLogic(p,'machine');assert.equal(done.progress.games.machine[0].assisted,1);assert.equal(done.progress.games.machine[0].independent,0);assert.equal(done.stars,2);}
});
test('every machine operation label and narration exists',()=>{
 for(const level of [1,2,3]){const t=generateTask('machine',level,5,1);assert.ok(t.choices.every(op=>OPS[op]));}
});
