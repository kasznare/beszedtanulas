import { createWorkshopArt } from '../story-art/workshop.js';

// Anchors come from the concatenated WordBoundary tracks of the existing recordings.
const scene = (time,id,title,setting,stillTime=time+2) => ({time,id,title,setting,stillTime});
const svg = (art,body) => `<svg viewBox="0 0 1280 720" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">${art.defs}${body}</svg>`;
const as = (art,name,body) => `<g data-actor="${name}">${body}</g>`;
const a = (ctx,actor,selector,values) => ctx.attrs(ctx.actors[actor]?.querySelector(selector),values);
const set = (ctx,selector,values) => ctx.attrs(ctx.host.querySelector(selector),values);
const all = (ctx,selector,fn) => ctx.host.querySelectorAll(selector).forEach(fn);
const opacity = (ctx,name,value) => ctx.attrs(ctx.actors[name],{opacity:value});
function ambient(ctx) {
  const t=ctx.motion?ctx.time:0,m=ctx.motion?1:0;
  all(ctx,'.wa-flag',(node,i)=>ctx.attrs(node,{transform:`skewY(${Math.sin(t*1.8+i)*m*3}) scale(${1+m*Math.sin(t*1.4+i)*.035} 1)`}));
  set(ctx,'[data-part="workshop-fan"]',{transform:`rotate(${t*48})`});
  set(ctx,'[data-part="clock-hand"]',{transform:`rotate(${t*.08})`});
  all(ctx,'.wa-human',(node,i)=>{
    ctx.attrs(node.querySelector('[data-part="human-body"]'),{transform:`translate(0 ${m*Math.sin(t*1.7+i)*1.1})`});
    ctx.attrs(node.querySelector('[data-part="human-head"]'),{transform:`rotate(${m*Math.sin(t*.75+i)*1.2})`});
    ctx.attrs(node.querySelector('[data-part="moustache"]'),{transform:`translate(0 ${m*Math.sin(t*2)*.6})`});
  });
  all(ctx,'.wa-steam',(node,i)=>{const q=(t*.2+i*.33)%1;ctx.attrs(node,{transform:`translate(${m*Math.sin(t+i)*6} ${-q*22})`,opacity:(1-q)*.42});});
}
function bearArm(ctx,angle=-25) { a(ctx,'bear','.sv-arm-right',{transform:`rotate(${angle} 28 -96)`});a(ctx,'bear','.sv-head',{transform:`rotate(${ctx.motion?Math.sin(ctx.time*.9)*2:0})`}); }
function humanArm(ctx,name,side,angle,child=false) {a(ctx,name,`[data-part="human-arm-${side}"]`,{transform:`rotate(${angle} ${side==='left'?-24:24} ${child?-92:-144})`});}
function emotion(ctx,angry=false) {a(ctx,'mark','[data-part="smile"]',{opacity:angry?0:1});a(ctx,'mark','[data-part="frown"]',{opacity:angry?1:0});}
function machineArm(ctx,name,boom=-43,stick=63,bucket=18) {
  a(ctx,name,'[data-part="boom"]',{transform:`translate(155 -114) rotate(${boom})`});
  a(ctx,name,'[data-part="stick"]',{transform:`translate(200 0) rotate(${stick})`});
  a(ctx,name,'[data-part="bucket"]',{transform:`translate(155 0) rotate(${bucket})`});
}
const soil = (count=14) => `<g data-actor="soil">${Array.from({length:count},(_,i)=>`<ellipse data-grain="${i}" rx="${3+i%4}" ry="3" fill="${i%2?'#b3996e':'#927d56'}"/>`).join('')}</g>`;
const steam = (x,y) => `<g transform="translate(${x} ${y})">${[0,1,2].map((i)=>`<path class="wa-steam" d="M${i*12-12} 0q-10-14 0-27t0-20" fill="none" stroke="#f2e9cf" stroke-width="4" stroke-linecap="round"/>`).join('')}</g>`;

const constructionScenes = [
  scene(0,'wake','Zajos reggel','bedroom',8),scene(10.462,'window','Mi történik az utcán?','bedroom',31),
  scene(41.566,'excavator','A kotró nagy kanala','construction',50),scene(52.936,'dig','A kotró ás','construction',56),
  scene(59.398,'load','A föld a platóra kerül','construction',65),scene(79.545,'shovel','Boribon is megpróbálja','construction',91),
  scene(108.042,'dozer','A buldózer széles lapja','construction',117),scene(120.702,'push','Eltűnnek a buckák','construction',130),
  scene(143.601,'reverse','A tolató dömper','construction',170),scene(176.606,'transport','A dömper szállít','construction',181),
  scene(190.635,'tracks','Kerekek helyett lánctalp','construction',202),scene(205.436,'stone','Egy láb egy kis kavicson','construction',214),
  scene(215.595,'plank','A deszka elosztja a súlyt','construction',229),scene(246.007,'crane','A daru felemeli a betoncsövet','construction',252),
  scene(257.218,'safe','A teher alatt nincs helyünk','construction',271),scene(276.052,'lower','A cső a helyére kerül','construction',280),
  scene(288.529,'supports','A daru támasztólábai','construction',300),scene(306.321,'balance','Széles talpon stabilabban','construction',322),
  scene(330.324,'roller','Az úthenger érkezik','construction',348),scene(358.183,'bucket','Mit jelent a tömörítés?','construction',375),
  scene(388.196,'team','Minden gép másban ügyes','construction',417),scene(424.526,'purpose','Nincs egyetlen legerősebb','construction',449),
  scene(457.039,'finished','Az út elkészült','road',471),scene(478.502,'home','És ez mire való?','garden',486)
];
function constructionFrame(s,art) {
  const w=createWorkshopArt(art),g=(name,body)=>as(art,name,body),id=s.id;
  if(id==='wake'||id==='window') return svg(art,w.bedroom()+g('bear',art.standing())+g('girl',art.girl())+g('outside',w.dumpTruck())+g('bed-cover','<path d="M-125 0h263v95h-263Z" fill="#c4d5b9" stroke="#8aab8d" stroke-width="3"/><path d="M-112 16h235m-235 21h235m-235 21h235" stroke="#a6be9d" stroke-width="3"/>'));
  let body=id==='home'?art.background(true):w.construction(id==='finished');
  const basic = ['excavator','dig','load','shovel','reverse','transport','tracks','stone','plank'];
  if(basic.includes(id)||['team','purpose','finished'].includes(id))body+=g('excavator',art.excavator());
  if(['load','reverse','transport','team','purpose','finished'].includes(id))body+=g('truck',w.dumpTruck());
  if(['dozer','push','team','purpose','finished'].includes(id))body+=g('dozer',w.bulldozer())+g('pile',w.pile(0,0,.75))+g('flat','<path d="M0 0q225-15 445-3" stroke="#c2b18a" stroke-width="39" fill="none"/>');
  if(['stone','plank'].includes(id))body+=g('stone','<path d="M-16 0-6-16l20 2 9 14Z" fill="#969f8a" stroke="#6c7d69" stroke-width="2"/>')+g('plank','<path d="M-85-10H85V0H-85Z" fill="#c5a673" stroke="#a08451" stroke-width="3"/><path d="M-70-7h129" stroke="#e3c898" stroke-width="2"/>');
  if(['crane','safe','lower','supports','balance','team','purpose','finished'].includes(id))body+=g('crane',art.crane())+g('pipe',w.pipe())+g('cable','<path data-part="cable" stroke="#687b6a" stroke-width="4" fill="none"/><path data-part="sling" stroke="#8d9275" stroke-width="5" fill="none"/>')+g('outriggers','<path d="M-83-7v35h48v-35m309 0v35h48v-35" fill="#a0a890" stroke="#617761" stroke-width="6"/><path d="M-87 28h59m295 0h64" stroke="#d2c3a0" stroke-width="9" stroke-linecap="round"/>');
  if(['roller','bucket','team','purpose','finished'].includes(id))body+=g('roller',w.roller());
  if(id==='bucket')body+=g('bucket',w.bucket())+g('press','<path d="M-29-8h58v13h-58Z" fill="#cfb891" stroke="#927c55" stroke-width="3"/><path d="M0-40v32" stroke="#b59a6e" stroke-width="10"/>');
  if(id==='shovel')body+=g('shovel',w.shovel())+g('little-pile',w.pile(0,0,.26));
  body+=soil()+g('bear',art.standing())+g('girl',art.girl());
  if(!['home','stone','plank','bucket','balance'].includes(id))body+=w.fence(23,651,386)+w.fence(850,651,398);
  return svg(art,body);
}
function constructionRender(ctx) {
  const {time:t,scene:s,pose,progress,smooth,mix,attrs,actors,motion}=ctx,id=s.id,m=motion?1:0,e=(lo,hi)=>smooth(progress(t,lo,hi));
  ambient(ctx);pose('bear',920,635,.9);pose('girl',1008,450,.9);bearArm(ctx,-18-m*Math.sin(t*.9)*9);
  pose('excavator',216,557,.94);machineArm(ctx,'excavator',-45,60,15);pose('truck',754,550,.9);pose('dozer',273,554,1);pose('crane',174,558,.95);pose('roller',280,552,1);
  opacity(ctx,'soil',0);opacity(ctx,'cable',1);let spin=0;
  if(id==='wake'||id==='window') {
    const wake=e(9.2,13),walk=e(13,17);pose('bear',mix(244,821,walk),mix(450,489,wake),.88,0);pose('girl',1070,281,.91);pose('bed-cover',189,440,1);opacity(ctx,'bed-cover',1-wake);pose('outside',829,320,.33);opacity(ctx,'outside',id==='window'?1:.65);
    a(ctx,'bear','.sv-body',{transform:`translate(0 ${m*Math.sin(t*2.2)*1.5})`});
  } else if(['excavator','dig','load','shovel'].includes(id)) {
    pose('bear',975,637,.87);pose('girl',1079,461,.85);
    const digging=id==='dig'?e(52.936,58.9):id==='load'?1:id==='shovel'?.45+.3*Math.sin(t*.72):0;
    machineArm(ctx,'excavator',mix(-50,-7,digging),mix(63,33,digging),mix(14,-14,digging));
    if(id==='load') {const q=e(59.398,65.8);machineArm(ctx,'excavator',-35+q*8,22-q*2,60+q*55);pose('truck',564,550,.93);opacity(ctx,'soil',progress(t,63.3,64)* (1-progress(t,66,67.6)));}
    if(id==='shovel') {pose('bear',783,637,.94);pose('girl',1015,439,.95);const q=m*Math.sin((t-79.545)*1.1);pose('shovel',825,610,.8,q*20,0,-80);pose('little-pile',892,635,1);bearArm(ctx,-86-q*10);opacity(ctx,'soil',.55);}
    all(ctx,'[data-grain]',(node,i)=>{const q=((motion?t*.76:0)+i/14)%1;attrs(node,{cx:id==='shovel'?847+i*3:639+i*3,cy:(id==='shovel'?555:363)+q*137,opacity:(1-q)*.9});});
  } else if(id==='dozer'||id==='push') {
    const q=id==='push'?e(120.702,134.5):0;pose('dozer',222+q*274,555-m*Math.sin(t*3),1);pose('pile',570+q*220,558,1-q*.65);pose('flat',240,560,1);opacity(ctx,'flat',q);spin=id==='push'?(t-120.702)*110:0;
    a(ctx,'dozer','[data-part="blade"]',{transform:`translate(0 ${m*Math.sin(t*1.6)*1.2})`});
  } else if(id==='reverse'||id==='transport') {
    const reverse=e(146,158);pose('truck',mix(930,640,reverse)+(id==='transport'?e(179,187)*500:0),545,.98);pose('bear',955-e(172.43,175)*26,639,.91);spin=(t-s.time)*-100;
    a(ctx,'truck','[data-part="reverse-light"]',{opacity:motion?.48+(Math.sin(t*3)+1)*.26:1});
    machineArm(ctx,'excavator',id==='transport'?-46:-37,31,90);
    if(id==='transport'){opacity(ctx,'soil',1-e(178,180));all(ctx,'[data-grain]',(node,i)=>{const q=(t*.7+i/14)%1;attrs(node,{cx:698+i*5,cy:393+q*132,opacity:1-q});});}
  } else if(['tracks','stone','plank'].includes(id)) {
    pose('excavator',240,531,.92);machineArm(ctx,'excavator',-54,75,12);pose('bear',751,634,.98);pose('girl',995,430,1);
    pose('stone',721,633,1);pose('plank',753,630,1);opacity(ctx,'plank',id==='plank'?e(215.595,221):0);opacity(ctx,'stone',id==='plank'?1-e(216,222):1);
    if(id==='tracks')a(ctx,'bear','.sv-body',{transform:`translate(0 ${-21*e(198.627,201)}) scale(1 ${1-.12*e(198.627,201)})`});
    if(id==='stone'){pose('bear',751,631,.98,-m*Math.sin(t*1.7)*3,0,0);a(ctx,'bear','.sv-body > path:first-child',{d:'M-25-38-29-6M24-37 28-24'});const feet=actors.bear.querySelectorAll('.sv-body > ellipse');attrs(feet[1],{cy:-24});}
  } else if(['crane','safe','lower','supports','balance'].includes(id)) {
    const lower=id==='lower'?e(276.052,281.6):['supports','balance'].includes(id)?1:0;
    const angle=-42,rad=angle*Math.PI/180,cx=174+.95*(158+500*Math.cos(rad)),cy=558+.95*(-76+500*Math.sin(rad)),py=400+lower*124;
    a(ctx,'crane','[data-part="crane-boom"]',{transform:`translate(158 -76) rotate(${angle})`});pose('pipe',cx,py,1);set(ctx,'[data-part="cable"]',{d:`M${cx} ${cy}V${py-57}`});set(ctx,'[data-part="sling"]',{d:`M${cx} ${py-57} ${cx-49} ${py-20}M${cx} ${py-57} ${cx+49} ${py-20}`});
    pose('outriggers',174,558,.95);opacity(ctx,'outriggers',['supports','balance'].includes(id)?1:.75);
    if(id==='safe') {const q=e(257.218,260.8),back=e(262.444,265);pose('bear',980+q*35-back*55,636,.9);a(ctx,'girl','.sv-girl-left',{transform:'rotate(-32 18 78)'});}
    if(id==='supports'){pose('bear',967,635,.97);bearArm(ctx,-87);}
    if(id==='balance'){const wide=t<317.491,foot=wide?43:20;a(ctx,'bear','.sv-body > path:first-child',{d:`M-25-38-${foot}-6M24-37 ${foot}-6`});const feet=actors.bear.querySelectorAll('.sv-body > ellipse');attrs(feet[0],{cx:-foot});attrs(feet[1],{cx:foot});pose('bear',920,636,1.03,t>317.49?m*Math.sin((t-317.49)*2)*12* (1-e(322,325)):0,0,0);a(ctx,'girl','.sv-girl-left',{transform:`rotate(${-20-m*Math.sin(t*1.8)*12} 18 78)`});}
  } else if(id==='roller'||id==='bucket') {
    pose('roller',id==='roller'?mix(76,666,e(334.446,352)):186,544,.94);spin=id==='roller'?(t-334.446)*130:0;
    if(id==='bucket'){pose('bear',943,637,.93);pose('girl',1034,439,.94);pose('bucket',743,614,.85);const q=e(367.438,371);pose('press',743,550+q*40,.85);a(ctx,'bucket','[data-part="bucket-soil"]',{transform:`translate(0 ${q*18}) scale(1 ${1-q*.28})`});opacity(ctx,'press',progress(t,365.5,367));}
  } else if(['team','purpose','finished'].includes(id)) {
    pose('excavator',113,504,.52);pose('dozer',338,508,.52);pose('truck',539+(id==='finished'?e(461.428,466.5)*480:0),506,.52);pose('crane',785,509,.45);pose('roller',1009+(id==='finished'?e(470,477)*170:0),504,.55);pose('outriggers',785,509,.45);pose('pipe',928,500,.45);opacity(ctx,'cable',0);opacity(ctx,'outriggers',id==='finished'?1-e(466,470):1);
    pose('bear',536,647,1.05);pose('girl',671,426,1.05);machineArm(ctx,'excavator',-53+(id==='finished'?e(464,468)*23:0),70,17);a(ctx,'crane','[data-part="crane-boom"]',{transform:'translate(158 -76) rotate(-51)'});
    bearArm(ctx,id==='purpose'?-65-m*Math.sin(t)*8:-80);spin=id==='finished'?(t-461.428)*65:20*m*Math.sin(t);
    if(id==='purpose')a(ctx,'bear','.sv-head',{transform:`rotate(${t>444.2&&t<447?m*Math.sin(t*4)*8:0})`});
  } else {pose('bear',520+e(478.502,489)*65,604,1.03);pose('girl',726,408,.96);bearArm(ctx,-95-m*Math.sin(t*2)*9);a(ctx,'girl','.sv-girl-right',{transform:`rotate(${-50-m*Math.sin(t*2)*7} 61 78)`});}
  // Track and drum spokes give the machines a visible, audio-time-based working rhythm.
  all(ctx,'.sv-track-wheel',(node,i)=>attrs(node.querySelector('circle'),{opacity:motion?.82+(Math.sin(t*5+i)+1)*.09:1}));
  all(ctx,'.sv-wheel',(node)=>attrs(node,{transform:`rotate(${motion?spin:0})`}));
}

const workshopScenes=[
  scene(0,'start','Kirándulni indulunk','garden',18),scene(21.446,'squeak','Mi nyikorog?','road',37),scene(40.755,'stop','Nyomozzunk együtt!','garden',58),
  scene(63.215,'arrival','Az autószerelő műhely','workshop',75),scene(79.984,'lift','A levegőben álló autó','workshop',89),scene(93.095,'clue','Misi keresi a fontos nyomot','workshop',119),
  scene(136.699,'wheel','A kerék is forog','workshop',141),scene(144.252,'safe-lift','Biztonságos távolságból','workshop',161),scene(165.117,'test-wheel','Melyik kerék nyikorog?','workshop',178),
  scene(190.848,'disc','A kerék mögötti féktárcsa','workshop',204),scene(209.252,'brake','A fékbetétek összeszorulnak','workshop',214),scene(215.888,'friction','Boribon kipróbálja a súrlódást','workshop',235),
  scene(247.271,'repair','Misi rendbe teszi a féket','workshop',258),scene(264.425,'hood','Mi van a motorháztető alatt?','workshop',283),scene(291.305,'piston','A dugattyú le és fel mozog','workshop',304),
  scene(313.326,'drive','A forgás a kerékhez ér','workshop',320),scene(335.946,'gears','Kis fogaskerék, nagy fogaskerék','workshop',346),scene(349.231,'swap','Másik áttétel, másik sebesség','workshop',360),
  scene(373.938,'battery','Az akkumulátor áramot ad','workshop',390),scene(413.406,'cooling','A hűtőfolyadék elviszi a hőt','workshop',430),scene(444.922,'oil','Az olaj segíti a mozgást','workshop',465),
  scene(471.159,'summary','Minden alkatrésznek van dolga','workshop',492),scene(502.196,'try','A javítás próbája','road',518),scene(524.563,'thanks','Megjavítottuk!','workshop',541),
  scene(559.164,'observe','Először megfigyelünk','workshop',573),scene(579.968,'drive-home','Hazafelé már mást hallunk','road',592),scene(597.415,'home','Legközelebb is kiderítem','garden',617)
];
function workshopFrame(s,art) {
  const w=createWorkshopArt(art),g=(name,body)=>as(art,name,body),id=s.id,outdoor=['start','squeak','stop','try','drive-home','home'].includes(id);
  let body=outdoor?art.background(['start','stop','home'].includes(id)):w.workshop();
  const board=['disc','brake','friction','piston','drive','gears','swap','battery','cooling','oil','summary'].includes(id);
  if(!board) {
    if(!outdoor)body+=g('lift',w.lift());
    body+=g('car',w.roadCar());
    if(id==='hood')body+=g('hood','<path d="M-11 0 104-39l-3-20-115 38Z" fill="'+art.paint('blue')+'" stroke="#3a657e" stroke-width="3"/><path d="M-2-19 86-48" stroke="#94b8c9" stroke-width="4"/>')+g('engine-small',w.piston());
    if(['repair','wheel','test-wheel'].includes(id))body+=g('tool','<path d="M0-42q-14-8-11-23l9 6 8-6v-10q15 7 10 26L5 49q-9 10-15-1Z" fill="#ccd4bc" stroke="#7d947e" stroke-width="3"/><circle cy="42" r="4" fill="#96ac91"/>');
    if(['squeak','test-wheel'].includes(id))body+=g('sound','<path d="M0 0q17-15 0-30m12 39q30-24 1-47m13 56q40-34 3-65" fill="none" stroke="#c39d6d" stroke-width="5" stroke-linecap="round"/>');
  } else {
    const titles={disc:'A féktárcsa',brake:'A fék lassítja a forgást',friction:'Súrlódás',piston:'A dugattyú mozgása',drive:'A motor forgatja a kerekeket',gears:'Fogaskerekek',swap:'Más méret, más forgás',battery:'Elektromos energia',cooling:'Hűtés',oil:'Kevesebb súrlódás',summary:'Az autó együtt működő részei'};
    body+=w.diagram(titles[id]);
    if(['disc','brake','friction'].includes(id))body+=g('brake',w.brake())+g('loose-wheel',art.wheel(0,0,82));
    if(id==='piston')body+=g('piston',w.piston());
    if(id==='drive')body+=g('engine',w.piston())+g('drive-wheel',art.wheel(0,0,69))+g('shaft','<path d="M0 0h249" stroke="#869b83" stroke-width="13" stroke-linecap="round"/><path d="M5-5h239" stroke="#c1d2b6" stroke-width="4"/><g data-part="shaft-turn"><ellipse cx="121" rx="13" ry="23" fill="#a6b899" stroke="#789272" stroke-width="3"/></g>');
    if(['gears','swap'].includes(id))body+=g('small-gear',w.gear(47,10))+g('large-gear',w.gear(83,18));
    if(id==='battery')body+=g('battery',w.battery())+g('lamp','<path d="M-40 28q-37-62 3-93 36-23 68 7 30 41-7 86v24h-64Z" fill="#f2df9c" stroke="#b9aa6d" stroke-width="4"/><path d="M-19 17-6-26l17 26 15-26-6 43" fill="none" stroke="#bb965f" stroke-width="4"/><path d="M-34 34h45m-45 13h45m-45 13h45" stroke="#8b9f80" stroke-width="9"/>');
    if(id==='cooling')body+=g('cooling',w.cooling());
    if(id==='oil')body+=g('oil',w.oil());
    if(id==='summary')body+=g('engine',w.piston())+g('small-gear',w.gear(47,10))+g('brake',w.brake())+g('battery',w.battery())+g('cooling',w.cooling())+g('oil',w.oil());
  }
  if(!['start','squeak','try','drive-home'].includes(id))body+=g('bear',art.standing());
  if(!outdoor)body+=g('misi',w.human('mechanic'));
  if(outdoor&&['start','stop','home'].includes(id))body+=g('girl',art.girl());
  return svg(art,body);
}
function workshopRender(ctx) {
  const {time:t,scene:s,pose,attrs,actors,motion,progress,smooth,mix}=ctx,id=s.id,m=motion?1:0,e=(lo,hi)=>smooth(progress(t,lo,hi));
  ambient(ctx);pose('bear',979,628,.98);pose('misi',239,613,1.17);pose('girl',204,389,1.02);pose('car',487,374,1.13);pose('lift',640,598,1);bearArm(ctx,-28);humanArm(ctx,'misi','right',-38);
  a(ctx,'car','.sv-driver',{opacity:['start','squeak','try','drive-home','home'].includes(id)?1:0});
  let spin=0;
  if(id==='start') {pose('car',444+e(21,21.4)*90,421,1);a(ctx,'car','.sv-driver .sv-head',{transform:`rotate(${m*Math.sin(t*2)*1.5})`});}
  else if(id==='squeak'){const q=e(21.446,40.755);pose('car',254+q*543,430-m*Math.sin(t*3)*1.1,1.06);spin=t<31.6?(t-21)*145:t<36.6?1450+(t-31.6)*42:1650+(t-36.6)*260;pose('sound',588+q*543,522,.65);opacity(ctx,'sound',.35+m*(Math.sin(t*(t<36.6?3:7))+1)*.24);}
  else if(id==='stop'){pose('car',504,427,1);pose('bear',881,619,.9);pose('girl',212,393,1);}
  else if(['arrival','lift','clue','wheel','safe-lift','test-wheel','repair','hood','thanks','observe'].includes(id)) {
    let y=['arrival','clue','thanks','observe'].includes(id)?396:284;
    if(id==='lift')y=mix(390,284,e(79.984,88));
    if(id==='safe-lift')y=mix(390,284,e(144.252,147));
    if(['thanks','observe'].includes(id))y=421;
    pose('car',473,y,1.18);a(ctx,'lift','[data-part="lift-platform"]',{transform:`translate(0 ${y+158*1.18-598})`});
    if(id==='arrival')a(ctx,'lift','[data-part="lift-platform"]',{transform:'translate(0 -49)'});
    pose('bear',id==='safe-lift'?mix(851,966,e(150.156,161)):967,629,.98);
    if(id==='clue'){pose('misi',312,623,1.13);humanArm(ctx,'misi','right',-65);}
    if(['wheel','test-wheel','repair'].includes(id)){pose('misi',790,625,1.13);pose('tool',765,491,.65,Math.sin(t*2)*m*19);humanArm(ctx,'misi','left',-68);spin=id==='test-wheel'?(t-165.117)*140:0;}
    if(id==='safe-lift')humanArm(ctx,'misi','right',-104);
    if(id==='test-wheel'){pose('misi',t<172.789?790:608,625,1.13);humanArm(ctx,'misi','left',-68);pose('sound',t<172.789?799:570,423,.65);opacity(ctx,'sound',t>=172.789?.45+m*Math.sin(t*3)*.25:0);bearArm(ctx,t>178.627?-107:-40);}
    if(id==='hood'){pose('hood',670,366,1.05,-e(264.425,267)*24,0,0);pose('engine-small',686,439,.22);a(ctx,'engine-small','[data-part="piston"]',{transform:`translate(0 ${m*Math.sin(t*2.8)*26})`});}
    if(id==='observe'){humanArm(ctx,'misi','right',-79);bearArm(ctx,-90);}
  } else if(['disc','brake','friction'].includes(id)) {
    pose('brake',640,309,1.03);pose('loose-wheel',848,409,.73);opacity(ctx,'loose-wheel',id==='disc'?1-e(192,195):.24);
    const press=id==='disc'?0:id==='brake'?e(209.252,214):(.5+m*Math.sin(t*1.4)*.5);a(ctx,'brake','[data-part="brake-left"]',{transform:`translate(${press*19} 0)`});a(ctx,'brake','[data-part="brake-right"]',{transform:`translate(${-press*19} 0)`});a(ctx,'brake','[data-part="brake-disc"]',{transform:`rotate(${m*(t-s.time)*95*(1-press*.84)})`});
    if(id==='friction'){bearArm(ctx,-84);a(ctx,'bear','.sv-arm-left',{transform:`rotate(${-25-m*Math.sin(t*2)*7} -27 -96)`});}
  } else if(id==='piston') {
    pose('piston',640,348,.83);let off=0;
    if(t<301.239){off=26*e(293.951,295.5)-26*e(296.332,297.8)+26*e(298.286,299.3)-26*e(299.723,301);}else off=m*Math.sin(t*2.8)*23;
    a(ctx,'piston','[data-part="piston"]',{transform:`translate(0 ${off})`});a(ctx,'piston','[data-part="combustion"]',{opacity:.35+m*(Math.sin(t*2.8)+1)*.2});humanArm(ctx,'misi','right',-81);bearArm(ctx,-73);
  } else if(id==='drive') {
    pose('engine',486,342,.56);pose('drive-wheel',840,350,.83);pose('shaft',546,350,1);spin=(t-313.326)*105;
    a(ctx,'engine','[data-part="piston"]',{transform:`translate(0 ${m*Math.sin(t*2.8)*24})`});set(ctx,'[data-part="shaft-turn"]',{transform:`scale(1 ${.55+m*(Math.sin(t*3)+1)*.3})`});
  } else if(id==='gears'||id==='swap') {
    const swap=id==='swap',q=swap?e(349.231,352.063):0;pose('small-gear',mix(557,703,q),315-Math.sin(q*Math.PI)*90,1.03);pose('large-gear',mix(703,557,q),315+Math.sin(q*Math.PI)*90,1.03);
    const r=m*(t-s.time)*(swap?160:98);a(ctx,'small-gear','g',{transform:`rotate(${r})`});a(ctx,'large-gear','g',{transform:`rotate(${-r*47/83})`});bearArm(ctx,-81);humanArm(ctx,'misi','right',-73);
  } else if(id==='battery') {
    pose('battery',568,332,.83);pose('lamp',816,315,.84);
    const drained=e(395.507,405.5);opacity(ctx,'lamp',1-drained*.66);attrs(ctx.actors.lamp?.querySelector('path'),{fill:drained>.5?'#d2ccb0':'#f7e4a8'});humanArm(ctx,'misi','right',-88);
  } else if(id==='cooling'){pose('cooling',607,330,.9);set(ctx,'[data-part="coolant-flow"]',{strokeDashoffset:-m*(t-s.time)*45});set(ctx,'[data-part="heat"]',{opacity:.28+m*(Math.sin(t*1.7)+1)*.17,transform:`translate(0 ${-m*Math.sin(t*1.2)*9})`});}
  else if(id==='oil'){pose('oil',635,320,1);set(ctx,'[data-part="oil-metal"]',{transform:`translate(${m*Math.sin(t*2.6)*(t<460.148?33:47)} 0)`});set(ctx,'[data-part="oil-drop"]',{transform:`translate(0 ${m*(t*.55%1)*25})`,opacity:t>=460.148?.85:.3});}
  else if(id==='summary') {
    const positions={engine:[435,306,.37], 'small-gear':[578,287,.53],brake:[775,290,.5],battery:[440,405,.37],cooling:[653,400,.38],oil:[822,397,.43]};
    for(const [name,values]of Object.entries(positions))pose(name,...values);
    a(ctx,'engine','[data-part="piston"]',{transform:`translate(0 ${m*Math.sin(t*2.8)*25})`});a(ctx,'small-gear','g',{transform:`rotate(${m*t*62})`});a(ctx,'brake','[data-part="brake-disc"]',{transform:`rotate(${m*t*45})`});set(ctx,'[data-part="coolant-flow"]',{strokeDashoffset:-m*t*30});set(ctx,'[data-part="oil-metal"]',{transform:`translate(${m*Math.sin(t*2)*28} 0)`});bearArm(ctx,-92);
  } else if(id==='try'||id==='drive-home') {
    const q=id==='try'?e(511.465,521.837):e(579.968,597.415);pose('car',240+q*601,429-m*Math.sin(t*2.8),1.02);spin=(t-s.time)*145*(id==='try'?1-e(519.869,521.837):1);if(id==='try'&&t<507.848)a(ctx,'car','.sv-driver',{opacity:0});
  } else {pose('car',400,428,1);pose('bear',885,623,.99);pose('girl',195,388,1.05);a(ctx,'car','.sv-driver',{opacity:0});bearArm(ctx,-93-m*Math.sin(t*1.4)*9);}
  all(ctx,'.sv-wheel',(node)=>{const actor=node.closest('[data-actor]')?.dataset.actor;let amount=['car','drive-wheel'].includes(actor)?spin:0;if(id==='test-wheel'&&actor==='car'){const pair=[...actors.car.querySelectorAll('.sv-wheel')];const active=t<172.789?1:0;if(pair.indexOf(node)!==active)amount=0;}attrs(node,{transform:`rotate(${motion?amount:0})`});});
}

const crownScenes=[
  scene(0,'intro','Márk tudja, mit szeretne','home',15),scene(20.635,'blocks','Márk várat épít','home',29),scene(49.598,'cocoa','Egy pillanatot várni kell','home',63),
  scene(68.893,'shout','Nagyon szeretném, most!','home',85),scene(93.680,'ask-cocoa','Kaphatok kakaót, kérlek?','home',102),
  scene(111.646,'castle','Egy régi várba érkezünk','castle',119),scene(122.856,'fair','Lovagok és a kovács','castle',135),scene(138.561,'king','A király és nagy koronája','castle',150),
  scene(156.180,'want-crown','Márk koronát szeretne','castle',179),scene(184.186,'angry','Egy nagy érzés növekszik','castle',200),scene(206.034,'summon','A király Márkhoz szól','castle',232),
  scene(256.313,'crown','Három kívánság erejéig','castle',267),scene(274.026,'baker','Parancsra nem jön kalács','castle',302),scene(311.983,'ask-bread','Másképp is lehet kérni','castle',327),
  scene(331.997,'bread','A kalács és a köszönöm','castle',342),scene(344.483,'lesson-one','Az első lecke: szépen kérni','castle',353),
  scene(363.366,'sword','A csodálatos fakard','castle',408),scene(421.664,'choice','Kard vagy korona?','castle',449),scene(474.869,'bench','Mérges lehetek, és nyugodtan ülök','castle',498),scene(506.372,'lesson-two','A második lecke: én döntök','castle',524),
  scene(534.271,'wall','A várfal tetején','wall',547),scene(550.654,'stop','Apa azt mondja: állj!','wall',561),scene(569.922,'rail','A meglazult korlát','wall',587),scene(592.675,'why','Most már megkérdezhetem, miért','wall',607),scene(615.901,'lesson-three','A harmadik lecke: először megállni','wall',628),scene(636.194,'look-down','Fentről kicsi a várudvar','wall',650),
  scene(664.080,'craft','Márk saját koronát készít','castle',675),scene(702.484,'wisdom','Saját magam fölött uralkodni','castle',729),
  scene(741.792,'home','Otthon újra próbáljuk','home',754),scene(760.702,'water','Anya, kaphatok vizet, kérlek?','home',770),scene(773.601,'play','Még öt perc játék','home',792),
  scene(796.726,'unfinished','Még nincs kész a tornyom','home',810),scene(812.165,'breathe','Egy nagy levegő és néhány szó','home',829),scene(835.782,'bath','Holnap folytatom','home',841),scene(845.436,'door','Attól még mérges lehetek','home',858),
  scene(865.915,'bed','A három lecke az ágy mellett','bedroom',891),scene(896.354,'lights','Jó éjszakát','bedroom',919),scene(937.680,'end','A saját tetteim főnöke','bedroom',950)
];
function crownFrame(s,art) {
  const w=createWorkshopArt(art),g=(name,body)=>as(art,name,body),id=s.id,wall=s.setting==='wall',bed=s.setting==='bedroom',home=s.setting==='home';
  let body=bed?w.home(true):home?w.home():w.castle(wall);
  if(home) {
    if(['intro','cocoa','shout','ask-cocoa','home','water'].includes(id))body+=g('table',w.table())+g('cup',w.cup(true))+g('apple','<path d="M0-5q-29-17-31 11-2 32 28 34 31 1 31-33Q25-18 0-5Z" fill="#d59c78" stroke="#ac7755" stroke-width="2"/><path d="M-1-8q1-15 7-18" stroke="#92734e" stroke-width="4"/><path d="M3-22q22-8 20 7-16 2-20-7Z" fill="#95ac7e"/>');
    body+=g('blocks',w.blocks())+g('paper-crown',w.crown());
    if(['cocoa','shout','ask-cocoa'].includes(id))body+=g('sister',w.human('sister'));
    if(['intro','cocoa','shout','ask-cocoa','home','water','play','unfinished','breathe','bath','door'].includes(id))body+=g('mom',w.human('mom'));
  } else if(bed) {
    body+=g('bed','<path d="M-190 0V-120h34V0m374 0v-84h28V0" stroke="#a0835b" stroke-width="13"/><path d="M-168-100h388v99h-388Z" fill="#8aa8a2" stroke="#627d72" stroke-width="4"/><rect x="-146" y="-119" width="119" height="58" rx="20" fill="#f3e4c5"/><path d="M-18-89h224v79H-18Z" fill="#c1ccb0"/><path d="M-5-62h196m-196 21h196" stroke="#9ab59a" stroke-width="3"/>')+g('table',w.table())+g('paper-crown',w.crown())+g('dad',w.human('dad'));
  } else if(wall) {
    body+='<path d="M710 521h449v-39h-51v-37h-52v-39h-51v-37h-54v-36h-52v-38h-52v-36h-51v-38h-46Z" fill="#c2c3a5" stroke="#9da98f" stroke-width="4"/><g data-actor="rail"><path d="M774 198 1141 465m-342-250v101m54-62v101m54-63v104m52-63v101m57-62v106" stroke="#8c947b" stroke-width="10" stroke-linecap="round"/></g>'+g('barrier','<path d="M-91-70h182v42H-91Z" fill="#ead3a8" stroke="#a48d62" stroke-width="3"/><path d="m-78-34 30-30m17 30 30-30m17 30 30-30m17 30 24-24" stroke="#c99471" stroke-width="11"/><path d="M-74-27V0m147-27V0" stroke="#9c8560" stroke-width="8"/>')+g('guard',w.human('guard'))+g('dad',w.human('dad'))+g('king',w.human('king',false));
  } else {
    body+=g('throne',w.throne());
    if(['castle','fair','king','want-crown','angry','summon','crown'].includes(id))body+=g('smith',w.human('smith'))+g('anvil','<path d="M-54-52h136l33 15-53 18H-9l-3 17h-31l6-20-17-9Z" fill="#889582" stroke="#667964" stroke-width="3"/><path d="M-31-2h64v27h-64Z" fill="#aa8e62"/>')+g('hammer','<path d="M0 0v-59" stroke="#aa8a5b" stroke-width="7"/><path d="M-26-76h53v24h-53Z" fill="#9caa94" stroke="#70826e" stroke-width="3"/>')+g('knight',w.human('guard'))+g('smith-sparks','<path d="M0-13v-13m-11 16-9-10m32 10 9-10" stroke="#e9c684" stroke-width="4" stroke-linecap="round"/>');
    if(['baker','ask-bread','bread','lesson-one'].includes(id))body+=g('baker-tent',w.tent('#b2ba8e'))+g('baker',w.human('baker'))+g('bread',w.bread())+g('tray','<path d="M-111 0h223v16h-223Z" fill="#c1a36e" stroke="#91764d" stroke-width="3"/>'+[-73,-23,29,78].map(x=>`<g transform="translate(${x} -11) scale(.6)">${w.bread()}</g>`).join(''))+steam(815,442);
    if(['sword','choice','bench','lesson-two'].includes(id))body+=g('sword-tent',w.tent('#c9a08c'))+g('sword',w.sword())+g('crown-tent',w.tent('#a3b89c'))+g('choice-crown',w.crown())+g('bench',w.bench());
    if(['craft','wisdom'].includes(id))body+=g('craft-tent',w.tent('#a3b89c'))+g('table',w.table())+g('paper-crown',w.crown())+g('gem-blue','<circle r="11" fill="#8bb9bf" stroke="#cbe4d5" stroke-width="3"/>')+g('gem-red','<circle r="16" fill="#ca7c68" stroke="#f2d5a7" stroke-width="3"/>')+g('glue','<path d="M-12-28h24v48h-24Z" fill="#e1ddbf" stroke="#a1a588" stroke-width="2"/><path d="M-10-30-5-42H5l5 12" fill="#c5a26c"/><path d="M-11-16h22V5h-22Z" fill="#a8c4ae"/>');
  }
  if(!home&&!bed&&!wall)body+=g('dad',w.human('dad'))+g('king',w.human('king',s.time<260.994||s.time>=664.080));
  body+=g('mark',w.human('mark',!home&&!bed&&(s.time>=260.994||id==='crown')));
  if(bed&&id!=='bed')body+=g('blanket','<path d="M0 0h268v80H0Z" fill="#c1ccb0" stroke="#9ab59a" stroke-width="3"/><path d="M7 23h250M7 44h250" stroke="#9ab59a" stroke-width="3"/>');
  if(bed)body+=g('darkness','<rect width="1280" height="720" fill="#273849" opacity=".25"/>');
  if(['crown'].includes(id))body+=g('floating-crown',w.crown(true));
  if(['lesson-one','lesson-two','lesson-three','bed'].includes(id))body+=g('lesson','<rect x="-156" y="-42" width="312" height="83" rx="22" fill="#f5e7bf" stroke="#bfa978" stroke-width="3"/><g data-part="lesson-one"><path d="M-108-12q-18-24-26-7-7 16 26 32 33-16 26-32-7-17-26 7Z" fill="#ce9681"/></g><g data-part="lesson-two"><path d="M-17-10q-3-23 17-23 18 0 18 20 13 1 12 14 0 15-17 16h-28q-18-5-17-19 1-11 15-8Z" fill="#a3b6a0"/><path d="M-9 27h19" stroke="#7f967b" stroke-width="5"/></g><g data-part="lesson-three"><path d="M102 24V-8m-14 31V-6m28 29v-31m-20-9v-16m13 15v-17m-30 22q-5-10-8-3l2 32q3 22 22 22 18 0 21-19v-30q-6-9-12 2v-12q-6-8-13 1-2-11-9-2-3-7-9 0Z" fill="#ddb797" stroke="#ad8d66" stroke-width="2"/></g>');
  return svg(art,body);
}
function crownRender(ctx) {
  const {time:t,scene:s,pose,attrs,actors,motion,progress,smooth,mix}=ctx,id=s.id,m=motion?1:0,e=(lo,hi)=>smooth(progress(t,lo,hi));
  ambient(ctx);pose('mark',555,628,1.2);pose('dad',355,625,1.1);pose('mom',868,617,1.1);pose('king',897,593,1.04);pose('throne',899,604,1);pose('smith',134,597,.87);pose('anvil',158,598,.8);pose('hammer',177,474,.73,-22-m*Math.sin(t*3)*28,0,0);pose('knight',1094+m*Math.sin(t*.06)*22,486,.62);
  pose('table',626,621,1);pose('cup',585,516,1.15);pose('apple',703,490,.75);pose('blocks',653,590,1.6);pose('paper-crown',809,533,.69);pose('sister',1032,617,.7);pose('lesson',640,231,1);emotion(ctx,false);humanArm(ctx,'mark','right',-18,true);
  const angry=['shout','angry','baker','sword','choice','bench','unfinished','breathe','bath','door'].includes(id);
  if(angry)emotion(ctx,id==='breathe'?true:id==='bath'||id==='door'?true:id==='bench'?t<499.909:true);
  // No arbitrary bouncing: larger gestures are tied to narrated requests and actions.
  if(['intro','blocks'].includes(id)){pose('mark',507,631,1.22);pose('blocks',679,604,1.45);opacity(ctx,'paper-crown',0);pose('mom',930,622,1.12);humanArm(ctx,'mark','right',id==='blocks'?-63:-20,true);}
  else if(['cocoa','shout','ask-cocoa'].includes(id)) {
    pose('mark',470,626,1.13);pose('mom',928,611,1.04);pose('sister',1032,624,.74);opacity(ctx,'blocks',0);opacity(ctx,'paper-crown',0);opacity(ctx,'cup',id==='ask-cocoa'?e(99.664,102):0);
    if(id==='cocoa')pose('mom',934,610,1.04,-11,0,-74);
    humanArm(ctx,'mark','right',id==='shout'?-86-m*Math.sin(t*2)*12:id==='ask-cocoa'?-55:-34,true);
    humanArm(ctx,'mom','left',id==='ask-cocoa'?-53:-20);pose('cup',mix(871,554,e(99.664,102)),516,1.1);a(ctx,'mark','[data-part="human-body"]',{transform:`translate(0 ${id==='ask-cocoa'?-m*Math.sin(t*.85)*1.8:0})`});
  } else if(['castle','fair','king','want-crown','angry','summon','crown'].includes(id)) {
    if(id==='castle'){pose('mark',mix(206,538,e(111.646,120)),630,1.18);pose('dad',mix(89,339,e(111.646,120)),628,1.12);}
    if(id==='fair'){pose('mark',563,632,1.2);pose('king',925,592,1);}
    const strike=motion?Math.sin(t*3):0;pose('smith-sparks',167,556,.75);opacity(ctx,'smith-sparks',id==='fair'?Math.max(0,-strike)*.9:.18);humanArm(ctx,'smith','right',-54-strike*27);
    if(id==='want-crown'||id==='angry'){humanArm(ctx,'mark','right',-87-m*Math.sin(t*1.6)*9,true);pose('dad',365,627,1.1,id==='want-crown'&&t>176.3?-8:0,0,-74);}
    if(id==='summon'){pose('mark',mix(535,699,e(222.257,226)),630,1.2);humanArm(ctx,'king','left',56+m*Math.sin(t*1.7)*8);}
    if(id==='crown'){
      const q=e(256.313,260.994);pose('mark',704,630,1.2);a(ctx,'king','[data-part="worn-crown"]',{opacity:1-q});a(ctx,'mark','[data-part="worn-crown"]',{opacity:q>.99?1:0});pose('floating-crown',mix(899,704,q),mix(370,443,q),.8);opacity(ctx,'floating-crown',q<.99?1:0);humanArm(ctx,'king','left',44);humanArm(ctx,'mark','right',-40,true);
    }
  } else if(['baker','ask-bread','bread','lesson-one'].includes(id)) {
    pose('baker-tent',836,493,.97);pose('baker',824,620,1.05);pose('tray',824,493,1.02);pose('dad',228,630,1.08);pose('king',1089,617,1.02);pose('throne',1090,616,.75);pose('mark',id==='ask-bread'?mix(494,606,e(311.983,315)):606,631,1.17);pose('bread',636,560,.62);
    humanArm(ctx,'baker','left',-25-m*Math.sin(t*1.7)*12);opacity(ctx,'bread',['bread','lesson-one'].includes(id)?1:0);humanArm(ctx,'mark','right',id==='baker'?-82:id==='bread'||id==='lesson-one'?-58:-34,true);
    if(id==='bread'){const q=e(331.997,334.896);pose('bread',mix(783,632,q),mix(527,537,q),.62);humanArm(ctx,'baker','left',-53);}
    if(id==='lesson-one'){humanArm(ctx,'king','left',90);a(ctx,'lesson','[data-part="lesson-two"]',{opacity:.22});a(ctx,'lesson','[data-part="lesson-three"]',{opacity:.22});}
  } else if(['sword','choice','bench','lesson-two'].includes(id)) {
    pose('sword-tent',266,477,.73);pose('crown-tent',1021,477,.73);pose('sword',270,485,.9);pose('choice-crown',1021,412,.9);pose('bench',640,624,1.1);pose('king',1086,641,1.05);pose('dad',383,632,1.08);pose('throne',1100,634,.65);pose('mark',620,632,1.2);
    if(id==='choice'){const face=t<431.7?0:Math.sin((t-431.7)*1.8);a(ctx,'mark','[data-part="human-head"]',{transform:`rotate(${m*face*9})`});humanArm(ctx,'mark','right',-40,true);}
    if(id==='bench'){pose('mark',640,615,1.17);a(ctx,'mark','[data-part="human-body"]',{transform:`translate(0 ${-4-m*Math.sin(t*.8)*2})`});humanArm(ctx,'mark','right',13,true);humanArm(ctx,'mark','left',-12,true);}
    if(id==='lesson-two'){emotion(ctx,false);humanArm(ctx,'king','left',90);a(ctx,'lesson','[data-part="lesson-three"]',{opacity:.22});}
  } else if(s.setting==='wall') {
    pose('dad',341,637,1.1);pose('king',190,638,1);pose('guard',920,472,1.01);pose('barrier',726,559,.79);pose('mark',565,637,1.18);opacity(ctx,'guard',t>=569.922?e(569.922,573):0);
    if(id==='wall'){pose('mark',mix(519,640,e(548.845,550.65)),635,1.18);humanArm(ctx,'mark','right',-80,true);}
    if(id==='stop'){pose('mark',mix(640,673,e(550.654,553.167)),635,1.18);humanArm(ctx,'dad','right',-104);humanArm(ctx,'mark','right',-24,true);}
    if(id==='rail'){const q=e(584.058,587.369);attrs(actors.rail,{transform:`rotate(${m*Math.sin(q*Math.PI*3)*4.5} 1141 465)`});pose('mark',mix(674,612,e(590.042,592)),635,1.18);humanArm(ctx,'guard','left',43);}
    if(id==='why'){humanArm(ctx,'dad','right',-55);humanArm(ctx,'mark','right',-42,true);}
    if(id==='lesson-three'){humanArm(ctx,'king','right',-103);}
    if(id==='look-down'){pose('mark',566,636,1.18,-3,0,-100);humanArm(ctx,'dad','right',-45);}
  } else if(id==='craft'||id==='wisdom') {
    pose('craft-tent',751,490,1.07);pose('table',656,621,1);pose('paper-crown',641,516,.85);pose('mark',534,631,1.18);pose('king',971,627,1.05);pose('dad',302,626,1.04);pose('throne',980,630,.7);pose('glue',718,499,.66);
    const blue=e(672.045,674.771),red=e(674.771,677.949);pose('gem-blue',mix(743,665,blue),mix(494,503,blue),.64);pose('gem-red',mix(794,641,red),mix(494,498,red),.72);opacity(ctx,'gem-blue',id==='craft'?1-blue:0);opacity(ctx,'gem-red',id==='craft'?1-red:0);humanArm(ctx,'mark','right',-70-m*Math.sin(t*1.4)*7,true);
    a(ctx,'mark','[data-part="worn-crown"]',{opacity:id==='wisdom'?1:0});
    if(id==='wisdom'){a(ctx,'king','[data-part="worn-crown"]',{opacity:1-e(705.276,709)});humanArm(ctx,'king','left',t<725.25?62:88);humanArm(ctx,'mark','right',-43,true);}
  } else if(['home','water','play','unfinished','breathe','bath','door'].includes(id)) {
    pose('blocks',649,623,1.67);pose('paper-crown',801,534,.73);pose('mark',521,631,1.18);pose('mom',919,620,1.1);
    if(id==='home'||id==='water'){pose('table',648,623,1);opacity(ctx,'blocks',0);opacity(ctx,'cup',id==='water'?e(766.008,768.175):0);pose('cup',mix(917,576,e(766.008,768.175)),516,1.08);opacity(ctx,'apple',0);humanArm(ctx,'mom','left',id==='water'?-61:-14);humanArm(ctx,'mark','right',id==='home'?-78:-54,true);}
    if(id==='play'){humanArm(ctx,'mark','right',-64,true);opacity(ctx,'paper-crown',1);}
    if(id==='unfinished'){humanArm(ctx,'mark','right',-86-m*Math.sin(t*2)*8,true);}
    if(id==='breathe'){a(ctx,'mark','[data-part="human-body"]',{transform:`translate(0 ${-m*Math.sin((t-815.901)*.82)*2.8})`});humanArm(ctx,'mark','right',-33,true);humanArm(ctx,'mom','left',19);}
    if(id==='bath'){pose('mark',mix(521,822,e(835.782,843.774)),631,1.18);humanArm(ctx,'mark','right',-19,true);}
    if(id==='door'){pose('mark',1006+e(862.657,865)*138,631,1.18);humanArm(ctx,'mark','right',-46,true);}
  } else if(s.setting==='bedroom') {
    pose('bed',556,626,1.15);pose('table',952,651,.45);pose('paper-crown',952,578,.68);pose('dad',890,631,1.12);pose('mark',451,511,.95);opacity(ctx,'darkness',id==='bed'?0:e(899.146,902)*.8);
    if(id==='bed'){pose('mark',470,596,1.15);pose('lesson',611,232,1.1);}
    else {pose('mark',446,643,.92,-90,0,-123);a(ctx,'mark','[data-part="human-head"]',{transform:'rotate(90)'});pose('blanket',487,514,1.15);humanArm(ctx,'dad','left',13);humanArm(ctx,'mark','right',60,true);humanArm(ctx,'mark','left',-60,true);}
  }
}

export const STORIES=[
  {id:'story-02',scenes:constructionScenes,frame:constructionFrame,render:constructionRender},
  {id:'story-03',scenes:workshopScenes,frame:workshopFrame,render:workshopRender},
  {id:'story-11',scenes:crownScenes,frame:crownFrame,render:crownRender}
];
