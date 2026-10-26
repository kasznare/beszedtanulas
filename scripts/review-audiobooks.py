"""Build a local listening review from existing ASR; never transcribes or edits audio."""
import argparse
from collections import Counter
import difflib
import hashlib
import html
import json
import math
import os
from pathlib import Path
import re
import unicodedata
from urllib.parse import quote

TOKEN = re.compile(r'[^\W_](?:[^\W_]|[\u0300-\u036f])*', re.UNICODE)
SENTENCE = re.compile(r'[^.!?…\n]+(?:[.!?…]+[”’»"]*)?')
LIMITATION = ('A gépi eltérés meghallgatási jelzés, nem bizonyított kiejtési hiba. '
              'Az egyezés sem igazolja a kiejtést. Az időablakok becslések: '
              'meghallgatásra szolgálnak, automatikus hangvágásra nem.')


def read_json(path):
    return json.loads(Path(path).read_text(encoding='utf-8'))


def digest(text):
    return hashlib.sha256(text.encode('utf-8')).hexdigest()


def tokens(text):
    return [dict(text=m.group(), normalized=unicodedata.normalize('NFC', m.group()).casefold(),
                 start=m.start(), end=m.end()) for m in TOKEN.finditer(text)]


def finite(value):
    return isinstance(value, (int, float)) and not isinstance(value, bool) and math.isfinite(value)


def timed_tokens(recognized, words, duration):
    """Only attach a timestamp where word-token and transcript-token text agree."""
    lexical = tokens(recognized)
    flattened = []
    for word in words:
        start, end = word.get('start'), word.get('end')
        valid = finite(start) and finite(end) and 0 <= start <= end <= duration + .1 and start <= duration
        for token in tokens(word.get('text', word.get('word', ''))):
            flattened.append(dict(normalized=token['normalized'],
                                  time=[max(0, start), min(duration, end)] if valid else None))
    mapping = [None] * len(lexical)
    matcher = difflib.SequenceMatcher(None, [t['normalized'] for t in lexical],
                                      [t['normalized'] for t in flattened], autojunk=False)
    for tag, a, b, c, _ in matcher.get_opcodes():
        if tag == 'equal':
            for offset in range(b - a):
                mapping[a + offset] = flattened[c + offset]['time']
    return lexical, mapping


def estimated_window(mapping, begin, end, duration, padding=.8):
    present = [time for time in mapping[begin:end] if time is not None]
    before = next((mapping[i] for i in range(begin - 1, -1, -1) if mapping[i] is not None), None)
    after = next((mapping[i] for i in range(end, len(mapping)) if mapping[i] is not None), None)
    if present:
        low, high = min(t[0] for t in present), max(t[1] for t in present)
        method = 'recognized-word-times'
    elif before is not None or after is not None:
        low = before[1] if before is not None else 0
        high = after[0] if after is not None else duration
        low, high = min(low, high), max(low, high)
        method = 'neighbor-anchors'
    else:
        return None
    return dict(start=round(max(0, low - padding), 3), end=round(min(duration, high + padding), 3),
                method=method, approximate=True, automaticCutAllowed=False,
                precedingAnchor=before, followingAnchor=after)


def sentence_spans(text):
    spans = []
    for match in SENTENCE.finditer(text):
        raw = match.group()
        start = match.start() + len(raw) - len(raw.lstrip())
        end = match.end() - len(raw) + len(raw.rstrip())
        if tokens(text[start:end]):
            spans.append(dict(start=start, end=end, text=text[start:end]))
    return spans


def priority(expected, recognized, tag):
    if ''.join(expected) == ''.join(recognized):
        return 3, 'word-boundary-or-spelling'
    # Hungarian lly represents a long /jː/; retain that length when comparing
    # alternative spellings. A simple ly→j would incorrectly turn lly into lj.
    equivalent = lambda value: value.replace('lly', 'jj').replace('ly', 'j')
    if equivalent(''.join(expected)) == equivalent(''.join(recognized)):
        return 3, 'possible-ly-j-spelling'
    if (tag in ('delete', 'insert') and max(len(expected), len(recognized)) >= 3):
        return 1, 'possible-missing-or-extra-passage'
    if len(expected) == len(recognized) == 1:
        return 1, 'word-or-pronunciation-difference'
    return 2, 'word-difference'


def review_story(clip, story, row):
    story = {**story, **{key: clip[key] for key in ('title', 'sha256', 'duration') if key in clip}}
    text = clip['text']
    result = dict(id=clip['id'], title=story.get('title') or clip.get('title') or clip['id'],
                  originalText=text, sourceTextSha256=digest(text), file=clip.get('file'),
                  sourceSha256=story.get('sha256'), pronunciationVerified=False,
                  differences=[], sentenceCandidates=[], wordCandidates=[])
    if row is None:
        result.update(status='pending', shaBinding='not-transcribed')
        return result
    result.update(audioSha256=row.get('audioSha256'), audioCopy=row.get('audioCopy'),
                  userRejections=row.get('userRejections', []),
                  textChangedSinceTranscription=row.get('expected') != text)
    binding = ('matches-manifest' if story.get('sha256') and row.get('audioSha256') == story['sha256']
               else 'source-sha-mismatch' if story.get('sha256') else 'manifest-sha-missing')
    result['shaBinding'] = binding
    if row.get('status') == 'error' or 'transcription' not in row:
        result.update(status='error', error=row.get('error', 'Nincs kész átirat.'))
        return result
    transcription = row['transcription']
    recognized = transcription.get('text', row.get('recognized', ''))
    duration = transcription.get('duration', story.get('duration'))
    if not finite(duration) or duration <= 0:
        result.update(status='error', error='Hiányzó vagy hibás hanghossz.')
        return result
    result.update(status='review-required', recognized=recognized, duration=duration,
                  repairEligible=binding == 'matches-manifest')
    expected = tokens(text)
    heard, times = timed_tokens(recognized, transcription.get('words', []), duration)
    matcher = difflib.SequenceMatcher(None, [t['normalized'] for t in expected],
                                      [t['normalized'] for t in heard], autojunk=False)
    expected_times = [None] * len(expected)
    spans = sentence_spans(text)
    opcodes = matcher.get_opcodes()
    for tag, a, b, c, d in opcodes:
        if tag == 'equal':
            for offset in range(b - a):
                expected_times[a + offset] = times[c + offset]
            continue
        left, right = [t['normalized'] for t in expected[a:b]], [t['normalized'] for t in heard[c:d]]
        rank, category = priority(left, right, tag)
        if result['userRejections']:
            rank = 0
        char_start = expected[a]['start'] if a < len(expected) else len(text)
        char_end = expected[b - 1]['end'] if b > a else char_start
        sentence_ids = [i for i, span in enumerate(spans)
                        if (span['start'] < char_end and span['end'] > char_start)
                        or (char_start == char_end and span['start'] <= char_start < span['end'])]
        if not sentence_ids and spans:
            sentence_ids = [len(spans) - 1]
        difference = dict(id=f"{clip['id']}-difference-{len(result['differences']) + 1}", kind=tag,
                          priority=rank, category=category,
                          expected=text[char_start:char_end],
                          recognized=recognized[heard[c]['start']:heard[d - 1]['end']] if d > c else '',
                          expectedTokens=left, recognizedTokens=right,
                          expectedTokenRange=[a, b], recognizedTokenRange=[c, d],
                          sourceCharacterRange=[char_start, char_end], sentenceIndexes=sentence_ids,
                          sentenceContext=[spans[i]['text'] for i in sentence_ids],
                          estimatedWindow=estimated_window(times, c, d, duration),
                          sourceSha256=row.get('audioSha256'), pronunciationVerified=False)
        result['differences'].append(difference)
        if len(left) <= 1 and len(right) <= 1 and rank < 3:
            result['wordCandidates'].append(dict(differenceId=difference['id'], originalText=difference['expected'],
                sourceCharacterRange=[char_start, char_end], sourceSha256=row.get('audioSha256'),
                sourceTextSha256=digest(text), repairEligible=binding == 'matches-manifest', pronunciationVerified=False,
                estimatedWindow=difference['estimatedWindow'], status='requires-listening',
                phoneticPreparationRequired=True, automaticCutAllowed=False))
    for index, sentence in enumerate(spans):
        related = [d for d in result['differences'] if index in d['sentenceIndexes']]
        if not related:
            continue
        token_indexes = [i for i, token in enumerate(expected)
                         if sentence['start'] <= token['start'] < sentence['end']]
        window = estimated_window(expected_times, token_indexes[0], token_indexes[-1] + 1, duration) if token_indexes else None
        related_windows = [d['estimatedWindow'] for d in related if d['estimatedWindow']]
        if related_windows:
            windows = related_windows + ([window] if window else [])
            window = dict(start=min(w['start'] for w in windows), end=max(w['end'] for w in windows),
                          approximate=True, automaticCutAllowed=False, method='sentence-and-difference-anchors')
        result['sentenceCandidates'].append(dict(id=f"{clip['id']}-sentence-{index + 1}",
            originalText=sentence['text'], sourceCharacterRange=[sentence['start'], sentence['end']],
            sourceTextSha256=digest(text), sourceSha256=row.get('audioSha256'),
            differenceIds=[d['id'] for d in related], priority=min(d['priority'] for d in related),
            estimatedWindow=window, status='requires-listening', repairEligible=binding == 'matches-manifest',
            phoneticPreparationRequired=True, pronunciationVerified=False, automaticCutAllowed=False))
    result['differences'].sort(key=lambda d: (d['priority'], d['expectedTokenRange'][0]))
    result['sentenceCandidates'].sort(key=lambda s: (s['priority'], s['sourceCharacterRange'][0]))
    result['priorityCounts'] = dict(Counter(str(d['priority']) for d in result['differences']))
    if not result['differences']:
        result['status'] = 'transcript-match-unverified'
    if binding != 'matches-manifest':
        result['status'] = 'stale-source-sha'
    if result['userRejections']:
        result['status'] = 'known-rejected'
    return result


def build_review(manifest, audit):
    ids = [c['id'] for c in manifest['clips']]
    if len(set(ids)) != len(ids):
        raise ValueError('Ismétlődő meseazonosító a jegyzékben.')
    rows = {row['id']: row for row in audit.get('clips', [])}
    metadata = {story['id']: story for story in manifest.get('stories', [])}
    stories = [review_story(clip, metadata.get(clip['id'], {}), rows.get(clip['id'])) for clip in manifest['clips']]
    completed = sum(s['status'] not in ('pending', 'error') for s in stories)
    errors = sum(s['status'] == 'error' for s in stories)
    return dict(version=1, limitation=LIMITATION, engine=audit.get('engine'),
                coverage=dict(total=len(stories), completed=completed, errors=errors,
                              pending=len(stories) - completed - errors,
                              complete=completed == len(stories)),
                unexpectedReportedIds=sorted(set(rows) - set(ids)),
                pronunciationVerified=False, stories=stories)


def render_html(review, audit_dir, output_dir):
    audit_dir, output_dir = Path(audit_dir).resolve(), Path(output_dir).resolve()
    escape = lambda value: html.escape(str(value), quote=True)
    labels = {'pending': 'Még feldolgozás alatt', 'error': 'Feldolgozási hiba',
              'review-required': 'Meghallgatandó eltérések', 'known-rejected': 'Felhasználó által elutasított hang',
              'stale-source-sha': 'Eltérő vagy hiányzó forrásellenőrzőösszeg',
              'transcript-match-unverified': 'Egyező átirat; kiejtés nem igazolt'}
    def button(window, audio_id, label='▶ Meghallgatás'):
        if window is None:
            return '<span>Nincs megbízható időhorgony.</span>'
        return (f'<button type="button" data-audio="{audio_id}" data-start="{window["start"]}" '
                f'data-end="{window["end"]}">{escape(label)} · {window["start"]:.1f}–{window["end"]:.1f} mp</button>')
    blocks = []
    navigation = []
    for index, story in enumerate(review['stories']):
        audio_id = f'audio-{index}'
        navigation.append(f'<a data-story="story-{index}" href="#story-{index}">{escape(story["title"])}</a>')
        audio = ''
        if story.get('audioCopy'):
            source = (audit_dir / story['audioCopy']).resolve()
            if source.is_relative_to(audit_dir.resolve()) and source.is_file():
                url = quote(os.path.relpath(source, output_dir), safe='/')
                audio = f'<audio id="{audio_id}" controls preload="none" src="{escape(url)}"></audio>'
        differences = []
        for diff in story['differences']:
            differences.append(f'<div class="difference" data-priority="{diff["priority"]}"><p><strong>P{diff["priority"]}</strong> '
                f'<del>{escape(diff["expected"] or "∅")}</del> → <ins>{escape(diff["recognized"] or "∅")}</ins></p>'
                f'<p>{escape(" ".join(diff["sentenceContext"]))}</p>'
                + (button(diff['estimatedWindow'], audio_id) if audio else '<p>A helyi hangmásolat nem érhető el.</p>') + '</div>')
        sentences = []
        for candidate in story['sentenceCandidates']:
            sentences.append(f'<div class="sentence" data-priority="{candidate["priority"]}"><p>' + escape(candidate['originalText']) + '</p>'
                + (button(candidate['estimatedWindow'], audio_id, '▶ Teljes mondat környéke') if audio else '')
                + '<p>Javítási jelölt; előbb meghallgatás és fonetikus előkészítés szükséges.</p></div>')
        reasons = ''.join('<p>' + escape(r.get('reason', 'Elutasított hang.')) + '</p>' for r in story.get('userRejections', []))
        important = sum(d['priority'] <= 2 for d in story['differences'])
        search = story['title'] + ' ' + story['id']
        blocks.append(f'<details class="story" id="story-{index}" data-search="{escape(search)}">'
            f'<summary><strong>{escape(story["title"])}</strong><span>{important} P0–P2 · '
            f'{len(story["differences"])} összes eltérés</span><small>{escape(labels[story["status"]])}</small></summary><section>{audio}'
            f'<p class="playback-error" role="status" aria-live="polite"></p>'
            f'<p class="meta">{escape(story["id"])} · SHA: {escape(story.get("audioSha256") or "még nincs")}</p>'
            + (f'<aside class="warning"><strong>Felhasználói elutasítás</strong>{reasons}</aside>' if reasons else '')
            + ('<p class="warning">A forrásellenőrzőösszeg nem egyezik: a javítási jelöltekhez friss átirat szükséges.</p>' if story.get('shaBinding') not in ('matches-manifest', 'not-transcribed') else '')
            + (f'<p>{escape(story["error"])}</p>' if story.get('error') else '')
            + '<p class="no-priority" hidden>A kiválasztott szűrővel nincs eltérés.</p>'
            + ''.join(differences)
            + (f'<details><summary>Mondatjavítási jelöltek ({len(sentences)})</summary>{"".join(sentences)}</details>' if sentences else '')
            + '</section></details>')
    coverage = review['coverage']
    heading = (f'{coverage["completed"]}/{coverage["total"]} kész · {coverage["pending"]} folyamatban '
               f'· {coverage["errors"]} hiba · ' + ('Teljes feldolgozás' if coverage['complete'] else 'Részleges feldolgozás'))
    return ('<!doctype html><html lang="hu"><meta charset="utf-8">'
        '<meta name="viewport" content="width=device-width,initial-scale=1"><title>Mesefelolvasások ellenőrzése</title>'
        '<style>body{font:17px system-ui;line-height:1.5;max-width:1000px;margin:24px auto;padding:0 16px;background:#f7f9fc;color:#172534}'
        '.story{border:1px solid #cdd7e2;border-radius:12px;margin:12px 0;background:white}.story>summary{padding:16px}'
        '.story>summary>span,.story>summary>small{display:block;margin-left:22px;color:#46596a}'
        '.story section{padding:0 16px 16px}audio{width:100%}.difference,.sentence{margin:16px 0;padding:12px;background:#f2f5f8;border-radius:8px}'
        'button,input,select{font:inherit;min-height:44px;padding:8px 12px;border:1px solid #879aad;border-radius:7px;max-width:100%;box-sizing:border-box}'
        'button{cursor:pointer;background:#e4efff;color:#103f77}.filters{display:flex;flex-wrap:wrap;gap:14px;margin:20px 0}'
        '.filters label{display:flex;flex-direction:column;gap:6px;flex:1;min-width:230px}'
        'nav{display:flex;flex-wrap:wrap;gap:8px 18px;padding:12px}nav a{min-height:35px;display:inline-block}'
        '.warning,.playback-error{color:#8a3000}.warning{background:#fff1de;padding:12px}.playback-error:empty{display:none}'
        '[hidden]{display:none!important}'
        'del{color:#923100}ins{color:#075b36}.meta{font-size:12px;overflow-wrap:anywhere}'
        'p{overflow-wrap:anywhere}summary{cursor:pointer;min-height:44px}</style>'
        '<h1>Mesefelolvasások ellenőrzése</h1><p>' + escape(heading) + '</p><p>' + escape(LIMITATION)
        + '</p><p>P0: korábban elutasított hang; P1: szóhangzás vagy hosszabb hiány/többlet; '
          'P2: egyéb szóeltérés; P3: lehetséges szóhatár vagy íráskép. Minden jelzés ellenőrizendő.</p>'
        + '<div class="filters"><label>Mesecím vagy azonosító<input id="story-search" type="search" placeholder="Keresés a mesék között"></label>'
          '<label>Eltérések<select id="priority-filter"><option value="2">Elsőként: P0–P2</option><option value="3">Minden eltérés, P3 is</option></select></label></div>'
          '<p id="filter-status" role="status"></p>'
        + '<details><summary>Ugrás egy meséhez</summary><nav>' + ''.join(navigation) + '</nav></details>'
        + ''.join(blocks) + '''<script>
let activeAudio = null;
let playRequest = 0;
const tracks = [...document.querySelectorAll('audio')];
const stories = [...document.querySelectorAll('.story')];
function filterStories() {
  const query = document.getElementById('story-search').value.toLocaleLowerCase('hu-HU');
  const maxPriority = Number(document.getElementById('priority-filter').value);
  let visibleDifferences = 0;
  let visibleStories = 0;
  stories.forEach(story => {
    story.hidden = !story.dataset.search.toLocaleLowerCase('hu-HU').includes(query);
    document.querySelector(`a[data-story="${story.id}"]`).hidden = story.hidden;
    let count = 0;
    story.querySelectorAll('[data-priority]').forEach(item => {
      item.hidden = Number(item.dataset.priority) > maxPriority;
      if (!item.hidden && item.classList.contains('difference')) count++;
    });
    story.querySelector('.no-priority').hidden = count !== 0;
    if (!story.hidden) { visibleDifferences += count; visibleStories++; }
  });
  document.getElementById('filter-status').textContent = `${visibleStories} mese · ${visibleDifferences} eltérés a szűrő szerint.`;
}
document.getElementById('story-search').addEventListener('input', filterStories);
document.getElementById('priority-filter').addEventListener('change', filterStories);
filterStories();
document.addEventListener('click', event => {
  const link = event.target.closest('a[data-story]');
  if (link) document.getElementById(link.dataset.story).open = true;
  const button = event.target.closest('button[data-audio]');
  if (!button) return;
  const audio = document.getElementById(button.dataset.audio);
  if (!audio) return;
  if (activeAudio) { activeAudio.pause(); delete activeAudio.dataset.stop; }
  activeAudio = audio;
  const request = ++playRequest;
  const error = audio.closest('.story').querySelector('.playback-error');
  error.textContent = '';
  audio.dataset.stop = button.dataset.end;
  const seek = () => { if (request !== playRequest) return;
    try { audio.currentTime = Number(button.dataset.start); }
    catch (problem) { error.textContent = 'Az időpontra ugrás nem sikerült: ' + problem.message; }
  };
  if (audio.readyState >= 1) seek();
  else audio.addEventListener('loadedmetadata', seek, { once: true });
  // Safari requires this call during the original user gesture, before metadata loads.
  try {
    const playing = audio.play();
    if (playing) playing.catch(problem => {
      if (request === playRequest) error.textContent = 'A lejátszás nem indult: ' + problem.message + '. Használd a hang natív lejátszógombját.';
    });
  } catch (problem) { error.textContent = 'A lejátszás nem indult: ' + problem.message; }
});
tracks.forEach(audio => {
audio.addEventListener('play', () => {
  tracks.forEach(other => { if (other !== audio) { other.pause(); delete other.dataset.stop; } });
  if (activeAudio !== audio) { ++playRequest; activeAudio = audio; }
});
audio.addEventListener('timeupdate', () => {
  if (audio.dataset.stop && audio.currentTime >= Number(audio.dataset.stop)) {
    audio.pause(); delete audio.dataset.stop;
  }
});
});
</script></html>''')


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--audit', type=Path, required=True, help='A meglévő ASR report.json fájl')
    parser.add_argument('--manifest', type=Path, required=True, help='A legfrissebb eredeti meseszövegek és címek')
    parser.add_argument('--output', type=Path, help='Külön célkönyvtár; alapérték az audit könyvtára')
    args = parser.parse_args()
    output = (args.output or args.audit.parent).resolve()
    output.mkdir(parents=True, exist_ok=True)
    review = build_review(read_json(args.manifest), read_json(args.audit))
    review.update(manifestFile=str(args.manifest.resolve()), auditFile=str(args.audit.resolve()))
    # Separate filenames leave the running transcription and its incremental report intact.
    (output / 'listening-review.json').write_text(json.dumps(review, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    (output / 'listening-review.html').write_text(render_html(review, args.audit.parent.resolve(), output), encoding='utf-8')
    print(json.dumps(dict(coverage=review['coverage'], differences=sum(len(s['differences']) for s in review['stories']),
                          output=str(output / 'listening-review.html')), ensure_ascii=False))


if __name__ == '__main__':
    main()
