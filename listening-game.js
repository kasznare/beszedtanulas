import { wordCategories } from './game-data.js';
import { setWordPicture } from './word-art.js';

function shuffled(items, random) {
  const result = [...items];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const other = Math.floor(random() * (index + 1));
    [result[index], result[other]] = [result[other], result[index]];
  }
  return result;
}

export function buildListeningRound(pool, length = 5, choiceCount = 2, random = Math.random, difficulty = 'different', firstWordId = null) {
  const unique = [...new Map(pool.map(word => [word.id, word])).values()];
  if (unique.length < 2) throw new Error("A választójátékhoz legalább két külön kép kell.");
  const count = Math.min(unique.length, choiceCount === 3 ? 3 : 2);
  const total = [3, 5, 10].includes(length) ? length : 5;
  const targets = [];
  const selected = unique.find(word => word.id === firstWordId);
  if (selected) targets.push(selected);
  while (targets.length < total) {
    const cycle = shuffled(unique, random);
    if (cycle[0].id === targets.at(-1)?.id) [cycle[0], cycle[1]] = [cycle[1], cycle[0]];
    targets.push(...cycle);
  }
  return targets.slice(0, total).map(target => {
    const category=wordCategories.find(c=>c.id!=='all'&&c.words.includes(target.id));
    const distractors=shuffled(unique.filter(word=>word.id!==target.id),random);
    distractors.sort((a,b)=>(difficulty==='similar'?-1:1)*(Number(category?.words.includes(a.id))-Number(category?.words.includes(b.id))));
    return { target, choices:shuffled([target,...distractors.slice(0,count-1)],random) };
  });
}

export function buildListeningBingo(pool, choiceCount = 2, random = Math.random, difficulty = 'different', firstWordId = null) {
  const first = buildListeningRound(pool, 3, choiceCount, random, difficulty, firstWordId)[0];
  const board = first.choices;
  const targets = [first.target, ...shuffled(board.filter(word => word.id !== first.target.id), random)];
  return { board, targets };
}

export function setupListeningGame({ effect = () => {}, getOptions, setDifficulty, speak, playPrompt, playCorrect, stopPlayback, onComplete, onRestart = () => {} }) {
  const panel = document.querySelector('#listening-game');
  const answers = document.querySelector("#listening-answers");
  const progress = document.querySelector("#listening-progress");
  const status = document.querySelector("#listening-status");
  const next = document.querySelector("#listening-next");
  const replay = document.querySelector("#listening-replay");
  let round = [];
  let index = 0;
  let solved = false;
  let complete = false;
  let misses=0,generation=0,mode='classic';
  const modes=document.createElement('div');modes.className='listening-modes';modes.setAttribute('role','group');modes.setAttribute('aria-label','Keresős játék módja');
  modes.innerHTML='<button type="button" data-listening-mode="classic" aria-pressed="true">Hol van?</button><button type="button" data-listening-mode="bingo" aria-pressed="false">Hangos bingó</button>';
  panel.prepend(modes);
  modes.addEventListener('click',event=>{const button=event.target.closest('[data-listening-mode]');if(!button||document.hidden)return;start({mode:button.dataset.listeningMode,announce:button.dataset.listeningMode==='bingo'});button.focus({preventScroll:true});});
  const settings=document.createElement('div');settings.className='upgrade-options';settings.setAttribute('role','group');settings.setAttribute('aria-label','Képek hasonlósága');
  settings.innerHTML='<button data-listening-difficulty="different">Különböző képek</button><button data-listening-difficulty="similar">Hasonló képek</button>';
  answers.before(settings);
  settings.addEventListener('click',event=>{const b=event.target.closest('[data-listening-difficulty]');if(!b)return;setDifficulty?.(b.dataset.listeningDifficulty);start();settings.querySelector(`[data-listening-difficulty="${b.dataset.listeningDifficulty}"]`).focus({preventScroll:true});});

  function renderProgress() {
    const done = index + Number(solved);
    progress.setAttribute("aria-label", `${done} / ${round.length} kép`);
    progress.replaceChildren(...round.map((_, position) => {
      const dot = document.createElement("span");
      dot.className = `progress-dot${position < done ? " is-done" : position === index ? " is-current" : ""}`;
      dot.setAttribute("aria-hidden", "true");
      return dot;
    }));
  }

  function repeat(options = {}) {
    if (!round.length || complete || document.hidden) return;
    if (mode === 'bingo' && options.intro) {
      const token = generation;
      Promise.resolve(speak?.('listening_bingo_start')).catch(() => {}).then(() => {
        if (token === generation && round.length && !complete && !document.hidden)
          playPrompt(round[index].target, { ...options, intro: false });
      });
      return;
    }
    playPrompt(round[index].target, options);
  }

  function renderQuestion() {
    if(mode==='bingo'){renderBingoQuestion();return;}
    generation++;
    solved = false;
    misses=0;
    next.disabled = true;
    next.classList.remove("is-ready");
    next.setAttribute("aria-label", index === round.length - 1 ? "Kör befejezése" : "Következő kép");
    status.textContent = "";
    answers.replaceChildren();
    answers.dataset.count = round[index].choices.length;
    for (const word of round[index].choices) {
      const button = document.createElement("button");
      button.className = "listening-answer";
      button.dataset.word = word.id;
      button.setAttribute("aria-label", word.label);
      const picture = document.createElement("span");
      picture.className = "listening-picture";
      setWordPicture(picture,word);
      picture.setAttribute("aria-hidden", "true");
      const mark = document.createElement("span");
      mark.className = "listening-mark";
      mark.setAttribute("aria-hidden", "true");
      button.append(picture, mark);
      button.addEventListener("click", async () => {
        if (solved || complete || !round.length) return;
        answers.querySelectorAll(".is-retry").forEach(item => item.classList.remove("is-retry"));
        if (word.id !== round[index].target.id) {
          effect("retry");
          misses++;
          button.classList.add("is-retry");
          status.textContent = "Hallgassuk meg újra!";
          if(misses===2&&answers.children.length>2){button.hidden=true;answers.dataset.count=2;}
          if(misses>=3){
            const token=generation;
            answers.querySelector(`[data-word="${round[index].target.id}"]`)?.classList.add('is-hint');
            status.textContent='Nézd a kiemelt képet! Hallgassuk meg együtt!';
            await speak?.('listening_help');
            if(token!==generation||!round.length||solved||document.hidden)return;
          }
          repeat({ retry: true });
          return;
        }
        solved = true;
        generation++;
        button.classList.add("is-correct");
        mark.textContent = "⭐";
        for (const choice of answers.children) choice.disabled = true;
        status.textContent = "Megtaláltad!";
        renderProgress();
        next.disabled = false;
        next.classList.add("is-ready");
        playCorrect();
      });
      answers.appendChild(button);
    }
    renderProgress();
  }

  function renderBingoBoard(board) {
    answers.replaceChildren(...board.map(word=>{
      const button=document.createElement('button');button.type='button';button.className='listening-answer listening-bingo-tile';button.dataset.word=word.id;button.setAttribute('aria-label',word.label);
      const picture=document.createElement('span');picture.className='listening-picture';picture.setAttribute('aria-hidden','true');setWordPicture(picture,word);
      const cover=document.createElement('span');cover.className='listening-bingo-cover';cover.setAttribute('aria-hidden','true');cover.textContent='✓';
      button.append(picture,cover);button.addEventListener('click',()=>chooseBingo(word,button));return button;
    }));
    answers.dataset.count=board.length;
    answers.classList.add('is-bingo');
    answers.setAttribute('aria-label','Hangos bingó képei');
  }
  function renderBingoQuestion() {
    generation++;solved=false;misses=0;
    next.disabled=true;next.classList.remove('is-ready');
    next.setAttribute('aria-label',index===round.length-1?'Bingó befejezése':'Következő bingóhang');
    status.textContent='Hallgasd meg, és jelöld meg a képet!';
    answers.querySelectorAll('.is-retry,.is-hint').forEach(button=>button.classList.remove('is-retry','is-hint'));
    renderProgress();
  }
  function chooseBingo(word,button) {
    if(mode!=='bingo'||!round.length||complete||solved||document.hidden||button.disabled)return;
    if(word.id!==round[index].target.id){
      effect('retry');misses++;button.classList.add('is-retry');status.textContent='Hallgasd meg újra!';
      if(misses>=2)answers.querySelector(`[data-word="${round[index].target.id}"]`)?.classList.add('is-hint');
      repeat({retry:true});return;
    }
    solved=true;generation++;stopPlayback();
    button.classList.remove('is-retry','is-hint');button.classList.add('is-covered');button.disabled=true;
    button.setAttribute('aria-label',`${word.label}, megjelölve`);
    status.textContent=index===round.length-1?'Bingó! Minden kép megvan.':'Megvan! Jöhet a következő hang.';
    next.disabled=false;next.classList.add('is-ready');renderProgress();playCorrect();
    next.focus({preventScroll:true});
  }

  replay.addEventListener("click", () => repeat());
  next.addEventListener("click", () => {
    if (!solved || complete || !round.length) return;
    stopPlayback();
    if (index === round.length - 1) {
      complete = true;
      next.disabled = true;
      onComplete(round.length,{mode});
      return;
    }
    index += 1;
    renderQuestion();
    replay.focus({ preventScroll: true });
    repeat();
  });

  function start({ announce = true, mode: requestedMode } = {}) {
      generation++;
      onRestart();
      stopPlayback();
      if(requestedMode)mode=requestedMode;
      const options = getOptions();
      if(mode==='bingo'){
        const bingo=buildListeningBingo(options.words,options.choiceCount,Math.random,options.difficulty,options.firstWordId);
        round=bingo.targets.map(target=>({target,choices:bingo.board}));
        renderBingoBoard(bingo.board);
      }else{
        round=buildListeningRound(options.words, options.length, options.choiceCount, Math.random, options.difficulty, options.firstWordId);
        answers.classList.remove('is-bingo');answers.setAttribute('aria-label','Válassz képet');
      }
      modes.querySelectorAll('button').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.listeningMode===mode)));
      settings.querySelectorAll('button').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.listeningDifficulty===(options.difficulty||'different'))));
      index = 0;
      complete = false;
      renderQuestion();
      repeat({ intro: announce });
    }
  const suspend=()=>{generation++;stopPlayback();};
  document.addEventListener('visibilitychange',()=>{if(document.hidden)suspend();});
  window.addEventListener('pagehide',suspend);
  return {
    start,
    restart(){start({mode});},
    getContext(){return {mode};},
    stop() { generation++;round = []; stopPlayback(); },
    repeat,
  };
}
