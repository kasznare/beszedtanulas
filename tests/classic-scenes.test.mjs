import test from 'node:test';
import assert from 'node:assert/strict';
import { STORY_VISUAL_LIBRARY, storyCaptionAt } from '../story-visual-library.js';
import { STORY_CAPTION_TIMES } from '../story-caption-timing.js';
import { storyAnimationTime, storyPlaybackTime } from '../story-playback-timing.js';

const classics=STORY_VISUAL_LIBRARY.filter(story=>Number(story.id.slice(6))>=13);
test('classics use recording seconds and poems pair nonempty lines with character-aligned captions',()=>{
  for(const story of classics){
    assert.equal(story.captions.length, STORY_CAPTION_TIMES[story.id].length, story.id);
    for(const caption of story.captions){
      assert.equal(storyCaptionAt(story.id,caption.time),caption.text);
      assert.equal(storyAnimationTime(story.id,caption.time),caption.time);
      assert.equal(storyPlaybackTime(story.id,caption.time),caption.time);
    }
  }
});
test('spoken actions and final paragraphs all have narrative scenes',()=>{
  const anchors={
    'story-13':[['diamond',11.88],['well-drop',66],['drink',71.84],['water',104.08],['wasps-in',138],['wasps-out',170.56],['money',199.52],['wealth',209.72]],
    'story-14':[['twig',30.36],['show',35.2],['know',41.68],['leave',48.96],['unfinished',53.92]],
    'story-15':[['salt',59.68],['hide',117.44],['emerge',156.56],['wedding',198.56],['carriage',253.92],['soup',283.6],['door',355.44],['ending',378.08]],
    'story-16':[['sew',23.36],['crane-stork',26.4],['bittern',27.92],['hoopoe',36.92],['little-shoe',47.88]],
    'story-17':[['chest-flight',14.16],['seeds',24.16],['mother-eggs',33.6],['ears',36.16],['friends',48.96],['treasured',51.52]]
  };
  for(const story of classics)for(const [id,time] of anchors[story.id])assert.equal(story.scenes.find(s=>s.id===id)?.time,time,`${story.id}/${id}`);
});
