import { AUDIOBOOKS } from './audiobook-data.js';
import { STORY_VISUAL_SCENES, STORY_VISUAL_DURATION } from './story-visual-data.js';
import { STORY_CAPTION_TIMES } from './story-caption-timing.js';
import { STORY_PLAYBACK_MAPS } from './story-playback-maps.js';
import { STORIES as workshop } from './story-scenes/workshop.js';
import { STORIES as routes } from './story-scenes/routes.js';
import { STORIES as seasons } from './story-scenes/seasons.js';
import { STORIES as classicTales } from './story-scenes/classic-tales.js';
import { STORIES as classicPoems } from './story-scenes/classic-poems.js';
import { STORIES as requestedClassics } from './story-scenes/requested-classics.js';

const definitions = new Map([...workshop, ...routes, ...seasons, ...classicTales, ...classicPoems, ...requestedClassics].map(story => [story.id, story]));
definitions.set('story-01', { id: 'story-01', legacy: true, duration: STORY_VISUAL_DURATION, scenes: STORY_VISUAL_SCENES });
export const STORY_VISUAL_LIBRARY = AUDIOBOOKS.filter(story => story.illustrated !== false).map(story => {
  const definition = definitions.get(story.id);
  if (!definition) throw Error(`Missing story visuals: ${story.id}`);
  return { ...story, ...definition, duration: story.duration,
    visualDuration: definition.duration ?? STORY_PLAYBACK_MAPS[story.id]?.originalDuration ?? story.duration,
    captions: story.text.split('\n').filter(text => text.trim()).map((text, index) => ({ text, time: STORY_CAPTION_TIMES[story.id][index] })) };
});
const library = new Map(STORY_VISUAL_LIBRARY.map(story => [story.id, story]));
export const storyVisualFor = id => library.get(id);

function cueAt(cues, seconds) {
  const time = Number.isFinite(seconds) ? Math.max(0, seconds) : 0;
  let index = 0;
  while (index + 1 < cues.length && cues[index + 1].time <= time) index++;
  return cues[index];
}
/** Scene actions use the original animation clock; captions use recording seconds. */
export function storySceneAt(id, seconds) { return cueAt(library.get(id).scenes, seconds); }
export function storyCaptionAt(id, seconds) {
  const story = library.get(id);
  return seconds < story.captions[0].time || !Number.isFinite(seconds) ? story.title : cueAt(story.captions, seconds).text;
}
