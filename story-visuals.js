import { STORY_VISUAL_DURATION, storySceneAt } from './story-visual-data.js';

const clamp = (value, low = 0, high = 1) => Math.max(low, Math.min(high, value));
const progress = (time, start, end) => clamp((time - start) / (end - start));
const smooth = value => { value = clamp(value); return value * value * (3 - 2 * value); };
const mix = (a, b, amount) => a + (b - a) * amount;
let instance = 0;

function artwork(prefix) {
  const paint = name => `url(#${prefix}-${name})`;
  const defs = `<defs>
    <linearGradient id="${prefix}-sky" x2="0" y2="1"><stop stop-color="#b9dcd9"/><stop offset="1" stop-color="#f3edcd"/></linearGradient>
    <linearGradient id="${prefix}-grass" x2="0" y2="1"><stop stop-color="#bccc91"/><stop offset="1" stop-color="#90ad74"/></linearGradient>
    <linearGradient id="${prefix}-road" x2="0" y2="1"><stop stop-color="#eadbbd"/><stop offset="1" stop-color="#d5bd93"/></linearGradient>
    <linearGradient id="${prefix}-blue" x2="0" y2="1"><stop stop-color="#739ec1"/><stop offset=".6" stop-color="#4c7da6"/><stop offset="1" stop-color="#386383"/></linearGradient>
    <linearGradient id="${prefix}-red" x2="0" y2="1"><stop stop-color="#e68d72"/><stop offset=".55" stop-color="#cd6153"/><stop offset="1" stop-color="#a74740"/></linearGradient>
    <linearGradient id="${prefix}-yellow" x2="0" y2="1"><stop stop-color="#f5d37b"/><stop offset=".65" stop-color="#dfae4f"/><stop offset="1" stop-color="#ba833b"/></linearGradient>
    <linearGradient id="${prefix}-white" x2="0" y2="1"><stop stop-color="#fffdf2"/><stop offset="1" stop-color="#dfdfcc"/></linearGradient>
    <linearGradient id="${prefix}-glass" x2="1" y2="1"><stop stop-color="#d8ebe4"/><stop offset="1" stop-color="#9abeb9"/></linearGradient>
    <radialGradient id="${prefix}-fur" cx="35%" cy="25%" r="85%"><stop stop-color="#ce9b63"/><stop offset="1" stop-color="#aa7346"/></radialGradient>
    <radialGradient id="${prefix}-sun"><stop stop-color="#fff4bd"/><stop offset="1" stop-color="#efcb7c"/></radialGradient>
  </defs>`;

  function head(kind = 'bear', helmet = '') {
    const fox = kind === 'fox', rabbit = kind === 'rabbit';
    return `<g class="sv-head">
      ${rabbit ? '<path d="M-23-22q-18-61 0-59 15 5 11 55M7-27q0-63 17-58 16 9 0 63" fill="#eee1c2" stroke="#9c8b70" stroke-width="2.5"/><path d="M-22-34q-10-41-2-39m36 37q5-42 11-40" fill="none" stroke="#e1b6a1" stroke-width="6"/>' : fox ? '<path d="m-32-7 3-37 26 17M10-23l29-22-1 43" fill="#d3874c" stroke="#98603d" stroke-width="2.5"/><path d="m-23-24 2-10 12 12m24-1 13-12-2 14" fill="#f7d0aa"/>' : '<circle cx="-27" cy="-26" r="15" fill="#b17a4b" stroke="#805637" stroke-width="2.5"/><circle cx="27" cy="-26" r="15" fill="#b17a4b" stroke="#805637" stroke-width="2.5"/><circle cx="-27" cy="-26" r="8" fill="#dfb282"/><circle cx="27" cy="-26" r="8" fill="#dfb282"/>'}
      ${fox ? '<path d="M-35-8Q-28-37 0-31q34 1 39 27l-11 24-26 12-26-11Z" fill="#dc9155" stroke="#98603d" stroke-width="2.5"/><path d="m-32-5 29 11 40-8-12 22-24 10-22-12Z" fill="#fff0d3"/>' : `<ellipse rx="35" ry="34" fill="${rabbit ? '#f4e8ce' : paint('fur')}" stroke="${rabbit ? '#9c8b70' : '#805637'}" stroke-width="2.5"/><ellipse cx="8" cy="12" rx="22" ry="17" fill="${rabbit ? '#fff7e4' : '#ebc599'}"/>`}
      <g class="sv-eyes"><ellipse cx="-12" cy="-4" rx="3.8" ry="4.8" fill="#40392f"/><ellipse cx="14" cy="-5" rx="3.8" ry="4.8" fill="#40392f"/><circle cx="-13" cy="-5.5" r="1.15" fill="#fff"/><circle cx="13" cy="-6.5" r="1.15" fill="#fff"/></g>
      <path d="M3 7q6-5 12-1-1 8-7 8-6-1-5-7Z" fill="#5b4233"/><path d="M8 13v6q-5 7-12 0m12 0q8 5 13-2" fill="none" stroke="#75503a" stroke-width="1.8" stroke-linecap="round"/>
      <ellipse cx="-24" cy="10" rx="6" ry="3" fill="#db9a7d" opacity=".45"/>
      ${helmet ? `<path d="M-37-20q2-32 36-31 34 0 38 31Z" fill="${helmet}" stroke="#946742" stroke-width="2.5"/><path d="M-43-18h87" stroke="${helmet}" stroke-width="9" stroke-linecap="round"/><path d="M-4-48v24" stroke="#fff4d8" stroke-width="5"/>` : ''}
    </g>`;
  }
  function standing(kind = 'bear', uniform = '', helmet = '') {
    const fur = kind === 'fox' ? '#d88e50' : kind === 'rabbit' ? '#eee0bd' : '#bb8651';
    return `<g class="sv-person">
      <ellipse cy="7" rx="43" ry="8" fill="#59604a" opacity=".15"/>
      <g class="sv-body"><path d="M-25-38-29-6M24-37 28-6" stroke="${uniform ? '#786749' : fur}" stroke-width="19" stroke-linecap="round"/><ellipse cx="-31" cy="-4" rx="17" ry="8" fill="${uniform ? '#675b47' : fur}"/><ellipse cx="31" cy="-4" rx="17" ry="8" fill="${uniform ? '#675b47' : fur}"/>
      <path d="M-26-107Q0-120 26-107l13 66q-37 19-78 0Z" fill="${uniform || fur}" stroke="#8b6744" stroke-width="2.5"/>
      ${uniform ? '<path d="M-29-58h60M0-104v65" stroke="#fff1c2" stroke-width="6"/><rect x="8" y="-84" width="12" height="13" rx="2" fill="#fff5d8"/>' : '<ellipse cy="-63" rx="23" ry="24" fill="#dcaf79" opacity=".65"/>'}
      <g class="sv-arm-left"><path d="M-27-96q-17 17-14 39" fill="none" stroke="${uniform || fur}" stroke-width="16" stroke-linecap="round"/><circle cx="-41" cy="-55" r="9" fill="${fur}"/></g>
      <g class="sv-arm-right"><path d="M28-96q21 17 17 38" fill="none" stroke="${uniform || fur}" stroke-width="16" stroke-linecap="round"/><circle cx="45" cy="-55" r="9" fill="${fur}"/></g>
      <g transform="translate(0 -129)">${head(kind, helmet)}</g></g>
      ${kind === 'fox' ? '<path d="M-16-95q17 6 33 0l-3 12h-26Z" fill="#698ba1"/><path class="sv-scarf" d="M14-89q21 10 28-5l-5 23q-22-1-31-12Z" fill="#698ba1"/>' : ''}
    </g>`;
  }
  function wheel(x, y = 125, radius = 26) {
    return `<g transform="translate(${x} ${y})"><circle r="${radius}" fill="#454941" stroke="#333c37" stroke-width="3"/><circle r="${radius - 6}" fill="#737971"/><g class="sv-wheel"><circle r="${radius - 11}" fill="#e9e6d6"/><path d="M-12 0h24M0-12v24m-8-8 16 16m-16 0 16-16" stroke="#a5ada5" stroke-width="2.5"/><circle r="5" fill="#c9d2c8" stroke="#7c8982" stroke-width="2"/></g></g>`;
  }
  function car(police = true) {
    return `<g class="sv-car">
      <ellipse cx="130" cy="155" rx="133" ry="12" fill="#49513f" opacity=".17"/>
      <path d="M38 69V49q0-13 17-13h43v42Z" fill="#77908b" stroke="#59706c" stroke-width="3"/>
      <g class="sv-driver" transform="translate(111 36)"><path d="M-24 24q25-11 51 0l9 27h-63Z" fill="${police ? '#b88756' : '#ce864b'}"/>${head(police ? 'bear' : 'fox')}<path d="M-13 32q18 10 41 0" fill="none" stroke="${police ? '#bd8d5e' : '#de985a'}" stroke-width="13" stroke-linecap="round"/>${police ? '' : '<path class="sv-scarf" d="M-23 23q22 8 43 0l-4 10h-35l-20 10-2-10Z" fill="#6c99b2"/>'}</g>
      <path d="m147 26 17 38" stroke="#5a7777" stroke-width="5" stroke-linecap="round"/><path d="m150 26 15 0 14 37h-15Z" fill="${paint('glass')}" stroke="#7e9b94" stroke-width="2"/><path d="m151 32 13 21" stroke="#fffdf4" stroke-width="3" opacity=".8"/>
      <path d="M11 81q3-20 24-20h118q17 0 31 11l48 5q20 3 22 23v25H3v-26q0-13 8-18Z" fill="${paint(police ? 'blue' : 'red')}" stroke="${police ? '#395e77' : '#974e41'}" stroke-width="3"/>
      <path d="M17 70h133q18 0 31 12l51 3q12 1 15 14H12V82Z" fill="${police ? paint('white') : '#efac8c'}"/>
      <path d="M71 73v37q0 7 7 7h68q9 0 9-10V75" fill="none" stroke="${police ? '#5f8399' : '#aa594c'}" stroke-width="2"/><path d="M85 84h17" stroke="#687c79" stroke-width="3" stroke-linecap="round"/>
      ${police ? '<path d="m117 91 4 7 8 1-6 6 1 8-7-4-7 4 1-8-6-6 8-1Z" fill="#d7b367" stroke="#b68c42" stroke-width="1.2"/><g class="sv-beacon"><ellipse cx="181" cy="64" rx="23" ry="19" fill="#91cee1" opacity="0" class="sv-glow"/><path d="M169 76V62q0-14 12-14 12 0 12 14v14Z" fill="#669ac2" stroke="#4c7393" stroke-width="2"/><path d="M174 59v8" stroke="#d6edf0" stroke-width="3" stroke-linecap="round"/><path d="M166 78h31" stroke="#efe9d9" stroke-width="4" stroke-linecap="round"/></g>' : '<path d="M194 93h36" stroke="#f7d6b3" stroke-width="3" stroke-linecap="round"/><path d="M8 74h34" stroke="#e7b28b" stroke-width="4" stroke-linecap="round"/>'}
      <ellipse cx="248" cy="101" rx="5" ry="11" fill="#ffe8a2" stroke="#aa9870" stroke-width="2"/><rect x="2" y="97" width="6" height="15" rx="2" fill="#d7745a"/><path d="M239 122h18M5 124h24" stroke="#e2ded0" stroke-width="7" stroke-linecap="round"/>
      ${wheel(54)}${wheel(207)}
    </g>`;
  }
  function girl(watering = false) {
    return `<g class="sv-girl"><ellipse cx="41" cy="204" rx="49" ry="7" fill="#49513f" opacity=".13"/><path d="M22 151v42m38-42v42" stroke="#e5b59a" stroke-width="13" stroke-linecap="round"/><path d="M9 193q16-6 25 0v10H7Zm38 0q16-6 26 0v10H46Z" fill="#ad5d4f" stroke="#884f41" stroke-width="2"/><path d="M19 71h40l26 86q-39 17-85 0Z" fill="#cd7863" stroke="#a65d4d" stroke-width="2.5"/><path d="M17 73q24 12 44 0M7 143q32 10 69 0" fill="none" stroke="#f7dfbd" stroke-width="4"/><path d="M23 85h35v23H23Z" fill="#e0a18a"/><path d="M29 89v10m9-10v10m9-10v10" stroke="#efc1a4" stroke-width="2"/>
      <g class="sv-girl-left"><path d="M18 78-1 112l-18-5" fill="none" stroke="#e5b59a" stroke-width="12" stroke-linecap="round"/></g><g class="sv-girl-right"><path d="M61 78 80 104l22-1" fill="none" stroke="#e5b59a" stroke-width="12" stroke-linecap="round"/>
      ${watering ? '<path d="M95 107q-1-25 19-19 13 5 12 20" fill="none" stroke="#638a86" stroke-width="5"/><path d="M90 107h42v31q-20 9-42 0Z" fill="#8eb4ab" stroke="#5e827c" stroke-width="2.5"/><path d="m127 115 21 3 9-11 7 6-14 19-22-6" fill="#8eb4ab" stroke="#5e827c" stroke-width="2.5"/><ellipse cx="164" cy="112" rx="7" ry="5" transform="rotate(-40 164 112)" fill="#688f89"/><path d="M96 111v20" stroke="#c7dad0" stroke-width="3"/>' : '<circle cx="103" cy="103" r="7" fill="#e5b59a"/>'}</g>
      <g class="sv-girl-head" transform="translate(42 41)"><path d="M-34 2q-7-44 31-44 38-4 39 42l-5 21h-9l-47-1Z" fill="#916b48" stroke="#74553b" stroke-width="2.5"/><ellipse rx="29" ry="31" fill="#efc8a9" stroke="#bc9476" stroke-width="1.5"/><path d="M-31-8q-4-35 28-35 35-2 37 32l-12-3q-19-1-27-17-6 17-26 23Z" fill="#9c7752"/><path d="M-28-17q3-14 16-17" stroke="#b8966c" stroke-width="3" fill="none" stroke-linecap="round"/><circle cx="24" cy="-39" r="14" fill="#9c7752" stroke="#74553b" stroke-width="2"/><path d="m19-48 11 9-10 9-7-8Z" fill="#cf7c69"/><g class="sv-eyes"><ellipse cx="-10" cy="1" rx="3" ry="4" fill="#514338"/><ellipse cx="12" cy="1" rx="3" ry="4" fill="#514338"/></g><path d="M-7 16q8 8 16-1" fill="none" stroke="#a87258" stroke-width="2" stroke-linecap="round"/><ellipse cx="-20" cy="12" rx="6" ry="3" fill="#e7a993"/><ellipse cx="21" cy="12" rx="6" ry="3" fill="#e7a993"/></g></g>`;
  }
  function excavator() {
    return `<g><ellipse cx="123" cy="15" rx="146" ry="15" fill="#49513f" opacity=".16"/><rect x="-5" y="-39" width="252" height="48" rx="24" fill="#5c6357" stroke="#414c42" stroke-width="3"/><rect x="5" y="-32" width="232" height="33" rx="17" fill="#788071"/>
      ${[22,65,108,151,194,225].map(x => `<g class="sv-track-wheel" transform="translate(${x} -15)"><circle r="12" fill="#b5b7a0" stroke="#50594c" stroke-width="3"/><circle r="4" fill="#727d6a"/></g>`).join('')}${Array.from({length:14},(_,i)=>`<path d="M${5+i*17} 4v-8" stroke="#454f42" stroke-width="3"/>`).join('')}
      <path d="M6-73h174l47 30H6Z" fill="${paint('yellow')}" stroke="#9e7a3e" stroke-width="3"/><path d="M20-66h102" stroke="#ffe6a3" stroke-width="4"/><rect x="28" y="-179" width="104" height="110" rx="15" fill="${paint('yellow')}" stroke="#9e7a3e" stroke-width="3"/><path d="M39-167h81v68H39Z" fill="${paint('glass')}" stroke="#8e9b7e" stroke-width="2"/><g transform="translate(80 -121) scale(.64)">${head('bear','#e1b657')}</g><path d="M39-163h81m-74 63h68" stroke="#e9d5a1" stroke-width="6"/><path d="M37-90h87" stroke="#8e753f" stroke-width="3"/><path d="M41-156 60-131" stroke="#fff8e3" stroke-width="3" opacity=".75"/><rect x="135" y="-100" width="51" height="26" rx="7" fill="#d6a04a"/><path d="M150-94v12m9-12v12m9-12v12" stroke="#a77938" stroke-width="3"/>
      <g data-part="boom" transform="translate(155 -114)"><path d="M-7-13h181l30 13-30 13H-7Z" fill="${paint('yellow')}" stroke="#a47c3e" stroke-width="3"/><path d="M21-8h151" stroke="#ffe7a5" stroke-width="4"/><path d="M8 27h97" stroke="#6d796f" stroke-width="9"/><path d="M96 27h79" stroke="#ccd3c6" stroke-width="5"/><circle r="11" fill="#e7c36f" stroke="#9b793e" stroke-width="3"/><g data-part="stick" transform="translate(200 0)"><path d="M-5-11h142l19 11-19 11H-5Z" fill="${paint('yellow')}" stroke="#a47c3e" stroke-width="3"/><path d="M10-6h124" stroke="#ffe7a5" stroke-width="4"/><path d="M10 19h75" stroke="#6d796f" stroke-width="7"/><path d="M76 19h61" stroke="#ccd3c6" stroke-width="4"/><circle r="10" fill="#efd183" stroke="#9b793e" stroke-width="3"/><g data-part="bucket" transform="translate(155 0)"><path d="M-12-7q45-1 57 40l-5 32-46-7-9-24Z" fill="#a48755" stroke="#756846" stroke-width="3"/><path d="m-6 57-8 15 12-7 5 13 10-13 8 14 8-15 10 9 2-13" fill="#d4b774" stroke="#756846" stroke-width="2"/><path d="M0 12q25 6 30 33" fill="none" stroke="#cfb278" stroke-width="4"/></g></g></g></g>`;
  }
  function serviceTruck(ambulance = false) {
    return `<g><ellipse cx="160" cy="18" rx="171" ry="12" fill="#49513f" opacity=".16"/><path d="M6-126q0-18 18-18h189l56 46h32q21 1 23 22V-4H6Z" fill="${paint(ambulance ? 'white' : 'red')}" stroke="${ambulance ? '#8d9a89' : '#9b5145'}" stroke-width="3"/><path d="M222-130 261-99v43h-44v-74Z" fill="${paint('glass')}" stroke="#779187" stroke-width="2.5"/><g transform="translate(239 -88) scale(.57)">${head('bear',ambulance ? '#f4efdc' : '#c65e4b')}</g><path d="M220-127 234-114" stroke="#fff8e4" stroke-width="3"/><path d="M210-138v111h83" fill="none" stroke="${ambulance ? '#adb5a3' : '#aa5747'}" stroke-width="2"/><path d="M234-42h17" stroke="#657b71" stroke-width="3" stroke-linecap="round"/>
      ${ambulance ? '<path d="M8-41h198" stroke="#88a99a" stroke-width="15"/><rect x="48" y="-115" width="78" height="52" rx="10" fill="#cee2d9" stroke="#a0b7a6" stroke-width="2"/><g class="sv-patient" transform="translate(86 -86) scale(.54)"><g class="sv-patient-head">'+head('fox')+'</g><path class="sv-patient-wave" d="M20 25q21-5 16-23" fill="none" stroke="#d88e50" stroke-width="14" stroke-linecap="round"/></g><path d="M153-112h20v14h14v20h-14v14h-20v-14h-14v-20h14Z" fill="#76a08e"/><g class="sv-ambulance-door"><path d="M10-130h22v95H10Z" fill="#f3f0df" stroke="#9faf9b" stroke-width="2"/><path d="M17-110v20" stroke="#b3cfbe" stroke-width="8"/></g>' : `<g stroke="#f0d3a1" stroke-width="4"><path d="M13-160h195m-195 15h195"/>${[28,49,70,91,112,133,154,175,196].map(x=>`<path d="M${x}-160v15"/>`).join('')}</g><rect x="42" y="-116" width="142" height="77" rx="7" fill="#d6d4bb" stroke="#aa6752" stroke-width="3"/><path d="M53-104h121m-121 14h121m-121 14h121" stroke="#f5ead1" stroke-width="4"/><circle cx="75" cy="-62" r="27" fill="#638f89" stroke="#476e67" stroke-width="3"/><circle cx="75" cy="-62" r="13" fill="#c0d0b5"/><path d="M66-71 84-53m-18 0 18-18" stroke="#6e9588" stroke-width="4"/><path d="M128-49h38" stroke="#9b9c84" stroke-width="5"/>`}
      <g class="sv-beacon"><ellipse cx="240" cy="-143" rx="29" ry="23" fill="#b4d7da" opacity="0" class="sv-glow"/><path d="M224-136v-12q0-10 16-10t16 10v12Z" fill="#729db7" stroke="#597c90" stroke-width="2"/><path d="M220-134h40" stroke="#f6e8cb" stroke-width="5"/></g><rect x="311" y="-62" width="9" height="19" rx="4" fill="#f7dda0"/><path d="M296-12h30M1-13h28" stroke="#dddccb" stroke-width="8" stroke-linecap="round"/>${wheel(61,-7,29)}${wheel(265,-7,29)}</g>`;
  }
  function crane() {
    return `<g><ellipse cx="141" cy="18" rx="173" ry="12" fill="#49513f" opacity=".17"/><path d="M5-68h201l23-64h61l35 45v80H5Z" fill="${paint('yellow')}" stroke="#9c793f" stroke-width="3"/><path d="M235-121h47l28 35h-75Z" fill="${paint('glass')}" stroke="#788f7e" stroke-width="2.5"/><path d="M242-116 259-101" stroke="#fff7df" stroke-width="3"/><path d="M27-30h129" stroke="#ad8644" stroke-width="7"/><path d="M27-34v13m28-13v13m28-13v13m28-13v13m28-13v13" stroke="#f4d787" stroke-width="6"/><path d="M30-13 5 8m178-21 25 21" stroke="#797c64" stroke-width="10" stroke-linecap="round"/><path d="M-5 9h28m176 0h29" stroke="#c4bfa0" stroke-width="9" stroke-linecap="round"/>
      <g data-part="crane-boom" transform="translate(158 -76)"><path d="M-14-20h360v40H-14Z" fill="${paint('yellow')}" stroke="#9c793f" stroke-width="3"/><path d="M25-12h284" stroke="#f6dea0" stroke-width="4"/><path d="M335-14h167v28H335Z" fill="#ead7a0" stroke="#9c793f" stroke-width="3"/><path d="M356-6h134" stroke="#fff0c4" stroke-width="3"/><circle r="21" fill="#b89758" stroke="#806841" stroke-width="4"/><circle r="9" fill="#e5c77b"/><path d="M20 27h177" stroke="#768174" stroke-width="13"/><path d="M189 27h108" stroke="#cbd2c2" stroke-width="7"/></g>${wheel(55,-7,27)}${wheel(269,-7,27)}</g>`;
  }
  function plant(x,y,index,flower = false) {
    return `<g transform="translate(${x} ${y})"><g class="sv-plant" data-seed="${index}"><path d="M0 0q-2-18 2-36" stroke="#698657" stroke-width="3" fill="none"/><path d="M0-11q-17 0-17-12 14 1 17 12m1-8q17 0 18-12-15 2-18 12" fill="#83a268"/>${flower ? `<g transform="translate(2 -36)">${Array.from({length:5},(_,i)=>`<ellipse cy="-8" rx="5" ry="9" transform="rotate(${i*72})" fill="${index%3===0?'#e3a18b':index%3===1?'#f5d184':'#ead5b1'}"/>`).join('')}<circle r="5" fill="#bb8e51"/><circle cx="-1" cy="-1" r="1.4" fill="#fbe8b5"/></g>` : '<path d="M0 0q-13-14-12-29M1 0q9-17 11-26" stroke="#86a96e" stroke-width="3" fill="none"/>'}</g></g>`;
  }
  function tree(x,y,scale,index) {
    return `<g transform="translate(${x} ${y}) scale(${scale})"><path d="M0 0q-9-112 6-198M1-103l-49-55m49 23 48-45" stroke="#967653" stroke-width="20" stroke-linecap="round" fill="none"/><path d="M-4-6q-4-83 3-117" stroke="#ba9770" stroke-width="5" fill="none"/><g class="sv-tree" data-seed="${index}"><path d="M-99-167q-28-38 5-63-5-40 37-47 21-43 57-24 34-20 59 10 49-6 56 42 36 35 7 66-8 40-57 32-23 29-60 11-51 17-65-27-40 13-39-22Z" fill="#8daa74"/><path d="M-91-217q12-28 45-26 4-42 47-43 42 2 45 27 41-2 56 29-26 15-57 3-46 18-78 0-31 13-58 10Z" fill="#a8bf85"/><path d="M-78-166q35-5 47-27 40 33 89 8 35 8 62-4-5 39-54 33-25 29-61 14-50 14-65-23Z" fill="#799860"/>${[-62,-22,28,66].map((a,i)=>`<path d="M${a}-211q17-12 26 3-17 13-26-3Z" fill="#bfd298" opacity=".8" transform="rotate(${i*13} ${a} -211)"/>`).join('')}</g></g>`;
  }
  function house(x,y,scale=1) {
    return `<g transform="translate(${x} ${y}) scale(${scale})"><path d="M0 0h222v156H0Z" fill="#f1dfb4" stroke="#b59a72" stroke-width="3"/><path d="M-18 3 109-94 243 3Z" fill="#bf7a5b" stroke="#9f684f" stroke-width="3"/><path d="M26-13 109-73l87 60m-154-3h131m-109-19h87" fill="none" stroke="#d89570" stroke-width="4" stroke-linecap="round"/><path d="M173-50v-49h25v67" fill="#cb9471" stroke="#9f684f" stroke-width="3"/><path d="M15 29h59v119H15Z" fill="#7ea3a1" stroke="#698984" stroke-width="3"/><path d="M25 40h39v39H25Z" fill="#cce4dc"/><circle cx="63" cy="106" r="3" fill="#ead6a0"/><rect x="112" y="25" width="73" height="67" rx="3" fill="#d9e9dc" stroke="#a79972" stroke-width="4"/><g class="sv-curtain"><path d="M115 28h19l-6 57h-12Zm67 0h-19l6 57h13Z" fill="#efe5bc"/></g><path d="M149 28v61m-33-29h65" stroke="#a79972" stroke-width="3"/><path d="M101 98h95" stroke="#b19268" stroke-width="6" stroke-linecap="round"/><path d="M2 148h218" stroke="#dac497" stroke-width="12"/><path d="M9 136h68" stroke="#c4ab7f" stroke-width="8"/><path d="M-24 155h281" stroke="#9d9d70" stroke-width="9" stroke-linecap="round"/></g>`;
  }
  function background(garden,ending=false) {
    return `<rect width="1280" height="720" fill="${paint('sky')}"/>${ending?'<rect width="1280" height="720" fill="#ffd6a0" opacity=".12"/>':''}
      <g transform="translate(1070 105)"><g class="sv-sun-rays">${Array.from({length:12},(_,i)=>`<path d="M0-69v-13" transform="rotate(${i*30})" stroke="#efd297" stroke-width="5" stroke-linecap="round"/>`).join('')}</g><circle r="46" fill="${paint('sun')}"/><path d="M-26-14q8-18 23-19" stroke="#fff6c7" stroke-width="5" stroke-linecap="round" fill="none"/></g>
      ${[[184,104,.8],[549,74,1],[834,170,.6]].map(([x,y,s],i)=>`<g transform="translate(${x} ${y}) scale(${s})"><g class="sv-cloud" data-seed="${i}"><path d="M-74 14q-15-29 16-42-1-35 35-33 20-39 49-6 35-9 42 26 42-4 45 30Z" fill="#fff8e4"/><path d="M-65 15H98" stroke="#e4e6cd" stroke-width="9" stroke-linecap="round" opacity=".5"/></g></g>`).join('')}
      <path d="M0 370Q151 241 352 356 553 217 792 332q272-155 488-28v416H0Z" fill="#bdcda5"/><path d="M0 425q208-146 442-31 230-116 450-29 217-88 388 25v330H0Z" fill="${paint('grass')}"/>
      ${garden ? `${house(-10,285,1.25)}${tree(1153,465,1.02,2)}${tree(892,381,.62,3)}<g stroke="#dfe3c1" stroke-width="8"><path d="M724 404h406m-406 35h406"/>${[735,781,827,873,919,965,1011,1057,1103].map(x=>`<path d="M${x} 378v87"/>`).join('')}</g><g transform="translate(709 403)"><g class="sv-gate"><path d="M-5-20h-91v84H-5Z" fill="#e5e3c4" stroke="#b6bb98" stroke-width="2"/><path d="M-77-9v64m25-64v64m25-64v64" stroke="#bac29f" stroke-width="7"/><circle cx="-75" cy="29" r="3" fill="#87987b"/></g></g>` : `${house(316,326,.45)}${house(512,338,.38)}${tree(85,453,1.06,0)}${tree(1178,434,.92,1)}<g stroke="#b6a478" stroke-width="6"><path d="M943 382h337m-337 33h337"/>${[963,1021,1079,1137,1195,1253].map(x=>`<path d="M${x} 358v81"/>`).join('')}</g>`}
      <path d="M0 513q260-41 504-15 375-35 776-28v250H0Z" fill="${paint('road')}"/><path d="M0 630q333-63 668-22 322 40 612-18" fill="none" stroke="#f3e3c2" stroke-width="39" opacity=".6"/>
      ${garden ? '<path d="M0 491q252-58 398-8l42 94q-236-14-440 36Z" fill="#afba83"/>' : '<path d="M773 603q85-56 219-30l31 54q-123 38-250-24Z" fill="#8b956b"/><path d="M800 603q80-28 174-8" stroke="#7f825d" stroke-width="10" fill="none" stroke-linecap="round"/>'}
      ${Array.from({length:12},(_,i)=>`<ellipse cx="${36+i*109}" cy="${650+Math.sin(i*3)*20}" rx="${4+i%3*3}" ry="2" fill="#bca782" opacity=".6"/>`).join('')}
      ${Array.from({length:20},(_,i)=>plant(18+i*66,705-Math.sin(i*1.9)*10,i,true)).join('')}${Array.from({length:garden?17:12},(_,i)=>plant(garden?19+i*25:950+i*25,garden?528+Math.sin(i)*10:459+Math.sin(i)*10,i+20,true)).join('')}
      <g transform="translate(1117 488)"><path d="M0 0v86" stroke="#a78d60" stroke-width="5"/><g class="sv-pinwheel">${['#d68b73','#e2c173','#80a7a0','#b2c18c'].map((c,i)=>`<path d="M0 0-9-37q22-6 29 8Z" transform="rotate(${i*90})" fill="${c}" stroke="#f3e0b8" stroke-width="1"/>`).join('')}<circle r="6" fill="#f8e2ae"/></g></g>
      ${[[406,148],[739,206]].map(([x,y],i)=>`<g class="sv-bird" data-x="${x}" data-y="${y}" data-seed="${i}"><ellipse rx="9" ry="4" fill="#68847e"/><g class="sv-bird-wings"><path d="M-2 0q-14-17-28-6m30 6q15-17 28-6" fill="none" stroke="#68847e" stroke-width="4" stroke-linecap="round"/></g><path d="m8 0 6 1-6 2" fill="#c79b61"/></g>`).join('')}
      ${[0,1].map(i=>`<g class="sv-butterfly" data-seed="${i}"><g class="sv-butterfly-wings"><path d="M0 0q-25-23-25-2 0 18 23 8-19 19-7 22 14 2 9-19 5 22 18 16 6-7-15-19 28 5 26-13-3-17-29 7Z" fill="${i?'#d6a477':'#d9bd79'}" stroke="#bc9470" stroke-width="1.3"/></g><path d="M0-7v22m0-22-4-6m4 6 4-6" stroke="#8b7659" stroke-width="2" fill="none"/></g>`).join('')}`;
  }
  const wrap = (name, content) => `<g data-actor="${name}">${content}</g>`;
  function frame(scene) {
    const garden = ['garden','together'].includes(scene.id), group = ['team','annipanni','finish','together'].includes(scene.id);
    let actors = wrap('police',car(true));
    if (!garden || scene.id==='together') actors += wrap('race',car(false));
    if (['bend','excavator','dig','fire-arrival','water','ambulance'].includes(scene.id)) actors += wrap('fox',standing('fox'));
    if (['excavator','dig'].includes(scene.id)||group) actors += wrap('excavator',excavator());
    if (['fire-arrival','water'].includes(scene.id)||group) actors += wrap('firetruck',serviceTruck());
    if (['fire-arrival','water'].includes(scene.id)) actors += wrap('firefighter',standing('rabbit','#e1b866','#ca7055'));
    if (['ambulance','thanks'].includes(scene.id)||group) actors += wrap('ambulance',serviceTruck(true));
    if (scene.id==='ambulance') actors += wrap('medic',standing('rabbit','#f3ecd4','#f4efdc'))+wrap('stretcher','<ellipse cx="20" cy="20" rx="106" ry="9" fill="#535b49" opacity=".13"/><path d="M-76 6h167m-142-9-9 18M63-3l11 18" stroke="#8b9a8b" stroke-width="6" stroke-linecap="round"/><circle cx="-60" cy="20" r="7" fill="#5e6a5e"/><circle cx="76" cy="20" r="7" fill="#5e6a5e"/><path d="M-78-14H95v15H-78Z" fill="#cbd6b6" stroke="#879d81" stroke-width="3"/><g transform="translate(-43 -43) rotate(-16) scale(.63)">'+head('fox')+'</g><path d="M-25-30q56-17 112 5v10H-25Z" fill="#8daaa2" stroke="#729184" stroke-width="2"/><path d="M56-30v15" stroke="#fff5e0" stroke-width="13"/>');
    if (scene.id==='crane'||group) actors += wrap('crane',crane());
    if (garden || group) actors += wrap('girl',girl(scene.id==='garden'));
    if (group) actors += wrap('bear',standing());
    const effects = `<g data-effect="smoke">${Array.from({length:7},(_,i)=>`<ellipse data-smoke="${i}" rx="${13+i*2}" ry="${11+i*2}" fill="#afada0"/>`).join('')}</g><g data-effect="flames">${[0,1,2].map(i=>`<g transform="translate(${902+i*25} 535)"><path class="sv-flame" data-seed="${i}" d="M-21 0q-23-32 1-49-2 19 12 15 16-31 13-55 43 49 20 70-10 17-46 19Z" fill="#de9470"/><path d="M-8-1q-16-26 5-46 1 22 16 20 10 16-1 23Z" fill="#f1c781"/></g>`).join('')}</g><path data-effect="hose" d="M272 526Q289 631 426 568q56-13 113-71" stroke="#6f968b" stroke-width="12" fill="none" stroke-linecap="round"/><path data-effect="jet" d="M561 484Q716 403 919 516" stroke="#c2e5e0" stroke-width="12" fill="none" stroke-linecap="round"/><g data-effect="water">${Array.from({length:16},(_,i)=>`<ellipse data-water="${i}" rx="4" ry="7" fill="#a3d3d2"/>`).join('')}</g><g data-effect="garden-water">${Array.from({length:12},(_,i)=>`<ellipse data-garden-water="${i}" rx="2.5" ry="5" fill="#9ccbcc"/>`).join('')}</g><g data-effect="dust">${Array.from({length:7},(_,i)=>`<ellipse data-dust="${i}" rx="${16+i*4}" ry="${10+i*2}" fill="#e8d7b2"/>`).join('')}</g><g data-effect="soil">${Array.from({length:8},(_,i)=>`<ellipse data-soil="${i}" rx="${4+i%3}" ry="3" fill="#a28b64"/>`).join('')}</g><path data-effect="cable" fill="none" stroke="#7b8271" stroke-width="4"/><path data-effect="sling" fill="none" stroke="#a9a17a" stroke-width="4"/><path data-effect="hook" fill="none" stroke="#657767" stroke-width="8" stroke-linecap="round"/>`;
    return `<svg viewBox="0 0 1280 720" preserveAspectRatio="xMidYMid meet" aria-hidden="true" xmlns="http://www.w3.org/2000/svg">${defs}${background(garden,scene.id==='together')}${actors}${effects}</svg>`;
  }
  return {frame};
}

/** Every pose is a function of the recording's time, so pausing and seeking stay exact. */
export function createStoryVisual(host, { readTime = () => 0, onScene = () => {} } = {}) {
  const art = artwork(`sv${++instance}`);
  const media = matchMedia('(prefers-reduced-motion: reduce)');
  let motion = !media.matches, scene, nodes, animation = 0, playing = false, lastTime = 0, destroyed = false;
  const attrs = (node, values) => { if(node) for(const [key,value] of Object.entries(values)) node.setAttribute(key,String(value)); };
  function mount(next) {
    scene=next;host.innerHTML=art.frame(scene);host.dataset.scene=scene.id;
    host.setAttribute('role','img');host.setAttribute('aria-label',`Boribon és a rendőrautó: ${scene.title}.`);
    nodes={actors:Object.fromEntries([...host.querySelectorAll('[data-actor]')].map(node=>[node.dataset.actor,node])),effects:Object.fromEntries([...host.querySelectorAll('[data-effect]')].map(node=>[node.dataset.effect,node]))};
    for(const name of ['plants','trees','clouds','birds','butterflies','eyes','drivers','wheels','glows','flames','smoke','water','gardenWater','dust','soil']){
      const selector={plants:'.sv-plant',trees:'.sv-tree',clouds:'.sv-cloud',birds:'.sv-bird',butterflies:'.sv-butterfly',eyes:'.sv-eyes',drivers:'.sv-driver',wheels:'.sv-wheel',glows:'.sv-glow',flames:'.sv-flame',smoke:'[data-smoke]',water:'[data-water]',gardenWater:'[data-garden-water]',dust:'[data-dust]',soil:'[data-soil]'}[name];
      nodes[name]=[...host.querySelectorAll(selector)];
    }
    onScene(scene);
  }
  function pose(name,x,y,scale=1,angle=0) {attrs(nodes.actors[name],{transform:`translate(${x.toFixed(2)} ${y.toFixed(2)}) scale(${scale}) rotate(${angle.toFixed(2)} 125 100)`});}
  function visible(name,opacity) {attrs(nodes.effects[name],{opacity:clamp(opacity)});}
  function arm(actor,name,angle) {attrs(nodes.actors[actor]?.querySelector(name),{transform:`rotate(${angle} ${name.includes('left')?-27:28} -96)`});}
  function render(seconds = readTime()) {
    if(destroyed)return;
    let t=Number.isFinite(seconds)?clamp(seconds,0,STORY_VISUAL_DURATION):0;
    lastTime=t;const next=storySceneAt(t);if(next.id!==scene?.id)mount(next);
    host.dataset.time=t.toFixed(3);
    // Reduced motion presents one stable pose per narrated scene.
    if(!motion)t={garden:17,chase:40,bend:57,excavator:74,dig:87,'fire-arrival':99.5,water:102,ambulance:119,crane:140,thanks:158,team:178,annipanni:200,finish:222,together:240}[scene.id];
    const m=motion?1:0, ambient=motion?t:0, id=scene.id, local=t-scene.time;
    const ease=(start,end)=>smooth(progress(t,start,end));
    for(const name of Object.keys(nodes.effects))visible(name,0);
    nodes.plants.forEach((node,i)=>attrs(node,{transform:`rotate(${m*Math.sin(ambient*1.4+i*.87)*3.4})`}));
    nodes.trees.forEach((node,i)=>attrs(node,{transform:`rotate(${m*Math.sin(ambient*.65+i)*.6} 0 0)`}));
    nodes.clouds.forEach((node,i)=>attrs(node,{transform:`translate(${m*Math.sin(ambient*.04+i)*24} 0)`}));
    attrs(host.querySelector('.sv-sun-rays'),{transform:`rotate(${ambient*.8})`});
    attrs(host.querySelector('.sv-pinwheel'),{transform:`rotate(${ambient*34})`});
    nodes.birds.forEach((node,i)=>{attrs(node,{transform:`translate(${Number(node.dataset.x)+m*Math.sin(ambient*.18+i)*53} ${Number(node.dataset.y)+m*Math.sin(ambient*.8+i)*6})`});attrs(node.querySelector('.sv-bird-wings'),{transform:`scale(1 ${.55+m*Math.sin(ambient*4+i)*.4})`});});
    nodes.butterflies.forEach((node,i)=>{attrs(node,{transform:`translate(${280+i*510+m*Math.sin(ambient*.37+i)*45} ${460-i*46+m*Math.cos(ambient*.57+i)*27}) scale(.55)`});attrs(node.querySelector('.sv-butterfly-wings'),{transform:`scale(${.8-m*Math.sin(ambient*6+i)*.28} 1)`});});
    nodes.eyes.forEach((node,i)=>{const cycle=(ambient+i*.59)%5.2;attrs(node,{transform:`scale(1 ${motion&&cycle>4.98?.12:1})`});});
    nodes.drivers.forEach(node=>attrs(node.querySelector('.sv-head'),{transform:`rotate(${m*Math.sin(t*.8)*1.2})`}));
    nodes.glows.forEach(node=>attrs(node,{opacity:t>=24.54?.15+m*(Math.sin(ambient*2.2)+1)*.13:0}));
    attrs(host.querySelector('.sv-curtain'),{transform:`translate(${m*Math.sin(ambient*.8)*1.8} 0)`});
    // The fox leaves the racing car at the accident; later poses show the same fox outside.
    attrs(nodes.actors.race?.querySelector('.sv-driver'),{opacity:!['garden','chase','bend'].includes(id)||t>=53.29?0:1});
    let drive=0,raceDrive=0;
    if(id==='garden') {
      const depart=ease(21.43,29.199);pose('police',480+depart*335,438-m*Math.sin(t*2.8)*.8,.9);
      pose('girl',180,321,1);drive=t>21.43?(t-21.43)*125:0;
      attrs(host.querySelector('.sv-gate'),{transform:`scale(${1-depart*.66} 1)`});
      attrs(host.querySelector('.sv-girl-right'),{transform:`rotate(${m*Math.sin(t*.6)*3} 61 78)`});
      attrs(host.querySelector('.sv-girl-head'),{transform:`translate(42 41) rotate(${m*Math.sin(t*.8)*1.5})`});
      visible('garden-water',1);nodes.gardenWater.forEach((node,i)=>{const p=(ambient*.72+i/12)%1;attrs(node,{cx:346+p*32,cy:437+p*95,opacity:(1-p)*.8,transform:`rotate(18 ${346+p*32} ${437+p*95})`});});
    } else if(id==='chase') {
      const chase=ease(32.78,46.6);pose('police',140+chase*255,442-m*Math.sin(t*3)*1.2,.92);pose('race',410+chase*410,443-m*Math.sin(t*4)*1.3,.95);
      attrs(nodes.actors.race,{opacity:progress(t,32.78,33.2)});drive=local*180;raceDrive=local*240;visible('dust',progress(t,33,35)*.6);
      nodes.dust.forEach((node,i)=>attrs(node,{cx:405+chase*410-i*24,cy:559+Math.sin(ambient*1.5+i)*7,opacity:.14+i*.035}));
    } else if(id==='bend') {
      const turn=ease(49.478,53.7),stop=ease(47,54);pose('police',165+stop*184,449,.9);pose('race',710+turn*90,447+turn*83,.92,-turn*159);drive=(1-stop)*local*135;raceDrive=(1-turn)*local*210;
      pose('fox',mix(841,1080,turn),mix(499,574,turn),.68);attrs(nodes.actors.fox,{opacity:progress(t,53.29,55.3)});
      visible('smoke',progress(t,59.39,63.3)*.6);visible('dust',(1-turn)*.45);
      nodes.dust.forEach((node,i)=>attrs(node,{cx:732-i*26,cy:559+Math.sin(ambient+i)*5,opacity:.16}));
    } else if(id==='excavator'||id==='dig') {
      pose('police',90,450,.78);pose('excavator',mix(-255,380,ease(63.561,68.8)),569,1);pose('fox',1090,570,.68);
      const dig=ease(81,87.5);pose('race',820,530-dig*60,.9,-159+dig*20);
      const reach=id==='excavator'?ease(68,71.9):1;const a=mix(-61,-20,reach)-dig*9,b=mix(78,53,reach)+dig*10;
      attrs(host.querySelector('[data-part="boom"]'),{transform:`translate(155 -114) rotate(${a})`});attrs(host.querySelector('[data-part="stick"]'),{transform:`translate(200 0) rotate(${b})`});attrs(host.querySelector('[data-part="bucket"]'),{transform:`translate(155 0) rotate(${-10+dig*22})`});
      visible('soil',id==='dig'?Math.sin(progress(t,81,88.5)*Math.PI)*.8:0);nodes.soil.forEach((node,i)=>{const p=(ambient*.65+i/8)%1;attrs(node,{cx:842+i*6-25*p,cy:542+44*p,opacity:1-p});});
      visible('smoke',.75);drive=t<68.8?local*75:0;
    } else if(id==='fire-arrival'||id==='water') {
      pose('police',45,462,.68);pose('race',820,475,.9,-138);pose('fox',1120,566,.68);pose('firetruck',mix(-330,204,ease(91.553,96.9)),582,.91);
      pose('firefighter',510,588,.76);attrs(nodes.actors.firefighter,{opacity:progress(t,97,99.3)});
      const water=progress(t,99.811,100.2),out=1-ease(102.856,105.6);visible('flames',out*.95);visible('smoke',out*.65);visible('hose',water);visible('jet',water*out*.45);visible('water',water);
      nodes.water.forEach((node,i)=>{const p=(ambient*.9+i/16)%1;attrs(node,{cx:561+358*p,cy:484-162*p+194*p*p,opacity:(1-p)*.85,transform:`rotate(${-35+70*p} ${561+358*p} ${484-162*p+194*p*p})`});});
      arm('firefighter','.sv-arm-right',-103);drive=t<96.9?local*95:0;
    } else if(id==='ambulance') {
      pose('police',75,456,.73);pose('race',595,493,.78,-139);pose('ambulance',mix(1370,886,ease(112.55,115.8)),573,.95);pose('medic',786,585,.75);pose('stretcher',mix(760,912,ease(118.5,122.7)),574,1);
      const treat=progress(t,116.194,117);attrs(nodes.actors.medic,{opacity:treat});attrs(nodes.actors.stretcher,{opacity:treat*(1-ease(121.8,123.6))});attrs(host.querySelector('.sv-patient'),{opacity:ease(121.8,123.6)});
      pose('fox',1074,574,.68);attrs(nodes.actors.fox,{opacity:1-treat});
      attrs(host.querySelector('.sv-ambulance-door'),{transform:`translate(${-24*progress(t,116,117)*(1-ease(121.5,123.2))} 0)`});arm('medic','.sv-arm-left',-31);arm('medic','.sv-arm-right',35);drive=t<115.8?local*90:0;
    } else if(id==='crane') {
      pose('police',46,457,.73);pose('crane',mix(-330,186,ease(129.452,132.5)),581,1);
      const connected=ease(132.523,136.8),lift=ease(137.869,140.5),lower=ease(140.6,142.5),a=mix(-49,-30,connected),r=a*Math.PI/180;
      attrs(host.querySelector('[data-part="crane-boom"]'),{transform:`translate(158 -76) rotate(${a})`});
      const x=186+158+500*Math.cos(r),y=581-76+500*Math.sin(r),carY=515-107*lift+48*lower,hookY=mix(y+37,carY-4,connected);
      pose('race',connected>.95?x-118:795,carY,.92,-139*(1-lift));
      attrs(nodes.effects.cable,{d:`M${x} ${y}V${hookY}`});attrs(nodes.effects.hook,{d:`M${x} ${hookY-3}v11q12 18 17-2`});
      attrs(nodes.effects.sling,{d:`M${x+8} ${hookY+13} ${x-75} ${carY+70}M${x+8} ${hookY+13} ${x+75} ${carY+70}`});
      visible('cable',progress(t,132.5,133));visible('hook',progress(t,132.5,133));visible('sling',progress(t,136,137));drive=t<132.5?local*75:0;
    } else if(id==='thanks') {
      pose('police',220,440,1.03);pose('race',610,442,.83);pose('ambulance',870,587,1.07);
      attrs(host.querySelector('.sv-patient-wave'),{transform:`rotate(${-20-m*Math.sin(t*3)*17} 20 25)`});
      attrs(host.querySelector('.sv-patient-head'),{transform:`rotate(${m*Math.sin(t*.7)*2})`});
    } else {
      const finish=id==='finish',end=id==='together';pose('police',40,411,.65);pose('race',272,414,.65);pose('excavator',473,519,.50);pose('firetruck',681,516,.50);pose('crane',863,523,.45);pose('ambulance',1069+(finish?ease(225.5,229.8)*330:0),518,.55);
      pose('bear',512,651,1.05);pose('girl',654,447,.97);attrs(nodes.actors.girl,{opacity:end?1:progress(t,189.079,192.5)});
      attrs(host.querySelector('[data-part="boom"]'),{transform:`translate(155 -114) rotate(${-54+(finish?ease(220,225)*27:0)})`});attrs(host.querySelector('[data-part="stick"]'),{transform:'translate(200 0) rotate(88)'});
      attrs(host.querySelector('[data-part="crane-boom"]'),{transform:`translate(158 -76) rotate(${-34-(finish?ease(223,226)*18:0)})`});
      arm('bear','.sv-arm-right',id==='team'?-55-m*Math.sin(t*1.2)*7:end?-119-m*Math.sin(t*2.4)*9:-12);
      arm('bear','.sv-arm-left',id==='team'?18:-10);attrs(nodes.actors.bear?.querySelector('.sv-head'),{transform:`rotate(${m*Math.sin(t*.8)*2.4})`});
      attrs(nodes.actors.girl?.querySelector('.sv-girl-right'),{transform:`rotate(${end?-65-m*Math.sin(t*2.4)*8:0} 61 78)`});
      if(finish)drive=progress(t,225.5,229.8)*local*45;
    }
    // Small movements stay restrained; the narrated actions are the larger movements.
    nodes.wheels.forEach(node=>{const actor=node.closest('[data-actor]')?.dataset.actor;attrs(node,{transform:`rotate(${motion?(actor==='race'?raceDrive:drive):0})`});});
    nodes.flames.forEach((node,i)=>attrs(node,{transform:`scale(${1+m*Math.sin(ambient*3+i)*.06} ${1+m*Math.sin(ambient*2.7+i)*.12})`}));
    nodes.smoke.forEach((node,i)=>{const p=(ambient*.17+i/7)%1;attrs(node,{cx:935+Math.sin(ambient*.45+i)*18+p*30,cy:515-p*138,opacity:(1-p)*.38,transform:`translate(${id==='bend'? -26:0} 0) scale(1)`});});
    for(const actor of ['fox','bear','medic','firefighter'])attrs(nodes.actors[actor]?.querySelector('.sv-body'),{transform:`translate(0 ${m*Math.sin(ambient*1.7)*1.2})`});
  }
  function tick() {animation=0;if(destroyed||!playing)return;render(readTime());animation=requestAnimationFrame(tick);}
  function sync(seconds,active=false) {
    playing=Boolean(active);render(seconds);
    if(!playing){cancelAnimationFrame(animation);animation=0;}
    else if(!animation)animation=requestAnimationFrame(tick);
  }
  function setMotion(value) {motion=Boolean(value);render(readTime());}
  const preference=()=>setMotion(!media.matches);media.addEventListener('change',preference);
  render(0);
  return {render,sync,setMotion,get motion(){return motion;},get time(){return lastTime;},destroy(){destroyed=true;playing=false;cancelAnimationFrame(animation);media.removeEventListener('change',preference);host.replaceChildren();}};
}
