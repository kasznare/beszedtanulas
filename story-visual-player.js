import { createStoryVisual } from './story-visuals.js';
import { createBaseArt } from './story-art/base.js';
import { collectAmbient, animateAmbient } from './story-art/animate.js';
import { storyVisualFor, storySceneAt } from './story-visual-library.js';
import { storyAnimationTime } from './story-playback-timing.js';

const clamp = value => Math.max(0, Math.min(1, value));
const progress = (time, start, end) => end > start ? clamp((time - start) / (end - start)) : Number(time >= end);
const smooth = value => { value = clamp(value); return value * value * (3 - 2 * value); };
const mix = (start, end, value) => start + (end - start) * value;
let instance = 0;

function createSceneVisual(host, story, { readTime, onScene }) {
  const art = createBaseArt(`story${++instance}`), media = matchMedia('(prefers-reduced-motion: reduce)');
  let scene, actors, ambient, motion = !media.matches, playing = false, animation = 0, destroyed = false, lastTime = 0;
  const attrs = (node, values) => { if (node) for (const [key, value] of Object.entries(values)) node.setAttribute(key, String(value)); };
  const pose = (name, x, y, scale = 1, angle = 0, pivotX = 0, pivotY = 0) => attrs(actors[name], { transform: `translate(${x.toFixed(3)} ${y.toFixed(3)}) scale(${scale}) rotate(${angle.toFixed(3)} ${pivotX} ${pivotY})` });
  function render(seconds = readTime()) {
    if (destroyed) return;
    lastTime = Number.isFinite(seconds) ? Math.max(0, Math.min(story.visualDuration, seconds)) : 0;
    const next = storySceneAt(story.id, lastTime);
    if (scene !== next) {
      scene = next;
      host.innerHTML = story.frame(scene, art);
      host.dataset.scene = scene.id;
      host.setAttribute('role', 'img');
      host.setAttribute('aria-label', `${story.title}: ${scene.title}.`);
      actors = Object.fromEntries([...host.querySelectorAll('[data-actor]')].map(node => [node.dataset.actor, node]));
      ambient = collectAmbient(host);
      onScene(scene);
    }
    host.dataset.time = lastTime.toFixed(3);
    const index = story.scenes.indexOf(scene), end = story.scenes[index + 1]?.time ?? story.visualDuration;
    const time = motion ? lastTime : scene.stillTime ?? mix(scene.time, end, .6);
    const rolling = scene.rolling === true ? 180 : Number(scene.rolling) || 0;
    animateAmbient(ambient, time, motion, { rolling });
    story.render({ time, local: time - scene.time, scene, motion, host, actors, pose, attrs, progress, smooth, mix });
  }
  function tick() {
    animation = 0;
    if (destroyed || !playing) return;
    render(readTime());
    animation = requestAnimationFrame(tick);
  }
  function sync(seconds, active = false) {
    playing = Boolean(active); render(seconds);
    if (!playing) { cancelAnimationFrame(animation); animation = 0; }
    else if (!animation) animation = requestAnimationFrame(tick);
  }
  function setMotion(value) { motion = Boolean(value); render(readTime()); }
  const preference = () => setMotion(!media.matches);
  media.addEventListener('change', preference);
  render(0);
  return { render, sync, setMotion, get motion() { return motion; }, get time() { return lastTime; }, destroy() {
    destroyed = true; playing = false; cancelAnimationFrame(animation);
    media.removeEventListener('change', preference); host.replaceChildren();
  } };
}

/** Keeps one active renderer while the existing audio player switches recordings. */
export function createIllustratedStory(host, { storyId = 'story-01', readTime = () => 0, onScene = () => {} } = {}) {
  let controller, currentId, destroyed = false, motion = !matchMedia('(prefers-reduced-motion: reduce)').matches;
  const animationTime = seconds => storyAnimationTime(currentId, seconds);
  const readAnimationTime = () => animationTime(readTime());
  function select(id, seconds = 0, active = false) {
    const story = storyVisualFor(id);
    if (destroyed) return false;
    if (!story) {
      if (controller) motion = controller.motion;
      controller?.destroy(); controller = null; currentId = undefined;
      delete host.dataset.story;
      return false;
    }
    if (id !== currentId) {
      if (controller) motion = controller.motion;
      controller?.destroy(); currentId = id; host.dataset.story = id;
      controller = story.legacy ? createStoryVisual(host, { readTime: readAnimationTime, onScene }) : createSceneVisual(host, story, { readTime: readAnimationTime, onScene });
      controller.setMotion(motion);
    }
    controller.sync(animationTime(seconds), active);
    return true;
  }
  select(storyId);
  return { select, render: seconds => controller?.render(seconds === undefined ? readAnimationTime() : animationTime(seconds)),
    sync: (seconds, active) => controller?.sync(seconds === undefined ? readAnimationTime() : animationTime(seconds), active),
    setMotion(value) { motion = Boolean(value); controller?.setMotion(motion); },
    get motion() { return controller?.motion ?? motion; }, get time() { return controller?.time ?? 0; }, get storyId() { return currentId; },
    destroy() { destroyed = true; controller?.destroy(); }
  };
}
