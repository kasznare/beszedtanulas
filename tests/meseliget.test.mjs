import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeMeadow, recordMeadowTask, countFeedback } from '../meseliget-data.js';
import { snapshotProgress, createProgressBackup, parseProgressBackup, replaceProgress } from '../progress-data.js';
import { switchProgressProfile } from '../progress-profiles.js';

test('story checkpoints advance through clothing, collection and serving and finish once', () => {
 let value=normalizeMeadow({adventure:{step:0,target:3}});
 for(const kind of ['dress','collect','serve']){
  const result=recordMeadowTask(value,kind,kind==='collect');value=result.progress;
  assert.equal(result.finished,kind==='serve');
 }
 assert.equal(value.journeys,1);assert.equal(value.adventure,null);
 assert.deepEqual(value.collect,{independent:0,assisted:1});
 assert.deepEqual(value.serve,{independent:1,assisted:0});
 const repeat=recordMeadowTask(value,'serve',false);
 assert.equal(repeat.finished,false);assert.equal(repeat.progress.journeys,1);
});
test('old backups load, new backups preserve story, album and assistance and reject corrupt data', () => {
 const old=snapshotProgress();delete old.meadow;
 const backup=createProgressBackup(old);assert.equal(parseProgressBackup(JSON.stringify(backup)).progress.meadow.journeys,0);
 const state=snapshotProgress({meadow:{journeys:4,collect:{independent:9,assisted:2},adventure:{step:2,target:5}}});
 assert.deepEqual(parseProgressBackup(JSON.stringify(createProgressBackup(state))).progress,state);
 for(const change of [m=>m.journeys=-1,m=>m.collect.assisted=.5,m=>m.adventure.target=11,m=>m.adventure.step=7]){
  const invalid=createProgressBackup(state);change(invalid.progress.meadow);
  assert.throws(()=>parseProgressBackup(JSON.stringify(invalid)),/Meseliget/);
 }
});
test('meadow data stays with the active profile and is included in reset/undo',()=>{
 const kid={url:'',activeRole:'kid',profileCode:'local'},admin={...kid,activeRole:'admin'};
 let state={...snapshotProgress({meadow:{journeys:2,adventure:{step:1,target:3}}}),supabase:kid};
 state=switchProgressProfile(state,kid);
 const other=switchProgressProfile(state,admin);assert.equal(other.meadow.journeys,0);
 state=switchProgressProfile(other,kid);assert.equal(state.meadow.journeys,2);assert.equal(state.meadow.adventure.step,1);
 const reset=replaceProgress(state,snapshotProgress(),'reset');assert.equal(reset.meadow.journeys,0);
 const undo=replaceProgress(reset,reset.undoProgress.progress,'undo');assert.deepEqual(undo.meadow,state.meadow);
});
test('quantity feedback distinguishes too few, too many and exactly enough throughout range',()=>{
 for(let n=1;n<=10;n++){
  assert.equal(countFeedback(n,n),'correct');assert.equal(countFeedback(n-1,n),'more');assert.equal(countFeedback(n+1,n),'less');
 }
});

import { validateMeadow, meadowGuests, meadowInitialCount, createMeadowTask, changeMeadowSelection, meadowTaskComplete, meadowServingRequest, MESE_CLIPS } from '../meseliget-data.js';
test('apple completion models use az before egy and öt throughout the supported count range', () => {
 const quantities=['az egy','a két','a három','a négy','az öt','a hat','a hét','a nyolc','a kilenc','a tíz'];
 quantities.forEach((quantity,index)=>assert.equal(MESE_CLIPS[`mese_collected_${index+1}`],`Megvan ${quantity} alma! Köszönöm!`));
});
test('v1 checkpoints migrate without inventing pictures for old picnic totals', () => {
 const old={version:1,journeys:4,collect:{independent:3,assisted:2},serve:{independent:5,assisted:0},adventure:{step:1,target:5}};
 const migrated=validateMeadow(old);
 assert.equal(migrated.version,2);assert.equal(migrated.journeys,4);assert.deepEqual(migrated.memories,[]);
 assert.equal(migrated.adventure.guests.length,5);assert.equal(migrated.adventure.task,null);
 assert.deepEqual(validateMeadow(JSON.parse(JSON.stringify(migrated))),migrated);
});
test('partial basket and full table retain guests, order, assistance and undo through backups', () => {
 const guestIds=meadowGuests(3,()=>.2),options={collectMode:'sort',serveMode:'full',showCount:false};
 let task=createMeadowTask('serve',3,guestIds,options,()=>.6);
 const first=meadowServingRequest(task,guestIds,options);
 task=changeMeadowSelection(task,'plates',first.guest);task.helped=true;
 assert.deepEqual(meadowServingRequest(task,guestIds,options),{guest:first.guest,item:'cup'});
 const state=snapshotProgress({meadow:{adventure:{step:2,target:3,guests:guestIds,options,task},practice:{target:5,varied:false,...options}}});
 const restored=parseProgressBackup(JSON.stringify(createProgressBackup(state))).progress;
 assert.deepEqual(restored.meadow,state.meadow);
 assert.deepEqual(restored.meadow.adventure.task.moves[0],{selected:[],plates:[],cups:[]});
 assert.equal(restored.meadow.practice.showCount,false);
 const source=JSON.stringify(task);const changed=changeMeadowSelection(task,'cups',first.guest);
 assert.equal(JSON.stringify(task),source);assert.ok(changed.cups.includes(first.guest));
});
test('addition and removal start nonempty and require exactly one apple change', () => {
 for(const collectMode of ['add','remove'])for(let target=collectMode==='add'?2:1;target<=10;target++){
  const guestIds=meadowGuests(target,()=>.3),options={collectMode,serveMode:'all',showCount:true};
  const task=createMeadowTask('collect',target,guestIds,options);
  assert.ok(task.selected.length>0);assert.equal(Math.abs(task.selected.length-target),1);
  assert.equal(task.selected.length,meadowInitialCount(target,options));assert.equal(meadowTaskComplete(task,target,guestIds,options),false);
  const next=changeMeadowSelection(task,'selected',collectMode==='add'?task.selected.length:task.selected.at(-1));
  assert.equal(meadowTaskComplete(next,target,guestIds,options),true);assert.ok(MESE_CLIPS[`mese_${collectMode}_${target}`]);
 }
});
test('full table completion requires both pieces for each actual guest',()=>{
 const guestIds=['cica','nyuszi'],options={serveMode:'full'};
 let task=createMeadowTask('serve',2,guestIds,options,()=>.3);
 for(const id of guestIds)task=changeMeadowSelection(task,'plates',id);
 assert.equal(meadowTaskComplete(task,2,guestIds,options),false);
 for(const id of guestIds)task=changeMeadowSelection(task,'cups',id);
 assert.equal(meadowTaskComplete(task,2,guestIds,options),true);assert.equal(meadowServingRequest(task,guestIds,options),null);
 task=changeMeadowSelection(task,'plates','nyuszi');assert.equal(meadowTaskComplete(task,2,guestIds,options),false);
});
test('saved memories describe the actual completed journey and free play cannot rewrite it', () => {
 const guestIds=['roka','beka'];
 let state=normalizeMeadow({journeys:4,adventure:{step:2,target:2,guests:guestIds,options:{serveMode:'full'}}});
 const result=recordMeadowTask(state,'serve',false,{story:true,date:'2026-10-13T12:00:00.000Z'});
 assert.equal(result.finished,true);assert.equal(result.progress.journeys,5);
 assert.deepEqual(result.progress.memories,[{id:'piknik-5',date:'2026-10-13T12:00:00.000Z',target:2,guests:guestIds,serveMode:'full'}]);
 const free=recordMeadowTask(result.progress,'collect',false,{story:false});
 assert.deepEqual(free.progress.memories,result.progress.memories);assert.equal(free.progress.journeys,5);
 state=normalizeMeadow({adventure:{step:1,target:2,guests:guestIds}});
 assert.deepEqual(recordMeadowTask(state,'collect',false,{story:false}).progress.adventure,state.adventure);
});
test('v2 rejects corrupted saved pictures, partial state and mode options',()=>{
 const options={collectMode:'count',serveMode:'full',showCount:false},guests=['cica','nyuszi'];
 const baseline=normalizeMeadow({journeys:1,memories:[{id:'piknik-1',date:'2026-10-13T12:00:00.000Z',target:2,guests,serveMode:'full'}],free:{kind:'serve',target:2,round:0,length:3,guests,options,task:createMeadowTask('serve',2,guests,options)}});
 const changes=[m=>m.memories[0].guests=['cica','cica'],m=>m.memories[0].date='bad',m=>m.free.task.plates=['unknown'],m=>m.free.task.requestOrder=['cica','cica'],m=>m.free.task.solved=true,m=>m.practice.collectMode='bad',m=>m.free.round=5];
 for(const change of changes){const broken=structuredClone(baseline);change(broken);assert.throws(()=>validateMeadow(broken),/Meseliget/);}
 const reordered=Object.fromEntries(Object.entries(baseline).reverse());assert.deepEqual(validateMeadow(reordered),baseline);
});

import { meadowShowsCount, meadowLegacyPears, meadowPearSpots, meadowAppleTotal, meadowDressSteps, meadowOutfit, nextAdventurePractice, normalizeMeadowOptions } from '../meseliget-data.js';
import { DRESS_OUTFITS } from '../dress-data.js';
import { VOICE_CLIPS } from '../voice-library.js';
const seededMeadow = (seed = 1) => () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };

test('the running basket count is hidden from four apples on unless a parent asks for it', () => {
 const auto = normalizeMeadowOptions({});
 assert.equal(auto.showCount, true);
 assert.equal(meadowShowsCount(auto, 3), true);
 assert.equal(meadowShowsCount(auto, 4), false);
 assert.equal(meadowShowsCount(normalizeMeadowOptions({ showCount: 'always' }), 9), true);
 assert.equal(meadowShowsCount(normalizeMeadowOptions({ showCount: false }), 2), false);
 assert.equal(normalizeMeadowOptions({ showCount: 'bogus' }).showCount, true);
});

test('pears move to new places in every sorting task, and old saved tasks keep their pattern', () => {
 const random = seededMeadow(4), seen = new Set();
 for (let run = 0; run < 20; run++) {
  const spots = meadowPearSpots(5, random);
  assert.equal(spots.length, meadowLegacyPears(5).length);
  assert.ok(spots.every(spot => spot >= 0 && spot < meadowAppleTotal(5)));
  seen.add(spots.join());
 }
 assert.ok(seen.size > 5);
 const guestIds = ['cica', 'nyuszi', 'roka'], options = { collectMode: 'sort', serveMode: 'all', showCount: true };
 const task = createMeadowTask('collect', 3, guestIds, options, seededMeadow(2));
 assert.ok(Array.isArray(task.pears));
 const saved = normalizeMeadow({ free: { kind: 'collect', target: 3, round: 0, length: 3, guests: guestIds, options, task } });
 assert.deepEqual(saved.free.task.pears, task.pears);
 const legacy = { ...task }; delete legacy.pears;
 assert.equal('pears' in normalizeMeadow({ free: { kind: 'collect', target: 3, round: 0, length: 3, guests: guestIds, options, task: legacy } }).free.task, false);
});

test('Maciház dresses a weather outfit in body order with recorded requests', () => {
 assert.deepEqual(meadowDressSteps('rain'), ['esokabat', 'gumicsizma']);
 assert.deepEqual(meadowDressSteps('summer'), ['rovidnadrag', 'napkalap', 'szandal']);
 assert.deepEqual(meadowDressSteps('classic'), ['sal', 'sapka', 'cipo']);
 assert.deepEqual(meadowDressSteps(undefined), ['sapka', 'cipo'], 'older saved tasks keep the hat-and-shoes flow');
 for (const weather of ['classic', 'rain', 'summer']) {
  assert.deepEqual(new Set(['polo', ...meadowDressSteps(weather)]), new Set(DRESS_OUTFITS[weather].items));
  assert.deepEqual(meadowOutfit(weather), DRESS_OUTFITS[weather].items);
  for (const id of meadowDressSteps(weather)) assert.ok(VOICE_CLIPS['dress_request_' + id], id);
  assert.ok(VOICE_CLIPS['dress_weather_' + weather]);
  const task = createMeadowTask('dress', 3, ['cica'], {}, Math.random, { weather });
  assert.equal(task.weather, weather);
  assert.equal(meadowTaskComplete({ ...task, dressed: meadowDressSteps(weather).length - 1 }, 3, ['cica']), false);
  assert.equal(meadowTaskComplete({ ...task, dressed: meadowDressSteps(weather).length }, 3, ['cica']), true);
  const saved = normalizeMeadow({ adventure: { step: 0, target: 3, weather, task: { ...task, dressed: 2 } } });
  assert.equal(saved.adventure.weather, weather);
  assert.equal(saved.adventure.task.dressed, 2);
 }
});

test('each finished picnic invites one more friend and makes serving harder', () => {
 const finished = { target: 3, options: { serveMode: 'all' } };
 let practiceValue = nextAdventurePractice({ target: 3, varied: true, collectMode: 'count', serveMode: 'all', showCount: true }, finished, 10);
 assert.equal(practiceValue.target, 4); assert.equal(practiceValue.serveMode, 'named'); assert.equal(practiceValue.varied, false);
 practiceValue = nextAdventurePractice(practiceValue, { target: 4, options: { serveMode: 'named' } }, 10);
 assert.equal(practiceValue.target, 5); assert.equal(practiceValue.serveMode, 'full');
 assert.equal(nextAdventurePractice(practiceValue, { target: 3, options: { serveMode: 'full' } }, 3).target, 3, 'never above the number limit');
 // The story memory keeps the outfit of that picnic.
 let value = normalizeMeadow({ adventure: { step: 2, target: 2, guests: ['cica', 'nyuszi'], weather: 'rain' } });
 value = recordMeadowTask(value, 'serve', false).progress;
 assert.equal(value.memories.at(-1).weather, 'rain');
});
