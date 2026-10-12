// Merge collection metadata with verified recordings, without a title list.
export function mergeStoryLibrary(recordings, ...collections) {
  const library = new Map(recordings.map(story => [story.id, { ...story }]));
  for (const collection of collections) for (const entry of collection) {
    const recording = library.get(entry.id);
    library.set(entry.id, { ...entry, ...recording,
      searchAliases: entry.searchAliases || recording?.searchAliases || [],
      audioStatus: recording ? 'ready' : entry.audioStatus || 'pending',
      file: recording?.file, duration: recording?.duration || 0 });
  }
  return [...library.values()];
}

export const normalizeStorySearch = value => String(value ?? '').normalize('NFD')
  .replace(/\p{M}/gu, '').toLocaleLowerCase('hu-HU').replace(/\s+/gu, ' ').trim();

export function matchesStorySearch(story, query) {
  const terms = normalizeStorySearch(query).split(' ').filter(Boolean);
  const searchable = normalizeStorySearch([story.title, story.author, story.collection, story.description,
    ...(story.tags || []), ...(story.searchAliases || [])].filter(Boolean).join(' '));
  return terms.every(term => searchable.includes(term));
}
