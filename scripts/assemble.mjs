import { gunzipSync } from 'node:zlib';
import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';

const names = (await readdir('source-bundle')).filter((name) => name.endsWith('.b64')).sort();
if (!names.length) throw new Error('No source bundle parts found');
const encoded = (await Promise.all(names.map((name) => readFile(join('source-bundle', name), 'utf8')))).join('');
const sources = JSON.parse(gunzipSync(Buffer.from(encoded, 'base64')).toString('utf8'));

for (const [target, content] of Object.entries(sources)) {
  if (typeof content !== 'string') throw new Error(`Invalid source content for ${target}`);
  await mkdir(dirname(target), { recursive: true });
  await writeFile(target, content);
}
