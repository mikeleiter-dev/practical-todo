// Import items from a seed file into the real data folder (outside the repo).
//
//   node scripts/import-seed.js <seed-file.json> [--replace]
//
// Seed format: { "items": [ { id, title, project, labels, status: "To do"|"Doing"|"Done",
//   focus: "Active"|"Sleeping"|"Settled"|"Archived", added, started, completed,
//   wake_at, snooze_count, estimated_dates } ] }
//
// Without --replace it refuses to overwrite existing items. With --replace it
// keeps a timestamped backup of the old file first.
import { readFile, writeFile, rename, mkdir, copyFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { DATA_DIR, DATA_FILE, DEMO } from '../paths.js';

const STATUS = { 'To do': 'todo', Doing: 'doing', Done: 'done' };
const FOCUS = ['Active', 'Sleeping', 'Settled', 'Archived'];
const DATE_NAMES = { added: 'createdAt', started: 'startedAt', completed: 'completedAt' };
const KNOWN = new Set(['id', 'title', 'project', 'labels', 'status', 'focus', 'added', 'started',
  'completed', 'wake_at', 'snooze_count', 'estimated_dates']);

export function convert(seed) {
  const problems = [];
  const items = (seed.items || []).map((s, n) => {
    const where = `item ${n + 1} (${s.id ?? 'no id'})`;
    for (const key of Object.keys(s)) if (!KNOWN.has(key)) problems.push(`${where}: unknown field "${key}"`);
    if (!s.id) problems.push(`${where}: missing id`);
    if (!s.title) problems.push(`${where}: missing title`);
    if (!STATUS[s.status]) problems.push(`${where}: unknown status "${s.status}"`);
    if (!FOCUS.includes(s.focus)) problems.push(`${where}: unknown focus "${s.focus}"`);
    return {
      id: String(s.id),
      title: String(s.title ?? '').trim(),
      project: s.project ?? '',
      status: STATUS[s.status],
      labels: s.labels ?? [],
      createdAt: s.added ?? null,
      startedAt: s.started ?? null,
      completedAt: s.completed ?? null,
      snoozeCount: s.snooze_count ?? 0,
      wakeAt: s.wake_at ?? null,
      // Sleeping with no wake time is what Practical Todo calls Dormant.
      dormant: s.focus === 'Sleeping' && !s.wake_at,
      settled: s.focus === 'Settled',
      archived: s.focus === 'Archived',
      estimatedDates: (s.estimated_dates ?? []).map((d) => DATE_NAMES[d] ?? d),
    };
  });
  const ids = items.map((i) => i.id);
  if (new Set(ids).size !== ids.length) problems.push('duplicate ids');
  return { items, problems };
}

async function main() {
  const [file, flag] = process.argv.slice(2);
  if (!file) {
    console.error('Usage: node scripts/import-seed.js <seed-file.json> [--replace]');
    process.exit(2);
  }
  if (DEMO) {
    console.error('Refusing to import into the demo folder. Unset PRACTICAL_TODO_DEMO.');
    process.exit(2);
  }
  const { items, problems } = convert(JSON.parse(await readFile(file, 'utf8')));
  if (problems.length) {
    console.error(`Not imported. ${problems.length} problem(s):\n  ${problems.join('\n  ')}`);
    process.exit(1);
  }

  await mkdir(DATA_DIR, { recursive: true });
  if (existsSync(DATA_FILE)) {
    const current = JSON.parse(await readFile(DATA_FILE, 'utf8'));
    if (current.items?.length && flag !== '--replace') {
      console.error(`${DATA_FILE} already has ${current.items.length} items. Use --replace to overwrite it (a backup is kept).`);
      process.exit(1);
    }
    const backup = `${DATA_FILE}.${new Date().toISOString().replace(/[:.]/g, '-')}.bak`;
    await copyFile(DATA_FILE, backup);
    console.log(`Backed up the old file to ${backup}`);
  }
  const tmp = `${DATA_FILE}.tmp`;
  await writeFile(tmp, JSON.stringify({ version: 1, items }, null, 2) + '\n');
  await rename(tmp, DATA_FILE);
  console.log(`Imported ${items.length} items into ${DATA_FILE}`);
  console.log('Restart the server to load them: systemctl --user restart practical-todo');
}

if (import.meta.url === `file://${process.argv[1]}`) main();
