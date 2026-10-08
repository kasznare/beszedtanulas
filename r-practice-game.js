import { R_GAMES, R_WORDS, R_RHYMES, R_POSITIONS, loadRPreferences, saveRPreferences, normalizeRPreferences, normalizeRProgress, recordRProgress, rWordPool, shuffleR, buildRHunterRound } from './r-practice-data.js';
import { createRRecorder } from './r-practice-media.js';

const html = value => String(value ?? '').replace(/[&<>"']/g, char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const marked = text => [...text].map(letter=>letter.toLocaleLowerCase('hu')==='r'?`<strong class="rp-r">${letter}</strong>`:html(letter)).join('');

export function setupRPractice({ getProgress, updateProgress, speak, stopPlayback, listen }) {
  const root=document.querySelector('#r-practice');
  if (!root) return {start(){},stop(){},repeat(){}};
  let storage; try {storage=window.localStorage;} catch {storage=null;}
  let prefs=loadRPreferences(storage), active=false, game='hub', generation=0, controller=null;
  let phase='idle', message='', deck=[], step=0, solved=false, wrongId='', completed=false;
  let readyToAdvance=false, transcript='';
  let rhymeIndex=0, rhymeDone=new Set(), rhymeRoundReported=false;
  const recorder=createRRecorder();
  let recording=null, recordingDuration=0, recordingSeconds=0, replayAudio=null, replayUrl=null, replayTimer=null, echoRoundReported=false;
  const allowed=()=>active&&!document.hidden;
  const $=selector=>root.querySelector(selector);
  function stopReplay() {clearTimeout(replayTimer);replayTimer=null;if(replayAudio){replayAudio.onplaying=replayAudio.onended=replayAudio.onerror=null;replayAudio.pause();replayAudio.removeAttribute('src');replayAudio=null;}if(replayUrl){URL.revokeObjectURL(replayUrl);replayUrl=null;}}
  function clearRecording(){stopReplay();recording=null;recordingDuration=0;recordingSeconds=0;}
  function cancel() { generation++; controller?.abort(); controller=null; recorder.cancel();stopReplay();stopPlayback(); phase='idle'; }
  function report(event) { updateProgress(recordRProgress(getProgress(),game,event)); }
  function progressDots(count=deck.length, index=step) {
    return `<div class="rp-dots" aria-label="${Math.min(index+1,count)}. feladat, összesen ${count}">${Array.from({length:count},(_,i)=>`<span class="${i<index||completed?'is-done':i===index?'is-current':''}" aria-hidden="true">${i<index||completed?'✿':'•'}</span>`).join('')}</div>`;
  }
  function settings() {
    return `<details class="rp-settings"><summary>Felnőtt beállításai</summary><div class="rp-settings-grid">
      <label>Az R helye<select data-pref="position">${Object.entries(R_POSITIONS).map(([id,label])=>`<option value="${id}" ${prefs.position===id?'selected':''}>${label}</option>`).join('')}</select></label>
      <label>Gyakorlási mód<select data-pref="speechMode"><option value="together" ${prefs.speechMode==='together'?'selected':''}>Együtt · mikrofon nélkül</option><option value="encouraging" ${prefs.speechMode==='encouraging'?'selected':''}>Bátorító · hang észlelése</option><option value="words" ${prefs.speechMode==='words'?'selected':''}>Szófelismerés · magyarul</option></select></label>
      <label>Mit mondunk?<select data-pref="target"><option value="word" ${prefs.target==='word'?'selected':''}>Egy szó</option><option value="phrase" ${prefs.target==='phrase'?'selected':''}>Rövid kifejezés</option></select></label>
      <label>Egy kör<select data-pref="roundLength"><option value="3" ${prefs.roundLength===3?'selected':''}>3 feladat</option><option value="5" ${prefs.roundLength===5?'selected':''}>5 feladat</option></select></label>
      <label>Hangvadász képei<select data-pref="choices"><option value="2" ${prefs.choices===2?'selected':''}>2 kép</option><option value="3" ${prefs.choices===3?'selected':''}>3 kép</option></select></label>
      <label>Hangvadász feladata<select data-pref="hunterKind"><option value="picture" ${prefs.hunterKind==='picture'?'selected':''}>Hallott szó képének keresése</option><option value="sound" ${prefs.hunterKind==='sound'?'selected':''}>R-t tartalmazó szó keresése</option></select></label>
    </div><p>A szófelismerés a felismert szöveget jelzi; az R kiejtését nem minősíti. A bátorító mód hangot észlel. A szavak hely szerinti csoportok, nem kötelező nehézségi sorrend. Válasszatok a gyereknek megfelelő szavakat.</p><p>Szófelismeréskor a böngésző szolgáltatása internetet használhat és feldolgozhatja a hangot. A közös mód és a mintahangok offline is működnek. A Saját visszhang felvétele csak ebben az ablakban marad.</p></details>`;
  }
  function render(focus='') {
    root.dataset.game=game; root.dataset.phase=phase;
    const info=R_GAMES.find(value=>value.id===game), stats=normalizeRProgress(getProgress());
    root.innerHTML=`<div class="rp-shell"><header class="rp-heading"><div><span class="rp-eyebrow">HALLGASD · MONDD · JÁTSSZ</span><h2 tabindex="-1">${info?info.name:'Róka R-kalandja'}</h2><p>${info?info.detail:'Öt kis kaland rókával és robottal.'}</p></div><span class="rp-letter" aria-hidden="true">R<span>r</span></span></header>
      ${game!=='hub'?'<button class="rp-back" data-action="hub">← Az öt játékhoz</button>':''}
      ${game==='hub'?`<div class="rp-hub-scene" aria-hidden="true"><span class="rp-sun">☀</span><img class="rp-fox" src="./assets/furfang-fox.png" alt=""><span class="rp-robot">🤖</span><span class="rp-flowers">🌼 🌷 🌿</span><span class="rp-hub-bubble">Róka és robot vár rád!</span></div><div class="rp-game-grid">${R_GAMES.map(value=>`<button class="rp-game-card" data-game="${value.id}"><span aria-hidden="true">${value.icon}</span><strong>${value.name}</strong><small>${value.detail}</small>${stats.games[value.id].rounds?`<span class="rp-saved">${stats.games[value.id].rounds} közös kör</span>`:''}</button>`).join('')}</div>`:renderGame()}
      <p id="rp-status" class="rp-status" role="status" aria-live="polite">${html(message||defaultMessage())}</p>${settings()}</div>`;
    if(focus)$(focus)?.focus({preventScroll:true});
  }
  function defaultMessage() { return game==='hub'?'Válassz egy kalandot!':game==='hunter'?'Koppints a hanggombra, és keresd meg a képet!':'Hallgassuk meg, és gyakoroljunk együtt!'; }
  function renderGame() {
    if (game==='hunter') return renderHunter();
    if (game==='post') return renderPost();
    if (game==='workshop') return renderWorkshop();
    if (game==='rhyme') return renderRhyme();
    if (game==='echo') return renderEcho();
    return '<p>Új kaland készül.</p>';
  }
  const currentWord=()=>deck[step];
  const currentRhyme=()=>R_RHYMES[rhymeIndex];
  const targetText=()=>game==='rhyme'?currentRhyme().lines[step][0]:prefs.target==='phrase'?currentWord().phrase:currentWord().text;
  const targetClip=()=>game==='rhyme'?`r_rhyme_${currentRhyme().id}_${step}`:`r_${prefs.target==='phrase'?'phrase':'word'}_${currentWord().id}`;
  function speechControls(advanceLabel) {
    const busy=phase!=='idle', together=prefs.speechMode==='together';
    return `<div class="rp-actions"><button class="rp-primary" data-action="model" ${busy?'disabled':''}>🔊 Mintahang</button>${!together?`<button class="rp-mic" data-action="listen" ${busy||readyToAdvance?'disabled':''}>🎤 Most én mondom</button>`:''}${busy?'<button class="rp-stop" data-action="stop">■ Megállítás</button>':''}</div>
      ${transcript?`<p class="rp-transcript">Ezt értettem: <q>${html(transcript)}</q></p>`:''}
      <div class="rp-actions"><button class="rp-primary" data-action="advance" ${busy||(!together&&!readyToAdvance)?'disabled':''}>${together?'Együtt kimondtuk · ':''}${advanceLabel} →</button>${!together?`<button data-action="confirm" ${busy?'disabled':''}>Együtt mondtuk · tovább</button>`:''}<button data-action="restart">↻ Új kör</button></div>
      <p class="rp-mode-note">${together?'Közös mód: mondjátok ki együtt, majd indítsátok a következő lépést.':prefs.speechMode==='encouraging'?'A hangészlelés a próbálkozást jelzi.':'A felismert szót mutatjuk; az R kiejtését nem pontozzuk.'}</p>`;
  }
  function renderPost() {
    if(completed)return finishCard('Minden csomag megérkezett!','🤖 📦 🌼');
    const word=currentWord();
    return `${progressDots()}<div class="rp-post-scene"><span class="rp-post-cloud" aria-hidden="true">☁</span><div class="rp-target" data-word="${word.id}"><span class="rp-target-picture" aria-hidden="true">${word.icon}</span><h3>${marked(targetText())}</h3></div><div class="rp-post-robot ${phase==='listening'?'is-listening':''}" aria-hidden="true">🤖<span class="rp-robot-bubble">${readyToAdvance?'Köszönöm!':'Ezt kérem!'}</span></div><div class="rp-parcels" aria-label="${step} elküldött csomag">${deck.slice(0,step).map((item,i)=>`<span class="rp-parcel ${i===step-1?'is-arriving':''}" aria-hidden="true">📦<small>${item.icon}</small></span>`).join('')}</div></div>${speechControls('Csomag indítása')}`;
  }
  function bakery() {
    return `<div class="rp-bakery" aria-label="${step} elkészült műhelydísz"><div class="rp-awning" aria-hidden="true"></div><div class="rp-bakery-sign">Perecműhely</div><span class="rp-bakery-fox" aria-hidden="true">🦊</span><span class="rp-bakery-pretzel" aria-hidden="true">🥨</span><div class="rp-bakery-rack">${deck.map((word,i)=>`<span class="rp-decoration ${i<step?'is-decorated':''} ${i===step-1?'is-arriving':''}" aria-hidden="true">${i<step?word.icon:'✿'}</span>`).join('')}</div><span class="rp-bakery-counter" aria-hidden="true"></span></div>`;
  }
  function renderWorkshop() {
    const picker=`<div class="rp-position-picker" role="group" aria-label="Az R helye a szóban">${Object.entries(R_POSITIONS).map(([id,label])=>`<button data-position="${id}" aria-pressed="${prefs.position===id}"><b aria-hidden="true">${{all:'R',initial:'R…',medial:'…R…',final:'…R'}[id]}</b><small>${label}</small></button>`).join('')}</div>`;
    if(completed)return `${picker}${bakery()}${finishCard('Feldíszítettük a műhelyt!','🥨 🌷')}`;
    const word=currentWord();
    return `${picker}${progressDots()}<div class="rp-workshop-layout">${bakery()}<div class="rp-target" data-word="${word.id}"><span class="rp-target-picture" aria-hidden="true">${word.icon}</span><h3>${marked(targetText())}</h3><p>${R_POSITIONS[word.position]}</p></div></div>${speechControls('Új dísz a műhelybe')}`;
  }
  function renderRhyme() {
    const rhyme=currentRhyme();
    return `<div class="rp-rhyme-picker" role="group" aria-label="Válassz mondókát">${R_RHYMES.map((item,i)=>`<button data-rhyme="${i}" aria-pressed="${i===rhymeIndex}"><span aria-hidden="true">${item.icon}</span>${item.title}</button>`).join('')}</div><div class="rp-rhyme-stage" aria-hidden="true"><span class="rp-rhyme-sun">☀</span><span class="rp-line-art">${rhyme.lines[step][1]}</span><span class="rp-rhyme-grass">🌿 🌼 🌿</span></div><div class="rp-rhyme-heading"><h3>${rhyme.title}</h3><button data-action="rhyme-all" ${phase!=='idle'?'disabled':''}>🔊 Teljes mondóka</button></div>
      <div class="rp-rhyme-lines" role="group" aria-label="A mondóka sorai">${rhyme.lines.map(([text],i)=>`<button class="rp-rhyme-line ${i===step?'is-current':''} ${rhymeDone.has(i)?'is-practiced':''}" data-line="${i}" aria-pressed="${i===step}" aria-label="${i+1}. sor: ${html(text)}"><span aria-hidden="true">${rhymeDone.has(i)?'✿':'🔊'}</span><span>${marked(text)}</span></button>`).join('')}</div>
      ${completed?`<div class="rp-rhyme-complete" role="status">🌼 Mind a négy sort együtt gyakoroltuk!</div><div class="rp-actions"><button data-action="restart">↻ Mondjuk újra!</button></div>`:speechControls('Sort gyakoroltuk · következő')}`;
  }
  function renderEcho() {
    const word=currentWord(), busy=phase!=='idle', supported=recorder.isSupported();
    return `<label class="rp-echo-picker">Válassz mintát<select data-echo-word>${deck.map((item,i)=>`<option value="${i}" ${i===step?'selected':''}>${html(item.text)}</option>`).join('')}</select></label><div class="rp-echo-stage"><div class="rp-target" data-word="${word.id}"><span class="rp-target-picture" aria-hidden="true">${word.icon}</span><h3>${marked(targetText())}</h3></div><span class="rp-echo-rings ${phase==='recording'||phase==='replay'?'is-active':''}" aria-hidden="true">${phase==='recording'?'🎙️':phase==='replay'?'🔊':'🎧'}</span></div>
      <div class="rp-record-timer" aria-live="off">${phase==='recording'?`Felvétel: ${recordingSeconds} / 8 másodperc`:recording?`Saját felvétel: ${(recordingDuration/1000).toFixed(1).replace('.',',')} másodperc`:'Egy rövid szó vagy kifejezés fér a felvételbe.'}</div>
      <div class="rp-actions"><button class="rp-primary" data-action="model" ${busy?'disabled':''}>🔊 Mintahang</button>${phase==='recording'?'<button class="rp-primary" data-action="record-finish">■ Felvétel befejezése</button>':`<button data-action="record" ${busy||!supported?'disabled':''}>🎙️ ${recording?'Újra felveszem':'Felveszem a hangom'}</button>`}${busy?'<button data-action="stop">■ Megállítás</button>':''}</div>
      <div class="rp-actions"><button class="rp-primary" data-action="replay" ${busy||!recording?'disabled':''}>▶ Saját hangom</button><button data-action="record-delete" ${busy||!recording?'disabled':''}>Felvétel elengedése</button><button data-action="echo-next" ${busy?'disabled':''}>Másik szó →</button></div><div class="rp-actions"><button data-action="echo-confirm" ${busy||echoRoundReported?'disabled':''}>Együtt gyakoroltuk 🌼</button></div>
      <p class="rp-mode-note">${supported?'Legfeljebb 8 másodperc. A saját felvételt nem töltjük fel és nem mentjük fájlba; új szó, kilépés vagy elrejtett lap esetén elengedjük.':'Ebben a böngészőben nem érhető el a hangfelvétel. A mintahangot meghallgathatjátok, és együtt gyakorolhattok.'}</p>`;
  }
  function renderHunter() {
    if(completed)return finishCard('Minden kép megvan!','🔎 🌼');
    const current=deck[step], sound=prefs.hunterKind==='sound';
    return `${progressDots()}<div class="rp-game-instruction"><span aria-hidden="true">🔎</span><h3>${sound?'Melyik szóban hallod az R-t?':'Melyik képet hallottad?'}</h3><button class="rp-primary" data-action="model" ${phase!=='idle'?'disabled':''}>🔊 ${sound?'Hallgassuk meg a képek nevét!':'Hallgasd meg!'}</button></div>
      <div class="rp-choice-grid" style="--rp-choices:${prefs.choices}">${current.choices.map(word=>`<div class="rp-option ${solved&&word.id===current.target.id?'is-found':''} ${wrongId===word.id?'is-try':''}" data-id="${word.id}">${sound?`<button class="rp-choice-sound" data-sound="${word.id}" aria-label="${html(word.text)} meghallgatása" ${phase!=='idle'?'disabled':''}>🔊</button>`:''}<button class="rp-picture-choice" data-choice="${word.id}" aria-label="${html(word.text)} kiválasztása" ${solved||phase!=='idle'?'disabled':''}><span aria-hidden="true">${word.icon}</span><small>${html(word.text)}</small>${solved&&word.id===current.target.id?'<b aria-hidden="true">✓</b>':''}</button></div>`).join('')}</div>
      <div class="rp-actions"><button data-action="hunter-next" class="rp-primary" ${!solved||phase!=='idle'?'disabled':''}>${step===deck.length-1?'Kör befejezése':'Következő kép'} →</button><button data-action="restart">↻ Új képek</button></div>`;
  }
  function finishCard(title,icons) { return `<div class="rp-finish"><span aria-hidden="true">${icons}</span><h3>${title}</h3><p>Köszönöm a közös játékot!</p><div class="rp-actions"><button data-action="restart" class="rp-primary">↻ Új kör</button><button data-action="hub">Másik kaland</button></div></div>`; }
  function beginGame(id) {
    if(!allowed()||!R_GAMES.some(value=>value.id===id))return;
    cancel();clearRecording();game=id;step=0;solved=false;wrongId='';completed=false;message='';readyToAdvance=false;transcript='';echoRoundReported=false;
    if(id==='rhyme'){rhymeDone=new Set();rhymeRoundReported=false;}
    deck=id==='hunter'?buildRHunterRound(prefs):shuffleR(rWordPool(prefs.position)).slice(0,id==='echo'?R_WORDS.length:prefs.roundLength);
    render('h2');
    if(['hunter','post','workshop','rhyme','echo'].includes(id))void playCurrent({intro:true});
  }
  async function playClips(ids, cue) {
    cancel(); const token=generation; phase='model';message='Hallgassuk meg!';render();
    for(const id of ids) {
      if(!allowed()||token!==generation)return;
      const result=await speak(id,typeof cue==='function'?cue(id):cue);
      if(result===false&&token===generation) {message='A mintahang most nem indult el. Koppints újra a hanggombra!';break;}
    }
    if(allowed()&&token===generation) {phase='idle';if(message==='Hallgassuk meg!')message='Most te jössz!';render();}
  }
  function playCurrent({intro=false}={}) {
    if(!allowed()||completed)return;
    if(game==='hub')return playClips(['r_hub'],{target:'.rp-hub-scene'});
    if(game==='hunter') {
      const current=deck[step];
      return prefs.hunterKind==='sound'?playClips([...(intro?['r_hunter_sound']:[]),...current.choices.map(word=>`r_word_${word.id}`)],id=>({target:id==='r_hunter_sound'?'.rp-game-instruction':`.rp-option[data-id="${id.replace('r_word_','')}"]`})):playClips([...(intro?['r_hunter']:[]),`r_word_${current.target.id}`],{target:'.rp-game-instruction'});
    }
    if(['post','workshop','echo'].includes(game))return playClips([...(intro?[`r_${game}`]:[]),targetClip()],{target:'.rp-target'});
    if(game==='rhyme')return playClips([...(intro?['r_rhyme']:[]),targetClip()],{target:`.rp-rhyme-line[data-line="${step}"]`});
  }
  function selectRhymeLine(index) {
    if(!allowed()||game!=='rhyme'||!Number.isInteger(index)||!currentRhyme().lines[index])return;
    cancel();step=index;readyToAdvance=false;transcript='';completed=false;message='';render();void playCurrent();
  }
  async function playWholeRhyme() {
    if(!allowed()||game!=='rhyme')return;
    cancel();const token=generation;phase='model';readyToAdvance=false;transcript='';
    for(let i=0;i<currentRhyme().lines.length;i++){
      if(!allowed()||token!==generation)return;
      step=i;message=`Hallgassuk meg: ${i+1}. sor.`;render();
      const result=await speak(targetClip(),{target:`.rp-rhyme-line[data-line="${i}"]`,parts:[{at:targetText(),target:'.rp-line-art',motion:'sway'}]});
      if(result===false&&token===generation){phase='idle';message='A mintahang most nem indult el. Koppints újra a hanggombra!';render();return;}
    }
    if(allowed()&&token===generation){phase='idle';step=0;message='Válassz egy sort, és mondjátok együtt!';render();}
  }
  async function practiceSpeech() {
    if(!allowed()||completed||phase!=='idle'||prefs.speechMode==='together'||!['post','workshop','rhyme'].includes(game))return;
    cancel();const token=generation, attempt=new AbortController();controller=attempt;let started=false;
    readyToAdvance=false;transcript='';phase='preparing';message='Mikrofon előkészítése…';render();
    try {
      const result=await listen({text:targetText(),mode:prefs.speechMode,signal:attempt.signal,onStart:()=>{
        if(!allowed()||token!==generation||attempt.signal.aborted)return;
        started=true;phase='listening';message='Most te jössz!';render();
      }});
      if(!allowed()||token!==generation||attempt.signal.aborted)return;
      phase='idle';readyToAdvance=result.matched===true||result.detected===true;
      transcript=String(result.transcript||'').slice(0,160);
      if(started)report(result.matched?'recognized':'practice');
      message=prefs.speechMode==='words'?(result.matched?'A keresett szót felismerte a gép. Indulhat a következő lépés!':transcript?'Más szót értettem. Meghallgathatjuk újra, vagy mondhatjátok együtt.':'Most nem kaptam felismert szót. Próbáljuk újra vagy együtt!'):(result.detected?'Hangot hallottam. Köszönöm a próbálkozást!':'Most nem észleltem elegendő hangot. Próbáljuk együtt!');
      render();
    } catch(error) {
      if(!allowed()||token!==generation||attempt.signal.aborted)return;
      phase='idle';message=error.name==='NotAllowedError'?'A mikrofon engedélye hiányzik. Kérj segítséget egy felnőttől, vagy gyakoroljatok együtt!':['NotFoundError','NotReadableError'].includes(error.name)?'A mikrofon most nem használható. Gyakorolhatunk együtt is!':error.message||'A mikrofon most nem indult el. Gyakorolhatunk együtt is!';render();
    } finally {attempt.abort();if(controller===attempt)controller=null;}
  }
  async function recordEcho() {
    if(!allowed()||game!=='echo'||phase!=='idle')return;
    cancel();clearRecording();const token=generation,attempt=new AbortController();controller=attempt;
    phase='preparing';message='Mikrofon előkészítése…';render();
    const result=await recorder.record({signal:attempt.signal,onStart:()=>{
      if(!allowed()||generation!==token||attempt.signal.aborted)return;
      phase='recording';recordingSeconds=0;message='Most felvesszük a hangodat. Mondd a szót!';render();
    },onTick:ms=>{if(generation!==token||!allowed())return;recordingSeconds=Math.floor(ms/1000);const timer=$('.rp-record-timer');if(timer)timer.textContent=`Felvétel: ${recordingSeconds} / 8 másodperc`;}});
    if(controller===attempt)controller=null;
    if(!allowed()||generation!==token||attempt.signal.aborted)return;
    phase='idle';attempt.abort();
    if(result.blob){recording=result.blob;recordingDuration=result.duration;report('practice');if(!echoRoundReported){report('round');echoRoundReported=true;}message='Elkészült a saját felvételed. Hallgassátok vissza együtt!';}
    else{message=({unsupported:'Itt nem érhető el a hangfelvétel. Gyakorolhatunk együtt is!', 'not-allowed':'A mikrofon engedélye hiányzik. Kérj segítséget egy felnőttől, vagy gyakoroljatok együtt!', 'too-short':'Nagyon rövid lett a felvétel. Próbáljuk újra!', 'too-large':'Ez a felvétel túl nagy lett. Próbáljunk egy rövidebb szót!', 'start-timeout':'A felvétel nem indult el. Próbáljuk újra vagy együtt!'})[result.error]||'A felvétel most nem sikerült. Próbáljuk újra vagy együtt!';}
    render();
  }
  async function replayRecording() {
    if(!allowed()||game!=='echo'||!recording||phase!=='idle')return;
    cancel();const token=generation;replayUrl=URL.createObjectURL(recording);const audio=new Audio(replayUrl);replayAudio=audio;
    const finish=error=>{if(!allowed()||token!==generation)return;stopReplay();phase='idle';message=error?'A saját hang most nem indult el. Próbáld újra, vagy készíts új felvételt!':'Visszahallgattuk a saját hangodat. A mintával is összehasonlíthatjátok.';render();};
    audio.onended=()=>finish(false);audio.onerror=()=>finish(true);
    audio.onplaying=()=>{if(!allowed()||token!==generation)return;phase='replay';message='Most a saját hangod szól.';render();};
    phase='preparing-replay';message='Saját hang előkészítése…';render();
    replayTimer=setTimeout(()=>finish(true),12000);
    try{await audio.play();}catch{finish(true);}
  }
  function changeEchoWord(index) {
    if(!allowed()||game!=='echo'||!deck[index])return;
    cancel();clearRecording();step=index;echoRoundReported=false;message='';render();void playCurrent();
  }
  function advancePractice(manual=false) {
    if(!allowed()||!['post','workshop','rhyme'].includes(game)||completed||phase!=='idle'||(!manual&&prefs.speechMode!=='together'&&!readyToAdvance))return;
    cancel();if(manual||prefs.speechMode==='together')report('confirmed');
    if(game==='rhyme'){
      rhymeDone.add(step);readyToAdvance=false;transcript='';
      if(rhymeDone.size===currentRhyme().lines.length){completed=true;if(!rhymeRoundReported){report('round');rhymeRoundReported=true;}render();void playClips(['r_round_done'],{target:'.rp-rhyme-complete'});}
      else{step=currentRhyme().lines.findIndex((_,i)=>!rhymeDone.has(i));message='';render();void playCurrent();}
      return;
    }
    step++;readyToAdvance=false;transcript='';message='';
    if(step===deck.length){completed=true;report('round');render();void playClips(['r_round_done'],{target:'.rp-finish'});}
    else{render();void playClips([game==='post'?'r_delivered':'r_decorated',targetClip()],id=>({target:id.startsWith('r_word_')||id.startsWith('r_phrase_')?'.rp-target':game==='post'?'.rp-parcels':'.rp-bakery-rack'}));}
  }
  function chooseHunter(id) {
    if(!allowed()||game!=='hunter'||completed||solved||phase!=='idle')return;
    if(id!==deck[step].target.id){wrongId=id;message='Hallgassuk meg újra, és válasszunk!';render();return;}
    solved=true;wrongId='';message='Megtaláltad a képet!';report('practice');render();
    void playClips(['r_found'],{target:`.rp-option[data-id="${id}"]`});
  }
  function nextHunter() {
    if(!allowed()||!solved||phase!=='idle'||completed)return;
    cancel();step++;solved=false;wrongId='';message='';
    if(step===deck.length){completed=true;report('round');render();void playClips(['r_round_done'],{target:'.rp-finish'});}
    else{render();void playCurrent();}
  }
  root.addEventListener('click',event=>{
    const button=event.target.closest('button');if(!button||button.disabled||!allowed())return;
    if(button.dataset.game)return beginGame(button.dataset.game);
    if(button.dataset.choice)return chooseHunter(button.dataset.choice);
    if(button.dataset.position){prefs=normalizeRPreferences({...prefs,position:button.dataset.position});saveRPreferences(storage,prefs);return beginGame('workshop');}
    if(button.hasAttribute('data-rhyme')){rhymeIndex=Number(button.dataset.rhyme);return beginGame('rhyme');}
    if(button.hasAttribute('data-line'))return selectRhymeLine(Number(button.dataset.line));
    if(button.dataset.sound)return void playClips([`r_word_${button.dataset.sound}`],{target:`.rp-option[data-id="${button.dataset.sound}"]`});
    const action=button.dataset.action;
    if(action==='hub'){cancel();clearRecording();game='hub';message='';render('h2');}
    else if(action==='restart')beginGame(game);
    else if(action==='model')void playCurrent();
    else if(action==='hunter-next')nextHunter();
    else if(action==='listen')void practiceSpeech();
    else if(action==='advance')advancePractice();
    else if(action==='confirm')advancePractice(true);
    else if(action==='stop'){cancel();message='Megállítottuk. Hallgassuk meg újra, vagy folytassuk együtt!';render();}
    else if(action==='rhyme-all')void playWholeRhyme();
    else if(action==='record')void recordEcho();
    else if(action==='record-finish')recorder.finish();
    else if(action==='replay')void replayRecording();
    else if(action==='record-delete'){clearRecording();message='A saját felvételt elengedtük.';render();}
    else if(action==='echo-next')changeEchoWord((step+1)%deck.length);
    else if(action==='echo-confirm'&&!echoRoundReported){report('confirmed');report('round');echoRoundReported=true;message='Köszönöm a közös gyakorlást!';render();}
  });
  root.addEventListener('change',event=>{
    if(event.target.hasAttribute('data-echo-word'))return changeEchoWord(Number(event.target.value));
    const key=event.target.dataset.pref;if(!key||!allowed())return;
    const value=['choices','roundLength'].includes(key)?Number(event.target.value):event.target.value;
    prefs=normalizeRPreferences({...prefs,[key]:value});saveRPreferences(storage,prefs);
    if(game==='hub'){cancel();render();}else beginGame(game);
    const details=$('.rp-settings');if(details)details.open=true;
    $(`[data-pref="${key}"]`)?.focus({preventScroll:true});
  });
  document.addEventListener('visibilitychange',()=>{if(active&&document.hidden){cancel();clearRecording();message='A játék megállt. Folytathatjuk együtt!';render();}});
  window.addEventListener('pagehide',()=>{if(active)stop();});
  function start(){cancel();active=true;game='hub';message='';render();}
  function stop(){active=false;cancel();clearRecording();}
  return {start,stop,repeat:playCurrent};
}
