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
    current = (ROOT / 'audiobook-data.js').read_text()
    existing = json.loads(current.split('export const AUDIOBOOKS = ', 1)[1].strip().removesuffix(';'))
    previous = {story['id']: story for story in existing}
    maps = json.loads((STAGED / 'warp.json').read_text())['stories']
    if set(maps) != {entry['id'] for entry in catalog}:
        raise ValueError('All stories must have verified SVG clock maps')
    new_stories, receipts, captions = [], {}, {}
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
        if (timing['duration'] != story['duration'] or maps[entry['id']]['duration'] != story['duration']
                or not math.isfinite(story['duration']) or story['duration'] <= 60):
            raise ValueError(f"Wrong playback duration: {entry['id']}")
        if [cue['text'] for cue in timing['paragraphs']] != text.split('\n'):
            raise ValueError(f"Wrong caption text: {entry['id']}")
        if timing['alignment']['sourceWordCoverage'] < .97 or timing['alignment']['originalWordCoverage'] < .97:
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
        new_stories.append({**previous[entry['id']], 'duration': story['duration'],
                            'bytes': story['bytes'], 'sha256': story['sha256']})
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
        shutil.copyfile(STAGED / f"{story['id']}.mp3", ROOT / story['file'])
        shutil.copyfile(STAGED / 'timing' / f"{story['id']}.json", ROOT / 'output/story-timing' / f"{story['id']}.json")
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
