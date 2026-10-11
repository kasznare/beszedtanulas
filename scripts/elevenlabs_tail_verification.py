"""Validate local ASR evidence for a bounded final-word timestamp correction.

Evidence permits at most 200 ms of provider timing drift for the source's final
lexical token. It never permits missing words or relaxes earlier audio timings.
"""
import hashlib
import json
import math
import re
from pathlib import Path

WORD = re.compile(r"\w+(?:[-’']\w+)*", re.UNICODE)


def require(condition, message):
    if not condition:
        raise RuntimeError(f'Invalid final-word verification: {message}')


def finite(value):
    return isinstance(value, (int, float)) and not isinstance(value, bool) and math.isfinite(value)


def words(value):
    return [match.group().casefold() for match in WORD.finditer(value)]


def close(left, right):
    return finite(left) and finite(right) and abs(left - right) <= .000001


def verify_tail(meta, stage):
    """Return validated source character offsets, or None when no evidence exists."""
    evidence = meta.get('tailVerification')
    if evidence is None:
        return None
    require(isinstance(evidence, dict), 'evidence must be an object')
    require(evidence.get('method') == 'local-whisper', 'unsupported evidence method')
    require(evidence.get('model') == 'whisper-base', 'unsupported local ASR model')
    require(evidence.get('language') == 'hu' == meta.get('languageCode'), 'evidence language mismatch')
    identifier = meta.get('id')
    require(isinstance(identifier, str) and re.fullmatch(r'story-\d+', identifier), 'invalid story ID')
    stage = Path(stage).resolve()
    audio_path = stage / f'{identifier}.mp3'
    audio_sha = hashlib.sha256(audio_path.read_bytes()).hexdigest()
    require(evidence.get('audioSha256') == meta.get('sha256') == audio_sha, 'audio SHA mismatch')
    relative = evidence.get('transcriptFile')
    require(isinstance(relative, str) and relative, 'missing transcript path')
    relative = Path(relative)
    require(not relative.is_absolute() and '..' not in relative.parts, 'unsafe transcript path')
    path = (stage / relative).resolve()
    require(path.is_relative_to(stage) and path.suffix == '.json', 'transcript escapes staging')
    raw = path.read_bytes()
    require(hashlib.sha256(raw).hexdigest() == evidence.get('transcriptSha256'), 'transcript SHA mismatch')
    transcript = json.loads(raw)
    require(transcript.get('model') == evidence['model'] and transcript.get('language') == evidence['language'],
        'transcript model/language mismatch')
    duration = meta.get('duration')
    clip_start, clip_duration = evidence.get('clipStart'), evidence.get('clipDuration')
    require(finite(duration) and duration > 0 and finite(clip_start) and finite(clip_duration)
        and clip_start >= 0 and clip_duration > 0 and abs(clip_start + clip_duration - duration) <= .002,
        'verified clip does not end at the complete recording')
    tokens = list(WORD.finditer(meta.get('spokenText', '')))
    require(bool(tokens), 'source has no lexical words')
    final = tokens[-1]
    final_word = final.group().casefold()
    require(evidence.get('finalWord') == final_word, 'verified word is not the source final word')
    segments = transcript.get('segments')
    require(isinstance(segments, list) and bool(segments), 'missing ASR segments')
    recognized = [word for segment in segments for word in segment.get('words', [])]
    require(bool(recognized), 'missing ASR word timestamps')
    last = recognized[-1]
    require(words(last.get('word', '')) == [final_word], 'ASR final word differs from source')
    probability = last.get('probability')
    require(finite(probability) and .8 <= probability <= 1
        and close(probability, evidence.get('finalWordProbability')), 'insufficient or mismatched ASR confidence')
    start, end = last.get('start'), last.get('end')
    require(finite(start) and finite(end) and 0 <= start < end <= clip_duration
        and close(clip_start + start, evidence.get('finalWordStart'))
        and close(clip_start + end, evidence.get('finalWordEnd')), 'ASR final-word interval mismatch')
    sentence = evidence.get('verifiedFinalSentence')
    require(isinstance(sentence, str) and bool(words(sentence)), 'missing verified closing sentence')
    sentence_words = words(sentence)
    source_words = [token.group().casefold() for token in tokens]
    require(source_words[-len(sentence_words):] == sentence_words, 'verified sentence differs from source ending')
    require(words(segments[-1].get('text', '')) == sentence_words, 'verified sentence differs from ASR ending')
    return {'finalWord': final_word, 'sourceWordStart': final.start(), 'sourceWordEnd': final.end(),
        'maxLexicalDrift': .2, 'audioSha256': audio_sha}
