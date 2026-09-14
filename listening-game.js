function shuffled(items, random) {
  const result = [...items];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const other = Math.floor(random() * (index + 1));
    [result[index], result[other]] = [result[other], result[index]];
  }
  return result;
}

export function buildListeningRound(pool, length = 5, choiceCount = 2, random = Math.random) {
  const unique = [...new Map(pool.map(word => [word.id, word])).values()];
  if (unique.length < 2) throw new Error("A választójátékhoz legalább két külön kép kell.");
  const count = Math.min(unique.length, choiceCount === 3 ? 3 : 2);
  const total = [3, 5, 10].includes(length) ? length : 5;
  const targets = [];
  while (targets.length < total) {
    const cycle = shuffled(unique, random);
    if (cycle[0].id === targets.at(-1)?.id) [cycle[0], cycle[1]] = [cycle[1], cycle[0]];
    targets.push(...cycle);
  }
  return targets.slice(0, total).map(target => ({
    target,
    choices: shuffled([target, ...shuffled(unique.filter(word => word.id !== target.id), random).slice(0, count - 1)], random),
  }));
}

export function setupListeningGame({ getOptions, playPrompt, playCorrect, stopPlayback, onComplete }) {
  const answers = document.querySelector("#listening-answers");
  const progress = document.querySelector("#listening-progress");
  const status = document.querySelector("#listening-status");
  const next = document.querySelector("#listening-next");
  const replay = document.querySelector("#listening-replay");
  let round = [];
  let index = 0;
  let solved = false;
  let complete = false;

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
    if (round.length && !complete) playPrompt(round[index].target, options);
  }

  function renderQuestion() {
    solved = false;
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
      picture.textContent = word.emoji;
      picture.setAttribute("aria-hidden", "true");
      const mark = document.createElement("span");
      mark.className = "listening-mark";
      mark.setAttribute("aria-hidden", "true");
      button.append(picture, mark);
      button.addEventListener("click", () => {
        if (solved || complete || !round.length) return;
        answers.querySelectorAll(".is-retry").forEach(item => item.classList.remove("is-retry"));
        if (word.id !== round[index].target.id) {
          button.classList.add("is-retry");
          status.textContent = "Hallgassuk meg újra!";
          repeat({ retry: true });
          return;
        }
        solved = true;
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

  replay.addEventListener("click", () => repeat());
  next.addEventListener("click", () => {
    if (!solved || complete || !round.length) return;
    stopPlayback();
    if (index === round.length - 1) {
      complete = true;
      next.disabled = true;
      onComplete(round.length);
      return;
    }
    index += 1;
    renderQuestion();
    replay.focus({ preventScroll: true });
    repeat();
  });

  return {
    start({ announce = true } = {}) {
      stopPlayback();
      const options = getOptions();
      round = buildListeningRound(options.words, options.length, options.choiceCount);
      index = 0;
      complete = false;
      renderQuestion();
      repeat({ intro: announce });
    },
    stop() { round = []; stopPlayback(); },
    repeat,
  };
}
