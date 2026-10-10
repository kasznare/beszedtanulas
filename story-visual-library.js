import { AUDIOBOOKS } from './audiobook-data.js';
import { STORY_VISUAL_SCENES } from './story-visual-data.js';
import { STORY_CAPTION_TIMES } from './story-caption-timing.js';
import { STORIES as workshop } from './story-scenes/workshop.js';
import { STORIES as routes } from './story-scenes/routes.js';
import { STORIES as seasons } from './story-scenes/seasons.js';

const definitions = new Map([...workshop, ...routes, ...seasons].map(story => [story.id, story]));
definitions.set('story-01', { id: 'story-01', legacy: true, scenes: STORY_VISUAL_SCENES });
export const STORY_VISUAL_LIBRARY = AUDIOBOOKS.map(story => {
  const definition = definitions.get(story.id);
  if (!definition) throw Error(`Missing story visuals: ${story.id}`);
  return { ...story, ...definition, captions: story.text.split('\n').map((text, index) => ({ text, time: STORY_CAPTION_TIMES[story.id][index] })) };
});
const library = new Map(STORY_VISUAL_LIBRARY.map(story => [story.id, story]));
export const storyVisualFor = id => library.get(id);

function cueAt(cues, seconds) {
  const time = Number.isFinite(seconds) ? Math.max(0, seconds) : 0;
  let index = 0;
  while (index + 1 < cues.length && cues[index + 1].time <= time) index++;
  return cues[index];
}
export function storySceneAt(id, seconds) { return cueAt(library.get(id).scenes, seconds); }
export function storyCaptionAt(id, seconds) {
  const story = library.get(id);
  return seconds < story.captions[0].time || !Number.isFinite(seconds) ? story.title : cueAt(story.captions, seconds).text;
}
