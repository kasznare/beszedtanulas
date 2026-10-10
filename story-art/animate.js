// One ambient-motion implementation is shared by every illustrated story.
export function collectAmbient(host) {
  const selectors={plants:'.sv-plant',trees:'.sv-tree',clouds:'.sv-cloud',birds:'.sv-bird',butterflies:'.sv-butterfly',eyes:'.sv-eyes',drivers:'.sv-driver',wheels:'.sv-wheel',glows:'.sv-glow',sun:'.sv-sun-rays',pinwheels:'.sv-pinwheel',curtains:'.sv-curtain'};
  return Object.fromEntries(Object.entries(selectors).map(([name,selector])=>[name,[...host.querySelectorAll(selector)]]));
}
const attrs=(node,values)=>{for(const [key,value] of Object.entries(values))node.setAttribute(key,String(value));};
export function animateAmbient(nodes,time,motion,{rolling=0}={}) {
  const m=motion?1:0,t=motion?time:0;
  nodes.plants.forEach((node,i)=>attrs(node,{transform:`rotate(${m*Math.sin(t*1.4+i*.87)*3.4})`}));
  nodes.trees.forEach((node,i)=>attrs(node,{transform:`rotate(${m*Math.sin(t*.65+i)*.6} 0 0)`}));
  // A broad drift is perceptible throughout a long scene, while keeping clouds on screen.
  nodes.clouds.forEach((node,i)=>attrs(node,{transform:`translate(${m*(Math.sin(t*.018+i)*118+Math.sin(t*.08+i)*8)} 0)`}));
  nodes.sun.forEach(node=>attrs(node,{transform:`rotate(${t*.8})`}));
  nodes.pinwheels.forEach(node=>attrs(node,{transform:`rotate(${t*34})`}));
  nodes.curtains.forEach(node=>attrs(node,{transform:`translate(${m*Math.sin(t*.8)*1.8} 0)`}));
  nodes.birds.forEach((node,i)=>{attrs(node,{transform:`translate(${Number(node.dataset.x)+m*Math.sin(t*.18+i)*53} ${Number(node.dataset.y)+m*Math.sin(t*.8+i)*6})`});const wings=node.querySelector('.sv-bird-wings');if(wings)attrs(wings,{transform:`scale(1 ${.55+m*Math.sin(t*4+i)*.4})`});});
  nodes.butterflies.forEach((node,i)=>{attrs(node,{transform:`translate(${280+i*510+m*Math.sin(t*.37+i)*45} ${460-i*46+m*Math.cos(t*.57+i)*27}) scale(.55)`});const wings=node.querySelector('.sv-butterfly-wings');if(wings)attrs(wings,{transform:`scale(${.8-m*Math.sin(t*6+i)*.28} 1)`});});
  nodes.eyes.forEach((node,i)=>{const cycle=(t+i*.59)%5.2;attrs(node,{transform:`scale(1 ${motion&&cycle>4.98?.12:1})`});});
  nodes.drivers.forEach(node=>{const head=node.querySelector('.sv-head');if(head)attrs(head,{transform:`rotate(${m*Math.sin(t*.8)*1.2})`});});
  nodes.glows.forEach(node=>attrs(node,{opacity:.15+m*(Math.sin(t*2.2)+1)*.13}));
  nodes.wheels.forEach(node=>attrs(node,{transform:`rotate(${motion?t*rolling:0})`}));
}
