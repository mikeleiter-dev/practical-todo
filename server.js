// Practical Todo local server: hosts the app and keeps items in one JSON file.
import { createServer } from 'node:http';
import { readFile, writeFile, rename, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, dirname, normalize, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { newItem, nextId, STATUSES } from './public/core.js';
import { sampleItems } from './sample/seed.js';
import { DATA_DIR, DATA_FILE, DEMO, PORT } from './paths.js';

const ROOT = dirname(fileURLToPath(import.meta.url));
const PUBLIC = join(ROOT, 'public');
const HOST = process.env.HOST || '127.0.0.1';


// ---------- storage: the only code that touches the data file ----------

let cache = null;
let writeQueue = Promise.resolve();

async function load() {
  if (cache) return cache;
  if (!existsSync(DATA_FILE)) {
    // A new list starts with made-up sample items, so a first run shows how the app works.
    // `npm run clear-samples` removes them. An existing list is never touched.
    await mkdir(DATA_DIR, { recursive: true });
    cache = { version: 1, items: sampleItems(new Date()) };
    await save();
    console.log(`Created ${DATA_FILE} with ${cache.items.length} sample items`);
  } else {
    cache = JSON.parse(await readFile(DATA_FILE, 'utf8'));
  }
  return cache;
}

function save() {
  // Write to a temp file, then rename, so a crash never leaves a half-written file.
  writeQueue = writeQueue.then(async () => {
    const tmp = `${DATA_FILE}.tmp`;
    await writeFile(tmp, JSON.stringify(cache, null, 2) + '\n');
    await rename(tmp, DATA_FILE);
  });
  return writeQueue;
}

// ---------- validation ----------

const EDITABLE = {
  title: (v) => typeof v === 'string' && v.trim().length > 0,
  project: (v) => typeof v === 'string',
  status: (v) => STATUSES.includes(v),
  labels: (v) => Array.isArray(v) && v.every((l) => typeof l === 'string'),
  completedAt: (v) => v === null || !Number.isNaN(Date.parse(v)),
  wakeAt: (v) => v === null || !Number.isNaN(Date.parse(v)),
  dormant: (v) => typeof v === 'boolean',
  settled: (v) => typeof v === 'boolean',
  archived: (v) => typeof v === 'boolean',
  snoozeCount: (v) => Number.isInteger(v) && v >= 0,
};

function validPatch(body) {
  if (!body || typeof body !== 'object') return null;
  const patch = {};
  for (const [key, value] of Object.entries(body)) {
    if (!EDITABLE[key] || !EDITABLE[key](value)) return null;
    patch[key] = typeof value === 'string' && (key === 'title' || key === 'project') ? value.trim() : value;
  }
  return patch;
}

// ---------- http ----------

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.webmanifest': 'application/manifest+json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
};

function send(res, status, body, type = 'application/json') {
  res.writeHead(status, { 'Content-Type': type, 'Cache-Control': 'no-store' });
  res.end(type === 'application/json' ? JSON.stringify(body) : body);
}

async function readBody(req) {
  let text = '';
  for await (const chunk of req) {
    text += chunk;
    if (text.length > 100_000) throw new Error('Body too large');
  }
  return text ? JSON.parse(text) : {};
}

async function api(req, res, path) {
  const data = await load();

  if (path === '/api/items' && req.method === 'GET') {
    return send(res, 200, { items: data.items });
  }

  if (path === '/api/items' && req.method === 'POST') {
    const body = await readBody(req);
    if (typeof body.title !== 'string' || !body.title.trim()) {
      return send(res, 400, { error: 'Title is required' });
    }
    const item = newItem(nextId(data.items), body);
    data.items.push(item);
    await save();
    return send(res, 201, item);
  }

  const match = path.match(/^\/api\/items\/([A-Za-z0-9_-]+)$/);
  if (match && req.method === 'PATCH') {
    const item = data.items.find((i) => String(i.id) === match[1]);
    if (!item) return send(res, 404, { error: 'No such item' });
    const patch = validPatch(await readBody(req));
    if (!patch) return send(res, 400, { error: 'Invalid change' });
    Object.assign(item, patch);
    await save();
    return send(res, 200, item);
  }

  return send(res, 404, { error: 'Not found' });
}

async function staticFile(res, path) {
  // `/app` is the launcher's address, so its window gets its own class in the window manager.
  const file = normalize(join(PUBLIC, path === '/' || path === '/app' ? 'index.html' : path));
  if (!file.startsWith(PUBLIC)) return send(res, 403, 'Forbidden', 'text/plain');
  try {
    const body = await readFile(file);
    res.writeHead(200, {
      'Content-Type': TYPES[extname(file)] || 'application/octet-stream',
      'Cache-Control': 'no-cache',
    });
    res.end(body);
  } catch {
    send(res, 404, 'Not found', 'text/plain');
  }
}

const server = createServer(async (req, res) => {
  const path = new URL(req.url, 'http://localhost').pathname;
  try {
    if (path.startsWith('/api/')) return await api(req, res, path);
    return await staticFile(res, path);
  } catch (err) {
    console.error(err);
    send(res, 500, { error: 'Server error' });
  }
});

server.listen(PORT, HOST, () => {
  console.log(`Practical Todo${DEMO ? ' (demo)' : ''} on http://localhost:${PORT}`);
  console.log(`Data file: ${DATA_FILE}`);
});
