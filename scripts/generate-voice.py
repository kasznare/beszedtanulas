"""Generate static Hungarian voice clips. Never modifies the family recordings in audio/.
Run: npm run generate-voice
Only dictionary words and app instructions are sent to the speech service.
"""
import asyncio
import hashlib
import json
from pathlib import Path

import edge_tts

ROOT = Path(__file__).resolve().parents[1]
MANIFEST = json.loads((ROOT / 'audio/voice/manifest.json').read_text())
RECEIPTS_PATH = ROOT / 'audio/voice/generated.json'


def fingerprint(clip):
    payload = [MANIFEST['voice'], MANIFEST['rate'], clip['text']]
    return hashlib.sha256(json.dumps(payload, ensure_ascii=False, separators=(',', ':')).encode()).hexdigest()


def audio_hash(output):
    return hashlib.sha256(output.read_bytes()).hexdigest()


def is_current(clip, output, receipts):
    receipt = receipts.get(clip['id'], {})
    return (output.exists() and output.stat().st_size > 1000
            and receipt.get('fingerprint') == fingerprint(clip)
            and bool(receipt.get('words'))
            and receipt.get('sha256') == audio_hash(output))


async def main():
    receipts = json.loads(RECEIPTS_PATH.read_text())['clips'] if RECEIPTS_PATH.exists() else {}
    generated = 0
    semaphore = asyncio.Semaphore(2)
    async def generate(clip):
        nonlocal generated
        output = ROOT / clip['file']
        if is_current(clip, output, receipts):
            return
        async with semaphore:
            for attempt in range(3):
                temp = output.with_suffix('.part.mp3')
                timing_temp = output.with_suffix('.part.jsonl')
                try:
                    await edge_tts.Communicate(clip['text'], MANIFEST['voice'], rate=MANIFEST['rate'], boundary='WordBoundary').save(str(temp), str(timing_temp))
                    if temp.stat().st_size < 1000:
                        raise RuntimeError('Empty voice response')
                    boundaries = [json.loads(line) for line in timing_temp.read_text().splitlines() if line]
                    words = [[round(word['offset'] / 10000000, 4), round((word['offset'] + word['duration']) / 10000000, 4), word['text']]
                             for word in boundaries if word['type'] == 'WordBoundary']
                    if not words:
                        raise RuntimeError('Missing word timings')
                    temp.replace(output)
                    timing_temp.unlink(missing_ok=True)
                    receipts[clip['id']] = {'fingerprint': fingerprint(clip), 'sha256': audio_hash(output), 'words': words}
                    receipt_temp = RECEIPTS_PATH.with_suffix('.part.json')
                    receipt_temp.write_text(json.dumps({'version': 1, 'clips': receipts}, indent=2) + '\n')
                    receipt_temp.replace(RECEIPTS_PATH)
                    generated += 1
                    print(clip['id'], flush=True)
                    await asyncio.sleep(.3)
                    return
                except Exception as error:
                    temp.unlink(missing_ok=True)
                    timing_temp.unlink(missing_ok=True)
                    if attempt == 2:
                        raise RuntimeError(f"Could not generate {clip['id']}: {error}") from error
                    await asyncio.sleep(2 ** attempt)
    await asyncio.gather(*(generate(clip) for clip in MANIFEST['clips']))
    timings = {clip['id']: receipts[clip['id']]['words'] for clip in MANIFEST['clips']}
    (ROOT / 'voice-timing.js').write_text('// Generated with the MP3s by npm run generate-voice. Times are seconds in the recording.\nexport const VOICE_TIMING = ' + json.dumps(timings, ensure_ascii=False, separators=(',', ':')) + ';\n')
    print(f"Ready: {len(MANIFEST['clips'])} voice clips; generated {generated}, unchanged {len(MANIFEST['clips']) - generated}.")

if __name__ == '__main__':
    asyncio.run(main())
