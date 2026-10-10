// Villám, Turbó, Pötty and the silver car share this one model in every story.
export function createRaceCar(art, {color='red',accessory='',eyes='friendly'} = {}) {
  const colors={red:['#e89978','#c45f51','#944d42'],yellow:['#f4d481','#d8ad50','#a9833d'],blue:['#92b6c8','#547f9f','#41647b'],green:['#9dba87','#6e9464','#536f4c'],silver:['#ecede0','#aebbb4','#6e8680']};
  const [light,body,outline]=colors[color]||colors.red;
  return `<g class="sv-race-model" data-color="${color}">
    <ellipse cx="130" cy="155" rx="132" ry="12" fill="#49513f" opacity=".16"/>
    ${color==='yellow'?`<g class="sv-spoiler"><path d="M14 67V33m20 34V33" stroke="${outline}" stroke-width="5"/><path d="M-9 21h70v14H-9q-7-7 0-14Z" fill="${light}" stroke="${outline}" stroke-width="3"/></g>`:''}
    <path d="M45 65 66 17q5-11 22-11h71q13 0 24 13l37 49Z" fill="${body}" stroke="${outline}" stroke-width="3"/>
    <path d="m76 19-17 43h128l-22-41q-4-5-14-5H87q-8 0-11 3Z" fill="${art.paint('glass')}" stroke="${outline}" stroke-width="2.5"/>
    <path d="m83 22-11 29" stroke="#fff9e7" stroke-width="4" opacity=".65" stroke-linecap="round"/>
    <g transform="translate(121 38)"><g class="sv-eyes"><ellipse cx="-21" rx="11" ry="14" fill="#fff9e7"/><ellipse cx="23" rx="11" ry="14" fill="#fff9e7"/><ellipse cx="-18" cy="2" rx="5" ry="7" fill="#3e4b47"/><ellipse cx="26" cy="2" rx="5" ry="7" fill="#3e4b47"/><circle cx="-19" r="1.7" fill="#fff"/><circle cx="25" r="1.7" fill="#fff"/></g></g>
    <path d="M13 74q10-17 34-17h148l42 16q16 7 18 25v26H4V97q0-15 9-23Z" fill="${body}" stroke="${outline}" stroke-width="3"/>
    <path d="M25 69h166l43 15q9 4 13 15H14V88q2-10 11-19Z" fill="${light}"/>
    <path d="M74 77v35q0 6 7 6h70q9 0 9-8V77" fill="none" stroke="${outline}" stroke-width="2"/><path d="M90 87h17" stroke="${outline}" stroke-width="3" stroke-linecap="round"/>
    <path d="M163 98q17 13 34-2" fill="none" stroke="${outline}" stroke-width="3" stroke-linecap="round"/>
    <ellipse class="sv-headlight" cx="248" cy="99" rx="6" ry="13" fill="#ffedb8" stroke="#b4a475" stroke-width="2"/><path d="M236 124h23M3 124h20" stroke="#dddccd" stroke-width="7" stroke-linecap="round"/>
    ${art.wheel(53)}${art.wheel(208)}
    ${accessory==='float'?'<g class="sv-float"><path d="M-8 121h277v24q-144 17-277 0Z" fill="#e6c583" stroke="#af915d" stroke-width="3"/><path d="M17 128h48m34 0h46m31 0h47" stroke="#fff0c2" stroke-width="6" stroke-linecap="round"/></g>':accessory==='skates'?'<g class="sv-skates" fill="none" stroke="#8c9e9b" stroke-width="7" stroke-linecap="round"><path d="M29 154h63q8 0 9-10M182 154h63q8 0 9-10"/><path d="M53 143v12m153-12v12"/></g>':accessory==='skis'?'<g class="sv-skis"><path d="M9 153h256q17 0 23-20" fill="none" stroke="#ba8b5c" stroke-width="9" stroke-linecap="round"/><path d="M48 141v12m166-12v12" stroke="#c1bba0" stroke-width="6"/></g>':''}
  </g>`;
}
