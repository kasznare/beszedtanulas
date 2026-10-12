import { createClassicArt } from '../story-art/classic-settings.js';
import { animateClassic, birdAction, personAction } from '../story-art/classic-motion.js';

const cues = rows => rows.map(([time,id,title,action,extra = {}])=>({time,id,title,action,...extra}));
const actor=(id,body)=>`<g data-actor="${id}">${body}</g>`;
const svg=(base,bg,body)=>`<svg viewBox="0 0 1280 720" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">${base.defs}${bg}${body}</svg>`;
const titScenes=cues([
  [0,'autumn','Vége van a nyárnak','autumn'],
  [2.96,'wind','Hűvös szelek járnak','wind'],
  [4.64,'sad','A cinegemadár bánata','sad'],
  [7.92,'travel','Szeretne útra kelni','travel'],
  [10.96,'shoes','Sehol sem talál cipőt','shoes'],
  [14.08,'search','Kapkod fűhöz-fához','search'],
  [15.8,'cobbler-flight','Szalad a vargához','cobbler-flight'],
  [17.36,'willow','A fűzfahegyen lakó varga','willow'],
  [20.48,'busy','Varjú Varga Pál nem ér rá','busy'],
  [23.36,'sew','Nagy uraknak varrja a csizmát','sew'],
  [26.4,'crane-stork','Darunak, gólyának','crane-stork'],
  [27.92,'bittern','A bölömbikának','bittern'],
  [29.36,'caw','Kár, kár, kár!','caw'],
  [32.96,'migration','A nagy madarak útra kelnek','migration'],
  [36.92,'hoopoe','A búbos banka is indul','hoopoe'],
  [38.68,'alone','Csak a cinegének szomorú az ének','alone'],
  [41.28,'bare-feet','Nincsen cipőcskéje','bare-feet'],
  [44.24,'looking','Keresi, kutatja','looking'],
  [45.84,'branch-flight','Repül gallyrul gallyra','branch-flight'],
  [47.88,'little-shoe','Kis cipőt, kis cipőt!','little-shoe'],
  [50.12,'song','Egyre csak azt hajtja','song']
]);
const cobblerActs = new Set(['cobbler-flight','willow','busy','sew','caw']);
const fallenLeaf=()=>'<path d="M0 0q-34-29-4-50 39 14 4 50Z" fill="#d4ab69" stroke="#9b8a5b" stroke-width="2"/><path d="M0 0-4-40" stroke="#a08e5b" stroke-width="2"/>';
function titFrame(s,base) {
  const a=createClassicArt(base), act=s.action;
  let bg=a.sky(true)+a.willow()+a.grass(true),body='';
  if(cobblerActs.has(act)) {
    bg+=a.branch(true)+a.wrap(770,575,.67,a.table());
    body+=actor('crow','<g transform="scale(-1 1)">'+a.bird('crow')+'</g>')+a.wrap(784,486,.65,a.boots());
    body+=actor('needle','<path d="M0 0 15-36" stroke="#7b8276" stroke-width="4"/><path d="M15-36q30-51 53-25 27 38-10 50" stroke="#d6c79c" stroke-width="2" fill="none"/>');
  } else if(['crane-stork','bittern','migration','hoopoe'].includes(act)) {
    body+=actor('crane',a.bird('crane'))+actor('stork',a.bird('stork'))+actor('bittern',a.bird('bittern'));
    if(act==='hoopoe')body+=actor('hoopoe',a.bird('hoopoe'));
  } else {
    bg+=a.branch(true);
    if(['travel','shoes'].includes(act))body+=actor('wish','<path d="M-96-140q113-27 183 46 24 68-61 96-88 27-161-25-51-57 39-117Z" fill="#f9f2dd" stroke="#c4b28a" stroke-width="3"/><circle cx="-76" cy="29" r="15" fill="#f9f2dd"/><circle cx="-96" cy="60" r="8" fill="#f9f2dd"/>'+a.wrap(0,-10,.65,a.boots()));
  }
  if(['wind','autumn','sad','looking','branch-flight'].includes(act))for(let i=0;i<5;i++)body+=actor(`leaf${i}`,fallenLeaf());
  body+=actor('tit',a.bird('tit'));
  return svg(base,bg,body);
}
function titRender({time:t,local:l,scene:s,host,actors,pose,attrs,motion,progress,smooth,mix}) {
  const act=s.action,p=(a,b)=>smooth(progress(t,a,b));animateClassic(host,t,motion);
  let x=466,y=549,flap=0,walk=0,call=0,tilt=0;
  if(['autumn','wind','sad'].includes(act))tilt=act==='sad'?8:0;
  if(act==='travel'){const q=p(7.92,9.8);x=mix(440,588,q);y=549-Math.sin(q*Math.PI)*110;flap=q<1?1:0;}
  pose('wish',814,337,1.2);
  if(act==='search'){x=400+(motion?Math.sin(l*2)*75:0);walk=1;}
  if(cobblerActs.has(act)){
    const q=act==='cobbler-flight'?p(15.8,17.3):1;x=mix(250,432,q);y=mix(650,550,q)-Math.sin(q*Math.PI)*95;flap=q<1?1:0;
    pose('crow',885,519,1.67);birdAction(actors.crow,t,{motion,call:['busy','caw'].includes(act)?1:0,peck:act==='sew'?.35:0});
    pose('needle',780+(motion&&act==='sew'?Math.sin(t*4)*8:0),427,.8,act==='sew'&&motion?Math.sin(t*4)*18:0);
    if(act==='busy')call=.7;
  }
  if(['crane-stork','bittern','migration','hoopoe'].includes(act)) {
    x=228;y=624;
    const flying=['migration','hoopoe'].includes(act),q=flying?p(s.time,s.time+2.8):0;
    for(const [i,id] of ['crane','stork','bittern'].entries()) {
      pose(id,mix(575+i*221,820+i*177,q),mix(620,255+i*56,q),[1.1,1.06,.98][i],flying?-7:0);
      birdAction(actors[id],t,{motion,flap:flying?1:0});
      if(act==='bittern')attrs(actors[id],{opacity:id==='bittern'?1:.42});
      if(act==='hoopoe')attrs(actors[id],{opacity:.3});
    }
    if(act==='hoopoe'){pose('hoopoe',mix(638,972,p(36.92,38.6)),mix(600,317,p(36.92,38.6)),1.48,-9);birdAction(actors.hoopoe,t,{motion,flap:1});}
  }
  if(act==='bare-feet'){x=640;y=574;tilt=13;}
  if(act==='looking'){x=mix(360,615,p(44.24,45.7));walk=1;tilt=7;}
  if(act==='branch-flight'){const q=p(45.84,47.7);x=mix(410,830,q);y=550-Math.sin(q*Math.PI)*150;flap=1;}
  if(['alone','little-shoe','song'].includes(act)){x=act==='alone'?483:830;call=1;}
  pose('tit',x,y,act==='bare-feet'?2.7:2.05);
  birdAction(actors.tit,t,{motion,flap,walk,call,tilt});
  for(let i=0;i<5;i++)if(actors[`leaf${i}`]){const q=motion?((t*.1+i*.23)%1):.35+i*.1;pose(`leaf${i}`,160+i*205+Math.sin(q*6+i)*42,180+q*470,.5+i%2*.1,q*160);}
}
const henScenes=cues([
  [0,'hen','Tyúkanyó a szobában','hen'],
  [5.28,'indoors','A szobában lakik itt bent','indoors'],
  [7.44,'welcome','Jó dolga van tyúkanyónak','welcome'],
  [12,'running','Szaladgál föl és alá','running'],
  [14.16,'chest-flight','Még a ládára is fölszáll','chest-flight',{stillTime:15.9}],
  [16.24,'clucking','Kotkodácsol a ládán','clucking'],
  [18.24,'stay','A szobában maradhat','stay'],
  [20.16,'feeding','Dehogy verik!','feeding'],
  [22.48,'dove-care','Mint a galambot etetik','dove-care'],
  [24.16,'seeds','Válogat a kendermagban','seeds'],
  [25.88,'little-king','A kiskirály sem él jobban','little-king'],
  [28,'respect','Becsülje meg magát tyúkanyó','respect'],
  [31.84,'eggs','Iparkodjék a tojással','eggs'],
  [33.6,'mother-eggs','Tojás az anyának','mother-eggs'],
  [36.16,'ears','Morzsa, hegyezd füled!','ears'],
  [38.4,'listen','Beszélünk Morzsával','listen'],
  [40.56,'loyal','Régi cseléd a háznál','loyal'],
  [44.8,'good-dog','Ezután is jó légy, Morzsa','good-dog'],
  [46.84,'gentle','Gyöngéden a tyúkkal','gentle'],
  [48.96,'friends','Élj a tyúkkal barátságban','friends'],
  [51.52,'treasured','Anyám egyetlen jószága','treasured']
]);
function henFrame(s,base) {
  const a=createClassicArt(base),act=s.action;let body=a.wrap(966,575,1.13,a.chest());
  body+=actor('hen',a.bird('hen'));
  if(!['hen','indoors','running','chest-flight','clucking','stay'].includes(act))body+=actor('mother',a.person('mother',{dress:'#a88465'}));
  if(['feeding','dove-care','seeds','little-king'].includes(act))body+=actor('seeds',a.seeds());
  if(act==='dove-care')body+=a.wrap(690,262,1,'<circle r="76" fill="#f3e8cb" stroke="#d2c099" stroke-width="3"/>'+a.wrap(0,51,.58,a.bird('dove')));
  if(act==='little-king')body+=a.wrap(708,249,1,'<circle r="72" fill="#f3e8cb" stroke="#d2c099" stroke-width="3"/><path d="M-40 24-47-22-21-8 0-37 23-8 46-22 40 24Z" fill="#dfc278" stroke="#a38a4f" stroke-width="3"/><path d="M-35 22h70" stroke="#f8e5ad" stroke-width="6"/>');
  if(['eggs','mother-eggs','treasured'].includes(act))body+=actor('eggs',a.basket()+a.wrap(-21,-19,.7,a.egg())+a.wrap(15,-14,.75,a.egg()));
  if(s.time>=36.16)body+=actor('dog','<g transform="scale(-1 1)">'+a.dog()+'</g>');
  return svg(base,a.room(),body);
}
function henRender({time:t,local:l,scene:s,host,actors,pose,attrs,motion,progress,smooth,mix}) {
  const act=s.action,p=(a,b)=>smooth(progress(t,a,b));animateClassic(host,t,motion);
  let x=572,y=621,walk=0,flap=0,peck=0,call=0;
  pose('mother',320,654,1.17);personAction(actors.mother,t,{motion,gesture:['welcome','feeding','respect','mother-eggs'].includes(act)?.5:0});
  pose('dog',905,640,1.32);pose('seeds',641,635,1.2);pose('eggs',696,598,1);
  if(act==='running'){const q=p(12,14.05);x=mix(420,790,q);walk=1;y-=motion?Math.abs(Math.sin(t*5))*6:0;}
  if(act==='chest-flight'){const q=p(14.16,15.8);x=mix(790,966,q);y=mix(621,432,q)-Math.sin(q*Math.PI)*73;flap=q<1?1:0;}
  if(['clucking','stay'].includes(act)){x=966;y=432;call=act==='clucking'?1:0;}
  if(['feeding','dove-care','seeds','little-king'].includes(act)){x=602;peck=act==='seeds'?1:.4;pose('mother',327,654,1.17);}
  if(act==='respect')call=.6;
  if(act==='eggs') {x=782;pose('eggs',741,631,.9);}
  if(act==='mother-eggs'){pose('eggs',mix(741,384,p(33.6,35.8)),mix(631,545,p(33.6,35.8)),.85);x=782;}
  if(['ears','listen','loyal','good-dog'].includes(act)) {
    x=482;pose('dog',847,640,1.5);
    host.querySelectorAll('.cl-dog-ear').forEach(node=>attrs(node,{transform:`rotate(${act==='ears'?-28:act==='listen'?-15:0})`}));
    host.querySelectorAll('[data-model="dog-morzsa"] .cl-human-head').forEach(node=>attrs(node,{transform:`rotate(${motion?Math.sin(t*.7)*2:0})`}));
  }
  if(['gentle','friends','treasured'].includes(act)) {const q=act==='gentle'?p(46.84,48.9):1;x=mix(482,615,q);pose('dog',846,640,1.35);walk=act==='gentle'?1:0;personAction(actors.mother,t,{motion,gesture:.35});}
  if(act==='treasured') {pose('mother',365,654,1.17);pose('eggs',418,542,.75);}
  pose('hen',x,y,1.72);birdAction(actors.hen,t,{motion,walk,flap,peck,call});
}
export const STORIES=[
  {id:'story-16',scenes:titScenes,frame:titFrame,render:titRender},
  {id:'story-17',scenes:henScenes,frame:henFrame,render:henRender}
];
