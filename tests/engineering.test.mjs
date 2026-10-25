import test from 'node:test';
import assert from 'node:assert/strict';
import { BRIDGE_LEVELS, DROP_LEVELS, BUILD_CHALLENGES, bridgeLayout, bridgeSpent, bridgeStars, bridgeUnlocked, createDropBag, dropStars, towerBlocks, editBridge, hasBridgeRoad, normalizeEngineering, validateEngineering, loadEngineering, saveEngineering, ENGINEERING_STORAGE_PREFIX } from '../engineering-data.js';
import { createBridgeTrial, stepBridge, createBlockWorld, addBlock, canPlaceBlock, stepBlocks, blockStats, hasHouse, snapshotBlocks, restoreBlocks, disposeBlocks } from '../engineering-physics.js';
import { snapshotProgress, createProgressBackup, parseProgressBackup } from '../progress-data.js';

const advance=(world,frames=300)=>{for(let i=0;i<frames;i++)stepBlocks(world);};
const road=layout=>Array.from({length:layout.spans},(_,i)=>[`d${i}`,`d${i+1}`]);
function truss(layout) {
  const beams=road(layout);
  for(let i=1;i<layout.spans;i++)beams.push([`d${i}`,`t${i}`]);
  for(let i=1;i<layout.spans-1;i++)beams.push([`t${i}`,`t${i+1}`],[`t${i}`,`d${i+1}`]);
  beams.push(['d0','t1'],[`t${layout.spans-1}`,`d${layout.spans}`]);
  return beams;
}
// Cheapest working designs found by an exhaustive search; they set the three-star limits.
const lean={
  0:[['d0','d1'],['d1','d2'],['d2','d3'],['d1','t1'],['d2','t2'],['d0','t1'],['t1','t2'],['t2','d3']],
  1:[['d0','d1'],['d1','d2'],['d2','d3'],['d3','d4'],['d1','t1'],['d3','t3'],['d0','t1'],['t1','t2'],['d1','t2'],['t2','t3'],['d2','t3'],['t3','d4']],
  2:truss(bridgeLayout(2)),
  3:[['d0','d1'],['d1','d2'],['d2','d3'],['d3','d4'],['d1','t1'],['d2','t2'],['d0','t1'],['t1','t2'],['d1','t2'],['t2','d3']],
  4:[['d0','d1'],['d1','d2'],['d2','d3'],['d3','d4'],['d4','d5'],['d1','t1'],['d4','t4'],['d0','t1'],['t1','t2'],['d1','t2'],['t2','t3'],['d2','t3'],['t2','d3'],['t3','t4'],['t3','d4'],['t4','d5']],
};
function trialResult(layout,beams) {
  const trial=createBridgeTrial(layout,beams);
  for(let i=0;i<900&&!trial.result;i++)stepBridge(trial);
  return trial;
}
function memoryStorage() {
  const data=new Map();
  return { data, getItem:key=>data.has(key)?data.get(key):null, setItem:(key,value)=>data.set(key,String(value)) };
}

test('airborne blocks do not count; tower height is measured in whole cubes',()=>{
  const w=createBlockWorld('build');
  addBlock(w,'pillar',320,100);addBlock(w,'pillar',416,100);
  assert.equal(blockStats(w).count,0);
  assert.equal(blockStats(w).top,500,'airborne pieces do not move the tower top');
  advance(w);assert.equal(blockStats(w).count,2);assert.equal(blockStats(w).height,1,'a 96 px pillar is one and a half cubes: one whole cube');
  addBlock(w,'plank',368,100);advance(w);
  assert.equal(blockStats(w).count,3);
  assert.equal(blockStats(w).height,2);
  disposeBlocks(w);
  assert.equal(towerBlocks(500),0);assert.equal(towerBlocks(500-3*64+4),3,'resting contacts sink a few pixels');assert.equal(towerBlocks(500-3*64+10),2);
});
test('overhanging blocks tip and fall; submerged pieces are removed from the world and score',()=>{
  const w=createBlockWorld();addBlock(w,'block',570,150);advance(w,500);
  assert.equal(w.lost,1);assert.equal(w.blocks.length,0);assert.equal(blockStats(w).count,0);disposeBlocks(w);
});
test('the drop island narrows on later levels and survives undo snapshots',()=>{
  const narrow=createBlockWorld('drop',{island:DROP_LEVELS[3].island});
  assert.equal(Math.round(narrow.platform.bounds.max.x-narrow.platform.bounds.min.x),220);
  addBlock(narrow,'block',400,100);advance(narrow);
  const restored=restoreBlocks('drop',snapshotBlocks(narrow));
  assert.equal(Math.round(restored.platform.bounds.max.x-restored.platform.bounds.min.x),220);
  disposeBlocks(narrow);disposeBlocks(restored);
  assert.ok(DROP_LEVELS.every((info,i)=>i===0||info.goal>DROP_LEVELS[i-1].goal&&info.island<=DROP_LEVELS[i-1].island));
});
test('stacking raises the tower while undo restores the physical world',()=>{
  let w=createBlockWorld();addBlock(w,'block',400,100);advance(w);
  const saved=snapshotBlocks(w), settledTop=blockStats(w).top;
  addBlock(w,'plank',400,100);
  assert.equal(blockStats(w).top,settledTop,'a newly dropped piece does not raise the tower top');advance(w);assert.equal(blockStats(w).count,2);
  addBlock(w,'block',100,100);advance(w);assert.equal(w.lost,1);
  disposeBlocks(w);w=restoreBlocks('drop',saved);advance(w,80);
  assert.equal(w.lost,0);assert.equal(blockStats(w).count,1);assert.equal(w.blocks.length,1);disposeBlocks(w);
});
test('a stacked tower reaches the first flag; a vertical beam adds two cubes of height',()=>{
  const w=createBlockWorld('drop',{island:DROP_LEVELS[0].island});
  for(let i=0;i<3;i++){addBlock(w,'block',400,100-i*64);advance(w);}
  assert.ok(blockStats(w).height>=DROP_LEVELS[0].goal);
  addBlock(w,'plank',400,-200,Math.PI/2);advance(w);
  assert.equal(blockStats(w).height,5);assert.equal(w.lost,0);disposeBlocks(w);
});
test('drop bags are shuffled per level, open on a stackable piece and add shapes only from level two',()=>{
  let seed=1;const random=()=>(seed=(seed*16807)%2147483647)/2147483647;
  const orders=new Set();
  for(let run=0;run<40;run++){
    const first=createDropBag(0,random);
    assert.deepEqual([...first].sort(),[...DROP_LEVELS[0].bag].sort());
    assert.ok(!first.includes('roof')&&!first.includes('ball'),'no triangle or cylinder on the first level');
    const later=createDropBag(1,random);
    assert.ok(later.includes('roof')&&later.includes('ball'));
    assert.ok(['block','plank'].includes(later[0]),'a bag never opens on a triangle or cylinder');
    orders.add(later.join(','));
  }
  assert.ok(orders.size>20,'the order is not a fixed cycle');
  assert.deepEqual([0,1,2,3].map(dropStars),[3,2,1,1]);
});
test('manual placement rejects overlap, the ground and outside the board',()=>{
  const w=createBlockWorld('build');addBlock(w,'block',400,100);advance(w);
  assert.equal(canPlaceBlock(w,'block',400,468),false);
  assert.equal(canPlaceBlock(w,'block',10,200),false);
  assert.equal(canPlaceBlock(w,'block',400,510),false);
  assert.equal(canPlaceBlock(w,'plank',400,350,Math.PI/2),true);disposeBlocks(w);
});
test('Maci háza needs a roof resting on two walls, directly or over a beam',()=>{
  let w=createBlockWorld('build');
  addBlock(w,'pillar',368,440);addBlock(w,'pillar',432,440);advance(w);
  assert.equal(hasHouse(w),false,'walls alone are not a house');
  addBlock(w,'roof',400,330);advance(w);
  assert.equal(hasHouse(w),true);disposeBlocks(w);
  w=createBlockWorld('build');
  addBlock(w,'pillar',340,440);addBlock(w,'pillar',460,440);advance(w);
  addBlock(w,'plank',400,370);advance(w);assert.equal(hasHouse(w),false);
  addBlock(w,'roof',400,320);advance(w);assert.equal(hasHouse(w),true);disposeBlocks(w);
  w=createBlockWorld('build');addBlock(w,'roof',400,460);addBlock(w,'pillar',200,440);advance(w);
  assert.equal(hasHouse(w),false,'a roof on the ground is not a house');disposeBlocks(w);
  assert.deepEqual(BUILD_CHALLENGES.map(c=>c.id),['house','tree','castle']);
});
test('bridge editing enforces adjacency and budget, and removal refunds material',()=>{
  const l=bridgeLayout(0);let beams=[];
  assert.match(editBridge(l,beams,'d0','d3').error,/Szomszédos/);
  for(const pair of truss(l))beams=editBridge(l,beams,...pair).beams;
  assert.equal(bridgeSpent(l,beams),21);assert.equal(hasBridgeRoad(l,beams),true);
  beams=editBridge(l,beams,'d0','t0').beams;
  assert.match(editBridge(l,beams,'t0','t1').error,/anyagkeret/);
  const removed=editBridge(l,beams,'t0','d0').beams;assert.equal(bridgeSpent(l,removed),21);
  assert.equal(hasBridgeRoad(l,editBridge(l,removed,'d1','d2').beams),false);
});
test('each mission has a working design within budget; unbraced roads fail under load',()=>{
  for(let level=0;level<BRIDGE_LEVELS.length;level++){
    const l=bridgeLayout(level),beams=level===3?lean[3]:truss(l),before=structuredClone(beams);
    assert.ok(bridgeSpent(l,beams)<=l.budget,`budget ${level}`);
    const unsupported=trialResult(l,road(l)),supported=trialResult(l,beams);
    assert.equal(unsupported.result,'failed',`unbraced ${level}`);
    assert.equal(supported.result,'success',`braced ${level}`);
    assert.deepEqual(supported.broken,[],`no bar breaks in the braced bridge ${level}`);
    assert.deepEqual(beams,before,'testing never mutates the editable plan');
  }
});
test('star limits come from working lean designs; more material earns fewer stars',()=>{
  for(const [level,beams] of Object.entries(lean)){
    const l=bridgeLayout(Number(level));
    assert.equal(bridgeSpent(l,beams),l.stars[0],`lean design sets the three-star limit ${level}`);
    assert.equal(trialResult(l,beams).result,'success',`lean design ${level} carries the load`);
    assert.equal(bridgeStars(l,beams),3);
    assert.ok(l.stars[0]<=l.stars[1]&&l.stars[1]<=l.budget);
  }
  const l=bridgeLayout(0);
  assert.equal(bridgeStars(l,truss(l)),2);
  assert.equal(bridgeStars(l,[...truss(l),['d0','t0']]),1);
});
test('the heavy load breaks a light, wobbly design that the wide river accepts',()=>{
  const light=trialResult(bridgeLayout(1),lean[1]);
  assert.equal(light.result,'success');
  const heavy=trialResult(bridgeLayout(2),lean[1]);
  assert.equal(heavy.result,'failed');
  assert.ok(heavy.broken.length>0,'a bar snaps under the heavy truck');
});
test('the stone pier is a fixed support only on its own level',()=>{
  const pier=bridgeLayout(3);
  assert.equal(pier.nodes.find(n=>n.id==='d2').fixed,true);
  assert.equal(pier.nodes.find(n=>n.id==='d2').pier,true);
  assert.equal(bridgeLayout(2).nodes.find(n=>n.id==='d2').fixed,false);
  assert.ok(bridgeSpent(pier,truss(pier))>pier.budget,'the full truss is too costly: the pier has to be used');
  assert.equal(bridgeLayout(4).spans,5);
});
test('heavier load increases deflection and incomplete roads cannot start',()=>{
  const l=bridgeLayout(1),beams=truss(l);
  const light=trialResult(l,beams),heavy=trialResult({...l,load:l.load*2},beams);
  assert.ok(heavy.maxSag>light.maxSag);
  assert.equal(hasBridgeRoad(l,beams.filter(p=>p.join(':')!=='d1:d2')),false);
  assert.throws(()=>createBridgeTrial(l,[]),/folytonos/,'an empty drawing cannot score as a bridge');
  assert.throws(()=>createBridgeTrial(l,beams.filter(p=>p.join(':')!=='d1:d2')),/folytonos/);
  assert.throws(()=>createBridgeTrial(l,[...beams,['d0','d1']]),/szabályos/,'duplicate beams cannot enter a trial');
  const tooCostly=bridgeLayout(2);
  assert.throws(()=>createBridgeTrial(tooCostly,[...truss(tooCostly),['d0','t0']]),/keretbe/);
});
test('levels unlock in order; corrupt or oversized saves cannot enter storage',()=>{
  assert.deepEqual(normalizeEngineering(null),normalizeEngineering());
  assert.equal(normalizeEngineering().dropLevel,0);
  assert.equal(normalizeEngineering({dropStars:[2,1]}).dropLevel,2);
  assert.equal(normalizeEngineering({dropStars:[0,3]}).dropLevel,0,'a skipped level does not open the next one');
  assert.equal(normalizeEngineering({dropStars:[3,3,3,3]}).dropLevel,DROP_LEVELS.length-1);
  const clean=normalizeEngineering({dropBest:Infinity,buildBest:-3,buildStars:{house:2,tree:9},bridges:[{beams:[['d0','d3'],['d0','d1'],['d1','d0'],null],completed:true,stars:7},{completed:'yes',stars:3}]});
  assert.equal(clean.dropBest,0);assert.equal(clean.buildBest,0);assert.deepEqual(clean.bridges[0].beams,[['d0','d1']]);
  assert.deepEqual(clean.buildStars,{house:2,tree:0,castle:0});
  assert.equal(clean.bridges[0].stars,1,'a completed bridge keeps at least one star');
  assert.equal(clean.bridges[1].stars,0,'stars without completion are dropped');
  assert.equal(bridgeUnlocked(clean,1),true);assert.equal(bridgeUnlocked(clean,2),false);
  assert.doesNotThrow(()=>validateEngineering(clean));assert.doesNotThrow(()=>validateEngineering(undefined));
  assert.throws(()=>validateEngineering({dropBest:-1}));
  const bad=structuredClone(clean);bad.bridges[0].beams.push(['d1','d0']);assert.throws(()=>validateEngineering(bad));
});
test('progress persists per profile in its own key, outside progress backups',()=>{
  const storage=memoryStorage();
  const progress=normalizeEngineering({dropStars:[3],bridges:[{beams:truss(bridgeLayout(0)),completed:true,stars:2}]});
  assert.equal(saveEngineering(storage,'anna',progress),true);
  assert.deepEqual(loadEngineering(storage,'anna'),progress);
  assert.deepEqual(loadEngineering(storage,'bence'),normalizeEngineering(),'another profile starts fresh');
  storage.setItem(`${ENGINEERING_STORAGE_PREFIX}broken`,'{nope');
  assert.deepEqual(loadEngineering(storage,'broken'),normalizeEngineering());
  assert.equal(saveEngineering({setItem(){throw Error('full');}},'anna',progress),false);
  const original={...snapshotProgress(),engineering:progress};
  assert.equal(parseProgressBackup(JSON.stringify(createProgressBackup(original))).progress.engineering,undefined);
});
