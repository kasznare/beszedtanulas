import { wordPicture } from './word-art.js';

export function setupFlipGame({effect=()=>{},onRestart=()=>{},getOptions,setMode,playWord,speak,stopPlayback,onComplete}) {
  const root=document.querySelector('#flip');
  let active=false,deck=[],targetOrder=[],mode='free',phase='preview',opened=new Set(),target=0,missing=null,complete=false,generation=0,timer=null;
  const $=s=>root.querySelector(s), allowed=()=>active&&!document.hidden;
  const cancel=()=>{generation++;clearTimeout(timer);stopPlayback();};
  const shuffle=items=>{const result=[...items];for(let i=result.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[result[i],result[j]]=[result[j],result[i]];}return result;};
  function render(focus){
    root.innerHTML=`<div class="flip-game"><div class="upgrade-options" role="group" aria-label="Elbújós játék módja">${[['free','Meglepetések'],['find','Hol bújt el?'],['missing','Mi hiányzik?']].map(([id,name])=>`<button data-flip-mode="${id}" aria-pressed="${mode===id}">${name}</button>`).join('')}</div>
      <h2 class="sr-only">${mode==='missing'?'Melyik kép bújt el?':'Fordíts fel egy kártyát'}</h2><p id="flip-status" class="listen-status" role="status">${complete?'Megtaláltad!':phase==='preview'&&mode!=='free'?'Nézd meg a képeket, aztán bújtassuk el őket!':mode==='find'?`Keresd meg: ${deck[target]?.label}!`:mode==='missing'?'Melyik kép hiányzik?':`${opened.size} / ${deck.length}`}</p>
      <div id="flip-grid" class="flip-grid">${deck.map((word,i)=>{
        const revealed=mode==='free'?opened.has(i):phase==='preview'||opened.has(i)||(mode==='missing'&&i!==missing);
        return `<button class="flip-card ${revealed?'is-open':''}" data-flip-index="${i}" data-word="${word.id}" aria-pressed="${revealed}" aria-label="${revealed?word.label+' meghallgatása':'Meglepetés '+(i+1)}" ${complete?'disabled':''}><span class="flip-card-face flip-card-back" aria-hidden="true">✦</span><span class="flip-card-face flip-card-front" aria-hidden="true"><span class="card-emoji">${wordPicture(word)}</span><span class="card-word">${word.label}</span></span></button>`;
      }).join('')}</div>
      ${mode==='missing'&&phase==='guess'?`<div class="flip-answer-grid" role="group" aria-label="Melyik kép hiányzik?">${shuffle(deck).map(word=>`<button class="upgrade-action" data-missing-answer="${word.id}" aria-label="${word.label}">${wordPicture(word)}</button>`).join('')}</div>`:''}
      <div class="upgrade-options">${mode!=='free'&&phase==='preview'?'<button id="flip-hide">🙈 Elbújhat!</button>':''}${mode!=='free'&&phase==='guess'?'<button id="flip-repeat">🔊 Hallgassuk újra!</button>':''}<button id="flip-new" aria-label="Új meglepetések">↻ Új képek</button></div></div>`;
    if(focus)$(focus)?.focus({preventScroll:true});
  }
  function start(){
    onRestart();cancel();active=true;const opts=getOptions();mode=opts.flipMode||'free';
    deck=shuffle(opts.words).slice(0,mode==='missing'?4:6);targetOrder=shuffle(deck.map((_,i)=>i));opened=new Set();phase=mode==='free'?'guess':'preview';target=targetOrder[0];complete=false;missing=Math.floor(Math.random()*deck.length);render();
    if(mode!=='free')void speak(mode==='find'?'flip_preview':'flip_missing');
  }
  async function finish(){
    if(complete)return;complete=true;phase='done';render('#flip-new');
    onComplete(deck.length);
  }
  function repeat(){
    if(!allowed())return;
    if(mode==='find'&&phase==='guess')return speak(['flip_find',`word_${deck[target].id}`]);
    if(mode==='missing'&&phase==='guess')return speak('flip_choose_missing');
    return speak(mode==='free'?'guide_flip':mode==='find'?'flip_preview':'flip_missing');
  }
  root.addEventListener('click',async event=>{
    const b=event.target.closest('button');if(!b||b.disabled||!allowed())return;
    if(b.dataset.flipMode){setMode(b.dataset.flipMode);start();return;}
    if(b.id==='flip-new'){start();return;}
    if(b.id==='flip-repeat'){repeat();return;}
    if(b.id==='flip-hide'){phase='guess';render('[data-flip-index="0"]');repeat();return;}
    if(complete)return;
    if(b.dataset.missingAnswer){
      if(b.dataset.missingAnswer===deck[missing].id){opened.add(missing);await finish();}
      else{$('#flip-status').textContent='Ez a kép még itt van. Nézz körül!';void speak('flip_retry');}
      return;
    }
    if(b.dataset.flipIndex===undefined)return;
    const index=Number(b.dataset.flipIndex),word=deck[index];
    if(mode==='find'&&phase==='guess'&&!opened.has(index))cancel();
    const token=generation;
    if(phase==='preview'||mode==='missing'){if(mode==='missing'&&phase==='guess'&&index===missing)return;await playWord(word,{target:`[data-flip-index="${index}"] .card-emoji`});return;}
    if(mode==='free'){
      effect(opened.has(index)?'select':'card');
      opened.add(index);render(`[data-flip-index="${index}"]`);
      const completed=opened.size===deck.length;
      await playWord(word,{target:`[data-flip-index="${index}"] .card-emoji`});
      if(completed&&token===generation&&allowed())await finish();return;
    }
    if(opened.has(index)){void playWord(word,{target:`[data-flip-index="${index}"] .card-emoji`});return;}
    if(index!==target){
      effect('retry');
      b.classList.add('is-open');b.setAttribute('aria-label',word.label);$('#flip-status').textContent='Ez egy másik kép. Próbáld újra!';
      await playWord(word,{target:`[data-flip-index="${index}"] .card-emoji`});
      if(token!==generation||!allowed())return;
      clearTimeout(timer);timer=setTimeout(()=>{if(allowed()&&token===generation){render();repeat();}},1100);return;
    }
    effect('match');clearTimeout(timer);opened.add(index);target=targetOrder[opened.size];
    if(opened.size===deck.length){await finish();return;}
    render(`[data-flip-index="${index}"]`);repeat();
  });
  document.addEventListener('visibilitychange',()=>{if(active&&document.hidden)cancel();else if(active)render();});
  return {start,repeat,stop(){active=false;cancel();}};
}
