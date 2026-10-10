// Shared road, rescue and test-track scenery. All vehicle characters come from base.js.
export function createRoutesArt(art) {
  const wrap = (name, drawing) => `<g data-actor="${name}">${drawing}</g>`;
  const text = (value) => String(value).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;');
  const cloud = (x,y,i,dark=false) => `<g transform="translate(${x} ${y})"><g class="sv-cloud" data-seed="${i}"><path d="M-79 20q-29-38 15-52 2-40 41-32 28-45 61-8 40-4 43 29 46 1 45 40Z" fill="${dark?'#b6c1c6':'#fff8e4'}"/><path d="M-72 23H118" stroke="${dark?'#a2b2bb':'#e3e9d2'}" stroke-width="9" opacity=".6" stroke-linecap="round"/></g></g>`;
  function sky(weather='sun',night=false) {
    return `<rect width="1280" height="720" fill="${night?'#344858':weather==='rain'?'#a9bdc4':'#d6e9e1'}"/>${night?'<circle cx="1100" cy="105" r="38" fill="#ffefc1"/><circle cx="1114" cy="94" r="36" fill="#344858"/>':weather==='rain'?'':`<g transform="translate(1085 95)"><g class="sv-sun-rays">${Array.from({length:12},(_,i)=>`<path d="M0-60v-13" transform="rotate(${i*30})" stroke="#efd08a" stroke-width="5"/>`).join('')}</g><circle r="40" fill="#ffe3a1"/></g>`}${[[-80,135],[250,95],[630,160],[1010,72]].map(([x,y],i)=>cloud(x,y,i,weather==='rain'||night)).join('')}${weather==='rain'||night?'':[[415,165],[825,205]].map(([x,y])=>`<g class="sv-bird" data-x="${x}" data-y="${y}" transform="translate(${x} ${y})"><g class="sv-bird-wings"><path d="M0 0q-12-25-29-14q20 0 29 18M0 0q14-26 29-13Q9-11 0 4" stroke="#6b897a" stroke-width="4" stroke-linecap="round" fill="#8da391"/></g><ellipse cy="2" rx="5" ry="3" fill="#6b897a"/></g>`).join('')}`;
  }
  function sign(lines,x=935,y=335,width=260) {
    const list=Array.isArray(lines)?lines:[lines];
    const height=40+list.length*29;
    return `<g transform="translate(${x} ${y})"><path d="M20 0v210M${width-20} 0v210" stroke="#9d916f" stroke-width="10"/><rect x="0" y="0" width="${width}" height="${height}" rx="13" fill="#fff7df" stroke="#817c63" stroke-width="4"/><path d="M13 13h${width-26}" stroke="#e3cf9b" stroke-width="3"/>${list.map((line,i)=>`<text x="${width/2}" y="${32+i*29}" text-anchor="middle" font-family="system-ui,sans-serif" font-weight="700" font-size="${line.length>24?16:20}" fill="#4b6056">${text(line)}</text>`).join('')}</g>`;
  }
  function rain() {
    return `<g opacity=".46" stroke="#f4f9f6" stroke-width="2.2" stroke-linecap="round">${Array.from({length:58},(_,i)=>wrap(`route-rain-${i}`,`<path d="M0 0l-12 27"/>`)).join('')}</g>`;
  }
  function mountainRoad({weather='sun',variant='road',night=false}={}) {
    const quarry=variant==='quarry',fork=variant==='fork';
    return `${sky(weather,night)}<path d="M0 365 195 160l155 162L526 73l190 220 157-130 206 196 201-97v458H0Z" fill="#a8bcab"/><path d="m419 199 107-126 109 129-51-24-30 31-32-35-30 35Z" fill="#e9ead6"/><path d="M0 433 250 286l177 110 224-137 241 121 211-101 177 163v278H0Z" fill="#829987"/><path d="M0 480q232-98 427-37 259-116 500-4 191-91 353-3v284H0Z" fill="${quarry?'#b1a485':'#b8c9a0'}"/>${quarry?'':[[48,457,.75],[1160,429,.8],[1110,390,.55],[280,424,.4]].map(([x,y,s],i)=>art.tree(x,y,s,i)).join('')}<path d="M0 511q381-46 704 4 294 32 576-11v216H0Z" fill="${weather==='rain'?'#929994':'#b9b59c'}"/><path d="M-30 590q360-33 702 1 339 23 663-4" stroke="#e6dec2" stroke-width="6" stroke-dasharray="47 39" fill="none"/>${fork?'<path d="M760 548 1052 335l150 80-168 167" fill="#c9bea4"/><path d="M780 582 935 447" stroke="#eee4c8" stroke-width="5" stroke-dasharray="30 25"/>':''}${variant==='race'||variant==='finish'?'<path d="M43 506h75v205H43Z" fill="#f2e9d0"/><path d="M43 506h25v25H43Zm50 0h25v25H93Zm-25 25h25v25H68Zm-25 25h25v25H43Zm50 0h25v25H93Zm-25 25h25v25H68Zm-25 25h25v25H43Zm50 0h25v25H93Zm-25 25h25v25H68Z" fill="#69766a"/>':''}${variant==='finish'?`<path d="M940 450V248h250v202" fill="none" stroke="#aa9070" stroke-width="14"/><path d="M944 246h242v64H944Z" fill="#f9efd5"/><text x="1065" y="289" text-anchor="middle" font-size="30" font-weight="700" fill="#586c59">CÉL</text>`:''}${quarry?'<path d="M803 540q250-34 456 26l21 154H849Z" fill="#615d4d"/><path d="m1060 491 50-112 43 12 52 110Zm-60 0-36-97-55-8-43 106Z" fill="#bcb099" stroke="#918974" stroke-width="4"/>':''}${weather==='rain'?`${puddles()}${rain()}`:''}`;
  }
  function puddles() {
    return [[330,640,145],[830,665,177],[1110,552,92]].map(([x,y,r],i)=>`<g transform="translate(${x} ${y})"><ellipse rx="${r}" ry="20" fill="#b5d1d1" opacity=".75"/>${wrap(`route-ripple-${i}`,`<ellipse rx="${r*.55}" ry="10" fill="none" stroke="#e1eddf" stroke-width="2"/>`)}</g>`).join('');
  }
  function garage({rain:wet=false,night=false,repair=false}={}) {
    return `${sky(wet?'rain':'sun',night)}<path d="M0 450q399-138 760-20 250-70 520-6v296H0Z" fill="${night?'#648075':'#bdcda6'}"/>${art.tree(1190,500,.8,0)}<path d="M0 570h1280v150H0Z" fill="#b6b29b"/><path d="M80 172h956v399H80Z" fill="#dac29b" stroke="#968166" stroke-width="5"/><path d="m38 183 84-103h863l92 103Z" fill="#bd7860" stroke="#875f4e" stroke-width="5"/><path d="M77 170h960" stroke="#e2a18a" stroke-width="10"/><rect x="123" y="236" width="868" height="338" rx="15" fill="${night?'#48524a':'#7c8070'}" stroke="#a19173" stroke-width="10"/><path d="M130 275h852m-852 40h852m-852 40h852" stroke="#959482" stroke-width="5"/><rect x="436" y="134" width="258" height="73" rx="13" fill="#f8efd5" stroke="#987f5e" stroke-width="3"/><text x="565" y="181" text-anchor="middle" font-family="system-ui" font-size="30" font-weight="700" fill="#506658">AUTÓVÁROS</text><path d="M135 574h857l164 146H0Z" fill="#c5bda3"/><path d="M92 193v328q0 22 30 22" fill="none" stroke="#9aa291" stroke-width="10"/>${wrap('route-gutter',`<path d="M122 544q-5 24 5 39m-5-37q9 30 2 54" stroke="#d3ebe5" stroke-width="4" opacity="${wet?'.8':'0'}"/>`)}${repair?'<path d="M185 362h170v190H185Z" fill="#a99b7e"/><path d="M190 396h158" stroke="#dacdb0" stroke-width="5"/><path d="m210 343 13-18 11 7-6 22 26 37-10 8-25-35-22-4Z" fill="#bfc8b5"/><circle cx="936" cy="499" r="47" fill="#484f48"/><circle cx="936" cy="499" r="23" fill="#b8bfaa"/>':''}${wet?`${puddles()}${rain()}`:''}`;
  }
  function tunnel({entrance=false,laboratory=false,pool=false}={}) {
    if(entrance) return `${mountainRoad()}<path d="M724 488V285q0-178 229-179 213 0 213 179v219Z" fill="#a9a58f" stroke="#888872" stroke-width="8"/><path d="M784 507V294q0-125 169-125 153 0 153 126v212Z" fill="#4f605a"/><path d="M802 500V300q0-106 150-106 130 0 130 112v193" fill="none" stroke="#6b7770" stroke-width="12"/><path d="M789 413h317m-322-82h322M829 201l-30-29m92 9-12-39m87 31 2-49m74 79 28-37" stroke="#858b79" stroke-width="5"/><path d="M798 506h298l154 160H659Z" fill="#a3a595"/>`;
    return `<rect width="1280" height="720" fill="#52635e"/><path d="M0 0H1280V466H0Z" fill="#717c6a"/><path d="M0 46H1280M0 206H1280M0 370H1280M188 0V465M553 0V465M933 0V465" stroke="#5b6c5f" stroke-width="5"/><path d="M0 63h1280m-1280 16h1280" stroke="#3f504c" stroke-width="9"/><path d="M0 495h1280v225H0Z" fill="#8d9380"/><path d="M0 583h1280" stroke="#bfc4aa" stroke-width="5" stroke-dasharray="45 40"/>${[135,470,805,1140].map((x,i)=>`<g transform="translate(${x} 110)"><path d="M0-35V0" stroke="#414e49" stroke-width="7"/><rect x="-42" y="0" width="84" height="24" rx="9" fill="#d8cda5"/>${wrap(`route-lamp-${i}`,`<path d="m-43 30-98 375h283L43 30Z" fill="#fff5cf" opacity=".08"/><rect x="-38" y="5" width="76" height="12" rx="6" fill="#fff1a9"/>`)}</g>`).join('')}${laboratory?'<rect x="690" y="178" width="539" height="283" rx="9" fill="#b5d6cd" fill-opacity=".23" stroke="#b2beb0" stroke-width="9"/><path d="M869 180v280m179-280v280" stroke="#93aba0" stroke-width="5"/><path d="m728 208 291 234m-240-234 227 180" stroke="#d6e7d5" stroke-width="5" opacity=".18"/>':''}${pool?'<path d="M764 481h516v239H696Z" fill="#6dacae"/><path d="M770 473h510" stroke="#d6d9bb" stroke-width="13"/><path d="m726 580 37-98h141l-44 98Z" fill="#b5bca3" stroke="#858e7c" stroke-width="4"/>'+Array.from({length:6},(_,i)=>wrap(`route-pool-ripple-${i}`,`<path d="M0 0q30-12 60 0t60 0" fill="none" stroke="#bde1d5" stroke-width="4" opacity=".6"/>`)).join(''):''}`;
  }
  function judge(color='green') {
    return `<g>${art.raceCar({color})}<rect x="8" y="65" width="96" height="30" rx="6" fill="#f3efd8"/><text x="56" y="85" text-anchor="middle" font-family="system-ui" font-size="12" font-weight="700" fill="#526655">PÁLYABÍRÓ</text><path d="M112 11h67" stroke="#756c53" stroke-width="4"/></g>`;
  }
  function bus() {
    return `<ellipse cx="189" cy="145" rx="190" ry="17" fill="#4c574a" opacity=".18"/><path d="M6 12q0-12 15-12h274l76 37v101H6Z" fill="#e4bb58" stroke="#947941" stroke-width="4"/><path d="M19 13h266l59 29v47H19Z" fill="#b0d0c6" stroke="#829985" stroke-width="3"/>${Array.from({length:6},(_,i)=>`<path d="M${49+i*42} 15v73" stroke="#ddbf75" stroke-width="6"/>`).join('')}<path d="M312 38h36v83h-36Z" fill="#7f9d95" stroke="#b49553" stroke-width="4"/><path d="M17 108h277" stroke="#b79046" stroke-width="8"/><rect x="96" y="91" width="158" height="26" rx="7" fill="#f5de9b"/><text x="175" y="111" text-anchor="middle" font-size="17" font-weight="700" fill="#726237">ISKOLABUSZ</text>${[40,82,124,166,208,250].map((x,i)=>`<g class="route-bus-child" data-index="${i}" transform="translate(${x} 60)"><circle r="11" fill="${['#deb08e','#cd9b79','#e9b99a'][i%3]}"/><path d="M-12-2q12-22 24 0" fill="${['#74584a','#b88750','#64544a'][i%3]}"/><circle cx="-4" r="1.5" fill="#4f5149"/><circle cx="4" r="1.5" fill="#4f5149"/></g>`).join('')}${art.wheel(66,132,30)}${art.wheel(295,132,30)}`;
  }
  function truck() {
    return `<ellipse cx="158" cy="174" rx="170" ry="15" fill="#465848" opacity=".16"/><path d="M5 42h180V132H5Z" fill="#a69262" stroke="#746b4c" stroke-width="4"/><path d="m17 37 32-22 23 6 25-27 39 21 35 22Z" fill="#a9ab90" stroke="#7e8773" stroke-width="3"/><path d="M190 18h71l58 58v75H190Z" fill="#cbaf62" stroke="#887441" stroke-width="4"/><path d="M203 31h49l43 47h-92Z" fill="#a9cbc3" stroke="#768f7c" stroke-width="3"/><path d="M9 134h309" stroke="#656d59" stroke-width="14"/>${art.wheel(52,154,32)}${art.wheel(149,154,32)}${art.wheel(276,154,32)}`;
  }
  function deer() {
    return `<g><ellipse cx="43" cy="103" rx="67" ry="9" fill="#63715a" opacity=".18"/><g data-actor="deer-body"><path d="M-16 8q33-36 94-10l10 43q-66 28-107-2Z" fill="#bd9364" stroke="#8e7452" stroke-width="3"/><path d="M-4 35v58m60-56 7 57m11-58 14 53m-56-49-6 51" stroke="#a67f55" stroke-width="12" stroke-linecap="round"/><path d="M-17 27-33 5" stroke="#e6d5b4" stroke-width="8"/><path d="M69 10 85-43l31 6-14 70Z" fill="#bd9364" stroke="#8e7452" stroke-width="3"/><path d="M83-34q-8-35 13-27l8 23m3 0q15-35 25-15l-18 23" fill="#d8b28a" stroke="#917453" stroke-width="2"/><ellipse cx="114" cy="-23" rx="31" ry="20" fill="#c19b70"/><ellipse cx="133" cy="-14" rx="10" ry="7" fill="#edd6ad"/><circle cx="117" cy="-27" r="3" fill="#4a5847"/><circle cx="140" cy="-14" r="3" fill="#685d49"/><path d="M124-5q8 7 14 1" fill="none" stroke="#8b7251" stroke-width="2"/></g></g>`;
  }
  function bridge({broken=false}={}) {
    return `<path d="M0 644q315-35 617 9 336 50 663-2v69H0Z" fill="#7aaead"/><path d="M80 522h1050v54H80Z" fill="#9c8863" stroke="#716c53" stroke-width="5"/>${Array.from({length:20},(_,i)=>`<path d="M${100+i*51} 523v52" stroke="#b5a07a" stroke-width="4"/>`).join('')}<path d="M100 410v108m145-108v108m145-108v108m145-108v108m145-108v108m145-108v108m145-108v108M102 412h966" stroke="#8c7d5e" stroke-width="11" stroke-linecap="round"/>${broken?'<path d="M478 517h226v69H478Z" fill="#829d88"/><path d="M478 517 527 567m177-50-61 69" stroke="#b09873" stroke-width="12"/><path d="m486 412 13 29 27-7m176-19-15 17" stroke="#8c7d5e" stroke-width="11"/>':''}<path d="m141 579-28 99m881-99 40 99" stroke="#816f52" stroke-width="18"/>`;
  }
  function map({secondX=false}={}) {
    return `<path d="M0 8 209-9l203 18-8 249-207-12L0 260Z" fill="#f2e6c4" stroke="#b1a383" stroke-width="4"/><path d="m204-6-7 247" stroke="#d7c49c" stroke-width="3"/><path d="M35 193q74-154 146-91t177-37" fill="none" stroke="#c8946c" stroke-width="12" stroke-linecap="round"/><path d="m302 43 60 55m1-55-63 56" stroke="#685b4c" stroke-width="9"/><path d="M60 232 88 180l32 50m120-68 35-60 43 60m-242-72 12-39 13 36m-55 8 10-29 13 27" fill="#c0ca97" stroke="#8e9b73" stroke-width="3"/><ellipse cx="300" cy="207" rx="52" ry="25" fill="#add2c7"/><path d="m29 16 56-5m-53 12 96-9" stroke="#ccbb92" stroke-width="5"/>${secondX?wrap('map-second-x','<path d="m63 196 29 34m3-34-32 34" stroke="#665849" stroke-width="7"/>'):''}`;
  }
  function envelope() {
    return `<path d="M0 0h310v175H0Z" fill="#eee2bf" stroke="#aa9874" stroke-width="4"/><path d="m0 0 153 112L310 0m-310 175 104-77m206 77-103-77" stroke="#d1bf92" stroke-width="4" fill="none"/><text x="155" y="149" text-anchor="middle" font-size="18" font-weight="700" fill="#7c7157">VILLÁM · TURBÓ · PÖTTY</text>`;
  }
  function fuelPump() {
    return `<path d="M0 0h117v235H0Z" fill="#c56c54" stroke="#8c5e4b" stroke-width="4"/><rect x="13" y="14" width="91" height="85" rx="9" fill="#e9e2c8"/><rect x="25" y="28" width="67" height="32" rx="5" fill="#a7bfa9"/><text x="58" y="53" text-anchor="middle" font-size="19" fill="#536754">TELE</text><circle cx="58" cy="123" r="16" fill="#eed7ad"/><path d="M117 47q45 0 42 63l-5 82q-2 31 25 31" fill="none" stroke="#556456" stroke-width="10"/><g data-actor="fuel-hose"><path d="m165 218 32-13 24 12-15 18-28-5" fill="#97a58a" stroke="#5d705d" stroke-width="4"/></g><path d="M-12 232h140" stroke="#8c8066" stroke-width="14"/>`;
  }
  function fuelCan() {
    return `<path d="M18 13h38V0h52v16h28l10 122H0L9 26Z" fill="#c1a957" stroke="#8c7947" stroke-width="4"/><path d="M65 2h32v17H65Z" fill="#e5d6a6"/><path d="m17 37 107 81m-107 0 107-81" stroke="#d9c982" stroke-width="7"/><path d="M21 10V-4h21v15" fill="#8d9c74" stroke="#637458" stroke-width="3"/>`;
  }
  function gauge() {
    return `<rect width="220" height="127" rx="22" fill="#f3ead2" stroke="#807e65" stroke-width="4"/><path d="M34 86a76 76 0 0 1 152 0" fill="none" stroke="#c2c6a5" stroke-width="21"/><path d="M34 86q0-22 12-38" stroke="#ce8065" stroke-width="20"/><g data-actor="fuel-needle"><path d="M110 83 174 71" stroke="#8b6150" stroke-width="6" stroke-linecap="round"/></g><circle cx="110" cy="83" r="9" fill="#687b66"/><text x="24" y="115" font-size="18" fill="#687b66">ÜRES</text><text x="151" y="115" font-size="18" fill="#687b66">TELE</text>`;
  }
  function podium() {
    return `<path d="M0 74h215V25h270v49h215v92H0Z" fill="#d5ba74" stroke="#9a895a" stroke-width="4"/><text x="350" y="93" text-anchor="middle" font-size="46" font-weight="700" fill="#f8edcb">1</text><text x="107" y="136" text-anchor="middle" font-size="38" fill="#f8edcb">2</text><text x="592" y="136" text-anchor="middle" font-size="38" fill="#f8edcb">3</text>`;
  }
  function trafficLight(green=false) {
    return `<path d="M33 147v109" stroke="#828771" stroke-width="10"/><rect x="0" y="0" width="66" height="160" rx="18" fill="#57665a" stroke="#84927d" stroke-width="4"/><circle cx="33" cy="29" r="19" fill="${green?'#966e59':'#e78465'}"/><circle cx="33" cy="78" r="19" fill="#b3a15d"/><circle cx="33" cy="126" r="19" fill="${green?'#a5cf8f':'#6b8570'}"/>${wrap('signal-glow',`<circle cx="33" cy="${green?126:29}" r="30" fill="${green?'#b8d990':'#eca182'}" opacity=".18"/>`)}`;
  }
  function radio() {
    return `<path d="M14-46 25-112" stroke="#697861" stroke-width="7"/><rect width="106" height="80" rx="12" fill="#a4aa88" stroke="#6c7b60" stroke-width="4"/><rect x="13" y="12" width="50" height="55" rx="6" fill="#697b66"/><path d="M21 23h34m-34 11h34m-34 11h34m-34 11h34" stroke="#a6b694" stroke-width="4"/><circle cx="84" cy="22" r="8" fill="#d3c791"/><g data-actor="radio-wave"><path d="M118 24q25 10 0 29m20-41q48 28 0 56m24-70q65 46 0 80" fill="none" stroke="#e9d393" stroke-width="4"/></g>`;
  }
  function flag() {
    return `<path d="M0 0v131" stroke="#8c8060" stroke-width="7"/>${wrap('route-flag-cloth','<path d="M3 2q55-24 118 0v69q-63-24-118 0Z" fill="#e6d8aa" stroke="#a79469" stroke-width="3"/><path d="M5 3h28v21H5Zm56-3h29v24H61Zm-28 24h28v22H33Zm57 0h27v22H90Zm-85 22h28v22H5Zm56 0h29v22H61Z" fill="#697c65"/>')}`;
  }
  function wheelTracks() {
    return `<path d="M240 685q221-52 417-101t356-56m-758 173q215-50 418-103t353-58" stroke="#777a64" stroke-width="12" stroke-dasharray="14 8" fill="none" opacity=".55"/>`;
  }
  function cable() {
    return `<path d="M0 0q170 120 354 0" fill="none" stroke="#637d70" stroke-width="7" stroke-linecap="round"/><path d="M0 0q170 120 354 0" fill="none" stroke="#b6c5a6" stroke-width="2" stroke-dasharray="5 5"/>`;
  }
  function paddles() {
    return `<g data-actor="silver-paddles"><path d="M56 133v46m0-12-37 14 9 21 43-18m127-50v43m0-15 32 14-10 23-37-15" stroke="#77978e" stroke-width="5" fill="#a8c8b9" stroke-linejoin="round"/></g>`;
  }
  function child(color='#c78167') {
    return `<ellipse cy="65" rx="28" ry="6" fill="#61705c" opacity=".17"/><path d="M-13 28-14 59m27-31 1 31" stroke="#75847a" stroke-width="10" stroke-linecap="round"/><path d="M-15 1h30l6 36h-42Z" fill="${color}" stroke="#8f8268" stroke-width="2"/><path d="M-15 7-31 29m46-22 14 20" stroke="#dcae89" stroke-width="7" stroke-linecap="round"/><circle cy="-17" r="20" fill="#e1b48e" stroke="#ae8c6a" stroke-width="2"/><path d="M-20-19q1-28 25-20 18 3 16 20l-12-12-28 10Z" fill="#8a6e50"/><g class="sv-eyes"><circle cx="-7" cy="-15" r="2" fill="#4b5748"/><circle cx="7" cy="-15" r="2" fill="#4b5748"/></g><path d="M-6-4q7 7 13-1" stroke="#a47659" stroke-width="2" fill="none"/>`;
  }
  function stamps() {
    return Array.from({length:5},(_,i)=>`<g transform="translate(${52+i*34} 90)"><circle r="13" fill="#efdc9d" stroke="#aa9863" stroke-width="2"/><path d="m-6 0 4 5 8-11" stroke="#71875b" stroke-width="3" fill="none"/></g>`).join('');
  }
  function animate({time,motion,actors,attrs}) {
    const tick=motion?time:0;
    for(let i=0;i<58;i++) if(actors[`route-rain-${i}`]) attrs(actors[`route-rain-${i}`],{transform:`translate(${(i*103+tick*38)%1360-40} ${(i*137+tick*430)%830-55})`});
    for(let i=0;i<3;i++) if(actors[`route-ripple-${i}`]) attrs(actors[`route-ripple-${i}`],{transform:`scale(${.55+((tick*.35+i*.27)%1)*.5})`,opacity:.35+Math.sin(tick*2+i)*.15});
    for(let i=0;i<6;i++) if(actors[`route-pool-ripple-${i}`]) attrs(actors[`route-pool-ripple-${i}`],{transform:`translate(${820+i%2*230+Math.sin(tick*.8+i)*20} ${560+Math.floor(i/2)*59})`});
    if(actors['route-gutter']) attrs(actors['route-gutter'],{transform:`translate(0 ${Math.sin(tick*5)*3})`});
    if(actors['signal-glow']) attrs(actors['signal-glow'],{opacity:.17+Math.sin(tick*2)*.08});
    if(actors['route-flag-cloth']) attrs(actors['route-flag-cloth'],{transform:`skewY(${Math.sin(tick*1.8)*4})`});
  }
  return {wrap,sky,sign,rain,mountainRoad,garage,tunnel,judge,bus,truck,deer,bridge,map,envelope,fuelPump,fuelCan,gauge,podium,trafficLight,radio,flag,wheelTracks,cable,paddles,child,stamps,animate};
}
