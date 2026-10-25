// Exact, reviewed provider inputs. These rules do not approve recorded audio.
const displayTokens = text => [...text.matchAll(/[\p{L}\p{N}_]+(?:[-’'][\p{L}\p{N}_]+)*/gu)];
const spokenTokens = text => [...text.matchAll(/\/[^/\n]+\/|[\p{L}\p{N}_]+(?:[-’'][\p{L}\p{N}_]+)*/gu)];
const object = value => value && typeof value === 'object' && !Array.isArray(value);
const require = (condition, message) => { if (!condition) throw Error(`Invalid voice repairs: ${message}`); };

export function validateVoiceRepairs(repairs, config, clips) {
  require(object(repairs) && repairs.version === 1, 'unknown version');
  require(Object.keys(repairs).sort().join(',') === 'boundedExcerpts,clips,language_code,model_id,version', 'unknown/missing fields');
  require(repairs.model_id === config.model_id, 'model mismatch');
  require(repairs.language_code === config.language_code, 'language mismatch');
  require(object(repairs.clips), 'clips must be an object');
  require(Array.isArray(repairs.boundedExcerpts), 'boundedExcerpts must be an array');
  const byId = new Map(clips.map(clip => [clip.id, clip]));
  for (const [id, repair] of Object.entries(repairs.clips)) {
    const clip = byId.get(id);
    require(clip, `unknown clip ID: ${id}`);
    require(object(repair) && Object.keys(repair).sort().join(',') === 'spokenTarget,text', `invalid fields: ${id}`);
    require(repair.text === clip.text, `stale displayed text: ${id}`);
    require(typeof repair.spokenTarget === 'string' && repair.spokenTarget.length > 0
      && repair.spokenTarget === repair.spokenTarget.trim() && !/[\r\n]/.test(repair.spokenTarget), `invalid spoken target: ${id}`);
    const spoken = spokenTokens(repair.spokenTarget);
    require(spoken.length > 0 && spoken.length === displayTokens(clip.text).length, `word mapping mismatch: ${id}`);
    // Unmatched slashes could silently split a malformed /IPA/ token.
    require(!repair.spokenTarget.replace(/\/[^/\n]+\//g, '').includes('/'), `malformed IPA token: ${id}`);
  }
  require(new Set(repairs.boundedExcerpts).size === repairs.boundedExcerpts.length, 'repeated bounded excerpt ID');
  for (const id of repairs.boundedExcerpts) require(typeof id === 'string' && byId.has(id), `unknown bounded excerpt ID: ${id}`);
  return repairs;
}

export function applyBoundedExcerpts(repairs, clips) {
  for (const id of repairs.boundedExcerpts) {
    const clip = clips.find(clip => clip.id === id);
    require(clip?.extract && Number.isInteger(clip.extract.from) && Number.isInteger(clip.extract.to)
      && clip.extract.from >= 0 && clip.extract.to > clip.extract.from
      && clip.extract.to <= clip.spokenText?.length, `missing/invalid bounded excerpt: ${id}`);
    clip.extract.boundToAdjacentWords = true;
  }
}
