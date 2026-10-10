import { readFile, mkdir, copyFile, rm } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const destination = resolve(root, 'dist');
const worker = await readFile(resolve(root, 'sw.js'), 'utf8');
const match = worker.match(/const ASSETS = (\[[\s\S]*?\]);/);
if (!match) throw new Error('Missing offline asset manifest. Run npm run build-offline.');
const assets = JSON.parse(match[1]);
const optionalMatch = worker.match(/const OPTIONAL_ASSETS = (\[[\s\S]*?\]);/);
if (optionalMatch) assets.push(...JSON.parse(optionalMatch[1]));
// Only the verified runtime asset list is published; source notes and backups stay out.
for (const asset of assets) {
  if (typeof asset.file !== 'string' || asset.file.startsWith('/') || asset.file.split('/').includes('..')) throw new Error('Invalid asset path');
  const bytes = await readFile(resolve(root, asset.file));
  if (createHash('sha256').update(bytes).digest('hex') !== asset.sha256) throw new Error(`Stale offline asset: ${asset.file}`);
}
await rm(destination, { recursive: true, force: true });
await mkdir(destination, { recursive: true });
for (const file of [...assets.map(asset => asset.file), 'sw.js']) {
  const target = resolve(destination, file);
  await mkdir(dirname(target), { recursive: true });
  await copyFile(resolve(root, file), target);
}
console.log(`Static site ready: ${assets.length + 1} runtime files in dist/.`);
