import test from 'node:test';
import assert from 'node:assert/strict';
import { LOGIC_GAMES, normalizeLogic, validateLogic, logicSessionForLevel, storeLogicSession, newSession, generateTask, routeSolution, applyRule, completeLogic } from '../logic-data.js';
import { WORKSHOP_COLORS, WORKSHOP_SHAPES, newWorkshopSession, generateWorkshopTask, workshopTaskForSession, workshopSortTarget, normalizeWorkshop, validateWorkshop, completeWorkshop, workshopSolved, workshopBalanceSolutions, remainingWorkshopSolutions, beginWorkshopAlternative, workshopHint, workshopSolutionKey } from '../workshop-data.js';
import { WORKSHOP_CLIPS } from '../workshop-voice.js';
import { createProgressBackup, parseProgressBackup, snapshotProgress } from '../progress-data.js';

test('old active logic sessions migrate without changing them, and every level resumes after switching',()=>{
  const old=normalizeLogic();delete old.levelSessions;
  for(const kind of LOGIC_GAMES)old.sessions[kind]=newSession(kind,1,5,35);
  const migrated=validateLogic(old);
  for(const kind of LOGIC_GAMES){
    assert.deepEqual(migrated.sessions[kind],old.sessions[kind]);
    for(const level of [2,3]){const s=newSession(kind,level,10,level*100);s.help=level;storeLogicSession(migrated,s);}
    for(const level of [1,2,3]){
      const saved=structuredClone(logicSessionForLevel(migrated,kind,level));
      assert.equal(saved.level,level);storeLogicSession(migrated,saved);
      assert.deepEqual(logicSessionForLevel(migrated,kind,level),saved);
    }
  }
  const backup=parseProgressBackup(JSON.stringify(createProgressBackup({...snapshotProgress(),logic:migrated})));
  assert.deepEqual(backup.progress.logic,migrated);
  const bad=structuredClone(migrated);bad.levelSessions.shop[0].level=3;
  assert.throws(()=>validateLogic(bad),/Furfangliget/);
});

test('completed logic tasks retain exactly one reward after leaving and resuming their level',()=>{
  for(const kind of LOGIC_GAMES){
    let p=normalizeLogic();const s=newSession(kind,1,5,42),t=generateTask(kind,1,5,42);
    if(kind==='shop'){s.stage=1;s.values=t.orders[1];}
    if(kind==='machine'){s.program=t.program;s.values=t.questions.map(n=>applyRule(n,t.program));}
    if(kind==='route')s.path=routeSolution(t);
    storeLogicSession(p,s);const first=completeLogic(p,kind);assert.equal(first.reward,true);p=first.progress;
    storeLogicSession(p,newSession(kind,2,5,77));storeLogicSession(p,logicSessionForLevel(p,kind,1));
    assert.equal(completeLogic(p,kind).reward,false);assert.equal(p.games[kind][0].independent,1);
  }
});

test('sorting reuses identical objects under a different solvable rule and rewards only after both rounds',()=>{
  for(const level of [1,2,3])for(let seed=0;seed<100;seed++){
    let p=normalizeWorkshop();let s=newWorkshopSession('sort',level,seed);p.sessions.sort[level-1]=s;
    const first=workshopTaskForSession(s);s.moves.placements=first.objects.map(o=>workshopSortTarget(first,o));
    const midway=completeWorkshop(p,'sort',level);assert.equal(midway.reward,false);assert.equal(midway.changed,true);
    p=validateWorkshop(JSON.parse(JSON.stringify(midway.progress)));s=p.sessions.sort[level-1];const second=workshopTaskForSession(s);
    assert.equal(s.round,1);assert.deepEqual(second.objects,first.objects);assert.ok(s.moves.placements.every(n=>n===-1));
    const labels=t=>t.objects.map(o=>JSON.stringify(t.bins[workshopSortTarget(t,o)]));
    assert.notDeepEqual(labels(first),labels(second));
    s.moves.placements=second.objects.map(o=>workshopSortTarget(second,o));
    assert.ok(s.moves.placements.every(n=>n>=0));assert.ok(workshopSolved(second,s));
    const last=completeWorkshop(p,'sort',level);assert.equal(last.reward,true);assert.equal(last.progress.games.sort[level-1].independent,1);
    assert.equal(completeWorkshop(last.progress,'sort',level).reward,false);validateWorkshop(last.progress);
  }
});

test('legacy workshop seeds keep fixed holes and one sorting round while new patterns vary after a complete prefix',()=>{
  for(const level of [1,2,3]){
    const variations=new Set();
    for(let seed=0;seed<100;seed++){
      const s=newWorkshopSession('pattern',level,seed),t=workshopTaskForSession(s);variations.add(t.holes.join(','));
      assert.ok(t.holes.every(index=>index>=t.motif.length));
      delete s.taskVersion;delete s.round;delete s.rewarded;delete s.found;
      const legacy=workshopTaskForSession(s);
      assert.deepEqual(legacy.holes,[[6,7],[4,7,8],[3,7,10,11]][level-1]);
      s.moves.answers=legacy.holes.map(i=>legacy.sequence[i]);s.done=true;
      const p=normalizeWorkshop();p.sessions.pattern[level-1]=s;assert.deepEqual(validateWorkshop(p).sessions.pattern[level-1],s);
    }
    assert.ok(variations.size>3);
    const old=newWorkshopSession('sort',level,88);delete old.taskVersion;delete old.round;delete old.rewarded;delete old.found;
    const task=generateWorkshopTask('sort',level,old.seed,1);old.moves.placements=task.objects.map(o=>workshopSortTarget(task,o));
    const p=normalizeWorkshop();p.sessions.sort[level-1]=old;assert.equal(completeWorkshop(p,'sort',level).reward,true);
  }
});

test('balance alternatives survive saves, require a different combination, and never repeat the original reward',()=>{
  for(const level of [1,2,3])for(let seed=0;seed<25;seed++){
    let p=normalizeWorkshop();const s=newWorkshopSession('balance',level,seed),task=workshopTaskForSession(s),solutions=workshopBalanceSolutions(task);p.sessions.balance[level-1]=s;
    s.moves.rods=solutions[0];let result=completeWorkshop(p,'balance',level);assert.equal(result.reward,true);p=result.progress;
    for(let i=1;i<solutions.length;i++){
      const started=beginWorkshopAlternative(p,level);assert.equal(started.changed,true);p=validateWorkshop(JSON.parse(JSON.stringify(started.progress)));
      const current=p.sessions.balance[level-1];assert.equal(current.done,false);assert.equal(current.rewarded,true);
      current.moves.rods=[...solutions[0]].reverse();result=completeWorkshop(p,'balance',level);assert.equal(result.duplicate,true);assert.equal(result.reward,false);
      assert.notEqual(workshopHint(task,current).action,'ready');
      current.moves.rods=solutions[i];result=completeWorkshop(p,'balance',level);assert.equal(result.changed,true);assert.equal(result.reward,false);p=result.progress;
      assert.equal(p.games.balance[level-1].independent,1);assert.equal(p.sessions.balance[level-1].found.length,i+1);
      validateWorkshop(p);
    }
    assert.equal(remainingWorkshopSolutions(task,p.sessions.balance[level-1]).length,0);
    assert.equal(beginWorkshopAlternative(p,level).changed,false);
    assert.equal(new Set(p.sessions.balance[level-1].found.map(workshopSolutionKey)).size,solutions.length);
  }
});

test('new complete patterns cannot conceal a first sorting round, forged alternatives or malformed archives',()=>{
  const p=normalizeWorkshop(),s=newWorkshopSession('sort',1,5),task=workshopTaskForSession(s);p.sessions.sort[0]=s;
  s.moves.placements=task.objects.map(o=>workshopSortTarget(task,o));s.done=true;assert.throws(()=>validateWorkshop(p));
  const q=normalizeWorkshop(),b=newWorkshopSession('balance',1,6);q.sessions.balance[0]=b;b.found=[[999]];b.rewarded=true;assert.throws(()=>validateWorkshop(q));
  const old=normalizeLogic();old.levelSessions.machine=[null];assert.throws(()=>validateLogic(old));
});

test('every narrated pattern object and empty slot has an offline voice definition',()=>{
  for(const color of Object.keys(WORKSHOP_COLORS))for(const shape of Object.keys(WORKSHOP_SHAPES))assert.ok(WORKSHOP_CLIPS[`workshop_object_${color}_${shape}`]);
  assert.ok(WORKSHOP_CLIPS.workshop_pattern_gap);
});
