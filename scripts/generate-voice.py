"""Generate fixed offline Jessa clips. Paid cache and receipts persist outside Git.

Default: inspect inventory. --generate explicitly spends existing quota.
Every request is journaled before sending. Never retry an ambiguous paid request;
recover it from ElevenLabs history. No purchases or credit resets are implemented.
"""
import argparse
import base64
import concurrent.futures
import json
import math
import os
import shutil
import subprocess
import threading
import time
import urllib.error
import urllib.request
from pathlib import Path

from elevenlabs_voice import ROOT, CONFIG, TOKEN, SPOKEN_TOKEN, compact, fingerprint, save, sha, validate

CACHE = Path.home() / '.config/beszedtanulas/jessa-voice-cache'
SECRET = Path.home() / '.config/beszedtanulas/elevenlabs.env'
STOP = threading.Event()


def api(endpoint, key):
    with urllib.request.urlopen(urllib.request.Request('https://api.elevenlabs.io/v1/' + endpoint,
            headers={'xi-api-key': key}), timeout=30) as response:
        return json.load(response)


def load_key():
    config = {}
    for line in SECRET.read_text().splitlines():
        if '=' in line and not line.lstrip().startswith('#'):
            name, value = line.split('=', 1)
            config[name.strip()] = value.strip().strip('\"\'')
    return config['ELEVENLABS_API_KEY']


def generate(text, ids, key):
    code = fingerprint(text)
    audio, receipt, pending = (CACHE / (code + suffix) for suffix in ['.mp3', '.json', '.pending.json'])
    if audio.exists() and receipt.exists():
        meta = json.loads(receipt.read_text())
        if meta.get('fingerprint') != code:
            raise RuntimeError('Paid cache fingerprint differs; inspect without regenerating')
    else:
        if pending.exists() or audio.exists() or receipt.exists():
            raise RuntimeError(f'{ids[0]}: ambiguous previous request; recover from history, do not resend')
        if STOP.is_set():
            raise RuntimeError('Stopped after another request failed')
        body = {field: CONFIG[field] for field in ['model_id', 'language_code', 'voice_settings', 'seed']}
        body['text'] = text
        save(pending, {'fingerprint': code, 'body': body, 'ids': ids, 'startedAt': time.time()})
        request = urllib.request.Request(
            f"https://api.elevenlabs.io/v1/text-to-speech/{CONFIG['voice_id']}/with-timestamps?output_format={CONFIG['output_format']}",
            data=compact(body).encode(), headers={'xi-api-key': key, 'Content-Type': 'application/json'}, method='POST')
        try:
            with urllib.request.urlopen(request, timeout=120) as response:
                raw_bytes = response.read()
                headers = {k.lower(): v for k, v in response.headers.items()
                           if k.lower() in {'character-cost', 'request-id', 'history-item-id'}}
            # Keep the complete paid response before parsing or validation.
            (CACHE / (code + '.response.json')).write_bytes(raw_bytes)
            raw = json.loads(raw_bytes)
            data = base64.b64decode(raw.pop('audio_base64'), validate=True)
            audio.write_bytes(data)
            meta = {'fingerprint': code, 'text': text, 'sha256': sha(data), 'bytes': len(data),
                    'headers': headers, 'config': CONFIG, **raw}
            save(receipt, meta)
        except urllib.error.HTTPError as error:
            detail = error.read().decode(errors='replace')[:800]
            if 400 <= error.code < 500:
                pending.replace(CACHE / (code + '.rejected.json'))
            STOP.set()
            raise RuntimeError(f'{ids[0]}: HTTP {error.code}: {detail}') from None
        except Exception:
            STOP.set()
            raise RuntimeError(f'{ids[0]}: interrupted result retained; recover from history before retrying') from None
    length, words = validate(audio, meta, text)
    meta.update(duration=length, words=words)
    save(receipt, meta)
    pending.unlink(missing_ok=True)
    return audio, meta


def installed_recording(clip, audio, meta):
    extract = clip.get('extract')
    if not extract:
        return audio, meta
    text = clip['spokenText']
    begin, end = extract['from'], extract['to']
    spoken_target = clip.get('spokenTarget', clip['text'])
    if text[begin:end] != spoken_target or extract.get('text', clip['text']) != clip['text']:
        raise RuntimeError(f"{clip['id']}: extracted speech differs from displayed text")
    spoken_words = list(SPOKEN_TOKEN.finditer(spoken_target))
    display_words = list(TOKEN.finditer(clip['text']))
    if len(spoken_words) != len(display_words):
        raise RuntimeError(f"{clip['id']}: pronunciation alias changes word count")
    alignment = meta['alignment']
    start = max(0, alignment['character_start_times_seconds'][begin] - extract['before'])
    stop = min(meta['duration'], alignment['character_end_times_seconds'][end - 1] + extract['after'])
    code = fingerprint(text, extract)
    target = CACHE / (code + '.excerpt.mp3')
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', str(audio), '-ss', str(start),
        '-t', str(stop - start), '-ar', '44100', '-b:a', '128k', str(target)], check=True)
    subprocess.run(['ffmpeg', '-v', 'error', '-i', str(target), '-f', 'null', '-'], check=True)
    length = float(subprocess.check_output(['ffprobe', '-v', 'error', '-show_entries',
        'format=duration', '-of', 'default=noprint_wrappers=1:nokey=1', str(target)], text=True))
    words = [[round(alignment['character_start_times_seconds'][begin + m.start()] - start, 4),
              round(alignment['character_end_times_seconds'][begin + m.end() - 1] - start, 4), displayed.group()]
             for m, displayed in zip(spoken_words, display_words)]
    result = {**meta, 'fingerprint': code, 'sha256': sha(target.read_bytes()), 'duration': length, 'words': words,
              'sourceSha256': meta['sha256'], 'sourceStart': start, 'sourceEnd': stop}
    save(CACHE / (code + '.excerpt.json'), result)
    return target, result


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--generate', action='store_true')
    parser.add_argument('--ids', nargs='+')
    parser.add_argument('--exclude-ids', nargs='+', default=[])
    parser.add_argument('--workers', type=int, default=2, choices=[1, 2, 3])
    args = parser.parse_args()
    manifest = json.loads((ROOT / 'audio/voice/manifest.json').read_text())
    if {field: manifest[field] for field in CONFIG} != CONFIG:
        raise RuntimeError('Stale manifest provider; run scripts/build-voice-manifest.mjs')
    clips = manifest['clips']
    if args.ids:
        if set(args.ids) - {c['id'] for c in clips}:
            raise RuntimeError('Unknown clip IDs')
        clips = [c for c in clips if c['id'] in args.ids]
    clips = [c for c in clips if c['id'] not in args.exclude_ids]
    groups = {}
    for clip in clips:
        groups.setdefault(clip.get('spokenText', clip['text']), []).append(clip)
    missing = [text for text in groups if not (CACHE / (fingerprint(text) + '.json')).exists()]
    characters = sum(map(len, missing))
    print(f'{len(clips)} IDs, {len(groups)} unique recordings, {len(missing)} uncached, {characters} new characters', flush=True)
    if not args.generate:
        return
    os.umask(0o077)
    CACHE.mkdir(parents=True, exist_ok=True, mode=0o700)
    key = load_key()
    before = api('user/subscription', key)
    remaining = before['character_limit'] - before['character_count']
    # Full-price bound plus per-request rounding; the discount is never assumed.
    if before.get('status') != 'active' or remaining < math.ceil(characters * 1.1) + len(missing):
        raise RuntimeError('Insufficient existing included quota; no purchase or reset attempted')
    save(CACHE / f'run-{time.time_ns()}-before.json', before)
    target = ROOT / 'audio/voice/generated.json'
    previous = json.loads(target.read_text()) if target.exists() else {}
    receipts = previous.get('clips', {}) if previous.get('version') == 2 else {}
    errors = []
    with concurrent.futures.ThreadPoolExecutor(max_workers=args.workers) as pool:
        tasks = {pool.submit(generate, text, [c['id'] for c in batch], key): batch for text, batch in groups.items()}
        for task in concurrent.futures.as_completed(tasks):
            batch = tasks[task]
            try:
                audio, meta = task.result()
                for clip in batch:
                    installed_audio, installed_meta = installed_recording(clip, audio, meta)
                    output = ROOT / clip['file']
                    temporary = output.with_suffix('.part.mp3')
                    shutil.copyfile(installed_audio, temporary)
                    temporary.replace(output)
                    receipts[clip['id']] = {field: installed_meta[field] for field in ['fingerprint', 'sha256', 'words', 'duration']}
                    receipts[clip['id']]['characterCost'] = float(meta['headers']['character-cost'])
                save(target, {'version': 2, 'config': CONFIG, 'clips': receipts})
                print(f"READY {batch[0]['id']}: {receipts[batch[0]['id']]['duration']:.2f}s, cached receipt {meta['headers']['character-cost']} credits; reused for {len(batch)} IDs", flush=True)
            except Exception as error:
                STOP.set()
                errors.append(str(error))
                print(f'ERROR {error}', flush=True)
    after = api('user/subscription', key)
    run = {'ids': [c['id'] for c in clips], 'newCharacters': characters, 'errors': errors,
           'quotaBefore': before['character_count'], 'quotaAfter': after['character_count'],
           'quotaDelta': after['character_count'] - before['character_count'],
           'quotaRemaining': after['character_limit'] - after['character_count']}
    save(CACHE / f'run-{time.time_ns()}.json', run)
    timings = {clip['id']: receipts[clip['id']]['words'] for clip in manifest['clips'] if clip['id'] in receipts}
    (ROOT / 'voice-timing.js').write_text('// Generated with the Jessa MP3s by npm run generate-voice. Times are seconds.\nexport const VOICE_TIMING = ' + compact(timings) + ';\n')
    print(compact(run), flush=True)
    if errors:
        raise SystemExit(1)


if __name__ == '__main__':
    main()
