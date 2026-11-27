// Remove the made-up sample items from your list, keeping everything you added.
//
//   npm run clear-samples
//
// Stop the server first, or restart it afterwards: systemctl --user restart practical-todo
import { readFile, writeFile, rename, copyFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { DATA_FILE } from '../paths.js';

if (!existsSync(DATA_FILE)) {
  console.log(`No list yet at ${DATA_FILE}. It will be created with sample items the first time you open the app.`);
  process.exit(0);
}

const data = JSON.parse(await readFile(DATA_FILE, 'utf8'));
const keep = data.items.filter((i) => !i.sample);
const removed = data.items.length - keep.length;
if (!removed) {
  console.log('No sample items to remove.');
  process.exit(0);
}

const backup = `${DATA_FILE}.${new Date().toISOString().replace(/[:.]/g, '-')}.bak`;
await copyFile(DATA_FILE, backup);
const tmp = `${DATA_FILE}.tmp`;
await writeFile(tmp, JSON.stringify({ ...data, items: keep }, null, 2) + '\n');
await rename(tmp, DATA_FILE);
console.log(`Removed ${removed} sample items; ${keep.length} of your items kept. Backup: ${backup}`);
console.log('Restart the server to see the change: systemctl --user restart practical-todo');
