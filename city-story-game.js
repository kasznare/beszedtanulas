import { createStoryState, getStoryScene, chooseStoryOption, completeStoryActivity, getStoryJournal } from './city-story-engine.js';
import { renderCityStoryArt, renderCityStoryClue, renderCityStoryProp, renderCityStoryPhoto } from './city-story-art.js';
import { relatedTaskMarkup } from './next-task.js';

const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const soundIcon = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9h4l5-4v14l-5-4H4zM17 8a6 6 0 0 1 0 8M20 5a10 10 0 0 1 0 14"/></svg>';

// This closure is the whole story session. Leaving the game pauses it; a new
// page or an explicit restart starts fresh. No story data enters saved profiles.
export function setupCityStoryGame({ effect = () => {}, speak = () => {}, stopPlayback = () => {}, hasVoice = () => false, onHome = () => {} } = {}) {
  const root = document.querySelector('#city-story');
  let state = null, history = [], selected = [], message = '', active = false, listeners = null, generation = 0, speaking = false, renderId = 0;
  const scene = () => getStoryScene(state);
  const playable = () => active && !document.hidden && !root.querySelector('dialog[open]');
  const focus = selector => root.querySelector(selector)?.focus({ preventScroll: true });
  const setStatus = text => { const node = root.querySelector('#city-story-status'); if (node) node.textContent = text; };

  function silence() { generation++; speaking = false; stopPlayback(); updateListen(); }
  function updateListen() {
    const button = root.querySelector('#city-story-listen');
    if (button) { button.setAttribute('aria-pressed', String(speaking)); button.innerHTML = `${soundIcon}<span>${speaking ? 'Megállítom' : 'Hallgatom'}</span>`; }
  }
  async function narrate(ids, force = false) {
    if (!active || document.hidden) return;
    silence();
    const available = ids.filter(entry => hasVoice(typeof entry === 'string' ? entry : entry.id));
    if (!available.length) return;
    const token = generation;
    speaking = true; updateListen();
    try { await speak(available, force); }
    finally { if (token === generation) { speaking = false; updateListen(); } }
  }
  function readScene(force = false) {
    const current = scene();
    const lines = (current.voiceIds || []).map((id, index) => ({ id, cue: { target: `#city-story-p-${index}` } }));
    if(current.activity?.promptVoiceId) lines.push({id:current.activity.promptVoiceId,cue:{target:'#city-story-task-title'}});
    const detail = current.activity?.type === 'inspect' && current.activity.items.find(item=>item.id===selected[0]);
    if(detail?.detailVoiceId) lines.push({id:detail.detailVoiceId,cue:{target:'.city-story-detail'}});
    lines.push(...(current.recapVoiceIds || []));
    return narrate(lines, force);
  }
  function voiceButton(id, label) {
    return id && hasVoice(id) ? `<button class="city-story-sound" data-story-voice="${esc(id)}" aria-label="Hallgasd meg: ${esc(label)}">${soundIcon}</button>` : '';
  }
  function itemArt(item, type) {
    const key = type === 'inspect' && item.id === 'gate' ? 'old-gate' : type === 'inspect' && item.id === 'bench' ? 'old-bench' : item.artKey || item.id;
    if (type === 'props') return renderCityStoryProp(key, `city-prop-${renderId}-${key}`);
    if (type === 'inspect') return renderCityStoryClue(key, `city-clue-${renderId}-${key}`);
    if (type === 'order') return renderCityStoryPhoto(item.id, `city-photo-${renderId}-${item.id}`);
    return `<span class="city-story-layout-icon" aria-hidden="true">${key === 'wall' ? '┏' : key === 'later' ? '◷' : key === 'library' ? '⌂' : '↱'}</span>`;
  }
  function activityMarkup(activity) {
    if (!activity) return '';
    const type = activity.type, cap = type === 'order' ? activity.items.length : activity.maxSelections || 1;
    const order = type === 'order';
    return `<section class="city-story-activity" aria-labelledby="city-story-task-title" data-activity="${esc(type)}">
      <div class="city-story-task-heading"><h3 id="city-story-task-title" tabindex="-1">${esc(activity.prompt)}</h3>${voiceButton(activity.voiceId || activity.promptVoiceId, activity.prompt)}</div>
      ${order ? `<p class="city-story-task-help">Koppints a képekre időrendben! Az első eseménnyel kezdd.</p><ol class="city-story-order-slots" aria-label="Az általad választott sorrend">${Array.from({length:cap}, (_, index) => `<li>${selected[index] ? esc(activity.items.find(item => item.id === selected[index])?.label) : `${index+1}. kép`}</li>`).join('')}</ol>` : type === 'props' ? `<p class="city-story-task-help">Három tárgyat választhatsz. ${selected.length} / 3 kiválasztva.</p>` : ''}
      <div class="city-story-items city-story-items-${esc(type)}">${activity.items.map(item => {
        const index = selected.indexOf(item.id), picked = index >= 0;
        return `<div class="city-story-item-wrap"><button class="city-story-item" data-story-item="${esc(item.id)}" aria-pressed="${picked}"${order ? ` aria-label="${esc(item.label)}${picked ? `. A sorrendben: ${index+1}.` : ' Még nincs a sorrendben.'}"` : ''}><span class="city-story-item-art" aria-hidden="true">${itemArt(item,type)}</span><strong>${esc(item.label)}</strong>${item.detail && type !== 'order' && type !== 'inspect' ? `<small>${esc(item.detail)}</small>` : ''}${picked ? `<span class="city-story-selected" aria-hidden="true">${order ? index+1 : '✓'}</span>` : ''}</button>${voiceButton(item.voiceId,item.label)}</div>`;
      }).join('')}</div>
      ${type === 'inspect' && selected.length ? `<p class="city-story-detail">${esc(activity.items.find(item=>item.id===selected[0])?.detail || 'Nézd meg a részleteket, és válassz nyomozási irányt!')}</p>` : ''}
      <div class="city-story-task-actions"><button id="city-story-check" class="city-story-primary" ${selected.length ? '' : 'disabled'}>${type === 'order' ? 'Nézzük a sorrendet!' : type === 'layout' ? 'Próbáljuk ki a kocsival!' : type === 'props' ? 'Ezeket vigyük!' : 'Megnéztem, indulhatunk!'}</button>${order ? '<button id="city-story-clear">Új sorrendet rakok</button>' : ''}</div>
    </section>`;
  }
  function render({ moveFocus = false } = {}) {
    const current = scene(); renderId++;
    root.dataset.nodeId = current.id; root.dataset.route = state.route || ''; root.dataset.ending = state.ending || current.ending || '';
    const journal = getStoryJournal(state);
    const narrated = current.voiceIds?.some(hasVoice);
    root.innerHTML = `<div class="city-story-shell">
      <header class="city-story-toolbar"><div class="city-story-kicker"><span class="city-story-kicker-dot" aria-hidden="true"></span>${esc(current.chapter || 'Városi nyomozás')}</div><div class="city-story-tools"><button id="city-story-rewind" ${history.length ? '' : 'disabled'} aria-label="Vissza az előző döntéshez">↶ <span>Visszalépek</span></button><button id="city-story-journal" aria-haspopup="dialog" aria-controls="city-story-notebook">▤ <span>Nyomok</span><b>${journal.length}</b></button><button id="city-story-restart" aria-label="A történet újrakezdése">↻</button></div></header>
      <div class="city-story-spread"><div class="city-story-image-column"><figure class="city-story-illustration"><div aria-hidden="true">${renderCityStoryArt(current.art || 'library', { ...state.flags, ...(current.activity?.type === 'layout' && selected.length ? {layoutTest:selected[0]} : {}) }, `city-scene-${renderId}`)}</div><figcaption><span aria-hidden="true">⌖</span> ${esc(current.location)}</figcaption></figure><div class="city-story-session-note">A történetet te alakítod. Nyugodtan gondold át a döntést!</div></div>
      <div class="city-story-reading"><div class="city-story-title-row"><h2 id="city-story-scene-title" tabindex="-1">${esc(current.title)}</h2>${narrated ? `<button id="city-story-listen" class="city-story-listen" aria-pressed="false">${soundIcon}<span>Hallgatom</span></button>` : ''}</div><div class="city-story-prose">${current.paragraphs.map((paragraph,index)=>`<p id="city-story-p-${index}">${esc(paragraph)}</p>`).join('')}</div>
      ${current.recap?.length ? `<div class="city-story-recap"><h3>A te történetedben</h3><ul>${current.recap.map(line=>`<li>${esc(line)}</li>`).join('')}</ul></div>` : ''}
      <div class="city-story-choices">${current.choices.map((choice,index)=>`<div class="city-story-choice-wrap"><button class="city-story-choice" data-story-choice="${esc(choice.id)}"><span class="city-story-choice-number" aria-hidden="true">${index+1}</span><span><strong>${esc(choice.label)}</strong>${choice.hint ? `<small>${esc(choice.hint)}</small>` : ''}</span><span class="city-story-choice-arrow" aria-hidden="true">→</span></button>${voiceButton(choice.voiceId,choice.label)}</div>`).join('')}</div>
      ${current.ending ? `<div class="city-story-ending-actions"><button id="city-story-new-path" class="city-story-primary">Másik nyomon indulok</button><button id="city-story-home">Vissza a mesékhez</button></div>${relatedTaskMarkup('city-story')}` : ''}
      </div></div>${activityMarkup(current.activity)}<p id="city-story-status" class="city-story-status" role="status" aria-live="polite" aria-atomic="true">${esc(message)}</p>
      <dialog id="city-story-notebook" class="city-story-dialog" aria-labelledby="city-story-notebook-title"><div class="city-story-dialog-heading"><div><p>Nyomozófüzet</p><h2 id="city-story-notebook-title">Eddig ezt tudjuk</h2></div><button data-story-close aria-label="Jegyzetfüzet bezárása">×</button></div><div class="city-story-journal-list">${journal.length ? journal.map((clue,index)=>`<article><span aria-hidden="true">${renderCityStoryClue(clue.id === 'inspect:gate' ? 'old-gate' : clue.id === 'inspect:bench' ? 'old-bench' : clue.artKey || clue.id,`city-journal-${renderId}-${index}`)}</span><div><h3>${esc(clue.title || clue.label)}</h3><p>${esc(clue.text || clue.detail)}</p></div></article>`).join('') : '<p>Az első nyomot még meg kell vizsgálnunk. Ami kiderül, itt megtalálod.</p>'}</div><button data-story-close class="city-story-primary">Folytatom a nyomozást</button></dialog>
      <dialog id="city-story-restart-dialog" class="city-story-dialog city-story-confirm" aria-labelledby="city-story-restart-title"><h2 id="city-story-restart-title">Új nyomon indulunk?</h2><p>A mostani kaland az elejéről kezdődik. Más döntésekkel más történetet alakíthatsz.</p><div class="city-story-task-actions"><button id="city-story-confirm-restart" class="city-story-primary">Új történetet kezdek</button><button data-story-close>Folytatom a mostanit</button></div></dialog>
    </div>`;
    if(moveFocus) focus('#city-story-scene-title');
  }
  function advance(next, announce = true) {
    if(next === state) return;
    silence(); history.push(state); state = next; selected = []; message = '';
    render({ moveFocus: true });
    if(scene().ending) effect('success'); else effect('step');
    root.scrollIntoView({ block:'start', behavior:'instant' });
    if(announce) readScene();
  }
  function restart() {
    silence(); state = createStoryState(); history = []; selected = []; message = '';
    render({moveFocus:true}); readScene();
  }
  function selectItem(id) {
    const current = scene(), activity = current.activity;
    if(!activity?.items.some(item=>item.id===id)) return;
    silence(); message = '';
    if(activity.type==='order' || activity.type==='props') {
      if(selected.includes(id)) selected = selected.filter(item=>item!==id);
      else if(selected.length < (activity.maxSelections || activity.items.length)) selected = [...selected,id];
      else { setStatus('Előbb vegyél ki egy kiválasztott tárgyat!'); return; }
    } else selected = [id];
    effect('select'); render(); focus(`[data-story-item="${id}"]`);
    if(activity.type === 'inspect') { const item=activity.items.find(item=>item.id===id); if(item.detailVoiceId) narrate([item.detailVoiceId]); }
  }
  function checkActivity() {
    const activity = scene().activity;
    if(!activity) return;
    const answer = activity.type === 'layout' ? selected[0] : [...selected];
    const result = completeStoryActivity(state,answer);
    if(!result.ok) { message = result.message; effect('retry'); setStatus(message); if(result.messageVoiceId) narrate([result.messageVoiceId]); return; }
    advance(result.state, false); message = result.message; setStatus(message);
    effect('collect'); if(result.messageVoiceId) narrate([result.messageVoiceId]);
  }
  function onClick(event) {
    const button = event.target.closest('button');
    if(!button || !active || document.hidden) return;
    if(button.hasAttribute('data-story-close')) { button.closest('dialog')?.close(); return; }
    if(button.id==='city-story-confirm-restart') { restart(); return; }
    if(!playable()) return;
    if(button.dataset.storyChoice) advance(chooseStoryOption(state,button.dataset.storyChoice));
    else if(button.dataset.storyItem) selectItem(button.dataset.storyItem);
    else if(button.dataset.storyVoice) narrate([button.dataset.storyVoice],true);
    else if(button.id==='city-story-listen') { if(speaking) silence(); else readScene(true); }
    else if(button.id==='city-story-check') checkActivity();
    else if(button.id==='city-story-clear') { silence(); selected=[];message='';render();focus('[data-story-item]'); }
    else if(button.id==='city-story-rewind' && history.length) { silence();state=history.pop();selected=[];message='';render({moveFocus:true});effect('undo'); }
    else if(button.id==='city-story-journal') { silence();root.querySelector('#city-story-notebook').showModal(); }
    else if(button.id==='city-story-restart') { silence();root.querySelector('#city-story-restart-dialog').showModal(); }
    else if(button.id==='city-story-new-path') restart();
    else if(button.id==='city-story-home') onHome();
  }
  function start({announce=true}={}) {
    listeners?.abort(); listeners = new AbortController(); active = true;
    if(!state) state = createStoryState();
    render();
    root.addEventListener('click',onClick,{signal:listeners.signal});
    document.addEventListener('visibilitychange',()=>{if(document.hidden) silence();},{signal:listeners.signal});
    if(announce) readScene();
  }
  function stop() { active=false;silence();listeners?.abort();listeners=null;root.querySelectorAll('dialog[open]').forEach(dialog=>dialog.close()); }
  function repeat() { if(!playable()) return; if(scene().voiceIds?.some(hasVoice)) readScene(true); else { setStatus(scene().activity?.prompt || 'Nézd meg a nyomokat, majd válaszd ki, hogyan folytassuk!'); focus(scene().activity ? '#city-story-task-title' : '#city-story-scene-title'); } }
  return {start,stop,repeat};
}
