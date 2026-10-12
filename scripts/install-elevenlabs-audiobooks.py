"""Install a fully verified staged batch without consuming speech API quota.

Run alignment first, then this script with --install. Without --install it only
validates. The original SVG clock timings are archived before captions change.
"""
import argparse
import hashlib
import json
import math
import re
import shutil
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
STAGED = ROOT / 'output/elevenlabs-audiobooks'


def sha(data):
    return hashlib.sha256(data).hexdigest()


def write(path, text):
    temp = path.with_suffix(path.suffix + '.tmp')
    temp.write_text(text)
    temp.replace(path)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--install', action='store_true')
    args = parser.parse_args()
    catalog = json.loads((ROOT / 'content/stories/catalog.json').read_text())['stories']
    catalog_order = {entry['id']: index for index, entry in enumerate(catalog)}
    catalog = [entry for entry in catalog if entry['id'].startswith('story-')]
    current = (ROOT / 'audiobook-data.js').read_text()
    existing = json.loads(current.split('export const AUDIOBOOKS = ', 1)[1].strip().removesuffix(';'))
    previous = {story['id']: story for story in existing}
    maps = json.loads((STAGED / 'warp.json').read_text())['stories']
    illustrated_ids = {entry['id'] for entry in catalog if entry.get('illustrated') is not False and entry.get('visualClock') != 'recording'}
    if set(maps) != illustrated_ids:
        raise ValueError('Every retimed illustrated story must have a verified SVG clock map')
    # The legacy stage owns the original recordings only. Preserve the separate
    # Radó pipeline's ready recordings and measured captions on reinstallation.
    managed_ids = {entry['id'] for entry in catalog}
    new_stories = [story for story in existing if story['id'] not in managed_ids]
    keep = {story['id'] for story in new_stories}
    published_receipts = json.loads((ROOT / 'audio/audiobooks/generated.json').read_text())['stories']
    published_captions = json.loads((ROOT / 'story-caption-timing.js').read_text().split('export const STORY_CAPTION_TIMES = ', 1)[1].strip().removesuffix(';'))
    receipts = {key: value for key, value in published_receipts.items() if key in keep}
    captions = {key: value for key, value in published_captions.items() if key in keep}
    metadata = None
    for entry in catalog:
        story = json.loads((STAGED / f"{entry['id']}.json").read_text())
        timing = json.loads((STAGED / 'timing' / f"{entry['id']}.json").read_text())
        source = (ROOT / 'content/stories' / entry['file']).read_bytes()
        text = re.sub(r'^#{1,6}\s+', '', source.decode().replace('**', ''), flags=re.M).strip()
        spoken = entry['title'] + '.\n\n' + text
        if (sha(source) != entry['sha256'] or story['sourceSha256'] != entry['sha256']
                or story['spokenText'] != spoken or story['text'] != text):
            raise ValueError(f"Changed source text: {entry['id']}")
        audio = STAGED / f"{entry['id']}.mp3"
        if sha(audio.read_bytes()) != story['sha256'] or audio.stat().st_size != story['bytes']:
            raise ValueError(f"Unverified MP3: {entry['id']}")
        illustrated = entry.get('illustrated') is not False
        mapped = illustrated and entry.get('visualClock') != 'recording'
        if (timing['duration'] != story['duration']
                or (mapped and maps[entry['id']]['duration'] != story['duration'])
                or not math.isfinite(story['duration']) or story['duration'] <= 0):
            raise ValueError(f"Wrong playback duration: {entry['id']}")
        if not mapped and ('warp' in timing or timing.get('illustrated') is not illustrated):
            raise ValueError(f"Unexpected animation clock for recording-time story: {entry['id']}")
        if [cue['text'] for cue in timing['paragraphs']] != [line for line in text.split('\n') if line.strip()]:
            raise ValueError(f"Wrong caption text: {entry['id']}")
        if timing['alignment']['sourceWordCoverage'] < .97 or (mapped and timing['alignment']['originalWordCoverage'] < .97):
            raise ValueError(f"Incomplete alignment: {entry['id']}")
        generation = [story['voiceId'], story['modelId'], story['languageCode'], story['voiceSettings'],
                      story['outputFormat'], story['seed'], spoken]
        if sha(json.dumps(generation, ensure_ascii=False, separators=(',', ':')).encode()) != story['fingerprint']:
            raise ValueError(f"Stale generation fingerprint: {entry['id']}")
        settings = {'version': 2, 'provider': 'elevenlabs', 'voice': story['voiceId'],
                    'voiceName': story['voiceName'], 'model': story['modelId'],
                    'language': story['languageCode'], 'settings': story['voiceSettings'],
                    'outputFormat': story['outputFormat'], 'seed': story['seed']}
        if metadata is not None and metadata != settings:
            raise ValueError('The batch must use one consistent voice and model')
        metadata = settings
        published = {**previous.get(entry['id'], {}), 'id': entry['id'], 'title': entry['title'], 'text': text,
                     'file': f"audio/audiobooks/{entry['id']}.mp3", 'emoji': entry.get('emoji', previous.get(entry['id'], {}).get('emoji', '📖')),
                     'duration': story['duration'], 'bytes': story['bytes'], 'sha256': story['sha256']}
        published.update({key: entry[key] for key in ['author', 'kind', 'description', 'sourceUrl', 'illustrated'] if key in entry})
        new_stories.append(published)
        receipts[entry['id']] = {key: story[key] for key in
                                ['fingerprint', 'sha256', 'sourceSha256', 'duration', 'spokenWords', 'credits']}
        receipts[entry['id']].update(parts=len(story['parts']), characterCount=story['characters'])
        if timing['alignment'].get('verifiedTail'):
            receipts[entry['id']]['verifiedTail'] = timing['alignment']['verifiedTail']
        captions[entry['id']] = [cue['time'] for cue in timing['paragraphs']]
    print(f"Verified {len(new_stories)} Jessa recordings, {sum(s['duration'] for s in new_stories)/60:.1f} minutes, "
          f"{sum(s['credits'] for s in receipts.values()):g} credits.")
    if not args.install:
        return
    archive = STAGED / 'original-timing'
    if not archive.exists():
        original = ROOT / 'content/stories/visual-timing'
        if not original.exists():
            original = ROOT / 'output/story-timing'
        shutil.copytree(original, archive)
    originals = STAGED / 'original-metadata'
    originals.mkdir(exist_ok=True)
    for name in ['audiobook-data.js', 'story-caption-timing.js', 'audio/audiobooks/generated.json']:
        backup = originals / Path(name).name
        if not backup.exists():
            shutil.copyfile(ROOT / name, backup)
    (ROOT / 'output/story-timing').mkdir(parents=True, exist_ok=True)
    for story in new_stories:
        if story['id'] in keep:
            continue
        shutil.copyfile(STAGED / f"{story['id']}.mp3", ROOT / story['file'])
        shutil.copyfile(STAGED / 'timing' / f"{story['id']}.json", ROOT / 'output/story-timing' / f"{story['id']}.json")
    new_stories.sort(key=lambda story: catalog_order[story['id']])
    write(ROOT / 'audio/audiobooks/generated.json', json.dumps({**metadata, 'stories': receipts}, ensure_ascii=False, indent=2) + '\n')
    write(ROOT / 'audiobook-data.js', '// Generated from fixed ElevenLabs recordings. No runtime synthesis.\nexport const AUDIOBOOKS = '
          + json.dumps(new_stories, ensure_ascii=False, indent=2) + ';\n')
    write(ROOT / 'story-caption-timing.js', '// Generated from the fixed ElevenLabs recordings\' character alignments.\nexport const STORY_CAPTION_TIMES = '
          + json.dumps(captions, ensure_ascii=False, indent=2) + ';\n')
    write(ROOT / 'story-playback-maps.js', '// Generated from the fixed recordings\' word alignments.\nexport const STORY_PLAYBACK_MAPS = '
          + json.dumps(maps, ensure_ascii=False, separators=(',', ':')) + ';\n')
    print('Installed audio, metadata, captions and SVG clock maps together. Run npm run build-offline next.')


if __name__ == '__main__':
    main()
