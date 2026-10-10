"""Recover exact recorded word/paragraph cues, without regenerating speech."""
import json
import re
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CACHE = ROOT / 'output/audiobooks'
OUT = ROOT / 'output/story-timing'
OUT.mkdir(parents=True, exist_ok=True)
catalog = json.loads((ROOT / 'content/stories/catalog.json').read_text())['stories']
receipt = json.loads((ROOT / 'audio/audiobooks/generated.json').read_text())['stories']
normalize = lambda value: re.sub(r'[^\w-]', '', value).lower()

for story in catalog:
    offset = 0
    words = []
    for line in (CACHE / f"{story['id']}.concat.txt").read_text().splitlines():
        source = CACHE / Path(line[6:-1]).name
        duration = float(subprocess.check_output(['ffprobe','-v','error','-show_entries','format=duration','-of','default=noprint_wrappers=1:nokey=1',str(source)],text=True))
        for raw in source.with_suffix('.jsonl').read_text().splitlines():
            item = json.loads(raw)
            words.append({'time':round(offset+item['offset']/1e7,3),'duration':round(item['duration']/1e7,3),'text':item['text']})
        offset += duration
    normalized = [normalize(word['text']) for word in words]
    paragraphs = []
    cursor = len(story['title'].split())
    source_text = (ROOT / 'content/stories' / story['file']).read_text().strip()
    for index,text in enumerate(source_text.splitlines()):
        if not text.strip():
            continue
        tokens = [normalize(token) for token in text.split() if normalize(token)]
        found = None
        for length in [min(7,len(tokens)),min(4,len(tokens)),min(2,len(tokens)),1]:
            seq=tokens[:length]
            found=next((i for i in range(cursor,len(words)) if normalized[i:i+length]==seq),None)
            if found is not None:
                break
        if found is None:
            raise RuntimeError(f"Unmatched paragraph {story['id']} {index}: {text[:80]}")
        paragraphs.append({'index':index,'time':words[found]['time'],'text':text,'matched':length,'wordIndex':found})
        cursor=found+max(1,len(tokens)-3)
    payload={'id':story['id'],'title':story['title'],'duration':receipt[story['id']]['duration'],'words':words,'paragraphs':paragraphs}
    (OUT / f"{story['id']}.json").write_text(json.dumps(payload,ensure_ascii=False,indent=2)+'\n')
    print(f"{story['id']}: {len(words)} words, {len(paragraphs)} paragraphs, {round(offset,3)}s")
