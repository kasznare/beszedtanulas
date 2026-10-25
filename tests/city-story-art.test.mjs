import test from 'node:test';
import assert from 'node:assert/strict';
import { renderCityStoryArt, renderCityStoryClue, renderCityStoryProp, renderCityStoryPhoto } from '../city-story-art.js';

const evidenceOrder = svg => [...svg.matchAll(/data-evidence="([^"]+)"/g)].map(match => match[1]);
const shownProps = svg => [...svg.matchAll(/data-story-prop="([^"]+)"/g)].map(match => match[1]);
const gradientIds = svg => [...svg.matchAll(/<linearGradient id="([^"]+)"/g)].map(match => match[1]);

test('archive art keeps the photo order hidden until chronology is known', () => {
  const unsolved = renderCityStoryArt('archive');
  const solved = renderCityStoryArt('archive', { chronologyKnown: true });
  assert.deepEqual(evidenceOrder(unsolved), ['closing', 'setup', 'packing']);
  assert.deepEqual(evidenceOrder(solved), ['setup', 'packing', 'closing']);
  assert.doesNotMatch(unsolved, /PRÓBA|ELPAKOLÁS|ZÁRÁS/);
  assert.match(solved, /PRÓBA/);
  assert.match(solved, /ELPAKOLÁS/);
  assert.match(solved, /ZÁRÁS/);
  assert.equal((unsolved.match(/<circle r="31"/g) || []).length, 2, 'both time clues remain visible');
});

test('courtyard art waits for a layout test before showing a verdict', () => {
  const defaultArt = renderCityStoryArt('courtyard');
  const blocked = renderCityStoryArt('courtyard', { layoutTest: 'straight' });
  const clear = renderCityStoryArt('courtyard', { layoutTest: 'turn-clear' });
  assert.doesNotMatch(defaultArt, /stroke-dasharray="8 8"|m573 396 7 8 15-19/);
  assert.match(blocked, /stroke="#687f87" stroke-width="4" stroke-dasharray="8 8"/);
  assert.doesNotMatch(blocked, /m573 396 7 8 15-19/);
  assert.match(clear, /m573 396 7 8 15-19/);
});

test('old clues show the blue 12 gate and blue repaired bench; current clues show green 18 and red', () => {
  const oldGate = renderCityStoryClue('old-gate');
  const gate = renderCityStoryClue('gate');
  const oldBench = renderCityStoryClue('old-bench');
  const bench = renderCityStoryClue('bench');
  assert.match(oldGate, /fill="#4d7890"/);
  assert.match(oldGate, />12<\/text>/);
  assert.match(gate, /fill="#467962"/);
  assert.match(gate, />18<\/text>/);
  assert.match(oldBench, /fill="#6d9bb0"/);
  assert.match(bench, /fill="#b95e50"/);
  for (const art of [oldBench, bench]) assert.match(art, /M67 34l13-8v16l-13 8 13 8v18/, 'repaired leg');
  for (const [alias, clue] of Object.entries({ street: 'gate', workshop: 'bench', archive: 'notebook', courtyard: 'cart', film: 'photo' })) {
    assert.equal(renderCityStoryClue(alias), renderCityStoryClue(clue), `${alias} journal art`);
  }
});

test('picture-board theatre does not silently include puppet stage art', () => {
  const puppets = renderCityStoryArt('theatre', { theatreForm: 'puppet', benchUse: 'puppet' });
  const boards = renderCityStoryArt('theatre', { theatreForm: 'boards', benchUse: 'puppet' });
  assert.match(puppets, /<circle cy="-36" r="11"/);
  assert.doesNotMatch(boards, /<circle cy="-36" r="11"|M-83-69v-34h166v34/);
  assert.match(boards, /Képtáblák és valódi szereplők/);
  assert.equal(evidenceOrder(boards).length, 0, 'board display does not reveal archive state');
});

test('voice ending omits Eszter and carries bread only when bread was chosen', () => {
  const live = renderCityStoryArt('movie');
  const voiceWithoutBread = renderCityStoryArt('movie', { filmEszter: 'voice', props: ['book'] });
  const voiceWithBread = renderCityStoryArt('movie', { filmEszter: 'voice', props: ['book', 'bread'] });
  assert.match(live, /fill="#b56b60"/, 'Eszter is present in live filming');
  assert.doesNotMatch(voiceWithoutBread, /fill="#b56b60"/, 'Eszter is absent in voice filming');
  assert.deepEqual(shownProps(voiceWithoutBread), ['book']);
  assert.doesNotMatch(voiceWithoutBread, /M-36-5q0-38 36-38T36-5/, 'no unchosen bread basket');
  assert.deepEqual(shownProps(voiceWithBread).sort(), ['book', 'bread']);
  assert.match(voiceWithBread, /M-36-5q0-38 36-38T36-5/, 'Mira carries the selected bread basket');
  assert.equal((voiceWithBread.match(/data-story-prop="bread"/g) || []).length, 1);
});

test('movie renders only selected contribution props', () => {
  assert.deepEqual(shownProps(renderCityStoryArt('movie')), []);
  const chosen = renderCityStoryArt('movie', { props: ['pillow', 'pump', 'book', 'pump', '<script>'] });
  assert.deepEqual(shownProps(chosen), ['pillow', 'pump', 'book']);
  assert.doesNotMatch(chosen, /<script>/);
  assert.match(renderCityStoryProp('bread'), /fill="#e2ad67"/);
});

test('SVG gradient IDs are safe, internally resolved, and distinct across instances', () => {
  const maliciousPrefix = 'story"><script>alert(1)</script>&';
  const illustrations = [
    renderCityStoryArt('film', {}, maliciousPrefix),
    renderCityStoryArt('film', { camera: 'wide' }, maliciousPrefix),
    renderCityStoryArt('street', {}, maliciousPrefix),
    renderCityStoryArt('film', {}, 'other-instance'),
  ];
  const all = new Set();
  for (const svg of illustrations) {
    assert.doesNotMatch(svg, /<script>|&/);
    const ids = gradientIds(svg);
    assert.equal(ids.length, 4);
    for (const id of ids) {
      assert.match(id, /^[A-Za-z0-9_-]+$/);
      assert.equal(all.has(id), false, `duplicate gradient ID: ${id}`);
      all.add(id);
    }
    for (const [, reference] of svg.matchAll(/url\(#([^)]*)\)/g)) assert.ok(ids.includes(reference), `missing gradient: ${reference}`);
  }
  assert.equal(renderCityStoryArt('film', {}, maliciousPrefix), illustrations[0], 'same inputs stay deterministic');
  assert.doesNotMatch(renderCityStoryClue('old-gate', maliciousPrefix), /<script>|&/);
});

test('every evidence photo shows its clock, so a wrong order can be checked on the cards', () => {
  const times = { setup: '14:00', packing: '16:15', closing: '19:00' };
  for (const [id, time] of Object.entries(times)) {
    const card = renderCityStoryPhoto(id);
    assert.equal((card.match(/<circle r="31"/g) || []).length, 1, `${id} has a clock face`);
    assert.match(card, new RegExp(`>${time}</text>`));
  }
  assert.match(renderCityStoryPhoto('setup'), /M0 0v-18M0 0l11-6/, 'the setup clock points to two');
});
