// Minimal local stand-in for Vercel: serves the production build and runs api/**/*.mjs handlers.
// Loads .env.local into process.env. Usage: npm run build && npm run serve [-- port]
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const buildDir = path.join(root, 'build');
const port = Number(process.argv[2] || 3005);

// .env.local (gitignored) → process.env, without overriding what is already set
const envFile = path.join(root, '.env.local');
if (fs.existsSync(envFile)) {
    for (const line of fs.readFileSync(envFile, 'utf8').split(/\r?\n/)) {
        const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
        if (!m || line.trim().startsWith('#')) continue;
        const val = m[2].replace(/^(['"])(.*)\1$/, '$2');
        if (val !== '' && process.env[m[1]] === undefined) process.env[m[1]] = val;
    }
}

const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'application/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.xml': 'application/xml', '.txt': 'text/plain', '.map': 'application/json' };

const makeRes = (res) => ({
    statusCode: 200,
    setHeader: (k, v) => res.setHeader(k, v),
    status(code) { this.statusCode = code; return this; },
    json(obj) { res.setHeader('Content-Type', 'application/json'); res.writeHead(this.statusCode); res.end(JSON.stringify(obj)); },
    send(body) { res.writeHead(this.statusCode); res.end(body); },
});

const readBody = (req) => new Promise((resolve) => {
    let data = '';
    req.on('data', (c) => { data += c; });
    req.on('end', () => { try { resolve(data ? JSON.parse(data) : {}); } catch { resolve({}); } });
});

// /api/foo → api/foo.mjs or api/foo/index.mjs ; /api/foo/bar → api/foo/bar.mjs
const resolveApi = (name) => {
    const candidates = [path.join(root, 'api', `${name}.mjs`), path.join(root, 'api', name, 'index.mjs')];
    return candidates.find((f) => fs.existsSync(f));
};

http.createServer(async (req, res) => {
    const url = new URL(req.url, `http://localhost:${port}`);
    let apiName = url.pathname.startsWith('/api/') ? url.pathname.slice(5).replace(/\/+$/, '') : null;
    const ev = url.pathname.match(/^\/events\/([^/]+)$/);
    if (ev) { apiName = 'event'; url.searchParams.set('slug', ev[1]); }

    if (apiName) {
        const file = resolveApi(apiName);
        if (!file) { res.writeHead(404); res.end('no such function'); return; }
        try {
            const mod = await import(pathToFileURL(file).href + `?t=${Date.now()}`);
            const shimReq = { method: req.method, headers: req.headers, socket: req.socket, query: Object.fromEntries(url.searchParams), body: await readBody(req) };
            await mod.default(shimReq, makeRes(res));
        } catch (e) {
            console.error(e);
            res.writeHead(500);
            res.end(String(e));
        }
        return;
    }

    let file = path.join(buildDir, decodeURIComponent(url.pathname));
    if (!fs.existsSync(file) || fs.statSync(file).isDirectory()) file = path.join(buildDir, 'index.html');
    res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream' });
    fs.createReadStream(file).pipe(res);
}).listen(port, () => console.log(`dev server on http://localhost:${port}`));
