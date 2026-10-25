// Run in a disposable playwright-cli session after opening the local portal.
async page => page.evaluate(async () => {
  const { setupListeningGame } = await import(`/listening-game.js?test=${Date.now()}`);
  const { words } = await import('/game-data.js');
  const root = document.querySelector('#listening-game');
  root.innerHTML = '<div id="listening-progress"></div><div class="listening-prompt"><button id="listening-replay"></button></div><div id="listening-answers"></div><p id="listening-status"></p>';
  const prompts = [];
  let guideDone, completed = 0, guideId;
  const storage = { data: new Map(), getItem(key) { return this.data.get(key) ?? null; }, setItem(key, value) { this.data.set(key, value); } };
  const game = setupListeningGame({
    getOptions: () => ({ words: words.slice(0, 3), allWords: words, length:5, choiceCount:2, difficulty:'different' }),
    setDifficulty: () => {}, storage,
    speak: id => { guideId=id; return new Promise(resolve => { guideDone = resolve; }); },
    playPrompt: word => { prompts.push(word.id); },
    playCorrect: () => Promise.resolve(), stopPlayback: () => {},
    onComplete: (count, context) => { if(count!==5||context.mode!=='bingo')throw Error('Wrong completion');completed++; },
  });
  game.start({mode:'bingo'});
  if(guideId!=='listening_bingo_start')throw Error('Wrong bingo guide');
  if(prompts.length)throw Error('Target played before the guide finished');
  game.start({mode:'classic'});
  guideDone();
  await Promise.resolve();
  if(prompts.length!==1)throw Error('Cancelled bingo guide played a stale target');
  prompts.length=0;
  game.start({mode:'bingo'});
  window.dispatchEvent(new Event('pagehide'));
  guideDone();
  await Promise.resolve();await Promise.resolve();
  if(prompts.length)throw Error('Unloading during bingo guide played a stale target');
  game.start({mode:'bingo',announce:false});
  const original=[...root.querySelectorAll('.listening-bingo-tile')];
  if(original.length!==4)throw Error('Expected a 2×2 board');
  const none=root.querySelector('#listening-none');
  if(!none||none.hidden)throw Error('Missing "Nincs nálam" button');
  let decisions=0;
  for(let step=0;step<8&&!completed;step++){
    const target=prompts.at(-1);
    const button=root.querySelector(`.listening-bingo-tile[data-word="${target}"]`);
    if(button){
      button.click();
      if(!button.classList.contains('is-covered')||!button.disabled)throw Error('Correct picture was not covered');
    }else{none.click();decisions++;}
    if(!original.every((tile,index)=>tile===root.querySelectorAll('.listening-bingo-tile')[index]))throw Error('Bingo board changed between words');
    const count=prompts.length;
    await new Promise(resolve=>setTimeout(resolve,1100));
    if(!completed&&prompts.length!==count+1)throw Error('The next call did not come by itself');
  }
  if(!decisions)throw Error('No call asked for a picture that is not on the board');
  if(completed!==1)throw Error('Bingo did not complete exactly once');
  if(root.querySelectorAll('.listening-bingo-tile.is-line').length!==2)throw Error('The winning line is not marked');
  game.stop();
  return {board:original.length,decisions,completed};
})
