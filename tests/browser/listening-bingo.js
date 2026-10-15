// Run in a disposable playwright-cli session after opening the local portal.
async page => page.evaluate(async () => {
  const { setupListeningGame } = await import(`/listening-game.js?test=${Date.now()}`);
  const root = document.querySelector('#listening-game');
  root.innerHTML = '<div id="listening-progress"></div><button id="listening-replay"></button><div id="listening-answers"></div><p id="listening-status"></p><button id="listening-next"></button>';
  const prompts = [];
  let guideDone, completed = 0, guideId;
  const game = setupListeningGame({
    getOptions: () => ({ words: [{id:'alma',label:'alma',emoji:'🍎'},{id:'viz',label:'víz',emoji:'💧'},{id:'cica',label:'cica',emoji:'🐱'}], length:5, choiceCount:3, difficulty:'different' }),
    setDifficulty: () => {},
    speak: id => { guideId=id; return new Promise(resolve => { guideDone = resolve; }); },
    playPrompt: word => { prompts.push(word.id); },
    playCorrect: () => {}, stopPlayback: () => {},
    onComplete: (count, context) => { if(count!==3||context.mode!=='bingo')throw Error('Wrong completion');completed++; },
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
  if(original.length!==3)throw Error('Expected three fixed pictures');
  for(let step=0;step<3;step++){
    const target=prompts.at(-1);
    const button=root.querySelector(`.listening-bingo-tile[data-word="${target}"]`);
    button.click();
    if(!button.classList.contains('is-covered')||!button.disabled)throw Error('Correct picture was not covered');
    if(step<2){
      root.querySelector('#listening-next').click();
      if(!original.every((tile,index)=>tile===root.querySelectorAll('.listening-bingo-tile')[index]))throw Error('Bingo board changed between words');
      if(prompts.at(-1)===target)throw Error('Bingo repeated a covered picture');
    }
  }
  if(completed!==0)throw Error('Bingo completed before final manual Next');
  root.querySelector('#listening-next').click();
  if(completed!==1)throw Error('Bingo did not complete exactly once');
  game.stop();
  return {board:original.length,completed};
})
