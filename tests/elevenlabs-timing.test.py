"""Offline regression checks for subtitle and action retiming; no paid requests."""
import bisect
import copy
import importlib.util
import json
import re
import sys
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))
spec = importlib.util.spec_from_file_location("elevenlabs_timing", ROOT / "scripts/align-elevenlabs-audiobooks.py")
timing = importlib.util.module_from_spec(spec)
spec.loader.exec_module(timing)


def alignment(text):
    return {"characters": list(text),
            "character_start_times_seconds": [i * .01 for i in range(len(text))],
            "character_end_times_seconds": [(i + 1) * .01 for i in range(len(text))]}


def mapped(points, seconds):
    index = max(0, min(len(points) - 2, bisect.bisect_right([point[0] for point in points], seconds) - 1))
    left, right = points[index:index + 2]
    return left[1] + (seconds - left[0]) / (right[0] - left[0]) * (right[1] - left[1])


class AlignmentTest(unittest.TestCase):
    def test_full_catalog_keeps_each_paragraph_and_spoken_action_anchor(self):
        catalog = json.loads((ROOT / "content/stories/catalog.json").read_text())["stories"]
        for entry in catalog:
            with self.subTest(story=entry["id"]):
                body = re.sub(r"^#{1,6}\s+", "", (ROOT / "content/stories" / entry["file"]).read_text().replace("**", ""), flags=re.M).strip()
                spoken = entry["title"] + ".\n\n" + body
                staged = {"id": entry["id"], "title": entry["title"], "text": body, "spokenText": spoken,
                          "duration": len(spoken) * .01 + .1, "alignment": alignment(spoken)}
                if entry.get('illustrated') is False or entry.get('visualClock') == 'recording':
                    cues = timing.transform_audio_only(staged, illustrated=entry.get('illustrated') is not False)
                    self.assertEqual(cues['illustrated'], entry.get('illustrated') is not False)
                    self.assertNotIn('warp', cues)
                    self.assertEqual([cue['text'] for cue in cues['paragraphs']], [line for line in body.split('\n') if line.strip()])
                    self.assertTrue(cues['alignment']['exactInput'])
                    continue
                original = json.loads((ROOT / "content/stories/visual-timing" / f"{entry['id']}.json").read_text())
                cues, warp = timing.transform(staged, original)
                self.assertTrue(cues["alignment"]["exactInput"])
                self.assertEqual(cues["alignment"]["originalWordCoverage"], 1)
                self.assertEqual([cue["text"] for cue in cues["paragraphs"]], body.split("\n"))
                self.assertEqual(warp["points"][0], [0, 0])
                self.assertEqual(warp["points"][-1], [staged["duration"], original["duration"]])
                for old, new in zip(original["words"][1:], cues["words"][1:]):
                    self.assertAlmostEqual(mapped(warp["points"], new["time"]), old["time"], places=5)

    def test_raw_source_alignment_wins_over_rewritten_numbers(self):
        text = "One 12 wheels."
        staged = {"spokenText": text, "duration": 10, "alignment": alignment(text),
                  "normalized_alignment": alignment("One twelve wheels.")}
        words, indices, info = timing.select_alignment(staged)
        self.assertEqual(info["source"], "alignment")
        self.assertEqual(words[indices[1]]["text"], "12")

    def test_short_poem_keeps_stanza_breaks_without_requiring_an_old_visual_timeline(self):
        body = 'Első sor.\nMásodik sor.\n\nHarmadik sor.'
        spoken = 'Vers.\n\n' + body
        staged = {'id': 'short-poem', 'title': 'Vers', 'text': body, 'spokenText': spoken,
                  'duration': 12, 'alignment': alignment(spoken)}
        cues = timing.transform_audio_only(staged)
        self.assertEqual(cues['duration'], 12)
        self.assertEqual([cue['index'] for cue in cues['paragraphs']], [0, 1, 3])
        self.assertEqual([cue['text'] for cue in cues['paragraphs']], ['Első sor.', 'Második sor.', 'Harmadik sor.'])
        self.assertNotIn('warp', cues)

    def test_missing_words_are_rejected(self):
        staged = {"spokenText": "One two three four five six seven eight nine ten.",
                  "duration": 10, "alignment": alignment("One two.")}
        with self.assertRaisesRegex(ValueError, "covers only"):
            timing.select_alignment(staged)

    def test_extra_duplicate_spoken_words_are_rejected(self):
        staged = {"spokenText": "One two three four five six seven eight nine ten.",
                  "duration": 10, "normalized_alignment": alignment("One two two two three four five six seven eight nine ten.")}
        with self.assertRaisesRegex(ValueError, "covers only"):
            timing.select_alignment(staged)

    def test_backwards_character_clock_is_rejected(self):
        data = alignment("One two")
        data["character_start_times_seconds"][4] = .001
        with self.assertRaisesRegex(ValueError, "runs backwards"):
            timing.alignment_words(data, 10)

    def test_short_punctuation_tail_is_clamped_but_major_mismatch_is_rejected(self):
        data = alignment("One.")
        data["character_end_times_seconds"][-1] = .24
        _, words = timing.alignment_words(data, .08)
        self.assertEqual(words[0]["time"] + words[0]["duration"], .03)
        data["character_end_times_seconds"][-1] = 1.24
        with self.assertRaisesRegex(ValueError, "exceeds MP3 duration"):
            timing.alignment_words(data, .08)

    def test_only_verified_final_word_can_explain_small_lexical_tail_drift(self):
        data = alignment("One two.")
        verified = {"finalWord": "two", "maxLexicalDrift": .2}
        with self.assertRaisesRegex(ValueError, "Spoken character starts after"):
            timing.alignment_words(data, .058)
        _, words = timing.alignment_words(data, .058, verified)
        self.assertAlmostEqual(words[-1]["time"] + words[-1]["duration"], .058)
        with self.assertRaisesRegex(ValueError, "Spoken character starts after"):
            timing.alignment_words(data, .038, verified)
        with self.assertRaisesRegex(ValueError, "Spoken character starts after"):
            timing.alignment_words(data, .058, {**verified, "finalWord": "three"})
        with self.assertRaisesRegex(ValueError, "Spoken character starts after"):
            timing.alignment_words(alignment("One two three."), .058, {**verified, "finalWord": "three"})

    def test_verified_final_word_drift_cannot_exceed_point_two_seconds(self):
        data = alignment("One two.")
        data["character_start_times_seconds"][6:] = [.2, .4]
        data["character_end_times_seconds"][6:] = [.4, .45]
        with self.assertRaisesRegex(ValueError, "Spoken character starts after"):
            timing.alignment_words(data, .058, {"finalWord": "two", "maxLexicalDrift": 2})

    def test_changed_paragraphs_cannot_silently_replace_captions(self):
        original = {"id": "example", "title": "Test", "duration": 3,
                    "words": [{"text": "Test", "time": .1, "duration": .3},
                              {"text": "One", "time": .5, "duration": .3},
                              {"text": "two", "time": 1, "duration": .3}],
                    "paragraphs": [{"index": 0, "text": "One two.", "time": .5}]}
        staged = {"id": "example", "title": "Test", "text": "One two!", "spokenText": "Test.\n\nOne two!",
                  "duration": 2, "alignment": alignment("Test.\n\nOne two!")}
        with self.assertRaisesRegex(ValueError, "Changed paragraph"):
            timing.transform(staged, copy.deepcopy(original))


if __name__ == "__main__":
    unittest.main()
