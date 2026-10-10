import { readFile, writeFile } from 'node:fs/promises';
import { AUDIOBOOKS } from '../audiobook-data.js';

const times = {};
for (const story of AUDIOBOOKS) {
  const timing = JSON.parse(await readFile(new URL(`../output/story-timing/${story.id}.json`, import.meta.url)));
  if (timing.duration !== story.duration || timing.paragraphs.some(cue => !cue.matched)) throw Error(`Unverified timing: ${story.id}`);
  if (JSON.stringify(timing.paragraphs.map(cue => cue.text.replaceAll('**', ''))) !== JSON.stringify(story.text.split('\n'))) throw Error(`Text mismatch: ${story.id}`);
  times[story.id] = timing.paragraphs.map(cue => cue.time);
}
await writeFile(new URL('../story-caption-timing.js', import.meta.url), `// Generated from the original recording's word boundaries. Text lives in audiobook-data.js.\nexport const STORY_CAPTION_TIMES = ${JSON.stringify(times, null, 2)};\n`);
