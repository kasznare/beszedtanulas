import { DIFFERENCE_SCENES } from './differences-data.js';

// Original, code-drawn picture-book illustrations. Each pair is the same scene
// with a small, explicit set of local substitutions; there is no random art.
const ink = '#45616a';
const leaf = (x, y, angle = 0, size = 1, color = '#5f9c78') => `<path transform="translate(${x} ${y}) rotate(${angle}) scale(${size})" d="M0 0Q-19-25 1-39Q22-20 0 0" fill="${color}"/>`;
const flower = (x, y, color = '#e59b9d', scale = 1) => `<g transform="translate(${x} ${y}) scale(${scale})">${[0, 60, 120, 180, 240, 300].map(angle => `<ellipse cx="0" cy="-9" rx="6" ry="9" transform="rotate(${angle})" fill="${color}"/>`).join('')}<circle r="6" fill="#efc460"/></g>`;
const grass = (x, y, scale = 1) => `<path transform="translate(${x} ${y}) scale(${scale})" d="M-9 0-13-14M0 0 2-20M7 0 15-11" fill="none" stroke="#78a876" stroke-width="3"/>`;
const cloud = (x, y, scale = 1) => `<path transform="translate(${x} ${y}) scale(${scale})" d="M-52 16Q-66-6-43-15Q-35-43-7-29Q13-49 34-22Q60-24 65-2Q82 20 49 22H-37Q-49 22-52 16" fill="#fffdf1" opacity=".86"/>`;
const shadow = (x, y, rx, ry) => `<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" fill="#426767" opacity=".11"/>`;
const sprig = (x, y, size = 1) => `<g transform="translate(${x} ${y}) scale(${size})"><path d="M0 0Q-5-38 5-70" fill="none" stroke="#527d59" stroke-width="3"/>${leaf(-1, -15, -55, .65)}${leaf(0, -30, 55, .6, '#86ae76')}${leaf(1, -46, -40, .5)}${leaf(5, -64, 12, .4, '#91b887')}</g>`;

function picnic(P, prefix) {
  return `
    <rect width="800" height="520" fill="url(#${prefix}-sky)"/>
    ${cloud(390, 120, .9)}${cloud(600, 155, .55)}
    <path d="M0 260Q155 181 323 247T800 226V520H0Z" fill="#b9d7aa"/>
    <path d="M0 310Q202 252 405 302T800 285V520H0Z" fill="#d5e3b7"/>
    <path d="M0 465Q185 434 333 482T800 459V520H0Z" fill="#c3d8a0"/>
    <path d="M155 94 141 322Q158 340 179 321L169 128 203 104 190 94 166 111Z" fill="#b48a5f"/>
    <path d="M157 168 156 298M165 226 173 236M148 311 135 330" fill="none" stroke="#946d4e" stroke-width="5"/>
    <path d="M73 38Q116-9 161 28Q195 2 226 33Q277 29 274 82Q292 120 249 142Q202 167 167 136Q117 161 84 125Q25 121 42 75Q24 44 73 38" fill="#75a778"/>
    <path d="M57 68Q74 37 104 48M179 45Q216 24 241 52M79 118Q106 134 127 121" fill="none" stroke="#97be87" stroke-width="13"/>
    ${[[97, 77], [163, 54], [183, 112]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="10" fill="#d97762"/><path d="m${x} ${y - 8} 3-8" stroke="#617351" stroke-width="3"/>`).join('')}
    <path d="M228 86V105" stroke="#8c7558" stroke-width="3"/>
    <path d="M8 66Q83 106 163 66" fill="none" stroke="#728a6f" stroke-width="2"/>
    <path d="m20 72 24 8-19 19ZM122 87l22-9-3 24Z" fill="#e8bc62"/>
    <path d="M463 109Q469 162 431 187T445 243" fill="none" stroke="#7d9395" stroke-width="2"/>
    <path d="m443 165-10-6 3 15 8-8 13 6-5-15Z" fill="#e6aa70"/>
    <path d="M540 248H785M540 275H785" stroke="#f6efd9" stroke-width="13"/>
    ${[550, 610, 670, 730, 780].map(x => `<path d="M${x} 294V226l9-11 9 11v68" fill="#fbf4df" stroke="#e1d8b9" stroke-width="2"/>`).join('')}
    <path d="M730 190 721 315H741L742 198" fill="#b38b64"/>
    <path d="M726 261 682 241M737 233 767 213" stroke="#b38b64" stroke-width="9"/>
    <path d="M671 174Q659 142 689 131Q706 106 738 124Q774 108 787 142Q816 171 785 195Q761 219 733 202Q693 221 679 195Q655 193 671 174Z" fill="#83ac7a"/>
    ${leaf(714, 174, -45, .6, '#a4c58a')}${leaf(765, 153, 25, .6, '#a4c58a')}
    <path d="M17 306Q2 269 34 257Q54 228 81 255Q117 234 132 269Q158 280 143 311Z" fill="#88b18a"/>
    ${flower(39, 274, '#f4d77e', .6)}${flower(119, 288, '#f4d77e', .7)}
    ${shadow(374, 445, 208, 28)}
    <path d="m237 313 258-10 79 153-397 7Z" fill="url(#${prefix}-picnic)" stroke="#f7eed8" stroke-width="9"/>
    <path d="m211 450 331-7M245 326l245-10" fill="none" stroke="#f7e7d0" stroke-width="5"/>
    ${[189, 218, 247, 276, 305, 334, 363, 392, 421, 450, 479, 508, 537, 566].map(x => `<path d="m${x} 459-3 11" stroke="#dca292" stroke-width="3"/>`).join('')}
    <ellipse cx="350" cy="353" rx="48" ry="20" fill="#fff8e7" stroke="#d6c9a5" stroke-width="3"/>
    <path d="m320 351 24-26 25 29Z" fill="#e7bd73" stroke="#ac854c" stroke-width="2"/><path d="m329 349 15-15 15 17Z" fill="#f7e5b6"/>
    <path d="m346 361 25-29 27 23Z" fill="#e2ba73" stroke="#ac854c" stroke-width="2"/><path d="m354 354 17-17 16 16" fill="none" stroke="#8eac6a" stroke-width="5"/>
    <path d="M397 320h25v30q-12 10-25 0Z" fill="#fff6df" stroke="#c4b58d" stroke-width="2"/><path d="M422 326h7q12 13-7 18" fill="none" stroke="#c4b58d" stroke-width="4"/>
    <ellipse cx="409" cy="320" rx="12" ry="4" fill="#b87d53"/>
    <path d="M310 415h62q-3 30-31 30t-31-30" fill="#88b6b8" stroke="#5b9299" stroke-width="2"/>
    <ellipse cx="341" cy="415" rx="31" ry="8" fill="#b2d2ce"/>
    ${[[322, 412], [337, 410], [349, 415], [359, 411], [338, 420]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="6" fill="#a95c6d"/>`).join('')}
    <g transform="translate(557 376) rotate(17)"><path d="M-28-28H28V29H-28Z" fill="#7c9eb0" stroke="#527585" stroke-width="3"/><path d="M-24 25H28V32H-24" fill="#f7e9c8"/><path d="M-20-28v53" stroke="#a4c2c7" stroke-width="3"/><path d="m4-13 5 8 9 1-7 6 2 9-9-5-8 5 2-9-7-6 9-1Z" fill="#f4d583"/></g>
    ${shadow(603, 449, 31, 7)}<circle cx="603" cy="423" r="27" fill="#e7b861" stroke="#bd9757" stroke-width="2"/><path d="M585 403q22 9 35 34M582 437q25-7 38-31" fill="none" stroke="#f8e2ac" stroke-width="9"/>
    <path d="M80 461V433M80 450q-19 0-22-14M80 456q20-1 24-17" fill="none" stroke="#698c60" stroke-width="4"/>
    ${[[32, 367, 1], [151, 405, .8], [603, 493, .8], [746, 375, 1], [738, 473, .9], [34, 494, .7]].map(args => grass(...args)).join('')}
    ${flower(152, 478, '#fff2c6', .6)}${flower(760, 328, '#e8a2a0', .65)}${flower(625, 353, '#fff2c6', .55)}
    ${P('sun', v => `<g fill="#eabf60">${[0, 45, 90, 135, 180, 225, 270, 315].map(a => `<path d="M0-28v-6" transform="rotate(${a})" stroke="#eabf60" stroke-width="4"/>`).join('')}<circle r="21" fill="${v ? '#f3b57b' : '#f5cf72'}"/></g>`)}
    ${P('kite', v => `<path d="M0-34 28 0 0 34-28 0Z" fill="${v ? '#a394c5' : '#e9907a'}" stroke="#5d7d85" stroke-width="2"/><path d="M0-34V34L28 0Z" fill="${v ? '#d4c8e4' : '#f5c79a'}"/><path d="M-28 0H28M0-34V34" stroke="#fff2d8" stroke-width="2"/>`)}
    ${P('birdhouse', v => `<path d="M-24-10h48v38h-48Z" fill="#e6be7a" stroke="#997b57" stroke-width="2"/><path d="m-30-9 30-23 30 23" fill="#d67e68" stroke="#a65f50" stroke-width="5"/>${v ? '<path d="M-9 5 0-5 9 5V16H-9Z" fill="#6b6656"/>' : '<circle cy="6" r="11" fill="#6b6656"/>'}<path d="M-12 22H12" stroke="#977750" stroke-width="4"/>`)}
    ${P('basket', v => `<path d="M-28-4v-14q28-33 56 0v14" fill="none" stroke="#96734e" stroke-width="6"/><path d="M-39-5h78l-7 32h-64Z" fill="#d7a968" stroke="#a6804c" stroke-width="3"/><path d="M-33 6h66M-31 16h62M-20-3v28M-7-3v28M7-3v28M21-3v28" stroke="#b78a51" stroke-width="2"/><path d="m-23-10 44-1 3 28-16-5-14 7-11-9Z" fill="${v ? '#8fb6c3' : '#e39786'}"/><path d="M-15-6 3 9 16-7" fill="none" stroke="#fff0db" stroke-width="3"/>`)}
    ${P('teapot', v => `<path d="M20-11q27-4 16 18l-12 8" fill="none" stroke="#6d9a9d" stroke-width="5"/><path d="M-22 3-35-11-35 4-18 19" fill="#98c2c1" stroke="#6d9a9d" stroke-width="2"/><ellipse cy="8" rx="26" ry="20" fill="#a7cac2" stroke="#6d9a9d" stroke-width="2"/><path d="M-18-9q18-14 36 0Z" fill="#7ba9aa"/><circle cy="-17" r="5" fill="#d6ae60"/>${v ? '<path d="m-9 8 9-9 9 9-9 10Z" fill="#fff5d8"/>' : '<circle cy="8" r="9" fill="#fff5d8"/>'}`)}
    ${P('watering-can', v => `<path d="M-20-13q-22-27-21 3l15 18" fill="none" stroke="#647f78" stroke-width="6"/><path d="m15-5 20-13 8 3-24 29" fill="${v ? '#d79a70' : '#85aea2'}" stroke="#647f78" stroke-width="2"/><path d="M-26-15h44l5 36q-21 11-45 0Z" fill="${v ? '#dda77c' : '#94bcb0'}" stroke="#647f78" stroke-width="2"/><ellipse cx="-4" cy="-15" rx="22" ry="6" fill="#e7e1bf"/><path d="M-12-6v22" stroke="#fff2d1" stroke-width="5" opacity=".55"/><path d="m35-20 11 8" stroke="#647f78" stroke-width="6"/>`)}
    ${P('bunting', v => `<path d="${v ? 'M-15-8H15L10 17 0 8-10 17Z' : 'M-15-8H15L0 20Z'}" fill="#83b5c0" stroke="#688f97" stroke-width="2"/>`)}
    ${P('butterfly', v => `<path d="M0 2Q-32-34-25-3Q-28 20-3 11M0 2Q32-34 25-3Q28 20 3 11" fill="#e9b061" stroke="#b98b57" stroke-width="2"/><ellipse cx="-15" cy="-2" rx="${v ? 5 : 9}" ry="8" fill="#fff1c9"/><ellipse cx="15" cy="-2" rx="${v ? 5 : 9}" ry="8" fill="#fff1c9"/><path d="M0-9V16M-1-8-6-15M1-8 6-15" stroke="#627363" stroke-width="3"/>`)}
    ${P('flower', v => `${flower(0, 0, '#dd8e95', 1.25)}<circle r="${v ? 10 : 6}" fill="${v ? '#ad7987' : '#f1cc74'}"/>`)}
    ${P('fruit', v => `<ellipse cy="12" rx="28" ry="13" fill="#fff3d5" stroke="#d2bc94" stroke-width="2"/>${v ? '<path d="M-2-20Q8-22 6-10Q23 0 15 12Q4 24-12 13Q-24 0-7-10Z" fill="#b0bd70" stroke="#899851" stroke-width="2"/>' : '<path d="M0-10Q-22-25-19 1Q-17 21 0 17Q18 21 20 1Q23-25 0-10Z" fill="#d77e66" stroke="#b56553" stroke-width="2"/>'}<path d="M1-12 4-22" stroke="#8f7954" stroke-width="3"/>${leaf(3, -17, 67, .32, '#789c64')}`)}
    ${P('squirrel', v => `<path d="M7 20Q42 16 30-12Q18-35 8-15Q4-3 19 0Q27 9 8 10" fill="#bc8762" stroke="#a87554" stroke-width="2"/><ellipse cx="-10" cy="11" rx="16" ry="20" fill="#c8956d"/><path d="M-24-10-22-25-12-14M-12-13-2-26 1-7" fill="#c8956d"/><ellipse cx="-13" cy="-7" rx="17" ry="13" fill="#d8a578"/><circle cx="-21" cy="-9" r="2.5" fill="${ink}"/><circle cx="-29" cy="-5" r="3" fill="${ink}"/><ellipse cx="-15" cy="15" rx="8" ry="10" fill="#edc99b"/><path d="m-30 23 21-2" stroke="#9e6b4b" stroke-width="5"/>${v ? '<path d="M-24 5q-7 13 4 13t4-13Z" fill="#a7794a"/><path d="M-27 5h15" stroke="#6f7451" stroke-width="5"/>' : '<path d="M-25 7q-9 8 0 13 11 2 10-9Z" fill="#e5b465"/><path d="m-26 10 10 5" stroke="#b4854f" stroke-width="2"/>'}`)}
    ${P('napkin', v => `<path d="m-25-20 47 4 5 37-48 2Z" fill="#fff0cf" stroke="#d3bb94" stroke-width="2"/><path d="m-16-17 2 39M-7-17 2 39${v ? 'M2-16 2 37' : ''}" stroke="#8baeb3" stroke-width="4"/>`)}
  `;
}

function harbor(P, prefix) {
  return `
    <rect width="800" height="520" fill="url(#${prefix}-sky)"/>
    ${cloud(395, 62, .75)}${cloud(195, 144, .45)}
    <path d="M0 239 146 213 227 235 311 217 398 240 524 211 650 231 800 203V340H0Z" fill="#abc6b8"/>
    <path d="M0 255Q200 243 400 252T800 247V520H0Z" fill="url(#${prefix}-water)"/>
    <path d="M0 404Q131 402 197 434T420 451Q608 418 800 354V520H0Z" fill="#edddae"/>
    <path d="M0 425Q135 421 202 451T430 466Q634 433 800 376" fill="none" stroke="#faf1d5" stroke-width="9"/>
    ${[[32, 321, 37], [245, 281, 32], [559, 291, 45], [634, 336, 49], [105, 378, 26], [741, 296, 24], [231, 248, 19], [557, 216, 27]].map(([x, y, w]) => `<path d="M${x} ${y}q${w / 2} 6 ${w} 0" fill="none" stroke="#e2efdf" stroke-width="3" opacity=".8"/>`).join('')}
    <path d="M23 302 42 280H137L165 309Z" fill="#b0b2a1"/>
    <path d="M48 281 64 122H111L128 281Z" fill="#fcf1d7" stroke="#b8b7a0" stroke-width="3"/>
    <path d="m59 177 56 0 4 35H55ZM52 245h72l4 36H48Z" fill="#d78774"/>
    <path d="M57 110h61v24H57Z" fill="#84b1b5" stroke="#527c87" stroke-width="3"/>
    <path d="M62 110V94h50v16M75 95v15M98 95v15" fill="#f5d68c" stroke="#527c87" stroke-width="3"/>
    <path d="m52 94 35-24 36 24Z" fill="#527c87"/>
    <path d="M88 69V43" stroke="#527c87" stroke-width="3"/>
    <path d="M80 280v-29q9-14 18 0v29" fill="#7e9794"/>
    <path d="M635 172 652 56H778L792 172Z" fill="#d6c19a"/>
    <path d="M641 62 712 17 787 62Z" fill="#b66f62" stroke="#925e54" stroke-width="3"/>
    <path d="M648 69h135M644 140h141M644 153h144" stroke="#bdad8b" stroke-width="3"/>
    <path d="M741 172v-40h27v40" fill="#6e969a"/><circle cx="747" cy="151" r="2" fill="#ead08c"/>
    <path d="M615 178h185v12H615Z" fill="#b68f65"/>
    <path d="M626 188v43M775 188v42M652 187l108 41" stroke="#9d7d5d" stroke-width="8"/>
    <path d="M580 78v163" stroke="#7c9391" stroke-width="5"/><circle cx="580" cy="76" r="5" fill="#e7b969"/>
    <path d="M552 241h57l-6 15h-44Z" fill="#e4bd78"/>
    <path d="M393 286V116" stroke="#987d57" stroke-width="6"/>
    <path d="m386 128-99 144h99Z" fill="#f6edcf" stroke="#d6cba9" stroke-width="2"/>
    <path d="m402 135 120 137H402Z" fill="#fcf4d8" stroke="#d6cba9" stroke-width="2"/>
    <path d="m301 254 80-111M407 250h93" stroke="#dd8973" stroke-width="12"/>
    <path d="M279 284h257l-41 53H325Z" fill="#668f9b" stroke="#496d7b" stroke-width="3"/>
    <path d="M289 291h239l-6 11H298Z" fill="#e7bd75"/>
    <path d="M330 330h160" stroke="#b6d1ca" stroke-width="3"/><circle cx="350" cy="309" r="10" fill="#415d6a" stroke="#dfc38c" stroke-width="4"/>
    <path d="M533 291Q581 333 578 362" fill="none" stroke="#b3a57c" stroke-width="3"/>
    <path d="M94 342 559 328 594 406 114 431Z" fill="url(#${prefix}-wood)" stroke="#b08e67" stroke-width="3"/>
    ${[128, 216, 305, 393, 480, 565].map(x => `<path d="M${x} 333l21 84" stroke="#ad8d65" stroke-width="3"/>`).join('')}
    <path d="M126 423v48M548 409v47" stroke="#977959" stroke-width="16"/>
    <path d="M142 350v-31M555 348v-32" stroke="#9d805d" stroke-width="13"/>
    <ellipse cx="142" cy="318" rx="7" ry="4" fill="#c6a675"/><ellipse cx="555" cy="315" rx="7" ry="4" fill="#c6a675"/>
    <path d="M142 319q202 40 413-3" fill="none" stroke="#e9d7a6" stroke-width="5"/>
    <path d="M-5 363 73 354 65 391 8 401Z" fill="#ba8469" stroke="#92664f" stroke-width="3"/><path d="M11 371 64 363M18 390l-5-25M39 386l-6-24" stroke="#d8aa83" stroke-width="3"/>
    <path d="M257 360h27v37h-27Z" fill="#e6bd72" stroke="#aa8a56" stroke-width="2"/><path d="M263 360v-12q8-10 15 0v12" fill="none" stroke="#889f97" stroke-width="3"/><path d="M263 373h15M263 386h15" stroke="#f5deb0" stroke-width="4"/>
    <path d="M385 369h38v26h-38Z" fill="#83b1ae" stroke="#5c8c8e" stroke-width="2"/><path d="M387 370q17-39 34 0" fill="none" stroke="#6b9395" stroke-width="3"/>
    <path d="M631 455q-6-26 6-46M638 454q4-34 18-44M623 457q-18-21-19-30" fill="none" stroke="#9baa73" stroke-width="5"/>
    <path d="m752 413 9 6 10-2-5 9 3 10-10-4-9 5 1-11-8-7 10-1Z" fill="#d69474" stroke="#bd805f" stroke-width="2"/>
    <path d="M49 462q19-24 35 0Z" fill="#faf0cd" stroke="#c9b98f" stroke-width="2"/><path d="M58 461 65 447 71 462M66 461v-14" fill="none" stroke="#cfbf97" stroke-width="2"/>
    ${[[247, 480, 6], [601, 485, 5], [737, 476, 7], [177, 477, 4], [33, 415, 4]].map(([x, y, r]) => `<ellipse cx="${x}" cy="${y}" rx="${r + 3}" ry="${r}" fill="#c6bc99"/>`).join('')}
    ${P('lighthouse-window', v => `<path d="M-13 19V-10q13-16 26 0v29Z" fill="#688b94" stroke="#e7d7ad" stroke-width="4"/><path d="M-12 5H12${v ? 'M0-15V18' : ''}" stroke="#f1ddb2" stroke-width="4"/>`)}
    ${P('sail', v => v ? '<path d="M0-23 6-6 24-6 10 5 16 23 0 12-16 23-10 5-24-6H-6Z" fill="#d69a62"/>' : '<circle r="21" fill="#dd9a78"/><path d="M-13 1 0 12 14-7" fill="none" stroke="#f9edcd" stroke-width="5"/>')}
    ${P('flag', v => `<path d="M2-19 29-13 2 9Z" fill="${v ? '#e9c36c' : '#d78774'}" stroke="#a88c65" stroke-width="2"/>`)}
    ${P('life-ring', v => `<circle r="28" fill="#f9ebc6" stroke="#ba9e76" stroke-width="2"/><circle r="16" fill="#b28f66"/><path d="M-7-27H7V-15H-7ZM-7 15H7V27H-7ZM15-7H27V7H15ZM-27-7H-15V7H-27Z" fill="${v ? '#7aa5b4' : '#d98770'}"/><circle r="29" fill="none" stroke="#e8d5a2" stroke-width="3"/>`)}
    ${P('cabin-window', v => `<rect x="-22" y="-22" width="44" height="44" rx="4" fill="#7ca9b0" stroke="#f6e7c6" stroke-width="5"/><path d="M0-20V20M-20 0H20" stroke="#f6e7c6" stroke-width="4"/>${v ? '<path d="M-19-19H-5V18L-19 8ZM19-19H5V18L19 8Z" fill="#de9c82"/>' : '<path d="M-19-19H-5L-14-2-19 3ZM19-19H5L14-2 19 3Z" fill="#de9c82"/>'}`)}
    ${P('crab', v => `<path d="M-14 9-29 17M-14 3-31 5M14 9 29 17M14 3 31 5M-12-2-26-14M12-2 26-14" stroke="#c77b61" stroke-width="4"/><ellipse cy="6" rx="18" ry="12" fill="#db9374"/><path d="M-27-6q-16-3-6-14l4 7 8-5q6 10-6 12" fill="#dc9272"/><path d="${v ? 'M27-6q-15-3-8-16l7 7 7-7q11 13-6 16' : 'M27-6q-11-2-7-11l6 5 6-5q7 10-5 11'}" fill="#dc9272"/><path d="M-7-3v-6M7-3v-6" stroke="#c77b61" stroke-width="3"/><circle cx="-7" cy="-10" r="3" fill="${ink}"/><circle cx="7" cy="-10" r="3" fill="${ink}"/>`)}
    ${P('weathervane', v => `<g transform="scale(${v ? -1 : 1} 1)"><path d="M-28-10H25M-25-10l6-5M-25-10l6 5" stroke="#5f8286" stroke-width="3"/><path d="M-14-10q14-15 29 0-14 15-29 0m28 0 11-9v18Z" fill="#e3b86a" stroke="#9b895f" stroke-width="2"/><circle cx="-6" cy="-11" r="2" fill="${ink}"/></g>`)}
    ${P('gull', v => `<path d="M-4 5Q-23-22-34-14Q-21-8-15 9Q-4 19 17 9l12-7-13-5Q7-11-4 5" fill="#fff8e3" stroke="#809b9c" stroke-width="2"/><path d="M-3 5q10-27 25-24L10 5" fill="#e1e5d8"/><path d="M18-3 33 ${v ? -1 : 5} 18 6Z" fill="#d9a65a"/><circle cx="16" cy="-1" r="2" fill="${ink}"/>`)}
    ${P('float', v => `<path d="M-15 18-9-17H9L15 18Z" fill="#faf0d1" stroke="#7d9390" stroke-width="2"/><path d="M-12 0H12L15 17H-15Z" fill="${v ? '#7dabb8' : '#de8e75'}"/><path d="M0-18v-8" stroke="#7c8f88" stroke-width="3"/><path d="M-22 22q22 7 44 0" fill="none" stroke="#e5f0dd" stroke-width="3"/>`)}
    ${P('porthole', v => `<circle r="19" fill="#e4bf78" stroke="#a38453" stroke-width="2"/><circle r="13" fill="#365e72"/><path d="M-11 0H11${v ? 'M0-11V11' : ''}" stroke="#a5c0bd" stroke-width="3"/>`)}
    ${P('fish', v => `<path d="M-35-19H35V24H-35Z" fill="#cfa675" stroke="#a27c52" stroke-width="2"/><path d="M-35-6H35M-35 10H35" stroke="#ad855b" stroke-width="3"/><path d="M-23 0Q-7-23 18 0-7 23-23 0m38 0 13-11v22Z" fill="#82b0b0" stroke="#527e8c" stroke-width="2"/><circle cx="-15" cy="-2" r="2" fill="${ink}"/><path d="M-7-8Q-1 0-7 8${v ? 'M1-9Q7 0 1 9M9-6Q14 0 9 6' : ''}" fill="none" stroke="#d5e4cd" stroke-width="3"/>`)}
    ${P('rope', v => `<path d="M-9 15q-30-4-19-24 10-18 31-8 21 14 0 25-19 6-20-7 0-12 12-9 12 6-1 9M2 17q13 7 20 2" fill="none" stroke="#e7d1a0" stroke-width="5"/>${v ? '<path d="m24 2 4 7 8 1-6 5 2 8-8-4-7 4 2-8-6-5 8-1Z" fill="#dfaa85"/>' : '<path d="M13 17q2-23 19-12 10 12-8 17Z" fill="#f6e9c4" stroke="#bca77e" stroke-width="2"/><path d="m17 16 4-10m1 12 5-11" stroke="#ceb98d" stroke-width="2"/>'}`)}
  `;
}

function workshop(P, prefix) {
  return `
    <rect width="800" height="520" fill="#f6e9ca"/>
    <path d="M0 350H800V520H0Z" fill="url(#${prefix}-floor)"/>
    <path d="M0 349H800" stroke="#bdac85" stroke-width="11"/>
    <path d="M0 28H800M30 0V350M770 0V350" stroke="#d6be90" stroke-width="16"/>
    <path d="M30 35H770" stroke="#fff1d0" stroke-width="4"/>
    <path d="M383 50h185v180H383Z" fill="#b7d8d4" stroke="#ad9671" stroke-width="9"/>
    <path d="M393 62h164v152H393Z" fill="url(#${prefix}-sky)"/>
    ${cloud(473, 94, .46)}
    <path d="M393 185q54-58 164-15v45H393Z" fill="#a2c394"/>
    <path d="M407 191q39-31 87 1t63-8v31H407Z" fill="#c6d4a7"/>
    <path d="M475 56V223M389 131H562" stroke="#f2e3bb" stroke-width="9"/>
    <path d="M376 226H575" stroke="#b4976e" stroke-width="12"/>
    <path d="M378 49q21 29 16 79l17 2q17-43 5-81M571 49q-21 29-16 79l-17 2q-17-43-5-81" fill="#d89c80"/>
    <path d="M390 126H412M539 126H560" stroke="#f3c38f" stroke-width="5"/>
    <rect x="182" y="134" width="164" height="125" rx="10" fill="#dbc294" stroke="#b69b72" stroke-width="3"/>
    ${Array.from({ length: 7 }, (_, row) => Array.from({ length: 9 }, (_, col) => `<circle cx="${196 + col * 17}" cy="${147 + row * 16}" r="2" fill="#ad956f" opacity=".5"/>`).join('')).join('')}
    <path d="M207 157v66" stroke="#a47651" stroke-width="9"/><path d="M194 155h38v17h-38Z" fill="#79979b" stroke="#5c787d" stroke-width="3"/>
    <path d="M249 155v35l-13 28M250 191l12 27" fill="none" stroke="#738d8c" stroke-width="5"/><path d="m236 215-5 12m31-12 4 12" stroke="#cc8d6c" stroke-width="7"/>
    <path d="M200 103H346" stroke="#ab895e" stroke-width="10"/><path d="m211 108 10 13v-13m104 0-10 13v-13" fill="none" stroke="#bda277" stroke-width="4"/>
    <rect x="216" y="56" width="25" height="43" rx="3" fill="#91b8b5"/><path d="M216 70h25M222 56v43" stroke="#649196" stroke-width="3"/>
    <path d="m245 55 17-3 7 46-17 3Z" fill="#ce9577"/><path d="m250 62 14-2" stroke="#eed19d" stroke-width="4"/>
    <path d="M53 183h76" stroke="#a98b60" stroke-width="8"/><path d="M67 183v14M114 183v14" stroke="#a98b60" stroke-width="6"/>
    <path d="M90 195v15" stroke="#8f7e60" stroke-width="3"/>
    <path d="M665 31V76" stroke="#817961" stroke-width="4"/>
    <path d="M618 130 562 294H756L712 130Z" fill="#fff2c7" opacity=".3"/>
    <path d="M613 280H763" stroke="#b59065" stroke-width="11"/><path d="M625 284v22M751 284v22" stroke="#b59065" stroke-width="7"/>
    <path d="M620 253h25v21h-25Z" fill="#dbb66b"/><path d="M622 248h21v6h-21Z" fill="#f1d697"/>
    <path d="M735 251h15v23h-15Z" fill="#8eb4ad"/>
    <ellipse cx="390" cy="453" rx="258" ry="37" fill="#e1b99a" opacity=".55"/>
    <ellipse cx="379" cy="453" rx="241" ry="25" fill="none" stroke="#efceb0" stroke-width="4"/>
    <path d="M171 331H606V354H171Z" fill="#bf9466" stroke="#95744f" stroke-width="3"/>
    <path d="M185 354H592V377H185Z" fill="#d5b182" stroke="#ab895e" stroke-width="3"/>
    <path d="M194 377v80M580 377v80" stroke="#a78156" stroke-width="17"/>
    <path d="M202 416H572" stroke="#b18b5f" stroke-width="11"/>
    <path d="M224 358h132v15H224M403 358h132v15H403" fill="#c6a170" stroke="#ad885c" stroke-width="2"/>
    <path d="M278 364h26M455 364h26" stroke="#7d8170" stroke-width="5"/>
    <path d="M176 333h433" stroke="#e2bf8e" stroke-width="5"/>
    <path d="M366 285h38v44h-38Z" fill="#e2ba77" stroke="#b38e55" stroke-width="2"/>
    <path d="M374 289v-32M383 286v-43M394 286l9-35" stroke="#a98355" stroke-width="5"/>
    <path d="M370 258v-15h8v15M379 244v-13h8v13M400 253l4-12 7 2-4 13" fill="#7faaa5"/>
    <path d="M540 316h41l-7 13h-34Z" fill="#efe1b9" stroke="#b1a078" stroke-width="2"/><path d="M547 315v-15h20v15" fill="#d79c7b"/>
    <path d="M40 457h133v26H40Z" fill="#bd9a73"/><path d="M48 452h117v30H48Z" fill="#9eb6a1"/>
    <path d="M633 434h111v26H633Z" fill="#bf9c72"/>
    <path d="M638 461v28M734 461v28" stroke="#ac895f" stroke-width="12"/>
    <path d="M570 468q15-21 24-5t20 0M280 465q10-17 18-5t15-1" fill="none" stroke="#ceab77" stroke-width="4"/>
    <path d="M64 339q-12-30-2-46m5 41q10-25 23-29" fill="none" stroke="#84a37b" stroke-width="4"/>
    <path d="M48 331h39l-5 31H54Z" fill="#cf9471"/>
    ${leaf(61, 315, -45, .6, '#8fab7e')}${leaf(71, 327, 52, .6)}
    ${P('clock', v => `<circle r="30" fill="#87aaac" stroke="#5e878d" stroke-width="3"/><circle r="24" fill="#fff4d5"/>${[0, 90, 180, 270].map(a => `<path d="M0-21v4" transform="rotate(${a})" stroke="#9f946f" stroke-width="2"/>`).join('')}<path d="M0 13V0L${v ? '12-10' : '-11-10'}" fill="none" stroke="#536d74" stroke-width="4"/><circle r="3" fill="#d99972"/>`)}
    ${P('apron', v => `<path d="M-11-27q10-13 22 0l6 14 12 7-5 35h-48l-5-35 12-7Z" fill="#82aaa9" stroke="#5c898b" stroke-width="2"/><path d="M-10-27q10 11 20 0" fill="none" stroke="#bed5c6" stroke-width="3"/>${v ? '<path d="M-14 4H14V18Q0 27-14 18Z" fill="#e6c37c"/>' : '<path d="M-14 4H14V22H-14Z" fill="#e6c37c"/>'}<path d="M-13 7H13" stroke="#f5dfa5" stroke-width="2"/>`)}
    ${P('toolbox', v => `<path d="M-34-7h68v28h-68Z" fill="#c87f68" stroke="#9f6654" stroke-width="2"/><path d="M-38-7h76v9h-76Z" fill="#e5a180"/><path d="${v ? 'M-18-8v-13h36v13' : 'M-18-8q18-25 36 0'}" fill="none" stroke="#8d7354" stroke-width="6"/><path d="M-4 0H4V9H-4Z" fill="#e8c17a"/><path d="M-26 8v7M25 8v7" stroke="#edb695" stroke-width="3"/>`)}
    ${P('toy-car', v => `<path d="M-35 5-30-7-11-8-3-22 22-19 29-4 36 1v16h-71Z" fill="${v ? '#a39ac6' : '#8cb0a2'}" stroke="#5f7e78" stroke-width="2"/><path d="M1-17h16l6 13H-7Z" fill="#e7efd8"/><path d="M9-17V-4" stroke="#6f9090" stroke-width="2"/><circle cx="-22" cy="16" r="10" fill="#566e73"/><circle cx="22" cy="16" r="10" fill="#566e73"/><circle cx="-22" cy="16" r="4" fill="#e5c88e"/><circle cx="22" cy="16" r="4" fill="#e5c88e"/><path d="M-33 1h6M30 4h6" stroke="#efd28d" stroke-width="4"/>`)}
    ${P('paint', v => `<path d="M-22-15h44v36q-22 10-44 0Z" fill="#8cabb1" stroke="#617f8a" stroke-width="2"/><ellipse cy="-15" rx="22" ry="7" fill="#d8e3cc"/><path d="M-22-10q0-37 44 0" fill="none" stroke="#6a8382" stroke-width="3"/><rect x="-15" y="-5" width="30" height="23" rx="2" fill="#fff0c9"/>${v ? '<path d="M0-1Q-16 16 0 16T0-1" fill="#bd8dac"/>' : '<path d="M0-1Q-16 16 0 16T0-1" fill="#d7926b"/>'}`)}
    ${P('lamp', v => `<path d="M-19-19H19L36 16H-36Z" fill="${v ? '#7ea9ad' : '#d7aa65'}" stroke="#967f59" stroke-width="2"/><ellipse cy="17" rx="36" ry="7" fill="#f9e6b5"/><path d="M-9-16-18 10" stroke="#fff0cc" stroke-width="4" opacity=".6"/>`)}
    ${P('spools', v => `<path d="M-19-18h38v7h-38ZM-19 15h38v7h-38Z" fill="#d6ad76" stroke="#ab895c" stroke-width="2"/><path d="M-14-11h28v26h-28Z" fill="${v ? '#89b2b4' : '#ce9394'}"/><path d="M-13-4H13M-13 2H13M-13 8H13" stroke="${v ? '#bbd0c6' : '#e6b1ac'}" stroke-width="2"/>`)}
    ${P('robot', v => `<path d="M0-25v-8" stroke="#7d8b7c" stroke-width="3"/>${v ? '<path d="m0-37 5 5-5 5-5-5Z" fill="#d4946f"/>' : '<circle cy="-32" r="5" fill="#d4946f"/>'}<rect x="-17" y="-25" width="34" height="26" rx="6" fill="#b1c3ad" stroke="#738d83" stroke-width="2"/><circle cx="-7" cy="-13" r="3" fill="#526d74"/><circle cx="7" cy="-13" r="3" fill="#526d74"/><path d="M-7-5H7" stroke="#6f8e86" stroke-width="2"/><rect x="-14" y="4" width="28" height="22" rx="3" fill="#82a9ac"/><path d="M-14 9-25 19M14 9 25 19M-8 26v7M8 26v7" stroke="#a3bba7" stroke-width="6"/><circle cy="14" r="4" fill="#e8c273"/>`)}
    ${P('window', v => `<path d="M0 8V-13M0-3l-14-9" stroke="#688f68" stroke-width="3"/>${leaf(-1, 0, 50, .4, '#89a974')}${flower(0, -20, '#e5ad7a', .7)}<path d="M-18 6H18L13 28H-13Z" fill="#ce8e70" stroke="#a57558" stroke-width="2"/>${v ? '<path d="M-14 15H14" stroke="#f2d79e" stroke-width="5"/>' : '<circle cx="-7" cy="17" r="3" fill="#f2d79e"/><circle cx="7" cy="17" r="3" fill="#f2d79e"/>'}`)}
    ${P('blocks', v => `<rect x="-34" y="-2" width="26" height="26" rx="3" fill="${v ? '#e4bd71' : '#88acac'}" stroke="#9a956f" stroke-width="2"/><rect x="-5" y="-2" width="26" height="26" rx="3" fill="${v ? '#88acac' : '#e4bd71'}" stroke="#9a956f" stroke-width="2"/><path d="m-22-7 15-20L8-7Z" fill="#ce9079" stroke="#a87564" stroke-width="2"/><circle cx="31" cy="15" r="10" fill="#b2a2c2" stroke="#9587a7" stroke-width="2"/>`)}
    ${P('ruler', v => `<g transform="rotate(-14)"><path d="M-14-28H14V28H-14Z" fill="#efd18d" stroke="#b3955c" stroke-width="2"/><circle cy="-20" r="3" fill="#bd9f67"/><path d="${v ? 'M-13-9H8M-13 5H8M-13 19H8' : 'M-13-9H8M-13 0H1M-13 10H8M-13 19H1'}" stroke="#9d875b" stroke-width="3"/></g>`)}
    ${P('rocking-horse', v => `<path d="M-29 22q29 20 58 0" fill="none" stroke="#a57d54" stroke-width="6"/><path d="M-16 19V2M13 19V2" stroke="#b38d60" stroke-width="5"/><path d="M-24-2q0-13 26-12l5-17 17 8 4 12-13 1-1 19h-33Z" fill="#d5ac73" stroke="#a07d54" stroke-width="2"/><path d="M5-28q-12 9-9 22" fill="none" stroke="${v ? '#b66f62' : '#846c52'}" stroke-width="7"/><circle cx="18" cy="-20" r="2" fill="${ink}"/><path d="M-24-7q-14-1-10 15" fill="none" stroke="#927452" stroke-width="5"/><path d="M-12-8H5V2H-12Z" fill="#83a4a5"/>`)}
  `;
}

function greenhouse(P, prefix) {
  return `
    <rect width="800" height="520" fill="#d9e4ce"/>
    <path d="M22 356V94Q400-99 778 94V356Z" fill="url(#${prefix}-sky)"/>
    ${cloud(390, 61, .75)}
    <path d="M26 220Q119 145 222 203T432 198T775 177V356H26Z" fill="#b9d1a9"/>
    <path d="M26 292Q185 221 333 277T775 232V356H26Z" fill="#a4c49d"/>
    <path d="M25 110Q400-74 775 110M25 225H775M25 348H775" fill="none" stroke="#f2edcf" stroke-width="12"/>
    <path d="M24 357V95Q400-90 776 95V357M194 31V350M397 0V352M600 31V352" fill="none" stroke="#91aba0" stroke-width="10"/>
    <path d="M32 352H768V520H32Z" fill="url(#${prefix}-tile)"/>
    <path d="M0 350H800V364H0Z" fill="#b4b7a1"/>
    <path d="M110 46v25M300 42v22" stroke="#839e8e" stroke-width="3"/>
    <path d="M422 135q51-31 117-9" fill="none" stroke="#8ca57e" stroke-width="6"/>
    ${leaf(522, 125, 50, .65, '#93b38d')}${leaf(437, 128, -50, .5, '#93b38d')}
    <path d="M39 313H752V331H39Z" fill="#d0b080" stroke="#ab9069" stroke-width="3"/>
    <path d="M52 331v58M233 331v53M580 331v58M741 331v59" stroke="#ac956f" stroke-width="12"/>
    <path d="M51 361h688" stroke="#bda57d" stroke-width="6"/>
    <path d="M251 306h74l-7-46h-60Z" fill="#cb9678"/>
    <path d="M287 270q-25-42-13-85M282 238q30-39 45-39" fill="none" stroke="#6b926d" stroke-width="4"/>
    ${leaf(280, 248, -55, .8, '#77a47c')}${leaf(289, 243, 65, .8, '#8eb58b')}${leaf(275, 210, -30, .6)}
    <path d="M434 309h61l-8-47h-45Z" fill="#a0babc" stroke="#759a9b" stroke-width="2"/>
    <path d="M464 263V196M464 233l-28-28M465 220l31-32M464 233l10 22" stroke="#9b9466" stroke-width="5"/>
    <path d="M416 189q-9-25 14-37 12-24 39-10 30-18 49 5 29 17 9 41 8 27-22 31-30 18-44-4-34 19-45-5Z" fill="#7da87d"/>
    ${leaf(444, 181, -45, .65, '#a3c291')}${leaf(494, 162, 45, .7, '#a3c291')}
    <ellipse cx="438" cy="182" rx="8" ry="11" transform="rotate(25 438 182)" fill="#e7c978"/>
    <path d="M557 305h39l4-31h-47Z" fill="#e2bc7d"/>
    ${sprig(576, 273, .9)}
    <path d="M172 305h43l-5-35h-33Z" fill="#91aba9" stroke="#6d918f" stroke-width="2"/>
    <path d="M192 271V216" stroke="#78965f" stroke-width="4"/>
    ${leaf(192, 256, -64, .6, '#9fb777')}${leaf(193, 243, 55, .7, '#a8bd7e')}${leaf(192, 232, -35, .7, '#8aa86a')}
    <path d="M719 313q-3-54 24-81M726 280q-28-29-29-53" fill="none" stroke="#62886b" stroke-width="4"/>
    ${leaf(737, 252, 38, .8, '#78a27f')}${leaf(716, 265, -48, .7, '#8bb38a')}${leaf(723, 287, -60, .7, '#83a97f')}
    <path d="M708 307h42l-5 14h-32Z" fill="#c79173"/>
    <path d="M63 210q-37-47-20-92M53 183q22-32 33-35" fill="none" stroke="#76976d" stroke-width="4"/>
    ${leaf(49, 171, -40, .7, '#8fb584')}${leaf(59, 188, 49, .8, '#8fb584')}${leaf(47, 145, -20, .6, '#82aa7a')}
    ${shadow(205, 441, 44, 10)}
    <path d="M170 380h68l-9 60h-50Z" fill="#cf9b78" stroke="#a67c59" stroke-width="2"/>
    <path d="M168 378h72v13h-72Z" fill="#e0b18c"/>
    <path d="M182 398h43M184 408h39M187 418h33" stroke="#b48361" stroke-width="3"/>
    ${sprig(203, 378, 1.1)}${leaf(200, 353, -60, .9, '#8daf7c')}
    <path d="M359 397q19-25 59-6l11 63q-39 17-77 0Z" fill="#d1b78c" stroke="#ab956e" stroke-width="2"/>
    <path d="M360 400q26 14 60-4" fill="none" stroke="#b09a73" stroke-width="3"/>
    <path d="M369 411h38v29h-38Z" fill="#f1e5bd"/><path d="M388 438v-17" stroke="#88a16f" stroke-width="3"/>${leaf(388, 432, 50, .35, '#88a16f')}${leaf(388, 426, -50, .35, '#88a16f')}
    <path d="M434 465q34-23 61-6" fill="none" stroke="#9e9774" stroke-width="3"/>
    <ellipse cx="457" cy="459" rx="5" ry="3" fill="#978564"/><ellipse cx="470" cy="454" rx="3" ry="2" fill="#978564"/>
    <path d="M558 455h59v-50h-59Z" fill="#b89a72" stroke="#957e5e" stroke-width="2"/>
    <path d="M558 418h59M558 434h59M569 405v50M605 405v50" stroke="#d6bc92" stroke-width="4"/>
    <path d="M576 402q-10-34 6-34t14 34" fill="#e2bd78" stroke="#aa905e" stroke-width="2"/>
    <path d="M581 375h9" stroke="#f5dba6" stroke-width="4"/>
    <path d="M756 408q-18-2-16-18 2-12 16-13q15 7 7 18Z" fill="#acc298"/>
    <path d="M757 408v23" stroke="#8aa17c" stroke-width="3"/>
    <path d="M73 487q15-15 28-4M538 485q16-12 24-1" fill="none" stroke="#c0c4a4" stroke-width="4"/>
    ${P('hanging-pot', v => `<path d="M-25 8-12-28M25 8 12-28M-12-28q12-10 24 0" fill="none" stroke="#8a9a7e" stroke-width="2"/>${leaf(0, 8, -35, .7, '#78a87d')}${leaf(0, 10, 45, .8, '#91b58c')}<path d="M-27 7h54l-8 25h-38Z" fill="${v ? '#8eb3b5' : '#d0a078'}" stroke="#8d9376" stroke-width="2"/><path d="M-24 14h48" stroke="#f2dfb0" stroke-width="4"/>`)}
    ${P('orchid', v => `<path d="M0 29Q-10 0 7-19" fill="none" stroke="#6e966c" stroke-width="4"/><g transform="translate(5 -9)">${flower(0, 0, v ? '#e9be76' : '#c09bbd', 1.25)}<path d="M-7 3q7 15 14 0Z" fill="${v ? '#d79963' : '#a57ca1'}"/><circle r="4" fill="#fff1c4"/></g>`)}
    ${P('watering-can', v => `<path d="M-19-11q-25-30-25-1 0 14 20 16" fill="none" stroke="#718f88" stroke-width="5"/><path d="M-27-16h39l6 38h-39Z" fill="#94b8ac" stroke="#718f88" stroke-width="2"/><path d="m10-1 22-16 6 8-24 23" fill="#94b8ac" stroke="#718f88" stroke-width="2"/><path d="${v ? 'M27-22 42-8' : 'M30-19 39-11'}" stroke="#d4b67c" stroke-width="7"/><ellipse cx="-7" cy="-16" rx="19" ry="5" fill="#d2dfbd"/><path d="M-14-6v20" stroke="#bfd0b7" stroke-width="4"/>`)}
    ${P('boots', v => `<path d="M-28-25h22v33l11 8v10h-35v-15Z" fill="${v ? '#d6a665' : '#8b9fbe'}" stroke="#7a8584" stroke-width="2"/><path d="M7-21h21V9l10 9v10H5V13Z" fill="${v ? '#e1b575' : '#9baec8'}" stroke="#7a8584" stroke-width="2"/><path d="M-29 25H5M5 28H38" stroke="#7c8e83" stroke-width="4"/><path d="M-28-19H-7M7-15H28" stroke="#e5e5c8" stroke-width="4"/>`)}
    ${P('cactus', v => `<path d="M-12 10q-24-1-20-22 2-10 10-3v9h10M10 0q21 3 18-14-3-8-9-2v5h-8" fill="#8eac7a" stroke="#698c64" stroke-width="2"/><path d="M-15 17v-32q15-23 30 0v32" fill="#92b17e" stroke="#698c64" stroke-width="2"/><path d="M-6-19V14M5-19V14" stroke="#bed0a0" stroke-width="2"/><path d="M-23 14h46l-5 20h-36Z" fill="#d9ac80" stroke="#b18c64" stroke-width="2"/>${v ? flower(0, -25, '#e0a5ae', .65) : flower(0, -25, '#f1d389', .65)}`)}
    ${P('butterfly', v => `<path d="M0 3Q-31-34-28-3Q-28 25-2 12M0 3Q31-34 28-3Q28 25 2 12" fill="${v ? '#b39cc5' : '#dfa578'}" stroke="#99846d" stroke-width="2"/><path d="M0-9V18M-1-8-7-15M1-8 7-15" stroke="#668775" stroke-width="3"/><circle cx="-15" cy="-3" r="6" fill="#fae5b3"/><circle cx="15" cy="-3" r="6" fill="#fae5b3"/>`)}
    ${P('bird', v => `<path d="M-20 5Q-24-14-8-14Q3-25 14-12l12 6-11 8Q6 23-13 16l-17 8Z" fill="#d6b471" stroke="#a39369" stroke-width="2"/><path d="M-17 0Q-2-11 6 1-2 17-17 0" fill="${v ? '#8fa9b0' : '#b79561'}"/><path d="m18-9 13 3-13 3" fill="#cd9270"/><circle cx="10" cy="-10" r="2" fill="${ink}"/><path d="M-5 18v6M4 17v6" stroke="#9c8d67" stroke-width="2"/>`)}
    ${P('labels', v => `<path d="M-23-24H23V26H-23Z" fill="#faebbf" stroke="#baa47b" stroke-width="2"/><path d="M-23-24 0-14 23-24" fill="#eed49c"/><path d="M-15 18H15" stroke="#c7b183" stroke-width="2"/>${v ? '<path d="M-5-8 11-3-8 12Z" fill="#d59669"/><path d="m4-6 1-8m3 9 5-7" stroke="#88a56c" stroke-width="3"/>' : '<circle cy="0" r="10" fill="#d18b71"/><path d="m-8-5 8 3 7-5-7 1-3-7v8Z" fill="#8aa46b"/>'}`)}
    ${P('lemon', v => `<path d="M-11-20 0-9" stroke="#769567" stroke-width="3"/>${leaf(-5, -12, -52, .45, '#90b482')}${v ? '<circle cy="7" r="16" fill="#e4a56b" stroke="#bd985e" stroke-width="2"/>' : '<path d="M-18 6Q-13-12 5-9L19 8Q12 24-5 24Z" fill="#ead179" stroke="#bca964" stroke-width="2"/>'}<path d="M-8 3q-4 6-1 10" fill="none" stroke="#f8e6a5" stroke-width="3"/>`)}
    ${P('snail', v => `<path d="M-27 16Q-18 8 17 11L23-1 29 0l1 18q-27 9-57-2" fill="#a2af80" stroke="#819567" stroke-width="2"/><circle cx="-4" cy="0" r="18" fill="#d7b47d" stroke="#af9062" stroke-width="2"/>${v ? '<path d="M-16-7-3-16 11-5 7 12-9 14-14 3-3-6 5-1 0 6" fill="none" stroke="#ae8c60" stroke-width="3"/>' : '<path d="M7 12q-22 10-24-9-1-19 16-16 18 7 7 18-12 8-14-3-2-7 5-6" fill="none" stroke="#ae8c60" stroke-width="3"/>'}<path d="M24 0 22-8M29 1 33-7" stroke="#819567" stroke-width="2"/><circle cx="22" cy="-8" r="2" fill="${ink}"/><circle cx="33" cy="-7" r="2" fill="${ink}"/>`)}
    ${P('thermometer', v => `<rect x="-12" y="-29" width="24" height="58" rx="9" fill="#f9eccb" stroke="#a89e7b" stroke-width="2"/><path d="M-3 18V-21" stroke="#d2d9c1" stroke-width="5"/><path d="M-3 18V${v ? -12 : 0}" stroke="#ce8e77" stroke-width="5"/><circle cx="-3" cy="19" r="5" fill="#ce8e77"/><path d="M5-17h4M5-7h4M5 3h4M5 13h4" stroke="#a8a07d" stroke-width="2"/>`)}
    ${P('trowel', v => `<g transform="rotate(42)"><path d="M-4-4v-20q4-9 8 0v20" fill="${v ? '#8babb3' : '#ce9875'}" stroke="#938873" stroke-width="2"/><path d="M-11 0H11V11L0 29-11 11Z" fill="#a7bbb0" stroke="#7a9991" stroke-width="2"/><path d="M0 3v19" stroke="#c7d1bc" stroke-width="3"/></g>`)}
  `;
}

const renderers = { picnic, harbor, workshop, greenhouse };

export function renderDifferenceScene(sceneId, changedIds = [], prefix = 'scene') {
  const scene = DIFFERENCE_SCENES.find(item => item.id === sceneId) || DIFFERENCE_SCENES[0];
  const safePrefix = String(prefix).replace(/[^a-zA-Z0-9_-]/g, '-') || 'scene';
  const selected = new Set(changedIds);
  const P = (id, draw) => {
    const { area } = scene.differences.find(item => item.id === id);
    const clipId = `${safePrefix}-area-${id}`;
    // Local clipping makes the painted difference exactly bounded by the hit
    // ellipse, including antialiased strokes. Art has comfortable inner margins.
    return `<g data-difference-id="${id}" transform="translate(${area.x * 8} ${area.y * 5.2})"><defs><clipPath id="${clipId}"><ellipse rx="${area.rx * 8}" ry="${area.ry * 5.2}"/></clipPath></defs><g clip-path="url(#${clipId})">${draw(selected.has(id))}</g></g>`;
  };
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 520" role="img" aria-labelledby="${safePrefix}-title ${safePrefix}-desc" class="differences-scene"><title id="${safePrefix}-title">${scene.name}</title><desc id="${safePrefix}-desc">${scene.subtitle}. Részletgazdag rajz a különbségkereső játékhoz.</desc><defs>
    <linearGradient id="${safePrefix}-sky" x2="0" y2="1"><stop stop-color="#c6e3e4"/><stop offset="1" stop-color="#eef1d9"/></linearGradient>
    <linearGradient id="${safePrefix}-water" x2="0" y2="1"><stop stop-color="#a3cfce"/><stop offset="1" stop-color="#76aeb6"/></linearGradient>
    <pattern id="${safePrefix}-picnic" width="54" height="48" patternUnits="userSpaceOnUse"><rect width="54" height="48" fill="#e8b4a2"/><path d="M27 0V48M0 24H54" stroke="#f6dac0" stroke-width="19"/><path d="M27 0V48M0 24H54" stroke="#fff0d3" stroke-width="3" opacity=".6"/></pattern>
    <pattern id="${safePrefix}-wood" width="120" height="18" patternUnits="userSpaceOnUse"><rect width="120" height="18" fill="#c9a87c"/><path d="M0 17H120" stroke="#b29266" stroke-width="2"/><path d="M10 8q22-5 45 0M77 9h27" fill="none" stroke="#dcc095" stroke-width="2"/></pattern>
    <pattern id="${safePrefix}-floor" width="180" height="45" patternUnits="userSpaceOnUse"><rect width="180" height="45" fill="#dfc89d"/><path d="M0 44H180M0 0V45" stroke="#c6ac7d" stroke-width="2"/><path d="M29 16h34M107 29h43" stroke="#e8d5ae" stroke-width="3"/></pattern>
    <pattern id="${safePrefix}-tile" width="100" height="60" patternUnits="userSpaceOnUse"><rect width="100" height="60" fill="#e5dbc0"/><path d="M0 0H100V60H0Z" fill="none" stroke="#c9c6aa" stroke-width="2"/><path d="M7 7h86v46H7Z" fill="none" stroke="#eee5cb" stroke-width="2"/></pattern>
  </defs><g stroke-linecap="round" stroke-linejoin="round">${renderers[scene.id](P, safePrefix)}</g></svg>`;
}
