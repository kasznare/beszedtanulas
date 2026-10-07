import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { ANIMAL_BOOK_PAGES, ANIMAL_BOOK_ANIMALS } from '../animal-book-data.js';

const root = new URL('../', import.meta.url);

test('every pictured animal has a verified local recording and complete source attribution', async () => {
  const manifest = JSON.parse(await readFile(new URL('animal-book-audio.json', root), 'utf8'));
  assert.equal(manifest.version, 1);
  assert.deepEqual(manifest.sounds.map(sound => sound.id).sort(), ANIMAL_BOOK_ANIMALS.map(animal => animal.id).sort());
  for (const sound of manifest.sounds) {
    assert.equal(sound.file, `audio/animals/${sound.id}.mp3`);
    for (const field of ['label', 'title', 'author', 'license', 'changes']) assert.ok(typeof sound[field] === 'string' && sound[field].trim(), `${sound.id}: ${field}`);
    for (const field of ['sourceUrl', 'licenseUrl', 'originalUrl']) assert.ok(sound[field].startsWith('https://'), `${sound.id}: ${field}`);
    assert.ok(Number.isFinite(sound.duration) && sound.duration >= 0.6 && sound.duration <= 6, `${sound.id}: short animal call`);
    const bytes = await readFile(new URL(sound.file, root));
    assert.ok(bytes.length > 1000);
    assert.equal(createHash('sha256').update(bytes).digest('hex'), sound.sha256, `${sound.id}: recording matches its attribution`);
    if (sound.license.includes('BY-SA')) assert.equal(sound.derivedLicense, sound.license, `${sound.id}: excerpt keeps its license`);
  }
});

test('book illustrations are local WebP images with original generation details', async () => {
  const details = await readFile(new URL('assets/animal-book/README.md', root), 'utf8');
  for (const page of ANIMAL_BOOK_PAGES) {
    const bytes = await readFile(new URL(page.image, root));
    assert.equal(bytes.toString('ascii', 0, 4), 'RIFF');
    assert.equal(bytes.toString('ascii', 8, 12), 'WEBP');
    assert.ok(details.includes(`${page.id}.webp`), page.id);
  }
});

test('offline bundle contains every book scene, sound and attribution file', async () => {
  const worker = await readFile(new URL('sw.js', root), 'utf8');
  const assets = JSON.parse(worker.match(/const ASSETS = (\[[\s\S]*?\]);/)[1]).map(asset => asset.file);
  for (const page of ANIMAL_BOOK_PAGES) assert.ok(assets.includes(page.image.slice(2)), page.id);
  for (const animal of ANIMAL_BOOK_ANIMALS) assert.ok(assets.includes(`audio/animals/${animal.id}.mp3`), animal.id);
  assert.ok(assets.includes('animal-book-audio.json'));
});
