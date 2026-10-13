import { R_GAMES, R_WORDS, R_RHYMES, R_POSITIONS, R_HUNTER_MODES, R_STAMPS, rhymeGap, buildRhymeChoices, rSoundPositions, pickRGame, buildRPracticeDeck, loadRPreferences, saveRPreferences, normalizeRPreferences, normalizeRProgress, recordRProgress, rWordPool, shuffleR, buildRHunterRound, R_RECIPIENTS, R_DECORATIONS, buildRPostMission, rRhymeUnits, buildRRhymeStory, isRRhymeStoryComplete } from './r-practice-data.js';
import { createRRecorder } from './r-practice-media.js';
import { createSuccessDelay } from './success-delay.js';

const html = value => String(value ?? '').replace(/[&<>"']/g, char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const marked = text => [...text].map(letter=>letter.toLocaleLowerCase('hu')==='r'?`<strong class="rp-r">${letter}</strong>`:html(letter)).join('');

export function setupRPractice({ effect=()=>{}, quietEffects=()=>{}, onRestart=()=>{}, getProgress, updateProgress, speak, stopPlayback, listen }) {
  const root=document.querySelector('#r-practice');
  if (!root) return {start(){},stop(){},repeat(){}};
  let storage; try {storage=window.localStorage;} catch {storage=null;}
  let prefs=loadRPreferences(storage), active=false, game='hub', generation=0, controller=null;
  let phase='idle', message='', deck=[], step=0, solved=false, wrongId='', completed=false;
  let successPending=false;
  const successDelay=createSuccessDelay(),previousDecks=new Map();
  let lastGame='',lastMission='',recipient='fox',stamp='flower';
  let rhymeChoices=[],rhymeSolved=false,rhymeWrong='';
  let readyToAdvance=false, transcript='';
  let rhymeIndex=0, rhymeDone=new Set(), rhymeRoundReported=false;
  let hunterErrors=0, mission=null, deliveries=[], interactionReady=false;
  let decorations=Array(9).fill(null), selectedDecoration='';
  let storyOpen=false, storyCards=[], storyOrder=[], storyDone=false;
  let suspendedFocus='', modelTarget='';
  const recorder=createRRecorder();
  let recording=null, recordingDuration=0, recordingSeconds=0, replayAudio=null, replayUrl=null, replayTimer=null, echoRoundReported=false;
  const allowed=()=>active&&!document.hidden;
  const $=selector=>root.querySelector(selector);
  function stopReplay() {clearTimeout(replayTimer);replayTimer=null;if(replayAudio){replayAudio.onplaying=replayAudio.onended=replayAudio.onerror=null;replayAudio.pause();replayAudio.removeAttribute('src');replayAudio=null;}if(replayUrl){URL.revokeObjectURL(replayUrl);replayUrl=null;}}
  function clearRecording(){stopReplay();recording=null;recordingDuration=0;recordingSeconds=0;}
  function cancel({keepSuccess=false}={}) { if(!keepSuccess){successDelay.cancel();successPending=false;} generation++; controller?.abort(); controller=null; recorder.cancel();stopReplay();stopPlayback();modelTarget=''; phase='idle'; }
  function report(event) { if (event === 'round') effect('success'); else if (['confirmed','recognized','matched'].includes(event)) effect('collect'); updateProgress(recordRProgress(getProgress(),game,event)); }
  function progressDots(count=deck.length, index=step) {
    return `<div class="rp-dots" aria-label="${Math.min(index+1,count)}. feladat, összesen ${count}">${Array.from({length:count},(_,i)=>`<span class="${i<index||completed?'is-done':i===index?'is-current':''}" aria-hidden="true">${i<index||completed?'✿':'•'}</span>`).join('')}</div>`;
  }
  function settings() {
    return `<details class="rp-settings"><summary>Felnőtt beállításai</summary><div class="rp-settings-grid">
      <label>Az R helye<select data-pref="position">${Object.entries(R_POSITIONS).map(([id,label])=>`<option value="${id}" ${prefs.position===id?'selected':''}>${label}</option>`).join('')}</select></label>
      <label>Gyakorlási mód<select data-pref="speechMode"><option value="together" ${prefs.speechMode==='together'?'selected':''}>Együtt · mikrofon nélkül</option><option value="encouraging" ${prefs.speechMode==='encouraging'?'selected':''}>Bátorító · hang észlelése</option><option value="words" ${prefs.speechMode==='words'?'selected':''}>Szófelismerés · magyarul</option></select></label>
      <label>Mit mondunk?<select data-pref="target"><option value="word" ${prefs.target==='word'?'selected':''}>Egy szó</option><option value="phrase" ${prefs.target==='phrase'?'selected':''}>Rövid kifejezés</option></select></label>
      <label>Hangvadász és Perecműhely köre<select data-pref="roundLength"><option value="3" ${prefs.roundLength===3?'selected':''}>3 feladat</option><option value="5" ${prefs.roundLength===5?'selected':''}>5 feladat</option></select></label>
      <label>Hangvadász képei<select data-pref="choices"><option value="2" ${prefs.choices===2?'selected':''}>2 kép</option><option value="3" ${prefs.choices===3?'selected':''}>3 kép</option></select></label>
      <label>Hangvadász feladata<select data-pref="hunterKind">${Object.entries(R_HUNTER_MODES).map(([id,label])=>`<option value="${id}" ${prefs.hunterKind===id?'selected':''}>${label}</option>`).join('')}</select></label>
    </div><p>A szófelismerés a felismert szöveget jelzi; az R kiejtését nem minősíti. A bátorító mód hangot észlel. A szavak hely szerinti csoportok, nem kötelező nehézségi sorrend. Válasszatok a gyereknek megfelelő szavakat.</p><p>Szófelismeréskor a böngésző szolgáltatása internetet használhat és feldolgozhatja a hangot. A közös mód és a mintahangok offline is működnek. A Saját visszhang felvétele csak ebben az ablakban marad.</p></details>`;
  }
  function focusKey(element) {
    if(!element||!root.contains(element))return '';
    for(const attribute of ['data-action','data-game','data-choice','data-position','data-rhyme','data-line','data-sound','data-pref','data-deliver','data-decoration','data-place','data-story','data-story-sound','data-hunter-kind','data-r-location','data-rhyme-mode','data-gap-choice','data-stamp','data-recipient']) {
      if(element.hasAttribute(attribute))return `[${attribute}="${CSS.escape(element.getAttribute(attribute))}"]`;
    }
    for(const selector of ['h2','.rp-settings summary','[data-echo-word]','[data-rhyme-practice]','[data-rhyme-short]'])if(element.matches(selector))return selector;
    return '';
  }
  function render(focus='') {
    const previous=focusKey(document.activeElement), restore=focus||suspendedFocus||previous;
    const settingsOpen=$('.rp-settings')?.open;
    root.dataset.game=game; root.dataset.phase=phase;root.dataset.successPending=successPending;
    const info=R_GAMES.find(value=>value.id===game), stats=normalizeRProgress(getProgress());
    root.innerHTML=`<div class="rp-shell"><header class="rp-heading"><div><span class="rp-eyebrow">HALLGASD · MONDD · JÁTSSZ</span><h2 tabindex="-1">${info?info.name:'Róka R-kalandja'}</h2><p>${info?info.detail:'Öt kis kaland rókával és robottal.'}</p></div><span class="rp-letter" aria-hidden="true">R<span>r</span></span></header>
      ${game!=='hub'?'<button class="rp-back" data-action="hub">← Az öt játékhoz</button>':''}
      ${game==='hub'?`<div class="rp-hub-scene" aria-hidden="true"><span class="rp-sun">☀</span><img class="rp-fox" src="./assets/furfang-fox.png" alt=""><span class="rp-robot">🤖</span><span class="rp-flowers">🌼 🌷 🌿</span><span class="rp-hub-bubble">Róka és robot vár rád!</span></div><div class="rp-surprise"><button class="rp-primary" data-action="surprise">🎲 Lepj meg!</button><span>Válasszunk egy másik kis kalandot!</span></div><div class="rp-game-grid">${R_GAMES.map(value=>`<button class="rp-game-card" data-game="${value.id}"><span aria-hidden="true">${value.icon}</span><strong>${value.name}</strong><small>${value.detail}</small>${stats.games[value.id].rounds?`<span class="rp-saved">${stats.games[value.id].rounds} közös kör</span>`:''}</button>`).join('')}</div>`:renderGame()}
      <p id="rp-status" class="rp-status" role="status" aria-live="polite">${html(message||defaultMessage())}</p>${settings()}</div>`;
    if(settingsOpen)$('.rp-settings').open=true;
    if(modelTarget)$(modelTarget)?.classList.add('rp-audio-focus');
    if(focus||previous) {
      const target=$(restore);
      if(target&&!target.disabled){target.focus({preventScroll:true});suspendedFocus='';}
      else{ suspendedFocus=target?.disabled?restore:'';($('[data-action="stop"]')||$('h2'))?.focus({preventScroll:true}); }
    }
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
  const currentWord=()=>deck[Math.min(step,deck.length-1)];
  const currentRhyme=()=>R_RHYMES[rhymeIndex];
  const rhymeUnits=()=>rRhymeUnits(currentRhyme(),prefs.rhymeMode!=='missing'&&prefs.rhymeShort);
  const currentUnit=()=>rhymeUnits()[step];
  const targetText=()=>game==='rhyme'?currentUnit().text:prefs.target==='phrase'?currentWord().phrase:currentWord().text;
  const targetClip=()=>game==='rhyme'?currentUnit().clip:`r_${prefs.target==='phrase'?'phrase':'word'}_${currentWord().id}`;
  const stopButton=()=>phase!=='idle'?'<button class="rp-stop" data-action="stop">■ Megállítás</button>':'';
  function speechControls(advanceLabel) {
    const busy=phase!=='idle'||completed, together=prefs.speechMode==='together';
    return `<div class="rp-actions"><button class="rp-primary" data-action="model" ${busy?'disabled':''}>🔊 Mintahang</button>${!together?`<button class="rp-mic" data-action="listen" ${busy||readyToAdvance?'disabled':''}>🎤 Most én mondom</button>`:''}${phase!=='idle'?'<button class="rp-stop" data-action="stop">■ Megállítás</button>':''}</div>
      ${transcript?`<p class="rp-transcript">Ezt értettem: <q>${html(transcript)}</q></p>`:''}
      <div class="rp-actions"><button class="rp-primary" data-action="advance" ${busy||(!together&&!readyToAdvance)?'disabled':''}>${together?'Együtt kimondtuk · ':''}${advanceLabel} →</button>${!together?`<button data-action="confirm" ${busy?'disabled':''}>Együtt mondtuk · tovább</button>`:''}<button data-action="restart">↻ Új kör</button></div>
      <p class="rp-mode-note">${together?'Közös mód: mondjátok ki együtt, majd indítsátok a következő lépést.':prefs.speechMode==='encouraging'?'A hangészlelés a próbálkozást jelzi.':'A felismert szót mutatjuk; az R kiejtését nem pontozzuk.'}</p>`;
  }
  function renderRecipients(deliver=false) {
    return `<div class="rp-recipient-picker ${deliver?'rp-delivery-grid':''}" data-completed="${completed}" role="group" aria-label="Kinek vigye Robot a csomagot?">${R_RECIPIENTS.map(friend=>{
      const parcels=deliveries.filter(item=>item.recipient.id===friend.id);
      return `<button data-recipient="${friend.id}" ${deliver?`data-deliver="${friend.id}"`:''} aria-pressed="${recipient===friend.id}" ${phase!=='idle'||completed?'disabled':''}><span aria-hidden="true">${deliver?'🏡 ':''}${friend.icon}</span><strong>${friend.name}${deliver?' háza':''}</strong><span class="rp-mailbox" aria-label="${parcels.length} csomag${parcels.length?': '+parcels.map(item=>item.word.text).join(', '):''}">${parcels.map(item=>`<small aria-hidden="true">${item.word.icon}</small>`).join('')||'📪'}</span>${deliver?'<small>Csomag kézbesítése</small>':''}</button>`;
    }).join('')}</div>`;
  }
  function renderPost() {
    const parcels=`<div class="rp-parcels" aria-label="${deliveries.length} kézbesített csomag">${deliveries.map((item,i)=>`<span class="rp-parcel ${i===deliveries.length-1?'is-arriving':''}" aria-label="${html(item.word.text)}, ${html(item.recipient.name)} csomagja">📦<small>${item.word.icon}</small><span class="rp-parcel-recipient">${item.recipient.icon}</span></span>`).join('')}</div>`;
    if(completed&&!successPending)return `<div class="rp-post-mission"><h3>${mission.icon} ${mission.title}</h3>${parcels}</div>${renderRecipients()}${finishCard('Mindkét csomag megérkezett!','🤖 📦 🌼')}`;
    const word=currentWord();
    return `<div class="rp-post-mission"><h3>${mission.icon} ${mission.title}</h3><p>Két összetartozó csomag · válassz, kinek küldöd!</p><div class="rp-mission-items">${deck.map((item,i)=>`<span class="${i<step?'is-delivered':''}">${item.icon} ${html(item.text)} ${i<step?'✓':''}</span>`).join('')}</div></div>${progressDots()}<div class="rp-post-scene"><span class="rp-post-cloud" aria-hidden="true">☁</span><div class="rp-target" data-word="${word.id}"><span class="rp-target-picture" aria-hidden="true">${word.icon}</span><h3>${marked(targetText())}</h3></div><div class="rp-post-robot ${phase==='listening'?'is-listening':''}" aria-hidden="true">🤖<span class="rp-robot-bubble">${interactionReady?'Kész a csomag!':'Ezt küldjük!'}</span></div>${parcels}</div>
      ${interactionReady?`<p class="rp-help">Kész a csomag! Koppints egy házra!</p>${renderRecipients(true)}<div class="rp-actions">${stopButton()}<button data-action="model" ${phase!=='idle'||completed?'disabled':''}>🔊 Szó újra</button></div>`:renderRecipients()+speechControls('Csomag előkészítése')}`;
  }
  function bakery() {
    return `<div class="rp-bakery" aria-label="${decorations.filter(Boolean).length} elkészült műhelydísz"><div class="rp-awning" aria-hidden="true"></div><div class="rp-bakery-sign">Perecműhely</div><div class="rp-decoration-board" role="group" aria-label="A díszek helye">${decorations.map((item,i)=>`<button data-place="${i}" class="rp-decoration-place ${item?'is-decorated rp-decoration rp-stamp-'+item.stamp:''}" aria-label="${i+1}. hely${item?`: ${item.name}`:', üres'}${interactionReady&&selectedDecoration?', ide teszem a díszt':''}" ${!interactionReady||!selectedDecoration||phase!=='idle'?'disabled':''}>${item?`<span aria-hidden="true">${item.icon}</span>`:'<span aria-hidden="true">＋</span>'}</button>`).join('')}</div><span class="rp-bakery-counter" aria-hidden="true"></span></div>`;
  }
  function renderWorkshop() {
    const picker=`<div class="rp-position-picker" role="group" aria-label="Az R helye a szóban">${Object.entries(R_POSITIONS).map(([id,label])=>`<button data-position="${id}" aria-pressed="${prefs.position===id}"><b aria-hidden="true">${{all:'R',initial:'R…',medial:'…R…',final:'…R'}[id]}</b><small>${label}</small></button>`).join('')}</div><p class="rp-mode-note">Másik szócsoportnál új kör indul, a díszeid megmaradnak.</p>`;
    if(completed&&!successPending)return `${picker}${bakery()}${finishCard('Elkészültek az új díszeink!','🥨 🌷')}`;
    const word=currentWord();
    return `${picker}${progressDots()}<div class="rp-workshop-layout">${bakery()}<div class="rp-target" data-word="${word.id}"><span class="rp-target-picture" aria-hidden="true">${word.icon}</span><h3>${marked(targetText())}</h3><p>${R_POSITIONS[word.position]}</p></div></div><div class="rp-stamp-picker" role="group" aria-label="Milyen díszt készítsünk?">${R_STAMPS.map(style=>`<button data-stamp="${style.id}" aria-pressed="${stamp===style.id}" ${phase!=='idle'||completed?'disabled':''}><span aria-hidden="true">${style.icon}</span>${style.name}</button>`).join('')}</div>${interactionReady?`<p class="rp-help">Válassz egy díszt, aztán koppints egy helyre a műhelyben! A régi díszt is lecserélheted.</p><div class="rp-decoration-picker" role="group" aria-label="Válassz díszt">${R_DECORATIONS.map(item=>`<button data-decoration="${item.id}" aria-pressed="${selectedDecoration===item.id}" ${phase!=='idle'||completed?'disabled':''}><span aria-hidden="true">${item.icon}</span>${item.name}</button>`).join('')}</div><div class="rp-actions">${stopButton()}</div>`:speechControls('Díszt választok')}`;
  }
  function renderStory() {
    const rhyme=currentRhyme();
    return `<div class="rp-story"><h3>Rakjuk sorba a képeket!</h3><p>Válaszd ki egymás után a mondóka képeit. A hanggomb segít felidézni a sort.</p><ol class="rp-story-order" aria-label="A választott sorrend">${Array.from({length:4},(_,i)=>`<li>${storyOrder[i]===undefined?'?':rhyme.lines[storyOrder[i]][1]}</li>`).join('')}</ol><div class="rp-story-cards">${storyCards.map(card=>`<div class="rp-story-card" data-story-card="${card.id}"><button data-story="${card.id}" aria-label="${html(card.text)} – ezt teszem következőnek" ${phase!=='idle'||storyDone||storyOrder.includes(card.id)?'disabled':''}><span aria-hidden="true">${card.icon}</span></button><button data-story-sound="${card.id}" aria-label="${html(card.text)} meghallgatása" ${phase!=='idle'?'disabled':''}>🔊 Meghallgatom</button></div>`).join('')}</div>${storyDone?'<p class="rp-rhyme-complete" role="status">🌼 Sorba rendeztük a képeket!</p>':''}<div class="rp-actions">${stopButton()}<button data-action="story-undo" ${!storyOrder.length||storyDone||phase!=='idle'?'disabled':''}>← Utolsó kép vissza</button><button data-action="story-restart" ${phase!=='idle'?'disabled':''}>↻ Új sorrend</button><button data-action="story-close">Vissza a mondókához</button></div></div>`;
  }
  function renderRhyme() {
    const rhyme=currentRhyme(), units=rhymeUnits(), unit=currentUnit();
    const practiced=line=>units.filter(item=>item.line===line).every(item=>rhymeDone.has(item.key));
    const modes=`<div class="rp-mode-picker" role="group" aria-label="Hogyan játsszunk a mondókával?"><button data-rhyme-mode="say" aria-pressed="${prefs.rhymeMode!=='missing'}">🎵 Mondjuk együtt</button><button data-rhyme-mode="missing" aria-pressed="${prefs.rhymeMode==='missing'}">🧩 Elbújt szó</button></div>`;
    if(prefs.rhymeMode==='missing')return modes+(storyOpen?renderStory():renderRhymePuzzle());
    const picker=modes+`<div class="rp-rhyme-picker" role="group" aria-label="Válassz mondókát">${R_RHYMES.map((item,i)=>`<button data-rhyme="${i}" aria-pressed="${i===rhymeIndex}"><span aria-hidden="true">${item.icon}</span>${item.title}</button>`).join('')}</div>`;
    if(storyOpen)return picker+renderStory();
    const actions=completed&&!successPending?`<div class="rp-rhyme-complete" role="status">🌼 Mind a négy sort együtt gyakoroltuk!</div><div class="rp-actions">${stopButton()}<button data-action="story-open" ${phase!=='idle'||successPending?'disabled':''}>🖼️ A képek története</button><button data-action="restart">↻ Mondjuk újra!</button></div>`:prefs.rhymeMode==='repeat'?`<p class="rp-help">A hang után annyi időtök van, amennyi jólesik. Mondjátok együtt, majd lépjetek tovább.</p><div class="rp-actions"><button data-action="model" ${phase!=='idle'||completed?'disabled':''}>🔊 Még egyszer</button><button class="rp-primary" data-action="rhyme-repeat-next" ${phase!=='idle'||completed?'disabled':''}>Kimondtuk · következő rész →</button>${stopButton()}</div>`:speechControls(prefs.rhymeShort?'Részt gyakoroltuk · következő':'Sort gyakoroltuk · következő');
    return `${picker}<div class="rp-rhyme-options"><label>Hogyan mondjuk?<select data-rhyme-practice ${successPending?'disabled':''}><option value="say" ${prefs.rhymeMode==='say'?'selected':''}>Közös vagy mikrofonos próba</option><option value="repeat" ${prefs.rhymeMode==='repeat'?'selected':''}>Hallgasd – mondd – lépj tovább</option></select></label><label><input type="checkbox" ${successPending?'disabled':''} data-rhyme-short ${prefs.rhymeShort?'checked':''}> Rövid részekben mondjuk</label></div><div class="rp-rhyme-stage" aria-hidden="true"><span class="rp-rhyme-sun">☀</span><span class="rp-line-art">${unit.icon}</span><span class="rp-rhyme-grass">🌿 🌼 🌿</span></div><div class="rp-rhyme-heading"><h3>${rhyme.title}</h3><button data-action="rhyme-all" ${phase!=='idle'||successPending?'disabled':''}>🔊 Teljes mondóka</button></div>
      <div class="rp-rhyme-lines" role="group" aria-label="A mondóka sorai">${rhyme.lines.map(([text],i)=>`<button class="rp-rhyme-line ${i===unit.line?'is-current':''} ${practiced(i)?'is-practiced':''}" data-line="${i}" ${successPending?'disabled':''} aria-pressed="${i===unit.line}" aria-label="${i+1}. sor: ${html(text)}"><span aria-hidden="true">${practiced(i)?'✿':'🔊'}</span><span>${marked(text)}</span></button>`).join('')}</div>${completed&&!successPending?'':`<div class="rp-rhyme-current"><p>${unit.line+1}. sor${unit.part===null?'':` · ${unit.part+1}. rész`}</p><h3>${marked(unit.text)}</h3></div>`}${actions}`;
  }
  function renderRhymePuzzle() {
    const rhyme=currentRhyme(),gap=rhymeGap(rhyme.id,step),text=rhyme.lines[step][0],at=text.indexOf(gap.missing);
    const picker=`<div class="rp-rhyme-picker" role="group" aria-label="Válassz mondókát">${R_RHYMES.map((item,i)=>`<button data-rhyme="${i}" aria-pressed="${i===rhymeIndex}"><span aria-hidden="true">${item.icon}</span>${item.title}</button>`).join('')}</div>`;
    if(completed&&!successPending)return `${picker}<div class="rp-rhyme-complete">🌼 Mind a négy elbújt szó megvan!</div><div class="rp-actions"><button data-action="story-open">🖼️ A képek története</button></div>${finishCard('Kiegészítettük a mondókát!','🧩 🎵')}`;
    return `${picker}${progressDots(4,step)}<div class="rp-gap-card"><span class="rp-gap-icon" aria-hidden="true">🧩</span><h3>${rhyme.title}</h3><p class="rp-gap-line">${html(text.slice(0,at))}<span class="rp-gap-blank ${rhymeSolved?'is-filled':''}">${rhymeSolved?marked(gap.missing):'…'}</span>${html(text.slice(at+gap.missing.length))}</p><button class="rp-primary" data-action="model" ${phase!=='idle'||completed?'disabled':''}>🔊 Hallgassuk meg a sort!</button></div><div class="rp-gap-choices">${rhymeChoices.map(word=>`<button data-gap-choice="${word.id}" class="${rhymeSolved&&word.id===gap.word.id?'is-found':''} ${rhymeWrong===word.id?'is-try':''}" ${phase!=='idle'||rhymeSolved||completed?'disabled':''}><span aria-hidden="true">${word.icon}</span><strong>${html(word.text)}</strong></button>`).join('')}</div><div class="rp-actions"><button class="rp-primary" data-action="rhyme-next" ${!rhymeSolved||phase!=='idle'||completed?'disabled':''}>${step===3?'Kör befejezése':'Következő sor'} →</button><button data-action="restart">↻ Új kör</button></div>`;
  }
  function renderEcho() {
    const word=currentWord(), busy=phase!=='idle', supported=recorder.isSupported();
    return `<label class="rp-echo-picker">Válassz mintát<select data-echo-word>${deck.map((item,i)=>`<option value="${i}" ${i===step?'selected':''}>${html(item.text)}</option>`).join('')}</select></label><div class="rp-echo-stage"><div class="rp-target" data-word="${word.id}"><span class="rp-target-picture" aria-hidden="true">${word.icon}</span><h3>${marked(targetText())}</h3></div><span class="rp-echo-rings ${phase==='recording'||phase==='replay'?'is-active':''}" aria-hidden="true">${phase==='recording'?'🎙️':phase==='replay'?'🔊':'🎧'}</span></div>
      <div class="rp-record-timer" aria-live="off">${phase==='recording'?`Felvétel: ${recordingSeconds} / 8 másodperc`:recording?`Saját felvétel: ${(recordingDuration/1000).toFixed(1).replace('.',',')} másodperc`:'Egy rövid szó vagy kifejezés fér a felvételbe.'}</div>
      <div class="rp-actions"><button class="rp-primary" data-action="model" ${busy?'disabled':''}>🔊 Mintahang</button>${phase==='recording'?'<button class="rp-primary" data-action="record-finish">■ Felvétel befejezése</button>':`<button data-action="record" ${busy||!supported?'disabled':''}>🎙️ ${recording?'Újra felveszem':'Felveszem a hangom'}</button>`}${busy?'<button data-action="stop">■ Megállítás</button>':''}</div>
      <div class="rp-actions"><button class="rp-primary" data-action="replay" ${busy||!recording?'disabled':''}>▶ Saját hangom</button><button data-action="compare" ${busy||!recording?'disabled':''}>🔊 Minta, aztán saját hangom</button><button data-action="record-delete" ${busy||!recording?'disabled':''}>Felvétel elengedése</button><button data-action="echo-next" ${busy?'disabled':''}>Másik szó →</button></div><div class="rp-actions"><button data-action="echo-confirm" ${busy||echoRoundReported?'disabled':''}>Együtt gyakoroltuk 🌼</button></div>
      <p class="rp-mode-note">${supported?'Legfeljebb 8 másodperc. A saját felvételt nem töltjük fel és nem mentjük fájlba; új szó, kilépés vagy elrejtett lap esetén elengedjük.':'Ebben a böngészőben nem érhető el a hangfelvétel. A mintahangot meghallgathatjátok, és együtt gyakorolhattok.'}</p>`;
  }
  function renderHunter() {
    if(completed&&!successPending)return finishCard(prefs.hunterKind==='position'?'Minden szó R-helyét megtaláltad!':'Minden kép megvan!','🔎 🌼');
    const current=deck[Math.min(step,deck.length-1)], sound=prefs.hunterKind==='sound';
    const modes=`<div class="rp-mode-picker rp-hunter-modes" role="group" aria-label="Hangvadász játékai">${Object.entries(R_HUNTER_MODES).map(([id,label])=>`<button data-hunter-kind="${id}" aria-pressed="${prefs.hunterKind===id}">${label}</button>`).join('')}</div>`;
    if(prefs.hunterKind==='position')return `${modes}${progressDots()}<div class="rp-position-target rp-target" data-word="${current.target.id}"><span class="rp-target-picture" aria-hidden="true">${current.target.icon}</span><h3>${solved?marked(current.target.text):'Hallgasd meg a szót!'}</h3><button class="rp-primary" data-action="model" ${phase!=='idle'||completed?'disabled':''}>🔊 Hallgasd meg!</button></div><div class="rp-position-train" role="group" aria-label="Hol hallod az R hangot?">${['initial','medial','final'].map((id,i)=>`<button data-r-location="${id}" class="${solved&&rSoundPositions(current.target.text).includes(id)?'is-found':''} ${wrongId===id?'is-try':''}" ${solved||phase!=='idle'||completed?'disabled':''}><span class="rp-wagon" aria-hidden="true">${[0,1,2].map(n=>`<b>${n===i?'R':'•'}</b>`).join('')}</span><strong>${R_POSITIONS[id]}</strong></button>`).join('')}</div><div class="rp-actions">${stopButton()}<button class="rp-primary" data-action="hunter-next" ${!solved||phase!=='idle'||completed?'disabled':''}>${step===deck.length-1?'Kör befejezése':'Következő szó'} →</button><button data-action="restart">↻ Új szavak</button></div>`;
    return `${modes}${progressDots()}<div class="rp-game-instruction"><span aria-hidden="true">🔎</span><h3>${sound?'Melyik szóban hallod az R-t?':'Melyik képet hallottad?'}</h3><button class="rp-primary" data-action="model" ${completed||phase!=='idle'?'disabled':''}>🔊 ${sound?'Hallgassuk meg a képek nevét!':'Hallgasd meg!'}</button></div>
      <div class="rp-choice-grid" style="--rp-choices:${prefs.choices}">${current.choices.map(word=>`<div class="rp-option ${solved&&word.id===current.target.id?'is-found':''} ${wrongId===word.id?'is-try':''}" data-id="${word.id}">${sound?`<button class="rp-choice-sound" data-sound="${word.id}" aria-label="${html(word.text)} meghallgatása" ${completed||phase!=='idle'?'disabled':''}>🔊</button>`:''}<button class="rp-picture-choice" data-choice="${word.id}" aria-label="${html(word.text)} kiválasztása" ${solved||phase!=='idle'?'disabled':''}><span aria-hidden="true">${word.icon}</span><small>${html(word.text)}</small>${solved&&word.id===current.target.id?'<b aria-hidden="true">✓</b>':''}</button></div>`).join('')}</div>
      <div class="rp-actions">${stopButton()}<button data-action="hunter-next" class="rp-primary" ${completed||!solved||phase!=='idle'?'disabled':''}>${step===deck.length-1?'Kör befejezése':'Következő kép'} →</button><button data-action="restart">↻ Új képek</button></div>`;
  }
  function finishCard(title,icons) { return `<div class="rp-finish"><span aria-hidden="true">${icons}</span><h3>${title}</h3><p>Köszönöm a közös játékot!</p><div class="rp-actions"><button data-action="restart" class="rp-primary">↻ Új kör</button><button data-action="hub">Másik kaland</button></div></div>`; }
  function finishRound(cue) {
    successPending=true; message=''; render();
    const completedGame=game;
    successDelay.schedule(()=>{
      if(!allowed()||!completed||game!==completedGame)return;
      successPending=false; message=''; render();
      if(!document.querySelector('dialog[open]'))void playClips(['r_round_done'],cue);
    });
  }
  function beginGame(id,{keepDecorations=false}={}) {
    if(!allowed()||!R_GAMES.some(value=>value.id===id))return;
    onRestart();cancel();clearRecording();game=id;lastGame=id;step=0;solved=false;wrongId='';completed=false;message='';readyToAdvance=false;transcript='';echoRoundReported=false;
    hunterErrors=0;interactionReady=false;selectedDecoration='';storyOpen=false;storyOrder=[];storyDone=false;deliveries=[];suspendedFocus='';
    if(id==='workshop'&&!keepDecorations)decorations=Array(9).fill(null);
    if(id==='rhyme'){rhymeDone=new Set();rhymeRoundReported=false;rhymeSolved=false;rhymeWrong='';rhymeChoices=buildRhymeChoices(currentRhyme().id,0);}
    const previous=previousDecks.get(id)||[];
    deck=id==='hunter'?buildRHunterRound(prefs,Math.random,previous):buildRPracticeDeck(prefs,previous,Math.random,id==='echo'?R_WORDS.length:prefs.roundLength);
    if(id==='post'){mission=buildRPostMission(prefs.position,Math.random,lastMission);lastMission=mission.id;deck=mission.deck;}
    if(id!=='rhyme')previousDecks.set(id,deck.map(word=>word.target?.id||word.id));
    render('h2');
    if(['hunter','post','workshop','rhyme','echo'].includes(id))void playCurrent({intro:true});
  }
  async function playClips(ids, cue, {after='Most te jössz!'}={}) {
    cancel(); const token=generation; phase='model';message='Hallgassuk meg!';render();let succeeded=true;
    for(const id of ids) {
      if(!allowed()||token!==generation)return false;
      const currentCue=typeof cue==='function'?cue(id):cue;
      modelTarget=currentCue?.target||'';render();
      let result;try{result=await speak(id,currentCue);}catch{result=false;}
      if(!allowed()||token!==generation)return false;
      modelTarget='';
      if(result===false){message='A mintahang most nem indult el. Koppints újra a hanggombra!';succeeded=false;break;}
    }
    if(allowed()&&token===generation){phase='idle';if(succeeded)message=after;render();}
    return succeeded&&allowed()&&token===generation;
  }
  function playCurrent({intro=false}={}) {
    if(!allowed()||completed)return;
    if(game==='hub')return playClips(['r_hub'],{target:'.rp-hub-scene'});
    if(game==='hunter') {
      const current=deck[step];
      if(prefs.hunterKind==='position')return playClips([...(intro?['r_hunter_position']:[]),`r_word_${current.target.id}`],id=>({target:id==='r_hunter_position'?'.rp-position-train':'.rp-position-target'}));
      return prefs.hunterKind==='sound'?playClips([...(intro?['r_hunter_sound']:[]),...current.choices.map(word=>`r_word_${word.id}`)],id=>({target:id==='r_hunter_sound'?'.rp-game-instruction':`.rp-option[data-id="${id.replace('r_word_','')}"]`})):playClips([...(intro?['r_hunter']:[]),`r_word_${current.target.id}`],{target:'.rp-game-instruction'});
    }
    if(['post','workshop','echo'].includes(game))return playClips([...(intro?[`r_${game}`]:[]),...(intro&&game==='post'?[`r_mission_${mission.id}`]:[]),targetClip()],{target:'.rp-target'});
    if(game==='rhyme')return playClips([...(intro?[prefs.rhymeMode==='missing'?'r_rhyme_gap':'r_rhyme']:[]),targetClip()],{target:prefs.rhymeMode==='missing'?'.rp-gap-line':'.rp-rhyme-current'},{after:prefs.rhymeMode==='repeat'?'Most mondjátok ti! Ha készen vagytok, lépjetek tovább.':'Most te jössz!'});
  }
  function selectRhymeLine(index) {
    if(!allowed()||successPending||game!=='rhyme'||!Number.isInteger(index)||!currentRhyme().lines[index])return;
    cancel();step=rhymeUnits().findIndex(unit=>unit.line===index);readyToAdvance=false;transcript='';completed=false;message='';render();void playCurrent();
  }
  async function playWholeRhyme() {
    if(!allowed()||game!=='rhyme')return;
    cancel();const token=generation;phase='model';readyToAdvance=false;transcript='';
    for(let i=0;i<currentRhyme().lines.length;i++){
      if(!allowed()||token!==generation)return;
      step=rhymeUnits().findIndex(unit=>unit.line===i);message=`Hallgassuk meg: ${i+1}. sor.`;modelTarget=`.rp-rhyme-line[data-line="${i}"]`;render();
      let result;try{result=await speak(`r_rhyme_${currentRhyme().id}_${i}`,{target:modelTarget,parts:[{at:currentRhyme().lines[i][0],target:'.rp-line-art',motion:'sway'}]});}catch{result=false;}
      if(!allowed()||token!==generation)return;modelTarget='';
      if(result===false&&token===generation){phase='idle';message='A mintahang most nem indult el. Koppints újra a hanggombra!';render();return;}
    }
    if(allowed()&&token===generation){phase='idle';step=0;message='Válassz egy sort, és mondjátok együtt!';render();}
  }
  async function practiceSpeech() {
    if(!allowed()||completed||interactionReady||phase!=='idle'||prefs.speechMode==='together'||!['post','workshop','rhyme'].includes(game))return;
    cancel();const token=generation, attempt=new AbortController();controller=attempt;let started=false;
    readyToAdvance=false;transcript='';phase='preparing';quietEffects();message='Mikrofon előkészítése…';render();
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
    cancel();const token=generation,attempt=new AbortController();controller=attempt;
    phase='preparing';quietEffects();message='Mikrofon előkészítése…';render();
    const result=await recorder.record({signal:attempt.signal,onStart:()=>{
      if(!allowed()||generation!==token||attempt.signal.aborted)return;
      phase='recording';recordingSeconds=0;message='Most felvesszük a hangodat. Mondd a szót!';render();
    },onTick:ms=>{if(generation!==token||!allowed())return;recordingSeconds=Math.floor(ms/1000);const timer=$('.rp-record-timer');if(timer)timer.textContent=`Felvétel: ${recordingSeconds} / 8 másodperc`;}});
    if(controller===attempt)controller=null;
    if(!allowed()||generation!==token||attempt.signal.aborted)return;
    phase='idle';attempt.abort();
    if(result.blob){recording=result.blob;recordingDuration=result.duration;report('practice');if(!echoRoundReported){report('round');echoRoundReported=true;}message='Elkészült a saját felvételed. Hallgassátok vissza együtt!';}
    else{message=({unsupported:'Itt nem érhető el a hangfelvétel. Gyakorolhatunk együtt is!', 'not-allowed':'A mikrofon engedélye hiányzik. Kérj segítséget egy felnőttől, vagy gyakoroljatok együtt!', 'too-short':'Nagyon rövid lett a felvétel. Próbáljuk újra!', 'too-large':'Ez a felvétel túl nagy lett. Próbáljunk egy rövidebb szót!', 'start-timeout':'A felvétel nem indult el. Próbáljuk újra vagy együtt!'})[result.error]||'A felvétel most nem sikerült. Próbáljuk újra vagy együtt!';if(recording)message+=' A korábbi felvételedet továbbra is meghallgathatod.';}
    render();
  }
  async function replayRecording(existingToken) {
    if(!allowed()||game!=='echo'||!recording||phase!=='idle')return;
    if(existingToken!==undefined&&existingToken!==generation)return;
    if(existingToken===undefined)cancel();const token=generation;replayUrl=URL.createObjectURL(recording);const audio=new Audio(replayUrl);replayAudio=audio;
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
  async function compareEcho() {
    if(!allowed()||game!=='echo'||!recording||phase!=='idle')return;
    const ok=await playClips(['r_echo_compare',targetClip(),'r_echo_yours'],{target:'.rp-target'},{after:'Most a saját hangod következik.'});
    const token=generation;
    if(ok&&allowed()&&game==='echo'&&recording&&phase==='idle')void replayRecording(token);
  }
  function finishAction() {
    cancel();interactionReady=false;selectedDecoration='';step++;readyToAdvance=false;transcript='';message='';
    if(step===deck.length){completed=true;report('round');finishRound({target:'.rp-finish'});}
    else{render('[data-action="model"]');void playClips([game==='post'?'r_delivered':'r_decorated',targetClip()],id=>({target:id.startsWith('r_word_')||id.startsWith('r_phrase_')?'.rp-target':game==='post'?'.rp-parcels':'.rp-decoration-board'}));}
  }
  function advancePractice(manual=false) {
    if(!allowed()||!['post','workshop','rhyme'].includes(game)||completed||interactionReady||phase!=='idle'||(!manual&&prefs.speechMode!=='together'&&!readyToAdvance))return;
    cancel();if(manual||prefs.speechMode==='together')report('confirmed');
    if(game==='rhyme'){
      rhymeDone.add(currentUnit().key);readyToAdvance=false;transcript='';
      const units=rhymeUnits();
      if(units.every(unit=>rhymeDone.has(unit.key))){completed=true;if(!rhymeRoundReported){report('round');rhymeRoundReported=true;}finishRound({target:'.rp-rhyme-complete'});}
      else{step=units.findIndex(unit=>!rhymeDone.has(unit.key));message='';render();void playCurrent();}
      return;
    }
    interactionReady=true;message=game==='post'?'Kész a csomag! Válassz egy házat!':'Válassz díszt, aztán egy helyet!';
    render(game==='post'?'[data-deliver]':'[data-decoration]');
    void playClips([game==='post'?'r_post_ready':'r_decorate_choose'],{target:game==='post'?'.rp-delivery-grid':'.rp-decoration-picker'},{after:message});
  }
  function deliverParcel(id) {
    const friend=R_RECIPIENTS.find(item=>item.id===id);
    if(!allowed()||game!=='post'||!interactionReady||phase!=='idle'||!friend)return;
    recipient=id;effect('serve');deliveries.push({word:currentWord(),recipient:friend});finishAction();
  }
  function placeDecoration(index) {
    const decoration=R_DECORATIONS.find(item=>item.id===selectedDecoration);
    if(!allowed()||game!=='workshop'||!interactionReady||phase!=='idle'||!decoration||!Number.isInteger(index)||index<0||index>=decorations.length)return;
    effect('snap');decorations[index]={...decoration,stamp};finishAction();
  }
  function openStory() {
    if(!allowed()||game!=='rhyme'||!completed||successPending)return;
    cancel();storyOpen=true;storyCards=buildRRhymeStory(currentRhyme());storyOrder=[];storyDone=false;message='';render('[data-story]');void playClips(['r_story'],{target:'.rp-story'},{after:'Melyik kép volt először?'});
  }
  function chooseStory(id) {
    if(!allowed()||game!=='rhyme'||!storyOpen||storyDone||phase!=='idle'||storyOrder.includes(id)||!storyCards.some(card=>card.id===id))return;
    storyOrder.push(id);
    if(storyOrder.length===4){
      storyDone=isRRhymeStoryComplete(storyOrder);
      render(storyDone?'[data-action="story-close"]':'[data-action="story-undo"]');
      void playClips([storyDone?'r_story_done':'r_story_retry'],{target:'.rp-story-order'},{after:storyDone?'Sorba rendeztük a képeket!':'Van, ami más sorrendben történt. Vedd vissza az utolsó képet, vagy kezdd újra!'});
    }else{message=`${storyOrder.length} képet választottál. Válaszd a következőt!`;render('[data-story]:not(:disabled)');}
  }
  function chooseRLocation(id) {
    if(!allowed()||game!=='hunter'||prefs.hunterKind!=='position'||completed||solved||phase!=='idle')return;
    if(!rSoundPositions(deck[step].target.text).includes(id)){effect('retry');wrongId=id;render();void playClips(['r_retry',`r_word_${deck[step].target.id}`],{target:'.rp-position-target'});return;}
    effect('collect');solved=true;wrongId='';report('practice');render();void playClips([`r_position_${id}`,'guide_good'],{target:`[data-r-location="${id}"]`});
  }
  function chooseRhymeWord(id) {
    if(!allowed()||game!=='rhyme'||prefs.rhymeMode!=='missing'||completed||rhymeSolved||phase!=='idle')return;
    const gap=rhymeGap(currentRhyme().id,step);
    if(id!==gap.word.id){effect('retry');rhymeWrong=id;message='Hallgassuk meg a sort még egyszer!';render();void playClips(['r_retry',targetClip()],{target:'.rp-gap-line'});return;}
    effect('collect');rhymeSolved=true;rhymeWrong='';rhymeDone.add(step);report('practice');render();void playClips(['guide_good',gap.voice,targetClip()],id=>({target:id===gap.voice?`[data-gap-choice="${gap.word.id}"]`:'.rp-gap-line'}));
  }
  function nextRhymePuzzle() {
    if(!allowed()||game!=='rhyme'||prefs.rhymeMode!=='missing'||!rhymeSolved||completed||phase!=='idle')return;
    cancel();
    if(step===3){completed=true;if(!rhymeRoundReported){report('round');rhymeRoundReported=true;}finishRound({target:'.rp-rhyme-complete'});return;}
    step++;rhymeSolved=false;rhymeWrong='';rhymeChoices=buildRhymeChoices(currentRhyme().id,step);render();void playCurrent();
  }
  function chooseHunter(id) {
    if(!allowed()||game!=='hunter'||completed||solved||phase!=='idle')return;
    if(id!==deck[step].target.id){
      effect('retry');wrongId=id;hunterErrors++;message='Hallgassuk meg újra, és válasszunk!';render();
      if(hunterErrors>=2){
        const pair=shuffleR([deck[step].target,deck[step].choices.find(word=>word.id===id)]);
        void playClips(['r_compare',...pair.map(word=>`r_word_${word.id}`),...(prefs.hunterKind==='picture'?[`r_word_${deck[step].target.id}`]:[])],clip=>({target:clip==='r_compare'?'.rp-game-instruction':`.rp-option[data-id="${clip.replace('r_word_','')}"]`}),{after:'Hallottuk mindkét szót. Próbáljuk újra!'});
      }else void playClips(['r_retry',...(prefs.hunterKind==='sound'?deck[step].choices.map(word=>`r_word_${word.id}`):[`r_word_${deck[step].target.id}`])],clip=>({target:clip==='r_retry'?'.rp-game-instruction':prefs.hunterKind==='sound'?`.rp-option[data-id="${clip.replace('r_word_','')}"]`:'.rp-game-instruction'}),{after:'Hallgassuk meg újra, és válasszunk!'});
      return;
    }
    effect('collect');solved=true;wrongId='';message='Megtaláltad a képet!';report('practice');render();
    void playClips(['r_found'],{target:`.rp-option[data-id="${id}"]`});
  }
  function nextHunter() {
    if(!allowed()||!solved||phase!=='idle'||completed)return;
    cancel();step++;solved=false;wrongId='';hunterErrors=0;message='';
    if(step===deck.length){completed=true;solved=true;report('round');finishRound({target:'.rp-finish'});}
    else{render();void playCurrent();}
  }
  root.addEventListener('click',event=>{
    const button=event.target.closest('button');if(!button||button.disabled||!allowed())return;
    if(button.dataset.hunterKind){prefs=normalizeRPreferences({...prefs,hunterKind:button.dataset.hunterKind});saveRPreferences(storage,prefs);return beginGame('hunter');}
    if(button.dataset.rhymeMode){prefs=normalizeRPreferences({...prefs,rhymeMode:button.dataset.rhymeMode});saveRPreferences(storage,prefs);return beginGame('rhyme');}
    if(button.dataset.rLocation)return chooseRLocation(button.dataset.rLocation);
    if(button.dataset.gapChoice)return chooseRhymeWord(button.dataset.gapChoice);
    if(button.dataset.stamp&&game==='workshop'&&phase==='idle'&&!completed&&R_STAMPS.some(style=>style.id===button.dataset.stamp)){stamp=button.dataset.stamp;render(`[data-stamp="${stamp}"]`);return;}
    if(button.dataset.game)return beginGame(button.dataset.game);
    if(button.dataset.choice)return chooseHunter(button.dataset.choice);
    if(button.dataset.deliver)return deliverParcel(button.dataset.deliver);
    if(button.dataset.recipient&&game==='post'&&phase==='idle'&&!completed&&R_RECIPIENTS.some(friend=>friend.id===button.dataset.recipient)){recipient=button.dataset.recipient;render(`[data-recipient="${recipient}"]`);return;}
    if(button.hasAttribute('data-place'))return placeDecoration(Number(button.dataset.place));
    if(button.dataset.decoration&&phase==='idle'&&interactionReady){selectedDecoration=button.dataset.decoration;message='Most válassz egy helyet a műhelyben!';render('[data-place]');$('.rp-decoration-board')?.scrollIntoView({block:'nearest'});return;}
    if(button.hasAttribute('data-story'))return chooseStory(Number(button.dataset.story));
    if(button.hasAttribute('data-story-sound'))return void playClips([`r_rhyme_${currentRhyme().id}_${button.dataset.storySound}`],{target:`[data-story-card="${button.dataset.storySound}"]`},{after:'Válaszd ki a következő képet!'});
    if(button.dataset.position){prefs=normalizeRPreferences({...prefs,position:button.dataset.position});saveRPreferences(storage,prefs);return beginGame('workshop',{keepDecorations:true});}
    if(button.hasAttribute('data-rhyme')){rhymeIndex=Number(button.dataset.rhyme);return beginGame('rhyme');}
    if(button.hasAttribute('data-line'))return selectRhymeLine(Number(button.dataset.line));
    if(button.dataset.sound)return void playClips([`r_word_${button.dataset.sound}`],{target:`.rp-option[data-id="${button.dataset.sound}"]`});
    const action=button.dataset.action;
    if(action==='hub'){cancel();clearRecording();game='hub';message='';render('h2');}
    else if(action==='surprise')beginGame(pickRGame(getProgress(),lastGame));
    else if(action==='restart')beginGame(game,{keepDecorations:game==='workshop'});
    else if(action==='model')void playCurrent();
    else if(action==='hunter-next')nextHunter();
    else if(action==='listen')void practiceSpeech();
    else if(action==='advance')advancePractice();
    else if(action==='confirm')advancePractice(true);
    else if(action==='stop'){cancel();message='Megállítottuk. Hallgassuk meg újra, vagy folytassuk együtt!';render();}
    else if(action==='rhyme-repeat-next')advancePractice(true);
    else if(action==='story-open'||action==='story-restart')openStory();
    else if(action==='story-undo'){storyOrder.pop();message='Válassz másik képet!';render('[data-story]:not(:disabled)');}
    else if(action==='story-close'){cancel();storyOpen=false;message='';render('[data-action="story-open"]');}
    else if(action==='compare'||action==='echo-compare')void compareEcho();
    else if(action==='rhyme-next')nextRhymePuzzle();
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
    if(!allowed())return;
    if(event.target.hasAttribute('data-rhyme-practice')||event.target.hasAttribute('data-rhyme-short')){
      const mode=event.target.hasAttribute('data-rhyme-practice');prefs=normalizeRPreferences({...prefs,[mode?'rhymeMode':'rhymeShort']:mode?event.target.value:event.target.checked});saveRPreferences(storage,prefs);beginGame('rhyme');return;
    }
    const key=event.target.dataset.pref;if(!key)return;
    const value=['choices','roundLength'].includes(key)?Number(event.target.value):event.target.value;
    prefs=normalizeRPreferences({...prefs,[key]:value});saveRPreferences(storage,prefs);
    if(game==='hub'){cancel();render();}else beginGame(game,{keepDecorations:game==='workshop'});
    const details=$('.rp-settings');if(details)details.open=true;
    $(`[data-pref="${key}"]`)?.focus({preventScroll:true});
  });
  document.addEventListener('visibilitychange',()=>{if(active&&document.hidden){cancel({keepSuccess:true});clearRecording();message='A játék megállt. Folytathatjuk együtt!';render();}});
  window.addEventListener('pagehide',()=>{if(active)stop();});
  function start(){cancel();active=true;game='hub';message='';render();}
  function stop(){active=false;cancel();clearRecording();}
  return {start,stop,repeat:playCurrent,isCapturing:()=>active&&['preparing','listening','recording'].includes(phase),isReplaying:()=>active&&phase==='replay'};
}
