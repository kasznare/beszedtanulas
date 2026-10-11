import test from 'node:test';
import assert from 'node:assert/strict';
import { AUDIOBOOKS } from '../audiobook-data.js';
import { STORY_PLAYBACK_MAPS } from '../story-playback-maps.js';
import { STORY_VISUAL_ID, STORY_VISUAL_DURATION, STORY_VISUAL_SCENES, STORY_VISUAL_CAPTIONS, storySceneAt, storyCaptionAt } from '../story-visual-data.js';

test('original visual cues retain their authored timeline and all story paragraphs',()=>{
  const story=AUDIOBOOKS.find(story=>story.id===STORY_VISUAL_ID);
  assert.equal(STORY_VISUAL_DURATION,STORY_PLAYBACK_MAPS[story.id]?.originalDuration ?? story.duration);
  assert.deepEqual(STORY_VISUAL_CAPTIONS.slice(1).map(caption=>caption.text),story.text.split('\n'));
  for(const list of [STORY_VISUAL_SCENES,STORY_VISUAL_CAPTIONS]){
    assert.equal(list[0].time,0);
    assert.ok(list.every((cue,index)=>cue.time>=0&&cue.time<STORY_VISUAL_DURATION&&(!index||cue.time>list[index-1].time)));
  }
});
test('seeking across an event boundary chooses the narrated scene in either direction',()=>{
  for(let index=1;index<STORY_VISUAL_SCENES.length;index++){
    const scene=STORY_VISUAL_SCENES[index];
    assert.equal(storySceneAt(scene.time).id,scene.id);
    assert.equal(storySceneAt(scene.time-.001).id,STORY_VISUAL_SCENES[index-1].id);
    assert.equal(storySceneAt(scene.time+.001).id,scene.id);
  }
  assert.equal(storySceneAt(STORY_VISUAL_DURATION).id,'together');
  assert.equal(storySceneAt(-5).id,'garden');
  assert.equal(storySceneAt(NaN).id,'garden');
  assert.equal(storySceneAt(Infinity).id,'garden');
  assert.equal(storySceneAt(999).id,'together');
});
test('captions stay correct when jumping to the middle, end and beginning',()=>{
  assert.match(storyCaptionAt(101),/vízsugarat/);
  assert.match(storyCaptionAt(244),/segítsünk együtt/);
  assert.equal(storyCaptionAt(0),AUDIOBOOKS[0].title);
});
