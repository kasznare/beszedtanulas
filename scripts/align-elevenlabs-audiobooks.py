"""Build caption cues and preserve SVG action anchors for fixed ElevenLabs MP3s.

This reads staged, already-generated `/with-timestamps` receipts. It never calls
the speech service or touches the original audio. Use the unmodified Noémi word
timings as the visual clock; the output maps the new MP3 clock onto that clock.

Run after generation:
  python3 scripts/align-elevenlabs-audiobooks.py
  python3 scripts/align-elevenlabs-audiobooks.py --module story-playback-maps.js
"""

import argparse
import bisect
import difflib
import json
import math
import re
import unicodedata
from pathlib import Path

from elevenlabs_tail_verification import verify_tail


ROOT = Path(__file__).resolve().parents[1]


def normalize(text):
    return re.sub(r"[^\w-]", "", unicodedata.normalize("NFC", text)).lower()


def tokens(text):
    """Match Edge WordBoundary tokens, retaining source character positions."""
    result = []
    for match in re.finditer(r"\S+", text):
        if not normalize(match.group()):
            continue
        lexical = [i for i, char in enumerate(match.group()) if re.match(r"[\w-]", char)]
        result.append({
            "text": match.group(),
            "normalized": normalize(match.group()),
            "start": match.start() + lexical[0],
            "end": match.start() + lexical[-1] + 1,
        })
    return result


def matching_indices(left, right):
    matcher = difflib.SequenceMatcher(None, left, right, autojunk=False)
    return {block.a + i: block.b + i for block in matcher.get_matching_blocks() for i in range(block.size)}


def alignment_words(alignment, duration, verified_tail=None):
    chars = alignment.get("characters", [])
    starts = alignment.get("character_start_times_seconds", [])
    ends = alignment.get("character_end_times_seconds", [])
    if not chars or len(chars) != len(starts) or len(chars) != len(ends):
        raise ValueError("Missing or inconsistent character alignment arrays")
    if any(not isinstance(char, str) or len(char) != 1 for char in chars):
        raise ValueError("Expected one Unicode character per alignment entry")
    text = "".join(chars)
    final_token = tokens(text)[-1] if tokens(text) else None

    def verified_final_character(index):
        if not verified_tail or not final_token:
            return False
        if final_token["normalized"] != normalize(verified_tail["finalWord"]):
            return False
        if not final_token["start"] <= index < final_token["end"]:
            return False
        # A verified ending can explain late character timestamps within the
        # word, never an entire missing word starting after the audio has ended.
        if starts[final_token["start"]] >= duration:
            return False
        allowed = min(.2, verified_tail["maxLexicalDrift"])
        return max(ends[final_token["start"]:final_token["end"]]) <= duration + allowed

    for i, (start, end) in enumerate(zip(starts, ends)):
        if not isinstance(start, (int, float)) or not isinstance(end, (int, float)):
            raise ValueError(f"Non-numeric character timing at {i}")
        if not math.isfinite(start) or not math.isfinite(end) or start < 0 or end < start:
            raise ValueError(f"Invalid character timing at {i}")
        # The service can attach a short punctuation tail beyond the MP3's
        # decoded duration. Bound that known rounding discrepancy, then clip it.
        if end > duration + .5:
            raise ValueError(f"Character timing exceeds MP3 duration at {i}")
        if re.match(r"\w", chars[i]) and start >= duration and not verified_final_character(i):
            raise ValueError(f"Spoken character starts after the MP3 ends at {i}")
        if i and start < starts[i - 1] - .000001:
            raise ValueError(f"Character alignment runs backwards at {i}")
    starts = [min(duration, value) for value in starts]
    ends = [min(duration, value) for value in ends]
    words = []
    for token in tokens(text):
        start, end = starts[token["start"]], ends[token["end"] - 1]
        words.append({
            "text": token["text"],
            "time": start,
            "duration": max(0, end - start),
        })
    if not words or sum(word["duration"] > 0 for word in words) < len(words) * .95:
        raise ValueError("Incomplete spoken-word alignment")
    return text, words


def select_alignment(staged, verified_tail=None):
    """Raw alignment preserves input digits; normalized alignment may spell them."""
    expected = staged["spokenText"]
    source_tokens = [token["normalized"] for token in tokens(expected)]
    if not source_tokens:
        raise ValueError("Spoken input contains no words")
    candidates, errors = [], []
    for key in ("alignment", "normalized_alignment"):
        alignment = staged.get(key)
        if not alignment:
            continue
        try:
            text, words = alignment_words(alignment, staged["duration"], verified_tail)
            indices = matching_indices(source_tokens, [normalize(word["text"]) for word in words])
            coverage = min(len(indices) / len(source_tokens), len(indices) / len(words))
            candidates.append((text == expected, coverage, key, words, indices))
        except ValueError as error:
            errors.append(f"{key}: {error}")
    if not candidates:
        raise ValueError("No valid alignment: " + "; ".join(errors))
    exact, coverage, key, words, indices = max(candidates, key=lambda item: (item[0], item[1]))
    if coverage < .97:
        raise ValueError(f"Alignment covers only {coverage:.1%} of input words")
    tail = max(0, max(staged[key]["character_end_times_seconds"]) - staged["duration"])
    info = {"source": key, "exactInput": exact,
            "sourceWordCoverage": round(len(indices) / len(source_tokens), 6),
            "spokenWordCoverage": round(len(indices) / len(words), 6),
            "tailClampedSeconds": round(tail, 6)}
    if verified_tail:
        final = tokens("".join(staged[key]["characters"]))[-1]
        lexical_end = max(staged[key]["character_end_times_seconds"][final["start"]:final["end"]])
        info["verifiedTail"] = {"audioSha256": verified_tail["audioSha256"],
                                "transcriptSha256": staged["tailVerification"]["transcriptSha256"],
                                "finalWord": verified_tail["finalWord"],
                                "maxLexicalDriftSeconds": min(.2, verified_tail["maxLexicalDrift"]),
                                "appliedLexicalDriftSeconds": round(max(0, lexical_end - staged["duration"]), 6)}
    return words, indices, info


def paragraph_cues(staged, source_to_spoken, words, original):
    source_words = tokens(staged["spokenText"])
    word_starts = [word["start"] for word in source_words]
    prefix = staged["title"] + ".\n\n"
    if staged["spokenText"] != prefix + staged["text"]:
        raise ValueError("Spoken text must contain the complete title and unchanged body")
    offset, paragraphs = len(prefix), []
    old_paragraphs = original["paragraphs"]
    for line in staged["text"].splitlines(keepends=True):
        text = line.rstrip("\r\n")
        if text.strip():
            if len(paragraphs) >= len(old_paragraphs):
                raise ValueError("More new paragraphs than original caption cues")
            old = old_paragraphs[len(paragraphs)]
            old_text = re.sub(r"^#{1,6}\s+", "", old["text"].replace("**", ""))
            if text != old_text:
                raise ValueError(f"Changed paragraph text at source line {old['index']}")
            index = bisect.bisect_left(word_starts, offset)
            if index >= len(source_words) or source_words[index]["start"] >= offset + len(text):
                raise ValueError(f"Paragraph contains no spoken words: {text[:80]}")
            if index not in source_to_spoken:
                raise ValueError(f"Paragraph opening was normalized beyond a reliable match: {text[:80]}")
            spoken_index = source_to_spoken[index]
            time = round(words[spoken_index]["time"], 3)
            if paragraphs and time <= paragraphs[-1]["time"]:
                raise ValueError("Paragraph cues must increase strictly")
            paragraphs.append({"index": old["index"], "time": time, "text": text,
                               "matched": 1, "wordIndex": spoken_index})
        offset += len(line)
    if len(paragraphs) != len(old_paragraphs):
        raise ValueError("Incomplete new paragraph cues")
    return paragraphs


def warp_points(original, words, duration):
    old_words = original["words"]
    old_to_new = matching_indices([normalize(word["text"]) for word in old_words],
                                  [normalize(word["text"]) for word in words])
    coverage = len(old_to_new) / len(old_words)
    if min(coverage, len(old_to_new) / len(words)) < .97:
        raise ValueError(f"New audio covers only {coverage:.1%} of original visual anchors")
    points = [[0.0, 0.0]]

    def append(new_time, old_time):
        new_time, old_time = round(new_time, 6), round(old_time, 6)
        if new_time <= points[-1][0] or old_time <= points[-1][1]:
            return
        if new_time >= duration or old_time >= original["duration"]:
            return
        points.append([new_time, old_time])

    for old_index, new_index in sorted(old_to_new.items()):
        old, new = old_words[old_index], words[new_index]
        append(new["time"], old["time"])
        # Word ends retain expressive pauses. Clip rounding overlaps with the next
        # word start so an end anchor cannot prevent that start from being exact.
        next_new = words[new_index + 1]["time"] if new_index + 1 < len(words) else duration
        next_old = old_words[old_index + 1]["time"] if old_index + 1 < len(old_words) else original["duration"]
        new_end = min(new["time"] + new["duration"], next_new)
        old_end = min(old["time"] + old["duration"], next_old)
        # A shared endpoint should be represented by the next word's start pair.
        if new_end < next_new - .000001 and old_end < next_old - .000001:
            append(new_end, old_end)
    points.append([duration, original["duration"]])
    if len(points) < len(old_words) * .9:
        raise ValueError("Too few monotonic visual clock anchors")
    if any(right[0] <= left[0] or right[1] <= left[1] for left, right in zip(points, points[1:])):
        raise ValueError("Visual clock mapping must increase strictly in both directions")
    return points, round(coverage, 6)


def transform(staged, original, verified_tail=None):
    if staged["id"] != original["id"] or staged["title"] != original["title"]:
        raise ValueError("Staged recording and original timing refer to different stories")
    duration = staged["duration"]
    if not isinstance(duration, (int, float)) or not math.isfinite(duration) or duration <= 0:
        raise ValueError("Invalid staged MP3 duration")
    words, source_to_spoken, alignment_info = select_alignment(staged, verified_tail)
    paragraphs = paragraph_cues(staged, source_to_spoken, words, original)
    points, old_coverage = warp_points(original, words, duration)
    warp = {"storyId": staged["id"], "duration": duration,
            "originalDuration": original["duration"], "points": points}
    timing = {"id": staged["id"], "title": staged["title"], "duration": duration,
              "words": [{**word, "time": round(word["time"], 3), "duration": round(word["duration"], 3)} for word in words],
              "paragraphs": paragraphs,
              "alignment": {**alignment_info, "originalWordCoverage": old_coverage},
              "warp": warp}
    return timing, warp


def transform_audio_only(staged, verified_tail=None, illustrated=False):
    """New recordings have no earlier animation clock to preserve."""
    words, source_to_spoken, alignment_info = select_alignment(staged, verified_tail)
    original = {'paragraphs': [{'index': index, 'text': text}
                             for index, text in enumerate(staged['text'].split('\n')) if text.strip()]}
    paragraphs = paragraph_cues(staged, source_to_spoken, words, original)
    return {'id': staged['id'], 'title': staged['title'], 'duration': staged['duration'],
            'words': [{**word, 'time': round(word['time'], 3), 'duration': round(word['duration'], 3)} for word in words],
            'paragraphs': paragraphs, 'alignment': alignment_info, 'illustrated': illustrated}


def write_json(path, data):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n")


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--source", type=Path, default=ROOT / "output/elevenlabs-audiobooks")
    parser.add_argument("--original", "--original-timing", dest="original", type=Path,
                        help="Original visual-clock word timings; defaults to the saved source timelines when available")
    parser.add_argument("--out", type=Path)
    parser.add_argument("--module", type=Path, help="Optional generated JS map; does not edit scene modules")
    parser.add_argument("--story", action="append", help="Only process this story ID; may be repeated")
    parser.add_argument("--allow-partial", action="store_true", help="Process the finished subset during parallel generation")
    args = parser.parse_args()
    if args.original is None:
        saved_source = ROOT / "content/stories/visual-timing"
        archived = ROOT / "output/elevenlabs-audiobooks/original-timing"
        args.original = (saved_source if saved_source.is_dir() else
                         archived if archived.is_dir() else ROOT / "output/story-timing")
    out = args.out or args.source / "timing"
    catalog = json.loads((ROOT / "content/stories/catalog.json").read_text())["stories"]
    catalog = [entry for entry in catalog if not entry['id'].startswith('rado-')]
    stories = [entry for entry in catalog if not args.story or entry["id"] in args.story]
    if args.story and len(stories) != len(set(args.story)):
        raise ValueError("Unknown story ID requested")
    transformed, maps = {}, {}
    for entry in stories:
        source = args.source / f"{entry['id']}.json"
        if args.allow_partial and not source.exists():
            continue
        staged = json.loads(source.read_text())
        verified_tail = verify_tail(staged, args.source)
        if entry.get('illustrated') is False or entry.get('visualClock') == 'recording':
            transformed[entry['id']] = transform_audio_only(staged, verified_tail, entry.get('illustrated') is not False)
        else:
            original = json.loads((args.original / source.name).read_text())
            timing, warp = transform(staged, original, verified_tail)
            transformed[entry["id"]], maps[entry["id"]] = timing, warp
    if not transformed:
        raise ValueError("No finished story alignments found")
    # Finish all validation before updating the output batch.
    for story_id, timing in transformed.items():
        write_json(out / f"{story_id}.json", timing)
        print(f"{story_id}: {len(timing['words'])} words, {len(timing['paragraphs'])} captions, "
              f"{len(timing.get('warp', {}).get('points', []))} clock anchors, {timing['duration']:.3f}s", flush=True)
    write_json(args.source / "warp.json", {"version": 1, "stories": maps})
    if args.module:
        args.module.parent.mkdir(parents=True, exist_ok=True)
        args.module.write_text("// Generated from the fixed recordings' word alignments.\n"
                               "export const STORY_PLAYBACK_MAPS = "
                               + json.dumps(maps, ensure_ascii=False, separators=(",", ":")) + ";\n")


if __name__ == "__main__":
    main()
