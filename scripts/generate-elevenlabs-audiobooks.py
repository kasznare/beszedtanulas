"""Generate cached fixed Jessa audiobooks with character timestamps.

Preview the work with no arguments. Explicitly use --generate to consume quota.
Secrets are read only from the private config outside this repository.
Stories run concurrently; parts within one story use request stitching in order.
Successful or ambiguous requests are never automatically sent again.
"""
import argparse
import base64
import concurrent.futures
import hashlib
import json
import math
import re
import shutil
import subprocess
import threading
import time
import urllib.error
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / 'content/stories'
OUT = ROOT / 'output/elevenlabs-audiobooks'
CONFIG = Path.home() / '.config/beszedtanulas/elevenlabs.env'
VOICE = 'yj30vwTGJxSHezdAGsv9'
MODEL = 'eleven_v4'
LANGUAGE = 'hu'
SETTINGS = {'stability': 0.5, 'similarity_boost': 0.75}
FORMAT = 'mp3_44100_128'
SEED = 42
STOP = threading.Event()


def sha(value):
    return hashlib.sha256(value).hexdigest()


def compact(value):
    return json.dumps(value, ensure_ascii=False, separators=(',', ':'))


def save(path, value):
    temp = path.with_suffix(path.suffix + '.tmp')
    temp.write_text(json.dumps(value, ensure_ascii=False, indent=2) + '\n')
    temp.replace(path)


def clean(text):
    return re.sub(r'^#{1,6}\s+', '', text.replace('**', ''), flags=re.M).strip()


def split(text):
    if len(text) <= 10000:
        return [text]
    count = math.ceil(len(text) / 10000)
    limit = math.ceil(len(text) / count)
    parts = []
    while len(text) > 10000:
        at = text.rfind('\n', 0, limit)
        if at < limit // 2:
            at = text.rfind(' ', 0, limit)
        at = at + 1 if at > 0 else limit
        parts.append(text[:at])
        text = text[at:]
    if text:
        parts.append(text)
    return parts


def duration(path):
    return float(subprocess.check_output(['ffprobe', '-v', 'error', '-show_entries',
        'format=duration', '-of', 'default=noprint_wrappers=1:nokey=1', str(path)], text=True))


def decode(path):
    subprocess.run(['ffmpeg', '-v', 'error', '-i', str(path), '-f', 'null', '-'], check=True)


def api(url, key):
    with urllib.request.urlopen(urllib.request.Request(url, headers={'xi-api-key': key}), timeout=30) as response:
        return json.load(response)


def generate_part(story, index, text, body, key):
    directory = OUT / story
    directory.mkdir(parents=True, exist_ok=True)
    audio = directory / f'part-{index + 1:02d}.mp3'
    receipt = audio.with_suffix('.json')
    pending = audio.with_suffix('.pending.json')
    fingerprint = sha(compact([VOICE, FORMAT, body]).encode())
    if receipt.exists() and audio.exists():
        cached = json.loads(receipt.read_text())
        if cached.get('fingerprint') == fingerprint and cached.get('sha256') == sha(audio.read_bytes()):
            if not cached.get('alignment') and not cached.get('normalized_alignment'):
                raise RuntimeError(f'{story}: cached paid audio has no timestamps; recover alignment without regenerating')
            if 'duration' not in cached:
                decode(audio)
                cached['duration'] = duration(audio)
                save(receipt, cached)
            if pending.exists():
                pending.unlink()
            print(f'{story} part {index + 1}: cached', flush=True)
            return cached
        raise RuntimeError(f'{story}: existing part differs; keep it and inspect before regenerating')
    if pending.exists():
        raise RuntimeError(f'{story}: ambiguous previous request; recover from history before retrying')
    if not key:
        raise RuntimeError(f'{story}: cached audio is missing; offline assembly cannot send an API request')
    if STOP.is_set():
        raise RuntimeError('Stopped after another request failed')
    save(pending, {'fingerprint': fingerprint, 'body': body, 'startedAt': time.time()})
    request = urllib.request.Request(
        f'https://api.elevenlabs.io/v1/text-to-speech/{VOICE}/with-timestamps?output_format={FORMAT}',
        data=compact(body).encode(), headers={'xi-api-key': key, 'Content-Type': 'application/json'}, method='POST')
    print(f'{story} part {index + 1}: generating {len(text)} characters', flush=True)
    try:
        with urllib.request.urlopen(request, timeout=600) as response:
            raw = json.load(response)
            headers = {k.lower(): v for k, v in response.headers.items()
                if k.lower() in {'character-cost', 'request-id', 'history-item-id'}}
    except urllib.error.HTTPError as error:
        detail = error.read().decode(errors='replace')[:1200]
        # A validation/permission/rate-limit rejection did not produce an audio asset.
        if 400 <= error.code < 500:
            pending.replace(audio.with_suffix('.rejected.json'))
        STOP.set()
        raise RuntimeError(f'{story}: HTTP {error.code}: {detail}') from None
    except Exception:
        STOP.set()
        raise RuntimeError(f'{story}: response interrupted; pending request retained for history recovery') from None
    data = base64.b64decode(raw.pop('audio_base64'), validate=True)
    if len(data) < 1000:
        STOP.set()
        raise RuntimeError(f'{story}: unexpectedly small audio; inspect pending request')
    audio.write_bytes(data)
    meta = {'fingerprint': fingerprint, 'text': text, 'sha256': sha(data), 'bytes': len(data),
        'headers': headers, **raw}
    # Persist the paid result before any local verification can fail.
    save(receipt, meta)
    decode(audio)
    meta['duration'] = duration(audio)
    if not meta.get('alignment') and not meta.get('normalized_alignment'):
        raise RuntimeError(f'{story}: generated audio cached but timestamps are absent')
    save(receipt, meta)
    pending.unlink()
    print(f"{story} part {index + 1}: saved {meta['duration']:.1f}s, cost {headers.get('character-cost', '?')}", flush=True)
    return meta


def generate_story(entry, key):
    raw = (SOURCE / entry['file']).read_bytes()
    if sha(raw) != entry['sha256']:
        raise RuntimeError(f"Source changed: {entry['id']}")
    text = clean(raw.decode())
    spoken = entry['title'] + '.\n\n' + text
    fingerprint = sha(compact([VOICE, MODEL, LANGUAGE, SETTINGS, FORMAT, SEED, spoken]).encode())
    sections = split(spoken)
    assert ''.join(sections) == spoken
    parts = []
    for index, section in enumerate(sections):
        body = {'text': section, 'model_id': MODEL, 'language_code': LANGUAGE,
            'voice_settings': SETTINGS, 'seed': SEED}
        if index:
            body['previous_request_ids'] = [part['headers']['request-id'] for part in parts[-3:]]
        if index + 1 < len(sections):
            body['next_text'] = sections[index + 1]
        parts.append(generate_part(entry['id'], index, section, body, key))
    final = OUT / f"{entry['id']}.mp3"
    if len(parts) == 1:
        shutil.copyfile(OUT / entry['id'] / 'part-01.mp3', final)
    else:
        listing = OUT / entry['id'] / 'concat.txt'
        listing.write_text(''.join(f"file '{(OUT / entry['id'] / f'part-{index + 1:02d}.mp3').as_posix()}'\n" for index in range(len(parts))))
        subprocess.run(['ffmpeg', '-v', 'error', '-y', '-f', 'concat', '-safe', '0',
            '-i', str(listing), '-c', 'copy', '-bsf:a', 'setts=ts=N*1152/44100/TB', str(final)], check=True)
    decode(final)
    length = duration(final)
    if length < len(spoken.split()) / 5:
        raise RuntimeError(f"Unexpectedly short audiobook: {entry['id']}")
    alignments = {}
    for name in ['alignment', 'normalized_alignment']:
        merged = {'characters': [], 'character_start_times_seconds': [], 'character_end_times_seconds': []}
        offset = 0
        for part_index, part in enumerate(parts):
            alignment = part.get(name)
            if not alignment:
                merged = None
                break
            merged['characters'].extend(alignment['characters'])
            for field in ['character_start_times_seconds', 'character_end_times_seconds']:
                # Keep the provider's final timestamps for independent verification.
                # Only intermediate punctuation may be clipped at a stitch boundary.
                if any(value > part['duration'] + .5 for value in alignment[field]):
                    raise RuntimeError(f"Alignment exceeds audio duration: {entry['id']}")
                values = alignment[field]
                if part_index + 1 < len(parts):
                    if any(char.isalnum() and value > part['duration']
                           for char, value in zip(alignment['characters'], values)):
                        raise RuntimeError(f"Lexical alignment overlaps a stitch boundary: {entry['id']}")
                    values = [min(value, part['duration']) for value in values]
                merged[field].extend(round(value + offset, 6) for value in values)
            offset += part['duration']
        alignments[name] = merged
    result = {'id': entry['id'], 'title': entry['title'], 'text': text, 'spokenText': spoken,
        'fingerprint': fingerprint, 'sourceSha256': entry['sha256'], 'sha256': sha(final.read_bytes()),
        'bytes': final.stat().st_size, 'duration': round(length, 3), 'characters': len(spoken),
        'voiceId': VOICE, 'voiceName': 'Jessa - Easygoing and Effortless', 'modelId': MODEL,
        'languageCode': LANGUAGE, 'voiceSettings': SETTINGS, 'outputFormat': FORMAT, 'seed': SEED,
        'spokenWords': len(spoken.split()), 'credits': sum(float(part['headers']['character-cost']) for part in parts),
        'parts': [{'file': f"{entry['id']}/part-{index + 1:02d}.mp3", 'fingerprint': part['fingerprint'],
            'duration': part['duration'], 'requestId': part['headers'].get('request-id'),
            'historyItemId': part['headers'].get('history-item-id'),
            'characterCost': float(part['headers']['character-cost'])} for index, part in enumerate(parts)], **alignments}
    receipt = OUT / f"{entry['id']}.json"
    if receipt.exists():
        previous = json.loads(receipt.read_text())
        if previous.get('sha256') == result['sha256'] and previous.get('tailVerification'):
            result['tailVerification'] = previous['tailVerification']
    save(receipt, result)
    print(f"READY {entry['id']}: {length / 60:.1f} minutes, {result['credits']:g} credits", flush=True)
    return result


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--generate', action='store_true')
    parser.add_argument('--install', action='store_true', help='Align and install the complete validated batch after generation')
    parser.add_argument('--ids', nargs='*')
    parser.add_argument('--workers', type=int, default=3, choices=range(1, 4))
    args = parser.parse_args()
    entries = json.loads((SOURCE / 'catalog.json').read_text())['stories']
    if args.ids and any(story_id.startswith('rado-') for story_id in args.ids):
        raise RuntimeError('Radó sources use separate display/pronunciation input; use generate-rado-audiobooks.py')
    entries = [entry for entry in entries if entry['id'].startswith('story-')]
    if args.ids:
        known = {entry['id'] for entry in entries}
        if set(args.ids) - known:
            raise RuntimeError('Unknown story IDs')
        entries = [entry for entry in entries if entry['id'] in args.ids]
    total = sum(len(entry['title'] + '.\n\n' + clean((SOURCE / entry['file']).read_text())) for entry in entries)
    print(f'{len(entries)} stories, {total} characters, {args.workers} concurrent stories', flush=True)
    if not args.generate:
        return
    config = {}
    for line in CONFIG.read_text().splitlines():
        if '=' in line and not line.lstrip().startswith('#'):
            name, value = line.split('=', 1)
            config[name.strip()] = value.strip().strip('\"\'')
    key = config['ELEVENLABS_API_KEY']
    subscription = api('https://api.elevenlabs.io/v1/user/subscription', key)
    remaining = subscription['character_limit'] - subscription['character_count']
    if subscription.get('status') != 'active' or remaining < math.ceil(total * .11 * 1.25):
        raise RuntimeError('Insufficient included quota for generation and verification margin')
    OUT.mkdir(parents=True, exist_ok=True)
    errors, completed = [], []
    with concurrent.futures.ThreadPoolExecutor(max_workers=args.workers) as pool:
        tasks = {pool.submit(generate_story, entry, key): entry for entry in entries}
        for task in concurrent.futures.as_completed(tasks):
            try:
                completed.append(task.result())
            except Exception as error:
                STOP.set()
                errors.append(str(error))
                print(f'ERROR {error}', flush=True)
    # Usage can appear a few seconds after the audio response.
    after = api('https://api.elevenlabs.io/v1/user/subscription', key)
    run = {'storiesCompleted': [story['id'] for story in completed], 'errors': errors,
        'characters': total, 'recordingCredits': sum(story['credits'] for story in completed),
        'quotaDelta': after['character_count'] - subscription['character_count'],
        'quotaBefore': subscription['character_count'], 'quotaAfter': after['character_count'],
        'quotaRemaining': after['character_limit'] - after['character_count']}
    save(OUT / 'run.json', run)
    print(compact(run), flush=True)
    if errors:
        raise SystemExit(1)
    if args.install:
        subprocess.run(['python3', str(ROOT / 'scripts/check-elevenlabs-audiobooks.py')], check=True)
        original = SOURCE / 'visual-timing'
        if not original.exists():
            original = OUT / 'original-timing'
        if not original.exists():
            original = ROOT / 'output/story-timing'
        subprocess.run(['python3', str(ROOT / 'scripts/align-elevenlabs-audiobooks.py'),
            '--original-timing', str(original)], check=True)
        subprocess.run(['python3', str(ROOT / 'scripts/install-elevenlabs-audiobooks.py'), '--install'], check=True)


if __name__ == '__main__':
    main()
