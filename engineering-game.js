import { setGameTitle, focusGameTitle } from './game-heading.js';
import { BUILD_PIECES, BRIDGE_LEVELS, bridgeLayout, beamKey, bridgeSpent, editBridge, hasBridgeRoad, normalizeEngineering } from './engineering-data.js';
import { STEP_MS, createBlockWorld, addBlock, canPlaceBlock, stepBlocks, blockStats, snapshotBlocks, restoreBlocks, disposeBlocks, createBridgeTrial, stepBridge } from './engineering-physics.js';

const titles = { drop: 'Pottyanó torony', build: 'Szabad építés', bridge: 'Hídműhely' };
const instructions = {
  drop: 'Koppints, amikor jó helyen jár az elem!',
  build: 'Válassz egy elemet, majd koppints a helyére — vagy húzd oda!',
  bridge: 'Koppints két szomszédos pontra: közéjük kerül egy rúd.',
};
const decimal = value => value.toLocaleString('hu-HU', { maximumFractionDigits: 1 });
const svg = (content, box='0 0 800 600') => `<svg viewBox="${box}" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">${content}</svg>`;
const cloud = (x,y,s=1) => `<g transform="translate(${x} ${y}) scale(${s})" fill="#fff" opacity=".75"><path d="M0 17Q-5 0 14 1Q20-20 41-6Q57-9 61 9Q79 9 75 23H0Z"/></g>`;
function scene(bridge=false) {
  return `<rect width="800" height="600" fill="#eaf3ee"/><circle cx="670" cy="92" r="34" fill="#f3d580"/>${cloud(80,95,1.2)}${cloud(490,125,.8)}<path d="M0 410Q120 310 275 412T580 395T800 395V600H0Z" fill="#d5e4cb"/><path d="M0 470Q200 370 340 462T800 440V600H0Z" fill="#bed6ba"/><path d="M0 548Q160 534 310 549T800 547V600H0Z" fill="#80bec5"/><path d="M0 570Q160 554 310 571T800 570" fill="none" stroke="#c4e5df" stroke-width="3"/><path d="M65 585h45m520-24h60m-365 28h45" stroke="#c4e5df" stroke-width="3" stroke-linecap="round"/>${bridge ? '<path d="M0 360H160V600H0M640 360H800V600H640" fill="#cbb68e"/><path d="M0 359H160M640 359H800" stroke="#6a9b7c" stroke-width="16" stroke-linecap="round"/>' : ''}`;
}
function iconArt(kind) {
  const ground = '<ellipse cx="130" cy="153" rx="103" ry="12" fill="#ceddd0"/>';
  if (kind === 'bridge') return svg(`${ground}<path d="M30 134H230" stroke="#79b4bc" stroke-width="18"/><g fill="none" stroke="#bc8955" stroke-width="8" stroke-linejoin="round"><path d="M35 125 96 57 160 125 221 57M35 125H225M96 57H221M96 57V125M160 125V57M221 57V125"/></g><g fill="#f8edda" stroke="#987148" stroke-width="3">${[[35,125],[96,57],[96,125],[160,125],[160,57],[221,57],[221,125]].map(([x,y])=>`<circle cx="${x}" cy="${y}" r="6"/>`).join('')}</g>`, '0 0 260 180');
  const pieces = kind === 'drop' ? '<rect x="82" y="109" width="105" height="37" rx="5" fill="#68a695"/><rect x="96" y="64" width="54" height="43" rx="5" fill="#e2aa50"/><rect x="154" y="15" width="47" height="35" rx="5" fill="#dc8c76" transform="rotate(12 177 32)"/><path d="M176 55v26m-7-7 7 7 7-7" stroke="#91a89a" stroke-width="3" fill="none"/>' : '<rect x="60" y="83" width="35" height="63" rx="5" fill="#8b9ec7"/><rect x="168" y="83" width="35" height="63" rx="5" fill="#68a695"/><rect x="49" y="61" width="164" height="25" rx="5" fill="#e2aa50"/><path d="m95 57 37-39 37 39Z" fill="#dc8c76"/>';
  return svg(`${ground}${pieces}`, '0 0 260 180');
}

export function setupEngineering({ getProgress, setProgress, speak, stopPlayback }) {
  const root = document.querySelector('#engineering');
  let active=false, mode=null, world=null, raf=0, last=0, accumulator=0, paused=false;
  let selected='block', angle=0, ghost={x:400,y:220}, history=[], pending=null, sequence=0, elapsed=0, slow=true, lostSeen=0, ended=false;
  let level=0, layout=null, beams=[], selectedNode=null, trial=null, bridgeHistory=[], progress=normalizeEngineering();
  let drag=null, suppressClick=false, view={x:0,y:0,w:800,h:600};
  const $ = selector => root.querySelector(selector);
  const playable = () => active && mode && !paused && !document.hidden;
  const say = (id, force=false) => speak?.(id, force);
  function status(text) { const el=$('#en-status'); if(el && el.textContent!==text) el.textContent=text; }
  function save() { setProgress(normalizeEngineering(progress)); }
  function stopLoop() { cancelAnimationFrame(raf); raf=0; last=0; accumulator=0; }
  function startLoop() { stopLoop(); if(active && mode && !document.hidden) raf=requestAnimationFrame(frame); }
  function releaseDrag() {
    if(drag && root.hasPointerCapture?.(drag.id)) root.releasePointerCapture(drag.id);
    drag=null;
  }
  function cleanup() { stopLoop(); releaseDrag(); disposeBlocks(world); world=null; trial=null; }
  function hub() {
    setGameTitle(root, 'Építőliget');
    cleanup(); mode=null; paused=false; suppressClick=false; root.dataset.mode='hub';
    root.innerHTML=`<div class="en-game-cards">${['drop','build','bridge'].map(kind=>`<button class="en-game-card en-card-${kind}" data-en-mode="${kind}">${iconArt(kind)}<strong>${titles[kind]}</strong><span class="en-card-copy">${{drop:'Kapd el a jó pillanatot!',build:'Építs a saját ötleted szerint!',bridge:'Építs hidat az autónak!'}[kind]}</span></button>`).join('')}</div>`;
    focusGameTitle(root);
  }
  function enter(kind) {
    cleanup(); mode=kind; paused=false; suppressClick=false; ended=false; selected='block'; angle=0; sequence=0; elapsed=0; pending=null; history=[]; lostSeen=0; ghost={x:400,y:220};
    if(kind==='bridge') { layout=bridgeLayout(level); beams=progress.bridges[level].beams.map(p=>[...p]); bridgeHistory=[]; selectedNode=null; }
    else world=createBlockWorld(kind);
    renderGame(); startLoop(); say(`engineering_${kind}`);
  }
  function renderGame() {
    setGameTitle(root, titles[mode]);
    root.dataset.mode=mode;
    root.innerHTML=`<button id="en-back" hidden>Építőliget</button><p id="en-instruction" class="en-instruction">${instructions[mode]}</p>
      ${mode==='bridge'?`<div class="en-levels" role="group" aria-label="Hídépítési feladat">${BRIDGE_LEVELS.map((info,i)=>`<button data-en-level="${i}" aria-pressed="${i===level}">${i+1}. ${info.name}${progress.bridges[i].completed?' ✓':''}</button>`).join('')}</div>`:''}
      <div class="en-workspace"><div class="en-stage-wrap"><div id="en-stage" class="en-stage" ${mode==='bridge'?'':'tabindex="0" role="button"'} aria-label="${mode==='drop'?'Ejtés a szigetre. Enter vagy szóköz: ejtés.':mode==='build'?'Építőtér. Nyilak: elem mozgatása; Enter: lerakás; R: forgatás.':'Hídépítő tér'}" aria-describedby="en-instruction"><div class="en-landscape">${svg(scene(mode==='bridge'))}</div><svg id="en-world" viewBox="0 0 800 600" aria-hidden="true"></svg>${mode==='bridge'?'<div id="en-nodes" class="en-nodes"></div>':''}<div id="en-overlay" class="en-overlay" hidden></div></div></div>
      <aside class="en-tools"><button id="en-pause" class="en-soft" aria-pressed="${paused}">${paused?'▶ Folytatás':'Ⅱ Szünet'}</button>${mode==='bridge'?bridgeTools():blockTools()}<p id="en-status" class="en-status" role="status" aria-live="polite">${mode==='bridge'?'Kösd össze a két partot!':mode==='drop'?'Ejtésre kész.':'Építs szabadon!'}</p><div class="en-undo-row"><button id="en-undo" class="en-soft" disabled>↶ Vissza</button><button id="en-restart" class="en-soft">↻ Újrakezdem</button></div><details class="en-explain"><summary>${mode==='bridge'?'Mit érdemes kipróbálni?':'Mit mérünk?'}</summary><p>${mode==='bridge'?layout.lesson+' Egy meglévő rudat a két végpontjára koppintva vehetsz ki. A keret visszajár. A kitöltött pontok a két parthoz vannak rögzítve.':'A nyugalomba került, alátámasztott elemek össztérfogatát mérjük, egységkockákban. Minden elem egy egység mély; az üres helyek nem számítanak. A magasság külön látszik. A vízbe esett elemek nem számítanak bele.'}</p></details></aside></div>`;
    if(mode==='bridge') renderNodes();
    syncControls(); draw();
    focusGameTitle(root);
  }
  function blockTools() {
    return `<div class="en-score"><span>AZ ÉPÍTMÉNY TÉRFOGATA</span><strong id="en-volume">0 <small>egység³</small></strong><div><span id="en-count">0 elem</span><span id="en-height">0 magas</span></div></div><p class="en-record">Ebben a játékban: <b id="en-record">${decimal(progress[mode+'Best'])}</b></p>${mode==='drop'?`<div class="en-next"><span>KÖVETKEZŐ ELEM</span><strong id="en-piece-name">Kocka</strong><span id="en-lives">○ ○ ○ · 3 csobbanásig</span></div><button id="en-drop" class="en-primary">↓ Ejtés!</button><button id="en-speed" class="en-soft" aria-pressed="${slow}">${slow?'Lassú mozgás':'Gyorsabb mozgás'}</button>`:`<div class="en-palette" role="group" aria-label="Építőelemek">${BUILD_PIECES.map(p=>`<button data-en-piece="${p.id}" aria-pressed="${selected===p.id}" aria-label="${p.name}"><span style="--piece-color:${p.color}" aria-hidden="true">${p.mark}</span><small>${p.name}</small></button>`).join('')}</div><button id="en-rotate" class="en-soft">↻ Elforgatom</button><button id="en-place" class="en-primary">↓ Ide teszem</button><span class="en-key-hint">Nyilakkal is mozgathatod, Enterrel lerakhatod.</span>`}`;
  }
  function bridgeTools() {
    return `<div class="en-score"><span>MEGMARADT ANYAG</span><strong><span id="en-budget">${layout.budget-bridgeSpent(layout,beams)}</span> <small>/ ${layout.budget}</small></strong><div><span>Egyenes rúd: 2</span><span>Átlós rúd: 3</span></div></div><div class="en-load"><span>PRÓBATERHELÉS</span><strong>${layout.vehicle}</strong><span>${['Könnyű rakomány','Hosszabb átkelés','Kétszer akkora teher'][level]}</span></div><button id="en-test" class="en-primary">▶ Induljon az autó!</button><button id="en-edit" class="en-soft" hidden>✎ Tovább építem</button><p class="en-bridge-key"><i></i> Rúd <i></i> Meghajló rész</p>`;
  }
  function currentPiece() {
    const types=['block','plank','block','pillar','plank','roof','block','ball'];
    return BUILD_PIECES.find(p=>p.id===(mode==='drop'?types[sequence%types.length]:selected));
  }
  function highest() { return world ? blockStats(world).top : 500; }
  function dropPosition() {
    const p=currentPiece();
    return { x:400+Math.sin(elapsed*(slow?.65:1.05))*286, y:Math.min(90,highest()-140-p.height/2) };
  }
  function camera() {
    // Hold the framing throughout a drop; airborne pieces are not tower height.
    if(pending) return;
    const top=Math.min(0,highest()-256), h=600-top, w=h*4/3;
    view={x:400-w/2,y:top,w,h};
    $('#en-world')?.setAttribute('viewBox',`${view.x} ${view.y} ${w} ${h}`);
  }
  function pieceDrawing(piece,x,y,a=0,opacity=1,outline=false) {
    const shape=piece.id==='ball'?'<circle r="32"/>':piece.id==='roof'?'<path d="M-48 21.33H48L0-42.67Z"/>':`<rect x="${-piece.width/2}" y="${-piece.height/2}" width="${piece.width}" height="${piece.height}" rx="3"/>`;
    return `<g transform="translate(${x} ${y}) rotate(${a*180/Math.PI})" fill="${piece.color}" stroke="${outline?'#385f52':'#ffffffaa'}" stroke-width="${outline?3:2}" opacity="${opacity}">${shape}<path d="M-8-5h16M-8 2h16M-8 9h16" stroke="#365447" stroke-opacity=".25" stroke-width="2" stroke-linecap="round"/></g>`;
  }
  function draw() {
    if(!mode || !$('#en-world')) return;
    if(mode==='bridge') { drawBridge(); return; }
    camera();
    const left=mode==='drop'?250:90, width=mode==='drop'?300:620;
    let content=`<rect x="${left}" y="500" width="${width}" height="95" rx="14" fill="#bba17b"/><path d="M${left+7} 500h${width-14}" stroke="#6d9b78" stroke-width="13" stroke-linecap="round"/><path d="M${left+25} 532h28m45 23h34m50-25h20" stroke="#a28a69" stroke-width="4" stroke-linecap="round"/>`;
    for(const b of world.blocks) content+=pieceDrawing(BUILD_PIECES.find(p=>p.id===b.plugin.type),b.position.x,b.position.y,b.angle);
    for(const s of world.splashes) { const t=(world.ticks-s.at)/40;content+=`<ellipse cx="${s.x}" cy="558" rx="${10+t*40}" ry="${3+t*9}" fill="none" stroke="#fff" stroke-width="3" opacity="${1-t}"/>`; }
    if(!ended && !pending) {
      const p=currentPiece(), pos=mode==='drop'?dropPosition():ghost;
      const valid=mode==='drop'||canPlaceBlock(world,p.id,pos.x,pos.y,angle);
      content+=`<path d="M${pos.x} ${pos.y+50}V500" stroke="#4c7d6b" stroke-width="2" stroke-dasharray="5 9" opacity=".25"/>`;
      content+=pieceDrawing(p,pos.x,pos.y,angle,valid?.85:.3,true);
    }
    $('#en-world').innerHTML=content;
  }
  function drawBridge() {
    const points=trial?.nodes||layout.nodes, edges=trial?trial.bars.map(bar=>[bar.a.id,bar.b.id]):beams;
    let content='';
    if(!trial) content+=`<path d="M160 360H640" stroke="#789b91" stroke-width="3" stroke-dasharray="7 10" opacity=".5"/>`;
    for(const [a,b] of edges) {
      const p=points.find(n=>n.id===a),q=points.find(n=>n.id===b);
      const sag=Math.max(Math.abs(p.y-(layout.nodes.find(n=>n.id===a).y)),Math.abs(q.y-(layout.nodes.find(n=>n.id===b).y)));
      const color=sag>8?'#d9775c':'#aa8257';
      content+=`<path d="M${p.x} ${p.y}L${q.x} ${q.y}" stroke="${color}" stroke-width="${a[0]==='d'&&b[0]==='d'?12:8}" stroke-linecap="round"/><path d="M${p.x} ${p.y-2}L${q.x} ${q.y-2}" stroke="#fff4" stroke-width="2"/>`;
    }
    if(trial) for(const p of points.filter(n=>trial.used.has(n.id)||n.fixed))content+=`<circle cx="${p.x}" cy="${p.y}" r="8" fill="${p.fixed?'#426a58':'#fcf7ed'}" stroke="#7c7258" stroke-width="3"/>`;
    if(selectedNode && !trial) { const n=points.find(p=>p.id===selectedNode);content+=`<circle cx="${n.x}" cy="${n.y}" r="24" fill="none" stroke="#39795f" stroke-width="2" stroke-dasharray="4 5"/>`; }
    const cx=trial?.carX||100,cy=(trial?.carY||360)-9;
    content+=`<g transform="translate(${cx} ${cy})"><rect x="-35" y="-35" width="47" height="27" rx="5" fill="#dfb35c"/><path d="M12-28h17l13 14v8H12Z" fill="#5b9f90"/><path d="M17-24h10l9 10H17Z" fill="#e8f4ee"/>${level===2?'<rect x="-31" y="-52" width="16" height="17" rx="2" fill="#bb8660"/><rect x="-12" y="-52" width="17" height="17" rx="2" fill="#8c9fbe"/>':''}<g fill="#3d534a" stroke="#f6ebd7" stroke-width="3"><circle cx="-20" cy="-5" r="9"/><circle cx="26" cy="-5" r="9"/></g></g>`;
    $('#en-world').innerHTML=content;
  }
  function renderNodes() {
    $('#en-nodes').innerHTML=layout.nodes.map(n=>`<button class="en-node ${n.fixed?'is-anchor':''}" data-en-node="${n.id}" style="left:${n.x/8}%;top:${n.y/6}%" aria-label="${n.id[0]==='t'?'Felső':'Útpálya'}, ${Number(n.id.slice(1))+1}. pont${n.fixed?', rögzített part':''}" aria-pressed="${selectedNode===n.id}"><span aria-hidden="true">${n.fixed?'●':'+'}</span></button>`).join('');
  }
  function syncControls() {
    if(!mode) return;
    root.querySelectorAll('#en-restart, #en-speed, [data-en-level]').forEach(button=>{button.disabled=paused;});
    $('#en-pause').textContent=paused?'▶ Folytatás':'Ⅱ Szünet';$('#en-pause').setAttribute('aria-pressed',String(paused));
    $('#en-undo').disabled=paused || (mode==='bridge'?!bridgeHistory.length||!!trial:!history.length);
    if(mode==='bridge') {
      $('#en-budget').textContent=layout.budget-bridgeSpent(layout,beams);
      $('#en-test').hidden=!!trial;$('#en-test').disabled=paused||!!trial;$('#en-edit').hidden=!trial;$('#en-edit').disabled=paused;
      $('#en-nodes').hidden=!!trial;
      root.querySelectorAll('[data-en-node]').forEach(b=>{b.disabled=paused||!!trial;b.setAttribute('aria-pressed',String(b.dataset.enNode===selectedNode));});
    } else {
      const stats=blockStats(world);
      $('#en-volume').innerHTML=`${decimal(stats.volume)} <small>egység³</small>`;
      $('#en-count').textContent=`${stats.count} elem`;$('#en-height').textContent=`${stats.height} egység magas`;
      $('#en-record').textContent=decimal(progress[mode+'Best']);
      if(mode==='drop') {
        $('#en-drop').disabled=paused||!!pending||ended;$('#en-drop').textContent=pending?'Megvárjuk, míg megáll…':'↓ Ejtés!';
        $('#en-piece-name').textContent=currentPiece().name;
        $('#en-lives').textContent=`${'● '.repeat(Math.min(3,world.lost))}${'○ '.repeat(Math.max(0,3-world.lost))} · ${Math.max(0,3-world.lost)} csobbanás maradt`;
      } else {
        $('#en-place').disabled=paused||!!pending||ended;$('#en-rotate').disabled=paused||!!pending;
        root.querySelectorAll('[data-en-piece]').forEach(b=>{b.disabled=paused||!!pending;b.setAttribute('aria-pressed',String(selected===b.dataset.enPiece));});
      }
    }
    const overlay=$('#en-overlay');
    if(paused) { overlay.hidden=false;overlay.innerHTML='<strong>Szünet</strong><span>A játék megvár.</span>'; }
    else if(ended) { overlay.hidden=false;overlay.innerHTML='<strong>Szép építkezés!</strong><span>Próbálj új alapot, vagy vond vissza az utolsó lépést.</span>'; }
    else overlay.hidden=true;
  }
  function place(x,y) {
    if(!playable()||pending||ended||world.blocks.length>=50) return;
    const piece=currentPiece(), pos=mode==='drop'?dropPosition():{x,y};
    if(mode==='build'&&!canPlaceBlock(world,piece.id,pos.x,pos.y,angle)) {status('Itt már van valami. Keress szabad helyet az elemnek!');return;}
    history.push({ ...snapshotBlocks(world),sequence,angle });if(history.length>50)history.shift();
    const body=addBlock(world,piece.id,pos.x,pos.y,angle);
    pending={id:body.plugin.serial,at:world.ticks};
    if(mode==='drop')sequence++;
    status('Nézzük, hogyan áll meg!');syncControls();
  }
  function chooseNode(id) {
    if(!playable()||trial) return;
    if(!selectedNode) {selectedNode=id;status('Most válaszd ki a rúd másik végét!');}
    else if(selectedNode===id) {selectedNode=null;status('Válassz egy kezdőpontot!');}
    else {
      const result=editBridge(layout,beams,selectedNode,id);
      if(result.error)status(result.error);
      else {bridgeHistory.push(beams);beams=result.beams;saveBridge();status('A rúd a helyén. Újra összekötve ezt a két pontot kiveheted.');}
      selectedNode=null;
    }
    syncControls();draw();
  }
  function saveBridge() {progress.bridges[level].beams=beams.map(p=>[...p]);save();}
  function testBridge() {
    if(!playable()||trial) return;
    if(!hasBridgeRoad(layout,beams)) {status('Még hiányzik az út! Kösd össze sorban az alsó pontokat a két part között.');return;}
    selectedNode=null;trial=createBridgeTrial(layout,beams);status('Indul az autó. Figyeld, hol hajlik meg a híd!');syncControls();
  }
  function tick() {
    elapsed+=STEP_MS/1000;
    if(mode==='bridge') {
      if(trial&&!trial.result) {
        const result=stepBridge(trial);
        if(result) {
          status(result==='success'?`Átért! ${bridgeSpent(layout,beams)} egység anyagból tartó hidat építettél.`:'Itt meghajlott a híd. Építs háromszöget a megjelölt rész köré, és próbáld újra!');
          say(result==='success'?'engineering_success':'engineering_retry');
          if(result==='success'&&!progress.bridges[level].completed) {progress.bridges[level].completed=true;save();}
          syncControls();
        }
      }
      return;
    }
    stepBlocks(world);
    if(world.lost>lostSeen) {lostSeen=world.lost;status('Csobbant! Tedd beljebb az elemet, vagy vond vissza a lépést!');say('engineering_water');}
    if(pending) {
      const body=world.blocks.find(b=>b.plugin.serial===pending.id);
      if(!body||body.plugin.calm>45||world.ticks-pending.at>480) {
        pending=null;
        if(mode==='drop'&&world.lost>=3 || world.blocks.length>=50) {ended=true;status('Vége az építésnek. Újrakezdheted, vagy visszavonhatod az utolsó lépést.');}
        else if(body)status('Megállt! Jöhet a következő elem.');
        syncControls();
      }
    }
    if(mode==='drop'&&world.lost>=3&&!ended) {ended=true;pending=null;syncControls();}
    if(world.ticks%15===0) {
      const score=blockStats(world).volume, key=mode+'Best';
      if(score>progress[key]) {progress[key]=score;save();}
      syncControls();
    }
  }
  function frame(now) {
    if(!active||!mode||document.hidden) {raf=0;return;}
    if(!last)last=now;
    if(!paused) {
      accumulator+=Math.min(80,now-last);
      while(accumulator>=STEP_MS) {tick();accumulator-=STEP_MS;}
      draw();
    }
    last=now;raf=requestAnimationFrame(frame);
  }
  function point(event) {
    const rect=$('#en-stage').getBoundingClientRect();
    return {x:view.x+(event.clientX-rect.left)/rect.width*view.w,y:view.y+(event.clientY-rect.top)/rect.height*view.h};
  }
  root.addEventListener('click',event=>{
    const button=event.target.closest('button');
    if(button?.disabled)return;
    if(button?.dataset.enMode) {enter(button.dataset.enMode);return;}
    if(button?.id==='en-back') {stopPlayback();hub();return;}
    if(button?.id==='en-pause') {paused=!paused;stopPlayback();releaseDrag();syncControls();return;}
    if(!playable())return;
    if(button?.dataset.enLevel!==undefined) {level=Number(button.dataset.enLevel);enter('bridge');return;}
    if(button?.id==='en-restart') {
      if(mode==='bridge') {bridgeHistory.push(beams);beams=[];trial=null;selectedNode=null;saveBridge();renderGame();}
      else enter(mode);
      return;
    }
    if(button?.id==='en-undo') {
      if(mode==='bridge') {if(!trial&&bridgeHistory.length){beams=bridgeHistory.pop();selectedNode=null;saveBridge();}}
      else if(history.length) {const snap=history.pop();disposeBlocks(world);world=restoreBlocks(mode,snap);sequence=snap.sequence;angle=snap.angle;lostSeen=world.lost;pending=null;ended=false;}
      status('Visszavontuk. Próbáld meg másképp!');syncControls();draw();return;
    }
    if(button?.dataset.enNode) {chooseNode(button.dataset.enNode);return;}
    if(button?.id==='en-test') {testBridge();return;}
    if(button?.id==='en-edit') {trial=null;status('Javíts a terven, aztán indulhat az új próba!');syncControls();draw();return;}
    if(mode==='bridge')return;
    if(button?.dataset.enPiece) {
      if(suppressClick){suppressClick=false;return;}
      selected=button.dataset.enPiece;angle=0;syncControls();draw();return;
    }
    if(button?.id==='en-rotate') {angle=(angle+Math.PI/2)%(Math.PI*2);draw();return;}
    if(button?.id==='en-speed') {slow=!slow;button.setAttribute('aria-pressed',String(slow));button.textContent=slow?'Lassú mozgás':'Gyorsabb mozgás';return;}
    if(button?.id==='en-drop'||button?.id==='en-place') {place(ghost.x,ghost.y);return;}
    if(event.target.closest('#en-stage')) {
      if(suppressClick){suppressClick=false;return;}
      const pos=point(event);ghost=pos;place(pos.x,pos.y);
    }
  });
  root.addEventListener('pointerdown',event=>{
    const piece=event.target.closest('[data-en-piece]');
    if(mode!=='build'||!playable()||pending||!event.isPrimary||event.button!==0||!piece)return;
    suppressClick=false;selected=piece.dataset.enPiece;angle=0;
    drag={id:event.pointerId,x:event.clientX,y:event.clientY,moved:false};root.setPointerCapture(event.pointerId);syncControls();
  });
  root.addEventListener('pointermove',event=>{
    if(mode!=='build'||!playable()||pending)return;
    if(drag&&drag.id===event.pointerId) {
      if(Math.hypot(event.clientX-drag.x,event.clientY-drag.y)>8)drag.moved=true;
      if(drag.moved){event.preventDefault();ghost=point(event);draw();}
    } else if(event.pointerType==='mouse'&&event.target.closest('#en-stage')) {ghost=point(event);draw();}
  });
  root.addEventListener('pointerup',event=>{
    if(!drag||drag.id!==event.pointerId)return;
    const moved=drag.moved, rect=$('#en-stage').getBoundingClientRect();releaseDrag();
    if(moved) {
      suppressClick=true;
      if(event.clientX>=rect.left&&event.clientX<=rect.right&&event.clientY>=rect.top&&event.clientY<=rect.bottom){const p=point(event);place(p.x,p.y);}
    }
  });
  root.addEventListener('pointercancel',()=>{releaseDrag();suppressClick=true;});
  root.addEventListener('contextmenu',event=>{
    if(window.matchMedia('(any-pointer:coarse)').matches) event.preventDefault();
  });
  root.addEventListener('keydown',event=>{
    if(!event.target.closest('#en-stage')||mode==='bridge'||!playable()||pending||event.repeat)return;
    if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Enter',' ','r','R'].includes(event.key))event.preventDefault();
    if(event.key==='Enter'||event.key===' ')place(ghost.x,ghost.y);
    else if(mode==='build') {
      if(event.key==='ArrowLeft')ghost.x-=16;
      if(event.key==='ArrowRight')ghost.x+=16;
      if(event.key==='ArrowUp')ghost.y-=16;
      if(event.key==='ArrowDown')ghost.y+=16;
      if(event.key.toLowerCase()==='r')angle+=Math.PI/2;
      ghost.x=Math.max(32,Math.min(768,ghost.x));ghost.y=Math.max(view.y+40,Math.min(460,ghost.y));draw();
    }
  });
  document.addEventListener('visibilitychange',()=>{
    if(!active)return;
    if(document.hidden) {stopLoop();releaseDrag();stopPlayback();}
    else if(active&&mode){paused=true;syncControls();startLoop();}
  });
  window.addEventListener('pagehide',()=>{
    if(!active)return;
    stopLoop();releaseDrag();stopPlayback();
  });
  window.addEventListener('pageshow',event=>{
    if(!event.persisted||!active||!mode)return;
    paused=true;syncControls();startLoop();
  });
  return {
    start(){active=true;progress=normalizeEngineering(getProgress());hub();say('engineering_hub');},
    stop(){active=false;cleanup();stopPlayback();},
    repeat(){say(`engineering_${mode||'hub'}`,true);if(mode)status(instructions[mode]);},
  };
}
