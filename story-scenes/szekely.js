import { KRIZA_REQUESTED } from '../kriza-requested.js';
import { AUDIOBOOKS } from '../audiobook-data.js';
import { STORY_CAPTION_TIMES } from '../story-caption-timing.js';
import { createSzekelyArt } from '../story-art/szekely.js';
import { animateClassic, personAction } from '../story-art/classic-motion.js';

const actor = (id, body) => `<g data-actor="${id}">${body}</g>`;
const plans = {
  'szekely-csillagszemu-juhasz': [
    [0,'kingdom','A király és a csillagszemű juhász'],[1,'summoned','A király elé viszik'],
    [4,'reply','A juhász válasza'],[10,'wish','A királykisasszony'],
    [12,'bear','A fehér medve tömlöce'],[15,'calm-bear','A medve megszelídül'],
    [16,'return','A juhász visszatér'],[20,'hedgehogs','Tíz óriás sündisznó'],
    [21,'flute','A furulya hangjára táncolnak'],[22,'survived','Az udvarmester csodálkozik'],
    [25,'third-trial','A harmadik próba'],[28,'well','A kút a tömlöcben'],
    [30,'thinking','A juhász kigondolja a tervét'],[31,'decoy','Suba és kalap a fokoson'],
    [35,'trick','A katonák a subát taszítják a kútba'],[36,'safe','A juhász épen furulyázik'],
    [40,'carriage','Hintóval indulnak'],[41,'silver','Az ezüsterdő'],
    [44,'gold','Az aranyvár'],[47,'lake','A gyémánttó'],
    [50,'promise','A király megtartja az ígéretét'],[51,'wedding','Hét országra szóló lakodalom'],
    [53,'blessing','Adj’ isten egészségére!'],[55,'crown','Megkoronázzák a juhászt'],
    [56,'ending','Aki nem hiszi, járjon a végire']
  ],
  'szekely-seprukoto-jakab': [
    [0,'brooms','Jakab seprűt köt'],[1,'forest','Új mesterségen gondolkodik'],
    [2,'coat','Az újas a bokron'],[3,'sneak','Jakab kerülgeti a bokrot'],
    [4,'beggar','Találkozás a koldussal'],[9,'sale','Tíz krajcárért eladja az újast'],
    [11,'king','A király hívatja'],[12,'grain-trial','A búza próbája'],
    [15,'threshers','Tizenkét cséplő a csűrnél'],[16,'straw','Szalmaember a csűrben'],
    [18,'wagon','Hat ökör húzza a búzás szekeret'],[19,'empty','A kiürült csűr'],
    [21,'reward','Száz forint jutalom'],[22,'horse-trial','A szürke csitkó próbája'],
    [23,'prepare','Jakab összekészíti a kellékeket'],[25,'bread','Cipót és bort visz'],
    [26,'sleep','A katonák elalszanak'],[27,'ride','Jakab elvágtat a szürkével'],
    [28,'surprise','A király az istállóban'],[31,'new-trial','A pap és a kántor próbája'],
    [34,'crabs','Rákok és apró viaszgyertyák'],[35,'church','Apró fények a templomban'],
    [36,'song','Jakab énekel'],[41,'sheet','A pap és a kántor a lepedőn'],
    [42,'road','A göröngyös út'],[47,'shed','A király udvarára érkeznek'],
    [48,'second-reward','A király kifizeti Jakabot'],[49,'ring-trial','Az aranygyűrű próbája'],
    [50,'disguise','Jakab királyi gúnyát ölt'],[51,'queen','A királyné szobájában'],
    [52,'ring','A királyné odaadja a gyűrűt'],[53,'royal-return','A király hazaér'],
    [55,'wedding','Jakab és a királykisasszony lakodalma'],[56,'ending','Holnap legyenek a kietek vendégei']
  ]
};

function frameShepherd(scene, base) {
  const a = createSzekelyArt(base), id = scene.id;
  const cell = ['bear','calm-bear','hedgehogs','flute','survived','well','thinking','decoy','trick','safe'].includes(id);
  let bg = cell ? a.cave() : ['kingdom','carriage','silver','gold','lake','ending'].includes(id) ? a.sky()+a.palace()+a.grass() : a.hall();
  let body = actor('hero', a.youth(true,['crown','ending'].includes(id)));
  if (!cell) body += actor('king', a.person('king'));
  if (['wish','promise','wedding','blessing','crown','ending'].includes(id)) body += actor('princess', a.person('princess'));
  if (['bear','calm-bear'].includes(id)) body += actor('bear', a.bear());
  if (['hedgehogs','flute','survived'].includes(id)) {
    for (let i=0;i<10;i++) body += actor('hedgehog'+i, a.hedgehog());
  }
  if (['flute','safe'].includes(id)) body += actor('flute', a.flute());
  if (['well','thinking','decoy','trick','safe'].includes(id)) bg += a.wrap(900,650,.63,a.well());
  if (['decoy','trick'].includes(id)) body += actor('decoy',a.decoy());
  if (['carriage','silver','gold','lake'].includes(id)) {
    bg = a.sky()+a.grass();
    if(id==='silver') bg += [230,650,1080].map(x=>base.tree(x,570,1.4,1).replaceAll('#8daa74','#b5c3b9').replaceAll('#a8bf85','#d9e1d8').replaceAll('#799860','#91a69e').replaceAll('#bfd298','#edf0dd').replaceAll('#967653','#929a8a').replaceAll('#ba9770','#c3c6ac')).join('')+'<path d="M150 585q470-190 980-70" fill="none" stroke="#d7ddd4" stroke-width="12" opacity=".55"/>';
    if(id==='gold') bg += a.palace().replaceAll('#ecd6ad','#e8ca79').replaceAll('#c49770','#cdb46b');
    if(id==='lake') bg += '<ellipse cx="785" cy="517" rx="350" ry="112" fill="#8cb9b7" stroke="#c9e2d9" stroke-width="9"/>'+[400,580,790,970,1140].map(x=>`<path d="m${x} 493 8-13 8 13-8 13Z" fill="#ecf3db"/>`).join('');
    body = a.horses(2) + actor('carriage',a.carriage()) + actor('hero',a.youth(true)) + actor('king',a.person('king'));
  }
  if (['crown','ending'].includes(id)) body += actor('crown','<path d="M-30 0-33-27-13-13 0-35 13-13 33-27 29 0Z" fill="#dfbd68" stroke="#9b7b43" stroke-width="3"/>');
  if (['wedding','blessing'].includes(id)) bg += a.wrap(655,660,.9,a.table())+a.wrap(650,537,1,a.bowl());
  return `<svg viewBox="0 0 1280 720" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">${base.defs}${bg}${body}</svg>`;
}

function frameJakab(scene, base) {
  const a = createSzekelyArt(base), id = scene.id;
  const woods = ['forest','coat','sneak','beggar','sale'].includes(id);
  const barn = ['grain-trial','threshers','straw','wagon','empty','horse-trial','sleep','ride','surprise','shed'].includes(id);
  const church = ['church','song','sheet'].includes(id);
  let bg = woods ? a.forest() : barn ? a.barn() : church ? a.church() : ['king','reward','new-trial','second-reward','ring-trial','wedding','ending'].includes(id) ? a.hall() : ['queen','ring','royal-return','disguise'].includes(id) ? a.room() : a.yard();
  let body = actor('hero',a.youth());
  if(['brooms','forest'].includes(id)) body += actor('broom',a.broom())+a.wrap(260,660,.8,a.broom())+a.wrap(350,661,.9,a.broom());
  if(['coat','sneak','beggar','sale'].includes(id)) body += actor('coat',a.coat());
  if(['beggar','sale'].includes(id)) body += actor('beggar',a.person('farmer',{worn:true,dress:'#a8957a'}));
  if(['king','grain-trial','empty','reward','horse-trial','surprise','new-trial','second-reward','ring-trial','royal-return','wedding','ending'].includes(id)) body += actor('king',a.person('king'));
  if(['threshers','straw'].includes(id)) for(let i=0;i<12;i++) body+=actor('worker'+i,a.person('farmer',{dress:i%2?'#a3976c':'#829987'}));
  if(id==='straw') body += actor('decoy',a.decoy())+'<path d="M270 555V256m-35 0v299m0-255h35m-35 35h35m-35 35h35m-35 35h35m-35 35h35m-35 35h35" stroke="#b6a176" stroke-width="7"/>';
  if(id==='wagon') {
    body += actor('wagon',a.wagon())+a.wrap(300,483,2,a.seeds());
    for(let i=0;i<6;i++)body+=actor('ox'+i,a.ox());
  }
  if(['horse-trial','prepare','bread','sleep','ride'].includes(id)) body += actor('horse', '<g transform="translate(-330 -555)">'+a.horses(1).replaceAll('#d1ba8d','#b5b8ad')+'</g>');
  if(['sleep','surprise'].includes(id)) for(let i=0;i<4;i++) body+=actor('guard'+i,a.person('farmer',{dress:'#849aa0'}));
  if(['prepare','bread'].includes(id)) body+=actor('supplies','<path d="M-75 0v-70h25V0m75 0v-70h25V0" fill="#a2b99c" stroke="#789279" stroke-width="4"/><path d="M-30 0q-10-42 25-44 40 2 40 44Z" fill="#d4b585" stroke="#a38a60" stroke-width="3"/>');
  if(['crabs','church','song'].includes(id)) for(let i=0;i<8;i++) body+=actor('crab'+i,a.crab());
  if(id==='crabs') bg+= '<path d="M0 536q650-45 1280 45v79q-650-68-1280-14Z" fill="#97b9b5"/>';
  if(['church','song','sheet'].includes(id)) body+=actor('robe',a.sheet());
  if(['sheet','road','shed'].includes(id)) body+=actor('sheet',a.sheet())+actor('priest',a.person('farmer',{dress:'#666e65'}))+actor('cantor',a.person('farmer',{dress:'#8c9178'}));
  if(['disguise','queen','ring'].includes(id))body+=actor('royal-coat', '<path d="M-48-176q-22 77-18 135l26 13h80l26-13q-4-92-19-135" fill="#bb7f65" stroke="#886a51" stroke-width="4"/><path d="M-33-156h66m-30 5v82" stroke="#e0c780" stroke-width="6"/>');
  if(['disguise','queen','ring'].includes(id))body+=actor('formal-hat','<path d="M-45 0h90m-71-2v-40h53v40" fill="#8c8a72" stroke="#6e715f" stroke-width="5"/><path d="M-26-10h53" stroke="#c4b386" stroke-width="6"/>');
  if(['queen','ring','royal-return'].includes(id))body+=actor('queen',a.person('mother'));
  if(['ring-trial','ring'].includes(id))body+=actor('ring',a.ring());
  if(['reward','sale','second-reward'].includes(id))body+=actor('coin',a.coin());
  if(['wedding','ending'].includes(id))body+=actor('princess',a.person('princess'));
  return `<svg viewBox="0 0 1280 720" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">${base.defs}${bg}${body}</svg>`;
}

function renderShepherd(c) {
  const {scene:s,time:t,motion,host,actors,pose,attrs,progress,smooth,mix}=c;
  animateClassic(host,t,motion);const q=smooth(progress(t,s.time,s.end));
  const travelling=['carriage','silver','gold','lake'].includes(s.id);
  pose('hero',s.id==='thinking'?440:travelling?620:480,travelling?495:647,travelling?.33:1.15);
  pose('king',travelling?690:940,travelling?495:645,travelling?.33:1.15);pose('princess',705,643,1.08);
  pose('bear',s.id==='bear'?mix(1000,830,q):835,641,s.id==='calm-bear'?1.1:1.25,s.id==='calm-bear'?mix(0,-5,q):0);
  for(let i=0;i<10;i++)pose('hedgehog'+i,670+i%5*105,525+Math.floor(i/5)*130+(motion&&s.id==='flute'?Math.sin(t*3+i)*13:0),.6);
  pose('flute',530,477,1.15,-25);pose('decoy',910,s.id==='trick'?mix(643,725,q):643,.83);if(s.id==='trick')attrs(actors.decoy,{opacity:1-q});
  pose('carriage',657,570,1.25);pose('crown',480,s.id==='crown'?mix(290,367,q):367,1.1);
  personAction(actors.hero,t,{motion,walk:s.id==='summoned'?1:0,gesture:['reply','wish','promise','blessing'].includes(s.id)?1:0});
  personAction(actors.king,t,{motion,gesture:['reply','third-trial','promise'].includes(s.id)?1:0});
}

// Jakab animation follows only audio time, including seeking and reduced motion.
function renderJakab(c) {
  const {scene:s,time:t,motion,host,actors,pose,attrs,progress,smooth,mix}=c;
  animateClassic(host,t,motion);const q=smooth(progress(t,s.time,s.end)),id=s.id;
  const travel=['forest','sneak','ride','road'].includes(id);
  const heroX=id==='ride'?mix(650,980,q):travel?mix(420,660,q):480;
  pose('hero',heroX,id==='ride'?560:646,id==='ride'?.6:1.1);pose('royal-coat',heroX,646,1.1);pose('formal-hat',heroX,373,1.1);
  pose('king',970,646,1.2);pose('queen',875,646,1.08);pose('princess',690,646,1.05);pose('beggar',840,646,1.1);
  pose('broom',560,645,1);pose('coat',id==='sneak'?mix(370,540,q):380,540,1);pose('coin',650,520,1);
  for(let i=0;i<12;i++)pose('worker'+i,400+i%6*118,480+Math.floor(i/6)*170,.53);
  pose('decoy',650,id==='straw'?mix(250,610,q):610,.8,id==='straw'?mix(-25,85,q):0);
  pose('wagon',290,611,1.1);for(let i=0;i<6;i++)pose('ox'+i,560+Math.floor(i/2)*200,620+i%2*47,.7);
  pose('horse',id==='ride'?mix(650,980,q):850,635,id==='ride'?1.45:1.7);pose('supplies',600,546,1);
  for(let i=0;i<4;i++){pose('guard'+i,710+i*120,650,.7,12);personAction(actors['guard'+i],t,{motion,head:12});}
  for(let i=0;i<8;i++)pose('crab'+i,670+i%4*125+(motion?Math.sin(t*.4+i)*22:0),570+Math.floor(i/4)*75,.8);
  pose('robe',heroX,610,.35);pose('sheet',815,675,1.05);pose('priest',755,640,.65,-13);pose('cantor',880,644,.65,13);
  pose('ring',id==='ring'?mix(875,555,q):650,499,1);
  personAction(actors.hero,t,{motion,walk:travel?1:0,gesture:['sale','king','grain-trial','ring','song'].includes(id)?1:0});
  personAction(actors.king,t,{motion,gesture:['new-trial','ring-trial','reward'].includes(id)?1:0});
  if(id==='sneak')attrs(actors.coat,{opacity:1-q*.7});
}

export const STORIES=KRIZA_REQUESTED.filter(story=>STORY_CAPTION_TIMES[story.id]).map(story=>{
  const times=STORY_CAPTION_TIMES[story.id];
  const starts=AUDIOBOOKS.find(recording=>recording.id===story.id).captionParagraphStarts;
  const scenes=plans[story.id].map(([line,id,title],index)=>({time:index?times[starts[line]]:0,line,caption:starts[line],id,title}));
  for(let i=0;i<scenes.length;i++)scenes[i].end=scenes[i+1]?.time??times.at(-1)+1;
  const shepherd=story.id==='szekely-csillagszemu-juhasz';
  return {id:story.id,scenes,frame:shepherd?frameShepherd:frameJakab,render:shepherd?renderShepherd:renderJakab};
});
