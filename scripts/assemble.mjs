import { createHash } from 'node:crypto';
import { gunzipSync } from 'node:zlib';
import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';

const bundleDir = 'source-bundle-v2';
const expectedNames = [
  '000.b64',
  '001.b64',
  '002.b64',
  '003a.b64',
  '003b.b64',
  '003c.b64',
  '003d.b64',
  '003e.b64',
  '003f.b64',
  '004a.b64',
  '004b.b64',
  '004c.b64',
  '004d.b64',
  '004e.b64',
  '004f.b64',
  '005a.b64',
  '005b.b64',
  '005c.b64',
  '005d.b64',
  '005e.b64',
  '005f.b64',
];
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

const available = new Set(await readdir(bundleDir));
const missing = expectedNames.filter((name) => !available.has(name));
if (missing.length) {
  throw new Error(`Incomplete source bundle: missing ${missing.join(', ')}`);
}

const encodedParts = await Promise.all(
  expectedNames.map(async (name) => {
    const content = (await readFile(join(bundleDir, name), 'utf8')).trim();
    if (!content) throw new Error(`Empty source bundle segment: ${name}`);
    return content;
  }),
);
const encoded = encodedParts.join('');
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

console.log(
  `Restored ${sourceNames.length} TypeScript/CSS source files from ${expectedNames.length} verified segments (${encodedSha.slice(0, 12)}).`,
);
