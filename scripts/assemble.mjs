import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';

const targets = {
  'src/office.ts': 'source-parts/office-ts',
  'src/simulation.ts': 'source-parts/simulation-ts',
  'src/ui.ts': 'source-parts/ui-ts',
  'src/styles.css': 'source-parts/styles-css',
};

for (const [target, sourceDir] of Object.entries(targets)) {
  const names = (await readdir(sourceDir)).filter((name) => name.endsWith('.part')).sort();
  if (!names.length) throw new Error(`No source parts found for ${target}`);
  const content = (await Promise.all(names.map((name) => readFile(join(sourceDir, name), 'utf8')))).join('');
  await mkdir(dirname(target), { recursive: true });
  await writeFile(target, content);
}
