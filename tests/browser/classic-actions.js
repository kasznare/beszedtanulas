async page => {
  await page.emulateMedia({reducedMotion:'no-preference'});
  await page.goto('http://127.0.0.1:5187/output/story-library/?story=story-13');
  await page.waitForFunction(()=>storyLibraryPreview.ready);
  return await page.evaluate(()=>{
    const v=storyLibraryPreview.visual,host=document.querySelector('#visual'),checks=[];
    const ok=(value,label)=>{if(!value)throw Error(label);checks.push(label);};
    const read=(id,t,selector,attribute='transform')=>{v.select(id,t,false);v.setMotion(true);v.render(t);return host.querySelector(selector)?.getAttribute(attribute);};
    const moves=(id,t1,t2,selector,label)=>ok(read(id,t1,selector)!==read(id,t2,selector),label);
    moves('story-13',8,8.3,'.cl-foot-left','Scratching feet move');
    moves('story-13',50.1,50.3,'.cl-wing','Rooster flaps during the window flight');
    const before=Number(read('story-13',75.4,'[data-actor="water-level"] rect','height'));
    const after=Number(read('story-13',78.5,'[data-actor="water-level"] rect','height'));
    ok(after<before,'The well water decreases inside the cutaway');
    ok(Number(read('story-13',109.5,'[data-actor="flames"]','opacity'))<Number(read('story-13',104.1,'[data-actor="flames"]','opacity')),'The water puts out the fire');
    ok(Number(read('story-13',144.2,'[data-actor="wasp0"]','opacity'))===0,'Wasps have entered the crop');
    ok(Number(read('story-13',176.5,'[data-actor="wasp0"]','opacity'))>.8,'Wasps emerge from the crop');
    ok(Number(read('story-13',207.6,'[data-actor="gold0"]','opacity'))<.1,'The treasure leaves the tubs');
    moves('story-14',31.1,32.1,'[data-actor="twig"]','The magpie places the twig');
    moves('story-14',51,53,'[data-actor="magpie"]','The magpie leaves the unfinished nest');
    moves('story-15',120.4,122.4,'[data-actor="princess"]','The princess runs into the hollow');
    moves('story-15',159.6,162.4,'[data-actor="princess"]','The princess comes out of the hollow');
    moves('story-15',255,256,'.cl-horse-leg','The six carriage horses walk');
    moves('story-15',287,290.5,'[data-actor="spoon"]','The king raises the soup spoon');
    moves('story-15',358.8,361.7,'[data-actor="princess"]','The queen enters through the door');
    moves('story-16',23.5,24.5,'[data-actor="needle"]','Varjú Varga Pál sews the boots');
    moves('story-16',46,47.5,'[data-actor="tit"]','The tit flies from branch to branch');
    moves('story-17',14.3,15.7,'[data-actor="hen"]','The hen flies onto the chest');
    moves('story-17',24.3,25.4,'.cl-bird-head','The hen pecks the hemp seeds');
    moves('story-17',49,49.4,'.cl-dog-tail','Morzsa gently wags his tail');
    moves('story-17',49,49.4,'.sv-cloud','Cloud drift remains visible through the window');
    v.setMotion(false);v.render(49.1);const still=host.innerHTML;v.render(51.4);
    ok(still===host.innerHTML,'Motion toggle freezes the entire friendship scene');
    return {checks:checks.length,passed:checks};
  });
}
