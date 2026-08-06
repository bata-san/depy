import { createHash } from 'node:crypto';
import { gunzipSync } from 'node:zlib';
import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';

const bundleDir = 'source-bundle-v2';
const expectedNames = Array.from({ length: 6 }, (_, index) => `${String(index).padStart(3, '0')}.b64`);
const expectedEncodedSha = '9d414229a9a10f36b78446bd12921f5347e1ef8e035feba3ee0c23f88a2e1faf';
const expectedSources = [
  'src/camera-controller.ts',
  'src/character-animations.ts',
  'src/data.ts',
  'src/event-system.ts',
  'src/game-clock.ts',
  'src/loan-system.ts',
  'src/main.ts',
  'src/office.ts',
  'src/save-manager.ts',
  'src/save-screen.ts',
  'src/simulation.ts',
  'src/styles.css',
  'src/toast.ts',
  'src/types.ts',
  'src/ui.ts',
];

const names = (await readdir(bundleDir)).filter((name) => name.endsWith('.b64')).sort();
if (JSON.stringify(names) !== JSON.stringify(expectedNames)) {
  throw new Error(`Incomplete source bundle: expected ${expectedNames.join(', ')}, found ${names.join(', ')}`);
}

const encoded = (await Promise.all(names.map(async (name) => (await readFile(join(bundleDir, name), 'utf8')).trim()))).join('');
const encodedSha = createHash('sha256').update(encoded).digest('hex');
if (encodedSha !== expectedEncodedSha) {
  throw new Error(`Source bundle checksum mismatch: expected ${expectedEncodedSha}, found ${encodedSha}`);
}

const sources = JSON.parse(gunzipSync(Buffer.from(encoded, 'base64')).toString('utf8'));
const sourceNames = Object.keys(sources).sort();
if (JSON.stringify(sourceNames) !== JSON.stringify([...expectedSources].sort())) {
  throw new Error(`Unexpected source manifest: ${sourceNames.join(', ')}`);
}

for (const [target, content] of Object.entries(sources)) {
  if (typeof content !== 'string' || !target.startsWith('src/') || target.includes('..')) {
    throw new Error(`Invalid source content for ${target}`);
  }
  await mkdir(dirname(target), { recursive: true });
  await writeFile(target, content);
}

console.log(`Restored ${sourceNames.length} TypeScript/CSS source files from verified bundle ${encodedSha.slice(0, 12)}.`);
