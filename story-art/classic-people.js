// Feet at (0,0), approximately 105 × 255; the same cast throughout each work.
const stroke = '#725c4a';
export function classicPerson(kind = 'princess', { dress = '#d18b77', worn = false, jeweled = false } = {}) {
  const old = kind === 'king', sultan = kind === 'sultan', young = kind === 'prince';
  const royal = old || young || kind === 'princess', female = ['princess', 'mother', 'servant'].includes(kind);
  const skin = '#ebc5a3', clothing = sultan ? '#6d999b' : old ? '#ba7863' : young ? '#628b92' : dress;
  const hair = old ? '#d5ceba' : female ? '#8f6546' : '#72553e';
  return `<g data-model="person-${kind}">
    <ellipse cy="3" rx="58" ry="9" fill="#514c3a" opacity=".13"/>
    <g class="cl-leg-left" transform="translate(-21 -5)"><path d="M0-48V0" stroke="${female ? skin : '#666958'}" stroke-width="17" stroke-linecap="round"/><path d="M-10-5h18l8 10h-33Z" fill="#705446" stroke="${stroke}" stroke-width="2"/></g>
    <g class="cl-leg-right" transform="translate(21 -5)"><path d="M0-48V0" stroke="${female ? skin : '#666958'}" stroke-width="17" stroke-linecap="round"/><path d="M-10-5h18l8 10h-33Z" fill="#705446" stroke="${stroke}" stroke-width="2"/></g>
    <g class="cl-breathe">
      ${sultan ? '<path d="M-36-73q-31 67 12 64l24-17 26 17q42 3 12-64Z" fill="#739c9c" stroke="#496f72" stroke-width="3"/>' : ''}
      ${royal ? `<path d="M-37-170q-25 47-30 122l27 18h84l27-18q-8-82-34-122Z" fill="${old ? '#a14f4c' : young ? '#aabfa3' : '#edc9a0'}" stroke="${stroke}" stroke-width="2.5"/>` : ''}
      <path d="M-33-173q33-16 66 0l${female ? '20 130q-54 16-106 0' : '8 102h-82'}Z" fill="${clothing}" stroke="${stroke}" stroke-width="3"/>
      ${female ? `<path d="M-23-155h46l16 100q-36 13-76 0Z" fill="${royal ? '#f0cba0' : '#f3e4c2'}" opacity=".65"/><path d="M-46-50q46 13 92 0" stroke="#f5d2a0" stroke-width="4" fill="none"/>` : '<path d="M-35-83h70" stroke="#c5a770" stroke-width="9"/><circle cy="-83" r="6" fill="#edd08d"/>'}
      ${jeweled ? '<path d="M-26-148q26 13 52 0M-39-61q39 10 78 0" stroke="#f5dc99" stroke-width="5" fill="none"/><g fill="#e3ede2" stroke="#93aca8" stroke-width="1.5"><path d="m0-143 7 8-7 9-7-9Zm-18 30 6 7-6 8-6-8Zm36 0 6 7-6 8-6-8ZM0-94l6 7-6 8-6-8Z"/></g>' : ''}
      ${worn ? '<path d="m-42-51 12-6 9 12 12-6 15 7 18-9 16 6M-22-102l15-8 8 22-17 8Z" fill="#b09a72" stroke="#8e765b" stroke-width="2"/>' : ''}
      <g transform="translate(-33 -158)"><g class="cl-arm-left"><path d="M0 0q-21 30-18 57" fill="none" stroke="${clothing}" stroke-width="17" stroke-linecap="round"/><circle cx="-18" cy="58" r="10" fill="${skin}" stroke="${stroke}" stroke-width="1.5"/></g></g>
      <g transform="translate(33 -158)"><g class="cl-arm-right"><path d="M0 0q22 28 18 55" fill="none" stroke="${clothing}" stroke-width="17" stroke-linecap="round"/><circle cx="18" cy="56" r="10" fill="${skin}" stroke="${stroke}" stroke-width="1.5"/></g></g>
      <g transform="translate(0 -207)"><g class="cl-human-head">
        ${female ? `<path d="M-36 12q-8-61 35-57 45-4 38 60l-11 22h-51Z" fill="${hair}" stroke="${stroke}" stroke-width="2"/>` : ''}
        <ellipse rx="31" ry="36" fill="${skin}" stroke="${stroke}" stroke-width="2"/><circle cx="-31" cy="1" r="6" fill="${skin}"/><circle cx="31" cy="1" r="6" fill="${skin}"/>
        <path d="M-30-13q-8-35 27-31 32-5 35 30-20-2-26-16-9 13-36 17Z" fill="${hair}"/>
        <g class="sv-eyes"><ellipse cx="-11" cy="0" rx="3.2" ry="4" fill="#4b4239"/><ellipse cx="12" cy="0" rx="3.2" ry="4" fill="#4b4239"/></g>
        <path d="m2 6-2 7 6 0M-7 20q9 7 17-1" stroke="#ae7b61" stroke-width="2" fill="none" stroke-linecap="round"/><ellipse cx="-22" cy="12" rx="6" ry="3" fill="#d89e82" opacity=".5"/>
        ${old ? '<path d="M-27 13q6 40 28 47 23-15 27-46l-15 8-11-5-12 5Z" fill="#e1dac5" stroke="#a8a394" stroke-width="2"/><path d="M-14 32q15 17 27 0" fill="none" stroke="#f6eed9" stroke-width="3"/>' : sultan ? '<path d="M-16 13q13-9 17 0 8-9 18 0l-16 5Z" fill="#5d4b3b"/>' : ''}
        ${royal ? '<path d="M-30-38-33-65-13-51 0-73 13-51 33-65 29-38Z" fill="#dfbd68" stroke="#9b7b43" stroke-width="2.5"/><path d="M-26-40h52" stroke="#f5dea1" stroke-width="5"/><circle cy="-49" r="5" fill="#6d9a97"/>' : sultan ? '<path d="M-35-20q-16-39 9-48 25-20 52 0 24 11 12 48Z" fill="#f4ead0" stroke="#aa9a76" stroke-width="3"/><path d="m-26-60 53 32m-41-39 17 42" stroke="#d7c9a7" stroke-width="8"/><ellipse cx="0" cy="-33" rx="9" ry="12" fill="#c39b4f"/><circle cy="-32" r="5" fill="#6c969b"/>' : female ? '<path d="M-37-17q5-44 37-44 33 0 40 42L9-29l-10-18-10 18Z" fill="#ded4b3" stroke="#9c9377" stroke-width="2.5"/>' : ''}
      </g></g>
    </g>
  </g>`;
}
export function classicDog() {
  return `<g data-model="dog-morzsa"><ellipse cx="0" cy="2" rx="90" ry="10" fill="#55523f" opacity=".12"/><g transform="translate(-74 -67)"><g class="cl-dog-tail"><path d="M0 0q-41-10-33-47" fill="none" stroke="#99774f" stroke-width="16" stroke-linecap="round"/></g></g><g class="cl-breathe"><path d="M-57-63v59m27-59v59m50-59v59m27-59v59" stroke="#a78456" stroke-width="15" stroke-linecap="round"/><path d="M-74-68q20-41 98-25l25 51q-76 23-123-6Z" fill="#c39b65" stroke="${stroke}" stroke-width="3"/><g transform="translate(47 -94)"><g class="cl-human-head"><path d="M-27-14q-29-24-35-1l10 40q18 5 29-26" fill="#99774f" stroke="${stroke}" stroke-width="3"/><g class="cl-dog-ear"><path d="M14-19q35-20 31 7l-8 39q-21 6-25-22" fill="#99774f" stroke="${stroke}" stroke-width="3"/></g><ellipse rx="35" ry="36" fill="#c7a26e" stroke="${stroke}" stroke-width="3"/><ellipse cx="28" cy="16" rx="29" ry="18" fill="#e1c59a" stroke="${stroke}" stroke-width="2"/><ellipse cx="51" cy="9" rx="9" ry="7" fill="#4e4b3c"/><g class="sv-eyes"><ellipse cx="11" cy="-7" rx="4" ry="5" fill="#3f453a"/></g><path d="M31 25q-11 5-17 0" fill="none" stroke="${stroke}" stroke-width="2"/><path d="M-26 29q25 13 49-1" fill="none" stroke="#638b8b" stroke-width="8"/><circle cx="0" cy="37" r="7" fill="#dfbb68"/></g></g></g></g>`;
}
