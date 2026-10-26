#!/usr/bin/env python3
"""Validate or render an unverified partial audiobook repair into output/ only. No API calls."""
import argparse
import hashlib
import json
import math
import re
import subprocess
import tempfile
import wave
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
TOKEN = re.compile(r"\w+(?:[-’']\w+)*", re.UNICODE)
SPOKEN_TOKEN = re.compile(r"/[^/\n]+/|\w+(?:[-’']\w+)*", re.UNICODE)
RATE = 44100


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def module(path, symbol):
    prefix = 'export const ' + symbol + ' = '
    return json.loads(path.read_text().split(prefix, 1)[1].strip().removesuffix(';'))


def require(condition, message):
    if not condition:
        raise ValueError(message)


def number(value, name):
    require(isinstance(value, (float, int)) and not isinstance(value, bool)
            and math.isfinite(value), name + ' must be finite')
    return value


def decode(path, target):
    subprocess.run(['ffmpeg', '-v', 'error', '-xerror', '-y', '-i', str(path), '-vn',
                    '-ar', str(RATE), '-ac', '1', '-c:a', 'pcm_s16le', str(target)], check=True)
    with wave.open(str(target), 'rb') as wav:
        require(wav.getnframes() > 0, 'empty audio')
        return wav.readframes(wav.getnframes())


def validate(plan, root=ROOT):
    books = module(root / 'audiobook-data.js', 'AUDIOBOOKS')
    story = next((s for s in books if s['id'] == plan.get('storyId')), None)
    require(story is not None, 'unknown storyId')
    entry = next(e for e in json.loads((root / 'content/stories/catalog.json').read_text())['stories']
                 if e['id'] == story['id'])
    base = (root / story['file']).resolve()
    source = (root / 'content/stories' / entry['file']).resolve()
    require(plan.get('baseAudioSha256') == story['sha256'] == sha(base), 'stale base audio hash')
    require(entry['sha256'] == sha(source), 'stale source file hash')
    body = re.sub(r'^#{1,6}\s+', '', source.read_text().replace('**', ''), flags=re.M).strip()
    require(body == story['text'], 'published body differs from source')
    receipts = json.loads((root / 'audio/audiobooks/generated.json').read_text())
    separator = '\n\n' if receipts['stories'][story['id']].get('schemaVersion') == 3 else '.\n\n'
    displayed = story['title'] + separator + story['text']
    require(plan.get('sourceTextSha256') == hashlib.sha256(displayed.encode()).hexdigest(), 'stale displayed text hash')
    config_path = root / 'voice-config.json'
    config = json.loads(config_path.read_text())
    require(config.get('model_id') == 'eleven_v4' and config.get('language_code') == 'hu', 'phonetic input requires eleven_v4 Hungarian config')
    patches = plan.get('patches')
    require(isinstance(patches, list) and patches, 'patches must be nonempty')
    previous_end = previous_display = 0
    ids = set()
    verified = []
    for patch in patches:
        identifier = patch.get('id')
        require(isinstance(identifier, str) and identifier and identifier not in ids, 'patch IDs must be unique')
        ids.add(identifier)
        start, end = [number(patch.get(key), key) for key in ['start', 'end']]
        require(0 <= previous_end <= start < end <= story['duration'], 'unordered, overlapping or out-of-bounds cut')
        ds, de = patch.get('displayStart'), patch.get('displayEnd')
        require(type(ds) is int and type(de) is int and previous_display <= ds < de <= len(displayed), 'invalid display range')
        text, spoken = patch.get('text'), patch.get('spokenText')
        require(text == displayed[ds:de], 'patch text differs from source substring')
        require(isinstance(spoken, str) and re.search(r'/[^/\n]+/', spoken), 'phonetic /IPA/ input required')
        require('/' not in re.sub(r'/[^/\n]+/', '', spoken), 'unmatched phonetic slash')
        require(all(any(char.isalpha() for char in span[1:-1]) for span in re.findall(r'/[^/\n]+/', spoken)), 'empty phonetic word')
        words, utterance = list(TOKEN.finditer(text)), list(SPOKEN_TOKEN.finditer(spoken))
        require(len(words) == len(utterance) > 0, 'phonetic token count differs')
        mapping = []
        for word, sound in zip(words, utterance):
            require(sound.group().startswith('/') or word.group() == sound.group(), 'nonphonetic word changed')
            mapping.append({'text': word.group(), 'spokenText': sound.group(),
                            'displayStart': ds + word.start(), 'displayEnd': ds + word.end(),
                            'spokenStart': sound.start(), 'spokenEnd': sound.end()})
        replacement = Path(patch.get('replacementFile', '')).expanduser()
        if not replacement.is_absolute():
            replacement = root / replacement
        replacement = replacement.resolve()
        require(replacement.is_file() and sha(replacement) == patch.get('replacementSha256'), 'replacement missing or hash differs')
        rs, re_ = [number(patch.get(key), key) for key in ['replacementStart', 'replacementEnd']]
        require(0 <= rs < re_, 'invalid replacement trim')
        verified.append({**patch, 'replacementFile': str(replacement), 'tokenMap': mapping})
        previous_end, previous_display = end, de
    return story, base, verified, sha(source), config, sha(config_path)


def stage(plan, destination, *, root=ROOT, dry=False, mp3=False):
    story, base, patches, source_file_hash, config, config_hash = validate(plan, root)
    destination = Path(destination).resolve()
    output_root = (root / 'output').resolve()
    require(destination.is_relative_to(output_root) and destination != output_root, 'destination must be a new directory under output/')
    require(not destination.exists(), 'destination already exists; refusing overwrite')
    # Full decoding also validates the actual replacement streams, including dry validation.
    with tempfile.TemporaryDirectory(prefix='audiobook-patch-') as temporary:
        temp = Path(temporary)
        original = decode(base, temp / 'base.wav')
        total = len(original) // 2
        segments, boundaries, cursor, new_cursor = [], [], 0, 0
        for index, patch in enumerate(patches):
            start, end = round(patch['start'] * RATE), round(patch['end'] * RATE)
            require(cursor <= start < end <= total, 'cut outside decoded audio or below sample resolution')
            replacement = decode(Path(patch['replacementFile']), temp / f'patch-{index}.wav')
            rs, re_ = round(patch['replacementStart'] * RATE), round(patch['replacementEnd'] * RATE)
            require(0 <= rs < re_ <= len(replacement) // 2, 'replacement trim outside decoded audio')
            unchanged = original[cursor * 2:start * 2]
            segments.append(unchanged); new_cursor += start - cursor
            new_start = new_cursor
            segments.append(replacement[rs * 2:re_ * 2]); new_cursor += re_ - rs
            boundaries.append({'id': patch['id'], 'oldSamples': [start, end],
                               'newSamples': [new_start, new_cursor], 'replacementSamples': [rs, re_],
                               'deltaSamples': (re_ - rs) - (end - start)})
            cursor = end
        segments.append(original[cursor * 2:]); new_cursor += total - cursor
        points = [[0, 0]]
        for boundary in boundaries:
            for old, new in zip(boundary['oldSamples'], boundary['newSamples']):
                point = [old / RATE, new / RATE]
                if point != points[-1]:
                    points.append(point)
        final_point = [total / RATE, new_cursor / RATE]
        if points[-1] != final_point:
            points.append(final_point)
        receipt = {'version': 1, 'status': 'unverified-staging-only', 'readyForInstall': False,
                   'needs': ['human listening review', 'new word alignment', 'caption and animation remapping'],
                   'storyId': story['id'], 'baseAudioSha256': plan['baseAudioSha256'],
                   'sourceTextSha256': plan['sourceTextSha256'], 'sourceFileSha256': source_file_hash,
                   'phoneticConfig': config, 'phoneticConfigSha256': config_hash,
                   'replacementGenerationProvenance': 'not verified; config records staging requirements only',
                   'sampleRate': RATE, 'channels': 1,
                   'sampleFormat': 's16le', 'originalSamples': total, 'newSamples': new_cursor,
                   'boundaries': boundaries, 'clockMap': {'direction': 'old-recording-to-new-recording',
                   'points': points, 'insidePatch': 'boundary interpolation only; word alignment still required'},
                   'patches': patches, 'dryValidation': dry}
        if dry:
            return receipt
        destination.mkdir(parents=True)
        target = destination / 'staged.wav'
        with wave.open(str(target), 'wb') as wav:
            wav.setparams((1, 2, RATE, 0, 'NONE', 'not compressed'))
            for segment in segments:
                wav.writeframesraw(segment)
        receipt['wavSha256'] = sha(target)
        if mp3:
            encoded = destination / 'staged.mp3'
            subprocess.run(['ffmpeg', '-v', 'error', '-n', '-i', str(target), '-c:a', 'libmp3lame', '-b:a', '128k', str(encoded)], check=True)
            receipt['mp3Sha256'] = sha(encoded)
        (destination / 'receipt.json').write_text(json.dumps(receipt, ensure_ascii=False, indent=2) + '\n')
        return receipt


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('plan', type=Path)
    parser.add_argument('--output', type=Path, required=True)
    parser.add_argument('--dry-validate', action='store_true')
    parser.add_argument('--mp3', action='store_true', help='encode one optional final MP3 from staged PCM')
    args = parser.parse_args()
    result = stage(json.loads(args.plan.read_text()), args.output, dry=args.dry_validate, mp3=args.mp3)
    print(json.dumps({'storyId': result['storyId'], 'status': result['status'], 'dryValidation': result['dryValidation'], 'newSamples': result['newSamples']}))


if __name__ == '__main__':
    main()
