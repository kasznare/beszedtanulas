import test from 'node:test';
import assert from 'node:assert/strict';
import {applyRule, generateTask, logicTaskForSession, newSession, normalizeLogic, routeSolution, taskSolved, validateLogic} from '../logic-data.js';
import {generateWorkshopTask, newWorkshopSession, workshopTaskForSession, workshopSortTarget, workshopBalanceSolutions, workshopSolved, normalizeWorkshop, validateWorkshop} from '../workshop-data.js';
import {WORKSHOP_CLIPS} from '../workshop-voice.js';

test('new routes vary their edge endpoints and remain short, solvable tasks at every level',()=>{
  for(const level of [1,2,3]){
    const endpoints=new Set(), layouts=new Set();
    for(let seed=0;seed<300;seed++){
      const task=generateTask('route',level,5,seed), path=routeSolution(task), size=task.size;
      const edge=c=>c<size||c>=size*(size-1)||c%size===0||c%size===size-1;
      assert.ok(edge(task.start)&&edge(task.end)&&task.start!==task.end);
      assert.ok(path&&path.length-1<=task.maxSteps);
      assert.ok(path.length-1>=[2,5,8][level-1]&&path.length-1<=[6,10,15][level-1]);
      assert.equal(task.maxSteps,path.length-1+[2,3,4][level-1]);
      assert.ok(task.parcels.every(c=>c!==task.start&&c!==task.end&&!task.blocked.includes(c)));
      assert.ok(task.blocked.every(c=>c!==task.start&&c!==task.end));
      const session=newSession('route',level,5,seed);assert.deepEqual(session.path,[task.start]);
      session.path=path;assert.ok(taskSolved(task,session));
      const saved=normalizeLogic();saved.sessions.route=session;assert.deepEqual(validateLogic(saved).sessions.route,session);
      endpoints.add(`${task.start}:${task.end}`);layouts.add(`${task.start}:${task.end}:${task.parcels}:${task.blocked}`);
    }
    assert.ok(endpoints.size>20&&layouts.size>100,`level ${level} varies actual routes`);
  }
});

test('machine examples distinguish every rule that could change an unseen answer',()=>{
  for(const level of [1,2,3]){
    const programs=new Set(), examples=new Set();
    for(let seed=0;seed<300;seed++){
      const task=generateTask('machine',level,5,seed), inputs=[...task.examples.map(([n])=>n),...task.questions];
      assert.equal(new Set(inputs).size,5);
      const candidates=task.slots===1?task.choices.map(op=>[op]):task.choices.flatMap(a=>task.choices.map(b=>[a,b]));
      for(const candidate of candidates){
        if(task.examples.every(([n,result])=>applyRule(n,candidate)===result))
          assert.ok(task.questions.every(n=>applyRule(n,candidate)===applyRule(n,task.program)),`ambiguous machine ${level}/${seed}`);
      }
      for(const input of inputs){let n=input;for(const op of task.program){n=applyRule(n,[op]);assert.ok(n>=0&&n<=task.limit);}}
      programs.add(task.program.join(','));examples.add(task.examples.map(([n])=>n).join(','));
    }
    assert.ok(programs.size>=[2,5,10][level-1]);assert.ok(examples.size>=[2,15,50][level-1]);
  }
});

test('new sorting families classify every object once under two genuinely different rules',()=>{
  for(const level of [1,2,3]){
    const families=new Set();
    for(let seed=0;seed<250;seed++){
      const first=generateWorkshopTask('sort',level,seed,3,0),second=generateWorkshopTask('sort',level,seed,3,1);
      assert.deepEqual(first.objects,second.objects);
      if(level<3)assert.notDeepEqual(first.bins,second.bins);
      else assert.notEqual(first.filter.value,second.filter.value);
      for(const task of [first,second]){
        const destinations=task.objects.map(object=>workshopSortTarget(task,object));
        assert.ok(destinations.every(bin=>bin>=0&&bin<task.bins.length));
        assert.equal(new Set(destinations).size,task.bins.length);
        families.add(`${task.ruleKeys}:${task.filter?.key||''}`);
      }
      if(level===3){assert.equal(first.filter.key,second.filter.key);assert.notEqual(first.filter.value,second.filter.value);}
    }
    assert.equal(families.size,[3,3,2][level-1]);
  }
});

test('new pattern motifs expose one complete repeating unit and retain level-specific gap counts',()=>{
  for(const level of [1,2,3]){
    const structures=new Set();
    for(let seed=0;seed<250;seed++){
      const task=generateWorkshopTask('pattern',level,seed),session=newWorkshopSession('pattern',level,seed);
      assert.deepEqual(workshopTaskForSession(session),task);
      assert.equal(task.motif.length,[2,3,6][level-1]);
      assert.equal(task.holes.length,[2,3,4][level-1]);
      assert.ok(task.holes.every(i=>i>=task.motif.length));
      assert.ok(task.sequence.every((value,i)=>value===task.motif[i%task.motif.length]));
      assert.ok(task.palette.length>=2);
      session.moves.answers=task.holes.map(i=>task.sequence[i]);assert.ok(workshopSolved(task,session));
      const label=task.motif.map(i=>task.palette[i]);
      structures.add(label.map(o=>`${o.color===label[0].color?0:o.color===label[1].color?1:2}${o.shape===label[0].shape?0:o.shape===label[1].shape?1:2}`).join(','));
    }
    assert.ok(structures.size>=[3,3,3][level-1]);
  }
});

test('new balance targets retain legal compositions, a useful spread, and exact stock limits',()=>{
  for(const level of [1,2,3]){
    const targets=new Set();
    for(let seed=0;seed<250;seed++){
      const task=generateWorkshopTask('balance',level,seed),solutions=workshopBalanceSolutions(task);
      assert.ok(solutions.length>0);targets.add(task.target);
      for(const rods of solutions){
        assert.ok(rods.every(n=>task.choices.includes(n)));
        assert.ok(rods.length<=task.maxPieces);
        const session=newWorkshopSession('balance',level,seed);session.moves.rods=rods;
        assert.ok(workshopSolved(task,session));
        const saved=normalizeWorkshop();saved.sessions.balance[level-1]=session;assert.deepEqual(validateWorkshop(saved).sessions.balance[level-1],session);
      }
    }
    assert.ok(targets.size>=[7,6,7][level-1]);
  }
});

test('legacy seeded sessions still reconstruct and validate under their original task versions',()=>{
  for(const level of [1,2,3])for(const seed of [0,7,42,99]){
    for(const kind of ['machine','route']){
      const session=newSession(kind,level,5,seed);delete session.taskVersion;
      const task=generateTask(kind,level,5,seed,1);assert.deepEqual(logicTaskForSession(session),task);
      if(kind==='machine'){session.program=task.program;session.values=task.questions.map(n=>applyRule(n,task.program));}
      else session.path=routeSolution(task);
      session.done=true;const progress=normalizeLogic();progress.sessions[kind]=session;assert.deepEqual(validateLogic(progress).sessions[kind],session);
    }
    for(const kind of ['sort','pattern','balance']){
      const session=newWorkshopSession(kind,level,seed);session.taskVersion=2;
      const task=generateWorkshopTask(kind,level,seed,2);
      session.moves={placements:kind==='sort'?task.objects.map(()=>-1):[],answers:kind==='pattern'?task.holes.map(()=>null):[],rods:[]};
      assert.deepEqual(workshopTaskForSession(session),task);
      const progress=normalizeWorkshop();progress.sessions[kind][level-1]=session;assert.deepEqual(validateWorkshop(progress).sessions[kind][level-1],session);
    }
  }
});

test('every new sorting narration key is defined for offline playback',()=>{
  for(const key of ['new','again_new','rule_color','rule_shape','rule_size','rule_color_shape','rule_color_size','rule_shape_size','rule_hint','only_circle','only_square','only_triangle'])
    assert.ok(WORKSHOP_CLIPS[`workshop_${key.startsWith('only')?key:`sort_${key}`}`]);
});
