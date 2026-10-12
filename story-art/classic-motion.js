// Every transform is a pure function of recording time. No CSS clocks or timers.
const set = (node, value) => node?.setAttribute('transform', value);
const all = (node, selector, fn) => node?.querySelectorAll(selector).forEach(fn);
export function animateClassic(host, time, motion) {
  const m = Number(motion), t = motion ? time : 0;
  all(host, '.cl-breathe', (node,i) => set(node, `scale(1 ${1+m*Math.sin(t*1.65+i)*.009})`));
  all(host, '.cl-leaf', (node,i) => set(node, `rotate(${m*Math.sin(t*1.1+i)*7})`));
  all(host, '.cl-tail', (node,i) => set(node, `rotate(${m*Math.sin(t*1.2+i)*3})`));
  all(host, '.cl-dog-tail', node => set(node, `rotate(${m*Math.sin(t*2.8)*13})`));
  all(host, '.cl-dog-ear', node => set(node, `rotate(${m*Math.sin(t*.8)*3})`));
  all(host, '.cl-wasp-wings', (node,i) => set(node, `scale(1 ${.8+m*Math.sin(t*9+i)*.18})`));
  all(host, '.cl-horse-leg', node => set(node, `rotate(${m*Math.sin(t*5+Number(node.dataset.phase))*12} 0 -47)`));
  all(host, '.cl-fire', node => set(node, `scale(1 ${1+m*Math.sin(t*2.1)*.035})`));
}
export function birdAction(node, time, { motion = true, walk = 0, flap = 0, peck = 0, call = 0, tilt = 0 } = {}) {
  const m = Number(motion), t = motion ? time : 0;
  all(node, '.cl-foot-left', part => set(part, `rotate(${m*walk*Math.sin(t*8)*19} 0 -30)`));
  all(node, '.cl-foot-right', part => set(part, `rotate(${-m*walk*Math.sin(t*8)*19} 0 -30)`));
  all(node, '.cl-wing', part => set(part, `rotate(${m*flap*Math.sin(t*8)*44} 0 -10)`));
  all(node, '.cl-bird-head', part => set(part, `rotate(${tilt+peck*(10+m*(Math.sin(t*5)+1)*18)+m*Math.sin(t*.9)*2})`));
  all(node, '.cl-beak', part => set(part, `rotate(${m*call*(Math.sin(t*8)+1)*9})`));
}
export function personAction(node, time, { motion = true, walk = 0, gesture = 0, head = 0, embrace = 0 } = {}) {
  const m = Number(motion), t = motion ? time : 0;
  all(node, '.cl-leg-left', part => set(part, `rotate(${m*walk*Math.sin(t*6)*10} 0 -48)`));
  all(node, '.cl-leg-right', part => set(part, `rotate(${-m*walk*Math.sin(t*6)*10} 0 -48)`));
  all(node, '.cl-arm-left', part => set(part, `rotate(${embrace*50+m*walk*Math.sin(t*6)*12})`));
  all(node, '.cl-arm-right', part => set(part, `rotate(${-embrace*50-gesture*(33+m*Math.sin(t*1.6)*6)-m*walk*Math.sin(t*6)*12})`));
  all(node, '.cl-human-head', part => set(part, `rotate(${head+m*Math.sin(t*.7)*1.2})`));
}
