import { twoWordPhrases } from './game-data.js';

export const PHRASE_GROUPS = {all:'Minden kifejezés', request:'Kérek valamit', person_action:'Ki mit csinál?', attribute_object:'Milyen?', more_stop:'Még vagy elég'};
export function phraseIndexes({group='all',topic='all'}={}) {
  return twoWordPhrases.flatMap((phrase,index)=>(group==='all'||phrase.group===group)&&(topic==='all'||phrase.topic===topic)?[index]:[]);
}
export function buildPhraseDeck(pool, count, first=pool[0], random=Math.random) {
  if (!pool.length || !Number.isInteger(count) || count < 1) return [];
  const result=pool.includes(first)?[first]:[], used=new Set(result);
  while(result.length<count) {
    let available=pool.filter(index=>!used.has(index));
    if(!available.length){used.clear();available=pool.filter(index=>pool.length===1||index!==result.at(-1));}
    const selected=available[Math.min(available.length-1,Math.max(0,Math.floor(random()*available.length)))];
    result.push(selected);used.add(selected);
  }
  return result;
}
