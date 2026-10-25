import { words } from './game-data.js';
import { wordPicture } from './word-art.js';
import { buildNumberChoices, newNumberSession, normalizeNumberProgress, pickNumberAmount, nextNumberObject, updateQuizDifficulty, numberStars } from './number-data.js';

export function setupNumberGames({effect=()=>{},onRestart=()=>{},getProgress,setProgress,getOptions,setOptions,speak,stopPlayback,onComplete}) {
  const root=document.querySelector('#numbers');
  const names=['nulla','egy','kettő','három','négy','öt','hat','hét','nyolc','kilenc','tíz'];
  const objects=words.filter(w=>['alma','labda','auto'].includes(w.id));
  let active=false,mode='count',progress,session,generation=0,busy=false,quizStreak={clean:0,missed:0};
  const $=s=>root.querySelector(s), object=()=>objects.find(w=>w.id===session.objectId);
  const allowed=()=>active&&!document.hidden;
  const save=(meta)=>{progress.sessions[mode]=session;setProgress(progress,meta);};
  const say=async ids=>{if(allowed())return speak(ids);};
  const label=n=>`${n===2?'két':names[n]} ${object().label}`;
  function cancel(){onRestart();generation++;busy=false;stopPlayback();}
  function options(){return getOptions();}
  function start(nextMode='count',{fresh=false}={}){
    cancel();active=true;mode=nextMode;progress=normalizeNumberProgress(getProgress());
    const opts=options(), old=progress.sessions[mode];
    const length=[3,5,10].includes(opts.roundLength)?opts.roundLength:5;
    // A changed round length or a finished round starts a new session instead of reusing the old one.
    const reuse=!fresh&&old&&old.limit===opts.numberLimit&&old.length===length&&!old.rewarded;
    session=reuse?old:newNumberSession(mode,opts.numberLimit,length,old?.amount,Math.random,progress.stats[mode],old?nextNumberObject(old.objectId):'alma');
    if(mode==='quiz'&&!session.choices.length)session.choices=buildNumberChoices(session.amount,session.limit,opts.quizDifficulty);
    save();render();repeat();
  }
  function choice(amount,objectId=session.objectId){
    cancel();session={...session,amount,objectId,counted:[],solved:false,misses:0,helped:false,choices:[]};
    if(session.completed>=session.length){session.completed=0;session.clean=0;session.rewarded=false;}
    if(mode==='quiz')session.choices=buildNumberChoices(amount,session.limit,options().quizDifficulty);
    save();render();repeat();
  }
  function render(){
    const opts=options(),self=opts.numberSelf&&!session.solved;
    // Self counting ends with a choice of three numerals before the total is revealed.
    const asking=mode==='count'&&session.choices.length>0&&!session.solved;
    root.innerHTML=`<div class="numbers-wrap">
      <div class="upgrade-options" role="group" aria-label="Számolási segítség">${mode==='count'?`<button data-number-setting="numberSelf" data-value="false" aria-pressed="${!opts.numberSelf}">Együtt számolunk</button><button data-number-setting="numberSelf" data-value="true" aria-pressed="${opts.numberSelf}">Előbb megszámolom</button>`:`<button data-number-setting="quizDifficulty" data-value="wide" aria-pressed="${opts.quizDifficulty==='wide'}">Két különböző</button><button data-number-setting="quizDifficulty" data-value="close" aria-pressed="${opts.quizDifficulty==='close'}">Három hasonló</button>`}</div>
      <div class="upgrade-options" role="group" aria-label="Tárgyak elrendezése"><button data-number-setting="numberLayout" data-value="rows" aria-pressed="${opts.numberLayout!=='scattered'}">Sorokban</button><button data-number-setting="numberLayout" data-value="scattered" aria-pressed="${opts.numberLayout==='scattered'}">Szétszórva</button></div>
      <p class="upgrade-note" id="number-round-progress">${session.completed} / ${session.length} feladat megvan</p>
      <div id="number-count-view" ${mode==='count'?'':'hidden'}><div id="number-picker" class="number-picker" ${self?'hidden':''} role="group" aria-label="Válassz számot">${Array.from({length:session.limit},(_,i)=>`<button class="number-choice" data-number="${i+1}" aria-pressed="${session.amount===i+1}" aria-label="${i+1} – ${names[i+1]}">${i+1}</button>`).join('')}</div>
      <button id="number-model" class="number-model" aria-label="${self?'Számolási segítség meghallgatása':label(session.amount)+' meghallgatása'}"><span id="number-symbol" class="number-symbol">${self?'?':session.amount}</span><span id="number-name">${self?'Számold meg!':label(session.amount)}</span><span aria-hidden="true">🔊</span></button>
      <div id="number-objects" class="number-objects ${opts.numberLayout==='scattered'?'is-scattered':''}" role="group" aria-label="Megszámolható tárgyak">${Array.from({length:session.amount},(_,i)=>{const n=session.counted.indexOf(i);return `<button class="counting-object" data-counting-index="${i}" aria-pressed="${n>=0}" aria-label="${i+1}. ${object().label}${n>=0?', megszámolva: '+(n+1):''}"><span aria-hidden="true">${wordPicture(object())}</span><span class="counting-order" aria-hidden="true">${n>=0?n+1:''}</span></button>`;}).join('')}</div>${asking?`<div id="number-total-choices" class="number-total-choices" role="group" aria-label="Hány van?">${session.choices.map(n=>`<button class="number-choice number-total-choice" data-total="${n}" aria-label="${n} – ${names[n]}">${n}</button>`).join('')}</div>`:''}<p id="number-status" class="listen-status" role="status">${session.solved?'Összesen '+label(session.amount)+'! ⭐':asking?'Hány van?':session.counted.length?`${session.counted.length} megszámolva`:''}</p><div class="actions number-actions"><button id="number-restart" class="upgrade-action" aria-label="Számoljuk újra">↻ Újraszámolom</button><button id="number-next" class="upgrade-action" aria-label="Következő szám" ${session.solved?'':'disabled'}>Tovább →</button></div></div>
      <div id="number-quiz-view" ${mode==='quiz'?'':'hidden'}><div class="quiz-question"><h3 id="number-question">Ezen a képen ${label(session.amount)} van. Keresd meg!</h3><button id="number-question-play" class="upgrade-action" aria-label="Feladat meghallgatása">🔊</button></div><div id="number-answers" class="number-answers" role="group" aria-labelledby="number-question">${session.choices.map(n=>`<button class="number-answer ${session.solved&&n===session.amount?'is-correct':''}" data-quantity="${n}" aria-label="${label(n)}" ${session.solved?'disabled':''}><span class="number-answer-objects ${opts.numberLayout==='scattered'?'is-scattered':''}" aria-hidden="true">${Array.from({length:n},()=>`<span>${wordPicture(object())}</span>`).join('')}</span></button>`).join('')}</div><div id="number-comparison"></div><p id="number-quiz-status" class="listen-status" role="status">${session.solved?'Megtaláltad! ⭐':''}</p><div class="actions"><button id="number-quiz-next" class="upgrade-action" aria-label="Következő feladat" ${session.solved?'':'disabled'}>Tovább →</button></div></div>
      <div id="number-object-picker" class="number-object-picker" role="group" aria-label="Mit számoljunk?">${objects.map(w=>`<button class="number-object-choice" data-object="${w.id}" aria-pressed="${w.id===session.objectId}" aria-label="${w.label}">${wordPicture(w)}</button>`).join('')}</div></div>`;
  }
  function finishTask(){
    if(session.solved)return false;
    session.solved=true;session.completed++;
    if(!session.misses)session.clean=(session.clean||0)+1;
    const helped=session.helped||session.misses>0||(mode==='count'&&!options().numberSelf);
    const counter=helped?'helped':'independent';
    progress.stats[mode][session.amount][counter]=Math.min(Number.MAX_SAFE_INTEGER,progress.stats[mode][session.amount][counter]+1);
    const finish=session.completed===session.length&&!session.rewarded;
    if(finish)session.rewarded=true;
    save({reward:finish});return finish;
  }
  async function count(index){
    if(!allowed()||session.counted.includes(index)||session.solved||session.choices.length)return;
    const self=options().numberSelf;
    if(!self)session.helped=true;
    effect('collect');session.counted.push(index);const n=session.counted.length;
    const complete=n===session.amount;
    if(complete&&self){
      session.choices=buildNumberChoices(session.amount,session.limit,'close');save();render();
      $('#number-total-choices button')?.focus({preventScroll:true});return;
    }
    const roundDone=complete?finishTask():false;save();render();
    $(`[data-counting-index="${index}"]`)?.focus({preventScroll:true});
    const token=generation;
    const counted={id:`number_${n}`,cue:{target:`[data-counting-index="${index}"]`}};
    if(complete)await say([counted,{id:'counting_total',cue:{target:'#number-model'}},`quantity_${object().id}_${session.amount}`]);
    else if(!options().numberSelf)await say([counted]);
    if(roundDone&&allowed()&&token===generation)onComplete(mode,numberStars(session.clean,session.length));
  }
  // "Hány van?": the right numeral reveals the total, a wrong one clears the marks for a fresh count.
  async function total(value){
    if(!allowed()||mode!=='count'||session.solved||busy||!session.choices.includes(value))return;
    if(value===session.amount){
      effect('success');
      const finished=finishTask(),token=generation;render();$('#number-next')?.focus({preventScroll:true});
      await say([{id:'counting_total',cue:{target:'#number-model'}},`quantity_${object().id}_${session.amount}`]);
      if(finished&&allowed()&&token===generation)onComplete(mode,numberStars(session.clean,session.length));return;
    }
    cancel();effect('retry');session.misses++;session.helped=true;session.counted=[];session.choices=[];save();render();
    $('#number-status').textContent='Próbáld újra! Számold meg egyesével.';
    $('[data-counting-index="0"]')?.focus({preventScroll:true});
    await say(['guide_retry_count']);
  }
  async function answer(quantity){
    if(!allowed()||session.solved||busy)return;
    if(quantity===session.amount){
      effect('success');
      const adjusted=updateQuizDifficulty(options().quizDifficulty,quizStreak,session.misses===0);quizStreak=adjusted.streak;
      if(adjusted.difficulty!==options().quizDifficulty)setOptions({quizDifficulty:adjusted.difficulty});
      const finished=finishTask(),token=generation;render();$('#number-quiz-next').focus({preventScroll:true});
      await say(['guide_good',`quantity_${object().id}_${session.amount}`]);
      if(finished&&allowed()&&token===generation)onComplete(mode,numberStars(session.clean,session.length));return;
    }
    effect('retry');session.misses++;session.helped=true;save();busy=true;const token=generation;
    $('#number-quiz-status').textContent=`Itt ${label(quantity)} van. ${quantity<session.amount?'Többet':'Kevesebbet'} keresünk. Számoljuk meg!`;
    await say(['counting_retry']);
    if(!allowed()||token!==generation)return;
    const answerButton=$(`[data-quantity="${quantity}"]`);
    if(!answerButton){busy=false;return;}
    const items=[...answerButton.querySelectorAll('.number-answer-objects > span')];
    for(let i=0;i<items.length&&allowed()&&token===generation;i++){
      items[i].classList.add('is-counting');await say([{id:`number_${i+1}`,cue:{target:`[data-quantity="${quantity}"] .number-answer-objects > span:nth-child(${i+1})`}}]);items[i].classList.remove('is-counting');
    }
    if(!allowed()||token!==generation)return;
    if(session.misses>=2){
      $('#number-comparison').innerHTML=`<div class="number-comparison" aria-label="A választott ${quantity} és a kért ${session.amount} tárgy párosítva">${[quantity,session.amount].map((n,i)=>`<div><b>${i?'Ennyit keresünk':'Ezt választottad'}</b>${Array.from({length:n},(_,j)=>`<span class="${j>=Math.min(quantity,session.amount)?'is-unpaired':''}" aria-hidden="true">${wordPicture(object())}</span>`).join('')}</div>`).join('')}</div>`;
      await say(['counting_compare']);
    }
    if(allowed()&&token===generation){await say([quantity<session.amount?'counting_more':'counting_less',`question_${object().id}_${session.amount}`]);busy=false;}
  }
  function next(){
    // Tovább only follows a solved task; amounts favour the ones still being learned, objects take turns.
    if(!session.solved)return;
    choice(pickNumberAmount(progress.stats[mode],session.limit,session.amount),nextNumberObject(session.objectId));
  }
  function repeat(){
    if(!allowed())return;
    cancel();
    if(mode==='quiz')return say([`question_${object().id}_${session.amount}`]);
    return say(options().numberSelf&&!session.solved?['counting_self']:[{id:`number_${session.amount}`,cue:{target:'#number-symbol'}},`quantity_${object().id}_${session.amount}`]);
  }
  root.addEventListener('click',e=>{
    const b=e.target.closest('button');if(!b||b.disabled||!allowed())return;
    if(b.dataset.countingIndex!==undefined)void count(Number(b.dataset.countingIndex));
    else if(b.dataset.quantity)void answer(Number(b.dataset.quantity));
    else if(b.dataset.total)void total(Number(b.dataset.total));
    else if(b.dataset.number)choice(Number(b.dataset.number));
    else if(b.dataset.object)choice(session.amount,b.dataset.object);
    else if(b.dataset.numberSetting){
      cancel();const key=b.dataset.numberSetting,value=key==='numberSelf'?b.dataset.value==='true':b.dataset.value;setOptions({[key]:value});
      if(key==='quizDifficulty')quizStreak={clean:0,missed:0};
      if(key==='quizDifficulty'&&!session.solved){session.choices=buildNumberChoices(session.amount,session.limit,value);save();}render();
      root.querySelector(`[data-number-setting="${key}"][data-value="${b.dataset.value}"]`)?.focus({preventScroll:true});
    }else if(b.id==='number-model'||b.id==='number-question-play')repeat();
    else if(b.id==='number-next'||b.id==='number-quiz-next')next();
    else if(b.id==='number-restart')choice(session.amount);
  });
  document.addEventListener('visibilitychange',()=>{if(active&&document.hidden)cancel();});
  return {start,stop(){active=false;cancel();},repeat,setLimit(){if(active)start(mode,{fresh:true});}};
}
