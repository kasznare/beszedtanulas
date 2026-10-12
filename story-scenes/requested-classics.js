import { STORY_CAPTION_TIMES } from '../story-caption-timing.js';
import { REQUESTED_CLASSICS } from '../requested-classics.js';
import { createRequestedArt } from '../story-art/requested-classics.js';
import { animateClassic, birdAction, personAction } from '../story-art/classic-motion.js';

const actor = (id, body) => `<g data-actor="${id}">${body}</g>`;
const svg = (base, background, body) => `<svg viewBox="0 0 1280 720" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">${base.defs}${background}${body}</svg>`;
// Line anchors, not estimated seconds. Only completed recordings instantiate
// a timeline, so every change follows the final Jessa captions when seeking.
const plans = {
  'classic-palko': [
    [0,'palace','Palkó a királyi udvarban'], [2,'mother','A királyné kívánsága'],
    [4,'flowers','Gyöngyvirágot hoznak'], [6,'gardeners','A kertészek válogatnak'],
    [10,'choose','Palkó választ'], [13,'grandmother','Az öreg anyóka virága'],
    [15,'diamond','Gyémánttá váló gyöngyvirág'], [19,'watch','Palkó őrködik'],
    [22,'bread','Éjjeli falatozás'], [23,'dwarf','Megjelenik a törpe'],
    [25,'secret','A gyöngyvirág titka'], [29,'ride-beard','A törpe továbbindul'],
    [31,'fairies','Táncoló tündérek'], [37,'staff','A dajka elkergeti a tündéreket'],
    [39,'sword','A második éjszaka'], [41,'voice','A virág megszólal'],
    [43,'princess','A törpe királykisasszony'], [46,'wish','A pillangós hintó'],
    [47,'carriage','Aranyos hintó az éjszakában'], [50,'journey','Indulás Törpeországba'],
    [54,'chase','Tündér Ilona táltos lova'], [58,'flame','A táltos lángot okád'],
    [60,'escape','A hold és a nap között'],
    [62,'missing','A dajka odalent maradt'], [67,'family','A törpekirály udvarában'],
    [69,'dwarf-return','A törpe segít'], [71,'rescue','Hazahozza a dajkát'], [72,'wedding','Lakodalom'],
    [73,'ending','Így volt, vége volt']
  ],
  'classic-fulemile': [
    [0,'neighbors','Péter és Pál'], [8,'calendar','Péter és Pál a naptárban'],
    [18,'chimney','A szomszédok bosszankodnak'], [24,'argument','Örök patvar'],
    [32,'walnut','Diófa a kertben'], [40,'bird','A közös ágra száll a fülemile'],
    [46,'morning','Napfény és harmat'], [51,'nest','A fészek, hol párja költ'],
    [61,'song','A madár énekel'], [64,'pal-claim','Pál gyönyörködik'],
    [70,'peter-claim','Péter átkiált'], [76,'quarrel','Kié a madárfütty?'],
    [87,'pal-judge','Pál a bíróhoz indul'], [97,'right-coin','Tallér a jobb zsebben'],
    [102,'peter-judge','Péter panasza'], [113,'left-coin','Tallér a bal zsebben'],
    [119,'lawyers','A prókátorok keresnek'], [132,'judgement','A bíró dönt'],
    [140,'dismiss','Elmehetnek'], [142,'today','Milyen szép dolog'],
    [157,'ending','A fülemile füttyét']
  ],
  'classic-arany-lacinak': [
    [0,'laci','Laci, hallod-e?'], [5,'lap','Ülj meg itten az ölemben'],
    [11,'listen','Nyisd ki füledet'], [16,'butterfly','Egy kis tarka lepke'],
    [19,'farmer','Volt egy ember, nagybajúszos'], [20,'well','Elment a kúthoz'],
    [22,'fill','Telemerte a vedret'], [26,'garden','Tán a kertet kéne meglocsolnia?'],
    [29,'field','A mezőre ballag'], [32,'look','Mit szemlélhet?'],
    [33,'mirage','A fényes délibáb'], [38,'hemp','Kendert áztató ember'],
    [43,'reason','Már csak megmondom'], [46,'squirrel','Ürgét akar önteni'],
    [49,'run','Hű, mi fürge!'], [52,'burrow','Benn a lyukban'],
    [56,'approach','A lyuk mellé'], [57,'pour','Beleönté a veder vizet'],
    [62,'emerge','Az ürge kimászott'], [64,'carry','Hazavitték'],
    [66,'reveal','Itt van, karjaimban'], [71,'ending','Te vagy, Laci, te bizony!']
  ]
};

function frameLaci(scene, base) {
  const a = createRequestedArt(base), id = scene.id;
  const indoors = ['laci','lap','listen','butterfly','reveal','ending'].includes(id);
  let bg = indoors ? a.room() : a.field(), body = '';
  if (indoors) {
    bg += a.wrap(660,651,.9,a.throne());
    body += actor('narrator',a.farmer()) + actor('child',a.child());
    if (id === 'butterfly') body += actor('butterfly',a.butterfly());
  } else {
    if (['well','fill'].includes(id)) bg += a.wrap(400,627,.87,a.well());
    if (id === 'garden') bg = a.yard() + a.wrap(370,650,.7,a.lily());
    if (['look','mirage'].includes(id)) bg += '<g opacity=".3"><path d="M870 465V343h34v122m55 0V375h50v90" fill="#829b9a"/><path d="M785 485h370" stroke="#97b6b6" stroke-width="7"/></g>';
    if (id === 'hemp') body += a.wrap(370,551,.55,a.farmer()) + '<path d="M200 553h340v24H200Z" fill="#92b5b4"/>';
    body += actor('farmer',a.farmer()) + actor('bucket',a.bucket(id !== 'well'));
    if (['squirrel','run','burrow','approach','pour','emerge','carry'].includes(id)) {
      bg += '<ellipse cx="885" cy="626" rx="71" ry="23" fill="#78644b"/><ellipse cx="888" cy="622" rx="45" ry="14" fill="#4f493b"/>';
      body += actor('squirrel',a.squirrel());
      if (id === 'pour') body += actor('water','<path d="M0 0q65 38 109 126" fill="none" stroke="#93c1c9" stroke-width="13" stroke-linecap="round" opacity=".8"/>');
    }
  }
  return svg(base,bg,body);
}

function frameFulemile(scene, base) {
  const a=createRequestedArt(base), id=scene.id;
  const court=['pal-judge','right-coin','peter-judge','left-coin','lawyers','judgement','dismiss'].includes(id);
  let bg=court?a.hall():a.yard()+a.fence(), body='';
  if(court) {
    bg+=a.wrap(638,638,1,a.table());
    body+=actor('judge',a.farmer())+actor('peter',a.farmer())+actor('pal',a.person('farmer',{dress:'#779da0'}));
    if(['right-coin','left-coin','judgement','dismiss'].includes(id))body+=actor('coin',a.coin());
    if(id==='lawyers')body+='<path d="M476 511h130v24H476m173-24h112v24H649" fill="#e0d6bc" stroke="#a29375" stroke-width="3"/>';
  } else {
    bg+=base.tree(1020,520,1.55,1);bg+='<path d="M1010 340H740" stroke="#927758" stroke-width="20" stroke-linecap="round"/>';
    body+=actor('peter',a.farmer())+actor('pal',a.person('farmer',{dress:'#779da0'}));
    if(id==='calendar')body+='<rect x="420" y="125" width="430" height="240" rx="14" fill="#f4ead2" stroke="#b1a17b" stroke-width="4"/><text x="635" y="200" text-anchor="middle" font-size="32" fill="#695e46">JÚNIUS 29.</text><text x="635" y="280" text-anchor="middle" font-size="30" fill="#695e46">Péter és Pál</text>';
    if(id==='chimney')body+='<path d="M140 185q-70-35-36-65t-7-58" stroke="#c9c7b8" stroke-width="28" opacity=".65" fill="none"/>';
    if(['bird','morning','nest','song','pal-claim','peter-claim','quarrel','today','ending'].includes(id))body+=actor('bird',a.bird('nightingale'));
    if(id==='nest')body+=a.wrap(1050,418,.7,a.nest());
  }
  return svg(base,bg,body);
}

function framePalko(scene, base) {
  const a=createRequestedArt(base), id=scene.id;
  const night=['watch','bread','dwarf','secret','ride-beard','fairies','staff','sword','voice','princess','wish','carriage','journey','chase','flame','escape','missing'].includes(id);
  let bg=night?a.night():a.sky()+a.palace()+a.grass(),body='';
  if(['mother','family'].includes(id))bg=a.hall({window:true});
  const flying=['carriage','journey','chase','flame','escape','missing'].includes(id);
  if(!flying)body+=actor('palko',a.person('prince'));
  if(id==='mother')body+=actor('mother',a.person('mother'));
  if(id==='gardeners')for(let i=0;i<3;i++)body+=actor('gardener'+i,a.person('farmer',{dress:['#80976c','#a58e79','#7d9a9f'][i]}));
  if(['palace','mother','choose','return','family','wedding','ending'].includes(id))body+=actor('king',a.person('king'));
  if(['grandmother','diamond','watch','bread','dwarf','secret','fairies','staff','sword','voice','rescue','wedding','ending'].includes(id))body+=actor('grandmother',a.grandmother());
  if(!['palace','mother','family','chase','flame','escape','missing'].includes(id))body+=actor('lily',a.lily());
  if(['flowers','gardeners','choose'].includes(id))for(let i=0;i<6;i++)body+=a.wrap(240+i*135,630,.72,a.lily());
  if(['dwarf','secret','ride-beard','dwarf-return','rescue','wedding','ending'].includes(id))body+=actor('dwarf',a.person('king'));
  if(['princess','wish','carriage','journey','chase','flame','escape','missing','return','wedding','ending'].includes(id))body+=actor('princess',a.person('princess',{jeweled:true}));
  if(['fairies','staff','sword'].includes(id))for(let i=0;i<12;i++)body+=actor('fairy'+i,a.person('princess',{dress:'#ac98b2'})+a.wrap(0,-155,.6,a.butterfly()));
  if(['wish','carriage','journey','chase','flame','escape','missing'].includes(id))body+=actor('carriage',a.carriage())+actor('butterfly0',a.butterfly())+actor('butterfly1',a.butterfly());
  if(flying)body+=actor('palko',a.person('prince'))+actor('princess',a.person('princess',{jeweled:true}));
  if(id==='bread')body+=actor('bread','<path d="M-30 0q-8-42 24-44 41 3 38 44Z" fill="#d5ae79" stroke="#977b51" stroke-width="3"/>');
  if(id==='staff')body+=actor('staff','<path d="M0 0V-195m-8-168 16-27" stroke="#a38c64" stroke-width="9" stroke-linecap="round"/>');
  if(id==='sword')body+=actor('sword','<path d="M0 0v-100l7-21 7 21V0Z" fill="#cdd6cf" stroke="#899d97" stroke-width="3"/><path d="M-8 0h30M7 0v23" stroke="#b19a59" stroke-width="7"/>');

  if(['chase','flame'].includes(id))body+=actor('taltos','<g transform="translate(-330 -555)">'+a.horses(1)+'</g>')+actor('fire',a.fire());
  if(['carriage','journey','chase','flame','escape','missing'].includes(id))bg=a.night();
  return svg(base,bg,body);
}

function renderLaci(c) {
  const {scene:s,time:t,local:l,motion,host,actors,pose,attrs,progress,smooth,mix}=c;
  animateClassic(host,t,motion);const q=smooth(progress(t,s.time,s.end)),id=s.id;
  pose('narrator',650,625,1.25);pose('child',710,615,.62);
  personAction(actors.narrator,t,{motion,gesture:['listen','butterfly'].includes(id)?1:0,embrace:['lap','reveal','ending'].includes(id)?1:0});
  pose('butterfly',mix(390,710,q),280-Math.sin(q*Math.PI)*80,.75);
  let x=['well','fill'].includes(id)?740:620;
  if(id==='field')x=mix(350,710,q);if(id==='approach')x=mix(510,790,q);
  pose('farmer',x,625,1.1);personAction(actors.farmer,t,{motion,walk:['field','approach'].includes(id)?1:0,gesture:['look','reason','pour'].includes(id)?1:0});
  pose('bucket',id==='pour'?825:x+59,id==='fill'?mix(466,520,q):508,.9,id==='pour'?mix(0,100,q):0);
  pose('water',831,511,1);attrs(actors.water,{opacity:motion?Math.sin(q*Math.PI):.9});
  pose('squirrel',id==='run'?mix(490,885,q):id==='carry'?x+60:885,id==='burrow'?mix(615,699,q):id==='emerge'?mix(699,616,q):618,.9);
  if(['burrow','approach','pour'].includes(id))attrs(actors.squirrel,{opacity:id==='burrow'?1-q:0});
  const wings=host.querySelector('.rq-wings');if(wings)attrs(wings,{transform:`scale(${motion?.85+Math.sin(l*7)*.15:1} 1)`});
}

function renderFulemile(c) {
  const {scene:s,time:t,motion,host,actors,pose,progress,smooth,mix}=c;
  animateClassic(host,t,motion);const q=smooth(progress(t,s.time,s.end)),court=Boolean(actors.judge);
  pose('peter',court?280:340,650,1.2);pose('pal',court?1040:920,650,1.2);
  pose('judge',636,570,1.05);pose('coin',s.id==='left-coin'?602:690,506,1.1);
  pose('bird',s.id==='bird'?mix(1180,940,q):940,s.id==='bird'?mix(170,343,q):343,1.75);
  birdAction(actors.bird,t,{motion,flap:s.id==='bird'?1-q:0,call:['song','pal-claim','peter-claim','ending'].includes(s.id)?1:0});
  for(const id of ['peter','pal'])personAction(actors[id],t,{motion,gesture:['quarrel','argument','peter-claim','pal-claim'].includes(s.id)?1:0,head:s.id==='song'?-8:0});
  personAction(actors.judge,t,{motion,gesture:['judgement','dismiss'].includes(s.id)?1:0});
}

function renderPalko(c) {
  const {scene:s,time:t,motion,host,actors,pose,attrs,progress,smooth,mix}=c;
  animateClassic(host,t,motion);const q=smooth(progress(t,s.time,s.end));
  const flying=['carriage','journey','chase','flame','escape','missing'].includes(s.id);
  const carriageX=s.id==='journey'?mix(850,1000,q):960;
  pose('palko',flying?carriageX-30:s.id==='choose'?mix(390,610,q):480,flying?386:638,flying?.33:.66);pose('king',890,638,1.4);
  pose('mother',750,636,1.05);for(let i=0;i<3;i++)pose('gardener'+i,270+i*275,624,1);
  pose('grandmother',670,645,1.08);pose('lily',680,645,s.id==='diamond'?1.6:.8);
  pose('dwarf',270,s.id==='ride-beard'?mix(640,400,q):640,.45);
  pose('princess',flying?carriageX+30:690,flying?386:636,flying?.33:.67);pose('carriage',carriageX,450,1.15);
  for(let i=0;i<12;i++)pose('fairy'+i,180+i%6*180,330+Math.floor(i/6)*225+(motion?Math.sin(t*1.7+i)*20:0),.56);
  for(let i=0;i<2;i++)pose('butterfly'+i,carriageX-150-i*140,s.id==='journey'?mix(400,260,q):400+i*40,.7);
  pose('staff',625,599,1,s.id==='staff'?mix(-32,35,q):0);pose('sword',515,560,.75,s.id==='sword'?mix(-40,35,q):0);
  pose('bread',500,577,.65);pose('taltos',330,460,1.5);pose('fire',450,325,1.1,90);if(['chase','flame'].includes(s.id))attrs(actors.lily,{opacity:0});
  personAction(actors.palko,t,{motion,gesture:['choose','chase','family'].includes(s.id)?1:0});
  personAction(actors.grandmother,t,{motion,gesture:s.id==='staff'?1:0});
  if(s.id==='voice')attrs(actors.lily,{opacity:.7+(motion?Math.sin(t*2)*.25:0)});
}

const frames={'classic-palko':framePalko,'classic-fulemile':frameFulemile,'classic-arany-lacinak':frameLaci};
const renders={'classic-palko':renderPalko,'classic-fulemile':renderFulemile,'classic-arany-lacinak':renderLaci};
export const STORIES=REQUESTED_CLASSICS.filter(story=>STORY_CAPTION_TIMES[story.id]).map(story=>{
  const times=STORY_CAPTION_TIMES[story.id];
  const scenes=plans[story.id].map(([line,id,title],index)=>({time:index?times[line]:0,id,title,line}));
  for(let i=0;i<scenes.length;i++)scenes[i].end=scenes[i+1]?.time??times.at(-1)+1;
  return {id:story.id,scenes,frame:frames[story.id],render:renders[story.id]};
});
