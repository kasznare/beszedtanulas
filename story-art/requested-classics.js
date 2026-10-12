import { createClassicArt } from './classic-settings.js';

// Shared additions to the established SVG cast, all in the same soft palette.
export function createRequestedArt(base) {
  const art = createClassicArt(base);
  const child = () => art.person('boy', { dress: '#789ca0' });
  const farmer = () => art.person('farmer', { dress: '#9d9870' }) + '<path d="M-20-193q12-15 20-5 10-11 22 5-18 8-22 0-7 8-20 0Z" fill="#72553e"/>';
  const grandmother = () => art.person('servant', { dress: '#a491aa' }).replaceAll('#8f6546', '#c0baaa');
  const lily = () => '<g class="sv-plant"><path d="M0 0q-16-65 0-123M-4-32q-65-12-57-89 60 23 57 89M3-24q54-37 49-97-47 21-49 97" fill="#82a277" stroke="#5b805c" stroke-width="3"/><path d="M0-124q42-8 51 60" fill="none" stroke="#618760" stroke-width="4"/>' + [[13,-117],[29,-105],[41,-88],[48,-69]].map(([x,y])=>`<path d="M${x-9} ${y}q9-19 18 0l2 9q-11 9-22 0Z" fill="#f9f7e7" stroke="#bbcab2" stroke-width="2"/>`).join('') + '</g>';
  const butterfly = () => '<g class="rq-wings"><path d="M0 0q-66-73-82-7-4 30 73 34-34 59 17 41L0 0Z" fill="#e8b96e" stroke="#98764e" stroke-width="3"/><path d="M0 0q66-73 82-7 4 30-73 34 34 59-17 41L0 0Z" fill="#c792a4" stroke="#98764e" stroke-width="3"/></g><path d="M0-19v51m0-48-13-17m13 17 13-17" stroke="#725d47" stroke-width="5" stroke-linecap="round"/>';
  const squirrel = () => '<g data-model="ground-squirrel"><ellipse cy="4" rx="57" ry="10" fill="#59523e" opacity=".14"/><path d="M28-15q62-10 38-47" fill="none" stroke="#ac8661" stroke-width="15" stroke-linecap="round"/><path d="M-29-19q-15-61 16-87 38-1 49 58L24-8h-48Z" fill="#c5a075" stroke="#80694d" stroke-width="3"/><path d="M-12-71q26-7 32 38l-2 20h-28Z" fill="#e2c29a"/><ellipse cx="-19" cy="-89" rx="35" ry="27" fill="#c5a075" stroke="#80694d" stroke-width="3"/><circle cx="-8" cy="-113" r="10" fill="#c5a075" stroke="#80694d" stroke-width="3"/><ellipse cx="-49" cy="-83" rx="12" ry="8" fill="#e4c8a0"/><circle cx="-58" cy="-87" r="4" fill="#5e5142"/><g class="sv-eyes"><circle cx="-31" cy="-94" r="4" fill="#484738"/></g><path d="M-20-45-42-29m60-17 16 20m-42 19-25 5m51-5 22 5" stroke="#80694d" stroke-width="6" stroke-linecap="round"/></g>';
  const bucket = (full = true) => '<path d="M-34-59q0-59 68 0" fill="none" stroke="#7b806d" stroke-width="5"/><path d="M-42-57h84L31 0h-62Z" fill="#b2bcb0" stroke="#7b806d" stroke-width="4"/>' + (full ? '<ellipse cy="-55" rx="36" ry="8" fill="#93c0c7"/>' : '');
  const field = () => art.sky() + '<path d="M0 530q340-64 660 5t620-6v191H0Z" fill="#c6b884"/><path d="M0 652q370-21 760 12t520-2" stroke="#b79d67" stroke-width="4" fill="none"/>' + art.grass();
  const fence = () => '<g stroke="#a88d65" stroke-width="5" fill="#d0b38a"><path d="M630 444v230m-28-230h56v230h-56Z"/><path d="M0 523h1280v28H0Zm0 76h1280v28H0Z"/></g>';
  const night = () => '<rect width="1280" height="720" fill="#586782"/><circle cx="1060" cy="108" r="38" fill="#f4e7bd"/>' + Array.from({length:19},(_,i)=>`<circle cx="${55+i*62}" cy="${42+i%4*43}" r="2" fill="#e8e5d0"/>`).join('') + '<path d="M0 520q240-99 640-10t640-60v270H0Z" fill="#73836d"/>' + art.grass();
  return { ...art, child, farmer, grandmother, lily, butterfly, squirrel, bucket, field, fence, night };
}
