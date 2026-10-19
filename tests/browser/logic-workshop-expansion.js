// Run in a disposable browser page against the served project, without touching real profiles.
// import {runLogicWorkshopExpansionChecks} ...; await runLogicWorkshopExpansionChecks(page, url)
export async function runLogicWorkshopExpansionChecks(page, baseURL) {
  const checks=[],errors=[],ok=(value,message)=>{if(!value)throw new Error(message);checks.push(message);};
  page.on('pageerror',error=>errors.push(error.message));
  // A controller fixture must not retain the full app's play-time interval.
  const skipApp = route => route.fulfill({ contentType: 'text/javascript', body: '' });
  await page.route('**/app.js', skipApp);
  await page.goto(baseURL);
  await page.unroute('**/app.js', skipApp);
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.setViewportSize({width:375,height:812});
  await page.setContent(`<!doctype html><html lang="hu"><head><base href="${baseURL}/"><link rel="stylesheet" href="styles.css"><link rel="stylesheet" href="child-ui.css"><link rel="stylesheet" href="logic.css"><link rel="stylesheet" href="workshop.css"></head><body><main class="app"><section id="furfangliget" class="logic-panel"></section><section id="workshop" hidden></section></main></body></html>`);
  await page.evaluate(async url=>{
    const ld=await import(`${url}/logic-data.js`),wd=await import(`${url}/workshop-data.js`);
    const f=window.expansionFixture={ld,wd,logic:ld.normalizeLogic(),workshop:wd.normalizeWorkshop(),rewards:0,spoken:[],effects:[],options:{mathLimit:10,shopLevel:1,machineLevel:3,routeLevel:1,routeView:'map',workshopLevel:1}};
    for(const game of ld.LOGIC_GAMES)f.logic.sessions[game]=ld.newSession(game,f.options[`${game}Level`],10,42);
    for(const game of wd.WORKSHOP_GAMES)for(const level of [1,2,3])f.workshop.sessions[game][level-1]=wd.newWorkshopSession(game,level,42);
    const shared={effect:name=>f.effects.push(name),getOptions:()=>f.options,speak:ids=>f.spoken.push(ids),stopPlayback(){}};
    f.logicController=(await import(`${url}/logic-game.js`)).setupLogic({...shared,getProgress:()=>f.logic,updateProgress:(p,reward)=>{f.logic=p;if(reward)f.rewards++;},setLevel:(game,level)=>f.options[`${game}Level`]=level,setRouteView:view=>f.options.routeView=view});
    f.workshopController=(await import(`${url}/workshop-game.js`)).setupWorkshop({...shared,getProgress:()=>f.workshop,updateProgress:(p,reward)=>{f.workshop=p;if(reward)f.rewards++;},setLevel:level=>f.options.workshopLevel=level});
    f.logicController.start();
  },baseURL.replace(/\/$/,''));
  const state=()=>page.evaluate(()=>({logic:window.expansionFixture.logic,workshop:window.expansionFixture.workshop,rewards:window.expansionFixture.rewards}));
  const logicTask=kind=>page.evaluate(k=>{const f=window.expansionFixture,s=f.logic.sessions[k];return f.ld.generateTask(k,s.level,s.limit,s.seed);},kind);
  const fill=async(index,value)=>{await page.locator(`#logic-value-${index}`).fill(String(value));await page.locator(`#logic-value-${index}`).press('Tab');};
  const layout=async(root,label)=>{
    const result=await page.evaluate(selector=>({overflow:document.documentElement.scrollWidth>innerWidth,small:[...document.querySelectorAll(`${selector} button,${selector} input,${selector} select`)].filter(el=>{const r=el.getBoundingClientRect();return r.width>0&&r.height>0&&!el.closest('details:not([open])')&&(r.width<43.9||r.height<43.9);}).map(el=>el.id)}),root);
    ok(!result.overflow&&!result.small.length,`${label}: no overflow, touch controls at least 44px (${result.small})`);
  };
  await page.locator('[data-game="shop"]').click();
  const initial=(await state()).logic.sessions.shop.values[0];
  if(initial>0){await page.locator('[data-fruit="0"]').first().click();ok((await state()).logic.sessions.shop.values[0]===initial-1,'basket fruit removes one');await page.locator('#logic-add-fruit-0').click();}
  else {await page.locator('#logic-add-fruit-0').click();await page.locator('[data-fruit="0"]').first().click();}
  ok((await state()).logic.sessions.shop.values[0]===initial,'direct add and remove are reversible');
  ok(await page.evaluate(()=>expansionFixture.effects.includes('wood')),'direct fruit changes retain the wooden interaction sound');
  await fill(1,2);await fill(0,1);await fill(0,2);await page.locator('[data-fruit="1"]').first().click();
  ok((await state()).logic.sessions.shop.values[1]===1,'numeric edits do not multiply listeners on the other basket');
  const firstLevel=(await state()).logic.sessions.shop;
  await page.locator('#logic-level').selectOption('2');await fill(0,((await state()).logic.sessions.shop.values[0]+1)%11);
  const secondLevel=(await state()).logic.sessions.shop;
  await page.locator('#logic-level').selectOption('1');ok(JSON.stringify((await state()).logic.sessions.shop)===JSON.stringify(firstLevel),'first level resumes exact work');
  await page.locator('#logic-level').selectOption('2');ok(JSON.stringify((await state()).logic.sessions.shop)===JSON.stringify(secondLevel),'second level resumes exact work');
  let task=await logicTask('shop');for(let i=0;i<2;i++)await fill(i,task.orders[0][i]);
  await page.locator('#logic-check').click();await page.waitForFunction(()=>window.expansionFixture.logic.sessions.shop.stage===1);
  ok((await page.locator('.logic-order-change').innerText()).includes('→'),'changed order shows before and after');
  await layout('#furfangliget','shop');
  await page.locator('#logic-back').dispatchEvent('click');await page.locator('[data-game="machine"]').click();task=await logicTask('machine');
  for(let i=0;i<task.program.length;i++){await page.locator(`#logic-slot-${i}`).click();await page.locator(`#logic-op-${task.program[i]}`).click();}
  const answers=await page.evaluate(t=>t.questions.map(n=>window.expansionFixture.ld.applyRule(n,t.program)),task);
  await fill(0,answers[0]);await fill(1,(answers[1]+1)%(task.limit+1));await page.locator('#logic-check').click();
  ok((await page.locator('#logic-result-0').innerText()).includes('✓')&&(await page.locator('#logic-result-1').innerText()).includes('↻'),'each prediction has its own correctness feedback');
  await page.locator('#logic-help-result-1').click();ok(await page.locator('#logic-prediction-help-1').count()===1,'targeted help reveals one computation step');
  await page.locator('.logic-experiment summary').click();await page.locator('#logic-experiment-input').fill('4');await page.locator('#logic-experiment-run').click();
  ok(await page.locator('.logic-experiment-trace').count()===2,'experiment compares both operation orders');
  await layout('#furfangliget','machine');
  await page.locator('#logic-back').dispatchEvent('click');await page.locator('[data-game="route"]').click();task=await logicTask('route');
  const path=await page.evaluate(t=>window.expansionFixture.ld.routeSolution(t),task);
  for(const cell of path.slice(1))await page.locator(`#logic-cell-${cell}`).click();
  await page.locator('#logic-plan-1').click();await page.locator('#logic-replan-confirm').click();
  ok((await state()).logic.sessions.route.path.length===2,'replan keeps the selected prefix');
  await page.locator('#logic-undo').click();ok(JSON.stringify((await state()).logic.sessions.route.path)===JSON.stringify(path),'replanning can be undone in one move');
  await page.locator('#logic-route-view').selectOption('steps');ok(await page.locator('.logic-board').isVisible(),'map remains visible in deferred mode');
  await page.locator('#logic-route-speed').selectOption('1000');await page.locator('#logic-check').click();await page.locator('#logic-route-pause').click();
  const paused=await page.locator('.logic-traveller').getAttribute('data-position');
  await page.waitForTimeout(1100);ok(await page.locator('.logic-traveller').getAttribute('data-position')===paused,'paused fox stays put across a scheduled step');
  await page.locator('#logic-route-step').click();ok(await page.locator('.logic-traveller').getAttribute('data-position')===String(path[1]),'single step advances exactly one move');
  for(let i=2;i<path.length;i++)await page.locator('#logic-route-step').click();
  ok((await state()).logic.sessions.route.done,'single-step playback can complete a route');
  ok(await page.locator('#furfangliget[data-success-pending="true"]').count()===1&&await page.locator('#logic-next').count()===0,'route saves immediately while its completed map stays visible');
  ok(await page.evaluate(()=>expansionFixture.effects.includes('step')),'route playback retains step sounds');
  const reward=(await state()).rewards;await page.locator('#logic-back').dispatchEvent('click');await page.locator('[data-game="route"]').click();ok((await state()).rewards===reward,'reopening completed route never rewards twice');
  ok(await page.locator('#furfangliget .next-task-card').count()===1,'completed logic task offers the related activity');
  await layout('#furfangliget','route');
  await page.evaluate(()=>{const f=window.expansionFixture;f.logicController.stop();document.querySelector('#furfangliget').hidden=true;document.querySelector('#workshop').hidden=false;f.workshopController.start();});
  const workshopTask=()=>page.evaluate(()=>{const f=window.expansionFixture,kind=document.querySelector('#workshop').dataset.game,level=Number(document.querySelector('#workshop').dataset.level),s=f.workshop.sessions[kind][level-1],t=f.wd.workshopTaskForSession(s);return {...t,destinations:kind==='sort'?t.objects.map(o=>f.wd.workshopSortTarget(t,o)):[],solutions:kind==='balance'?f.wd.workshopBalanceSolutions(t):[]};});
  await page.locator('#ws-place-sort').click();ok(await page.locator('[data-bin]').count()>=2,'new sorting rule renders usable trays');
  const beforeSort=(await state()).rewards;task=await workshopTask();const objects=task.objects;
  for(let round=0;round<2;round++){
    task=await workshopTask();ok(JSON.stringify(task.objects)===JSON.stringify(objects),'sorting rounds retain the same objects');
    for(const [i,bin] of task.destinations.entries()){await page.locator(`#ws-token-${i}`).click();await page.locator(`#ws-bin-${bin}`).click();}
    await page.locator('#ws-check').click();
    ok((await state()).rewards===beforeSort+round,`sorting round ${round+1} rewards at the correct point`);
  }
  await layout('#workshop','sorting');
  await page.locator('#ws-back').dispatchEvent('click');await page.locator('#ws-place-pattern').click();task=await workshopTask();
  const fixedLabels=await page.locator('.ws-pattern-fixed').evaluateAll(elements=>elements.every(el=>el.getAttribute('role')==='img'&&/kör|négyzet|háromszög/.test(el.getAttribute('aria-label'))));ok(fixedLabels,'every fixed pattern example names its shape');
  await page.locator('#ws-pattern-listen').click();
  const spoken=await page.evaluate(()=>window.expansionFixture.spoken.at(-1));
  ok(spoken.length===task.sequence.length&&spoken.every((entry,i)=>entry.cue.target===`[data-pattern-index="${i}"]`),'actual pattern voice sequence carries a synchronized target for each position');
  ok(spoken.filter(entry=>entry.id==='workshop_pattern_gap').length===task.holes.length,'pattern narration does not disclose missing answers');
  await layout('#workshop','pattern');
  for(const [hole,index] of task.holes.entries()){await page.locator(`#ws-slot-${hole}`).click();await page.locator(`#ws-choice-${task.sequence[index]}`).click();}
  await page.locator('#ws-check').click();
  ok(await page.locator('#ws-pattern-listen').isDisabled()&&await page.locator('.ws-celebration').count()===0,'completed pattern keeps the viewing interval quiet');
  await page.locator('.ws-celebration').waitFor();
  await page.locator('#ws-back').dispatchEvent('click');await page.locator('#ws-place-balance').click();task=await workshopTask();
  const beforeBalance=(await state()).rewards;
  for(const rod of task.solutions[0])await page.locator(`#ws-add-${rod}`).click();await page.locator('#ws-check').click();
  ok((await state()).rewards===beforeBalance+1,'first balance solution rewards once');
  ok(await page.locator('#workshop[data-success-pending="true"]').count()===1&&await page.locator('#ws-another-solution').count()===0,'alternative balance control waits for the success interval');
  if(task.solutions.length>1){
    await page.locator('#ws-another-solution').click();
    for(const rod of task.solutions[0])await page.locator(`#ws-add-${rod}`).click();await page.locator('#ws-check').click();
    ok((await page.locator('#ws-status').innerText()).includes('már kiraktad'),'repeated composition is identified');
    while(await page.locator('[data-take]').count())await page.locator('[data-take]').first().click();
    for(const rod of task.solutions[1])await page.locator(`#ws-add-${rod}`).click();await page.locator('#ws-check').click();
    ok((await state()).rewards===beforeBalance+1&&(await state()).workshop.sessions.balance[0].found.length===2,'new balance composition is saved without duplicate reward');
    ok(await page.locator('.ws-celebration').count()===0,'alternative solution also preserves the completed scene before celebration');
    await page.locator('.ws-celebration').waitFor();
  }
  await page.locator('#ws-back').dispatchEvent('click');await page.locator('#ws-level-2').click();await page.locator('#ws-place-balance').click();
  ok(await page.locator('[data-criterion]').count()===3,'balance displays sum, piece count and distinctness separately');
  await layout('#workshop','balance');
  await page.setViewportSize({width:320,height:740});await layout('#workshop','balance small phone');
  await page.locator('#ws-back').dispatchEvent('click');await page.locator('#ws-place-pattern').click();await layout('#workshop','pattern small phone');
  await page.evaluate(()=>{
    const f=window.expansionFixture;f.options.workshopLevel=1;
    const seed=Array.from({length:100},(_,i)=>i).find(i=>f.wd.generateWorkshopTask('sort',1,i).ruleKeys[0]==='size');
    f.workshop.sessions.sort[0]=f.wd.newWorkshopSession('sort',1,seed);f.workshopController.start({kind:'sort'});
  });
  ok(await page.locator('.ws-size-swatch').count()===2&&await page.locator('.ws-token .ws-small').count()>0,'size sorting has visible size cues on tokens and trays');
  await layout('#workshop','size sorting small phone');
  await page.evaluate(()=>{
    const f=window.expansionFixture;f.options.workshopLevel=3;
    const seed=Array.from({length:100},(_,i)=>i).find(i=>f.wd.generateWorkshopTask('sort',3,i).filter.key==='shape');
    f.workshop.sessions.sort[2]=f.wd.newWorkshopSession('sort',3,seed);f.workshopController.start({kind:'sort'});
  });
  ok(await page.locator('.ws-color-size').count()===4&&await page.locator('.ws-heading').innerText().then(text=>text.includes('formájú')||text.includes('alakú')||text.includes('négyzet')||text.includes('kör')),'shape-filter sorting shows color and size trays with an accurate rule');
  await layout('#workshop','shape sorting small phone');
  const destinationCheck=await page.evaluate(()=>{
    const f=window.expansionFixture,unfinishedSort=JSON.stringify(f.workshop.sessions.sort[2]);
    f.workshopController.start({kind:'sort'});
    const workshopResumed=JSON.stringify(f.workshop.sessions.sort[2])===unfinishedSort;
    f.options.workshopLevel=1;const workshopWasDone=f.workshop.sessions.pattern[0].done;
    f.workshopController.start({kind:'pattern'});
    const workshopFresh=workshopWasDone&&!f.workshop.sessions.pattern[0].done;
    const unfinishedMachine=JSON.stringify(f.logic.sessions.machine);
    f.logicController.start({kind:'machine'});
    const logicResumed=JSON.stringify(f.logic.sessions.machine)===unfinishedMachine;
    const logicWasDone=f.logic.sessions.route.done;
    f.logicController.start({kind:'route'});
    const logicFresh=logicWasDone&&!f.logic.sessions.route.done;
    return {workshopResumed,workshopFresh,logicResumed,logicFresh};
  });
  ok(Object.values(destinationCheck).every(Boolean),'related destinations resume unfinished boards and replace completed boards with fresh tasks');
  ok(!errors.length,`no runtime errors: ${errors.join('; ')}`);
  return {count:checks.length,checks};
}
