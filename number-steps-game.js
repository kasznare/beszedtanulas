import { setGameTitle, focusGameTitle } from './game-heading.js';

const NUMBER_NAMES = ['', 'Egy', 'Kettő', 'Három'];
const POSITIONS = [[88, 418], [266, 330], [426, 250], [586, 170]];
const HOP_MS = 650;
const AUDIO_TIMEOUT_MS = 8000;

// One gesture, one number: no saved level, score, random order or automatic next round.
export function setupNumberStepsGame({ speak, stopPlayback }) {
  const root = document.querySelector('#number-steps');
  let active = false, step = 0, busy = false, generation = 0, pending;
  const $ = selector => root.querySelector(selector);
  const allowed = () => active && !document.hidden && root.classList.contains('is-active');

  function cancel() {
    generation++;
    pending?.();
    pending = null;
    busy = false;
    stopPlayback();
    root.classList.remove('is-hopping', 'is-celebrating');
    update();
  }

  function update() {
    root.dataset.step = String(step);
    root.dataset.busy = String(busy);
    const button = $('#number-steps-advance');
    if (!button) return;
    button.setAttribute('aria-disabled', String(busy));
    button.setAttribute('aria-label', step === 3 ? 'Újra az elejéről' : 'Ugorjon a nyuszi a következő lépcsőre');
    const [x, y] = POSITIONS[step];
    $('#number-steps-rabbit-position').style.transform = `translate(${x}px, ${y}px)`;
    root.querySelectorAll('[data-stair]').forEach(stair => {
      const number = Number(stair.dataset.stair);
      stair.classList.toggle('is-reached', number <= step);
      stair.classList.toggle('is-current', number === step);
    });
    $('#number-steps-prompt').textContent = step === 3 ? 'Újra!' : 'Koppints a nyuszira!';
    $('#number-steps-action-icon').setAttribute('href', step === 3 ? '#i-repeat' : '#i-next');
    $('#number-steps-status').textContent = step ? `${NUMBER_NAMES[step]}${step === 3 ? '!' : ''}` : '';
  }

  // Navigation/backgrounding clears both timers. A failed/stalled recording must not lock the game.
  function play(ids, minimumMs) {
    return new Promise(resolve => {
      let done = false, elapsed = false, spoken = false;
      let minimumTimer, watchdog;
      const finish = () => {
        if (done) return;
        done = true;
        clearTimeout(minimumTimer);
        clearTimeout(watchdog);
        if (pending === finish) pending = null;
        resolve();
      };
      const ready = () => { if (elapsed && spoken) finish(); };
      pending = finish;
      minimumTimer = setTimeout(() => { elapsed = true; ready(); }, minimumMs);
      watchdog = setTimeout(() => { stopPlayback(); finish(); }, AUDIO_TIMEOUT_MS);
      try {
        Promise.resolve(speak(ids)).catch(() => {}).finally(() => { spoken = true; ready(); });
      } catch {
        spoken = true;
        ready();
      }
    });
  }

  async function advance() {
    if (!allowed() || busy) return;
    if (step === 3) {
      cancel();
      step = 0;
      root.classList.add('is-resetting');
      update();
      // Commit the return without animating backwards through the number sequence.
      $('#number-steps-rabbit-position').getBoundingClientRect();
      root.classList.remove('is-resetting');
      return;
    }
    const token = ++generation;
    busy = true;
    step++;
    root.classList.add('is-hopping');
    update();
    await play([`number_${step}`], HOP_MS);
    if (token !== generation || !allowed()) return;
    busy = false;
    root.classList.remove('is-hopping');
    if (step === 3) root.classList.add('is-celebrating');
    update();
  }

  async function repeat() {
    if (!allowed() || busy) return;
    const token = ++generation;
    busy = true;
    update();
    await play(step ? [`number_${step}`] : ['number_1', 'number_2', 'number_3'], 0);
    if (token !== generation || !allowed()) return;
    busy = false;
    update();
  }

  function start() {
    cancel();
    active = true;
    step = 0;
    root.innerHTML = scene();
    $('#number-steps-advance').addEventListener('click', advance);
    setGameTitle(root, 'Számlépcső');
    update();
    focusGameTitle(root);
  }

  function stop() { active = false; cancel(); }
  document.addEventListener('visibilitychange', () => { if (active && document.hidden) cancel(); });
  window.addEventListener('pagehide', () => { if (active) cancel(); });
  // The shared sound button can model the sequence without moving the rabbit.
  document.addEventListener('narrationstart', event => {
    if (!allowed()) return;
    const number = /^number_([123])$/.exec(event.detail?.id)?.[1];
    if (number) root.querySelector(`[data-stair="${number}"]`)?.classList.add('is-heard');
  });
  document.addEventListener('narrationend', () => root.querySelectorAll('.is-heard').forEach(node => node.classList.remove('is-heard')));
  return { start, stop, repeat };
}

function scene() {
  return `<div class="number-steps-play">
    <button id="number-steps-advance" class="number-steps-scene" type="button" data-effect="none" aria-describedby="number-steps-status">
      <span id="number-steps-prompt" class="number-steps-prompt">Koppints a nyuszira!</span>
      <svg class="number-steps-art" viewBox="0 0 720 480" aria-hidden="true" focusable="false">
        <g class="number-steps-clouds" fill="#fffdf7">
          <path d="M55 113q-20-16 1-27 0-24 24-19 13-20 29-3 27-3 27 23 23 13 2 26z"/>
          <path d="M324 62q-18-16 3-24 0-19 18-17 17-18 29 2 24-1 24 20 16 8 5 19z"/>
        </g>
        <g class="number-steps-sun" transform="translate(170 55)">
          <g stroke="#e5bb62" stroke-width="5" stroke-linecap="round"><path d="M0-37v-9M0 37v9M-37 0h-9M37 0h9M-27-27l-6-6M27-27l6-6M-27 27l-6 6M27 27l6 6"/></g>
          <circle r="27" fill="#f2d280"/><g fill="#705c3d"><circle cx="-8" cy="-2" r="2.5"/><circle cx="8" cy="-2" r="2.5"/></g><path d="M-8 8q8 8 16 0" fill="none" stroke="#705c3d" stroke-width="2.5" stroke-linecap="round"/>
        </g>
        <path fill="#dfe9cd" d="M8 433C90 375 203 401 320 419S592 400 712 431C730 457 649 476 360 476S-10 457 8 433Z"/>
        <path fill="#cdddb7" d="M12 449q170-39 348 0t348-4c-27 25-135 31-348 31S39 468 12 449Z"/>
        <g class="number-steps-stairs">${[1, 2, 3].map(n => {
          const x = 194 + (n - 1) * 160, y = 410 - n * 80;
          return `<g data-stair="${n}" class="number-steps-stair">
            <rect class="number-steps-block" x="${x}" y="${y}" width="144" height="${440-y}" rx="16"/>
            <path class="number-steps-tread" d="M${x+13} ${y+3}h118" stroke-width="7" stroke-linecap="round"/>
            <text x="${x+72}" y="${y+52}" text-anchor="middle">${n}</text>
            <g class="number-steps-dots">${Array.from({length:n}, (_, i) => `<circle cx="${x+72+(i-(n-1)/2)*24}" cy="${y+76}" r="7"/>`).join('')}</g>
          </g>`;
        }).join('')}</g>
        <g fill="none" stroke="#8fa66d" stroke-width="4" stroke-linecap="round"><path d="M27 436v-17m0 10-8-7m8 4 8-12M690 439v-22m0 11-9-9m9 6 7-15"/></g>
        <g id="number-steps-rabbit-position" style="transform:translate(88px,418px)">
          <ellipse class="number-steps-shadow" cy="0" rx="46" ry="8" fill="#4a6542" opacity=".13"/>
          <g class="number-steps-rabbit">
            <g fill="#fff9ec" stroke="#ad957e" stroke-width="2.6" stroke-linejoin="round">
              <ellipse cx="-19" cy="-109" rx="13" ry="34" transform="rotate(-12 -19 -109)"/>
              <ellipse cx="17" cy="-111" rx="13" ry="35" transform="rotate(10 17 -111)"/>
              <circle cx="34" cy="-25" r="13"/>
              <ellipse cy="-30" rx="32" ry="32"/>
              <ellipse cy="-74" rx="37" ry="32"/>
              <ellipse cx="-24" cy="-5" rx="19" ry="9"/><ellipse cx="22" cy="-5" rx="19" ry="9"/>
            </g>
            <g fill="#ecc5b9"><ellipse cx="-19" cy="-111" rx="6" ry="23" transform="rotate(-12 -19 -111)"/><ellipse cx="17" cy="-113" rx="6" ry="24" transform="rotate(10 17 -113)"/><ellipse cx="-24" cy="-66" rx="7" ry="4"/><ellipse cx="24" cy="-66" rx="7" ry="4"/></g>
            <g fill="#554f45"><circle cx="-13" cy="-77" r="3.5"/><circle cx="13" cy="-77" r="3.5"/></g>
            <path fill="#c7897c" d="M-5-68q5-4 10 0l-5 5z"/><path d="M0-63v4m-7-2q7 8 14 0" stroke="#846d5c" stroke-width="2" stroke-linecap="round" fill="none"/>
            <ellipse cy="-29" rx="16" ry="19" fill="#efdfc9"/>
            <path d="M-29-42q9 1 13 10m45-10q-9 1-13 10" stroke="#ad957e" stroke-width="3" fill="none" stroke-linecap="round"/>
          </g>
          <g class="number-steps-joy" fill="#d99083">
            <path d="M-66-90c-13-14-27 6 0 20 27-14 13-34 0-20z"/>
            <path d="M66-103c-10-11-21 5 0 16 21-11 10-27 0-16z"/>
          </g>
        </g>
      </svg>
      <span class="number-steps-action" aria-hidden="true"><svg class="icon"><use id="number-steps-action-icon" href="#i-next"></use></svg></span>
    </button>
    <p id="number-steps-status" class="number-steps-status" role="status" aria-live="polite" aria-atomic="true"></p>
  </div>`;
}
