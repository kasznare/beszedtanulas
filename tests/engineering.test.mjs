import test from 'node:test';
import assert from 'node:assert/strict';
import { bridgeLayout, bridgeSpent, editBridge, hasBridgeRoad, normalizeEngineering, validateEngineering } from '../engineering-data.js';
import { createBridgeTrial, stepBridge, createBlockWorld, addBlock, canPlaceBlock, stepBlocks, blockStats, snapshotBlocks, restoreBlocks, disposeBlocks } from '../engineering-physics.js';
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
function trialResult(layout,beams) {
  const trial=createBridgeTrial(layout,beams);
  for(let i=0;i<900&&!trial.result;i++)stepBridge(trial);
  return trial;
}
test('airborne blocks do not score; supported, settled volume excludes empty space',()=>{
  const w=createBlockWorld('build');
  addBlock(w,'pillar',320,100);addBlock(w,'pillar',416,100);
  assert.equal(blockStats(w).volume,0);
  assert.equal(blockStats(w).top,500,'airborne pieces do not move the tower top');
  advance(w);assert.equal(blockStats(w).volume,6);
  addBlock(w,'plank',368,100);advance(w);
  assert.equal(blockStats(w).volume,10);assert.equal(blockStats(w).count,3);
  assert.equal(blockStats(w).height,4);
  disposeBlocks(w);
});
test('overhanging blocks tip and fall; submerged pieces are removed from the world and score',()=>{
  const w=createBlockWorld();addBlock(w,'block',570,150);advance(w,500);
  assert.equal(w.lost,1);assert.equal(w.blocks.length,0);assert.equal(blockStats(w).volume,0);disposeBlocks(w);
});
test('stacking increases volume while undo restores the physical world and splash count',()=>{
  let w=createBlockWorld();addBlock(w,'block',400,100);advance(w);
  const saved=snapshotBlocks(w), settledTop=blockStats(w).top;
  addBlock(w,'plank',400,100);
  assert.equal(blockStats(w).top,settledTop,'a newly dropped piece does not raise the tower top');advance(w);assert.equal(blockStats(w).volume,8);
  addBlock(w,'block',100,100);advance(w);assert.equal(w.lost,1);
  disposeBlocks(w);w=restoreBlocks('drop',saved);advance(w,80);
  assert.equal(w.lost,0);assert.equal(blockStats(w).volume,4);assert.equal(w.blocks.length,1);disposeBlocks(w);
});
test('manual placement rejects overlap, the ground and outside the board',()=>{
  const w=createBlockWorld('build');addBlock(w,'block',400,100);advance(w);
  assert.equal(canPlaceBlock(w,'block',400,468),false);
  assert.equal(canPlaceBlock(w,'block',10,200),false);
  assert.equal(canPlaceBlock(w,'block',400,510),false);
  assert.equal(canPlaceBlock(w,'plank',400,350,Math.PI/2),true);disposeBlocks(w);
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
test('each mission has an affordable working truss; unbraced roads deform and fail under load',()=>{
  for(let level=0;level<3;level++){
    const l=bridgeLayout(level),beams=truss(l),before=structuredClone(beams);
    assert.ok(bridgeSpent(l,beams)<=l.budget);
    const unsupported=trialResult(l,road(l)),supported=trialResult(l,beams);
    assert.equal(unsupported.result,'failed',`unbraced ${level}`);
    assert.equal(supported.result,'success',`braced ${level}`);
    assert.ok(supported.maxSag<unsupported.maxSag/5);
    assert.deepEqual(beams,before,'testing never mutates the editable plan');
  }
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
test('old saves migrate; corrupt or oversized bridge plans cannot enter storage',()=>{
  assert.deepEqual(normalizeEngineering(null),normalizeEngineering());
  const clean=normalizeEngineering({dropBest:Infinity,buildBest:-3,bridges:[{beams:[['d0','d3'],['d0','d1'],['d1','d0'],null],completed:true}]});
  assert.equal(clean.dropBest,0);assert.equal(clean.buildBest,0);assert.deepEqual(clean.bridges[0].beams,[['d0','d1']]);
  assert.doesNotThrow(()=>validateEngineering(clean));assert.doesNotThrow(()=>validateEngineering(undefined));
  assert.throws(()=>validateEngineering({dropBest:-1}));
  const bad=structuredClone(clean);bad.bridges[0].beams.push(['d1','d0']);assert.throws(()=>validateEngineering(bad));
});
test('session-only engineering state is excluded from persistent progress backups',()=>{
  const engineering=normalizeEngineering({dropBest:14,buildBest:21,bridges:[{beams:truss(bridgeLayout(0)),completed:true}]});
  const original={...snapshotProgress(),engineering};
  assert.equal(parseProgressBackup(JSON.stringify(createProgressBackup(original))).progress.engineering,undefined);
});
