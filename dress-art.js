const SVG = "http://www.w3.org/2000/svg";
const clothing = {
  sapka: '<path d="M17 65V51a33 33 0 0 1 66 0v14" fill="#628fb8"/><path d="M50 18c-11 12-15 28-15 47M50 18c11 12 15 28 15 47" fill="none" stroke="#8fafd0" stroke-width="4"/><rect x="12" y="59" width="76" height="23" rx="9" fill="#426f98"/><circle cx="50" cy="13" r="11" fill="#c9ddec"/><path d="M23 65v10m11-10v10m11-10v10m11-10v10m11-10v10m11-10v10" stroke="#628fb8" stroke-width="3"/>',
  polo: '<path d="m30 16-23 16 13 23 12-7v39h36V48l12 7 13-23-23-16H60q-10 16-20 0z" fill="#e6b757" stroke="#c5953a" stroke-width="2" stroke-linejoin="round"/><path d="M40 16q10 16 20 0" fill="none" stroke="#fff0c1" stroke-width="5"/><path d="M36 69h28M36 77h28" stroke="#f4d78c" stroke-width="5"/><path d="m50 39 4 8 9 1-7 6 2 9-8-5-8 5 2-9-7-6 9-1z" fill="#fff2c8"/>',
  sal: '<path d="m43 38-8 47 21 3 10-49z" fill="#b85f58"/><path d="M36 72l23 4M35 80l22 4" stroke="#eaa49a" stroke-width="4"/><path d="m36 87-1 8m9-7-1 8m9-6-1 8" stroke="#b85f58" stroke-width="4"/><path d="M15 25q35 13 70 0v22q-35 15-70 0z" fill="#d87f71"/><path d="M23 32q27 10 54 0" fill="none" stroke="#f2b5a3" stroke-width="5" stroke-linecap="round"/>',
  cipo: '<path d="M16 29h23l12 20 32 11q9 4 9 15v6H9V55z" fill="#8b82b2" stroke="#716693" stroke-width="2"/><path d="M9 73h83v12H9z" fill="#fdf5e7" stroke="#c6c0cf" stroke-width="2"/><path d="M40 43l-10 6m17 3-11 6m21 0-11 6" fill="none" stroke="#fff5e9" stroke-width="5" stroke-linecap="round"/><path d="M17 39h16v21H12" fill="#b0a8ce"/>',
};

export function createDressIcon(id) {
  const svg = document.createElementNS(SVG, "svg");
  svg.setAttribute("viewBox", "0 0 100 100");
  svg.setAttribute("aria-hidden", "true");
  svg.classList.add("dress-icon");
  svg.innerHTML = clothing[id];
  return svg;
}

export function createDressBear(container = document.querySelector("#dress-bear")) {
  const bear = document.querySelector("#teddy-game .teddy-illustration").cloneNode(true);
  bear.querySelector("#teddy-mouth").removeAttribute("id");
  // The scarf replaces the picnic bow, while the shared face keeps its reactions.
  bear.querySelectorAll(":scope > path, :scope > circle").forEach(element => element.remove());
  function garment(id, parent, x, y, width, height, before = null) {
    const group = document.createElementNS(SVG, "g");
    group.dataset.garment = id;
    group.classList.add("dress-garment");
    const icon = createDressIcon(id);
    for (const [key, value] of Object.entries({ x, y, width, height })) icon.setAttribute(key, value);
    group.append(icon);
    parent.insertBefore(group, before);
  }
  garment("polo", bear.querySelector(".teddy-body"), 74, 177, 212, 132, bear.querySelector(".teddy-paw"));
  garment("sapka", bear.querySelector(".teddy-head"), 116, 13, 128, 116);
  garment("sal", bear, 124, 188, 112, 112);
  garment("cipo", bear, 77, 263, 82, 64);
  garment("cipo", bear, 200, 263, 82, 64);
  container.append(bear);
  return {
    wear(id) { bear.querySelectorAll(`[data-garment="${id}"]`).forEach(item => item.classList.add("is-worn")); },
    reset() { bear.querySelectorAll(".is-worn").forEach(item => item.classList.remove("is-worn")); },
  };
}
