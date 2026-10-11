import { STORY_PLAYBACK_MAPS } from './story-playback-maps.js';

const clockTime = seconds => Number.isFinite(seconds) ? Math.max(0, seconds) : 0;

/** Word anchors keep existing actions in step with a differently paced recording. */
export function createStoryPlaybackClock(points) {
  if (!points?.length) return { animationTime: clockTime, playbackTime: clockTime };
  const anchors = points.map(point => [...point]);
  for (let index = 0; index < anchors.length; index++) {
    const point = anchors[index], previous = anchors[index - 1];
    if (point.length !== 2 || point.some(value => !Number.isFinite(value) || value < 0)
      || previous && (point[0] <= previous[0] || point[1] < previous[1])) throw Error('Invalid story playback anchors');
  }
  if (anchors.length < 2 || anchors[0].some(value => value !== 0)) throw Error('Story playback anchors must start at zero');
  function interpolate(seconds, from) {
    const time = clockTime(seconds), to = 1 - from;
    if (time <= anchors[0][from]) return anchors[0][to];
    if (time >= anchors.at(-1)[from]) return anchors.at(-1)[to];
    let low = 0, high = anchors.length - 1;
    while (high - low > 1) {
      const middle = (low + high) >> 1;
      if (anchors[middle][from] <= time) low = middle; else high = middle;
    }
    const start = anchors[low], end = anchors[high], span = end[from] - start[from];
    return span > 0 ? start[to] + (end[to] - start[to]) * (time - start[from]) / span : end[to];
  }
  return { animationTime: seconds => interpolate(seconds, 0), playbackTime: seconds => interpolate(seconds, 1) };
}

const clocks = new Map();
function storyClock(id) {
  if (!clocks.has(id)) clocks.set(id, createStoryPlaybackClock(STORY_PLAYBACK_MAPS[id]?.points));
  return clocks.get(id);
}
export const storyAnimationTime = (id, seconds) => storyClock(id).animationTime(seconds);
export const storyPlaybackTime = (id, seconds) => storyClock(id).playbackTime(seconds);
