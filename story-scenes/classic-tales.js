import { createClassicArt } from '../story-art/classic-settings.js';
import { animateClassic, birdAction, personAction } from '../story-art/classic-motion.js';

const cues = rows => rows.map(([time,id,title,setting,action,extra = {}]) => ({time,id,title,setting,action,...extra}));
const actor = (id, body) => `<g data-actor="${id}">${body}</g>`;
const svg = (base, backdrop, body) => `<svg viewBox="0 0 1280 720" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">${base.defs}${backdrop}${body}</svg>`;
const roosterScenes = cues([
  [0,'home','A szegény asszony kis kakasa','yard','home'],
  [7.76,'scratch','Keresgél, kapargál','yard','scratch'],
  [11.88,'diamond','A gyémánt félkrajcár','yard','find'],
  [15.04,'emperor','Arra jön a török császár','yard','arrive'],
  [20.96,'ask','Add nekem a félkrajcárt!','yard','ask'],
  [24.56,'refuse','Kell a gazdasszonyomnak','yard','refuse'],
  [27.76,'take','A császár elveszi a pénzt','yard','take'],
  [30.68,'store','A kincseskamrába kerül','treasury','store'],
  [34.08,'fence-flight','Felszáll a kerítésre','fence','fence-flight'],
  [39.76,'fence-call','Kukurikú a kerítésen','fence','fence-call'],
  [44.8,'window-flight','A császár ablakához repül','window','window-flight',{flyAt:49.92,stillTime:51.8}],
  [52.72,'first-call','Add vissza a félkrajcárom!','window','call'],
  [57.76,'anger','Megharagszik a császár','window','anger'],
  [60.4,'well-order','A császár a kúthoz küldi','window','order'],
  [66,'well-drop','A kis kakas a kútba kerül','well','drop',{stillTime:69.8}],
  [71.84,'drink','Szídd fel begyem a vizet!','well','drink',{stillTime:76.8}],
  [79.44,'well-return','Újra az ablaknál','window','window-flight',{flyAt:79.44}],
  [83.12,'second-call','Kukurikú, török császár!','window','call'],
  [88.08,'oven-order','Az égő kemence','window','order'],
  [96.8,'oven-enter','A kakas a kemencében','oven','oven-enter',{stillTime:102}],
  [104.08,'water','Ereszd ki begyem a vizet!','oven','water',{stillTime:108.7}],
  [110.48,'fire-out','Kialszik a tűz','oven','fire-out'],
  [114.76,'oven-return','Visszarepül az ablakba','window','window-flight',{flyAt:114.76}],
  [117.36,'third-call','Visszakéri a pénzét','window','call'],
  [122.32,'hive-order','A méhes kasba!','window','order'],
  [132.08,'hive-enter','A darazsak között','hive','hive-enter'],
  [138,'wasps-in','Szídd fel begyem a darázst!','hive','wasps-in',{stillTime:141.5}],
  [144.8,'hive-return','Ismét az ablakon','window','window-flight',{flyAt:144.8}],
  [148,'fourth-call','A kakas nem adja fel','window','call'],
  [152.96,'puzzled','Mit csináljon vele?','window','puzzled'],
  [156.32,'trousers-order','A bő bugyogó','hall','trousers-order'],
  [161.92,'trousers','A kakas a bugyogóban','hall','trousers',{stillTime:166.9}],
  [170.56,'wasps-out','Ereszd ki begyem a darázst!','hall','wasps-out'],
  [177.52,'sting','A darazsak előbújnak','hall','sting'],
  [183.04,'jump','Felugrik a császár','hall','jump'],
  [185.36,'surrender','Vigyétek a kincseskamrába!','hall','surrender'],
  [194.16,'treasure','Három kád pénz','treasury','treasure'],
  [199.52,'money','Szídd fel begyem a sok pénzt!','treasury','money',{stillTime:206}],
  [208.08,'homeward','Hazaviszi a kincset','yard','homeward'],
  [209.72,'wealth','Odaadja a gazdasszonyának','yard','wealth',{stillTime:213}]
]);
function roosterFrame(scene, base) {
  const a = createClassicArt(base), s = scene.setting;
  let bg = s === 'yard' ? a.yard() : s === 'window' ? a.hall({window:true}) : ['treasury','hall'].includes(s) ? a.hall() : a.sky()+a.grass();
  let body = '';
  if (s === 'yard') {
    body += a.wrap(500,620,1,'<path d="M-105 0q20-69 63-51 42-40 92-6l51 57Z" fill="#a99770"/><path d="m-71-8 25-20m62 7 27 10m-42-37 15 10" stroke="#c6b18a" stroke-width="5"/>');
    body += actor('mother',a.person('mother',{dress:'#a68162'}));
    if (!['home','scratch','find','homeward','wealth'].includes(scene.action)) body += actor('sultan',a.person('sultan'));
    if (['find','arrive','ask','refuse','take'].includes(scene.action)) body += actor('coin',a.coin());
    if (['homeward','wealth'].includes(scene.action)) body += actor('gift',a.basket()+a.wrap(0,-30,1,a.coin())+a.wrap(27,-36,.75,a.coin()));
  }
  if (s === 'fence') bg += a.palace()+a.wrap(450,605,1,'<path d="M-340-170h680m-680 65h680" stroke="#e8d5a8" stroke-width="19"/><path d="M-310-195V25m155-220V25m155-220V25m155-220V25m155-220V25" stroke="#c5ac7e" stroke-width="22" stroke-linecap="round"/>');
  if (s === 'window') body += actor('sultan',a.person('sultan')) + (scene.action === 'order' ? actor('servant',a.person('servant',{dress:'#9cad8a'})) : '');
  if (s === 'well') {
    bg = a.sky()+a.grass()+a.wrap(1020,612,.8,a.well());
    // An open cross-section keeps the bird and the falling water level visible.
    bg += '<path d="M315 135h590v540H315Z" fill="#c7c3ac" stroke="#98977e" stroke-width="7"/><path d="M361 159h498v492H361Z" fill="#6e8f8f"/><path d="M325 234h580m-580 110h580m-580 108h580m-580 107h580M407 139v95m171 0v110m173-205v95m-344 110v108m171 0v107m173-215v108" stroke="#acae95" stroke-width="4"/>';
    body += actor('water-level','<rect x="361" width="498" height="226" rx="4" fill="#a1c6bd"/><path d="M367 15q71-10 140 0t142 0 199 0" stroke="#e0e8cb" stroke-width="5" fill="none"/>');
    body += actor('servant',a.person('servant',{dress:'#9cad8a'}));
  }
  if (s === 'oven') {
    bg = a.hall({kitchen:true})+a.wrap(880,636,1.55,a.oven());
    body += actor('flames',a.fire())+actor('spray','<path d="M0 0q89 16 175 123" fill="none" stroke="#91c3c0" stroke-width="28" stroke-linecap="round"/><path d="M4 8q88 24 170 122" fill="none" stroke="#d7e5d3" stroke-width="6"/>'+Array.from({length:5},(_,i)=>`<ellipse cx="${150+i*21}" cy="${116+i%2*23}" rx="14" ry="5" fill="#9ec4bf"/>`).join(''));
  }
  if (s === 'hive') { bg += base.tree(250,500,1.1,1)+a.wrap(960,634,1.4,a.hive()); }
  if (s === 'hive' || ['wasps-out','sting','jump','surrender'].includes(scene.action)) for(let i=0;i<7;i++) body+=actor(`wasp${i}`,a.wasp());
  if (s === 'hall') body += a.wrap(866,638,1.12,a.throne())+actor('sultan',a.person('sultan'))+actor('servant',a.person('servant',{dress:'#9cad8a'}));
  if (s === 'treasury') {
    for(let i=0;i<3;i++) { body += a.wrap(715+i*200,610,.85,a.tub()); body += actor(`gold${i}`,Array.from({length:11},(_,k)=>a.wrap(-65+k%5*30,-82-Math.floor(k/5)*14,.66,a.coin())).join('')); }
    if(scene.action==='store') body+=actor('sultan',a.person('sultan'))+actor('coin',a.coin());
  }
  body += actor('rooster',a.bird('rooster'));
  return svg(base,bg,body);
}
function roosterRender(ctx) {
  const {time:t,local:l,scene:s,host,actors,pose,attrs,motion,progress,smooth,mix}=ctx;
  const p=(start,end)=>smooth(progress(t,start,end));
  animateClassic(host,t,motion);
  let x=550,y=615,scale=1.45,walk=0,flap=0,peck=0,call=0;
  const act=s.action;
  pose('mother',205,640,1.08); pose('sultan',870,640,1.26);pose('servant',1100,640,1);
  if(act==='scratch') {x=535+(motion?Math.sin(l*.7)*28:0);peck=1;walk=.4;}
  if(act==='find') {x=570;peck=.35;pose('coin',660,596,1.4);}
  if(['arrive','ask','refuse','take'].includes(act)) {
    pose('sultan',act==='arrive'?mix(1160,905,p(15.04,19.5)):905,640,1.26);
    pose('coin',650,598,1.3); personAction(actors.sultan,t,{motion,walk:act==='arrive'?1:0,gesture:act==='ask'?1:0});
    if(act==='refuse') call=1;
    if(act==='take'){const q=p(29.6,30.35);pose('coin',mix(650,970,q),mix(598,503,q),1.3);}
  }
  if(act==='store') {x=295;pose('sultan',600,632,1.18);const q=p(31.64,33.4);pose('coin',mix(660,780,q),mix(495,527,q),1);}
  if(s.setting==='fence') {const q=act==='fence-flight'?p(36.04,37.6):1;x=mix(380,510,q);y=mix(626,435,q)-Math.sin(q*Math.PI)*75;scale=1.4;flap=q>0&&q<1?1:0;call=act==='fence-call'?1:0;}
  if(s.setting==='window') {
    x=370;y=493;scale=1.55;pose('sultan',850,644,1.35);pose('servant',1090,648,.97);
    if(act==='window-flight'){const q=p(s.flyAt,s.flyAt+1.8);x=mix(160,370,q);y=mix(650,493,q)-Math.sin(q*Math.PI)*74;flap=q<1?1:0;}
    call=act==='call'?1:0;
    personAction(actors.sultan,t,{motion,gesture:act==='order'||act==='anger'?1:0,head:act==='puzzled'?-6:0});
  }
  if(s.setting==='well') {
    const q=act==='drop'?p(66.72,68.9):1;x=610;y=mix(254,580,q);scale=1.2;flap=act==='drop'&&q<1?1:0;call=act==='drink'?1:0;
    const drink=act==='drink'?p(75.3,78.9):0;pose('water-level',0,mix(412,638,drink));attrs(actors['water-level'],{opacity:1-drink*.8});attrs(actors['water-level']?.querySelector('rect'),{height:Math.max(2,226*(1-drink))});
    pose('servant',1050,570,.82); // Outside the cutaway, looking into the well.
    scale*=1+drink*.12;
  }
  if(s.setting==='oven') {
    const q=act==='oven-enter'?p(99.3,100.8):1;x=mix(540,820,q);y=624;scale=1.3;walk=act==='oven-enter'?1:0;
    const water=act==='water'?p(105.04,109.8):act==='fire-out'?1:0;
    pose('flames',880,626,1.22);attrs(actors.flames,{opacity:1-water});
    pose('spray',890,530,.7);attrs(actors.spray,{opacity:act==='water'?Math.sin(water*Math.PI)*.95:0});
    call=act==='water'?1:0;
    if(act==='fire-out'){x=mix(820,485,p(110.48,113.9));walk=1;}
  }
  if(s.setting==='hive') {
    x=590;y=630;scale=1.5;call=act==='wasps-in'?1:0;const q=act==='wasps-in'?p(139,144.1):0;
    scale*=1+q*.12;
    for(let i=0;i<7;i++){const a=i*.9+t*(motion?.7:0);pose(`wasp${i}`,mix(875+Math.cos(a)*130,650,q),mix(390+Math.sin(a)*90,515,q),.8);attrs(actors[`wasp${i}`],{opacity:q>.97?0:1});}
  }
  if(s.setting==='hall') {
    x=520;y=640;scale=1.4;
    if(['trousers','wasps-out','sting','jump'].includes(act)) {const q=act==='trousers'?p(164.7,167):1;x=mix(520,810,q);y=mix(640,540,q);scale=mix(1.4,.53,q);attrs(actors.rooster,{opacity:act==='trousers'?1-q*.6:.4});}
    if(act==='wasps-out'||act==='sting'||act==='jump'||act==='surrender') {
      const q=act==='wasps-out'?p(171.44,176.8):1;
      for(let i=0;i<7;i++){const angle=i*.95+t*(motion?1.6:0);pose(`wasp${i}`,mix(816,900+Math.cos(angle)*115,q),mix(533,548+Math.sin(angle)*55,q),.72);attrs(actors[`wasp${i}`],{opacity:q});}
      call=act==='wasps-out'?1:0;
    }
    pose('sultan',867,act==='jump'?640-70*Math.sin(p(183.04,184.7)*Math.PI):640,1.26,act==='sting'&&motion?Math.sin(l*3)*3:0);
    personAction(actors.sultan,t,{motion,gesture:['trousers-order','surrender'].includes(act)?1:0,embrace:act==='jump'?.6:0});
    if(act==='surrender'){x=505;y=640;scale=1.4;}
  }
  if(s.setting==='treasury') {
    x=350;y=630;call=act==='money'?1:0;
    const q=act==='money'?p(203.76,207.7):0;scale*=1+q*.18;
    for(let i=0;i<3;i++){pose(`gold${i}`,mix(715+i*200,430,q),mix(610,550,q),mix(.85,.05,q));attrs(actors[`gold${i}`],{opacity:1-q});}
  }
  if(act==='homeward') {x=mix(1070,560,p(208.08,209.65));walk=1;pose('gift',x-65,561,.65);}
  if(act==='wealth') {x=665;pose('mother',255,640,1.2);const q=p(209.72,211.2);pose('gift',mix(455,335,q),mix(591,543,q),.8);personAction(actors.mother,t,{motion,gesture:.6});}
  pose('rooster',x,y,scale);
  birdAction(actors.rooster,t,{motion,walk,flap,peck,call});
}

const doveScenes = cues([
  [0,'birds','A vadgalamb és a szarka','branch','birds'],
  [2,'fragile','A vadgalamb ritkás fészke','branch','fragile'],
  [8.52,'few-twigs','Néhány szál száraz ág','branch','few-twigs'],
  [13.68,'request','Megkéri a szarkát','branch','request'],
  [18.2,'master','A fészekrakás mestere','branch','master'],
  [22.76,'safe-nest','A védett szarkafészek','branch','safe-nest'],
  [26.16,'lesson','A szarka tanítani kezd','branch','lesson'],
  [30.36,'twig','A gally a helyére kerül','branch','twig'],
  [35.2,'show','Csak így, csak így!','branch','show'],
  [39.12,'answer','A vadgalamb válaszol','branch','answer'],
  [41.68,'know','Túdom, túdom, túdom!','branch','know'],
  [44.4,'annoyed','A szarka megharagszik','branch','annoyed'],
  [48.96,'leave','Ha tudod, csináld!','branch','leave',{stillTime:52.5}],
  [53.92,'unfinished','A félbemaradt fészek','branch','unfinished']
]);
function doveFrame(scene,base) {
  const a=createClassicArt(base), early=['birds','fragile','few-twigs'].includes(scene.action);
  let bg=a.sky()+base.tree(75,689,1.5,1)+base.tree(1190,691,1.4,2)+a.branch();
  let body=a.wrap(650,573,1.14,a.nest(['master','safe-nest'].includes(scene.action)?1:early?.05:scene.action==='lesson'?.22:scene.action==='twig'?.34:.43));
  if(scene.action==='safe-nest') body+=actor('hawk',a.bird('crow'));
  body+=actor('dove',a.bird('dove'));
  if(!early&&scene.action!=='unfinished') body+=actor('magpie',scene.action==='leave'?a.bird('magpie'):'<g transform="scale(-1 1)">'+a.bird('magpie')+'</g>');
  if(['lesson','twig','show'].includes(scene.action)) body+=actor('twig',a.twig());
  return svg(base,bg,body);
}
function doveRender({time:t,local:l,scene:s,host,actors,pose,attrs,motion,progress,smooth,mix}) {
  animateClassic(host,t,motion);
  const act=s.action;
  pose('dove',360,551,1.85,act==='annoyed'?-3:0);
  let x=940,y=549,flap=0;
  if(act==='leave'){const q=smooth(progress(t,50.907,53.6));x=mix(940,1235,q);y=mix(549,224,q)-Math.sin(q*Math.PI)*45;flap=1;attrs(actors.magpie,{opacity:1-progress(t,52.8,53.8)});}
  if(act==='safe-nest'){pose('hawk',220+(motion?Math.sin(l*.5)*40:0),221,.8);birdAction(actors.hawk,t,{motion,flap:1});}
  pose('magpie',x,y,1.6);birdAction(actors.magpie,t,{motion,flap,call:['show','leave','annoyed'].includes(act)?1:0,tilt:act==='annoyed'?-8:0});
  birdAction(actors.dove,t,{motion,call:['request','answer','know'].includes(act)?1:0,tilt:act==='know'?-7:0,peck:['fragile','few-twigs','unfinished'].includes(act)?.3:0});
  if(actors.twig){const q=act==='twig'?smooth(progress(t,31,32.2)):act==='show'?1:0;pose('twig',mix(822,650,q),mix(388,545,q),.85,mix(-24,12,q));}
}

const saltScenes = cues([
  [0,'family','Az öreg király és három lánya','hall','family'],
  [12.16,'kingdoms','Három különböző ország','hall','kingdoms'],
  [19.6,'apples','Nincs három egyforma alma','hall','apples'],
  [25.92,'question','Ki szereti a legjobban?','hall','question'],
  [33.08,'eldest','Az első királykisasszony','hall','eldest'],
  [41.2,'wheat','Mint a galamb a búzát','hall','wheat'],
  [45.28,'middle','A középső királykisasszony','hall','middle'],
  [49.2,'breeze','Mint nyárban a szellőt','hall','breeze'],
  [53.36,'youngest','A legkisebb királykisasszony','hall','youngest'],
  [59.68,'salt','Ahogy az emberek a sót','hall','salt'],
  [65.36,'banish','A király haragja','hall','banish'],
  [75.76,'plead','Hiába könyörög','hall','plead'],
  [88.48,'journey','Útnak indul','forest','journey'],
  [96.72,'shelter','Szállás az odvas fában','forest','shelter'],
  [100.48,'berries','Eper, málna, szeder, mogyoró','forest','berries'],
  [108,'year','Eltelik egy esztendő','forest','year'],
  [111.28,'prince','Megérkezik a királyfi','forest','prince'],
  [117.44,'hide','Beszalad az odúba','forest','hide',{stillTime:122.4}],
  [123.36,'follow','A királyfi követi','forest','follow'],
  [125.92,'first-question','Ki van itt?','forest','first-question'],
  [127.36,'tremble','A lány meghúzódik az odúban','forest','tremble'],
  [137.28,'second-question','A királyfi újra kérdez','forest','second-question'],
  [145.52,'silent','Még mindig hallgat','forest','silent'],
  [150.8,'third-question','Harmadszor is szólítja','forest','third-question'],
  [156.56,'emerge','Kibújik az odúból','forest','emerge'],
  [163.28,'tell','Elmondja, ki ő','forest','tell'],
  [172.96,'kindness','A királyfi megszereti','forest','kindness'],
  [182.88,'hand','Gyöngéden megfogja a kezét','forest','hand'],
  [185.2,'palace','Hazavezeti a palotába','palace','palace'],
  [187.28,'dress','Aranyos, gyémántos ruha','hall','dress'],
  [198.56,'wedding','A lakodalom','hall','wedding'],
  [202.8,'peace','Békességben élnek','hall','peace'],
  [211.84,'truth','Miért kergetett el az apád?','hall','truth'],
  [221.92,'explain','Mint az emberek a sót','hall','explain'],
  [234.16,'plan','Visszafordul az apád szíve','hall','plan'],
  [245.44,'letter','Meghívó levelet ír','writing','letter'],
  [251.92,'message','Elindul a levél','palace','message'],
  [253.92,'carriage','A hatlovas hintó','palace','carriage'],
  [257.08,'welcome','Vendég az öreg király','hall','welcome'],
  [263.28,'table','Két személyre terítenek','dining','table'],
  [268.28,'serve','Az inasok hozzák az ebédet','dining','serve'],
  [273.96,'kitchen','Só nélkül főznek','kitchen','kitchen'],
  [283.6,'soup','Az öreg király megkóstolja a levest','dining','soup'],
  [291.6,'spoon-down','Leteszi a kanalat','dining','spoon-down'],
  [297.04,'missing-salt','Kifelejtették a sót?','dining','missing-salt'],
  [302,'boiled-meat','A sóbafőtt is sótalan','dining','boiled-meat'],
  [307.36,'roasts','A pecsenyét is visszaviszik','dining','roasts'],
  [320.48,'complaint','Miféle szakácsod van?','dining','complaint'],
  [329.04,'answer','A fiatal király magyarázata','dining','answer'],
  [342.16,'love-salt','Erősen szeretem a sót!','dining','love-salt'],
  [349.6,'daughter','Éppen a leányától hallotta','dining','daughter'],
  [355.44,'door','Megnyílik az ajtó','dining','door',{stillTime:360.5}],
  [362.48,'reunion','Apa és lánya újra együtt','hall','reunion'],
  [373.28,'gift','A legnagyobb ország a lányé','hall','gift'],
  [378.08,'ending','Békében élnek tovább','palace','ending']
]);
const forestActs = new Set(['journey','shelter','berries','year','prince','hide','follow','first-question','tremble','second-question','silent','third-question','emerge','tell','kindness','hand']);
function saltFrame(scene,base) {
  const a=createClassicArt(base), act=scene.action, early=scene.time<88;
  let bg=scene.setting==='forest'?a.forest():scene.setting==='palace'?a.sky()+a.palace()+a.grass():a.hall({kitchen:scene.setting==='kitchen'}), body='';
  if(early) {
    bg+=a.wrap(321,641,1.08,a.throne());body+=actor('king',a.person('king'));
    for(let i=0;i<3;i++)body+=actor(`sister${i}`,a.person('princess',{dress:['#93a69b','#ab9fbb','#d18b77'][i]}));
    if(['kingdoms','gift'].includes(act))body+=actor('map',kingdomMap());
    if(act==='apples')body+=actor('apples',appleTrio());
    if(act==='wheat')body+=actor('symbol',a.bird('dove')+a.wrap(25,30,1.1,a.seeds()));
    if(act==='breeze')body+=actor('symbol',a.leaves(0,0,3)+wind());
    if(act==='salt')body+=actor('symbol',a.salt());
  } else if(forestActs.has(act)) {
    body+=actor('princess',a.person('princess',{worn:true}));
    if(scene.time>=111.28)body+=actor('prince',a.person('prince'));
    if(act==='berries')body+=actor('basket',a.basket()+a.wrap(0,-19,.6,'<circle r="13" fill="#b86e60"/><circle cx="20" cy="8" r="10" fill="#77586e"/><ellipse cx="-21" cy="4" rx="11" ry="8" fill="#ab875d"/>'));
  } else if(['letter','message','carriage'].includes(act)) {
    if(act==='letter') {bg+=a.wrap(663,635,1.2,a.table());body+=actor('prince',a.person('prince'))+actor('letter',envelope())+actor('quill','<path d="M0 0q-40-28 10-58 17 23-10 58Z" fill="#f7efdc" stroke="#9c987b" stroke-width="2"/><path d="M0 0-8 14m8-14 9-41" stroke="#7d7964" stroke-width="2"/>');}
    if(act==='message')body+=actor('servant',a.person('messenger',{dress:'#7a9a89'}))+actor('letter',envelope());
    if(act==='carriage'){body+=actor('horses',a.horses()+'<path d="M260 522h782" stroke="#9a855b" stroke-width="3"/>');body+=actor('carriage',a.carriage())+actor('king',a.person('king'));}
  } else if(scene.setting==='kitchen') {
    bg+=a.wrap(275,632,1,a.oven())+a.wrap(275,629,.8,a.fire())+a.wrap(855,649,1,a.table());
    body+=actor('servant',a.person('cook',{dress:'#e9dfc7'}))+a.wrap(830,535,1.2,a.bowl())+a.wrap(1090,534,.85,a.salt());
  } else {
    const dining=scene.setting==='dining';
    body+=actor('prince',a.person('prince'));
    if(['welcome','reunion','gift'].includes(act)||dining)body+=actor('king',a.person('king'));
    if(!dining||act==='door')body+=actor('princess',a.person('princess',{dress:'#d1a15e',jeweled:true}));
    if(dining) {
      body+=actor('dining-table',a.table());
      body+=actor('dish', ['boiled-meat','roasts'].includes(act)?platter(act==='roasts'):a.bowl());
      body+=actor('salt',a.salt());
      if(['table','serve','roasts'].includes(act))body+=actor('servant',a.person('servant',{dress:'#99ad96'}));
      if(['soup','spoon-down'].includes(act))body+=actor('spoon','<path d="M0 0 65-37" stroke="#927d59" stroke-width="7" stroke-linecap="round"/><ellipse cx="72" cy="-41" rx="16" ry="9" fill="#c7ba91" stroke="#927d59" stroke-width="3"/>');
    }
    if(['wedding','peace'].includes(act))bg+=a.wrap(580,167,1,'<path d="M-210 0q215 122 430 0" stroke="#9caa7d" stroke-width="5" fill="none"/>'+Array.from({length:9},(_,i)=>`<circle cx="${-190+i*49}" cy="${15+Math.sin(i/8*Math.PI)*43}" r="12" fill="${i%2?'#e5c588':'#b88474'}"/>`).join(''));
    if(act==='peace')body+=actor('doves',a.bird('dove')+a.wrap(160,0,1,a.bird('dove')));
    if(act==='explain')body+=actor('symbol',a.salt());
    if(act==='gift')body+=actor('map',kingdomMap());
    if(act==='ending')body+=a.wrap(400,653,.8,a.leaves(0,0,3));
  }
  return svg(base,bg,body);
}
// Shared story symbols contain no characters; characters always use the common factories.
const kingdomMap = () => '<path d="M-131-75-31-85 44-65 139-85l-12 150-80 17-84-18-98 22Z" fill="#edddb4" stroke="#a19069" stroke-width="4"/><path d="M-33-84-37 64M44-65l3 146" stroke="#c4b386" stroke-width="3"/><path d="M-104-11q33-51 62-12M-17 1q34-79 45-12M58-11q31-25 59 4" stroke="#97ae83" stroke-width="19" fill="none"/><path d="M-103 38q90-55 191 4" stroke="#9bb9ad" stroke-width="8" fill="none"/>';
const appleTrio = () => ['#b96956','#d0ad61','#8fa16b'].map((c,i)=>`<g transform="translate(${(i-1)*84} 0) scale(${[.8,1.1,.95][i]})"><path d="M0-23q-27-24-43 3-15 31 17 50 17 12 26 0 12 13 31-1 28-24 10-50-19-23-41-2Z" fill="${c}" stroke="#9d815c" stroke-width="2.5"/><path d="M0-23 3-42" stroke="#8a7250" stroke-width="5"/><path d="M4-36q20-27 32-7-7 16-32 7Z" fill="#88a06d"/></g>`).join('');
const wind=()=>'<path d="M-60-64q43-18 81 0t90 0M-20-42q48-11 84 4" stroke="#d1dfd0" stroke-width="6" fill="none" stroke-linecap="round"/>';
const envelope=()=>'<rect x="-49" y="-28" width="98" height="57" rx="5" fill="#f6ebc9" stroke="#a28a61" stroke-width="3"/><path d="m-47-23 47 32 47-32" fill="none" stroke="#b7a172" stroke-width="3"/><circle cy="8" r="9" fill="#b76f5b"/>';
const platter=roast=>`<ellipse rx="98" ry="24" fill="#e7dbc1" stroke="#a29a7f" stroke-width="4"/><path d="M-66 0q-5-${roast?'57':'31'} 50-41 50-26 79 29l-6 20Z" fill="${roast?'#ab7753':'#c9a481'}" stroke="#917754" stroke-width="3"/><path d="M-35-29q35-19 64-3" stroke="#dfbb83" stroke-width="5" fill="none"/>`;
function saltRender(ctx) {
  const {time:t,local:l,scene:s,host,actors,pose,attrs,motion,progress,smooth,mix}=ctx, act=s.action;
  const p=(start,end)=>smooth(progress(t,start,end));animateClassic(host,t,motion);
  if(s.time<88) {
    pose('king',323,647,1.16);
    for(let i=0;i<3;i++) {pose(`sister${i}`,660+i*187,650,i===2?1.05:1.11);personAction(actors[`sister${i}`],t,{motion,gesture:(i===0&&act==='wheat')||(i===1&&act==='breeze')||(i===2&&['salt','plead'].includes(act))?.7:0});}
    personAction(actors.king,t,{motion,gesture:['question','eldest','middle','youngest','banish'].includes(act)?1:0,head:act==='banish'?-5:0});
    pose('map',775,237,1.4);pose('apples',790,240,1.2);
    pose('symbol',act==='salt'?1040:act==='wheat'?710:850,act==='wheat'?264:act==='breeze'?287:324,act==='wheat'?1:1.05);
    if(act==='plead')personAction(actors.sister2,t,{motion,embrace:.5,head:6});
    return;
  }
  pose('princess',760,641,1.15);pose('prince',570,644,1.24);pose('king',310,640,1.16);pose('servant',1110,645,1.08);
  personAction(actors.princess,t,{motion,gesture:['tell','explain'].includes(act)?.65:0});
  personAction(actors.prince,t,{motion,gesture:['truth','plan','answer','daughter','first-question','second-question','third-question'].includes(act)?.7:0});
  personAction(actors.king,t,{motion,gesture:['complaint','love-salt'].includes(act)?1:0});
  if(forestActs.has(act)) {
    let x=708,y=645,walking=0,opacity=1,scale=1.12;
    if(act==='journey'){x=mix(1115,580,p(88.48,95.8));walking=1;}
    if(act==='shelter'){x=mix(580,252,p(96.72,98.6));y=mix(645,624,p(96.72,98.6));scale=mix(1.12,.78,p(96.72,98.6));walking=1;}
    if(['year','berries'].includes(act)){x=700;pose('basket',773,573,.7);personAction(actors.princess,t,{motion,gesture:.6});}
    if(act==='prince'){pose('prince',mix(1180,960,p(111.28,116.5)),646,1.24);personAction(actors.prince,t,{motion,walk:1});}
    if(act==='hide'){const q=p(120.24,122.6);x=mix(710,253,q);y=mix(645,624,q);walking=1;opacity=1-q*.2;scale=mix(1.12,.78,q);pose('prince',960,646,1.24);}
    if(['follow','first-question','tremble','second-question','silent','third-question'].includes(act)){x=252;y=624;opacity=.77;scale=.78;pose('prince',act==='follow'?mix(960,523,p(123.36,125.7)):523,641,1.24);personAction(actors.prince,t,{motion,walk:act==='follow'?1:0,gesture:['first-question','second-question','third-question'].includes(act)?.8:0});}
    if(act==='tremble'&&motion)x+=Math.sin(t*5)*1.8;
    if(act==='emerge'){const q=p(159.52,162.6);x=mix(252,625,q);y=mix(624,645,q);scale=mix(.78,1.12,q);walking=1;pose('prince',900,641,1.24);}
    if(['tell','kindness'].includes(act)){x=625;pose('prince',900,641,1.24);personAction(actors.prince,t,{motion,head:-5});}
    if(act==='hand'){const q=p(183.28,184.8);x=635;pose('prince',mix(900,753,q),643,1.24);personAction(actors.prince,t,{motion,embrace:.45});personAction(actors.princess,t,{motion,embrace:.45});}
    pose('princess',x,y,scale);attrs(actors.princess,{opacity});if(walking)personAction(actors.princess,t,{motion,walk:walking});
    return;
  }
  if(act==='palace'||act==='ending'){const q=act==='palace'?p(185.2,187.1):1;pose('princess',mix(430,590,q),640,1.1);pose('prince',mix(590,745,q),640,1.17);personAction(actors.princess,t,{motion,walk:act==='palace'?1:0,embrace:act==='ending'?.25:0});personAction(actors.prince,t,{motion,walk:act==='palace'?1:0,embrace:act==='ending'?.25:0});}
  if(act==='dress'||act==='wedding'){pose('princess',745,641,1.3);pose('prince',516,641,1.35);personAction(actors.princess,t,{motion,embrace:act==='wedding'?.5:0});personAction(actors.prince,t,{motion,embrace:act==='wedding'?.5:0});}
  if(act==='peace')pose('doves',856,309,.64);
  if(act==='explain')pose('symbol',950,367,1.3);
  if(act==='letter'){pose('prince',440,645,1.18);pose('letter',664,492,1.3);pose('quill',599+(motion?Math.sin(t*3)*5:0),472,.8,-25);personAction(actors.prince,t,{motion,gesture:.6});}
  if(act==='message'){pose('servant',mix(370,920,p(251.92,253.8)),642,1.14);pose('letter',mix(426,976,p(251.92,253.8)),529,.95);personAction(actors.servant,t,{motion,walk:1});}
  if(act==='carriage'){const q=p(253.92,256.8);pose('horses',mix(-40,40,q),0);pose('carriage',mix(165,245,q),587,.95);pose('king',mix(165,245,q),504,.46);host.querySelectorAll('.cl-carriage-wheel').forEach(node=>attrs(node,{transform:`rotate(${motion?t*90:0})`}));}
  if(act==='welcome'){pose('king',mix(310,430,p(257.08,262.8)),642,1.18);pose('prince',710,642,1.24);pose('princess',1090,642,1.04);attrs(actors.princess,{opacity:0});personAction(actors.king,t,{motion,walk:1});}
  if(s.setting==='dining') {
    pose('king',320,655,1.22);pose('prince',950,655,1.22);pose('dining-table',640,678,1.16);pose('dish',520,552,1.1);pose('salt',782,552,.82);pose('servant',1160,649,.97);
    if(act==='serve') {const q=p(268.28,271.4);pose('dish',mix(1060,520,q),mix(513,552,q),1.1);personAction(actors.servant,t,{motion,gesture:.7});}
    if(act==='soup'){const q=p(286,290.8);pose('spoon',mix(494,357,q),mix(533,386,q),.85,-Math.sin(q*Math.PI)*12);personAction(actors.king,t,{motion,gesture:.65});}
    if(act==='spoon-down'){const q=p(291.6,293.2);pose('spoon',mix(357,453,q),mix(386,558,q),.85,mix(0,25,q));}
    if(act==='roasts'){const q=p(310,315.2);pose('dish',mix(520,1065,q),mix(552,511,q),1.1);personAction(actors.servant,t,{motion,gesture:.7});}
    if(act==='door'){const q=p(358.64,361.9);pose('princess',mix(638,692,q),mix(515,613,q),mix(.8,1.12,q));}
  }
  if(act==='kitchen'){pose('servant',640,650,1.18);personAction(actors.servant,t,{motion,gesture:.65});}
  if(act==='reunion'||act==='gift'){const q=act==='reunion'?p(362.48,365.4):1;pose('king',mix(320,472,q),649,1.2);pose('princess',mix(750,618,q),649,1.16);pose('prince',890,649,1.24);personAction(actors.king,t,{motion,embrace:.65});personAction(actors.princess,t,{motion,embrace:.65});pose('map',692,314,.9);}
}

export const STORIES = [
  {id:'story-13',scenes:roosterScenes,frame:roosterFrame,render:roosterRender},
  {id:'story-14',scenes:doveScenes,frame:doveFrame,render:doveRender},
  {id:'story-15',scenes:saltScenes,frame:saltFrame,render:saltRender}
];
