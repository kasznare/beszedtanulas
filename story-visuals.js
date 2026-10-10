import { collectAmbient, animateAmbient } from './story-art/animate.js';
import { createBaseArt } from './story-art/base.js';
import { STORY_VISUAL_DURATION, storySceneAt } from './story-visual-data.js';

const clamp = (value, low = 0, high = 1) => Math.max(low, Math.min(high, value));
const progress = (time, start, end) => clamp((time - start) / (end - start));
const smooth = value => { value = clamp(value); return value * value * (3 - 2 * value); };
const mix = (a, b, amount) => a + (b - a) * amount;
let instance = 0;

function artwork(prefix) {
  const art = createBaseArt(prefix);
  const { defs, head, standing, wheel, car, girl, excavator, serviceTruck, crane, plant, tree, house, background } = art;
  const wrap = (name, content) => `<g data-actor="${name}">${content}</g>`;
  function frame(scene) {
    const garden = ['garden','together'].includes(scene.id), group = ['team','annipanni','finish','together'].includes(scene.id);
    let actors = wrap('police',car(true));
    if (!garden || scene.id==='together') actors += wrap('race',car(false));
    if (['bend','excavator','dig','fire-arrival','water','ambulance'].includes(scene.id)) actors += wrap('fox',standing('fox'));
    if (['excavator','dig'].includes(scene.id)||group) actors += wrap('excavator',excavator());
    if (['fire-arrival','water'].includes(scene.id)||group) actors += wrap('firetruck',serviceTruck());
    if (['fire-arrival','water'].includes(scene.id)) actors += wrap('firefighter',standing('rabbit','#e1b866','#ca7055'));
    if (['ambulance','thanks'].includes(scene.id)||group) actors += wrap('ambulance',serviceTruck(true));
    if (scene.id==='ambulance') actors += wrap('medic',standing('rabbit','#f3ecd4','#f4efdc'))+wrap('stretcher','<ellipse cx="20" cy="20" rx="106" ry="9" fill="#535b49" opacity=".13"/><path d="M-76 6h167m-142-9-9 18M63-3l11 18" stroke="#8b9a8b" stroke-width="6" stroke-linecap="round"/><circle cx="-60" cy="20" r="7" fill="#5e6a5e"/><circle cx="76" cy="20" r="7" fill="#5e6a5e"/><path d="M-78-14H95v15H-78Z" fill="#cbd6b6" stroke="#879d81" stroke-width="3"/><g transform="translate(-43 -43) rotate(-16) scale(.63)">'+head('fox')+'</g><path d="M-25-30q56-17 112 5v10H-25Z" fill="#8daaa2" stroke="#729184" stroke-width="2"/><path d="M56-30v15" stroke="#fff5e0" stroke-width="13"/>');
    if (scene.id==='crane'||group) actors += wrap('crane',crane());
    if (garden || group) actors += wrap('girl',girl(scene.id==='garden'));
    if (group) actors += wrap('bear',standing());
    const effects = `<g data-effect="smoke">${Array.from({length:7},(_,i)=>`<ellipse data-smoke="${i}" rx="${13+i*2}" ry="${11+i*2}" fill="#afada0"/>`).join('')}</g><g data-effect="flames">${[0,1,2].map(i=>`<g transform="translate(${902+i*25} 535)"><path class="sv-flame" data-seed="${i}" d="M-21 0q-23-32 1-49-2 19 12 15 16-31 13-55 43 49 20 70-10 17-46 19Z" fill="#de9470"/><path d="M-8-1q-16-26 5-46 1 22 16 20 10 16-1 23Z" fill="#f1c781"/></g>`).join('')}</g><path data-effect="hose" d="M272 526Q289 631 426 568q56-13 113-71" stroke="#6f968b" stroke-width="12" fill="none" stroke-linecap="round"/><path data-effect="jet" d="M561 484Q716 403 919 516" stroke="#c2e5e0" stroke-width="12" fill="none" stroke-linecap="round"/><g data-effect="water">${Array.from({length:16},(_,i)=>`<ellipse data-water="${i}" rx="4" ry="7" fill="#a3d3d2"/>`).join('')}</g><g data-effect="garden-water">${Array.from({length:12},(_,i)=>`<ellipse data-garden-water="${i}" rx="2.5" ry="5" fill="#9ccbcc"/>`).join('')}</g><g data-effect="dust">${Array.from({length:7},(_,i)=>`<ellipse data-dust="${i}" rx="${16+i*4}" ry="${10+i*2}" fill="#e8d7b2"/>`).join('')}</g><g data-effect="soil">${Array.from({length:8},(_,i)=>`<ellipse data-soil="${i}" rx="${4+i%3}" ry="3" fill="#a28b64"/>`).join('')}</g><path data-effect="cable" fill="none" stroke="#7b8271" stroke-width="4"/><path data-effect="sling" fill="none" stroke="#a9a17a" stroke-width="4"/><path data-effect="hook" fill="none" stroke="#657767" stroke-width="8" stroke-linecap="round"/>`;
    return `<svg viewBox="0 0 1280 720" preserveAspectRatio="xMidYMid meet" aria-hidden="true" xmlns="http://www.w3.org/2000/svg">${defs}${background(garden,scene.id==='together')}${actors}${effects}</svg>`;
  }
  return {frame};
}

/** Every pose is a function of the recording's time, so pausing and seeking stay exact. */
export function createStoryVisual(host, { readTime = () => 0, onScene = () => {} } = {}) {
  const art = artwork(`sv${++instance}`);
  const media = matchMedia('(prefers-reduced-motion: reduce)');
  let motion = !media.matches, scene, nodes, animation = 0, playing = false, lastTime = 0, destroyed = false;
  const attrs = (node, values) => { if(node) for(const [key,value] of Object.entries(values)) node.setAttribute(key,String(value)); };
  function mount(next) {
    scene=next;host.innerHTML=art.frame(scene);host.dataset.scene=scene.id;
    host.setAttribute('role','img');host.setAttribute('aria-label',`Boribon és a rendőrautó: ${scene.title}.`);
    nodes={actors:Object.fromEntries([...host.querySelectorAll('[data-actor]')].map(node=>[node.dataset.actor,node])),effects:Object.fromEntries([...host.querySelectorAll('[data-effect]')].map(node=>[node.dataset.effect,node]))};
    for(const name of ['plants','trees','clouds','birds','butterflies','eyes','drivers','wheels','glows','flames','smoke','water','gardenWater','dust','soil']){
      const selector={plants:'.sv-plant',trees:'.sv-tree',clouds:'.sv-cloud',birds:'.sv-bird',butterflies:'.sv-butterfly',eyes:'.sv-eyes',drivers:'.sv-driver',wheels:'.sv-wheel',glows:'.sv-glow',flames:'.sv-flame',smoke:'[data-smoke]',water:'[data-water]',gardenWater:'[data-garden-water]',dust:'[data-dust]',soil:'[data-soil]'}[name];
      nodes[name]=[...host.querySelectorAll(selector)];
    }
    nodes.ambient=collectAmbient(host);
    onScene(scene);
  }
  function pose(name,x,y,scale=1,angle=0) {attrs(nodes.actors[name],{transform:`translate(${x.toFixed(2)} ${y.toFixed(2)}) scale(${scale}) rotate(${angle.toFixed(2)} 125 100)`});}
  function visible(name,opacity) {attrs(nodes.effects[name],{opacity:clamp(opacity)});}
  function arm(actor,name,angle) {attrs(nodes.actors[actor]?.querySelector(name),{transform:`rotate(${angle} ${name.includes('left')?-27:28} -96)`});}
  function render(seconds = readTime()) {
    if(destroyed)return;
    let t=Number.isFinite(seconds)?clamp(seconds,0,STORY_VISUAL_DURATION):0;
    lastTime=t;const next=storySceneAt(t);if(next.id!==scene?.id)mount(next);
    host.dataset.time=t.toFixed(3);
    // Reduced motion presents one stable pose per narrated scene.
    if(!motion)t={garden:17,chase:40,bend:57,excavator:74,dig:87,'fire-arrival':99.5,water:102,ambulance:119,crane:140,thanks:158,team:178,annipanni:200,finish:222,together:240}[scene.id];
    const m=motion?1:0, ambient=motion?t:0, id=scene.id, local=t-scene.time;
    const ease=(start,end)=>smooth(progress(t,start,end));
    for(const name of Object.keys(nodes.effects))visible(name,0);
    animateAmbient(nodes.ambient,ambient,motion);
    nodes.glows.forEach(node=>attrs(node,{opacity:t>=24.54?.15+m*(Math.sin(ambient*2.2)+1)*.13:0}));
    // The fox leaves the racing car at the accident; later poses show the same fox outside.
    attrs(nodes.actors.race?.querySelector('.sv-driver'),{opacity:!['garden','chase','bend'].includes(id)||t>=53.29?0:1});
    let drive=0,raceDrive=0;
    if(id==='garden') {
      const depart=ease(21.43,29.199);pose('police',480+depart*335,438-m*Math.sin(t*2.8)*.8,.9);
      pose('girl',180,321,1);drive=t>21.43?(t-21.43)*125:0;
      attrs(host.querySelector('.sv-gate'),{transform:`scale(${1-depart*.66} 1)`});
      attrs(host.querySelector('.sv-girl-right'),{transform:`rotate(${m*Math.sin(t*.6)*3} 61 78)`});
      attrs(host.querySelector('.sv-girl-head'),{transform:`translate(42 41) rotate(${m*Math.sin(t*.8)*1.5})`});
      visible('garden-water',1);nodes.gardenWater.forEach((node,i)=>{const p=(ambient*.72+i/12)%1;attrs(node,{cx:346+p*32,cy:437+p*95,opacity:(1-p)*.8,transform:`rotate(18 ${346+p*32} ${437+p*95})`});});
    } else if(id==='chase') {
      const chase=ease(32.78,46.6);pose('police',140+chase*255,442-m*Math.sin(t*3)*1.2,.92);pose('race',410+chase*410,443-m*Math.sin(t*4)*1.3,.95);
      attrs(nodes.actors.race,{opacity:progress(t,32.78,33.2)});drive=local*180;raceDrive=local*240;visible('dust',progress(t,33,35)*.6);
      nodes.dust.forEach((node,i)=>attrs(node,{cx:405+chase*410-i*24,cy:559+Math.sin(ambient*1.5+i)*7,opacity:.14+i*.035}));
    } else if(id==='bend') {
      const turn=ease(49.478,53.7),stop=ease(47,54);pose('police',165+stop*184,449,.9);pose('race',710+turn*90,447+turn*83,.92,-turn*159);drive=(1-stop)*local*135;raceDrive=(1-turn)*local*210;
      pose('fox',mix(841,1080,turn),mix(499,574,turn),.68);attrs(nodes.actors.fox,{opacity:progress(t,53.29,55.3)});
      visible('smoke',progress(t,59.39,63.3)*.6);visible('dust',(1-turn)*.45);
      nodes.dust.forEach((node,i)=>attrs(node,{cx:732-i*26,cy:559+Math.sin(ambient+i)*5,opacity:.16}));
    } else if(id==='excavator'||id==='dig') {
      pose('police',90,450,.78);pose('excavator',mix(-255,380,ease(63.561,68.8)),569,1);pose('fox',1090,570,.68);
      const dig=ease(81,87.5);pose('race',820,530-dig*60,.9,-159+dig*20);
      const reach=id==='excavator'?ease(68,71.9):1;const a=mix(-61,-20,reach)-dig*9,b=mix(78,53,reach)+dig*10;
      attrs(host.querySelector('[data-part="boom"]'),{transform:`translate(155 -114) rotate(${a})`});attrs(host.querySelector('[data-part="stick"]'),{transform:`translate(200 0) rotate(${b})`});attrs(host.querySelector('[data-part="bucket"]'),{transform:`translate(155 0) rotate(${-10+dig*22})`});
      visible('soil',id==='dig'?Math.sin(progress(t,81,88.5)*Math.PI)*.8:0);nodes.soil.forEach((node,i)=>{const p=(ambient*.65+i/8)%1;attrs(node,{cx:842+i*6-25*p,cy:542+44*p,opacity:1-p});});
      visible('smoke',.75);drive=t<68.8?local*75:0;
    } else if(id==='fire-arrival'||id==='water') {
      pose('police',45,462,.68);pose('race',820,475,.9,-138);pose('fox',1120,566,.68);pose('firetruck',mix(-330,204,ease(91.553,96.9)),582,.91);
      pose('firefighter',510,588,.76);attrs(nodes.actors.firefighter,{opacity:progress(t,97,99.3)});
      const water=progress(t,99.811,100.2),out=1-ease(102.856,105.6);visible('flames',out*.95);visible('smoke',out*.65);visible('hose',water);visible('jet',water*out*.45);visible('water',water);
      nodes.water.forEach((node,i)=>{const p=(ambient*.9+i/16)%1;attrs(node,{cx:561+358*p,cy:484-162*p+194*p*p,opacity:(1-p)*.85,transform:`rotate(${-35+70*p} ${561+358*p} ${484-162*p+194*p*p})`});});
      arm('firefighter','.sv-arm-right',-103);drive=t<96.9?local*95:0;
    } else if(id==='ambulance') {
      pose('police',75,456,.73);pose('race',595,493,.78,-139);pose('ambulance',mix(1370,886,ease(112.55,115.8)),573,.95);pose('medic',786,585,.75);pose('stretcher',mix(760,912,ease(118.5,122.7)),574,1);
      const treat=progress(t,116.194,117);attrs(nodes.actors.medic,{opacity:treat});attrs(nodes.actors.stretcher,{opacity:treat*(1-ease(121.8,123.6))});attrs(host.querySelector('.sv-patient'),{opacity:ease(121.8,123.6)});
      pose('fox',1074,574,.68);attrs(nodes.actors.fox,{opacity:1-treat});
      attrs(host.querySelector('.sv-ambulance-door'),{transform:`translate(${-24*progress(t,116,117)*(1-ease(121.5,123.2))} 0)`});arm('medic','.sv-arm-left',-31);arm('medic','.sv-arm-right',35);drive=t<115.8?local*90:0;
    } else if(id==='crane') {
      pose('police',46,457,.73);pose('crane',mix(-330,186,ease(129.452,132.5)),581,1);
      const connected=ease(132.523,136.8),lift=ease(137.869,140.5),lower=ease(140.6,142.5),a=mix(-49,-30,connected),r=a*Math.PI/180;
      attrs(host.querySelector('[data-part="crane-boom"]'),{transform:`translate(158 -76) rotate(${a})`});
      const x=186+158+500*Math.cos(r),y=581-76+500*Math.sin(r),carY=515-107*lift+48*lower,hookY=mix(y+37,carY-4,connected);
      pose('race',connected>.95?x-118:795,carY,.92,-139*(1-lift));
      attrs(nodes.effects.cable,{d:`M${x} ${y}V${hookY}`});attrs(nodes.effects.hook,{d:`M${x} ${hookY-3}v11q12 18 17-2`});
      attrs(nodes.effects.sling,{d:`M${x+8} ${hookY+13} ${x-75} ${carY+70}M${x+8} ${hookY+13} ${x+75} ${carY+70}`});
      visible('cable',progress(t,132.5,133));visible('hook',progress(t,132.5,133));visible('sling',progress(t,136,137));drive=t<132.5?local*75:0;
    } else if(id==='thanks') {
      pose('police',220,440,1.03);pose('race',610,442,.83);pose('ambulance',870,587,1.07);
      attrs(host.querySelector('.sv-patient-wave'),{transform:`rotate(${-20-m*Math.sin(t*3)*17} 20 25)`});
      attrs(host.querySelector('.sv-patient-head'),{transform:`rotate(${m*Math.sin(t*.7)*2})`});
    } else {
      const finish=id==='finish',end=id==='together';pose('police',40,411,.65);pose('race',272,414,.65);pose('excavator',473,519,.50);pose('firetruck',681,516,.50);pose('crane',863,523,.45);pose('ambulance',1069+(finish?ease(225.5,229.8)*330:0),518,.55);
      pose('bear',512,651,1.05);pose('girl',654,447,.97);attrs(nodes.actors.girl,{opacity:end?1:progress(t,189.079,192.5)});
      attrs(host.querySelector('[data-part="boom"]'),{transform:`translate(155 -114) rotate(${-54+(finish?ease(220,225)*27:0)})`});attrs(host.querySelector('[data-part="stick"]'),{transform:'translate(200 0) rotate(88)'});
      attrs(host.querySelector('[data-part="crane-boom"]'),{transform:`translate(158 -76) rotate(${-34-(finish?ease(223,226)*18:0)})`});
      arm('bear','.sv-arm-right',id==='team'?-55-m*Math.sin(t*1.2)*7:end?-119-m*Math.sin(t*2.4)*9:-12);
      arm('bear','.sv-arm-left',id==='team'?18:-10);attrs(nodes.actors.bear?.querySelector('.sv-head'),{transform:`rotate(${m*Math.sin(t*.8)*2.4})`});
      attrs(nodes.actors.girl?.querySelector('.sv-girl-right'),{transform:`rotate(${end?-65-m*Math.sin(t*2.4)*8:0} 61 78)`});
      if(finish)drive=progress(t,225.5,229.8)*local*45;
    }
    // Small movements stay restrained; the narrated actions are the larger movements.
    nodes.wheels.forEach(node=>{const actor=node.closest('[data-actor]')?.dataset.actor;attrs(node,{transform:`rotate(${motion?(actor==='race'?raceDrive:drive):0})`});});
    nodes.flames.forEach((node,i)=>attrs(node,{transform:`scale(${1+m*Math.sin(ambient*3+i)*.06} ${1+m*Math.sin(ambient*2.7+i)*.12})`}));
    nodes.smoke.forEach((node,i)=>{const p=(ambient*.17+i/7)%1;attrs(node,{cx:935+Math.sin(ambient*.45+i)*18+p*30,cy:515-p*138,opacity:(1-p)*.38,transform:`translate(${id==='bend'? -26:0} 0) scale(1)`});});
    for(const actor of ['fox','bear','medic','firefighter'])attrs(nodes.actors[actor]?.querySelector('.sv-body'),{transform:`translate(0 ${m*Math.sin(ambient*1.7)*1.2})`});
  }
  function tick() {animation=0;if(destroyed||!playing)return;render(readTime());animation=requestAnimationFrame(tick);}
  function sync(seconds,active=false) {
    playing=Boolean(active);render(seconds);
    if(!playing){cancelAnimationFrame(animation);animation=0;}
    else if(!animation)animation=requestAnimationFrame(tick);
  }
  function setMotion(value) {motion=Boolean(value);render(readTime());}
  const preference=()=>setMotion(!media.matches);media.addEventListener('change',preference);
  render(0);
  return {render,sync,setMotion,get motion(){return motion;},get time(){return lastTime;},destroy(){destroyed=true;playing=false;cancelAnimationFrame(animation);media.removeEventListener('change',preference);host.replaceChildren();}};
}
