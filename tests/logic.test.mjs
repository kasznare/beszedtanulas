import test from 'node:test';
import assert from 'node:assert/strict';
import {LOGIC_GAMES,generateTask,newSession,routeSolution,taskSolved,applyRule,normalizeLogic,validateLogic,completeLogic,remember,undoMove} from '../logic-data.js';
import {snapshotProgress,createProgressBackup,parseProgressBackup,replaceProgress} from '../progress-data.js';
import {switchProgressProfile} from '../progress-profiles.js';

test('all shop levels and ranges produce two distinct, reachable orders within bounds',()=>{
 for(const level of [1,2,3])for(const limit of [5,10,20])for(let seed=0;seed<300;seed++){
  const t=generateTask('shop',level,limit,seed);
  assert.notDeepEqual(t.orders[0],t.orders[1]);
  for(const order of t.orders){assert.ok(order.every(n=>Number.isInteger(n)&&n>=1&&n<=limit));if(level===3){assert.ok(order[0]>order[1]);assert.ok(order[0]+order[1]<=limit);}}
  const s=newSession('shop',level,limit,seed);s.values=[...t.orders[0]];assert.ok(taskSolved(t,s));s.stage=1;assert.equal(taskSolved(t,s),false);s.values=[...t.orders[1]];assert.ok(taskSolved(t,s));
 }
});
test('every machine has three distinct examples and two unseen predictions within its level range',()=>{
 const rules=new Set();for(const level of [1,2,3])for(let seed=0;seed<300;seed++){
  const t=generateTask('machine',level,5,seed);rules.add(t.program.join(','));
  assert.equal(t.examples.length,3);assert.equal(t.questions.length,2);assert.equal(new Set([...t.examples.map(e=>e[0]),...t.questions]).size,5);
  const s=newSession('machine',level,5,seed);s.program=t.program;s.values=t.questions.map(n=>applyRule(n,t.program));assert.ok(taskSolved(t,s));
  assert.ok([...t.examples.flat(),...s.values].every(n=>Number.isInteger(n)&&n>=0&&n<=t.limit));s.values[0]++;assert.equal(taskSolved(t,s),false);
 }
 assert.ok(rules.size>=10);
});
test('route tasks are solvable for all levels, obstacles and random seeds',()=>{
 for(const level of [1,2,3])for(let seed=0;seed<400;seed++){
  const t=generateTask('route',level,5,seed),path=routeSolution(t),s=newSession('route',level,5,seed);
  assert.ok(path);assert.ok(path.length-1<=t.maxSteps);s.path=path;assert.ok(taskSolved(t,s));assert.equal(t.parcels.length,level===3?2:1);
  for(let i=1;i<path.length;i++){const prefix=path.slice(0,i);assert.ok(routeSolution(t,prefix));}
  s.path=[t.start,t.end];assert.equal(taskSolved(t,s),false);
 }
});
test('alternative routes and equivalent machine programs are accepted',()=>{
 const t={kind:'route',size:3,start:0,end:8,blocked:[],parcels:[4],maxSteps:6};
 for(const path of [[0,1,4,5,8],[0,3,4,7,8]])assert.ok(taskSolved(t,{path}));
 assert.equal(taskSolved(t,{path:[0,1,2,5,8]}),false);
 const machine={kind:'machine',slots:2,choices:['add1','add2'],examples:[[0,3],[1,4],[2,5]],questions:[3,4],program:['add1','add2']};
 assert.ok(taskSolved(machine,{program:['add2','add1'],values:[6,7]}));
});
test('shop rewards only after both stages; completion and reopening cannot reward again',()=>{
 for(const kind of LOGIC_GAMES){let p=normalizeLogic();const s=newSession(kind,2,10,9),t=generateTask(kind,2,10,9);p.sessions[kind]=s;
  assert.equal(completeLogic(p,kind).reward,false);
  if(kind==='shop'){s.values=t.orders[0];const first=completeLogic(p,kind);assert.equal(first.reward,false);assert.equal(first.progress.sessions.shop.stage,1);p=first.progress;p.sessions.shop.values=t.orders[1];}
  if(kind==='machine'){s.program=t.program;s.values=t.questions.map(n=>applyRule(n,t.program));}
  if(kind==='route')s.path=routeSolution(t);
  const done=completeLogic(p,kind);assert.equal(done.reward,true);assert.equal(done.progress.games[kind][1].independent,1);assert.equal(completeLogic(done.progress,kind).reward,false);
  assert.deepEqual(validateLogic(done.progress),done.progress);
 }
});
test('undo restores a move, preserves assistance, and work survives backup/profile/reset/undo',()=>{
 let p=normalizeLogic();const s=newSession('shop',3,20,23);s.help=2;remember(s);s.values[0]--;undoMove(s);assert.equal(s.help,2);assert.deepEqual(s.values,generateTask('shop',3,20,23).initial);p.sessions.shop=s;
 const kid={url:'',activeRole:'kid',profileCode:'local'},admin={...kid,activeRole:'admin'};
 let state={...snapshotProgress({logic:p}),supabase:kid};state=switchProgressProfile(state,kid);const other=switchProgressProfile(state,admin);assert.equal(other.logic.sessions.shop,null);state=switchProgressProfile(other,kid);assert.deepEqual(state.logic,p);
 const backup=parseProgressBackup(JSON.stringify(createProgressBackup(state)));assert.deepEqual(backup.progress.logic,p);
 const reset=replaceProgress(state,snapshotProgress(),'reset');assert.equal(reset.logic.sessions.shop,null);assert.deepEqual(replaceProgress(reset,reset.undoProgress.progress,'undo').logic,p);
 assert.equal(state.attempts,0);assert.equal(state.plays,0);assert.ok(Object.values(state.wordStats).every(s=>s.attempts===0));
});
test('old backups gain empty logic data, corrupt puzzles and claimed completions are rejected',()=>{
 const old=snapshotProgress();delete old.logic;assert.deepEqual(parseProgressBackup(JSON.stringify(createProgressBackup(old))).progress.logic,normalizeLogic());
 const p=normalizeLogic();p.sessions.route=newSession('route',3,20,5);
 for(const mutate of [p=>p.version=2,p=>p.games.shop[0].assisted=-1,p=>p.sessions.route.seed=-1,p=>p.sessions.route.path.push(24),p=>p.sessions.route.done=true,p=>p.sessions.route.history=[{}],p=>p.sessions.route.help=20]){const bad=structuredClone(p);mutate(bad);assert.throws(()=>validateLogic(bad),/Furfangliget/);}
});
test('help and corrected wrong attempts count separately from independent tasks',()=>{
 for(const field of ['help','misses']){const p=normalizeLogic(),s=newSession('machine',1,5,2),t=generateTask('machine',1,5,2);s[field]=1;s.program=t.program;s.values=t.questions.map(n=>applyRule(n,t.program));p.sessions.machine=s;const done=completeLogic(p,'machine');assert.equal(done.progress.games.machine[0].assisted,1);assert.equal(done.progress.games.machine[0].independent,0);}
});
