// Birds face right, with their feet at (0, 0). All narratives share these models.
const outline = '#4d5145';
const eye = (x, y, r = 4) => `<g transform="translate(${x} ${y})"><g class="sv-eyes"><circle r="${r}" fill="#303d39"/><circle cx="1" cy="-1.3" r="1.2" fill="#fff9e7"/></g></g>`;
export function classicBird(kind = 'tit') {
  const long = ['stork', 'crane', 'bittern'].includes(kind);
  const rooster = kind === 'rooster', hen = kind === 'hen', poultry = rooster || hen;
  const crow = kind === 'crow', magpie = kind === 'magpie', tit = kind === 'tit', hoopoe = kind === 'hoopoe';
  const body = rooster ? '#ca7850' : hen ? '#d9af72' : crow ? '#424f56' : magpie ? '#f7f0db' : tit ? '#e7c85e' : hoopoe ? '#ca946b' : kind === 'bittern' ? '#b7a27a' : kind === 'crane' ? '#b2bdbc' : long ? '#f8f2dc' : '#9aaeb8';
  const wing = rooster ? '#dba266' : hen ? '#bb854e' : crow || magpie ? '#3e5159' : tit ? '#819398' : hoopoe ? '#f2e3c6' : kind === 'bittern' ? '#978663' : long ? '#435961' : '#738e9c';
  const neckY = long ? -178 : poultry ? -102 : -88;
  return `<g data-model="bird-${kind}">
    <g class="cl-foot cl-foot-left" transform="translate(-20 0)"><path d="M0 ${long ? -88 : -35}V-4m0 0-13 5m13-5 16 4m-16-4 3 7" fill="none" stroke="${kind === 'stork' ? '#b76f52' : long ? '#a57655' : '#b78a4b'}" stroke-width="${long ? 5 : 4}" stroke-linecap="round"/></g>
    <g class="cl-foot cl-foot-right" transform="translate(22 0)"><path d="M0 ${long ? -88 : -34}V-4m0 0-12 5m12-5 15 4m-15-4 4 7" fill="none" stroke="${kind === 'stork' ? '#b76f52' : long ? '#a57655' : '#b78a4b'}" stroke-width="${long ? 5 : 4}" stroke-linecap="round"/></g>
    <g class="cl-breathe">
      <g transform="translate(-48 ${long ? -102 : -51})"><g class="cl-tail">
        ${rooster ? '<path d="M10 3Q-94-105-106-65q-4 28 40 64Q-143-46-126-12q10 29 55 33Q-132 6-119 35q22 23 96 4Z" fill="#527974" stroke="#385d56" stroke-width="3"/><path d="M-85-62q37 5 66 45m-96 6q47 3 88 34" fill="none" stroke="#82a397" stroke-width="4"/>' : `<path d="M14 5Q-28-18-${magpie ? '127' : '86'}-${magpie ? '30' : '19'}l${magpie ? '15 24' : '9 25'}Q-26 44 17 31Z" fill="${wing}" stroke="${outline}" stroke-width="2.5"/>`}
      </g></g>
      <ellipse cx="0" cy="${long ? -106 : -62}" rx="${poultry ? 67 : long ? 58 : 55}" ry="${poultry ? 47 : long ? 36 : 36}" fill="${body}" stroke="${outline}" stroke-width="3"/>
      ${tit ? '<path d="M30-94q9 34-7 64l-14-2q9-32-1-62Z" fill="#354b50"/>' : ''}
      <g transform="translate(-20 ${long ? -108 : -67})"><g class="cl-wing"><path d="M-27-15Q16-31 46 12 6 42-31 12Z" fill="${wing}" stroke="${outline}" stroke-width="2.5"/><path d="M-18-5q16 26 49 19m-47-9q14 22 34 19" fill="none" stroke="${tit || magpie || hoopoe ? '#f9f1dd' : '#d4cfb4'}" stroke-width="${tit || hoopoe ? 5 : 3}" opacity=".8"/>
        ${hoopoe ? '<path d="M-24-7 8 27m-14-43 34 35m-12-32 24 22" stroke="#4b5658" stroke-width="9"/>' : ''}
        ${kind === 'bittern' ? '<path d="m-13-9 15 25m-2-31 16 23m0-21 12 15" stroke="#d0bb90" stroke-width="3"/>' : ''}
      </g></g>
      ${long ? `<path d="M20-117q42-16 30-59" fill="none" stroke="${outline}" stroke-width="29" stroke-linecap="round"/><path d="M20-117q42-16 30-59" fill="none" stroke="${body}" stroke-width="23" stroke-linecap="round"/>` : ''}
      <g transform="translate(${long ? 50 : 42} ${neckY})"><g class="cl-bird-head">
        ${hoopoe ? '<path d="M-20-9q-33-30-19-38l20 15q-6-28 5-26l9 26q10-23 16-13l-5 26" fill="#d5a573" stroke="#55574a" stroke-width="3"/><path d="m-35-43 8 8m13-20 3 9m20-18 0 8" stroke="#43545b" stroke-width="7"/>' : ''}
        ${poultry ? `<path d="M-18-23q-13-20-3-24 9-4 13 10 2-23 13-21 10 3 6 21 11-16 17-9 6 10-7 23" fill="#b85146" stroke="#923f39" stroke-width="2"/>` : ''}
        <ellipse rx="${poultry ? 29 : 27}" ry="${poultry ? 32 : 25}" fill="${tit ? '#344e54' : magpie ? '#3f535d' : body}" stroke="${outline}" stroke-width="2.5"/>
        ${tit ? '<path d="M-17 0q8-12 17-4 6 7 18 1l-3 14q-19 11-32-5Z" fill="#f8f0d7"/>' : kind === 'dove' ? '<path d="M-21 16q14 10 29 1" fill="none" stroke="#e0e5d5" stroke-width="6"/>' : ''}
        ${kind === 'crane' ? '<path d="M-5-22q12-10 20 1" fill="none" stroke="#b35547" stroke-width="6"/>' : ''}
        ${poultry ? '<path d="M15 16q15 18 2 26-11-1-10-21" fill="#c16150" stroke="#a44e43" stroke-width="2"/>' : ''}
        <g transform="translate(25 3)"><g class="cl-beak"><path d="M-3-8 ${long ? '66-2 0 8' : hoopoe ? '44 18 1 3' : crow ? '35 0 0 10' : '22 1 0 10'}Z" fill="${crow ? '#69726e' : kind === 'stork' ? '#c56b4f' : long ? '#bd7851' : '#d8ac59'}" stroke="${outline}" stroke-width="2"/></g></g>
        ${eye(10, -7)}
      </g></g>
    </g>
  </g>`;
}
