"""Build fixed Noemi MP3 audiobooks from the saved stories; no runtime synthesis.
Run: uv run --with edge-tts==7.2.8 scripts/generate-audiobooks.py
Only the story title and body are sent to the speech service.
"""
import asyncio
import hashlib
import json
import re
import subprocess
from pathlib import Path

import edge_tts

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / 'content/stories'
OUT = ROOT / 'audio/audiobooks'
PARTS = ROOT / 'output/audiobooks'
VOICE, RATE = 'hu-HU-NoemiNeural', '-6%'


def sha(data):
    return hashlib.sha256(data).hexdigest()


def clean(text):
    return re.sub(r'^#{1,6}\s+', '', text.replace('**', ''), flags=re.M).strip()


def chunks(text, limit=2800):
    # Preserve every character and split at paragraph boundaries when possible.
    result = []
    while len(text) > limit:
        at = text.rfind('\n', 0, limit)
        if at < limit // 2:
            at = text.rfind(' ', 0, limit)
        at = at + 1 if at > 0 else limit
        result.append(text[:at])
        text = text[at:]
    if text:
        result.append(text)
    return result


async def main():
    OUT.mkdir(parents=True, exist_ok=True)
    PARTS.mkdir(parents=True, exist_ok=True)
    catalog = json.loads((SOURCE / 'catalog.json').read_text())
    receipt_file = OUT / 'generated.json'
    receipts = json.loads(receipt_file.read_text())['stories'] if receipt_file.exists() else {}
    semaphore = asyncio.Semaphore(4)
    stories = []

    async def part_audio(text):
        fingerprint = sha(json.dumps([VOICE, RATE, text], ensure_ascii=False, separators=(',', ':')).encode())
        path = PARTS / f'{fingerprint}.mp3'
        timing = path.with_suffix('.jsonl')
        check = path.with_suffix('.sha256')
        if path.exists() and timing.exists() and check.exists() and check.read_text() == sha(path.read_bytes()):
            return path, len(timing.read_text().splitlines())
        async with semaphore:
            for attempt in range(4):
                temp = path.with_suffix('.part.mp3')
                temp_timing = path.with_suffix('.part.jsonl')
                try:
                    await edge_tts.Communicate(text, VOICE, rate=RATE, boundary='WordBoundary').save(str(temp), str(temp_timing))
                    boundaries = [json.loads(line) for line in temp_timing.read_text().splitlines() if line]
                    if temp.stat().st_size < 1000 or len(boundaries) < len(text.split()) * .75:
                        raise RuntimeError('Incomplete audio or missing spoken words')
                    temp.replace(path)
                    temp_timing.replace(timing)
                    check.write_text(sha(path.read_bytes()))
                    return path, len(boundaries)
                except Exception as error:
                    temp.unlink(missing_ok=True)
                    temp_timing.unlink(missing_ok=True)
                    if attempt == 3:
                        raise RuntimeError(f'Audio generation failed: {error}') from error
                    await asyncio.sleep(2 ** attempt)

    for entry in catalog['stories']:
        source = (SOURCE / entry['file']).read_bytes()
        if sha(source) != entry['sha256']:
            raise RuntimeError(f"Story source changed: {entry['id']}")
        text = clean(source.decode())
        spoken = entry['title'] + '.\n\n' + text
        fingerprint = sha(json.dumps([VOICE, RATE, spoken], ensure_ascii=False, separators=(',', ':')).encode())
        file = f"audio/audiobooks/{entry['id']}.mp3"
        output = ROOT / file
        receipt = receipts.get(entry['id'], {})
        if not (output.exists() and receipt.get('fingerprint') == fingerprint and receipt.get('sha256') == sha(output.read_bytes())):
            sections = chunks(spoken)
            assert ''.join(sections) == spoken
            parts = await asyncio.gather(*(part_audio(section) for section in sections))
            concat = PARTS / f"{entry['id']}.concat.txt"
            concat.write_text(''.join(f"file '{path.as_posix()}'\n" for path, _ in parts))
            temp = output.with_suffix('.part.mp3')
            subprocess.run(['ffmpeg', '-hide_banner', '-loglevel', 'error', '-y', '-f', 'concat', '-safe', '0', '-i', str(concat), '-c', 'copy', str(temp)], check=True)
            subprocess.run(['ffmpeg', '-v', 'error', '-i', str(temp), '-f', 'null', '-'], check=True)
            duration = float(subprocess.check_output(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'default=noprint_wrappers=1:nokey=1', str(temp)], text=True))
            if duration < len(spoken.split()) / 5:
                raise RuntimeError(f"Unexpectedly short audiobook: {entry['id']}")
            temp.replace(output)
            receipt = {'fingerprint': fingerprint, 'sha256': sha(output.read_bytes()), 'sourceSha256': entry['sha256'], 'duration': round(duration, 3), 'spokenWords': sum(count for _, count in parts), 'parts': len(parts)}
            receipts[entry['id']] = receipt
            receipt_file.write_text(json.dumps({'version': 1, 'voice': VOICE, 'rate': RATE, 'stories': receipts}, indent=2) + '\n')
        stories.append({'id': entry['id'], 'title': entry['title'], 'text': text, 'file': file, 'duration': receipt['duration'], 'bytes': output.stat().st_size, 'sha256': receipt['sha256'], 'emoji': ['🚓','🚜','🔧','🚗','🌧️','🏁','💦','⛄','⛸️','🏝️','👑','🚘'][len(stories)]})
        print(f"{entry['id']}: {receipt['duration'] / 60:.1f} minutes, {output.stat().st_size / 1e6:.1f} MB", flush=True)
    (ROOT / 'audiobook-data.js').write_text('// Generated by scripts/generate-audiobooks.py. Runtime uses fixed MP3 recordings.\nexport const AUDIOBOOKS = ' + json.dumps(stories, ensure_ascii=False, indent=2) + ';\n')
    print(f"Ready: {len(stories)} audiobooks, {sum(s['duration'] for s in stories) / 60:.1f} minutes.", flush=True)


if __name__ == '__main__':
    asyncio.run(main())
