import { readdir, mkdir, copyFile, cp, rm } from 'node:fs/promises';
import { resolve, join, extname } from 'node:path';
const root = resolve(import.meta.dirname, '..');
const output = join(root, '.web-output');
// This directory is generated only by this script. Server code and credentials never enter it.
await rm(output, { recursive: true, force: true });
await mkdir(output);
const extensions = new Set(['.html', '.js', '.mjs', '.css', '.png', '.svg', '.webmanifest', '.txt', '.xml']);
for (const entry of await readdir(root, { withFileTypes: true })) {
  if (entry.isFile() && !entry.name.startsWith('.') && extensions.has(extname(entry.name))) await copyFile(join(root, entry.name), join(output, entry.name));
}
for (const directory of ['flags', 'media', 'downloads', 'vendor']) await cp(join(root, directory), join(output, directory), { recursive: true });
console.log('Public game assets prepared; server, database schema, tests and credentials excluded.');
