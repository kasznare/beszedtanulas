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
REJECTIONS = ROOT / 'voice-rejections.json'
STOP = threading.Event()


def assert_not_rejected(ids, *, source_fingerprint=None, source_sha=None,
                        installed_fingerprint=None, installed_sha=None):
    """Keep human-rejected recordings out of the paid cache and installation paths."""
    registry = json.loads(REJECTIONS.read_text())
    if registry.get('version') != 1:
        raise RuntimeError('Unknown voice rejection registry version')
    for rejected in registry['recordings']:
        source = rejected['source']
        installed = rejected['installed']
        if ((source_fingerprint and source_fingerprint == source['fingerprint'])
                or (source_sha and source_sha == source['sha256'])
                or (installed_fingerprint and installed_fingerprint == installed['fingerprint'])
                or (installed_sha and installed_sha == installed['sha256'])):
            raise RuntimeError(f"{', '.join(ids)}: rejected voice recording ({rejected['id']}: {rejected['reason']}); change the spoken input and review a new sample")


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
    assert_not_rejected(ids, source_fingerprint=code)
    audio, receipt, pending = (CACHE / (code + suffix) for suffix in ['.mp3', '.json', '.pending.json'])
    if audio.exists() and receipt.exists():
        meta = json.loads(receipt.read_text())
        if meta.get('fingerprint') != code:
            raise RuntimeError('Paid cache fingerprint differs; inspect without regenerating')
        assert_not_rejected(ids, source_sha=sha(audio.read_bytes()))
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
    assert_not_rejected(ids, source_sha=sha(audio.read_bytes()))
    length, words = validate(audio, meta, text)
    meta.update(duration=length, words=words)
    save(receipt, meta)
    pending.unlink(missing_ok=True)
    return audio, meta


def bound_excerpt_to_adjacent_words(clip, alignment, start, stop, duration):
    """Limit optional padding without cutting any aligned target spoken token."""
    text = clip['spokenText']
    begin, end = clip['extract']['from'], clip['extract']['to']
    words = list(SPOKEN_TOKEN.finditer(text))
    target = [word for word in words if word.start() < end and word.end() > begin]
    if (not 0 <= begin < end <= len(text) or not target
            or any(word.start() < begin or word.end() > end for word in target)
            or ''.join(alignment['characters']) != text):
        raise RuntimeError(f"{clip['id']}: invalid adjacent-word excerpt span")
    starts, ends = (alignment[field] for field in
                    ('character_start_times_seconds', 'character_end_times_seconds'))
    previous = [word for word in words if word.end() <= begin]
    following = [word for word in words if word.start() >= end]
    target_start = min(starts[word.start()] for word in target)
    target_end = max(ends[word.end() - 1] for word in target)
    previous_end = ends[previous[-1].end() - 1] if previous else 0
    following_start = starts[following[0].start()] if following else duration
    values = (start, stop, duration, target_start, target_end, previous_end, following_start)
    if not all(isinstance(value, (int, float)) and not isinstance(value, bool)
               and math.isfinite(value) for value in values):
        raise RuntimeError(f"{clip['id']}: invalid adjacent-word timing")
    start, stop = max(start, previous_end), min(stop, following_start)
    if not (0 <= start <= target_start <= target_end <= stop <= duration and start < stop):
        raise RuntimeError(f"{clip['id']}: adjacent-word bounds cut target speech")
    return start, stop


def installed_recording(clip, audio, meta):
    assert_not_rejected([clip['id']], source_fingerprint=meta['fingerprint'],
                        source_sha=sha(audio.read_bytes()))
    extract = clip.get('extract')
    if not extract:
        assert_not_rejected([clip['id']], installed_fingerprint=meta['fingerprint'],
                            installed_sha=sha(audio.read_bytes()))
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
    if extract.get('boundToAdjacentWords') is True:
        start, stop = bound_excerpt_to_adjacent_words(clip, alignment, start, stop, meta['duration'])
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
    # Provider source alignment permits small tail drift; installed excerpts
    # must contain every complete aligned word in their actual encoded duration.
    if not math.isfinite(length) or length <= 0 or not words:
        raise RuntimeError(f"{clip['id']}: invalid excerpt duration or missing word timing")
    for index, word in enumerate(words):
        if (not all(math.isfinite(value) for value in word[:2])
                or not 0 <= word[0] <= word[1] <= length + .001
                or (index and word[0] < words[index - 1][0])):
            raise RuntimeError(f"{clip['id']}: invalid excerpt word timing at {index}: {word[:2]} exceeds duration {length}")
    result = {**meta, 'fingerprint': code, 'sha256': sha(target.read_bytes()), 'duration': length, 'words': words,
              'sourceSha256': meta['sha256'], 'sourceStart': start, 'sourceEnd': stop}
    assert_not_rejected([clip['id']], installed_fingerprint=code, installed_sha=result['sha256'])
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
    if args.generate:
        for text, batch in groups.items():
            assert_not_rejected([clip['id'] for clip in batch], source_fingerprint=fingerprint(text))
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
                    assert_not_rejected([clip['id']], installed_fingerprint=installed_meta['fingerprint'],
                                        installed_sha=sha(installed_audio.read_bytes()))
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
