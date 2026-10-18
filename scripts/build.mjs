import { cp, mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const publishDirectory = resolve(root, 'dist');
const publicFiles = [
  'index.html',
  'src/app.js',
  'src/tutor.js',
  'src/styles.css',
  'src/data/lessons.js'
];

for (const file of publicFiles) {
  const destination = resolve(publishDirectory, file);
  await mkdir(dirname(destination), { recursive: true });
  await cp(resolve(root, file), destination);
}
