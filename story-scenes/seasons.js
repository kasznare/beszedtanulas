import { createSeasonsArt } from '../story-art/seasons.js';

// Cumulative word-boundary anchors from the existing Noémi MP3 recordings.
// Times never come from estimated reading speed or wall-clock animation.
const swim = [
  [0,'hot','Forró reggel','summer-town','hot'],
  [26.46,'news','Megnyitott a strand!','summer-town','arrival'],
  [50.66,'depart','Irány a tópart','summer-town','travel'],
  [56.42,'beach','A Tóparti Strand','shore','welcome'],
  [77.74,'teacher','Béka bácsi','shore','teacher'],
  [101.23,'honesty','Mit tudunk már?','shore','conversation'],
  [136.70,'admit','Pötty őszinte válasza','shore','conversation'],
  [163.61,'first-water','A sekély tanmedence','pool','enter'],
  [180.54,'first-splash','Turbó nagy csobbanása','pool','splash',{splashAt:189.74,newspaper:true}],
  [213.16,'apology','Az átázott újság','pool','apology',{newspaper:true}],
  [245.91,'safe-splash','Csobbanás az üres részen','pool','splash',{splashAt:259.89}],
  [264.46,'lesson','Előbb megszokjuk a vizet','pool','lesson'],
  [291.98,'blue-bubbles','Pötty levegőt fúj','pool','breathe',{focus:'potty',dips:[296.90]}],
  [304.91,'yellow-bubbles','Turbó újra próbálja','pool','breathe',{focus:'turbo',dips:[307.30,321.18]}],
  [331.79,'red-bubbles','Villám is gyakorol','pool','breathe',{focus:'villam',dips:[345.46,359.69,365.04]}],
  [377.69,'float-blue','A víz megtart','pool','float',{focus:'potty'}],
  [418.03,'float-all','Nem kell harcolni a vízzel','pool','float-learning'],
  [463.80,'short-lengths','Néhány méter úszás','pool','practice'],
  [511.69,'rule','Ma még a medencében maradunk','pool','teacher-leaves'],
  [541.05,'far-buoy','A messzi sárga bója','shore','watch-buoy'],
  [568.36,'swimmers','A gyakorlott úszók','shore','other-swimmers'],
  [612.89,'ball','Egy labda a tóban','shore','ball-drift'],
  [633.62,'stop','Pötty figyelmeztet','shore','block'],
  [659.33,'into-lake','Villám mégis elindul','shore','get-ball'],
  [683.52,'too-far','Messze került a part','lake','tired'],
  [716.15,'friends','Turbó megállítja Pöttyöt','shore','block-rescue'],
  [741.42,'noodle','Egy hosszú úszórúd','shore','noodle'],
  [760.66,'reach','Fogd meg!','shore','reach'],
  [777.36,'pull','Együtt húzzák a partra','shore','pull'],
  [791.96,'safe','Újra biztonságban','shore','ball-return'],
  [814.84,'return','Béka bácsi visszatér','shore','teacher-return'],
  [846.86,'difference','Egy kicsit tudni fontos különbség','shore','conversation'],
  [889.72,'wise','Turbó okos döntése','shore','conversation',{focus:'turbo'}],
  [910.67,'next-day','Másnap újra tanulnak','pool','lesson'],
  [941.78,'training','Lebegés, buborékok, pihenés','pool','training'],
  [963.22,'open-water','Most már együtt a tóra','shore','vests',{vests:true}],
  [989.56,'slow-swim','Lassan, egymásra figyelve','lake','swim',{vests:true}],
  [1001.03,'touch-buoy','Elérik az első bóját','lake','touch-buoy',{vests:true}],
  [1044.57,'together-home','Együtt indulnak vissza','lake','home-swim',{vests:true}],
  [1075.12,'water-wonder','A víz csodálatos hely','shore','water-ending',{vests:true}]
];

const snow = [
  [0,'white-town','Minden fehér lett','snow-town','snow-morning'],
  [32.44,'red-spin','Villám kereke kipörög','snow-town','wheel-spin',{focus:'villam'}],
  [49.76,'yellow-spin','Turbó erőből próbálja','snow-town','wheel-spin',{focus:'turbo'}],
  [75.12,'gentle','Pötty óvatosan indul','snow-town','gentle-start'],
  [98.30,'less-gas','Kevesebb gázzal könnyebb','snow-town','gentle-all'],
  [121.75,'snowplows','A hókotrók dolgoznak','snow-road','snowplows'],
  [137.95,'warning','Az öreg hókotró figyelmeztet','snow-road','plow-talk'],
  [204.20,'uphill','A letakarított hegyi út','snow-road','travel'],
  [216.53,'sliding','Villám továbbcsúszik','snow-road','slide'],
  [250.01,'ice','A hó alatt csúszós jég','snow-road','inspect-ice'],
  [269.88,'slow-turn','Lassabban már sikerül a kanyar','snow-road','slow-turn'],
  [279.65,'barrier','A Fenyves-kanyar lezárva','snow-barrier','barrier'],
  [303.65,'temptation','Szépnek látszik, de lezárták','snow-barrier','barrier-talk'],
  [350.32,'turn-back','Megfordulnak','snow-barrier','turn-back'],
  [369.72,'avalanche','Megmozdul a hegyoldal','snow-barrier','avalanche'],
  [390.58,'reverse','Gyorsan hátratolatnak','snow-barrier','reverse'],
  [411.00,'quiet','A sorompót elborította a hó','snow-rescue','quiet'],
  [444.25,'bell','Csilingelés a hó alól','snow-rescue','bell'],
  [478.24,'red-hat','Egy piros sapka kandikál ki','snow-rescue','buried'],
  [502.25,'csipi','Csipit betemette a lavina','snow-rescue','csipi-talk'],
  [524.92,'careful','Megállnak a biztonságos úton','snow-rescue','rescue-plan'],
  [550.78,'help','Pötty segítségért indul','snow-rescue','fetch-help'],
  [577.70,'stay','Villám és Turbó Csipivel marad','snow-rescue','wait-csipi'],
  [613.88,'machines','Megérkeznek a mentőgépek','snow-rescue','rescue-arrive'],
  [633.81,'probe','Megvizsgálják a havat','snow-rescue','probe'],
  [646.605,'dig','Óvatosan kiássák Csipit','snow-rescue','dig'],
  [662.95,'free','Csipi újra szabad!','snow-rescue','free'],
  [669.85,'town','Visszaértek Autóvárosba','snow-town','town-snowman'],
  [696.446,'build-plan','Építsünk egy nagy hóautót!','snow-town','snowcar-plan'],
  [715.48,'build','Görgetik, tolják és igazítják','snow-town','snowcar-build'],
  [726.47,'snow-car','Elkészült a nagy hóautó','snow-town','snowcar'],
  [754.73,'sunset','Hócsillogás az esti fényben','snow-town','snowcar-evening',{night:true}],
  [807.30,'tomorrow','Másnap is játszanak vele','snow-town','snowcar-broken'],
  [826.06,'worth-it','Érdemes volt megépíteni','snow-town','snow-ending']
];

const skate = [
  [0,'rink','A befagyott műjégpálya','rink','rink-arrival'],
  [21.593,'watch','Ügyes korcsolyázók','rink','watch-skater'],
  [54.11,'teacher','Frici bácsi korcsolyát ad','rink','fit-skates'],
  [84.13,'fall-safely','Előbb biztonságosan elesni','rink','safe-fall'],
  [111.51,'blue-cone','Az első kék bója','rink','blue-cone'],
  [117.55,'blue-first','Pötty első csusszanásai','rink','blue-slide'],
  [135.954,'blue-fall','Pötty elesik és feláll','rink','blue-fall'],
  [153.79,'yellow-fast','Turbó túl gyorsan indul','rink','yellow-fast'],
  [185.77,'spin','Turbó megpördül','rink','yellow-spin'],
  [202.67,'snowbank','Puha hókupacban landol','rink','yellow-snowbank'],
  [228.175,'climb-out','Turbó lerázza a havat','rink','yellow-shake'],
  [247.95,'red-first','Villám eléri a bóját','rink','red-slide'],
  [271.247,'turn-falls','A fordulás még nehéz','rink','red-falls'],
  [287.02,'not-yet','Nem rossz, csak még tanulja','rink','teacher-talk'],
  [323.640,'try-again','Újabb és újabb próbálkozás','rink','red-practice'],
  [335.93,'seventh','Hetedikre sikerül!','rink','red-turn'],
  [350.488,'again','Még egyszer, még egyszer!','rink','turns'],
  [373.77,'braking','A piros fékezővonal','rink','brake-lesson'],
  [384.93,'brake-blue','Pötty túl korán fékez','rink','brake-blue'],
  [398.47,'brake-yellow','Turbó egyre közelebb áll meg','rink','brake-yellow'],
  [413.35,'brake-red','Villám pontosan megáll','rink','brake-red'],
  [420.37,'morning-practice','Csusszanás, fordulás, felállás','rink','skate-practice'],
  [444.92,'large-rink','Megnyílik a nagy pálya','rink','large-rink'],
  [466.99,'outer-lap','A külső körön maradnak','rink','lap'],
  [487.22,'jump','A fekete sportautó ugrása','rink','black-jump'],
  [507.696,'watch-only','Ma még csak nézik az ugrást','rink','watch-jump'],
  [539.36,'bad-landing','A sportautó rosszul érkezik','rink','black-fall'],
  [561.49,'check','Frici bácsi odasiet','rink','black-help'],
  [601.29,'even-experts','Az ügyesek is elesnek','rink','teacher-talk'],
  [664.74,'evening','Felkapcsolják az apró lámpákat','rink','lap',{night:true}],
  [695.76,'ask','Versenyezhetünk?','rink','ask-race',{night:true}],
  [738.21,'line-up','Három, kettő, egy…','rink','race-start',{night:true}],
  [756.33,'race','Rajt!','rink','race',{night:true}],
  [774.63,'finish','Átsiklanak a kék vonalon','rink','race-finish',{night:true}],
  [788.63,'red-line','Mindhárman lefékeznek','rink','race-brake',{night:true}],
  [808.17,'success','Sikerült megállni!','rink','skate-success',{night:true}],
  [844.84,'learning','Sok elesés és sok felállás','rink','teacher-talk',{night:true}],
  [869.71,'last-lap','Még egy boldog kör','rink','last-lap',{night:true}]
];

const island = [
  [0,'good-swimmers','Már jól tudnak úszni','pool','practice'],
  [30.80,'map','Béka bácsi különös térképe','shore','map'],
  [54.00,'three-islands','Három sziget a tó túloldalán','lake','island-map'],
  [90.30,'jackets','Jól látható úszómellények','shore','vests',{vests:true}],
  [122.12,'together','Együtt indulunk és érkezünk','shore','teacher',{vests:true}],
  [138.57,'splash','Turbó nagy csobbanása','shore','splash',{vests:true,splashAt:144.60}],
  [152.88,'swim','Az első igazi vízi kaland','lake','swim',{vests:true}],
  [176.23,'reed-island','Megérkeznek a Nádszigetre','reeds','reed-entry',{vests:true}],
  [193.22,'reed-path','Kanyargó vízi ösvény','reeds','reed-path',{vests:true}],
  [213.45,'lost','Merre jöttünk?','reeds','lost',{vests:true}],
  [254.80,'leaves','Pötty észreveszi a sodródó leveleket','reeds','leaves',{vests:true}],
  [273.60,'current-map','A térkép és az áramlat','reeds','current-map',{vests:true}],
  [306.32,'follow-leaves','Követik a lassú leveleket','reeds','follow-leaves',{vests:true}],
  [313.49,'open-lake','Újra előttük a nyílt tó','lake','swim',{vests:true}],
  [323.17,'gull-rock','Pihenő a Sirálysziklán','rock-island','rock-rest',{vests:true}],
  [334.50,'picnic','Alma, kifli és vizes palacsinta','rock-island','picnic',{vests:true}],
  [364.25,'distant','Látják a Kerek-szigetet','rock-island','look-island',{vests:true,variant:'distant-island'}],
  [378.04,'rest','Előbb pihennek tíz percet','rock-island','rest',{vests:true,variant:'distant-island'}],
  [408.95,'far','A sziget még mindig messze','lake','swim-current',{vests:true,variant:'distant-island'}],
  [443.74,'buoy','A bója mutatja az áramlatot','lake','current-buoy',{vests:true,variant:'distant-island'}],
  [478.10,'angle','Kicsit az áramlattal szemben','lake','angle-swim',{vests:true,variant:'distant-island'}],
  [512.56,'landing','A kerék homokot ér','island','landing',{vests:true}],
  [520.75,'explore','Kagylók, kövek és kidőlt fatörzs','island','explore',{vests:true}],
  [542.38,'cove','Egy rejtett, nyugodt öböl','lagoon','cove',{vests:true}],
  [559.75,'cave-mouth','Félig víz alatti barlangnyílás','lagoon','cave-mouth',{vests:true}],
  [586.67,'cave','Belépnek a hűvös barlangba','cave','cave-swim',{vests:true}],
  [599.83,'echo','Hahó! Palacsinta!','cave','echo',{vests:true}],
  [628.10,'blue-light','Kék fény dereng előttük','cave','blue-light',{vests:true}],
  [649.09,'hidden-lagoon','A sziget titkos lagúnája','lagoon','lagoon-swim',{vests:true}],
  [675.75,'fish','Apró halak a türkiz vízben','lagoon','fish',{vests:true}],
  [690.58,'carp','Turbó és a nagy ponty','lagoon','carp',{vests:true}],
  [712.96,'float','Nevetnek, lebegnek és felfedeznek','lagoon','lagoon-float',{vests:true}],
  [721.39,'thunder','Mennydörgést hallanak','lagoon','thunder',{vests:true}],
  [733.97,'out','Azonnal kijönnek a vízből','lagoon','leave-water',{vests:true}],
  [764.34,'path','Pötty ösvényt talál a bokrok között','island-path','climb',{vests:true}],
  [778.33,'support','Turbó megtámasztja Villámot','island-path','support',{vests:true}],
  [793.21,'old-hut','A Kerek-szigeti őrház','island-path','hut-arrival',{vests:true}],
  [808.55,'shelter','Behúzódnak a vihar elől','hut-inside','shelter',{vests:true}],
  [825.92,'window','Odakint hullámos a tó','hut-inside','window',{vests:true}],
  [837.17,'waiting','Kivárják, amíg biztonságos','hut-inside','wait-storm',{vests:true}],
  [865.12,'clear','Végre kitisztul az ég','shore','clear',{vests:true}],
  [878.94,'home','Együtt úsznak hazafelé','lake','home-swim',{vests:true}],
  [894.70,'warm-rocks','Pihenés a meleg parti köveken','shore','warm-rocks',{vests:true,night:true,variant:'distant-island'}],
  [924.50,'new-places','Olyan helyekre is eljutottak…','shore','conversation',{vests:true,night:true,variant:'distant-island'}],
  [968.52,'island-evening','A Kerek-sziget az esti ködben','shore','island-evening',{vests:true,night:true,variant:'distant-island'}],
  [982.26,'mystery','Fény villan az őrház ablakában','shore','mystery',{vests:true,night:true,variant:'distant-island'}],
  [1013.43,'homewards','Hárman együtt hazafelé','shore','homewards',{vests:true,night:true,variant:'distant-island'}]
];

const colors = { villam: 'red', turbo: 'yellow', potty: 'blue' };
const names = Object.keys(colors);
const wrap = (name, content, extras = '') => `<g data-actor="${name}" ${extras}>${content}</g>`;
const isWater = scene => ['pool','lake','reeds','lagoon','cave'].includes(scene.setting);

function frame(scene, art, family) {
  const s = createSeasonsArt(art), a = scene.action;
  let extra = '';
  if (family === 'swim' || family === 'island') {
    extra += wrap('buoy', s.buoy()) + wrap('bubbles', s.bubbles()) + wrap('splash', s.splash());
    extra += wrap('ball', s.ball()) + wrap('noodle', s.noodle()) + wrap('teacher', s.instructor());
    if (scene.newspaper) extra += wrap('cabri', art.raceCar({color:'silver'})) + wrap('newspaper', s.newspaper());
    if (['ball-drift','block','get-ball','tired','block-rescue','noodle','reach','pull','ball-return'].includes(a)) extra += wrap('kid', art.raceCar({color:'green'}));
    if (a === 'other-swimmers') extra += wrap('visitor-one', art.raceCar({color:'silver'})) + wrap('visitor-two', art.raceCar({color:'green'}));
    if (family === 'island') {
      extra += wrap('map', s.map()) + wrap('leaves', s.leaves()) + wrap('picnic', s.picnic()) + wrap('shells', s.shells()) + wrap('log', s.log()) + wrap('lamp', s.lamp());
      if (['fish','carp','lagoon-swim','lagoon-float'].includes(a)) extra += [0,1,2,3,4].map(i=>wrap(`fish-${i}`,s.fish(i === 4))).join('');
      if (['cove','cave-mouth'].includes(a)) extra += wrap('cave-mouth',s.caveMouth());
      if (a === 'mystery') extra += wrap('mystery-light',s.mysteryLight());
      if (a === 'island-evening' || a === 'mystery' || a === 'homewards') extra += wrap('mist',s.mist());
      if (a === 'thunder') extra += wrap('lightning',s.lightning());
    }
  } else if (family === 'snow') {
    // The avalanche is scenery behind rescue vehicles; only the smaller
    // foreground bank hides Csipi while the workers uncover him.
    if (['avalanche','reverse','quiet','bell','buried','csipi-talk','rescue-plan','fetch-help','wait-csipi','rescue-arrive','probe','dig','free'].includes(a)) extra += wrap('avalanche',s.snowbank(2.5));
    if (['snowplows','plow-talk','rescue-arrive','probe','dig','free'].includes(a)) extra += wrap('plow',s.snowplow()) + wrap('plow-two',s.snowplow());
    if (['rescue-arrive','probe','dig','free'].includes(a)) extra += wrap('tracked',s.snowplow(true)) + wrap('probe',s.probe()) + wrap('shovel',s.shovel());
    if (scene.setting === 'snow-barrier') extra += wrap('barrier',s.barrier());
    if (scene.setting === 'snow-rescue') extra += wrap('csipi',s.snowplow(true,true)) + wrap('buried-snow',s.snowbank(1.3));
    if (a === 'town-snowman' || a === 'snowcar-plan') extra += wrap('snowman',s.snowman()) + wrap('child',art.girl());
    if (a.startsWith('snowcar') || a === 'snow-ending') extra += wrap('snowcar',s.snowCar(a === 'snowcar-broken' || a === 'snow-ending'));
    if (a === 'snowcar-build' || a === 'wheel-spin') extra += wrap('snow-puff',s.snowbank(.5));
    if (['snowcar-evening','snowcar','snow-ending'].includes(a)) extra += wrap('street-lamp',s.streetLamp());
  } else {
    extra += wrap('teacher',s.instructor('van')+s.skate()) + wrap('cone',s.cone()) + wrap('snowbank',s.snowbank());
    if (['watch-skater','watch-jump','black-jump','black-fall','black-help','large-rink'].includes(a)) extra += wrap('black-car',art.raceCar({color:'silver'})+'<path d="M25 69h166l43 15q9 4 13 15H14V88q2-10 11-19Z" fill="#435762" opacity=".94"/>'+s.skate());
    if (a === 'black-help') extra += wrap('worker-one',art.raceCar({color:'green'})) + wrap('worker-two',art.raceCar({color:'silver'}));
    if (['brake-lesson','brake-blue','brake-yellow','brake-red','race-start','race','race-finish','race-brake','skate-success'].includes(a)) extra += wrap('braking-line',s.brakingLines());
  }
  const carMarkup = names.map(name => wrap(name, art.raceCar({color:colors[name],accessory:family === 'skate' ? 'skates' : ''}) + (scene.vests ? s.jacket() : '') + (isWater(scene) ? '<g data-swim-wake><path d="M-16 143q62 14 127 0t133 0" fill="none" stroke="#cff7f5" stroke-width="6" stroke-linecap="round" opacity=".7"/></g>' : ''))).join('');
  return `<svg viewBox="0 0 1280 720" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">${art.defs}${s.defs}${s.background(scene.setting,{night:scene.night,variant:scene.variant,storm:['thunder','leave-water','climb','support','hut-arrival'].includes(a)})}${extra}${carMarkup}</svg>`;
}

function atmosphere({time:t,motion,host,attrs}) {
  for (const cloud of host.querySelectorAll('[data-seasons-cloud]')) {
    const i=Number(cloud.dataset.seasonsCloud), x=Number(cloud.dataset.homeX), y=Number(cloud.dataset.homeY), scale=Number(cloud.dataset.scale);
    const dx=motion ? ((x+t*(2.0+i*.25)+250)%1770)-250 : x;
    attrs(cloud,{transform:`translate(${dx} ${y}) scale(${scale})`});
  }
  for (const plant of host.querySelectorAll('[data-seasons-sway],[data-seasons-reed]')) {
    const i=Number(plant.dataset.seasonsSway||plant.dataset.seasonsReed), x=Number(plant.dataset.homeX), y=Number(plant.dataset.homeY), scale=Number(plant.dataset.scale||1), angle=motion ? Math.sin(t*.8+i)*2.2 : 0;
    attrs(plant,{transform:`translate(${x} ${y}) scale(${scale}) rotate(${angle})`});
  }
  for (const wave of host.querySelectorAll('[data-wave]')) { const i=Number(wave.dataset.wave); attrs(wave,{transform:`translate(${motion ? Math.sin(t*.7+i)*18 : 0} ${motion ? Math.sin(t*.9+i)*3 : 0})`,opacity:.35+(motion ? Math.sin(t*1.1+i)*.17 : 0)}); }
  for (const flake of host.querySelectorAll('[data-flake]')) { const i=Number(flake.dataset.flake);attrs(flake,{cx:motion?((i*187+t*12+27)%1320)-20:(i*187+27)%1280,cy:motion?(i*113+t*(22+i%5*4)+19)%740-10:(i*113+19)%720}); }
  for (const rain of host.querySelectorAll('[data-rain]')) { const i=Number(rain.dataset.rain), inside=rain.closest('[data-actor="window-rain"]');attrs(rain,{transform:motion?`translate(${-((t*11+i*5)%19)} ${(t*37+i*19)%(inside?38:90)})`:'translate(0 0)'}); }
  for (const gull of host.querySelectorAll('[data-seasons-gull]')) {
    const i=Number(gull.dataset.seasonsGull),x=Number(gull.dataset.homeX),y=Number(gull.dataset.homeY),p=motion?t:0;
    attrs(gull,{transform:`translate(${x+Math.sin(p*.13+i)*91} ${y+Math.sin(p*.7+i)*13})`});
    attrs(gull.querySelector('[data-gull-wing="left"]'),{transform:`rotate(${motion?Math.sin(t*3+i)*12:0})`});attrs(gull.querySelector('[data-gull-wing="right"]'),{transform:`rotate(${motion?-Math.sin(t*3+i)*12:0})`});
  }
  for (const bubble of host.querySelectorAll('[data-bubble]')) {const i=Number(bubble.dataset.bubble);attrs(bubble,{transform:motion?`translate(${Math.sin(t*2+i)*6} ${-((t*23+i*11)%66)})`:'translate(0 -15)',opacity:motion?.45+Math.sin(t*2+i)*.25:.6});}
  for (const leaf of host.querySelectorAll('[data-floating-leaf]')) {const i=Number(leaf.dataset.floatingLeaf);attrs(leaf,{transform:`translate(${motion?(t*7+i*13)%92:26} ${motion?Math.sin(t*.8+i)*4:0})`});}
  for (const wake of host.querySelectorAll('[data-swim-wake]')) attrs(wake,{transform:`translate(${motion?Math.sin(t*2.2)*8:0} ${motion?Math.sin(t*1.2)*2:0})`,opacity:motion?.65+Math.sin(t*1.9)*.25:.8});
}

function render(ctx, family) {
  const {time:t,local:l,scene:s,actors,pose,attrs,progress,smooth,mix,motion}=ctx, a=s.action;
  // Hidden props also receive a fresh pose. Backward seeking must not retain a
  // transform from a later action in the same scene (e.g. rising bubbles).
  for (const actor of Object.values(actors)) attrs(actor,{transform:'translate(0 0)',opacity:1});
  const bob=(seed,amount=3)=>motion?Math.sin(t*1.7+seed)*amount:0;
  const put=(name,x,y,scale=.75,angle=0)=>{if(actors[name])pose(name,x,y,scale,angle,125,100);};
  const opacity=(name,value)=>{if(actors[name])attrs(actors[name],{opacity:value});};
  const p=(start=0,end=8)=>smooth(progress(l,start,end));
  const move=(name,x1,y1,x2,y2,start=0,end=8,scale=.75,angle=0)=>put(name,mix(x1,x2,p(start,end)),mix(y1,y2,p(start,end))+bob(names.indexOf(name),isWater(s)?4:1),scale,angle);
  names.forEach((name,i)=>put(name,135+i*292,470+(i%2)*27,.77,isWater(s)?bob(i,2):0));
  for (const name of ['buoy','bubbles','splash','ball','noodle','map','leaves','picnic','shells','log','lamp','mist','mystery-light','window-rain','lightning','plow','plow-two','tracked','probe','shovel','snow-puff','barrier','avalanche','csipi','buried-snow','cone','snowbank','black-car','braking-line']) opacity(name,0);
  put('teacher',965,387,.72);put('kid',85,603,.42);put('cabri',884,468,.73);put('newspaper',949,447,.7);
  opacity('teacher',family==='snow'?0:1);
  if(isWater(s)) names.forEach((name,i)=>put(name,188+i*280,490+(i%2)*22+bob(i,4),.73,bob(i,2)));
  if(family==='swim'||family==='island') {
    if(['lake','shore','reeds'].includes(s.setting)){opacity('buoy',1);put('buoy',1055,379+bob(1,5),.63);}
    if(['lake','reeds','cave','lagoon'].includes(s.setting))put('teacher',986,501+bob(3,4),.63,bob(3,2));
    if(a==='hot'){put('villam',229,542,.9,-3);put('turbo',847,467,.82);put('potty',-270,550,.8);}
    if(a==='arrival'){move('potty',-245,566,544,539,0,6,.85);put('turbo',868,464,.8);put('villam',220,551,.83);}
    if(a==='travel') names.forEach((n,i)=>move(n,128+i*295,537,563+i*295,537,0,5,.73));
    if(['welcome','teacher','conversation','lesson','teacher-return','apology'].includes(a)) {names.forEach((n,i)=>put(n,117+i*253,512+(i%2)*18,.78,bob(i,1)));put('teacher',950,435,.8,bob(3,1));if(a==='teacher-return')move('teacher',1340,435,950,435,0,6,.8);}
    if(a==='enter') names.forEach((n,i)=>move(n,185+i*250,480,261+i*183,515,1+i*3,7+i*3,.72,-2));
    if(a==='splash'){
      const event=s.splashAt-s.time, q=progress(l,event-4,event);put('turbo',mix(373,533,q),mix(463,517,q)-Math.sin(q*Math.PI)*109,.78,-14*Math.sin(q*Math.PI));
      opacity('splash',l>=event&&l<event+5?Math.max(.1,1-(l-event)/5):0);put('splash',654,600,1.4);if(l>event+5)put('turbo',534,506+bob(1),.78);
    }
    if(a==='breathe'){
      const name=s.focus, i=names.indexOf(name), dip=s.dips.find(d=>t>=d&&t<d+6);
      if(dip!==undefined){const u=progress(t,dip,dip+6),depth=Math.sin(u*Math.PI);put(name,188+i*280,490+(i%2)*22+depth*55,.73,depth*7);opacity('bubbles',depth);put('bubbles',308+i*280,547,.7);}
    }
    if(a==='float'){put('villam',150,490,.75);put('potty',436,508+bob(2,5),.86,-16);put('turbo',749,511,.72);put('teacher',1006,475,.6);}
    if(a==='float-learning'){names.forEach((n,i)=>put(n,195+i*280,506+bob(i,4),.75,n==='villam'&&t<439.73?Math.sin(t*5)*12:-12));}
    if(['practice','training'].includes(a)){names.forEach((n,i)=>put(n,164+i*270+Math.sin(l*.28+i)*47,503+bob(i,5),.7,bob(i,4)));if(a==='training'){opacity('bubbles',1);put('bubbles',584,542,.7);}}
    if(a==='teacher-leaves'){move('teacher',972,427,1370,427,22,27,.72);}
    if(a==='watch-buoy'){put('villam',572,471,.87);put('potty',319,540,.72);put('turbo',75,516,.78);put('buoy',1063,366+bob(0),.36);}
    if(a==='other-swimmers'){put('visitor-one',924+Math.sin(l*.5)*54,439,.35);put('visitor-two',1028+Math.sin(l*.5+1)*55,494,.37);put('buoy',1160,428,.44);}
    if(['ball-drift','block','get-ball','tired','block-rescue','noodle','reach','pull','ball-return'].includes(a)){opacity('ball',1);put('ball',850+bob(2,10),528+bob(0,4),.78);put('villam',584,446+bob(0,4),.8);put('potty',323,550,.72);put('turbo',52,530,.78);opacity('teacher',0);}
    if(a==='ball-drift')move('ball',467,535,911,468,4,14,.8);
    if(a==='block'){put('potty',530,505,.73,-8);put('villam',285,487,.8);}
    if(a==='get-ball'){move('villam',310,487,810,469,0,20,.75);put('ball',956,536,.8);}
    if(a==='tired'){put('villam',663,487+bob(0,8),.86,motion?Math.sin(t*5)*7:5);put('ball',857,558,.8);put('potty',81,490,.43);put('turbo',211,497,.43);}
    if(a==='block-rescue'){put('villam',911,411+bob(0,7),.57,motion?Math.sin(t*5)*8:6);move('potty',235,535,431,497,0,3,.78);put('turbo',603,502,.75,-7);put('ball',1010,511,.59);}
    if(a==='noodle'){put('villam',942,434+bob(0,7),.65);put('potty',263,556,.73);put('turbo',543,499,.8);opacity('noodle',1);put('noodle',649,581,.85,-18);}
    if(a==='reach'){put('villam',868,456+bob(0,3),.73);put('potty',115,545,.73);put('turbo',395,506,.8);opacity('noodle',1);move('noodle',509,581,674,570,0,8,.98,-17);put('ball',1024,550,.75);}
    if(a==='pull'){move('villam',868,456,524,506,0,12,.75);move('turbo',395,506,124,530,0,12,.8);move('potty',115,545,28,559,0,12,.73);opacity('noodle',1);move('noodle',674,570,330,597,0,12,.98,-14);move('ball',1024,550,679,600,0,12,.7);}
    if(a==='ball-return'){put('villam',325,506,.8,bob(0,1));put('kid',658,570,.52);move('ball',563,590,684,618,11,16,.7);opacity('noodle',1);put('noodle',247,641,.85,3);}
    if(a==='vests'){names.forEach((n,i)=>put(n,95+i*269,516,.8,bob(i,1)));}
    if(['swim','home-swim','swim-current','angle-swim','cave-swim','blue-light','lagoon-swim'].includes(a)){
      names.forEach((n,i)=>put(n,163+i*278+Math.sin(l*.22+i)*55,483+(i%2)*37+bob(i,5),.73,a==='angle-swim'?-8:bob(i,3)));
      if(a==='home-swim')names.forEach((n,i)=>move(n,253+i*269,480+i%2*45,127+i*269,510+i%2*34,0,Math.min(16,s.until-s.time),.75));
    }
    if(a==='touch-buoy'){put('buoy',751,498+bob(0,3),.75);names.forEach((n,i)=>move(n,70+i*240,496+i%2*35,196+i*170,496+i%2*35,i*5,i*5+4,.72));}
    if(a==='water-ending'){names.forEach((n,i)=>put(n,141+i*282,510,.79));put('teacher',961,448,.75);}
    if(a==='map'||a==='island-map'||a==='current-map'){opacity('map',1);put('map',494,538,.97,-4);put('potty',449,378,.8);put('villam',102,470,.8);put('turbo',784,460,.8);put('teacher',913,362,.77);}
    if(['reed-entry','reed-path','follow-leaves'].includes(a)){
      names.forEach((n,i)=>put(n,306+(2-i)*243+Math.sin(l*.4+i)*42,492+(i%2)*50+bob(i,4),.64,Math.sin(l*.4+i)*5));put('teacher',44,492,.6);
      if(a==='follow-leaves'){opacity('leaves',1);put('leaves',545,641,.82);}
    }
    if(a==='lost'){names.forEach((n,i)=>put(n,208+i*275,500+(i%2)*40,.72,motion?Math.sin(t*.8+i)*4:0));put('teacher',43,431,.54);}
    if(a==='leaves'){opacity('leaves',1);put('leaves',522,622,1.25);put('potty',609,465,.79,-7);}
    if(a==='current-map'){opacity('leaves',1);put('leaves',454,670,.8);}
    if(['rock-rest','picnic','look-island','rest'].includes(a)){
      names.forEach((n,i)=>put(n,285+i*231,397+i%2*24,.68,-2));put('teacher',1025,448,.58);
      if(a==='picnic'){opacity('picnic',1);put('picnic',513,558,1);put('turbo',692,420,.75,motion?Math.sin(t*2)*1.5:0);}
    }
    if(a==='current-buoy'){put('buoy',653,622+bob(0,4),.78);names.forEach((n,i)=>put(n,166+i*284+Math.sin(l*.22)*22,446+i%2*47+bob(i,4),.72,-3));}
    if(a==='landing'){names.forEach((n,i)=>move(n,270+i*220,570,334+i*195,432,0,7,.66,-5));put('teacher',933,504,.58);}
    if(a==='explore'){opacity('shells',1);put('shells',477,559,.95);opacity('log',1);put('log',809,559,1);names.forEach((n,i)=>put(n,326+i*223,443+i%2*12,.66,bob(i,1)));}
    if(a==='cove'||a==='cave-mouth'){opacity('cave-mouth',1);put('cave-mouth',907,337,1);names.forEach((n,i)=>put(n,129+i*258,516+i%2*37,.72,bob(i,2)));if(a==='cave-mouth'){opacity('lamp',1);put('lamp',986,554,.7,-14);}}
    if(a==='cave-swim'||a==='echo'||a==='blue-light'){opacity('lamp',1);put('lamp',1091,562,.64,-5);put('teacher',970,472,.69);opacity('buoy',0);if(a==='echo'){names.forEach((n,i)=>put(n,167+i*259,491+i%2*22,.74,bob(i,4)));}if(a==='blue-light'){names.forEach((n,i)=>move(n,94+i*261,490,430+i*240,489,0,15,.69));}}
    if(['fish','carp','lagoon-float','lagoon-swim'].includes(a)){
      for(let i=0;i<5;i++){put(`fish-${i}`,motion?((t*(i===4?8:23)+i*197)%1240)-130:200+i*164,613+(i%3)*28+bob(i,5),i===4?.76:.57);}
      if(a==='fish'){names.forEach((n,i)=>put(n,198+i*281,502+bob(i,5),.73,5));opacity('bubbles',1);put('bubbles',719,592,1);}
      if(a==='carp'){put('fish-4',710,570,1.04,-5);put('turbo',573,437+bob(1,4),.92,5);put('potty',216,510,.7);put('villam',900,491,.65);put('teacher',1115,411,.52);}
      if(a==='lagoon-float')names.forEach((n,i)=>put(n,194+i*289,500+bob(i,5),.75,-13));
    }
    if(a==='thunder'){names.forEach((n,i)=>put(n,193+i*271,497,.75,-2));put('lightning',802,98,.8);opacity('lightning',motion?Math.max(0,1-progress(l,0,1.1),l>=4.05?1-progress(l,4.05,5.4):0)*.6:.35);}
    if(a==='leave-water'){names.forEach((n,i)=>move(n,199+i*283,513,152+i*315,388,0,8,.69,-7));put('teacher',1014,382,.66);}
    if(a==='climb'){names.forEach((n,i)=>move(n,165+i*140,596+i*12,475+i*110,372+i*21,i*2,10+i*2,.64,-13));move('teacher',70,628,387,398,0,11,.6,-13);}
    if(a==='support'){put('villam',459,488,.72,-16+Math.sin(p(0,5)*Math.PI)*17);put('turbo',286,493,.74,-15);put('potty',687,386,.6,-9);put('teacher',59,543,.62,-12);}
    if(a==='hut-arrival'){names.forEach((n,i)=>move(n,267+i*159,497+i%2*20,627+i*135,436+i%2*27,0,12,.62,-8));put('teacher',386,487,.6);}
    if(['shelter','window','wait-storm'].includes(a)){names.forEach((n,i)=>put(n,114+i*275,493,.8,bob(i,1)));put('teacher',968,521,.72);opacity('window-rain',1);if(a==='window')put('villam',827,330,.81,-4);}
    if(a==='clear'){names.forEach((n,i)=>put(n,106+i*292,510,.8));put('teacher',951,445,.75);}
    if(a==='warm-rocks'){names.forEach((n,i)=>put(n,162+i*291,510+i%2*24,.84,-8));put('teacher',1000,445,.67);}
    if(a==='island-evening'||a==='mystery'||a==='homewards'){names.forEach((n,i)=>put(n,113+i*263,548,.73));put('teacher',874,532,.63);opacity('mist',.25+.25*p(0,10));if(a==='mystery'){opacity('mystery-light',l<3?Math.sin(Math.PI*progress(l,0,3)):0);put('mystery-light',0,0,1);put('villam',317,463,.92,-5);}if(a==='homewards'){names.forEach((n,i)=>move(n,113+i*263,548,530+i*263,548,0,7,.73));opacity('mist',p(0,7));}}
  } else if(family==='snow') {
    names.forEach((n,i)=>put(n,149+i*287,507+i%2*25,.8,bob(i,1)));
    if(a==='snow-morning'){put('villam',232,504,.86);put('turbo',678,514,.75);put('potty',936,538,.73);}
    if(a==='wheel-spin'){const name=s.focus,i=names.indexOf(name);put(name,260+i*170+bob(i,3),511,.86,-2);opacity('snow-puff',1);put('snow-puff',211+i*190,619,.9,0);for(const wheel of actors[name]?.querySelectorAll('.sv-wheel')||[])attrs(wheel,{transform:`rotate(${motion?t*800:0})`});}
    if(a==='gentle-start'){move('potty',859,523,576,501,0,12,.82);put('villam',223,528,.83);put('turbo',513,574,.8);}
    if(a==='gentle-all'||a==='travel')names.forEach((n,i)=>move(n,121+i*288,513+i%2*20,443+i*271,490+i%2*30,0,15,.74));
    if(a==='snowplows'){opacity('plow',1);opacity('plow-two',1);move('plow',650,442,925,432,0,12,.8);move('plow-two',165,368,508,387,0,15,.59);names.forEach((n,i)=>put(n,32+i*274,581,.69));}
    if(a==='plow-talk'){opacity('plow',1);put('plow',947,410,.87);names.forEach((n,i)=>put(n,135+i*254,509+i%2*37,.79));}
    if(a==='slide'){move('villam',115,503,680,470,0,12,.8,-mix(0,18,p(0,12)));put('potty',104,614,.66);put('turbo',410,584,.68);}
    if(a==='inspect-ice'){put('villam',613,471,.85,-7);put('potty',279,549,.73);put('turbo',18,551,.75);}
    if(a==='slow-turn'){names.forEach((n,i)=>put(n,195+i*255+p(0,8)*240,497+i%2*25-Math.sin(p(0,8)*Math.PI)*30,.73,Math.sin(p(0,8)*Math.PI)*-9));}
    if(a==='barrier'||a==='barrier-talk'||a==='turn-back'||a==='avalanche'||a==='reverse'){opacity('barrier',1);put('barrier',914,375,1);names.forEach((n,i)=>put(n,49+i*258,526+i%2*33,.76));}
    if(a==='turn-back')names.forEach((n,i)=>put(n,45+i*251,531+i%2*33,.75,-p(0,5)*9));
    if(a==='avalanche'){opacity('avalanche',p(0,15));move('avalanche',1080,60,856,356,0,17,1.3);}
    if(a==='reverse'){opacity('avalanche',1);put('avalanche',853,350,1.3);names.forEach((n,i)=>move(n,49+i*258,526+i%2*33,-146+i*246,581+i%2*29,0,5,.76));opacity('barrier',1-p(0,5));}
    if(s.setting==='snow-rescue'){opacity('avalanche',1);put('avalanche',809,318,1.3);opacity('csipi',['quiet'].includes(a)?0:1);put('csipi',846,387,.98);opacity('buried-snow',1);put('buried-snow',896,446,1.02);names.forEach((n,i)=>put(n,27+i*249,540+i%2*40,.77));}
    if(a==='bell'||a==='buried'){put('csipi',899,387,.98);opacity('csipi',a==='bell'? .45:1);}
    if(a==='rescue-plan'){put('villam',636,479,.84,-5);put('turbo',379,536,.78);put('potty',57,546,.76);}
    if(a==='fetch-help'){move('potty',56,547,-286,603,10,19,.78);put('villam',557,494,.83);put('turbo',244,549,.8);}
    if(a==='wait-csipi'){opacity('potty',0);put('villam',530,506,.85,bob(0,1.6));put('turbo',230,560,.81,bob(1,1.4));}
    if(['rescue-arrive','probe','dig','free'].includes(a)){opacity('plow',1);opacity('plow-two',1);opacity('tracked',1);put('plow',89,388,.63);put('plow-two',354,353,.59);put('tracked',665,446,.72);names.forEach((n,i)=>put(n,40+i*243,594,.65));if(a==='rescue-arrive'){move('tracked',-330,436,665,446,0,8,.72);move('potty',-260,594,526,594,0,7,.65);}}
    if(a==='probe'){opacity('probe',1);put('probe',913,530,.86,-16+bob(0,5));}
    if(a==='dig'){opacity('shovel',1);put('shovel',837,476,.75,motion?Math.sin(t*2)*18:-10);put('buried-snow',896,446+91*p(0,17),1.02*(1-.76*p(0,17)));opacity('buried-snow',l<16?1:0);}
    if(a==='free'){opacity('buried-snow',0);move('csipi',846,387,868,544,0,5,.98);}
    if(a==='town-snowman'||a==='snowcar-plan'){put('snowman',1000,504,.68);put('child',907,563,.68);names.forEach((n,i)=>put(n,38+i*250,570,.78));}
    if(a==='snowcar-build'){put('snowcar',809,499,mix(.2,1.05,p(0,11)));put('snow-puff',596,599,.6);names.forEach((n,i)=>put(n,59+i*263+Math.sin(l*.8+i)*47,559+i%2*26,.76,bob(i,3)));}
    if(a.startsWith('snowcar')||a==='snow-ending'){if(a!=='snowcar-build')put('snowcar',775,452,1.08);put('street-lamp',1184,535,1);}
    if(a==='snowcar-evening'||a==='snowcar'||a==='snowcar-broken'||a==='snow-ending'){names.forEach((n,i)=>put(n,31+i*248,537+i%2*30,.77));}
  } else {
    opacity('cone',1);put('cone',958,556,.68);put('teacher',85,398,.76);
    names.forEach((n,i)=>put(n,259+i*275,488+i%2*46,.76,bob(i,1)));
    if(a==='rink-arrival')names.forEach((n,i)=>move(n,-282+i*239,514,277+i*250,507+i%2*33,0,9,.73));
    if(a==='watch-skater'){opacity('black-car',1);put('black-car',762+Math.sin(l*.6)*116,441,.61,Math.sin(l*.6)*13);names.forEach((n,i)=>put(n,27+i*246,603,.66));}
    if(a==='fit-skates'){put('teacher',103,412,.86);names.forEach((n,i)=>put(n,346+i*246,507,.74));}
    if(a==='safe-fall'){names.forEach((n,i)=>put(n,281+i*276,485,.76,Math.sin(p(i*2,i*2+5)*Math.PI)*22));}
    if(a==='blue-cone'){names.forEach((n,i)=>put(n,245+i*228,529,.74));put('cone',980,566,.68);}
    if(a==='blue-slide'){move('potty',312,504,925,493,0,19,.74,-4);put('villam',56,577,.72);put('turbo',375,597,.68);}
    if(a==='blue-fall'){put('potty',755,519,.8,34*p(1,4)*(1-p(13,16)));put('villam',281,555,.76);put('turbo',516,592,.73);}
    if(a==='yellow-fast'){move('turbo',318,521,939,478,0,22,.77,-8);put('villam',130,584,.69);put('potty',394,591,.66);}
    if(a==='yellow-spin'){put('turbo',794+p(0,14)*255,479-p(0,14)*52,.79,p(0,14)*310);put('villam',311,593,.68);put('potty',67,562,.72);}
    if(a==='yellow-snowbank'||a==='yellow-shake'){opacity('snowbank',1);put('snowbank',992,406,.82);put('turbo',1008,434,.79,a==='yellow-snowbank'?-27:bob(1,8));put('villam',411,556,.74);put('potty',691,540,.73);if(a==='yellow-shake')move('turbo',1008,434,917,489,0,5,.77,bob(1,4));}
    if(a==='red-slide'){move('villam',291,515,922,491,0,16,.76,-4);put('turbo',127,602,.67);put('potty',462,604,.67);}
    if(a==='red-falls'||a==='red-practice'){const cycle=(l%7)/7;put('villam',772+Math.sin(l*.35)*45,514,.83,cycle<.45?Math.sin(cycle/.45*Math.PI)*34:0);put('turbo',449,599,.7);put('potty',194,565,.73);}
    if(a==='teacher-talk'){put('teacher',858,398,.88);names.forEach((n,i)=>put(n,97+i*252,524+i%2*30,.8,bob(i,1)));}
    if(a==='red-turn'){put('villam',777-mix(0,171,p(0,8)),501,.85,Math.sin(p(0,7)*Math.PI)*15);put('turbo',325,577,.74);put('potty',69,550,.74);}
    if(a==='turns')names.forEach((n,i)=>put(n,224+i*294+Math.sin(l*.5+i)*49,503+Math.cos(l*.5+i)*21,.74,Math.sin(l*.5+i)*14));
    if(a.startsWith('brake')){opacity('braking-line',1);put('braking-line',979,418,1);put('teacher',59,382,.73);names.forEach((n,i)=>put(n,181+i*241,568+i%2*20,.68));const focus=a==='brake-blue'?'potty':a==='brake-yellow'?'turbo':'villam';if(a!=='brake-lesson')move(focus,364,468,a==='brake-blue'?686:a==='brake-yellow'?980:785,479,0,a==='brake-yellow'?9:6,.75,-4);}
    if(a==='skate-practice'||a==='lap'||a==='last-lap'){names.forEach((n,i)=>{const phase=l*.23+i*.75;put(n,548+Math.cos(phase)*352,494+Math.sin(phase)*77,.64+Math.sin(phase)*.08,Math.sin(phase)*6);});}
    if(a==='large-rink'){names.forEach((n,i)=>put(n,86+i*278,578,.72));opacity('black-car',1);put('black-car',879,401,.53,-4);}
    if(a==='black-jump'||a==='watch-jump'){opacity('black-car',1);const q=a==='black-jump'?progress(l,2,12):(motion?(l%11)/11:.5);put('black-car',685+q*153,464-Math.sin(q*Math.PI)*122,.74,Math.sin(q*Math.PI)*28);names.forEach((n,i)=>put(n,25+i*239,592,.69));}
    if(a==='black-fall'||a==='black-help'){opacity('black-car',1);put('black-car',774,491,.82,a==='black-fall'?mix(0,54,p(6,17)):mix(54,0,p(11,23)));names.forEach((n,i)=>put(n,73+i*241,609,.66));if(a==='black-help'){move('teacher',225,400,680,423,0,5,.7);put('worker-one',1004,405,.58,-3);put('worker-two',1002,564,.59);}}
    if(a==='ask-race'){put('teacher',934,436,.79);names.forEach((n,i)=>put(n,118+i*252,535+i%2*18,.77));}
    if(['race-start','race','race-finish','race-brake','skate-success'].includes(a)){opacity('braking-line',1);put('braking-line',1080,422,1);put('teacher',914,369,.67);}
    if(a==='race-start'){names.forEach((n,i)=>put(n,151,417+i*88,.66,-p(5,16)*5));}
    if(a==='race'){names.forEach((n,i)=>move(n,151,417+i*88,570-i*37,420+i*88,0,18,.66,-4));}
    if(a==='race-finish'){names.forEach((n,i)=>move(n,570-i*37,420+i*88,800-i*36,420+i*88,i*3,10+i*3,.66,-4));}
    if(a==='race-brake'){names.forEach((n,i)=>move(n,797-i*47,420+i*88,894,420+i*88,i*4,5+i*4,.66,0));}
    if(a==='skate-success'){names.forEach((n,i)=>put(n,894,420+i*88,.66,motion?Math.sin(t*3+i)*2:0));}
  }
  atmosphere(ctx);
}

function build(id, family, rows, duration) {
  const scenes=rows.map(([time,key,title,setting,action,extras={}],i)=>({time,id:key,title,setting,action,...extras,family,until:rows[i+1]?.[0]??duration,rolling:['travel','gentle-start','gentle-all','slow-turn','homewards','rescue-arrive','snowcar-build'].includes(action)?95:0}));
  return {id,duration,scenes,frame:(scene,art)=>frame(scene,art,family),render:ctx=>render(ctx,family)};
}

export const STORIES = [
  build('story-07','swim',swim,1089.024),
  build('story-08','snow',snow,836.040),
  build('story-09','skate',skate,909.912),
  build('story-10','island',island,1021.032)
];
