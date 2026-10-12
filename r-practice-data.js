import { normalizeText } from './speech-matching.js';
import { words as pictureWords } from './game-data.js';

export const R_GAMES = [
  { id: 'hunter', name: 'Hangvadász', icon: '🔎', detail: 'Képkereső · R-hang · az R helye' },
  { id: 'post', name: 'Robotpostás', icon: '🤖', detail: 'Mondd utánam · válassz barátot · küldd el' },
  { id: 'workshop', name: 'Perecműhely', icon: '🥨', detail: 'Gyakorolj · válassz díszt · alkoss' },
  { id: 'rhyme', name: 'Mondókaliget', icon: '🎵', detail: 'Mondjuk együtt · keresd az elbújt szót' },
  { id: 'echo', name: 'Saját visszhang', icon: '🎙️', detail: 'Vedd fel · hasonlítsd össze a mintával' },
];

// These groups describe the target's location, not a clinical difficulty order.
export const R_WORDS = [
  ['roka','róka','🦊','initial','vörös róka'], ['repa','répa','🥕','initial','piros répa'],
  ['robot','robot','🤖','initial','vidám robot'], ['ruha','ruha','👕','initial','piros ruha'],
  ['rozsa','rózsa','🌹','initial','piros rózsa'], ['raketa','rakéta','🚀','initial','repül a rakéta'],
  ['radio','rádió','📻','initial','szól a rádió'], ['rak','rák','🦀','initial','apró rák'],
  ['rizs','rizs','🍚','initial','forró rizs'], ['roller','roller','🛴','initial','gurul a roller'],
  ['virag','virág','🌷','medial','piros virág'], ['korte','körte','🍐','medial','érett körte'],
  ['perec','perec','🥨','medial','kerek perec'], ['korona','korona','👑','medial','arany korona'],
  ['barack','barack','🍑','medial','érett barack'], ['ceruza','ceruza','✏️','medial','piros ceruza'],
  ['erdo','erdő','🌲','medial','sűrű erdő'], ['sarkany','sárkány','🐉','medial','repül a sárkány'],
  ['torta','torta','🎂','medial','kerek torta'], ['dinnye','görögdinnye','🍉','medial','érett görögdinnye'],
  ['var','vár','🏰','final','magas vár'], ['pohar','pohár','🥛','final','üres pohár'],
  ['madar','madár','🐦','final','repül a madár'], ['eger','egér','🐭','final','apró egér'],
  ['hoember','hóember','⛄','final','fehér hóember'], ['naptar','naptár','📅','final','új naptár'],
  ['szamar','szamár','🫏','final','szürke szamár'], ['vodor','vödör','🪣','final','üres vödör'],
  ['sator','sátor','⛺','final','piros sátor'], ['kosar','kosár','🧺','final','üres kosár'],
].map(([id, text, icon, position, phrase]) => ({ id, text, icon, position, phrase }));

export const R_DISTRACTORS = [
  ...pictureWords.filter(word => !/r/i.test(word.label) && !['anya','apa','szia'].includes(word.id))
    .map(({id,label,emoji}) => ({id,text:label,icon:emoji})),
  {id:'banan',text:'banán',icon:'🍌'},
];

export const R_RHYMES = [
  {id:'roka', title:'Róka és robot', icon:'🦊', lines:[
    ['Róka fut a réten át.', '🦊 🌿'], ['Robot őrzi a répát.', '🤖 🥕'],
    ['Ropi roppan, perec kerek.', '🥨'], ['Velük játszik minden gyerek.', '🧒 🌼'],
  ]},
  {id:'kert', title:'Rózsakert', icon:'🌹', lines:[
    ['Piros rózsa nyílik reggel.', '🌹 ☀️'], ['Robot locsol friss vízcseppel.', '🤖 💧'],
    ['Róka körben táncot jár.', '🦊 🎵'], ['Ránk egy szép virágkert vár.', '🌷 🌹'],
  ]},
  {id:'sator', title:'Erdei kirándulás', icon:'⛺', lines:[
    ['Erre gyere, erre várunk!', '🦊 👋'], ['Erdő mellett sátrat állunk.', '🌲 ⛺'],
    ['Körte kerül a kosárba.', '🍐 🧺'], ['Róka indul vacsorára.', '🦊 🍽️'],
  ]},
  {id:'robot', title:'Rajzoló robot', icon:'🤖', lines:[
    ['Rajzol a robot: kerek a nap.', '🤖 ☀️'], ['Piros ceruzát a kezébe kap.', '✏️'],
    ['Rajzol egy rókát, rajzol egy várat.', '🦊 🏰'], ['Rajzol az égre repülő madarat.', '🐦'],
  ]},
];

export const R_POSITIONS = { all:'Minden szó', initial:'Szó elején', medial:'Szó közepén', final:'Szó végén' };
export const R_HUNTER_MODES = {picture:'Képkereső',sound:'R-hang',position:'Az R helye'};
export const R_RECIPIENTS = [{id:'fox',name:'Róka',icon:'🦊'},{id:'bear',name:'Maci',icon:'🧸'},{id:'rabbit',name:'Nyuszi',icon:'🐰'}];
export const R_STAMPS = [{id:'flower',name:'Virágos',icon:'🌼'},{id:'star',name:'Csillagos',icon:'⭐'},{id:'leaf',name:'Leveles',icon:'🍃'}];
export const R_RHYME_EXTRA_WORDS = [{id:'gyerek',text:'gyerek',icon:'🧒'},{id:'gyere',text:'gyere',icon:'👋'},{id:'viragkert',text:'virágkert',icon:'🌷'}];
const gaps = {
  roka:[['Róka','roka'],['répát','repa'],['perec','perec'],['gyerek','gyerek']],
  kert:[['rózsa','rozsa'],['Robot','robot'],['Róka','roka'],['virágkert','viragkert']],
  sator:[['gyere','gyere'],['sátrat','sator'],['Körte','korte'],['Róka','roka']],
  robot:[['robot','robot'],['ceruzát','ceruza'],['várat','var'],['madarat','madar']],
};
export function rhymeGap(rhymeId, line) {
  const [missing,id] = gaps[rhymeId]?.[line] || [];
  const word = [...R_WORDS,...R_RHYME_EXTRA_WORDS].find(word=>word.id===id);
  return word ? {missing,word,voice: R_WORDS.includes(word) ? `r_word_${id}` : `r_puzzle_word_${id}`} : null;
}
export function buildRhymeChoices(rhymeId, line, random=Math.random) {
  const gap=rhymeGap(rhymeId,line);
  if(!gap)return [];
  const others=shuffleR(R_WORDS.filter(word=>word.id!==gap.word.id),random).slice(0,2);
  return shuffleR([gap.word,...others],random);
}
export function rSoundPositions(text) {
  const letters=[...String(text).toLocaleLowerCase('hu')];
  return [...new Set(letters.flatMap((letter,i)=>letter==='r'?[i===0?'initial':i===letters.length-1?'final':'medial']:[]))];
}
export function pickRGame(progress, previous, random=Math.random) {
  const stats=normalizeRProgress(progress);
  const games=R_GAMES.filter(({id})=>id!==previous);
  const minimum=Math.min(...games.map(({id})=>stats.games[id].rounds));
  const pool=games.filter(({id})=>stats.games[id].rounds===minimum);
  return pool[Math.min(pool.length-1,Math.max(0,Math.floor(random()*pool.length)))].id;
}
export const R_PREFERENCES_KEY = 'beszedtanulas.rPractice.v1';
export function normalizeRPreferences(raw = {}) {
  return {
    position: Object.hasOwn(R_POSITIONS, raw?.position) ? raw.position : 'all',
    speechMode: ['together','encouraging','words'].includes(raw?.speechMode) ? raw.speechMode : 'together',
    target: raw?.target === 'phrase' ? 'phrase' : 'word',
    choices: raw?.choices === 3 ? 3 : 2,
    roundLength: raw?.roundLength === 5 ? 5 : 3,
    hunterKind: Object.hasOwn(R_HUNTER_MODES,raw?.hunterKind) ? raw.hunterKind : 'picture',
    rhymeMode: raw?.rhymeMode === 'missing' ? 'missing' : 'say',
  };
}
export function loadRPreferences(storage) {
  try { return normalizeRPreferences(JSON.parse(storage?.getItem(R_PREFERENCES_KEY))); }
  catch { return normalizeRPreferences(); }
}
export function saveRPreferences(storage, value) {
  try { storage?.setItem(R_PREFERENCES_KEY, JSON.stringify(normalizeRPreferences(value))); } catch {}
}
export function rWordPool(position = 'all') {
  return R_WORDS.filter(word => position === 'all' || word.position === position);
}
export function shuffleR(items, random = Math.random) {
  const result = [...items];
  for (let i=result.length-1;i>0;i--) { const j=Math.min(i,Math.max(0,Math.floor(random()*(i+1)))); [result[i],result[j]]=[result[j],result[i]]; }
  return result;
}
export function buildRPracticeDeck(preferences, previousIds=[], random=Math.random, count=normalizeRPreferences(preferences).roundLength) {
  const pool=rWordPool(normalizeRPreferences(preferences).position), previous=new Set(previousIds);
  const fresh=shuffleR(pool.filter(word=>!previous.has(word.id)),random);
  const familiar=shuffleR(pool.filter(word=>previous.has(word.id)),random);
  return [...fresh,...familiar].slice(0,count);
}
export function buildRHunterRound(preferences, random = Math.random, previousIds=[]) {
  const options = normalizeRPreferences(preferences), pool = rWordPool(options.position);
  return buildRPracticeDeck(options,previousIds,random).map(target => {
    const others = options.hunterKind === 'sound' ? R_DISTRACTORS : pool.filter(word=>word.id!==target.id);
    return { target, choices:shuffleR([target, ...shuffleR(others,random).slice(0,options.choices-1)],random) };
  });
}

// A word match is a transcript match, never a rating of the R sound's articulation.
export function matchRPracticeSpeech(expected, alternatives = []) {
  const target = normalizeText(expected).split(' ').filter(Boolean);
  if (!target.length) return false;
  return alternatives.some(text => {
    const tokens=normalizeText(text).split(' ').filter(Boolean);
    return tokens.some((_,i)=>target.every((token,j)=>tokens[i+j]===token));
  });
}

const counter = value => Number.isSafeInteger(value) && value>=0;
export function normalizeRProgress(value) {
  return { version:1, games:Object.fromEntries(R_GAMES.map(({id})=>{
    const stats=Object.fromEntries(['rounds','practices','recognized','confirmed'].map(key=>[key,counter(value?.games?.[id]?.[key])?value.games[id][key]:0]));
    stats.recognized=Math.min(stats.recognized,stats.practices);
    return [id,stats];
  })) };
}
export function validateRProgress(value) {
  if (value===undefined) return;
  if (!value || value.version!==1 || !value.games || typeof value.games!=='object' || Array.isArray(value.games)) throw Error('Az R-kaland mentése hibás.');
  for (const [id,stats] of Object.entries(value.games)) {
    if (!R_GAMES.some(game=>game.id===id) || !stats || !['rounds','practices','recognized','confirmed'].every(key=>counter(stats[key])) || stats.recognized>stats.practices) throw Error('Az R-kaland eredményei hibásak vagy újabb játékból származnak.');
  }
}
export function recordRProgress(progress, gameId, event) {
  const next=normalizeRProgress(progress);
  if (!Object.hasOwn(next.games,gameId)) return next;
  const stats=next.games[gameId], increment=key=>{if(stats[key]<Number.MAX_SAFE_INTEGER)stats[key]++;};
  if (event==='round') increment('rounds');
  if (event==='practice' || event==='recognized') increment('practices');
  if (event==='recognized' && stats.recognized<stats.practices) increment('recognized');
  if (event==='confirmed') increment('confirmed');
  return next;
}
