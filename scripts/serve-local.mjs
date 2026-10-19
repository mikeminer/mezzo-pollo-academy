import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve, sep, extname } from 'node:path';
const root = resolve(import.meta.dirname, '..');
const types = { '.html':'text/html', '.js':'text/javascript', '.mjs':'text/javascript', '.css':'text/css', '.svg':'image/svg+xml', '.json':'application/json', '.mp3':'audio/mpeg', '.vtt':'text/vtt', '.png':'image/png' };
createServer(async (req,res) => {
  try {
    const path = decodeURIComponent(new URL(req.url,'http://localhost').pathname);
    if (path.split('/').some(part => part.startsWith('.')) || path.startsWith('/server') || path.startsWith('/api')) throw Error();
    const file = resolve(root, '.' + (path === '/' || path === '/practice' ? '/index.html' : path));
    if (!file.startsWith(root + sep)) throw Error();
    const body = await readFile(file);
    res.writeHead(200, { 'Content-Type': types[extname(file)] || 'application/octet-stream', 'Cache-Control':'no-store' }); res.end(body);
  } catch { res.writeHead(404); res.end('Not found'); }
}).listen(8790,'127.0.0.1',() => console.log('MezzoPollo preview: http://127.0.0.1:8790/'));
