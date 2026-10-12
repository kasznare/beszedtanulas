"""Prepare every Radó tale; explicitly generate within existing quota only.

Default: complete inventory and durable request plans, no paid requests.
--generate --fit-quota chooses whole tales by length to fit the current balance.
--ids limits a batch; --install installs every completed, validated cached tale.
All paid responses, pending journals and receipts remain outside the repository.
Never purchases, resets, changes a subscription, or retries an ambiguous request.
"""
import argparse
import base64
import importlib.util
import json
import math
import re
import shutil
import subprocess
import time
import urllib.error
import urllib.request
from pathlib import Path

from elevenlabs_voice import ROOT, CONFIG, TOKEN, SPOKEN_TOKEN, compact, sha, save, validate

spec = importlib.util.spec_from_file_location('voice_generator', ROOT / 'scripts/generate-voice.py')
voice_generator = importlib.util.module_from_spec(spec)
spec.loader.exec_module(voice_generator)
CACHE = Path.home() / '.config/beszedtanulas/rado-audiobook-cache'
SOURCE = ROOT / 'content/stories'
PRONUNCIATION = json.loads((ROOT / 'voice-pronunciation.json').read_text())
assert PRONUNCIATION['model_id'] == CONFIG['model_id']
assert PRONUNCIATION['language_code'] == CONFIG['language_code']


def phonetic(text):
    return TOKEN.sub(lambda m: '/' + PRONUNCIATION['words'][m.group().lower()] + '/'
                     if m.group().lower() in PRONUNCIATION['words'] else m.group(), text)


def batch_that_fits(plans, remaining, multiplier=1):
    batch, required = [], 0
    for p in sorted(plans, key=lambda p: (p['characters'], p['id'])):
        if math.ceil((required + p['characters']) * multiplier * 1.1) <= remaining:
            batch.append(p)
            required += p['characters']
    return batch


def plan(entry):
    raw = (SOURCE / entry['file']).read_bytes()
    assert sha(raw) == entry['sha256']
    text = raw.decode().rstrip('\n')
    displayed = entry['title'] + '\n\n' + text
    # Split only on complete source paragraphs; retain every separator exactly.
    chunks, current = [], ''
    for line in displayed.splitlines(keepends=True):
        if len(phonetic(current + line)) > 10000 and current:
            chunks.append(current)
            current = ''
        if len(phonetic(line)) > 10000:
            raise ValueError('Source paragraph exceeds request limit; inspect before splitting')
        current += line
    if current:
        chunks.append(current)
    assert ''.join(chunks) == displayed
    parts = [{'displayText': chunk, 'spokenText': phonetic(chunk)} for chunk in chunks]
    assert all(len(list(TOKEN.finditer(p['displayText']))) == len(list(SPOKEN_TOKEN.finditer(p['spokenText']))) for p in parts)
    spoken = ''.join(p['spokenText'] for p in parts)
    return {'id': entry['id'], 'title': entry['title'], 'text': text,
            'sourceSha256': entry['sha256'], 'displayText': displayed, 'spokenText': spoken,
            'characters': len(spoken), 'displayCharacters': len(displayed), 'parts': parts,
            'fingerprint': sha(compact([CONFIG, spoken]).encode()),
            'pronunciationSha256': sha((ROOT / 'voice-pronunciation.json').read_bytes())}


def paid_part(part, body, ids, key):
    code = sha(compact([CONFIG, body]).encode())
    audio = CACHE / (code + '.mp3')
    receipt = CACHE / (code + '.json')
    response_file = CACHE / (code + '.response.json')
    pending = CACHE / (code + '.pending.json')
    if audio.exists() and receipt.exists():
        meta = json.loads(receipt.read_text())
        if meta['fingerprint'] != code or meta['body'] != body:
            raise RuntimeError('Existing paid cache differs; inspect without regeneration')
    else:
        if any(p.exists() for p in [audio, receipt, response_file, pending]):
            raise RuntimeError(f'{ids}: ambiguous cached request; recover from provider history first')
        if not key:
            raise RuntimeError('Missing paid cache; installation cannot call the provider')
        save(pending, {'fingerprint': code, 'body': body, 'ids': ids, 'startedAt': time.time()})
        request = urllib.request.Request(
            f"https://api.elevenlabs.io/v1/text-to-speech/{CONFIG['voice_id']}/with-timestamps?output_format={CONFIG['output_format']}",
            data=compact(body).encode(), headers={'xi-api-key': key, 'Content-Type': 'application/json'}, method='POST')
        try:
            with urllib.request.urlopen(request, timeout=600) as response:
                raw_bytes = response.read()
                headers = {k.lower(): v for k, v in response.headers.items()
                           if k.lower() in {'character-cost', 'request-id', 'history-item-id'}}
            response_file.write_bytes(raw_bytes)
            raw = json.loads(raw_bytes)
            data = base64.b64decode(raw.pop('audio_base64'), validate=True)
            audio.write_bytes(data)
            meta = {'fingerprint': code, 'text': body['text'], 'body': body, 'config': CONFIG,
                    'sha256': sha(data), 'bytes': len(data), 'headers': headers, **raw}
            save(receipt, meta)  # save the successful paid response before any QA
        except urllib.error.HTTPError as error:
            detail = error.read().decode(errors='replace')[:800]
            if 400 <= error.code < 500:
                pending.replace(CACHE / (code + '.rejected.json'))
            raise RuntimeError(f'{ids}: HTTP {error.code}: {detail}') from None
        except Exception:
            raise RuntimeError(f'{ids}: interrupted result saved as pending; recover before retrying') from None
    length, _ = validate(audio, meta, body['text'])
    alignment = meta['alignment']
    display_tokens = list(TOKEN.finditer(part['displayText']))
    spoken_tokens = list(SPOKEN_TOKEN.finditer(part['spokenText']))
    assert len(display_tokens) == len(spoken_tokens)
    words = [{'time': round(alignment['character_start_times_seconds'][spoken.start()], 4),
              'end': round(min(length, alignment['character_end_times_seconds'][spoken.end() - 1]), 4),
              'text': displayed.group(), 'displayOffset': displayed.start()}
             for displayed, spoken in zip(display_tokens, spoken_tokens)]
    meta.update(duration=length, words=words)
    save(receipt, meta)
    pending.unlink(missing_ok=True)
    return audio, meta


def assemble(p, key=None):
    paid = []
    for index, part in enumerate(p['parts']):
        body = {field: CONFIG[field] for field in ['model_id', 'language_code', 'voice_settings', 'seed']}
        body['text'] = part['spokenText']
        if index:
            body['previous_request_ids'] = [m['headers']['request-id'] for _, m in paid[-3:]]
        if index + 1 < len(p['parts']):
            body['next_text'] = p['parts'][index + 1]['spokenText']
        print(f"{p['id']} part {index + 1}/{len(p['parts'])}: {len(body['text'])} characters", flush=True)
        paid.append(paid_part(part, body, p['id'], key))
    target = CACHE / (p['id'] + '.mp3')
    if len(paid) == 1:
        shutil.copyfile(paid[0][0], target)
    else:
        listing = CACHE / (p['id'] + '.concat.txt')
        listing.write_text(''.join(f"file '{a.as_posix()}'\n" for a, _ in paid))
        subprocess.run(['ffmpeg', '-v', 'error', '-y', '-f', 'concat', '-safe', '0', '-i', str(listing),
                        '-c', 'copy', '-bsf:a', 'setts=ts=N*1152/44100/TB', str(target)], check=True)
    subprocess.run(['ffmpeg', '-v', 'error', '-i', str(target), '-f', 'null', '-'], check=True)
    length = float(subprocess.check_output(['ffprobe', '-v', 'error', '-show_entries', 'format=duration',
                                          '-of', 'default=noprint_wrappers=1:nokey=1', str(target)], text=True))
    words, offset, char_offset = [], 0, 0
    for part, (_, meta) in zip(p['parts'], paid):
        words.extend({**w, 'time': round(w['time'] + offset, 4), 'end': round(w['end'] + offset, 4),
                      'displayOffset': w['displayOffset'] + char_offset} for w in meta['words'])
        offset += meta['duration']
        char_offset += len(part['displayText'])
    assert abs(length - offset) < .1
    assert [w['text'] for w in words] == [m.group() for m in TOKEN.finditer(p['displayText'])]
    assert words[-1]['time'] < length and length > len(words) / 5
    paragraphs, position = [], len(p['title'] + '\n\n')
    for index, line in enumerate(p['text'].splitlines(keepends=True)):
        if line.strip():
            word = next(w for w in words if w['displayOffset'] >= position)
            assert word['displayOffset'] < position + len(line)
            paragraphs.append({'index': index, 'time': word['time'], 'text': line.rstrip('\n')})
        position += len(line)
    result = {'id': p['id'], 'fingerprint': p['fingerprint'], 'sourceSha256': p['sourceSha256'],
              'sha256': sha(target.read_bytes()), 'bytes': target.stat().st_size, 'duration': round(length, 3),
              'spokenWords': len(words), 'characterCount': p['characters'],
              'displayTextSha256': sha(p['displayText'].encode()), 'spokenTextSha256': sha(p['spokenText'].encode()),
              'pronunciationSha256': p['pronunciationSha256'], 'schemaVersion': 3,
              'credits': sum(float(m['headers']['character-cost']) for _, m in paid),
              'parts': len(paid), 'partReceipts': [m['fingerprint'] for _, m in paid],
              'words': words, 'paragraphs': paragraphs}
    save(CACHE / (p['id'] + '.json'), result)
    print(f"READY {p['id']}: {length / 60:.2f} minutes; saved receipts {result['credits']:g} credits", flush=True)
    return result


def read_module(file, symbol):
    return json.loads((ROOT / file).read_text().split(f'export const {symbol} = ', 1)[1].strip().removesuffix(';'))


def module(file, symbol, data):
    (ROOT / file).write_text('// Generated from complete sources and verified fixed recordings.\n'
                            + f'export const {symbol} = ' + json.dumps(data, ensure_ascii=False, indent=2) + ';\n')


def install(plans, catalog):
    ready = [p for p in plans if (CACHE / (p['id'] + '.json')).exists()]
    recordings, captions = read_module('audiobook-data.js', 'AUDIOBOOKS'), read_module('story-caption-timing.js', 'STORY_CAPTION_TIMES')
    receipts = json.loads((ROOT / 'audio/audiobooks/generated.json').read_text())
    words = read_module('rado-word-timing.js', 'RADO_WORD_TIMING') if (ROOT / 'rado-word-timing.js').exists() else {}
    for p in ready:
        meta = assemble(p)  # re-decode every cached part; no network calls
        entry = next(e for e in catalog['stories'] if e['id'] == p['id'])
        path = 'audio/audiobooks/' + p['id'] + '.mp3'
        shutil.copyfile(CACHE / (p['id'] + '.mp3'), ROOT / path)
        published = {'id': p['id'], 'title': p['title'], 'text': p['text'], 'file': path,
                     'duration': meta['duration'], 'bytes': meta['bytes'], 'sha256': meta['sha256'],
                     'emoji': '📖', 'author': entry['author'], 'kind': 'Mese', 'illustrated': False,
                     'sourceUrl': entry['sourceUrl'], 'rights': entry['rights'], 'volume': entry['volume']}
        recordings = [r for r in recordings if r['id'] != p['id']] + [published]
        receipts['stories'][p['id']] = {k: v for k, v in meta.items() if k not in ['id', 'words', 'paragraphs', 'bytes']}
        captions[p['id']] = [cue['time'] for cue in meta['paragraphs']]
        words[p['id']] = [[w['time'], w['end'], w['text']] for w in meta['words']]
        entry['audioStatus'] = 'ready'
    order = {e['id']: i for i, e in enumerate(catalog['stories'])}
    recordings.sort(key=lambda r: order[r['id']])
    module('audiobook-data.js', 'AUDIOBOOKS', recordings)
    module('story-caption-timing.js', 'STORY_CAPTION_TIMES', captions)
    module('rado-word-timing.js', 'RADO_WORD_TIMING', words)
    save(SOURCE / 'catalog.json', catalog)
    save(ROOT / 'audio/audiobooks/generated.json', receipts)
    reader = [{**e, 'text': (SOURCE / e['file']).read_text().rstrip('\n')} for e in catalog['stories'] if e['id'].startswith('rado-')]
    module('rado-stories.js', 'RADO_STORIES', reader)


def inventory(plans, catalog):
    rows = []
    for p in plans:
        entry = next(e for e in catalog['stories'] if e['id'] == p['id'])
        rows.append({'id': p['id'], 'title': p['title'], 'volume': entry['volume'],
                     'displayCharacters': p['displayCharacters'], 'providerCharacters': p['characters'],
                     'parts': len(p['parts']), 'partCharacters': [len(x['spokenText']) for x in p['parts']],
                     'partDisplaySha256': [sha(x['displayText'].encode()) for x in p['parts']],
                     'partInputSha256': [sha(x['spokenText'].encode()) for x in p['parts']],
                     'fingerprint': p['fingerprint'], 'audioStatus': entry['audioStatus'],
                     'conservativeCredits': p['characters']})
    total = sum(r['providerCharacters'] for r in rows)
    pending = sum(r['providerCharacters'] for r in rows if r['audioStatus'] != 'ready')
    save(SOURCE / 'rado-plan.json', {'version': 1, 'config': CONFIG, 'pronunciation': PRONUNCIATION,
         'stories': rows, 'providerCharacters': total, 'pendingCharacters': pending,
         'costBasis': '1 credit per provider character, no promotional discount assumed',
         'minimumPendingCredits': pending, 'pendingCreditsWithSafetyMargin': math.ceil(pending * 1.1),
         'paidCache': '~/.config/beszedtanulas/rado-audiobook-cache/'})
    print(f'{len(rows)} complete tales; {total} provider characters; {pending} pending; '
          f'{math.ceil(pending * 1.1)} credits including 10% margin', flush=True)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--generate', action='store_true')
    parser.add_argument('--fit-quota', action='store_true')
    parser.add_argument('--install', action='store_true')
    parser.add_argument('--ids', nargs='+')
    args = parser.parse_args()
    CACHE.mkdir(parents=True, exist_ok=True)
    catalog = json.loads((SOURCE / 'catalog.json').read_text())
    plans = [plan(e) for e in catalog['stories'] if e['id'].startswith('rado-')]
    for p in plans:
        save(CACHE / (p['id'] + '.plan.json'), {**p, 'config': CONFIG})
    inventory(plans, catalog)
    selected = [p for p in plans if not args.ids or p['id'] in args.ids]
    if args.ids and set(args.ids) - {p['id'] for p in plans}:
        raise ValueError('Unknown tale IDs')
    if args.generate:
        key = voice_generator.load_key()
        before = voice_generator.api('user/subscription', key)
        model = next(m for m in voice_generator.api('models', key) if m['model_id'] == CONFIG['model_id'])
        voice = voice_generator.api('voices/' + CONFIG['voice_id'], key)
        multiplier = max(1, model.get('model_rates', {}).get('character_cost_multiplier', 1)) * max(1, voice.get('sharing', {}).get('rate') or 1)
        remaining = before['character_limit'] - before['character_count']
        selected = [p for p in selected if not (CACHE / (p['id'] + '.json')).exists()]
        # A batch is selected before any request. Keep 10% conservative reserve.
        if args.fit_quota:
            selected = batch_that_fits(selected, remaining, multiplier)
        required = math.ceil(sum(p['characters'] for p in selected) * multiplier * 1.1)
        if before.get('status') != 'active' or required > remaining:
            raise RuntimeError(f'Insufficient existing balance: required {required}, available {remaining}')
        run = {'startedAt': time.time(), 'quotaBefore': before['character_count'], 'quotaLimit': before['character_limit'],
               'availableBefore': remaining, 'multiplier': multiplier, 'conservativeBatchCredits': required,
               'selected': [p['id'] for p in selected], 'completed': [], 'errors': [], 'recordingCredits': 0}
        run_path = CACHE / f'run-{time.time_ns()}.json'
        save(run_path, run)
        print(compact(run), flush=True)
        try:
            for p in selected:
                # Re-check immediately before each paid whole-tale stage.
                balance = voice_generator.api('user/subscription', key)
                if balance.get('status') != 'active' or balance['character_limit'] - balance['character_count'] < math.ceil(p['characters'] * multiplier * 1.1):
                    raise RuntimeError('Existing balance changed; stopped before sending another tale')
                meta = assemble(p, key)
                run['completed'].append(p['id'])
                run['recordingCredits'] += meta['credits']
                save(run_path, run)
        except Exception as error:
            run['errors'].append(str(error))
            save(run_path, run)
            raise
        finally:
            after = voice_generator.api('user/subscription', key)
            run.update(quotaAfter=after['character_count'], quotaRemaining=after['character_limit'] - after['character_count'],
                       quotaDelta=after['character_count'] - before['character_count'])
            save(run_path, run)
            print(compact(run), flush=True)
    if args.install:
        install(plans, catalog)
        inventory(plans, catalog)


if __name__ == '__main__':
    main()
