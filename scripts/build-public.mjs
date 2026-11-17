import { readdir, mkdir, copyFile, cp, rm, readFile, writeFile } from 'node:fs/promises';
import { resolve, join, extname } from 'node:path';
const root = resolve(import.meta.dirname, '..');
const output = join(root, '.web-output');
// This directory is generated only by this script. Server code and credentials never enter it.
await rm(output, { recursive: true, force: true });
await mkdir(output);
const extensions = new Set(['.html', '.js', '.mjs', '.css', '.png', '.svg', '.webmanifest', '.txt', '.xml']);
const adsenseMeta = '<meta name="google-adsense-account" content="ca-pub-1347521921111783">';
for (const entry of await readdir(root, { withFileTypes: true })) {
  if (!entry.isFile() || entry.name.startsWith('.') || !extensions.has(extname(entry.name))) continue;
  const source = join(root, entry.name);
  const destination = join(output, entry.name);
  if (extname(entry.name) !== '.html') {
    await copyFile(source, destination);
    continue;
  }
  let html = await readFile(source, 'utf8');
  // Keep one account tag in every published page, including pages with an implicit head.
  html = html.replace(/<meta\b[^>]*\bname\s*=\s*["']google-adsense-account["'][^>]*>/gi, '');
  if (/<head\b[^>]*>/i.test(html)) {
    html = html.replace(/<head\b[^>]*>/i, head => `${head}\n${adsenseMeta}`);
  } else {
    html = html.replace(/<html\b[^>]*>/i, tag => `${tag}<head>${adsenseMeta}`);
    html = html.replace(/<main\b/i, '</head><main');
  }
  await writeFile(destination, html);
}
for (const directory of ['flags', 'media', 'downloads', 'vendor']) await cp(join(root, directory), join(output, directory), { recursive: true });
console.log('Public game assets prepared; server, database schema, tests and credentials excluded.');
