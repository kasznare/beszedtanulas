"""Local audiobook review consumes existing ASR only; no model or network needed."""
import importlib.util
import json
from pathlib import Path
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('audiobook_review', ROOT / 'scripts/review-audiobooks.py')
review = importlib.util.module_from_spec(spec)
spec.loader.exec_module(review)


def data(text, recognized, words=None, sha='source-sha'):
    clip = dict(id='story', text=text, title='Eredeti cím', sha256='source-sha', duration=20,
                file='audio/audiobooks/story.mp3')
    if words is None:
        words = [dict(text=token['text'], start=i, end=i + .5)
                 for i, token in enumerate(review.tokens(recognized))]
    row = dict(id='story', expected=text, recognized=recognized, audioSha256=sha, audioCopy='audio/source.mp3',
               status='transcript-difference', userRejections=[],
               transcription=dict(text=recognized, duration=20, words=words))
    return clip, row


class AudiobookReviewTests(unittest.TestCase):
    def test_hungarian_accents_and_geminates_stay_visible_and_prioritized(self):
        for expected, heard in [('széles', 'szeles'), ('elöl', 'elől'), ('földdel', 'földel'),
                                ('leguggolt', 'legugolt'), ('daru', 'darú')]:
            with self.subTest(expected=expected):
                clip, row = data(f'A {expected} látható.', f'A {heard} látható.')
                result = review.review_story(clip, {}, row)
                diff = result['differences'][0]
                self.assertEqual(diff['expected'], expected)
                self.assertEqual(diff['recognized'], heard)
                self.assertEqual(diff['priority'], 1)
                self.assertFalse(result['pronunciationVerified'])
                self.assertEqual(result['wordCandidates'][0]['sourceSha256'], 'source-sha')

    def test_unicode_composition_and_case_ignore_only_spelling_form(self):
        clip, row = data('Széles!', 'SZE\u0301LES.')
        result = review.review_story(clip, {}, row)
        self.assertEqual(result['differences'], [])
        self.assertEqual(result['status'], 'transcript-match-unverified')
        self.assertFalse(result['pronunciationVerified'])

    def test_spacing_and_ly_j_are_lower_priority_but_never_hidden(self):
        clip, row = data('Annipanni a király.', 'Anni Panni a kiráj.')
        result = review.review_story(clip, {}, row)
        self.assertEqual(len(result['differences']), 2)
        self.assertEqual([d['priority'] for d in result['differences']], [3, 3])
        self.assertEqual(len(result['sentenceCandidates']), 1)

    def test_ly_j_equivalence_preserves_doubled_digraph_length(self):
        for heard, expected_priority in [('süjjed', 3), ('süjed', 1), ('süljed', 1)]:
            with self.subTest(heard=heard):
                clip, row = data('süllyed', heard)
                difference = review.review_story(clip, {}, row)['differences'][0]
                self.assertEqual(difference['priority'], expected_priority)
                self.assertFalse(difference['pronunciationVerified'])

    def test_deleted_words_use_both_neighbor_anchors_and_original_sentence_context(self):
        clip, row = data('Maci földdel betakarja a gödröt. Utána pihen.',
                         'Maci betakarja a gödröt. Utána pihen.',
                         [dict(text='Maci', start=2, end=3), dict(text='betakarja', start=5, end=6),
                          dict(text='a', start=6, end=6.2), dict(text='gödröt', start=6.2, end=7),
                          dict(text='Utána', start=8, end=9), dict(text='pihen', start=9, end=10)])
        result = review.review_story(clip, {}, row)
        diff = result['differences'][0]
        self.assertEqual(diff['kind'], 'delete')
        self.assertEqual(diff['estimatedWindow']['method'], 'neighbor-anchors')
        self.assertEqual(diff['estimatedWindow']['precedingAnchor'], [2, 3])
        self.assertEqual(diff['estimatedWindow']['followingAnchor'], [5, 6])
        self.assertEqual(diff['estimatedWindow']['start'], 2.2)
        self.assertEqual(diff['estimatedWindow']['end'], 5.8)
        candidate = result['sentenceCandidates'][0]
        start, end = candidate['sourceCharacterRange']
        self.assertEqual(clip['text'][start:end], 'Maci földdel betakarja a gödröt.')
        self.assertEqual(candidate['originalText'], clip['text'][start:end])
        self.assertFalse(candidate['automaticCutAllowed'])
        self.assertLess(candidate['estimatedWindow']['end'], 8)

    def test_missing_beginning_and_ending_have_one_anchor_and_clip_bounds(self):
        clip, row = data('Először Maci majd pihen.', 'Maci', [dict(text='Maci', start=3, end=4)])
        differences = review.review_story(clip, {}, row)['differences']
        self.assertEqual(len(differences), 2)
        for diff in differences:
            window = diff['estimatedWindow']
            self.assertIsNotNone(window)
            self.assertGreaterEqual(window['start'], 0)
            self.assertLessEqual(window['end'], 20)
        self.assertEqual(differences[0]['estimatedWindow']['start'], 0)

    def test_no_timestamps_does_not_invent_a_cut(self):
        clip, row = data('Maci földdel dolgozik.', '', [])
        result = review.review_story(clip, {}, row)
        self.assertIsNone(result['differences'][0]['estimatedWindow'])
        self.assertIsNone(result['sentenceCandidates'][0]['estimatedWindow'])

    def test_word_timestamps_only_attach_to_matching_transcript_tokens(self):
        lexical, times = review.timed_tokens('Maci hibás szó.',
            [dict(text='Maci', start=0, end=1), dict(text='más', start=1, end=2),
             dict(text='szó', start=2, end=3)], 4)
        self.assertEqual([t['text'] for t in lexical], ['Maci', 'hibás', 'szó'])
        self.assertEqual(times, [[0, 1], None, [2, 3]])

    def test_manifest_sha_mismatch_blocks_repair_eligibility(self):
        clip, row = data('Földdel.', 'Földel.', sha='old-recording')
        result = review.review_story(clip, {}, row)
        self.assertEqual(result['status'], 'stale-source-sha')
        self.assertFalse(result['repairEligible'])
        self.assertFalse(result['sentenceCandidates'][0]['repairEligible'])
        self.assertEqual(result['sentenceCandidates'][0]['sourceSha256'], 'old-recording')
        self.assertEqual(result['sentenceCandidates'][0]['sourceTextSha256'], review.digest(clip['text']))

    def test_user_rejection_remains_visible_even_when_asr_matches(self):
        clip, row = data('Földdel.', 'Földdel.')
        row['userRejections'] = [dict(id='rejected', reason='Rövidnek hallatszott az é.')]
        result = review.review_story(clip, {}, row)
        self.assertEqual(result['status'], 'known-rejected')
        self.assertFalse(result['pronunciationVerified'])
        self.assertEqual(result['userRejections'], row['userRejections'])
        page = review.render_html(review.build_review({'clips': [clip]}, {'clips': [row]}), ROOT, ROOT)
        self.assertIn('Rövidnek hallatszott az é.', page)

    def test_fresh_manifest_text_and_title_override_cached_expected_reference(self):
        clip, row = data('Új cím. Földdel.', 'Új cím. Földel.')
        row['expected'] = 'Régi cím. Földdel.'
        result = review.review_story(clip, {'title': 'Elavult cím', 'sha256': 'stale-metadata'}, row)
        self.assertEqual(result['title'], 'Eredeti cím')
        self.assertTrue(result['textChangedSinceTranscription'])
        self.assertEqual(len(result['differences']), 1)
        self.assertEqual(result['shaBinding'], 'matches-manifest')

    def test_incremental_coverage_and_errors_are_explicit(self):
        clip, row = data('Földdel.', 'Földel.')
        pending = dict(clip, id='pending')
        broken = dict(clip, id='broken')
        report = review.build_review({'clips': [clip, pending, broken]}, {'clips': [row,
            dict(id='broken', status='error', error='decode error')]})
        self.assertEqual(report['coverage'], dict(total=3, completed=1, errors=1, pending=1, complete=False))
        self.assertEqual([s['status'] for s in report['stories']], ['review-required', 'pending', 'error'])

    def test_html_escapes_content_and_uses_local_seek_windows_only(self):
        clip, row = data('Földdel.', '</script><script>alert(1)</script>')
        clip['title'] = '<img src=x onerror=alert(1)>'
        result = review.build_review({'clips': [clip]}, {'clips': [row]})
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder)
            (root / 'audio').mkdir()
            (root / 'audio/source.mp3').write_bytes(b'local copy')
            page = review.render_html(result, root, root)
            self.assertNotIn('<img src=x', page)
            self.assertNotIn('<script>alert(1)</script>', page)
            self.assertIn('src="audio/source.mp3"', page)
            self.assertIn('data-start=', page)
            self.assertIn('audio.currentTime', page)
            self.assertIn('audio.pause()', page)
            self.assertNotIn('fetch(', page)
            self.assertIn('class="story"', page)
            self.assertNotIn('class="story" open', page)
            self.assertIn('id="priority-filter"', page)
            self.assertIn('id="story-search"', page)
            self.assertIn("addEventListener('loadedmetadata', seek", page)
            self.assertNotIn("addEventListener('loadedmetadata', play", page)
            self.assertIn('const playing = audio.play()', page)
            self.assertIn('A lejátszás nem indult:', page)


if __name__ == '__main__':
    unittest.main()
