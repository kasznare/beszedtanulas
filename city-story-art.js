// Original, code-drawn illustrations for A film utolsó jelenete.
// All input that reaches SVG markup is selected from fixed values or sanitized.
const C = {
  cream: '#fbf3df', paper: '#fff9e9', ink: '#344b52', muted: '#637a7a',
  teal: '#437f7a', tealLight: '#9bc4b5', green: '#467962',
  blue: '#4d7890', blueLight: '#8eafbc', red: '#b95e50',
  terra: '#ce8669', gold: '#e6b967', wall: '#ead9b8',
  stone: '#c9baa0', pavement: '#b6a996', brown: '#735e4d',
};

const safePrefix = value => String(value ?? 'city-story').replace(/[^a-zA-Z0-9_-]/g, '-').slice(0, 64) || 'city-story';
const safeId = value => String(value ?? '').replace(/[^a-zA-Z0-9_-]/g, '-').slice(0, 40);
const hash = value => {
  let h = 2166136261;
  for (const ch of value) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  return (h >>> 0).toString(36);
};
const group = (x, y, content, scale = 1, extra = '') => `<g transform="translate(${x} ${y}) scale(${scale})" ${extra}>${content}</g>`;
const line = (x1, y1, x2, y2, color = C.ink, width = 3, extra = '') => `<path d="M${x1} ${y1}L${x2} ${y2}" fill="none" stroke="${color}" stroke-width="${width}" stroke-linecap="round" ${extra}/>`;
const shadow = (x, y, rx, ry) => `<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" fill="${C.ink}" opacity=".11"/>`;
const cloud = (x, y, s = 1) => group(x, y, '<path d="M-48 10Q-59-8-40-18Q-27-39-4-22Q11-40 33-18Q57-18 60 3Q64 17 44 17H-38Q-51 17-48 10Z" fill="#fffdf2" opacity=".85"/>', s);
const brick = (x, y, w, h) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="2" fill="none" stroke="#cfbea0" stroke-width="2" opacity=".75"/>`;
const leaf = (x, y, rotate = 0, color = '#709a77', s = 1) => `<g transform="translate(${x} ${y}) rotate(${rotate}) scale(${s})"><path d="M0 0Q-16-19 0-31Q17-18 0 0Z" fill="${color}"/><path d="M0-1V-26" stroke="#547c63" stroke-width="1.6"/></g>`;
const pot = (x, y, s = 1) => group(x, y, `<path d="M-21-20h42l-5 35h-32Z" fill="${C.terra}" stroke="#a86d56" stroke-width="2"/><path d="M-23-22h46v7h-46Z" fill="#dda385"/><path d="M0-20v-40M0-45l-16-14M0-35l15-20" stroke="${C.green}" stroke-width="3"/>${leaf(-15,-52,-36)}${leaf(15,-49,35)}${leaf(0,-59,5,'#8cae74',.8)}`, s);
const paving = (top = 352) => `<path d="M0 ${top}H800V460H0Z" fill="#d7c9ae"/>${[top+28,top+66,top+101].map(y=>`<path d="M0 ${y}H800" stroke="#c1b297" stroke-width="2"/>`).join('')}${[85,225,380,560,705].map((x,i)=>`<path d="M${x+(i%2)*45} ${top}v108" stroke="#c1b297" stroke-width="2" opacity=".55"/>`).join('')}`;

function building({old = false, open = false, wide = false} = {}) {
  const gate = old ? C.blue : C.green;
  const gateX = wide ? 316 : 285;
  const gateW = wide ? 214 : 230;
  const n = old ? '12' : '18';
  return `<path d="M0 40H800V355H0Z" fill="#ecddc0"/>
    <path d="M0 53H800M0 87H800M0 324H800" stroke="#d6c39f" stroke-width="8"/>
    ${[27,150,615,737].map(x=>`<path d="M${x} 88v238" stroke="#d8c7aa" stroke-width="5" opacity=".65"/>`).join('')}
    ${brick(18,115,99,41)}${brick(668,130,89,39)}${brick(53,243,94,40)}${brick(660,248,86,39)}
    <path d="M${gateX-16} 136h${gateW+32}v220h-${gateW+32}Z" fill="#d2bc97"/>
    <path d="M${gateX-5} 142h${gateW+10}v216h-${gateW+10}Z" fill="#faf1d9"/>
    ${open ? `<path d="M${gateX+8} 169h${gateW-16}v188h-${gateW-16}Z" fill="#b6cfbd"/><path d="M${gateX+8} 354q106-39 ${gateW-16} 0" fill="#c6b394"/><path d="M${gateX+gateW/2} 178v176" stroke="#71908a" stroke-width="5"/>` : ''}
    <path d="M${gateX+8} 168q${gateW/2-8}-54 ${gateW-16} 0" fill="none" stroke="${C.ink}" stroke-width="7"/>
    <path d="M${gateX+8} 169h${gateW-16}" stroke="${C.ink}" stroke-width="6"/>
    ${ironLeaves(gateX, gateW)}
    ${open ? `<path d="M${gateX+8} 174  ${gateX-57} 190v181l65-19Z" fill="${gate}" stroke="${C.ink}" stroke-width="4"/><path d="M${gateX+gateW-8} 174l65 16v181l-65-19Z" fill="${gate}" stroke="${C.ink}" stroke-width="4"/>` : `<path d="M${gateX+8} 177h${gateW-16}v179h-${gateW-16}Z" fill="${gate}" stroke="${C.ink}" stroke-width="5"/><path d="M${gateX+gateW/2} 178v178" stroke="#345b61" stroke-width="4"/><path d="M${gateX+30} 205v125M${gateX+gateW-30} 205v125" stroke="${old ? '#86aab5':'#7ca88c'}" stroke-width="3"/><circle cx="${gateX+gateW/2-12}" cy="277" r="5" fill="${C.gold}"/>`}
    <path d="M${gateX+gateW/2-25} 112h50v40h-50Z" fill="#faf6dc" stroke="#988c70" stroke-width="3"/><text x="${gateX+gateW/2}" y="140" text-anchor="middle" font-family="Georgia,serif" font-size="26" font-weight="bold" fill="${C.ink}">${n}</text>
    ${archedWindow(76,207)}
    <path d="M630 199h102v108H630Z" fill="#9dc6c1" stroke="#f9f0d6" stroke-width="10"/><path d="M681 202v102M632 254h98" stroke="#f9f0d6" stroke-width="7"/><path d="M640 268q28-17 48 11 16-19 39-9v33h-87Z" fill="#b8cc9f"/>`;
}
function ironLeaves(x, w) {
  const cx=x+w/2;
  return `<path d="M${cx} 168v-52M${cx-51} 164q9-35 49-48M${cx+51} 164q-9-35-49-48" stroke="${C.ink}" stroke-width="4" fill="none" stroke-linecap="round"/>
    <path d="M${cx} 119q-13-17 0-25 13 8 0 25ZM${cx-35} 132q-21-13-24 4 15 13 24-4ZM${cx+35} 132q21-13 24 4-15 13-24-4Z" fill="${C.ink}"/>`;
}
function archedWindow(x,y) {
  return `<path d="M${x} ${y+98}v-63a52 52 0 0 1 104 0v63Z" fill="#e6d5ae" stroke="#b59d77" stroke-width="7"/>
    <path d="M${x+8} ${y+90}v-57a44 44 0 0 1 88 0v57Z" fill="#a3bfbd" stroke="${C.ink}" stroke-width="4"/>
    <path d="M${x+52} ${y-9}v99M${x+8} ${y+38}h88" stroke="#f9efd6" stroke-width="6"/>
    <path d="M${x-3} ${y+100}h111" stroke="#baa27f" stroke-width="10"/>
    <path d="M${x+8} ${y+11}q5-13 11-16" stroke="#f6e9cf" stroke-width="7"/>`;
}

function bench(color='red', puppet=false) {
  const fill = color === 'blue' ? '#6d9bb0' : C.red;
  const light = color === 'blue' ? '#a4c5cb' : '#e49677';
  return `<g>
    <path d="M-100-52h200v20h-200Z" fill="${fill}" stroke="${C.ink}" stroke-width="3"/>
    <path d="M-93-28h186v12H-93Z" fill="${light}"/>
    <path d="M-102-10h204v20h-204Z" fill="${fill}" stroke="${C.ink}" stroke-width="3"/>
    <path d="M-81 10v69M80 10v69" stroke="#765d4e" stroke-width="14"/>
    <path d="M-83 42h164" stroke="#765d4e" stroke-width="8"/>
    <path d="M67 34l13-8v16l-13 8 13 8v18" fill="${C.gold}" stroke="${C.ink}" stroke-width="2"/>
    <path d="M65 39l15 13M65 56l15-13" stroke="#916d49" stroke-width="2"/>
    <path d="M-76 69h-16M77 69h17" stroke="#5d4c43" stroke-width="6"/>
    ${puppet ? `<path d="M-83-69v-34h166v34" fill="none" stroke="#715849" stroke-width="8"/><path d="M-80-99h160v34q-37-22-80 0-42-22-80 0Z" fill="${C.terra}"/><path d="M0-96v37" stroke="#f4d7b7" stroke-width="4"/>` : ''}
  </g>`;
}
function wheel(x,y,r=23) { return `<circle cx="${x}" cy="${y}" r="${r}" fill="none" stroke="${C.ink}" stroke-width="5"/><circle cx="${x}" cy="${y}" r="3" fill="${C.terra}"/>${[0,45,90,135].map(a=>`<path d="M${x-r+3} ${y}h${2*r-6}" transform="rotate(${a} ${x} ${y})" stroke="#769b9a" stroke-width="2"/>`).join('')}`; }
function bicycle(x,y,s=1) { return group(x,y,`${wheel(-40,0,27)}${wheel(48,0,27)}<path d="M-40 0-11-40 8 0-40 0 5-40 48 0H8M5-40l-8-13h20M45-3l-8-49h19" fill="none" stroke="${C.teal}" stroke-width="5" stroke-linejoin="round"/><path d="M-18-53h27M36-52h22" stroke="${C.ink}" stroke-width="5"/>`,s); }
function cart(x,y,s=1, moving=false) { return group(x,y,`<path d="M-60-60h120l-8 62H-51Z" fill="#b8885f" stroke="${C.ink}" stroke-width="3"/><path d="M-53-47h106M-50-24h100M-28-56v53M20-56v53" stroke="#ddba83" stroke-width="4"/><path d="M61-49l24-12v91" fill="none" stroke="${C.ink}" stroke-width="6"/><circle cx="-37" cy="18" r="15" fill="${C.ink}"/><circle cx="43" cy="18" r="15" fill="${C.ink}"/><circle cx="-37" cy="18" r="6" fill="${C.gold}"/><circle cx="43" cy="18" r="6" fill="${C.gold}"/>${moving?'<path d="M-70-28h-18M-72-3h-22" stroke="#71918c" stroke-width="3"/>':''}`,s); }
function person(name, x, y, s=1, pose='stand') {
  const people={
    Mira:{skin:'#b87b58',hair:'#3f3431',top:'#dfaa66',trouser:'#577e80',style:'curl'},
    Dani:{skin:'#c18e69',hair:'#4b4038',top:'#729b8e',trouser:'#505c60',style:'short'},
    Eszter:{skin:'#d0a37a',hair:'#57443a',top:'#b56b60',trouser:'#555b63',style:'bun'},
    Juli:{skin:'#b78062',hair:'#77736d',top:'#806f91',trouser:'#59656b',style:'short'},
    Zsofi:{skin:'#e0aa80',hair:'#4b3937',top:'#6a879a',trouser:'#4b5960',style:'long'},
  };
  const p=people[name]||people.Mira;
  const kid=name==='Mira';
  const body=kid?44:51, head=kid?14:15;
  const arm = pose==='point' ? `<path d="M-18-94l-18 16M18-94l33-15" stroke="${p.skin}" stroke-width="9" stroke-linecap="round"/>` : pose==='carry' ? `<path d="M-17-94l-17 30M17-94l25 25" stroke="${p.skin}" stroke-width="9" stroke-linecap="round"/>` : `<path d="M-18-94l-12 37M18-94l12 37" stroke="${p.skin}" stroke-width="9" stroke-linecap="round"/>`;
  return group(x,y,`${shadow(0,3,27,6)}<path d="M-13-52l-3 48M13-52l3 48" stroke="${p.trouser}" stroke-width="14" stroke-linecap="round"/><path d="M-22-2h18M5-2h18" stroke="#50483f" stroke-width="7" stroke-linecap="round"/><path d="M-17-105q17-15 34 0l4 56h-42Z" fill="${p.top}" stroke="${C.ink}" stroke-width="2"/>${arm}<path d="M-5-120v18h10v-18" fill="${p.skin}"/><ellipse cy="-137" rx="${head}" ry="19" fill="${p.skin}"/><path d="${p.style==='bun'?'M-16-142q-8-32 19-28 24 1 17 31l-7-13q-16-8-28 6Z':p.style==='long'?'M-17-137q-3-36 17-35 27 2 18 37l5 28h-12l-5-39q-10 5-23 3l-1 36h-11Z':p.style==='curl'?'M-17-139q-9-18 3-28 12-12 26-5 18 7 8 30l-8-12q-14 4-27 2Z':'M-15-144q-1-30 23-26 15 1 13 22l-11-9q-16 4-25 13Z'}" fill="${p.hair}"/><circle cx="-5" cy="-136" r="1.6" fill="${C.ink}"/><circle cx="7" cy="-136" r="1.6" fill="${C.ink}"/><path d="M-3-127q6 5 11 0" fill="none" stroke="#785044" stroke-width="1.5" stroke-linecap="round"/>${name==='Zsofi'?'<path d="M-13-139q7-5 12 0m2 0q6-5 12 0" fill="none" stroke="#564b4b" stroke-width="2"/>':''}${name==='Eszter'?'<path d="M-10-106v44h20v-44" fill="#f4dfc6" opacity=".75"/>':''}`,s);
}
function projector(x,y,s=1) { return group(x,y,`<path d="M-28-27h59v42h-59Z" fill="${C.ink}"/><circle cx="-12" cy="-28" r="20" fill="#6e8b8d" stroke="${C.ink}" stroke-width="5"/><circle cx="17" cy="-28" r="20" fill="#6e8b8d" stroke="${C.ink}" stroke-width="5"/><circle cx="-12" cy="-28" r="6" fill="${C.gold}"/><circle cx="17" cy="-28" r="6" fill="${C.gold}"/><path d="M29-13h24v20H29ZM0 15v65M-33 80h65" fill="${C.ink}" stroke="${C.ink}" stroke-width="6"/>`,s); }
function book(x,y,s=1) { return group(x,y,`<path d="M-33-26q16-7 33 2 17-9 33-2v48q-17-7-33 3-17-10-33-3Z" fill="${C.paper}" stroke="${C.ink}" stroke-width="2"/><path d="M0-24v49M-26-13h18M-26-3h18M8-13h18M8-3h18" stroke="#a3a6a0" stroke-width="2"/>`,s); }
function notebook(x,y,s=1) { return group(x,y,`<path d="M-32-33h64v69h-64Z" fill="#d4a66f" stroke="${C.ink}" stroke-width="3"/><path d="M-23-22h46v48h-46Z" fill="${C.paper}"/><path d="M-17-10h34M-17-2h34M-17 6h25" stroke="#9ea89e" stroke-width="2"/><path d="M-25-32v69" stroke="#a97157" stroke-width="5"/>`,s); }
function photo(x,y,s=1,which=0) { return group(x,y,`<path d="M-35-31h70v62h-70Z" fill="${C.paper}" stroke="#c2ad8d" stroke-width="2"/><path d="M-29-25h58v42h-58Z" fill="${which===2?'#b4b9ab':'#a9c0b9'}"/><path d="M-26 14q26-24 52 0" fill="#c0b28e"/>${which===0?'<path d="M-26-2h53v13h-53Z" fill="#9b775b"/><path d="M-18-14h36v14h-36Z" fill="#b98e6d"/><path d="M-21-17v21M21-17v21" stroke="#785d50" stroke-width="3"/>':which===1?'<path d="M-26-17h53v32h-53Z" fill="#ddcfac"/><path d="M-20-2h39v6h-39Z" fill="#7a9bad"/><path d="M-14 4v10M13 4v10" stroke="#62564f" stroke-width="3"/><circle cx="-25" cy="-7" r="4" fill="#725748"/><circle cx="25" cy="-7" r="4" fill="#725748"/>':'<path d="M-16-18h32v34h-32Z" fill="#5f847c"/><path d="M0-18v34" stroke="#344b52" stroke-width="2"/><circle cx="-23" cy="-11" r="4" fill="#725748"/><path d="M-23-7v14" stroke="#725748" stroke-width="3"/>'}<path d="M-6 31h12" stroke="#b79d7c" stroke-width="2"/>`,s); }
function bread(x,y,s=1) { return group(x,y,`<path d="M-31 11q-10-33 10-35 8-24 28-17 18-8 24 16 14 9 1 36Z" fill="#e2ad67" stroke="#a9784b" stroke-width="2"/><path d="M-18-15l-8 14M0-22-7-4M18-17l-7 16" stroke="#f5d99b" stroke-width="5"/>`,s); }
function breadBasket(x,y,s=1) { return group(x,y,`${bread(-13,-11,.42)}${bread(16,-12,.4)}<path d="M-36-5q0-38 36-38T36-5" fill="none" stroke="#8c6549" stroke-width="5"/><path d="M-40-6h80l-9 36h-62Z" fill="#c99a65" stroke="#8b6547" stroke-width="3"/><path d="M-34 3h68M-32 14h64M-19-4v31M0-4v32M19-4v31" stroke="#e8c18a" stroke-width="3"/>`,s); }
function gateClue(old=false) { return `<path d="M-28-39h56v78h-56Z" fill="${old?C.blue:C.green}" stroke="${C.ink}" stroke-width="4"/><path d="M0-39v78" stroke="${C.ink}" stroke-width="3"/><path d="M-30-43q30-31 60 0" fill="none" stroke="${C.ink}" stroke-width="4"/><path d="M0-44v-15M-17-50q-9-13-16-1 12 9 16 1ZM17-50q9-13 16-1-12 9-16 1ZM0-60q-7-11 0-16 7 5 0 16Z" fill="${C.ink}" stroke="${C.ink}" stroke-width="2"/><rect x="-14" y="-92" width="28" height="18" fill="${C.paper}" stroke="#b8a581" stroke-width="2"/><text y="-78" text-anchor="middle" font-family="Georgia,serif" font-size="13" fill="${C.ink}">${old?'12':'18'}</text>`; }
function puppet(x,y,s=1) { return group(x,y,`<path d="M-3-33v24" stroke="#6c5848" stroke-width="3"/><circle cy="-36" r="11" fill="#e7b486"/><path d="M-13-43q11-16 25 0" fill="none" stroke="#53413c" stroke-width="6"/><path d="M-17-18q17-11 34 0l-3 37h-28Z" fill="${C.terra}" stroke="${C.ink}" stroke-width="2"/><path d="M-17-10l-12 13M17-10L29 3" stroke="${C.terra}" stroke-width="7"/>`,s); }
function prop(id,x,y,s=1) {
  switch(id){
    case 'pillow': return group(x,y,`<path d="M-31-19q32-8 62 0 9 17 0 38-31 8-62 0-9-19 0-38Z" fill="#dca98e" stroke="${C.ink}" stroke-width="2"/><path d="M-21 0h42" stroke="#f6d2b7" stroke-width="3"/>`,s);
    case 'board': return group(x,y,`<path d="M-32-26h64v52h-64Z" fill="#f6e9c6" stroke="${C.brown}" stroke-width="5"/><path d="M-18 10-6-8 7 3 20-12" fill="none" stroke="${C.teal}" stroke-width="4"/><circle cx="-15" cy="-13" r="4" fill="${C.gold}"/>`,s);
    case 'puppet': return puppet(x,y,s);
    case 'pump': return group(x,y,`<path d="M0-27v54M-18-27h36M-13 27h26M7-2q34-5 31 21" fill="none" stroke="${C.ink}" stroke-width="5"/><path d="M-8 1h16v24H-8Z" fill="${C.terra}"/>`,s);
    case 'book': return book(x,y,s);
    case 'bread': return bread(x,y,s);
    case 'gate': return group(x,y,gateClue(),s);
    case 'old-gate': return group(x,y,gateClue(true),s);
    case 'bench': return group(x,y,bench('red'),s*.42);
    case 'old-bench': return group(x,y,bench('blue'),s*.42);
    case 'notebook': return notebook(x,y,s);
    case 'cart': return cart(x,y,s*.52);
    case 'photo': return photo(x,y,s);
    default: return '';
  }
}

function library(ids) {
  return `<path d="M0 0H800V460H0Z" fill="url(#${ids.sky})"/>${cloud(130,58,.65)}${cloud(674,46,.45)}
    <path d="M0 135h800v240H0Z" fill="#e8d6b6"/><path d="M0 135H800" stroke="#c5aa82" stroke-width="8"/>
    <path d="M0 340H800V460H0Z" fill="#b8c2aa"/>${paving(375)}
    <path d="M53 154h193v172H53Z" fill="#a9bdb4" stroke="#fff2d6" stroke-width="12"/><path d="M151 158v164M58 235h184" stroke="#fff2d6" stroke-width="8"/>
    <path d="M540 144h190v197H540Z" fill="#bead8f" stroke="#fff2d6" stroke-width="9"/><path d="M559 166h150v145H559Z" fill="#597e79"/><path d="M571 294h126" stroke="#d9b27b" stroke-width="6"/>${[180,218,256].map(y=>`<path d="M571 ${y}h126" stroke="#ad8967" stroke-width="4"/>`).join('')}
    ${[584,600,619,636,657,680].map((x,i)=>`<rect x="${x}" y="${i%2?250:220}" width="10" height="${i%2?42:72}" fill="${['#e2ad6e','#b57862','#7aa4a0'][i%3]}"/>`).join('')}
    <path d="M268 128h265v187H268Z" fill="#f9f5e7" stroke="#706a5a" stroke-width="8"/><path d="M257 318h287" stroke="#735e4d" stroke-width="9"/>
    <path d="M275 136h251v172H275Z" fill="#d8d8c1"/><path d="M296 162h210v133H296Z" fill="#7796a0"/>
    ${group(401,277,`<path d="M-75-57h150v72h-150Z" fill="#d8c6a4"/><path d="M-32-50h64v65h-64Z" fill="${C.blue}"/><path d="M-41-65q41-30 82 0" fill="none" stroke="${C.ink}" stroke-width="4"/><path d="M-12-80h24v16h-24Z" fill="${C.paper}" stroke="${C.ink}" stroke-width="2"/><text x="0" y="-68" text-anchor="middle" font-family="Georgia,serif" font-size="13" fill="${C.ink}">12</text>`,.72)}
    <path d="M662 329h83v7h-83Z" fill="#a9795d"/><path d="M672 335v37M737 335v37" stroke="#8b654f" stroke-width="6"/>${notebook(704,311,.55)}
    <path d="M144 324h165" stroke="#ceb183" stroke-width="8"/><path d="M160 333v45M288 333v45" stroke="#aa8c68" stroke-width="7"/>
    ${projector(190,305,.62)}${person('Mira',113,429,.73,'point')}${person('Zsofi',621,405,.78,'point')}
    <path d="M99 430h135" stroke="#e1c59c" stroke-width="3"/>${pot(749,382,.75)}
    <path d="M19 166l96-22M89 138l80 24" stroke="#718d83" stroke-width="2"/><path d="m42 163 24 4-18 20Zm77-8 24 7-17 19Z" fill="${C.terra}"/>
    ${[82,280,545].map(x=>`<path d="M${x} 438q14-9 29 1" fill="none" stroke="#b6a78e" stroke-width="3"/>`).join('')}`;
}
function film(ids) {
  return `<path d="M0 0h800v460H0Z" fill="#d7d1b8"/>
    <path d="M28 24h744v412H28Z" fill="url(#${ids.film})" stroke="#2f454e" stroke-width="15"/>
    <g transform="translate(36 20) scale(.91 .9)">${building({old:true})}${paving(352)}${shadow(394,378,135,17)}${group(389,352,bench('blue'),.72)}${person('Eszter',568,407,.55,'carry')}${person('Dani',646,417,.55,'carry')}</g>
    <path d="M36 30h728M36 430h728" stroke="#2b3f46" stroke-width="27"/>
    ${[52,118,184,250,316,382].map(y=>`<rect x="11" y="${y}" width="16" height="35" rx="3" fill="#dfd3b0"/><rect x="773" y="${y}" width="16" height="35" rx="3" fill="#dfd3b0"/>`).join('')}
    <path d="M42 62h70M51 117h39M701 81h42M714 298h36M77 397h64" stroke="#fff0ce" stroke-width="2" opacity=".4"/>`;
}
function street(ids,flags) {
  return `<path d="M0 0h800v460H0Z" fill="url(#${ids.sky})"/>${cloud(639,51,.65)}
    ${building({wide:flags.camera==='wide'})}${paving(355)}
    <path d="M574 453 800 406V227L601 267Z" fill="#ecddc2" stroke="#c3ad8c" stroke-width="5"/>
    <path d="M604 280 795 243v35l-191 38Z" fill="#e3b982" stroke="#aa795d" stroke-width="3"/>
    <path d="M613 318 792 281v89l-179 33Z" fill="#9eb9b0" stroke="#fff2d7" stroke-width="7"/>
    <path d="M657 308v84M743 291v93" stroke="#fff2d7" stroke-width="6"/>
    <path d="M602 268 800 229v28l-198 39Z" fill="#ca8568" stroke="#985f50" stroke-width="3"/>
    <text x="702" y="270" text-anchor="middle" transform="rotate(-11 702 270)" font-family="Georgia,serif" font-size="17" fill="${C.paper}">PÉKSÉG</text>
    <path d="M563 455 800 407" stroke="#fff0d1" stroke-width="5"/>
    ${flags.camera==='original'?`<path d="M51 410 185 340M51 410 714 340" fill="none" stroke="${C.gold}" stroke-width="3" stroke-dasharray="8 7" opacity=".85"/><circle cx="52" cy="411" r="11" fill="${C.ink}"/><circle cx="52" cy="411" r="5" fill="${C.gold}"/>`:''}
    ${person('Mira',184,424,.73,'point')}${person('Eszter',683,428,.76,'carry')}${group(747,413,bread(0,0,.65),.7)}
    <path d="M213 382l54-15" stroke="${C.ink}" stroke-width="3"/>${photo(240,363,.55,0)}`;
}
function workshop(ids,flags) {
  return `<path d="M0 0h800v460H0Z" fill="#efe1c1"/><path d="M0 325h800v135H0Z" fill="url(#${ids.floor})"/>
    <path d="M0 327h800" stroke="#b69b75" stroke-width="9"/>
    <path d="M50 92h258v131H50Z" fill="#ccbea1" stroke="#a58d6b" stroke-width="6"/>
    <path d="M68 110h222M68 158h222M68 207h222" stroke="#987759" stroke-width="9"/>
    ${[93,144,211].map((x,i)=>`<path d="M${x} 103v36" stroke="#53666a" stroke-width="5"/><circle cx="${x}" cy="143" r="${i===2?21:13}" fill="none" stroke="#526d70" stroke-width="5"/>`).join('')}
    <path d="M357 44h271v231H357Z" fill="#b5cfc8" stroke="#a88867" stroke-width="10"/><path d="M493 44v231M359 161h267" stroke="#f5ecd4" stroke-width="9"/>
    <path d="M658 81h106v196H658Z" fill="#bdad8d" stroke="#9b8364" stroke-width="6"/><path d="M668 108h86M668 166h86M668 222h86" stroke="#8e755a" stroke-width="8"/>
    ${[689,713,737].map((x,i)=>`<path d="M${x} ${i%2?118:173}v39" stroke="#688388" stroke-width="5"/><path d="M${x-9} ${i%2?128:183}h18" stroke="#688388" stroke-width="5"/>`).join('')}
    ${bicycle(131,363,.82)}${shadow(480,415,180,20)}${group(468,357,bench('red',flags.benchUse==='puppet'),1.1)}
    ${person('Dani',662,433,.83,'point')}${person('Mira',291,430,.72,'point')}
    <path d="M54 274h103v21H54Z" fill="#a0795a"/><path d="M68 294v43M143 294v43" stroke="#88674f" stroke-width="7"/>
    ${prop('pump',105,258,.65)}<path d="M42 420h104" stroke="#d7a574" stroke-width="5"/>`;
}
function clock(x,y,s=1,late=false) { return group(x,y,`<circle r="31" fill="${C.teal}" stroke="${C.ink}" stroke-width="3"/><circle r="25" fill="${C.paper}"/>${[0,90,180,270].map(a=>`<path d="M0-20v5" transform="rotate(${a})" stroke="${C.ink}" stroke-width="2"/>`).join('')}<path d="${late?'M0 0v-18M0 0l-9 13':'M0 0h18M0 0l10 9'}" stroke="${C.ink}" stroke-width="3" stroke-linecap="round"/><circle r="3" fill="${C.red}"/>`,s); }
function archive(ids,flags) {
  const known=flags.chronologyKnown;
  const order=known?[0,1,2]:[2,0,1];
  const positions=[[342,220],[453,218],[562,215]];
  return `<path d="M0 0h800v460H0Z" fill="#f1e7cc"/><path d="M0 0h800v102H0Z" fill="#d9c7a8"/><path d="M0 352h800v108H0Z" fill="url(#${ids.floor})"/>
    <path d="M39 52h182v258H39Z" fill="#b69b74"/><path d="M56 71h148v221H56Z" fill="#ece1c6"/>${[113,177,242].map(y=>`<path d="M52 ${y}h155" stroke="#95795a" stroke-width="8"/>`).join('')}
    ${[72,90,107,129,152,174].map((x,i)=>`<rect x="${x}" y="${i%2?72:67}" width="13" height="39" fill="${['#7da5a0','#c7846a','#e1b676'][i%3]}"/>`).join('')}
    <path d="M240 266h515v34H240Z" fill="#b78d65" stroke="#8b694f" stroke-width="4"/><path d="M273 300v155M729 300v155" stroke="#8d6d53" stroke-width="17"/>
    <path d="M253 337h496" stroke="#aa845e" stroke-width="7"/>
    ${positions.map(([x,y],i)=>`<g data-evidence="${['setup','packing','closing'][order[i]]}">${photo(x,y,1.06,order[i])}</g>`).join('')}
    ${known?`<path d="M347 273h230" stroke="${C.terra}" stroke-width="4" stroke-dasharray="8 6"/><path d="m358 267 9 6-9 6m103-12 9 6-9 6" fill="none" stroke="${C.terra}" stroke-width="3"/>
    <text x="342" y="288" text-anchor="middle" font-family="Georgia,serif" font-size="13" fill="${C.ink}">PRÓBA</text><text x="453" y="288" text-anchor="middle" font-family="Georgia,serif" font-size="13" fill="${C.ink}">ELPAKOLÁS</text><text x="562" y="288" text-anchor="middle" font-family="Georgia,serif" font-size="13" fill="${C.ink}">ZÁRÁS</text>`:''}
    ${notebook(638,245,.95)}
    <path d="M262 37h476v98H262Z" fill="#fbf3de" stroke="#c7ac83" stroke-width="6"/><path d="M280 110h440" stroke="#d2b990" stroke-width="2"/>
    ${clock(536,87,.64,false)}${clock(693,87,.64,true)}
    ${known?`<path d="M559 86h95" stroke="${C.terra}" stroke-width="3" stroke-dasharray="7 5"/><path d="m642 78 12 8-12 8" fill="none" stroke="${C.terra}" stroke-width="3"/>`:''}
    ${person('Zsofi',94,456,.72,'point')}${person('Mira',211,458,.67,'point')}
    <path d="M346 311h271" stroke="#f7e2b4" stroke-width="3"/>`;
}
function courtyard(ids,flags) {
  const wall=flags.layout==='wall', later=flags.layout==='later', libraryLayout=flags.layout==='library';
  const test=flags.layoutTest;
  const blocked=test==='straight'||test==='crosswise';
  const route=blocked?'#687f87':C.green;
  return `<path d="M0 0h800v460H0Z" fill="url(#${ids.sky})"/>${cloud(490,48,.55)}
    <path d="M0 79h800v270H0Z" fill="#e9dabc"/><path d="M0 81h800" stroke="#c6ac86" stroke-width="9"/>
    ${brick(55,111,118,42)}${brick(623,113,105,43)}${brick(100,253,103,45)}
    ${archedWindow(513,153)}
    <path d="M32 155h143v187H32Z" fill="#b5c7b7" stroke="#c2a985" stroke-width="8"/><path d="M100 159v180M36 249h135" stroke="#efe9d0" stroke-width="7"/>
    <path d="M231 157h207v196H231Z" fill="#8fad96" stroke="#9d8464" stroke-width="11"/><path d="M234 160h199v195" fill="none" stroke="#397262" stroke-width="11"/>
    <path d="M231 158q102-57 207 0" fill="none" stroke="${C.ink}" stroke-width="6"/>${ironLeaves(231,207)}
    <path d="M0 345h800v115H0Z" fill="#d7c6aa"/>
    <path d="M263 348q91 6 145 36 49 21 126 11 86-11 158 42" fill="none" stroke="#f8edd2" stroke-width="61" opacity=".8"/>
    ${test?`<path d="${test==='straight'?'M263 348h311q69 0 118 89':'M263 348q91 6 145 36 49 21 126 11 86-11 158 42'}" fill="none" stroke="${route}" stroke-width="4" stroke-dasharray="8 8"/>`:''}
    ${pot(730,343,.8)}${pot(667,344,.65)}${bicycle(114,353,.5)}
    ${test==='crosswise'?`<path d="M338 370h254v55H338Z" fill="#a77c60" stroke="${C.ink}" stroke-width="4"/><path d="M350 382h230M350 399h230" stroke="#d2ae82" stroke-width="5"/>`:''}
    ${test==='crosswise'||(!later&&!libraryLayout)?`${shadow(246,418,117,17)}${group(test==='crosswise'?445:wall?177:222,test==='crosswise'?405:355,bench('red',flags.benchUse==='puppet'),.62)}`:''}
    ${wall?'<path d="M48 326h258" stroke="#f8efcf" stroke-width="3" stroke-dasharray="6 5"/>':''}
    ${later?`<path d="M63 341h227v78H63Z" fill="none" stroke="#fff2d7" stroke-width="4" stroke-dasharray="12 7"/><path d="M85 363h180M90 395h170" stroke="#fff2d7" stroke-width="3" stroke-dasharray="7 6"/><path d="M560 351h163v78H560Z" fill="none" stroke="#fff2d7" stroke-width="4" stroke-dasharray="12 7"/>`:''}
    ${libraryLayout?`<path d="M581 353q95 25 140 68" fill="none" stroke="#eabf74" stroke-width="5" stroke-dasharray="10 7"/><path d="M99 327h115v79H99Z" fill="#f8eed9" stroke="#987f5f" stroke-width="5"/><path d="M112 347h89M112 361h74M112 377h58" stroke="#92aaa0" stroke-width="4"/><path d="M107 405v18M208 405v18" stroke="#80684f" stroke-width="5"/>`:''}
    ${cart(test==='crosswise'?376:test==='straight'?558:568,test==='crosswise'?346:379,.59,true)}
    ${blocked?`<circle cx="${test==='crosswise'?610:617}" cy="${test==='crosswise'?394:396}" r="27" fill="#687f87" opacity=".16"/><path d="M${test==='crosswise'?596:603} ${test==='crosswise'?380:382}l28 28m0-28-28 28" stroke="#687f87" stroke-width="7"/>`:test==='turn-clear'?`<circle cx="582" cy="397" r="20" fill="${C.green}" opacity=".15"/><path d="m573 396 7 8 15-19" fill="none" stroke="${C.green}" stroke-width="6"/>`:''}
    ${person('Juli',736,432,.72,'point')}${person('Eszter',656,438,.65,'carry')}${person('Mira',472,435,.63,'point')}
    <path d="M447 437h70" stroke="#f8edcf" stroke-width="3"/>`;
}
function movie(ids,flags) {
  const props=flags.props;
  const voice=flags.filmEszter==='voice';
  const carriedBread=voice&&props.includes('bread');
  return `<path d="M0 0h800v460H0Z" fill="url(#${ids.evening})"/>
    <path d="M0 46h800v309H0Z" fill="#e4d0aa"/>${building({open:true,wide:flags.camera==='wide'})}${paving(353)}
    <path d="M0 0h800v75H0Z" fill="#486e75" opacity=".16"/>
    <path d="M45 55q356 68 713 0" fill="none" stroke="#567773" stroke-width="3"/>
    ${[105,204,304,409,517,626,718].map((x,i)=>`<circle cx="${x}" cy="${i%2?75:78}" r="6" fill="#ffdc89"/><path d="M${x} ${i%2?75:78}v-15" stroke="#6f8078" stroke-width="2"/>`).join('')}
    ${person('Mira',148,433,.72,carriedBread?'carry':'point')}${carriedBread?`<g data-story-prop="bread">${breadBasket(180,390,.47)}</g>`:''}${person('Dani',271,439,.7,'carry')}${voice?'':person('Eszter',567,439,.69,'carry')}${person('Juli',690,438,.71,'point')}
    ${group(460,392,bench('red'),.43)}
    ${props.map((p,i)=>carriedBread&&p==='bread'?'':`<g data-story-prop="${p}">${prop(p,94+i*112,381,.62)}</g>`).join('')}
    <path d="M160 448q262-29 507-1" fill="none" stroke="#eed6a5" stroke-width="2" opacity=".7"/>`;
}
function theatre(ids,flags) {
  const boards=flags.theatreForm==='boards';
  return `<path d="M0 0h800v460H0Z" fill="url(#${ids.evening})"/><path d="M0 178h800v282H0Z" fill="#e7d8b9"/>
    <path d="M70 170h660v224H70Z" fill="#f2e3c4" stroke="#8d7960" stroke-width="7"/>
    ${boards?`<path d="M103 185h199v165H103Z" fill="#fff5df" stroke="#987d60" stroke-width="7"/>
      <path d="M115 197h175v140H115Z" fill="#d4c39e"/>
      ${photo(145,261,.57,0)}${photo(202,261,.57,1)}${photo(260,261,.57,2)}
      <path d="M110 346h187M119 353v44M286 353v44" stroke="#80674f" stroke-width="7"/>
      <path d="M131 325h144" stroke="#a77e5a" stroke-width="3"/>`:`<path d="M101 190h201v153H101Z" fill="#ccb898" stroke="#6f5f58" stroke-width="8"/>
      <path d="M103 188q45 38 0 152V188M299 188q-45 38 0 152V188" fill="${C.terra}"/>
      <path d="M112 196h177v37H112Z" fill="${C.red}"/><path d="M107 337h194v15H107Z" fill="${C.brown}"/>
      ${puppet(158,307,.74)}${puppet(231,304,.74)}`}
    <path d="M365 190h330v145H365Z" fill="#f9f4df" stroke="#9b8b72" stroke-width="6"/>
    ${photo(425,263,.74,0)}${photo(529,263,.74,1)}${photo(631,263,.74,2)}
    <path d="M0 388h800v72H0Z" fill="#c8b494"/>
    ${person('Mira',322,450,.6,'point')}${person('Eszter',425,454,.62,'point')}${person('Dani',547,455,.62,'carry')}${person('Juli',652,455,.62,'point')}
    ${!boards&&flags.benchUse==='puppet'?group(187,375,bench('red',true),.35):''}
    <path d="M43 80h714" stroke="#5e7e7b" stroke-width="3"/>${[100,206,312,418,524,630,736].map(x=>`<circle cx="${x}" cy="90" r="5" fill="#ffdb8d"/>`).join('')}`;
}
function walk(ids,flags) {
  return `<path d="M0 0h800v460H0Z" fill="url(#${ids.sky})"/>${cloud(594,51,.64)}
    <path d="M0 143h800v204H0Z" fill="#e7d6b7"/><path d="M0 145h800" stroke="#c7ae8c" stroke-width="9"/>
    <path d="M16 188h173v161H16Z" fill="#a4bab1" stroke="#fff0d4" stroke-width="9"/><path d="M100 192v153M20 266h165" stroke="#f7efd8" stroke-width="8"/>
    <path d="M229 156h219v194H229Z" fill="#ddd0b2" stroke="#b2a081" stroke-width="6"/>
    <path d="M261 194h153v156H261Z" fill="${C.green}" stroke="${C.ink}" stroke-width="5"/><path d="M338 193v157" stroke="${C.ink}" stroke-width="3"/>
    <path d="M261 194q75-48 153 0" fill="none" stroke="${C.ink}" stroke-width="5"/>${ironLeaves(260,153)}
    <path d="M311 160h54v30h-54Z" fill="${C.paper}" stroke="#9d8d70" stroke-width="3"/><text x="338" y="182" text-anchor="middle" font-family="Georgia,serif" font-size="21" fill="${C.ink}">18</text>
    ${archedWindow(550,190)}
    <path d="M0 348h800v112H0Z" fill="#d3c4a7"/><path d="M0 390h800M0 440h800" stroke="#bbaa8c" stroke-width="3"/>
    <path d="M55 345h112v20H55Z" fill="#d0a27d"/><text x="111" y="360" text-anchor="middle" font-size="13" font-family="Georgia,serif" fill="${C.ink}">PÉKSÉG</text>
    ${clock(734,105,.7)}
    ${person('Mira',194,455,.72,'point')}${person('Zsofi',300,455,.72,'carry')}${person('Eszter',486,455,.7,'point')}${person('Juli',700,453,.67,'point')}
    ${group(321,388,notebook(0,0,.55),.7)}
    <path d="M39 432q74-40 159 2 79 35 155-1 80-31 148 2" fill="none" stroke="#fbefce" stroke-width="4" stroke-dasharray="8 10"/>`;
}

const scenes={library,film,street,workshop,archive,courtyard,movie,theatre,walk};
const titles={library:'Próbavetítés a könyvtár udvarán',film:'Régi film: kék kapu, 12-es házszám és kék pad',street:'Mai utca: zöld kapu, 18-as házszám és szemközti pékség',workshop:'Dani műhelye és a pirosra festett, javított pad',archive:'Fényképek és füzet a könyvtári archívumban',courtyard:'A zöld kapus ház közös udvara szabad kocsiúttal',movie:'Az új, ma forgatott befejezés a nyitott zöld kapunál',theatre:'Bábok és valódi szereplők élő előadása',walk:'Történetséta a városi nyomok mentén'};
const knownProps=new Set(['pillow','board','puppet','pump','book','bread']);
function normalizedFlags(flags) {
  const f=flags && typeof flags==='object' ? flags : {};
  return {
    layout:['wall','later','library'].includes(f.layout)?f.layout:'wall',
    layoutTest:['straight','crosswise','turn-clear'].includes(f.layoutTest)?f.layoutTest:null,
    benchUse:f.benchUse==='puppet'?'puppet':'seat',
    camera:f.camera==='wide'?'wide':'original',
    chronologyKnown:f.chronologyKnown===true,
    theatreForm:f.theatreForm==='boards'?'boards':'puppet',
    filmEszter:f.filmEszter==='voice'?'voice':'present',
    props:Array.isArray(f.props)?Array.from(new Set(f.props.filter(x=>knownProps.has(x)))).slice(0,6):[],
  };
}
function defs(ids) { return `<defs>
  <linearGradient id="${ids.sky}" x2="0" y2="1"><stop stop-color="#c3d9d4"/><stop offset="1" stop-color="#f8e8c7"/></linearGradient>
  <linearGradient id="${ids.evening}" x2="0" y2="1"><stop stop-color="#7eabb1"/><stop offset="1" stop-color="#f3d2a1"/></linearGradient>
  <linearGradient id="${ids.floor}" x2="0" y2="1"><stop stop-color="#d7c4a5"/><stop offset="1" stop-color="#aa987e"/></linearGradient>
  <linearGradient id="${ids.film}" x2="0" y2="1"><stop stop-color="#cfceb8"/><stop offset="1" stop-color="#adaf9f"/></linearGradient>
  </defs>`; }
export function renderCityStoryArt(sceneId, flags = {}, prefix = 'city-story') {
  const scene=Object.hasOwn(scenes,sceneId)?sceneId:'library';
  const f=normalizedFlags(flags);
  const key=`${safePrefix(prefix)}-${safeId(scene)}-${hash(JSON.stringify(f))}`;
  const ids={sky:`${key}-sky`,evening:`${key}-evening`,floor:`${key}-floor`,film:`${key}-film`};
  const title=scene==='theatre'&&f.theatreForm==='boards'?'Képtáblák és valódi szereplők élő előadása':titles[scene];
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 460" role="img" aria-label="${title}" preserveAspectRatio="xMidYMid meet">${defs(ids)}<g stroke-linecap="round" stroke-linejoin="round">${scenes[scene](ids,f)}</g></svg>`;
}
export function renderCityStoryProp(id, prefix = 'city-story-prop') {
  const p=knownProps.has(id)?id:'';
  const key=safePrefix(prefix);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 110" role="img" aria-label="${p||'Kellék'}" data-art="${key}"><rect width="120" height="110" rx="16" fill="${C.cream}"/>${prop(p,60,58,1.05)}</svg>`;
}
export function renderCityStoryClue(id, prefix = 'city-story-clue') {
  const aliases={street:'gate',workshop:'bench',archive:'notebook',courtyard:'cart',film:'photo'};
  const resolved=Object.hasOwn(aliases,id)?aliases[id]:id;
  const allowed=new Set(['gate','old-gate','bench','old-bench','notebook','cart','photo']);
  const p=allowed.has(resolved)?resolved:'';
  const key=safePrefix(prefix);
  const gate=p==='gate'||p==='old-gate';
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 110" role="img" aria-label="${p||'Nyom'}" data-art="${key}"><rect width="120" height="110" rx="16" fill="${C.cream}"/>${prop(p,60,gate?78:55,gate?.72:1)}</svg>`;
}

// Evidence cards deliberately show different moments, without numbering them.
// Their clock and bakery details let children infer the order independently.
export function renderCityStoryPhoto(id, prefix = 'city-story-photo') {
  const kind=['setup','packing','closing'].includes(id)?id:'setup';
  const label={setup:'A nagy dobogó eltakarja az átjárót',packing:'A kék padot elviszik; a pékség még nyitva, az óra negyed ötöt mutat',closing:'Juli este hétkor becsukja a kaput; a pékség zárva'}[kind];
  const bakeryOpen=kind!=='closing';
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 220" role="img" aria-label="${label}" data-art="${safePrefix(prefix)}"><rect width="320" height="220" rx="12" fill="#f4ead5"/>
    <path d="M9 9h302v202H9Z" fill="#e5d3af" stroke="#fff9e8" stroke-width="7"/>
    <path d="M14 13h292v151H14Z" fill="#e7d7b8"/><path d="M14 156h292v51H14Z" fill="#cbb99b"/>
    <path d="M19 51h281M19 78h281" stroke="#d0b894" stroke-width="3"/>
    <path d="M105 77h125v84H105Z" fill="${C.blue}" stroke="${C.ink}" stroke-width="4"/><path d="M167 78v82" stroke="${C.ink}" stroke-width="3"/>
    <path d="M106 78q60-45 123 0" fill="none" stroke="${C.ink}" stroke-width="5"/>
    <path d="M168 68V43M145 67q-8-16-19-8 6 14 19 8Zm46 0q8-16 19-8-6 14-19 8ZM168 48q-10-18 0-22 10 4 0 22Z" fill="${C.ink}" stroke="${C.ink}" stroke-width="2"/>
    <path d="M149 4h38v22h-38Z" fill="${C.paper}" stroke="#9b896a" stroke-width="2"/><text x="168" y="21" text-anchor="middle" font-family="Georgia,serif" font-weight="bold" font-size="16" fill="${C.ink}">12</text>
    <g transform="translate(28 84) scale(.42)">${archedWindow(0,0)}</g>
    <path d="M239 90h64v67h-64Z" fill="${bakeryOpen?'#acb9a7':'#b0aaa0'}" stroke="#b89976" stroke-width="3"/>
    <path d="M238 81h66v14h-66Z" fill="#d49d72"/><text x="271" y="91" text-anchor="middle" font-family="Georgia,serif" font-size="9" fill="${C.ink}">PÉKSÉG</text>
    ${bakeryOpen?`<path d="M245 128h49" stroke="#8d735c" stroke-width="3"/>${bread(258,125,.2)}${bread(282,125,.2)}<path d="M242 100h59" stroke="#fff2d5" stroke-width="3"/>`:`${[99,109,119,129,139,149].map(y=>`<path d="M240 ${y}h62" stroke="#8a8c89" stroke-width="4"/>`).join('')}`}
    ${kind==='setup'?'':`${clock(270,36,.39,kind==='closing')}<text x="270" y="70" text-anchor="middle" font-family="Georgia,serif" font-weight="bold" font-size="11" fill="${C.ink}">${kind==='closing'?'19:00':'16:15'}</text>`}
    ${kind==='setup'?`<path d="M74 151h166v34H74Z" fill="#ab805f" stroke="${C.ink}" stroke-width="3"/><path d="M82 160h150M82 175h150" stroke="#d9b38a" stroke-width="4"/><path d="M89 185v18M226 185v18" stroke="#7f624f" stroke-width="6"/>${group(139,162,bench('blue'),.22)}${cart(272,183,.22)}<path d="M218 174l31 24m0-24-31 24" stroke="${C.red}" stroke-width="5"/>`:''}
    ${kind==='packing'?`${group(163,173,bench('blue'),.34)}${person('Eszter',87,206,.39,'carry')}${person('Dani',237,206,.39,'carry')}<path d="M83 186h161" stroke="${C.ink}" stroke-width="2" stroke-dasharray="5 4"/>`:''}
    ${kind==='closing'?`<path d="M177 81l-11 80h63V82" fill="${C.blue}" stroke="${C.ink}" stroke-width="4"/><path d="M168 82v78" stroke="#7396a2" stroke-width="2"/><circle cx="194" cy="127" r="4" fill="${C.gold}"/>${person('Juli',243,206,.39,'point')}`:''}
    <path d="M14 207h292" stroke="#a78f71" stroke-width="2"/>
  </svg>`;
}
