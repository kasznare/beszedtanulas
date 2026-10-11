"""Read-only verification of staged ElevenLabs audiobooks; never calls an API.

Run without arguments to require the complete catalog, or use --ids story-01
to verify completed recordings while generation is still running.
"""
import argparse
import hashlib
import json
import math
import re
import subprocess
from pathlib import Path

from elevenlabs_tail_verification import verify_tail

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / 'content/stories'
DEFAULT_STAGE = ROOT / 'output/elevenlabs-audiobooks'


def require(condition, message):
    if not condition:
        raise RuntimeError(message)


def sha(data):
    return hashlib.sha256(data).hexdigest()


def fingerprint(value):
    return sha(json.dumps(value, ensure_ascii=False, separators=(',', ':')).encode())


def clean(text):
    return re.sub(r'^#{1,6}\s+', '', text.replace('**', ''), flags=re.M).strip()


def finite(value):
    return isinstance(value, (int, float)) and not isinstance(value, bool) and math.isfinite(value)


def check_audio(path, metadata, label):
    data = path.read_bytes()
    require(len(data) > 1000, f'{label}: incomplete audio')
    require(sha(data) == metadata['sha256'], f'{label}: changed audio hash')
    require(len(data) == metadata['bytes'], f'{label}: changed audio byte count')
    subprocess.run(['ffmpeg', '-v', 'error', '-i', str(path), '-f', 'null', '-'], check=True)
    measured = float(subprocess.check_output(['ffprobe', '-v', 'error', '-show_entries',
        'format=duration', '-of', 'default=noprint_wrappers=1:nokey=1', str(path)], text=True))
    require(finite(metadata['duration']) and abs(measured - metadata['duration']) < .002,
        f'{label}: duration differs from decoded MP3 metadata')
    return measured


def check_alignment(value, duration, label, text=None, verified_tail=None):
    require(isinstance(value, dict), f'{label}: missing character alignment')
    characters = value['characters']
    starts = value['character_start_times_seconds']
    ends = value['character_end_times_seconds']
    require(len(characters) > 0 and len(characters) == len(starts) == len(ends),
        f'{label}: incomplete character alignment')
    require(all(isinstance(char, str) for char in characters), f'{label}: invalid aligned text')
    if text is not None:
        require(''.join(characters) == text, f'{label}: alignment does not cover the exact input text')
    final_word_span = None
    if verified_tail:
        # Normalization can shift source offsets; locate the verified final token anew.
        matches = list(re.finditer(r"\w+(?:[-’']\w+)*", ''.join(characters)))
        if matches and matches[-1].group().casefold() == verified_tail['finalWord']:
            final_word_span = matches[-1].span()
    for index, (start, end) in enumerate(zip(starts, ends)):
        # The service may allocate a short final punctuation pause beyond the MP3.
        start_tolerance = .05 if characters[index].isalnum() else .5
        end_tolerance = .5
        if final_word_span and final_word_span[0] <= index < final_word_span[1] and characters[index].isalnum():
            start_tolerance = end_tolerance = verified_tail['maxLexicalDrift']
        require(finite(start) and finite(end) and 0 <= start <= end <= duration + end_tolerance
            and start <= duration + start_tolerance,
            f'{label}: character {index} lies outside its recording')
        require(index == 0 or start >= starts[index - 1], f'{label}: backwards character timing')


def check_story(entry, stage):
    label = entry['id']
    raw = (SOURCE / entry['file']).read_bytes()
    require(sha(raw) == entry['sha256'], f'{label}: original story source changed')
    text = clean(raw.decode())
    spoken = entry['title'] + '.\n\n' + text
    meta = json.loads((stage / f'{label}.json').read_text())
    require(meta['id'] == label and meta['title'] == entry['title'], f'{label}: incorrect story identity')
    require(meta['text'] == text and meta['spokenText'] == spoken, f'{label}: changed spoken text')
    require(meta['sourceSha256'] == entry['sha256'], f'{label}: stale source receipt')
    require(meta['characters'] == len(spoken), f'{label}: incorrect input character count')
    require(meta['voiceId'] == 'yj30vwTGJxSHezdAGsv9' and meta['modelId'] == 'eleven_v4'
        and meta['languageCode'] == 'hu', f'{label}: incorrect generation voice/model/language')
    generation = [meta['voiceId'], meta['modelId'], meta['languageCode'], meta['voiceSettings'],
        meta['outputFormat'], meta['seed'], spoken]
    require(meta['fingerprint'] == fingerprint(generation), f'{label}: stale generation fingerprint')
    length = check_audio(stage / f'{label}.mp3', meta, label)
    require(length >= len(spoken.split()) / 5, f'{label}: recording unexpectedly short')
    require(meta['spokenWords'] == len(spoken.split()), f'{label}: incorrect input word count')
    require(finite(meta['credits']) and meta['credits'] >= 0, f'{label}: invalid recording credit cost')
    verified_tail = verify_tail(meta, stage)
    check_alignment(meta['alignment'], length, label, spoken, verified_tail)
    if meta.get('normalized_alignment'):
        check_alignment(meta['normalized_alignment'], length, label + ' normalized', verified_tail=verified_tail)
    require(isinstance(meta['parts'], list) and len(meta['parts']) > 0, f'{label}: missing cached parts')
    parts = []
    for index, part in enumerate(meta['parts']):
        relative = Path(part['file'])
        require(not relative.is_absolute() and '..' not in relative.parts, f'{label}: unsafe part path')
        path = stage / relative
        require(path.resolve().is_relative_to(stage.resolve()), f'{label}: part path escapes staging')
        cached = json.loads(path.with_suffix('.json').read_text())
        part_label = f'{label} part {index + 1}'
        check_audio(path, cached, part_label)
        require(part['duration'] == cached['duration'], f'{part_label}: mismatched duration')
        require(part['fingerprint'] == cached['fingerprint'], f'{part_label}: mismatched request fingerprint')
        require(part['requestId'] == cached['headers'].get('request-id'), f'{part_label}: mismatched request ID')
        cost = float(cached['headers']['character-cost'])
        require(finite(cost) and cost >= 0 and part['characterCost'] == cost,
            f'{part_label}: mismatched credit cost')
        require(0 < len(cached['text']) <= 10000, f'{part_label}: invalid chunk size')
        part_tail = verified_tail if verified_tail and cached['sha256'] == verified_tail['audioSha256'] else None
        check_alignment(cached['alignment'], cached['duration'], part_label, cached['text'], part_tail)
        parts.append(cached)
    require(''.join(part['text'] for part in parts) == spoken, f'{label}: incomplete or duplicated chunks')
    require(abs(sum(part['duration'] for part in parts) - length) < .2, f'{label}: concatenated duration differs')
    require(abs(sum(float(part['headers']['character-cost']) for part in parts) - meta['credits']) < .0001,
        f'{label}: credit total differs from saved response receipts')
    for index, part in enumerate(parts):
        body = {'text': part['text'], 'model_id': meta['modelId'], 'language_code': meta['languageCode'],
            'voice_settings': meta['voiceSettings'], 'seed': meta['seed']}
        if index:
            body['previous_request_ids'] = [prior['headers']['request-id'] for prior in parts[max(0, index - 3):index]]
        if index + 1 < len(parts):
            body['next_text'] = parts[index + 1]['text']
        require(part['fingerprint'] == fingerprint([meta['voiceId'], meta['outputFormat'], body]),
            f'{label} part {index + 1}: request differs from receipt')
    print(f"Verified {label}: {length / 60:.1f} minutes, {len(spoken)} input characters, {meta['credits']:g} recording credits", flush=True)
    return meta


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--stage', type=Path, default=DEFAULT_STAGE)
    parser.add_argument('--ids', nargs='+')
    args = parser.parse_args()
    entries = json.loads((SOURCE / 'catalog.json').read_text())['stories']
    if args.ids:
        known = {entry['id'] for entry in entries}
        require(set(args.ids) <= known, 'Unknown story IDs')
        entries = [entry for entry in entries if entry['id'] in args.ids]
    checked = [check_story(entry, args.stage) for entry in entries]
    print(f"Verified {len(checked)} staged audiobooks: {sum(item['duration'] for item in checked) / 60:.1f} minutes. "
        f"Saved recording receipts total {sum(item['credits'] for item in checked):g} credits; this is not the cost of this verification run.")


if __name__ == '__main__':
    main()
