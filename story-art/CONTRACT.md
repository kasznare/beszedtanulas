# Shared animated story art contract

All stories reuse `createBaseArt(prefix)` from `story-art/base.js`. Shared models belong in this directory; narrative timelines and actions belong in `story-scenes/`. Keep model improvements in one shared factory rather than copying a drawing into individual stories.

The base art API exposes `defs` (SVG definitions string), `paint(name)`, `head(kind='bear',helmet='')`, `standing(kind='bear',uniform='',helmet='')`, `girl(watering=false)`, `wheel(x,y=125,radius=26)`, `car(police=true)`, `excavator()`, `serviceTruck(ambulance=false)`, `crane()`, `plant(x,y,index,flower=false)`, `tree(x,y,scale,index)`, `house(x,y,scale=1)`, `background(gardenBoolean,ending=false)`, and `raceCar({color='red',eyes='friendly',accessory=''})`. The raceCar origin is top-left with a 260×155 bbox, wheels at local y=125; its face/eyes are on the windshield, with no separate driver. Colors: red/blue/yellow/green/silver. This is the common model for Villám, Turbó, Pötty and the silver car in all stories.

`story-scenes/<your-bundle>.js` exports `STORIES`, an array of definitions:

```js
{ id:'story-02', scenes:[{time:0,id:'opening',title:'Reggel',setting:'garden'}, ...],
  frame(scene, art) { return `<svg viewBox="0 0 1280 720" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">${art.defs}${art.background(true)}<g data-actor="bear">${art.standing()}</g>...</svg>`; },
  render({time,local,scene,motion,host,actors,pose,attrs,progress,smooth,mix}) {
    // Called with actual recording seconds; local=time-scene.time.
    // pose(actorName,x,y,scale=1,angle=0,pivotX=0,pivotY=0).
    // attrs(node,{attribute:value,...}); actors is a dictionary of [data-actor].
    // progress(time,start,end), smooth(unitProgress), mix(a,b,unitProgress).
  }
}
```

Use `scene.rolling=true` (180 degrees/second) or a numeric degrees/second value while driving; stopped scenes default to 0. The common renderer applies cloud drift, plant/tree sway, blinking, bird/butterfly motion, sun rays, wheel spinning and compatible ambient classes from base.js. All custom actions must be deterministic functions of the audio time (no CSS/keyframe animation, wall clock, random numbers or timers). Reduced motion passes `motion=false` and a stable representative time for each scene; leave essential objects visible in that pose. Use SVG wrappers for nested independently moving parts. Keep actors within 1280×720 except deliberate entrances. Draw actors after scenery, foreground people after machines. Scope IDs through `art.paint` / prefix; no unresolved references.

Original fixed audio/text are in audiobook-data.js and content/stories/. Accurate concatenated WordBoundary timing is in `output/story-timing/story-XX.json`: `{id,title,duration,words:[{time,text,duration}],paragraphs:[{time,text,index,matched}]}`. Use these original times for scene/event anchors, covering the full recording through the final paragraph. No new audio generation. Full story content and helpful action changes, not a generic repeated placeholder scene. Target the approved first SVG story quality, with more perceptible cloud drift and varied narrated motions. Small atmospheric motion should support the story and respect the setting (no flowers/butterflies underground or in blizzards).

Each bundle should have at least 12 genuinely distinct scenes per story, more for long/adventure stories. Assets are shared factory functions rather than copied inline character/vehicle drawings. New props/settings should live in your shared story-art module and be reused by all relevant stories. The registry in story-visual-library.js imports all bundles. Stories authored directly against the current recording declare `visualClock: "recording"` in the catalog and have no legacy warp map. Poem captions use nonempty lines; stanza breaks remain in the full source text.

Validate new scenes with the Node and Chrome/WebKit checks and inspect the library preview.
