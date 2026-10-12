"""Offline safety and complete-input tests; no speech service is contacted."""
import importlib.util
import json
import sys
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'scripts'))
spec = importlib.util.spec_from_file_location('rado', ROOT / 'scripts/generate-rado-audiobooks.py')
m = importlib.util.module_from_spec(spec)
spec.loader.exec_module(m)


class RadoTests(unittest.TestCase):
    def test_all_chunks_cover_every_tale_without_changing_displayed_text(self):
        entries = json.loads((ROOT / 'content/stories/catalog.json').read_text())['stories']
        entries = [e for e in entries if e['id'].startswith('rado-')]
        self.assertEqual(len(entries), 50)
        for entry in entries:
            plan = m.plan(entry)
            self.assertEqual(''.join(p['displayText'] for p in plan['parts']), plan['displayText'])
            self.assertEqual(''.join(p['spokenText'] for p in plan['parts']), m.phonetic(plan['displayText']))
            self.assertTrue(all(0 < len(p['spokenText']) <= 10000 for p in plan['parts']))
            self.assertTrue(plan['text'].endswith(entry['ending']))
            self.assertEqual(len(list(m.TOKEN.finditer(plan['displayText']))), len(list(m.SPOKEN_TOKEN.finditer(plan['spokenText']))))

    def test_phonetics_preserve_display_and_long_vs_short_i(self):
        self.assertEqual(m.phonetic('Víz, vizet, még, rakjuk, képek.'), '/viːz/, /ˈvizɛt/, /ˈmeːɡ/, /ˈrɒkjuk/, /ˈkeːpɛk/.')
        self.assertEqual(m.phonetic('vízpart'), 'vízpart')

    def test_quota_uses_nominal_rate_and_safety_margin(self):
        plans = [{'id': 'a', 'characters': 1000}, {'id': 'b', 'characters': 2000}]
        self.assertEqual(m.batch_that_fits(plans, 1099), [])
        self.assertEqual(m.batch_that_fits(plans, 1100), [plans[0]])
        self.assertEqual(m.batch_that_fits(plans, 3301), plans)
        self.assertEqual(m.batch_that_fits(plans, 1500, multiplier=2), [])

    def test_pending_request_is_never_reissued(self):
        body = {'text': 'Test.'}
        code = m.sha(m.compact([m.CONFIG, body]).encode())
        with tempfile.TemporaryDirectory() as directory, patch.object(m, 'CACHE', Path(directory)), patch.object(m.urllib.request, 'urlopen') as network:
            (Path(directory) / (code + '.pending.json')).write_text('{}')
            with self.assertRaisesRegex(RuntimeError, 'recover from provider history'):
                m.paid_part({'displayText': 'Test.', 'spokenText': 'Test.'}, body, 'test', 'never-used')
            network.assert_not_called()

    def test_orphaned_paid_response_is_never_reissued(self):
        body = {'text': 'Test.'}
        code = m.sha(m.compact([m.CONFIG, body]).encode())
        with tempfile.TemporaryDirectory() as directory, patch.object(m, 'CACHE', Path(directory)), patch.object(m.urllib.request, 'urlopen') as network:
            (Path(directory) / (code + '.response.json')).write_text('{}')
            with self.assertRaisesRegex(RuntimeError, 'ambiguous cached request'):
                m.paid_part({'displayText': 'Test.', 'spokenText': 'Test.'}, body, 'test', 'never-used')
            network.assert_not_called()

    def test_installation_cannot_send_paid_request(self):
        with tempfile.TemporaryDirectory() as directory, patch.object(m, 'CACHE', Path(directory)), patch.object(m.urllib.request, 'urlopen') as network:
            with self.assertRaisesRegex(RuntimeError, 'installation cannot call'):
                m.paid_part({'displayText': 'Test.', 'spokenText': 'Test.'}, {'text': 'Test.'}, 'test', None)
            network.assert_not_called()

    def test_multiple_real_parts_stitch_without_losing_words_or_endings(self):
        # Use two complete, already-paid short recordings as an offline fixture.
        # No service call or published file write; concatenation and offset math
        # are the same path that the long, pending tales will eventually use.
        files = [m.CACHE / 'rado-i-01.plan.json', m.CACHE / 'rado-i-07.plan.json']
        if not all(p.exists() and p.with_name(p.name.replace('.plan.json', '.json')).exists() for p in files):
            self.skipTest('Local paid fixtures absent; complete-input tests still cover every long tale')
        plans = [json.loads(p.read_text()) for p in files]
        metas = [json.loads(p.with_name(p.name.replace('.plan.json', '.json')).read_text()) for p in files]
        paid = []
        for p, meta in zip(plans, metas):
            part = json.loads((m.CACHE / (meta['partReceipts'][0] + '.json')).read_text())
            paid.append((m.CACHE / (meta['partReceipts'][0] + '.mp3'), part))
        displayed = plans[0]['displayText'] + plans[1]['displayText']
        title = plans[0]['title']
        spoken = plans[0]['spokenText'] + plans[1]['spokenText']
        fixture = {'id': 'offline-stitch-qa', 'title': title,
                   'text': displayed[len(title + '\n\n'):], 'displayText': displayed, 'spokenText': spoken,
                   'parts': [plans[0]['parts'][0], plans[1]['parts'][0]], 'characters': len(spoken),
                   'fingerprint': m.sha(m.compact([m.CONFIG, spoken]).encode()),
                   'sourceSha256': m.sha(displayed.encode()), 'pronunciationSha256': plans[0]['pronunciationSha256']}
        with tempfile.TemporaryDirectory() as directory, patch.object(m, 'CACHE', Path(directory)), patch.object(m, 'paid_part', side_effect=paid), patch.object(m.urllib.request, 'urlopen') as network:
            stitched = m.assemble(fixture)
            self.assertEqual([w['text'] for w in stitched['words']], [t.group() for t in m.TOKEN.finditer(displayed)])
            self.assertAlmostEqual(stitched['duration'], sum(meta['duration'] for meta in metas), delta=.1)
            self.assertEqual(stitched['paragraphs'][-1]['text'], plans[1]['text'].splitlines()[-1])
            network.assert_not_called()


if __name__ == '__main__':
    unittest.main()
